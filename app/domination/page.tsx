'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

const PHASES = [
  {
    phase: 'Phase 1: Acceleration', period: 'M1–M12 (April 2026 – March 2027)', color: '#C9A84C', status: 'ACTIVE',
    gross: '$480K', net: '$417K',
    goals: ['Launch all 5 revenue streams simultaneously', 'Hit $100K+ net income within Month 12', 'Colombia Digital Nomad Visa + Cédula de Extranjería', 'Ghana residence permit approved (1-yr clock started)', '80 affiliate partners generating $4–8K/mo passive'],
  },
  {
    phase: 'Phase 2: Scaling', period: 'M13–M36 (2027–2029)', color: '#2A9D8F', status: 'PLANNED',
    gross: '$1.1M–$1.5M', net: 'Premium positioning',
    goals: ['Premium consulting positioning ($9,997+ packages)', 'Affiliate network scaled to 100+ partners', 'Ghana citizenship induction', 'Nigeria business entity established', 'Authority Builder product at full scale'],
  },
  {
    phase: 'Phase 3: Expansion', period: 'M37–M60 (2029–2031)', color: '#9B5DE5', status: 'PLANNED',
    gross: '$2M–$4M', net: 'Asset accumulation',
    goals: ['Real estate accumulation in Colombia + Ghana', 'Colombia R-Visa (5-yr permanent residency) confirmed', 'Nigeria permanent residence secured', 'Locali App in 3 cities', 'Passive income covers all living expenses'],
  },
  {
    phase: 'Phase 4: Domination', period: 'M61–M96 (2031–2034)', color: '#C1121F', status: 'VISION',
    gross: '$3M–$6M+', net: 'Generational wealth',
    goals: ['All income streams fully automated', 'Triple citizenship: Colombia + Ghana + Nigeria locked', 'Generational wealth infrastructure complete', 'Legacy brand established globally', 'Full financial and geographic freedom'],
  },
];

const REVENUE_STREAMS = [
  {
    name: 'Consulting (C.H.A. LLC)', color: '#C9A84C', icon: '🤝',
    desc: 'Freedom Era Audit ($150–$500) + Business Ops Fixer ($497–$997) + 90-Day Sprint ($2,500–$3,500) + Authority Builder ($9,997)',
    q1: '$10.5K', q2: '$28.5K', q3: '$73K', q4: '$97K', total: '$209K',
    strategy: '30 cold emails/week → discovery calls → 2–3 closes/week. Rate increase M7+: $350→$600 audits.',
  },
  {
    name: 'Digital Products (Micro-SaaS)', color: '#2A9D8F', icon: '🛒',
    desc: 'BrandPulse $47 | Clarity Engine $37 | Flagged $4.99/mo | Authority Builder M4+ | Done-For-You Tier M7+',
    q1: '$5.1K', q2: '$24K', q3: '$42K', q4: '$60K', total: '$131.1K',
    strategy: 'Affiliate-driven distribution at 20% commission. SEO long-tail keywords. Upsell to 1:1 services.',
  },
  {
    name: 'Affiliate Network', color: '#9B5DE5', icon: '🌐',
    desc: 'Tier 1 (20–30% commission): Email lists, podcasters, LinkedIn creators. Tier 2 (15%): Newsletter creators.',
    q1: '12 partners', q2: '30 partners', q3: '55 partners', q4: '80 partners', total: '$2.5K–$3K/mo passive',
    strategy: '25–30 referrals/month × 25% commission × $400 avg = $2.5K–$3K/month passive by M12.',
  },
  {
    name: 'Tea Time Network (Content)', color: '#C1121F', icon: '🎙️',
    desc: '4 shows (28 posts/week) + Patreon (25→300 subs) + YouTube (160K subs) + Brand sponsorships ($2.5K–$15K/mo)',
    q1: '$2.2K–$7.8K', q2: '$6.3K–$11.7K', q3: '$11.5K–$17.5K', q4: '$14K–$23K', total: '$131.6K',
    strategy: 'YouTube ad revenue + Shorts bonus ($500–$1K/platform) + 1–2 sponsor deals/month. Patreon: $5/$15/$29 tiers.',
  },
  {
    name: 'Books & Royalties', color: '#3a86ff', icon: '📚',
    desc: '20-title KDP catalog. Audiobook expansion M4–M6. Bundle strategy drives discovery and organic sales.',
    q1: '$750–$1.5K', q2: '$1.25K', q3: '$2.1K', q4: '$3.7K', total: 'Legacy income',
    strategy: 'Expand KDP to audiobooks Q2. Bundle digital products with books for cross-sell upsell opportunities.',
  },
];

