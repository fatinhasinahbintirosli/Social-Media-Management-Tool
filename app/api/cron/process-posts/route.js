import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
          let rawPostId = null;

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
            rawPostId = fbData.post_id || fbData.id;
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
            rawPostId = fbData.id;
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
            rawPostId = fbData.id;
          }

          // D) HANTAR FIRST COMMENT
          if (rawPostId && (post.first_comment || post.comment_image_url)) {
            await sleep(2000); // Tunggu Facebook index pos

            // Bersihkan ID: Jika ID berbentuk PAGEID_POSTID, ambil bahagian POSTID atau kekalkan mengikut keperluan Graph API
            const targetId = rawPostId;

            // Bina URL form-data / URLSearchParams untuk ketepatan Meta Graph API
            const commentParams = new URLSearchParams();
            commentParams.append('access_token', accessToken);
            
            if (post.first_comment) {
              commentParams.append('message', post.first_comment);
            }
            if (post.comment_image_url) {
              commentParams.append('attachment_url', post.comment_image_url);
            }

            const commentRes = await fetch(`https://graph.facebook.com/v19.0/${targetId}/comments`, {
              method: 'POST',
              body: commentParams,
            });

            const commentData = await commentRes.json();

            if (commentData.error) {
              // Jika gagal sebab attachment, cuba hantar mesej sahaja
              if (post.comment_image_url && post.first_comment) {
                const retryParams = new URLSearchParams();
                retryParams.append('access_token', accessToken);
                retryParams.append('message', post.first_comment);

                const retryRes = await fetch(`https://graph.facebook.com/v19.0/${targetId}/comments`, {
                  method: 'POST',
                  body: retryParams,
                });
                const retryData = await retryRes.json();
                if (retryData.error) {
                  throw new Error(`Comment Error: ${retryData.error.message}`);
                }
              } else {
                throw new Error(`Comment Error: ${commentData.error.message}`);
              }
            }
          }

        } catch (postErr) {
          hasError = true;
          lastErrorMessage = postErr.message;
        }
      }

      // Kemas kini status dalam pangkalan data Supabase
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
