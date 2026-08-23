import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Kunci Supabase belum ditetapkan.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json({ error: 'Format data JSON tidak sah.' }, { status: 400 });
    }

    const { pageIds, message, imageUrl, videoUrl, firstComment, commentImageUrl, scheduledAt, profile } = body;
    const activeProfile = profile || 'Fatin';

    if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
      return NextResponse.json({ error: 'Sila pilih sekurang-kurangnya satu Facebook Page.' }, { status: 400 });
    }

    let targetScheduledTime = null;

    if (scheduledAt) {
      if (scheduledAt === 'auto-queue') {
        const { data: lastPosts } = await supabase
          .from('scheduled_posts')
          .select('scheduled_at')
          .eq('status', 'pending')
          .eq('profile', activeProfile)
          .order('scheduled_at', { ascending: false })
          .limit(1);

        const { data: queueSettings } = await supabase
          .from('queue_settings')
          .select('*')
          .eq('is_active', true)
          .eq('profile', activeProfile);

        const nowUTC = new Date();
        const localTimeStr = nowUTC.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' });
        let baseDate = new Date(localTimeStr);
        
        if (lastPosts && lastPosts.length > 0 && lastPosts[0].scheduled_at) {
          const lastDateUTC = new Date(lastPosts[0].scheduled_at);
          const lastLocalStr = lastDateUTC.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' });
          const lastDate = new Date(lastLocalStr);
          if (!isNaN(lastDate.getTime())) {
            baseDate = lastDate;
          }
        }

        let nextSlotTimeStr = null;

        if (queueSettings && queueSettings.length > 0) {
          const currentDayOfWeek = baseDate.getDay();
          
          const parseTimeToMinutes = (timeStr) => {
            if (!timeStr) return 0;
            if (timeStr.includes('M')) {
              const [timePart, modifier] = timeStr.split(' ');
              let [hours, minutes] = timePart.split(':').map(Number);
              if (modifier === 'PM' && hours < 12) hours += 12;
              if (modifier === 'AM' && hours === 12) hours = 0;
              return hours * 60 + minutes;
            }
            const parts = timeStr.split(':').map(Number);
            return parts[0] * 60 + (parts[1] || 0);
          };

          const baseMinutes = baseDate.getHours() * 60 + baseDate.getMinutes();

          const todaySlots = queueSettings
            .filter((q) => q.day_of_week === currentDayOfWeek)
            .map((q) => ({ ...q, totalMinutes: parseTimeToMinutes(q.time_slot) }))
            .sort((a, b) => a.totalMinutes - b.totalMinutes);

          let candidate = todaySlots.find((q) => q.totalMinutes > baseMinutes);

          if (!candidate) {
            baseDate.setDate(baseDate.getDate() + 1);
            baseDate.setHours(0, 0, 0, 0);
            const nextDayOfWeek = baseDate.getDay();
            
            const tomorrowSlots = queueSettings
              .filter((q) => q.day_of_week === nextDayOfWeek)
              .map((q) => ({ ...q, totalMinutes: parseTimeToMinutes(q.time_slot) }))
              .sort((a, b) => a.totalMinutes - b.totalMinutes);

            candidate = tomorrowSlots[0] || queueSettings[0];
          }

          if (candidate && candidate.time_slot) {
            nextSlotTimeStr = candidate.time_slot;
          }
        }

        let targetHours = 15;
        let targetMinutes = 0;

        if (nextSlotTimeStr) {
          if (nextSlotTimeStr.includes('M')) {
            const [timePart, modifier] = nextSlotTimeStr.split(' ');
            let [hours, minutes] = timePart.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            targetHours = hours;
            targetMinutes = minutes;
          } else {
            const [hours, minutes] = nextSlotTimeStr.split(':').map(Number);
            targetHours = hours;
            targetMinutes = minutes || 0;
          }
        }

        baseDate.setHours(targetHours, targetMinutes, 0, 0);

        const year = baseDate.getFullYear();
        const month = String(baseDate.getMonth() + 1).padStart(2, '0');
        const day = String(baseDate.getDate()).padStart(2, '0');
        const hours = String(baseDate.getHours()).padStart(2, '0');
        const minutes = String(baseDate.getMinutes()).padStart(2, '0');
        const seconds = String(baseDate.getSeconds()).padStart(2, '0');

        targetScheduledTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
      } else {
        const formattedScheduledAt = scheduledAt.endsWith('Z') || scheduledAt.includes('+') ? scheduledAt : `${scheduledAt}:00+08:00`;
        const parsedDate = new Date(formattedScheduledAt);
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json({ error: 'Format masa jadual tidak sah.' }, { status: 400 });
        }
        targetScheduledTime = parsedDate.toISOString();
      }
    } else {
      targetScheduledTime = new Date().toISOString();
    }

    // Tetapkan status kepada 'pending' untuk semua jenis pos (termasuk Post Now)
    // supaya sistem cron dapat memproses dan menghantarnya terus ke Facebook.
    const postStatus = 'pending';

    // Masukkan ke dalam database
    const { error: insertError } = await supabase.from('scheduled_posts').insert({
      page_ids: pageIds,
      message: message || '',
      image_url: imageUrl || null,
      video_url: videoUrl || null,
      first_comment: firstComment || null,
      comment_image_url: commentImageUrl || null,
      scheduled_at: targetScheduledTime,
      status: postStatus,
      profile: activeProfile,
    });

    if (insertError) {
      return NextResponse.json({ error: `Gagal menjadualkan pos: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Pos berjaya dihantar/dijadualkan (${activeProfile})!` 
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: error.message || 'Ralat dalaman server.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Kunci Supabase belum ditetapkan.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID pos tidak diberikan.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: `Gagal memadam pos: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Pos berjaya dipadam!' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Ralat server.' }, { status: 500 });
  }
}