const QUARTERLY = [
  { quarter: 'Q1 (M1–3)', gross: '$23.6K', net: '$16.1K', consulting: '$10.5K', products: '$5.1K', content: '$6.6K' },
  { quarter: 'Q2 (M4–6)', gross: '$74.8K', net: '$62.8K', consulting: '$28.5K', products: '$24K', content: '$21K' },
  { quarter: 'Q3 (M7–9)', gross: '$160.1K', net: '$143.6K', consulting: '$73K', products: '$42K', content: '$43K' },
  { quarter: 'Q4 (M10–12)', gross: '$221.7K', net: '$194.7K', consulting: '$97K', products: '$60K', content: '$61K' },
];

const IMMIGRATION = [
  { month: 'M7 — Aug 23, 2026', event: 'Arrive Bogotá on Digital Nomad Visa', status: 'LOCKED', color: '#C9A84C' },
  { month: 'M7–M8', event: 'Register Cédula de Extranjería + Begin M-Class Migrant pathway', status: 'PLANNED', color: '#2A9D8F' },
  { month: 'M8', event: 'Begin Escazú Spanish classes (9-month intensive)', status: 'PLANNED', color: '#2A9D8F' },
  { month: 'M9–M11', event: 'Submit Ghana Residence Permit application (Diaspora Affairs GH)', status: 'PLANNED', color: '#9B5DE5' },
  { month: 'M12', event: 'Ghana Residence approved — 1-year citizenship clock begins', status: 'TARGET', color: '#9B5DE5' },
  { month: 'M12', event: 'Nigeria business visitor permit research complete', status: 'TARGET', color: '#C1121F' },
  { month: 'M24–M36', event: 'Colombia M-Class → R-Visa (5-year permanent residency)', status: 'VISION', color: '#C9A84C' },
  { month: 'M36', event: 'Ghana Citizenship Induction (Diaspora)', status: 'VISION', color: '#9B5DE5' },
  { month: 'M48', event: 'Nigeria Investment Residency', status: 'VISION', color: '#C1121F' },
  { month: 'M60+', event: 'Colombia Citizenship (5-yr naturalization)', status: 'VISION', color: '#C9A84C' },
];

const THIS_WEEK = [
  'Lock plan — confirm alignment (April 14–20)',
  'Verify Avianca booking (Aug 23 departure, ref: A2TXHP)',
  'Send 12 affiliate referral emails (20–30% commission model)',
  'Publish 3 product launch posts (BrandPulse, Clarity Engine, Flagged)',
  'Schedule M1–M3 Socialblu content calendar (28 posts/week)',
];

const MONTH_1 = [
  'Cold outreach: 30 emails/week (consulting discovery calls)',
  'Patreon push: CTAs in all 4 shows + link-in-bio optimization',
  'Product validation: Track unit economics for all 3 products',
  'Affiliate activation: Follow up with 12 partners (2–3 referrals expected)',
];

const M12_METRICS = [
  { label: 'Consulting', target: '≥100 clients @ $750–$800 avg engagement' },
  { label: 'Products', target: '≥$60K revenue (6+ products, 60% affiliate/organic)' },
  { label: 'Content', target: '≥$61K (300 Patreon, 210K YouTube, 3+ sponsors/mo)' },
  { label: 'Affiliate', target: '80 partners, 30–40 referrals/month' },
  { label: 'Net Income', target: '≥$417K cumulative; ≥$71.5K monthly run-rate' },
  { label: 'Colombia', target: 'Cédula de Extranjería + M-Class pathway secured' },
  { label: 'Ghana', target: 'Residence Permit approved; citizenship clock started' },
  { label: 'Nigeria', target: 'Business visitor permit research complete' },
];

const TABS = ['Overview', 'Revenue Streams', 'Quarterly Targets', 'Tax & Immigration', 'Execution', 'M12 Checkpoint'];

