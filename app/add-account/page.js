'use client';
import { useState } from 'react';

export default function AddAccount() {
  const [loading, setLoading] = useState(false);

  const handleConnectFacebook = () => {
    setLoading(true);
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    
    // Redirect URI merujuk kepada API endpoint callback di Vercel anda
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/facebook/callback`);
    
    // Keizinan (permissions) yang anda telah pilih
    const scope = encodeURIComponent('pages_show_list,business_management,pages_read_engagement,pages_read_user_content,pages_manage_posts');

    // Hantar pengguna ke tetingkap log masuk Facebook
    window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}`;
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Add Social Account</h1>
      <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '20px', width: '300px' }}>
        <h3>Facebook</h3>
        <p>Profile, Page & Group</p>
        <button 
          onClick={handleConnectFacebook} 
          disabled={loading}
          style={{ padding: '10px 20px', backgroundColor: '#1877F2', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {loading ? 'Connecting...' : '+ Add'}
        </button>
      </div>
    </div>
  );
}
