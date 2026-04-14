// BUILD_V4_INTERACTIVE
'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const card = { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'1.5rem' } as const;



const PHASES = [
  { phase: 'Phase 1: Acceleration', period: 'M1–M12 (April 2026 – March 2027)', color: '#C9A84C', status: 'ACTIVE', gross: '$480K', net: '$417K', goals: ['Launch all 5 revenue streams simultaneously', 'Hit $100K+ net income within Month 12', 'Colombia Digital Nomad Visa + Cédula de Extranjería', 'Ghana residence permit approved (1-yr clock started)', '80 affiliate partners generating $4–8K/mo passive'] },
  { phase: 'Phase 2: Scaling', period: 'M13–M36 (2027–2029)', color: '#2A9D8F', status: 'PLANNED', gross: '$1.1M–$1.5M', net: 'Premium positioning', goals: ['Premium consulting positioning ($9,997+ packages)', 'Affiliate network scaled to 100+ partners', 'Ghana citizenship induction', 'Nigeria business entity established', 'Authority Builder product at full scale'] },
  { phase: 'Phase 3: Expansion', period: 'M37–M60 (2029–2031)', color: '#9B5DE5', status: 'PLANNED', gross: '$2M–$4M', net: 'Asset accumulation', goals: ['Real estate accumulation in Colombia + Ghana', 'Colombia R-Visa confirmed', 'Nigeria permanent residence secured', 'Locali App in 3 cities', 'Passive income covers all living expenses'] },
  { phase: 'Phase 4: Domination', period: 'M61–M96 (2031–2034)', color: '#C1121F', status: 'VISION', gross: '$3M–$6M+', net: 'Generational wealth', goals: ['All income streams fully automated', 'Triple citizenship: Colombia + Ghana + Nigeria', 'Generational wealth infrastructure complete', 'Legacy brand established globally', 'Full financial and geographic freedom'] },
];

const QUARTERLY = [
  { quarter: 'Q1 (M1–3)', gross: '$23.6K', net: '$16.1K', consulting: '$10.5K', products: '$5.1K', content: '$6.6K' },
  { quarter: 'Q2 (M4–6)', gross: '$74.8K', net: '$62.8K', consulting: '$28.5K', products: '$24K', content: '$21K' },
  { quarter: 'Q3 (M7–9)', gross: '$160.1K', net: '$143.6K', consulting: '$73K', products: '$42K', content: '$43K' },
  { quarter: 'Q4 (M10–12)', gross: '$221.7K', net: '$194.7K', consulting: '$97K', products: '$60K', content: '$61K' },
];

const IMMIGRATION = [
  { month: 'M7 — Aug 23, 2026', event: 'Arrive Bogotá on Digital Nomad Visa', color: '#C9A84C' },
  { month: 'M7–M8', event: 'Register Cédula de Extranjería + Begin M-Class Migrant pathway', color: '#2A9D8F' },
  { month: 'M8', event: 'Begin Escazú Spanish classes (9-month intensive)', color: '#2A9D8F' },
  { month: 'M9–M11', event: 'Submit Ghana Residence Permit application', color: '#9B5DE5' },
  { month: 'M12', event: 'Ghana Residence approved — 1-year citizenship clock begins', color: '#9B5DE5' },
  { month: 'M12', event: 'Nigeria business visitor permit research complete', color: '#C1121F' },
  { month: 'M24–M36', event: 'Colombia M-Class → R-Visa (5-year permanent residency)', color: '#C9A84C' },
  { month: 'M36', event: 'Ghana Citizenship Induction (Diaspora)', color: '#9B5DE5' },
  { month: 'M48', event: 'Nigeria Investment Residency', color: '#C1121F' },
  { month: 'M60+', event: 'Colombia Citizenship (5-yr naturalization)', color: '#C9A84C' },
];

const TABS = ['Overview', 'Checklist', 'Milestones', 'Quarterly Targets', 'Tax & Immigration'];
const CHECKLIST_PHASES = ['This Week', 'Month 1', 'Immigration', 'Revenue Goals'];

