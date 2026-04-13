'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
  category: string;
  monthly_contribution: number;
}

const SAMPLE_GOALS: Goal[] = [
  { id: '1', name: 'Emergency Fund', target: 10000, current: 3200, deadline: '2026-12-31', category: 'Safety Net', monthly_contribution: 500 },
  { id: '2', name: 'Locali App Launch Budget', target: 5000, current: 1800, deadline: '2026-09-01', category: 'Business', monthly_contribution: 300 },
  { id: '3', name: 'Colombia Relocation Fund', target: 3000, current: 900, deadline: '2026-08-23', category: 'Travel', monthly_contribution: 450 },
];

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>(SAMPLE_GOALS);
  const [showForm, setShowForm] = useState(false);
  const [forecast, setForecast] = useState<any>(null);
  const [forecasting, setForecasting] = useState(false);
  const [form, setForm] = useState({ name: '', target: '', current: '', deadline: '', category: 'Savings', monthly_contribution: '' });

  const categories = ['Savings', 'Emergency Fund', 'Business', 'Travel', 'Investment', 'Debt Payoff', 'Education', 'Other'];

  const addGoal = () => {
    if (!form.name || !form.target) return;
    const newGoal: Goal = {
      id: Date.now().toString(),
      name: form.name,
      target: parseFloat(form.target),
      current: parseFloat(form.current) || 0,
      deadline: form.deadline,
      category: form.category,
      monthly_contribution: parseFloat(form.monthly_contribution) || 0,
    };
    setGoals([...goals, newGoal]);
    setForm({ name: '', target: '', current: '', deadline: '', category: 'Savings', monthly_contribution: '' });
    setShowForm(false);
  };

  const getProgress = (g: Goal) => Math.min(100, (g.current / g.target) * 100);
  const getMonthsLeft = (g: Goal) => {
    const remaining = g.target - g.current;
    return g.monthly_contribution > 0 ? Math.ceil(remaining / g.monthly_contribution) : null;
  };

  const runAIForecast = async () => {
    setForecasting(true);
    setForecast(null);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a financial planning AI. Analyze goals and return ONLY valid JSON: {"overall_health":"string","priority_order":["goal names in recommended order"],"insights":["string"],"risks":["string"],"recommendations":["string"]}. No preamble, no markdown.',
          messages: [{ role: 'user', content: `Analyze these financial goals for C.H.A. LLC: ${JSON.stringify(goals)}. Current date: ${new Date().toISOString().split('T')[0]}. Provide strategic insights.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      setForecast(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch {
      setForecast({ overall_health: 'Analysis unavailable', insights: ['Could not connect to AI'], risks: [], recommendations: [], priority_order: [] });
    } finally {
      setForecasting(false);
    }
  };

  return (
    <Layout activeTab="goals">
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Goals & Planning</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Track savings goals with AI-powered forecasting</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={runAIForecast} disabled={forecasting}
              style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #9B5DE5, #2A9D8F)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {forecasting ? '🔮 Analyzing...' : '🔮 AI Forecast'}
            </button>
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}
              style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              + Add Goal
            </button>
          </div>
        </div>

        {/* Add Goal Form */}
        {showForm && (
          <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(201,168,76,0.5)' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#C9A84C', fontSize: '15px', fontWeight: '600' }}>New Goal</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div><label>Goal Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Emergency Fund" /></div>
              <div><label>Target Amount ($)</label><input type="number" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} placeholder="10000" /></div>
              <div><label>Current Saved ($)</label><input type="number" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} placeholder="0" /></div>
              <div><label>Monthly Contribution ($)</label><input type="number" value={form.monthly_contribution} onChange={e => setForm({ ...form, monthly_contribution: e.target.value })} placeholder="500" /></div>
              <div><label>Target Date</label><input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
              <div><label>Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={addGoal} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', cursor: 'pointer' }}>Save Goal</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {goals.map(g => {
            const pct = getProgress(g);
            const monthsLeft = getMonthsLeft(g);
            const remaining = g.target - g.current;
            return (
              <div key={g.id} className="card-hover" style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '600' }}>{g.name}</h3>
                    <span style={{ fontSize: '11px', color: '#9B5DE5', fontWeight: '600', background: 'rgba(155,93,229,0.15)', padding: '2px 8px', borderRadius: '20px' }}>{g.category}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, color: '#C9A84C', fontSize: '20px', fontWeight: '700' }}>{pct.toFixed(0)}%</p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>complete</p>
                  </div>
                </div>
                {/* Progress Bar */}
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '8px', marginBottom: '1rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#2A9D8F' : pct >= 50 ? '#C9A84C' : '#9B5DE5', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Saved</p>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#2A9D8F' }}>${g.current.toLocaleString()}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Remaining</p>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#C1121F' }}>${remaining.toLocaleString()}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  <span>Target: ${g.target.toLocaleString()}</span>
                  {monthsLeft && <span>≈ {monthsLeft} months at ${g.monthly_contribution}/mo</span>}
                  {g.deadline && <span>By: {g.deadline}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Forecast */}
        {forecast && (
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '16px', fontWeight: '600' }}>🔮 AI Financial Forecast</h3>
            <div style={{ padding: '1rem', background: 'rgba(155,93,229,0.1)', border: '1px solid rgba(155,93,229,0.3)', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <p style={{ margin: 0, color: '#fff', fontSize: '14px', fontWeight: '500' }}>{forecast.overall_health}</p>
            </div>
            {forecast.priority_order?.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.75rem 0', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>RECOMMENDED PRIORITY ORDER</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {forecast.priority_order.map((name: string, i: number) => (
                    <span key={i} style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: '#C9A84C', fontWeight: '600' }}>
                      {i + 1}. {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              {[{ label: '💡 Insights', items: forecast.insights, color: '#2A9D8F' }, { label: '⚠️ Risks', items: forecast.risks, color: '#C1121F' }, { label: '✅ Recommendations', items: forecast.recommendations, color: '#C9A84C' }].map(section => (
                <div key={section.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.75rem 0', color: section.color, fontSize: '13px', fontWeight: '600' }}>{section.label}</p>
                  {section.items?.map((item: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0 0', color: 'rgba(255,255,255,0.65)', fontSize: '12px', lineHeight: '1.5' }}>• {item}</p>)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
