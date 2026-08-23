export default function Home() {
  return (
    <main style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1f2937', lineHeight: '1.6', margin: 0, padding: 0, background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', scrollBehavior: 'smooth' }}>
      
      {/* Header / Navbar Korporat */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img 
            src="https://i.ibb.co/Jw2svQfs/LOGO-MAX-BAGINDA-TRADING.png" 
            alt="Max Baginda Trading Logo" 
            style={{ height: '45px', width: 'auto', objectFit: 'contain' }} 
          />
          <div>
            <h2 style={{ margin: 0, color: '#111827', fontSize: '18px', fontWeight: '800', letterSpacing: '0.5px' }}>MAX BAGINDA TRADING</h2>
            <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: '600' }}>Enterprise Digital Solutions</span>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '25px', fontSize: '14px', fontWeight: '600' }}>
          <a href="#about" style={{ color: '#4b5563', textDecoration: 'none' }}>Mengenai Kami</a>
          <a href="#services" style={{ color: '#4b5563', textDecoration: 'none' }}>Perkhidmatan</a>
          <a href="#contact" style={{ color: '#4b5563', textDecoration: 'none' }}>Hubungi</a>
          <a href="/scheduler" style={{ color: '#2563eb', textDecoration: 'none' }}>Scheduler Login</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center' }}>
        <div>
          <span style={{ background: '#f3f4f6', color: '#111827', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', marginBottom: '15px', border: '1px solid #d1d5db' }}>
            Portal Operasi Rasmi
          </span>
          <h1 style={{ fontSize: '34px', color: '#111827', margin: '0 0 15px 0', lineHeight: '1.2' }}>
            Penyelesaian Sistem Digital & Pengurusan Media Sosial
          </h1>
          <p style={{ color: '#4b5563', fontSize: '15px', marginBottom: '25px' }}>
            Max Baginda Trading komited menyediakan solusi perisian, automasi pemasaran, dan infrastruktur digital yang efisien untuk operasi perniagaan moden.
          </p>
          <div style={{ display: 'flex', gap: '15px' }}>
            <a href="/scheduler" style={{ background: '#111827', color: '#fff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
              Buka Facebook Scheduler
            </a>
          </div>
        </div>
        
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <img 
            src="https://i.ibb.co/Jw2svQfs/LOGO-MAX-BAGINDA-TRADING.png" 
            alt="Max Baginda Trading" 
            style={{ width: '150px', height: 'auto', margin: '20px auto 10px auto', display: 'block' }} 
          />
          <h3 style={{ margin: '15px 0 5px 0', color: '#111827', fontSize: '16px' }}>Max Baginda Trading</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', paddingBottom: '10px' }}>Inovasi Digital & Sistem Automasi Terkini</p>
        </div>
      </section>

      {/* Seksyen 1: Mengenai Kami (#about) */}
      <section id="about" style={{ maxWidth: '1000px', margin: '40px auto', padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <h2 style={{ color: '#111827', marginBottom: '15px' }}>Mengenai Kami</h2>
        <p style={{ color: '#4b5563', lineHeight: '1.7' }}>
          Max Baginda Trading adalah entiti perniagaan rasmi yang memfokuskan kepada pembangunan perisian tersuai, automasi sistem pemasaran digital, dan pengurusan platform media sosial berskala besar. Kami membina solusi bersepadu untuk memastikan kelancaran operasi perniagaan era digital.
        </p>
      </section>

      {/* Seksyen 2: Perkhidmatan (#services) */}
      <section id="services" style={{ maxWidth: '1000px', margin: '0 auto 40px auto', padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <h2 style={{ color: '#111827', marginBottom: '15px' }}>Perkhidmatan Utama</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#111827' }}>⚡ Automasi & Penjadualan Media Sosial</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>Sistem pengurusan hantaran merentas platform Facebook secara automatik dan teratur.</p>
          </div>
          <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#111827' }}>💻 Solusi Perisian Digital Korporat</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>Pembangunan aplikasi web berasaskan awan yang selamat, pantas dan berskala tinggi.</p>
          </div>
        </div>
      </section>

      {/* Seksyen 3: Hubungi (#contact) */}
      <section id="contact" style={{ background: '#ffffff', borderTop: '1px solid #e5e7eb', padding: '40px 20px', marginTop: '20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div>
            <h3 style={{ color: '#111827', marginBottom: '10px' }}>Hubungi Operasi Kami</h3>
            <p style={{ color: '#4b5563', fontSize: '14px', margin: '5px 0' }}><strong>Emel Rasmi:</strong> admin@maxbagindatrading.com</p>
            <p style={{ color: '#4b5563', fontSize: '14px', margin: '5px 0' }}><strong>Lokasi Operasi:</strong> Perak, Malaysia</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
            <a href="/privacy" style={{ color: '#111827', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>→ Dasar Privasi (Privacy Policy)</a>
            <a href="/deletion" style={{ color: '#111827', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>→ Arahan Pemadaman Data (Data Deletion)</a>
          </div>
        </div>
      </section>

      {/* Footer Bawah */}
      <footer style={{ background: '#111827', color: '#9ca3af', textAlign: 'center', padding: '20px', fontSize: '13px' }}>
        <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} Max Baginda Trading. Hak Cipta Terpelihara.</p>
      </footer>

    </main>
  );
}
