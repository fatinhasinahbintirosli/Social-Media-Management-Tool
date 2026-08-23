// app/api/schedule/route.js

import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Menyokong fleksibiliti nama pemboleh ubah dari Frontend
    const rawPages = body.pages || body.selectedPages || body.pagesPayload || [];
    const message = body.message || body.caption || body.postText || '';
    const imageUrl = body.imageUrl || body.image_url || '';
    const mode = body.mode || 'now';
    const scheduledTime = body.scheduledTime || body.scheduled_time;
    const firstComment = body.firstComment || body.first_comment;
    const commentImageUrl = body.commentImageUrl || body.comment_image_url;

    if (!rawPages || rawPages.length === 0) {
      return NextResponse.json(
        { error: 'Sila pilih sekurang-kurangnya satu Page.' }, 
        { status: 400 }
      );
    }

    // 🔴 Pembersihan Duplikat: Buang page_id yang berulang
    const uniquePages = Array.from(
      new Map(rawPages.map(item => [item.page_id || item.id, item])).values()
    );

    // Dynamic Parallel Execution menggunakan Promise.allSettled
    const postPromises = uniquePages.map(async (page) => {
      const page_id = page.page_id || page.id;
      const access_token = page.access_token || page.token;

      if (!page_id || !access_token) {
        throw new Error(`Maklumat Page tidak lengkap untuk ID: ${page_id}`);
      }

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
        if (fbData.error) {
          throw new Error(`[${page_id}] FB Error: ${fbData.error.message}`);
        }

        const postId = fbData.id || fbData.post_id;

        // Hantar First Comment jika disediakan
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
        if (fbData.error) {
          throw new Error(`[${page_id}] FB Schedule Error: ${fbData.error.message}`);
        }

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
      // MOD 3: AUTO-QUEUE ('auto')
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

        if (error) {
          throw new Error(`[${page_id}] Queue DB Error: ${error.message}`);
        }

        return { page_id, status: 'queued' };
      }
    });

    const results = await Promise.allSettled(postPromises);

    const successful = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const failed = results
      .filter(r => r.status === 'rejected')
      .map(r => r.reason.message);

    return NextResponse.json({
      success: true,
      totalProcessed: uniquePages.length,
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
