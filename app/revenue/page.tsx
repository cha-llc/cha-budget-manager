'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { useBudgetStore } from '@/lib/store';

export default function Revenue() {
  const { revenue, setRevenue } = useBudgetStore();
  const [formData, setFormData] = useState({
    product_name: 'BrandPulse',
    amount: 47,
    source: 'Stripe',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  const products = ['BrandPulse', 'Clarity Engine', 'Flagged', 'Freedom Era Audit', 'Business Ops Fixer', 'Burned-Out Professional Reset', 'We Need to Talk', 'First-Gen Table', 'Patreon'];
  const sources = ['Stripe', 'Gumroad', 'Patreon', 'Direct', 'Other'];

  useEffect(() => {
    const fetchRevenue = async () => {
      const { data } = await supabase.from('revenue').select('*');
      if (data) setRevenue(data as any);
    };
    fetchRevenue();
  }, []);

  const handleAddRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await supabase
        .from('revenue')
        .insert([formData])
        .select();

      if (data) {
        setRevenue([...revenue, data[0] as any]);
        setFormData({
          product_name: 'BrandPulse',
          amount: 47,
          source: 'Stripe',
          date: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('Error adding revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
  const revenueByProduct = Object.entries(
    revenue.reduce((acc: any, r) => {
      acc[r.product_name] = (acc[r.product_name] || 0) + r.amount;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  return (
    <Layout activeTab="revenue">
      <div style={{ maxWidth: '1200px' }}>
        <h2 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E', fontSize: '20px' }}>Revenue Tracking</h2>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #2A9D8F'
          }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Revenue</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: 'bold', color: '#2A9D8F' }}>
              ${totalRevenue.toLocaleString()}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#999' }}>From {revenue.length} transactions</p>
          </div>
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #9B5DE5'
          }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#666', fontWeight: '500' }}>Avg Transaction</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: 'bold', color: '#9B5DE5' }}>
              ${revenue.length > 0 ? (totalRevenue / revenue.length).toFixed(2) : '0.00'}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#999' }}>Average per sale</p>
          </div>
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #C9A84C'
          }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#666', fontWeight: '500' }}>Top Product</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#C9A84C' }}>
              {revenueByProduct.length > 0 ? revenueByProduct[0][0] : 'N/A'}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#999' }}>
              ${revenueByProduct.length > 0 ? revenueByProduct[0][1].toFixed(2) : '0.00'}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Add Revenue Form */}
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            height: 'fit-content'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E' }}>Log Sale</h3>
            <form onSubmit={handleAddRevenue}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600', color: '#1A1A2E' }}>
                  Product
                </label>
                <select
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  {products.map(prod => (
                    <option key={prod} value={prod}>{prod}</option>
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
                  Source
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  {sources.map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
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
                  backgroundColor: '#2A9D8F',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Adding...' : 'Log Revenue'}
              </button>
            </form>
          </div>

          {/* Revenue by Product */}
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E' }}>Revenue by Product</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {revenueByProduct.length > 0 ? (
                revenueByProduct.map(([product, amount]) => (
                  <div key={product} style={{
                    padding: '1rem',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '6px',
                    borderLeft: '3px solid #2A9D8F'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '600', color: '#1A1A2E' }}>{product}</span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2A9D8F' }}>
                        ${amount.toFixed(2)}
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: '#e0e0e0',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(amount / Math.max(...revenueByProduct.map(p => p[1]))) * 100}%`,
                        height: '100%',
                        backgroundColor: '#2A9D8F'
                      }} />
                    </div>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '11px', color: '#999' }}>
                      {((amount / totalRevenue) * 100).toFixed(1)}% of total
                    </p>
                  </div>
                ))
              ) : (
                <p style={{ color: '#999', textAlign: 'center' }}>No revenue recorded yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
