'use client';

import React from 'react';
import Link from 'next/link';

interface LayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', key: 'dashboard' },
  { href: '/documents', label: 'Documents', icon: '🗂️', key: 'documents' },
  { href: '/expenses', label: 'Expenses', icon: '📝', key: 'expenses' },
  { href: '/budgets', label: 'Budgets', icon: '💰', key: 'budgets' },
  { href: '/goals', label: 'Goals', icon: '🎯', key: 'goals' },
  { href: '/investments', label: 'Investments', icon: '📈', key: 'investments' },
  { href: '/tax', label: 'Tax Planning', icon: '🧾', key: 'tax' },
  { href: '/networth', label: 'Net Worth', icon: '🏦', key: 'networth' },
  { href: '/analytics', label: 'Analytics', icon: '🔬', key: 'analytics' },
  { href: '/domination', label: 'Domination Plan', icon: '👑', key: 'domination' },
];

export default function Layout({ children, activeTab = 'dashboard' }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d0d1a', fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Poppins:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #1A1A2E; }
        ::-webkit-scrollbar-thumb { background: #C9A84C; border-radius: 3px; }
        .nav-link { transition: all 0.2s ease; white-space: nowrap; }
        .nav-link:hover { background: rgba(201,168,76,0.1) !important; }
        .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important; }
        .btn-primary { transition: all 0.2s ease; cursor: pointer; }
        .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .ai-badge { 
          background: linear-gradient(135deg, #9B5DE5, #2A9D8F);
          color: white; font-size: 10px; padding: 2px 8px; border-radius: 20px;
          font-weight: 600; letter-spacing: 0.5px;
        }
        input, select, textarea {
          background: #1A1A2E !important;
          color: #fff !important;
          border: 1px solid rgba(201,168,76,0.3) !important;
          border-radius: 6px !important;
          padding: 10px 14px !important;
          font-family: 'Poppins', sans-serif !important;
          font-size: 14px !important;
          width: 100% !important;
        }
        input:focus, select:focus, textarea:focus {
          outline: none !important;
          border-color: #C9A84C !important;
        }
        label { color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 500; margin-bottom: 6px; display: block; }
      `}</style>

      {/* Header */}
      <header style={{
        backgroundColor: '#1A1A2E',
        borderBottom: '2px solid #C9A84C',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #C9A84C, #9B5DE5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 'bold', color: '#fff', fontFamily: "'Lora', serif"
            }}>C</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff', fontFamily: "'Lora', serif", letterSpacing: '0.5px' }}>
                C.H.A. LLC Budget Manager
              </h1>
              <p style={{ margin: 0, fontSize: '10px', color: '#C9A84C', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Sip slow. Love loud. Live free.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="ai-badge">AI-Powered</span>
            <div style={{ fontSize: '12px', color: '#C9A84C', fontWeight: '600' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        backgroundColor: '#12122a',
        borderBottom: '1px solid rgba(201,168,76,0.3)',
        overflowX: 'auto',
        position: 'sticky',
        top: '64px',
        zIndex: 99
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', padding: '0 1rem' }}>
          {navItems.map(item => (
            <Link key={item.key} href={item.href} className="nav-link" style={{
              padding: '0.85rem 1rem',
              color: activeTab === item.key ? '#C9A84C' : 'rgba(255,255,255,0.55)',
              textDecoration: 'none',
              borderBottom: activeTab === item.key ? '2px solid #C9A84C' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: activeTab === item.key ? '600' : '400',
            }}>
              <span style={{ fontSize: '14px' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem', minHeight: 'calc(100vh - 170px)' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#1A1A2E',
        color: 'rgba(255,255,255,0.35)',
        padding: '1.5rem 2rem',
        textAlign: 'center',
        fontSize: '11px',
        borderTop: '1px solid rgba(201,168,76,0.2)',
      }}>
        <p style={{ margin: 0 }}>C.H.A. LLC © 2026 | Consulting • Tea Time Network • Digital Tools • Books</p>
        <p style={{ margin: '5px 0 0 0', color: 'rgba(201,168,76,0.5)' }}>AI-Powered Financial Intelligence • Supabase • Stripe • HubSpot</p>
      </footer>
    </div>
  );
}
