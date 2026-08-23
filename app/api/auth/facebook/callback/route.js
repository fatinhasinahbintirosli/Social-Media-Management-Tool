import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const origin = new URL(request.url).origin;

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${origin}/api/auth/facebook/callback`;

    // 1. Tukar 'code' kepada Short-lived Access Token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message || 'Gagal mendapatkan token daripada Facebook');
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Tukar kepada Long-lived Access Token (Sah sehingga 60 hari)
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
    );
    const longLivedData = await longLivedRes.json();
    const userAccessToken = longLivedData.access_token || shortLivedToken;

    // 3. Tarik senarai Facebook Pages milik pengguna
    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`);
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      throw new Error(pagesData.error.message || 'Gagal menarik senarai Facebook Pages');
    }

    // 4. Simpan senarai Page ke jadual facebook_pages di Supabase
    if (pagesData.data && pagesData.data.length > 0) {
      for (const page of pagesData.data) {
        await supabase.from('facebook_pages').upsert({
          page_id: page.id,
          page_name: page.name,
          access_token: page.access_token,
          category: page.category || 'General'
        }, { onConflict: 'page_id' });
      }
    }

    // Redirect pengguna kembali ke halaman utama
    return NextResponse.redirect(`${origin}/?status=success`);

  } catch (error) {
    console.error('Facebook Auth Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
