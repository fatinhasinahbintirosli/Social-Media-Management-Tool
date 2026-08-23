'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export default function QueuePage() {
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState('all');
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: pData } = await supabase.from('pages').select('page_id, page_name').order('page_name', { ascending: true });
        const { data: sData } = await supabase.from('scheduled_posts').select('*').order('created_at', { ascending: false });
        
        setPages(pData || []);
        setScheduledPosts(sData || []);
      } catch (err) {
        console.error('Ralat memuatkan data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleDeleteQueue = async (id) => {
    if (!confirm('Adakah anda pasti mahu memadam pos/queue ini?')) return;

    try {
      const res = await fetch(`/api/schedule?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal memadam pos.');

      alert('Berjaya dipadam!');
      setScheduledPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(`Ralat: ${err.message}`);
    }
  };

  // Tapis pos berdasarkan Page yang dipilih dalam dropdown
  const filteredPosts = scheduledPosts.filter((p) => {
    if (selectedPageId === 'all') return true;
    if (!p.page_ids) return false;
    return p.page_ids.includes(selectedPageId);
  });

  return (
    <main style={{ maxWidth: '900px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* Header & Navigasi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <div>
          <Link 
            href="/" 
            style={{ 
              display: 'inline-block', 
              padding: '8px 14px', 
              backgroundColor: '#242526', 
              color: '#fff', 
              borderRadius: '8px', 
              textDecoration: 'none', 
              fontSize: '13px', 
              fontWeight: 'bold',
              border: '1px solid #3a3b3c',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            ⬅️ Kembali ke Home
          </Link>
          <h1 style={{ color: '#1877f2', margin: '12px 0 4px 0' }}>Senarai Pos Dijadualkan / Queue</h1>
          <p style={{ color: '#65676b', fontSize: '14px', margin: 0 }}>Uruskan jadual pos mengikut Facebook Page.</p>
        </div>
      </div>

      {/* Bahagian Dropdown Filter Page (Gaya Social Champ) */}
      <div style={{ background: '#242526', padding: '15px 20px', borderRadius: '12px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>Tapis Page:</span>
        <select
          value={selectedPageId}
          onChange={(e) => setSelectedPageId(e.target.value)}
          style={{
            flex: 1,
            maxWidth: '350px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #3a3b3c',
            backgroundColor: '#18191a',
            color: '#fff',
            fontSize: '14px',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="all">🌐 Semua Facebook Pages</option>
          {pages.map((page) => (
            <option key={page.page_id} value={page.page_id}>
              f {page.page_name}
            </option>
          ))}
        </select>
      </div>

      {/* Jadual Pos */}
      <section>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#eee', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Mesej</th>
                <th style={{ padding: '12px' }}>Masa</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#777' }}>Memuatkan senarai pos...</td></tr>
              ) : filteredPosts.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#777' }}>Tiada rekod pos untuk pilihan ini.</td></tr>
              ) : (
                filteredPosts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.message || '(Tiada teks)'}</td>
                    <td style={{ padding: '12px' }}>{p.scheduled_at ? new Date(p.scheduled_at).toLocaleString() : '-'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                        backgroundColor: p.status === 'published' ? '#d4edda' : '#fff3cd',
                        color: p.status === 'published' ? '#155724' : '#856404'
                      }}>
                        {p.status ? p.status.toUpperCase() : 'PENDING'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {p.status === 'pending' && (
                        <button
                          onClick={() => handleDeleteQueue(p.id)}
                          style={{
                            background: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          Padam
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
