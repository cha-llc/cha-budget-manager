'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

const PRODUCTS = ['BrandPulse', 'Clarity Engine', 'Flagged', 'Freedom Era Audit', 'Business Ops Fixer', 'Burned-Out Professional Reset', 'We Need to Talk', 'First-Gen Table', 'Patreon', 'Consulting', 'Books', 'Other'];
const SOURCES = ['Stripe', 'Gumroad', 'Patreon', 'Direct', 'HubSpot', 'Other'];

export default function Revenue() {
  const [revenue, setRevenue] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product_name: 'BrandPulse', amount: '', source: 'Stripe', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  useEffect(() => {
    supabase.from('revenue').select('*').order('date', { ascending: false }).then(({ data }) => { if (data) setRevenue(data); });
  }, []);

  const handleAdd = async () => {
    if (!form.amount) return;
    setSaving(true);
    const { data } = await supabase.from('revenue').insert([{ ...form, amount: parseFloat(form.amount) }]).select();
    if (data) { setRevenue([data[0], ...revenue]); setForm({ product_name: 'BrandPulse', amount: '', source: 'Stripe', date: new Date().toISOString().split('T')[0] }); setShowForm(false); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('revenue').delete().eq('id', id);
    setRevenue(revenue.filter(r => r.id !== id));
  };

  const exportCSV = () => {
    const rows = [['Product', 'Source', 'Amount', 'Date'], ...revenue.map(r => [r.product_name, r.source, r.amount, r.date])];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `cha-revenue-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    setExportMsg('✅ Exported'); setTimeout(() => setExportMsg(''), 2000);
  };

  const total = revenue.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const byProduct: Record<string, number> = {};
  revenue.forEach(r => { byProduct[r.product_name] = (byProduct[r.product_name] || 0) + parseFloat(r.amount || 0); });
  const topProducts = Object.entries(byProduct).sort((a, b) => b[1] - a[1]);

  return (
    <Layout activeTab="revenue">
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Revenue Tracking</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>All C.H.A. LLC product and service revenue</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {exportMsg && <span style={{ color: '#2A9D8F', fontSize: '13px', alignSelf: 'center' }}>{exportMsg}</span>}
            <button className="btn-primary" onClick={exportCSV} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.4)', background: 'transparent', color: '#C9A84C', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>📥 CSV</button>
            <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>+ Add Revenue</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card-hover" style={{ ...card, borderLeft: '3px solid #2A9D8F' }}>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Revenue</p>
            <p style={{ margin: '6px 0 0 0', fontSize: '32px', fontWeight: '700', color: '#2A9D8F', fontFamily: "'Lora', serif" }}>${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="card-hover" style={{ ...card, borderLeft: '3px solid #C9A84C' }}>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Transactions</p>
            <p style={{ margin: '6px 0 0 0', fontSize: '32px', fontWeight: '700', color: '#C9A84C', fontFamily: "'Lora', serif" }}>{revenue.length}</p>
          </div>
          <div className="card-hover" style={{ ...card, borderLeft: '3px solid #9B5DE5' }}>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Product</p>
            <p style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: '700', color: '#9B5DE5' }}>{topProducts[0]?.[0] || '—'}</p>
          </div>
        </div>

        {/* Product Breakdown */}
        {topProducts.length > 0 && (
          <div style={{ ...card, marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Revenue by Product</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {topProducts.map(([name, amt]) => (
                <div key={name} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '2px solid #2A9D8F' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{name}</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '700', color: '#2A9D8F' }}>${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{((amt / total) * 100).toFixed(0)}% of total</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Form */}
        {showForm && (
          <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(42,157,143,0.5)' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#2A9D8F', fontSize: '15px', fontWeight: '600' }}>Record Revenue</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div><label>Product / Service</label><select value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })}>{PRODUCTS.map(p => <option key={p}>{p}</option>)}</select></div>
              <div><label>Amount ($)</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="47.00" /></div>
              <div><label>Source</label><select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
              <div><label>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={handleAdd} disabled={saving} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#2A9D8F', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Record Revenue'}</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Revenue Table */}
        <div style={card}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>All Revenue ({revenue.length})</h3>
          {revenue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>💹</div>
              <p style={{ margin: 0 }}>No revenue recorded yet. Upload a document or add manually.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
                  {['Product', 'Source', 'Date', 'Amount', ''].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {revenue.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 12px', color: '#fff', fontWeight: '500' }}>{r.product_name}</td>
                      <td style={{ padding: '10px 12px' }}><span style={{ background: 'rgba(42,157,143,0.15)', color: '#2A9D8F', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{r.source}</span></td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>{r.date}</td>
                      <td style={{ padding: '10px 12px', color: '#2A9D8F', fontWeight: '700', fontSize: '15px' }}>${parseFloat(r.amount).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px' }}><button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '16px' }}>×</button></td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1px solid rgba(201,168,76,0.3)' }}>
                    <td colSpan={3} style={{ padding: '10px 12px', color: '#fff', fontWeight: '700' }}>TOTAL</td>
                    <td style={{ padding: '10px 12px', color: '#2A9D8F', fontWeight: '800', fontSize: '16px' }}>${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
