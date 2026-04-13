'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' } as const;

export default function TaxPlanning() {
  const [income, setIncome] = useState({ business: '', freelance: '', investments: '', other: '' });
  const [expenses, setExpenses] = useState({ home_office: '', software: '', equipment: '', travel: '', meals: '', education: '', healthcare: '', retirement: '', marketing: '', professional: '' });
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [filingStatus, setFilingStatus] = useState('single');
  const [taxYear, setTaxYear] = useState('2026');

  const totalIncome = Object.values(income).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalDeductions = Object.values(expenses).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const estimatedTaxable = Math.max(0, totalIncome - totalDeductions);

  const runTaxAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a tax planning AI for self-employed entrepreneurs. Return ONLY valid JSON: {"estimated_tax_rate":0,"estimated_tax_owed":0,"effective_rate":0,"missed_deductions":["string"],"strategies":["string"],"quarterly_payment":0,"warnings":["string"],"savings_opportunities":["string"]}. Use US tax law. No markdown.',
          messages: [{ role: 'user', content: `Tax year ${taxYear}, filing status: ${filingStatus}. Income: ${JSON.stringify(income)}. Deductions: ${JSON.stringify(expenses)}. This person is self-employed running a multi-division LLC (C.H.A. LLC - consulting, media, digital tools, books). Provide comprehensive tax optimization advice.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '';
      setAnalysis(JSON.parse(text.replace(/```json|```/g, '').trim()));
    } catch {
      setAnalysis({ estimated_tax_rate: 0, estimated_tax_owed: 0, effective_rate: 0, missed_deductions: ['Analysis unavailable'], strategies: [], quarterly_payment: 0, warnings: [], savings_opportunities: [] });
    } finally {
      setAnalyzing(false);
    }
  };

  const InputGroup = ({ label, field, state, setState, prefix = '$' }: any) => (
    <div>
      <label>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>{prefix}</span>
        <input type="number" value={state[field]} onChange={e => setState({ ...state, [field]: e.target.value })} placeholder="0" style={{ paddingLeft: '24px !important' }} />
      </div>
    </div>
  );

  return (
    <Layout activeTab="tax">
      <div style={{ maxWidth: '1200px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '22px', fontWeight: '700', fontFamily: "'Lora', serif" }}>Tax Planning</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>AI-powered deduction calculator and annual tax optimization</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select value={taxYear} onChange={e => setTaxYear(e.target.value)} style={{ width: 'auto !important', padding: '8px 14px !important' }}>
              {['2024', '2025', '2026'].map(y => <option key={y}>{y}</option>)}
            </select>
            <select value={filingStatus} onChange={e => setFilingStatus(e.target.value)} style={{ width: 'auto !important', padding: '8px 14px !important' }}>
              <option value="single">Single</option>
              <option value="married_jointly">Married Filing Jointly</option>
              <option value="married_separately">Married Filing Separately</option>
              <option value="head_of_household">Head of Household</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Gross Income', value: `$${totalIncome.toLocaleString()}`, color: '#2A9D8F' },
            { label: 'Total Deductions', value: `$${totalDeductions.toLocaleString()}`, color: '#9B5DE5' },
            { label: 'Est. Taxable Income', value: `$${estimatedTaxable.toLocaleString()}`, color: '#C9A84C' },
          ].map(m => (
            <div key={m.label} style={card}>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</p>
              <p style={{ margin: '6px 0 0 0', fontSize: '26px', fontWeight: '700', color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Income */}
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#2A9D8F', fontSize: '15px', fontWeight: '600' }}>💵 Income Sources</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <InputGroup label="Business Revenue (LLC)" field="business" state={income} setState={setIncome} />
              <InputGroup label="Freelance / Contract" field="freelance" state={income} setState={setIncome} />
              <InputGroup label="Investment Income" field="investments" state={income} setState={setIncome} />
              <InputGroup label="Other Income" field="other" state={income} setState={setIncome} />
            </div>
          </div>

          {/* Deductions */}
          <div style={card}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#9B5DE5', fontSize: '15px', fontWeight: '600' }}>🧾 Business Deductions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <InputGroup label="Home Office" field="home_office" state={expenses} setState={setExpenses} />
              <InputGroup label="Software & Tools" field="software" state={expenses} setState={setExpenses} />
              <InputGroup label="Equipment" field="equipment" state={expenses} setState={setExpenses} />
              <InputGroup label="Business Travel" field="travel" state={expenses} setState={setExpenses} />
              <InputGroup label="Business Meals (50%)" field="meals" state={expenses} setState={setExpenses} />
              <InputGroup label="Education" field="education" state={expenses} setState={setExpenses} />
              <InputGroup label="Health Insurance" field="healthcare" state={expenses} setState={setExpenses} />
              <InputGroup label="Retirement (SEP-IRA)" field="retirement" state={expenses} setState={setExpenses} />
              <InputGroup label="Marketing & Ads" field="marketing" state={expenses} setState={setExpenses} />
              <InputGroup label="Professional Services" field="professional" state={expenses} setState={setExpenses} />
            </div>
          </div>
        </div>

        <button className="btn-primary" onClick={runTaxAnalysis} disabled={analyzing}
          style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: analyzing ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #9B5DE5, #C9A84C)', color: '#fff', fontWeight: '700', fontSize: '15px', cursor: analyzing ? 'not-allowed' : 'pointer', marginBottom: '1.5rem' }}>
          {analyzing ? '🧾 Running Tax Analysis...' : '🧾 Run AI Tax Analysis'}
        </button>

        {/* Results */}
        {analysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Estimated Tax Owed', value: `$${(analysis.estimated_tax_owed || 0).toLocaleString()}`, color: '#C1121F' },
                { label: 'Effective Tax Rate', value: `${(analysis.effective_rate || 0).toFixed(1)}%`, color: '#C9A84C' },
                { label: 'Quarterly Payment', value: `$${(analysis.quarterly_payment || 0).toLocaleString()}`, color: '#9B5DE5' },
              ].map(m => (
                <div key={m.label} style={{ ...card, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{m.label}</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: '700', color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>
            {analysis.warnings?.length > 0 && (
              <div style={{ ...card, borderLeft: '3px solid #C1121F' }}>
                <h3 style={{ margin: '0 0 0.75rem 0', color: '#C1121F', fontSize: '14px', fontWeight: '600' }}>⚠️ Warnings</h3>
                {analysis.warnings.map((w: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>• {w}</p>)}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {[
                { label: '💡 Missed Deductions', items: analysis.missed_deductions, color: '#C9A84C' },
                { label: '🎯 Tax Strategies', items: analysis.strategies, color: '#2A9D8F' },
                { label: '💰 Savings Opportunities', items: analysis.savings_opportunities, color: '#9B5DE5' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.75rem 0', color: s.color, fontSize: '13px', fontWeight: '600' }}>{s.label}</p>
                  {s.items?.map((item: string, i: number) => <p key={i} style={{ margin: i === 0 ? 0 : '8px 0 0 0', color: 'rgba(255,255,255,0.65)', fontSize: '12px', lineHeight: '1.5' }}>• {item}</p>)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
