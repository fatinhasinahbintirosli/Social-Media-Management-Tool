import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // 1. Semak jika pengguna membatalkan keizinan atau terdapat ralat dari Facebook
  if (error || !code) {
    return NextResponse.redirect(`${origin}/scheduler?status=error&message=${encodeURIComponent(error || 'No code provided')}`);
  }

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = `${origin}/api/auth/facebook/callback`;

  try {
    // 2. Tukar authorization code kepada User Access Token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message);
    }

    const userAccessToken = tokenData.access_token;

    // 3. Ambil senarai Facebook Pages yang diuruskan oleh pengguna berserta Long-Lived Page Access Token
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      throw new Error(pagesData.error.message);
    }

    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return NextResponse.redirect(`${origin}/scheduler?status=error&message=${encodeURIComponent('Tiada Facebook Page dijumpai untuk akaun ini.')}`);
    }

    // 4. Inisialisasi Supabase Client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // 5. Simpan/Kemaskini senarai Pages dan Token ke dalam pangkalan data Supabase
    for (const page of pages) {
      const { error: dbError } = await supabase
        .from('pages')
        .upsert({
          page_id: page.id,
          page_name: page.name,
          access_token: page.access_token,
          category: page.category || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'page_id' });

      if (dbError) {
        console.error(`Ralat menyimpan page ${page.name}:`, dbError.message);
      }
    }

    // 6. Lencongkan (*Redirect*) semula pengguna ke Halaman Scheduler
    return NextResponse.redirect(`${origin}/scheduler?status=success`);

  } catch (err) {
    console.error('Facebook Auth Callback Error:', err.message);
    return NextResponse.redirect(`${origin}/scheduler?status=error&message=${encodeURIComponent(err.message)}`);
  }
}
