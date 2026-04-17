'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

const NAV = [
  { href:'/dashboard', label:'Dashboard', icon:'⌂', key:'dashboard' },
  { href:'/documents', label:'Documents', icon:'⬆', key:'documents' },
  { href:'/expenses', label:'Expenses', icon:'↙', key:'expenses' },
  { href:'/revenue', label:'Revenue', icon:'↗', key:'revenue' },
  { href:'/budgets', label:'Budgets', icon:'◎', key:'budgets' },
  { href:'/goals', label:'Goals', icon:'◈', key:'goals' },
  { href:'/investments', label:'Investments', icon:'▲', key:'investments' },
  { href:'/tax', label:'Tax', icon:'⬡', key:'tax' },
  { href:'/networth', label:'Net Worth', icon:'◆', key:'networth' },
  { href:'/analytics', label:'Analytics', icon:'∿', key:'analytics' },
  { href:'/reports', label:'Reports', icon:'≡', key:'reports' },
  { href:'/domination', label:'Domination', icon:'✦', key:'domination' },
  { href:'/nova',       label:'NOVA',       icon:'🎙', key:'nova' },
  { href:'/reckoning',  label:'Reckoning',  icon:'⚡', key:'reckoning' },
];

export default function Layout({ children, activeTab = 'dashboard' }: LayoutProps) {
  const [time, setTime] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ minHeight:'100vh', background:'#080810', fontFamily:"'Poppins',sans-serif", color:'#fff' }}>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(201,168,76,0.3); border-radius:10px; }
        ::-webkit-scrollbar-thumb:hover { background:rgba(201,168,76,0.6); }

        /* ── Base inputs ── */
        input, select, textarea {
          background:rgba(255,255,255,0.05) !important;
          color:#fff !important;
          border:1px solid rgba(255,255,255,0.1) !important;
          border-radius:10px !important;
          padding:10px 14px !important;
          font-family:'Poppins',sans-serif !important;
          font-size:13px !important;
          width:100% !important;
          outline:none !important;
          transition:border-color 0.2s !important;
        }
        input:focus, select:focus, textarea:focus {
          border-color:rgba(201,168,76,0.6) !important;
          background:rgba(201,168,76,0.05) !important;
        }
        input::placeholder { color:rgba(255,255,255,0.25) !important; }
        select option { background:#12121f; color:#fff; }
        label { display:block; font-size:11px; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.7px; margin-bottom:5px; font-weight:600; }

        /* ── Nav ── */
        .nav-item { position:relative; transition:all 0.2s; }
        .nav-item:hover > span { color:#fff !important; }
        .nav-item.active > span { color:#C9A84C !important; }
        .nav-item.active::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:linear-gradient(90deg,#C9A84C,#9B5DE5); border-radius:2px 2px 0 0; }

        /* ── Cards ── */
        .glass { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:16px; }
        .glass-gold { background:rgba(201,168,76,0.04); border:1px solid rgba(201,168,76,0.2); border-radius:16px; }
        .glass-hover { transition:all 0.2s; cursor:pointer; }
        .glass-hover:hover { background:rgba(255,255,255,0.055) !important; border-color:rgba(255,255,255,0.13) !important; transform:translateY(-1px); }

        /* ── Buttons ── */
        .btn { transition:all 0.18s; cursor:pointer; font-family:'Poppins',sans-serif; font-weight:600; border:none; outline:none; }
        .btn:hover { opacity:0.88; transform:translateY(-1px); }
        .btn:active { transform:translateY(0); }
        .btn-gold { background:linear-gradient(135deg,#C9A84C,#e0b85c); color:#0d0d20; }
        .btn-purple { background:linear-gradient(135deg,#9B5DE5,#7c3fd4); color:#fff; }
        .btn-teal { background:linear-gradient(135deg,#2A9D8F,#1d7a6e); color:#fff; }
        .btn-ghost { background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.7); border:1px solid rgba(255,255,255,0.1) !important; }

        /* ── Progress bars ── */
        .progress-track { background:rgba(255,255,255,0.07); border-radius:100px; overflow:hidden; }
        .progress-fill { border-radius:100px; transition:width 0.8s cubic-bezier(0.4,0,0.2,1); }

        /* ── Chips / badges ── */
        .chip { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
        .chip-income { background:rgba(42,157,143,0.15); color:#2A9D8F; }
        .chip-expense { background:rgba(193,18,31,0.15); color:#ef4444; }
        .chip-gold { background:rgba(201,168,76,0.15); color:#C9A84C; }
        .chip-purple { background:rgba(155,93,229,0.15); color:#9B5DE5; }

        /* ── Animations ── */
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
        .fade-up { animation:fadeUp 0.4s ease both; }
        .fade-up-1 { animation-delay:0.05s; }
        .fade-up-2 { animation-delay:0.1s; }
        .fade-up-3 { animation-delay:0.15s; }
        .fade-up-4 { animation-delay:0.2s; }
        .pulse { animation:pulse 2s infinite; }

        /* ── Mono numbers ── */
        .mono { font-family:'JetBrains Mono',monospace; }

        /* ── Table ── */
        .tbl-row { border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.15s; }
        .tbl-row:hover { background:rgba(255,255,255,0.03); }
        .tbl-row:last-child { border-bottom:none; }

        /* ── Responsive ── */
        @media(max-width:900px) {
          .hide-sm { display:none !important; }
          main { padding:1rem !important; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ background:'rgba(8,8,16,0.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(201,168,76,0.15)', padding:'0 2rem', position:'sticky', top:0, zIndex:200 }}>
        <div style={{ maxWidth:'1600px', margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', height:'60px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ width:'34px', height:'34px', borderRadius:'10px', background:'linear-gradient(135deg,#C9A84C,#9B5DE5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'800', color:'#fff', fontFamily:"'Lora',serif", flexShrink:0 }}>C</div>
            <div>
              <h1 style={{ margin:0, fontSize:'14px', fontWeight:'700', color:'#fff', fontFamily:"'Lora',serif", letterSpacing:'0.3px', lineHeight:1.2 }}>C.H.A. LLC Budget Manager</h1>
              <p style={{ margin:0, fontSize:'9px', color:'rgba(201,168,76,0.6)', letterSpacing:'2px', textTransform:'uppercase' }}>Sip slow. Love loud. Live free.</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <span style={{ background:'linear-gradient(135deg,#9B5DE5,#2A9D8F)', color:'#fff', fontSize:'9px', padding:'3px 10px', borderRadius:'20px', fontWeight:'700', letterSpacing:'0.8px', textTransform:'uppercase' }}>AI-Powered</span>
            <div style={{ textAlign:'right' }}>
              <p style={{ margin:0, fontSize:'12px', color:'rgba(255,255,255,0.6)', fontWeight:'500' }}>
                {new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' })}
              </p>
              <p style={{ margin:0, fontSize:'10px', color:'rgba(201,168,76,0.5)', fontFamily:"'JetBrains Mono',monospace" }}>{time}</p>
            </div>
            <button onClick={handleLogout} disabled={loggingOut}
              style={{ padding:'8px 16px', borderRadius:'8px', background:'rgba(193,18,31,0.15)', border:'1px solid rgba(193,18,31,0.4)', color:'#f87171', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:'Poppins,sans-serif', transition:'all 0.2s', letterSpacing:'0.3px', whiteSpace:'nowrap' }}>
              {loggingOut ? 'Signing out...' : '⎋ Sign Out'}
            </button>
          </div>
        </div>
      </header>

      {/* ── NAV ── */}
      <nav style={{ background:'rgba(10,10,22,0.98)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)', position:'sticky', top:'60px', zIndex:199, overflowX:'auto' }}>
        <div style={{ maxWidth:'1600px', margin:'0 auto', display:'flex', padding:'0 2rem' }}>
          {NAV.map(item => (
            <Link key={item.key} href={item.href}
              className={`nav-item ${activeTab===item.key?'active':''}`}
              style={{ padding:'14px 14px 13px', display:'flex', alignItems:'center', gap:'5px', textDecoration:'none', whiteSpace:'nowrap' }}>
              <span style={{ fontSize:'11px', opacity:0.6 }}>{item.icon}</span>
              <span style={{ fontSize:'12px', fontWeight:activeTab===item.key?'600':'400', color:activeTab===item.key?'#C9A84C':'rgba(255,255,255,0.45)', transition:'color 0.2s' }}>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main style={{ maxWidth:'1600px', margin:'0 auto', padding:'2rem', minHeight:'calc(100vh - 130px)' }}>
        {children}
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.05)', padding:'1.25rem 2rem', textAlign:'center' }}>
        <p style={{ margin:0, fontSize:'11px', color:'rgba(255,255,255,0.2)' }}>C.H.A. LLC © 2026 · Consulting · Tea Time Network · Digital Tools · Books</p>
      </footer>
    </div>
  );
}
