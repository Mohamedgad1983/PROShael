import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../../styles/mobile/Dashboard.css';
import { getDashboardData } from '../../services/mobileApi';

const MobileDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false); // Start false to show sample data immediately
  const [profileCompletion, setProfileCompletion] = useState(65);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState({
    news: [] as any[],
    initiatives: [] as any[],
    diyas: [] as any[],
    occasions: [] as any[],
    statements: [] as any[]
  });

  useEffect(() => {
    // Always load sample data first for immediate display
    setSampleData();
    // Then fetch real data to override
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showNotifications && !target.closest('.notification-dropdown') && !target.closest('.header-button')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showNotifications]);

  const fetchDashboardData = async () => {
    try {
      // Don't show loading spinner, sample data is already showing
      // setLoading(true); // Removed to keep sample data visible

      // Get user data from localStorage first
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }

      // Fetch dashboard data from API
      const dashboardData = await getDashboardData();

      if (dashboardData.profile) {
        const profileData = dashboardData.profile.data || dashboardData.profile;
        setUser(profileData);
        calculateProfileCompletion(profileData);
      }

      if (dashboardData.balance) {
        setBalance(dashboardData.balance.data || dashboardData.balance);
      }

      if (dashboardData.notifications && Array.isArray(dashboardData.notifications.data || dashboardData.notifications)) {
        const notifData = dashboardData.notifications.data || dashboardData.notifications;
        if (notifData.length > 0) {
          organizeNotifications(notifData);
        }
        // If empty array, keep existing sample data
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Keep sample data visible on error
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompletion = (profile: any) => {
    const fields = [
      profile?.full_name,
      profile?.phone,
      profile?.email,
      profile?.photo,
      profile?.birthdate,
      profile?.address
    ];
    const completed = fields.filter(field => field && field !== '').length;
    const percentage = Math.round((completed / fields.length) * 100);
    setProfileCompletion(percentage);
  };

  const organizeNotifications = (notifs: any[]) => {
    const organized = {
      news: [] as any[],
      initiatives: [] as any[],
      diyas: [] as any[],
      occasions: [] as any[],
      statements: [] as any[]
    };

    notifs.forEach((notif: any) => {
      const type = notif.type || 'news';
      if (type === 'news') organized.news.push(notif);
      else if (type === 'initiatives') organized.initiatives.push(notif);
      else if (type === 'diya') organized.diyas.push(notif);
      else if (type === 'occasions') organized.occasions.push(notif);
      else if (type === 'statement') organized.statements.push(notif);
    });

    setNotifications(organized);
  };

  // Get all notifications for dropdown - use useMemo for reactivity
  const allNotifications = React.useMemo(() => {
    const allNotifs: any[] = [];

    // Add all notifications from all categories
    notifications.news.forEach(n => allNotifs.push(n));
    notifications.initiatives.forEach(n => allNotifs.push(n));
    notifications.diyas.forEach(n => allNotifs.push(n));
    notifications.occasions.forEach(n => allNotifs.push(n));
    notifications.statements.forEach(n => allNotifs.push(n));

    console.log('📋 All notifications for dropdown:', allNotifs.length);

    // Return latest 5 notifications
    return allNotifs.slice(0, 5);
  }, [notifications]);

  const setSampleData = () => {
    // Sample notifications data
    setNotifications({
      news: [
        {
          id: 1,
          title: 'إعلان هام - اجتماع الجمعية العمومية',
          body: 'يسرنا دعوتكم لحضور الاجتماع السنوي للجمعية العمومية يوم الجمعة القادم في مقر العائلة الساعة 5 مساءً.',
          time: 'منذ ساعة',
          category: 'إعلانات رسمية',
          priority: 'high',
          icon: '📢'
        },
        {
          id: 2,
          title: 'تهنئة - مولود جديد في العائلة',
          body: 'نبارك لأخينا خالد الشعيل قدوم المولود الجديد، نسأل الله أن يجعله من الصالحين.',
          time: 'منذ 3 ساعات',
          category: 'أخبار العائلة',
          priority: 'normal',
          icon: '🎊'
        }
      ],
      initiatives: [
        {
          id: 3,
          title: 'مبادرة دعم الطلاب المتفوقين',
          body: 'مبادرة لدعم أبناء العائلة المتفوقين دراسياً. المبلغ المستهدف: 50,000 ریال. تم جمع 35,000 ریال حتى الآن.',
          time: 'منذ يومين',
          category: 'التعليم',
          progress: 70,
          priority: 'medium',
          icon: '💡'
        },
        {
          id: 4,
          title: 'مبادرة الدعم الصحي',
          body: 'مبادرة لدعم أفراد العائلة المحتاجين للرعاية الصحية. يمكنكم المساهمة من خلال التطبيق.',
          time: 'منذ 3 أيام',
          category: 'صحة',
          progress: 45,
          priority: 'normal',
          icon: '🏥'
        }
      ],
      diyas: [
        {
          id: 5,
          title: 'دية الأخ نادر الشعيل',
          body: 'تم فتح باب المساهمة في دية الأخ نادر. المبلغ المطلوب: 400,000 ریال. تم جمع 350,000 ریال.',
          time: 'منذ 5 أيام',
          category: 'حالة عاجلة',
          progress: 87.5,
          priority: 'high',
          icon: '⚖️'
        }
      ],
      occasions: [
        {
          id: 6,
          title: 'حفل زفاف محمد الشعيل',
          body: 'يسرنا دعوتكم لحضور حفل زفاف ابننا محمد يوم الخميس القادم. الموقع: قاعة النخيل - 7 مساءً.',
          time: 'بعد 5 أيام',
          category: 'زفاف',
          priority: 'normal',
          icon: '🎂'
        },
        {
          id: 7,
          title: 'صلاة العيد - عيد الفطر',
          body: 'صلاة العيد ستقام في مسجد العائلة الساعة 6 صباحاً. يليها إفطار جماعي للعائلة.',
          time: 'بعد أسبوعين',
          category: 'مناسبة دينية',
          priority: 'normal',
          icon: '🕌'
        }
      ],
      statements: [
        {
          id: 8,
          title: 'كشف حساب شهر سبتمبر 2025',
          body: 'تم إصدار كشف الحساب الشهري. إجمالي المدفوعات: 2,500 ریال. الرصيد المتبقي: 500 ریال.',
          time: 'منذ أسبوع',
          category: 'مالية',
          action: '📥 تحميل PDF',
          priority: 'normal',
          icon: '📄'
        },
        {
          id: 9,
          title: 'تأكيد استلام الدفعة',
          body: 'تم استلام دفعتك بمبلغ 1,500 ریال لاشتراك 2025. شكراً لالتزامك.',
          time: 'منذ أسبوعين',
          category: 'مدفوعات',
          priority: 'normal',
          icon: '💰'
        }
      ]
    });
  };

  if (loading) {
    return (
      <div className="mobile-loading">
        <div className="loading-spinner" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  // Calculate balance data
  const currentBalance = balance?.current || balance?.current_balance || user?.balance || 5000;
  const requiredBalance = balance?.target || balance?.required_amount || 3000;
  const isCompliant = currentBalance >= requiredBalance;
  const paid2025 = balance?.paid_2025 || 2500;
  const paidPrevious = balance?.paid_previous || 2500;
  const extraBalance = currentBalance - requiredBalance;

  // Profile completion fields
  const profileFields = [
    { name: 'البيانات الأساسية', completed: !!user?.full_name },
    { name: 'رقم الجوال', completed: !!user?.phone },
    { name: 'البريد الإلكتروني', completed: !!user?.email },
    { name: 'الصورة الشخصية', completed: !!user?.photo },
    { name: 'تاريخ الميلاد', completed: !!user?.birthdate },
    { name: 'العنوان', completed: !!user?.address }
  ];

  const unreadCount = 8; // Calculate from notifications

  return (
    <div className="mobile-container">
      {/* Fixed Header */}
      <header className="mobile-header">
        <div className="user-section">
          <div className="avatar">
            {user?.full_name ? user.full_name.charAt(0) : 'أ'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.full_name || 'أحمد محمد الشعيل'}</div>
            <div className="membership-number">#{user?.membership_number || 'SH-10001'}</div>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="header-button"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            🔔
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          <button className="header-button" onClick={() => navigate('/mobile/profile')}>⚙️</button>
        </div>

        {/* Notification Dropdown */}
        {showNotifications && (
          <motion.div
            className="notification-dropdown"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="notification-dropdown-header">
              <h3>الإشعارات</h3>
              <button onClick={() => setShowNotifications(false)}>✕</button>
            </div>

            <div className="notification-dropdown-list">
              {allNotifications.length > 0 ? (
                allNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`notification-dropdown-item ${notif.priority === 'high' ? 'priority-high' : ''}`}
                  >
                    <div className="notification-dropdown-icon">{notif.icon}</div>
                    <div className="notification-dropdown-content">
                      <div className="notification-dropdown-title">{notif.title}</div>
                      <div className="notification-dropdown-body">{notif.body}</div>
                      <div className="notification-dropdown-meta">
                        <span>{notif.time}</span>
                        <span>•</span>
                        <span>{notif.category}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="notification-dropdown-empty">
                  <span>📭</span>
                  <p>لا توجد إشعارات جديدة</p>
                </div>
              )}
            </div>

            <div className="notification-dropdown-footer">
              <button onClick={() => {
                setShowNotifications(false);
                navigate('/mobile/notifications');
              }}>
                عرض جميع الإشعارات
              </button>
            </div>
          </motion.div>
        )}
      </header>

      {/* Main Content */}
      <div className="mobile-content">

        {/* 1. PROFILE COMPLETION KPI (FIRST) */}
        <motion.div
          className="profile-completion-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="completion-header">
            <div className="completion-title">
              👤 إكمال الملف الشخصي
            </div>
            <div className="completion-percentage">{profileCompletion}%</div>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${profileCompletion}%` }} />
          </div>

          <div className="completion-items">
            {profileFields.map((field, index) => (
              <div key={index} className={`completion-item ${field.completed ? 'completed' : 'incomplete'}`}>
                {field.completed ? '✅' : '❌'} {field.name}
              </div>
            ))}
          </div>

          <button className="complete-profile-btn" onClick={() => navigate('/mobile/profile')}>
            📝 أكمل ملفك الشخصي
          </button>
        </motion.div>

        {/* 2. BALANCE CARD (SECOND) */}
        <motion.div
          className="balance-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-header">
            <span className="card-icon">💰</span>
            <span className="card-title">الرصيد الحالي</span>
          </div>

          <div className="balance-display">
            <div className="balance-amount">{currentBalance.toLocaleString('ar-SA')} ريال</div>
            <div className="balance-label">من أصل {requiredBalance.toLocaleString('ar-SA')} ریال مطلوب</div>
            <div className={`status-indicator ${isCompliant ? 'good' : 'insufficient'}`}>
              {isCompliant ? '🟢 ملتزم بالاشتراك' : '🔴 رصيد غير كافٍ'}
            </div>
          </div>

          <div className="balance-breakdown">
            <div className="breakdown-row">
              <span className="breakdown-label">المدفوع 2025</span>
              <span className="breakdown-value">{paid2025.toLocaleString('ar-SA')} ریال</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">المدفوع السابق</span>
              <span className="breakdown-value">{paidPrevious.toLocaleString('ar-SA')} ریال</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">
                {isCompliant ? 'الرصيد الإضافي' : 'المبلغ المتبقي'}
              </span>
              <span className={`breakdown-value ${isCompliant ? 'positive' : 'negative'}`}>
                {isCompliant ? '+' : '-'}{Math.abs(extraBalance).toLocaleString('ar-SA')} ریال
              </span>
            </div>
          </div>

          <div className="action-buttons">
            <button className="primary-button" onClick={() => navigate('/mobile/payment')}>
              💳 دفع اشتراك
            </button>
            <button className="secondary-button" onClick={() => navigate('/mobile/payment-history')}>
              📊 سجل المدفوعات
            </button>
          </div>
        </motion.div>

        {/* 3. NEWS SECTION (الأخبار) */}
        {notifications.news.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="section-header">
              <div className="section-title">📰 الأخبار</div>
              <div className="view-all" onClick={() => navigate('/mobile/notifications')}>عرض الكل ←</div>
            </div>

            {notifications.news.map((notif) => (
              <div key={notif.id} className={`notification-card ${notif.priority === 'high' ? 'priority-high' : ''}`}>
                <div className="notification-icon">{notif.icon}</div>
                <div className="notification-content">
                  <div className="notification-title">{notif.title}</div>
                  <div className="notification-body">{notif.body}</div>
                  <div className="notification-meta">
                    <span>{notif.time}</span>
                    <span>•</span>
                    <span>{notif.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </motion.section>
        )}

        {/* 4. INITIATIVES SECTION (المبادرات) */}
        {notifications.initiatives.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="section-header">
              <div className="section-title">🤝 المبادرات</div>
              <div className="view-all" onClick={() => navigate('/mobile/notifications')}>عرض الكل ←</div>
            </div>

            {notifications.initiatives.map((notif) => (
              <div key={notif.id} className={`notification-card ${notif.priority === 'medium' ? 'priority-medium' : ''}`}>
                <div className="notification-icon">{notif.icon}</div>
                <div className="notification-content">
                  <div className="notification-title">{notif.title}</div>
                  <div className="notification-body">{notif.body}</div>
                  <div className="notification-meta">
                    <span>{notif.time}</span>
                    <span>•</span>
                    <span>{notif.category}</span>
                    <span>•</span>
                    <span>{notif.progress}% مكتمل</span>
                  </div>
                </div>
              </div>
            ))}
          </motion.section>
        )}

        {/* 5. DIYA SECTION (الديات) */}
        {notifications.diyas.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="section-header">
              <div className="section-title">⚖️ الديات</div>
              <div className="view-all" onClick={() => navigate('/mobile/notifications')}>عرض الكل ←</div>
            </div>

            {notifications.diyas.map((notif) => (
              <div key={notif.id} className="notification-card priority-high">
                <div className="notification-icon">{notif.icon}</div>
                <div className="notification-content">
                  <div className="notification-title">{notif.title}</div>
                  <div className="notification-body">{notif.body}</div>
                  <div className="notification-meta">
                    <span>{notif.time}</span>
                    <span>•</span>
                    <span>{notif.category}</span>
                    <span>•</span>
                    <span>{notif.progress}% مكتمل</span>
                  </div>
                </div>
              </div>
            ))}
          </motion.section>
        )}

        {/* 6. OCCASIONS SECTION (المناسبات) */}
        {notifications.occasions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="section-header">
              <div className="section-title">🎉 المناسبات</div>
              <div className="view-all" onClick={() => navigate('/mobile/notifications')}>عرض الكل ←</div>
            </div>

            {notifications.occasions.map((notif) => (
              <div key={notif.id} className="notification-card">
                <div className="notification-icon">{notif.icon}</div>
                <div className="notification-content">
                  <div className="notification-title">{notif.title}</div>
                  <div className="notification-body">{notif.body}</div>
                  <div className="notification-meta">
                    <span>{notif.time}</span>
                    <span>•</span>
                    <span>{notif.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </motion.section>
        )}

        {/* 7. MEMBER STATEMENT SECTION (كشف الحساب) */}
        {notifications.statements.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="section-header">
              <div className="section-title">📊 كشف الحساب</div>
              <div className="view-all" onClick={() => navigate('/mobile/notifications')}>عرض الكل ←</div>
            </div>

            {notifications.statements.map((notif) => (
              <div key={notif.id} className="notification-card">
                <div className="notification-icon">{notif.icon}</div>
                <div className="notification-content">
                  <div className="notification-title">{notif.title}</div>
                  <div className="notification-body">{notif.body}</div>
                  <div className="notification-meta">
                    <span>{notif.time}</span>
                    <span>•</span>
                    <span>{notif.category}</span>
                    {notif.action && (
                      <>
                        <span>•</span>
                        <span>{notif.action}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </motion.section>
        )}

        {/* Spacer for bottom nav */}
        <div style={{ height: '20px' }} />

      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className="nav-item active" onClick={() => navigate('/mobile/dashboard')}>
          <span className="nav-icon">🏠</span>
          <span className="nav-label">الرئيسية</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/mobile/profile')}>
          <span className="nav-icon">👤</span>
          <span className="nav-label">حسابي</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/mobile/notifications')}>
          <span className="nav-icon">🔔</span>
          <span className="nav-label">الإشعارات</span>
        </button>
        <button className="nav-item">
          <span className="nav-icon">☰</span>
          <span className="nav-label">المزيد</span>
        </button>
      </nav>
    </div>
  );
};

export default MobileDashboard;
