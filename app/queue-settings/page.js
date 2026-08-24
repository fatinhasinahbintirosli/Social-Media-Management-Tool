'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const DAYS = [
  { label: 'Monday', index: 1 },
  { label: 'Tuesday', index: 2 },
  { label: 'Wednesday', index: 3 },
  { label: 'Thursday', index: 4 },
  { label: 'Friday', index: 5 },
  { label: 'Saturday', index: 6 },
  { label: 'Sunday', index: 0 },
];

export default function QueueSettingsPage() {
  const [currentProfile, setCurrentProfile] = useState('Fatin');
  const [rows, setRows] = useState([]); // Format: [{ time: '07:41', days: [1, 3, 5] }]
  const [loading, setLoading] = useState(false);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => {
    const savedProfile = localStorage.getItem('fb_scheduler_profile');
    if (savedProfile) setCurrentProfile(savedProfile);
  }, []);

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      const { data, error } = await supabase
        .from('queue_settings')
        .select('*')
        .eq('profile', currentProfile);

      if (error) {
        console.error('Ralat memuatkan queue:', error);
        setLoading(false);
        return;
      }

      // Kumpulkan data mengikut masa (time_slot) khusus untuk profil semasa
      const grouped = {};
      (data || []).forEach(item => {
        if (!item.time_slot) return;
        const timeStr = item.time_slot.substring(0, 5); // 'HH:MM'
        if (!grouped[timeStr]) {
          grouped[timeStr] = [];
        }
        grouped[timeStr].push(item.day_of_week);
      });

      const formattedRows = Object.keys(grouped).map(time => ({
        time,
        days: grouped[time]
      }));

      setRows(formattedRows);
      setLoading(false);
    }
    fetchSettings();
  }, [currentProfile]);

  const handleProfileChange = (profileName) => {
    setCurrentProfile(profileName);
    localStorage.setItem('fb_scheduler_profile', profileName);
  };

  const addRow = () => {
    setRows([...rows, { time: '12:00', days: [] }]);
  };

  const removeRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateTime = (index, newTime) => {
    const updated = [...rows];
    updated[index].time = newTime;
    setRows(updated);
  };

  const toggleDay = (rowIndex, dayIndex) => {
    const updated = [...rows];
    const currentDays = updated[rowIndex].days;
    if (currentDays.includes(dayIndex)) {
      updated[rowIndex].days = currentDays.filter(d => d !== dayIndex);
    } else {
      updated[rowIndex].days = [...currentDays, dayIndex];
    }
    setRows(updated);
  };

  const clearAll = () => {
    setRows([]);
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // 1. Padam hanya data queue_settings yang sepadan dengan profil semasa
      const { error: deleteError } = await supabase
        .from('queue_settings')
        .delete()
        .eq('profile', currentProfile);

      if (deleteError) throw deleteError;

      // 2. Format semula data untuk dimasukkan ke database berserta nama profil
      const insertData = [];
      rows.forEach(row => {
        row.days.forEach(day => {
          insertData.push({
            day_of_week: day,
            time_slot: `${row.time}:00`,
            is_active: true,
            profile: currentProfile
          });
        });
      });

      if (insertData.length > 0) {
        const { error: insertError } = await supabase.from('queue_settings').insert(insertData);
        if (insertError) throw insertError;
      }

      alert(`Tetapan Timeslot berjaya disimpan untuk profil ${currentProfile}!`);
    } catch (err) {
      alert(`Ralat menyimpan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#fff', padding: '30px', fontFamily: 'sans-serif' }}>
      
      {/* Bahagian Navbar & Tukar Profil */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <Link href="/" style={{ color: '#1877f2', textDecoration: 'none', fontSize: '14px', display: 'inline-block', marginBottom: '10px' }}>
            ← Kembali ke Halaman Utama
          </Link>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Create Timeslot ({currentProfile})</h1>
        </div>

        {/* Butang Tukar Profil */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa' }}>Profil:</span>
          <button
            type="button"
            onClick={() => handleProfileChange('Fatin')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: currentProfile === 'Fatin' ? '#0d6efd' : '#27272a',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Fatin
          </button>
          <button
            type="button"
            onClick={() => handleProfileChange('Adik')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: currentProfile === 'Adik' ? '#198754' : '#27272a',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Adik
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={clearAll} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Clear all</button>
          <button onClick={addRow} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>+ Add Timeslot</button>
          <button onClick={saveSettings} disabled={loading} style={{ background: '#f97316', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            {loading ? 'Menyimpan...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
              <th style={{ padding: '16px', width: '180px' }}>Time Slots</th>
              {DAYS.map(d => <th key={d.index} style={{ padding: '16px' }}>{d.label}</th>)}
              <th style={{ padding: '16px', width: '80px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ padding: '30px', color: '#71717a' }}>Memuatkan timeslot untuk {currentProfile}...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: '30px', color: '#71717a' }}>Tiada timeslot untuk {currentProfile}. Sila klik &quot;+ Add Timeslot&quot; di atas.</td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex} style={{ borderBottom: '1px solid #27272a' }}>
                  <td style={{ padding: '16px' }}>
                    <input 
                      type="time" 
                      value={row.time} 
                      onChange={(e) => updateTime(rowIndex, e.target.value)}
                      style={{ backgroundColor: '#27272a', color: '#fff', border: '1px solid #3f3f46', padding: '6px 10px', borderRadius: '6px', colorScheme: 'dark' }}
                    />
                  </td>
                  {DAYS.map(d => (
                    <td key={d.index} style={{ padding: '16px' }}>
                      <input 
                        type="checkbox" 
                        checked={row.days.includes(d.index)}
                        onChange={() => toggleDay(rowIndex, d.index)}
                        style={{ width: '18px', height: '18px', accentColor: '#1877f2', cursor: 'pointer' }}
                      />
                    </td>
                  ))}
                  <td style={{ padding: '16px' }}>
                    <button onClick={() => removeRow(rowIndex)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {rows.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={addRow} style={{ background: '#27272a', color: '#fff', border: '1px dashed #52525b', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>
            + Add Timeslot
          </button>
        </div>
      )}
    </div>
  );
}
