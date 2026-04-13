// BUILD_V3_MULTIUPLOAD
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

const DOC_TYPES = [
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'paycheck_stub', label: 'Paycheck / Pay Stub' },
  { value: 'receipt', label: 'Receipt / Invoice' },
  { value: 'tax_form', label: 'Tax Form (W2, 1099)' },
  { value: 'investment', label: 'Investment Statement' },
  { value: 'utility_bill', label: 'Utility Bill' },
];

interface QueuedFile {
  id: string;
  file: File;
  docType: string;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  result?: any;
  error?: string;
}

const AI_SYSTEM = `You are a precise financial document analyst. Extract ALL financial data accurately.

CRITICAL RULES FOR EACH DOCUMENT TYPE:

PAY STUB / PAYCHECK:
- total_income = NET PAY (the actual take-home amount after all deductions). This is the "Net Pay", "Net Amount", or "Amount Paid" field.
- total_expenses = total deductions (federal tax + state tax + FICA + social security + medicare + health insurance + 401k + all other withholdings combined)
- net_cashflow = total_income (net pay)
- transactions: one credit entry for NET PAY amount, then debit entries for each individual deduction line (Federal Tax, State Tax, Social Security, Medicare, Health Insurance, 401k, etc.)
- key_figures MUST include: Gross Pay, Net Pay (clearly labeled), Pay Period, YTD Gross, YTD Net, each deduction amount

BANK STATEMENT:
- total_income = sum of ALL deposits, credits, and incoming transfers
- total_expenses = sum of ALL withdrawals, debits, charges, and outgoing payments
- net_cashflow = total_income - total_expenses
- transactions: every line item with date, description, amount, type (credit=deposit/income, debit=withdrawal/charge)
- key_figures: Opening Balance, Closing Balance, Total Deposits, Total Withdrawals

RECEIPT / INVOICE:
- total_expenses = total amount paid (including tax)
- total_income = 0
- net_cashflow = -total_expenses
- transactions: one debit entry for the total, itemized lines if visible
- key_figures: subtotal, tax amount, total paid, merchant name

TAX FORM (W2, 1099):
- total_income = Box 1 wages (W2) or total compensation (1099)
- total_expenses = total taxes withheld
- key_figures: all box values clearly labeled

GENERAL RULES (ALL DOCUMENTS):
1. Return ONLY a valid JSON object. No text before or after. No markdown fences.
2. Amounts must be plain numbers only — no $ signs, no commas (e.g. 1234.56 not $1,234.56).
3. Dates in YYYY-MM-DD format where possible.
4. NEVER confuse gross pay with net pay on pay stubs. Net pay is ALWAYS less than gross pay.
5. If a value is unclear, read it carefully again before estimating.
6. period = pay period dates or statement period (e.g. "2025-11-01 to 2025-11-15").

Return this exact JSON:
{"doc_type":"string","period":"string","summary":"string","key_figures":[{"label":"string","value":"string","category":"income|expense|balance|other"}],"transactions":[{"date":"string","description":"string","amount":0,"type":"credit|debit"}],"tax_relevant":["string"],"alerts":["string"],"total_income":0,"total_expenses":0,"net_cashflow":0}`;

