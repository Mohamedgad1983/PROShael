import React, {  useState, useEffect , useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toHijri } from 'hijri-converter';
import {
  ChartBarIcon,
  CreditCardIcon,
  UsersIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  BanknotesIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
  ArrowLeftIcon,
  CogIcon,
  DocumentTextIcon,
  BellIcon
} from '@heroicons/react/24/outline';

const SubscriptionsManagement = () => {
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
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'addSubscription'
  const [subscriptionQuantity, setSubscriptionQuantity] = useState(1);

  // Single subscription plan - 50 riyals base
  const basePlan = {
    id: 1,
    name: 'الاشتراك الشهري',
    name_en: 'Monthly Subscription',
    basePrice: 50,
    currency: 'ريال',
    duration: 'شهري',
    duration_en: 'monthly',
    features: ['الوصول للأحداث العائلية', 'التواصل مع الأعضاء', 'دعم العائلة', 'المشاركة في الأنشطة'],
    features_en: ['Access to family events', 'Member communication', 'Family support', 'Participate in activities'],
    color: '#007AFF',
    status: 'active'
  };

  // Generate plans based on quantity for display
  const mockPlans = [basePlan];

  const mockSubscriptions = [
    {
      id: 1,
      member_id: 'MEM001',
      member_name: 'أحمد محمد الشعيل',
      member_phone: '0501234567',
      plan_id: 1,
      plan_name: 'الاشتراك الشهري',
      quantity: 3,
      amount: 150, // 50 x 3
      currency: 'ريال',
      status: 'active',
      payment_status: 'paid',
      start_date: '2024-01-01',
      end_date: '2024-02-01',
      next_payment: '2024-02-01',
      created_hijri: toHijri(2024, 1, 1),
      renewal_count: 2,
      total_paid: 450
    },
    {
      id: 2,
      member_id: 'MEM002',
      member_name: 'فاطمة عبدالله الشعيل',
      member_phone: '0501234568',
      plan_id: 1,
      plan_name: 'الاشتراك الشهري',
      quantity: 1,
      amount: 50,
      currency: 'ريال',
      status: 'active',
      payment_status: 'paid',
      start_date: '2024-01-15',
      end_date: '2024-02-15',
      next_payment: '2024-02-15',
      created_hijri: toHijri(2024, 1, 15),
      renewal_count: 1,
      total_paid: 100
    },
    {
      id: 3,
      member_id: 'MEM003',
      member_name: 'محمد سعد الشعيل',
      member_phone: '0501234569',
      plan_id: 1,
      plan_name: 'الاشتراك الشهري',
      quantity: 10,
      amount: 500, // 50 x 10
      currency: 'ريال',
      status: 'overdue',
      payment_status: 'pending',
      start_date: '2023-12-01',
      end_date: '2024-01-01',
      next_payment: '2024-01-01',
      created_hijri: toHijri(2023, 12, 1),
      renewal_count: 0,
      total_paid: 500
    },
    {
      id: 4,
      member_id: 'MEM004',
      member_name: 'خديجة أحمد الشعيل',
      member_phone: '0501234570',
      plan_id: 1,
      plan_name: 'الاشتراك الشهري',
      quantity: 2,
      amount: 100, // 50 x 2
      currency: 'ريال',
      status: 'suspended',
      payment_status: 'failed',
      start_date: '2023-11-01',
      end_date: '2023-12-01',
      next_payment: '2024-01-01',
      created_hijri: toHijri(2023, 11, 1),
      renewal_count: 3,
      total_paid: 300
    }
  ];

  useEffect(() => {
    if (canAccessModule('financial')) {
      loadSubscriptionsData();
    }
  }, []);

  const loadSubscriptionsData = async () => {
    setLoading(true);
    try {
      // Load mock data - replace with actual API calls
      setPlans(mockPlans);
      setSubscriptions(mockSubscriptions);
    } catch (error) {
      console.error('Error loading subscriptions data:', error);
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
            ليس لديك صلاحية للوصول إلى قسم إدارة الاشتراكات. يتطلب هذا القسم صلاحيات المدير المالي أو المدير العام.
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
    total_subscriptions: subscriptions.length,
    active_subscriptions: subscriptions.filter(s => s.status === 'active').length,
    overdue_subscriptions: subscriptions.filter(s => s.status === 'overdue').length,
    total_revenue: subscriptions.reduce((sum, s) => sum + (s.total_paid || 0), 0),
    monthly_revenue: subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + s.amount, 0),
    subscription_rate: subscriptions.length > 0 ? (subscriptions.filter(s => s.status === 'active').length / subscriptions.length * 100).toFixed(1) : 0
  };

  // Filter subscriptions based on search and status
  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = !searchQuery ||
      subscription.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subscription.member_phone.includes(searchQuery) ||
      subscription.plan_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !filterStatus || subscription.status === filterStatus;

    return matchesSearch && matchesStatus;
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
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'overdue':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'suspended':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'expired':
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'overdue': return 'متأخر';
      case 'suspended': return 'معلق';
      case 'expired': return 'منتهي';
      default: return 'غير محدد';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Statistics Cards Component
  const StatisticsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
      {/* Total Subscriptions */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">إجمالي الاشتراكات</p>
            <p className="text-3xl font-bold text-gray-900">{statistics.total_subscriptions}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <UsersIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Active Subscriptions */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">الاشتراكات النشطة</p>
            <p className="text-3xl font-bold text-green-600">{statistics.active_subscriptions}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <CheckCircleIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Overdue Subscriptions */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">الاشتراكات المتأخرة</p>
            <p className="text-3xl font-bold text-yellow-600">{statistics.overdue_subscriptions}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Revenue */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">إجمالي الإيرادات</p>
            <p className="text-3xl font-bold text-purple-600">{statistics.total_revenue.toLocaleString()} ريال</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
            <BanknotesIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Monthly Revenue */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">الإيرادات الشهرية</p>
            <p className="text-3xl font-bold text-indigo-600">{statistics.monthly_revenue.toLocaleString()} ريال</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <ArrowTrendingUpIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Subscription Rate */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">معدل النشاط</p>
            <p className="text-3xl font-bold text-cyan-600">{statistics.subscription_rate}%</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <ChartBarIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );

  // Subscription Plans Component
  const SubscriptionPlans = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">خطة الاشتراك</h3>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8 hover:scale-102 transition-all duration-300">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3">{basePlan.name}</h4>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold" style={{ color: basePlan.color }}>
                  {basePlan.basePrice}
                </span>
                <span className="text-lg text-gray-600">{basePlan.currency} / {basePlan.duration}</span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 font-medium mb-2">نظام الاشتراك المرن:</p>
                <p className="text-sm text-blue-700">يمكن للعضو الاشتراك بمضاعفات 50 ريال</p>
                <div className="mt-3 space-y-1">
                  <div className="text-xs text-blue-600">• 1 وحدة = 50 ريال</div>
                  <div className="text-xs text-blue-600">• 2 وحدة = 100 ريال</div>
                  <div className="text-xs text-blue-600">• 3 وحدات = 150 ريال</div>
                  <div className="text-xs text-blue-600">• وهكذا... بدون حد أقصى</div>
                </div>
              </div>
            </div>
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ background: `${basePlan.color}20`, color: basePlan.color }}
            >
              <SparklesIcon className="w-8 h-8" />
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <h5 className="font-semibold text-gray-900 mb-3">المزايا الأساسية:</h5>
            {basePlan.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600">{subscriptions.length}</div>
                <div className="text-sm text-gray-600">إجمالي المشتركين</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {subscriptions.reduce((sum, s) => sum + (s.quantity || 1), 0) * 50}
                </div>
                <div className="text-sm text-gray-600">إجمالي الإيرادات الشهرية (ريال)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Subscriptions Table Component
  const SubscriptionsTable = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث بالاسم أو رقم الهاتف أو خطة الاشتراك..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="overdue">متأخر</option>
              <option value="suspended">معلق</option>
              <option value="expired">منتهي</option>
            </select>

            <button
              onClick={() => setCurrentView('addSubscription')}
              className="premium-btn flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              اشتراك جديد
            </button>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">العضو</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الوحدات</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">المبلغ</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الحالة</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">تاريخ البداية</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">تاريخ الانتهاء</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الدفع التالي</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSubscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{subscription.member_name}</div>
                      <div className="text-sm text-gray-500">{subscription.member_phone}</div>
                      <div className="text-xs text-gray-400">#{subscription.member_id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-blue-600">{subscription.quantity || 1}</span>
                      <span className="text-sm text-gray-500">وحدة</span>
                    </div>
                    <div className="text-xs text-gray-400">({subscription.quantity || 1} × 50 ريال)</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{subscription.amount} {subscription.currency}</div>
                    <div className="text-sm text-gray-500">المجموع: {subscription.total_paid} ريال</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(subscription.status)}
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(subscription.status)}`}>
                        {getStatusText(subscription.status)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      الدفع: {subscription.payment_status === 'paid' ? 'مدفوع' : subscription.payment_status === 'pending' ? 'معلق' : 'فشل'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{subscription.start_date}</div>
                    <div className="text-xs text-gray-500">{formatHijriDate(subscription.start_date)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{subscription.end_date}</div>
                    <div className="text-xs text-gray-500">{formatHijriDate(subscription.end_date)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{subscription.next_payment}</div>
                    <div className="text-xs text-gray-500">{formatHijriDate(subscription.next_payment)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {setSelectedSubscription(subscription); setShowSubscriptionModal(true);}}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                        title="عرض التفاصيل"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors duration-200"
                        title="تعديل"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        title="حذف"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <UsersIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد اشتراكات</h3>
            <p className="text-gray-500">لم يتم العثور على اشتراكات تطابق المعايير المحددة</p>
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
          <p className="text-gray-600">جاري تحميل بيانات الاشتراكات...</p>
        </div>
      </div>
    );
  }

  // Full-page Add Subscription view
  if (currentView === 'addSubscription') {
    return (
      <div style={{
        height: '100%',
        background: 'linear-gradient(to bottom right, #EFF6FF, #FFFFFF, #F5F3FF)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }} dir="rtl">
        {/* Header with Back Button */}
        <div className="bg-white shadow-lg border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setCurrentView('list')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-gray-600 to-gray-700 text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:transform hover:-translate-x-1"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>العودة إلى قائمة الاشتراكات</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">إضافة اشتراك جديد</h1>
          </div>
        </div>

        {/* Full-page Form Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Form Header */}
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <CreditCardIcon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">معلومات الاشتراك</h2>
                    <p className="text-blue-100">قم بملء البيانات التالية لإضافة اشتراك جديد</p>
                  </div>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-8">
                <form className="space-y-8">
                  {/* Member Selection Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <UsersIcon className="w-5 h-5 text-blue-500" />
                      معلومات العضو
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">اختر العضو *</label>
                        <select className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                          <option value="">-- اختر عضو --</option>
                          <option value="1">أحمد محمد الشعيل - 0501234567</option>
                          <option value="2">فاطمة عبدالله الشعيل - 0501234568</option>
                          <option value="3">محمد سعد الشعيل - 0501234569</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">رقم العضوية</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="سيتم التعيين تلقائياً"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subscription Quantity Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <SparklesIcon className="w-5 h-5 text-purple-500" />
                      كمية الاشتراك
                    </h3>
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">عدد الوحدات *</label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setSubscriptionQuantity(Math.max(1, subscriptionQuantity - 1))}
                              className="w-12 h-12 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                            >
                              <span className="text-xl font-bold">-</span>
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={subscriptionQuantity}
                              onChange={(e) => setSubscriptionQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-24 px-4 py-3 text-center text-xl font-bold border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => setSubscriptionQuantity(subscriptionQuantity + 1)}
                              className="w-12 h-12 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                            >
                              <span className="text-xl font-bold">+</span>
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">كل وحدة = 50 ريال</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">المبلغ الإجمالي</label>
                          <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
                            <div className="text-3xl font-bold text-blue-600">
                              {subscriptionQuantity * 50}
                              <span className="text-lg text-gray-600 mr-2">ريال</span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {subscriptionQuantity} وحدة × 50 ريال
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>ملاحظة:</strong> يمكن للعضو الاشتراك بأي عدد من الوحدات، كل وحدة بقيمة 50 ريال شهرياً.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Date and Payment Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-green-500" />
                      تفاصيل الدفع والمدة
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ البداية *</label>
                        <input
                          type="date"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الانتهاء</label>
                        <input
                          type="date"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">طريقة الدفع *</label>
                        <select className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                          <option value="cash">نقدي</option>
                          <option value="bank">تحويل بنكي</option>
                          <option value="card">بطاقة ائتمان</option>
                          <option value="online">دفع إلكتروني</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">حالة الدفع</label>
                        <select className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                          <option value="paid">مدفوع</option>
                          <option value="pending">في الانتظار</option>
                          <option value="partial">دفع جزئي</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <DocumentTextIcon className="w-5 h-5 text-orange-500" />
                      معلومات إضافية
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                      <textarea
                        rows="4"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="أي ملاحظات إضافية حول الاشتراك..."
                      ></textarea>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="autoRenew"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="autoRenew" className="text-sm text-gray-700">
                        تفعيل التجديد التلقائي للاشتراك
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="sendNotification"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="sendNotification" className="text-sm text-gray-700">
                        إرسال إشعار للعضو بتفاصيل الاشتراك
                      </label>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setCurrentView('list')}
                      className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors duration-200"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        alert('تم إضافة الاشتراك بنجاح!');
                        setCurrentView('list');
                        loadSubscriptionsData();
                      }}
                      className="px-8 py-3 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      حفظ الاشتراك
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <CreditCardIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">إدارة الاشتراكات</h1>
                <p className="text-sm text-gray-600">إدارة خطط الاشتراك ومتابعة المشتركين</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">مرحباً، {user?.full_name || user?.name}</span>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
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
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              نظرة عامة
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'plans'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              خطط الاشتراك
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'subscriptions'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              المشتركين
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              التحليلات
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <SubscriptionsTable />}
        {activeTab === 'plans' && <SubscriptionPlans />}
        {activeTab === 'subscriptions' && <SubscriptionsTable />}
        {activeTab === 'analytics' && (
          <div className="glass-card p-8 text-center">
            <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">التحليلات قريباً</h3>
            <p className="text-gray-500">سيتم إضافة لوحة التحليلات والإحصائيات التفصيلية قريباً</p>
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
          background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
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
          box-shadow: 0 10px 30px rgba(0, 122, 255, 0.3);
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

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .floating-element {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};


// Phase 4: Performance Optimization - Memoize to prevent unnecessary re-renders
export default React.memo(SubscriptionsManagement);