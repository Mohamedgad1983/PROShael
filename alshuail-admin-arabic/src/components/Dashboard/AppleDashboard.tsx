import React, { useState, useEffect, useMemo } from 'react';
import {
  HomeIcon,
  UsersIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  HeartIcon,
  ScaleIcon,
  BellIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  CogIcon,
  UserCircleIcon,
  PhotoIcon,
  FolderIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { logger } from '../../utils/logger';

import '../../styles/apple-design-system.css';

// Enhanced Type definitions
interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: string | number;
  color: string;
  description?: string;
}

interface StatCard {
  id: string;
  title: string;
  value: string | number;
  subValue?: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
  color: string;
  bgGradient: string;
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'payment' | 'member' | 'event' | 'initiative' | 'system';
  status: 'success' | 'pending' | 'warning' | 'info';
  amount?: string;
  user: {
    name: string;
    avatar: string;
    role?: string;
  };
}

interface QuickActionItem {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  bgGradient: string;
  count?: number;
  action: () => void;
}

interface AppleDashboardProps {
  onLogout: () => void;
}

const AppleDashboard: React.FC<AppleDashboardProps> = ({ onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMounted(true);
    // Simulate loading animation
    const elements = document.querySelectorAll('.apple-animate-delay');
    elements.forEach((el, index) => {
      setTimeout(() => {
        el.classList.add('apple-animate-slide-up');
      }, index * 100);
    });
  }, []);

  const menuItems: MenuItem[] = useMemo(() => [
    {
      id: 'dashboard',
      label: 'لوحة القيادة',
      icon: HomeIcon,
      color: 'system-blue',
      description: 'نظرة شاملة على النظام'
    },
    {
      id: 'members',
      label: 'الأعضاء',
      icon: UsersIcon,
      badge: 1234,
      color: 'system-indigo',
      description: 'إدارة أعضاء العائلة'
    },
    {
      id: 'subscriptions',
      label: 'الاشتراكات',
      icon: CreditCardIcon,
      badge: 856,
      color: 'system-green',
      description: 'متابعة الاشتراكات'
    },
    {
      id: 'payments',
      label: 'المدفوعات',
      icon: BanknotesIcon,
      color: 'system-mint',
      description: 'إدارة المعاملات المالية'
    },
    {
      id: 'occasions',
      label: 'المناسبات',
      icon: CalendarDaysIcon,
      badge: 12,
      color: 'system-purple',
      description: 'تنظيم المناسبات'
    },
    {
      id: 'initiatives',
      label: 'المبادرات',
      icon: HeartIcon,
      badge: 5,
      color: 'system-pink',
      description: 'المشاريع الخيرية'
    },
    {
      id: 'diyas',
      label: 'الديات',
      icon: ScaleIcon,
      badge: 3,
      color: 'system-orange',
      description: 'إدارة الديات'
    },
    {
      id: 'notifications',
      label: 'الإشعارات',
      icon: BellIcon,
      badge: 8,
      color: 'system-red',
      description: 'التنبيهات والرسائل'
    },
  ], []);

  const statsCards: StatCard[] = useMemo(() => [
    {
      id: 'total-members',
      title: 'إجمالي الأعضاء',
      value: 1234,
      change: '+12.5%',
      trend: 'up',
      icon: UsersIcon,
      description: 'نمو مستمر في العضوية',
      color: 'system-blue',
      bgGradient: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'active-subscriptions',
      title: 'الاشتراكات النشطة',
      value: 856,
      change: '+8.2%',
      trend: 'up',
      icon: CreditCardIcon,
      description: 'اشتراكات هذا الشهر',
      color: 'system-green',
      bgGradient: 'from-emerald-500 to-green-600'
    },
    {
      id: 'total-payments',
      title: 'إجمالي المدفوعات',
      value: '245,678',
      subValue: 'ر.س',
      change: '+23.1%',
      trend: 'up',
      icon: BanknotesIcon,
      description: 'إجمالي المبالغ المحصلة',
      color: 'system-purple',
      bgGradient: 'from-purple-500 to-pink-600'
    },
    {
      id: 'upcoming-events',
      title: 'المناسبات القادمة',
      value: 12,
      change: '3 هذا الأسبوع',
      trend: 'neutral',
      icon: CalendarDaysIcon,
      description: 'مناسبات مجدولة',
      color: 'system-orange',
      bgGradient: 'from-orange-500 to-amber-600'
    },
  ], []);

  const recentActivities: ActivityItem[] = useMemo(() => [
    {
      id: '1',
      title: 'دفعة جديدة من محمد أحمد الشعيل',
      description: 'تم استلام دفعة الاشتراك الشهري',
      timestamp: 'قبل 5 دقائق',
      amount: '500',
      type: 'payment',
      status: 'success',
      user: { name: 'محمد أحمد الشعيل', avatar: '👨‍💼', role: 'عضو مميز' }
    },
    {
      id: '2',
      title: 'تسجيل عضو جديد',
      description: 'انضمت سارة محمد الشعيل إلى العائلة',
      timestamp: 'قبل ساعة',
      type: 'member',
      status: 'info',
      user: { name: 'سارة محمد الشعيل', avatar: '👩', role: 'عضو جديد' }
    },
    {
      id: '3',
      title: 'مناسبة قادمة',
      description: 'زفاف أحمد عبدالله - الأسبوع القادم',
      timestamp: 'قبل 3 ساعات',
      type: 'event',
      status: 'warning',
      user: { name: 'أحمد عبدالله الشعيل', avatar: '🤵', role: 'منظم المناسبة' }
    },
    {
      id: '4',
      title: 'مساهمة خيرية',
      description: 'مساهمة في مبادرة كفالة يتيم',
      timestamp: 'قبل 5 ساعات',
      amount: '1,000',
      type: 'initiative',
      status: 'success',
      user: { name: 'خالد سعد الشعيل', avatar: '💝', role: 'محسن' }
    },
  ], []);

  const quickActions: QuickActionItem[] = useMemo(() => [
    {
      id: 'add-member',
      label: 'إضافة عضو جديد',
      icon: UsersIcon,
      color: 'system-blue',
      bgGradient: 'from-blue-500 to-indigo-600',
      action: () => logger.debug('Add Member')
    },
    {
      id: 'record-payment',
      label: 'تسجيل دفعة',
      icon: CreditCardIcon,
      color: 'system-green',
      bgGradient: 'from-green-500 to-emerald-600',
      action: () => logger.debug('Record Payment')
    },
    {
      id: 'create-event',
      label: 'إنشاء مناسبة',
      icon: CalendarDaysIcon,
      color: 'system-purple',
      bgGradient: 'from-purple-500 to-pink-600',
      action: () => logger.debug('Create Event')
    },
    {
      id: 'send-notification',
      label: 'إرسال إشعار',
      icon: BellIcon,
      color: 'system-orange',
      bgGradient: 'from-orange-500 to-red-600',
      count: 3,
      action: () => logger.debug('Send Notification')
    },
  ], []);

  const formatArabicTime = (date: Date): string => {
    return new Intl.DateTimeFormat('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const formatArabicDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const getActivityStatusColor = (status: ActivityItem['status']): string => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100 border-green-200';
      case 'warning': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'info': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'pending': return 'text-gray-600 bg-gray-100 border-gray-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen apple-flex-center apple-font-system" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center apple-animate-bounce-in">
          <div className="w-20 h-20 mb-6 mx-auto">
            <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="apple-title-2 text-white mb-2">جاري تحميل لوحة التحكم</h2>
          <p className="apple-body text-white/80">انتظر لحظة من فضلك...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen apple-font-system" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }} dir="rtl">

      {/* Premium Apple-style Header */}
      <header className="fixed top-0 right-0 left-0 z-50 apple-glass border-b border-white/20">
        <div className="apple-flex-between px-6 py-4">
          <div className="apple-flex items-center gap-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="apple-button apple-button-secondary !min-h-10 !px-3"
            >
              {sidebarOpen ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <Bars3Icon className="w-5 h-5" />
              )}
            </button>

            <div className="apple-flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl apple-flex-center shadow-lg" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <SparklesIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="apple-title-3 text-gray-900">عائلة الشعيل</h1>
                <p className="apple-footnote text-gray-600">نظام الإدارة المتكامل</p>
              </div>
            </div>
          </div>

          <div className="apple-flex items-center gap-4">
            <div className="apple-flex items-center gap-3 text-sm text-gray-600">
              <ClockIcon className="w-4 h-4" />
              <span>{formatArabicTime(currentTime)}</span>
              <span className="mx-2">•</span>
              <span>{formatArabicDate(currentTime)}</span>
            </div>

            <div className="apple-input-floating" style={{ width: '300px' }}>
              <input
                type="text"
                placeholder=" "
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="apple-input !min-h-10"
              />
              <label>البحث في النظام...</label>
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>

            <button className="relative apple-button apple-button-secondary !min-h-10 !px-3">
              <BellIcon className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full apple-flex-center font-bold">3</span>
            </button>

            <div className="apple-flex items-center gap-3">
              <button
                onClick={onLogout}
                className="apple-button apple-button-danger !min-h-10 !px-4"
                title="تسجيل الخروج"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
              </button>
              <div className="apple-flex items-center gap-3 px-4 py-2 rounded-xl apple-card">
                <div className="text-right">
                  <p className="apple-callout text-gray-900">محمد عبدالله الشعيل</p>
                  <p className="apple-caption-1 text-gray-600">المدير العام</p>
                </div>
                <div className="w-10 h-10 rounded-lg apple-flex-center font-bold text-white shadow-md" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  م
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-20">
        {/* Apple-style Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-80' : 'w-20'
          } fixed right-0 top-20 bottom-0 apple-glass border-l border-white/20 transition-all duration-500 ease-in-out z-40 overflow-hidden`}
        >
          <div className="p-6 h-full flex flex-col">
            {sidebarOpen && (
              <div className="mb-8 p-6 apple-card apple-animate-delay" style={{ background: 'linear-gradient(135deg, rgba(103, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)' }}>
                <div className="apple-flex items-center gap-3 mb-4">
                  <ChartBarIcon className="w-6 h-6 text-indigo-600" />
                  <p className="apple-headline text-gray-900">إحصائيات سريعة</p>
                </div>
                <p className="apple-caption-1 text-gray-600 mb-2">مجموع الأعضاء النشطين</p>
                <p className="apple-title-1 text-gray-900 mb-3">1,234</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full rounded-full" style={{ background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' }}></div>
                  </div>
                  <span className="apple-caption-1 text-gray-600">75%</span>
                </div>
              </div>
            )}

            <nav className="flex-1 space-y-2">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full apple-flex ${sidebarOpen ? 'justify-between' : 'justify-center'} p-4 rounded-xl transition-all duration-200 group relative overflow-hidden apple-animate-delay ${
                      isActive
                        ? 'bg-white shadow-lg text-indigo-600 border border-indigo-100'
                        : 'hover:bg-white/50 text-gray-700 hover:text-indigo-600'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="apple-flex items-center gap-4 relative z-10">
                      <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-indigo-100' : 'bg-gray-100 group-hover:bg-indigo-100'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {sidebarOpen && (
                        <div className="text-right">
                          <span className="apple-callout block">{item.label}</span>
                          {item.description && (
                            <span className="apple-caption-1 text-gray-500 block">{item.description}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {sidebarOpen && item.badge && (
                      <span className={`apple-badge ${isActive ? 'apple-badge-primary' : ''}`}>
                        {typeof item.badge === 'number' && item.badge > 999 ? '999+' : item.badge}
                      </span>
                    )}

                    {!sidebarOpen && item.badge && (
                      <span className="absolute -top-1 -right-1 apple-badge apple-badge-danger">
                        {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {sidebarOpen && (
              <div className="mt-8 p-4 apple-card apple-animate-delay" style={{ background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.1) 0%, rgba(52, 199, 89, 0.05) 100%)' }}>
                <div className="apple-flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full apple-status-online"></div>
                  <p className="apple-caption-1 text-gray-600">حالة النظام</p>
                </div>
                <p className="apple-callout text-green-600 mb-1">يعمل بكفاءة 100%</p>
                <p className="apple-caption-2 text-gray-500">آخر تحديث: قبل دقيقتين</p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main
          className={`flex-1 ${
            sidebarOpen ? 'mr-80' : 'mr-20'
          } p-8 transition-all duration-500 ease-in-out`}
        >
          {activeSection === 'dashboard' && (
            <div className="space-y-8">
              {/* Welcome Section */}
              <div className="apple-card p-8 apple-animate-delay" style={{ background: 'linear-gradient(135deg, rgba(103, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)' }}>
                <div className="apple-flex-between mb-6">
                  <div>
                    <h2 className="apple-title-1 text-gray-900 mb-2">
                      مرحباً بعودتك، محمد! 👋
                    </h2>
                    <p className="apple-body text-gray-600 mb-4">
                      إليك نظرة شاملة على أداء العائلة وآخر التحديثات
                    </p>
                    <div className="apple-flex gap-4">
                      <div className="apple-flex items-center gap-2 apple-badge apple-badge-success">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>23 مهمة مكتملة اليوم</span>
                      </div>
                      <div className="apple-flex items-center gap-2 apple-badge">
                        <ClockIcon className="w-4 h-4" />
                        <span>5 مناسبات قادمة</span>
                      </div>
                      <div className="apple-flex items-center gap-2 apple-badge apple-badge-warning">
                        <ExclamationCircleIcon className="w-4 h-4" />
                        <span>3 تنبيهات جديدة</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-32 h-32 rounded-2xl apple-flex-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <SparklesIcon className="w-16 h-16 text-white" />
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="apple-grid apple-grid-4 gap-6">
                {statsCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.id}
                      className="apple-card p-6 group apple-animate-delay"
                      style={{ animationDelay: `${(index + 1) * 100}ms` }}
                    >
                      <div className="apple-flex-between items-start mb-4">
                        <div className={`w-12 h-12 rounded-xl apple-flex-center text-white shadow-lg bg-gradient-to-br ${stat.bgGradient}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className={`apple-badge ${stat.trend === 'up' ? 'apple-badge-success' : stat.trend === 'down' ? 'apple-badge-danger' : ''}`}>
                          {stat.trend === 'up' && <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />}
                          {stat.trend === 'down' && <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />}
                          {stat.change}
                        </span>
                      </div>
                      <div>
                        <h3 className="apple-title-2 text-gray-900 mb-1">
                          {stat.value}
                          {stat.subValue && <span className="apple-body text-gray-600 mr-2">{stat.subValue}</span>}
                        </h3>
                        <p className="apple-callout text-gray-900 mb-1">{stat.title}</p>
                        <p className="apple-caption-1 text-gray-600">{stat.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Content Grid */}
              <div className="apple-grid apple-grid-3 gap-8">
                {/* Recent Activities */}
                <div className="apple-grid-col-span-2 apple-card p-6 apple-animate-delay">
                  <div className="apple-flex-between mb-6">
                    <div>
                      <h3 className="apple-title-2 text-gray-900">النشاطات الأخيرة</h3>
                      <p className="apple-caption-1 text-gray-600 mt-1">آخر التحديثات والعمليات</p>
                    </div>
                    <button className="apple-button apple-button-secondary">
                      عرض الكل
                    </button>
                  </div>

                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div
                        key={activity.id}
                        className="apple-flex gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group apple-animate-delay"
                        style={{ animationDelay: `${(index + 1) * 50}ms` }}
                      >
                        <div className="w-12 h-12 rounded-xl apple-flex-center text-2xl bg-white shadow-sm">
                          {activity.user.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="apple-flex-between items-start mb-2">
                            <div>
                              <p className="apple-callout text-gray-900 group-hover:text-indigo-600 transition-colors">
                                {activity.title}
                              </p>
                              <p className="apple-caption-1 text-gray-600 mt-1">{activity.description}</p>
                            </div>
                            {activity.amount && (
                              <div className="text-left">
                                <span className="apple-headline text-green-600">{activity.amount}</span>
                                <p className="apple-caption-2 text-gray-500">ر.س</p>
                              </div>
                            )}
                          </div>
                          <div className="apple-flex items-center gap-4">
                            <span className="apple-caption-1 text-gray-500">{activity.timestamp}</span>
                            <span className={`apple-badge ${getActivityStatusColor(activity.status)}`}>
                              {activity.user.name}
                            </span>
                            {activity.user.role && (
                              <span className="apple-caption-2 text-gray-400">{activity.user.role}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions & Events */}
                <div className="space-y-6">
                  {/* Quick Actions */}
                  <div className="apple-card p-6 apple-animate-delay">
                    <h3 className="apple-title-3 text-gray-900 mb-4">إجراءات سريعة</h3>
                    <div className="apple-grid apple-grid-2 gap-3">
                      {quickActions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.id}
                            onClick={action.action}
                            className="relative p-4 apple-card hover:scale-105 transition-all duration-200 group apple-animate-delay"
                            style={{ animationDelay: `${(index + 1) * 75}ms` }}
                          >
                            <div className={`w-10 h-10 rounded-lg apple-flex-center mb-3 mx-auto text-white shadow-lg bg-gradient-to-br ${action.bgGradient} group-hover:scale-110 transition-transform`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <p className="apple-caption-1 text-gray-700 text-center">{action.label}</p>
                            {action.count && (
                              <span className="absolute -top-1 -right-1 apple-badge apple-badge-danger">
                                {action.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* System Status */}
                  <div className="apple-card p-6 apple-animate-delay">
                    <h3 className="apple-title-3 text-gray-900 mb-4">حالة النظام</h3>
                    <div className="space-y-4">
                      <div className="apple-flex-between">
                        <span className="apple-caption-1 text-gray-600">الخادم</span>
                        <div className="apple-flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full apple-status-online"></div>
                          <span className="apple-caption-1 text-green-600">متصل</span>
                        </div>
                      </div>
                      <div className="apple-flex-between">
                        <span className="apple-caption-1 text-gray-600">قاعدة البيانات</span>
                        <div className="apple-flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full apple-status-online"></div>
                          <span className="apple-caption-1 text-green-600">متصلة</span>
                        </div>
                      </div>
                      <div className="apple-flex-between">
                        <span className="apple-caption-1 text-gray-600">الأداء</span>
                        <span className="apple-caption-1 text-green-600">ممتاز</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other Sections Placeholder */}
          {activeSection !== 'dashboard' && (
            <div className="apple-animate-fade-in">
              <div className="apple-card p-12 text-center">
                <div className="w-20 h-20 rounded-2xl apple-flex-center mx-auto mb-6" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <DocumentIcon className="w-10 h-10 text-white" />
                </div>
                <h2 className="apple-title-1 text-gray-900 mb-4">
                  {menuItems.find(item => item.id === activeSection)?.label}
                </h2>
                <p className="apple-body text-gray-600 mb-8">
                  هذا القسم قيد التطوير وسيتم إضافة المحتوى قريباً...
                </p>

                <div className="apple-grid apple-grid-3 gap-6 mt-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-48 apple-skeleton"></div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default React.memo(AppleDashboard);