'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useBudgetStore } from '@/lib/store';

export default function Reports() {
  const { budgets, expenses, revenue } = useBudgetStore();
  const [selectedDivision, setSelectedDivision] = useState('All Divisions');

  const divisions = ['All Divisions', 'Consulting', 'Tea Time Network', 'Digital Tools', 'Books'];

  const getFilteredData = () => {
    if (selectedDivision === 'All Divisions') {
      return { expenses, revenue };
    }
    return {
      expenses: expenses.filter(e => e.division === selectedDivision),
      revenue: revenue.filter(r => r.product_name.includes(selectedDivision))
    };
  };

  const { expenses: filteredExpenses, revenue: filteredRevenue } = getFilteredData();
  const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalRev = filteredRevenue.reduce((sum, r) => sum + r.amount, 0);

  return (
    <Layout activeTab="reports">
      <div style={{ maxWidth: '1200px' }}>
        <h2 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E', fontSize: '20px' }}>Financial Reports</h2>

        {/* Division Filter */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A2E', marginRight: '1rem' }}>
            Filter by Division:
          </label>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            {divisions.map(div => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #C1121F'
          }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Total Expenses</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#C1121F' }}>
              ${totalSpent.toFixed(2)}
            </p>
          </div>
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #2A9D8F'
          }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Total Revenue</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#2A9D8F' }}>
              ${totalRev.toFixed(2)}
            </p>
          </div>
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #9B5DE5'
          }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Net</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: totalRev - totalSpent >= 0 ? '#2A9D8F' : '#C1121F' }}>
              ${(totalRev - totalSpent).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Detailed Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Expenses Table */}
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E' }}>Expenses</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0', color: '#666', fontWeight: '600' }}>Description</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0', color: '#666', fontWeight: '600' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '0.75rem 0', color: '#1A1A2E' }}>{expense.description}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 0', color: '#C1121F', fontWeight: '600' }}>
                        ${expense.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>No expenses</td>
                  </tr>
                )}
                <tr style={{ borderTop: '2px solid #e0e0e0' }}>
                  <td style={{ padding: '0.75rem 0', color: '#1A1A2E', fontWeight: '600' }}>Total</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem 0', color: '#C1121F', fontWeight: 'bold', fontSize: '14px' }}>
                    ${totalSpent.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Revenue Table */}
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E' }}>Revenue</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0', color: '#666', fontWeight: '600' }}>Product</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0', color: '#666', fontWeight: '600' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredRevenue.length > 0 ? (
                  filteredRevenue.map((rev, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '0.75rem 0', color: '#1A1A2E' }}>{rev.product_name}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 0', color: '#2A9D8F', fontWeight: '600' }}>
                        ${rev.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>No revenue</td>
                  </tr>
                )}
                <tr style={{ borderTop: '2px solid #e0e0e0' }}>
                  <td style={{ padding: '0.75rem 0', color: '#1A1A2E', fontWeight: '600' }}>Total</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem 0', color: '#2A9D8F', fontWeight: 'bold', fontSize: '14px' }}>
                    ${totalRev.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
