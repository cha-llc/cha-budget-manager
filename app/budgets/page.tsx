'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { useBudgetStore } from '@/lib/store';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;
const DIVISIONS = ['Consulting', 'Tea Time Network', 'Digital Tools', 'Books'];

export default function Budgets() {
  const { budgets, expenses, setBudgets, setExpenses } = useBudgetStore();
  const [form, setForm] = useState({ division: 'Consulting', monthly_budget: '' });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [exportMsg, setExportMsg] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const [br, er] = await Promise.all([
        supabase.from('division_budgets').select('*'),
        supabase.from('expenses').select('*'),
      ]);
      if (br.data) setBudgets(br.data as any);
      if (er.data) setExpenses(er.data as any);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    if (!form.monthly_budget) return;
    setSaving(true);
    try {
      const { data } = await supabase
        .from('division_budgets')
        .upsert({ division: form.division, monthly_budget: parseFloat(form.monthly_budget) })
        .select();
      if (data) {
        setBudgets(budgets.filter((b: any) => b.division !== form.division).concat(data as any));
        setForm({ division: 'Consulting', monthly_budget: '' });
        setShowForm(false);
      }
    } finally { setSaving(false); }
  };

  const generateAIBudget = async () => {
    setGenerating(true);
    setAiSuggestions(null);
    try {
      const spendingByDivision: Record<string, Record<string, number>> = {};
      expenses.forEach((e: any) => {
        if (!spendingByDivision[e.division]) spendingByDivision[e.division] = {};
        spendingByDivision[e.division][e.category] = (spendingByDivision[e.division][e.category] || 0) + e.amount;
      });
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a budget planning AI for a multi-division LLC. Return ONLY valid JSON: {"rationale":"string","division_budgets":[{"division":"string","suggested_budget":0,"current_budget":0,"reasoning":"string","category_limits":{"category":0}}],"total_recommended":0,"reallocation_notes":["string"],"growth_investment":["string"]}. No markdown.',
          messages: [{ role: 'user', content: `Generate AI budget recommendations for C.H.A. LLC based on spending history. Divisions: ${DIVISIONS.join(', ')}. Current budgets: ${JSON.stringify(budgets)}. Spending history by division: ${JSON.stringify(spendingByDivision)}. The company just launched 5 products and is in growth mode targeting $100K net income in 12 months. Optimize for growth while controlling costs.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      setAiSuggestions(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch {
      setAiSuggestions({ rationale: 'Could not generate recommendations.', division_budgets: [], total_recommended: 0, reallocation_notes: [], growth_investment: [] });
    } finally { setGenerating(false); }
  };

  const applyAISuggestion = async (division: string, amount: number) => {
    const { data } = await supabase.from('division_budgets').upsert({ division, monthly_budget: amount }).select();
    if (data) setBudgets(budgets.filter((b: any) => b.division !== division).concat(data as any));
  };

  const exportCSV = () => {
    const rows = [['Division', 'Monthly Budget', 'Spent MTD', 'Remaining', 'Utilization %']];
    DIVISIONS.forEach(div => {
      const b = budgets.find((b: any) => b.division === div);
      const spent = expenses.filter((e: any) => e.division === div).reduce((s: number, e: any) => s + e.amount, 0);
      const budget = b?.monthly_budget || 0;
      rows.push([div, budget.toString(), spent.toFixed(2), Math.max(0, budget - spent).toFixed(2), budget > 0 ? ((spent / budget) * 100).toFixed(1) + '%' : '0%']);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `cha-budgets-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    setExportMsg('✅ CSV exported');
    setTimeout(() => setExportMsg(''), 3000);
  };

  const totalBudget = budgets.reduce((s: number, b: any) => s + b.monthly_budget, 0);
  const totalSpent = expenses.reduce((s: number, e: any) => s + e.amount, 0);

  const getDivisionData = (div: string) => {
    const b = budgets.find((b: any) => b.division === div);
    const spent = expenses.filter((e: any) => e.division === div).reduce((s: number, e: any) => s + e.amount, 0);
    const budget = b?.monthly_budget || 0;
    const pct = budget > 0 ? (spent / budget) * 100 : 0;
    const status = pct > 90 ? 'critical' : pct > 70 ? 'warning' : 'good';
    const color = status === 'critical' ? '#C1121F' : status === 'warning' ? '#C9A84C' : '#2A9D8F';
    return { budget, spent, remaining: Math.max(0, budget - spent), pct: Math.min(100, pct), color, status };
  };

  return (
    <Layout activeTab="budgets">
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Budget Management</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>AI-generated budgets from spending history</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={exportCSV} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.4)', background: 'transparent', color: '#C9A84C', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              📥 Export CSV
            </button>
            <button className="btn-primary" onClick={generateAIBudget} disabled={generating}
              style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #9B5DE5, #2A9D8F)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {generating ? '🤖 Generating...' : '🤖 Generate AI Budgets'}
            </button>
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}
              style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              + Set Budget
            </button>
          </div>
        </div>

        {exportMsg && <div style={{ padding: '10px 14px', background: 'rgba(42,157,143,0.15)', border: '1px solid rgba(42,157,143,0.4)', borderRadius: '8px', color: '#2A9D8F', fontSize: '13px', marginBottom: '1rem' }}>{exportMsg}</div>}

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Monthly Budget', value: `$${totalBudget.toLocaleString()}`, color: '#C9A84C' },
            { label: 'Total Spent (All Time)', value: `$${totalSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C1121F' },
            { label: 'Budget Utilization', value: totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(0)}%` : '0%', color: '#2A9D8F' },
          ].map(m => (
            <div key={m.label} className="card-hover" style={card}>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '28px', fontWeight: '700', color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Add Form */}
        {showForm && (
          <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(201,168,76,0.5)' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#C9A84C', fontSize: '15px', fontWeight: '600' }}>Set Division Budget</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
              <div><label>Division</label><select value={form.division} onChange={e => setForm({ ...form, division: e.target.value })}>{DIVISIONS.map(d => <option key={d}>{d}</option>)}</select></div>
              <div><label>Monthly Budget ($)</label><input type="number" value={form.monthly_budget} onChange={e => setForm({ ...form, monthly_budget: e.target.value })} placeholder="5000" /></div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn-primary" onClick={handleSave} disabled={saving}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>{saving ? 'Saving...' : 'Save'}</button>
                <button onClick={() => setShowForm(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Division Budget Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {DIVISIONS.map(div => {
            const d = getDivisionData(div);
            return (
              <div key={div} className="card-hover" style={{ ...card, borderLeft: `3px solid ${d.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '600' }}>{div}</h3>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: `${d.color}20`, color: d.color, fontWeight: '600' }}>
                      {d.status === 'critical' ? '🔴 Over Budget' : d.status === 'warning' ? '🟡 Watch' : '🟢 On Track'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: d.color }}>{d.pct.toFixed(0)}%</p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>utilized</p>
                  </div>
                </div>
                {/* Progress */}
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '4px', height: '8px', marginBottom: '1rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${d.pct}%`, background: d.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    { label: 'Budget', value: `$${d.budget.toLocaleString()}`, color: '#C9A84C' },
                    { label: 'Spent', value: `$${d.spent.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C1121F' },
                    { label: 'Remaining', value: `$${d.remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#2A9D8F' },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                      <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{m.label}</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '14px', fontWeight: '700', color: m.color }}>{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Budget Recommendations */}
        {generating && (
          <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🤖</div>
            <p style={{ color: '#9B5DE5', fontWeight: '600', margin: '0 0 4px 0' }}>AI is analyzing your spending history...</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Building optimized budget recommendations for growth</p>
          </div>
        )}

        {aiSuggestions && (
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '16px', fontWeight: '600' }}>🤖 AI Budget Recommendations</h3>
            <div style={{ padding: '1rem 1.25rem', background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.25)', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.7' }}>{aiSuggestions.rationale}</p>
            </div>

            {aiSuggestions.division_budgets?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {aiSuggestions.division_budgets.map((d: any) => (
                  <div key={d.division} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 2px 0', color: '#fff', fontWeight: '600', fontSize: '14px' }}>{d.division}</p>
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{d.reasoning}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Current</p>
                        <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>${(d.current_budget || 0).toLocaleString()}</p>
                      </div>
                      <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.2)' }}>→</div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>AI Suggestion</p>
                        <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#9B5DE5' }}>${d.suggested_budget.toLocaleString()}</p>
                      </div>
                      <button className="btn-primary" onClick={() => applyAISuggestion(d.division, d.suggested_budget)}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'rgba(155,93,229,0.3)', color: '#9B5DE5', fontWeight: '600', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { label: '🔄 Reallocation Notes', items: aiSuggestions.reallocation_notes, color: '#C9A84C' },
                { label: '📈 Growth Investments', items: aiSuggestions.growth_investment, color: '#2A9D8F' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.75rem 0', color: s.color, fontSize: '13px', fontWeight: '600' }}>{s.label}</p>
                  {s.items?.map((item: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '12px', lineHeight: '1.5' }}>• {item}</p>)}
                </div>
              ))}
            </div>

            {aiSuggestions.total_recommended > 0 && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>AI Recommended Total Monthly Budget</p>
                <p style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#C9A84C' }}>${aiSuggestions.total_recommended.toLocaleString()}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
