import React, { memo,  useState, useEffect, useMemo } from 'react';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  CreditCardIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PrinterIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { ArrowTrendingUpIcon as ArrowTrendingUpIconSolid } from '@heroicons/react/24/solid';
import { logger } from '../../utils/logger';

import '../../styles/apple-design-system.css';

// Enhanced TypeScript interfaces
interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  monthlyGrowth: number;
  yearlyGrowth: number;
  activeSubscriptions: number;
  pendingPayments: number;
  averagePayment: number;
}

interface PaymentRecord {
  id: string;
  memberName: string;
  amount: number;
  type: 'subscription' | 'donation' | 'event' | 'diya';
  status: 'completed' | 'pending' | 'failed';
  date: string;
  description: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'digital_wallet';
}

interface ChartDataPoint {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
}

interface FilterState {
  dateRange: string;
  paymentType: string;
  paymentMethod: string;
  status: string;
}

const AppleFinancialReports: React.FC = () => {
  // State management
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    monthlyGrowth: 0,
    yearlyGrowth: 0,
    activeSubscriptions: 0,
    pendingPayments: 0,
    averagePayment: 0
  });

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'last_6_months',
    paymentType: '',
    paymentMethod: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'details' | 'charts'>('overview');

  // Load data on component mount and filter changes
  useEffect(() => {
    loadFinancialData();
  }, [filters]);

  // Simulate data loading
  const loadFinancialData = async () => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock financial summary
      setFinancialSummary({
        totalRevenue: 245678,
        totalExpenses: 89456,
        netProfit: 156222,
        monthlyGrowth: 12.5,
        yearlyGrowth: 23.8,
        activeSubscriptions: 856,
        pendingPayments: 12,
        averagePayment: 287
      });

      // Mock payment records
      const mockPayments: PaymentRecord[] = [
        {
          id: '1',
          memberName: 'محمد أحمد الشعيل',
          amount: 500,
          type: 'subscription',
          status: 'completed',
          date: '2024-01-15',
          description: 'اشتراك شهري - يناير 2024',
          paymentMethod: 'bank_transfer'
        },
        {
          id: '2',
          memberName: 'سارة محمد الشعيل',
          amount: 1000,
          type: 'donation',
          status: 'completed',
          date: '2024-01-14',
          description: 'تبرع لمبادرة كفالة يتيم',
          paymentMethod: 'credit_card'
        },
        {
          id: '3',
          memberName: 'أحمد عبدالله الشعيل',
          amount: 750,
          type: 'event',
          status: 'pending',
          date: '2024-01-13',
          description: 'مساهمة في تنظيم الزفاف',
          paymentMethod: 'cash'
        }
      ];
      setPayments(mockPayments);

      // Mock chart data
      const mockChartData: ChartDataPoint[] = [
        { month: 'يوليو', revenue: 45000, expenses: 15000, net: 30000 },
        { month: 'أغسطس', revenue: 52000, expenses: 18000, net: 34000 },
        { month: 'سبتمبر', revenue: 48000, expenses: 16000, net: 32000 },
        { month: 'أكتوبر', revenue: 61000, expenses: 21000, net: 40000 },
        { month: 'نوفمبر', revenue: 58000, expenses: 19000, net: 39000 },
        { month: 'ديسمبر', revenue: 67000, expenses: 23000, net: 44000 }
      ];
      setChartData(mockChartData);

    } catch (error) {
      logger.error('Error loading financial data:', { error });
    } finally {
      setLoading(false);
    }
  };

  // Utility functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const getPaymentStatusColor = (status: PaymentRecord['status']): string => {
    switch (status) {
      case 'completed': return 'apple-badge-success';
      case 'pending': return 'apple-badge-warning';
      case 'failed': return 'apple-badge-danger';
      default: return 'apple-badge';
    }
  };

  const getPaymentStatusText = (status: PaymentRecord['status']): string => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'pending': return 'في الانتظار';
      case 'failed': return 'فاشل';
      default: return 'غير محدد';
    }
  };

  const getPaymentTypeText = (type: PaymentRecord['type']): string => {
    switch (type) {
      case 'subscription': return 'اشتراك';
      case 'donation': return 'تبرع';
      case 'event': return 'مناسبة';
      case 'diya': return 'دية';
      default: return 'غير محدد';
    }
  };

  const getPaymentMethodText = (method: PaymentRecord['paymentMethod']): string => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'bank_transfer': return 'تحويل بنكي';
      case 'credit_card': return 'بطاقة ائتمان';
      case 'digital_wallet': return 'محفظة رقمية';
      default: return 'غير محدد';
    }
  };

  // Financial summary cards
  const summaryCards = useMemo(() => [
    {
      title: 'إجمالي الإيرادات',
      value: formatCurrency(financialSummary.totalRevenue),
      change: `+${financialSummary.monthlyGrowth}%`,
      trend: 'up' as const,
      icon: BanknotesIcon,
      color: 'system-green',
      bgGradient: 'from-green-500 to-emerald-600',
      description: 'إجمالي المبالغ المحصلة'
    },
    {
      title: 'إجمالي المصروفات',
      value: formatCurrency(financialSummary.totalExpenses),
      change: '+8.2%',
      trend: 'up' as const,
      icon: ReceiptPercentIcon,
      color: 'system-orange',
      bgGradient: 'from-orange-500 to-amber-600',
      description: 'إجمالي المصروفات'
    },
    {
      title: 'صافي الربح',
      value: formatCurrency(financialSummary.netProfit),
      change: `+${financialSummary.yearlyGrowth}%`,
      trend: 'up' as const,
      icon: ArrowTrendingUpIconSolid,
      color: 'system-blue',
      bgGradient: 'from-blue-500 to-indigo-600',
      description: 'الربح الصافي'
    },
    {
      title: 'متوسط الدفعة',
      value: formatCurrency(financialSummary.averagePayment),
      change: '+5.4%',
      trend: 'up' as const,
      icon: CurrencyDollarIcon,
      color: 'system-purple',
      bgGradient: 'from-purple-500 to-pink-600',
      description: 'متوسط قيمة الدفعة'
    }
  ], [financialSummary]);

  return (
    <div className="min-h-screen apple-font-system p-6" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }} dir="rtl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="apple-flex-between items-start mb-6">
          <div>
            <h1 className="apple-title-1 text-gray-900 mb-2">التقارير المالية</h1>
            <p className="apple-body text-gray-600">نظرة شاملة على الوضع المالي وتتبع الإيرادات والمصروفات</p>
          </div>
          <div className="apple-flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`apple-button ${showFilters ? 'apple-button-primary' : 'apple-button-secondary'} apple-flex items-center gap-2`}
            >
              <FunnelIcon className="w-4 h-4" />
              <span>الفلاتر</span>
            </button>
            <button className="apple-button apple-button-secondary apple-flex items-center gap-2">
              <PrinterIcon className="w-4 h-4" />
              <span>طباعة</span>
            </button>
            <button className="apple-button apple-button-secondary apple-flex items-center gap-2">
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>تصدير</span>
            </button>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="apple-flex items-center gap-4 mb-6">
          <div className="apple-flex bg-white rounded-xl border border-gray-200 p-1">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'overview' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              نظرة عامة
            </button>
            <button
              onClick={() => setViewMode('charts')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'charts' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              الرسوم البيانية
            </button>
            <button
              onClick={() => setViewMode('details')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'details' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              التفاصيل
            </button>
          </div>
          <div className="apple-flex items-center gap-2 text-sm text-gray-600">
            <ClockIcon className="w-4 h-4" />
            <span>آخر تحديث: قبل 5 دقائق</span>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="apple-card p-6 mb-6 apple-animate-slide-up">
            <div className="apple-flex-between items-center mb-4">
              <h3 className="apple-title-3 text-gray-900">فلاتر التقرير</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="apple-button apple-button-secondary !min-h-8 !px-2"
              >
                إغلاق
              </button>
            </div>
            <div className="apple-grid apple-grid-4 gap-4">
              <div>
                <label className="apple-caption-1 text-gray-600 block mb-2">الفترة الزمنية</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="apple-input"
                >
                  <option value="last_week">الأسبوع الماضي</option>
                  <option value="last_month">الشهر الماضي</option>
                  <option value="last_3_months">آخر 3 أشهر</option>
                  <option value="last_6_months">آخر 6 أشهر</option>
                  <option value="last_year">السنة الماضية</option>
                </select>
              </div>
              <div>
                <label className="apple-caption-1 text-gray-600 block mb-2">نوع الدفعة</label>
                <select
                  value={filters.paymentType}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentType: e.target.value }))}
                  className="apple-input"
                >
                  <option value="">جميع الأنواع</option>
                  <option value="subscription">اشتراكات</option>
                  <option value="donation">تبرعات</option>
                  <option value="event">مناسبات</option>
                  <option value="diya">ديات</option>
                </select>
              </div>
              <div>
                <label className="apple-caption-1 text-gray-600 block mb-2">طريقة الدفع</label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="apple-input"
                >
                  <option value="">جميع الطرق</option>
                  <option value="cash">نقدي</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="credit_card">بطاقة ائتمان</option>
                  <option value="digital_wallet">محفظة رقمية</option>
                </select>
              </div>
              <div>
                <label className="apple-caption-1 text-gray-600 block mb-2">الحالة</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="apple-input"
                >
                  <option value="">جميع الحالات</option>
                  <option value="completed">مكتمل</option>
                  <option value="pending">في الانتظار</option>
                  <option value="failed">فاشل</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="apple-card p-12">
          <div className="apple-flex-center">
            <div className="text-center">
              <div className="w-12 h-12 mb-4 mx-auto apple-skeleton rounded-xl"></div>
              <p className="apple-body text-gray-600">جاري تحميل البيانات المالية...</p>
            </div>
          </div>
        </div>
      )}

      {/* Overview Mode */}
      {!loading && viewMode === 'overview' && (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="apple-grid apple-grid-4 gap-6">
            {summaryCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="apple-card p-6 group apple-animate-delay"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="apple-flex-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-xl apple-flex-center text-white shadow-lg bg-gradient-to-br ${card.bgGradient}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`apple-badge ${card.trend === 'up' ? 'apple-badge-success' : 'apple-badge-danger'}`}>
                      {card.trend === 'up' ? <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> : <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />}
                      {card.change}
                    </span>
                  </div>
                  <div>
                    <h3 className="apple-title-2 text-gray-900 mb-1">{card.value}</h3>
                    <p className="apple-callout text-gray-900 mb-1">{card.title}</p>
                    <p className="apple-caption-1 text-gray-600">{card.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div className="apple-grid apple-grid-3 gap-6">
            <div className="apple-card p-6">
              <div className="apple-flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl apple-flex-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <UserGroupIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="apple-title-3 text-gray-900">{financialSummary.activeSubscriptions}</h3>
                  <p className="apple-caption-1 text-gray-600">اشتراك نشط</p>
                </div>
              </div>
              <p className="apple-caption-1 text-gray-600">الأعضاء الذين لديهم اشتراكات فعالة</p>
            </div>

            <div className="apple-card p-6">
              <div className="apple-flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl apple-flex-center bg-gradient-to-br from-orange-500 to-red-600 text-white">
                  <ExclamationTriangleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="apple-title-3 text-gray-900">{financialSummary.pendingPayments}</h3>
                  <p className="apple-caption-1 text-gray-600">دفعة معلقة</p>
                </div>
              </div>
              <p className="apple-caption-1 text-gray-600">المدفوعات التي تحتاج للمراجعة</p>
            </div>

            <div className="apple-card p-6">
              <div className="apple-flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl apple-flex-center bg-gradient-to-br from-green-500 to-teal-600 text-white">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="apple-title-3 text-gray-900">98.5%</h3>
                  <p className="apple-caption-1 text-gray-600">معدل النجاح</p>
                </div>
              </div>
              <p className="apple-caption-1 text-gray-600">نسبة المدفوعات المكتملة بنجاح</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Mode */}
      {!loading && viewMode === 'charts' && (
        <div className="space-y-8">
          <div className="apple-card p-6">
            <div className="apple-flex-between items-center mb-6">
              <div>
                <h3 className="apple-title-2 text-gray-900">الأداء المالي الشهري</h3>
                <p className="apple-caption-1 text-gray-600 mt-1">مقارنة الإيرادات والمصروفات خلال آخر 6 أشهر</p>
              </div>
              <div className="apple-flex items-center gap-4">
                <div className="apple-flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="apple-caption-1 text-gray-600">الإيرادات</span>
                </div>
                <div className="apple-flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="apple-caption-1 text-gray-600">المصروفات</span>
                </div>
                <div className="apple-flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="apple-caption-1 text-gray-600">صافي الربح</span>
                </div>
              </div>
            </div>

            {/* Simple Chart Implementation */}
            <div className="h-80 apple-flex items-end justify-between gap-4">
              {chartData.map((data, index) => {
                const maxValue = Math.max(...chartData.map(d => d.revenue));
                const revenueHeight = (data.revenue / maxValue) * 100;
                const expensesHeight = (data.expenses / maxValue) * 100;
                const netHeight = (data.net / maxValue) * 100;

                return (
                  <div key={data.month} className="flex-1 group relative">
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      <div className="space-y-1">
                        <p>الإيرادات: {formatCurrency(data.revenue)}</p>
                        <p>المصروفات: {formatCurrency(data.expenses)}</p>
                        <p>الصافي: {formatCurrency(data.net)}</p>
                      </div>
                    </div>

                    <div className="apple-flex items-end gap-1 h-full">
                      <div
                        className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg hover:from-blue-500 hover:to-blue-300 transition-all duration-200"
                        style={{ height: `${revenueHeight}%` }}
                      ></div>
                      <div
                        className="flex-1 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-lg hover:from-orange-500 hover:to-orange-300 transition-all duration-200"
                        style={{ height: `${expensesHeight}%` }}
                      ></div>
                      <div
                        className="flex-1 bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg hover:from-green-500 hover:to-green-300 transition-all duration-200"
                        style={{ height: `${netHeight}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="apple-flex justify-between text-xs text-gray-500 mt-4">
              {chartData.map((data) => (
                <span key={data.month} className="flex-1 text-center">{data.month}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Details Mode */}
      {!loading && viewMode === 'details' && (
        <div className="space-y-6">
          <div className="apple-card overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="apple-title-2 text-gray-900">سجل المدفوعات التفصيلي</h3>
              <p className="apple-caption-1 text-gray-600 mt-1">جميع المعاملات المالية مع تفاصيلها الكاملة</p>
            </div>

            <table className="apple-table">
              <thead>
                <tr>
                  <th>العضو</th>
                  <th>المبلغ</th>
                  <th>النوع</th>
                  <th>الحالة</th>
                  <th>طريقة الدفع</th>
                  <th>التاريخ</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="group">
                    <td>
                      <div>
                        <p className="apple-callout text-gray-900">{payment.memberName}</p>
                        <p className="apple-caption-1 text-gray-600 mt-1">{payment.description}</p>
                      </div>
                    </td>
                    <td>
                      <span className="apple-headline text-green-600">{formatCurrency(payment.amount)}</span>
                    </td>
                    <td>
                      <span className="apple-badge">{getPaymentTypeText(payment.type)}</span>
                    </td>
                    <td>
                      <span className={`apple-badge ${getPaymentStatusColor(payment.status)}`}>
                        {getPaymentStatusText(payment.status)}
                      </span>
                    </td>
                    <td>
                      <span className="apple-caption-1 text-gray-600">{getPaymentMethodText(payment.paymentMethod)}</span>
                    </td>
                    <td>
                      <div className="apple-flex items-center gap-1">
                        <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                        <span className="apple-caption-1 text-gray-600">{formatDate(payment.date)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="apple-flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="apple-button apple-button-secondary !min-h-8 !px-2">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button className="apple-button apple-button-secondary !min-h-8 !px-2">
                          <ShareIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(AppleFinancialReports);