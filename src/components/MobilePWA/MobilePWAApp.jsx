import React, { useState, useEffect } from 'react';
import '../../styles/pwa-emergency-fix.css';

const MobilePWAApp = () => {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sample user data for testing
  const sampleUser = {
    name: 'أحمد محمد الشعيل',
    phone: '0501234567',
    memberId: 'MEM001',
    balance: 1250,
    minimumBalance: 3000
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    // Simple validation
    if (!formData.phone || !formData.password) {
      setError('يرجى إدخال رقم الهاتف وكلمة المرور');
      setLoading(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      setUser(sampleUser);
      setCurrentView('home');
      setLoading(false);
    }, 1000);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
    setFormData({ phone: '', password: '' });
  };

  const handleNavigation = (view) => {
    setCurrentView(view);
  };

  // Login Screen
  if (currentView === 'login') {
    return (
      <div className="mobile-app">
        <div className="mobile-login">
          <div className="login-header">
            <h1 className="login-logo">صندوق الشعيل</h1>
            <p className="login-subtitle">نظام إدارة الأسرة المالي</p>
          </div>

          <div className="login-form">
            {error && (
              <div className="modern-card" style={{
                background: 'var(--error-bg)',
                border: '1px solid var(--error)',
                marginBottom: '20px'
              }}>
                <p style={{ color: 'var(--error)', margin: 0, textAlign: 'center' }}>
                  {error}
                </p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">رقم الهاتف</label>
              <input
                type="tel"
                name="phone"
                className="form-input"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="05xxxxxxxx"
                style={{ direction: 'ltr', textAlign: 'left' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
              <input
                type="password"
                name="password"
                className="form-input"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="أدخل كلمة المرور"
              />
            </div>

            <button
              className="btn-primary"
              onClick={handleLogin}
              disabled={loading}
              style={{
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main App Interface
  return (
    <div className="mobile-app">
      <div className="mobile-content">
        {currentView === 'home' && <HomeScreen user={user} />}
        {currentView === 'payments' && <PaymentsScreen user={user} />}
        {currentView === 'events' && <EventsScreen user={user} />}
        {currentView === 'profile' && <ProfileScreen user={user} onLogout={handleLogout} />}
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="mobile-nav">
        <button
          className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => handleNavigation('home')}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-text">الرئيسية</span>
        </button>

        <button
          className={`nav-item ${currentView === 'payments' ? 'active' : ''}`}
          onClick={() => handleNavigation('payments')}
        >
          <span className="nav-icon">💳</span>
          <span className="nav-text">المدفوعات</span>
        </button>

        <button
          className={`nav-item ${currentView === 'events' ? 'active' : ''}`}
          onClick={() => handleNavigation('events')}
        >
          <span className="nav-icon">🎉</span>
          <span className="nav-text">المناسبات</span>
        </button>

        <button
          className={`nav-item ${currentView === 'profile' ? 'active' : ''}`}
          onClick={() => handleNavigation('profile')}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-text">الملف الشخصي</span>
        </button>
      </div>
    </div>
  );
};

// Home Screen Component
const HomeScreen = ({ user }) => {
  const balancePercentage = Math.min((user.balance / user.minimumBalance) * 100, 100);
  const isBalanceGood = user.balance >= user.minimumBalance;

  return (
    <div className="home-section">
      <div className="balance-section">
        <div className="balance-card">
          <p className="text-caption" style={{ marginBottom: '8px' }}>
            رصيدك الحالي
          </p>

          <div className={`balance-amount ${isBalanceGood ? 'balance-good' : 'balance-low'}`}>
            {user.balance.toLocaleString('ar-SA')} ر.س
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${balancePercentage}%`,
                background: isBalanceGood ? 'var(--balance-good)' : 'var(--balance-low)'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            marginBottom: '16px'
          }}>
            <span>0 ر.س</span>
            <span>{user.minimumBalance.toLocaleString('ar-SA')} ر.س</span>
          </div>

          {!isBalanceGood && (
            <div className={`status-badge status-error`} style={{ width: '100%', textAlign: 'center' }}>
              تحتاج إلى {(user.minimumBalance - user.balance).toLocaleString('ar-SA')} ر.س للوصول للحد الأدنى
            </div>
          )}
        </div>
      </div>

      <div className="notifications-section">
        <h3 className="text-subtitle">الإشعارات الحديثة</h3>

        <div className="notification-card">
          <div className="notification-header">
            <span className="notification-title">مناسبة - حفل زفاف</span>
            <span className="notification-time">منذ ساعتين</span>
          </div>
          <div className="notification-content">
            دعوة لحضور حفل زفاف الأخ محمد الشعيل يوم السبت القادم
          </div>
        </div>

        <div className="notification-card">
          <div className="notification-header">
            <span className="notification-title">مبادرة - مساعدة الأسر</span>
            <span className="notification-time">أمس</span>
          </div>
          <div className="notification-content">
            مبادرة جديدة لمساعدة الأسر المحتاجة - الهدف: 50,000 ر.س
          </div>
        </div>

        <div className="notification-card">
          <div className="notification-header">
            <span className="notification-title">دية - حالة طارئة</span>
            <span className="notification-time">منذ 3 أيام</span>
          </div>
          <div className="notification-content">
            مساهمة مطلوبة في دية لإحدى الحالات الطارئة
          </div>
        </div>
      </div>
    </div>
  );
};

// Payments Screen Component
const PaymentsScreen = ({ user }) => {
  return (
    <div className="home-section">
      <h2 className="text-title">المدفوعات</h2>

      <div className="modern-card">
        <h3 className="text-subtitle">المدفوعات السريعة</h3>

        <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
          <button className="btn-primary">
            دفع مساهمة شهرية
          </button>

          <button className="btn-secondary">
            دفع لمبادرة
          </button>

          <button className="btn-secondary">
            دفع دية
          </button>

          <button className="btn-secondary">
            تحويل لعضو آخر
          </button>
        </div>
      </div>

      <div className="modern-card">
        <h3 className="text-subtitle">سجل المدفوعات</h3>
        <p className="text-body">آخر 5 عمليات دفع</p>

        <div style={{ marginTop: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid var(--border-primary)'
          }}>
            <div>
              <div className="text-body">مساهمة شهرية</div>
              <div className="text-caption">15/03/2024</div>
            </div>
            <div className="text-body" style={{ color: 'var(--error)' }}>
              -500 ر.س
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid var(--border-primary)'
          }}>
            <div>
              <div className="text-body">مبادرة خيرية</div>
              <div className="text-caption">10/03/2024</div>
            </div>
            <div className="text-body" style={{ color: 'var(--error)' }}>
              -200 ر.س
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Events Screen Component
const EventsScreen = ({ user }) => {
  return (
    <div className="home-section">
      <h2 className="text-title">المناسبات</h2>

      <div className="modern-card">
        <h3 className="text-subtitle">المناسبات القادمة</h3>

        <div style={{ marginTop: '16px' }}>
          <div className="notification-card">
            <div className="notification-header">
              <span className="notification-title">حفل زفاف</span>
              <span className={`status-badge status-warning`}>قريباً</span>
            </div>
            <div className="notification-content">
              حفل زفاف الأخ محمد الشعيل<br />
              التاريخ: السبت 25/03/2024<br />
              المكان: قاعة الأفراح الكبرى
            </div>
          </div>

          <div className="notification-card">
            <div className="notification-header">
              <span className="notification-title">اجتماع العائلة</span>
              <span className={`status-badge status-success`}>مؤكد</span>
            </div>
            <div className="notification-content">
              الاجتماع الشهري لعائلة الشعيل<br />
              التاريخ: الجمعة 30/03/2024<br />
              المكان: مجلس العائلة
            </div>
          </div>
        </div>
      </div>

      <div className="modern-card">
        <h3 className="text-subtitle">المناسبات السابقة</h3>
        <p className="text-body">آخر المناسبات التي شاركت فيها</p>

        <div style={{ marginTop: '16px' }}>
          <div className="text-body" style={{
            padding: '12px 0',
            borderBottom: '1px solid var(--border-primary)'
          }}>
            حفل تخرج - 15/02/2024
          </div>
          <div className="text-body" style={{
            padding: '12px 0'
          }}>
            عيد ميلاد - 10/01/2024
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Screen Component
const ProfileScreen = ({ user, onLogout }) => {
  return (
    <div className="home-section">
      <h2 className="text-title">الملف الشخصي</h2>

      <div className="modern-card">
        <h3 className="text-subtitle">المعلومات الشخصية</h3>

        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div className="text-caption">الاسم الكامل</div>
            <div className="text-body">{user.name}</div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div className="text-caption">رقم الهاتف</div>
            <div className="text-body">{user.phone}</div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div className="text-caption">رقم العضوية</div>
            <div className="text-body">{user.memberId}</div>
          </div>
        </div>
      </div>

      <div className="modern-card">
        <h3 className="text-subtitle">الإعدادات</h3>

        <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
          <button className="btn-secondary">
            تغيير كلمة المرور
          </button>

          <button className="btn-secondary">
            إعدادات الإشعارات
          </button>

          <button className="btn-secondary">
            معلومات التطبيق
          </button>

          <button className="btn-primary" onClick={onLogout} style={{
            background: 'var(--error)',
            marginTop: '16px'
          }}>
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobilePWAApp;