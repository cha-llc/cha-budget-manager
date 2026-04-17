'use client';
import React, { useEffect, useState } from 'react';

const RECKONING_URL = 'https://getreckoningdashboard.vercel.app';

export default function ReckoningLauncher() {
  const [status, setStatus] = useState<'loading' | 'launching' | 'error'>('loading');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/app-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app: 'reckoning' }),
        });
        if (!res.ok) { setStatus('error'); return; }
        const { token } = await res.json();
        setStatus('launching');
        window.location.href = `${RECKONING_URL}?access_token=${token}`;
      } catch {
        setStatus('error');
      }
    })();
  }, []);

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Poppins', sans-serif", color: '#fff' },
    card: { textAlign: 'center', maxWidth: 360 },
    icon: { fontSize: 52, margin: '0 0 20px', display: 'block' },
    title: { fontSize: 20, fontWeight: 700, letterSpacing: 2, margin: '0 0 8px', color: '#C9A84C' },
    sub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 28px', lineHeight: 1.6 },
    dot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: status === 'error' ? '#C1121F' : '#9B5DE5', marginRight: 8, animation: status === 'loading' ? 'pulse 1.4s ease-in-out infinite' : 'none' },
  };

  return (
    <div style={styles.page}>
      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
      <div style={styles.card}>
        <span style={styles.icon}>⚡</span>
        <h1 style={styles.title}>FREE ERA BLUEPRINT RECKONING</h1>
        <p style={styles.sub}>Campaign tracker · Apr 14 – Dec 31, 2026<br />C.H.A. LLC Command Dashboard</p>
        <p style={{ fontSize: 13, color: status === 'error' ? '#C1121F' : 'rgba(255,255,255,0.5)' }}>
          <span style={styles.dot} />
          {status === 'loading' && 'Authenticating…'}
          {status === 'launching' && 'Opening The Reckoning…'}
          {status === 'error' && 'Access denied — please log in again.'}
        </p>
      </div>
    </div>
  );
}
