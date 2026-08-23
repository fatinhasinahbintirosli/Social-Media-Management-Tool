'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export default function QueuePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const CORRECT_PASSWORD = 'mohdfadliselangor1';

  const [queuePosts, setQueuePosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState('Fatin');

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

    fetchQueue(savedProfile);
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

  const fetchQueue = async (profileName) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('profile', profileName)
      .order('scheduled_at', { ascending: true });

    if (error) {
      alert('Gagal memuat senarai queue: ' + error.message);
    } else {
      setQueuePosts(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Adakah anda pasti mahu memadam hantaran ini dari queue?')) return;

    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Gagal memadam: ' + error.message);
    } else {
      setQueuePosts(queuePosts.filter(p => p.id !== id));
    }
  };

  if (!isAuthenticated) {
    return (
      <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', background: '#f4f4f4' }}>
        <form onSubmit={handleLoginSubmit} style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '350px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px', color: '#111' }}>Max Baginda Trading</h2>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Sila masukkan kata laluan untuk mengakses Senarai Queue.</p>
          
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
            <Link href="/" style={{ fontSize: '13px', color: '#666', textDecoration: 'none' }}>← Kembali ke Scheduler</Link>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '1000px', margin: '20px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ color: '#1877f2', margin: 0 }}>📋 Senarai Queue ({currentProfile})</h1>
        <Link href="/" style={{ padding: '8px 14px', background: '#6c757d', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>
          ← Kembali ke Scheduler
        </Link>
      </div>

      {loading ? (
        <p>Memuatkan senarai queue...</p>
      ) : queuePosts.length === 0 ? (
        <div style={{ background: '#f8f9fa', padding: '30px', textAlign: 'center', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <p style={{ color: '#666' }}>Tiada hantaran dalam senarai queue untuk profil {currentProfile}.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {queuePosts.map((post) => (
            <div key={post.id} style={{ background: '#fff', padding: '15px 20px', borderRadius: '8px', border: '1px solid #dee2e6', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <div style={{ fontSize: '12px', color: '#65676b', marginBottom: '5px' }}>
                  <strong>📅 Tarikh/Masa Jangkaan:</strong> {new Date(post.scheduled_at).toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur' })} &bull; <span style={{ textTransform: 'uppercase', color: post.status === 'pending' ? '#d97706' : '#16a34a' }}>{post.status}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#050505', whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
                  {post.message || <span style={{ fontStyle: 'italic', color: '#aaa' }}>(Tiada kapsyen)</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  <strong>Jumlah Pages:</strong> {post.page_ids?.length || 0} Page dipilih
                </div>
              </div>
              
              <div>
                <button 
                  onClick={() => handleDelete(post.id)}
                  style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                >
                  Padam
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </main>
  );
}