export default function Domination() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [blueprint, setBlueprint] = useState('');
  const [generating, setGenerating] = useState(false);
  const [currentRevenue, setCurrentRevenue] = useState(0);

  const generateBlueprintAI = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a direct strategic advisor. Give a sharp, tactical 3-paragraph response. No bullet points. No fluff. Speak directly to CJ.',
          messages: [{ role: 'user', content: `CJ H. Adisa. April 2026. Current monthly revenue: $${currentRevenue}. 96-Month Global Domination Plan is LOCKED. 5 products just launched. Promos go live today. Consulting + Digital Products + Affiliate Network + Tea Time Network + Books. Colombia relocation Aug 23. Triple citizenship target: Colombia, Ghana, Nigeria. Tax optimization via FEIE saves $26K/year. What are the 3 most important things CJ should be executing RIGHT NOW in this exact week to build maximum momentum toward $100K net income by Month 12?` }]
        })
      });
      const data = await res.json();
      setBlueprint(data.content?.find((c: any) => c.type === 'text')?.text || '');
    } catch {
      setBlueprint('Could not connect. Check your connection and try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Layout activeTab="domination">
      <div style={{ maxWidth: '1200px' }}>

        {/* Hero */}
        <div style={{ marginBottom: '2rem', padding: '2.5rem 2rem', background: 'linear-gradient(135deg, rgba(193,18,31,0.12), rgba(201,168,76,0.08), rgba(155,93,229,0.12))', border: '1px solid rgba(201,168,76,0.35)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px' }}>C.H.A. LLC</p>
              <h2 style={{ margin: '0 0 8px 0', color: '#C9A84C', fontSize: '28px', fontWeight: '700', fontFamily: "'Lora', serif" }}>96-Month Global Domination Plan</h2>
              <p style={{ margin: '0 0 1.5rem 0', color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>Strategic Blueprint to $100K+ Net Income + Triple Citizenship</p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Primary Goal', value: '$100K+ net by Month 12' },
                  { label: 'Year 1 Gross', value: '$480K projected' },
                  { label: 'Tax Rate M1–M12', value: '1.6% (FEIE)' },
                  { label: 'Citizenship Target', value: 'Colombia + Ghana + Nigeria' },
                ].map(s => (
                  <div key={s.label}>
                    <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '14px', fontWeight: '700', color: '#fff' }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ padding: '8px 16px', background: 'rgba(42,157,143,0.2)', border: '1px solid #2A9D8F', borderRadius: '20px', display: 'inline-block' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#2A9D8F', fontWeight: '700' }}>🔒 LOCKED & EXECUTABLE</p>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Plan Date: April 12, 2026</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Next Review: May 1, 2026</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab ? '600' : '400', color: activeTab === tab ? '#C9A84C' : 'rgba(255,255,255,0.45)', borderBottom: activeTab === tab ? '2px solid #C9A84C' : '2px solid transparent', marginBottom: '-1px', whiteSpace: 'nowrap', fontFamily: 'Poppins, sans-serif' }}>
              {tab}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'Overview' && (
          <div>
            {/* AI Advisor */}
            <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#C9A84C', fontSize: '15px', fontWeight: '600' }}>👑 AI Strategic Advisor</h3>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div>
                    <input type="number" value={currentRevenue} onChange={e => setCurrentRevenue(parseFloat(e.target.value) || 0)} placeholder="Current monthly revenue $" style={{ width: '180px !important' }} />
                  </div>
                  <button className="btn-primary" onClick={generateBlueprintAI} disabled={generating}
                    style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: generating ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #C9A84C, #C1121F)', color: generating ? 'rgba(255,255,255,0.4)' : '#fff', fontWeight: '700', fontSize: '13px', cursor: generating ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                    {generating ? '⚡ Strategizing...' : '⚡ What Should I Do Right Now?'}
                  </button>
                </div>
              </div>
              {blueprint && (
                <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', borderLeft: '3px solid #C9A84C' }}>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{blueprint}</p>
                </div>
              )}
              {!blueprint && !generating && (
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Enter your current monthly revenue and get a direct AI answer on your highest-leverage moves right now.</p>
              )}
            </div>

            {/* 4 Phases */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {PHASES.map(p => (
                <div key={p.phase} className="card-hover" style={{ ...card, borderTop: `3px solid ${p.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: p.color, fontSize: '13px', fontWeight: '700' }}>{p.phase}</h4>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: '600', background: p.status === 'ACTIVE' ? 'rgba(42,157,143,0.2)' : p.status === 'LOCKED' ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.06)', color: p.status === 'ACTIVE' ? '#2A9D8F' : p.status === 'LOCKED' ? '#C9A84C' : 'rgba(255,255,255,0.4)' }}>{p.status}</span>
                  </div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{p.period}</p>
                  <p style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: p.color }}>{p.gross}</p>
                  {p.goals.map((g, i) => <p key={i} style={{ margin: i === 0 ? 0 : '5px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '11.5px', lineHeight: '1.5' }}>• {g}</p>)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REVENUE STREAMS */}
        {activeTab === 'Revenue Streams' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {REVENUE_STREAMS.map(s => (
              <div key={s.name} className="card-hover" style={{ ...card, borderLeft: `3px solid ${s.color}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                      <h3 style={{ margin: 0, color: s.color, fontSize: '14px', fontWeight: '700' }}>{s.name}</h3>
                    </div>
                    <p style={{ margin: '0 0 8px 0', color: 'rgba(255,255,255,0.55)', fontSize: '12px', lineHeight: '1.5' }}>{s.desc}</p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '11.5px', lineHeight: '1.5', fontStyle: 'italic' }}>{s.strategy}</p>
                  </div>
                  {[{ label: 'Q1', val: s.q1 }, { label: 'Q2', val: s.q2 }, { label: 'Q3', val: s.q3 }, { label: 'Q4', val: s.q4 }, { label: 'TOTAL', val: s.total }].map(q => (
                    <div key={q.label} style={{ textAlign: 'center', padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                      <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{q.label}</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: '700', color: q.label === 'TOTAL' ? s.color : '#fff' }}>{q.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* QUARTERLY TARGETS */}
        {activeTab === 'Quarterly Targets' && (
          <div>
            <div style={{ ...card, marginBottom: '1.5rem', background: 'rgba(42,157,143,0.06)', borderColor: 'rgba(42,157,143,0.3)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Year 1 Gross</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '32px', fontWeight: '700', color: '#C9A84C', fontFamily: "'Lora', serif" }}>$480.1K</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Year 1 Net</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '32px', fontWeight: '700', color: '#2A9D8F', fontFamily: "'Lora', serif" }}>$417.1K</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Effective Tax Rate</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '32px', fontWeight: '700', color: '#9B5DE5', fontFamily: "'Lora', serif" }}>1.6%</p>
                </div>
              </div>
            </div>
            <div style={{ ...card, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
                    {['Quarter', 'Gross Revenue', 'Net Income', 'Consulting', 'Products + Aff.', 'Content'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
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

        {/* TAX & IMMIGRATION */}
        {activeTab === 'Tax & Immigration' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.5rem', alignItems: 'start' }}>
            <div>
              <div style={{ ...card, marginBottom: '1rem', borderColor: 'rgba(42,157,143,0.4)', background: 'rgba(42,157,143,0.06)' }}>
                <h3 style={{ margin: '0 0 1.25rem 0', color: '#2A9D8F', fontSize: '15px', fontWeight: '700' }}>🧾 Tax Optimization</h3>
                {[
                  { label: 'Non-Resident Status (Colombia)', value: '0% tax on foreign-sourced income (stay <183 days)', color: '#2A9D8F' },
                  { label: 'US FEIE Exclusion', value: '$120K/year exempt from US federal tax', color: '#C9A84C' },
                  { label: 'Annual Tax Savings', value: '$120K × 22% = $26,400/year saved', color: '#C9A84C' },
                  { label: 'Effective Rate M1–M12', value: '1.6% ($7,500 on $480K gross)', color: '#9B5DE5' },
                  { label: 'vs. Standard US Rate', value: '22% → saves $92,000 in Year 1', color: '#C1121F' },
                ].map(item => (
                  <div key={item.label} style={{ marginBottom: '0.85rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: `3px solid ${item.color}` }}>
                    <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#fff', fontWeight: '600' }}>{item.value}</p>
                  </div>
                ))}
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', marginTop: '0.5rem' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#C9A84C', fontWeight: '600' }}>Required Documentation</p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6' }}>Border stamps • Flight records • Accommodation logs • DIAN "Non-Resident Declaration" within 30 days of arrival • IRS Form 2555</p>
                </div>
              </div>
            </div>
            <div style={card}>
              <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '15px', fontWeight: '700' }}>🌎 Immigration Timeline</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {IMMIGRATION.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: `3px solid ${item.color}` }}>
                    <div style={{ flexShrink: 0, minWidth: '90px' }}>
                      <p style={{ margin: 0, fontSize: '11px', color: item.color, fontWeight: '700' }}>{item.month}</p>
                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '20px', background: `${item.color}20`, color: item.color, fontWeight: '600' }}>{item.status}</span>
                    </div>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.5' }}>{item.event}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EXECUTION */}
        {activeTab === 'Execution' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <div style={{ ...card, marginBottom: '1rem', borderColor: 'rgba(193,18,31,0.5)', background: 'rgba(193,18,31,0.05)' }}>
                <h3 style={{ margin: '0 0 1.25rem 0', color: '#C1121F', fontSize: '15px', fontWeight: '700' }}>⚡ This Week (April 14–20)</h3>
                {THIS_WEEK.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: i < THIS_WEEK.length - 1 ? '0.75rem' : 0 }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid rgba(193,18,31,0.5)', flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: '1.5' }}>{item}</p>
                  </div>
                ))}
              </div>
              <div style={{ ...card, borderColor: 'rgba(201,168,76,0.4)' }}>
                <h3 style={{ margin: '0 0 1.25rem 0', color: '#C9A84C', fontSize: '15px', fontWeight: '700' }}>📅 Month 1 (April 21+)</h3>
                {MONTH_1.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: i < MONTH_1.length - 1 ? '0.75rem' : 0 }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid rgba(201,168,76,0.5)', flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: '1.5' }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={card}>
              <h3 style={{ margin: '0 0 1.25rem 0', color: '#2A9D8F', fontSize: '15px', fontWeight: '700' }}>📊 Monthly Tracking (Ongoing)</h3>
              {[
                { icon: '💳', item: 'Revenue dashboard (Stripe, HubSpot, Supabase)' },
                { icon: '🤝', item: 'Consulting pipeline (close rate, value per engagement)' },
                { icon: '🌐', item: 'Affiliate network (referrals YTD, top performers)' },
                { icon: '🎙️', item: 'Patreon/YouTube metrics (subscriber growth, engagement)' },
                { icon: '🌍', item: 'Visa/immigration timeline (dates, application status)' },
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '0.75rem 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <span style={{ fontSize: '1.1rem', marginTop: '1px' }}>{t.icon}</span>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.5' }}>{t.item}</p>
                </div>
              ))}
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(42,157,143,0.08)', border: '1px solid rgba(42,157,143,0.25)', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 0.5rem 0', color: '#2A9D8F', fontSize: '12px', fontWeight: '600' }}>🔗 Key Booking Links</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: '1.8' }}>
                  Freedom Era Audit: freedomaudit.youcanbook.me<br />
                  Business Ops Fixer: calendly.com/cjhadisa/business-ops-fixer<br />
                  Avianca Booking: A2TXHP (Aug 23 departure)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* M12 CHECKPOINT */}
        {activeTab === 'M12 Checkpoint' && (
          <div>
            <div style={{ ...card, marginBottom: '1.5rem', background: 'rgba(42,157,143,0.06)', borderColor: 'rgba(42,157,143,0.4)', textAlign: 'center', padding: '2rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#2A9D8F', fontSize: '20px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Month 12 Success Checkpoint</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>March 2027 — Everything below must be true</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {M12_METRICS.map((m, i) => (
                <div key={i} className="card-hover" style={{ ...card, borderTop: '2px solid rgba(42,157,143,0.5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(42,157,143,0.15)', border: '1px solid rgba(42,157,143,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#2A9D8F', fontWeight: '700', flexShrink: 0 }}>✓</div>
                    <p style={{ margin: 0, color: '#C9A84C', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.5' }}>{m.target}</p>
                </div>
              ))}
            </div>
            <div style={{ ...card, marginTop: '1.5rem', background: 'rgba(155,93,229,0.06)', borderColor: 'rgba(155,93,229,0.4)', textAlign: 'center', padding: '2rem' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '13px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>96-Month End State</p>
              <p style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '20px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Triple Citizenship. Full Automation. Generational Wealth.</p>
              <p style={{ margin: 0, color: '#C9A84C', fontSize: '16px', fontStyle: 'italic', fontFamily: "'Lora', serif" }}>"Sip slow. Love loud. Live free."</p>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
