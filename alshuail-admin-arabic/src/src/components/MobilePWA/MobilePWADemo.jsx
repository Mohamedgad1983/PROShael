/**
 * MobilePWADemo - Complete demo of all mobile PWA components
 * Demonstrates the full mobile experience for Al-Shuail system
 */

import React, { useState } from 'react';
import { useMobile } from '../../hooks/useMobile';
import MobileLoginScreen from './MobileLoginScreen';
import MobileDashboard from './MobileDashboard';
import '../../styles/mobile-arabic.css';

const MobilePWADemo = () => {
  const { device } = useMobile();
  const [currentScreen, setCurrentScreen] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Sample user data
  const sampleUser = {
    name: 'أحمد محمد الشعيل',
    membershipId: 'SH001',
    phone: '0501234567',
    balance: 2500,
    email: 'ahmed.alshuail@example.com'
  };

  // Handle login
  const handleLogin = async (loginData) => {
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Validate Saudi phone number
    const phonePattern = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
    if (!phonePattern.test(loginData.phone)) {
      setIsLoading(false);
      throw new Error('رقم الهاتف غير صحيح');
    }

    // Simulate successful login
    setUser(sampleUser);
    setIsLoggedIn(true);
    setCurrentScreen('dashboard');
    setIsLoading(false);
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setCurrentScreen('login');
  };

  // Handle action selection from dashboard
  const handleActionSelect = (action) => {
    console.log('Action selected:', action);

    // Handle different actions
    switch (action.id) {
      case 'pay':
        alert(`فتح صفحة ${action.title}`);
        break;
      case 'statement':
        alert(`عرض ${action.title}`);
        break;
      case 'events':
        alert(`عرض ${action.title}`);
        break;
      case 'profile':
        alert(`فتح ${action.title}`);
        break;
      case 'documents':
        alert(`عرض ${action.title}`);
        break;
      case 'support':
        alert(`فتح ${action.title}`);
        break;
      case 'notifications':
        alert(`عرض ${action.title}`);
        break;
      case 'settings':
        alert(`فتح ${action.title}`);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  // Handle notification selection
  const handleNotificationSelect = (notification) => {
    console.log('Notification selected:', notification);

    const messages = {
      'occasion': `فتح تفاصيل المناسبة: ${notification.title}`,
      'initiative': `فتح تفاصيل المبادرة: ${notification.title}`,
      'diya': `فتح تفاصيل الدية: ${notification.title}`
    };

    alert(messages[notification.type] || `فتح الإشعار: ${notification.title}`);
  };

  // Handle tab change in bottom navigation
  const handleTabChange = (tab) => {
    console.log('Tab changed:', tab);
    alert(`الانتقال إلى ${tab.title}`);
  };

  // Render appropriate screen based on current state
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <MobileLoginScreen
            onLogin={handleLogin}
            loading={isLoading}
            error={null}
          />
        );

      case 'dashboard':
        return (
          <MobileDashboard
            user={user}
            balance={user?.balance || 0}
            onActionSelect={handleActionSelect}
            onNotificationSelect={handleNotificationSelect}
            onTabChange={handleTabChange}
          />
        );

      default:
        return <div>Unknown screen</div>;
    }
  };

  return (
    <div className="mobile-pwa-demo">

      {/* Demo controls (only show on desktop for testing) */}
      {!device.isMobile && (
        <div className="fixed top-4 left-4 z-50 bg-glass backdrop-blur-xl rounded-lg p-4 border border-slate-600">
          <h4 className="text-white font-semibold mb-3">عرض توضيحي للجوال</h4>

          <div className="space-y-2">
            <button
              className="btn btn-secondary w-full text-sm"
              onClick={() => setCurrentScreen('login')}
            >
              شاشة تسجيل الدخول
            </button>

            <button
              className="btn btn-secondary w-full text-sm"
              onClick={() => {
                setUser(sampleUser);
                setIsLoggedIn(true);
                setCurrentScreen('dashboard');
              }}
            >
              لوحة التحكم
            </button>

            <button
              className="btn btn-outline w-full text-sm"
              onClick={handleLogout}
            >
              تسجيل الخروج
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-600">
            <p className="text-xs text-slate-400">
              💡 انتقل للجوال لتجربة أفضل
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="mobile-pwa-content">
        {renderCurrentScreen()}
      </div>

      {/* Mobile framework info overlay (dev mode) */}
      {process.env.NODE_ENV === 'development' && !device.isMobile && (
        <div className="fixed bottom-4 right-4 bg-glass backdrop-blur-xl rounded-lg p-3 border border-slate-600 text-xs text-slate-300">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-success rounded-full"></span>
            <span>إطار عمل الجوال نشط</span>
          </div>
          <div className="space-y-1">
            <div>الجهاز: {device.isMobile ? 'جوال' : 'سطح مكتب'}</div>
            <div>الشاشة الحالية: {currentScreen}</div>
            <div>حالة تسجيل الدخول: {isLoggedIn ? 'مسجل' : 'غير مسجل'}</div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MobilePWADemo;