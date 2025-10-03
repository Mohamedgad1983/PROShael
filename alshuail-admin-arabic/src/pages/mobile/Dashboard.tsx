import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCardIcon, ClockIcon, DocumentTextIcon, UserIcon, BellIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import BottomNav from '../../components/mobile/BottomNav';
import '../../styles/mobile/Dashboard.css';

// Import Hijri date utility
const getHijriDate = () => {
  try {
    const today = new Date();
    const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatter.format(today);
  } catch (error) {
    return '';
  }
};

interface MemberData {
  id: string;
  full_name: string;
  membership_number: string;
  phone: string;
  balance: number;
  tribal_section?: string;
}

interface PaymentData {
  id: string;
  amount: number;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'news' | 'occasions' | 'diyas' | 'initiatives' | 'condolences';
  date: string;
  is_read: boolean;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberData | null>(null);
  const [balance, setBalance] = useState({
    current: 0,
    target: 3000,
    percentage: 0,
    is_compliant: false,
  });
  const [recentPayments, setRecentPayments] = useState<PaymentData[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayments, setShowPayments] = useState(false);

  // Fixed greeting to match HTML demo
  const getGreeting = () => {
    return 'السلام عليكم ورحمة الله';
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';

      // Fetch member profile
      const profileRes = await fetch(`${apiUrl}/api/member/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setMember(profileData);
      }

      // Fetch balance
      const balanceRes = await fetch(`${apiUrl}/api/member/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData);
      }

      // Fetch recent payments
      const paymentsRes = await fetch(`${apiUrl}/api/member/payments?limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setRecentPayments(paymentsData);
      }

      // Fetch notifications
      const notifRes = await fetch(`${apiUrl}/api/member/notifications?limit=3`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      id: 'payment',
      title: 'دفع اشتراك',
      emoji: '💵',
      route: '/mobile/payment'
    },
    {
      id: 'history',
      title: 'سجل المدفوعات',
      emoji: '📊',
      route: '/mobile/payment-history'
    },
    {
      id: 'profile',
      title: 'ملفي الشخصي',
      emoji: '👤',
      route: '/mobile/profile'
    },
    {
      id: 'contact',
      title: 'تواصل معنا',
      emoji: '📱',
      route: '/mobile/contact'
    },
  ];

  const notificationTypes: { [key: string]: string } = {
    'news': 'أخبار',
    'occasions': 'مناسبات',
    'diyas': 'ديات',
    'initiatives': 'مبادرات',
    'condolences': 'تعازي',
  };

  if (loading) {
    return (
      <div className="mobile-loading">
        <div className="loading-spinner"></div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="mobile-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="greeting-text">{getGreeting()}</div>
        <div className="member-name">{member?.full_name || 'أحمد محمد الشعيل'}</div>

        {/* Glassmorphism Hijri Date Card */}
        <div className="hijri-date-card">
          <div className="hijri-date-main">
            <span className="hijri-icon">🌙</span>
            <span>{getHijriDate()}</span>
          </div>
          <div className="gregorian-date-sub">
            {new Date().toLocaleDateString('ar-SA')}
          </div>
        </div>
      </div>

      {/* Balance Card - Matches HTML Demo */}
      <motion.div
        className="balance-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="balance-header">
          <h3>💰 الرصيد الحالي</h3>
          <span className={`status-badge ${balance.is_compliant ? 'compliant' : 'insufficient'}`}>
            {balance.is_compliant ? '🟢 ملتزم' : '⚠ غير ملتزم'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className={`progress-fill ${!balance.is_compliant ? 'insufficient' : ''}`}
              style={{ width: `${Math.min(balance.percentage, 100)}%` }}
            />
          </div>
          <div className="progress-text">{balance.percentage}%</div>
        </div>

        {/* Balance Amounts - Split Layout */}
        <div className="balance-amounts">
          <div className="balance-item">
            <span className="amount-label">الرصيد الحالي</span>
            <span className="amount-value">{balance.current.toLocaleString('ar-SA')} ريال</span>
          </div>
          <div className="balance-item">
            <span className="amount-label">المطلوب</span>
            <span className="amount-value target-value">{balance.target.toLocaleString('ar-SA')} ريال</span>
          </div>
        </div>

        {!balance.is_compliant && (
          <div className="remaining-alert">
            المبلغ المتبقي: {(balance.target - balance.current).toLocaleString('ar-SA')} ريال
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h4>الإجراءات السريعة</h4>
        <div className="actions-grid">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.id}
              className={`action-btn ${index === 0 ? 'primary' : ''}`}
              onClick={() => navigate(action.route)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <span className="button-icon">{action.emoji}</span>
              <span className="button-text">{action.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Notifications Preview */}
      {notifications.length > 0 && (
        <motion.div
          className="notifications-preview"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="section-header">
            <h4>آخر الإشعارات</h4>
            <button
              className="see-all-btn"
              onClick={() => navigate('/mobile/notifications')}
            >
              عرض الكل
            </button>
          </div>
          <div className="notifications-list">
            {notifications.slice(0, 3).map(notification => (
              <div
                key={notification.id}
                className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
              >
                <div className="notification-type">
                  {notificationTypes[notification.type]}
                </div>
                <div className="notification-content">
                  <h5>{notification.title}</h5>
                  <p>{notification.message}</p>
                  <span className="notification-date">
                    {new Date(notification.date).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Payments */}
      <motion.div
        className="recent-payments"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="section-header">
          <h4>آخر المدفوعات</h4>
          <button
            className="toggle-btn"
            onClick={() => setShowPayments(!showPayments)}
          >
            <ArrowUpIcon className={`arrow-icon ${showPayments ? 'rotated' : ''}`} />
          </button>
        </div>
        {showPayments && (
          <div className="payments-list">
            {recentPayments.length > 0 ? (
              recentPayments.map(payment => (
                <div key={payment.id} className="payment-item">
                  <div className="payment-amount">
                    {payment.amount.toLocaleString()} ريال
                  </div>
                  <div className="payment-details">
                    <span className="payment-date">
                      {new Date(payment.date).toLocaleDateString('ar-SA')}
                    </span>
                    <span className={`payment-status status-${payment.status}`}>
                      {payment.status === 'approved' ? 'معتمد' :
                       payment.status === 'pending' ? 'قيد المراجعة' : 'مرفوض'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-payments">
                لا توجد مدفوعات حتى الآن
              </div>
            )}
            <button
              className="view-all-btn"
              onClick={() => navigate('/mobile/payment-history')}
            >
              عرض جميع المدفوعات
            </button>
          </div>
        )}
      </motion.div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Dashboard;