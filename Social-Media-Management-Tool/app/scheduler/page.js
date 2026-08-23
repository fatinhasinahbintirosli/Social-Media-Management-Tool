'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export default function SchedulerPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const CORRECT_PASSWORD = 'mohdfadliselangor1';

  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [commentImageUrl, setCommentImageUrl] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [postMode, setPostMode] = useState('now'); 
  const [currentProfile, setCurrentProfile] = useState('Fatin');
  const [loading, setLoading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [fetchingPages, setFetchingPages] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    const authStatus = sessionStorage.getItem('scheduler_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }

    const savedProfile = localStorage.getItem('fb_scheduler_profile') || 'Fatin';
    setCurrentProfile(savedProfile);

    async function initData() {
      const { data: pData } = await supabase.from('pages').select('page_id, page_name').order('page_name', { ascending: true });
      setPages(pData || []);
      setFetchingPages(false);
    }
    initData();
  }, []);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('scheduler_auth', 'true');
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('scheduler_auth');
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  const handleProfileChange = (profileName) => {
    setCurrentProfile(profileName);
    localStorage.setItem('fb_scheduler_profile', profileName);
  };

  const handleSelectAll = () => {
    setSelectedPages(selectedPages.length === pages.length ? [] : pages.map(p => p.page_id));
  };

  const handlePageToggle = (pageId) => {
    setSelectedPages(selectedPages.includes(pageId) ? selectedPages.filter(id => id !== pageId) : [...selectedPages, pageId]);
  };

  const handleFileUpload = async (e, setUrlState) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('post-media')
      .upload(fileName, file);

    if (error) {
      alert('Gagal memuat naik fail: ' + error.message);
    } else {
      const { data: publicUrlData } = supabase.storage.from('post-media').getPublicUrl(fileName);
      setUrlState(publicUrlData.publicUrl);
    }
    setFileUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedPages.length === 0) return alert('Sila pilih sekurang-kurangnya satu Facebook Page.');

    setLoading(true);
    
    let finalImageUrl = imageUrl || null;
    let finalVideoUrl = null;

    if (finalImageUrl) {
      const lowerUrl = finalImageUrl.toLowerCase();
      if (lowerUrl.endsWith('.mp4') || lowerUrl.includes('video') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm')) {
        finalVideoUrl = finalImageUrl;
        finalImageUrl = null;
      }
    }

    const payload = {
      pageIds: selectedPages,
      message,
      imageUrl: finalImageUrl,
      videoUrl: finalVideoUrl,
      firstComment: firstComment || null,
      commentImageUrl: commentImageUrl || null,
      scheduledAt: postMode === 'auto' ? 'auto-queue' : (scheduledAt || null),
      profile: currentProfile,
    };

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message || 'Berjaya!');
      
      setMessage(''); 
      setImageUrl(''); 
      setFirstComment(''); 
      setCommentImageUrl('');
    } catch (err) {
      alert(`Ralat: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', background: '#f4f4f4' }}>
        <form onSubmit={handleLoginSubmit} style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '350px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px', color: '#111' }}>Max Baginda Trading</h2>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Sila masukkan kata laluan untuk mengakses modul Scheduler.</p>
          
          <input 
            type="password" 
            placeholder="Kata laluan..." 
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
          
          {loginError && <p style={{ color: 'red', fontSize: '13px', marginBottom: '15px' }}>Kata laluan salah!</p>}
          
          <button type="submit" style={{ width: '100%', background: '#0d6efd', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            Log Masuk
          </button>
          
          <div style={{ marginTop: '20px' }}>
            <a href="/" style={{ fontSize: '13px', color: '#666', textDecoration: 'none' }}>← Kembali ke Laman Utama</a>
          </div>
        </form>
      </main>
    );
  }

  // Semak sama ada URL media utama adalah video atau gambar
  const isVideo = imageUrl.toLowerCase().endsWith('.mp4') || imageUrl.includes('video') || imageUrl.includes('.mov') || imageUrl.includes('.webm');

  return (
    <main style={{ maxWidth: '1400px', margin: '20px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* Bahagian Atas: Profil & Navigasi */}
      <div style={{ background: '#e7f3ff', padding: '15px', borderRadius: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div><strong>👤 Profil Pengguna Semasa:</strong> {currentProfile}</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={() => handleProfileChange('Fatin')} style={{ padding: '6px 12px', background: currentProfile === 'Fatin' ? '#0d6efd' : '#fff', color: currentProfile === 'Fatin' ? '#fff' : '#000', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Profil Fatin</button>
          <button type="button" onClick={() => handleProfileChange('Adik')} style={{ padding: '6px 12px', background: currentProfile === 'Adik' ? '#198754' : '#fff', color: currentProfile === 'Adik' ? '#fff' : '#000', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Profil Adik</button>
        </div>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href="/queue-settings" style={{ padding: '8px 14px', background: '#333', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>⚙️ Update Time Slots ({currentProfile})</Link>
          <Link href="/queue" style={{ padding: '8px 14px', background: '#1877f2', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>📋 Lihat Senarai Queue</Link>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/" style={{ padding: '8px 14px', background: '#6c757d', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>🏠 Laman Utama</a>
          <button onClick={handleLogout} style={{ padding: '8px 14px', background: '#dc3545', color: '#fff', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>🔒 Log Keluar</button>
        </div>
      </div>

      <h1 style={{ color: '#1877f2', marginBottom: '20px' }}>Facebook Scheduler & Preview</h1>

      {/* REKA BENTUK 2 KOLUM (KIRI: FORM, KANAN: LIVE PREVIEW) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px', alignItems: 'start' }}>
        
        {/* KOLUM KIRI: BORANG PENGISIAN */}
        <form onSubmit={handleSubmit} style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '1px solid #dee2e6' }}>
          
          {/* Pilih Pages */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: 'bold' }}>Pilih Pages ({selectedPages.length}/{pages.length}):</label>
              <button type="button" onClick={handleSelectAll} style={{ fontSize: '12px', background: 'none', border: 'none', color: '#1877f2', cursor: 'pointer', textDecoration: 'underline' }}>
                {selectedPages.length === pages.length ? 'Nyahpilih Semua' : 'Pilih Semua'}
              </button>
            </div>
            {fetchingPages ? (
              <p style={{ fontSize: '13px' }}>Memuatkan senarai page...</p>
            ) : (
              <div style={{ height: '140px', overflowY: 'auto', background: '#fff', padding: '10px', border: '1px solid #ccc', borderRadius: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {pages.map(p => (
                  <label key={p.page_id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedPages.includes(p.page_id)} onChange={() => handlePageToggle(p.page_id)} />
                    {p.page_name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Kapsyen */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Kapsyen:</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tulis kapsyen pos anda..." style={{ width: '100%', height: '90px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
          </div>

          {/* Upload Media Utama */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Upload Gambar / Video Utama (Pilihan):</label>
            <input 
              type="file" 
              accept="image/*,video/*"
              onChange={(e) => handleFileUpload(e, setImageUrl)} 
              disabled={fileUploading}
              style={{ marginBottom: '5px', display: 'block', fontSize: '13px' }} 
            />
            <input 
              type="text" 
              value={imageUrl} 
              onChange={e => setImageUrl(e.target.value)} 
              placeholder="Atau salin/tampal URL gambar/video..." 
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
            />
            {fileUploading && <small style={{ color: '#0d6efd' }}>Sedang memuat naik fail ke storage...</small>}
          </div>

          {/* First Comment */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>First Comment (Komen Pertama):</label>
            <textarea value={firstComment} onChange={e => setFirstComment(e.target.value)} placeholder="Tulis komen pertama (pilihan)..." style={{ width: '100%', height: '60px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
          </div>

          {/* Comment Image URL */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Gambar untuk First Comment (Pilihan):</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => handleFileUpload(e, setCommentImageUrl)} 
              disabled={fileUploading}
              style={{ marginBottom: '5px', display: 'block', fontSize: '13px' }} 
            />
            <input 
              type="text" 
              value={commentImageUrl} 
              onChange={e => setCommentImageUrl(e.target.value)} 
              placeholder="Atau URL gambar komen..." 
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
            />
          </div>

          {/* Pilihan Mod Hantaran */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', fontSize: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              <input type="radio" name="postMode" checked={postMode === 'now'} onChange={() => { setPostMode('now'); setScheduledAt(''); }} /> Pos Sekarang
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              <input type="radio" name="postMode" checked={postMode === 'manual'} onChange={() => setPostMode('manual')} /> Jadual Manual
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              <input type="radio" name="postMode" checked={postMode === 'auto'} onChange={() => { setPostMode('auto'); setScheduledAt(''); }} /> Auto-Queue ({currentProfile})
            </label>
          </div>

          {postMode === 'manual' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Pilih Tarikh & Masa:</label>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || fileUploading} 
            style={{ width: '100%', padding: '12px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
          >
            {loading ? 'Memproses...' : (postMode === 'now' ? 'Hantar Sekarang' : `Masukkan ke Auto-Queue (${currentProfile})`)}
          </button>
        </form>


        {/* KOLUM KANAN: FACEBOOK LIVE PREVIEW ALA SOCIALCHAMP */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', border: '1px solid #dee2e6', position: 'sticky', top: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            <span style={{ fontWeight: 'bold', color: '#1877f2', display: 'flex', alignItems: 'center', gap: '6px' }}>
              f <span>Facebook Preview</span>
            </span>
            <span style={{ fontSize: '11px', background: '#e7f3ff', color: '#1877f2', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Desktop Feed</span>
          </div>

          {/* Kotak Mockup Facebook Post */}
          <div style={{ border: '1px solid #ccd0d5', borderRadius: '8px', background: '#fff', padding: '12px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
            
            {/* Header Profil Page */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1877f2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                MB
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#050505' }}>Max Baginda Trading</div>
                <div style={{ fontSize: '11px', color: '#65676b' }}>Baru sahaja &bull; 🌎</div>
              </div>
            </div>

            {/* Kapsyen Preview */}
            <div style={{ fontSize: '14px', color: '#050505', marginBottom: '10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '24px' }}>
              {message || <span style={{ color: '#b0b3b8', fontStyle: 'italic' }}>Kapsyen hantaran anda akan dipaparkan di sini...</span>}
            </div>

            {/* Media Utama (Gambar / Video) */}
            {imageUrl ? (
              <div style={{ marginBottom: '10px', borderRadius: '6px', overflow: 'hidden', background: '#000', maxHeight: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {isVideo ? (
                  <video src={imageUrl} controls style={{ width: '100%', maxHeight: '250px', objectFit: 'contain' }} />
                ) : (
                  <img src={imageUrl} alt="Preview" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', display: 'block' }} />
                )}
              </div>
            ) : (
              <div style={{ height: '120px', background: '#f0f2f5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c939d', fontSize: '13px', marginBottom: '10px', border: '1px dashed #ccd0d5' }}>
                📷 Ruang Paparan Gambar / Video
              </div>
            )}

            {/* Butang Interaksi Palsu FB */}
            <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #e4e6eb', borderBottom: '1px solid #e4e6eb', padding: '6px 0', fontSize: '13px', color: '#65676b', fontWeight: '600', marginBottom: '10px' }}>
              <span>👍 Suka</span>
              <span>💬 Komen</span>
              <span>↗️ Kongsi</span>
            </div>

            {/* PREVIEW FIRST COMMENT DI BAWAH */}
            {(firstComment || commentImageUrl) && (
              <div style={{ background: '#f0f2f5', padding: '8px 10px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#65676b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: '0' }}>
                  MB
                </div>
                <div style={{ fontSize: '13px', width: '100%' }}>
                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '12px', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word' }}>
                    <span style={{ fontWeight: 'bold', display: 'block', fontSize: '12px', color: '#050505' }}>Max Baginda Trading (Komen Pertama)</span>
                    {firstComment || <span style={{ color: '#b0b3b8', fontStyle: 'italic' }}>Teks komen pertama...</span>}
                  </div>
                  {commentImageUrl && (
                    <div style={{ marginTop: '5px', maxWidth: '120px', borderRadius: '6px', overflow: 'hidden' }}>
                      <img src={commentImageUrl} alt="Comment Preview" style={{ width: '100%', display: 'block' }} />
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </main>
  );
}
