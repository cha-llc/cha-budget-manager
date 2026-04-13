'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

const MOCK_MONTHLY = [
  { month: 'Nov', income: 2100, expenses: 1650 },
  { month: 'Dec', income: 2800, expenses: 1900 },
  { month: 'Jan', income: 1950, expenses: 1800 },
  { month: 'Feb', income: 3200, expenses: 2100 },
  { month: 'Mar', income: 2700, expenses: 1750 },
  { month: 'Apr', income: 4700, expenses: 2200 },
];

const MOCK_CATEGORIES = [
  { name: 'Software & Tools', amount: 620, pct: 28, color: '#9B5DE5' },
  { name: 'Marketing', amount: 480, pct: 22, color: '#C9A84C' },
  { name: 'Hosting & Infrastructure', amount: 340, pct: 15, color: '#2A9D8F' },
  { name: 'Content & Media', amount: 290, pct: 13, color: '#C1121F' },
  { name: 'Professional Services', amount: 220, pct: 10, color: '#3a86ff' },
  { name: 'Other', amount: 250, pct: 12, color: '#6c757d' },
];

const MOCK_PRODUCTS = [
  { name: 'BrandPulse', revenue: 0, price: 47, sales: 0 },
  { name: 'Clarity Engine', revenue: 0, price: 37, sales: 0 },
  { name: 'Freedom Era Audit', revenue: 0, price: 150, sales: 0 },
  { name: 'Flagged', revenue: 0, price: 4.99, sales: 0 },
  { name: 'Business Ops Fixer', revenue: 0, price: 497, sales: 0 },
];

export default function Analytics() {
  const [report, setReport] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [period, setPeriod] = useState('monthly');

  const maxVal = Math.max(...MOCK_MONTHLY.map(m => Math.max(m.income, m.expenses)));
  const totalIncome = MOCK_MONTHLY.reduce((s, m) => s + m.income, 0);
  const totalExpenses = MOCK_MONTHLY.reduce((s, m) => s + m.expenses, 0);
  const avgMonthly = (totalIncome - totalExpenses) / MOCK_MONTHLY.length;

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a financial analyst AI. Return ONLY valid JSON: {"executive_summary":"string","period_highlights":["string"],"spending_patterns":["string"],"growth_trends":["string"],"action_items":["string"],"forecast_next_month":{"expected_income":0,"expected_expenses":0,"net":0,"confidence":"string"}}. No markdown.',
          messages: [{ role: 'user', content: `Generate a ${period} financial report for C.H.A. LLC. Data: monthly=${JSON.stringify(MOCK_MONTHLY)}, categories=${JSON.stringify(MOCK_CATEGORIES)}. The company launched 5 new products on April 10-11 2026 with $0 revenue so far. Promotional posts go live April 14. Provide actionable analysis.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      setReport(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch {
      setReport({ executive_summary: 'Report generation failed.', period_highlights: [], spending_patterns: [], growth_trends: [], action_items: [], forecast_next_month: { expected_income: 0, expected_expenses: 0, net: 0, confidence: 'N/A' } });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Layout activeTab="analytics">
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Analytics & Reports</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Advanced financial insights and AI-generated reports</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: 'auto !important', padding: '8px 14px !important' }}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
            <button className="btn-primary" onClick={generateReport} disabled={generating}
              style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #9B5DE5, #C9A84C)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {generating ? '📊 Generating...' : '📊 Generate Report'}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Revenue (6mo)', value: `$${totalIncome.toLocaleString()}`, color: '#2A9D8F' },
            { label: 'Total Expenses (6mo)', value: `$${totalExpenses.toLocaleString()}`, color: '#C1121F' },
            { label: 'Net Profit (6mo)', value: `$${(totalIncome - totalExpenses).toLocaleString()}`, color: '#C9A84C' },
            { label: 'Avg Monthly Net', value: `$${avgMonthly.toFixed(0)}`, color: '#9B5DE5' },
          ].map(m => (
            <div key={m.label} className="card-hover" style={card}>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: '700', color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Bar Chart */}
        <div style={{ ...card, marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Income vs Expenses (Last 6 Months)</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', height: '180px', padding: '0 0.5rem' }}>
            {MOCK_MONTHLY.map(m => (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', width: '100%' }}>
                  <div title={`Income: $${m.income}`} style={{ flex: 1, background: '#2A9D8F', borderRadius: '3px 3px 0 0', height: `${(m.income / maxVal) * 150}px`, transition: 'height 0.5s ease' }} />
                  <div title={`Expenses: $${m.expenses}`} style={{ flex: 1, background: '#C1121F', borderRadius: '3px 3px 0 0', height: `${(m.expenses / maxVal) * 150}px`, transition: 'height 0.5s ease' }} />
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{m.month}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', justifyContent: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}><span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#2A9D8F', display: 'inline-block' }} />Income</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}><span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#C1121F', display: 'inline-block' }} />Expenses</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Expense Breakdown */}
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Expense Breakdown</h3>
            {MOCK_CATEGORIES.map(c => (
              <div key={c.name} style={{ marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{c.name}</span>
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>${c.amount} <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>({c.pct}%)</span></span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '3px', height: '6px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.pct}%`, background: c.color, borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Product Revenue */}
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Product Revenue Pipeline</h3>
            <div style={{ padding: '0.75rem', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', marginBottom: '1rem' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#C9A84C' }}>🚀 Products launched April 10-11. Promos go live April 14. Revenue pipeline active.</p>
            </div>
            {MOCK_PRODUCTS.map(p => (
              <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#fff', fontWeight: '500' }}>{p.name}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>${p.price}/sale</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#C9A84C' }}>${p.revenue}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>0 sales</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Report */}
        {report && (
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '16px', fontWeight: '600' }}>📊 AI Financial Report — {period.charAt(0).toUpperCase() + period.slice(1)}</h3>
            <div style={{ padding: '1rem 1.25rem', background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.25)', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <p style={{ margin: 0, color: '#fff', fontSize: '14px', lineHeight: '1.7' }}>{report.executive_summary}</p>
            </div>
            {report.forecast_next_month && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'Forecast Income', value: `$${report.forecast_next_month.expected_income?.toLocaleString()}`, color: '#2A9D8F' },
                  { label: 'Forecast Expenses', value: `$${report.forecast_next_month.expected_expenses?.toLocaleString()}`, color: '#C1121F' },
                  { label: 'Forecast Net', value: `$${report.forecast_next_month.net?.toLocaleString()}`, color: '#C9A84C' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{m.label}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '700', color: m.color }}>{m.value}</p>
                    {m.label === 'Forecast Net' && <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Confidence: {report.forecast_next_month.confidence}</p>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: '✨ Highlights', items: report.period_highlights, color: '#C9A84C' },
                { label: '📈 Growth Trends', items: report.growth_trends, color: '#2A9D8F' },
                { label: '🔍 Spending Patterns', items: report.spending_patterns, color: '#9B5DE5' },
                { label: '✅ Action Items', items: report.action_items, color: '#C1121F' },
              ].map(s => (
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
