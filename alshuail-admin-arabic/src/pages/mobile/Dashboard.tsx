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

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
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
      title: 'دفع جديد',
      icon: CreditCardIcon,
      color: '#667eea',
      route: '/mobile/payment'
    },
    {
      id: 'history',
      title: 'سجل المدفوعات',
      icon: ClockIcon,
      color: '#764ba2',
      route: '/mobile/payment-history'
    },
    {
      id: 'statement',
      title: 'كشف الحساب',
      icon: DocumentTextIcon,
      color: '#f093fb',
      route: '/mobile/statement'
    },
    {
      id: 'profile',
      title: 'الملف الشخصي',
      icon: UserIcon,
      color: '#4facfe',
      route: '/mobile/profile'
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
        <div className="header-top">
          <div className="greeting-section">
            <h2>{getGreeting()}</h2>
            <h3>{member?.full_name || 'عضو الشعيل'}</h3>
          </div>
          <button
            className="notification-btn"
            onClick={() => navigate('/mobile/notifications')}
          >
            <BellIcon className="icon" />
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="notification-badge">
                {notifications.filter(n => !n.is_read).length}
              </span>
            )}
          </button>
        </div>
        <div className="hijri-date">{getHijriDate()}</div>
      </div>

      {/* Balance Card */}
      <motion.div
        className={`balance-card ${balance.is_compliant ? 'compliant' : 'non-compliant'}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="balance-header">
          <span>الرصيد الحالي</span>
          <span className="balance-status">
            {balance.is_compliant ? '✓ ملتزم' : '⚠ غير ملتزم'}
          </span>
        </div>
        <div className="balance-amount">
          <span className="currency">ريال</span>
          <span className="amount">{balance.current.toLocaleString()}</span>
        </div>
        <div className="balance-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(balance.percentage, 100)}%`,
                backgroundColor: balance.is_compliant ? '#34C759' : '#FF3B30'
              }}
            />
          </div>
          <div className="progress-labels">
            <span>0</span>
            <span>الحد المطلوب: {balance.target.toLocaleString()} ريال</span>
            <span>{balance.percentage}%</span>
          </div>
        </div>
        {!balance.is_compliant && (
          <div className="balance-warning">
            المبلغ المتبقي للوصول للحد المطلوب: {(balance.target - balance.current).toLocaleString()} ريال
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
              className="action-btn"
              onClick={() => navigate(action.route)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <action.icon className="action-icon" />
              <span>{action.title}</span>
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