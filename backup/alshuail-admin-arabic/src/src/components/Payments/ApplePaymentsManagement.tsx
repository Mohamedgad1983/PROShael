import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCardIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  FunnelIcon,
  EyeIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import '../../styles/apple-design-system.css';

// Enhanced TypeScript interfaces
interface Payment {
  id: string;
  referenceNumber: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  amount: number;
  category: 'subscription' | 'donation' | 'event' | 'membership' | 'activity';
  type: 'regular' | 'one_time' | 'flexible';
  method: 'cash' | 'bank_transfer' | 'credit_card' | 'digital_wallet';
  status: 'pending' | 'approved' | 'paid' | 'overdue' | 'rejected';
  description: string;
  dueDate: Date;
  paidDate?: Date;
  createdDate: Date;
  createdBy: string;
  approvedBy?: string;
  approvedDate?: Date;
  refundReason?: string;
}

interface PaymentStatistics {
  totalPayments: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  monthlyGrowth: number;
  averagePayment: number;
  completionRate: number;
}

interface FilterState {
  status: string;
  category: string;
  method: string;
  search: string;
  dateRange: {
    start?: string;
    end?: string;
  };
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ApplePaymentsManagement: React.FC = () => {
  // State management
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statistics, setStatistics] = useState<PaymentStatistics>({} as PaymentStatistics);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    category: '',
    method: '',
    search: '',
    dateRange: {}
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [sortBy, setSortBy] = useState<string>('createdDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Mock payments data
  const mockPayments: Payment[] = [
    {
      id: '1',
      referenceNumber: 'PAY-20240101-1234',
      memberId: 'member1',
      memberName: 'أحمد محمد الشعيل',
      memberAvatar: '',
      amount: 150,
      category: 'subscription',
      type: 'regular',
      method: 'bank_transfer',
      status: 'pending',
      description: 'اشتراك شهري - يناير 2024',
      dueDate: new Date('2024-01-15'),
      createdDate: new Date('2024-01-01'),
      createdBy: 'أحمد المدير'
    },
    {
      id: '2',
      referenceNumber: 'PAY-20240102-5678',
      memberId: 'member2',
      memberName: 'فاطمة عبد الله الشعيل',
      amount: 300,
      category: 'activity',
      type: 'one_time',
      method: 'cash',
      status: 'paid',
      description: 'مشاركة في فعالية خيرية',
      dueDate: new Date('2024-01-10'),
      paidDate: new Date('2024-01-08'),
      createdDate: new Date('2023-12-28'),
      createdBy: 'أحمد المدير',
      approvedBy: 'سارة المحاسبة',
      approvedDate: new Date('2024-01-08')
    },
    {
      id: '3',
      referenceNumber: 'PAY-20240103-9012',
      memberId: 'member3',
      memberName: 'خالد يوسف الشعيل',
      amount: 200,
      category: 'membership',
      type: 'regular',
      method: 'credit_card',
      status: 'overdue',
      description: 'رسوم عضوية سنوية',
      dueDate: new Date('2023-12-20'),
      createdDate: new Date('2023-12-01'),
      createdBy: 'أحمد المدير'
    },
    {
      id: '4',
      referenceNumber: 'PAY-20240104-3456',
      memberId: 'member4',
      memberName: 'مريم علي الشعيل',
      amount: 100,
      category: 'donation',
      type: 'one_time',
      method: 'digital_wallet',
      status: 'approved',
      description: 'تبرع لصالح الأنشطة الخيرية',
      dueDate: new Date('2024-01-05'),
      createdDate: new Date('2024-01-01'),
      createdBy: 'أحمد المدير'
    },
    {
      id: '5',
      referenceNumber: 'PAY-20240105-7890',
      memberId: 'member5',
      memberName: 'عبد الرحمن صالح الشعيل',
      amount: 250,
      category: 'subscription',
      type: 'flexible',
      method: 'bank_transfer',
      status: 'rejected',
      description: 'اشتراك مرن - فبراير 2024',
      dueDate: new Date('2024-02-01'),
      createdDate: new Date('2024-01-15'),
      createdBy: 'أحمد المدير',
      refundReason: 'عدم توفر الأموال الكافية'
    }
  ];

  // Load data
  useEffect(() => {
    setPayments(mockPayments);

    // Calculate statistics
    const totalAmount = mockPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const paidAmount = mockPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const pendingAmount = mockPayments
      .filter(p => p.status === 'pending')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const overdueAmount = mockPayments
      .filter(p => p.status === 'overdue')
      .reduce((sum, payment) => sum + payment.amount, 0);

    setStatistics({
      totalPayments: mockPayments.length,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      monthlyGrowth: 18.5,
      averagePayment: totalAmount / mockPayments.length,
      completionRate: (paidAmount / totalAmount) * 100
    });

    setPagination(prev => ({
      ...prev,
      total: mockPayments.length,
      totalPages: Math.ceil(mockPayments.length / prev.limit)
    }));
  }, []);

  // Utility functions
  const getPaymentStatusColor = (status: Payment['status']): string => {
    switch (status) {
      case 'paid': return 'apple-badge-success';
      case 'approved': return 'apple-badge-primary';
      case 'pending': return 'apple-badge-warning';
      case 'overdue': return 'apple-badge-danger';
      case 'rejected': return 'apple-badge-danger';
      default: return 'apple-badge';
    }
  };

  const getPaymentStatusText = (status: Payment['status']): string => {
    switch (status) {
      case 'paid': return 'مدفوع';
      case 'approved': return 'موافق عليه';
      case 'pending': return 'في الانتظار';
      case 'overdue': return 'متأخر';
      case 'rejected': return 'مرفوض';
      default: return 'غير محدد';
    }
  };

  const getCategoryText = (category: Payment['category']): string => {
    switch (category) {
      case 'subscription': return 'اشتراك';
      case 'donation': return 'تبرع';
      case 'event': return 'فعالية';
      case 'membership': return 'عضوية';
      case 'activity': return 'نشاط';
      default: return 'غير محدد';
    }
  };

  const getMethodText = (method: Payment['method']): string => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'bank_transfer': return 'تحويل بنكي';
      case 'credit_card': return 'بطاقة ائتمان';
      case 'digital_wallet': return 'محفظة رقمية';
      default: return 'غير محدد';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: Date): string => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  // Statistics cards data
  const statisticsCards = useMemo(() => [
    {
      title: 'إجمالي المدفوعات',
      value: formatCurrency(statistics.totalAmount || 0),
      icon: BanknotesIcon,
      bgGradient: 'from-blue-500 to-indigo-600',
      trend: statistics.monthlyGrowth || 0,
      description: 'المبلغ الإجمالي للمدفوعات'
    },
    {
      title: 'المدفوعات المكتملة',
      value: formatCurrency(statistics.paidAmount || 0),
      icon: CheckCircleIconSolid,
      bgGradient: 'from-green-500 to-emerald-600',
      trend: 12.3,
      description: 'المدفوعات المكتملة بنجاح'
    },
    {
      title: 'المدفوعات المعلقة',
      value: formatCurrency(statistics.pendingAmount || 0),
      icon: ClockIcon,
      bgGradient: 'from-orange-500 to-amber-600',
      trend: -5.7,
      description: 'في انتظار المعالجة'
    },
    {
      title: 'المدفوعات المتأخرة',
      value: formatCurrency(statistics.overdueAmount || 0),
      icon: ExclamationTriangleIcon,
      bgGradient: 'from-red-500 to-pink-600',
      trend: -8.1,
      description: 'تجاوزت موعد الاستحقاق'
    }
  ], [statistics]);

