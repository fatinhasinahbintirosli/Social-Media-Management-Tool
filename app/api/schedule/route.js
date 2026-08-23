import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Menggunakan client supabase sedia ada dari lib

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      pages,            // Array of selected pages [{ page_id, access_token }, ...]
      message,          // Mesej post
      imageUrl,         // Public URL gambar dari Supabase Storage
      mode,             // 'now', 'manual', atau 'auto'
      scheduledTime,    // ISO String / Timestamp untuk Jadual Manual
      firstComment,     // Mesej First Comment
      commentImageUrl   // URL Gambar First Comment
    } = body;

    if (!pages || pages.length === 0) {
      return NextResponse.json({ error: 'Sila pilih sekurang-kurangnya satu Page.' }, { status: 400 });
    }

    // Process serentak untuk semua page menggunakan Promise.allSettled
    const postPromises = pages.map(async (page) => {
      const { page_id, access_token } = page;

      // ==========================================
      // MOD 1: POS SEKARANG ('now')
      // ==========================================
      if (mode === 'now') {
        let endpoint = `https://graph.facebook.com/v19.0/${page_id}/feed`;
        let payload = {
          access_token: access_token,
          message: message,
        };

        if (imageUrl) {
          endpoint = `https://graph.facebook.com/v19.0/${page_id}/photos`;
          payload.url = imageUrl;
          payload.caption = message;
        }

        const fbRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const fbData = await fbRes.json();
        if (fbData.error) throw new Error(`[${page_id}] FB Error: ${fbData.error.message}`);

        const postId = fbData.id || fbData.post_id;

        // Post First Comment jika ada
        if (firstComment || commentImageUrl) {
          await postFirstComment(postId, access_token, firstComment, commentImageUrl);
        }

        return { page_id, status: 'posted', postId };
      } 

      // ==========================================
      // MOD 2: JADUAL MANUAL ('manual')
      // ==========================================
      else if (mode === 'manual') {
        const publishTimestamp = Math.floor(new Date(scheduledTime).getTime() / 1000);
        
        let endpoint = `https://graph.facebook.com/v19.0/${page_id}/feed`;
        let payload = {
          access_token: access_token,
          published: false,
          scheduled_publish_time: publishTimestamp,
        };

        if (imageUrl) {
          endpoint = `https://graph.facebook.com/v19.0/${page_id}/photos`;
          payload.url = imageUrl;
          payload.caption = message;
        } else {
          payload.message = message;
        }

        const fbRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const fbData = await fbRes.json();
        if (fbData.error) throw new Error(`[${page_id}] FB Schedule Error: ${fbData.error.message}`);

        if (firstComment || commentImageUrl) {
          await supabase.from('scheduled_comments').insert({
            page_id,
            post_id: fbData.id,
            comment_text: firstComment,
            comment_image_url: commentImageUrl,
            scheduled_at: scheduledTime,
            status: 'pending'
          });
        }

        return { page_id, status: 'scheduled', scheduledTime };
      } 

      // ==========================================
      // MOD 3: AUTO-QUEUE / FATIN ('auto')
      // ==========================================
      else if (mode === 'auto') {
        const { error } = await supabase.from('auto_queue').insert({
          page_id: page_id,
          access_token: access_token,
          message: message,
          image_url: imageUrl,
          first_comment: firstComment,
          comment_image_url: commentImageUrl,
          status: 'queued',
          created_at: new Date().toISOString()
        });

        if (error) throw new Error(`[${page_id}] Queue DB Error: ${error.message}`);

        return { page_id, status: 'queued' };
      }
    });

    // PARALLEL EXECUTION: Hantar kesemua request serentak
    const results = await Promise.allSettled(postPromises);

    const successful = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const failed = results
      .filter(r => r.status === 'rejected')
      .map(r => r.reason.message);

    return NextResponse.json({
      success: true,
      total: pages.length,
      successCount: successful.length,
      failedCount: failed.length,
      successful,
      failed
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Helper Function First Comment
async function postFirstComment(postId, accessToken, commentText, commentImageUrl) {
  try {
    let commentPayload = { access_token: accessToken };
    
    if (commentText) commentPayload.message = commentText;
    if (commentImageUrl) commentPayload.attachment_url = commentImageUrl;

    await fetch(`https://graph.facebook.com/v19.0/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commentPayload),
    });
  } catch (err) {
    console.error(`Gagal First Comment post ${postId}:`, err);
  }
}
