/**
 * EnhancedMobileDashboard - Premium Mobile Dashboard with Modern Design
 * Features harmonious colors, smooth animations, and perfect text visibility
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/pwa-design-system.css';

const EnhancedMobileDashboard = ({ user = {}, isOnline = true, onLogout, device = {}, viewport = {} }) => {
  const navigate = useNavigate();

  // Default user data if not provided
  const defaultUser = {
    name: 'مرحباً',
    phone: '0501234567',
    balance: 2500,
    membershipId: 'SH001',
    minimumBalance: 3000,
    joinDate: '2023-06-15',
    totalPaid: 450
  };

  const currentUser = { ...defaultUser, ...user };
  const balance = currentUser.balance || 2500;
  const [activeSection, setActiveSection] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const contentRef = useRef(null);

  // Arabic number formatting
  const formatArabicNumber = (num) => {
    if (num === null || num === undefined) return '٠';
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, d => arabicNumerals[parseInt(d)]);
  };

  // Format currency with proper spacing
  const formatCurrency = (amount) => {
    const formatted = new Intl.NumberFormat('ar-SA').format(amount);
    return `${formatted} ريال`;
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء الخير';
  };

  // Handle pull to refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Smooth animation delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  // Quick actions data
  const quickActions = [
    {
      id: 'payment',
      title: 'دفع اشتراك',
      icon: '💳',
      color: 'var(--pwa-primary-500)',
      bgColor: 'rgba(16, 185, 129, 0.1)'
    },
    {
      id: 'statement',
      title: 'كشف حساب',
      icon: '📊',
      color: 'var(--pwa-secondary-500)',
      bgColor: 'rgba(168, 85, 247, 0.1)'
    },
    {
      id: 'events',
      title: 'المناسبات',
      icon: '🎉',
      color: 'var(--pwa-warning)',
      bgColor: 'rgba(245, 158, 11, 0.1)'
    },
    {
      id: 'support',
      title: 'الدعم',
      icon: '💬',
      color: 'var(--pwa-info)',
      bgColor: 'rgba(59, 130, 246, 0.1)'
    }
  ];

  // Recent notifications
  const notifications = [
    {
      id: 1,
      type: 'occasion',
      title: 'دعوة زفاف',
      message: 'أحمد محمد الشعيل يدعوكم لحضور حفل زفافه',
      time: 'قبل ساعتين',
      unread: true
    },
    {
      id: 2,
      type: 'payment',
      title: 'تذكير بالدفع',
      message: 'موعد دفع الاشتراك الشهري',
      time: 'أمس',
      unread: false
    },
    {
      id: 3,
      type: 'initiative',
      title: 'مبادرة جديدة',
      message: 'مبادرة دعم الأسر المحتاجة',
      time: 'قبل 3 أيام',
      unread: false
    }
  ];

  // Statistics data
  const stats = [
    { label: 'إجمالي المساهمات', value: '١٥,٠٠٠', unit: 'ريال', trend: '+12%' },
    { label: 'المشاركات', value: '٢٤', unit: 'مشاركة', trend: '+5%' },
    { label: 'الترتيب', value: '١٢', unit: 'من ١٥٠', trend: '↑' }
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--pwa-gradient-light)' }} dir="rtl">

      {/* Premium Header */}
      <header className="pwa-glass sticky top-0" style={{
        zIndex: 'var(--pwa-z-50)',
        borderRadius: '0 0 24px 24px',
        background: 'var(--pwa-gradient-premium)'
      }}>
        <div className="px-5 pt-12 pb-6">

          {/* User Info Section */}
          <div className="flex items-center justify-between mb-4 pwa-animate-fade-in-down">
            <div className="flex-1">
              <p className="text-white/80 text-sm mb-1">{getGreeting()}</p>
              <h1 className="text-white text-xl font-bold">
                {user?.name || 'أحمد محمد الشعيل'}
              </h1>
              <p className="text-white/70 text-xs mt-1">
                عضو رقم: {formatArabicNumber(user?.membershipId || 'SH001')}
              </p>
            </div>

            {/* Profile Picture */}
            <div className="relative">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                   style={{
                     background: 'var(--pwa-glass-white-light)',
                     backdropFilter: 'blur(20px)',
                     border: '2px solid rgba(255, 255, 255, 0.3)'
                   }}>
                {user?.name?.charAt(0) || 'أ'}
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
          </div>

          {/* Refresh Indicator */}
          {isRefreshing && (
            <div className="flex items-center justify-center py-2 pwa-animate-fade-in">
              <div className="w-5 h-5 border-2 border-white/60 border-t-white rounded-full pwa-animate-spin mr-2"></div>
              <span className="text-white/80 text-sm">جاري التحديث...</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main ref={contentRef} className="px-4 pb-24 -mt-6">

        {/* Balance Card - Premium Glass Effect */}
        <div className="pwa-glass-card mb-6 pwa-animate-fade-in-up"
             style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="pwa-caption mb-1" style={{ color: 'var(--pwa-neutral-500)' }}>
                الرصيد الحالي
              </p>
              <h2 className="pwa-heading-1" style={{
                color: balance >= 3000 ? 'var(--pwa-success)' : 'var(--pwa-error)',
                fontSize: '2rem'
              }}>
                {formatCurrency(balance)}
              </h2>
            </div>
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
                 style={{
                   background: balance >= 3000
                     ? 'linear-gradient(135deg, var(--pwa-success-light), var(--pwa-success))'
                     : 'linear-gradient(135deg, var(--pwa-error-light), var(--pwa-error))',
                   boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
                 }}>
              <span className="text-white text-2xl">
                {balance >= 3000 ? '✓' : '!'}
              </span>
            </div>
          </div>

          {/* Balance Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: 'var(--pwa-neutral-500)' }}>الحد الأدنى</span>
              <span style={{ color: 'var(--pwa-neutral-500)' }}>٣,٠٠٠ ريال</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 ease-out"
                   style={{
                     width: `${Math.min(100, (balance / 3000) * 100)}%`,
                     background: balance >= 3000
                       ? 'var(--pwa-gradient-primary)'
                       : 'var(--pwa-gradient-error)'
                   }}></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button className="pwa-btn pwa-btn-primary pwa-btn-shimmer">
              <span className="mr-2">💳</span>
              إضافة رصيد
            </button>
            <button className="pwa-btn pwa-btn-glass">
              <span className="mr-2">📄</span>
              كشف حساب
            </button>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-6">
          <h3 className="pwa-heading-3 mb-4" style={{ color: 'var(--pwa-neutral-800)' }}>
            خدمات سريعة
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <button
                key={action.id}
                className="pwa-glass-card text-center p-3 pwa-touch-target pwa-animate-fade-in-up"
                style={{
                  animationDelay: `${0.2 + index * 0.05}s`,
                  padding: 'var(--pwa-space-3)',
                  minHeight: 'auto'
                }}
                onClick={() => navigate(`/pwa/${action.id}`)}
              >
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center text-2xl"
                     style={{ background: action.bgColor }}>
                  {action.icon}
                </div>
                <span className="pwa-caption" style={{ color: 'var(--pwa-neutral-700)' }}>
                  {action.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="mb-6">
          <h3 className="pwa-heading-3 mb-4" style={{ color: 'var(--pwa-neutral-800)' }}>
            إحصائياتك
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="pwa-glass-card text-center p-3 pwa-animate-fade-in-up"
                style={{
                  animationDelay: `${0.4 + index * 0.05}s`,
                  padding: 'var(--pwa-space-3)'
                }}
              >
                <p className="pwa-caption mb-1" style={{ color: 'var(--pwa-neutral-500)' }}>
                  {stat.label}
                </p>
                <p className="pwa-heading-3 mb-1" style={{ color: 'var(--pwa-neutral-900)' }}>
                  {stat.value}
                </p>
                <p className="pwa-caption" style={{ color: 'var(--pwa-neutral-600)' }}>
                  {stat.unit}
                </p>
                <span className="pwa-caption" style={{
                  color: 'var(--pwa-success)',
                  fontWeight: 'var(--pwa-font-semibold)'
                }}>
                  {stat.trend}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Notifications */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="pwa-heading-3" style={{ color: 'var(--pwa-neutral-800)' }}>
              آخر الإشعارات
            </h3>
            <button className="pwa-body-small" style={{ color: 'var(--pwa-primary-600)' }}>
              عرض الكل
            </button>
          </div>

          <div className="space-y-3">
            {notifications.map((notif, index) => (
              <div
                key={notif.id}
                className="pwa-glass-card flex items-start gap-4 p-4 pwa-animate-fade-in-up"
                style={{
                  animationDelay: `${0.5 + index * 0.05}s`,
                  borderLeft: notif.unread ? `3px solid var(--pwa-primary-500)` : 'none'
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{
                       background: notif.type === 'occasion'
                         ? 'rgba(168, 85, 247, 0.1)'
                         : notif.type === 'payment'
                         ? 'rgba(245, 158, 11, 0.1)'
                         : 'rgba(16, 185, 129, 0.1)'
                     }}>
                  <span className="text-lg">
                    {notif.type === 'occasion' ? '🎉' : notif.type === 'payment' ? '💳' : '🚀'}
                  </span>
                </div>

                <div className="flex-1">
                  <h4 className="pwa-body font-semibold mb-1" style={{
                    color: 'var(--pwa-neutral-900)',
                    fontWeight: notif.unread ? 'var(--pwa-font-bold)' : 'var(--pwa-font-semibold)'
                  }}>
                    {notif.title}
                  </h4>
                  <p className="pwa-body-small mb-1" style={{ color: 'var(--pwa-neutral-600)' }}>
                    {notif.message}
                  </p>
                  <p className="pwa-caption" style={{ color: 'var(--pwa-neutral-500)' }}>
                    {notif.time}
                  </p>
                </div>

                {notif.unread && (
                  <div className="w-2 h-2 rounded-full pwa-animate-pulse"
                       style={{ background: 'var(--pwa-primary-500)' }}></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 pwa-glass"
           style={{
             borderRadius: '24px 24px 0 0',
             paddingBottom: 'var(--pwa-safe-bottom)',
             zIndex: 'var(--pwa-z-40)'
           }}>
        <div className="flex justify-around items-center py-3">
          {[
            { icon: '🏠', label: 'الرئيسية', active: true },
            { icon: '💳', label: 'المدفوعات' },
            { icon: '📊', label: 'التقارير' },
            { icon: '🔔', label: 'الإشعارات' },
            { icon: '👤', label: 'الملف' }
          ].map((item, index) => (
            <button
              key={index}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200"
              style={{
                background: item.active ? 'var(--pwa-glass-white-light)' : 'transparent',
                transform: item.active ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="pwa-caption" style={{
                color: item.active ? 'var(--pwa-primary-600)' : 'var(--pwa-neutral-600)',
                fontWeight: item.active ? 'var(--pwa-font-semibold)' : 'var(--pwa-font-regular)'
              }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default EnhancedMobileDashboard;