  // Event handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters(prev => ({ ...prev, search: query }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (filterKey: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPayments(prev => {
      if (prev.includes(paymentId)) {
        return prev.filter(id => id !== paymentId);
      } else {
        return [...prev, paymentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPayments.length === payments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(payments.map(payment => payment.id));
    }
  };

  // Filtered and paginated payments
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      if (filters.status && payment.status !== filters.status) return false;
      if (filters.category && payment.category !== filters.category) return false;
      if (filters.method && payment.method !== filters.method) return false;
      if (filters.search && !payment.memberName.toLowerCase().includes(filters.search.toLowerCase()) &&
          !payment.referenceNumber.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [payments, filters]);

  const paginatedPayments = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    return filteredPayments.slice(startIndex, startIndex + pagination.limit);
  }, [filteredPayments, pagination.page, pagination.limit]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(value => value !== '' && value !== null).length;
  }, [filters]);

  return (
    <div className="min-h-screen apple-font-system p-6" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }} dir="rtl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="apple-flex-between items-start mb-6">
          <div style={{ animation: 'apple-slide-in 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <h1 className="apple-title-1 text-gray-900 mb-2">إدارة المدفوعات</h1>
            <p className="apple-body text-gray-600">نظام شامل لإدارة المدفوعات ومتابعة المعاملات المالية</p>
          </div>
          <div className="apple-flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`apple-button ${showFilters ? 'apple-button-primary' : 'apple-button-secondary'} apple-flex items-center gap-2`}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              <span>الفلاتر</span>
              {activeFiltersCount > 0 && (
                <span className="apple-badge apple-badge-danger">{activeFiltersCount}</span>
              )}
            </button>
            <button className="apple-button apple-button-secondary apple-flex items-center gap-2">
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>تصدير</span>
            </button>
            <button
              onClick={() => setShowCreatePayment(true)}
              className="apple-button apple-button-primary apple-flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>إضافة مدفوعة</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="apple-input-floating mb-6" style={{ maxWidth: '400px' }}>
          <input
            type="text"
            placeholder=" "
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="apple-input"
          />
          <label>البحث في المدفوعات...</label>
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>

        {/* Statistics Cards */}
        <div className="apple-grid apple-grid-4 gap-6 mb-8">
          {statisticsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="apple-card p-6 group apple-animate-delay"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="apple-flex-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl apple-flex-center text-white shadow-lg bg-gradient-to-br ${stat.bgGradient}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className={`apple-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                    stat.trend > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {stat.trend > 0 ? (
                      <ArrowTrendingUpIcon className="w-3 h-3" />
                    ) : (
                      <ArrowTrendingDownIcon className="w-3 h-3" />
                    )}
                    <span>{Math.abs(stat.trend)}%</span>
                  </div>
                </div>
                <div>
                  <h3 className="apple-title-2 text-gray-900 mb-1">{stat.value}</h3>
                  <p className="apple-callout text-gray-900 mb-1">{stat.title}</p>
                  <p className="apple-caption-1 text-gray-600">{stat.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="apple-card p-6 mb-6 apple-animate-slide-up">
            <div className="apple-flex-between items-center mb-4">
              <h3 className="apple-title-3 text-gray-900">فلاتر المدفوعات</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="apple-button apple-button-secondary !min-h-8 !px-2"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="apple-grid apple-grid-4 gap-4">
              <div>
                <label className="apple-caption-1 text-gray-600 block mb-2">الحالة</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="apple-input"
                >
                  <option value="">جميع الحالات</option>
                  <option value="paid">مدفوع</option>
                  <option value="pending">في الانتظار</option>
                  <option value="overdue">متأخر</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </div>
              <div>
                <label className="apple-caption-1 text-gray-600 block mb-2">الفئة</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="apple-input"
                >
                  <option value="">جميع الفئات</option>
                  <option value="subscription">اشتراك</option>
                  <option value="donation">تبرع</option>
                  <option value="event">فعالية</option>
                  <option value="membership">عضوية</option>
                </select>
              </div>
              <div>
                <label className="apple-caption-1 text-gray-600 block mb-2">طريقة الدفع</label>
                <select
                  value={filters.method}
                  onChange={(e) => handleFilterChange('method', e.target.value)}
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
                <label className="apple-caption-1 text-gray-600 block mb-2">من تاريخ</label>
                <input
                  type="date"
                  value={filters.dateRange.start || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="apple-input"
                />
              </div>
            </div>
            <div className="apple-flex gap-3 mt-4">
              <button
                onClick={() => setFilters({
                  status: '',
                  category: '',
                  method: '',
                  search: '',
                  dateRange: {}
                })}
                className="apple-button apple-button-secondary"
              >
                مسح الفلاتر
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="apple-card p-12">
          <div className="apple-flex-center">
            <div className="text-center">
              <div className="w-12 h-12 mb-4 mx-auto apple-skeleton rounded-xl"></div>
              <p className="apple-body text-gray-600">جاري تحميل المدفوعات...</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="apple-card overflow-hidden">
          <table className="apple-table">
            <thead>
              <tr>
                <th className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedPayments.length === paginatedPayments.length && paginatedPayments.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th>العضو</th>
                <th>المبلغ</th>
                <th>الفئة</th>
                <th>الحالة</th>
                <th>تاريخ الاستحقاق</th>
                <th>طريقة الدفع</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.map((payment) => (
                <tr key={payment.id} className="group">
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedPayments.includes(payment.id)}
                      onChange={() => handleSelectPayment(payment.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td>
                    <div className="apple-flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg apple-flex-center font-semibold text-white bg-gradient-to-br from-blue-500 to-indigo-600">
                        {payment.memberName.charAt(0)}
                      </div>
                      <div>
                        <p className="apple-callout text-gray-900">{payment.memberName}</p>
                        <p className="apple-caption-1 text-gray-600">{payment.referenceNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="apple-callout text-gray-900 font-semibold">{formatCurrency(payment.amount)}</p>
                      <p className="apple-caption-1 text-gray-600">{payment.description}</p>
                    </div>
                  </td>
                  <td>
                    <span className="apple-badge apple-badge-secondary">
                      {getCategoryText(payment.category)}
                    </span>
                  </td>
                  <td>
                    <span className={`apple-badge ${getPaymentStatusColor(payment.status)}`}>
                      {getPaymentStatusText(payment.status)}
                    </span>
                  </td>
                  <td>
                    <div className="apple-flex items-center gap-1">
                      <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                      <span className="apple-caption-1 text-gray-600">{formatDate(payment.dueDate)}</span>
                    </div>
                  </td>
                  <td>
                    <span className="apple-caption-1 text-gray-600">{getMethodText(payment.method)}</span>
                  </td>
                  <td>
                    <div className="apple-flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="apple-button apple-button-secondary !min-h-8 !px-2">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button className="apple-button apple-button-secondary !min-h-8 !px-2">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      {payment.status === 'pending' && (
                        <button className="apple-button apple-button-success !min-h-8 !px-2">
                          <CheckCircleIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="apple-flex-between items-center p-6 border-t border-gray-200">
              <p className="apple-caption-1 text-gray-600">
                عرض {(pagination.page - 1) * pagination.limit + 1} إلى {Math.min(pagination.page * pagination.limit, filteredPayments.length)} من أصل {filteredPayments.length} مدفوعة
              </p>
              <div className="apple-flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="apple-button apple-button-secondary !min-h-8 !px-3 disabled:opacity-50"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setPagination(prev => ({ ...prev, page }))}
                      className={`apple-button !min-h-8 !px-3 ${
                        pagination.page === page ? 'apple-button-primary' : 'apple-button-secondary'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="apple-button apple-button-secondary !min-h-8 !px-3 disabled:opacity-50"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && paginatedPayments.length === 0 && (
        <div className="apple-card p-12 text-center">
          <BanknotesIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="apple-title-3 text-gray-900 mb-2">لا توجد مدفوعات</h3>
          <p className="apple-body text-gray-600 mb-6">
            {searchQuery || activeFiltersCount > 0
              ? 'لم يتم العثور على مدفوعات تطابق معايير البحث الحالية.'
              : 'لم يتم تسجيل أي مدفوعات بعد. قم بإضافة المدفوعة الأولى.'}
          </p>
          <button
            onClick={() => setShowCreatePayment(true)}
            className="apple-button apple-button-primary"
          >
            <PlusIcon className="w-4 h-4 ml-2" />
            إضافة مدفوعة جديدة
          </button>
        </div>
      )}
    </div>
  );
};

export default ApplePaymentsManagement;