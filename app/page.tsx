'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#1A1A2E',
      color: '#fff'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', margin: '0 0 1rem 0' }}>C.H.A. LLC Budget Manager</h1>
        <p style={{ fontSize: '16px', color: '#C9A84C', margin: 0 }}>Loading dashboard...</p>
      </div>
    </div>
  );
}
