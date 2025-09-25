import React, { useState, useEffect } from 'react';
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
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
// CSS styles are inline

const AppleSubscriptionsManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Mock data for demonstration
  const mockPlans = [
    {
      id: 1,
      name: 'العضوية الأساسية',
      price: 50,
      duration: 'شهري',
      features: ['الوصول للأحداث العائلية', 'التواصل مع الأعضاء', 'دعم أساسي'],
      color: '#007AFF'
    },
    {
      id: 2,
      name: 'العضوية المميزة',
      price: 120,
      duration: 'شهري',
      features: ['جميع مزايا العضوية الأساسية', 'أولوية في الفعاليات', 'استشارات خاصة', 'دعم مميز'],
      color: '#5856D6'
    },
    {
      id: 3,
      name: 'العضوية الذهبية',
      price: 500,
      duration: 'سنوي',
      features: ['جميع المزايا المتاحة', 'مشاركة في القرارات', 'خدمات حصرية', 'دعم على مدار الساعة'],
      color: '#FF9500'
    }
  ];

  const mockSubscriptions = [
    {
      id: 1,
      member_name: 'أحمد الشعيل',
      plan_name: 'العضوية المميزة',
      amount: 120,
      status: 'active',
      payment_status: 'paid',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      next_payment: '2024-02-01'
    },
    {
      id: 2,
      member_name: 'فاطمة الشعيل',
      plan_name: 'العضوية الأساسية',
      amount: 50,
      status: 'active',
      payment_status: 'paid',
      start_date: '2024-01-15',
      end_date: '2024-02-15',
      next_payment: '2024-02-15'
    },
    {
      id: 3,
      member_name: 'محمد الشعيل',
      plan_name: 'العضوية الذهبية',
      amount: 500,
      status: 'overdue',
      payment_status: 'pending',
      start_date: '2023-12-01',
      end_date: '2024-12-01',
      next_payment: '2024-01-01'
    }
  ];

  useEffect(() => {
    // Load mock data
    setPlans(mockPlans);
    setSubscriptions(mockSubscriptions);
  }, []);

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'var(--apple-green-500)';
      case 'overdue': return 'var(--apple-red-500)';
      case 'pending': return 'var(--apple-amber-500)';
      case 'cancelled': return 'var(--apple-gray-500)';
      default: return 'var(--apple-gray-500)';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'overdue': return 'متأخر';
      case 'pending': return 'في الانتظار';
      case 'cancelled': return 'ملغي';
      default: return 'غير محدد';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return CheckCircleIcon;
      case 'overdue': return XCircleIcon;
      case 'pending': return ClockIcon;
      case 'cancelled': return ExclamationTriangleIcon;
      default: return ClockIcon;
    }
  };

  // Calculate statistics
  const totalSubscriptions = subscriptions.length;
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;
  const overdueSubscriptions = subscriptions.filter(sub => sub.status === 'overdue').length;
  const totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.payment_status === 'paid' ? sub.amount : 0), 0);

  // Subscription tabs
  const subscriptionTabs = [
    { id: 'overview', label: 'نظرة عامة', icon: ChartBarIcon },
    { id: 'plans', label: 'خطط الاشتراك', icon: CreditCardIcon },
    { id: 'members', label: 'اشتراكات الأعضاء', icon: UsersIcon },
    { id: 'schedule', label: 'جدول المدفوعات', icon: CalendarIcon },
    { id: 'analytics', label: 'التحليلات', icon: ArrowTrendingUpIcon }
  ];

  const AppleStatCard = ({ title, value, icon: Icon, gradient, trend, trendValue }) => (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(229, 231, 235, 0.5)',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        padding: '24px',
        transform: 'scale(1)',
        transition: 'transform 0.3s',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
          style={{
            background: gradient,
            animation: 'apple-glow 3s ease-in-out infinite'
          }}
        >
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            <span>{trendValue}</span>
            <ArrowTrendingUpIcon className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm text-gray-600 font-medium">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );

  const ApplePlanCard = ({ plan }) => (
    <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '24px', transform: 'scale(1)', transition: 'all 0.3s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: plan.color }}
          />
          <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
        </div>
        <div className="flex gap-2">
          <button style={{ padding: '8px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.3s' }} onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>
            <EyeIcon className="w-4 h-4" />
          </button>
          <button style={{ padding: '8px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.3s' }} onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(139, 92, 246, 0.2)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>
            <PencilIcon className="w-4 h-4" />
          </button>
          <button style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.3s' }} onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}>
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
          <span className="text-sm text-gray-600">ر.س / {plan.duration}</span>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-700">{feature}</span>
          </div>
        ))}
      </div>

      <button
        style={{
          width: '100%',
          padding: '10px 20px',
          background: `linear-gradient(135deg, ${plan.color}CC, ${plan.color})`,
          color: 'white',
          border: 'none',
          borderRadius: '100px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <SparklesIcon className="w-4 h-4" />
        اختيار الخطة
      </button>
    </div>
  );

  const AppleSubscriptionRow = ({ subscription }) => {
    const StatusIcon = getStatusIcon(subscription.status);

    return (
      <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '16px', transition: 'all 0.3s', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(243, 244, 246, 1)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: getStatusColor(subscription.status) }}
            >
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-gray-900 font-medium">{subscription.member_name}</h3>
              <p className="text-sm text-gray-600">{subscription.plan_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{subscription.amount} ر.س</p>
              <p className="text-xs text-gray-600">المبلغ</p>
            </div>
            <div className="text-center">
              <p
                className="text-sm font-medium"
                style={{ color: getStatusColor(subscription.status) }}
              >
                {getStatusText(subscription.status)}
              </p>
              <p className="text-xs text-gray-600">الحالة</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-900">{subscription.next_payment}</p>
              <p className="text-xs text-gray-600">الدفعة التالية</p>
            </div>
            <div className="flex gap-2">
              <button style={{ padding: '8px', background: 'rgba(248, 250, 252, 1)', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EyeIcon className="w-4 h-4" />
              </button>
              <button style={{ padding: '8px', background: 'rgba(248, 250, 252, 1)', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PencilIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <AppleStatCard
                title="إجمالي الاشتراكات"
                value={totalSubscriptions.toString()}
                icon={CreditCardIcon}
                gradient="linear-gradient(135deg, #007AFF, #5856D6)"
                trend="up"
                trendValue="+12%"
              />
              <AppleStatCard
                title="اشتراكات نشطة"
                value={activeSubscriptions.toString()}
                icon={CheckCircleIcon}
                gradient="linear-gradient(135deg, #30D158, #32D74B)"
                trend="up"
                trendValue="+8%"
              />
              <AppleStatCard
                title="مدفوعات متأخرة"
                value={overdueSubscriptions.toString()}
                icon={ClockIcon}
                gradient="linear-gradient(135deg, #FF3B30, #FF453A)"
                trend="down"
                trendValue="-3%"
              />
              <AppleStatCard
                title="إجمالي الإيرادات"
                value={`${totalRevenue.toLocaleString('ar-SA')} ر.س`}
                icon={BanknotesIcon}
                gradient="linear-gradient(135deg, #FF9500, #FFCC02)"
                trend="up"
                trendValue="+15%"
              />
            </div>

            {/* Quick Actions */}
            <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '24px' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">إجراءات سريعة</h3>
                  <p className="text-sm text-gray-600">إدارة سريعة للاشتراكات والخطط</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setShowPlanModal(true)}
                  style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <PlusIcon className="w-4 h-4" />
                  إضافة خطة جديدة
                </button>
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <UsersIcon className="w-4 h-4" />
                  إضافة اشتراك
                </button>
                <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChartBarIcon className="w-4 h-4" />
                  عرض التقارير
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '24px' }}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">آخر النشاطات</h3>
              <div className="space-y-3">
                {subscriptions.slice(0, 5).map((subscription) => (
                  <AppleSubscriptionRow key={subscription.id} subscription={subscription} />
                ))}
              </div>
            </div>
          </div>
        );

      case 'plans':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">خطط الاشتراك</h3>
                <p className="text-gray-600">إدارة خطط وباقات العضوية</p>
              </div>
              <button
                onClick={() => setShowPlanModal(true)}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <PlusIcon className="w-4 h-4" />
                إضافة خطة
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <ApplePlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </div>
        );

      case 'members':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">اشتراكات الأعضاء</h3>
                <p className="text-gray-600">إدارة اشتراكات أعضاء العائلة</p>
              </div>
              <button
                onClick={() => setShowSubscriptionModal(true)}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <PlusIcon className="w-4 h-4" />
                اشتراك جديد
              </button>
            </div>

            {/* Filters */}
            <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '16px' }}>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <div style={{ position: 'relative' }}>
                    <MagnifyingGlassIcon style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="البحث في الاشتراكات..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px 12px 44px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#1f2937', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ padding: '12px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#1f2937', fontSize: '14px', outline: 'none' }}
                >
                  <option value="">جميع الحالات</option>
                  <option value="active">نشط</option>
                  <option value="overdue">متأخر</option>
                  <option value="pending">في الانتظار</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>
            </div>

            {/* Subscriptions List */}
            <div className="space-y-3">
              {subscriptions
                .filter(sub =>
                  (!filterStatus || sub.status === filterStatus) &&
                  (!searchQuery || sub.member_name.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map((subscription) => (
                  <AppleSubscriptionRow key={subscription.id} subscription={subscription} />
                ))
              }
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div style={{ background: 'rgba(248, 250, 252, 1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">جدول المدفوعات</h3>
            <p className="text-gray-600">سيتم إضافة جدول المدفوعات والتذكيرات قريباً</p>
          </div>
        );

      case 'analytics':
        return (
          <div style={{ background: 'rgba(248, 250, 252, 1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <ArrowTrendingUpIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">التحليلات المتقدمة</h3>
            <p className="text-gray-600">سيتم إضافة تحليلات مفصلة للاشتراكات والإيرادات قريباً</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl" style={{ backgroundColor: 'white', minHeight: '100vh' }}>
      {/* Apple Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px', background: 'linear-gradient(135deg, rgba(243, 244, 246, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', borderRadius: '16px', marginBottom: '24px' }}>
        {subscriptionTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                background: isActive ? 'linear-gradient(135deg, #007AFF, #5856D6)' : 'transparent',
                border: 'none',
                color: isActive ? 'white' : '#86868B',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '100px',
                transition: 'all 0.3s'
              }}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ animation: 'apple-fade-up 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AppleSubscriptionsManagement;
