'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

interface NetWorthItem {
  id: string;
  name: string;
  category: 'asset' | 'liability';
  subcategory: string;
  value: number;
  note?: string;
}

const SAMPLE: NetWorthItem[] = [
  { id: '1', name: 'Business Checking', category: 'asset', subcategory: 'Cash', value: 4200 },
  { id: '2', name: 'Investment Portfolio', category: 'asset', subcategory: 'Investments', value: 8400 },
  { id: '3', name: 'BrandPulse (Product)', category: 'asset', subcategory: 'Business Assets', value: 2500 },
  { id: '4', name: 'Clarity Engine (Product)', category: 'asset', subcategory: 'Business Assets', value: 1800 },
  { id: '5', name: 'Credit Card Balance', category: 'liability', subcategory: 'Credit Cards', value: 1200 },
  { id: '6', name: 'Software Subscriptions', category: 'liability', subcategory: 'Recurring Debt', value: 380 },
];

const ASSET_CATEGORIES = ['Cash', 'Investments', 'Business Assets', 'Real Estate', 'Vehicles', 'Retirement', 'Crypto', 'Other'];
const LIABILITY_CATEGORIES = ['Credit Cards', 'Student Loans', 'Business Debt', 'Mortgage', 'Auto Loans', 'Recurring Debt', 'Other'];

export default function NetWorth() {
  const [items, setItems] = useState<NetWorthItem[]>(SAMPLE);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'asset' | 'liability'>('asset');
  const [form, setForm] = useState({ name: '', subcategory: 'Cash', value: '', note: '' });

  const totalAssets = items.filter(i => i.category === 'asset').reduce((s, i) => s + i.value, 0);
  const totalLiabilities = items.filter(i => i.category === 'liability').reduce((s, i) => s + i.value, 0);
  const netWorth = totalAssets - totalLiabilities;

  const addItem = () => {
    if (!form.name || !form.value) return;
    setItems([...items, { id: Date.now().toString(), name: form.name, category: type, subcategory: form.subcategory, value: parseFloat(form.value), note: form.note }]);
    setForm({ name: '', subcategory: 'Cash', value: '', note: '' });
    setShowForm(false);
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));

  const bySubcategory = (cat: 'asset' | 'liability') => {
    const filtered = items.filter(i => i.category === cat);
    const grouped: Record<string, NetWorthItem[]> = {};
    filtered.forEach(i => { if (!grouped[i.subcategory]) grouped[i.subcategory] = []; grouped[i.subcategory].push(i); });
    return grouped;
  };

  return (
    <Layout activeTab="networth">
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Net Worth Tracker</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Complete asset & liability management</p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}
            style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
            + Add Item
          </button>
        </div>

        {/* Net Worth Hero */}
        <div style={{ ...card, background: 'linear-gradient(135deg, rgba(26,26,46,0.9), rgba(42,157,143,0.15))', border: '1px solid rgba(201,168,76,0.4)', marginBottom: '1.5rem', textAlign: 'center', padding: '2.5rem' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Net Worth</p>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '48px', fontWeight: '700', color: netWorth >= 0 ? '#2A9D8F' : '#C1121F', fontFamily: "'Lora', serif" }}>
            {netWorth < 0 ? '-' : ''}${Math.abs(netWorth).toLocaleString()}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Total Assets</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: '700', color: '#2A9D8F' }}>${totalAssets.toLocaleString()}</p>
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Total Liabilities</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: '700', color: '#C1121F' }}>${totalLiabilities.toLocaleString()}</p>
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Asset-to-Debt Ratio</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: '700', color: '#C9A84C' }}>{totalLiabilities > 0 ? (totalAssets / totalLiabilities).toFixed(1) : '∞'}x</p>
            </div>
          </div>
        </div>

        {/* Add Form */}
        {showForm && (
          <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(201,168,76,0.5)' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              {(['asset', 'liability'] as const).map(t => (
                <button key={t} onClick={() => { setType(t); setForm({ ...form, subcategory: t === 'asset' ? 'Cash' : 'Credit Cards' }); }}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${type === t ? (t === 'asset' ? '#2A9D8F' : '#C1121F') : 'rgba(255,255,255,0.1)'}`, background: type === t ? (t === 'asset' ? 'rgba(42,157,143,0.2)' : 'rgba(193,18,31,0.2)') : 'transparent', color: type === t ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontWeight: type === t ? '600' : '400', textTransform: 'capitalize' }}>
                  {t === 'asset' ? '📈 Asset' : '📉 Liability'}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Business Checking Account" /></div>
              <div><label>Category</label><select value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })}>{(type === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES).map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label>Value ($)</label><input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="5000" /></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={addItem} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', cursor: 'pointer' }}>Add</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Assets */}
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#2A9D8F', fontSize: '16px', fontWeight: '600' }}>📈 Assets</h3>
            {Object.entries(bySubcategory('asset')).map(([sub, subItems]) => (
              <div key={sub} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{sub}</span>
                  <span style={{ fontSize: '13px', color: '#2A9D8F', fontWeight: '600' }}>${subItems.reduce((s, i) => s + i.value, 0).toLocaleString()}</span>
                </div>
                {subItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{item.name}</span>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>${item.value.toLocaleString()}</span>
                      <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '14px', padding: '2px' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Liabilities */}
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#C1121F', fontSize: '16px', fontWeight: '600' }}>📉 Liabilities</h3>
            {Object.entries(bySubcategory('liability')).map(([sub, subItems]) => (
              <div key={sub} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{sub}</span>
                  <span style={{ fontSize: '13px', color: '#C1121F', fontWeight: '600' }}>${subItems.reduce((s, i) => s + i.value, 0).toLocaleString()}</span>
                </div>
                {subItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{item.name}</span>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>${item.value.toLocaleString()}</span>
                      <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '14px', padding: '2px' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {Object.keys(bySubcategory('liability')).length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', padding: '1rem' }}>No liabilities recorded</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
