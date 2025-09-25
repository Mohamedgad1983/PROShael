/**
 * MobilePayments - Mobile-optimized payments management
 * Features: Payment history, new payments, virtual scrolling, offline support
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMobile, useHapticFeedback } from '../../hooks/useMobile';
import VirtualScrollList from '../Common/VirtualScrollList';
import { PaymentCardSkeleton, SkeletonProvider } from '../Common/SkeletonLoaders';
import performanceMonitor, { trackUserAction, measureRender } from '../../utils/performanceMonitor';
import '../../styles/mobile-arabic.css';

const MobilePayments = ({ user, isOnline = true, onLogout, device, viewport }) => {
  const { applySafeArea } = useMobile();
  const { feedback } = useHapticFeedback();

  // Component state
  const [paymentsState, setPaymentsState] = useState({
    payments: [],
    loading: true,
    error: null,
    hasNextPage: true,
    filters: {
      status: 'all', // all, pending, completed, failed
      dateRange: 'all', // all, month, quarter, year
      type: 'all' // all, subscription, activity, fine
    },
    searchQuery: ''
  });

  const [activeTab, setActiveTab] = useState('history'); // history, new, stats
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Performance monitoring
  const renderMonitor = useMemo(() => measureRender('MobilePayments'), []);

  // Mock payment data
  const mockPayments = useMemo(() => [
    {
      id: 'pay_001',
      title_ar: 'اشتراك شهري',
      title_en: 'Monthly Subscription',
      amount: 3000,
      status: 'completed',
      type: 'subscription',
      date: '2024-01-15',
      hijri_date: '١٤٤٥/٧/٥',
      description_ar: 'اشتراك شهر يناير 2024',
      description_en: 'January 2024 subscription',
      payment_method: 'bank_transfer',
      receipt_url: null
    },
    {
      id: 'pay_002',
      title_ar: 'مشاركة في فعالية',
      title_en: 'Event Participation',
      amount: 500,
      status: 'pending',
      type: 'activity',
      date: '2024-01-10',
      hijri_date: '١٤٤٥/٧/١',
      description_ar: 'مشاركة في رحلة العائلة',
      description_en: 'Family trip participation',
      payment_method: 'cash',
      receipt_url: null
    },
    {
      id: 'pay_003',
      title_ar: 'غرامة تأخير',
      title_en: 'Late Fee',
      amount: 100,
      status: 'failed',
      type: 'fine',
      date: '2024-01-05',
      hijri_date: '١٤٤٤/١٢/٢٦',
      description_ar: 'غرامة تأخير في دفع الاشتراك',
      description_en: 'Late subscription payment fine',
      payment_method: 'bank_transfer',
      receipt_url: null
    }
  ], []);

  // Load payments data
  const loadPayments = useCallback(async (reset = false) => {
    if (!isOnline && reset) {
      // Load from cache when offline
      const cachedPayments = localStorage.getItem('cached_payments');
      if (cachedPayments) {
        setPaymentsState(prev => ({
          ...prev,
          payments: JSON.parse(cachedPayments),
          loading: false
        }));
        return;
      }
    }

    try {
      setPaymentsState(prev => ({ ...prev, loading: reset ? true : prev.loading, error: null }));

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const filteredPayments = mockPayments.filter(payment => {
        // Apply filters
        if (paymentsState.filters.status !== 'all' && payment.status !== paymentsState.filters.status) {
          return false;
        }
        if (paymentsState.filters.type !== 'all' && payment.type !== paymentsState.filters.type) {
          return false;
        }
        if (paymentsState.searchQuery && !payment.title_ar.includes(paymentsState.searchQuery)) {
          return false;
        }
        return true;
      });

      // Cache payments for offline use
      if (isOnline) {
        localStorage.setItem('cached_payments', JSON.stringify(filteredPayments));
      }

      setPaymentsState(prev => ({
        ...prev,
        payments: reset ? filteredPayments : [...prev.payments, ...filteredPayments],
        loading: false,
        hasNextPage: false // No pagination for mock data
      }));

      trackUserAction('payments-loaded', { count: filteredPayments.length });

    } catch (error) {
      console.error('Failed to load payments:', error);
      setPaymentsState(prev => ({
        ...prev,
        loading: false,
        error: 'فشل في تحميل البيانات'
      }));
    }
  }, [isOnline, mockPayments, paymentsState.filters, paymentsState.searchQuery]);

  // Initialize component
  useEffect(() => {
    loadPayments(true);
  }, []);

  // Convert numbers to Arabic numerals
  const toArabicNumerals = useCallback((num) => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
  }, []);

  // Get status styling
  const getStatusStyle = useCallback((status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  // Get status text
  const getStatusText = useCallback((status) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'pending': return 'معلق';
      case 'failed': return 'فاشل';
      default: return 'غير معروف';
    }
  }, []);

  // Get payment type text
  const getPaymentTypeText = useCallback((type) => {
    switch (type) {
      case 'subscription': return 'اشتراك';
      case 'activity': return 'نشاط';
      case 'fine': return 'غرامة';
      default: return 'آخر';
    }
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((filterType, value) => {
    setPaymentsState(prev => ({
      ...prev,
      filters: { ...prev.filters, [filterType]: value }
    }));

    trackUserAction('payments-filter', { filterType, value });
    feedback('light');
  }, [feedback]);

  // Handle search
  const handleSearch = useCallback((query) => {
    setPaymentsState(prev => ({ ...prev, searchQuery: query }));
    trackUserAction('payments-search', { query });
  }, []);

  // Handle payment selection
  const handlePaymentSelect = useCallback((payment) => {
    setSelectedPayment(payment);
    trackUserAction('payment-select', { paymentId: payment.id });
    feedback('medium');
  }, [feedback]);

  // Handle new payment
  const handleNewPayment = useCallback(() => {
    trackUserAction('new-payment-start');
    feedback('medium');
    // TODO: Navigate to new payment form
  }, [feedback]);

  // Render payment item
  const renderPaymentItem = useCallback((payment, index, { isScrolling }) => (
    <div
      className={`glass-card mb-3 transition-all duration-200 ${
        isScrolling ? 'opacity-80' : 'opacity-100'
      }`}
      onClick={() => handlePaymentSelect(payment)}
    >
      <div className="flex items-start justify-between">
        {/* Payment info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-white text-sm">{payment.title_ar}</h3>
            <span className={`px-2 py-1 rounded-full text-xs border ${getStatusStyle(payment.status)}`}>
              {getStatusText(payment.status)}
            </span>
          </div>

          <p className="text-slate-300 text-xs mb-2">{payment.description_ar}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>{payment.hijri_date}</span>
              <span className={`px-2 py-1 bg-slate-700 rounded text-xs`}>
                {getPaymentTypeText(payment.type)}
              </span>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="text-left">
          <p className="text-white font-bold text-lg">
            {toArabicNumerals(payment.amount.toLocaleString())} ر.س
          </p>
          <p className="text-slate-400 text-xs">{payment.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'نقداً'}</p>
        </div>
      </div>
    </div>
  ), [handlePaymentSelect, getStatusStyle, getStatusText, getPaymentTypeText, toArabicNumerals]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const payments = paymentsState.payments;
    return {
      total: payments.reduce((sum, p) => sum + p.amount, 0),
      completed: payments.filter(p => p.status === 'completed').length,
      pending: payments.filter(p => p.status === 'pending').length,
      failed: payments.filter(p => p.status === 'failed').length
    };
  }, [paymentsState.payments]);

  // Cleanup performance monitor
  useEffect(() => {
    return () => {
      if (renderMonitor) {
        renderMonitor.end();
      }
    };
  }, [renderMonitor]);

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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">المدفوعات</h1>
                <p className="text-slate-300 text-sm">إدارة المدفوعات والفواتير</p>
              </div>

              <button
                className="w-10 h-10 bg-gradient-accent rounded-full flex items-center justify-center"
                onClick={handleNewPayment}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 bg-black bg-opacity-20 rounded-xl p-1">
              {[
                { id: 'history', label: 'السجل' },
                { id: 'stats', label: 'الإحصائيات' }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white bg-opacity-20 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    feedback('light');
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container py-6">

          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Statistics cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card text-center">
                  <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center text-green-400 text-xl mx-auto mb-3">
                    ✅
                  </div>
                  <p className="text-slate-300 text-sm mb-1">المدفوعات المكتملة</p>
                  <p className="text-white font-bold text-lg">{toArabicNumerals(statistics.completed)}</p>
                </div>

                <div className="glass-card text-center">
                  <div className="w-12 h-12 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center text-yellow-400 text-xl mx-auto mb-3">
                    ⏳
                  </div>
                  <p className="text-slate-300 text-sm mb-1">المدفوعات المعلقة</p>
                  <p className="text-white font-bold text-lg">{toArabicNumerals(statistics.pending)}</p>
                </div>

                <div className="glass-card text-center">
                  <div className="w-12 h-12 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center text-red-400 text-xl mx-auto mb-3">
                    ❌
                  </div>
                  <p className="text-slate-300 text-sm mb-1">المدفوعات الفاشلة</p>
                  <p className="text-white font-bold text-lg">{toArabicNumerals(statistics.failed)}</p>
                </div>

                <div className="glass-card text-center">
                  <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center text-blue-400 text-xl mx-auto mb-3">
                    💰
                  </div>
                  <p className="text-slate-300 text-sm mb-1">إجمالي المبلغ</p>
                  <p className="text-white font-bold text-lg">{toArabicNumerals(statistics.total.toLocaleString())} ر.س</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Search and filters */}
              <div className="glass-card">
                <div className="flex gap-3 mb-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="البحث في المدفوعات..."
                      className="w-full bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:ring-1 focus:ring-accent"
                      value={paymentsState.searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                    <svg className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {/* Status filter */}
                  <select
                    className="bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-3 py-2 text-white text-sm"
                    value={paymentsState.filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="completed">مكتمل</option>
                    <option value="pending">معلق</option>
                    <option value="failed">فاشل</option>
                  </select>

                  {/* Type filter */}
                  <select
                    className="bg-black bg-opacity-20 border border-white border-opacity-20 rounded-lg px-3 py-2 text-white text-sm"
                    value={paymentsState.filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                  >
                    <option value="all">جميع الأنواع</option>
                    <option value="subscription">اشتراك</option>
                    <option value="activity">نشاط</option>
                    <option value="fine">غرامة</option>
                  </select>
                </div>
              </div>

              {/* Payments list */}
              <SkeletonProvider
                loading={paymentsState.loading}
                skeleton={<PaymentCardSkeleton />}
              >
                <VirtualScrollList
                  items={paymentsState.payments}
                  itemHeight={120}
                  containerHeight={viewport.height - 300}
                  renderItem={renderPaymentItem}
                  onLoadMore={() => loadPayments(false)}
                  hasNextPage={paymentsState.hasNextPage}
                  loading={paymentsState.loading}
                  threshold={0.2}
                  className="payments-list"
                  direction="rtl"
                  getItemKey={(item) => item.id}
                />
              </SkeletonProvider>

              {paymentsState.error && (
                <div className="glass-card border border-red-500 border-opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 text-red-400">⚠️</div>
                    <div>
                      <p className="text-red-400 font-medium">{paymentsState.error}</p>
                      <button
                        className="text-accent text-sm hover:underline mt-1"
                        onClick={() => loadPayments(true)}
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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

export default MobilePayments;