'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { useBudgetStore } from '@/lib/store';

export default function Expenses() {
  const { expenses, setExpenses } = useBudgetStore();
  const [formData, setFormData] = useState({
    division: 'Consulting',
    category: 'Tools',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  const divisions = ['Consulting', 'Tea Time Network', 'Digital Tools', 'Books'];
  const categories = ['Tools', 'Marketing', 'Hosting', 'Payroll', 'Content', 'Travel', 'Software', 'Other'];

  useEffect(() => {
    const fetchExpenses = async () => {
      const { data } = await supabase.from('expenses').select('*');
      if (data) setExpenses(data as any);
    };
    fetchExpenses();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await supabase
        .from('expenses')
        .insert([formData])
        .select();

      if (data) {
        setExpenses([...expenses, data[0] as any]);
        setFormData({
          division: 'Consulting',
          category: 'Tools',
          amount: 0,
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <Layout activeTab="expenses">
      <div style={{ maxWidth: '1200px' }}>
        <h2 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E', fontSize: '20px' }}>Expenses - {currentMonth}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Add Expense Form */}
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            height: 'fit-content'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E' }}>Log Expense</h3>
            <form onSubmit={handleAddExpense}>
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
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600', color: '#1A1A2E' }}>
                  Amount ($)
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  min="0"
                  step="0.01"
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600', color: '#1A1A2E' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Vercel hosting for April"
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600', color: '#1A1A2E' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                {loading ? 'Adding...' : 'Add Expense'}
              </button>
            </form>
          </div>

          {/* Expenses List */}
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E' }}>Recent Expenses</h3>
            <div style={{ display: 'grid', gap: '1rem', maxHeight: '600px', overflowY: 'auto' }}>
              {expenses.length > 0 ? (
                [...expenses].reverse().map((expense, idx) => (
                  <div key={idx} style={{
                    padding: '1rem',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '6px',
                    borderLeft: '3px solid #C1121F'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: '600', color: '#1A1A2E' }}>{expense.description || 'Unnamed Expense'}</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                          {expense.division} • {expense.category}
                        </p>
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#C1121F' }}>
                        -${expense.amount.toFixed(2)}
                      </span>
                    </div>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '11px', color: '#999' }}>
                      {new Date(expense.date).toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <p style={{ color: '#999', textAlign: 'center' }}>No expenses logged yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
