'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

interface Investment {
  id: string;
  name: string;
  ticker: string;
  type: string;
  shares: number;
  purchase_price: number;
  current_price: number;
  purchase_date: string;
}

const SAMPLE: Investment[] = [
  { id: '1', name: 'Apple Inc.', ticker: 'AAPL', type: 'Stock', shares: 10, purchase_price: 150, current_price: 178, purchase_date: '2025-01-15' },
  { id: '2', name: 'Vanguard S&P 500 ETF', ticker: 'VOO', type: 'ETF', shares: 5, purchase_price: 420, current_price: 468, purchase_date: '2025-03-01' },
  { id: '3', name: 'Bitcoin', ticker: 'BTC', type: 'Crypto', shares: 0.05, purchase_price: 45000, current_price: 68000, purchase_date: '2025-06-10' },
];

export default function Investments() {
  const [investments, setInvestments] = useState<Investment[]>(SAMPLE);
  const [showForm, setShowForm] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [form, setForm] = useState({ name: '', ticker: '', type: 'Stock', shares: '', purchase_price: '', current_price: '', purchase_date: '' });

  const types = ['Stock', 'ETF', 'Crypto', 'Bond', 'REIT', 'Mutual Fund', 'Other'];

  const totalValue = investments.reduce((s, i) => s + i.shares * i.current_price, 0);
  const totalCost = investments.reduce((s, i) => s + i.shares * i.purchase_price, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  const addInvestment = () => {
    if (!form.name || !form.shares) return;
    setInvestments([...investments, { ...form, id: Date.now().toString(), shares: parseFloat(form.shares), purchase_price: parseFloat(form.purchase_price) || 0, current_price: parseFloat(form.current_price) || 0 }]);
    setForm({ name: '', ticker: '', type: 'Stock', shares: '', purchase_price: '', current_price: '', purchase_date: '' });
    setShowForm(false);
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a portfolio analyst. Return ONLY valid JSON: {"portfolio_health":"string","diversification_score":0,"insights":["string"],"risks":["string"],"suggestions":["string"],"rebalancing":["string"]}. No markdown.',
          messages: [{ role: 'user', content: `Analyze this investment portfolio: ${JSON.stringify(investments.map(i => ({ ...i, value: i.shares * i.current_price, gainLoss: (i.current_price - i.purchase_price) * i.shares })))}. Total value: $${totalValue.toFixed(0)}.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      setAnalysis(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch {
      setAnalysis({ portfolio_health: 'Analysis unavailable', diversification_score: 0, insights: ['Could not connect to AI'], risks: [], suggestions: [], rebalancing: [] });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Layout activeTab="investments">
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Investment Portfolio</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Track stocks, ETFs, crypto, and more with AI analysis</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={runAnalysis} disabled={analyzing}
              style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #9B5DE5, #2A9D8F)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {analyzing ? '🔍 Analyzing...' : '🔍 AI Analysis'}
            </button>
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}
              style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              + Add Position
            </button>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Portfolio Value', value: `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C9A84C' },
            { label: 'Total Cost Basis', value: `$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'rgba(255,255,255,0.6)' },
            { label: 'Total Gain/Loss', value: `${totalGainLoss >= 0 ? '+' : ''}$${totalGainLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: totalGainLoss >= 0 ? '#2A9D8F' : '#C1121F' },
            { label: 'Return %', value: `${totalGainPct >= 0 ? '+' : ''}${totalGainPct.toFixed(2)}%`, color: totalGainPct >= 0 ? '#2A9D8F' : '#C1121F' },
          ].map(m => (
            <div key={m.label} className="card-hover" style={card}>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '24px', fontWeight: '700', color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Add Form */}
        {showForm && (
          <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(201,168,76,0.5)' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#C9A84C', fontSize: '15px', fontWeight: '600' }}>New Position</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Apple Inc." /></div>
              <div><label>Ticker</label><input value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value })} placeholder="AAPL" /></div>
              <div><label>Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{types.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label>Shares / Units</label><input type="number" value={form.shares} onChange={e => setForm({ ...form, shares: e.target.value })} placeholder="10" /></div>
              <div><label>Purchase Price ($)</label><input type="number" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} placeholder="150.00" /></div>
              <div><label>Current Price ($)</label><input type="number" value={form.current_price} onChange={e => setForm({ ...form, current_price: e.target.value })} placeholder="178.00" /></div>
              <div><label>Purchase Date</label><input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={addInvestment} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', cursor: 'pointer' }}>Add Position</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Holdings Table */}
        <div style={{ ...card, marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Holdings ({investments.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
                  {['Name', 'Type', 'Shares', 'Avg Cost', 'Current', 'Value', 'Gain/Loss', 'Return'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {investments.map(inv => {
                  const value = inv.shares * inv.current_price;
                  const cost = inv.shares * inv.purchase_price;
                  const gl = value - cost;
                  const glPct = cost > 0 ? (gl / cost) * 100 : 0;
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px 12px', color: '#fff', fontWeight: '500' }}>
                        {inv.name}<br />
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{inv.ticker}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}><span style={{ background: 'rgba(155,93,229,0.2)', color: '#9B5DE5', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' }}>{inv.type}</span></td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.7)' }}>{inv.shares}</td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.7)' }}>${inv.purchase_price.toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', color: '#C9A84C', fontWeight: '600' }}>${inv.current_price.toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', color: '#fff', fontWeight: '600' }}>${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td style={{ padding: '10px 12px', color: gl >= 0 ? '#2A9D8F' : '#C1121F', fontWeight: '600' }}>{gl >= 0 ? '+' : ''}${gl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td style={{ padding: '10px 12px', color: glPct >= 0 ? '#2A9D8F' : '#C1121F', fontWeight: '600' }}>{glPct >= 0 ? '+' : ''}{glPct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Analysis */}
        {analysis && (
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '16px', fontWeight: '600' }}>🔍 Portfolio AI Analysis</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', alignItems: 'start', marginBottom: '1.25rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem 1.5rem', background: 'rgba(155,93,229,0.1)', border: '1px solid rgba(155,93,229,0.3)', borderRadius: '10px' }}>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>DIVERSIFICATION</p>
                <p style={{ margin: '6px 0', fontSize: '36px', fontWeight: '700', color: analysis.diversification_score >= 70 ? '#2A9D8F' : analysis.diversification_score >= 40 ? '#C9A84C' : '#C1121F' }}>{analysis.diversification_score}</p>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>out of 100</p>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(42,157,143,0.08)', border: '1px solid rgba(42,157,143,0.2)', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: '#fff', fontSize: '14px', lineHeight: '1.6' }}>{analysis.portfolio_health}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {[{ label: '💡 Insights', items: analysis.insights, color: '#2A9D8F' }, { label: '⚠️ Risks', items: analysis.risks, color: '#C1121F' }, { label: '🔄 Rebalancing', items: analysis.rebalancing, color: '#C9A84C' }].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.75rem 0', color: s.color, fontSize: '13px', fontWeight: '600' }}>{s.label}</p>
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
