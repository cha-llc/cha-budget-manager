'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;
const DIVISIONS = ['All Divisions', 'Consulting', 'Tea Time Network', 'Digital Tools', 'Books'];

export default function Reports() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [division, setDivision] = useState('All Divisions');
  const [period, setPeriod] = useState('monthly');
  const [generating, setGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState('');
  const [exportMsg, setExportMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      const [er, rr, dr] = await Promise.all([
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('revenue').select('*').order('date', { ascending: false }),
        supabase.from('budget_documents').select('*').order('uploaded_at', { ascending: false }),
      ]);
      if (er.data) setExpenses(er.data);
      if (rr.data) setRevenue(rr.data);
      if (dr.data) setDocuments(dr.data);
    };
    load();
  }, []);

  const filtered = {
    expenses: division === 'All Divisions' ? expenses : expenses.filter(e => e.division === division),
    revenue: division === 'All Divisions' ? revenue : revenue,
  };

  const totalExpenses = filtered.expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalRevenue = filtered.revenue.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const netIncome = totalRevenue - totalExpenses;
  const totalDocIncome = documents.reduce((s, d) => s + parseFloat(d.total_income || 0), 0);
  const totalDocExpenses = documents.reduce((s, d) => s + parseFloat(d.total_expenses || 0), 0);

  // Category breakdown
  const catBreakdown: Record<string, number> = {};
  filtered.expenses.forEach(e => { catBreakdown[e.category] = (catBreakdown[e.category] || 0) + parseFloat(e.amount || 0); });
  const topCategories = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Revenue by product
  const productRevenue: Record<string, number> = {};
  filtered.revenue.forEach(r => { productRevenue[r.product_name] = (productRevenue[r.product_name] || 0) + parseFloat(r.amount || 0); });
  const topProducts = Object.entries(productRevenue).sort((a, b) => b[1] - a[1]);

  const generateReport = async () => {
    setGenerating(true);
    setAiReport(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a CFO-level financial analyst for C.H.A. LLC. Return ONLY valid JSON: {"executive_summary":"string","financial_health":"Excellent|Good|Fair|Needs Attention","health_score":0,"period_highlights":["string"],"revenue_analysis":"string","expense_analysis":"string","cash_flow_status":"string","growth_indicators":["string"],"risks":["string"],"action_items":["string"],"forecast":{"next_month_revenue":0,"next_month_expenses":0,"confidence":"string"},"tax_notes":["string"]}. Be specific to C.H.A. LLC operations. No markdown.',
          messages: [{ role: 'user', content: `Generate a comprehensive ${period} financial report for C.H.A. LLC. Division filter: ${division}. Total Revenue: $${totalRevenue.toFixed(2)}, Total Expenses: $${totalExpenses.toFixed(2)}, Net: $${netIncome.toFixed(2)}. Revenue by product: ${JSON.stringify(topProducts)}. Expenses by category: ${JSON.stringify(topCategories)}. Document-based income: $${totalDocIncome.toFixed(2)}, document-based expenses: $${totalDocExpenses.toFixed(2)}. Total documents uploaded: ${documents.length}. Products live: BrandPulse $47, Clarity Engine $37, Flagged $4.99, Freedom Era Audit $150, Business Ops Fixer $497. Provide CFO-level analysis.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      setAiReport(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch { setAiReport(null); }
    finally { setGenerating(false); }
  };

  const exportCSV = () => {
    const rows = [
      ['C.H.A. LLC Financial Report', new Date().toLocaleDateString()],
      [''],
      ['REVENUE'],
      ['Product', 'Amount', 'Source', 'Date'],
      ...filtered.revenue.map(r => [r.product_name, r.amount, r.source, r.date]),
      ['TOTAL REVENUE', totalRevenue.toFixed(2)],
      [''],
      ['EXPENSES'],
      ['Description', 'Division', 'Category', 'Amount', 'Date'],
      ...filtered.expenses.map(e => [e.description, e.division, e.category, e.amount, e.date]),
      ['TOTAL EXPENSES', totalExpenses.toFixed(2)],
      [''],
      ['NET INCOME', netIncome.toFixed(2)],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `CHA-LLC-Report-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    setExportMsg('✅ CSV exported');
    setTimeout(() => setExportMsg(''), 3000);
  };

  const emailReport = async () => {
    setSendingEmail(true);
    try {
      // Build a clean report summary to send to company email
      const reportData = {
        period, division,
        totalRevenue: totalRevenue.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        netIncome: netIncome.toFixed(2),
        topProducts, topCategories,
        documentsUploaded: documents.length,
        aiSummary: aiReport?.executive_summary || 'Run AI Analysis first for full summary.',
        healthScore: aiReport?.financial_health || 'N/A',
        actionItems: aiReport?.action_items || [],
        generatedAt: new Date().toLocaleString(),
      };
      // Post to our AI route which will compose and send the email
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are composing a professional financial report email for C.H.A. LLC. Return ONLY valid JSON: {"subject":"string","body":"string (HTML formatted)"}. The email goes to cs@cjhadisa.com. Make it look professional, magazine-style, use the C.H.A. LLC brand. No markdown in JSON values.',
          messages: [{ role: 'user', content: `Compose a ${reportData.period} financial report email for C.H.A. LLC. Data: ${JSON.stringify(reportData)}. Subject line should include the period and net income. Body should be professional HTML email with sections for Revenue, Expenses, Net Income, Key Insights, and Action Items. Sign off as C.H.A. LLC Financial Intelligence System.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      const emailContent = JSON.parse(text.replace(/```json|```/g, '').trim());
      // Open mailto with pre-filled subject and plain-text body
      const plainBody = emailContent.body
        ? emailContent.body.replace(/<[^>]+>/g, '').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').trim()
        : 'See attached report.';
      const mailtoUrl = `mailto:cs@cjhadisa.com?subject=${encodeURIComponent(emailContent.subject || 'C.H.A. LLC Financial Report')}&body=${encodeURIComponent(plainBody.slice(0, 1800))}`;
      // Try server-side send first
      try {
        const emailRes = await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: 'cs@cjhadisa.com', subject: emailContent.subject, body: emailContent.body }),
        });
        const emailData = await emailRes.json();
        if (emailData.method === 'smtp') {
          setEmailSent(`✅ Report sent to cs@cjhadisa.com: "${emailContent.subject}"`);
        } else {
          window.open(mailtoUrl, '_blank');
          setEmailSent(`✅ Email client opened: "${emailContent.subject}"`);
        }
      } catch {
        window.open(mailtoUrl, '_blank');
        setEmailSent(`✅ Email client opened: "${emailContent.subject}"`);
      }
      setTimeout(() => setEmailSent(''), 6000);
    } catch { setEmailSent('Could not compose report. Try generating AI analysis first.'); }
    finally { setSendingEmail(false); }
  };

  const healthColor = (h: string) => h === 'Excellent' ? '#2A9D8F' : h === 'Good' ? '#C9A84C' : h === 'Fair' ? '#f4a261' : '#C1121F';

  return (
    <Layout activeTab="reports">
      <div style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Financial Reports</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>AI-generated reports • Sent to company email cs@cjhadisa.com</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={division} onChange={e => setDivision(e.target.value)} style={{ width: 'auto !important', padding: '8px 14px !important' }}>
              {DIVISIONS.map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: 'auto !important', padding: '8px 14px !important' }}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
            <button className="btn-primary" onClick={exportCSV} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.4)', background: 'transparent', color: '#C9A84C', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>📥 CSV</button>
            <button className="btn-primary" onClick={generateReport} disabled={generating} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #9B5DE5, #2A9D8F)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {generating ? '📊 Generating...' : '📊 AI Report'}
            </button>
            <button className="btn-primary" onClick={emailReport} disabled={sendingEmail} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #C9A84C, #C1121F)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {sendingEmail ? '✉️ Composing...' : '✉️ Email Report'}
            </button>
          </div>
        </div>

        {exportMsg && <div style={{ padding: '10px 14px', background: 'rgba(42,157,143,0.15)', border: '1px solid rgba(42,157,143,0.4)', borderRadius: '8px', color: '#2A9D8F', fontSize: '13px', marginBottom: '1rem' }}>{exportMsg}</div>}
        {emailSent && <div style={{ padding: '12px 16px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '8px', color: '#C9A84C', fontSize: '13px', marginBottom: '1rem' }}>{emailSent}</div>}

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#2A9D8F' },
            { label: 'Total Expenses', value: `$${totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#C1121F' },
            { label: 'Net Income', value: `${netIncome >= 0 ? '+' : ''}$${netIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: netIncome >= 0 ? '#2A9D8F' : '#C1121F' },
            { label: 'Docs Analyzed', value: documents.length.toString(), color: '#9B5DE5' },
          ].map(m => (
            <div key={m.label} className="card-hover" style={card}>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '24px', fontWeight: '700', color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Breakdown Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Revenue by Product */}
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Revenue by Product</h3>
            {topProducts.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', padding: '1.5rem 0' }}>No revenue recorded yet</p>
            ) : topProducts.map(([name, amt]) => (
              <div key={name} style={{ marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{name}</span>
                  <span style={{ fontSize: '13px', color: '#2A9D8F', fontWeight: '600' }}>${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(amt / (topProducts[0]?.[1] || 1)) * 100}%`, background: '#2A9D8F', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Expenses by Category */}
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>Expenses by Category</h3>
            {topCategories.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', padding: '1.5rem 0' }}>No expenses recorded yet</p>
            ) : topCategories.map(([cat, amt]) => (
              <div key={cat} style={{ marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{cat}</span>
                  <span style={{ fontSize: '13px', color: '#C1121F', fontWeight: '600' }}>${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(amt / (topCategories[0]?.[1] || 1)) * 100}%`, background: '#C1121F', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Revenue Table */}
          <div style={card}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#2A9D8F', fontSize: '15px', fontWeight: '600' }}>Revenue Transactions</h3>
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
                  {['Product', 'Source', 'Date', 'Amount'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {filtered.revenue.length === 0 ? <tr><td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No revenue yet</td></tr>
                    : filtered.revenue.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px', color: '#fff', fontSize: '12px' }}>{r.product_name}</td>
                        <td style={{ padding: '8px', color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>{r.source}</td>
                        <td style={{ padding: '8px', color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>{r.date}</td>
                        <td style={{ padding: '8px', color: '#2A9D8F', fontWeight: '700' }}>${parseFloat(r.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                  <tr style={{ borderTop: '1px solid rgba(201,168,76,0.3)' }}>
                    <td colSpan={3} style={{ padding: '8px', color: '#fff', fontWeight: '700' }}>TOTAL</td>
                    <td style={{ padding: '8px', color: '#2A9D8F', fontWeight: '800', fontSize: '15px' }}>${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Expenses Table */}
          <div style={card}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#C1121F', fontSize: '15px', fontWeight: '600' }}>Expense Transactions</h3>
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
                  {['Description', 'Category', 'Date', 'Amount'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {filtered.expenses.length === 0 ? <tr><td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No expenses yet</td></tr>
                    : filtered.expenses.map((e, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px', color: '#fff', fontSize: '12px' }}>{e.description}</td>
                        <td style={{ padding: '8px', color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>{e.category}</td>
                        <td style={{ padding: '8px', color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>{e.date}</td>
                        <td style={{ padding: '8px', color: '#C1121F', fontWeight: '700' }}>${parseFloat(e.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                  <tr style={{ borderTop: '1px solid rgba(201,168,76,0.3)' }}>
                    <td colSpan={3} style={{ padding: '8px', color: '#fff', fontWeight: '700' }}>TOTAL</td>
                    <td style={{ padding: '8px', color: '#C1121F', fontWeight: '800', fontSize: '15px' }}>${totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* AI Report */}
        {generating && (
          <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📊</div>
            <p style={{ color: '#9B5DE5', fontWeight: '600', margin: 0 }}>AI is generating your CFO-level financial report...</p>
          </div>
        )}
        {aiReport && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: '#9B5DE5', fontSize: '16px', fontWeight: '600' }}>📊 AI Financial Report — {period.charAt(0).toUpperCase() + period.slice(1)}</h3>
              {aiReport.financial_health && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Financial Health:</span>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', background: `${healthColor(aiReport.financial_health)}20`, color: healthColor(aiReport.financial_health), fontSize: '12px', fontWeight: '700' }}>{aiReport.financial_health}</span>
                  {aiReport.health_score > 0 && <span style={{ fontSize: '20px', fontWeight: '800', color: healthColor(aiReport.financial_health) }}>{aiReport.health_score}/100</span>}
                </div>
              )}
            </div>
            <div style={{ padding: '1rem 1.25rem', background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.2)', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.7' }}>{aiReport.executive_summary}</p>
            </div>
            {aiReport.forecast && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'Next Month Revenue', value: `$${(aiReport.forecast.next_month_revenue || 0).toLocaleString()}`, color: '#2A9D8F' },
                  { label: 'Next Month Expenses', value: `$${(aiReport.forecast.next_month_expenses || 0).toLocaleString()}`, color: '#C1121F' },
                  { label: 'Confidence', value: aiReport.forecast.confidence || 'N/A', color: '#C9A84C' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{m.label}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '700', color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: '✨ Highlights', items: aiReport.period_highlights, color: '#C9A84C' },
                { label: '📈 Growth', items: aiReport.growth_indicators, color: '#2A9D8F' },
                { label: '⚠️ Risks', items: aiReport.risks, color: '#C1121F' },
                { label: '✅ Action Items', items: aiReport.action_items, color: '#9B5DE5' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.75rem 0', color: s.color, fontSize: '12px', fontWeight: '600' }}>{s.label}</p>
                  {s.items?.map((item: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '12px', lineHeight: '1.5' }}>• {item}</p>)}
                </div>
              ))}
            </div>
            {aiReport.tax_notes?.length > 0 && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(155,93,229,0.06)', border: '1px solid rgba(155,93,229,0.2)', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 0.5rem 0', color: '#9B5DE5', fontSize: '12px', fontWeight: '600' }}>🧾 TAX NOTES</p>
                {aiReport.tax_notes.map((t: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '4px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>• {t}</p>)}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
