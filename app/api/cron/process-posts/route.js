import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const now = new Date().toISOString();

    // 1. Cari post yang berstatus 'pending' dan sudah sampai/melewati masa penjadualan
    const { data: posts, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now);

    if (fetchError) {
      throw new Error(`DB Fetch Error: ${fetchError.message}`);
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ message: 'Tiada post pending untuk diproses masa ini.' });
    }

    const results = [];

    // 2. Loop setiap post yang perlu dimuat naik
    for (const post of posts) {
      let pageIds = [];
      try {
        pageIds = typeof post.page_ids === 'string' ? JSON.parse(post.page_ids) : post.page_ids;
      } catch (e) {
        pageIds = post.page_ids || [];
      }

      // Ambil Access Token bagi Facebook Page yang terlibat dari jadual 'pages'
      const { data: pagesData } = await supabase
        .from('pages')
        .select('page_id, access_token')
        .in('page_id', pageIds);

      if (!pagesData || pagesData.length === 0) {
        await supabase
          .from('scheduled_posts')
          .update({ status: 'failed', error_log: 'Page access token tidak dijumpai.' })
          .eq('id', post.id);
        continue;
      }

      let hasError = false;
      let lastErrorMessage = '';

      // 3. Hantar post ke Facebook Graph API untuk setiap page
      for (const page of pagesData) {
        const fbUrl = `https://graph.facebook.com/v19.0/${page.page_id}/feed`;
        const bodyParams = new URLSearchParams({
          message: post.message || '',
          access_token: page.access_token,
        });

        if (post.image_url) {
          bodyParams.append('link', post.image_url);
        }

        const fbRes = await fetch(fbUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: bodyParams.toString(),
        });

        const fbData = await fbRes.json();

        if (fbData.error) {
          hasError = true;
          lastErrorMessage = fbData.error.message;
        } else if (post.first_comment) {
          // Hantar First Comment sekiranya ada
          const postId = fbData.id;
          const commentUrl = `https://graph.facebook.com/v19.0/${postId}/comments`;
          await fetch(commentUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              message: post.first_comment,
              access_token: page.access_token,
            }).toString(),
          });
        }
      }

      // 4. Kemaskini status post dalam Supabase
      if (hasError) {
        await supabase
          .from('scheduled_posts')
          .update({ status: 'failed', error_log: lastErrorMessage })
          .eq('id', post.id);
        results.push({ id: post.id, status: 'failed', error: lastErrorMessage });
      } else {
        await supabase
          .from('scheduled_posts')
          .update({ status: 'published', error_log: null })
          .eq('id', post.id);
        results.push({ id: post.id, status: 'published' });
      }
    }

    return NextResponse.json({ success: true, processed: results });

  } catch (err) {
    console.error('Cron Execution Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
