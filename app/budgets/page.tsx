'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { useBudgetStore } from '@/lib/store';

export default function Budgets() {
  const { budgets, setBudgets } = useBudgetStore();
  const [formData, setFormData] = useState({ division: 'Consulting', monthly_budget: 5000 });
  const [loading, setLoading] = useState(false);

  const divisions = ['Consulting', 'Tea Time Network', 'Digital Tools', 'Books'];

  useEffect(() => {
    const fetchBudgets = async () => {
      const { data } = await supabase.from('division_budgets').select('*');
      if (data) setBudgets(data as any);
    };
    fetchBudgets();
  }, []);

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await supabase
        .from('division_budgets')
        .upsert({ division: formData.division, monthly_budget: formData.monthly_budget })
        .select();

      if (data) {
        setBudgets(budgets.filter(b => b.division !== formData.division).concat(data as any));
        setFormData({ division: 'Consulting', monthly_budget: 5000 });
      }
    } catch (error) {
      console.error('Error adding budget:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout activeTab="budgets">
      <div style={{ maxWidth: '1200px' }}>
        <h2 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E', fontSize: '20px' }}>Division Budgets</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Add Budget Form */}
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E' }}>Set Budget</h3>
            <form onSubmit={handleAddBudget}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600', color: '#1A1A2E' }}>
                  Division
                </label>
                <select
                  value={formData.division}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  {divisions.map(div => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600', color: '#1A1A2E' }}>
                  Monthly Budget ($)
                </label>
                <input
                  type="number"
                  value={formData.monthly_budget}
                  onChange={(e) => setFormData({ ...formData, monthly_budget: parseFloat(e.target.value) })}
                  min="0"
                  step="100"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#1A1A2E',
                  color: '#C9A84C',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Saving...' : 'Set Budget'}
              </button>
            </form>
          </div>

          {/* Current Budgets */}
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E' }}>Current Budgets</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {budgets.length > 0 ? (
                budgets.map((budget) => (
                  <div key={budget.division} style={{
                    padding: '1rem',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '6px',
                    borderLeft: '3px solid #2A9D8F'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', color: '#1A1A2E' }}>{budget.division}</span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2A9D8F' }}>
                        ${budget.monthly_budget.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#999', textAlign: 'center' }}>No budgets set yet</p>
              )}
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '600', color: '#1A1A2E' }}>Total Budget</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1A1A2E' }}>
                  ${budgets.reduce((sum, b) => sum + b.monthly_budget, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
