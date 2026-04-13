'use client';

import React, { useState, useRef, useEffect } from 'react';
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

export default function Documents() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [defaultDocType, setDefaultDocType] = useState('bank_statement');
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeView, setActiveView] = useState<'upload' | 'history'>('upload');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase.from('budget_documents').select('*').order('uploaded_at', { ascending: false });
    if (data) setHistory(data);
    setLoadingHistory(false);
  };

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter(f => ['application/pdf','image/png','image/jpeg','image/jpg'].includes(f.type) || f.name.match(/\.(pdf|png|jpg|jpeg)$/i));
    const newItems: QueuedFile[] = valid.map(f => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f,
      docType: defaultDocType,
      status: 'pending',
    }));
    setQueue(prev => [...prev, ...newItems]);
  };

  const removeFromQueue = (id: string) => setQueue(prev => prev.filter(q => q.id !== id));

  const updateQueueItem = (id: string, updates: Partial<QueuedFile>) => {
    setQueue(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const analyzeFile = async (item: QueuedFile): Promise<void> => {
    updateQueueItem(item.id, { status: 'analyzing' });
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(item.file);
      });

      const isPdf = item.file.type === 'application/pdf';
      const mediaType = isPdf ? 'application/pdf' : (item.file.type || 'image/jpeg');

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a financial document analyst. Extract ALL financial data and return ONLY valid JSON:
{"doc_type":"string","period":"string","summary":"string","key_figures":[{"label":"string","value":"string","category":"income|expense|balance|other"}],"transactions":[{"date":"string","description":"string","amount":0,"type":"credit|debit"}],"tax_relevant":["string"],"alerts":["string"],"total_income":0,"total_expenses":0,"net_cashflow":0}
Compute total_income (sum of all credits/deposits), total_expenses (sum of all debits/charges), net_cashflow = income - expenses. Return ONLY the JSON. No markdown.`,
          messages: [{
            role: 'user',
            content: [
              { type: isPdf ? 'document' : 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: `This is a ${DOC_TYPES.find(d => d.value === item.docType)?.label}. Extract every financial figure, transaction, and compute totals accurately.` }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

      // Save to Supabase
      await supabase.from('budget_documents').insert([{
        file_name: item.file.name,
        file_size_kb: parseFloat((item.file.size / 1024).toFixed(1)),
        doc_type: parsed.doc_type || DOC_TYPES.find(d => d.value === item.docType)?.label,
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

      // Auto-add transactions to expenses/revenue
      const credits = (parsed.transactions || []).filter((t: any) => t.type === 'credit');
      const debits = (parsed.transactions || []).filter((t: any) => t.type === 'debit');
      if (credits.length > 0) {
        await supabase.from('revenue').insert(credits.map((t: any) => ({
          product_name: t.description || 'Document Import',
          amount: Math.abs(t.amount),
          source: parsed.doc_type || item.docType,
          date: t.date || new Date().toISOString().split('T')[0],
        })));
      }
      if (debits.length > 0) {
        await supabase.from('expenses').insert(debits.map((t: any) => ({
          division: 'Consulting',
          category: 'Other',
          amount: Math.abs(t.amount),
          description: t.description || 'Document Import',
          date: t.date || new Date().toISOString().split('T')[0],
        })));
      }

      updateQueueItem(item.id, { status: 'done', result: parsed });
    } catch (e: any) {
      console.error(e);
      updateQueueItem(item.id, { status: 'error', error: 'Analysis failed. Try a clearer image or PDF.' });
    }
  };

  const analyzeAll = async () => {
    const pending = queue.filter(q => q.status === 'pending');
    if (pending.length === 0) return;
    setProcessing(true);
    // Process sequentially to avoid rate limits
    for (const item of pending) {
      await analyzeFile(item);
    }
    setProcessing(false);
    fetchHistory();
  };

  const clearCompleted = () => setQueue(prev => prev.filter(q => q.status === 'pending' || q.status === 'analyzing'));

  const deleteDoc = async (id: string) => {
    await supabase.from('budget_documents').delete().eq('id', id);
    fetchHistory();
  };

  const totalIncome = history.reduce((s, d) => s + parseFloat(d.total_income || 0), 0);
  const totalExpenses = history.reduce((s, d) => s + parseFloat(d.total_expenses || 0), 0);
  const netCashflow = totalIncome - totalExpenses;

  const pendingCount = queue.filter(q => q.status === 'pending').length;
  const doneCount = queue.filter(q => q.status === 'done').length;
  const errorCount = queue.filter(q => q.status === 'error').length;
  const analyzingCount = queue.filter(q => q.status === 'analyzing').length;

  const statusColor = (s: string) => s === 'done' ? '#2A9D8F' : s === 'error' ? '#C1121F' : s === 'analyzing' ? '#C9A84C' : 'rgba(255,255,255,0.3)';
  const statusLabel = (s: string) => s === 'done' ? '✅ Done' : s === 'error' ? '❌ Failed' : s === 'analyzing' ? '🔍 Analyzing...' : '⏳ Pending';

  return (
    <Layout activeTab="documents">
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Document Intelligence</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Upload multiple documents at once — AI extracts and saves all financial data automatically</p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['upload', 'history'] as const).map(v => (
              <button key={v} onClick={() => setActiveView(v)} style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: activeView === v ? '#C9A84C' : 'rgba(255,255,255,0.08)', color: activeView === v ? '#1A1A2E' : 'rgba(255,255,255,0.6)', fontWeight: activeView === v ? '700' : '400', fontSize: '13px', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                {v === 'upload' ? '+ Upload Documents' : `📋 History (${history.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Running Totals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Documents Uploaded', value: history.length.toString(), color: '#C9A84C' },
            { label: 'Total Income (All Docs)', value: `$${totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#2A9D8F' },
            { label: 'Total Expenses (All Docs)', value: `$${totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C1121F' },
            { label: 'Net Cash Flow', value: `${netCashflow >= 0 ? '+' : ''}$${Math.abs(netCashflow).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: netCashflow >= 0 ? '#2A9D8F' : '#C1121F' },
          ].map(m => (
            <div key={m.label} className="card-hover" style={card}>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: '700', color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        {activeView === 'upload' && (
          <div>
            {/* Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#C9A84C' : 'rgba(201,168,76,0.3)'}`,
                borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer',
                background: dragOver ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s', marginBottom: '1.5rem',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
              <p style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '16px', fontWeight: '600' }}>Drop multiple files here or click to browse</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>PDF, PNG, JPG, JPEG — select as many as you want at once</p>
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" multiple style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.length) { addFiles(e.target.files); e.target.value = ''; } }} />
            </div>

            {/* Controls row */}
            {queue.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginRight: '8px' }}>Default Type:</label>
                    <select value={defaultDocType} onChange={e => setDefaultDocType(e.target.value)} style={{ width: 'auto !important', padding: '6px 12px !important', fontSize: '13px !important' }}>
                      {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                    {pendingCount > 0 && <span style={{ color: 'rgba(255,255,255,0.5)' }}>⏳ {pendingCount} pending</span>}
                    {analyzingCount > 0 && <span style={{ color: '#C9A84C' }}>🔍 {analyzingCount} analyzing</span>}
                    {doneCount > 0 && <span style={{ color: '#2A9D8F' }}>✅ {doneCount} done</span>}
                    {errorCount > 0 && <span style={{ color: '#C1121F' }}>❌ {errorCount} failed</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {doneCount > 0 && <button onClick={clearCompleted} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}>Clear Completed</button>}
                  <button onClick={() => setQueue([])} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(193,18,31,0.4)', background: 'transparent', color: '#C1121F', fontSize: '13px', cursor: 'pointer' }}>Clear All</button>
                  <button className="btn-primary" onClick={analyzeAll} disabled={processing || pendingCount === 0}
                    style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: processing || pendingCount === 0 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #C9A84C, #9B5DE5)', color: processing || pendingCount === 0 ? 'rgba(255,255,255,0.3)' : '#fff', fontWeight: '700', fontSize: '13px', cursor: processing || pendingCount === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                    {processing ? `🔍 Analyzing ${analyzingCount > 0 ? `(${doneCount + analyzingCount}/${queue.length})` : '...'}` : `✨ Analyze All ${pendingCount} Document${pendingCount !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            )}

            {/* Queue */}
            {queue.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {queue.map(item => (
                  <div key={item.id} style={{ ...card, padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '1rem', alignItems: 'center', marginBottom: item.result ? '1rem' : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{item.file.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                        <div>
                          <p style={{ margin: 0, color: '#fff', fontWeight: '600', fontSize: '14px' }}>{item.file.name}</p>
                          <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{(item.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      {/* Per-file doc type selector */}
                      <select value={item.docType} onChange={e => updateQueueItem(item.id, { docType: e.target.value })} disabled={item.status !== 'pending'}
                        style={{ width: 'auto !important', padding: '6px 12px !important', fontSize: '12px !important', opacity: item.status !== 'pending' ? 0.5 : 1 }}>
                        {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: `${statusColor(item.status)}20`, color: statusColor(item.status), whiteSpace: 'nowrap' }}>
                        {statusLabel(item.status)}
                      </span>
                      <button onClick={() => removeFromQueue(item.id)} disabled={item.status === 'analyzing'}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '18px', padding: '2px 6px' }}>×</button>
                    </div>

                    {item.error && <p style={{ margin: 0, color: '#ff6b6b', fontSize: '12px', padding: '8px 10px', background: 'rgba(193,18,31,0.1)', borderRadius: '6px' }}>{item.error}</p>}

                    {item.result && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div style={{ gridColumn: 'span 1' }}>
                            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Period</p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#C9A84C', fontWeight: '600' }}>{item.result.period || '—'}</p>
                          </div>
                          {[
                            { label: 'Income', value: `$${(item.result.total_income || 0).toLocaleString()}`, color: '#2A9D8F' },
                            { label: 'Expenses', value: `$${(item.result.total_expenses || 0).toLocaleString()}`, color: '#C1121F' },
                            { label: 'Net', value: `$${(item.result.net_cashflow || 0).toLocaleString()}`, color: (item.result.net_cashflow || 0) >= 0 ? '#2A9D8F' : '#C1121F' },
                          ].map(m => (
                            <div key={m.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '0.5rem' }}>
                              <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{m.label}</p>
                              <p style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: '700', color: m.color }}>{m.value}</p>
                            </div>
                          ))}
                        </div>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: '1.5', fontStyle: 'italic' }}>{item.result.summary}</p>
                        {item.result.transactions?.length > 0 && (
                          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#2A9D8F' }}>✅ {item.result.transactions.length} transactions saved to budget automatically</p>
                        )}
                        {item.result.alerts?.length > 0 && item.result.alerts.map((a: string, i: number) => (
                          <p key={i} style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#ff6b6b' }}>⚠️ {a}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {queue.length === 0 && (
              <div style={{ ...card, textAlign: 'center', padding: '3rem', borderStyle: 'dashed' }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>Drop files above to get started. You can upload bank statements, pay stubs, receipts, tax forms — all at once.</p>
              </div>
            )}

            <div style={{ padding: '1rem 1.25rem', background: 'rgba(42,157,143,0.06)', border: '1px solid rgba(42,157,143,0.2)', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 6px 0', color: '#2A9D8F', fontSize: '12px', fontWeight: '600' }}>✅ WHAT HAPPENS AUTOMATICALLY</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: '1.8' }}>
                AI reads every figure and transaction from each document • Results saved to your private document history • Transactions auto-added to your Expenses & Revenue tables • Budget totals update in real time • All data stays private at cs@cjhadisa.com only
              </p>
            </div>
          </div>
        )}

        {activeView === 'history' && (
          <div>
            {loadingHistory ? (
              <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Loading your document history...</p>
              </div>
            ) : history.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 6px 0', fontSize: '14px' }}>No documents uploaded yet</p>
                <p style={{ color: 'rgba(255,255,255,0.25)', margin: 0, fontSize: '12px' }}>Upload bank statements, receipts, or pay stubs to get started</p>
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
                    <button onClick={() => deleteDoc(doc.id)} style={{ background: 'rgba(193,18,31,0.12)', border: '1px solid rgba(193,18,31,0.25)', borderRadius: '6px', color: '#C1121F', cursor: 'pointer', padding: '6px 10px', fontSize: '13px' }}>🗑️</button>
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
