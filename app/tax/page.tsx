// BUILD_V4_SUPABASE
'use client';
import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

const INCOME_FIELDS = [
  { key: 'income_business', label: 'Business Revenue (LLC)' },
  { key: 'income_freelance', label: 'Freelance / Contract' },
  { key: 'income_investments', label: 'Investment Income' },
  { key: 'income_other', label: 'Other Income' },
];
const DEDUCT_FIELDS = [
  { key: 'deduct_home_office', label: 'Home Office' },
  { key: 'deduct_software', label: 'Software & Tools' },
  { key: 'deduct_equipment', label: 'Equipment' },
  { key: 'deduct_travel', label: 'Business Travel' },
  { key: 'deduct_meals', label: 'Business Meals (50%)' },
  { key: 'deduct_education', label: 'Education' },
  { key: 'deduct_healthcare', label: 'Health Insurance' },
  { key: 'deduct_retirement', label: 'Retirement (SEP-IRA)' },
  { key: 'deduct_marketing', label: 'Marketing & Ads' },
  { key: 'deduct_professional', label: 'Professional Services' },
];

type TaxEntry = Record<string, any>;

export default function TaxPlanning() {
  const [taxYear, setTaxYear] = useState('2026');
  const [filingStatus, setFilingStatus] = useState('single');
  const [entry, setEntry] = useState<TaxEntry>({});
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadEntry(taxYear); }, [taxYear]);

  const loadEntry = async (year: string) => {
    setLoading(true);
    const { data } = await supabase.from('tax_entries').select('*').eq('tax_year', year).single();
    if (data) {
      setEntry(data);
      setFilingStatus(data.filing_status || 'single');
      if (data.ai_analysis) setAnalysis(data.ai_analysis);
      else setAnalysis(null);
    } else {
      // Create entry for this year
      const { data: newEntry } = await supabase.from('tax_entries').insert([{ tax_year: year, filing_status: 'single' }]).select().single();
      if (newEntry) setEntry(newEntry);
    }
    setLoading(false);
  };

  const updateField = (key: string, value: string) => {
    setEntry(prev => ({ ...prev, [key]: value }));
  };

  const saveEntry = async () => {
    setSaving(true);
    const updateData: TaxEntry = { filing_status: filingStatus, updated_at: new Date().toISOString() };
    [...INCOME_FIELDS, ...DEDUCT_FIELDS].forEach(f => {
      updateData[f.key] = parseFloat(entry[f.key] || '0') || 0;
    });
    const { error } = await supabase.from('tax_entries').update(updateData).eq('tax_year', taxYear);
    setSaving(false);
    setSaveMsg(error ? '❌ Save failed' : '✅ Saved');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    await saveEntry();
    try {
      const income: Record<string, number> = {};
      const deductions: Record<string, number> = {};
      INCOME_FIELDS.forEach(f => { income[f.label] = parseFloat(entry[f.key] || '0') || 0; });
      DEDUCT_FIELDS.forEach(f => { deductions[f.label] = parseFloat(entry[f.key] || '0') || 0; });

      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          system: 'You are a tax planning AI for self-employed entrepreneurs. Return ONLY valid JSON: {"estimated_tax_owed":0,"effective_rate":0,"quarterly_payment":0,"missed_deductions":["string"],"strategies":["string"],"warnings":["string"],"savings_opportunities":["string"]}. Use US tax law. No markdown.',
          messages: [{ role: 'user', content: `Tax year ${taxYear}, filing: ${filingStatus}. Income: ${JSON.stringify(income)}. Deductions: ${JSON.stringify(deductions)}. Self-employed, C.H.A. LLC (consulting, media, digital tools, books). Optimize for FEIE if applicable.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      setAnalysis(parsed);
      // Save analysis to Supabase
      await supabase.from('tax_entries').update({ ai_analysis: parsed, updated_at: new Date().toISOString() }).eq('tax_year', taxYear);
    } catch { setAnalysis(null); }
    setAnalyzing(false);
  };

  const totalIncome = INCOME_FIELDS.reduce((s, f) => s + (parseFloat(entry[f.key] || '0') || 0), 0);
  const totalDeductions = DEDUCT_FIELDS.reduce((s, f) => s + (parseFloat(entry[f.key] || '0') || 0), 0);
  const taxableIncome = Math.max(0, totalIncome - totalDeductions);

  const NumInput = ({ field, label }: { field: string; label: string }) => (
    <div>
      <label>{label}</label>
      <input type="number" value={entry[field] || ''} onChange={e => updateField(field, e.target.value)}
        onBlur={saveEntry} placeholder="0" />
    </div>
  );

  return (
    <Layout activeTab="tax">
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Tax Planning</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>AI-powered deduction calculator — auto-saved per tax year</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {saveMsg && <span style={{ fontSize: '12px', color: saveMsg.startsWith('✅') ? '#2A9D8F' : '#C1121F' }}>{saveMsg}</span>}
            <select value={taxYear} onChange={e => setTaxYear(e.target.value)} style={{ width: 'auto !important', padding: '8px 14px !important' }}>
              {['2024', '2025', '2026'].map(y => <option key={y}>{y}</option>)}
            </select>
            <select value={filingStatus} onChange={e => { setFilingStatus(e.target.value); saveEntry(); }} style={{ width: 'auto !important', padding: '8px 14px !important' }}>
              <option value="single">Single</option>
              <option value="married_jointly">Married Filing Jointly</option>
              <option value="married_separately">Married Filing Separately</option>
              <option value="head_of_household">Head of Household</option>
            </select>
            <button className="btn-primary" onClick={saveEntry} disabled={saving}
              style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.4)', background: 'transparent', color: '#C9A84C', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              {saving ? 'Saving...' : '💾 Save'}
            </button>
          </div>
        </div>

        {loading ? <div style={{ ...card, textAlign: 'center', padding: '2rem' }}><p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Loading tax data...</p></div> : (
          <>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[{ label: 'Gross Income', value: `$${totalIncome.toLocaleString()}`, color: '#2A9D8F' }, { label: 'Total Deductions', value: `$${totalDeductions.toLocaleString()}`, color: '#9B5DE5' }, { label: 'Est. Taxable Income', value: `$${taxableIncome.toLocaleString()}`, color: '#C9A84C' }].map(m => (
                <div key={m.label} style={card}>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '26px', fontWeight: '700', color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={card}>
                <h3 style={{ margin: '0 0 1.25rem 0', color: '#2A9D8F', fontSize: '15px', fontWeight: '600' }}>💵 Income Sources</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {INCOME_FIELDS.map(f => <NumInput key={f.key} field={f.key} label={f.label} />)}
                </div>
              </div>
              <div style={card}>
                <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '15px', fontWeight: '600' }}>🧾 Business Deductions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {DEDUCT_FIELDS.map(f => <NumInput key={f.key} field={f.key} label={f.label} />)}
                </div>
              </div>
            </div>

            <button className="btn-primary" onClick={runAnalysis} disabled={analyzing}
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: analyzing ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #9B5DE5, #C9A84C)', color: analyzing ? 'rgba(255,255,255,0.3)' : '#fff', fontWeight: '700', fontSize: '15px', cursor: analyzing ? 'not-allowed' : 'pointer', marginBottom: '1.5rem', fontFamily: 'Poppins,sans-serif' }}>
              {analyzing ? '🧾 Running Tax Analysis...' : '🧾 Run AI Tax Analysis'}
            </button>

            {analysis && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  {[{ label: 'Est. Tax Owed', value: `$${(analysis.estimated_tax_owed || 0).toLocaleString()}`, color: '#C1121F' }, { label: 'Effective Rate', value: `${(analysis.effective_rate || 0).toFixed(1)}%`, color: '#C9A84C' }, { label: 'Quarterly Payment', value: `$${(analysis.quarterly_payment || 0).toLocaleString()}`, color: '#9B5DE5' }].map(m => (
                    <div key={m.label} style={{ ...card, textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{m.label}</p>
                      <p style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: '700', color: m.color }}>{m.value}</p>
                    </div>
                  ))}
                </div>
                {analysis.warnings?.length > 0 && (
                  <div style={{ ...card, borderLeft: '3px solid #C1121F' }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', color: '#C1121F', fontSize: '14px', fontWeight: '600' }}>⚠️ Warnings</h3>
                    {analysis.warnings.map((w: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '5px 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>• {w}</p>)}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  {[{ label: '💡 Missed Deductions', items: analysis.missed_deductions, color: '#C9A84C' }, { label: '🎯 Tax Strategies', items: analysis.strategies, color: '#2A9D8F' }, { label: '💰 Savings Opportunities', items: analysis.savings_opportunities, color: '#9B5DE5' }].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem' }}>
                      <p style={{ margin: '0 0 0.75rem 0', color: s.color, fontSize: '13px', fontWeight: '600' }}>{s.label}</p>
                      {s.items?.map((item: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0 0', color: 'rgba(255,255,255,0.65)', fontSize: '12px', lineHeight: '1.5' }}>• {item}</p>)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
