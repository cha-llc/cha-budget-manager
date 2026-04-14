// BUILD_V5_SMART_ROUTING
'use client';

import React, { useState, useEffect } from 'react';
import { normalizeDocType, defaultDestination, buildPersonalInserts, buildBusinessExpenseInserts, buildBusinessRevenueInserts } from '@/lib/docRouting';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

const DOC_TYPES = [
  { value: 'auto', label: '🤖 Auto-Detect' },
  { value: 'paycheck_stub', label: 'Paycheck / Pay Stub' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'tax_form', label: 'Tax Form (W2, 1099)' },
  { value: 'receipt', label: 'Business Receipt / Invoice' },
  { value: 'investment', label: 'Investment Statement' },
  { value: 'utility_bill', label: 'Utility Bill' },
];

// Where transactions from this doc will be saved
const BUDGET_DESTINATIONS = [
  { value: 'personal', label: '🧾 Personal Budget', color: '#9B5DE5' },
  { value: 'business', label: '🏢 Business Budget', color: '#C9A84C' },
  { value: 'both', label: '↔️ Both', color: '#2A9D8F' },
  { value: 'none', label: '📁 Save Only', color: 'rgba(255,255,255,0.3)' },
];

// AI auto-detects doc type and suggests destination
const AUTO_DETECT_RULES: Record<string, { destination: 'personal' | 'business' | 'both' | 'none'; label: string }> = {
  paycheck_stub: { destination: 'personal', label: 'Paycheck / Pay Stub' },
  pay_stub: { destination: 'personal', label: 'Paycheck / Pay Stub' },
  bank_statement: { destination: 'personal', label: 'Bank Statement' },
  checking_statement: { destination: 'personal', label: 'Bank Statement' },
  savings_statement: { destination: 'personal', label: 'Bank Statement' },
  w2: { destination: 'personal', label: 'Tax Form (W2)' },
  '1099': { destination: 'personal', label: 'Tax Form (1099)' },
  tax_form: { destination: 'personal', label: 'Tax Form' },
  receipt: { destination: 'business', label: 'Business Receipt' },
  invoice: { destination: 'business', label: 'Business Invoice' },
  business_expense: { destination: 'business', label: 'Business Expense' },
  investment_statement: { destination: 'personal', label: 'Investment Statement' },
  utility_bill: { destination: 'business', label: 'Utility Bill' },
};

interface QueuedFile {
  id: string;
  file: File;
  docType: string;           // user-selected or auto-detected
  detectedType: string;      // what AI identified (display only)
  destination: 'personal' | 'business' | 'both' | 'none';
  status: 'pending' | 'detecting' | 'ready' | 'analyzing' | 'done' | 'error';
  result?: any;
  error?: string;
}

const AI_DETECT_SYSTEM = `You are a financial document classifier. Look at the document and identify what type it is.
Return ONLY a valid JSON object with no markdown:
{"doc_type":"string","destination":"personal|business|both","confidence":"high|medium|low","reason":"string"}

doc_type must be one of: paycheck_stub, bank_statement, tax_form, receipt, invoice, investment_statement, utility_bill, credit_card_statement, other
destination rules:
- personal: pay stubs, personal bank statements, W2/1099, personal investment statements, personal tax returns
- business: receipts, invoices, business expense reports, vendor bills
- both: if the document contains both personal income AND business transactions
- none: if unclear`;

