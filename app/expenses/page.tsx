'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { useBudgetStore } from '@/lib/store';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

const DIVISIONS = ['Consulting', 'Tea Time Network', 'Digital Tools', 'Books'];
const CATEGORIES = ['Software & Tools', 'Marketing & Ads', 'Hosting & Infrastructure', 'Payroll', 'Content & Media', 'Travel', 'Equipment', 'Professional Services', 'Education', 'Meals & Entertainment', 'Other'];
const COLORS: Record<string, string> = {
  'Software & Tools': '#9B5DE5', 'Marketing & Ads': '#C9A84C', 'Hosting & Infrastructure': '#2A9D8F',
  'Content & Media': '#C1121F', 'Professional Services': '#3a86ff', 'Travel': '#f4a261',
  'Equipment': '#e9c46a', 'Payroll': '#06d6a0', 'Education': '#ef476f', 'Meals & Entertainment': '#ffd166', 'Other': '#6c757d',
};

interface Expense {
  id?: string;
  division: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  is_anomaly?: boolean;
  anomaly_reason?: string;
}

export default function Expenses() {
  const { expenses, setExpenses } = useBudgetStore();
  const [form, setForm] = useState({ division: 'Consulting', category: 'Software & Tools', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [filterDiv, setFilterDiv] = useState('All');
  const [filterCat, setFilterCat] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [searchQ, setSearchQ] = useState('');
  const [exportMsg, setExportMsg] = useState('');
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (data) {
        setExpenses(data as any);
        detectAnomalies(data as any);
      }
    };
    fetch();
  }, []);

  const detectAnomalies = (data: Expense[]) => {
    const found: string[] = [];
    const catTotals: Record<string, number[]> = {};
    data.forEach(e => {
      if (!catTotals[e.category]) catTotals[e.category] = [];
      catTotals[e.category].push(e.amount);
    });
    Object.entries(catTotals).forEach(([cat, amounts]) => {
      if (amounts.length < 2) return;
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const max = Math.max(...amounts);
      if (max > avg * 2.5) found.push(`⚠️ Unusually high ${cat} expense detected ($${max.toFixed(0)} vs avg $${avg.toFixed(0)})`);
    });
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthTotal = data.filter(e => e.date.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0);
    if (monthTotal > 3000) found.push(`⚠️ Month-to-date spending is $${monthTotal.toFixed(0)} — review budget allocation`);
    setAlerts(found);
  };

  const handleAdd = async () => {
    if (!form.description || !form.amount) return;
    setSaving(true);
    try {
      const payload = { division: form.division, category: form.category, amount: parseFloat(form.amount), description: form.description, date: form.date };
      const { data } = await supabase.from('expenses').insert([payload]).select();
      if (data) {
        const updated = [data[0] as any, ...expenses];
        setExpenses(updated);
        detectAnomalies(updated);
        setForm({ division: 'Consulting', category: 'Software & Tools', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
        setShowForm(false);
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    const updated = expenses.filter((e: any) => e.id !== id);
    setExpenses(updated);
    detectAnomalies(updated);
  };

  const runAIAnalysis = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a financial analyst AI. Return ONLY valid JSON: {"spending_summary":"string","top_patterns":["string"],"anomalies":["string"],"optimization_tips":["string"],"predicted_next_month":{"total":0,"breakdown":{"category":"amount"}},"waste_identified":["string"]}. No markdown.',
          messages: [{ role: 'user', content: `Analyze C.H.A. LLC expenses: ${JSON.stringify(expenses.slice(0, 50))}. Identify patterns, anomalies, waste, and predict next month's spending. Be specific and actionable.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      setAnalysis(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch {
      setAnalysis({ spending_summary: 'Analysis unavailable.', top_patterns: [], anomalies: [], optimization_tips: [], waste_identified: [] });
    } finally { setAnalyzing(false); }
  };

  const exportCSV = () => {
    const rows = [['Date', 'Division', 'Category', 'Description', 'Amount']];
    filtered.forEach(e => rows.push([e.date, e.division, e.category, e.description, e.amount.toString()]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `cha-expenses-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    setExportMsg('✅ CSV exported');
    setTimeout(() => setExportMsg(''), 3000);
  };

  const filtered = expenses
    .filter((e: any) => (filterDiv === 'All' || e.division === filterDiv) && (filterCat === 'All' || e.category === filterCat) && (!searchQ || e.description.toLowerCase().includes(searchQ.toLowerCase()) || e.category.toLowerCase().includes(searchQ.toLowerCase())))
    .sort((a: any, b: any) => sortBy === 'amount' ? b.amount - a.amount : new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalFiltered = filtered.reduce((s: number, e: any) => s + e.amount, 0);
  const catBreakdown: Record<string, number> = {};
  filtered.forEach((e: any) => { catBreakdown[e.category] = (catBreakdown[e.category] || 0) + e.amount; });
  const topCat = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const mtdTotal = expenses.filter((e: any) => e.date?.startsWith(thisMonth)).reduce((s: number, e: any) => s + e.amount, 0);

  return (
    <Layout activeTab="expenses">
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Expense Tracking</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Smart categorization, pattern detection & anomaly alerts</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={exportCSV} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.4)', background: 'transparent', color: '#C9A84C', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              📥 Export CSV
            </button>
            <button className="btn-primary" onClick={runAIAnalysis} disabled={analyzing}
              style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #9B5DE5, #2A9D8F)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {analyzing ? '🔍 Analyzing...' : '🔍 AI Pattern Analysis'}
            </button>
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}
              style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              + Add Expense
            </button>
          </div>
        </div>

        {exportMsg && <div style={{ padding: '10px 14px', background: 'rgba(42,157,143,0.15)', border: '1px solid rgba(42,157,143,0.4)', borderRadius: '8px', color: '#2A9D8F', fontSize: '13px', marginBottom: '1rem' }}>{exportMsg}</div>}

        {/* Smart Alerts */}
        {alerts.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            {alerts.map((a, i) => (
              <div key={i} style={{ padding: '10px 14px', background: 'rgba(193,18,31,0.1)', border: '1px solid rgba(193,18,31,0.3)', borderRadius: '8px', color: '#ff6b6b', fontSize: '13px', marginBottom: '6px' }}>{a}</div>
            ))}
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'MTD Spending', value: `$${mtdTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C1121F' },
            { label: 'Total Expenses', value: `$${expenses.reduce((s: number, e: any) => s + e.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C9A84C' },
            { label: 'Filtered Total', value: `$${totalFiltered.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#2A9D8F' },
            { label: 'Top Category', value: topCat[0]?.[0] || '—', color: '#9B5DE5' },
          ].map(m => (
            <div key={m.label} className="card-hover" style={card}>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '20px', fontWeight: '700', color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Category Breakdown Bar */}
        {topCat.length > 0 && (
          <div style={{ ...card, marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '14px', fontWeight: '600' }}>Spending by Category</h3>
            {topCat.slice(0, 6).map(([cat, amt]) => (
              <div key={cat} style={{ marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[cat] || '#666', display: 'inline-block' }} />{cat}
                  </span>
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>({((amt / totalFiltered) * 100).toFixed(0)}%)</span></span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '6px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(amt / topCat[0][1]) * 100}%`, background: COLORS[cat] || '#666', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Form */}
        {showForm && (
          <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(201,168,76,0.5)' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#C9A84C', fontSize: '15px', fontWeight: '600' }}>New Expense</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div><label>Division</label><select value={form.division} onChange={e => setForm({ ...form, division: e.target.value })}>{DIVISIONS.map(d => <option key={d}>{d}</option>)}</select></div>
              <div><label>Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label>Amount ($)</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></div>
              <div style={{ gridColumn: 'span 2' }}><label>Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What was this expense for?" /></div>
              <div><label>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={handleAdd} disabled={saving}
                style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save Expense'}</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="🔍 Search expenses..." style={{ width: '220px !important', flex: 'none' }} />
          <select value={filterDiv} onChange={e => setFilterDiv(e.target.value)} style={{ width: 'auto !important' }}><option value="All">All Divisions</option>{DIVISIONS.map(d => <option key={d}>{d}</option>)}</select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 'auto !important' }}><option value="All">All Categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto !important' }}><option value="date">Sort: Date</option><option value="amount">Sort: Amount</option></select>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{filtered.length} records</span>
        </div>

        {/* Expense Table */}
        <div style={card}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📝</div>
              <p style={{ margin: 0, fontSize: '14px' }}>No expenses found. Add your first expense above.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
                    {['Date', 'Division', 'Category', 'Description', 'Amount', ''].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((e: any) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{e.date}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: 'rgba(155,93,229,0.15)', color: '#9B5DE5', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>{e.division}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: COLORS[e.category] || '#666', display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ color: 'rgba(255,255,255,0.65)' }}>{e.category}</span>
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#fff' }}>{e.description}</td>
                      <td style={{ padding: '10px 12px', color: '#C1121F', fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap' }}>${parseFloat(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 50 && <p style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: 0 }}>Showing 50 of {filtered.length} results. Use filters to narrow down.</p>}
            </div>
          )}
        </div>

        {/* AI Analysis */}
        {analysis && (
          <div style={{ ...card, marginTop: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '16px', fontWeight: '600' }}>🔍 AI Spending Analysis</h3>
            <div style={{ padding: '1rem 1.25rem', background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.25)', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.7' }}>{analysis.spending_summary}</p>
            </div>
            {analysis.predicted_next_month?.total > 0 && (
              <div style={{ padding: '1rem', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 4px 0', color: '#C9A84C', fontSize: '13px', fontWeight: '600' }}>📊 Predicted Next Month: ${analysis.predicted_next_month.total.toLocaleString()}</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Based on your current spending patterns</p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: '📈 Patterns', items: analysis.top_patterns, color: '#2A9D8F' },
                { label: '⚠️ Anomalies', items: analysis.anomalies, color: '#C1121F' },
                { label: '💡 Optimization', items: analysis.optimization_tips, color: '#C9A84C' },
                { label: '🗑️ Waste Identified', items: analysis.waste_identified, color: '#9B5DE5' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.75rem 0', color: s.color, fontSize: '13px', fontWeight: '600' }}>{s.label}</p>
                  {s.items?.length > 0 ? s.items.map((item: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '12px', lineHeight: '1.5' }}>• {item}</p>) : <p style={{ margin: 0, color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>None detected</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
