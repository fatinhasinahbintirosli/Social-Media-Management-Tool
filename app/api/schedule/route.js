import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { pageIds, message, imageUrl, videoUrl, firstComment, commentImageUrl, scheduledAt, profile } = body;

    if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
      return NextResponse.json({ error: 'Sila pilih sekurang-kurangnya satu Page.' }, { status: 400 });
    }

    // Jika menggunakan auto-queue atau jadual manual (simpan terus dalam bentuk tatasusunan page_ids)
    if (scheduledAt === 'auto-queue' || (scheduledAt && new Date(scheduledAt) > new Date())) {
      const queueData = {
        page_ids: pageIds, // Menggunakan lajur page_ids yang betul mengikut schema database
        message,
        image_url: imageUrl,
        video_url: videoUrl,
        first_comment: firstComment,
        comment_image_url: commentImageUrl,
        scheduled_at: scheduledAt === 'auto-queue' ? null : scheduledAt,
        status: 'pending',
        profile: profile || 'Fatin'
      };

      const { error } = await supabase.from('scheduled_posts').insert([queueData]);
      if (error) throw new Error(error.message);

      return NextResponse.json({ success: true, message: 'Berjaya dimasukkan ke dalam senarai queue!' });
    }

    // Jika pos terus (pos sekarang) menggunakan Promise.allSettled
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
