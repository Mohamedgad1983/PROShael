import React, { useState } from 'react';
import './MemberMobileApp.css';
import logo from '../../assets/logo.svg';
import { EnhancedBalanceCard, AccountStatementScreen, PaymentModal } from './PaymentSystem';
import {
  UserCircleIcon,
  CreditCardIcon,
  DocumentTextIcon,
  CalendarIcon,
  PhoneIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon,
  HomeIcon,
  PlusIcon,
  MinusIcon,
  BellIcon,
  SparklesIcon,
  GiftIcon,
  HeartIcon,
  WalletIcon,
  Cog6ToothIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  LanguageIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ChartBarIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

// Mobile App for Members - Updated
const MemberMobileApp = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // home, events, payment, profile, settings, accountStatement
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loginData, setLoginData] = useState({ phone: '', password: '' });
  const [subscriptionQuantity, setSubscriptionQuantity] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Mock member data
  const memberData = {
    name: 'أحمد محمد الشعيل',
    phone: '0501234567',
    memberId: 'MEM001',
    balance: 1250, // Member's current balance
    minimumBalance: 3000, // Required minimum balance
    currentSubscription: {
      quantity: 3,
      amount: 150,
      status: 'active',
      expiryDate: '2024-02-01',
      startDate: '2024-01-01'
    },
    totalPaid: 450,
    joinDate: '2023-06-15',
    // Account Statement
    accountStatement: [
      { id: 1, date: '2024-01-15', description: 'دفع اشتراك شهري', type: 'payment', amount: -150 },
      { id: 2, date: '2024-01-10', description: 'مساهمة في مبادرة دعم الطلاب', type: 'contribution', amount: -200 },
      { id: 3, date: '2024-01-05', description: 'إيداع رصيد', type: 'deposit', amount: 500 },
      { id: 4, date: '2023-12-25', description: 'مساهمة في دية', type: 'diya', amount: -300 },
      { id: 5, date: '2023-12-15', description: 'دفع اشتراك شهري', type: 'payment', amount: -150 },
      { id: 6, date: '2023-12-01', description: 'إيداع رصيد', type: 'deposit', amount: 1000 }
    ]
  };

  // Mock notifications data
  const notifications = {
    occasions: [
      { id: 1, title: 'حفل زواج محمد الشعيل', date: '2024-02-15', type: 'wedding' },
      { id: 2, title: 'مولود جديد - عائلة العنزي', date: '2024-02-10', type: 'birth' }
    ],
    initiatives: [
      { id: 1, title: 'مبادرة دعم الطلاب الجامعيين', status: 'active', target: 50000, collected: 35000 },
      { id: 2, title: 'مشروع بناء مسجد الحي', status: 'active', target: 100000, collected: 75000 }
    ],
    diyas: [
      { id: 1, title: 'دية حادث مروري', amount: 100000, paid: 45000, remaining: 55000 },
      { id: 2, title: 'دية قضية عائلية', amount: 50000, paid: 50000, remaining: 0 }
    ]
  };

  // Mock events data for Events screen
  const upcomingEvents = [
    {
      id: 1,
      title: 'حفل زواج محمد الشعيل',
      description: 'ندعوكم لحضور حفل زواج ابننا محمد',
      date: '2024-02-15',
      time: '8:00 مساءً',
      location: 'قاعة الأفراح - الكويت',
      type: 'wedding',
      attendeeCount: 250,
      rsvpStatus: null
    },
    {
      id: 2,
      title: 'اجتماع العائلة السنوي',
      description: 'الاجتماع السنوي لمناقشة شؤون العائلة',
      date: '2024-03-01',
      time: '4:00 عصراً',
      location: 'ديوان العائلة',
      type: 'meeting',
      attendeeCount: 80,
      rsvpStatus: 'attending'
    },
    {
      id: 3,
      title: 'حفل تخرج عبدالله',
      description: 'تخرج عبدالله من كلية الهندسة',
      date: '2024-03-20',
      time: '6:00 مساءً',
      location: 'جامعة الكويت',
      type: 'graduation',
      attendeeCount: 150,
      rsvpStatus: null
    }
  ];

  const pastEvents = [
    {
      id: 4,
      title: 'عقيقة مولود جديد',
      description: 'عقيقة المولود الجديد لعائلة العنزي',
      date: '2024-01-10',
      type: 'birth',
      userAttended: true
    },
    {
      id: 5,
      title: 'اجتماع لجنة الصندوق',
      description: 'اجتماع دوري للجنة إدارة الصندوق',
      date: '2023-12-15',
      type: 'meeting',
      userAttended: false
    }
  ];

  // RSVP Handler
  const handleRSVP = (eventId, status) => {
    // Update RSVP status
    console.log(`RSVP for event ${eventId}: ${status}`);
    // In real app, this would make an API call
  };

  // Login Screen
  const LoginScreen = () => (
    <div className="mobile-login-screen">
      <div className="login-header">
        <div className="app-logo">
          <img src={logo} alt="صندوق شعيل العنزي" className="mobile-logo" />
        </div>
        <h1>صندوق شعيل العنزي</h1>
        <p>تسجيل الدخول إلى حسابك</p>
      </div>

      <div className="login-form">
        <div className="form-group">
          <label>رقم الهاتف</label>
          <div className="input-with-icon">
            <PhoneIcon className="input-icon" />
            <input
              type="tel"
              placeholder="05XXXXXXXX"
              value={loginData.phone}
              onChange={(e) => setLoginData({...loginData, phone: e.target.value})}
              dir="ltr"
            />
          </div>
        </div>

        <div className="form-group">
          <label>كلمة المرور</label>
          <input
            type="password"
            placeholder="••••••••"
            value={loginData.password}
            onChange={(e) => setLoginData({...loginData, password: e.target.value})}
            dir="ltr"
          />
        </div>

        <button className="login-btn" onClick={() => setIsLoggedIn(true)}>
          تسجيل الدخول
        </button>

        <div className="login-footer">
          <a href="#">نسيت كلمة المرور؟</a>
        </div>
      </div>
    </div>
  );

  // Home Screen with Enhanced Notifications
  const HomeScreen = () => {
    const [expandedNotification, setExpandedNotification] = useState(null);
    const [readNotifications, setReadNotifications] = useState(new Set());

    // Notification data structures
    const occasionNotifications = [
      {
        id: 'occ_001',
        type: 'occasion_invitation',
        title: 'دعوة لحفل زفاف',
        shortMessage: 'تم دعوتك لحضور حفل زفاف أحمد الشعيل',
        fullMessage: 'يسعدنا دعوتكم لحضور حفل زفاف أحمد بن محمد الشعيل يوم الجمعة 15 رجب 1446هـ في قاعة الفرح بالكويت',
        actionRequired: true,
        actionText: 'رد على الدعوة',
        additionalData: {
          eventId: 'evt_123',
          eventDate: '2024-02-20',
          eventTime: '19:00',
          location: 'قاعة الفرح - الكويت',
          dressCode: 'رسمي'
        },
        createdAt: new Date('2024-02-01T10:00:00Z'),
        isRead: false
      },
      {
        id: 'occ_002',
        type: 'occasion_rsvp_reminder',
        title: 'تذكير: رد على دعوة اجتماع العائلة',
        shortMessage: 'لم تقم بالرد على دعوة اجتماع العائلة الشهري',
        fullMessage: 'نذكركم بضرورة الرد على دعوة اجتماع العائلة الشهري المقرر يوم السبت. الرجاء تأكيد حضوركم',
        actionRequired: true,
        actionText: 'رد الآن',
        additionalData: {
          eventId: 'evt_124',
          deadline: '2024-02-15',
          eventDate: '2024-02-18'
        },
        createdAt: new Date('2024-02-10T14:30:00Z'),
        isRead: false
      }
    ];

    const initiativeNotifications = [
      {
        id: 'init_001',
        type: 'initiative_new',
        title: 'مبادرة خيرية جديدة',
        shortMessage: 'تم إطلاق مبادرة جديدة لمساعدة الأسر المحتاجة',
        fullMessage: 'أطلقت العائلة مبادرة خيرية لمساعدة 50 أسرة محتاجة خلال شهر رمضان المبارك. الهدف جمع 25,000 دينار كويتي',
        actionRequired: true,
        actionText: 'تبرع الآن',
        additionalData: {
          initiativeId: 'init_789',
          goalAmount: 25000,
          currentAmount: 8500,
          currency: 'KWD',
          deadline: '2024-03-15',
          participantsCount: 23
        },
        createdAt: new Date('2024-02-05T09:00:00Z'),
        isRead: false
      },
      {
        id: 'init_002',
        type: 'initiative_progress',
        title: 'تقدم في مبادرة كسوة العيد',
        shortMessage: 'تم تحقيق 75% من هدف مبادرة كسوة العيد',
        fullMessage: 'بفضل تبرعاتكم الكريمة، تم تحقيق 75% من الهدف المطلوب لمبادرة كسوة العيد. تبقى 2,500 دينار لإتمام المبادرة',
        actionRequired: false,
        additionalData: {
          initiativeId: 'init_456',
          progressPercentage: 75,
          remainingAmount: 2500,
          currency: 'KWD'
        },
        createdAt: new Date('2024-02-08T16:20:00Z'),
        isRead: true
      }
    ];

    const diyaNotifications = [
      {
        id: 'diya_001',
        type: 'diya_update',
        title: 'تحديث في قضية التعويض',
        shortMessage: 'تم التوصل لحل في قضية التعويض بين فرعي العائلة',
        fullMessage: 'تم بحمد الله التوصل لحل عادل في قضية التعويض بين فرعي العائلة بوساطة كبار العائلة. تم الاتفاق على مبلغ التعويض',
        actionRequired: false,
        additionalData: {
          caseId: 'diya_345',
          status: 'resolved',
          resolutionDate: '2024-02-12',
          mediator: 'حمد الشعيل'
        },
        createdAt: new Date('2024-02-12T11:00:00Z'),
        isRead: false
      }
    ];

    // Combine and sort all notifications
    const allNotifications = [...occasionNotifications, ...initiativeNotifications, ...diyaNotifications]
      .sort((a, b) => b.createdAt - a.createdAt);

    // Helper functions
    const formatTimeAgo = (date) => {
      const seconds = Math.floor((new Date() - date) / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
      if (hours > 0) return `منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
      if (minutes > 0) return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`;
      return 'الآن';
    };

    const getNotificationIcon = (type) => {
      switch(type) {
        case 'occasion_invitation': return '🎉';
        case 'occasion_rsvp_reminder': return '⏰';
        case 'occasion_update': return '📝';
        case 'initiative_new': return '🤝';
        case 'initiative_progress': return '📊';
        case 'initiative_volunteer': return '🙋';
        case 'diya_update': return '⚖️';
        case 'diya_contribution': return '💰';
        default: return '🔔';
      }
    };

    const getNotificationColor = (type) => {
      if (type.startsWith('occasion_')) return 'purple';
      if (type.startsWith('initiative_')) return 'green';
      if (type.startsWith('diya_')) return 'amber';
      return 'blue';
    };

    const handleNotificationAction = (notification) => {
      // Mark as read
      setReadNotifications(prev => new Set([...prev, notification.id]));

      // Handle specific actions
      switch(notification.type) {
        case 'occasion_invitation':
        case 'occasion_rsvp_reminder':
          setCurrentView('events');
          break;
        case 'initiative_new':
          alert(`تبرع للمبادرة: ${notification.title}`);
          break;
        default:
          setExpandedNotification(expandedNotification === notification.id ? null : notification.id);
      }
    };

    const unreadCount = allNotifications.filter(n => !n.isRead && !readNotifications.has(n.id)).length;
    const pendingRSVPs = occasionNotifications.filter(n => n.actionRequired && !n.isRead).length;
    const activeInitiatives = initiativeNotifications.filter(n => n.type === 'initiative_new').length;
    const activeCases = diyaNotifications.filter(n => n.additionalData.status !== 'resolved').length;

    return (
      <div className="mobile-home-screen">
        {/* Enhanced Header with Date and Notifications Badge */}
        <div className="mobile-header enhanced">
          <div className="header-content">
            <div className="welcome-section">
              <h2>أهلاً وسهلاً، {memberData.name}</h2>
              <p className="hijri-date">15 جمادى الآخرة 1446هـ - 17 يناير 2024</p>
            </div>
            <div className="header-actions">
              <button className="notification-bell">
                <BellIcon />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              <button className="logout-btn" onClick={() => setIsLoggedIn(false)}>
                <ArrowRightOnRectangleIcon />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Section - Priority Placement */}
        <div className="enhanced-notifications-section">
          <div className="section-header">
            <div className="section-title">
              <BellIcon className="section-icon" />
              <h3>الإشعارات</h3>
            </div>
            <button className="view-all-btn">عرض الكل</button>
          </div>

          <div className="notifications-list">
            {allNotifications.slice(0, 3).map((notification) => {
              const isExpanded = expandedNotification === notification.id;
              const isRead = notification.isRead || readNotifications.has(notification.id);
              const icon = getNotificationIcon(notification.type);
              const color = getNotificationColor(notification.type);

              return (
                <div
                  key={notification.id}
                  className={`notification-card-new ${color} ${isRead ? 'read' : 'unread'} ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => setExpandedNotification(isExpanded ? null : notification.id)}
                >
                  <div className="notification-header">
                    <div className="notification-icon-wrapper">
                      <span className="notification-emoji">{icon}</span>
                    </div>
                    <div className="notification-content">
                      <h4 className="notification-title">
                        {notification.title}
                        {!isRead && <span className="unread-dot"></span>}
                      </h4>
                      <p className="notification-message">
                        {isExpanded ? notification.fullMessage : notification.shortMessage}
                      </p>
                      <div className="notification-meta">
                        <span className="notification-time">{formatTimeAgo(notification.createdAt)}</span>
                        {notification.actionRequired && (
                          <button
                            className={`notification-action-btn ${color}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationAction(notification);
                            }}
                          >
                            {notification.actionText}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && notification.additionalData && (
                    <div className="notification-details">
                      {notification.type === 'occasion_invitation' && (
                        <>
                          <div className="detail-item">
                            <CalendarIcon className="detail-icon" />
                            <span>{notification.additionalData.eventDate}</span>
                          </div>
                          <div className="detail-item">
                            <ClockIcon className="detail-icon" />
                            <span>{notification.additionalData.eventTime}</span>
                          </div>
                          <div className="detail-item">
                            <MapPinIcon className="detail-icon" />
                            <span>{notification.additionalData.location}</span>
                          </div>
                        </>
                      )}
                      {notification.type === 'initiative_new' && (
                        <>
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{width: `${(notification.additionalData.currentAmount / notification.additionalData.goalAmount) * 100}%`}}
                            ></div>
                          </div>
                          <div className="progress-stats">
                            <span>تم جمع {notification.additionalData.currentAmount.toLocaleString()} من {notification.additionalData.goalAmount.toLocaleString()} {notification.additionalData.currency}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {allNotifications.length > 3 && (
            <button className="show-more-notifications">
              عرض {allNotifications.length - 3} إشعارات أخرى
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="summary-cards-grid">
          <div className="summary-card purple" onClick={() => setCurrentView('events')}>
            <div className="card-icon">
              <CalendarIcon />
            </div>
            <div className="card-content">
              <h4 className="card-value">{pendingRSVPs}</h4>
              <p className="card-title">المناسبات</p>
              <p className="card-subtitle">تحتاج رد</p>
            </div>
          </div>

          <div className="summary-card green">
            <div className="card-icon">
              <HeartIcon />
            </div>
            <div className="card-content">
              <h4 className="card-value">{activeInitiatives}</h4>
              <p className="card-title">المبادرات</p>
              <p className="card-subtitle">نشطة</p>
            </div>
          </div>

          <div className="summary-card amber">
            <div className="card-icon">
              <SparklesIcon />
            </div>
            <div className="card-content">
              <h4 className="card-value">{activeCases}</h4>
              <p className="card-title">الديات</p>
              <p className="card-subtitle">قيد المتابعة</p>
            </div>
          </div>
        </div>

      {/* Enhanced Member Balance Card with Minimum Balance Indicator */}
      <EnhancedBalanceCard
        memberData={memberData}
        onPaymentClick={() => setShowPaymentModal(true)}
        onStatementClick={() => setCurrentView('accountStatement')}
      />

      {/* Account Statement Section */}
      <div className="account-statement-section">
        <div className="section-header">
          <DocumentTextIcon className="section-icon" />
          <h3>كشف الحساب</h3>
          <button className="view-all-btn">عرض الكل</button>
        </div>
        <div className="statement-card">
          <div className="statement-list">
            {memberData.accountStatement.slice(0, 5).map(transaction => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-left">
                  <div className={`transaction-icon ${transaction.type}`}>
                    {transaction.type === 'payment' && <CreditCardIcon />}
                    {transaction.type === 'contribution' && <GiftIcon />}
                    {transaction.type === 'deposit' && <PlusIcon />}
                    {transaction.type === 'diya' && <BanknotesIcon />}
                  </div>
                  <div className="transaction-details">
                    <p className="transaction-description">{transaction.description}</p>
                    <p className="transaction-date">{transaction.date}</p>
                  </div>
                </div>
                <div className={`transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}`}>
                  {transaction.amount > 0 ? '+' : ''}{Math.abs(transaction.amount)} ريال
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="notifications-section">
        <div className="section-header">
          <BellIcon className="section-icon" />
          <h3>الإشعارات والفعاليات</h3>
        </div>

        {/* Occasions */}
        <div className="notification-category">
          <div className="category-header">
            <SparklesIcon className="category-icon occasions" />
            <h4>المناسبات</h4>
            <span className="count-badge">{notifications.occasions.length}</span>
          </div>
          <div className="notification-list">
            {notifications.occasions.map(occasion => (
              <div key={occasion.id} className="notification-item">
                <div className="notification-icon">
                  {occasion.type === 'wedding' ? <HeartIcon /> : <GiftIcon />}
                </div>
                <div className="notification-content">
                  <p className="notification-title">{occasion.title}</p>
                  <p className="notification-date">{occasion.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Initiatives */}
        <div className="notification-category">
          <div className="category-header">
            <GiftIcon className="category-icon initiatives" />
            <h4>المبادرات</h4>
            <span className="count-badge active">{notifications.initiatives.length}</span>
          </div>
          <div className="notification-list">
            {notifications.initiatives.map(initiative => (
              <div key={initiative.id} className="notification-item initiative">
                <div className="initiative-info">
                  <p className="notification-title">{initiative.title}</p>
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${(initiative.collected / initiative.target) * 100}%` }}
                      />
                    </div>
                    <div className="progress-text">
                      <span>جُمع: {initiative.collected.toLocaleString()} ريال</span>
                      <span>الهدف: {initiative.target.toLocaleString()} ريال</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diyas */}
        <div className="notification-category">
          <div className="category-header">
            <BanknotesIcon className="category-icon diyas" />
            <h4>الديات</h4>
            <span className="count-badge">{notifications.diyas.length}</span>
          </div>
          <div className="notification-list">
            {notifications.diyas.map(diya => (
              <div key={diya.id} className="notification-item diya">
                <div className="diya-info">
                  <p className="notification-title">{diya.title}</p>
                  <div className="diya-amounts">
                    <div className="amount-row">
                      <span className="label">المبلغ الكلي:</span>
                      <span className="value">{diya.amount.toLocaleString()} ريال</span>
                    </div>
                    <div className="amount-row">
                      <span className="label">المدفوع:</span>
                      <span className="value paid">{diya.paid.toLocaleString()} ريال</span>
                    </div>
                    <div className="amount-row">
                      <span className="label">المتبقي:</span>
                      <span className="value remaining">{diya.remaining.toLocaleString()} ريال</span>
                    </div>
                    {diya.remaining === 0 && (
                      <div className="completed-badge">
                        <CheckCircleIcon />
                        <span>مكتملة</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subscription Status Card - Moved down */}
      <div className="subscription-status-card compact">
        <div className="status-header">
          <CreditCardIcon className="status-icon" />
          <h3>حالة الاشتراك</h3>
          <span className={`status-badge ${memberData.currentSubscription.status}`}>
            {memberData.currentSubscription.status === 'active' ? 'نشط' : 'غير نشط'}
          </span>
        </div>

        <div className="subscription-details">
          <div className="detail-row">
            <span className="label">عدد الوحدات:</span>
            <span className="value">{memberData.currentSubscription.quantity} وحدة</span>
          </div>
          <div className="detail-row">
            <span className="label">المبلغ الشهري:</span>
            <span className="value">{memberData.currentSubscription.amount} ريال</span>
          </div>
          <div className="detail-row">
            <span className="label">ينتهي في:</span>
            <span className="value">{memberData.currentSubscription.expiryDate}</span>
          </div>
        </div>

        <button
          className="renew-btn"
          onClick={() => setCurrentView('subscription')}
        >
          تجديد الاشتراك
        </button>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>الإجراءات السريعة</h3>
        <div className="action-grid">
          <button className="action-card" onClick={() => setCurrentView('subscription')}>
            <CreditCardIcon />
            <span>إدارة الاشتراك</span>
          </button>
          <button className="action-card" onClick={() => setCurrentView('payment')}>
            <BanknotesIcon />
            <span>سجل المدفوعات</span>
          </button>
          <button className="action-card" onClick={() => setCurrentView('profile')}>
            <UserCircleIcon />
            <span>الملف الشخصي</span>
          </button>
          <button className="action-card">
            <DocumentTextIcon />
            <span>الفواتير</span>
          </button>
        </div>
      </div>
    </div>
    );
  };

  // Subscription Management Screen
  const SubscriptionScreen = () => (
    <div className="mobile-subscription-screen">
      {/* Header with Back */}
      <div className="screen-header">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          ←
        </button>
        <h2>إدارة الاشتراك</h2>
      </div>

      {/* Current Plan */}
      <div className="current-plan-card">
        <h3>الخطة الحالية</h3>
        <div className="plan-info">
          <div className="plan-row">
            <span>عدد الوحدات:</span>
            <strong>{memberData.currentSubscription.quantity} وحدة</strong>
          </div>
          <div className="plan-row">
            <span>المبلغ الشهري:</span>
            <strong>{memberData.currentSubscription.amount} ريال</strong>
          </div>
          <div className="plan-row">
            <span>تاريخ البداية:</span>
            <strong>{memberData.currentSubscription.startDate}</strong>
          </div>
          <div className="plan-row">
            <span>تاريخ الانتهاء:</span>
            <strong>{memberData.currentSubscription.expiryDate}</strong>
          </div>
        </div>
      </div>

      {/* Renew/Update Subscription */}
      <div className="renew-subscription-card">
        <h3>تجديد / تعديل الاشتراك</h3>

        <div className="quantity-selector">
          <label>اختر عدد الوحدات:</label>
          <div className="quantity-controls">
            <button
              className="qty-btn"
              onClick={() => setSubscriptionQuantity(Math.max(1, subscriptionQuantity - 1))}
            >
              <MinusIcon />
            </button>
            <input
              type="number"
              value={subscriptionQuantity}
              onChange={(e) => setSubscriptionQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="qty-input"
            />
            <button
              className="qty-btn"
              onClick={() => setSubscriptionQuantity(subscriptionQuantity + 1)}
            >
              <PlusIcon />
            </button>
          </div>
        </div>

        <div className="price-display">
          <div className="price-calculation">
            <span>{subscriptionQuantity} وحدة × 50 ريال</span>
          </div>
          <div className="total-price">
            <span>المجموع:</span>
            <strong>{subscriptionQuantity * 50} ريال / شهرياً</strong>
          </div>
        </div>

        <button className="confirm-subscription-btn">
          تأكيد التجديد
        </button>

        <div className="subscription-note">
          <p>ملاحظة: يمكنك الاشتراك بأي عدد من الوحدات، كل وحدة بقيمة 50 ريال شهرياً</p>
        </div>
      </div>
    </div>
  );

  // Enhanced Payment Screen with Initiatives, Diyas, and Subscriptions (with pay for another member option)
  const PaymentScreen = () => {
    const [paymentView, setPaymentView] = useState('options'); // options, history
    const [selectedPaymentType, setSelectedPaymentType] = useState(null);
    const [showPayForOtherModal, setShowPayForOtherModal] = useState(false);

    const paymentOptions = [
      {
        id: 'initiative',
        title: 'المبادرات',
        description: 'ساهم في المبادرات المجتمعية',
        icon: <SparklesIcon />,
        color: '#34C759',
        count: notifications.initiatives.length,
        canPayForOther: true
      },
      {
        id: 'diya',
        title: 'الديات',
        description: 'المساهمة في قضايا الديات',
        icon: <HeartIcon />,
        color: '#FF9500',
        count: notifications.diyas.length,
        canPayForOther: true
      },
      {
        id: 'subscription',
        title: 'الاشتراكات',
        description: 'دفع الاشتراك الشهري',
        icon: <CreditCardIcon />,
        color: '#5856D6',
        count: null,
        canPayForOther: true
      },
      {
        id: 'deposit',
        title: 'إيداع رصيد',
        description: 'إضافة رصيد إلى حسابك',
        icon: <BanknotesIcon />,
        color: '#007AFF',
        count: null,
        canPayForOther: false
      }
    ];

    const recentPayments = [
      {
        id: 1,
        date: '2024-01-15',
        type: 'initiative',
        title: 'مبادرة دعم الطلاب',
        amount: 200,
        status: 'completed',
        receipt: true,
        paidFor: 'نفسي' // Paid for self
      },
      {
        id: 2,
        date: '2024-01-10',
        type: 'diya',
        title: 'دية حادث مروري',
        amount: 500,
        status: 'completed',
        receipt: true,
        paidFor: 'خالد الشعيل' // Paid on behalf of another member
      },
      {
        id: 3,
        date: '2024-01-05',
        type: 'subscription',
        title: 'اشتراك شهري - عبدالله العنزي',
        amount: 150,
        status: 'completed',
        receipt: true,
        paidFor: 'عبدالله العنزي' // Paid for another member's subscription
      },
      {
        id: 4,
        date: '2023-12-25',
        type: 'initiative',
        title: 'مبادرة بناء مسجد',
        amount: 300,
        status: 'completed',
        receipt: true,
        paidFor: 'نفسي'
      }
    ];

    if (paymentView === 'history') {
      return (
        <div className="mobile-payment-screen">
          <div className="screen-header">
            <button className="back-btn" onClick={() => setPaymentView('options')}>
              ←
            </button>
            <h2>سجل المدفوعات</h2>
          </div>

          <div className="payment-history-list">
            {recentPayments.map(payment => (
              <div key={payment.id} className="payment-history-item">
                <div className="payment-icon" style={{ backgroundColor: `${paymentOptions.find(p => p.id === payment.type)?.color}20` }}>
                  {paymentOptions.find(p => p.id === payment.type)?.icon}
                </div>
                <div className="payment-info">
                  <h4>{payment.title}</h4>
                  <p className="payment-date">{payment.date}</p>
                  {payment.paidFor !== 'نفسي' && (
                    <p className="paid-for-badge">
                      <UserCircleIcon style={{ width: '14px', height: '14px', marginLeft: '4px' }} />
                      دفعت عن: {payment.paidFor}
                    </p>
                  )}
                </div>
                <div className="payment-amount-info">
                  <span className="amount">{payment.amount} ريال</span>
                  {payment.receipt && (
                    <span className="receipt-badge">
                      <DocumentTextIcon style={{ width: '14px', height: '14px' }} />
                      إيصال
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="mobile-payment-screen">
        <div className="screen-header">
          <h2>المدفوعات</h2>
          <button className="history-btn" onClick={() => setPaymentView('history')}>
            <ClockIcon />
            <span>السجل</span>
          </button>
        </div>

        {/* Balance Card */}
        <EnhancedBalanceCard
          memberData={memberData}
          onPaymentClick={() => {}}
          onStatementClick={() => setCurrentView('accountStatement')}
        />

        {/* Payment Options Grid */}
        <div className="payment-options-grid">
          {paymentOptions.map(option => (
            <button
              key={option.id}
              className="payment-option-card"
              onClick={() => {
                setSelectedPaymentType(option.id);
                setShowPaymentModal(true);
              }}
              style={{ borderColor: option.color }}
            >
              <div className="option-icon" style={{ backgroundColor: `${option.color}20`, color: option.color }}>
                {option.icon}
              </div>
              <div className="option-content">
                <h3>{option.title}</h3>
                <p>{option.description}</p>
                {option.canPayForOther && (
                  <p className="pay-for-other-text">
                    <UserGroupIcon style={{ width: '14px', height: '14px', marginLeft: '4px' }} />
                    يمكن الدفع عن عضو آخر
                  </p>
                )}
                {option.count !== null && (
                  <span className="option-count">{option.count} نشط</span>
                )}
              </div>
              <ArrowRightIcon className="option-arrow" />
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="payment-quick-actions">
          <h3>إجراءات سريعة</h3>
          <div className="quick-action-buttons">
            <button className="quick-action" onClick={() => setCurrentView('accountStatement')}>
              <DocumentTextIcon />
              <span>كشف الحساب</span>
            </button>
            <button className="quick-action" onClick={() => {}}>
              <BanknotesIcon />
              <span>إيداع رصيد</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Events Screen
  const EventsScreen = () => (
    <div className="mobile-events-screen">
      {/* Header */}
      <div className="screen-header">
        <h2>المناسبات</h2>
      </div>

      {/* Upcoming Events */}
      <div className="events-section">
        <h3 className="section-title">المناسبات القادمة</h3>
        <div className="events-list">
          {upcomingEvents.map(event => (
            <div key={event.id} className="event-card">
              <div className="event-header">
                <div className="event-type-indicator" data-type={event.type}>
                  {event.type === 'wedding' && <HeartIcon />}
                  {event.type === 'graduation' && <SparklesIcon />}
                  {event.type === 'meeting' && <UserGroupIcon />}
                  {event.type === 'birth' && <GiftIcon />}
                </div>
                <div className="event-info">
                  <h4 className="event-title">{event.title}</h4>
                  <p className="event-description">{event.description}</p>
                </div>
              </div>

              <div className="event-details">
                <div className="detail-item">
                  <CalendarIcon className="detail-icon" />
                  <span>{event.date}</span>
                </div>
                <div className="detail-item">
                  <ClockIcon className="detail-icon" />
                  <span>{event.time}</span>
                </div>
                <div className="detail-item">
                  <MapPinIcon className="detail-icon" />
                  <span>{event.location}</span>
                </div>
                <div className="detail-item">
                  <UserGroupIcon className="detail-icon" />
                  <span>{event.attendeeCount} مدعو</span>
                </div>
              </div>

              {/* RSVP Buttons */}
              {!event.rsvpStatus && (
                <div className="rsvp-buttons">
                  <button
                    className="rsvp-btn attending"
                    onClick={() => handleRSVP(event.id, 'attending')}
                  >
                    <CheckCircleIcon />
                    <span>سأحضر</span>
                  </button>
                  <button
                    className="rsvp-btn not-attending"
                    onClick={() => handleRSVP(event.id, 'not_attending')}
                  >
                    <XCircleIcon />
                    <span>لن أحضر</span>
                  </button>
                </div>
              )}

              {event.rsvpStatus === 'attending' && (
                <div className="rsvp-status attending">
                  <CheckCircleIcon />
                  <span>سوف تحضر هذه المناسبة</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Past Events */}
      <div className="events-section">
        <h3 className="section-title">المناسبات السابقة</h3>
        <div className="events-list">
          {pastEvents.map(event => (
            <div key={event.id} className="event-card past">
              <div className="event-header">
                <div className="event-type-indicator" data-type={event.type}>
                  {event.type === 'birth' && <GiftIcon />}
                  {event.type === 'meeting' && <UserGroupIcon />}
                </div>
                <div className="event-info">
                  <h4 className="event-title">{event.title}</h4>
                  <p className="event-description">{event.description}</p>
                  <p className="event-date">{event.date}</p>
                </div>
              </div>
              {event.userAttended && (
                <div className="attendance-badge">
                  <CheckCircleIcon />
                  <span>حضرت هذه المناسبة</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Settings Screen
  const SettingsScreen = () => (
    <div className="mobile-settings-screen">
      {/* Header */}
      <div className="screen-header">
        <h2>الإعدادات</h2>
      </div>

      <div className="settings-list">
        {/* Language Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">اللغة والمنطقة</h3>
          <div className="settings-item">
            <div className="settings-item-left">
              <LanguageIcon className="settings-icon" />
              <div>
                <p className="settings-label">لغة التطبيق</p>
                <p className="settings-value">العربية</p>
              </div>
            </div>
            <button className="settings-arrow">←</button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">الإشعارات</h3>
          <div className="settings-item">
            <div className="settings-item-left">
              <BellIcon className="settings-icon" />
              <div>
                <p className="settings-label">إشعارات المناسبات</p>
                <p className="settings-value">مفعل</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="settings-item">
            <div className="settings-item-left">
              <BanknotesIcon className="settings-icon" />
              <div>
                <p className="settings-label">تذكير المدفوعات</p>
                <p className="settings-value">مفعل</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">الخصوصية والأمان</h3>
          <div className="settings-item">
            <div className="settings-item-left">
              <ShieldCheckIcon className="settings-icon" />
              <div>
                <p className="settings-label">تغيير كلمة المرور</p>
                <p className="settings-value">آخر تحديث منذ 30 يوم</p>
              </div>
            </div>
            <button className="settings-arrow">←</button>
          </div>
        </div>

        {/* About Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">حول التطبيق</h3>
          <div className="settings-item">
            <div className="settings-item-left">
              <InformationCircleIcon className="settings-icon" />
              <div>
                <p className="settings-label">إصدار التطبيق</p>
                <p className="settings-value">1.0.0</p>
              </div>
            </div>
          </div>
          <div className="settings-item">
            <div className="settings-item-left">
              <PhoneIcon className="settings-icon" />
              <div>
                <p className="settings-label">الدعم الفني</p>
                <p className="settings-value">support@alshuail.com</p>
              </div>
            </div>
            <button className="settings-arrow">←</button>
          </div>
        </div>

        {/* Logout Button */}
        <button className="logout-button" onClick={() => setIsLoggedIn(false)}>
          <ArrowRightOnRectangleIcon />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );

  // Dashboard Screen with Personal Stats
  const DashboardScreen = () => {
    // Calculate statistics
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const yearlyContributions = memberData.accountStatement
      .filter(t => t.type === 'contribution' && t.date.includes(currentYear.toString()))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const monthlyAverage = yearlyContributions / currentMonth;
    const contributionRank = 12;
    const familyTreeGeneration = 3;
    const familyTreeBranch = "فرع الشمال";

    // Check if balance meets minimum requirement
    const isBalanceSufficient = memberData.balance >= memberData.minimumBalance;

    return (
      <div className="mobile-dashboard-screen">
        {/* Header */}
        <div className="dashboard-header">
          <h2>لوحة المعلومات</h2>
          <div className="member-badge">
            <TrophyIcon className="trophy-icon" />
            <span>عضو ذهبي</span>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="stats-grid">
          <div className={`stat-card ${isBalanceSufficient ? 'balance-sufficient' : 'balance-low'}`}>
            <div className="stat-icon">
              <WalletIcon />
            </div>
            <div className="stat-content">
              <p className="stat-label">الرصيد الحالي</p>
              <h3 className="stat-value" style={{
                color: isBalanceSufficient ? '#34C759' : '#FF3B30'
              }}>
                {memberData.balance.toLocaleString()} ريال
              </h3>
              {!isBalanceSufficient && (
                <div className="minimum-balance-warning">
                  <span className="warning-text">الحد الأدنى: {memberData.minimumBalance.toLocaleString()} ريال</span>
                  <div className="balance-progress">
                    <div
                      className="balance-progress-bar"
                      style={{
                        width: `${(memberData.balance / memberData.minimumBalance) * 100}%`,
                        backgroundColor: '#FF3B30'
                      }}
                    />
                  </div>
                </div>
              )}
              {isBalanceSufficient && (
                <div className="stat-trend positive">
                  <ArrowTrendingUpIcon />
                  <span>رصيد كافي</span>
                </div>
              )}
            </div>
          </div>

          <div className="stat-card secondary">
            <div className="stat-icon">
              <ChartBarIcon />
            </div>
            <div className="stat-content">
              <p className="stat-label">المساهمات السنوية</p>
              <h3 className="stat-value">{yearlyContributions.toLocaleString()} ريال</h3>
              <div className="stat-trend positive">
                <ArrowTrendingUpIcon />
                <span>+8%</span>
              </div>
            </div>
          </div>

          <div className="stat-card accent">
            <div className="stat-icon">
              <TrophyIcon />
            </div>
            <div className="stat-content">
              <p className="stat-label">الترتيب في العائلة</p>
              <h3 className="stat-value">#{contributionRank}</h3>
              <p className="stat-sublabel">من أصل 250 عضو</p>
            </div>
          </div>

          <div className="stat-card info">
            <div className="stat-icon">
              <UserGroupIcon />
            </div>
            <div className="stat-content">
              <p className="stat-label">موقع الشجرة</p>
              <h3 className="stat-value">الجيل {familyTreeGeneration}</h3>
              <p className="stat-sublabel">{familyTreeBranch}</p>
            </div>
          </div>
        </div>

        {/* Contribution Chart */}
        <div className="contribution-chart-card">
          <div className="chart-header">
            <h3>المساهمات الشهرية</h3>
            <select className="chart-filter">
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
          <div className="chart-container">
            <div className="mini-chart">
              {[65, 45, 75, 50, 80, 60, 70, 85, 55, 90, 75, 95].map((height, index) => (
                <div key={index} className="chart-bar-wrapper">
                  <div
                    className="chart-bar"
                    style={{ height: `${height}%` }}
                    data-month={index + 1}
                  >
                    <span className="bar-value">{(height * 10).toLocaleString()}</span>
                  </div>
                  <span className="bar-label">{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-summary">
            <div className="summary-item">
              <span className="summary-label">المتوسط الشهري:</span>
              <span className="summary-value">{Math.round(monthlyAverage).toLocaleString()} ريال</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">أعلى مساهمة:</span>
              <span className="summary-value">950 ريال</span>
            </div>
          </div>
        </div>

        {/* Family Tree Position */}
        <div className="family-tree-card">
          <div className="tree-header">
            <UserGroupIcon className="tree-icon" />
            <h3>موقعك في شجرة العائلة</h3>
          </div>
          <div className="tree-visualization">
            <div className="tree-node ancestor">الجد الأكبر</div>
            <div className="tree-connector"></div>
            <div className="tree-level">
              <div className="tree-node parent">الوالد</div>
              <div className="tree-node parent">العم</div>
            </div>
            <div className="tree-connector"></div>
            <div className="tree-level">
              <div className="tree-node current">أنت</div>
              <div className="tree-node sibling">الأخ</div>
              <div className="tree-node sibling">ابن العم</div>
            </div>
          </div>
          <div className="tree-details">
            <div className="tree-detail-item">
              <span className="detail-label">الفرع:</span>
              <span className="detail-value">{familyTreeBranch}</span>
            </div>
            <div className="tree-detail-item">
              <span className="detail-label">عدد الأفراد المرتبطين:</span>
              <span className="detail-value">23 فرد</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="recent-activity-card">
          <h3>النشاط الأخير</h3>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon payment">
                <CreditCardIcon />
              </div>
              <div className="activity-details">
                <p className="activity-title">دفعة شهرية</p>
                <p className="activity-date">قبل يومين</p>
              </div>
              <div className="activity-amount">-150 ريال</div>
            </div>
            <div className="activity-item">
              <div className="activity-icon event">
                <CalendarIcon />
              </div>
              <div className="activity-details">
                <p className="activity-title">تأكيد حضور مناسبة</p>
                <p className="activity-date">قبل 5 أيام</p>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon contribution">
                <GiftIcon />
              </div>
              <div className="activity-details">
                <p className="activity-title">مساهمة في مبادرة</p>
                <p className="activity-date">قبل أسبوع</p>
              </div>
              <div className="activity-amount">-500 ريال</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Profile Screen
  const ProfileScreen = () => (
    <div className="mobile-profile-screen">
      {/* Header with Back */}
      <div className="screen-header">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          ←
        </button>
        <h2>الملف الشخصي</h2>
      </div>

      <div className="profile-content">
        <div className="profile-header">
          <div className="profile-avatar">
            <UserCircleIcon />
          </div>
          <h3>{memberData.name}</h3>
          <p>{memberData.memberId}</p>
        </div>

        <div className="profile-info">
          <div className="info-item">
            <span className="info-label">رقم الهاتف:</span>
            <span className="info-value">{memberData.phone}</span>
          </div>
          <div className="info-item">
            <span className="info-label">تاريخ الانضمام:</span>
            <span className="info-value">{memberData.joinDate}</span>
          </div>
          <div className="info-item">
            <span className="info-label">حالة الاشتراك:</span>
            <span className={`info-value status-${memberData.currentSubscription.status}`}>
              {memberData.currentSubscription.status === 'active' ? 'نشط' : 'غير نشط'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">إجمالي المدفوعات:</span>
            <span className="info-value">{memberData.totalPaid} ريال</span>
          </div>
        </div>

        <div className="profile-actions">
          <button className="profile-btn">تعديل البيانات</button>
          <button className="profile-btn secondary">تغيير كلمة المرور</button>
        </div>
      </div>
    </div>
  );

  // Bottom Navigation - 5 Tabs as per design spec
  const BottomNav = () => (
    <div className="bottom-nav">
      <button
        className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
        onClick={() => setCurrentView('settings')}
      >
        <Cog6ToothIcon />
        <span>الإعدادات</span>
      </button>
      <button
        className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
        onClick={() => setCurrentView('dashboard')}
      >
        <ChartBarIcon />
        <span>الإحصائيات</span>
      </button>
      <button
        className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
        onClick={() => setCurrentView('home')}
      >
        <HomeIcon />
        <span>الرئيسية</span>
      </button>
      <button
        className={`nav-item ${currentView === 'payment' ? 'active' : ''}`}
        onClick={() => setCurrentView('payment')}
      >
        <BanknotesIcon />
        <span>المدفوعات</span>
      </button>
      <button
        className={`nav-item ${currentView === 'events' ? 'active' : ''}`}
        onClick={() => setCurrentView('events')}
      >
        <CalendarIcon />
        <span>المناسبات</span>
      </button>
    </div>
  );

  return (
    <div className="member-mobile-app" dir="rtl">
      {!isLoggedIn ? (
        <LoginScreen />
      ) : (
        <>
          <div className="mobile-content">
            {currentView === 'home' && <HomeScreen />}
            {currentView === 'dashboard' && <DashboardScreen />}
            {currentView === 'events' && <EventsScreen />}
            {currentView === 'subscription' && <SubscriptionScreen />}
            {currentView === 'payment' && <PaymentScreen />}
            {currentView === 'profile' && <ProfileScreen />}
            {currentView === 'settings' && <SettingsScreen />}
            {currentView === 'accountStatement' && (
              <AccountStatementScreen
                memberData={memberData}
                onBack={() => setCurrentView('home')}
              />
            )}
          </div>
          <BottomNav />

          {/* Payment Modal */}
          {showPaymentModal && (
            <PaymentModal
              memberData={memberData}
              onClose={() => setShowPaymentModal(false)}
              onSuccess={(payment) => {
                console.log('Payment successful:', payment);
                setShowPaymentModal(false);
                // In a real app, you would update the balance here
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default MemberMobileApp;