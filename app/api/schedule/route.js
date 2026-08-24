import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Fungsi untuk menukar format masa "hh:mm AM/PM" kepada minit sejak tengah malam
function timeToMinutes(timeStr) {
  const [time, modifier] = timeStr.trim().split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
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
        // Dapatkan masa sekarang dalam waktu Malaysia (UTC+8)
        const now = new Date();
        const malaysianTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        const currentTotalMinutes = malaysianTime.getUTCHours() * 60 + malaysianTime.getUTCMinutes();

        // Ambil senarai timeslot berdasarkan profil dari database
        const { data: slotData, error: slotError } = await supabase
          .from('queue_settings')
          .select('time')
          .eq('profile', currentProfile);

        if (slotError || !slotData || slotData.length === 0) {
          throw new Error(`Tiada timeslot ditetapkan untuk profil ${currentProfile}. Sila set timeslot dahulu.`);
        }

        // Cari slot masa seterusnya yang belum lepas pada hari ini
        let nextSlotTimeStr = null;
        let targetDate = new Date(malaysianTime);

        // Susun slot dari awal ke lewat
        const sortedSlots = slotData.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

        const upcomingSlot = sortedSlots.find(slot => timeToMinutes(slot.time) > currentTotalMinutes);

        if (upcomingSlot) {
          // Jika ada slot lagi hari ini
          nextSlotTimeStr = upcomingSlot.time;
        } else {
          // Jika semua slot hari ini sudah lepas, ambil slot pertama untuk esok
          nextSlotTimeStr = sortedSlots[0].time;
          targetDate.setUTCDate(targetDate.getUTCDate() + 1);
        }

        // Parsing jam dan minit slot terpilih
        const [timePart, modifier] = nextSlotTimeStr.trim().split(' ');
        let [slotHours, slotMinutes] = timePart.split(':').map(Number);
        if (modifier === 'PM' && slotHours < 12) slotHours += 12;
        if (modifier === 'AM' && slotHours === 12) slotHours = 0;

        targetDate.setUTCHours(slotHours, slotMinutes, 0, 0);

        // Tukar kembali ke format ISO string untuk database
        finalScheduledAt = targetDate.toISOString().replace('Z', '+08:00');

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

      return NextResponse.json({ success: true, message: `Berjaya dimasukkan ke dalam senarai Auto-Queue (${currentProfile}) pada slot masa seterusnya!` });
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
