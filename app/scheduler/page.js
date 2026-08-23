// app/scheduler/page.js

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SchedulerPage() {
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [caption, setCaption] = useState('');
  const [mode, setMode] = useState('now'); // 'now', 'manual', atau 'auto'
  const [scheduledTime, setScheduledTime] = useState('');
  
  // First Comment States
  const [firstComment, setFirstComment] = useState('');
  
  // Media Files / Upload States
  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImageUrlInput, setMainImageUrlInput] = useState('');
  const [commentImageFile, setCommentImageFile] = useState(null);
  const [commentImageUrlInput, setCommentImageUrlInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // Ambil senarai Facebook Pages dari Supabase semasa komponen di-mount
  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    const { data, error } = await supabase.from('pages').select('*');
    if (error) {
      console.error('Ralat mengambil senarai page:', error);
    } else if (data) {
      setPages(data);
      // Pilih semua page secara lalai
      setSelectedPages(data);
    }
  };

  // Kawalan pilih / nyahpilih Page
  const handleSelectAll = () => {
    if (selectedPages.length === pages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages([...pages]);
    }
  };

  const handleTogglePage = (page) => {
    const exists = selectedPages.some((p) => p.page_id === page.page_id);
    if (exists) {
      setSelectedPages(selectedPages.filter((p) => p.page_id !== page.page_id));
    } else {
      setSelectedPages([...selectedPages, page]);
    }
  };

  // Helper untuk Muat Naik Imej ke Supabase Storage
  const uploadImageToStorage = async (file) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('social media management tool')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Gagal muat naik imej: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from('social media management tool')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // Pengendali Butang Submit Utama
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) return; // Elak klik kali kedua

    if (selectedPages.length === 0) {
      alert('Ralat: Sila pilih sekurang-kurangnya satu Page.');
      return;
    }

    if (!caption && !mainImageFile && !mainImageUrlInput) {
      alert('Sila masukkan kapsyen atau gambar.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Muat naik imej utama jika ada
      let finalImageUrl = mainImageUrlInput;
      if (mainImageFile) {
        finalImageUrl = await uploadImageToStorage(mainImageFile);
      }

      // 2. Muat naik imej first comment jika ada
      let finalCommentImageUrl = commentImageUrlInput;
      if (commentImageFile) {
        finalCommentImageUrl = await uploadImageToStorage(commentImageFile);
      }

      // 3. Bersihkan payload peranti (Hantar format unik { page_id, access_token })
      const pagesPayload = selectedPages.map((p) => ({
        page_id: p.page_id,
        access_token: p.access_token,
      }));

      // 4. Hantar data ke Backend API
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: pagesPayload,
          message: caption,
          imageUrl: finalImageUrl,
          mode: mode,
          scheduledTime: scheduledTime,
          firstComment: firstComment,
          commentImageUrl: finalCommentImageUrl,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(`Ralat: ${result.error || 'Gagal memproses hantaran.'}`);
      } else {
        alert(`Berjaya! ${result.successCount} daripada ${result.totalProcessed} Page berjaya diproses.`);
        // Reset borang
        setCaption('');
        setFirstComment('');
        setMainImageFile(null);
        setMainImageUrlInput('');
        setCommentImageFile(null);
        setCommentImageUrlInput('');
      }
    } catch (err) {
      console.error(err);
      alert(`Ralat Sistem: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Facebook Scheduler & Preview</h1>

      <form onSubmit={handleSubmit}>
        {/* Bahagian Pemilihan Pages */}
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <strong>Pilih Pages ({selectedPages.length}/{pages.length}):</strong>
            <button type="button" onClick={handleSelectAll} style={{ cursor: 'pointer' }}>
              {selectedPages.length === pages.length ? 'Nyahpilih Semua' : 'Pilih Semua'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
            {pages.map((page) => {
              const isChecked = selectedPages.some((p) => p.page_id === page.page_id);
              return (
                <label key={page.page_id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleTogglePage(page)}
                  />
                  {page.page_name || page.page_id}
                </label>
              );
            })}
          </div>
        </div>

        {/* Input Kapsyen */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Kapsyen:</label>
          <textarea
            rows="4"
            style={{ width: '100%', padding: '8px' }}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tulis kapsyen posting anda di sini..."
          />
        </div>

        {/* Upload Gambar Utama */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Upload Gambar / Video Utama (Pilihan):</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setMainImageFile(e.target.files[0])}
            style={{ marginBottom: '5px', display: 'block' }}
          />
          <input
            type="text"
            placeholder="Atau salin/tampal URL gambar/video..."
            value={mainImageUrlInput}
            onChange={(e) => setMainImageUrlInput(e.target.value)}
            style={{ width: '100%', padding: '6px' }}
          />
        </div>

        {/* Input First Comment */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>First Comment (Komen Pertama):</label>
          <textarea
            rows="2"
            style={{ width: '100%', padding: '8px' }}
            value={firstComment}
            onChange={(e) => setFirstComment(e.target.value)}
            placeholder="Tulis komen automatik pertama..."
          />
        </div>

        {/* Upload Gambar First Comment */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Gambar untuk First Comment (Pilihan):</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCommentImageFile(e.target.files[0])}
            style={{ marginBottom: '5px', display: 'block' }}
          />
          <input
            type="text"
            placeholder="Atau URL gambar komen..."
            value={commentImageUrlInput}
            onChange={(e) => setCommentImageUrlInput(e.target.value)}
            style={{ width: '100%', padding: '6px' }}
          />
        </div>

        {/* Pemilihan Mod Hantaran */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
          <label>
            <input
              type="radio"
              name="mode"
              value="now"
              checked={mode === 'now'}
              onChange={() => setMode('now')}
            /> Pos Sekarang
          </label>
          <label>
            <input
              type="radio"
              name="mode"
              value="manual"
              checked={mode === 'manual'}
              onChange={() => setMode('manual')}
            /> Jadual Manual
          </label>
          <label>
            <input
              type="radio"
              name="mode"
              value="auto"
              checked={mode === 'auto'}
              onChange={() => setMode('auto')}
            /> Auto-Queue (Fatin)
          </label>
        </div>

        {/* Tarikh & Masa jika Jadual Manual */}
        {mode === 'manual' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Masa Hantaran:</label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required
              style={{ padding: '6px' }}
            />
          </div>
        )}

        {/* Butang Submit */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isLoading ? '#6c757d' : '#0066ff',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Memproses...' : 'Hantar Sekarang'}
        </button>
      </form>
    </div>
  );
}