export default function Documents() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [defaultDocType, setDefaultDocType] = useState('bank_statement');
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeView, setActiveView] = useState<'upload' | 'history'>('upload');

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase.from('budget_documents').select('*').order('uploaded_at', { ascending: false });
    if (data) setHistory(data);
    setLoadingHistory(false);
  };

  // Bulletproof file adder — takes a plain JS array, never a FileList
  const addFilesFromArray = useCallback((files: File[], docType: string) => {
    const valid = files.filter(f =>
      f.type === 'application/pdf' ||
      f.type === 'image/png' ||
      f.type === 'image/jpeg' ||
      f.type === 'image/jpg' ||
      /\.(pdf|png|jpg|jpeg)$/i.test(f.name)
    );
    if (valid.length === 0) return;
    const items: QueuedFile[] = valid.map(f => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
      docType,
      status: 'pending',
    }));
    setQueue(prev => [...prev, ...items]);
  }, []);

  // Hidden input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    // Snapshot to plain array IMMEDIATELY — before any resets
    const snapshot: File[] = [];
    for (let i = 0; i < e.target.files.length; i++) {
      snapshot.push(e.target.files[i]);
    }
    addFilesFromArray(snapshot, defaultDocType);
    // Reset input after delay so same files can be re-selected
    const target = e.target;
    setTimeout(() => { target.value = ''; }, 200);
  };

  // Drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    const snapshot: File[] = [];
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      snapshot.push(e.dataTransfer.files[i]);
    }
    addFilesFromArray(snapshot, defaultDocType);
  };

  const updateItem = (id: string, updates: Partial<QueuedFile>) =>
    setQueue(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));

  const analyzeFile = async (item: QueuedFile) => {
    updateItem(item.id, { status: 'analyzing' });
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(item.file);
      });

      const isPdf = item.file.type === 'application/pdf' || item.file.name.toLowerCase().endsWith('.pdf');
      const mediaType = isPdf ? 'application/pdf' : (item.file.type || 'image/jpeg');
      const docLabel = DOC_TYPES.find(d => d.value === item.docType)?.label || item.docType;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: AI_SYSTEM,
          messages: [{
            role: 'user',
            content: [
              { type: isPdf ? 'document' : 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: `This document is a ${docLabel}. ${
                item.docType === 'paycheck_stub'
                  ? 'IMPORTANT: Find the NET PAY (take-home amount after all deductions) and use that as total_income. Do NOT use gross pay as total_income. List every deduction line individually as a debit transaction.'
                  : item.docType === 'bank_statement'
                  ? 'Extract every single transaction. Credits are deposits/income. Debits are withdrawals/charges. Calculate totals accurately.'
                  : item.docType === 'tax_form'
                  ? 'Extract all box values. Use Box 1 (W2) or total compensation (1099) as total_income. Total taxes withheld as total_expenses.'
                  : item.docType === 'receipt'
                  ? 'The total amount paid is total_expenses. Itemize all line items as debit transactions.'
                  : 'Extract all financial figures accurately.'
              } Be precise with every number.` }
            ]
          }]
        })
      });

      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      if (!text) throw new Error('No response from AI');

      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

      // Save to Supabase
      await supabase.from('budget_documents').insert([{
        file_name: item.file.name,
        file_size_kb: parseFloat((item.file.size / 1024).toFixed(1)),
        doc_type: parsed.doc_type || docLabel,
        period: parsed.period || '',
        summary: parsed.summary || '',
        key_figures: parsed.key_figures || [],
        transactions: parsed.transactions || [],
        tax_relevant: parsed.tax_relevant || [],
        alerts: parsed.alerts || [],
        raw_ai_response: parsed,
        total_income: parsed.total_income || 0,
        total_expenses: parsed.total_expenses || 0,
        net_cashflow: parsed.net_cashflow || 0,
      }]);

      // Auto-add transactions to expenses/revenue tables
      const credits = (parsed.transactions || []).filter((t: any) => t.type === 'credit');
      const debits = (parsed.transactions || []).filter((t: any) => t.type === 'debit');
      if (credits.length > 0) {
        await supabase.from('revenue').insert(credits.map((t: any) => ({
          product_name: t.description || 'Document Import',
          amount: Math.abs(parseFloat(t.amount) || 0),
          source: parsed.doc_type || docLabel,
          date: t.date || new Date().toISOString().split('T')[0],
        })));
      }
      if (debits.length > 0) {
        await supabase.from('expenses').insert(debits.map((t: any) => ({
          division: 'Consulting',
          category: 'Other',
          amount: Math.abs(parseFloat(t.amount) || 0),
          description: t.description || 'Document Import',
          date: t.date || new Date().toISOString().split('T')[0],
        })));
      }

      updateItem(item.id, { status: 'done', result: parsed });
    } catch (err: any) {
      console.error('Doc analysis error:', err);
      updateItem(item.id, { status: 'error', error: err?.message || 'Analysis failed. Try a clearer image or PDF.' });
    }
  };

  const analyzeAll = async () => {
    const pending = queue.filter(q => q.status === 'pending');
    if (pending.length === 0) return;
    setProcessing(true);
    for (const item of pending) {
      await analyzeFile(item);
    }
    setProcessing(false);
    fetchHistory();
  };

  const deleteDoc = async (id: string) => {
    await supabase.from('budget_documents').delete().eq('id', id);
    fetchHistory();
  };

  const pendingCount = queue.filter(q => q.status === 'pending').length;
  const doneCount = queue.filter(q => q.status === 'done').length;
  const errorCount = queue.filter(q => q.status === 'error').length;
  const analyzingItem = queue.find(q => q.status === 'analyzing');

  const totalIncome = history.reduce((s, d) => s + parseFloat(d.total_income || 0), 0);
  const totalExpenses = history.reduce((s, d) => s + parseFloat(d.total_expenses || 0), 0);
  const netCashflow = totalIncome - totalExpenses;

  const statusColor = (s: string) => ({ done: '#2A9D8F', error: '#C1121F', analyzing: '#C9A84C', pending: 'rgba(255,255,255,0.3)' }[s] || '#999');
  const statusLabel = (s: string) => ({ done: '✅ Done', error: '❌ Failed', analyzing: '🔍 Analyzing...', pending: '⏳ Pending' }[s] || s);

  return (
    <Layout activeTab="documents">
      {/* Override the global input CSS for the hidden file input */}
      <style>{`
        input[type="file"].doc-upload-input {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
          opacity: 0 !important;
          position: absolute !important;
          overflow: hidden !important;
        }
      `}</style>

      <div style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Document Intelligence</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Upload multiple documents — AI extracts and saves all financial data automatically</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setActiveView('upload')} style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: activeView === 'upload' ? '#C9A84C' : 'rgba(255,255,255,0.08)', color: activeView === 'upload' ? '#1A1A2E' : 'rgba(255,255,255,0.6)', fontWeight: activeView === 'upload' ? '700' : '400', fontSize: '13px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
              + Upload Documents
            </button>
            <button onClick={() => setActiveView('history')} style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: activeView === 'history' ? '#C9A84C' : 'rgba(255,255,255,0.08)', color: activeView === 'history' ? '#1A1A2E' : 'rgba(255,255,255,0.6)', fontWeight: activeView === 'history' ? '700' : '400', fontSize: '13px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
              📋 History ({history.length})
            </button>
          </div>
        </div>

        {/* Running Totals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Documents Uploaded', value: String(history.length), color: '#C9A84C' },
            { label: 'Total Income', value: `$${totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#2A9D8F' },
            { label: 'Total Expenses', value: `$${totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C1121F' },
            { label: 'Net Cash Flow', value: `${netCashflow >= 0 ? '+' : ''}$${Math.abs(netCashflow).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: netCashflow >= 0 ? '#2A9D8F' : '#C1121F' },
          ].map(m => (
            <div key={m.label} className="card-hover" style={card}>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: '700', color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* UPLOAD VIEW */}
        {activeView === 'upload' && (
          <div>
            {/* Default doc type + trigger button */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '13px' }}>Default type:</label>
                <select value={defaultDocType} onChange={e => setDefaultDocType(e.target.value)}
                  style={{ width: 'auto !important', padding: '8px 14px !important', fontSize: '13px !important' }}>
                  {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              {/* Explicit "Choose Files" button — most reliable cross-browser approach */}
              <label htmlFor="doc-file-input" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #C9A84C, #9B5DE5)',
                color: '#fff', fontWeight: '700', fontSize: '13px',
                cursor: 'pointer', fontFamily: 'Poppins,sans-serif',
                userSelect: 'none',
              }}>
                📂 Choose Files (select multiple)
              </label>
              <input
                id="doc-file-input"
                className="doc-upload-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                multiple
                onChange={handleInputChange}
              />
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
              onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
              onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? '#C9A84C' : 'rgba(201,168,76,0.25)'}`,
                borderRadius: '12px', padding: '2.5rem 2rem', textAlign: 'center',
                background: dragOver ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.15s ease', marginBottom: '1.5rem',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📂</div>
              <p style={{ margin: '0 0 4px 0', color: dragOver ? '#C9A84C' : 'rgba(255,255,255,0.6)', fontSize: '15px', fontWeight: '600' }}>
                {dragOver ? 'Drop files here' : 'Or drag & drop multiple files here'}
              </p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>PDF, PNG, JPG, JPEG</p>
            </div>

            {/* Queue controls */}
            {queue.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#fff', fontWeight: '600' }}>{queue.length} file{queue.length !== 1 ? 's' : ''} in queue</span>
                  {pendingCount > 0 && <span style={{ color: 'rgba(255,255,255,0.45)' }}>⏳ {pendingCount} pending</span>}
                  {analyzingItem && <span style={{ color: '#C9A84C' }}>🔍 Analyzing: {analyzingItem.file.name}</span>}
                  {doneCount > 0 && <span style={{ color: '#2A9D8F' }}>✅ {doneCount} done</span>}
                  {errorCount > 0 && <span style={{ color: '#C1121F' }}>❌ {errorCount} failed</span>}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setQueue([])} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(193,18,31,0.4)', background: 'transparent', color: '#C1121F', fontSize: '13px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                    Clear All
                  </button>
                  <button onClick={analyzeAll} disabled={processing || pendingCount === 0}
                    style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: processing || pendingCount === 0 ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #C9A84C, #9B5DE5)', color: processing || pendingCount === 0 ? 'rgba(255,255,255,0.3)' : '#fff', fontWeight: '700', fontSize: '13px', cursor: processing || pendingCount === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                    {processing
                      ? `🔍 Analyzing ${doneCount + 1} of ${doneCount + pendingCount + (analyzingItem ? 1 : 0)}...`
                      : `✨ Analyze All ${pendingCount} Document${pendingCount !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            )}

            {/* Queue list */}
            {queue.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {queue.map(item => (
                  <div key={item.id} style={card}>
                    {/* File row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '1rem', alignItems: 'center', marginBottom: item.result ? '1rem' : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{item.file.name.toLowerCase().endsWith('.pdf') ? '📄' : '🖼️'}</span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, color: '#fff', fontWeight: '600', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file.name}</p>
                          <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{(item.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <select value={item.docType} onChange={e => updateItem(item.id, { docType: e.target.value })} disabled={item.status !== 'pending'}
                        style={{ width: 'auto !important', padding: '6px 10px !important', fontSize: '12px !important', opacity: item.status !== 'pending' ? 0.5 : 1 }}>
                        {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                      <span style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: `${statusColor(item.status)}18`, color: statusColor(item.status), whiteSpace: 'nowrap' }}>
                        {statusLabel(item.status)}
                      </span>
                      <button onClick={() => setQueue(prev => prev.filter(q => q.id !== item.id))} disabled={item.status === 'analyzing'}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: item.status === 'analyzing' ? 'not-allowed' : 'pointer', fontSize: '18px', padding: '2px 6px', lineHeight: 1 }}>
                        ×
                      </button>
                    </div>

                    {/* Error */}
                    {item.error && (
                      <p style={{ margin: 0, color: '#ff6b6b', fontSize: '12px', padding: '8px 12px', background: 'rgba(193,18,31,0.1)', borderRadius: '6px' }}>{item.error}</p>
                    )}

                    {/* Result */}
                    {item.result && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <div>
                            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Period</p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#C9A84C', fontWeight: '600' }}>{item.result.period || '—'}</p>
                          </div>
                          {[
                            { label: 'Income', value: `$${parseFloat(item.result.total_income || 0).toLocaleString()}`, color: '#2A9D8F' },
                            { label: 'Expenses', value: `$${parseFloat(item.result.total_expenses || 0).toLocaleString()}`, color: '#C1121F' },
                            { label: 'Net', value: `$${parseFloat(item.result.net_cashflow || 0).toLocaleString()}`, color: parseFloat(item.result.net_cashflow || 0) >= 0 ? '#2A9D8F' : '#C1121F' },
                          ].map(m => (
                            <div key={m.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '0.4rem 0.75rem' }}>
                              <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{m.label}</p>
                              <p style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: '700', color: m.color }}>{m.value}</p>
                            </div>
                          ))}
                        </div>
                        <p style={{ margin: '0 0 4px 0', color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: '1.5', fontStyle: 'italic' }}>{item.result.summary}</p>
                        {item.result.transactions?.length > 0 && (
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#2A9D8F' }}>✅ {item.result.transactions.length} transactions saved to budget</p>
                        )}
                        {item.result.alerts?.map((a: string, i: number) => (
                          <p key={i} style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#f4a261' }}>⚠️ {a}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {queue.length === 0 && (
              <div style={{ padding: '1rem 1.25rem', background: 'rgba(42,157,143,0.06)', border: '1px solid rgba(42,157,143,0.2)', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 4px 0', color: '#2A9D8F', fontSize: '12px', fontWeight: '600' }}>✅ HOW IT WORKS</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: '1.8' }}>
                  Click "Choose Files" to select multiple documents at once, or drag & drop them into the zone above.
                  AI reads every figure and transaction → saved to your private history → transactions auto-added to Expenses & Revenue.
                </p>
              </div>
            )}
          </div>
        )}

        {/* HISTORY VIEW */}
        {activeView === 'history' && (
          <div>
            {loadingHistory ? (
              <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Loading document history...</p>
              </div>
            ) : history.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 6px 0', fontSize: '14px' }}>No documents uploaded yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {history.map(doc => (
                  <div key={doc.id} className="card-hover" style={{ ...card, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, color: '#fff', fontWeight: '600', fontSize: '14px' }}>{doc.file_name}</p>
                      <p style={{ margin: '2px 0 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                        {doc.doc_type}{doc.period ? ` • ${doc.period}` : ''} • {doc.file_size_kb} KB
                      </p>
                      {doc.summary && <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: '1.4' }}>{doc.summary.slice(0, 110)}{doc.summary.length > 110 ? '...' : ''}</p>}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Income</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '700', color: '#2A9D8F' }}>${parseFloat(doc.total_income || 0).toLocaleString()}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Expenses</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '700', color: '#C1121F' }}>${parseFloat(doc.total_expenses || 0).toLocaleString()}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Uploaded</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => deleteDoc(doc.id)}
                      style={{ background: 'rgba(193,18,31,0.12)', border: '1px solid rgba(193,18,31,0.25)', borderRadius: '6px', color: '#C1121F', cursor: 'pointer', padding: '6px 10px', fontSize: '13px' }}>
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
