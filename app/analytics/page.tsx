// BUILD_V5_PERSONAL_BUSINESS
'use client';
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { SkeletonKPI, SkeletonCard, SkeletonTable } from '@/components/Skeleton';
import { supabase } from '@/lib/supabase';

const card = { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'1.5rem' } as const;



const BIZ_CAT_COLORS: Record<string, string> = {
  'Software & Tools': '#9B5DE5', 'Marketing & Ads': '#C9A84C', 'Hosting & Infrastructure': '#2A9D8F',
  'Content & Media': '#C1121F', 'Professional Services': '#3a86ff', 'Travel': '#f4a261',
  'Equipment': '#e9c46a', 'Payroll': '#06d6a0', 'Education': '#ef476f', 'Meals & Entertainment': '#ffd166', 'Other': '#6c757d',
};
const PERS_CAT_COLORS: Record<string, string> = {
  'Salary / Wages': '#2A9D8F', 'Other Income': '#06d6a0', 'Taxes': '#C1121F',
  'Federal Income Tax': '#C1121F', 'State Income Tax': '#C1121F', 'Social Security': '#C1121F', 'Medicare': '#C1121F',
  'Health & Wellness': '#06d6a0', 'Emergency Fund': '#3a86ff', 'Savings': '#2A9D8F',
  'Housing / Rent': '#f4a261', 'Food & Groceries': '#C9A84C', 'Transportation': '#3a86ff',
  'Entertainment': '#9B5DE5', 'Credit Card Payments': '#C9A84C', 'Personal Care': '#9B5DE5',
};

