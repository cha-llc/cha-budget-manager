'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { useBudgetStore } from '@/lib/store';
import Link from 'next/link';

export default function Dashboard() {
  const { budgets, expenses, revenue, setBudgets, setExpenses, setRevenue } = useBudgetStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [budgetsRes, expensesRes, revenueRes] = await Promise.all([
          supabase.from('division_budgets').select('*'),
          supabase.from('expenses').select('*'),
          supabase.from('revenue').select('*')
        ]);

        if (budgetsRes.data) setBudgets(budgetsRes.data as any);
        if (expensesRes.data) setExpenses(expensesRes.data as any);
        if (revenueRes.data) setRevenue(revenueRes.data as any);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const divisions = ['Consulting', 'Tea Time Network', 'Digital Tools', 'Books'];
  const totalBudget = budgets.reduce((sum, b) => sum + b.monthly_budget, 0);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);

  const MetricCard = ({ label, value, subtext, color = '#1A1A2E' }: any) => (
    <div style={{
      backgroundColor: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '1.5rem',
      flex: 1,
      minWidth: '200px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      borderLeft: `4px solid ${color}`
    }}>
      <p style={{ margin: 0, fontSize: '12px', color: '#666', fontWeight: '500' }}>{label}</p>
      <p style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: 'bold', color }}>{value}</p>
      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#999' }}>{subtext}</p>
    </div>
  );

  return (
    <Layout activeTab="dashboard">
      <div style={{ maxWidth: '1400px' }}>
        <h2 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E', fontSize: '20px' }}>Dashboard Overview</h2>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <MetricCard
            label="Total Monthly Budget"
            value={`$${totalBudget.toLocaleString()}`}
            subtext={`${divisions.length} divisions`}
            color="#2A9D8F"
          />
          <MetricCard
            label="Total Spent (MTD)"
            value={`$${totalSpent.toLocaleString()}`}
            subtext={`${((totalSpent / totalBudget) * 100).toFixed(1)}% of budget`}
            color="#C1121F"
          />
          <MetricCard
            label="Remaining Budget"
            value={`$${Math.max(0, totalBudget - totalSpent).toLocaleString()}`}
            subtext={`${((Math.max(0, totalBudget - totalSpent) / totalBudget) * 100).toFixed(1)}% available`}
            color="#C9A84C"
          />
          <MetricCard
            label="Total Revenue"
            value={`$${totalRevenue.toLocaleString()}`}
            subtext={`From ${revenue.length} transactions`}
            color="#9B5DE5"
          />
        </div>

        {/* Division Breakdown */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E' }}>Division Health Check</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {divisions.map((division) => {
              const budget = budgets.find(b => b.division === division);
              const spent = expenses
                .filter(e => e.division === division)
                .reduce((sum, e) => sum + e.amount, 0);
              const budgetAmount = budget?.monthly_budget || 0;
              const percentUsed = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
              const isWarning = percentUsed > 75;
              const isOver = percentUsed > 100;

              return (
                <div key={division} style={{
                  padding: '1rem',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '6px',
                  borderLeft: `3px solid ${isOver ? '#C1121F' : isWarning ? '#EF9F27' : '#2A9D8F'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '600', color: '#1A1A2E' }}>{division}</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      ${spent.toLocaleString()} / ${budgetAmount.toLocaleString()}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.min(percentUsed, 100)}%`,
                      height: '100%',
                      backgroundColor: isOver ? '#C1121F' : isWarning ? '#EF9F27' : '#2A9D8F',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '11px' }}>
                    <span style={{ color: '#666' }}>{percentUsed.toFixed(1)}% used</span>
                    <span style={{ color: isOver ? '#C1121F' : '#666' }}>
                      {isOver ? `Over by $${(spent - budgetAmount).toLocaleString()}` : `$${Math.max(0, budgetAmount - spent).toLocaleString()} remaining`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <Link href="/budgets" style={{
              display: 'block',
              padding: '1rem',
              backgroundColor: '#1A1A2E',
              color: '#C9A84C',
              textDecoration: 'none',
              borderRadius: '6px',
              textAlign: 'center',
              fontWeight: '600',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}>
              💰 Set Budgets
            </Link>
            <Link href="/expenses" style={{
              display: 'block',
              padding: '1rem',
              backgroundColor: '#1A1A2E',
              color: '#C9A84C',
              textDecoration: 'none',
              borderRadius: '6px',
              textAlign: 'center',
              fontWeight: '600',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}>
              📝 Log Expense
            </Link>
            <Link href="/revenue" style={{
              display: 'block',
              padding: '1rem',
              backgroundColor: '#1A1A2E',
              color: '#C9A84C',
              textDecoration: 'none',
              borderRadius: '6px',
              textAlign: 'center',
              fontWeight: '600',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}>
              💹 Track Revenue
            </Link>
            <Link href="/reports" style={{
              display: 'block',
              padding: '1rem',
              backgroundColor: '#1A1A2E',
              color: '#C9A84C',
              textDecoration: 'none',
              borderRadius: '6px',
              textAlign: 'center',
              fontWeight: '600',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}>
              📄 View Reports
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
