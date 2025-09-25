import React, { useState, useEffect } from 'react';
import { apiService, Statistics } from '../../services/api';
import { ARABIC_LABELS, CURRENCY } from '../../constants/arabic';
import ActivitiesManager from '../Activities/ActivitiesManager';
import MembersManager from '../Members/MembersManager';

export const SimpleDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await apiService.getStatistics();
      if (response.status === 'success' && response.data) {
        setStatistics(response.data);
      } else {
        setError(response.message_ar);
      }
    } catch (error: any) {
      setError('خطأ في تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `${amount.toLocaleString('ar-SA')} ${CURRENCY.symbol}`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('ar-SA');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
        <span className="mr-3 arabic-text">{ARABIC_LABELS.loading}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#b91c1c',
        padding: '16px',
        borderRadius: '8px'
      }} className="arabic-text">
        {error}
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'activities':
        return <ActivitiesManager />;
      case 'members':
        return <MembersManager />;
      case 'dashboard':
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
          <span className="mr-3 arabic-text">{ARABIC_LABELS.loading}</span>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '16px',
          borderRadius: '8px'
        }} className="arabic-text">
          {error}
        </div>
      );
    }

    if (!statistics) {
      return (
        <div className="text-center text-gray-500 arabic-text">
          لا توجد بيانات متاحة
        </div>
      );
    }

    return (
      <div>
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={loadStatistics}
            className="btn-primary arabic-text"
            style={{ marginTop: '16px' }}
          >
            🔄 {ARABIC_LABELS.refresh}
          </button>
        </div>

      {/* Statistics Cards - Improved Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="card hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-blue-600 text-lg font-semibold mb-2 arabic-text flex items-center gap-2">
            <span className="text-2xl">📊</span>
            {ARABIC_LABELS.totalActivities}
          </h3>
          <p className="text-3xl font-bold text-gray-900 arabic-numbers">
            {formatNumber(statistics.overview.total_activities)}
          </p>
        </div>

        <div className="card hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-amber-600 text-lg font-semibold mb-2 arabic-text flex items-center gap-2">
            <span className="text-2xl">⏰</span>
            الأنشطة القادمة
          </h3>
          <p className="text-3xl font-bold text-gray-900 arabic-numbers">
            {formatNumber(statistics.overview.upcoming_activities)}
          </p>
        </div>

        <div className="card hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-green-600 text-lg font-semibold mb-2 arabic-text flex items-center gap-2">
            <span className="text-2xl">👥</span>
            إجمالي المشاركين
          </h3>
          <p className="text-3xl font-bold text-gray-900 arabic-numbers">
            {formatNumber(statistics.overview.total_participants)}
          </p>
        </div>

        <div className="card hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-purple-600 text-lg font-semibold mb-2 arabic-text flex items-center gap-2">
            <span className="text-2xl">💰</span>
            إجمالي الإيرادات
          </h3>
          <p className="text-3xl font-bold text-gray-900 arabic-numbers">
            {formatCurrency(statistics.overview.total_revenue)}
          </p>
        </div>
      </div>

      {/* Categories Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 arabic-text" style={{ marginBottom: '16px' }}>
          📂 الأنشطة حسب الفئة
        </h3>
        <div style={{ paddingLeft: '16px' }}>
          {statistics.by_category.map((category, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              padding: '8px',
              backgroundColor: '#f9fafb',
              borderRadius: '4px'
            }}>
              <span className="arabic-text" style={{ color: '#6b7280' }}>
                {category.category_name_ar}
              </span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '128px',
                  height: '8px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '4px',
                  marginLeft: '12px'
                }}>
                  <div
                    style={{
                      width: `${category.percentage}%`,
                      height: '100%',
                      backgroundColor: '#2563eb',
                      borderRadius: '4px'
                    }}
                  ></div>
                </div>
                <span className="arabic-numbers" style={{ fontWeight: '500' }}>
                  {formatNumber(category.count)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 arabic-text" style={{ marginBottom: '16px' }}>
          📈 النشاط الشهري
        </h3>
        <div>
          {statistics.by_month.slice(-6).map((month, index) => {
            const date = new Date(month.month + '-01');
            const monthName = date.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

            return (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                padding: '8px',
                backgroundColor: '#f9fafb',
                borderRadius: '4px'
              }}>
                <span className="arabic-text" style={{ color: '#6b7280' }}>
                  {monthName}
                </span>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }} className="arabic-text">أنشطة</p>
                    <p className="arabic-numbers" style={{ fontSize: '18px', fontWeight: '600', margin: '4px 0 0 0' }}>
                      {formatNumber(month.activities_count)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }} className="arabic-text">مشاركين</p>
                    <p className="arabic-numbers" style={{ fontSize: '18px', fontWeight: '600', margin: '4px 0 0 0' }}>
                      {formatNumber(month.participants_count)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Backend Connection Status */}
      <div className="card" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <h3 className="arabic-text" style={{ color: '#15803d', marginBottom: '8px' }}>
          🔗 حالة الاتصال بالخادم
        </h3>
        <p className="arabic-text" style={{ color: '#15803d' }}>
          ✅ متصل بنجاح مع الخادم الخلفي (منفذ 5001)
        </p>
        <p className="arabic-text" style={{ color: '#15803d', fontSize: '14px', marginTop: '8px' }}>
          📡 البيانات محدثة في الوقت الفعلي من قاعدة البيانات
        </p>
      </div>
      </div>
    );
  }

  return (
    <div style={{ direction: 'rtl' }}>
      {/* Navigation Header */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '20px'
      }}>
        <h2 className="text-2xl font-bold text-gray-900 arabic-text" style={{ marginBottom: '16px' }}>
          {ARABIC_LABELS.dashboard}
        </h2>
        <p className="text-gray-600 arabic-text" style={{ marginBottom: '16px' }}>
          نظرة عامة على إحصائيات التطبيق
        </p>

        <nav className="flex flex-wrap gap-2 sm:gap-3">
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              currentView === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setCurrentView('dashboard')}
          >
            <span className="flex items-center gap-2">
              <span>🏠</span>
              <span className="hidden sm:inline">الرئيسية</span>
            </span>
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              currentView === 'activities'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setCurrentView('activities')}
          >
            <span className="flex items-center gap-2">
              <span>📋</span>
              <span className="hidden sm:inline">إدارة الأنشطة</span>
            </span>
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              currentView === 'members'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setCurrentView('members')}
          >
            <span className="flex items-center gap-2">
              <span>👥</span>
              <span className="hidden sm:inline">إدارة الأعضاء</span>
            </span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ padding: '0 20px' }}>
        {renderContent()}
      </div>
    </div>
  );
};