const AI_ANALYZE_SYSTEM = `You are a precise financial document analyst. Extract ALL financial data accurately.

CRITICAL RULES FOR EACH DOCUMENT TYPE:

PAY STUB / PAYCHECK:
- total_income = NET PAY (take-home after all deductions). This is the "Net Pay", "Net Amount", or "Amount Paid" field.
- total_expenses = sum of all deductions (federal tax + state tax + FICA + social security + medicare + health insurance + 401k + all other withholdings)
- net_cashflow = total_income (net pay)
- transactions: one credit entry for NET PAY amount, then one debit entry per deduction line
- key_figures MUST include: Gross Pay, Net Pay (clearly labeled), Pay Period, YTD Gross, YTD Net, each deduction amount
- NEVER use gross pay as total_income. Net pay is ALWAYS less than gross pay.

BANK STATEMENT:
- total_income = sum of ALL deposits and credits
- total_expenses = sum of ALL withdrawals and debits
- transactions: every single line item
- key_figures: Opening Balance, Closing Balance, Total Deposits, Total Withdrawals

RECEIPT / INVOICE:
- total_expenses = total amount paid. total_income = 0.
- transactions: one debit for total, plus itemized lines if visible

TAX FORM (W2, 1099):
- total_income = Box 1 wages (W2) or total compensation (1099)
- total_expenses = total taxes withheld
- key_figures: ALL box values clearly labeled

GENERAL RULES:
1. Return ONLY a valid JSON object. No text before or after. No markdown fences.
2. Amounts = plain numbers only (1234.56 not $1,234.56).
3. Dates in YYYY-MM-DD format.
4. period = pay period or statement period.

Return exactly:
{"doc_type":"string","period":"string","summary":"string","key_figures":[{"label":"string","value":"string","category":"income|expense|balance|other"}],"transactions":[{"date":"string","description":"string","amount":0,"type":"credit|debit"}],"tax_relevant":["string"],"alerts":["string"],"total_income":0,"total_expenses":0,"net_cashflow":0}`;

export default function Documents() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [defaultDocType, setDefaultDocType] = useState('auto');
  const [defaultDestination, setDefaultDestination] = useState<'personal' | 'business' | 'both' | 'none'>('personal');
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeView, setActiveView] = useState<'upload' | 'history'>('upload');
  const [clearConfirm, setClearConfirm] = useState<'idle' | 'confirm' | 'clearing'>('idle');
  const [clearMsg, setClearMsg] = useState('');

  useEffect(() => { fetchHistory(); }, []);

  const clearAllDocuments = async () => {
    setClearConfirm('clearing');
    try {
      // Delete all personal transactions from document imports
      await supabase.from('personal_transactions').delete().like('source', 'document:%');
      // Delete all budget documents
      await supabase.from('budget_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // Reset personal budget categories to $0
      await supabase.from('personal_budget_categories').update({ budgeted_amount: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
      setHistory([]);
      setQueue([]);
      setClearMsg('✅ All documents and imported transactions cleared. Upload fresh documents to start over.');
      setClearConfirm('idle');
      setTimeout(() => setClearMsg(''), 8000);
    } catch (e: any) {
      setClearMsg('❌ Clear failed: ' + (e?.message || 'unknown error'));
      setClearConfirm('idle');
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase.from('budget_documents').select('*').order('uploaded_at', { ascending: false });
    if (data) setHistory(data);
    setLoadingHistory(false);
  };

  const updateItem = (id: string, updates: Partial<QueuedFile>) =>
    setQueue(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));

  const addFilesFromArray = (files: File[], docType: string, destination: 'personal' | 'business' | 'both' | 'none') => {
    const valid = files.filter(f =>
      f.type === 'application/pdf' || f.type === 'image/png' ||
      f.type === 'image/jpeg' || f.type === 'image/jpg' ||
      /\.(pdf|png|jpg|jpeg)$/i.test(f.name)
    );
    if (!valid.length) return;
    const items: QueuedFile[] = valid.map(f => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
      docType,
      detectedType: '',
      destination,
      status: 'pending',
    }));
    setQueue(prev => [...prev, ...items]);
    // Always run auto-detect — it updates type+destination from AI, and for manual type it confirms
    items.forEach(item => autoDetectFile(item, docType, destination));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const snapshot: File[] = [];
    for (let i = 0; i < e.target.files.length; i++) snapshot.push(e.target.files[i]);
    addFilesFromArray(snapshot, defaultDocType, defaultDestination);
    const target = e.target;
    setTimeout(() => { target.value = ''; }, 200);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    if (!e.dataTransfer.files?.length) return;
    const snapshot: File[] = [];
    for (let i = 0; i < e.dataTransfer.files.length; i++) snapshot.push(e.dataTransfer.files[i]);
    addFilesFromArray(snapshot, defaultDocType, defaultDestination);
  };

  // STEP 1: Quick AI scan to identify doc type + suggest destination
  // manualDocType/manualDest = what user selected; AI overrides if auto, confirms if manual
  const autoDetectFile = async (item: QueuedFile, manualDocType?: string, manualDest?: string) => {
    setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'detecting' } : q));
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(item.file);
      });
      const isPdf = item.file.type === 'application/pdf' || item.file.name.toLowerCase().endsWith('.pdf');
      const mediaType = isPdf ? 'application/pdf' : (item.file.type || 'image/jpeg');

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          system: AI_DETECT_SYSTEM,
          messages: [{
            role: 'user',
            content: [
              { type: isPdf ? 'document' : 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: 'Identify this financial document type and where its transactions should go (personal budget, business budget, or both).' }
            ]
          }]
        })
      });

      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      const detected = JSON.parse(text.replace(/```json|```/g, '').trim());

      // Map detected type to our DOC_TYPES values
      const typeMap: Record<string, string> = {
        paycheck_stub: 'paycheck_stub', pay_stub: 'paycheck_stub',
        bank_statement: 'bank_statement', checking_statement: 'bank_statement', savings_statement: 'bank_statement',
        tax_form: 'tax_form', w2: 'tax_form', '1099': 'tax_form',
        receipt: 'receipt', invoice: 'receipt',
        investment_statement: 'investment',
        utility_bill: 'utility_bill',
        credit_card_statement: 'bank_statement',
      };
      const mappedType = typeMap[detected.doc_type?.toLowerCase()] || 'bank_statement';
      const dest = (['personal','business','both','none'].includes(detected.destination) ? detected.destination : 'personal') as QueuedFile['destination'];

      // If user manually selected a type (not 'auto'), respect it but still update destination
      const finalType = (manualDocType && manualDocType !== 'auto') ? manualDocType : mappedType;
      const finalDest = (manualDocType && manualDocType !== 'auto') ? (manualDest as QueuedFile['destination'] || dest) : dest;
      setQueue(prev => prev.map(q => q.id === item.id ? {
        ...q,
        docType: finalType,
        detectedType: detected.doc_type || 'unknown',
        destination: finalDest,
        status: 'ready',
      } : q));
    } catch {
      // Detection failed — mark ready so user can still proceed
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'ready', detectedType: 'detection failed' } : q));
    }
  };

  // STEP 2: Full analysis + save
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

      // Type-specific instructions
      const typeHint = item.docType === 'paycheck_stub'
        ? 'IMPORTANT: Find NET PAY (take-home after deductions) = total_income. NOT gross pay. List every deduction as a debit transaction.'
        : item.docType === 'bank_statement'
        ? 'Extract every transaction. Credits=deposits/income. Debits=withdrawals/charges. Be precise.'
        : item.docType === 'tax_form'
        ? 'Extract all box values. Box 1 wages (W2) or total compensation (1099) = total_income. Total taxes withheld = total_expenses.'
        : item.docType === 'receipt'
        ? 'Total amount paid = total_expenses. total_income = 0. Itemize all line items as debit transactions.'
        : 'Extract all financial figures accurately.';

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: AI_ANALYZE_SYSTEM,
          messages: [{
            role: 'user',
            content: [
              { type: isPdf ? 'document' : 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: `Document type: ${docLabel}. ${typeHint} Be precise with every number.` }
            ]
          }]
        })
      });

      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      if (!text) throw new Error('No response from AI');
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

      // Save to budget_documents
      const { data: savedDoc } = await supabase.from('budget_documents').insert([{
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
        budget_destination: item.destination,
      }]).select();

      const docId = savedDoc?.[0]?.id || null;

      // Route transactions based on user-selected destination
      await routeTransactions(item, parsed, docId);

      updateItem(item.id, { status: 'done', result: { ...parsed, destination: item.destination } });
    } catch (err: any) {
      console.error('Doc analysis error:', err);
      updateItem(item.id, { status: 'error', error: err?.message || 'Analysis failed. Try a clearer image or PDF.' });
    }
  };

  // Routing via shared lib — single source of truth, no duplication
  const routeTransactions = async (item: QueuedFile, parsed: any, docId: string | null) => {
    const dest = item.destination;

    if (dest === 'personal' || dest === 'both') {
      const inserts = buildPersonalInserts(parsed, item.file.name, docId);
      if (inserts.length > 0) {
        const { error } = await supabase.from('personal_transactions').insert(inserts);
        if (error) console.error('Personal insert error:', error);
      }
    }

    if (dest === 'business' || dest === 'both') {
      const expInserts = buildBusinessExpenseInserts(parsed, item.file.name);
      if (expInserts.length > 0) {
        const { error } = await supabase.from('expenses').insert(expInserts);
        if (error) console.error('Business expense insert error:', error);
      }
      // Only post credits to business revenue when explicitly 'business' destination
      if (dest === 'business') {
        const revInserts = buildBusinessRevenueInserts(parsed);
        if (revInserts.length > 0) {
          const { error } = await supabase.from('revenue').insert(revInserts);
          if (error) console.error('Revenue insert error:', error);
        }
      }
    }
    // dest === 'none' → budget_documents only, no transaction routing
  };

  const analyzeAll = async () => {
    // Wait for any items still being auto-detected before starting analysis
    const waitForDetection = async () => {
      const maxWait = 15000; // 15s max wait
      const start = Date.now();
      while (Date.now() - start < maxWait) {
        const currentQueue = await new Promise<QueuedFile[]>(resolve => {
          setQueue(q => { resolve(q); return q; });
        });
        const stillDetecting = currentQueue.some(q => q.status === 'detecting');
        if (!stillDetecting) break;
        await new Promise(r => setTimeout(r, 500));
      }
    };
    await waitForDetection();
    // Re-read queue after detection completes
    setQueue(prev => {
      const ready = prev.filter(q => q.status === 'ready' || q.status === 'pending');
      if (!ready.length) return prev;
      setProcessing(true);
      (async () => {
        for (const item of ready) {
          await analyzeFile(item);
        }
        setProcessing(false);
        fetchHistory();
      })();
      return prev;
    });
  };

  const deleteDoc = async (id: string) => {
    await supabase.from('budget_documents').delete().eq('id', id);
    fetchHistory();
  };

  const pendingCount = queue.filter(q => q.status === 'pending' || q.status === 'ready').length;
  const detectingCount = queue.filter(q => q.status === 'detecting').length;
  const doneCount = queue.filter(q => q.status === 'done').length;
  const errorCount = queue.filter(q => q.status === 'error').length;
  const analyzingItem = queue.find(q => q.status === 'analyzing');

  const totalIncome = history.reduce((s, d) => s + parseFloat(d.total_income || 0), 0);
  const totalExpenses = history.reduce((s, d) => s + parseFloat(d.total_expenses || 0), 0);
  const netCashflow = totalIncome - totalExpenses;

  const statusColor = (s: string) => ({ done: '#2A9D8F', error: '#C1121F', analyzing: '#C9A84C', detecting: '#9B5DE5', ready: '#3a86ff', pending: 'rgba(255,255,255,0.3)' }[s] || '#999');
  const statusLabel = (s: string) => ({ done: '✅ Done', error: '❌ Failed', analyzing: '🔍 Analyzing...', detecting: '🤖 Detecting...', ready: '✅ Ready', pending: '⏳ Pending' }[s] || s);

  const destInfo = (d: string) => BUDGET_DESTINATIONS.find(x => x.value === d) || BUDGET_DESTINATIONS[0];

  return (
    <Layout activeTab="documents">
      <style>{`
        input[type="file"].doc-upload-input {
          display: none !important; width: 0 !important; height: 0 !important;
          opacity: 0 !important; position: absolute !important; overflow: hidden !important;
        }
      `}</style>

      <div style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Document Intelligence</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>AI auto-identifies every document and routes transactions to the right budget</p>
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

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Documents Uploaded', value: String(history.length), color: '#C9A84C' },
            { label: 'Total Income Extracted', value: `$${totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#2A9D8F' },
            { label: 'Total Expenses Extracted', value: `$${totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C1121F' },
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
            {/* Upload controls */}
            <div style={{ ...card, marginBottom: '1.5rem', borderColor: 'rgba(201,168,76,0.3)' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '14px', fontWeight: '600' }}>Upload Settings</h3>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label>Document Type</label>
                  <select value={defaultDocType} onChange={e => setDefaultDocType(e.target.value)} style={{ width: 'auto !important' }}>
                    {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                    {defaultDocType === 'auto' ? '🤖 AI will identify each document automatically' : 'Applied to all files in this batch'}
                  </p>
                </div>
                <div>
                  <label>Save To Budget</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {BUDGET_DESTINATIONS.map(d => (
                      <button key={d.value} onClick={() => setDefaultDestination(d.value as any)}
                        style={{ padding: '8px 14px', borderRadius: '8px', border: `2px solid ${defaultDestination === d.value ? d.color : 'rgba(255,255,255,0.1)'}`, background: defaultDestination === d.value ? `${d.color}22` : 'transparent', color: defaultDestination === d.value ? d.color : 'rgba(255,255,255,0.45)', fontWeight: defaultDestination === d.value ? '700' : '400', fontSize: '12px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', whiteSpace: 'nowrap' }}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                    {defaultDocType === 'auto' ? 'AI will also suggest the right budget — you can override per file' : 'Where transactions will be saved after analysis'}
                  </p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <label htmlFor="doc-file-input" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 22px', borderRadius: '8px', background: 'linear-gradient(135deg, #C9A84C, #9B5DE5)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', userSelect: 'none' }}>
                    📂 Choose Files
                  </label>
                  <input id="doc-file-input" className="doc-upload-input" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" multiple onChange={handleInputChange} />
                </div>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
              onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
              onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
              onDrop={handleDrop}
              style={{ border: `2px dashed ${dragOver ? '#C9A84C' : 'rgba(201,168,76,0.2)'}`, borderRadius: '12px', padding: '2rem', textAlign: 'center', background: dragOver ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.01)', transition: 'all 0.15s ease', marginBottom: '1.5rem' }}
            >
              <p style={{ margin: 0, color: dragOver ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                {dragOver ? '📂 Drop files here' : 'Or drag & drop files here — PDF, PNG, JPG, JPEG'}
              </p>
            </div>

            {/* Queue */}
            {queue.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '13px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: '600' }}>{queue.length} file{queue.length !== 1 ? 's' : ''}</span>
                    {detectingCount > 0 && <span style={{ color: '#9B5DE5' }}>🤖 {detectingCount} detecting type...</span>}
                    {pendingCount > 0 && <span style={{ color: '#3a86ff' }}>✅ {pendingCount} ready</span>}
                    {analyzingItem && <span style={{ color: '#C9A84C' }}>🔍 {analyzingItem.file.name}</span>}
                    {doneCount > 0 && <span style={{ color: '#2A9D8F' }}>✅ {doneCount} done</span>}
                    {errorCount > 0 && <span style={{ color: '#C1121F' }}>❌ {errorCount} failed</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setQueue([])} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(193,18,31,0.4)', background: 'transparent', color: '#C1121F', fontSize: '13px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>Clear All</button>
                    <button onClick={analyzeAll} disabled={processing || (pendingCount === 0 && detectingCount === 0)}
                      style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: processing || pendingCount === 0 ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #C9A84C, #9B5DE5)', color: processing || pendingCount === 0 ? 'rgba(255,255,255,0.3)' : '#fff', fontWeight: '700', fontSize: '13px', cursor: processing || pendingCount === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                      {processing ? `🔍 Analyzing...` : `✨ Analyze All (${pendingCount})`}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {queue.map(item => {
                    const di = destInfo(item.destination);
                    return (
                      <div key={item.id} style={{ ...card, borderLeft: `3px solid ${di.color}` }}>
                        {/* File header row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{item.file.name.toLowerCase().endsWith('.pdf') ? '📄' : '🖼️'}</span>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, color: '#fff', fontWeight: '600', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file.name}</p>
                              <p style={{ margin: '2px 0 0 0', color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                                {(item.file.size / 1024).toFixed(1)} KB
                                {item.detectedType && item.detectedType !== 'detection failed' && (
                                  <span style={{ marginLeft: '8px', color: '#9B5DE5', fontWeight: '600' }}>🤖 Identified: {item.detectedType}</span>
                                )}
                                {item.detectedType === 'detection failed' && (
                                  <span style={{ marginLeft: '8px', color: '#f4a261' }}>⚠️ Auto-detect failed — select type manually</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <span style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: `${statusColor(item.status)}18`, color: statusColor(item.status), whiteSpace: 'nowrap' }}>
                            {statusLabel(item.status)}
                          </span>
                          <button onClick={() => setQueue(prev => prev.filter(q => q.id !== item.id))} disabled={item.status === 'analyzing' || item.status === 'detecting'}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: '18px', padding: '2px 6px', lineHeight: 1 }}>×</button>
                        </div>

                        {/* Controls row — doc type + destination (always editable before analyze) */}
                        {(item.status === 'ready' || item.status === 'pending' || item.status === 'detecting') && (
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ flex: 1, minWidth: '160px' }}>
                              <label style={{ fontSize: '11px' }}>Document Type</label>
                              <select value={item.docType === 'auto' ? 'bank_statement' : item.docType}
                                onChange={e => updateItem(item.id, { docType: e.target.value })}
                                style={{ width: '100% !important', padding: '6px 10px !important', fontSize: '12px !important' }}>
                                {DOC_TYPES.filter(d => d.value !== 'auto').map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                              </select>
                            </div>
                            <div style={{ flex: 2, minWidth: '240px' }}>
                              <label style={{ fontSize: '11px' }}>Save Transactions To</label>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {BUDGET_DESTINATIONS.map(d => (
                                  <button key={d.value} onClick={() => updateItem(item.id, { destination: d.value as any })}
                                    style={{ flex: 1, padding: '6px 4px', borderRadius: '6px', border: `1.5px solid ${item.destination === d.value ? d.color : 'rgba(255,255,255,0.08)'}`, background: item.destination === d.value ? `${d.color}22` : 'transparent', color: item.destination === d.value ? d.color : 'rgba(255,255,255,0.35)', fontWeight: item.destination === d.value ? '700' : '400', fontSize: '11px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                    {d.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Error */}
                        {item.error && <p style={{ margin: '0.5rem 0 0 0', color: '#ff6b6b', fontSize: '12px', padding: '8px 12px', background: 'rgba(193,18,31,0.1)', borderRadius: '6px' }}>{item.error}</p>}

                        {/* Result */}
                        {item.result && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1rem', marginTop: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem', alignItems: 'center' }}>
                              <div>
                                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Period</p>
                                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#C9A84C', fontWeight: '600' }}>{item.result.period || '—'}</p>
                              </div>
                              {[
                                { label: 'Income', value: `$${parseFloat(item.result.total_income || 0).toLocaleString()}`, color: '#2A9D8F' },
                                { label: 'Expenses', value: `$${parseFloat(item.result.total_expenses || 0).toLocaleString()}`, color: '#C1121F' },
                                { label: 'Net', value: `$${parseFloat(item.result.net_cashflow || 0).toLocaleString()}`, color: parseFloat(item.result.net_cashflow || 0) >= 0 ? '#2A9D8F' : '#C1121F' },
                              ].map(m => (
                                <div key={m.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '0.35rem 0.75rem' }}>
                                  <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{m.label}</p>
                                  <p style={{ margin: '2px 0 0 0', fontSize: '14px', fontWeight: '700', color: m.color }}>{m.value}</p>
                                </div>
                              ))}
                              <div style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: '6px', background: `${di.color}18`, border: `1px solid ${di.color}40` }}>
                                <p style={{ margin: 0, fontSize: '11px', color: di.color, fontWeight: '700' }}>→ {di.label}</p>
                              </div>
                            </div>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: '1.5', fontStyle: 'italic' }}>{item.result.summary}</p>
                            {item.result.transactions?.length > 0 && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#2A9D8F' }}>✅ {item.result.transactions.length} transactions saved to {di.label}</p>}
                            {item.result.alerts?.map((a: string, i: number) => <p key={i} style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#f4a261' }}>⚠️ {a}</p>)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {queue.length === 0 && (
              <div style={{ ...card, borderColor: 'rgba(42,157,143,0.25)', background: 'rgba(42,157,143,0.04)' }}>
                <p style={{ margin: '0 0 8px 0', color: '#2A9D8F', fontSize: '13px', fontWeight: '600' }}>✅ HOW IT WORKS</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  {[
                    { step: '1', title: 'Upload', desc: 'Click Choose Files or drag & drop. Select as many documents as you want at once.' },
                    { step: '2', title: 'AI Auto-Identifies', desc: 'AI instantly reads each file, identifies the type (pay stub, W2, bank statement), and suggests the right budget destination. You can override any decision.' },
                    { step: '3', title: 'Analyze & Route', desc: 'Click Analyze All. Transactions are extracted and saved exactly where you told them to go — Personal, Business, or Both.' },
                  ].map(s => (
                    <div key={s.step} style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#C9A84C', color: '#1A1A2E', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>{s.step}</div>
                      <div><p style={{ margin: '0 0 3px 0', color: '#fff', fontWeight: '600', fontSize: '13px' }}>{s.title}</p><p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: '1.5' }}>{s.desc}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORY VIEW */}
        {activeView === 'history' && (
          <div>
            {/* Clear All controls */}
            {history.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {clearMsg && <span style={{ fontSize: '12px', color: clearMsg.startsWith('✅') ? '#2A9D8F' : '#C1121F' }}>{clearMsg}</span>}
                {clearConfirm === 'idle' && (
                  <button onClick={() => setClearConfirm('confirm')}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(193,18,31,0.5)', background: 'transparent', color: '#C1121F', fontWeight: '600', fontSize: '12px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                    🗑️ Clear All Documents & Start Fresh
                  </button>
                )}
                {clearConfirm === 'confirm' && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#f4a261' }}>⚠️ Deletes all {history.length} documents + all imported transactions. Cannot undo.</span>
                    <button onClick={clearAllDocuments}
                      style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: '#C1121F', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                      Yes, Clear Everything
                    </button>
                    <button onClick={() => setClearConfirm('idle')}
                      style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>
                      Cancel
                    </button>
                  </div>
                )}
                {clearConfirm === 'clearing' && (
                  <span style={{ fontSize: '12px', color: '#C9A84C' }}>⏳ Clearing all data...</span>
                )}
              </div>
            )}
            {loadingHistory ? (
              <div style={{ ...card, textAlign: 'center', padding: '3rem' }}><p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Loading history...</p></div>
            ) : history.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '4rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>No documents uploaded yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {history.map(doc => {
                  const destLabel = BUDGET_DESTINATIONS.find(d => d.value === doc.budget_destination)?.label || '📁 Saved';
                  const destColor = BUDGET_DESTINATIONS.find(d => d.value === doc.budget_destination)?.color || 'rgba(255,255,255,0.3)';
                  return (
                    <div key={doc.id} className="card-hover" style={{ ...card, display: 'grid', gridTemplateColumns: '2fr auto auto auto auto auto', gap: '1rem', alignItems: 'center', borderLeft: `3px solid ${destColor}` }}>
                      <div>
                        <p style={{ margin: 0, color: '#fff', fontWeight: '600', fontSize: '14px' }}>{doc.file_name}</p>
                        <p style={{ margin: '2px 0 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                          {doc.doc_type}{doc.period ? ` • ${doc.period}` : ''} • {doc.file_size_kb} KB
                        </p>
                        {doc.summary && <p style={{ margin: '3px 0 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px', lineHeight: '1.4' }}>{doc.summary.slice(0, 100)}{doc.summary.length > 100 ? '...' : ''}</p>}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Income</p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: '700', color: '#2A9D8F' }}>${parseFloat(doc.total_income || 0).toLocaleString()}</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Expenses</p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: '700', color: '#C1121F' }}>${parseFloat(doc.total_expenses || 0).toLocaleString()}</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Saved To</p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: '600', color: destColor }}>{destLabel}</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Date</p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => deleteDoc(doc.id)} style={{ background: 'rgba(193,18,31,0.12)', border: '1px solid rgba(193,18,31,0.25)', borderRadius: '6px', color: '#C1121F', cursor: 'pointer', padding: '6px 10px', fontSize: '13px' }}>🗑️</button>
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
