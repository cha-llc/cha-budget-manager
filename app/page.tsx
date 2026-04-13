'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Register service worker for offline-first
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    router.push('/dashboard');
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0d0d1a', color: '#fff', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #C9A84C, #9B5DE5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>C</div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700', color: '#fff' }}>C.H.A. LLC Budget Manager</p>
        <p style={{ margin: 0, fontSize: '13px', color: '#C9A84C' }}>Loading...</p>
      </div>
    </div>
  );
}
