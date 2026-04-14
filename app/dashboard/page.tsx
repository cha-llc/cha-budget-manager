'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
// Uses direct Supabase queries - no Zustand store
import Link from 'next/link';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1.5rem' };

const LIVE_PRODUCTS = [
  { name: 'BrandPulse', price: 47, url: 'getbrandpulse.vercel.app' },
  { name: 'Clarity Engine', price: 37, url: 'getclarityengine.vercel.app' },
  { name: 'Flagged', price: 4.99, url: 'getflagged.vercel.app' },
  { name: 'Freedom Era Audit', price: 150, url: 'freedomaudit.youcanbook.me' },
  { name: 'Business Ops Fixer', price: 497, url: 'calendly.com/cjhadisa/business-ops-fixer' },
];

const QUICK_LINKS = [
  { href: '/documents', icon: '🗂️', label: 'Upload Document', desc: 'AI extracts financial data' },
  { href: '/goals', icon: '🎯', label: 'Track Goals', desc: 'Savings & milestone progress' },
  { href: '/tax', icon: '🧾', label: 'Tax Planning', desc: 'Optimize deductions' },
  { href: '/investments', icon: '📈', label: 'Portfolio', desc: 'Track your investments' },
  { href: '/networth', icon: '🏦', label: 'Net Worth', desc: 'Assets & liabilities' },
  { href: '/domination', icon: '👑', label: 'Domination Plan', desc: 'Your financial blueprint' },
];

