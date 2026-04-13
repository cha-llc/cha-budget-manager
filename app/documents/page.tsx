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

export default function Documents() {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('bank_statement');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [savedMsg, setSavedMsg] = useState('');
  const [activeView, setActiveView] = useState<'upload' | 'history'>('upload');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('budget_documents')
      .select('*')
      .order('uploaded_at', { ascending: false });
    if (data) setHistory(data);
    setLoadingHistory(false);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError('');
    setResult(null);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(',')[1]);
        r.onerror = () => rej(new Error('Read failed'));
        r.readAsDataURL(file);
      });
      const isPdf = file.type === 'application/pdf';
      const mediaType = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a financial document analyst. Extract ALL financial data and return ONLY valid JSON:
{"doc_type":"string","period":"string","summary":"string","key_figures":[{"label":"string","value":"string","category":"income|expense|balance|other"}],"transactions":[{"date":"string","description":"string","amount":0,"type":"credit|debit"}],"tax_relevant":["string"],"alerts":["string"],"total_income":0,"total_expenses":0,"net_cashflow":0}
Compute total_income (sum of all credits/deposits), total_expenses (sum of all debits/charges), net_cashflow (income minus expenses). Return ONLY the JSON. No markdown.`,
          messages: [{
            role: 'user',
            content: [
              { type: isPdf ? 'document' : 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: `This is a ${DOC_TYPES.find(d => d.value === docType)?.label}. Extract every financial figure, transaction, and compute totals.` }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      setResult(parsed);

      // Auto-save to Supabase
      const { error: saveErr } = await supabase.from('budget_documents').insert([{
        file_name: file.name,
        file_size_kb: parseFloat((file.size / 1024).toFixed(1)),
        doc_type: parsed.doc_type || DOC_TYPES.find(d => d.value === docType)?.label,
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

      if (!saveErr) {
        setSavedMsg('✅ Saved to your document history');
        setTimeout(() => setSavedMsg(''), 4000);
        fetchHistory();

        // If it's a bank statement or paycheck, auto-create expense/revenue entries
        if (parsed.transactions?.length > 0) {
          const credits = parsed.transactions.filter((t: any) => t.type === 'credit');
          const debits = parsed.transactions.filter((t: any) => t.type === 'debit');
          if (credits.length > 0) {
            await supabase.from('revenue').insert(credits.map((t: any) => ({
              product_name: t.description || 'Document Import',
              amount: Math.abs(t.amount),
              source: parsed.doc_type || docType,
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
        }
      }
    } catch (e: any) {
      console.error(e);
      setError('Could not analyze document. Ensure the file is a clear image or PDF.');
    } finally {
      setAnalyzing(false);
    }
  };

  const deleteDoc = async (id: string) => {
    await supabase.from('budget_documents').delete().eq('id', id);
    fetchHistory();
  };

  const totalIncome = history.reduce((s, d) => s + (d.total_income || 0), 0);
  const totalExpenses = history.reduce((s, d) => s + (d.total_expenses || 0), 0);
  const netCashflow = totalIncome - totalExpenses;

  return (
    <Layout activeTab="documents">
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Document Intelligence</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Every document you upload is analyzed, saved, and used to build your accurate personal budget</p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['upload', 'history'] as const).map(v => (
              <button key={v} onClick={() => setActiveView(v)} style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: activeView === v ? '#C9A84C' : 'rgba(255,255,255,0.08)', color: activeView === v ? '#1A1A2E' : 'rgba(255,255,255,0.6)', fontWeight: activeView === v ? '700' : '400', fontSize: '13px', cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'Poppins, sans-serif' }}>
                {v === 'upload' ? '+ Upload Document' : `📋 History (${history.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Running Totals from all documents */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Documents Uploaded', value: history.length.toString(), color: '#C9A84C' },
            { label: 'Total Income (All Docs)', value: `$${totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#2A9D8F' },
            { label: 'Total Expenses (All Docs)', value: `$${totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C1121F' },
            { label: 'Net Cash Flow', value: `${netCashflow >= 0 ? '+' : ''}$${netCashflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: netCashflow >= 0 ? '#2A9D8F' : '#C1121F' },
          ].map(m => (
            <div key={m.label} className="card-hover" style={card}>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: '700', color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        {activeView === 'upload' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.5rem', alignItems: 'start' }}>
            {/* Upload Panel */}
            <div style={card}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#C9A84C', fontSize: '15px', fontWeight: '600' }}>Upload Document</h3>
              <div style={{ marginBottom: '1rem' }}>
                <label>Document Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value)}>
                  {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setResult(null); setError(''); } }}
                onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? '#C9A84C' : 'rgba(201,168,76,0.3)'}`, borderRadius: '10px', padding: '2.5rem 1.5rem', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(201,168,76,0.05)' : 'transparent', transition: 'all 0.2s', marginBottom: '1rem' }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
                {file ? (
                  <div>
                    <p style={{ margin: 0, color: '#C9A84C', fontWeight: '600', fontSize: '14px' }}>{file.name}</p>
                    <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Drop file or click to upload</p>
                    <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>PDF, PNG, JPG, JPEG</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setResult(null); setError(''); } }} />
              </div>

              <button className="btn-primary" onClick={handleAnalyze} disabled={!file || analyzing}
                style={{ width: '100%', padding: '13px', borderRadius: '8px', border: 'none', background: file && !analyzing ? 'linear-gradient(135deg, #C9A84C, #9B5DE5)' : 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: file && !analyzing ? 'pointer' : 'not-allowed', fontFamily: 'Poppins, sans-serif' }}>
                {analyzing ? '🔍 Analyzing & Saving...' : '✨ Extract Financial Data'}
              </button>

              {savedMsg && <div style={{ marginTop: '0.75rem', padding: '10px 14px', background: 'rgba(42,157,143,0.15)', border: '1px solid rgba(42,157,143,0.4)', borderRadius: '8px', color: '#2A9D8F', fontSize: '13px' }}>{savedMsg}</div>}
              {error && <div style={{ marginTop: '0.75rem', padding: '10px 14px', background: 'rgba(193,18,31,0.12)', border: '1px solid rgba(193,18,31,0.35)', borderRadius: '8px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(42,157,143,0.06)', border: '1px solid rgba(42,157,143,0.2)', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 6px 0', color: '#2A9D8F', fontSize: '12px', fontWeight: '600' }}>✅ WHAT HAPPENS WHEN YOU UPLOAD</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: '1.8' }}>
                  1. AI reads every figure and transaction<br />
                  2. Results saved to your private document history<br />
                  3. Transactions auto-added to Expenses & Revenue<br />
                  4. Budget totals update automatically
                </p>
              </div>
            </div>

            {/* Results Panel */}
            <div>
              {!result && !analyzing && (
                <div style={{ ...card, textAlign: 'center', padding: '4rem 2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗂️</div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 6px 0', fontSize: '14px' }}>Upload a document to see AI-extracted financial data</p>
                  <p style={{ color: 'rgba(255,255,255,0.25)', margin: 0, fontSize: '12px' }}>Results are automatically saved to your history</p>
                </div>
              )}
              {analyzing && (
                <div style={{ ...card, textAlign: 'center', padding: '4rem 2rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
                  <p style={{ color: '#C9A84C', fontWeight: '600', margin: '0 0 6px 0' }}>AI is reading your document...</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Extracting every figure and transaction, then saving to your history</p>
                </div>
              )}
              {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ ...card, borderLeft: '3px solid #C9A84C' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, color: '#C9A84C', fontSize: '15px', fontWeight: '600' }}>{result.doc_type}</h3>
                      {result.period && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{result.period}</span>}
                    </div>
                    <p style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.6' }}>{result.summary}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      {[
                        { label: 'Total Income', value: `$${(result.total_income || 0).toLocaleString()}`, color: '#2A9D8F' },
                        { label: 'Total Expenses', value: `$${(result.total_expenses || 0).toLocaleString()}`, color: '#C1121F' },
                        { label: 'Net Cash Flow', value: `$${(result.net_cashflow || 0).toLocaleString()}`, color: '#C9A84C' },
                      ].map(m => (
                        <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                          <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{m.label}</p>
                          <p style={{ margin: '3px 0 0 0', fontSize: '16px', fontWeight: '700', color: m.color }}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.key_figures?.length > 0 && (
                    <div style={card}>
                      <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '14px', fontWeight: '600' }}>📊 Key Figures</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                        {result.key_figures.map((kf: any, i: number) => (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.75rem' }}>
                            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{kf.label}</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '17px', fontWeight: '700', color: kf.category === 'income' ? '#2A9D8F' : kf.category === 'expense' ? '#C1121F' : '#C9A84C' }}>{kf.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.transactions?.length > 0 && (
                    <div style={card}>
                      <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '14px', fontWeight: '600' }}>💳 Transactions ({result.transactions.length}) <span style={{ color: '#2A9D8F', fontSize: '12px', fontWeight: '400' }}>— auto-added to your budget</span></h3>
                      <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {result.transactions.map((tx: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                            <div>
                              <p style={{ margin: 0, fontSize: '13px', color: '#fff' }}>{tx.description}</p>
                              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{tx.date}</p>
                            </div>
                            <span style={{ fontWeight: '700', fontSize: '14px', color: tx.type === 'credit' ? '#2A9D8F' : '#C1121F' }}>
                              {tx.type === 'credit' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.alerts?.length > 0 && (
                    <div style={{ ...card, borderLeft: '3px solid #C1121F' }}>
                      <h3 style={{ margin: '0 0 0.75rem 0', color: '#C1121F', fontSize: '14px', fontWeight: '600' }}>⚠️ Alerts</h3>
                      {result.alerts.map((a: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '5px 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>• {a}</p>)}
                    </div>
                  )}
                  {result.tax_relevant?.length > 0 && (
                    <div style={{ ...card, borderLeft: '3px solid #9B5DE5' }}>
                      <h3 style={{ margin: '0 0 0.75rem 0', color: '#9B5DE5', fontSize: '14px', fontWeight: '600' }}>🧾 Tax-Relevant</h3>
                      {result.tax_relevant.map((t: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '5px 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>• {t}</p>)}
                    </div>
                  )}
                </div>
              )}
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
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 0.5rem 0', fontSize: '14px' }}>No documents uploaded yet</p>
                <p style={{ color: 'rgba(255,255,255,0.25)', margin: 0, fontSize: '12px' }}>Upload your first bank statement or receipt to get started</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {history.map(doc => (
                  <div key={doc.id} className="card-hover" style={{ ...card, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, color: '#fff', fontWeight: '600', fontSize: '14px' }}>{doc.file_name}</p>
                      <p style={{ margin: '2px 0 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                        {doc.doc_type} {doc.period ? `• ${doc.period}` : ''} • {doc.file_size_kb} KB
                      </p>
                      {doc.summary && <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: '1.4' }}>{doc.summary.slice(0, 100)}{doc.summary.length > 100 ? '...' : ''}</p>}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Income</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '700', color: '#2A9D8F' }}>${(doc.total_income || 0).toLocaleString()}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Expenses</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '700', color: '#C1121F' }}>${(doc.total_expenses || 0).toLocaleString()}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Uploaded</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => deleteDoc(doc.id)} style={{ background: 'rgba(193,18,31,0.15)', border: '1px solid rgba(193,18,31,0.3)', borderRadius: '6px', color: '#C1121F', cursor: 'pointer', padding: '6px 10px', fontSize: '13px' }}>🗑️</button>
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
