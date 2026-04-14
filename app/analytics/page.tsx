// BUILD_V4_REALDATA
'use client';
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

const CAT_COLORS: Record<string, string> = {
  'Software & Tools': '#9B5DE5', 'Marketing & Ads': '#C9A84C', 'Hosting & Infrastructure': '#2A9D8F',
  'Content & Media': '#C1121F', 'Professional Services': '#3a86ff', 'Travel': '#f4a261',
  'Equipment': '#e9c46a', 'Payroll': '#06d6a0', 'Education': '#ef476f', 'Meals & Entertainment': '#ffd166', 'Other': '#6c757d',
};

export default function Analytics() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [er, rr] = await Promise.all([
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('revenue').select('*').order('date', { ascending: false }),
    ]);
    if (er.data) setExpenses(er.data);
    if (rr.data) setRevenue(rr.data);
    setLoading(false);
  };

  // Build monthly data from real transactions
  const buildMonthlyData = () => {
    const months: Record<string, { income: number; expenses: number; label: string }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleString('default', { month: 'short' });
      months[key] = { income: 0, expenses: 0, label };
    }
    revenue.forEach(r => { const k = (r.date || '').slice(0, 7); if (months[k]) months[k].income += parseFloat(r.amount || 0); });
    expenses.forEach(e => { const k = (e.date || '').slice(0, 7); if (months[k]) months[k].expenses += parseFloat(e.amount || 0); });
    return Object.values(months);
  };

  const monthly = buildMonthlyData();
  const totalRevenue = revenue.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const avgMonthlyNet = monthly.length > 0 ? monthly.reduce((s, m) => s + m.income - m.expenses, 0) / monthly.length : 0;
  const maxVal = Math.max(...monthly.map(m => Math.max(m.income, m.expenses)), 1);

  // Category breakdown from real data
  const catBreakdown: Record<string, number> = {};
  expenses.forEach(e => { catBreakdown[e.category] = (catBreakdown[e.category] || 0) + parseFloat(e.amount || 0); });
  const topCategories = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Product revenue from real data
  const productRevenue: Record<string, number> = {};
  revenue.forEach(r => { productRevenue[r.product_name] = (productRevenue[r.product_name] || 0) + parseFloat(r.amount || 0); });
  const topProducts = Object.entries(productRevenue).sort((a, b) => b[1] - a[1]);

  const generateReport = async () => {
    setGenerating(true); setReport(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000,
          system: 'You are a CFO-level analyst. Return ONLY valid JSON: {"executive_summary":"string","period_highlights":["string"],"spending_patterns":["string"],"growth_trends":["string"],"action_items":["string"],"forecast_next_month":{"expected_income":0,"expected_expenses":0,"net":0,"confidence":"string"}}. No markdown.',
          messages: [{ role: 'user', content: `${period} financial report for C.H.A. LLC. Total Revenue: $${totalRevenue.toFixed(0)}, Total Expenses: $${totalExpenses.toFixed(0)}, Net: $${netProfit.toFixed(0)}. Monthly data: ${JSON.stringify(monthly)}. Revenue by product: ${JSON.stringify(topProducts.slice(0, 5))}. Expenses by category: ${JSON.stringify(topCategories.slice(0, 5))}. 5 products launched April 2026. Provide CFO-level analysis.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      setReport(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch { setReport(null); }
    setGenerating(false);
  };

  return (
    <Layout activeTab="analytics">
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Analytics & Reports</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Live financial insights from your actual data</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: 'auto !important', padding: '8px 14px !important' }}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
            <button className="btn-primary" onClick={generateReport} disabled={generating}
              style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #9B5DE5, #C9A84C)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {generating ? '📊 Generating...' : '📊 AI Report'}
            </button>
          </div>
        </div>

        {/* KPIs from real data */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#2A9D8F' },
            { label: 'Total Expenses', value: `$${totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C1121F' },
            { label: 'Net Profit', value: `${netProfit >= 0 ? '+' : ''}$${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: netProfit >= 0 ? '#2A9D8F' : '#C1121F' },
            { label: 'Avg Monthly Net', value: `${avgMonthlyNet >= 0 ? '+' : ''}$${Math.abs(avgMonthlyNet).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#9B5DE5' },
          ].map(m => (
            <div key={m.label} className="card-hover" style={card}>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: '700', color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Bar Chart — real data */}
        <div style={{ ...card, marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Income vs Expenses — Last 6 Months (Live Data)</h3>
          {loading ? <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Loading...</p> : (
            <>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', height: '180px', padding: '0 0.5rem' }}>
                {monthly.map(m => (
                  <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', width: '100%' }}>
                      <div title={`Income: $${m.income}`} style={{ flex: 1, background: '#2A9D8F', borderRadius: '3px 3px 0 0', height: `${(m.income / maxVal) * 150}px`, minHeight: m.income > 0 ? '4px' : '0', transition: 'height 0.5s ease' }} />
                      <div title={`Expenses: $${m.expenses}`} style={{ flex: 1, background: '#C1121F', borderRadius: '3px 3px 0 0', height: `${(m.expenses / maxVal) * 150}px`, minHeight: m.expenses > 0 ? '4px' : '0', transition: 'height 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{m.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', justifyContent: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}><span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#2A9D8F', display: 'inline-block' }} />Income</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}><span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#C1121F', display: 'inline-block' }} />Expenses</span>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Expense breakdown */}
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Expense Breakdown</h3>
            {topCategories.length === 0 ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No expenses recorded yet</p>
              : topCategories.map(([cat, amt]) => (
                <div key={cat} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: CAT_COLORS[cat] || '#666', display: 'inline-block' }} />{cat}
                    </span>
                    <span style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>({totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(0) : 0}%)</span></span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: topCategories[0] ? `${(amt / topCategories[0][1]) * 100}%` : '0%', background: CAT_COLORS[cat] || '#666', borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
          </div>

          {/* Product revenue */}
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Revenue by Product</h3>
            {topProducts.length === 0 ? (
              <div>
                <div style={{ padding: '0.75rem', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', marginBottom: '0.75rem' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#C9A84C' }}>🚀 Products live — first sales expected from April 14 promo push</p>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No revenue recorded yet. Revenue will appear here as sales come in.</p>
              </div>
            ) : topProducts.map(([name, amt]) => (
              <div key={name} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{name}</span>
                  <span style={{ fontSize: '13px', color: '#2A9D8F', fontWeight: '600' }}>${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: topProducts[0] ? `${(amt / topProducts[0][1]) * 100}%` : '0%', background: '#2A9D8F', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Report */}
        {generating && <div style={{ ...card, textAlign: 'center', padding: '2.5rem' }}><p style={{ color: '#9B5DE5', fontWeight: '600', margin: 0 }}>📊 Generating CFO-level analysis from your live data...</p></div>}
        {report && (
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '16px', fontWeight: '600' }}>📊 AI Financial Report — {period.charAt(0).toUpperCase() + period.slice(1)}</h3>
            <div style={{ padding: '1rem 1.25rem', background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.2)', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <p style={{ margin: 0, color: '#fff', fontSize: '14px', lineHeight: '1.7' }}>{report.executive_summary}</p>
            </div>
            {report.forecast_next_month && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[{ label: 'Forecast Revenue', value: `$${(report.forecast_next_month.expected_income || 0).toLocaleString()}`, color: '#2A9D8F' }, { label: 'Forecast Expenses', value: `$${(report.forecast_next_month.expected_expenses || 0).toLocaleString()}`, color: '#C1121F' }, { label: 'Confidence', value: report.forecast_next_month.confidence || 'N/A', color: '#C9A84C' }].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{m.label}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '700', color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[{ label: '✨ Highlights', items: report.period_highlights, color: '#C9A84C' }, { label: '📈 Growth', items: report.growth_trends, color: '#2A9D8F' }, { label: '🔍 Patterns', items: report.spending_patterns, color: '#9B5DE5' }, { label: '✅ Actions', items: report.action_items, color: '#C1121F' }].map(s => (
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