export default function Analytics() {
  const [mode, setMode] = useState<'business' | 'personal'>('business');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [persTxs, setPersTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('revenue').select('*').order('date', { ascending: false }),
      supabase.from('personal_transactions').select('*').order('date', { ascending: false }),
    ]).then(([er, rr, tr]) => {
      if (er.data) setExpenses(er.data);
      if (rr.data) setRevenue(rr.data);
      if (tr.data) setPersTxs(tr.data);
      setLoading(false);
    });
  }, []);

  // ── BUSINESS COMPUTED ──
  const buildBizMonthly = () => {
    const months: Record<string, { income: number; expenses: number; label: string }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      months[key] = { income: 0, expenses: 0, label: d.toLocaleString('default', { month: 'short' }) };
    }
    revenue.forEach(r => { const k = (r.date || '').slice(0, 7); if (months[k]) months[k].income += parseFloat(r.amount || 0); });
    expenses.forEach(e => { const k = (e.date || '').slice(0, 7); if (months[k]) months[k].expenses += parseFloat(e.amount || 0); });
    return Object.values(months);
  };

  // ── PERSONAL COMPUTED ──
  const buildPersMonthly = () => {
    const months: Record<string, { income: number; expenses: number; label: string }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      months[key] = { income: 0, expenses: 0, label: d.toLocaleString('default', { month: 'short' }) };
    }
    persTxs.forEach(t => {
      const k = (t.date || '').slice(0, 7);
      if (!months[k]) return;
      if (t.type === 'income') months[k].income += parseFloat(t.amount || 0);
      else months[k].expenses += parseFloat(t.amount || 0);
    });
    return Object.values(months);
  };

  const bizMonthly = buildBizMonthly();
  const persMonthly = buildPersMonthly();
  const monthly = mode === 'business' ? bizMonthly : persMonthly;

  const totalBizRevenue = revenue.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const totalBizExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const bizNet = totalBizRevenue - totalBizExpenses;

  const totalPersIncome = persTxs.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalPersExpenses = persTxs.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const persNet = totalPersIncome - totalPersExpenses;

  const totalIncome = mode === 'business' ? totalBizRevenue : totalPersIncome;
  const totalExpenses = mode === 'business' ? totalBizExpenses : totalPersExpenses;
  const netAmount = mode === 'business' ? bizNet : persNet;
  const avgMonthlyNet = monthly.reduce((s, m) => s + m.income - m.expenses, 0) / (monthly.length || 1);
  const maxVal = Math.max(...monthly.map(m => Math.max(m.income, m.expenses)), 1);

  // Category breakdowns
  const bizCatBreakdown: Record<string, number> = {};
  expenses.forEach(e => { bizCatBreakdown[e.category] = (bizCatBreakdown[e.category] || 0) + parseFloat(e.amount || 0); });
  const topBizCats = Object.entries(bizCatBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const persCatBreakdown: Record<string, number> = {};
  persTxs.filter(t => t.type === 'expense').forEach(t => { persCatBreakdown[t.category_name] = (persCatBreakdown[t.category_name] || 0) + parseFloat(t.amount || 0); });
  const topPersCats = Object.entries(persCatBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const persIncomeBreakdown: Record<string, number> = {};
  persTxs.filter(t => t.type === 'income').forEach(t => { persIncomeBreakdown[t.category_name] = (persIncomeBreakdown[t.category_name] || 0) + parseFloat(t.amount || 0); });
  const topPersIncome = Object.entries(persIncomeBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const productRevenue: Record<string, number> = {};
  revenue.forEach(r => { productRevenue[r.product_name] = (productRevenue[r.product_name] || 0) + parseFloat(r.amount || 0); });
  const topProducts = Object.entries(productRevenue).sort((a, b) => b[1] - a[1]);

  const topCats = mode === 'business' ? topBizCats : topPersCats;
  const catColors = mode === 'business' ? BIZ_CAT_COLORS : PERS_CAT_COLORS;

  const generateReport = async () => {
    setGenerating(true); setReport(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000,
          system: mode === 'business'
            ? 'You are a CFO-level analyst for C.H.A. LLC. Return ONLY valid JSON: {"executive_summary":"string","period_highlights":["string"],"spending_patterns":["string"],"growth_trends":["string"],"action_items":["string"],"forecast_next_month":{"expected_income":0,"expected_expenses":0,"net":0,"confidence":"string"}}. No markdown.'
            : 'You are a personal finance advisor. Return ONLY valid JSON: {"executive_summary":"string","period_highlights":["string"],"spending_patterns":["string"],"savings_insights":["string"],"action_items":["string"],"forecast_next_month":{"expected_income":0,"expected_expenses":0,"net":0,"confidence":"string"}}. No markdown.',
          messages: [{ role: 'user', content: mode === 'business'
            ? `C.H.A. LLC ${period} report. Revenue: $${totalBizRevenue.toFixed(0)}, Expenses: $${totalBizExpenses.toFixed(0)}, Net: $${bizNet.toFixed(0)}. Monthly: ${JSON.stringify(bizMonthly)}. Products: ${JSON.stringify(topProducts.slice(0,4))}. Top expense categories: ${JSON.stringify(topBizCats.slice(0,4))}.`
            : `Personal ${period} report. Income: $${totalPersIncome.toFixed(0)}, Expenses: $${totalPersExpenses.toFixed(0)}, Net: $${persNet.toFixed(0)}. Monthly: ${JSON.stringify(persMonthly)}. Income sources: ${JSON.stringify(topPersIncome)}. Top expense categories: ${JSON.stringify(topPersCats.slice(0,5))}.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      setReport(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch { setReport(null); }
    setGenerating(false);
  };

  if (loading) return (
    <Layout activeTab="analytics">
      <div style={{maxWidth:'1280px'}}>
        <div style={{marginBottom:'2rem',height:'36px',width:'240px',borderRadius:'8px',background:'rgba(255,255,255,0.05)'}} />
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'1.5rem'}}>
          <SkeletonKPI /><SkeletonKPI /><SkeletonKPI /><SkeletonKPI />
        </div>
        <SkeletonCard height="240px" lines={5} />
        <div style={{marginTop:'1.25rem'}}><SkeletonTable rows={7} /></div>
      </div>
    </Layout>
  );

  return (
    <Layout activeTab="analytics">
      <div style={{ maxWidth: '1200px' }}>
        {/* Header + toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Analytics</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              {mode === 'business' ? 'C.H.A. LLC business performance — revenue, expenses, trends' : 'Personal finance analytics — income, spending, patterns'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '4px' }}>
              {(['business', 'personal'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setReport(null); }} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: mode === m ? (m === 'business' ? '#C9A84C' : '#9B5DE5') : 'transparent', color: mode === m ? (m === 'business' ? '#1A1A2E' : '#fff') : 'rgba(255,255,255,0.5)', fontWeight: mode === m ? '700' : '400', fontSize: '12px', fontFamily: 'Poppins,sans-serif', transition: 'all 0.2s' }}>
                  {m === 'business' ? '🏢 Business' : '🧾 Personal'}
                </button>
              ))}
            </div>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: 'auto !important', padding: '8px 14px !important' }}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
            <button className="btn btn-gold" onClick={generateReport} disabled={generating}
              style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #9B5DE5, #C9A84C)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {generating ? '📊 Generating...' : '📊 AI Report'}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: mode === 'business' ? 'Total Revenue' : 'Total Income', value: `$${totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#2A9D8F' },
            { label: 'Total Expenses', value: `$${totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C1121F' },
            { label: 'Net', value: `${netAmount >= 0 ? '+' : ''}$${netAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: netAmount >= 0 ? '#2A9D8F' : '#C1121F' },
            { label: 'Avg Monthly Net', value: `${avgMonthlyNet >= 0 ? '+' : ''}$${Math.abs(avgMonthlyNet).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#9B5DE5' },
          ].map(m => (
            <div key={m.label} className="glass-hover" style={card}>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: '700', color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Bar Chart */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>
            {mode === 'business' ? 'Business Revenue vs Expenses' : 'Personal Income vs Spending'} — Last 6 Months
          </h3>
          {loading ? <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Loading...</p> : (
            <>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', height: '180px', padding: '0 0.5rem' }}>
                {monthly.map(m => (
                  <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', width: '100%' }}>
                      <div title={`${mode === 'business' ? 'Revenue' : 'Income'}: $${m.income}`} style={{ flex: 1, background: '#2A9D8F', borderRadius: '3px 3px 0 0', height: `${(m.income / maxVal) * 150}px`, minHeight: m.income > 0 ? '4px' : '0', transition: 'height 0.5s ease' }} />
                      <div title={`Expenses: $${m.expenses}`} style={{ flex: 1, background: '#C1121F', borderRadius: '3px 3px 0 0', height: `${(m.expenses / maxVal) * 150}px`, minHeight: m.expenses > 0 ? '4px' : '0', transition: 'height 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{m.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', justifyContent: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}><span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#2A9D8F', display: 'inline-block' }} />{mode === 'business' ? 'Revenue' : 'Income'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}><span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#C1121F', display: 'inline-block' }} />Expenses</span>
              </div>
            </>
          )}
        </div>

        {/* Breakdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Expense Breakdown</h3>
            {topCats.length === 0 ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No expenses yet</p>
              : topCats.map(([cat, amt]) => (
                <div key={cat} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: catColors[cat] || '#666', display: 'inline-block' }} />{cat}
                    </span>
                    <span style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>({totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(0) : 0}%)</span></span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: topCats[0] ? `${(amt / topCats[0][1]) * 100}%` : '0%', background: catColors[cat] || '#666', borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
          </div>

          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>
              {mode === 'business' ? 'Revenue by Product' : 'Income Sources'}
            </h3>
            {mode === 'business' ? (
              topProducts.length === 0
                ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No revenue yet</p>
                : topProducts.map(([name, amt]) => (
                  <div key={name} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{name}</span>
                      <span style={{ fontSize: '13px', color: '#2A9D8F', fontWeight: '600' }}>${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: topProducts[0] ? `${(amt / topProducts[0][1]) * 100}%` : '0%', background: '#2A9D8F', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))
            ) : (
              topPersIncome.length === 0
                ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No income recorded yet — upload pay stubs</p>
                : topPersIncome.map(([name, amt]) => (
                  <div key={name} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{name}</span>
                      <span style={{ fontSize: '13px', color: '#2A9D8F', fontWeight: '600' }}>${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: topPersIncome[0] ? `${(amt / topPersIncome[0][1]) * 100}%` : '0%', background: '#2A9D8F', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* AI Report */}
        {generating && <div style={{ textAlign: 'center', padding: '2.5rem' }}><p style={{ color: '#9B5DE5', fontWeight: '600', margin: 0 }}>📊 Generating AI analysis from live data...</p></div>}
        {report && (
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '16px', fontWeight: '600' }}>📊 AI Analysis — {mode === 'business' ? 'Business' : 'Personal'} {period.charAt(0).toUpperCase() + period.slice(1)}</h3>
            <div style={{ padding: '1rem 1.25rem', background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.2)', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <p style={{ margin: 0, color: '#fff', fontSize: '14px', lineHeight: '1.7' }}>{report.executive_summary}</p>
            </div>
            {report.forecast_next_month && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[{ label: mode === 'business' ? 'Forecast Revenue' : 'Forecast Income', value: `$${(report.forecast_next_month.expected_income || 0).toLocaleString()}`, color: '#2A9D8F' }, { label: 'Forecast Expenses', value: `$${(report.forecast_next_month.expected_expenses || 0).toLocaleString()}`, color: '#C1121F' }, { label: 'Confidence', value: report.forecast_next_month.confidence || 'N/A', color: '#C9A84C' }].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{m.label}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '700', color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[{ label: '✨ Highlights', items: report.period_highlights, color: '#C9A84C' }, { label: mode === 'business' ? '📈 Growth' : '💰 Savings', items: report.growth_trends || report.savings_insights, color: '#2A9D8F' }, { label: '🔍 Patterns', items: report.spending_patterns, color: '#9B5DE5' }, { label: '✅ Actions', items: report.action_items, color: '#C1121F' }].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.75rem 0', color: s.color, fontSize: '12px', fontWeight: '600' }}>{s.label}</p>
                  {s.items?.map((item: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '12px', lineHeight: '1.5' }}>• {item}</p>)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
