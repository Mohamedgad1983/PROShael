import React, {  useState, useEffect , useCallback } from 'react';
import {
  CreditCardIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  UserGroupIcon,
  DocumentTextIcon,
  XMarkIcon,
  ChevronDownIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { CheckIcon, SparklesIcon } from '@heroicons/react/24/solid';
import FlexiblePaymentInput from './FlexiblePaymentInput';
import PaymentConfirmationModal from './PaymentConfirmationModal';
import { Member, PaymentConfirmationData, PaymentState } from './types';
import { formatCurrency, generateTransactionId, createPaymentSummary } from './utils';
import './Subscriptions.css';

interface SubscriptionPlan {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  duration: 'monthly' | 'quarterly' | 'yearly';
  features: string[];
  isPopular?: boolean;
  color: string;
}

interface Subscription {
  id: string;
  memberId: string;
  memberName: string;
  planId: string;
  status: 'active' | 'pending' | 'overdue' | 'cancelled';
  startDate: Date;
  endDate: Date;
  amount: number;
  lastPayment?: Date;
  nextPayment: Date;
}

const Subscriptions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'members' | 'payments' | 'flexible'>('overview');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'overdue'>('all');

  // Flexible Payment System State
  const [paymentState, setPaymentState] = useState<PaymentState>({
    amount: null,
    isValid: false,
    selectedMember: null,
    showConfirmationModal: false,
    isProcessing: false
  });
  const [availableMembers] = useState<Member[]>([
    { id: 'M001', name: 'أحمد الشعيل', email: 'ahmed@alshuail.com', phone: '+966501234567' },
    { id: 'M002', name: 'فاطمة الشعيل', email: 'fatima@alshuail.com', phone: '+966507654321' },
    { id: 'M003', name: 'محمد الشعيل', email: 'mohammed@alshuail.com', phone: '+966509876543' },
    { id: 'M004', name: 'سارة الشعيل', email: 'sara@alshuail.com', phone: '+966502468135' },
    { id: 'M005', name: 'عبدالله الشعيل', email: 'abdullah@alshuail.com', phone: '+966503691470' }
  ]);

  // Sample data for subscription plans
  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: '1',
      name: 'Basic Plan',
      nameAr: 'الخطة الأساسية',
      price: 100,
      duration: 'monthly',
      features: [
        'المشاركة في الأنشطة الأساسية',
        'التصويت في القرارات',
        'الدعم الأساسي'
      ],
      color: '#3B82F6'
    },
    {
      id: '2',
      name: 'Premium Plan',
      nameAr: 'الخطة المميزة',
      price: 250,
      duration: 'monthly',
      isPopular: true,
      features: [
        'جميع مميزات الخطة الأساسية',
        'أولوية في الأنشطة الخاصة',
        'دعم مخصص على مدار الساعة',
        'خصومات على المناسبات'
      ],
      color: '#8B5CF6'
    },
    {
      id: '3',
      name: 'Family Plan',
      nameAr: 'خطة العائلة',
      price: 500,
      duration: 'monthly',
      features: [
        'جميع المميزات المتاحة',
        'تغطية كاملة للعائلة',
        'أنشطة حصرية',
        'دعم VIP',
        'استشارات مجانية'
      ],
      color: '#10B981'
    }
  ];

  // Sample subscription data
  const sampleSubscriptions: Subscription[] = [
    {
      id: '1',
      memberId: 'M001',
      memberName: 'أحمد الشعيل',
      planId: '2',
      status: 'active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      amount: 250,
      lastPayment: new Date('2024-11-01'),
      nextPayment: new Date('2024-12-01')
    },
    {
      id: '2',
      memberId: 'M002',
      memberName: 'فاطمة الشعيل',
      planId: '1',
      status: 'pending',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      amount: 100,
      nextPayment: new Date('2024-11-15')
    },
    {
      id: '3',
      memberId: 'M003',
      memberName: 'محمد الشعيل',
      planId: '3',
      status: 'overdue',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      amount: 500,
      lastPayment: new Date('2024-09-01'),
      nextPayment: new Date('2024-10-01')
    }
  ];

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setSubscriptions(sampleSubscriptions);
      setIsLoading(false);
    }, 1500);
  }, []);

  const getStatusBadge = (status: Subscription['status']) => {
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

    const statusConfig = {
      active: { label: 'نشط', className: 'status-active', icon: CheckCircleIcon },
      pending: { label: 'قيد الانتظار', className: 'status-pending', icon: ClockIcon },
      overdue: { label: 'متأخر', className: 'status-overdue', icon: ExclamationTriangleIcon },
      cancelled: { label: 'ملغي', className: 'status-cancelled', icon: XMarkIcon }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`status-badge ${config.className}`}>
        <Icon className="status-icon" />
        {config.label}
      </span>
    );
  };

  const getStats = () => {
    const active = subscriptions.filter(s => s.status === 'active').length;
    const pending = subscriptions.filter(s => s.status === 'pending').length;
    const overdue = subscriptions.filter(s => s.status === 'overdue').length;
    const totalRevenue = subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + s.amount, 0);

    return [
      {
        title: 'الاشتراكات النشطة',
        value: active.toString(),
        icon: CheckCircleIcon,
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.1)'
      },
      {
        title: 'قيد الانتظار',
        value: pending.toString(),
        icon: ClockIcon,
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.1)'
      },
      {
        title: 'متأخر السداد',
        value: overdue.toString(),
        icon: ExclamationTriangleIcon,
        color: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.1)'
      },
      {
        title: 'الإيرادات الشهرية',
        value: `${totalRevenue.toLocaleString()} ريال`,
        icon: BanknotesIcon,
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.1)'
      }
    ];
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.memberName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || sub.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Flexible Payment System Functions
  const handleAmountChange = (amount: number | null) => {
    setPaymentState(prev => ({ ...prev, amount }));
  };

  const handleAmountValidation = (isValid: boolean) => {
    setPaymentState(prev => ({ ...prev, isValid }));
  };

  const handleMemberSelection = (member: Member) => {
    setPaymentState(prev => ({
      ...prev,
      selectedMember: member,
      showConfirmationModal: true
    }));
  };

  const handlePaymentConfirmation = async (paymentData: PaymentConfirmationData) => {
    setPaymentState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create new subscription
      const newSubscription = {
        id: generateTransactionId(),
        memberId: paymentData.memberId,
        memberName: paymentState.selectedMember?.name || '',
        planId: 'flexible',
        status: 'active' as const,
        startDate: new Date(),
        endDate: new Date(Date.now() + (paymentData.duration === 'lifetime' ?
          100 * 365 * 24 * 60 * 60 * 1000 : // 100 years for lifetime
          (paymentData.duration === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
        )),
        amount: paymentData.amount,
        lastPayment: new Date(),
        nextPayment: paymentData.duration === 'lifetime' ?
          new Date('2099-12-31') :
          new Date(Date.now() + (paymentData.duration === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
        isFlexiblePayment: true,
        flexibleAmount: paymentData.amount
      };

      setSubscriptions(prev => [newSubscription, ...prev]);

      // Reset state
      setPaymentState({
        amount: null,
        isValid: false,
        selectedMember: null,
        showConfirmationModal: false,
        isProcessing: false
      });

      // Switch to overview tab to show the new subscription
      setActiveTab('overview');

      // Show success notification (you could add a notification system)
      console.log('تم إضافة الاشتراك بنجاح');
    } catch (error) {
      console.error('خطأ في إضافة الاشتراك:', error);
      setPaymentState(prev => ({ ...prev, error: 'حدث خطأ أثناء معالجة الاشتراك' }));
    } finally {
      setPaymentState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'plans':
        return renderPlans();
      case 'members':
        return renderMemberSubscriptions();
      case 'payments':
        return renderPayments();
      case 'flexible':
        return renderFlexiblePayments();
      default:
        return null;
    }
  };

  const renderOverview = () => (
    <div className="overview-section">
      {/* Statistics Cards */}
      <div className="stats-grid">
        {getStats().map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card">
              <div
                className="stat-icon"
                style={{
                  background: stat.bgColor,
                  color: stat.color
                }}
              >
                <Icon />
              </div>
              <div className="stat-content">
                <p className="stat-label">{stat.title}</p>
                <h3 className="stat-value">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Subscriptions */}
      <div className="recent-subscriptions">
        <div className="section-header">
          <h3>الاشتراكات الحديثة</h3>
          <button className="btn-text">عرض الكل</button>
        </div>
        <div className="subscriptions-list">
          {filteredSubscriptions.slice(0, 5).map(subscription => {
            const plan = subscriptionPlans.find(p => p.id === subscription.planId);
            return (
              <div key={subscription.id} className="subscription-item">
                <div className="subscription-member">
                  <div className="member-avatar">
                    {subscription.memberName.charAt(0)}
                  </div>
                  <div className="member-info">
                    <h4>{subscription.memberName}</h4>
                    <p>{plan?.nameAr} - {subscription.amount} ريال</p>
                  </div>
                </div>
                <div className="subscription-status">
                  {getStatusBadge(subscription.status)}
                  <span className="next-payment">
                    الدفعة القادمة: {subscription.nextPayment.toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="action-card" onClick={() => setShowAddPlanModal(true)}>
          <PlusIcon className="action-icon" />
          <span>إضافة خطة جديدة</span>
        </button>
        <button className="action-card">
          <UserGroupIcon className="action-icon" />
          <span>إدارة الأعضاء</span>
        </button>
        <button className="action-card">
          <DocumentTextIcon className="action-icon" />
          <span>تقرير الاشتراكات</span>
        </button>
      </div>
    </div>
  );

  const renderPlans = () => (
    <div className="plans-section">
      <div className="section-header">
        <h2>خطط الاشتراك المتاحة</h2>
        <button className="btn-primary" onClick={() => setShowAddPlanModal(true)}>
          <PlusIcon />
          إضافة خطة جديدة
        </button>
      </div>

      <div className="plans-grid">
        {subscriptionPlans.map(plan => (
          <div
            key={plan.id}
            className={`subscription-plan-card ${plan.isPopular ? 'popular' : ''}`}
            onClick={() => setSelectedPlan(plan)}
          >
            {plan.isPopular && (
              <span className="plan-popular-badge">
                <SparklesIcon className="badge-icon" />
                الأكثر شعبية
              </span>
            )}
            <div className="plan-header">
              <h3 className="plan-name">{plan.nameAr}</h3>
              <div className="plan-price">
                <span className="price-amount">{plan.price}</span>
                <span className="price-currency">ريال</span>
                <span className="price-period">/شهرياً</span>
              </div>
            </div>
            <ul className="plan-features">
              {plan.features.map((feature, index) => (
                <li key={index} className="feature-item">
                  <CheckIcon className="feature-icon" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              className="plan-select-btn"
              style={{ background: plan.color }}
            >
              اختر هذه الخطة
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMemberSubscriptions = () => (
    <div className="members-section">
      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-box">
          <MagnifyingGlassIcon className="search-icon" />
          <input
            type="text"
            placeholder="البحث عن عضو..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            الكل
          </button>
          <button
            className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >
            نشط
          </button>
          <button
            className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterStatus('pending')}
          >
            قيد الانتظار
          </button>
          <button
            className={`filter-btn ${filterStatus === 'overdue' ? 'active' : ''}`}
            onClick={() => setFilterStatus('overdue')}
          >
            متأخر
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="members-table-container">
        <table className="members-table">
          <thead>
            <tr>
              <th>العضو</th>
              <th>الخطة</th>
              <th>الحالة</th>
              <th>تاريخ البدء</th>
              <th>تاريخ الانتهاء</th>
              <th>المبلغ</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubscriptions.map(subscription => {
              const plan = subscriptionPlans.find(p => p.id === subscription.planId);
              return (
                <tr key={subscription.id}>
                  <td>
                    <div className="member-cell">
                      <div className="member-avatar-small">
                        {subscription.memberName.charAt(0)}
                      </div>
                      <span>{subscription.memberName}</span>
                    </div>
                  </td>
                  <td>{plan?.nameAr}</td>
                  <td>{getStatusBadge(subscription.status)}</td>
                  <td>{subscription.startDate.toLocaleDateString('ar-SA')}</td>
                  <td>{subscription.endDate.toLocaleDateString('ar-SA')}</td>
                  <td>{subscription.amount} ريال</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-icon" title="تجديد">
                        <ArrowPathIcon />
                      </button>
                      <button className="btn-icon" title="عرض التفاصيل">
                        <DocumentTextIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="payments-section">
      <div className="payment-summary">
        <div className="summary-card">
          <h3>ملخص المدفوعات</h3>
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="stat-label">إجمالي المدفوعات هذا الشهر</span>
              <span className="stat-value">15,000 ريال</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">المدفوعات المعلقة</span>
              <span className="stat-value">3,500 ريال</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">المدفوعات المتأخرة</span>
              <span className="stat-value error">2,000 ريال</span>
            </div>
          </div>
        </div>
      </div>

      <div className="payment-timeline">
        <h3>المدفوعات القادمة</h3>
        <div className="timeline-items">
          {filteredSubscriptions.map(subscription => (
            <div key={subscription.id} className="timeline-item">
              <div className="timeline-date">
                <CalendarDaysIcon className="date-icon" />
                <span>{subscription.nextPayment.toLocaleDateString('ar-SA')}</span>
              </div>
              <div className="timeline-content">
                <h4>{subscription.memberName}</h4>
                <p>{subscription.amount} ريال</p>
              </div>
              <div className="timeline-status">
                {getStatusBadge(subscription.status)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFlexiblePayments = () => (
    <div className="flexible-payments-section">
      <div className="section-header">
        <h2>الاشتراك المرن</h2>
        <p>اشترك بأي مبلغ يناسبك ابتداءً من 50 ريال</p>
      </div>

      {/* Payment Input */}
      <FlexiblePaymentInput
        onAmountChange={handleAmountChange}
        onValidation={handleAmountValidation}
      />

      {/* Member Selection */}
      {paymentState.amount && paymentState.isValid && (
        <div className="member-selection-section">
          <h3>اختر العضو</h3>
          <p>اختر العضو الذي سيحصل على الاشتراك</p>
          <div className="members-grid">
            {availableMembers.map(member => (
              <button
                key={member.id}
                type="button"
                className="member-card-btn"
                onClick={() => handleMemberSelection(member)}
              >
                <div className="member-avatar">
                  <UserIcon />
                </div>
                <div className="member-details">
                  <h4>{member.name}</h4>
                  {member.email && <p className="member-email">{member.email}</p>}
                  {member.phone && <p className="member-phone">{member.phone}</p>}
                </div>
                <div className="select-indicator">
                  <ChevronDownIcon />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Benefits Section */}
      <div className="benefits-section">
        <h3>مميزات الاشتراك المرن</h3>
        <div className="benefits-grid">
          <div className="benefit-item">
            <div className="benefit-icon">
              <BanknotesIcon />
            </div>
            <h4>مرونة في المبلغ</h4>
            <p>ادفع أي مبلغ يناسب ظروفك المالية</p>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">
              <CalendarDaysIcon />
            </div>
            <h4>اختيار المدة</h4>
            <p>شهري، سنوي، أو مدى الحياة</p>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">
              <CheckCircleIcon />
            </div>
            <h4>جميع المميزات</h4>
            <p>استمتع بجميع مميزات العضوية</p>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">
              <ArrowPathIcon />
            </div>
            <h4>سهولة التجديد</h4>
            <p>جدد اشتراكك بأي مبلغ جديد</p>
          </div>
        </div>
      </div>

    </div>
  );

  if (isLoading) {
    return (
      <div className="subscriptions-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>جاري تحميل بيانات الاشتراكات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="subscriptions-container">
      {/* Header */}
      <div className="subscriptions-header">
        <div className="header-content">
          <h1>إدارة الاشتراكات</h1>
          <p>إدارة خطط الاشتراك ومتابعة المدفوعات</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary">
            <ChartBarIcon />
            التقارير
          </button>
          <button className="btn-primary" onClick={() => setShowAddPlanModal(true)}>
            <PlusIcon />
            إضافة اشتراك
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="subscription-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          نظرة عامة
        </button>
        <button
          className={`tab-button ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          خطط الاشتراك
        </button>
        <button
          className={`tab-button ${activeTab === 'flexible' ? 'active' : ''} featured-tab`}
          onClick={() => setActiveTab('flexible')}
        >
          <BanknotesIcon className="tab-icon" />
          اشتراك مرن
          <span className="new-badge">جديد</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          اشتراكات الأعضاء
        </button>
        <button
          className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          المدفوعات
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {renderTabContent()}
      </div>

      {/* Add Plan Modal */}
      {showAddPlanModal && (
        <div className="modal-overlay" onClick={() => setShowAddPlanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>إضافة خطة اشتراك جديدة</h2>
              <button className="modal-close" onClick={() => setShowAddPlanModal(false)}>
                <XMarkIcon />
              </button>
            </div>
            <div className="modal-body">
              <form className="add-plan-form">
                <div className="form-group">
                  <label>اسم الخطة</label>
                  <input type="text" placeholder="أدخل اسم الخطة" className="form-input" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>السعر</label>
                    <input type="number" placeholder="0" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>المدة</label>
                    <select className="form-input">
                      <option>شهري</option>
                      <option>ربع سنوي</option>
                      <option>سنوي</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>المميزات</label>
                  <textarea
                    placeholder="أدخل مميزات الخطة (ميزة واحدة في كل سطر)"
                    className="form-textarea"
                    rows={4}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddPlanModal(false)}>
                    إلغاء
                  </button>
                  <button type="submit" className="btn-primary">
                    إضافة الخطة
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Flexible Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={paymentState.showConfirmationModal}
        onClose={() => setPaymentState(prev => ({ ...prev, showConfirmationModal: false }))}
        onConfirm={handlePaymentConfirmation}
        member={paymentState.selectedMember!}
        amount={paymentState.amount!}
        isLoading={paymentState.isProcessing}
      />
    </div>
  );
};


// Phase 4: Performance Optimization - Memoize to prevent unnecessary re-renders
export default React.memo(Subscriptions);