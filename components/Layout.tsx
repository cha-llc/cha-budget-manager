import React from 'react';
import Link from 'next/link';

interface LayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

export default function Layout({ children, activeTab = 'dashboard' }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f3f0' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#1A1A2E',
        color: '#fff',
        padding: '1.5rem 2rem',
        borderBottom: '2px solid #C9A84C'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>C.H.A. LLC Budget Manager</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#C9A84C' }}>Sip slow. Love loud. Live free.</p>
          </div>
          <div style={{ fontSize: '12px', color: '#C9A84C' }}>
            Based in Alajuela, Costa Rica
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        backgroundColor: '#2A3F5F',
        padding: '0',
        borderBottom: '1px solid #C9A84C',
        display: 'flex',
        overflowX: 'auto'
      }}>
        <div style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', display: 'flex' }}>
          <Link href="/dashboard" style={{
            padding: '1rem 1.5rem',
            color: activeTab === 'dashboard' ? '#C9A84C' : '#fff',
            textDecoration: 'none',
            borderBottom: activeTab === 'dashboard' ? '3px solid #C9A84C' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: activeTab === 'dashboard' ? '600' : 'normal'
          }}>
            📊 Dashboard
          </Link>
          <Link href="/budgets" style={{
            padding: '1rem 1.5rem',
            color: activeTab === 'budgets' ? '#C9A84C' : '#fff',
            textDecoration: 'none',
            borderBottom: activeTab === 'budgets' ? '3px solid #C9A84C' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: activeTab === 'budgets' ? '600' : 'normal'
          }}>
            💰 Budgets
          </Link>
          <Link href="/expenses" style={{
            padding: '1rem 1.5rem',
            color: activeTab === 'expenses' ? '#C9A84C' : '#fff',
            textDecoration: 'none',
            borderBottom: activeTab === 'expenses' ? '3px solid #C9A84C' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: activeTab === 'expenses' ? '600' : 'normal'
          }}>
            📝 Expenses
          </Link>
          <Link href="/revenue" style={{
            padding: '1rem 1.5rem',
            color: activeTab === 'revenue' ? '#C9A84C' : '#fff',
            textDecoration: 'none',
            borderBottom: activeTab === 'revenue' ? '3px solid #C9A84C' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: activeTab === 'revenue' ? '600' : 'normal'
          }}>
            💹 Revenue
          </Link>
          <Link href="/integrations" style={{
            padding: '1rem 1.5rem',
            color: activeTab === 'integrations' ? '#C9A84C' : '#fff',
            textDecoration: 'none',
            borderBottom: activeTab === 'integrations' ? '3px solid #C9A84C' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: activeTab === 'integrations' ? '600' : 'normal'
          }}>
            🔗 Integrations
          </Link>
          <Link href="/reports" style={{
            padding: '1rem 1.5rem',
            color: activeTab === 'reports' ? '#C9A84C' : '#fff',
            textDecoration: 'none',
            borderBottom: activeTab === 'reports' ? '3px solid #C9A84C' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: activeTab === 'reports' ? '600' : 'normal'
          }}>
            📄 Reports
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem', minHeight: 'calc(100vh - 200px)' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#1A1A2E',
        color: '#9B5DE5',
        padding: '2rem',
        textAlign: 'center',
        fontSize: '12px',
        borderTop: '1px solid #C9A84C',
        marginTop: '3rem'
      }}>
        <p>C.H.A. LLC © 2026 | Consulting • Tea Time Network • Digital Tools • Books</p>
        <p style={{ margin: '8px 0 0 0', color: '#C9A84C' }}>Powered by Supabase, Stripe, HubSpot, Slack, Gmail, Google Calendar, and more</p>
      </footer>
    </div>
  );
}
