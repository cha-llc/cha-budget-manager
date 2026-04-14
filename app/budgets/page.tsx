// BUILD_V3_PERSONALTOGGLE
'use client';

import React, { useEffect, useState } from 'react';
import { buildPersonalInserts, buildBusinessExpenseInserts } from '@/lib/docRouting';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;
const DIVISIONS = ['Consulting', 'Tea Time Network', 'Digital Tools', 'Books'];

const PERSONAL_DEFAULTS = [
  { name: 'Housing / Rent', icon: '🏠', color: '#C1121F' },
  { name: 'Food & Groceries', icon: '🛒', color: '#f4a261' },
  { name: 'Transportation', icon: '✈️', color: '#2A9D8F' },
  { name: 'Health & Wellness', icon: '💊', color: '#06d6a0' },
  { name: 'Personal Care', icon: '🧴', color: '#9B5DE5' },
  { name: 'Entertainment', icon: '🎬', color: '#C9A84C' },
  { name: 'Savings', icon: '🏦', color: '#2A9D8F' },
  { name: 'Emergency Fund', icon: '🛡️', color: '#3a86ff' },
];

export default function Budgets() {
  const [mode, setMode] = useState<'business' | 'personal'>('business');

  // ── BUSINESS STATE ──
  const [bizBudgets, setBizBudgets] = useState<any[]>([]);
  const [bizExpenses, setBizExpenses] = useState<any[]>([]);
  const [bizForm, setBizForm] = useState({ division: 'Consulting', monthly_budget: '' });
  const [savingBiz, setSavingBiz] = useState(false);
  const [showBizForm, setShowBizForm] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  // ── PERSONAL STATE ──
  const [persCats, setPersCats] = useState<any[]>([]);
  const [persTxs, setPersTxs] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [showPersForm, setShowPersForm] = useState(false);
  const [persForm, setPersForm] = useState({ name: '', budgeted_amount: '', icon: '💰', color: '#C9A84C', type: 'expense' });
  const [importing, setImporting] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState('');
  const [buildingFromDocs, setBuildingFromDocs] = useState(false);
  const [clearConfirm, setClearConfirm] = useState<'idle' | 'confirm' | 'clearing'>('idle');
  const [clearMsg, setClearMsg] = useState('');
  const [buildMsg, setBuildMsg] = useState('');
  const [exportMsg, setExportMsg] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [br, er, cr, tr, dr] = await Promise.all([
      supabase.from('division_budgets').select('*'),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('personal_budget_categories').select('*').order('type').order('name'),
      supabase.from('personal_transactions').select('*').order('date', { ascending: false }),
      supabase.from('budget_documents').select('*').order('uploaded_at', { ascending: false }),
    ]);
    if (br.data) setBizBudgets(br.data);
    if (er.data) setBizExpenses(er.data);
    if (cr.data) setPersCats(cr.data);
    if (tr.data) setPersTxs(tr.data);
    if (dr.data) setDocuments(dr.data);
  };

  // ── BUSINESS ACTIONS ──
  const saveBizBudget = async () => {
    if (!bizForm.monthly_budget) return;
    setSavingBiz(true);
    const { data } = await supabase.from('division_budgets')
      .upsert({ division: bizForm.division, monthly_budget: parseFloat(bizForm.monthly_budget) }).select();
    if (data) { setBizBudgets(bizBudgets.filter(b => b.division !== bizForm.division).concat(data)); setBizForm({ division: 'Consulting', monthly_budget: '' }); setShowBizForm(false); }
    setSavingBiz(false);
  };

  const generateAIBudget = async () => {
    setGenerating(true); setAiSuggestions(null);
    try {
      const spendByDiv: Record<string, Record<string, number>> = {};
      bizExpenses.forEach(e => {
        if (!spendByDiv[e.division]) spendByDiv[e.division] = {};
        spendByDiv[e.division][e.category] = (spendByDiv[e.division][e.category] || 0) + parseFloat(e.amount || 0);
      });
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000,
          system: 'You are a budget planning AI for a multi-division LLC. Return ONLY valid JSON: {"rationale":"string","division_budgets":[{"division":"string","suggested_budget":0,"current_budget":0,"reasoning":"string"}],"total_recommended":0,"reallocation_notes":["string"],"growth_investment":["string"]}. No markdown.',
          messages: [{ role: 'user', content: `Generate AI budget for C.H.A. LLC. Divisions: ${DIVISIONS.join(', ')}. Current budgets: ${JSON.stringify(bizBudgets)}. Spending: ${JSON.stringify(spendByDiv)}. Company in growth mode, just launched 5 products.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      setAiSuggestions(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch { /* silent */ } finally { setGenerating(false); }
  };

  const applyAISuggestion = async (division: string, amount: number) => {
    const { data } = await supabase.from('division_budgets').upsert({ division, monthly_budget: amount }).select();
    if (data) setBizBudgets(bizBudgets.filter(b => b.division !== division).concat(data));
  };

  const exportBizCSV = () => {
    const rows = [['Division', 'Monthly Budget', 'Spent', 'Remaining', 'Utilization']];
    DIVISIONS.forEach(div => {
      const b = bizBudgets.find(b => b.division === div);
      const spent = bizExpenses.filter(e => e.division === div).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
      const budget = parseFloat(b?.monthly_budget || 0);
      rows.push([div, String(budget), spent.toFixed(2), Math.max(0, budget - spent).toFixed(2), budget > 0 ? ((spent / budget) * 100).toFixed(1) + '%' : '0%']);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `cha-business-budget-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    setExportMsg('✅ Exported'); setTimeout(() => setExportMsg(''), 2500);
  };

  // ── PERSONAL ACTIONS ──
  const addPersCat = async () => {
    if (!persForm.name) return;
    const { data } = await supabase.from('personal_budget_categories').insert([{
      name: persForm.name, type: persForm.type,
      budgeted_amount: parseFloat(persForm.budgeted_amount) || 0,
      icon: persForm.icon, color: persForm.color,
    }]).select();
    if (data) { setPersCats([...persCats, data[0]]); setPersForm({ name: '', budgeted_amount: '', icon: '💰', color: '#C9A84C', type: 'expense' }); setShowPersForm(false); }
  };

  const updatePersCatBudget = async (id: string, amount: number) => {
    await supabase.from('personal_budget_categories').update({ budgeted_amount: amount }).eq('id', id);
    setPersCats(persCats.map(c => c.id === id ? { ...c, budgeted_amount: amount } : c));
  };

  // Smart category matcher
  const matchCategory = (description: string, type: 'income' | 'expense'): string => {
    const d = description.toLowerCase();
    if (type === 'income') {
      if (d.includes('salary') || d.includes('payroll') || d.includes('regular pay') || d.includes('wage') || d.includes('net pay') || d.includes('direct deposit')) return 'Salary / Wages';
      if (d.includes('business') || d.includes('consulting') || d.includes('invoice') || d.includes('cha') || d.includes('stripe')) return 'Business Income';
      if (d.includes('freelance') || d.includes('contract')) return 'Freelance';
      if (d.includes('interest') || d.includes('dividend') || d.includes('refund') || d.includes('transfer')) return 'Other Income';
      return 'Other Income';
    } else {
      if (d.includes('rent') || d.includes('housing') || d.includes('mortgage') || d.includes('lease')) return 'Housing / Rent';
      if (d.includes('grocery') || d.includes('food') || d.includes('walmart') || d.includes('kroger') || d.includes('publix') || d.includes('whole foods') || d.includes('trader joe') || d.includes('aldi')) return 'Food & Groceries';
      if (d.includes('uber') || d.includes('lyft') || d.includes('gas') || d.includes('fuel') || d.includes('airline') || d.includes('flight') || d.includes('avianca') || d.includes('transport') || d.includes('parking')) return 'Transportation';
      if (d.includes('medical') || d.includes('dental') || d.includes('vision') || d.includes('health') || d.includes('pharmacy') || d.includes('doctor') || d.includes('hospital') || d.includes('insurance') && (d.includes('health') || d.includes('medical') || d.includes('dental') || d.includes('vision'))) return 'Health & Wellness';
      if (d.includes('netflix') || d.includes('spotify') || d.includes('entertainment') || d.includes('movie') || d.includes('amazon prime') || d.includes('hulu') || d.includes('disney')) return 'Entertainment';
      if (d.includes('savings') || d.includes('save') || d.includes('deposit to savings')) return 'Savings';
      if (d.includes('401k') || d.includes('401(k)') || d.includes('emergency') || d.includes('retirement')) return 'Emergency Fund';
      if (d.includes('federal') || d.includes('state tax') || d.includes('fica') || d.includes('social security') || d.includes('medicare') || d.includes('income tax')) return 'Taxes';
      return 'Personal Care';
    }
  };

  // Import transactions from a document into personal budget
  // Uses shared docRouting library — same logic as documents page
  const importDocToPersonal = async (doc: any) => {
    setImporting(doc.id); setImportMsg('');
    try {
      const inserts = buildPersonalInserts(doc, doc.file_name, doc.id);
      if (!inserts.length) {
        setImportMsg('No importable transactions found in this document.');
        setImporting(null);
        return;
      }
      const { data, error } = await supabase.from('personal_transactions').insert(inserts).select();
      if (error) throw error;
      if (data) {
        setPersTxs(prev => [...data, ...prev]);
        await supabase.from('budget_documents').update({
          budget_type: 'both',
          imported_to_budget: true,
          imported_at: new Date().toISOString(),
        }).eq('id', doc.id);
        const incomeCount = inserts.filter(i => i.type === 'income').length;
        const expenseCount = inserts.filter(i => i.type === 'expense').length;
        setImportMsg(`✅ Imported from "${doc.file_name}": ${incomeCount} income item${incomeCount !== 1 ? 's' : ''}, ${expenseCount} expense item${expenseCount !== 1 ? 's' : ''} — categorized automatically`);
      }
    } catch (e: any) {
      console.error('Import error:', e);
      setImportMsg('Import failed: ' + (e?.message || 'unknown error'));
    }
    setImporting(null);
    setTimeout(() => setImportMsg(''), 8000);
  };

  // Build a full personal budget from ALL uploaded documents via AI
  const buildPersonalBudgetFromDocs = async () => {
    if (!documents.length) { setBuildMsg('No documents uploaded yet. Go to Document Intelligence first.'); return; }
    setBuildingFromDocs(true); setBuildMsg('');
    try {
      // For pay stubs: use net pay (key_figures) not total_income which may be gross
      const getDocNetIncome = (d: any) => {
        const docType = (d.doc_type || '').toLowerCase();
        if (docType.includes('pay') || docType.includes('stub') || docType.includes('paycheck')) {
          const kf = d.key_figures || [];
          const netPayFig = kf.find((k: any) => k.label?.toLowerCase().includes('net pay'));
          if (netPayFig) return parseFloat(netPayFig.value?.replace(/[$,]/g, '') || '0');
          return parseFloat(d.net_cashflow || d.total_income || '0');
        }
        return parseFloat(d.total_income || '0');
      };

      const allTxs = documents.flatMap(d => {
        const docType = (d.doc_type || '').toLowerCase();
        const isPayStub = docType.includes('pay') || docType.includes('stub') || docType.includes('paycheck');
        if (isPayStub) {
          // For pay stubs only send net pay and deductions — not gross
          const kf = d.key_figures || [];
          const netPayFig = kf.find((k: any) => k.label?.toLowerCase().includes('net pay'));
          const netPay = netPayFig ? parseFloat(netPayFig.value?.replace(/[$,]/g, '') || '0') : parseFloat(d.net_cashflow || '0');
          const deductions = (d.transactions || []).filter((t: any) => t.type === 'debit');
          return [{ description: 'Net Pay', amount: netPay, type: 'credit', doc: d.file_name, period: d.period }, ...deductions.map((t: any) => ({ ...t, doc: d.file_name, period: d.period }))];
        }
        return (d.transactions || []).map((t: any) => ({ ...t, doc: d.file_name, period: d.period }));
      });
      const totalIncome = documents.reduce((s, d) => s + getDocNetIncome(d), 0);
      const totalExpenses = documents.reduce((s, d) => s + parseFloat(d.total_expenses || 0), 0);
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000,
          system: 'You are a personal finance AI. Return ONLY valid JSON: {"summary":"string","category_budgets":[{"name":"string","type":"income|expense","suggested_amount":0,"icon":"emoji","reasoning":"string"}],"monthly_income_estimate":0,"monthly_expense_estimate":0,"savings_rate":"string","insights":["string"]}. Base it strictly on the actual document data provided. No markdown.',
          messages: [{ role: 'user', content: `Build a personal budget from these uploaded financial documents. Total income across all docs: $${totalIncome.toFixed(2)}. Total expenses: $${totalExpenses.toFixed(2)}. Transactions sample: ${JSON.stringify(allTxs.slice(0, 40))}. Documents: ${documents.length} total. Create realistic monthly budget categories based on the actual spending patterns visible in the data.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      const result = JSON.parse(text.replace(/```json|```/g, '').trim());

      // Upsert each suggested category
      let added = 0;
      for (const cat of result.category_budgets || []) {
        const existing = persCats.find(c => c.name.toLowerCase() === cat.name.toLowerCase());
        if (existing) {
          await supabase.from('personal_budget_categories').update({ budgeted_amount: cat.suggested_amount }).eq('id', existing.id);
        } else {
          await supabase.from('personal_budget_categories').insert([{
            name: cat.name, type: cat.type,
            budgeted_amount: cat.suggested_amount,
            icon: cat.icon || '💰', color: cat.type === 'income' ? '#2A9D8F' : '#C9A84C',
          }]);
          added++;
        }
      }
      await loadAll();
      setBuildMsg(`✅ Personal budget built from ${documents.length} document${documents.length !== 1 ? 's' : ''}. ${added} new categories created. ${result.summary}`);
    } catch (e: any) {
      setBuildMsg('Could not build budget. Make sure you have uploaded documents first.');
    } finally { setBuildingFromDocs(false); }
  };

  // Clear all documents + personal transactions — fresh start
  const clearAllData = async () => {
    setClearConfirm('clearing');
    try {
      // Delete all personal transactions from document imports
      await supabase.from('personal_transactions')
        .delete()
        .like('source', 'document:%');
      // Delete all budget documents
      await supabase.from('budget_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // Reset personal budget categories budgeted amounts to 0
      await supabase.from('personal_budget_categories')
        .update({ budgeted_amount: 0 })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      // Reload everything
      await loadAll();
      setClearMsg('✅ All documents and imported transactions cleared. Ready for fresh data.');
      setClearConfirm('idle');
      setTimeout(() => setClearMsg(''), 8000);
    } catch (e: any) {
      setClearMsg('❌ Clear failed: ' + (e?.message || 'unknown error'));
      setClearConfirm('idle');
    }
  };

  // ── COMPUTED ──
  const getBizDivData = (div: string) => {
    const b = bizBudgets.find(b => b.division === div);
    const spent = bizExpenses.filter(e => e.division === div).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const budget = parseFloat(b?.monthly_budget || 0);
    const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
    const color = pct > 90 ? '#C1121F' : pct > 70 ? '#C9A84C' : '#2A9D8F';
    return { budget, spent, remaining: Math.max(0, budget - spent), pct, color, status: pct > 90 ? '🔴 Over Budget' : pct > 70 ? '🟡 Watch' : '🟢 On Track' };
  };

  const totalBizBudget = bizBudgets.reduce((s, b) => s + parseFloat(b.monthly_budget || 0), 0);
  const totalBizSpent = bizExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const spendByPersCat: Record<string, number> = {};
  persTxs.filter(t => t.type === 'expense').forEach(t => { spendByPersCat[t.category_name] = (spendByPersCat[t.category_name] || 0) + parseFloat(t.amount || 0); });
  const totalPersIncome = persTxs.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalPersExpenses = persTxs.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalPersBudgeted = persCats.filter(c => c.type === 'expense').reduce((s, c) => s + parseFloat(c.budgeted_amount || 0), 0);

  return (
    <Layout activeTab="budgets">
      <div style={{ maxWidth: '1200px' }}>

        {/* Header + Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Budget Management</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              {mode === 'business' ? 'C.H.A. LLC business budgets across all four divisions' : 'Your personal budget — separate from business, built from your documents'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '4px' }}>
            {(['business', 'personal'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '10px 22px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: mode === m ? (m === 'business' ? '#C9A84C' : '#9B5DE5') : 'transparent',
                color: mode === m ? (m === 'business' ? '#1A1A2E' : '#fff') : 'rgba(255,255,255,0.5)',
                fontWeight: mode === m ? '700' : '400', fontSize: '13px', fontFamily: 'Poppins,sans-serif',
                transition: 'all 0.2s',
              }}>
                {m === 'business' ? '🏢 Business Budget' : '🧾 Personal Budget'}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════ BUSINESS MODE ═══════════════════════════════════════ */}
        {mode === 'business' && (
          <div>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Total Monthly Budget', value: `$${totalBizBudget.toLocaleString()}`, color: '#C9A84C' },
                { label: 'Total Expenses', value: `$${totalBizSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C1121F' },
                { label: 'Budget Utilization', value: totalBizBudget > 0 ? `${((totalBizSpent / totalBizBudget) * 100).toFixed(0)}%` : '0%', color: '#2A9D8F' },
              ].map(m => (
                <div key={m.label} className="card-hover" style={card}>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '28px', fontWeight: '700', color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {exportMsg && <span style={{ color: '#2A9D8F', fontSize: '13px', alignSelf: 'center' }}>{exportMsg}</span>}
              <button className="btn-primary" onClick={exportBizCSV} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.4)', background: 'transparent', color: '#C9A84C', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>📥 Export CSV</button>
              <button className="btn-primary" onClick={generateAIBudget} disabled={generating} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #9B5DE5, #2A9D8F)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                {generating ? '🤖 Generating...' : '🤖 AI Generate Budgets'}
              </button>
              <button className="btn-primary" onClick={() => setShowBizForm(!showBizForm)} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>+ Set Budget</button>
            </div>

            {/* Set Budget Form */}
            {showBizForm && (
              <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(201,168,76,0.5)' }}>
                <h3 style={{ margin: '0 0 1.25rem 0', color: '#C9A84C', fontSize: '15px', fontWeight: '600' }}>Set Division Budget</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
                  <div><label>Division</label><select value={bizForm.division} onChange={e => setBizForm({ ...bizForm, division: e.target.value })}>{DIVISIONS.map(d => <option key={d}>{d}</option>)}</select></div>
                  <div><label>Monthly Budget ($)</label><input type="number" value={bizForm.monthly_budget} onChange={e => setBizForm({ ...bizForm, monthly_budget: e.target.value })} placeholder="5000" /></div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn-primary" onClick={saveBizBudget} disabled={savingBiz} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>{savingBiz ? 'Saving...' : 'Save'}</button>
                    <button onClick={() => setShowBizForm(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Division Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {DIVISIONS.map(div => {
                const d = getBizDivData(div);
                return (
                  <div key={div} className="card-hover" style={{ ...card, borderLeft: `3px solid ${d.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '600' }}>{div}</h3>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: `${d.color}20`, color: d.color, fontWeight: '600' }}>{d.status}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: d.color }}>{d.pct.toFixed(0)}%</p>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>utilized</p>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '4px', height: '8px', marginBottom: '1rem', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${d.pct}%`, background: d.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      {[{ label: 'Budget', value: `$${d.budget.toLocaleString()}`, color: '#C9A84C' }, { label: 'Spent', value: `$${d.spent.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C1121F' }, { label: 'Remaining', value: `$${d.remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#2A9D8F' }].map(m => (
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

            {/* AI Suggestions */}
            {generating && <div style={{ ...card, textAlign: 'center', padding: '2.5rem' }}><p style={{ color: '#9B5DE5', fontWeight: '600', margin: 0 }}>🤖 Analyzing spending history and generating optimized budgets...</p></div>}
            {aiSuggestions && (
              <div style={card}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#9B5DE5', fontSize: '16px', fontWeight: '600' }}>🤖 AI Budget Recommendations</h3>
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.2)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: '1.6' }}>{aiSuggestions.rationale}</p>
                </div>
                {aiSuggestions.division_budgets?.map((d: any) => (
                  <div key={d.division} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                    <div>
                      <p style={{ margin: 0, color: '#fff', fontWeight: '600', fontSize: '14px' }}>{d.division}</p>
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>{d.reasoning}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Suggested</p>
                        <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#9B5DE5' }}>${d.suggested_budget?.toLocaleString()}</p>
                      </div>
                      <button className="btn-primary" onClick={() => applyAISuggestion(d.division, d.suggested_budget)}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'rgba(155,93,229,0.25)', color: '#9B5DE5', fontWeight: '600', fontSize: '12px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>Apply</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════ PERSONAL MODE ═══════════════════════════════════════ */}
        {mode === 'personal' && (
          <div>
            {/* Personal KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Personal Income', value: `$${totalPersIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#2A9D8F' },
                { label: 'Personal Expenses', value: `$${totalPersExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C1121F' },
                { label: 'Net Personal', value: `${(totalPersIncome - totalPersExpenses) >= 0 ? '+' : ''}$${Math.abs(totalPersIncome - totalPersExpenses).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: totalPersIncome >= totalPersExpenses ? '#2A9D8F' : '#C1121F' },
                { label: 'Total Budgeted', value: `$${totalPersBudgeted.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#9B5DE5' },
              ].map(m => (
                <div key={m.label} className="card-hover" style={card}>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: '700', color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Build from Documents — the main feature */}
            <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(155,93,229,0.4)', background: 'rgba(155,93,229,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#9B5DE5', fontSize: '16px', fontWeight: '700' }}>📄 Build Personal Budget from Your Documents</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                    AI analyzes your {documents.length} uploaded document{documents.length !== 1 ? 's' : ''} and creates a personal budget based on your actual spending patterns
                  </p>
                </div>
                <button className="btn-primary" onClick={buildPersonalBudgetFromDocs} disabled={buildingFromDocs || documents.length === 0}
                  style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: buildingFromDocs || documents.length === 0 ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #9B5DE5, #2A9D8F)', color: buildingFromDocs || documents.length === 0 ? 'rgba(255,255,255,0.3)' : '#fff', fontWeight: '700', fontSize: '13px', cursor: buildingFromDocs || documents.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif', whiteSpace: 'nowrap' }}>
                  {buildingFromDocs ? '🔮 Building...' : documents.length === 0 ? 'Upload Docs First' : `🔮 Build from ${documents.length} Doc${documents.length !== 1 ? 's' : ''}`}
                </button>
              </div>
              {buildMsg && (
                <div style={{ padding: '10px 14px', background: buildMsg.startsWith('✅') ? 'rgba(42,157,143,0.12)' : 'rgba(193,18,31,0.12)', border: `1px solid ${buildMsg.startsWith('✅') ? 'rgba(42,157,143,0.35)' : 'rgba(193,18,31,0.35)'}`, borderRadius: '8px', color: buildMsg.startsWith('✅') ? '#2A9D8F' : '#ff6b6b', fontSize: '13px', lineHeight: '1.5' }}>
                  {buildMsg}
                </div>
              )}
              {documents.length === 0 && (
                <p style={{ margin: '0.75rem 0 0 0', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                  No documents yet — go to <strong style={{ color: '#C9A84C' }}>Document Intelligence</strong> to upload bank statements or pay stubs first.
                </p>
              )}
            </div>

            {/* Import individual document + Clear All */}
            {documents.length > 0 && (
              <div style={{ ...card, marginBottom: '1.5rem' }}>
                {/* Section header with Clear All button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '15px', fontWeight: '600' }}>📥 Import Transactions from a Specific Document</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {clearConfirm === 'idle' && (
                      <button onClick={() => setClearConfirm('confirm')}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(193,18,31,0.4)', background: 'transparent', color: '#C1121F', fontWeight: '600', fontSize: '12px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                        🗑️ Clear All & Start Fresh
                      </button>
                    )}
                    {clearConfirm === 'confirm' && (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#f4a261' }}>⚠️ This deletes all docs + imported transactions. Sure?</span>
                        <button onClick={clearAllData}
                          style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#C1121F', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                          Yes, Clear Everything
                        </button>
                        <button onClick={() => setClearConfirm('idle')}
                          style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                          Cancel
                        </button>
                      </div>
                    )}
                    {clearConfirm === 'clearing' && (
                      <span style={{ fontSize: '12px', color: '#C9A84C' }}>⏳ Clearing...</span>
                    )}
                  </div>
                </div>
                {clearMsg && <div style={{ padding: '10px 14px', background: clearMsg.startsWith('✅') ? 'rgba(42,157,143,0.1)' : 'rgba(193,18,31,0.1)', border: `1px solid ${clearMsg.startsWith('✅') ? 'rgba(42,157,143,0.3)' : 'rgba(193,18,31,0.3)'}`, borderRadius: '8px', color: clearMsg.startsWith('✅') ? '#2A9D8F' : '#C1121F', fontSize: '13px', marginBottom: '1rem' }}>{clearMsg}</div>}
                {importMsg && <div style={{ padding: '10px 14px', background: 'rgba(42,157,143,0.1)', border: '1px solid rgba(42,157,143,0.3)', borderRadius: '8px', color: '#2A9D8F', fontSize: '13px', marginBottom: '1rem' }}>{importMsg}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {documents.map(doc => {
                    const txCount = (doc.transactions || []).length;
                    const imported = doc.imported_to_budget === true;
                    // Income display: use net pay for pay stubs
                    const dt = (doc.doc_type || '').toLowerCase();
                    const isPayStub = dt.includes('pay') || dt.includes('stub') || dt.includes('paycheck');
                    const incomeDisplay = isPayStub
                      ? (() => { const kf = doc.key_figures || []; const nf = kf.find((k: any) => k.label?.toLowerCase().includes('net pay')); return parseFloat(nf?.value?.replace(/[$,]/g,'') || doc.net_cashflow || doc.total_income || '0'); })()
                      : parseFloat(doc.total_income || 0);
                    return (
                      <div key={doc.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '1rem', alignItems: 'center', padding: '0.85rem 1rem', background: imported ? 'rgba(42,157,143,0.04)' : 'rgba(255,255,255,0.03)', borderRadius: '8px', border: `1px solid ${imported ? 'rgba(42,157,143,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                        <div>
                          <p style={{ margin: 0, color: '#fff', fontWeight: '500', fontSize: '13px' }}>{doc.file_name}</p>
                          <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                            {doc.doc_type}{doc.period ? ` • ${doc.period}` : ''} • {txCount} transaction{txCount !== 1 ? 's' : ''}
                            {imported && doc.imported_at && <span style={{ color: 'rgba(42,157,143,0.6)', marginLeft: '6px' }}>• imported {new Date(doc.imported_at).toLocaleDateString()}</span>}
                          </p>
                        </div>
                        <span style={{ fontSize: '13px', color: '#2A9D8F', fontWeight: '600', whiteSpace: 'nowrap' }}>+${incomeDisplay.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                        <span style={{ fontSize: '13px', color: '#C1121F', fontWeight: '600', whiteSpace: 'nowrap' }}>-${parseFloat(doc.total_expenses || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                        {imported ? (
                          <span style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(42,157,143,0.12)', color: '#2A9D8F', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>✅ Imported</span>
                        ) : txCount === 0 ? (
                          <span style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', fontSize: '12px', whiteSpace: 'nowrap' }}>No transactions</span>
                        ) : (
                          <button onClick={() => importDocToPersonal(doc)} disabled={importing === doc.id}
                            style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: importing === doc.id ? 'rgba(155,93,229,0.15)' : '#9B5DE5', color: '#fff', fontWeight: '600', fontSize: '12px', cursor: importing === doc.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: 'Poppins,sans-serif' }}>
                            {importing === doc.id ? '⏳ Importing...' : `Import ${txCount}`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Budget Categories grid */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '15px', fontWeight: '600' }}>Budget Categories ({persCats.length})</h3>
              <button className="btn-primary" onClick={() => setShowPersForm(!showPersForm)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#9B5DE5', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>+ Add Category</button>
            </div>

            {showPersForm && (
              <div style={{ ...card, marginBottom: '1rem', borderColor: 'rgba(155,93,229,0.4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ gridColumn: 'span 2' }}><label>Category Name</label><input value={persForm.name} onChange={e => setPersForm({ ...persForm, name: e.target.value })} placeholder="e.g. Dining Out" /></div>
                  <div><label>Type</label><select value={persForm.type} onChange={e => setPersForm({ ...persForm, type: e.target.value })}><option value="expense">Expense</option><option value="income">Income</option></select></div>
                  <div><label>Monthly Budget ($)</label><input type="number" value={persForm.budgeted_amount} onChange={e => setPersForm({ ...persForm, budgeted_amount: e.target.value })} placeholder="0" /></div>
                  <div><label>Icon (emoji)</label><input value={persForm.icon} onChange={e => setPersForm({ ...persForm, icon: e.target.value })} placeholder="💰" style={{ maxWidth: '80px !important' }} /></div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn-primary" onClick={addPersCat} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#9B5DE5', color: '#fff', fontWeight: '700', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>Add</button>
                  <button onClick={() => setShowPersForm(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {persCats.map(cat => {
                const spent = spendByPersCat[cat.name] || 0;
                const budget = parseFloat(cat.budgeted_amount || 0);
                const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                const over = budget > 0 && spent > budget;
                return (
                  <div key={cat.id} className="card-hover" style={{ ...card, borderLeft: `3px solid ${cat.color || '#9B5DE5'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                        <p style={{ margin: 0, color: '#fff', fontWeight: '600', fontSize: '13px' }}>{cat.name}</p>
                      </div>
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', background: cat.type === 'income' ? 'rgba(42,157,143,0.15)' : 'rgba(193,18,31,0.12)', color: cat.type === 'income' ? '#2A9D8F' : '#C1121F', fontWeight: '600' }}>{cat.type}</span>
                    </div>
                    {budget > 0 ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0 4px 0' }}>
                          <span style={{ fontSize: '12px', color: over ? '#C1121F' : 'rgba(255,255,255,0.4)' }}>${spent.toFixed(0)} spent{over ? ' ⚠️' : ''}</span>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>${budget.toFixed(0)} budget</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: over ? '#C1121F' : (cat.color || '#9B5DE5'), borderRadius: '3px', transition: 'width 0.4s ease' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                          <input type="number" defaultValue={budget} onBlur={e => updatePersCatBudget(cat.id, parseFloat(e.target.value) || 0)} style={{ fontSize: '12px !important', padding: '4px 8px !important' }} />
                        </div>
                      </>
                    ) : (
                      <div style={{ marginTop: '6px' }}>
                        <input type="number" placeholder="Set budget amount" onBlur={e => { if (e.target.value) updatePersCatBudget(cat.id, parseFloat(e.target.value)); }} style={{ fontSize: '12px !important', padding: '4px 8px !important' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
