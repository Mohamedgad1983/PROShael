/**
 * MobileReports - Mobile-optimized financial reports and analytics
 * Features: Charts, statistics, export functionality, offline support
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useMobile, useHapticFeedback } from '../../hooks/useMobile';
import { ChartSkeleton, StatsCardSkeleton, SkeletonProvider } from '../Common/SkeletonLoaders';
import performanceMonitor, { trackUserAction, measureRender } from '../../utils/performanceMonitor';
import '../../styles/mobile-arabic.css';

const MobileReports = ({ user, isOnline = true, onLogout, device, viewport }) => {
  const { applySafeArea } = useMobile();
  const { feedback } = useHapticFeedback();

  // Component state
  const [reportsState, setReportsState] = useState({
    loading: false,
    period: 'month', // month, quarter, year
    chartType: 'payments', // payments, activities, summary
    data: null
  });

  // Performance monitoring
  const renderMonitor = useMemo(() => measureRender('MobileReports'), []);

  // Convert numbers to Arabic numerals
  const toArabicNumerals = useCallback((num) => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
  }, []);

  // Mock data for different periods and types
  const mockData = useMemo(() => ({
    month: {
      payments: {
        total: 15000,
        completed: 12000,
        pending: 2000,
        failed: 1000,
        chart: [
          { name: 'الأسبوع الأول', value: 4000 },
          { name: 'الأسبوع الثاني', value: 3000 },
          { name: 'الأسبوع الثالث', value: 3500 },
          { name: 'الأسبوع الرابع', value: 4500 }
        ]
      },
      activities: {
        total: 8,
        attended: 6,
        missed: 2,
        chart: [
          { name: 'رحلات', value: 3 },
          { name: 'اجتماعات', value: 2 },
          { name: 'فعاليات', value: 3 }
        ]
      }
    },
    quarter: {
      payments: {
        total: 45000,
        completed: 38000,
        pending: 4000,
        failed: 3000,
        chart: [
          { name: 'يناير', value: 15000 },
          { name: 'فبراير', value: 14000 },
          { name: 'مارس', value: 16000 }
        ]
      },
      activities: {
        total: 24,
        attended: 20,
        missed: 4,
        chart: [
          { name: 'يناير', value: 8 },
          { name: 'فبراير', value: 7 },
          { name: 'مارس', value: 9 }
        ]
      }
    },
    year: {
      payments: {
        total: 180000,
        completed: 156000,
        pending: 12000,
        failed: 12000,
        chart: [
          { name: 'Q1', value: 45000 },
          { name: 'Q2', value: 42000 },
          { name: 'Q3', value: 48000 },
          { name: 'Q4', value: 45000 }
        ]
      },
      activities: {
        total: 96,
        attended: 84,
        missed: 12,
        chart: [
          { name: 'Q1', value: 24 },
          { name: 'Q2', value: 22 },
          { name: 'Q3', value: 26 },
          { name: 'Q4', value: 24 }
        ]
      }
    }
  }), []);

  // Get current data based on selected period and chart type
  const currentData = useMemo(() => {
    return mockData[reportsState.period] || mockData.month;
  }, [mockData, reportsState.period]);

  // Handle period change
  const handlePeriodChange = useCallback((period) => {
    setReportsState(prev => ({ ...prev, period }));
    trackUserAction('reports-period-change', { period });
    feedback('light');
  }, [feedback]);

  // Handle chart type change
  const handleChartTypeChange = useCallback((chartType) => {
    setReportsState(prev => ({ ...prev, chartType }));
    trackUserAction('reports-chart-change', { chartType });
    feedback('light');
  }, [feedback]);

  // Export report
  const handleExportReport = useCallback(async () => {
    try {
      trackUserAction('reports-export', {
        period: reportsState.period,
        chartType: reportsState.chartType
      });

      feedback('medium');

      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create downloadable content
      const reportData = {
        period: reportsState.period,
        chartType: reportsState.chartType,
        data: currentData,
        exportDate: new Date().toISOString(),
        user: user?.name || 'المستخدم'
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `تقرير-${reportsState.period}-${reportsState.chartType}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      feedback('success');

    } catch (error) {
      console.error('Export failed:', error);
      feedback('error');
    }
  }, [reportsState, currentData, user, feedback]);

  // Simple chart component
  const SimpleChart = ({ data, type = 'bar' }) => {
    const maxValue = Math.max(...data.map(item => item.value));

    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-20 text-slate-300 text-sm text-right">{item.name}</div>
            <div className="flex-1 relative">
              <div className="w-full bg-black bg-opacity-20 rounded-full h-8 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-3"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`
                  }}
                >
                  <span className="text-white text-xs font-semibold">
                    {toArabicNumerals(item.value.toLocaleString())}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render payments report
  const renderPaymentsReport = () => {
    const paymentsData = currentData.payments;

    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card text-center">
            <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center text-green-400 text-xl mx-auto mb-3">
              💰
            </div>
            <p className="text-slate-300 text-sm mb-1">إجمالي المدفوعات</p>
            <p className="text-white font-bold text-lg">{toArabicNumerals(paymentsData.total.toLocaleString())} ر.س</p>
          </div>

          <div className="glass-card text-center">
            <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center text-blue-400 text-xl mx-auto mb-3">
              ✅
            </div>
            <p className="text-slate-300 text-sm mb-1">المدفوعات المكتملة</p>
            <p className="text-white font-bold text-lg">{toArabicNumerals(paymentsData.completed.toLocaleString())} ر.س</p>
          </div>

          <div className="glass-card text-center">
            <div className="w-12 h-12 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center text-yellow-400 text-xl mx-auto mb-3">
              ⏳
            </div>
            <p className="text-slate-300 text-sm mb-1">المدفوعات المعلقة</p>
            <p className="text-white font-bold text-lg">{toArabicNumerals(paymentsData.pending.toLocaleString())} ر.س</p>
          </div>

          <div className="glass-card text-center">
            <div className="w-12 h-12 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center text-red-400 text-xl mx-auto mb-3">
              ❌
            </div>
            <p className="text-slate-300 text-sm mb-1">المدفوعات الفاشلة</p>
            <p className="text-white font-bold text-lg">{toArabicNumerals(paymentsData.failed.toLocaleString())} ر.س</p>
          </div>
        </div>

        {/* Chart */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">التوزيع الزمني للمدفوعات</h3>
          <SimpleChart data={paymentsData.chart} />
        </div>

        {/* Performance metrics */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">مؤشرات الأداء</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">معدل النجاح</span>
              <span className="text-green-400 font-semibold">
                {toArabicNumerals(((paymentsData.completed / paymentsData.total) * 100).toFixed(1))}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">معدل التأخير</span>
              <span className="text-yellow-400 font-semibold">
                {toArabicNumerals(((paymentsData.pending / paymentsData.total) * 100).toFixed(1))}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">معدل الفشل</span>
              <span className="text-red-400 font-semibold">
                {toArabicNumerals(((paymentsData.failed / paymentsData.total) * 100).toFixed(1))}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render activities report
  const renderActivitiesReport = () => {
    const activitiesData = currentData.activities;

    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card text-center">
            <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center text-blue-400 text-xl mx-auto mb-3">
              🎯
            </div>
            <p className="text-slate-300 text-sm mb-1">إجمالي الأنشطة</p>
            <p className="text-white font-bold text-lg">{toArabicNumerals(activitiesData.total)}</p>
          </div>

          <div className="glass-card text-center">
            <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center text-green-400 text-xl mx-auto mb-3">
              ✅
            </div>
            <p className="text-slate-300 text-sm mb-1">تم الحضور</p>
            <p className="text-white font-bold text-lg">{toArabicNumerals(activitiesData.attended)}</p>
          </div>

          <div className="glass-card text-center">
            <div className="w-12 h-12 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center text-red-400 text-xl mx-auto mb-3">
              ❌
            </div>
            <p className="text-slate-300 text-sm mb-1">تم التغيب</p>
            <p className="text-white font-bold text-lg">{toArabicNumerals(activitiesData.missed)}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">توزيع الأنشطة</h3>
          <SimpleChart data={activitiesData.chart} />
        </div>

        {/* Attendance rate */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold text-white mb-4">معدل الحضور</h3>
          <div className="relative">
            <div className="w-full bg-black bg-opacity-20 rounded-full h-12 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-1000 ease-out flex items-center justify-center"
                style={{
                  width: `${(activitiesData.attended / activitiesData.total) * 100}%`
                }}
              >
                <span className="text-white font-bold">
                  {toArabicNumerals(((activitiesData.attended / activitiesData.total) * 100).toFixed(1))}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-primary" dir="rtl">
      {/* Safe area container */}
      <div className="safe-area-container pb-20">

        {/* Header */}
        <header
          className="glass-nav sticky top-0 z-40"
          style={applySafeArea(['top'])}
        >
          <div className="container py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-white">التقارير</h1>
                <p className="text-slate-300 text-sm">الإحصائيات والتحليلات</p>
              </div>

              <button
                className="w-10 h-10 bg-gradient-accent rounded-full flex items-center justify-center"
                onClick={handleExportReport}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>

            {/* Period selector */}
            <div className="flex gap-1 mb-4 bg-black bg-opacity-20 rounded-xl p-1">
              {[
                { id: 'month', label: 'شهري' },
                { id: 'quarter', label: 'ربع سنوي' },
                { id: 'year', label: 'سنوي' }
              ].map(period => (
                <button
                  key={period.id}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    reportsState.period === period.id
                      ? 'bg-white bg-opacity-20 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  onClick={() => handlePeriodChange(period.id)}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {/* Chart type selector */}
            <div className="flex gap-1 bg-black bg-opacity-20 rounded-xl p-1">
              {[
                { id: 'payments', label: 'المدفوعات' },
                { id: 'activities', label: 'الأنشطة' }
              ].map(chartType => (
                <button
                  key={chartType.id}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    reportsState.chartType === chartType.id
                      ? 'bg-white bg-opacity-20 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  onClick={() => handleChartTypeChange(chartType.id)}
                >
                  {chartType.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container py-6">
          <SkeletonProvider
            loading={reportsState.loading}
            skeleton={
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <StatsCardSkeleton />
                  <StatsCardSkeleton />
                  <StatsCardSkeleton />
                  <StatsCardSkeleton />
                </div>
                <ChartSkeleton height="300px" />
              </div>
            }
          >
            {reportsState.chartType === 'payments' && renderPaymentsReport()}
            {reportsState.chartType === 'activities' && renderActivitiesReport()}
          </SkeletonProvider>
        </main>

      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed bottom-24 left-4 right-4 glass-card border border-yellow-500 border-opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <p className="text-yellow-400 text-sm">وضع عدم الاتصال - البيانات المحفوظة محلياً</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileReports;