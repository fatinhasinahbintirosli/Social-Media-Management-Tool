import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Fungsi bantuan delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Kunci Supabase tidak lengkap.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const nowIso = new Date().toISOString();
    const { data: posts, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', nowIso);

    if (fetchError) throw fetchError;
    if (!posts || posts.length === 0) {
      return NextResponse.json({ message: 'Tiada pos untuk diproses.' });
    }

    const { data: pages, error: pagesError } = await supabase.from('pages').select('*');
    if (pagesError) throw pagesError;

    const pageMap = new Map(pages.map((p) => [p.page_id, p.access_token]));

    for (const post of posts) {
      let pageIds = post.page_ids;
      if (typeof pageIds === 'string') {
        try { pageIds = JSON.parse(pageIds); } catch (e) { pageIds = [pageIds]; }
      }

      let hasError = false;
      let lastErrorMessage = '';

      for (const pageId of pageIds) {
        const accessToken = pageMap.get(pageId);
        if (!accessToken) {
          hasError = true;
          lastErrorMessage = `Access token tidak dijumpai untuk page ${pageId}`;
          continue;
        }

        try {
          let targetPostId = null;

          // A) HANTAR GAMBAR UTAMA
          if (post.image_url) {
            const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: post.image_url,
                caption: post.message || '',
                access_token: accessToken,
              }),
            });
            const fbData = await fbRes.json();
            if (fbData.error) throw new Error(`Media Error: ${fbData.error.message}`);
            
            // Facebook memulangkan post_id (id post luaran) atau id photo
            targetPostId = fbData.post_id || fbData.id;
          } 
          // B) HANTAR VIDEO UTAMA
          else if (post.video_url) {
            const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/videos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file_url: post.video_url,
                description: post.message || '',
                access_token: accessToken,
              }),
            });
            const fbData = await fbRes.json();
            if (fbData.error) throw new Error(`Video Error: ${fbData.error.message}`);
            targetPostId = fbData.id;
          } 
          // C) HANTAR TEKS SAHAJA
          else {
            const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: post.message || '',
                access_token: accessToken,
              }),
            });
            const fbData = await fbRes.json();
            if (fbData.error) throw new Error(`Feed Error: ${fbData.error.message}`);
            targetPostId = fbData.id;
          }

          // D) HANTAR FIRST COMMENT (Tunggu 2 saat supaya ID bersedia di Facebook Graph)
          if (targetPostId && (post.first_comment || post.comment_image_url)) {
            await sleep(2000); // Penangguhan 2 saat

            const commentPayload = { access_token: accessToken };
            if (post.first_comment) {
              commentPayload.message = post.first_comment;
            }
            if (post.comment_image_url) {
              commentPayload.attachment_url = post.comment_image_url;
            }

            const commentRes = await fetch(`https://graph.facebook.com/v19.0/${targetPostId}/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(commentPayload),
            });

            const commentData = await commentRes.json();

            // Jika masih gagal guna post_id, cuba post terus menggunakan id asas
            if (commentData.error) {
              console.warn('Pertama gagal, mencuba fallback comment:', commentData.error.message);
              
              // Padamkan attachment_url jika ia yang menyebabkan ralat Facebook
              delete commentPayload.attachment_url;
              if (post.first_comment) {
                const retryRes = await fetch(`https://graph.facebook.com/v19.0/${targetPostId}/comments`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(commentPayload),
                });
                const retryData = await retryRes.json();
                if (retryData.error) {
                  console.error('Komen gagal sepenuhnya:', retryData.error.message);
                }
              }
            }
          }

        } catch (postErr) {
          hasError = true;
          lastErrorMessage = postErr.message;
        }
      }

      // Kemas kini status dalam database Supabase
      if (hasError) {
        await supabase
          .from('scheduled_posts')
          .update({ status: 'failed', error_log: lastErrorMessage })
          .eq('id', post.id);
      } else {
        await supabase
          .from('scheduled_posts')
          .update({ status: 'published', error_log: null })
          .eq('id', post.id);
      }
    }

    return NextResponse.json({ success: true, message: 'Pemprosesan pos selesai.' });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
