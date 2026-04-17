'use client';
import React, { useEffect, useState } from 'react';

const NOVA_URL = 'https://nova-producer.vercel.app';

export default function NovaLauncher() {
  const [status, setStatus] = useState<'loading' | 'launching' | 'error'>('loading');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/app-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app: 'nova' }),
        });
        if (!res.ok) { setStatus('error'); return; }
        const { token } = await res.json();
        setStatus('launching');
        window.location.href = `${NOVA_URL}?access_token=${token}`;
      } catch {
        setStatus('error');
      }
    })();
  }, []);

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Poppins', sans-serif", color: '#fff' },
    card: { textAlign: 'center', maxWidth: 360 },
    logo: { width: 56, height: 56, background: '#C9A84C', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32, fontWeight: 900, color: '#1A1A2E', fontFamily: 'Georgia, serif' },
    title: { fontSize: 22, fontWeight: 700, letterSpacing: 4, margin: '0 0 8px' },
    sub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 28px', lineHeight: 1.6 },
    dot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: status === 'error' ? '#C1121F' : '#2A9D8F', marginRight: 8, animation: status === 'loading' ? 'pulse 1.4s ease-in-out infinite' : 'none' },
  };

  return (
    <div style={styles.page}>
      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
      <div style={styles.card}>
        <div style={styles.logo}>N</div>
        <h1 style={styles.title}>NOVA</h1>
        <p style={styles.sub}>Network Output & Voice Automator<br />AI Show Producer for Tea Time Network</p>
        <p style={{ fontSize: 13, color: status === 'error' ? '#C1121F' : 'rgba(255,255,255,0.5)' }}>
          <span style={styles.dot} />
          {status === 'loading' && 'Authenticating…'}
          {status === 'launching' && 'Launching NOVA…'}
          {status === 'error' && 'Access denied — please log in again.'}
        </p>
      </div>
    </div>
  );
}
