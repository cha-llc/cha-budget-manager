// BUILD_V5_PERSONAL_BUSINESS
'use client';
import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;
const DIVISIONS = ['All Divisions', 'Consulting', 'Tea Time Network', 'Digital Tools', 'Books'];
const CAT_COLORS: Record<string, string> = {
  'Software & Tools': '#9B5DE5', 'Marketing & Ads': '#C9A84C', 'Hosting & Infrastructure': '#2A9D8F',
  'Content & Media': '#C1121F', 'Professional Services': '#3a86ff', 'Travel': '#f4a261',
  'Equipment': '#e9c46a', 'Payroll': '#06d6a0', 'Education': '#ef476f', 'Other': '#6c757d',
  'Salary / Wages': '#2A9D8F', 'Taxes': '#C1121F', 'Health & Wellness': '#06d6a0',
  'Housing / Rent': '#f4a261', 'Food & Groceries': '#C9A84C', 'Transportation': '#3a86ff',
  'Entertainment': '#9B5DE5', 'Savings': '#2A9D8F', 'Emergency Fund': '#3a86ff',
};

export default function Reports() {
  const [mode, setMode] = useState<'business' | 'personal'>('business');
  // Business data
  const [expenses, setExpenses] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [division, setDivision] = useState('All Divisions');
  // Personal data
  const [persTxs, setPersTxs] = useState<any[]>([]);
  const [persCats, setPersCats] = useState<any[]>([]);
  // Shared
  const [period, setPeriod] = useState('monthly');
  const [aiReport, setAiReport] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [er, rr, dr, tr, cr] = await Promise.all([
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('revenue').select('*').order('date', { ascending: false }),
        supabase.from('budget_documents').select('*').order('uploaded_at', { ascending: false }),
        supabase.from('personal_transactions').select('*').order('date', { ascending: false }),
        supabase.from('personal_budget_categories').select('*').order('name'),
      ]);
      if (er.data) setExpenses(er.data);
      if (rr.data) setRevenue(rr.data);
      if (dr.data) setDocuments(dr.data);
      if (tr.data) setPersTxs(tr.data);
      if (cr.data) setPersCats(cr.data);
      setLoading(false);
    };
    load();
  }, []);

  // ── BUSINESS COMPUTED ──
  const filteredExpenses = division === 'All Divisions' ? expenses : expenses.filter(e => e.division === division);
  const totalBizExpenses = filteredExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalBizRevenue = revenue.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const bizNet = totalBizRevenue - totalBizExpenses;
  const bizCatBreakdown: Record<string, number> = {};
  filteredExpenses.forEach(e => { bizCatBreakdown[e.category] = (bizCatBreakdown[e.category] || 0) + parseFloat(e.amount || 0); });
  const topBizCats = Object.entries(bizCatBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const productRevenue: Record<string, number> = {};
  revenue.forEach(r => { productRevenue[r.product_name] = (productRevenue[r.product_name] || 0) + parseFloat(r.amount || 0); });
  const topProducts = Object.entries(productRevenue).sort((a, b) => b[1] - a[1]);

  // ── PERSONAL COMPUTED ──
  const totalPersIncome = persTxs.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalPersExpenses = persTxs.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const persNet = totalPersIncome - totalPersExpenses;
  const persCatSpend: Record<string, number> = {};
  persTxs.filter(t => t.type === 'expense').forEach(t => { persCatSpend[t.category_name] = (persCatSpend[t.category_name] || 0) + parseFloat(t.amount || 0); });
  const persIncomeBySource: Record<string, number> = {};
  persTxs.filter(t => t.type === 'income').forEach(t => { persIncomeBySource[t.category_name] = (persIncomeBySource[t.category_name] || 0) + parseFloat(t.amount || 0); });
  const topPersExpCats = Object.entries(persCatSpend).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topPersIncomeCats = Object.entries(persIncomeBySource).sort((a, b) => b[1] - a[1]);
  // Budget vs actual for personal
  const persWithBudget = persCats.filter(c => parseFloat(c.budgeted_amount || 0) > 0).map(c => ({
    ...c,
    spent: persCatSpend[c.name] || 0,
    budget: parseFloat(c.budgeted_amount),
  }));

  const generateReport = async () => {
    setGenerating(true); setAiReport(null);
    try {
      const isPersonal = mode === 'personal';
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1500,
          system: isPersonal
            ? 'You are a personal finance advisor. Return ONLY valid JSON: {"executive_summary":"string","financial_health":"Excellent|Good|Fair|Needs Attention","health_score":0,"income_analysis":"string","expense_analysis":"string","savings_rate":"string","budget_adherence":"string","risks":["string"],"action_items":["string"],"forecast":{"next_month_income":0,"next_month_expenses":0,"confidence":"string"}}. No markdown.'
            : 'You are a CFO-level financial analyst for C.H.A. LLC. Return ONLY valid JSON: {"executive_summary":"string","financial_health":"Excellent|Good|Fair|Needs Attention","health_score":0,"revenue_analysis":"string","expense_analysis":"string","cash_flow_status":"string","growth_indicators":["string"],"risks":["string"],"action_items":["string"],"forecast":{"next_month_revenue":0,"next_month_expenses":0,"confidence":"string"},"tax_notes":["string"]}. No markdown.',
          messages: [{
            role: 'user',
            content: isPersonal
              ? `Personal finance ${period} report. Income: $${totalPersIncome.toFixed(2)}, Expenses: $${totalPersExpenses.toFixed(2)}, Net: $${persNet.toFixed(2)}. Income by source: ${JSON.stringify(topPersIncomeCats)}. Spending by category: ${JSON.stringify(topPersExpCats)}. Budget categories with amounts: ${JSON.stringify(persWithBudget.map(c => ({name:c.name, budget:c.budget, spent:c.spent})))}. Provide specific personal finance advice.`
              : `C.H.A. LLC ${period} business report. Division: ${division}. Revenue: $${totalBizRevenue.toFixed(2)}, Expenses: $${totalBizExpenses.toFixed(2)}, Net: $${bizNet.toFixed(2)}. Revenue by product: ${JSON.stringify(topProducts.slice(0,5))}. Expenses by category: ${JSON.stringify(topBizCats)}. 8 products live: BrandPulse $47, Clarity Engine $37, Flagged $4.99/mo, Freedom Era Audit $150, Business Ops Fixer $497, Burnout Reset $67, Couples Clarity $97, First-Gen Table $17/mo.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      setAiReport(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const exportCSV = () => {
    let rows: string[][];
    if (mode === 'business') {
      rows = [
        ['C.H.A. LLC Business Report', period, division],
        ['REVENUE'],
        ['Product', 'Amount', 'Source', 'Date'],
        ...revenue.map(r => [r.product_name, r.amount, r.source, r.date]),
        [''],
        ['EXPENSES'],
        ['Description', 'Division', 'Category', 'Amount', 'Date'],
        ...filteredExpenses.map(e => [e.description, e.division, e.category, e.amount, e.date]),
      ];
    } else {
      rows = [
        ['Personal Finance Report', period],
        ['INCOME'],
        ['Description', 'Category', 'Amount', 'Date'],
        ...persTxs.filter(t => t.type === 'income').map(t => [t.description, t.category_name, t.amount, t.date]),
        [''],
        ['EXPENSES'],
        ['Description', 'Category', 'Amount', 'Date'],
        ...persTxs.filter(t => t.type === 'expense').map(t => [t.description, t.category_name, t.amount, t.date]),
        [''],
        ['BUDGET vs ACTUAL'],
        ['Category', 'Budgeted', 'Spent', 'Remaining'],
        ...persWithBudget.map(c => [c.name, c.budget, c.spent, Math.max(0, c.budget - c.spent)]),
      ];
    }
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `cha-${mode}-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const emailReport = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000,
          system: 'Compose a professional financial report email for C.H.A. LLC. Return ONLY valid JSON: {"subject":"string","body":"string (HTML)"}. No markdown in values.',
          messages: [{
            role: 'user',
            content: `${mode === 'personal' ? 'Personal' : 'Business'} ${period} report. ${mode === 'personal' ? `Income: $${totalPersIncome.toFixed(0)}, Expenses: $${totalPersExpenses.toFixed(0)}, Net: $${persNet.toFixed(0)}` : `Revenue: $${totalBizRevenue.toFixed(0)}, Expenses: $${totalBizExpenses.toFixed(0)}, Net: $${bizNet.toFixed(0)}`}. ${aiReport?.executive_summary ? `Summary: ${aiReport.executive_summary}` : ''}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      const emailContent = JSON.parse(text.replace(/```json|```/g, '').trim());
      const plainBody = emailContent.body?.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim() || '';
      const mailtoUrl = `mailto:cs@cjhadisa.com?subject=${encodeURIComponent(emailContent.subject || 'C.H.A. LLC Report')}&body=${encodeURIComponent(plainBody.slice(0, 1800))}`;
      // Try server send first
      try {
        const emailRes = await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: 'cs@cjhadisa.com', subject: emailContent.subject, body: emailContent.body }) });
        const emailData = await emailRes.json();
        if (emailData.method === 'smtp') {
          setEmailSent(`✅ Report sent to cs@cjhadisa.com`);
        } else { window.open(mailtoUrl, '_blank'); setEmailSent(`✅ Email client opened`); }
      } catch { window.open(mailtoUrl, '_blank'); setEmailSent(`✅ Email client opened`); }
      setTimeout(() => setEmailSent(''), 5000);
    } catch { setEmailSent('❌ Could not compose. Try again.'); }
    setSendingEmail(false);
  };

  const healthColor = (h: string) => ({ Excellent: '#2A9D8F', Good: '#C9A84C', Fair: '#f4a261', 'Needs Attention': '#C1121F' }[h] || '#999');

  return (
    <Layout activeTab="reports">
      <div style={{ maxWidth: '1200px' }}>
        {/* Header + Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Financial Reports</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              {mode === 'business' ? 'C.H.A. LLC business P&L — revenue, expenses, AI CFO analysis' : 'Personal finance report — income, spending, budget vs actual'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '4px' }}>
            {(['business', 'personal'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setAiReport(null); }} style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: mode === m ? (m === 'business' ? '#C9A84C' : '#9B5DE5') : 'transparent', color: mode === m ? (m === 'business' ? '#1A1A2E' : '#fff') : 'rgba(255,255,255,0.5)', fontWeight: mode === m ? '700' : '400', fontSize: '13px', fontFamily: 'Poppins,sans-serif', transition: 'all 0.2s' }}>
                {m === 'business' ? '🏢 Business Report' : '🧾 Personal Report'}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {mode === 'business' && (
            <select value={division} onChange={e => setDivision(e.target.value)} style={{ width: 'auto !important', padding: '8px 14px !important' }}>
              {DIVISIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          )}
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: 'auto !important', padding: '8px 14px !important' }}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
          {emailSent && <span style={{ fontSize: '12px', color: emailSent.startsWith('✅') ? '#2A9D8F' : '#C1121F' }}>{emailSent}</span>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={exportCSV} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.4)', background: 'transparent', color: '#C9A84C', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>📥 CSV</button>
            <button className="btn-primary" onClick={generateReport} disabled={generating} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #9B5DE5, #2A9D8F)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {generating ? '📊 Generating...' : '📊 AI Report'}
            </button>
            <button className="btn-primary" onClick={emailReport} disabled={sendingEmail} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #C9A84C, #C1121F)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {sendingEmail ? '📧 Sending...' : '📧 Email Report'}
            </button>
          </div>
        </div>

        {loading ? <div style={{ ...card, textAlign: 'center', padding: '3rem' }}><p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Loading...</p></div> : (
          <>
            {/* ═══ BUSINESS MODE ═══ */}
            {mode === 'business' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[{ label: 'Total Revenue', value: `$${totalBizRevenue.toLocaleString(undefined,{maximumFractionDigits:0})}`, color: '#2A9D8F' },
                    { label: 'Total Expenses', value: `$${totalBizExpenses.toLocaleString(undefined,{maximumFractionDigits:0})}`, color: '#C1121F' },
                    { label: 'Net Income', value: `${bizNet>=0?'+':''}$${Math.abs(bizNet).toLocaleString(undefined,{maximumFractionDigits:0})}`, color: bizNet>=0?'#2A9D8F':'#C1121F' }
                  ].map(m => (
                    <div key={m.label} style={card}>
                      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
                      <p style={{ margin: '6px 0 0 0', fontSize: '28px', fontWeight: '700', color: m.color }}>{m.value}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={card}>
                    <h3 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Revenue by Product</h3>
                    {topProducts.length === 0 ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No revenue recorded yet — sync Stripe or log revenue manually</p>
                      : topProducts.map(([name, amt]) => (
                        <div key={name} style={{ marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{name}</span>
                            <span style={{ fontSize: '13px', color: '#2A9D8F', fontWeight: '600' }}>${amt.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${topProducts[0] ? (amt / topProducts[0][1]) * 100 : 0}%`, background: '#2A9D8F', borderRadius: '3px' }} />
                          </div>
                        </div>
                      ))}
                  </div>
                  <div style={card}>
                    <h3 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Expenses by Category</h3>
                    {topBizCats.length === 0 ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No expenses recorded</p>
                      : topBizCats.map(([cat, amt]) => (
                        <div key={cat} style={{ marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: CAT_COLORS[cat] || '#666', display: 'inline-block' }} />{cat}
                            </span>
                            <span style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>${amt.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${topBizCats[0] ? (amt / topBizCats[0][1]) * 100 : 0}%`, background: CAT_COLORS[cat] || '#666', borderRadius: '3px' }} />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                {/* Transaction tables */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  {[
                    { title: 'Revenue Transactions', rows: revenue.slice(0,10), cols: ['Product', 'Source', 'Amount', 'Date'], getRow: (r: any) => [r.product_name, r.source, `$${parseFloat(r.amount).toLocaleString()}`, r.date], color: '#2A9D8F' },
                    { title: 'Expense Transactions', rows: filteredExpenses.slice(0,10), cols: ['Description', 'Category', 'Amount', 'Date'], getRow: (e: any) => [e.description?.slice(0,30), e.category, `$${parseFloat(e.amount).toLocaleString()}`, e.date], color: '#C1121F' },
                  ].map(t => (
                    <div key={t.title} style={card}>
                      <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '14px', fontWeight: '600' }}>{t.title}</h3>
                      {t.rows.length === 0 ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>None yet</p> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{t.cols.map(c => <th key={c} style={{ padding: '6px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>{c}</th>)}</tr></thead>
                          <tbody>{t.rows.map((row: any, i: number) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              {t.getRow(row).map((cell: string, ci: number) => (
                                <td key={ci} style={{ padding: '7px 8px', color: ci === 2 ? t.color : 'rgba(255,255,255,0.65)', fontWeight: ci === 2 ? '600' : '400' }}>{cell}</td>
                              ))}
                            </tr>
                          ))}</tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ PERSONAL MODE ═══ */}
            {mode === 'personal' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[{ label: 'Personal Income', value: `$${totalPersIncome.toLocaleString(undefined,{maximumFractionDigits:0})}`, color: '#2A9D8F' },
                    { label: 'Personal Expenses', value: `$${totalPersExpenses.toLocaleString(undefined,{maximumFractionDigits:0})}`, color: '#C1121F' },
                    { label: 'Net Cash Flow', value: `${persNet>=0?'+':''}$${Math.abs(persNet).toLocaleString(undefined,{maximumFractionDigits:0})}`, color: persNet>=0?'#2A9D8F':'#C1121F' },
                    { label: 'Transactions', value: String(persTxs.length), color: '#9B5DE5' },
                  ].map(m => (
                    <div key={m.label} style={card}>
                      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
                      <p style={{ margin: '6px 0 0 0', fontSize: '24px', fontWeight: '700', color: m.color }}>{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Budget vs Actual */}
                {persWithBudget.length > 0 && (
                  <div style={{ ...card, marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '15px', fontWeight: '600' }}>📊 Budget vs Actual</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                      {persWithBudget.map(cat => {
                        const pct = cat.budget > 0 ? Math.min(100, (cat.spent / cat.budget) * 100) : 0;
                        const over = cat.spent > cat.budget && cat.budget > 0;
                        const color = over ? '#C1121F' : pct > 75 ? '#C9A84C' : '#2A9D8F';
                        return (
                          <div key={cat.name} style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: `3px solid ${color}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>{cat.icon} {cat.name}</span>
                              <span style={{ color: over ? '#C1121F' : 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{pct.toFixed(0)}%</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '3px', height: '5px', overflow: 'hidden', marginBottom: '6px' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.4s' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                              <span style={{ color: over ? '#C1121F' : '#2A9D8F' }}>${cat.spent.toFixed(0)} spent{over ? ' ⚠️' : ''}</span>
                              <span style={{ color: 'rgba(255,255,255,0.4)' }}>/ ${cat.budget.toFixed(0)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={card}>
                    <h3 style={{ margin: '0 0 1.25rem 0', color: '#2A9D8F', fontSize: '15px', fontWeight: '600' }}>Income Sources</h3>
                    {topPersIncomeCats.length === 0 ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No income recorded yet — upload pay stubs or bank statements</p>
                      : topPersIncomeCats.map(([cat, amt]) => (
                        <div key={cat} style={{ marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{cat}</span>
                            <span style={{ fontSize: '13px', color: '#2A9D8F', fontWeight: '600' }}>${amt.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${topPersIncomeCats[0] ? (amt / topPersIncomeCats[0][1]) * 100 : 0}%`, background: '#2A9D8F', borderRadius: '3px' }} />
                          </div>
                        </div>
                      ))}
                  </div>
                  <div style={card}>
                    <h3 style={{ margin: '0 0 1.25rem 0', color: '#C1121F', fontSize: '15px', fontWeight: '600' }}>Spending by Category</h3>
                    {topPersExpCats.length === 0 ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No expenses recorded yet</p>
                      : topPersExpCats.map(([cat, amt]) => (
                        <div key={cat} style={{ marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: CAT_COLORS[cat] || '#9B5DE5', display: 'inline-block' }} />{cat}
                            </span>
                            <span style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>${amt.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${topPersExpCats[0] ? (amt / topPersExpCats[0][1]) * 100 : 0}%`, background: CAT_COLORS[cat] || '#9B5DE5', borderRadius: '3px' }} />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Personal transaction table */}
                <div style={card}>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '14px', fontWeight: '600' }}>Recent Personal Transactions ({persTxs.length})</h3>
                  {persTxs.length === 0 ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No transactions yet. Upload documents on the Documents page.</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['Description', 'Category', 'Type', 'Amount', 'Date'].map(c => <th key={c} style={{ padding: '7px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>{c}</th>)}
                      </tr></thead>
                      <tbody>{persTxs.slice(0, 20).map((t, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '7px 8px', color: 'rgba(255,255,255,0.7)' }}>{(t.description || '').slice(0, 35)}</td>
                          <td style={{ padding: '7px 8px', color: 'rgba(255,255,255,0.5)' }}>{t.category_name}</td>
                          <td style={{ padding: '7px 8px' }}><span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: t.type === 'income' ? 'rgba(42,157,143,0.2)' : 'rgba(193,18,31,0.15)', color: t.type === 'income' ? '#2A9D8F' : '#C1121F' }}>{t.type}</span></td>
                          <td style={{ padding: '7px 8px', fontWeight: '600', color: t.type === 'income' ? '#2A9D8F' : '#C1121F' }}>${parseFloat(t.amount).toLocaleString()}</td>
                          <td style={{ padding: '7px 8px', color: 'rgba(255,255,255,0.4)' }}>{t.date}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* AI Report */}
            {generating && <div style={{ ...card, textAlign: 'center', padding: '2.5rem', marginTop: '1.5rem' }}><p style={{ color: '#9B5DE5', fontWeight: '600', margin: 0 }}>📊 Generating AI financial analysis...</p></div>}
            {aiReport && (
              <div style={{ ...card, marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h3 style={{ margin: 0, color: '#9B5DE5', fontSize: '16px', fontWeight: '600' }}>📊 AI Financial Report — {mode === 'personal' ? 'Personal' : 'Business'}</h3>
                  {aiReport.financial_health && (
                    <span style={{ padding: '4px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '12px', background: `${healthColor(aiReport.financial_health)}22`, color: healthColor(aiReport.financial_health), border: `1px solid ${healthColor(aiReport.financial_health)}44` }}>
                      {aiReport.financial_health} — Score: {aiReport.health_score}/100
                    </span>
                  )}
                </div>
                <div style={{ padding: '1rem', background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.2)', borderRadius: '8px', marginBottom: '1.25rem' }}>
                  <p style={{ margin: 0, color: '#fff', fontSize: '14px', lineHeight: '1.7' }}>{aiReport.executive_summary}</p>
                </div>
                {aiReport.forecast && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    {[
                      { label: mode === 'personal' ? 'Forecast Income' : 'Forecast Revenue', value: `$${(aiReport.forecast.next_month_revenue || aiReport.forecast.next_month_income || 0).toLocaleString()}`, color: '#2A9D8F' },
                      { label: 'Forecast Expenses', value: `$${(aiReport.forecast.next_month_expenses || 0).toLocaleString()}`, color: '#C1121F' },
                      { label: 'Confidence', value: aiReport.forecast.confidence || 'N/A', color: '#C9A84C' },
                    ].map(m => (
                      <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{m.label}</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '700', color: m.color }}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  {[
                    { label: mode === 'personal' ? '💵 Income Analysis' : '💰 Revenue Analysis', text: aiReport.income_analysis || aiReport.revenue_analysis, color: '#2A9D8F' },
                    { label: '📝 Expense Analysis', text: aiReport.expense_analysis, color: '#C1121F' },
                    { label: mode === 'personal' ? '💡 Action Items' : '📈 Growth', items: aiReport.action_items || aiReport.growth_indicators, color: '#C9A84C' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem' }}>
                      <p style={{ margin: '0 0 0.75rem 0', color: s.color, fontSize: '13px', fontWeight: '600' }}>{s.label}</p>
                      {s.text && <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', fontSize: '12px', lineHeight: '1.6' }}>{s.text}</p>}
                      {s.items?.map((item: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '5px 0 0 0', color: 'rgba(255,255,255,0.65)', fontSize: '12px', lineHeight: '1.5' }}>• {item}</p>)}
                    </div>
                  ))}
                </div>
                {(aiReport.risks?.length > 0 || aiReport.tax_notes?.length > 0) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    {aiReport.risks?.length > 0 && (
                      <div style={{ background: 'rgba(193,18,31,0.06)', border: '1px solid rgba(193,18,31,0.2)', borderRadius: '8px', padding: '1rem' }}>
                        <p style={{ margin: '0 0 0.75rem 0', color: '#C1121F', fontSize: '13px', fontWeight: '600' }}>⚠️ Risks</p>
                        {aiReport.risks.map((r: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '5px 0 0 0', color: 'rgba(255,255,255,0.65)', fontSize: '12px' }}>• {r}</p>)}
                      </div>
                    )}
                    {aiReport.tax_notes?.length > 0 && (
                      <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '1rem' }}>
                        <p style={{ margin: '0 0 0.75rem 0', color: '#C9A84C', fontSize: '13px', fontWeight: '600' }}>🧾 Tax Notes</p>
                        {aiReport.tax_notes.map((n: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '5px 0 0 0', color: 'rgba(255,255,255,0.65)', fontSize: '12px' }}>• {n}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
