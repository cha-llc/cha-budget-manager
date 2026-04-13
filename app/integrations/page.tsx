'use client';

import React from 'react';
import Layout from '@/components/Layout';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

const INTEGRATIONS = [
  { name: 'Supabase', status: 'connected', description: 'Private database — all your financial data stored securely', icon: '🗄️', color: '#2A9D8F' },
  { name: 'Stripe', status: 'connected', description: 'Payment processing & revenue tracking', icon: '💳', color: '#9B5DE5' },
  { name: 'HubSpot', status: 'connected', description: 'Deal tracking & CRM pipeline', icon: '🤝', color: '#C9A84C' },
  { name: 'Gmail', status: 'connected', description: 'Email reports sent only to cs@cjhadisa.com', icon: '✉️', color: '#C1121F' },
  { name: 'Google Calendar', status: 'connected', description: 'Budget review scheduling', icon: '📅', color: '#2A9D8F' },
  { name: 'Vercel', status: 'connected', description: 'Deployment & hosting', icon: '▲', color: '#fff' },
  { name: 'AI (Anthropic)', status: 'connected', description: 'Document OCR, budget generation, spending analysis', icon: '🤖', color: '#9B5DE5' },
];

export default function Integrations() {
  return (
    <Layout activeTab="integrations">
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Connected Integrations</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Your financial data stays private — no third-party messaging apps have access</p>
        </div>

        <div style={{ padding: '1rem 1.25rem', background: 'rgba(42,157,143,0.08)', border: '1px solid rgba(42,157,143,0.3)', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🔒</span>
          <p style={{ margin: 0, color: '#2A9D8F', fontSize: '13px', fontWeight: '500' }}>
            Your financial data is private. Reports are sent only to cs@cjhadisa.com. No third-party channels have access to your financials.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {INTEGRATIONS.map(i => (
            <div key={i.name} className="card-hover" style={{ ...card, borderLeft: `3px solid ${i.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.8rem' }}>{i.icon}</span>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '15px', fontWeight: '600' }}>{i.name}</h3>
                  <span style={{ fontSize: '11px', color: '#2A9D8F', fontWeight: '600', background: 'rgba(42,157,143,0.15)', padding: '1px 8px', borderRadius: '20px' }}>✓ Connected</span>
                </div>
              </div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '13px', lineHeight: '1.5' }}>{i.description}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