export default function Domination() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [checklist, setChecklist] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [blueprint, setBlueprint] = useState('');
  const [generating, setGenerating] = useState(false);
  const [currentRevenue, setCurrentRevenue] = useState(0);
  const [newItem, setNewItem] = useState('');
  const [newItemPhase, setNewItemPhase] = useState('This Week');
  const [addingItem, setAddingItem] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [cr, mr] = await Promise.all([
      supabase.from('domination_checklist').select('*').order('phase').order('sort_order'),
      supabase.from('domination_milestones').select('*').order('sort_order'),
    ]);
    if (cr.data) setChecklist(cr.data);
    if (mr.data) setMilestones(mr.data);
    setLoading(false);
  };

  const toggleItem = async (item: any) => {
    const completed = !item.completed;
    const { data } = await supabase.from('domination_checklist')
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq('id', item.id).select();
    if (data) setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, completed, completed_at: data[0].completed_at } : c));
  };

  const addItem = async () => {
    if (!newItem.trim()) return;
    setAddingItem(true);
    const maxOrder = checklist.filter(c => c.phase === newItemPhase).reduce((m, c) => Math.max(m, c.sort_order), 0);
    const { data } = await supabase.from('domination_checklist')
      .insert([{ phase: newItemPhase, item: newItem.trim(), sort_order: maxOrder + 1 }]).select();
    if (data) { setChecklist(prev => [...prev, data[0]]); setNewItem(''); }
    setAddingItem(false);
  };

  const removeItem = async (id: string) => {
    await supabase.from('domination_checklist').delete().eq('id', id);
    setChecklist(prev => prev.filter(c => c.id !== id));
  };

  const cycleMilestone = async (m: any) => {
    const next = m.status === 'pending' ? 'building' : m.status === 'building' ? 'completed' : 'pending';
    const { data } = await supabase.from('domination_milestones')
      .update({ status: next, completed_at: next === 'completed' ? new Date().toISOString() : null })
      .eq('id', m.id).select();
    if (data) setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, status: next } : x));
  };

  const addMilestone = async (label: string, icon: string) => {
    if (!label.trim()) return;
    const { data } = await supabase.from('domination_milestones')
      .insert([{ label, icon, status: 'pending', sort_order: milestones.length + 1 }]).select();
    if (data) setMilestones(prev => [...prev, data[0]]);
  };

  const removeMilestone = async (id: string) => {
    await supabase.from('domination_milestones').delete().eq('id', id);
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  const generateBlueprintAI = async () => {
    setGenerating(true);
    try {
      const completed = checklist.filter(c => c.completed).length;
      const total = checklist.length;
      const completedMilestones = milestones.filter(m => m.status === 'completed').length;
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000,
          system: 'You are a direct strategic advisor. Give sharp, tactical advice in 3 paragraphs. Speak directly to CJ. No bullet points. No fluff.',
          messages: [{ role: 'user', content: `CJ H. Adisa. April 2026. 96-Month Global Domination Plan. Current monthly revenue: $${currentRevenue}. Checklist progress: ${completed}/${total} items complete. Milestones achieved: ${completedMilestones}/${milestones.length}. 5 products live. Colombia relocation Aug 23. Triple citizenship target: Colombia, Ghana, Nigeria. What are the 3 most important things to execute RIGHT NOW this week for maximum momentum toward $100K net income by Month 12?` }]
        })
      });
      const data = await res.json();
      setBlueprint(data.content?.find((c: any) => c.type === 'text')?.text || '');
    } catch { setBlueprint('Could not connect. Try again.'); }
    setGenerating(false);
  };

  // Computed
  const completedCount = checklist.filter(c => c.completed).length;
  const totalCount = checklist.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const byPhase = CHECKLIST_PHASES.reduce((acc, phase) => {
    acc[phase] = checklist.filter(c => c.phase === phase);
    return acc;
  }, {} as Record<string, any[]>);

  const milestoneStatusColor = (s: string) => s === 'completed' ? '#2A9D8F' : s === 'building' ? '#C9A84C' : 'rgba(255,255,255,0.2)';
  const milestoneStatusLabel = (s: string) => s === 'completed' ? '✅ DONE' : s === 'building' ? '🔨 BUILDING' : '⏳ PENDING';

  return (
    <Layout activeTab="domination">
      <div style={{ maxWidth: '1200px' }}>
        {/* Hero */}
        <div style={{ marginBottom: '2rem', padding: '2rem', background: 'linear-gradient(135deg, rgba(193,18,31,0.12), rgba(201,168,76,0.08), rgba(155,93,229,0.12))', border: '1px solid rgba(201,168,76,0.35)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px' }}>C.H.A. LLC</p>
              <h2 style={{ margin: '0 0 6px 0', color: '#C9A84C', fontSize: '26px', fontWeight: '700', fontFamily: "'Lora', serif" }}>96-Month Global Domination Plan</h2>
              <p style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Strategic Blueprint to $100K+ Net Income + Triple Citizenship</p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {[{ label: 'Primary Goal', value: '$100K+ net by Month 12' }, { label: 'Year 1 Gross', value: '$480K projected' }, { label: 'Tax Rate', value: '1.6% (FEIE)' }, { label: 'Citizenship', value: 'Colombia + Ghana + Nigeria' }].map(s => (
                  <div key={s.label}>
                    <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: '700', color: '#fff' }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ padding: '6px 14px', background: 'rgba(42,157,143,0.2)', border: '1px solid #2A9D8F', borderRadius: '20px', display: 'inline-block', marginBottom: '8px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#2A9D8F', fontWeight: '700' }}>🔒 LOCKED & EXECUTABLE</p>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#C9A84C', fontWeight: '700' }}>{completedCount}/{totalCount} tasks complete</p>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '6px', width: '160px', marginTop: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #C9A84C, #2A9D8F)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0, overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab ? '600' : '400', color: activeTab === tab ? '#C9A84C' : 'rgba(255,255,255,0.45)', borderBottom: activeTab === tab ? '2px solid #C9A84C' : '2px solid transparent', marginBottom: '-1px', whiteSpace: 'nowrap', fontFamily: 'Poppins,sans-serif' }}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'Overview' && (
          <div>
            {/* AI Advisor */}
            <div style={{ marginBottom: '1.5rem', borderColor: 'rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: blueprint ? '1rem' : 0, flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, color: '#C9A84C', fontSize: '15px', fontWeight: '600' }}>⚡ AI Strategic Advisor</h3>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input type="number" value={currentRevenue} onChange={e => setCurrentRevenue(parseFloat(e.target.value) || 0)} placeholder="Current monthly revenue $" style={{ width: '200px !important' }} />
                  <button className="btn btn-gold" onClick={generateBlueprintAI} disabled={generating}
                    style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: generating ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #C9A84C, #C1121F)', color: generating ? 'rgba(255,255,255,0.3)' : '#fff', fontWeight: '700', fontSize: '13px', cursor: generating ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: 'Poppins,sans-serif' }}>
                    {generating ? '⚡ Strategizing...' : '⚡ What Should I Do Right Now?'}
                  </button>
                </div>
              </div>
              {blueprint && <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', borderLeft: '3px solid #C9A84C' }}><p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{blueprint}</p></div>}
              {!blueprint && !generating && <p style={{ margin: '0.75rem 0 0 0', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Enter your current monthly revenue and get AI-powered strategic advice based on your actual plan progress.</p>}
            </div>

            {/* Phase Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {PHASES.map(p => (
                <div key={p.phase} className="glass-hover" style={{ borderTop: `3px solid ${p.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: p.color, fontSize: '12px', fontWeight: '700' }}>{p.phase}</h4>
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', fontWeight: '600', background: p.status === 'ACTIVE' ? 'rgba(42,157,143,0.2)' : 'rgba(255,255,255,0.06)', color: p.status === 'ACTIVE' ? '#2A9D8F' : 'rgba(255,255,255,0.4)' }}>{p.status}</span>
                  </div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{p.period}</p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: '700', color: p.color }}>{p.gross}</p>
                  {p.goals.map((g, i) => <p key={i} style={{ margin: i === 0 ? 0 : '4px 0 0 0', color: 'rgba(255,255,255,0.55)', fontSize: '11px', lineHeight: '1.5' }}>• {g}</p>)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CHECKLIST ── */}
        {activeTab === 'Checklist' && (
          <div>
            {/* Add new item */}
            <div style={{ marginBottom: '1.5rem', borderColor: 'rgba(201,168,76,0.4)' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#C9A84C', fontSize: '15px', fontWeight: '600' }}>+ Add Checklist Item</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.75rem', alignItems: 'flex-end' }}>
                <div><label>Task</label><input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="What needs to happen..." /></div>
                <div><label>Phase</label><select value={newItemPhase} onChange={e => setNewItemPhase(e.target.value)} style={{ width: 'auto !important' }}>{CHECKLIST_PHASES.map(p => <option key={p}>{p}</option>)}</select></div>
                <button className="btn btn-gold" onClick={addItem} disabled={addingItem || !newItem.trim()}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: newItem.trim() ? '#C9A84C' : 'rgba(255,255,255,0.08)', color: newItem.trim() ? '#1A1A2E' : 'rgba(255,255,255,0.3)', fontWeight: '700', cursor: newItem.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Poppins,sans-serif' }}>
                  {addingItem ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}><p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Loading checklist...</p></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                {CHECKLIST_PHASES.map(phase => {
                  const items = byPhase[phase] || [];
                  const done = items.filter(i => i.completed).length;
                  return (
                    <div key={phase} style={card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: '#C9A84C', fontSize: '14px', fontWeight: '700' }}>{phase}</h3>
                        <span style={{ fontSize: '12px', color: done === items.length && items.length > 0 ? '#2A9D8F' : 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{done}/{items.length}</span>
                      </div>
                      {/* Progress bar */}
                      {items.length > 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '4px', marginBottom: '1rem', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${items.length > 0 ? (done / items.length) * 100 : 0}%`, background: '#2A9D8F', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {items.map(item => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: item.completed ? 'rgba(42,157,143,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: '8px', border: `1px solid ${item.completed ? 'rgba(42,157,143,0.25)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', transition: 'all 0.15s ease' }}
                            onClick={() => toggleItem(item)}>
                            {/* Checkbox */}
                            <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: `2px solid ${item.completed ? '#2A9D8F' : 'rgba(255,255,255,0.25)'}`, background: item.completed ? '#2A9D8F' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s ease' }}>
                              {item.completed && <span style={{ color: '#fff', fontSize: '12px', fontWeight: '700', lineHeight: 1 }}>✓</span>}
                            </div>
                            <p style={{ margin: 0, fontSize: '13px', color: item.completed ? 'rgba(255,255,255,0.4)' : '#fff', textDecoration: item.completed ? 'line-through' : 'none', flex: 1, lineHeight: '1.4' }}>{item.item}</p>
                            {item.completed && item.completed_at && (
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap', flexShrink: 0 }}>{new Date(item.completed_at).toLocaleDateString()}</span>
                            )}
                            <button onClick={e => { e.stopPropagation(); removeItem(item.id); }}
                              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.15)', cursor: 'pointer', fontSize: '16px', padding: '0 2px', flexShrink: 0, lineHeight: 1 }}>×</button>
                          </div>
                        ))}
                        {items.length === 0 && <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', textAlign: 'center', padding: '0.5rem 0', margin: 0 }}>No items yet — add one above</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MILESTONES ── */}
        {activeTab === 'Milestones' && (
          <div>
            <div style={{ marginBottom: '1.5rem', borderColor: 'rgba(201,168,76,0.4)' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#C9A84C', fontSize: '15px', fontWeight: '600' }}>+ Add Milestone</h3>
              <MilestoneAddForm onAdd={addMilestone} />
            </div>
            <p style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Click a milestone to cycle its status: Pending → Building → Completed</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {milestones.map(m => (
                <div key={m.id} className="glass-hover" onClick={() => cycleMilestone(m)}
                  style={{ cursor: 'pointer', borderLeft: `3px solid ${milestoneStatusColor(m.status)}`, background: m.status === 'completed' ? 'rgba(42,157,143,0.07)' : m.status === 'building' ? 'rgba(201,168,76,0.05)' : 'rgba(255,255,255,0.03)', transition: 'all 0.2s ease' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{m.icon}</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '600', background: `${milestoneStatusColor(m.status)}20`, color: milestoneStatusColor(m.status) }}>{milestoneStatusLabel(m.status)}</span>
                      <button onClick={e => { e.stopPropagation(); removeMilestone(m.id); }}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.15)', cursor: 'pointer', fontSize: '16px', padding: '0 2px', lineHeight: 1 }}>×</button>
                    </div>
                  </div>
                  <p style={{ margin: '0 0 2px 0', color: m.status === 'completed' ? '#2A9D8F' : '#fff', fontWeight: '600', fontSize: '13px', textDecoration: m.status === 'completed' ? 'none' : 'none' }}>{m.label}</p>
                  {m.target_amount > 0 && <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>${parseFloat(m.target_amount).toLocaleString()}</p>}
                  {m.completed_at && <p style={{ margin: '4px 0 0 0', color: '#2A9D8F', fontSize: '11px' }}>✅ {new Date(m.completed_at).toLocaleDateString()}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── QUARTERLY TARGETS ── */}
        {activeTab === 'Quarterly Targets' && (
          <div>
            <div style={{ marginBottom: '1.5rem', background: 'rgba(42,157,143,0.06)', borderColor: 'rgba(42,157,143,0.3)', textAlign: 'center', padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {[{ label: 'Year 1 Gross', value: '$480.1K', color: '#C9A84C' }, { label: 'Year 1 Net', value: '$417.1K', color: '#2A9D8F' }, { label: 'Effective Tax Rate', value: '1.6%', color: '#9B5DE5' }].map(m => (
                  <div key={m.label}>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{m.label}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '30px', fontWeight: '700', color: m.color, fontFamily: "'Lora', serif" }}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={card}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead><tr style={{ borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
                  {['Quarter', 'Gross Revenue', 'Net Income', 'Consulting', 'Products + Aff.', 'Content'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {QUARTERLY.map((q, i) => (
                    <tr key={q.quarter} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '14px', color: '#C9A84C', fontWeight: '700' }}>{q.quarter}</td>
                      <td style={{ padding: '14px', color: '#fff', fontWeight: '600', fontSize: '15px' }}>{q.gross}</td>
                      <td style={{ padding: '14px', color: '#2A9D8F', fontWeight: '700', fontSize: '15px' }}>{q.net}</td>
                      <td style={{ padding: '14px', color: 'rgba(255,255,255,0.7)' }}>{q.consulting}</td>
                      <td style={{ padding: '14px', color: 'rgba(255,255,255,0.7)' }}>{q.products}</td>
                      <td style={{ padding: '14px', color: 'rgba(255,255,255,0.7)' }}>{q.content}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.06)' }}>
                    <td style={{ padding: '14px', color: '#C9A84C', fontWeight: '800' }}>YEAR TOTAL</td>
                    <td style={{ padding: '14px', color: '#C9A84C', fontWeight: '800', fontSize: '16px' }}>$480.1K</td>
                    <td style={{ padding: '14px', color: '#2A9D8F', fontWeight: '800', fontSize: '16px' }}>$417.1K</td>
                    <td style={{ padding: '14px', color: '#C9A84C', fontWeight: '700' }}>$209K</td>
                    <td style={{ padding: '14px', color: '#C9A84C', fontWeight: '700' }}>$131.1K</td>
                    <td style={{ padding: '14px', color: '#C9A84C', fontWeight: '700' }}>$131.6K</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAX & IMMIGRATION ── */}
        {activeTab === 'Tax & Immigration' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.5rem', alignItems: 'start' }}>
            <div style={card}>
              <h3 style={{ margin: '0 0 1.25rem 0', color: '#2A9D8F', fontSize: '15px', fontWeight: '700' }}>🧾 Tax Optimization</h3>
              {[
                { label: 'Non-Resident Status (Colombia)', value: '0% tax on foreign-sourced income (stay <183 days)', color: '#2A9D8F' },
                { label: 'US FEIE Exclusion', value: '$120K/year exempt from US federal tax', color: '#C9A84C' },
                { label: 'Annual Tax Savings', value: '$120K × 22% = $26,400/year saved', color: '#C9A84C' },
                { label: 'Effective Rate M1–M12', value: '1.6% ($7,500 on $480K gross)', color: '#9B5DE5' },
                { label: 'vs. Standard US Rate', value: '22% → saves $92,000 in Year 1', color: '#C1121F' },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: `3px solid ${item.color}` }}>
                  <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#fff', fontWeight: '600' }}>{item.value}</p>
                </div>
              ))}
            </div>
            <div style={card}>
              <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '15px', fontWeight: '700' }}>🌎 Immigration Timeline</h3>
              {IMMIGRATION.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: `3px solid ${item.color}`, marginBottom: '0.5rem' }}>
                  <div style={{ flexShrink: 0, minWidth: '90px' }}>
                    <p style={{ margin: 0, fontSize: '11px', color: item.color, fontWeight: '700' }}>{item.month}</p>
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.5' }}>{item.event}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// Sub-component for adding milestone
function MilestoneAddForm({ onAdd }: { onAdd: (label: string, icon: string) => void }) {
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('🎯');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.75rem', alignItems: 'flex-end' }}>
      <div><label>Milestone Label</label><input value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && label.trim() && (onAdd(label, icon), setLabel(''))} placeholder="e.g. First Patreon Supporter" /></div>
      <div><label>Icon</label><input value={icon} onChange={e => setIcon(e.target.value)} style={{ width: '70px !important' }} /></div>
      <button className="btn btn-gold" onClick={() => { if (label.trim()) { onAdd(label, icon); setLabel(''); } }}
        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: label.trim() ? '#C9A84C' : 'rgba(255,255,255,0.08)', color: label.trim() ? '#1A1A2E' : 'rgba(255,255,255,0.3)', fontWeight: '700', cursor: label.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Poppins,sans-serif' }}>Add</button>
    </div>
  );
}
