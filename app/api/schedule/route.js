import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { pageIds, message, imageUrl, videoUrl, firstComment, commentImageUrl, scheduledAt, profile } = body;

    if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
      return NextResponse.json({ error: 'Sila pilih sekurang-kurangnya satu Page.' }, { status: 400 });
    }

    const currentProfile = profile || 'Fatin';

    // 1. MOD AUTO-QUEUE / JADUAL MANUAL
    if (scheduledAt === 'auto-queue' || (scheduledAt && scheduledAt !== 'now' && new Date(scheduledAt) > new Date())) {
      let finalScheduledAt = scheduledAt;

      if (scheduledAt === 'auto-queue') {
        const now = new Date();
        const malaysiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
        const currentTotalMinutes = malaysiaTime.getHours() * 60 + malaysiaTime.getMinutes();

        // Ambil timeslot aktif untuk profil ini
        const { data: slotData, error: slotError } = await supabase
          .from('queue_settings')
          .select('*')
          .eq('profile', currentProfile)
          .eq('is_active', true);

        if (slotError || !slotData || slotData.length === 0) {
          throw new Error(`Tiada timeslot aktif dijumpai dalam database untuk profil ${currentProfile}.`);
        }

        const validSlots = slotData
          .map(s => s.time_slot)
          .filter(t => t && typeof t === 'string');

        if (validSlots.length === 0) {
          throw new Error(`Format timeslot tidak sah untuk profil ${currentProfile}.`);
        }

        let targetDate = new Date(malaysiaTime);
        const uniqueSlots = [...new Set(validSlots)];
        const sortedSlots = uniqueSlots.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
        
        const upcomingSlot = sortedSlots.find(slot => timeToMinutes(slot) > currentTotalMinutes);
        let nextSlotTimeStr = upcomingSlot;

        if (!nextSlotTimeStr) {
          // Jika semua masa hari ini telah lepas, ambil slot pertama untuk esok
          nextSlotTimeStr = sortedSlots[0];
          targetDate.setDate(targetDate.getDate() + 1);
        }

        const parts = nextSlotTimeStr.trim().split(':');
        const slotHours = parseInt(parts[0], 10);
        const slotMinutes = parseInt(parts[1], 10);

        targetDate.setHours(slotHours, slotMinutes, 0, 0);
        
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const hours = String(targetDate.getHours()).padStart(2, '0');
        const minutes = String(targetDate.getMinutes()).padStart(2, '0');
        const seconds = String(targetDate.getSeconds()).padStart(2, '0');

        finalScheduledAt = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;

      } else if (scheduledAt) {
        finalScheduledAt = new Date(scheduledAt + '+08:00').toISOString();
      }

      const queueData = {
        page_ids: pageIds, 
        message,
        image_url: imageUrl,
        video_url: videoUrl,
        first_comment: firstComment,
        comment_image_url: commentImageUrl,
        scheduled_at: finalScheduledAt,
        status: 'pending',
        profile: currentProfile
      };

      const { error } = await supabase.from('scheduled_posts').insert([queueData]);
      if (error) throw new Error(error.message);

      return NextResponse.json({ success: true, message: `Berjaya dimasukkan ke dalam senarai Auto-Queue (${currentProfile})!` });
    }

    // 2. MOD POS SEKARANG
    const results = await Promise.allSettled(
      pageIds.map(async (pageId) => {
        const { data: pageData, error: pageError } = await supabase
          .from('pages')
          .select('access_token')
          .eq('page_id', pageId)
          .single();

        if (pageError || !pageData?.access_token) {
          throw new Error(`Token tidak dijumpai untuk page ID: ${pageId}`);
        }

        const accessToken = pageData.access_token;
        let endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
        let postData = { message, access_token: accessToken };

        if (videoUrl) {
          endpoint = `https://graph.facebook.com/v19.0/${pageId}/videos`;
          postData = { description: message, file_url: videoUrl, access_token: accessToken };
        } else if (imageUrl) {
          endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
          postData = { caption: message, url: imageUrl, access_token: accessToken };
        }

        const fbRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData),
        });

        const fbResult = await fbRes.json();
        if (!fbRes.ok) {
          throw new Error(fbResult.error?.message || 'Gagal pos ke Facebook');
        }

        if (firstComment && fbResult.id) {
          const commentEndpoint = `https://graph.facebook.com/v19.0/${fbResult.id}/comments`;
          let commentData = { message: firstComment, access_token: accessToken };

          if (commentImageUrl) {
            commentData.attachment_url = commentImageUrl;
          }

          await fetch(commentEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commentData),
          });
        }

        return { pageId, success: true };
      })
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0 && failures.length === pageIds.length) {
      throw new Error(failures[0].reason.message || 'Semua pos gagal dihantar.');
    }

    return NextResponse.json({ 
      success: true, 
      message: failures.length > 0 
        ? `Pos berjaya dihantar ke sesetengah page (${pageIds.length - failures.length}/${pageIds.length}).` 
        : 'Pos berjaya dihantar ke semua Page terpilih!' 
    });

  } catch (err) {
    console.error('Ralat API Schedule:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
