'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

const TABS = ['Overview', 'Transactions', 'Categories', 'From Documents'];

export default function PersonalBudget() {
  const [tab, setTab] = useState('Overview');
  const [categories, setCategories] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTxForm, setShowTxForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [gettingInsight, setGettingInsight] = useState(false);

  const [txForm, setTxForm] = useState({ description: '', amount: '', type: 'expense' as 'income'|'expense', category_name: '', date: new Date().toISOString().split('T')[0] });
  const [catForm, setCatForm] = useState({ name: '', type: 'expense' as 'income'|'expense', budgeted_amount: '', color: '#C9A84C', icon: '💰' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [cr, tr, dr] = await Promise.all([
      supabase.from('personal_budget_categories').select('*').order('type').order('name'),
      supabase.from('personal_transactions').select('*').order('date', { ascending: false }),
      supabase.from('budget_documents').select('*').order('uploaded_at', { ascending: false }),
    ]);
    if (cr.data) setCategories(cr.data);
    if (tr.data) setTransactions(tr.data);
    if (dr.data) setDocuments(dr.data);
    setLoading(false);
  };

  const addTransaction = async () => {
    if (!txForm.description || !txForm.amount) return;
    const cat = categories.find(c => c.name === txForm.category_name);
    const { data } = await supabase.from('personal_transactions').insert([{
      description: txForm.description,
      amount: parseFloat(txForm.amount),
      type: txForm.type,
      category_name: txForm.category_name || 'Uncategorized',
      category_id: cat?.id || null,
      date: txForm.date,
      source: 'manual',
    }]).select();
    if (data) {
      setTransactions([data[0], ...transactions]);
      setTxForm({ description: '', amount: '', type: 'expense', category_name: '', date: new Date().toISOString().split('T')[0] });
      setShowTxForm(false);
    }
  };

  const addCategory = async () => {
    if (!catForm.name) return;
    const { data } = await supabase.from('personal_budget_categories').insert([{
      name: catForm.name, type: catForm.type,
      budgeted_amount: parseFloat(catForm.budgeted_amount) || 0,
      color: catForm.color, icon: catForm.icon,
    }]).select();
    if (data) { setCategories([...categories, data[0]]); setShowCatForm(false); setCatForm({ name: '', type: 'expense', budgeted_amount: '', color: '#C9A84C', icon: '💰' }); }
  };

  const deleteTransaction = async (id: string) => {
    await supabase.from('personal_transactions').delete().eq('id', id);
    setTransactions(transactions.filter(t => t.id !== id));
  };

  // Import transactions from a document into personal budget
  const importFromDocument = async (doc: any) => {
    setImporting(doc.id);
    setImportMsg('');
    try {
      const txs = doc.transactions || [];
      if (txs.length === 0) { setImportMsg('No transactions found in this document.'); setImporting(null); return; }

      const inserts = txs.map((tx: any) => ({
        description: tx.description || 'Imported transaction',
        amount: Math.abs(tx.amount || 0),
        type: tx.type === 'credit' ? 'income' : 'expense',
        category_name: tx.type === 'credit' ? 'Other Income' : 'Uncategorized',
        date: tx.date || doc.uploaded_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        source: `document:${doc.file_name}`,
        source_doc_id: doc.id,
      }));

      const { data } = await supabase.from('personal_transactions').insert(inserts).select();
      if (data) {
        setTransactions(prev => [...data, ...prev]);
        setImportMsg(`✅ Imported ${data.length} transactions from ${doc.file_name}`);
        // Mark document as including personal data
        await supabase.from('budget_documents').update({ budget_type: 'both' }).eq('id', doc.id);
      }
    } catch (e) {
      setImportMsg('Import failed. Try again.');
    }
    setImporting(null);
    setTimeout(() => setImportMsg(''), 5000);
  };

  const getAIInsight = async () => {
    setGettingInsight(true);
    try {
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
      const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
      const catSpend: Record<string, number> = {};
      transactions.filter(t => t.type === 'expense').forEach(t => { catSpend[t.category_name] = (catSpend[t.category_name] || 0) + parseFloat(t.amount); });
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a personal finance advisor. Give direct, actionable advice in 3-4 sentences. Be specific. No fluff.',
          messages: [{ role: 'user', content: `Personal budget snapshot: Income $${totalIncome.toFixed(0)}, Expenses $${totalExpenses.toFixed(0)}, Net $${(totalIncome - totalExpenses).toFixed(0)}. Category breakdown: ${JSON.stringify(catSpend)}. Budgeted categories: ${JSON.stringify(categories.filter(c => c.budgeted_amount > 0).map(c => ({ name: c.name, budget: c.budgeted_amount })))}. Give specific personal finance advice for this person's situation.` }]
        })
      });
      const data = await res.json();
      setAiInsight(data.content?.find((c: any) => c.type === 'text')?.text || '');
    } catch { setAiInsight('Could not load insight.'); }
    setGettingInsight(false);
  };

  // Computed
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
  const net = totalIncome - totalExpenses;
  const totalBudgeted = categories.filter(c => c.type === 'expense').reduce((s, c) => s + parseFloat(c.budgeted_amount || 0), 0);

  const spendByCategory: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => { spendByCategory[t.category_name] = (spendByCategory[t.category_name] || 0) + parseFloat(t.amount); });

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  return (
    <Layout activeTab="personal-budget">
      <div style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Personal Budget</h2>
              <span style={{ padding: '3px 10px', background: 'rgba(155,93,229,0.2)', border: '1px solid rgba(155,93,229,0.4)', borderRadius: '20px', fontSize: '11px', color: '#9B5DE5', fontWeight: '600' }}>PERSONAL</span>
            </div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Separate from business — your personal finances, imported from documents or entered manually</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={getAIInsight} disabled={gettingInsight}
              style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #9B5DE5, #2A9D8F)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {gettingInsight ? '🔮 Analyzing...' : '🔮 AI Advice'}
            </button>
            <button className="btn-primary" onClick={() => setShowTxForm(true)}
              style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              + Add Transaction
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Personal Income', value: `$${totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#2A9D8F' },
            { label: 'Personal Expenses', value: `$${totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C1121F' },
            { label: 'Net Personal', value: `${net >= 0 ? '+' : ''}$${Math.abs(net).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: net >= 0 ? '#2A9D8F' : '#C1121F' },
            { label: 'Monthly Budgeted', value: `$${totalBudgeted.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#9B5DE5' },
          ].map(m => (
            <div key={m.label} className="card-hover" style={card}>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: '700', color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* AI Insight */}
        {aiInsight && (
          <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(155,93,229,0.4)', background: 'rgba(155,93,229,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
              <span>🔮</span>
              <p style={{ margin: 0, color: '#9B5DE5', fontSize: '13px', fontWeight: '600' }}>AI Personal Finance Advice</p>
            </div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.7' }}>{aiInsight}</p>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: tab === t ? '600' : '400', color: tab === t ? '#C9A84C' : 'rgba(255,255,255,0.45)', borderBottom: tab === t ? '2px solid #C9A84C' : '2px solid transparent', marginBottom: '-1px', fontFamily: 'Poppins, sans-serif' }}>
              {t}
            </button>
          ))}
        </div>

        {/* Add Transaction Form */}
        {showTxForm && (
          <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(155,93,229,0.4)' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '15px', fontWeight: '600' }}>Add Personal Transaction</h3>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              {(['expense', 'income'] as const).map(type => (
                <button key={type} onClick={() => setTxForm({ ...txForm, type })} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${txForm.type === type ? (type === 'expense' ? '#C1121F' : '#2A9D8F') : 'rgba(255,255,255,0.1)'}`, background: txForm.type === type ? (type === 'expense' ? 'rgba(193,18,31,0.15)' : 'rgba(42,157,143,0.15)') : 'transparent', color: txForm.type === type ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'Poppins, sans-serif' }}>
                  {type === 'expense' ? '📤 Expense' : '📥 Income'}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ gridColumn: 'span 2' }}><label>Description</label><input value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} placeholder="Rent payment, salary, groceries..." /></div>
              <div><label>Amount ($)</label><input type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} placeholder="0.00" /></div>
              <div><label>Date</label><input type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} /></div>
              <div style={{ gridColumn: 'span 2' }}>
                <label>Category</label>
                <select value={txForm.category_name} onChange={e => setTxForm({ ...txForm, category_name: e.target.value })}>
                  <option value="">— Select Category —</option>
                  {categories.filter(c => c.type === txForm.type).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={addTransaction} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#9B5DE5', color: '#fff', fontWeight: '700', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>Save</button>
              <button onClick={() => setShowTxForm(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {tab === 'Overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Budget vs Actual */}
            <div style={card}>
              <h3 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Budget vs Actual — Expenses</h3>
              {expenseCategories.length === 0 ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No categories yet</p>
                : expenseCategories.map(cat => {
                  const spent = spendByCategory[cat.name] || 0;
                  const budget = parseFloat(cat.budgeted_amount || 0);
                  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                  const over = budget > 0 && spent > budget;
                  return (
                    <div key={cat.id} style={{ marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{cat.icon} {cat.name}</span>
                        <span style={{ fontSize: '12px', color: over ? '#C1121F' : 'rgba(255,255,255,0.5)' }}>
                          ${spent.toFixed(0)} {budget > 0 ? `/ $${budget.toFixed(0)}` : ''}
                          {over && ' ⚠️'}
                        </span>
                      </div>
                      {budget > 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '6px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: over ? '#C1121F' : cat.color || '#9B5DE5', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Income sources */}
            <div style={card}>
              <h3 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Income Sources</h3>
              {transactions.filter(t => t.type === 'income').length === 0
                ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No income recorded. Add transactions or import from documents.</p>
                : (() => {
                    const bySource: Record<string, number> = {};
                    transactions.filter(t => t.type === 'income').forEach(t => { bySource[t.category_name] = (bySource[t.category_name] || 0) + parseFloat(t.amount); });
                    return Object.entries(bySource).sort((a,b) => b[1]-a[1]).map(([name, amt]) => (
                      <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{name}</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#2A9D8F' }}>${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    ));
                  })()}
            </div>
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {tab === 'Transactions' && (
          <div style={card}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>All Personal Transactions ({transactions.length})</h3>
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>💳</div>
                <p style={{ margin: 0 }}>No transactions yet. Add manually or import from uploaded documents.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead><tr style={{ borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
                    {['Date', 'Description', 'Category', 'Type', 'Amount', ''].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.45)', fontSize: '12px', whiteSpace: 'nowrap' }}>{tx.date}</td>
                        <td style={{ padding: '10px 12px', color: '#fff' }}>{tx.description}</td>
                        <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>{tx.category_name}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: tx.type === 'income' ? 'rgba(42,157,143,0.15)' : 'rgba(193,18,31,0.15)', color: tx.type === 'income' ? '#2A9D8F' : '#C1121F' }}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: tx.type === 'income' ? '#2A9D8F' : '#C1121F', fontSize: '14px' }}>
                          {tx.type === 'income' ? '+' : '-'}${parseFloat(tx.amount).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 12px' }}><button onClick={() => deleteTransaction(tx.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '16px' }}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CATEGORIES TAB */}
        {tab === 'Categories' && (
          <div>
            {showCatForm && (
              <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(155,93,229,0.4)' }}>
                <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '15px', fontWeight: '600' }}>New Category</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ gridColumn: 'span 2' }}><label>Category Name</label><input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Dining Out" /></div>
                  <div><label>Type</label><select value={catForm.type} onChange={e => setCatForm({ ...catForm, type: e.target.value as any })}><option value="expense">Expense</option><option value="income">Income</option></select></div>
                  <div><label>Monthly Budget ($)</label><input type="number" value={catForm.budgeted_amount} onChange={e => setCatForm({ ...catForm, budgeted_amount: e.target.value })} placeholder="0" /></div>
                  <div><label>Icon (emoji)</label><input value={catForm.icon} onChange={e => setCatForm({ ...catForm, icon: e.target.value })} placeholder="💰" /></div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn-primary" onClick={addCategory} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#9B5DE5', color: '#fff', fontWeight: '700', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>Add Category</button>
                  <button onClick={() => setShowCatForm(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '15px', fontWeight: '600' }}>Budget Categories ({categories.length})</h3>
              <button className="btn-primary" onClick={() => setShowCatForm(true)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#9B5DE5', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>+ Add Category</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {categories.map(cat => {
                const spent = spendByCategory[cat.name] || 0;
                const budget = parseFloat(cat.budgeted_amount || 0);
                const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                return (
                  <div key={cat.id} className="card-hover" style={{ ...card, borderLeft: `3px solid ${cat.color || '#9B5DE5'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '16px' }}>{cat.icon}</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: cat.type === 'income' ? 'rgba(42,157,143,0.15)' : 'rgba(193,18,31,0.15)', color: cat.type === 'income' ? '#2A9D8F' : '#C1121F', fontWeight: '600' }}>{cat.type}</span>
                    </div>
                    <p style={{ margin: '0 0 2px 0', color: '#fff', fontWeight: '600', fontSize: '14px' }}>{cat.name}</p>
                    {budget > 0 && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0 4px 0' }}>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Spent: ${spent.toFixed(0)}</span>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Budget: ${budget.toFixed(0)}</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#C1121F' : cat.color || '#9B5DE5', borderRadius: '3px' }} />
                        </div>
                      </>
                    )}
                    {budget === 0 && <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>No budget set</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FROM DOCUMENTS TAB */}
        {tab === 'From Documents' && (
          <div>
            <div style={{ padding: '1rem 1.25rem', background: 'rgba(155,93,229,0.07)', border: '1px solid rgba(155,93,229,0.25)', borderRadius: '10px', marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 4px 0', color: '#9B5DE5', fontWeight: '600', fontSize: '13px' }}>📄 Import from Uploaded Documents</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Click "Import to Personal Budget" on any document to pull its transactions into your personal budget. This does not affect your business budget.</p>
            </div>
            {importMsg && <div style={{ padding: '10px 14px', background: 'rgba(42,157,143,0.12)', border: '1px solid rgba(42,157,143,0.3)', borderRadius: '8px', color: '#2A9D8F', fontSize: '13px', marginBottom: '1rem' }}>{importMsg}</div>}
            {documents.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📂</div>
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>No documents uploaded yet. Go to Document Intelligence to upload bank statements or pay stubs.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {documents.map(doc => {
                  const txCount = (doc.transactions || []).length;
                  const alreadyImported = doc.budget_type === 'both' || doc.budget_type === 'personal';
                  return (
                    <div key={doc.id} className="card-hover" style={{ ...card, display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '1rem', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, color: '#fff', fontWeight: '600', fontSize: '14px' }}>{doc.file_name}</p>
                        <p style={{ margin: '2px 0 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                          {doc.doc_type}{doc.period ? ` • ${doc.period}` : ''} • {txCount} transactions
                        </p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Income</p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: '700', color: '#2A9D8F' }}>${parseFloat(doc.total_income || 0).toLocaleString()}</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Expenses</p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: '700', color: '#C1121F' }}>${parseFloat(doc.total_expenses || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        {alreadyImported ? (
                          <span style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(42,157,143,0.15)', color: '#2A9D8F', fontSize: '12px', fontWeight: '600' }}>✅ Imported</span>
                        ) : txCount === 0 ? (
                          <span style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>No transactions</span>
                        ) : (
                          <button className="btn-primary" onClick={() => importFromDocument(doc)} disabled={importing === doc.id}
                            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: importing === doc.id ? 'rgba(155,93,229,0.2)' : '#9B5DE5', color: '#fff', fontWeight: '600', fontSize: '12px', cursor: importing === doc.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: 'Poppins, sans-serif' }}>
                            {importing === doc.id ? '⏳ Importing...' : `📥 Import ${txCount} Transactions`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
