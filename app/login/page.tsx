'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Poppins:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input {
          background: rgba(255,255,255,0.06) !important;
          color: #fff !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          border-radius: 10px !important;
          padding: 13px 16px !important;
          font-family: 'Poppins', sans-serif !important;
          font-size: 14px !important;
          width: 100% !important;
          outline: none !important;
          transition: border-color 0.2s !important;
        }
        input:focus { border-color: rgba(201,168,76,0.7) !important; background: rgba(201,168,76,0.05) !important; }
        input::placeholder { color: rgba(255,255,255,0.25) !important; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.5s ease both; }
        @keyframes glow { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
      `}</style>

      {/* Background glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(155,93,229,0.05) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div className="fade-up" style={{ width: '100%', maxWidth: '420px', padding: '0 1.5rem' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #C9A84C, #9B5DE5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: '800', color: '#fff', fontFamily: "'Lora', serif", margin: '0 auto 1rem' }}>C</div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', fontFamily: "'Lora', serif", marginBottom: '4px', letterSpacing: '-0.3px' }}>C.H.A. LLC Budget Manager</h1>
          <p style={{ fontSize: '12px', color: 'rgba(201,168,76,0.6)', letterSpacing: '2px', textTransform: 'uppercase' }}>Sip slow. Love loud. Live free.</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2rem' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>Admin Sign In</h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '1.75rem' }}>Access restricted to authorized users only</p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: '600', marginBottom: '6px' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="cs@cjhadisa.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: '600', marginBottom: '6px' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(193,18,31,0.12)', border: '1px solid rgba(193,18,31,0.3)', borderRadius: '8px', marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#f87171' }}>⚠ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #C9A84C, #b8933e)',
                color: loading ? 'rgba(255,255,255,0.3)' : '#0d0d20',
                fontSize: '14px', fontWeight: '700', fontFamily: "'Poppins', sans-serif",
                transition: 'all 0.2s', letterSpacing: '0.3px',
              }}
            >
              {loading ? '⏳ Signing in...' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '11px', color: 'rgba(255,255,255,0.15)' }}>
          🔒 Secured · C.H.A. LLC Financial Intelligence
        </p>
      </div>
    </div>
  );
}
