// BUILD_V4_SUPABASE
'use client';
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;
const CATEGORIES = ['Savings', 'Emergency Fund', 'Business', 'Travel', 'Investment', 'Debt Payoff', 'Education', 'Other'];

export default function Goals() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [forecast, setForecast] = useState<any>(null);
  const [forecasting, setForecasting] = useState(false);
  const [form, setForm] = useState({ name: '', target: '', current_amount: '', deadline: '', category: 'Savings', monthly_contribution: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
    if (data) setGoals(data);
    setLoading(false);
  };

  const addGoal = async () => {
    if (!form.name || !form.target) return;
    setSaving(true);
    const { data } = await supabase.from('goals').insert([{
      name: form.name, target: parseFloat(form.target), current_amount: parseFloat(form.current_amount) || 0,
      deadline: form.deadline || null, category: form.category, monthly_contribution: parseFloat(form.monthly_contribution) || 0,
    }]).select();
    if (data) { setGoals(prev => [data[0], ...prev]); setForm({ name: '', target: '', current_amount: '', deadline: '', category: 'Savings', monthly_contribution: '' }); setShowForm(false); }
    setSaving(false);
  };

  const updateGoalAmount = async (id: string, current_amount: number) => {
    await supabase.from('goals').update({ current_amount }).eq('id', id);
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current_amount } : g));
  };

  const deleteGoal = async (id: string) => {
    await supabase.from('goals').delete().eq('id', id);
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const runForecast = async () => {
    setForecasting(true); setForecast(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000,
          system: 'Return ONLY valid JSON: {"overall_health":"string","priority_order":["goal names"],"insights":["string"],"risks":["string"],"recommendations":["string"]}. No markdown.',
          messages: [{ role: 'user', content: `Analyze these financial goals: ${JSON.stringify(goals)}. Current date: ${new Date().toISOString().split('T')[0]}. Provide strategic insights and priority recommendations.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      setForecast(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch { setForecast({ overall_health: 'Analysis unavailable', insights: [], risks: [], recommendations: [], priority_order: [] }); }
    setForecasting(false);
  };

  const getProgress = (g: any) => Math.min(100, (parseFloat(g.current_amount) / parseFloat(g.target)) * 100);
  const getMonthsLeft = (g: any) => {
    const rem = parseFloat(g.target) - parseFloat(g.current_amount);
    return g.monthly_contribution > 0 ? Math.ceil(rem / parseFloat(g.monthly_contribution)) : null;
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
            <button className="btn-primary" onClick={runForecast} disabled={forecasting || goals.length === 0}
              style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #9B5DE5, #2A9D8F)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {forecasting ? '🔮 Analyzing...' : '🔮 AI Forecast'}
            </button>
            <button className="btn-primary" onClick={() => setShowForm(true)}
              style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>+ Add Goal</button>
          </div>
        </div>

        {showForm && (
          <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(201,168,76,0.5)' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#C9A84C', fontSize: '15px', fontWeight: '600' }}>New Goal</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div><label>Goal Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Emergency Fund" /></div>
              <div><label>Target ($)</label><input type="number" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} placeholder="10000" /></div>
              <div><label>Current Saved ($)</label><input type="number" value={form.current_amount} onChange={e => setForm({ ...form, current_amount: e.target.value })} placeholder="0" /></div>
              <div><label>Monthly Contribution ($)</label><input type="number" value={form.monthly_contribution} onChange={e => setForm({ ...form, monthly_contribution: e.target.value })} placeholder="500" /></div>
              <div><label>Target Date</label><input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
              <div><label>Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={addGoal} disabled={saving} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>{saving ? 'Saving...' : 'Save Goal'}</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? <div style={{ ...card, textAlign: 'center', padding: '3rem' }}><p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Loading goals...</p></div>
          : goals.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: '4rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
              <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 1rem 0' }}>No goals yet. Add your first savings goal.</p>
              <button className="btn-primary" onClick={() => setShowForm(true)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>+ Add First Goal</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {goals.map(g => {
                const pct = getProgress(g);
                const monthsLeft = getMonthsLeft(g);
                const remaining = parseFloat(g.target) - parseFloat(g.current_amount);
                return (
                  <div key={g.id} className="card-hover" style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '16px', fontWeight: '600' }}>{g.name}</h3>
                        <span style={{ fontSize: '11px', color: '#9B5DE5', fontWeight: '600', background: 'rgba(155,93,229,0.15)', padding: '2px 8px', borderRadius: '20px' }}>{g.category}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, color: '#C9A84C', fontSize: '20px', fontWeight: '700' }}>{pct.toFixed(0)}%</p>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '8px', marginBottom: '1rem', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#2A9D8F' : pct >= 50 ? '#C9A84C' : '#9B5DE5', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Saved</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: '700', color: '#2A9D8F' }}>${parseFloat(g.current_amount).toLocaleString()}</p>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Remaining</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: '700', color: '#C1121F' }}>${Math.max(0, remaining).toLocaleString()}</p>
                      </div>
                    </div>
                    {/* Inline update */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '0.5rem' }}>
                      <input type="number" defaultValue={parseFloat(g.current_amount)} onBlur={e => updateGoalAmount(g.id, parseFloat(e.target.value) || 0)}
                        style={{ fontSize: '12px !important', padding: '5px 8px !important' }} placeholder="Update saved amount" />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                      <span>Target: ${parseFloat(g.target).toLocaleString()}{g.deadline ? ` by ${g.deadline}` : ''}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {monthsLeft && <span>≈{monthsLeft}mo</span>}
                        <button onClick={() => deleteGoal(g.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '15px', padding: 0 }}>×</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        {forecast && (
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '16px', fontWeight: '600' }}>🔮 AI Goal Forecast</h3>
            <div style={{ padding: '1rem', background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.25)', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <p style={{ margin: 0, color: '#fff', fontSize: '14px', fontWeight: '500' }}>{forecast.overall_health}</p>
            </div>
            {forecast.priority_order?.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.75rem 0', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>RECOMMENDED PRIORITY</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {forecast.priority_order.map((name: string, i: number) => (
                    <span key={i} style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: '#C9A84C', fontWeight: '600' }}>{i + 1}. {name}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {[{ label: '💡 Insights', items: forecast.insights, color: '#2A9D8F' }, { label: '⚠️ Risks', items: forecast.risks, color: '#C1121F' }, { label: '✅ Recommendations', items: forecast.recommendations, color: '#C9A84C' }].map(s => (
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