export default function Dashboard() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  const syncStripe = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/stripe-sync', { method: 'POST' });
      const data = await res.json();
      setSyncMsg(data.message || (data.error ? `Error: ${data.error}` : 'Sync complete'));
      if (data.synced > 0) {
        // Refresh revenue data
        const { data: rev } = await (await import('@/lib/supabase')).supabase.from('revenue').select('*');
        if (rev) setRevenue(rev as any);
      }
    } catch { setSyncMsg('Sync failed. Check Stripe connection.'); }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 5000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [budgetsRes, expensesRes, revenueRes] = await Promise.all([
          supabase.from('division_budgets').select('*'),
          supabase.from('expenses').select('*'),
          supabase.from('revenue').select('*'),
        ]);
        if (budgetsRes.data) setBudgets(budgetsRes.data as any);
        if (expensesRes.data) setExpenses(expensesRes.data as any);
        if (revenueRes.data) setRevenue(revenueRes.data as any);
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.monthly_budget || 0), 0);
  const totalSpent = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalRevenue = revenue.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const netCashFlow = totalRevenue - totalSpent;

  const getAIInsight = async () => {
    setLoadingInsight(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: 'You are a financial advisor AI. Give a direct, strategic 2-3 sentence insight. No fluff.',
          messages: [{ role: 'user', content: `C.H.A. LLC financial snapshot: Budget $${totalBudget}/mo, Expenses $${totalSpent}, Revenue $${totalRevenue} (${revenue.length} sales), Net $${netCashFlow}. 5 products live: BrandPulse $47, Clarity Engine $37, Flagged $4.99/mo, Freedom Era Audit $150, Business Ops Fixer $497. Give a sharp, actionable insight for right now.` }]
        })
      });
      const data = await res.json();
      setAiInsight(data.content?.find((c: any) => c.type === 'text')?.text || '');
    } catch {
      setAiInsight('Could not load AI insight. Check your connection.');
    } finally {
      setLoadingInsight(false);
    }
  };

  const MetricCard = ({ label, value, sub, color, icon }: any) => (
    <div className="card-hover" style={{ ...card, borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      </div>
      <p style={{ margin: '8px 0 4px 0', fontSize: '28px', fontWeight: '700', color }}>{value}</p>
      <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{sub}</p>
    </div>
  );

  return (
    <Layout activeTab="dashboard">
      <div style={{ maxWidth: '1200px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '24px', fontWeight: '700', fontFamily: "'Lora', serif" }}>
            Financial Overview
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '14px' }}>
            C.H.A. LLC • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Status Banner — dynamic based on actual revenue */}
        <div style={{ padding: '1rem 1.25rem', background: totalRevenue > 0 ? 'rgba(42,157,143,0.1)' : 'rgba(201,168,76,0.1)', border: `1px solid ${totalRevenue > 0 ? 'rgba(42,157,143,0.4)' : 'rgba(201,168,76,0.4)'}`, borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: '0 0 2px 0', color: totalRevenue > 0 ? '#2A9D8F' : '#C9A84C', fontWeight: '700', fontSize: '14px' }}>
              {totalRevenue > 0 ? `💰 Revenue Active — $${totalRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})} earned` : '🚀 Products Live — Revenue Pipeline Open'}
            </p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
              5 products live • {totalRevenue > 0 ? `${revenue.length} sale${revenue.length !== 1 ? 's' : ''} recorded • Sync Stripe for latest` : 'Click Sync Stripe Sales to pull in payments'}
            </p>
          </div>
          <Link href="/domination" style={{ padding: '8px 16px', borderRadius: '8px', background: totalRevenue > 0 ? '#2A9D8F' : '#C9A84C', color: '#1A1A2E', fontWeight: '700', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}>View Plan →</Link>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <MetricCard label="Monthly Budget" value={`$${totalBudget.toLocaleString()}`} sub="Across all divisions" color="#C9A84C" icon="📊" />
          <MetricCard label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} sub="All products & services" color="#2A9D8F" icon="💰" />
          <MetricCard label="Total Expenses" value={`$${totalSpent.toLocaleString()}`} sub={`${totalBudget > 0 ? ((totalSpent/totalBudget)*100).toFixed(0) : 0}% of budget`} color="#C1121F" icon="📝" />
          <MetricCard label="Net Cash Flow" value={`${netCashFlow >= 0 ? '+' : ''}$${netCashFlow.toLocaleString()}`} sub="Revenue minus expenses" color={netCashFlow >= 0 ? '#2A9D8F' : '#C1121F'} icon="📈" />
        </div>

        {/* AI Insight */}
        <div style={{ ...card, marginBottom: '2rem', borderColor: 'rgba(155,93,229,0.4)', background: 'rgba(155,93,229,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiInsight ? '1rem' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>🤖</span>
              <p style={{ margin: 0, color: '#9B5DE5', fontSize: '14px', fontWeight: '600' }}>AI Financial Insight</p>
            </div>
            <button className="btn-primary" onClick={getAIInsight} disabled={loadingInsight}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'rgba(155,93,229,0.3)', color: '#9B5DE5', fontWeight: '600', fontSize: '12px', cursor: loadingInsight ? 'not-allowed' : 'pointer' }}>
              {loadingInsight ? 'Thinking...' : aiInsight ? 'Refresh' : 'Get Insight'}
            </button>
          </div>
          {aiInsight && <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: '1.7' }}>{aiInsight}</p>}
          {!aiInsight && !loadingInsight && <p style={{ margin: '0.75rem 0 0 0', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Click "Get Insight" for an AI analysis of your current financial position.</p>}
        </div>

        {/* Live Products */}
        <div style={{ ...card, marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '600' }}>🛒 Live Products</h3>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {syncMsg && <span style={{ fontSize: '12px', color: '#2A9D8F' }}>{syncMsg}</span>}
              <button className="btn-primary" onClick={syncStripe} disabled={syncing}
                style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(42,157,143,0.4)', background: 'transparent', color: '#2A9D8F', fontWeight: '600', fontSize: '12px', cursor: syncing ? 'not-allowed' : 'pointer' }}>
                {syncing ? '⏳ Syncing...' : '🔄 Sync Stripe Sales'}
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
            {LIVE_PRODUCTS.map(p => (
              <div key={p.name} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#fff', fontWeight: '600' }}>{p.name}</p>
                <p style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#C9A84C' }}>${p.price}</p>
                <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.3)', wordBreak: 'break-all' }}>{p.url}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Nav */}
        <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '16px', fontWeight: '600' }}>Quick Access</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {QUICK_LINKS.map(l => (
            <Link key={l.href} href={l.href} style={{ textDecoration: 'none' }}>
              <div className="card-hover" style={{ ...card, display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                <span style={{ fontSize: '1.5rem' }}>{l.icon}</span>
                <div>
                  <p style={{ margin: 0, color: '#fff', fontSize: '14px', fontWeight: '600' }}>{l.label}</p>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{l.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
