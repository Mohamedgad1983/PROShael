import React, { useState } from 'react';
import ExpenseManagement from './ExpenseManagement';

const FinancialReportsSimple = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '500px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#333', textAlign: 'right' }}>
        التقارير المالية
      </h1>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'dashboard' ? '#4CAF50' : '#ddd',
            color: activeTab === 'dashboard' ? 'white' : '#333',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          لوحة القيادة
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'expenses' ? '#4CAF50' : '#ddd',
            color: activeTab === 'expenses' ? 'white' : '#333',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          إدارة المصروفات
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'reports' ? '#4CAF50' : '#ddd',
            color: activeTab === 'reports' ? 'white' : '#333',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          التقارير والتحليلات
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', minHeight: '300px' }}>
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: '15px', textAlign: 'right' }}>لوحة القيادة المالية</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '5px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>٥٠,٠٠٠ ريال</div>
                <div style={{ fontSize: '14px', color: '#666' }}>إجمالي الإيرادات</div>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#ffebee', borderRadius: '5px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>٣٠,٠٠٠ ريال</div>
                <div style={{ fontSize: '14px', color: '#666' }}>إجمالي المصروفات</div>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '5px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>٢٠,٠٠٠ ريال</div>
                <div style={{ fontSize: '14px', color: '#666' }}>صافي الدخل</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <ExpenseManagement
            dateFilter={{
              hijri_month: new Date().getMonth() + 1,
              hijri_year: new Date().getFullYear()
            }}
            onExpenseChange={() => {
              // Refresh data if needed
              console.log('Expense changed');
            }}
          />
        )}

        {activeTab === 'reports' && (
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: '15px', textAlign: 'right' }}>التقارير والتحليلات</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button style={{
                padding: '8px 16px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}>
                تصدير PDF
              </button>
              <button style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}>
                تصدير Excel
              </button>
            </div>
            <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
              <p style={{ textAlign: 'right' }}>الرسوم البيانية والتحليلات ستظهر هنا...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialReportsSimple;