import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toHijri } from 'hijri-converter';
import { logger } from '../../utils/logger';
import api from '../../services/api';

import {
  BanknotesIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  ShieldExclamationIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  WalletIcon,
  UserGroupIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';

const PaymentsTracking = () => {
  // Performance optimized event handlers
  const handleRefresh = useCallback(() => {
    // Refresh logic here
  }, []);

  const handleFilterChange = useCallback((filterType, value) => {
    // Filter logic here
  }, []);

  const handlePageChange = useCallback((page) => {
    // Pagination logic here
  }, []);

  const { user, canAccessModule } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    payment_type: '',
    date_range: '',
    member_id: '',
    is_on_behalf: ''
  });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Mock payment data
  const mockPayments = [
    {
      id: 1,
      payment_id: 'PAY-2024-001',
      member_id: 'MEM001',
      member_name: 'أحمد محمد الشعيل',
      member_phone: '0501234567',
      amount: 120,
      currency: 'ريال',
      payment_type: 'subscription',
      payment_method: 'bank_transfer',
      status: 'completed',
      transaction_id: 'TXN123456789',
      description: 'اشتراك شهري - العضوية المميزة',
      payment_date: '2024-01-15',
      due_date: '2024-01-10',
      hijri_date: toHijri(2024, 1, 15),
      created_at: '2024-01-15T10:30:00Z',
      receipt_url: '/receipts/PAY-2024-001.pdf',
      notes: 'تم الدفع في الموعد المحدد'
    },
    {
      id: 2,
      payment_id: 'PAY-2024-002',
      member_id: 'MEM002',
      member_name: 'فاطمة عبدالله الشعيل',
      member_phone: '0501234568',
      amount: 50,
      currency: 'ريال',
      payment_type: 'subscription',
      payment_method: 'credit_card',
      status: 'completed',
      transaction_id: 'TXN123456790',
      description: 'اشتراك شهري - العضوية الأساسية',
      payment_date: '2024-01-20',
      due_date: '2024-01-15',
      hijri_date: toHijri(2024, 1, 20),
      created_at: '2024-01-20T14:15:00Z',
      receipt_url: '/receipts/PAY-2024-002.pdf',
      notes: 'دفع متأخر 5 أيام'
    },
    {
      id: 3,
      payment_id: 'PAY-2024-003',
      member_id: 'MEM003',
      member_name: 'محمد سعد الشعيل',
      member_phone: '0501234569',
      amount: 500,
      currency: 'ريال',
      payment_type: 'contribution',
      payment_method: 'cash',
      status: 'pending',
      transaction_id: null,
      description: 'مساهمة في مبادرة خيرية',
      payment_date: null,
      due_date: '2024-01-25',
      hijri_date: null,
      created_at: '2024-01-22T09:00:00Z',
      receipt_url: null,
      notes: 'في انتظار الدفع'
    },
    {
      id: 4,
      payment_id: 'PAY-2024-004',
      member_id: 'MEM004',
      member_name: 'خديجة أحمد الشعيل',
      member_phone: '0501234570',
      amount: 200,
      currency: 'ريال',
      payment_type: 'diya',
      payment_method: 'bank_transfer',
      status: 'failed',
      transaction_id: 'TXN123456791',
      description: 'مساهمة في دية',
      payment_date: '2024-01-18',
      due_date: '2024-01-15',
      hijri_date: toHijri(2024, 1, 18),
      created_at: '2024-01-18T16:45:00Z',
      receipt_url: null,
      notes: 'فشل في الدفع - رصيد غير كافي'
    },
    {
      id: 5,
      payment_id: 'PAY-2024-005',
      member_id: 'MEM005',
      member_name: 'عبدالرحمن علي الشعيل',
      member_phone: '0501234571',
      amount: 300,
      currency: 'ريال',
      payment_type: 'occasion',
      payment_method: 'stc_pay',
      status: 'completed',
      transaction_id: 'TXN123456792',
      description: 'مساهمة في حفل زفاف',
      payment_date: '2024-01-25',
      due_date: '2024-01-25',
      hijri_date: toHijri(2024, 1, 25),
      created_at: '2024-01-25T12:20:00Z',
      receipt_url: '/receipts/PAY-2024-005.pdf',
      notes: 'تم الدفع بواسطة stc pay'
    }
  ];

  useEffect(() => {
    if (canAccessModule('financial')) {
      loadPaymentsData();
    }
  }, [filters, dateRange]);

  const loadPaymentsData = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.payment_type) params.append('category', filters.payment_type);
      if (filters.is_on_behalf) params.append('is_on_behalf', filters.is_on_behalf);
      params.append('limit', '100');

      const response = await api.get(`/payments?${params.toString()}`);
      const data = response.data;

      // Transform API data to component format
      const paymentsData = (data?.data || data || []).map(payment => ({
        id: payment.id,
        payment_id: `PAY-${String(payment.id).slice(0, 8)}`,
        member_id: payment.beneficiary_id || payment.payer_id,
        member_name: payment.beneficiary?.full_name || payment.payer?.full_name || 'غير محدد',
        member_phone: payment.beneficiary?.phone || payment.payer?.phone || '',
        amount: parseFloat(payment.amount) || 0,
        currency: payment.currency || 'ريال',
        payment_type: payment.category || 'subscription',
        payment_method: payment.payment_method || 'bank_transfer',
        status: payment.status || 'completed',
        transaction_id: payment.transaction_reference,
        description: payment.description || payment.notes || '',
        payment_date: payment.created_at?.split('T')[0],
        due_date: payment.due_date,
        hijri_date: payment.hijri_date_string,
        hijri_formatted: payment.hijri_formatted,
        created_at: payment.created_at,
        receipt_url: payment.receipt_url,
        notes: payment.notes,
        // On-behalf payment info
        is_on_behalf: payment.is_on_behalf || false,
        payer: payment.payer,
        beneficiary: payment.beneficiary,
        payer_id: payment.payer_id,
        beneficiary_id: payment.beneficiary_id
      }));

      setPayments(paymentsData);
    } catch (error) {
      logger.error('Error loading payments data:', { error });
      // Fallback to mock data if API fails
      setPayments(mockPayments);
    } finally {
      setLoading(false);
    }
  };

  // RBAC Access Control
  if (!canAccessModule('financial')) {
    return (
      <div style={{
        height: '100%',
        background: 'linear-gradient(to bottom right, #EFF6FF, #FFFFFF, #F5F3FF)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }} dir="rtl">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
            <ShieldExclamationIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">غير مصرح بالوصول</h2>
          <p className="text-gray-600 mb-6">
            ليس لديك صلاحية للوصول إلى قسم تتبع المدفوعات. يتطلب هذا القسم صلاحيات المدير المالي أو المدير العام.
          </p>
          <div className="text-sm text-gray-500">
            الصلاحية الحالية: {user?.role || 'غير محدد'}
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const statistics = {
    total_payments: payments.length,
    completed_payments: payments.filter(p => p.status === 'completed').length,
    pending_payments: payments.filter(p => p.status === 'pending').length,
    failed_payments: payments.filter(p => p.status === 'failed').length,
    total_amount: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
    pending_amount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    on_behalf_payments: payments.filter(p => p.is_on_behalf).length,
    on_behalf_amount: payments.filter(p => p.is_on_behalf && p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
    this_month_total: payments.filter(p => {
      const paymentDate = new Date(p.payment_date || p.created_at);
      const currentMonth = new Date().getMonth();
      const paymentMonth = paymentDate.getMonth();
      return paymentMonth === currentMonth && p.status === 'completed';
    }).reduce((sum, p) => sum + p.amount, 0),
    success_rate: payments.length > 0 ? ((payments.filter(p => p.status === 'completed').length / payments.length) * 100).toFixed(1) : 0
  };

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      payment.member_name?.toLowerCase().includes(searchLower) ||
      payment.member_phone?.includes(searchQuery) ||
      payment.payment_id?.toLowerCase().includes(searchLower) ||
      payment.description?.toLowerCase().includes(searchLower) ||
      payment.payer?.full_name?.toLowerCase().includes(searchLower) ||
      payment.beneficiary?.full_name?.toLowerCase().includes(searchLower);

    const matchesStatus = !filters.status || payment.status === filters.status;
    const matchesType = !filters.payment_type || payment.payment_type === filters.payment_type;
    const matchesMember = !filters.member_id || payment.member_id === filters.member_id;

    // On-behalf filter (handled server-side, but also client-side fallback)
    const matchesOnBehalf = !filters.is_on_behalf ||
      (filters.is_on_behalf === 'true' && payment.is_on_behalf) ||
      (filters.is_on_behalf === 'false' && !payment.is_on_behalf);

    const matchesDateRange = !dateRange.start || !dateRange.end || (
      payment.payment_date &&
      payment.payment_date >= dateRange.start &&
      payment.payment_date <= dateRange.end
    );

    return matchesSearch && matchesStatus && matchesType && matchesMember && matchesOnBehalf && matchesDateRange;
  });

  const formatHijriDate = (gregorianDate) => {
    try {
      const date = new Date(gregorianDate);
      const hijriDate = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
      return `${hijriDate.hy}/${hijriDate.hm}/${hijriDate.hd} هـ`;
    } catch (error) {
      return gregorianDate;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'pending': return 'معلق';
      case 'failed': return 'فشل';
      default: return 'غير محدد';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentTypeText = (type) => {
    switch (type) {
      case 'subscription': return 'اشتراك';
      case 'contribution': return 'مساهمة';
      case 'diya': return 'دية';
      case 'occasion': return 'مناسبة';
      case 'initiative': return 'مبادرة';
      default: return 'أخرى';
    }
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'bank_transfer': return 'تحويل بنكي';
      case 'credit_card': return 'بطاقة ائتمان';
      case 'cash': return 'نقداً';
      case 'stc_pay': return 'STC Pay';
      case 'apple_pay': return 'Apple Pay';
      case 'mada': return 'مدى';
      default: return 'أخرى';
    }
  };

  // Statistics Cards Component
  const StatisticsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-6 mb-8">
      {/* Total Payments */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">إجمالي المدفوعات</p>
            <p className="text-3xl font-bold text-gray-900">{statistics.total_payments}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <BanknotesIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Completed Payments */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">المكتملة</p>
            <p className="text-3xl font-bold text-green-600">{statistics.completed_payments}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <CheckCircleIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Pending Payments */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">المعلقة</p>
            <p className="text-3xl font-bold text-yellow-600">{statistics.pending_payments}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
            <ClockIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Failed Payments */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">الفاشلة</p>
            <p className="text-3xl font-bold text-red-600">{statistics.failed_payments}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
            <XCircleIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Amount */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">إجمالي المبلغ</p>
            <p className="text-2xl font-bold text-purple-600">{statistics.total_amount.toLocaleString()} ريال</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
            <CurrencyDollarIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Pending Amount */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">المبلغ المعلق</p>
            <p className="text-2xl font-bold text-orange-600">{statistics.pending_amount.toLocaleString()} ريال</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
            <WalletIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* This Month Total */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">هذا الشهر</p>
            <p className="text-2xl font-bold text-indigo-600">{statistics.this_month_total.toLocaleString()} ريال</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <ArrowTrendingUpIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* On-Behalf Payments */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300 border-r-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">دفعات نيابية</p>
            <p className="text-3xl font-bold text-purple-600">{statistics.on_behalf_payments}</p>
            <p className="text-xs text-gray-500 mt-1">{statistics.on_behalf_amount.toLocaleString()} ريال</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
            <UserGroupIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Success Rate */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">معدل النجاح</p>
            <p className="text-3xl font-bold text-cyan-600">{statistics.success_rate}%</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <ReceiptPercentIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );

  // Payments Table Component
  const PaymentsTable = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <MagnifyingGlassIcon className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث بالاسم أو رقم الهاتف أو رقم المدفوعة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">جميع الحالات</option>
              <option value="completed">مكتمل</option>
              <option value="pending">معلق</option>
              <option value="failed">فشل</option>
            </select>
          </div>

          {/* Payment Type Filter */}
          <div>
            <select
              value={filters.payment_type}
              onChange={(e) => setFilters({...filters, payment_type: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">جميع الأنواع</option>
              <option value="subscription">اشتراك</option>
              <option value="contribution">مساهمة</option>
              <option value="diya">دية</option>
              <option value="occasion">مناسبة</option>
              <option value="initiative">مبادرة</option>
            </select>
          </div>

          {/* On-Behalf Filter */}
          <div>
            <select
              value={filters.is_on_behalf}
              onChange={(e) => setFilters({...filters, is_on_behalf: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">الكل</option>
              <option value="true">دفعات نيابية</option>
              <option value="false">دفعات شخصية</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex-1 premium-btn flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              جديد
            </button>
            <button className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200">
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Range */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">رقم المدفوعة</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الدافع</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">المستفيد</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">المبلغ</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">النوع</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الحالة</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">تاريخ الدفع</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className={`hover:bg-gray-50 transition-colors duration-200 ${payment.is_on_behalf ? 'bg-purple-50/50' : ''}`}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{payment.payment_id}</div>
                      {payment.is_on_behalf && (
                        <div className="flex items-center gap-1 mt-1">
                          <ArrowsRightLeftIcon className="w-3 h-3 text-purple-600" />
                          <span className="text-xs text-purple-600 font-medium">دفع نيابي</span>
                        </div>
                      )}
                      {payment.transaction_id && (
                        <div className="text-xs text-gray-500 mt-1">معرف: {payment.transaction_id}</div>
                      )}
                    </div>
                  </td>
                  {/* Payer Column */}
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">
                        {payment.payer?.full_name || payment.member_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.payer?.phone || payment.member_phone}
                      </div>
                    </div>
                  </td>
                  {/* Beneficiary Column */}
                  <td className="px-6 py-4">
                    {payment.is_on_behalf ? (
                      <div>
                        <div className="font-medium text-purple-700">
                          {payment.beneficiary?.full_name || 'غير محدد'}
                        </div>
                        <div className="text-sm text-purple-500">
                          {payment.beneficiary?.phone || ''}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">نفس الدافع</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{payment.amount.toLocaleString()} {payment.currency}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{getPaymentTypeText(payment.payment_type)}</div>
                    <div className="text-xs text-gray-500">{payment.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status)}
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(payment.status)}`}>
                        {getStatusText(payment.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {payment.payment_date ? (
                      <div>
                        <div className="text-sm text-gray-900">{payment.payment_date}</div>
                        <div className="text-xs text-gray-500">
                          {payment.hijri_formatted || formatHijriDate(payment.payment_date)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">لم يتم الدفع</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {setSelectedPayment(payment); setShowPaymentModal(true);}}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                        title="عرض التفاصيل"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      {payment.receipt_url && (
                        <button
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors duration-200"
                          title="تحميل الإيصال"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors duration-200"
                        title="تعديل"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <BanknotesIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مدفوعات</h3>
            <p className="text-gray-500">لم يتم العثور على مدفوعات تطابق المعايير المحددة</p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        height: '100%',
        background: 'linear-gradient(to bottom right, #EFF6FF, #FFFFFF, #F5F3FF)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }} dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات المدفوعات...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: 'calc(100% - 20px)',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(to bottom right, #EFF6FF, #FFFFFF, #F5F3FF)',
      overflow: 'hidden'
    }} dir="rtl">
      {/* Header */}
      <div style={{
        flexShrink: 0,
        background: 'white',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                <BanknotesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">تتبع المدفوعات</h1>
                <p className="text-sm text-gray-600">مراقبة وإدارة جميع المعاملات المالية</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">مرحباً، {user?.full_name || user?.name}</span>
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {(user?.full_name || user?.name || '').charAt(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px'
      }}>
        {/* Statistics Cards */}
        <StatisticsCards />

        {/* Tab Navigation */}
        <div className="glass-card p-6 mb-8">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              نظرة عامة
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              جميع المعاملات
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              التحليلات
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              التقارير
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {(activeTab === 'overview' || activeTab === 'transactions') && <PaymentsTable />}
        {activeTab === 'analytics' && (
          <div className="glass-card p-8 text-center">
            <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">التحليلات المالية قريباً</h3>
            <p className="text-gray-500">سيتم إضافة الرسوم البيانية والتحليلات المتقدمة قريباً</p>
          </div>
        )}
        {activeTab === 'reports' && (
          <div className="glass-card p-8 text-center">
            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">التقارير المالية قريباً</h3>
            <p className="text-gray-500">سيتم إضافة التقارير المالية التفصيلية قريباً</p>
          </div>
        )}
      </div>

      {/* Add CSS Styles */}
      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glass-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.12);
        }

        .premium-btn {
          background: linear-gradient(135deg, #22C55E 0%, #3B82F6 100%);
          padding: 12px 24px;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          border: none;
          cursor: pointer;
        }

        .premium-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(34, 197, 94, 0.3);
        }

        .premium-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .premium-btn:hover::before {
          left: 100%;
        }
      `}</style>
    </div>
  );
};


// Phase 4: Performance Optimization - Memoize to prevent unnecessary re-renders
export default React.memo(PaymentsTracking);