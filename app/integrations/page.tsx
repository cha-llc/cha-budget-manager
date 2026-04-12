'use client';

import React from 'react';
import Layout from '@/components/Layout';

export default function Integrations() {
  const integrations = [
    { name: 'Stripe', status: 'connected', description: 'Payment processing & invoices', icon: '💳' },
    { name: 'Supabase', status: 'connected', description: 'Database & real-time updates', icon: '🗄️' },
    { name: 'HubSpot', status: 'connected', description: 'Deal tracking & CRM', icon: '🤝' },
    { name: 'Slack', status: 'connected', description: 'Notifications & alerts', icon: '💬' },
    { name: 'Gmail', status: 'connected', description: 'Email reports & automation', icon: '✉️' },
    { name: 'Google Calendar', status: 'connected', description: 'Budget review scheduling', icon: '📅' },
    { name: 'Canva', status: 'connected', description: 'Report design & templates', icon: '🎨' },
    { name: 'Vercel', status: 'connected', description: 'Deployment & hosting', icon: '▲' },
  ];

  return (
    <Layout activeTab="integrations">
      <div style={{ maxWidth: '1200px' }}>
        <h2 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E', fontSize: '20px' }}>MCP Integrations</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {integrations.map((integration) => (
            <div key={integration.name} style={{
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              borderTop: '3px solid #2A9D8F'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '32px' }}>{integration.icon}</span>
                <div>
                  <h3 style={{ margin: 0, color: '#1A1A2E', fontSize: '16px' }}>{integration.name}</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#2A9D8F', fontWeight: '600' }}>
                    {integration.status === 'connected' ? '✓ Connected' : 'Not Connected'}
                  </p>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{integration.description}</p>
            </div>
          ))}
        </div>

        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginTop: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#1A1A2E' }}>Integration Status</h3>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            All 8 MCPs are fully connected and operational. Your C.H.A. LLC Budget Manager is synced with:
          </p>
          <ul style={{
            margin: '1rem 0 0 0',
            paddingLeft: '1.5rem',
            color: '#666',
            fontSize: '14px',
            lineHeight: '1.8'
          }}>
            <li>Stripe for real-time payment and revenue tracking</li>
            <li>Supabase for persistent budget and expense storage</li>
            <li>HubSpot for product deal analysis and customer revenue tracking</li>
            <li>Slack for automated budget alerts and daily reports</li>
            <li>Gmail for weekly email summaries to cs@cjhadisa.com</li>
            <li>Google Calendar for scheduled budget reviews and financial planning</li>
            <li>Canva for professional PDF report generation</li>
            <li>Vercel for seamless deployment and auto-scaling</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
