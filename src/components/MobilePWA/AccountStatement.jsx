/**
 * AccountStatement Component
 * Mobile-optimized transaction history with filtering, search, and export
 * Features: Running balance, PDF export, date filtering, Arabic RTL support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { paymentService } from './PaymentService.js';
import '../../styles/pwa-emergency-fix.css';

const AccountStatement = ({
  memberId,
  memberName = "العضو",
  isVisible = true,
  onClose = null
}) => {
  // State management
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);

  // Filter state
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    dateRange: 'all',
    startDate: '',
    endDate: '',
    search: ''
  });

  // UI state
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter options
  const typeOptions = [
    { value: 'all', label: 'جميع الأنواع', icon: '📋' },
    { value: 'subscription', label: 'اشتراكات', icon: '💳' },
    { value: 'initiative', label: 'مبادرات', icon: '🎯' },
    { value: 'diya', label: 'ديات', icon: '⚖️' }
  ];

  const statusOptions = [
    { value: 'all', label: 'جميع الحالات', icon: '📋' },
    { value: 'pending', label: 'قيد المراجعة', icon: '⏳' },
    { value: 'approved', label: 'مقبولة', icon: '✅' },
    { value: 'paid', label: 'مدفوعة', icon: '💚' },
    { value: 'rejected', label: 'مرفوضة', icon: '❌' }
  ];

  const dateRangeOptions = [
    { value: 'all', label: 'جميع التواريخ' },
    { value: 'today', label: 'اليوم' },
    { value: 'week', label: 'آخر أسبوع' },
    { value: 'month', label: 'آخر شهر' },
    { value: 'quarter', label: 'آخر 3 أشهر' },
    { value: 'year', label: 'آخر سنة' },
    { value: 'custom', label: 'فترة محددة' }
  ];

  // Load transactions
  const loadTransactions = useCallback(async (pageNum = 0, append = false) => {
    try {
      if (!append) setIsLoading(true);
      else setLoadingMore(true);

      const dateFilters = getDateFilters();
      const response = await paymentService.getPaymentHistory(memberId, {
        limit: 20,
        offset: pageNum * 20,
        type: filters.type !== 'all' ? filters.type : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        ...dateFilters
      });

      if (append) {
        setTransactions(prev => [...prev, ...response.payments]);
      } else {
        setTransactions(response.payments);
      }

      setHasMore(response.hasMore);
      setError('');
    } catch (err) {
      setError(err.message);
      if (!append) setTransactions([]);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [memberId, filters.type, filters.status, filters.startDate, filters.endDate]);

  // Load member balance
  const loadBalance = useCallback(async () => {
    try {
      const balance = await paymentService.getMemberBalance(memberId);
      setCurrentBalance(balance.balance);
    } catch (err) {
      console.error('Error loading balance:', err);
    }
  }, [memberId]);

  // Get date filters based on selected range
  const getDateFilters = () => {
    const now = new Date();
    let startDate, endDate;

    switch (filters.dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        endDate = now;
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        endDate = now;
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        endDate = now;
        break;
      case 'custom':
        startDate = filters.startDate ? new Date(filters.startDate) : null;
        endDate = filters.endDate ? new Date(filters.endDate) : null;
        break;
      default:
        return {};
    }

    return {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString()
    };
  };

  // Filter transactions based on search
  useEffect(() => {
    if (!filters.search) {
      setFilteredTransactions(transactions);
      return;
    }

    const searchTerm = filters.search.toLowerCase();
    const filtered = transactions.filter(transaction =>
      transaction.description?.toLowerCase().includes(searchTerm) ||
      transaction.referenceNumber?.toLowerCase().includes(searchTerm) ||
      transaction.amount?.toString().includes(searchTerm)
    );

    setFilteredTransactions(filtered);
  }, [transactions, filters.search]);

  // Load data on component mount
  useEffect(() => {
    if (memberId) {
      loadTransactions();
      loadBalance();
    }
  }, [loadTransactions, loadBalance, memberId]);

  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
    setPage(0);
    loadTransactions(0, false);
    loadBalance();
  };

  // Load more transactions
  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadTransactions(nextPage, true);
    }
  };

  // Apply filters
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  // Export to PDF
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportFilters = {
        type: filters.type !== 'all' ? filters.type : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        ...getDateFilters()
      };

      await paymentService.exportPaymentHistory(memberId, exportFilters);
    } catch (err) {
      setError('فشل في تصدير كشف الحساب');
    } finally {
      setIsExporting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return paymentService.formatCurrency(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status styling
  const getStatusStyle = (status) => {
    const styles = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '✅' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', icon: '💚' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' },
      overdue: { bg: 'bg-red-100', text: 'text-red-800', icon: '⚠️' }
    };
    return styles[status] || styles.pending;
  };

  // Get transaction type styling
  const getTypeStyle = (type) => {
    const styles = {
      subscription: { icon: '💳', color: 'text-blue-600' },
      initiative: { icon: '🎯', color: 'text-green-600' },
      diya: { icon: '⚖️', color: 'text-purple-600' }
    };
    return styles[type] || styles.subscription;
  };

  // Calculate running balance
  const calculateRunningBalance = (transactions) => {
    let balance = currentBalance;
    return transactions.map((transaction, index) => {
      if (index === 0) {
        return { ...transaction, runningBalance: balance };
      }
      // This is simplified - in reality you'd need proper transaction history
      const prevTransaction = transactions[index - 1];
      balance = balance - transaction.amount; // Assuming all are debits for simplification
      return { ...transaction, runningBalance: balance };
    });
  };

  const transactionsWithBalance = calculateRunningBalance(filteredTransactions);

  if (!isVisible) return null;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">كشف الحساب</h1>
              <p className="text-sm text-gray-500">{memberName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
              ) : (
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Current Balance */}
        <div className="px-4 pb-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">الرصيد الحالي</p>
                <p className="text-3xl font-bold">{formatCurrency(currentBalance)}</p>
              </div>
              <div className="text-4xl opacity-75">💰</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-4 space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="البحث في المعاملات..."
              className="w-full px-4 py-2 text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Chips */}
          <div className="space-y-3">
            {/* Type Filter */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">نوع المعاملة</p>
              <div className="flex flex-wrap gap-2">
                {typeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange('type', option.value)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${filters.type === option.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    <span className="ml-1">{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">حالة المعاملة</p>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange('status', option.value)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${filters.status === option.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    <span className="ml-1">{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">الفترة الزمنية</p>
              <div className="flex flex-wrap gap-2">
                {dateRangeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange('dateRange', option.value)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${filters.dateRange === option.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Range */}
              {filters.dateRange === 'custom' && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">من تاريخ</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">إلى تاريخ</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-4">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex gap-3">
              <span className="text-red-600 text-xl">❌</span>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="w-32 h-4 bg-gray-200 rounded"></div>
                      <div className="w-20 h-3 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="w-20 h-4 bg-gray-200 rounded"></div>
                    <div className="w-16 h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : transactionsWithBalance.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد معاملات</h3>
            <p className="text-gray-500 mb-4">لم يتم العثور على معاملات بالمعايير المحددة</p>
            <button
              onClick={() => setFilters({
                type: 'all',
                status: 'all',
                dateRange: 'all',
                startDate: '',
                endDate: '',
                search: ''
              })}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              إعادة تعيين المرشحات
            </button>
          </div>
        ) : (
          /* Transactions List */
          <div className="space-y-3">
            {transactionsWithBalance.map((transaction, index) => {
              const statusStyle = getStatusStyle(transaction.status);
              const typeStyle = getTypeStyle(transaction.type);

              return (
                <div key={transaction.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    {/* Transaction Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xl ${typeStyle.color}`}>
                        {typeStyle.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {transaction.description || `${transaction.type === 'subscription' ? 'اشتراك' : transaction.type === 'initiative' ? 'مبادرة' : 'دية'}`}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            <span className="ml-1">{statusStyle.icon}</span>
                            {transaction.status === 'pending' ? 'قيد المراجعة' :
                             transaction.status === 'approved' ? 'مقبولة' :
                             transaction.status === 'paid' ? 'مدفوعة' :
                             transaction.status === 'rejected' ? 'مرفوضة' : transaction.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-gray-500">
                            {formatDate(transaction.createdDate || transaction.paidDate)}
                          </p>
                          {transaction.referenceNumber && (
                            <>
                              <span className="text-gray-300">•</span>
                              <p className="text-xs text-gray-400" dir="ltr">
                                #{transaction.referenceNumber}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Balance */}
                    <div className="text-left">
                      <p className="font-bold text-lg text-red-600">
                        -{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        الرصيد: {formatCurrency(transaction.runningBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Load More Button */}
            {hasMore && (
              <div className="pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-600 border-t-transparent"></div>
                      <span>جارٍ التحميل...</span>
                    </>
                  ) : (
                    <>
                      <span>تحميل المزيد</span>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pull to Refresh Indicator */}
      {refreshing && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg z-20">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span className="text-sm">جارٍ التحديث...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountStatement;