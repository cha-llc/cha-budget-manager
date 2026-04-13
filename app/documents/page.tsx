'use client';

import React, { useState, useRef } from 'react';
import Layout from '@/components/Layout';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

export default function Documents() {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('bank_statement');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const docTypes = [
    { value: 'bank_statement', label: 'Bank Statement' },
    { value: 'paycheck_stub', label: 'Paycheck / Pay Stub' },
    { value: 'receipt', label: 'Receipt / Invoice' },
    { value: 'tax_form', label: 'Tax Form (W2, 1099)' },
    { value: 'investment', label: 'Investment Statement' },
    { value: 'utility_bill', label: 'Utility Bill' },
  ];

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
          system: `You are a financial document analyst. Extract all financial data and return ONLY valid JSON:
{"doc_type":"string","period":"string","summary":"string","key_figures":[{"label":"string","value":"string","category":"income|expense|balance|other"}],"transactions":[{"date":"string","description":"string","amount":0,"type":"credit|debit"}],"tax_relevant":["string"],"alerts":["string"]}
Return ONLY the JSON. No preamble, no markdown.`,
          messages: [{
            role: 'user',
            content: [
              { type: isPdf ? 'document' : 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: `This is a ${docTypes.find(d => d.value === docType)?.label}. Extract all financial data.` }
            ]
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      setResult(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch {
      setError('Could not analyze document. Ensure the file is a clear image or PDF.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Layout activeTab="documents">
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Document Intelligence</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>AI extracts financial data from bank statements, pay stubs, receipts, tax forms, and more</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Upload */}
          <div style={card}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#C9A84C', fontSize: '15px', fontWeight: '600' }}>Upload Document</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label>Document Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)}>
                {docTypes.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
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
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
            </div>
            <button className="btn-primary" onClick={handleAnalyze} disabled={!file || analyzing}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: file && !analyzing ? 'linear-gradient(135deg, #C9A84C, #9B5DE5)' : 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: '600', fontSize: '14px', cursor: file && !analyzing ? 'pointer' : 'not-allowed' }}>
              {analyzing ? '🔍 Analyzing...' : '✨ Extract Financial Data'}
            </button>
            {error && <div style={{ marginTop: '1rem', padding: '10px 14px', background: 'rgba(193,18,31,0.15)', border: '1px solid rgba(193,18,31,0.4)', borderRadius: '8px', color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(42,157,143,0.08)', border: '1px solid rgba(42,157,143,0.25)', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 0.5rem 0', color: '#2A9D8F', fontSize: '12px', fontWeight: '600' }}>✅ SUPPORTED</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: '1.7' }}>Bank statements • Pay stubs • Receipts<br />Tax forms (W2, 1099) • Invoices<br />Investment statements • Utility bills</p>
            </div>
          </div>
          {/* Results */}
          <div>
            {!result && !analyzing && (
              <div style={{ ...card, textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗂️</div>
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '14px' }}>Upload a document to see AI-extracted financial data</p>
              </div>
            )}
            {analyzing && (
              <div style={{ ...card, textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
                <p style={{ color: '#C9A84C', fontWeight: '600', margin: '0 0 6px 0' }}>AI is reading your document...</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Extracting figures, transactions, and insights</p>
              </div>
            )}
            {result && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ ...card, borderLeft: '3px solid #C9A84C' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, color: '#C9A84C', fontSize: '15px', fontWeight: '600' }}>{result.doc_type}</h3>
                    {result.period && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{result.period}</span>}
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.6' }}>{result.summary}</p>
                </div>
                {result.key_figures?.length > 0 && (
                  <div style={card}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '14px', fontWeight: '600' }}>📊 Key Figures</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                      {result.key_figures.map((kf: any, i: number) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.75rem' }}>
                          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{kf.label}</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '700', color: kf.category === 'income' ? '#2A9D8F' : kf.category === 'expense' ? '#C1121F' : '#C9A84C' }}>{kf.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.transactions?.length > 0 && (
                  <div style={card}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '14px', fontWeight: '600' }}>💳 Transactions ({result.transactions.length})</h3>
                    <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {result.transactions.map((tx: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                          <div>
                            <p style={{ margin: 0, fontSize: '13px', color: '#fff' }}>{tx.description}</p>
                            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{tx.date}</p>
                          </div>
                          <span style={{ fontWeight: '700', fontSize: '14px', color: tx.type === 'credit' ? '#2A9D8F' : '#C1121F' }}>{tx.type === 'credit' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.alerts?.length > 0 && (
                  <div style={{ ...card, borderLeft: '3px solid #C1121F' }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', color: '#C1121F', fontSize: '14px', fontWeight: '600' }}>⚠️ Alerts</h3>
                    {result.alerts.map((a: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>• {a}</p>)}
                  </div>
                )}
                {result.tax_relevant?.length > 0 && (
                  <div style={{ ...card, borderLeft: '3px solid #9B5DE5' }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', color: '#9B5DE5', fontSize: '14px', fontWeight: '600' }}>🧾 Tax-Relevant Items</h3>
                    {result.tax_relevant.map((t: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>• {t}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
