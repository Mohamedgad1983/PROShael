import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../../styles/mobile/Dashboard.css';
import { getDashboardData } from '../../services/mobileApi';
import { getCurrentHijri, formatBothCalendars } from '../../utils/hijriDate';

const MobileDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentsExpanded, setPaymentsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentHijriDate, setCurrentHijriDate] = useState<any>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    setupHijriDate();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Get user data from localStorage first
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }

      // Fetch dashboard data from API
      const dashboardData = await getDashboardData();

      if (dashboardData.profile) {
        setUser(dashboardData.profile.data || dashboardData.profile);
      }

      if (dashboardData.balance) {
        setBalance(dashboardData.balance.data || dashboardData.balance);
      }

      if (dashboardData.recentPayments) {
        const paymentsData = dashboardData.recentPayments.data || dashboardData.recentPayments;
        // Format payments for display
        const formattedPayments = Array.isArray(paymentsData) ? paymentsData.map((payment: any) => {
          const dateInfo: any = formatBothCalendars(payment.date || payment.created_at);
          return {
            id: payment.id,
            hijriDate: dateInfo?.hijri?.formatted || '',
            gregorianDate: `(${dateInfo?.gregorian?.formatted || ''})`,
            amount: `${payment.amount?.toLocaleString('ar-SA') || 0} ريال`,
            status: payment.status || 'pending'
          };
        }) : [];
        setPayments(formattedPayments.slice(0, 5)); // Show only last 5 payments
      }

      if (dashboardData.notifications) {
        const notificationsData = dashboardData.notifications.data || dashboardData.notifications;
        // Format notifications for display
        const formattedNotifications = Array.isArray(notificationsData) ? notificationsData.map((notif: any) => {
          const typeIcons: any = {
            news: '📰',
            occasions: '🎉',
            diya: '⚖️',
            initiatives: '💡',
            condolences: '🕊️'
          };
          const typeLabels: any = {
            news: 'أخبار العائلة',
            occasions: 'مناسبة',
            diya: 'دية',
            initiatives: 'مبادرة',
            condolences: 'تعزية'
          };
          const dateInfo: any = formatBothCalendars(notif.created_at);
          return {
            id: notif.id,
            type: notif.type || 'news',
            icon: typeIcons[notif.type] || '📰',
            typeLabel: typeLabels[notif.type] || 'إشعار',
            title: notif.title,
            date: dateInfo?.hijri?.formatted || '',
            unread: !notif.is_read
          };
        }) : [];
        setNotifications(formattedNotifications);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use sample data as fallback
      setSampleData();
    } finally {
      setLoading(false);
    }
  };

  const setupHijriDate = () => {
    const dateInfo: any = formatBothCalendars(new Date());
    setCurrentHijriDate(dateInfo);
  };

  const setSampleData = () => {
    // Fallback sample data
    setNotifications([
      {
        id: 1,
        type: 'news',
        icon: '📰',
        typeLabel: 'أخبار العائلة',
        title: 'إعلان هام: اجتماع مجلس الإدارة',
        date: '25 ربيع الأول 1446هـ',
        unread: true
      },
      {
        id: 2,
        type: 'occasions',
        icon: '🎉',
        typeLabel: 'مناسبة',
        title: 'زواج محمد بن عبدالله الشعيل',
        date: '1 ربيع الآخر 1446هـ',
        unread: true
      }
    ]);

    setPayments([
      { id: 1, hijriDate: '15 صفر 1446هـ', gregorianDate: '(15 سبتمبر 2024م)', amount: '1,000 ريال', status: 'approved' },
      { id: 2, hijriDate: '10 محرم 1446هـ', gregorianDate: '(10 أغسطس 2024م)', amount: '500 ريال', status: 'approved' }
    ]);
  };

  const handleActionClick = (action: string) => {
    switch(action) {
      case 'payment':
        navigate('/mobile/payment');
        break;
      case 'history':
        navigate('/mobile/payment-history');
        break;
      case 'profile':
        navigate('/mobile/profile');
        break;
      case 'contact':
        // Navigate to dashboard temporarily until Contact page is created
        navigate('/mobile/dashboard');
        break;
      default:
        break;
    }
  };

  const filterNotifications = (filter: string) => {
    setActiveFilter(filter);
  };

  const getFilteredNotifications = () => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter(n => n.type === activeFilter);
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  if (loading) {
    return (
      <div className="mobile-loading">
        <div className="loading-spinner" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  // Calculate balance percentage
  const currentBalance = balance?.current_balance || user?.balance || 0;
  const requiredBalance = balance?.required_amount || 3000;
  const percentage = Math.round((currentBalance / requiredBalance) * 100);
  const isCompliant = currentBalance >= requiredBalance;

  return (
    <div className="mobile-container">
      {/* Header */}
      <motion.header
        className="header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="greeting">السلام عليكم ورحمة الله</div>
        <div className="member-name">{user?.name || 'أحمد محمد الشعيل'}</div>

        {/* Hijri Date Card */}
        <div className="hijri-date-card">
          <div className="hijri-date-main">
            <span className="hijri-icon">🌙</span>
            <span>{currentHijriDate.hijri?.formatted || 'جاري التحميل...'}</span>
          </div>
          <div className="gregorian-date-sub">
            {currentHijriDate.gregorian?.formatted || ''}
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="main-content">

        {/* Balance Card */}
        <motion.div
          className="balance-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="balance-header">
            <h3>💰 الرصيد الحالي</h3>
            <span className={`status-badge ${isCompliant ? 'compliant' : 'insufficient'}`}>
              {isCompliant ? '🟢 ملتزم' : '⚠ غير ملتزم'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className={`progress-fill ${!isCompliant ? 'insufficient' : ''}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <div className="progress-text">{percentage}%</div>
          </div>

          {/* Balance Amounts */}
          <div className="balance-amounts">
            <div className="balance-item">
              <span className="amount-label">الرصيد الحالي</span>
              <span className="amount-value">{currentBalance.toLocaleString('ar-SA')} ريال</span>
            </div>
            <div className="balance-item">
              <span className="amount-label">المطلوب</span>
              <span className="amount-value target-value">{requiredBalance.toLocaleString('ar-SA')} ريال</span>
            </div>
          </div>

          {!isCompliant && (
            <div className="remaining-alert">
              المبلغ المتبقي: {(requiredBalance - currentBalance).toLocaleString('ar-SA')} ريال
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="quick-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button className="action-button primary" onClick={() => handleActionClick('payment')}>
            <span className="button-icon">💵</span>
            <span className="button-text">دفع اشتراك</span>
          </button>

          <button className="action-button" onClick={() => handleActionClick('history')}>
            <span className="button-icon">📊</span>
            <span className="button-text">سجل المدفوعات</span>
          </button>

          <button className="action-button" onClick={() => handleActionClick('profile')}>
            <span className="button-icon">👤</span>
            <span className="button-text">ملفي الشخصي</span>
          </button>

          <button className="action-button" onClick={() => handleActionClick('contact')}>
            <span className="button-icon">📱</span>
            <span className="button-text">تواصل معنا</span>
          </button>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          className="notifications-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="notifications-header">
            <h3>🔔 الإشعارات</h3>
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </div>

          {/* Notification Filters */}
          <div className="notification-types">
            <button
              className={`notification-filter ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => filterNotifications('all')}
            >
              الكل
            </button>
            <button
              className={`notification-filter ${activeFilter === 'news' ? 'active' : ''}`}
              onClick={() => filterNotifications('news')}
            >
              📰 أخبار العائلة
            </button>
            <button
              className={`notification-filter ${activeFilter === 'occasions' ? 'active' : ''}`}
              onClick={() => filterNotifications('occasions')}
            >
              🎉 المناسبات
            </button>
            <button
              className={`notification-filter ${activeFilter === 'diya' ? 'active' : ''}`}
              onClick={() => filterNotifications('diya')}
            >
              ⚖️ الديات
            </button>
            <button
              className={`notification-filter ${activeFilter === 'initiatives' ? 'active' : ''}`}
              onClick={() => filterNotifications('initiatives')}
            >
              💡 المبادرات
            </button>
            <button
              className={`notification-filter ${activeFilter === 'condolences' ? 'active' : ''}`}
              onClick={() => filterNotifications('condolences')}
            >
              🕊️ التعازي
            </button>
          </div>

          {/* Notification Items */}
          <div className="notifications-list">
            {getFilteredNotifications().map(notification => (
              <div
                key={notification.id}
                className={`notification-item ${notification.unread ? 'unread' : ''}`}
              >
                <div className="notification-icon">{notification.icon}</div>
                <div className="notification-content">
                  <div className="notification-type">{notification.typeLabel}</div>
                  <div className="notification-title">{notification.title}</div>
                  <div className="notification-date">{notification.date}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Payments (Collapsible) */}
        <motion.div
          className="recent-payments"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div
            className="payments-header"
            onClick={() => setPaymentsExpanded(!paymentsExpanded)}
            style={{ cursor: 'pointer' }}
          >
            <h3>📋 آخر المدفوعات</h3>
            <span className={`collapse-icon ${paymentsExpanded ? 'expanded' : ''}`}>
              ▼
            </span>
          </div>

          <div className={`payments-list ${paymentsExpanded ? 'expanded' : ''}`}>
            {payments.map(payment => (
              <div key={payment.id} className="payment-item">
                <div className="payment-date">
                  <span className="hijri-date">{payment.hijriDate}</span>
                  <span className="gregorian-date">{payment.gregorianDate}</span>
                </div>
                <div className="payment-amount">{payment.amount}</div>
                <div className={`payment-status ${payment.status}`}>
                  {payment.status === 'approved' ? '✓ معتمد' : '⏳ قيد المراجعة'}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <div className="footer">
          <div className="hijri-year-info">
            العام الهجري: 1446هـ
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <a href="#" className="nav-item active" onClick={(e) => { e.preventDefault(); navigate('/mobile/dashboard'); }}>
          <span className="nav-icon">🏠</span>
          <span className="nav-text">الرئيسية</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/mobile/payment'); }}>
          <span className="nav-icon">💰</span>
          <span className="nav-text">الدفع</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/mobile/notifications'); }}>
          <span className="nav-icon">🔔</span>
          <span className="nav-text">الإشعارات</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/mobile/profile'); }}>
          <span className="nav-icon">⚙️</span>
          <span className="nav-text">الإعدادات</span>
        </a>
      </nav>
    </div>
  );
};

export default MobileDashboard;