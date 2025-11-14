import React, { memo,  useState, useEffect } from 'react';
import {
  BanknotesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { ARABIC_LABELS } from '../../constants/arabic';
import { PaymentStatistics, PaymentFilters, PaymentsOverviewProps } from './types';
import { formatCurrency, toArabicNumerals, calculatePaymentStats } from './utils';

import { logger } from '../../utils/logger';

const PaymentsOverview: React.FC<PaymentsOverviewProps> = ({
  onCreatePayment,
  onFilterChange
}) => {
  const [statistics, setStatistics] = useState<PaymentStatistics>({
    totalPayments: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    pendingAmount: 0,
    overduePayments: 0,
    overdueAmount: 0,
    approvedPayments: 0,
    approvedAmount: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0
  });

  const [filters, setFilters] = useState<PaymentFilters>({
    status: [],
    category: [],
    method: [],
    search: ''
  });

  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // Mock data for demonstration - replace with actual API call
  useEffect(() => {
    // Simulate API call to fetch statistics
    const mockStats: PaymentStatistics = {
      totalPayments: 156,
      totalRevenue: 78450,
      pendingPayments: 23,
      pendingAmount: 11500,
      overduePayments: 8,
      overdueAmount: 4200,
      approvedPayments: 125,
      approvedAmount: 62750,
      monthlyRevenue: 15600,
      yearlyRevenue: 156000
    };
    setStatistics(mockStats);
  }, []);

  const handleFilterChange = (newFilters: Partial<PaymentFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  };

  const handleDateRangeChange = (start: string, end: string) => {
    if (start && end) {
      const dateRangeFilter = {
        start: new Date(start),
        end: new Date(end)
      };
      handleFilterChange({ dateRange: dateRangeFilter });
    }
  };

  const statisticsCards = [
    {
      title: ARABIC_LABELS.totalPayments,
      value: toArabicNumerals(statistics.totalPayments),
      change: '+12%',
      changeType: 'increase' as const,
      icon: BanknotesIcon,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      textColor: 'text-white'
    },
    {
      title: ARABIC_LABELS.totalRevenue,
      value: formatCurrency(statistics.totalRevenue),
      change: '+8.5%',
      changeType: 'increase' as const,
      icon: CheckCircleIcon,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      textColor: 'text-white'
    },
    {
      title: ARABIC_LABELS.pendingPayments,
      value: toArabicNumerals(statistics.pendingPayments),
      change: '-5%',
      changeType: 'decrease' as const,
      icon: ClockIcon,
      color: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
      textColor: 'text-white',
      subtitle: formatCurrency(statistics.pendingAmount)
    },
    {
      title: ARABIC_LABELS.overduePayments,
      value: toArabicNumerals(statistics.overduePayments),
      change: '-15%',
      changeType: 'decrease' as const,
      icon: ExclamationTriangleIcon,
      color: 'bg-gradient-to-r from-red-500 to-red-600',
      textColor: 'text-white',
      subtitle: formatCurrency(statistics.overdueAmount)
    }
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {ARABIC_LABELS.paymentsOverview}
          </h1>
          <p className="text-gray-300">
            إدارة ومتابعة جميع المدفوعات والاشتراكات
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-300"
          >
            <FunnelIcon className="h-5 w-5" />
            {ARABIC_LABELS.filter}
          </button>

          <button
            onClick={onCreatePayment}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg"
          >
            <PlusIcon className="h-5 w-5" />
            {ARABIC_LABELS.createPayment}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statisticsCards.map((card, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-xl backdrop-blur-sm border border-white/20 p-6 hover:transform hover:scale-105 transition-all duration-300"
            style={{
              background: 'rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className={`absolute inset-0 ${card.color} opacity-80`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <card.icon className="h-8 w-8 text-white" />
                <div className="flex items-center gap-1 text-sm">
                  {card.changeType === 'increase' ? (
                    <ArrowUpIcon className="h-4 w-4 text-white" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-white" />
                  )}
                  <span className="text-white">{card.change}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">
                  {card.title}
                </h3>
                <p className="text-2xl font-bold text-white">
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-sm text-white/80">
                    {card.subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            {ARABIC_LABELS.filter}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                {ARABIC_LABELS.search}
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  placeholder="البحث بالاسم أو رقم المرجع..."
                  className="w-full pl-4 pr-10 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                {ARABIC_LABELS.status}
              </label>
              <select
                multiple
                value={filters.status || []}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                  handleFilterChange({ status: selectedOptions as any });
                }}
                className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">معلق</option>
                <option value="approved">موافق عليه</option>
                <option value="paid">مدفوع</option>
                <option value="overdue">متأخر</option>
                <option value="rejected">مرفوض</option>
                <option value="refunded">مسترد</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                {ARABIC_LABELS.paymentCategory}
              </label>
              <select
                multiple
                value={filters.category || []}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                  handleFilterChange({ category: selectedOptions as any });
                }}
                className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="subscription">اشتراك</option>
                <option value="activity">نشاط</option>
                <option value="membership">عضوية</option>
                <option value="donation">تبرع</option>
                <option value="penalty">غرامة</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                فترة التاريخ
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, start: e.target.value }));
                    handleDateRangeChange(e.target.value, dateRange.end);
                  }}
                  className="flex-1 p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, end: e.target.value }));
                    handleDateRangeChange(dateRange.start, e.target.value);
                  }}
                  className="flex-1 p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                setFilters({
                  status: [],
                  category: [],
                  method: [],
                  search: ''
                });
                setDateRange({ start: '', end: '' });
                onFilterChange?.({
                  status: [],
                  category: [],
                  method: [],
                  search: ''
                });
              }}
              className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors"
            >
              مسح الفلاتر
            </button>

            <button
              onClick={() => {
                // Export functionality
                logger.debug('Exporting payments...');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              {ARABIC_LABELS.export}
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            الإيرادات الشهرية
          </h3>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-green-400">
              {formatCurrency(statistics.monthlyRevenue)}
            </p>
            <p className="text-sm text-gray-300">
              مقارنة بالشهر السابق: +{toArabicNumerals(8.5)}%
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            المدفوعات الموافق عليها
          </h3>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-blue-400">
              {toArabicNumerals(statistics.approvedPayments)}
            </p>
            <p className="text-sm text-gray-300">
              إجمالي المبلغ: {formatCurrency(statistics.approvedAmount)}
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            معدل النجاح
          </h3>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-purple-400">
              {toArabicNumerals(Math.round((statistics.approvedPayments / statistics.totalPayments) * 100))}%
            </p>
            <p className="text-sm text-gray-300">
              من إجمالي المدفوعات
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(PaymentsOverview);