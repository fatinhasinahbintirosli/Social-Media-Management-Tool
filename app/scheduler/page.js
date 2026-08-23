'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SchedulerPage() {
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [activeProfile, setActiveProfile] = useState('Fatin');
  const [postOption, setPostOption] = useState('now');

  // Ambil senarai Facebook Pages dari Supabase
  useEffect(() => {
    async function fetchPages() {
      const { data, error } = await supabase.from('facebook_pages').select('*');
      if (data) setPages(data);
    }
    fetchPages();
  }, []);

  const handleConnectFacebook = () => {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/facebook/callback`);
    const scope = encodeURIComponent('pages_show_list,business_management,pages_read_engagement,pages_read_user_content,pages_manage_posts');

    window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}`;
  };

  const handlePageToggle = (pageId) => {
    setSelectedPages(prev => 
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  return (
    <div style={{ padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      
      {/* Profil Banner */}
      <div style={{ backgroundColor: '#e0f2fe', padding: '12px 20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>👤 Profil Pengguna Semasa: {activeProfile}</span>
        <div>
          <button onClick={() => setActiveProfile('Fatin')} style={{ backgroundColor: activeProfile === 'Fatin' ? '#3b82f6' : '#fff', color: activeProfile === 'Fatin' ? '#fff' : '#000', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>Profil Fatin</button>
          <button onClick={() => setActiveProfile('Adik')} style={{ backgroundColor: activeProfile === 'Adik' ? '#3b82f6' : '#fff', color: activeProfile === 'Adik' ? '#fff' : '#000', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer' }}>Profil Adik</button>
        </div>
      </div>

      {/* Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ backgroundColor: '#374151', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>⚙️ Update Time Slots ({activeProfile})</button>
          <button style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>📋 Lihat Senarai Queue</button>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/" style={{ backgroundColor: '#4b5563', color: '#fff', padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', fontSize: '14px' }}>🏠 Laman Utama</a>
          <button style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>🔒 Log Keluar</button>
        </div>
      </div>

      {/* Tajuk Utama & Butang Connect Facebook */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#2563eb', margin: 0 }}>Facebook Scheduler & Preview</h1>
        
        <button
          onClick={handleConnectFacebook}
          style={{
            backgroundColor: '#1877F2',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '6px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          + Connect Facebook Page
        </button>
      </div>

      {/* Form & Preview Container */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Left Form Column */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          
          {/* Pilih Pages */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontWeight: 'bold' }}>Pilih Pages ({selectedPages.length}/{pages.length}):</label>
              <button onClick={() => setSelectedPages([])} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px' }}>Nyahpilih Semua</button>
            </div>
            <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '10px', minHeight: '100px', maxHeight: '150px', overflowY: 'auto' }}>
              {pages.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>Tiada Page ditemui. Sila klik "+ Connect Facebook Page" di atas untuk menambah Page.</p>
              ) : (
                pages.map(page => (
                  <label key={page.page_id} style={{ display: 'block', marginBottom: '5px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedPages.includes(page.page_id)} 
                      onChange={() => handlePageToggle(page.page_id)}
                      style={{ marginRight: '8px' }}
                    />
                    {page.page_name}
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Kapsyen */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Kapsyen:</label>
            <textarea 
              rows="4" 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tulis kapsyen pos anda..." 
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Upload Gambar */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Upload Gambar / Video Utama (Pilihan):</label>
            <input 
              type="text" 
              placeholder="Atau salin/tampal URL gambar/video..." 
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px', boxSizing: 'border-box' }}
            />
          </div>

          {/* First Comment */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>First Comment (Komen Pertama):</label>
            <textarea 
              rows="2" 
              value={firstComment}
              onChange={(e) => setFirstComment(e.target.value)}
              placeholder="Tulis komen pertama (pilihan)..." 
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Pilihan Hantar */}
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <label><input type="radio" name="postOpt" checked={postOption === 'now'} onChange={() => setPostOption('now')} /> Pos Sekarang</label>
            <label><input type="radio" name="postOpt" checked={postOption === 'manual'} onChange={() => setPostOption('manual')} /> Jadual Manual</label>
            <label><input type="radio" name="postOpt" checked={postOption === 'auto'} onChange={() => setPostOption('auto')} /> Auto-Queue ({activeProfile})</label>
          </div>

          <button style={{ width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Hantar Sekarang
          </button>

        </div>

        {/* Right Preview Column */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h4 style={{ margin: 0, color: '#2563eb' }}>f Facebook Preview</h4>
            <span style={{ fontSize: '12px', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>Desktop Feed</span>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                MB
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '14px' }}>Max Baginda Trading</strong>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>Baru sahaja • 🌐</span>
              </div>
            </div>

            <p style={{ color: caption ? '#000' : '#9ca3af', fontSize: '14px', minHeight: '40px', whitespace: 'pre-wrap' }}>
              {caption || 'Kapsyen hantaran anda akan dipaparkan di sini...'}
            </p>

            <div style={{ backgroundColor: '#f3f4f6', height: '180px', border: '1px dashed #d1d5db', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '14px', marginBottom: '15px' }}>
              {mediaUrl ? <img src={mediaUrl} alt="Preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} /> : '📷 Ruang Paparan Gambar / Video'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #e5e7eb', paddingTop: '10px', fontSize: '13px', color: '#6b7280' }}>
              <span>👍 Suka</span>
              <span>💬 Komen</span>
              <span>↗️ Kongsi</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
