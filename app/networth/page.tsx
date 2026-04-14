// BUILD_V4_SUPABASE
'use client';
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;
const ASSET_CATS = ['Cash', 'Investments', 'Business Assets', 'Real Estate', 'Vehicles', 'Retirement', 'Crypto', 'Other'];
const LIAB_CATS = ['Credit Cards', 'Student Loans', 'Business Debt', 'Mortgage', 'Auto Loans', 'Recurring Debt', 'Other'];

export default function NetWorth() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'asset' | 'liability'>('asset');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', subcategory: 'Cash', value: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('networth_items').select('*').order('category').order('created_at');
    if (data) setItems(data);
    setLoading(false);
  };

  const addItem = async () => {
    if (!form.name || !form.value) return;
    setSaving(true);
    const { data } = await supabase.from('networth_items').insert([{ name: form.name, category: type, subcategory: form.subcategory, value: parseFloat(form.value) }]).select();
    if (data) { setItems(prev => [...prev, data[0]]); setForm({ name: '', subcategory: 'Cash', value: '' }); setShowForm(false); }
    setSaving(false);
  };

  const updateValue = async (id: string, value: number) => {
    await supabase.from('networth_items').update({ value }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, value } : i));
  };

  const removeItem = async (id: string) => {
    await supabase.from('networth_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const totalAssets = items.filter(i => i.category === 'asset').reduce((s, i) => s + parseFloat(i.value), 0);
  const totalLiab = items.filter(i => i.category === 'liability').reduce((s, i) => s + parseFloat(i.value), 0);
  const netWorth = totalAssets - totalLiab;

  const bySub = (cat: string) => {
    const filtered = items.filter(i => i.category === cat);
    const grouped: Record<string, any[]> = {};
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
          <button className="btn-primary" onClick={() => setShowForm(true)}
            style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>+ Add Item</button>
        </div>

        {/* Net Worth Hero */}
        <div style={{ ...card, background: 'linear-gradient(135deg, rgba(26,26,46,0.9), rgba(42,157,143,0.15))', border: '1px solid rgba(201,168,76,0.4)', marginBottom: '1.5rem', textAlign: 'center', padding: '2.5rem' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Net Worth</p>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '48px', fontWeight: '700', color: netWorth >= 0 ? '#2A9D8F' : '#C1121F', fontFamily: "'Lora', serif" }}>
            {netWorth < 0 ? '-' : ''}${Math.abs(netWorth).toLocaleString()}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem' }}>
            <div><p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Assets</p><p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: '700', color: '#2A9D8F' }}>${totalAssets.toLocaleString()}</p></div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <div><p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Liabilities</p><p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: '700', color: '#C1121F' }}>${totalLiab.toLocaleString()}</p></div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <div><p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Ratio</p><p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: '700', color: '#C9A84C' }}>{totalLiab > 0 ? (totalAssets / totalLiab).toFixed(1) : '∞'}x</p></div>
          </div>
        </div>

        {showForm && (
          <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(201,168,76,0.5)' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              {(['asset', 'liability'] as const).map(t => (
                <button key={t} onClick={() => { setType(t); setForm({ ...form, subcategory: t === 'asset' ? 'Cash' : 'Credit Cards' }); }}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${type === t ? (t === 'asset' ? '#2A9D8F' : '#C1121F') : 'rgba(255,255,255,0.1)'}`, background: type === t ? (t === 'asset' ? 'rgba(42,157,143,0.2)' : 'rgba(193,18,31,0.2)') : 'transparent', color: type === t ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', textTransform: 'capitalize' }}>
                  {t === 'asset' ? '📈 Asset' : '📉 Liability'}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Business Checking Account" /></div>
              <div><label>Category</label><select value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })}>{(type === 'asset' ? ASSET_CATS : LIAB_CATS).map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label>Value ($)</label><input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="5000" /></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={addItem} disabled={saving} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>{saving ? 'Saving...' : 'Add'}</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? <div style={{ ...card, textAlign: 'center', padding: '2rem' }}><p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Loading...</p></div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {(['asset', 'liability'] as const).map(cat => (
                <div key={cat} style={card}>
                  <h3 style={{ margin: '0 0 1.25rem 0', color: cat === 'asset' ? '#2A9D8F' : '#C1121F', fontSize: '16px', fontWeight: '600' }}>
                    {cat === 'asset' ? '📈 Assets' : '📉 Liabilities'}
                  </h3>
                  {Object.keys(bySub(cat)).length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', padding: '1.5rem 0' }}>No {cat === 'asset' ? 'assets' : 'liabilities'} recorded</p>
                  ) : Object.entries(bySub(cat)).map(([sub, subItems]) => (
                    <div key={sub} style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{sub}</span>
                        <span style={{ fontSize: '12px', color: cat === 'asset' ? '#2A9D8F' : '#C1121F', fontWeight: '600' }}>${(subItems as any[]).reduce((s, i) => s + parseFloat(i.value), 0).toLocaleString()}</span>
                      </div>
                      {(subItems as any[]).map((item: any) => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{item.name}</span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="number" defaultValue={parseFloat(item.value)} onBlur={e => updateValue(item.id, parseFloat(e.target.value) || 0)}
                              style={{ width: '90px !important', padding: '3px 6px !important', fontSize: '12px !important', fontWeight: '700', color: `${cat === 'asset' ? '#2A9D8F' : '#C1121F'} !important` }} />
                            <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '16px', padding: '0 2px' }}>×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
      </div>
    </Layout>
  );
}
