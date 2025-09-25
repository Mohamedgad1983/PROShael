/**
 * MobileDashboard - Main mobile dashboard with welcome header and components
 * Features: Welcome header, balance card, quick actions, notifications, bottom nav
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobile, useHapticFeedback } from '../../hooks/useMobile';
import BalanceCard from './BalanceCard';
import QuickActions from './QuickActions';
import NotificationCards from './NotificationCards';
import BottomNavigation from './BottomNavigation';
import '../../styles/mobile-arabic.css';

const MobileDashboard = ({
  user = { name: 'أحمد محمد الشعيل', membershipId: 'SH001' },
  balance = 2500,
  onActionSelect,
  onNotificationSelect,
  onTabChange
}) => {
  const navigate = useNavigate();
  const { device, viewport, applySafeArea } = useMobile();
  const { feedback } = useHapticFeedback();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Convert numbers to Arabic numerals
  const toArabicNumerals = (num) => {
    if (num === null || num === undefined || num === '') return '';
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, (digit) => arabicNumerals[parseInt(digit)]);
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء الخير';
  };

  // Handle scroll to show/hide scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle pull to refresh
  const handlePullToRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    feedback('medium');

    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
      feedback('success');
    }, 1000);
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab.id);
    feedback('medium');

    // Navigate to the appropriate page
    switch (tab.id) {
      case 'dashboard':
        navigate('/pwa/dashboard');
        break;
      case 'payments':
        navigate('/pwa/payments');
        break;
      case 'notifications':
        navigate('/pwa/notifications');
        break;
      case 'profile':
        navigate('/pwa/profile');
        break;
      default:
        break;
    }

    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Handle scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    feedback('light');
  };

  // Badge counts for navigation
  const badgeCounts = {
    notifications: 3,
    payments: 1
  };

  return (
    <div className="min-h-screen bg-gradient-primary" dir="rtl">

      {/* Safe area container */}
      <div className="safe-area-container pb-20">

        {/* Header */}
        <header
          className="glass-nav sticky top-0 z-40"
          style={applySafeArea(['top'])}
        >
          <div className="container py-4">

            {/* Top row - greeting and profile */}
            <div className="flex items-center justify-between mb-4">

              {/* Greeting and user info */}
              <div className="flex-1">
                <p className="text-slate-300 text-sm">{getGreeting()}</p>
                <h1 className={`font-bold text-white ${
                  viewport.isMobile ? 'text-lg' : 'text-xl'
                }`}>
                  {user.name}
                </h1>
                <p className="text-slate-400 text-xs">
                  رقم العضوية: {toArabicNumerals(user.membershipId ? user.membershipId : 'SH001')}
                </p>
              </div>

              {/* Profile and settings */}
              <div className="flex items-center gap-3">

                {/* Notifications button */}
                <button
                  className="relative touch-target glass rounded-lg"
                  onClick={() => feedback('light')}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5 5-5H8l7 7" />
                  </svg>
                  {badgeCounts.notifications > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {toArabicNumerals(badgeCounts.notifications)}
                      </span>
                    </div>
                  )}
                </button>

                {/* Profile picture */}
                <button
                  className="w-10 h-10 bg-gradient-accent rounded-full flex items-center justify-center text-white font-bold text-lg"
                  onClick={() => feedback('light')}
                >
                  {user.name.charAt(0)}
                </button>

              </div>
            </div>

            {/* Pull to refresh indicator */}
            {refreshing && (
              <div className="flex items-center justify-center py-2">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                <span className="text-accent text-sm mr-2">جاري التحديث...</span>
              </div>
            )}

          </div>
        </header>

        {/* Main content */}
        <main className="container py-6 space-y-6">

          {/* Balance card */}
          <BalanceCard
            balance={balance}
            minimumBalance={3000}
            currency="ريال"
            lastPaymentDate="١٥/٩/٢٠٢٤"
            nextPaymentDue="١٥/١٠/٢٠٢٤"
            onViewDetails={() => {
              feedback('medium');
              if (onActionSelect) {
                onActionSelect({ id: 'statement', title: 'كشف الحساب' });
              }
            }}
          />

          {/* Quick actions */}
          <QuickActions
            onActionSelect={(action) => {
              feedback('medium');

              // Handle navigation based on action
              switch(action.id) {
                case 'payment':
                  navigate('/pwa/payments');
                  break;
                case 'profile':
                  navigate('/pwa/profile');
                  break;
                case 'reports':
                  navigate('/pwa/reports');
                  break;
                case 'settings':
                  navigate('/pwa/settings');
                  break;
                default:
                  if (onActionSelect) {
                    onActionSelect(action);
                  }
              }
            }}
          />

          {/* Notification cards */}
          <NotificationCards
            onNotificationSelect={(notification) => {
              feedback('light');

              // Navigate to notifications page
              navigate('/pwa/notifications');

              if (onNotificationSelect) {
                onNotificationSelect(notification);
              }
            }}
            onMarkAsRead={(id) => {
              console.log('Mark as read:', id);
              feedback('light');
            }}
            onDismiss={(id) => {
              console.log('Dismiss notification:', id);
              feedback('light');
            }}
          />

          {/* Quick stats */}
          <div className="glass-card">
            <h3 className="text-lg font-semibold text-white mb-4">إحصائيات سريعة</h3>
            <div className={`grid gap-4 ${
              viewport.breakpoint === 'xs' ? 'grid-cols-2' : 'grid-cols-3'
            }`}>

              <div className="text-center">
                <div className="w-12 h-12 bg-success bg-opacity-20 rounded-lg flex items-center justify-center text-success text-xl mx-auto mb-2">
                  📊
                </div>
                <p className="text-xs text-slate-400">إجمالي المدفوعات</p>
                <p className="text-sm font-semibold text-white">
                  {toArabicNumerals('25,000')} ريال
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-warning bg-opacity-20 rounded-lg flex items-center justify-center text-warning text-xl mx-auto mb-2">
                  🎯
                </div>
                <p className="text-xs text-slate-400">الأنشطة المشارك</p>
                <p className="text-sm font-semibold text-white">
                  {toArabicNumerals('12')} نشاط
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-accent bg-opacity-20 rounded-lg flex items-center justify-center text-accent text-xl mx-auto mb-2">
                  🏆
                </div>
                <p className="text-xs text-slate-400">النقاط المكتسبة</p>
                <p className="text-sm font-semibold text-white">
                  {toArabicNumerals('1,250')} نقطة
                </p>
              </div>

            </div>
          </div>

          {/* Recent activity */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">النشاط الأخير</h3>
              <button
                className="text-accent text-sm hover:text-accent-light"
                onClick={() => feedback('light')}
              >
                عرض الكل
              </button>
            </div>

            <div className="space-y-3">

              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 bg-success bg-opacity-20 rounded-lg flex items-center justify-center text-success">
                  ✅
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">تم دفع الاشتراك الشهري</p>
                  <p className="text-xs text-slate-400">{toArabicNumerals('3000')} ريال • منذ يومين</p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 bg-accent bg-opacity-20 rounded-lg flex items-center justify-center text-accent">
                  🎉
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">مشاركة في فعالية العائلة</p>
                  <p className="text-xs text-slate-400">منذ أسبوع</p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 bg-warning bg-opacity-20 rounded-lg flex items-center justify-center text-warning">
                  📄
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">تحديث المستندات</p>
                  <p className="text-xs text-slate-400">منذ أسبوعين</p>
                </div>
              </div>

            </div>
          </div>

        </main>

        {/* Scroll to top button */}
        {showScrollTop && (
          <button
            className="fixed bottom-24 left-6 w-12 h-12 bg-gradient-accent rounded-full shadow-xl
              flex items-center justify-center z-40 hover:scale-110 active:scale-95 transition-all"
            onClick={scrollToTop}
            aria-label="العودة للأعلى"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        )}

      </div>

      {/* Bottom navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        badgeCounts={badgeCounts}
        isVisible={true}
      />

    </div>
  );
};

export default MobileDashboard;