import {
ArrowTrendingUpIcon,BanknotesIcon,Bars3Icon,BellIcon,CalendarDaysIcon,CheckCircleIcon,ClockIcon,CreditCardIcon,ExclamationCircleIcon,HeartIcon,HomeIcon,ScaleIcon,SparklesIcon,UsersIcon,XMarkIcon
} from '@heroicons/react/24/outline';
import React,{ useEffect,useState } from 'react';

import { logger } from '../../utils/logger';

// Enhanced Type definitions with better TypeScript support
interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge: string | null;
  color: string;
}

interface StatItem {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
  bgColor: string;
  iconBg: string;
  subValue?: string;
}

interface ActivityUser {
  name: string;
  avatar: string;
}

interface RecentActivity {
  id: number;
  title: string;
  description: string;
  time: string;
  amount?: string;
  type: 'payment' | 'member' | 'event' | 'initiative';
  status: 'completed' | 'new' | 'upcoming';
  user?: ActivityUser;
}

interface UpcomingEvent {
  title: string;
  date: string;
  time: string;
  type: 'meeting' | 'wedding' | 'celebration';
  attendees: number;
}

interface QuickAction {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  count: string | null;
}


const AlShuailDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    logger.debug('Dashboard mounted successfully');
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl font-semibold">جاري تحميل لوحة التحكم...</div>
        </div>
      </div>
    );
  }

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'لوحة القيادة', icon: HomeIcon, badge: null, color: 'blue' },
    { id: 'members', label: 'الأعضاء', icon: UsersIcon, badge: '1,234', color: 'indigo' },
    { id: 'subscriptions', label: 'الاشتراكات', icon: CreditCardIcon, badge: '856', color: 'green' },
    { id: 'payments', label: 'المدفوعات', icon: BanknotesIcon, badge: null, color: 'emerald' },
    { id: 'occasions', label: 'المناسبات', icon: CalendarDaysIcon, badge: '12', color: 'purple' },
    { id: 'initiatives', label: 'المبادرات', icon: HeartIcon, badge: '5', color: 'pink' },
    { id: 'diyas', label: 'الديات', icon: ScaleIcon, badge: '3', color: 'orange' },
    { id: 'notifications', label: 'الإشعارات', icon: BellIcon, badge: '8', color: 'red' },
  ];

  const stats: StatItem[] = [
    {
      label: 'إجمالي الأعضاء',
      value: '1,234',
      change: '+12.5%',
      trend: 'up',
      icon: UsersIcon,
      description: 'نمو مستمر في العضوية',
      bgColor: 'from-blue-600 to-indigo-600',
      iconBg: 'bg-blue-500'
    },
    {
      label: 'الاشتراكات النشطة',
      value: '856',
      change: '+8.2%',
      trend: 'up',
      icon: CreditCardIcon,
      description: 'اشتراكات هذا الشهر',
      bgColor: 'from-emerald-600 to-green-600',
      iconBg: 'bg-emerald-500'
    },
    {
      label: 'إجمالي المدفوعات',
      value: '245,678',
      subValue: 'ريال سعودي',
      change: '+23.1%',
      trend: 'up',
      icon: BanknotesIcon,
      description: 'إجمالي المبالغ المحصلة',
      bgColor: 'from-purple-600 to-pink-600',
      iconBg: 'bg-purple-500'
    },
    {
      label: 'المناسبات القادمة',
      value: '12',
      change: '3 هذا الأسبوع',
      trend: 'neutral',
      icon: CalendarDaysIcon,
      description: 'مناسبات مجدولة',
      bgColor: 'from-orange-600 to-amber-600',
      iconBg: 'bg-orange-500'
    },
  ];

  const recentActivities: RecentActivity[] = [
    {
      id: 1,
      title: 'دفعة جديدة من محمد أحمد الشعيل',
      description: 'تم استلام دفعة الاشتراك الشهري',
      time: 'قبل 5 دقائق',
      amount: '500',
      type: 'payment',
      status: 'completed',
      user: { name: 'محمد أحمد', avatar: '👨‍💼' }
    },
    {
      id: 2,
      title: 'تسجيل عضو جديد',
      description: 'انضمت سارة محمد الشعيل إلى العائلة',
      time: 'قبل ساعة',
      type: 'member',
      status: 'new',
      user: { name: 'سارة محمد', avatar: '👩' }
    },
    {
      id: 3,
      title: 'مناسبة قادمة',
      description: 'زفاف أحمد عبدالله - الأسبوع القادم',
      time: 'قبل 3 ساعات',
      type: 'event',
      status: 'upcoming',
      user: { name: 'أحمد عبدالله', avatar: '🤵' }
    },
    {
      id: 4,
      title: 'مساهمة خيرية',
      description: 'مساهمة في مبادرة كفالة يتيم',
      time: 'قبل 5 ساعات',
      amount: '1,000',
      type: 'initiative',
      status: 'completed',
      user: { name: 'خالد سعد', avatar: '💝' }
    },
  ];

  const upcomingEvents: UpcomingEvent[] = [
    { title: 'اجتماع العائلة الشهري', date: '25 ديسمبر', time: '8:00 مساءً', type: 'meeting', attendees: 45 },
    { title: 'حفل زفاف أحمد', date: '28 ديسمبر', time: '7:00 مساءً', type: 'wedding', attendees: 250 },
    { title: 'عقيقة المولود الجديد', date: '2 يناير', time: '6:00 مساءً', type: 'celebration', attendees: 80 },
  ];

  const quickActions: QuickAction[] = [
    { label: 'إضافة عضو جديد', icon: UsersIcon, color: 'from-blue-500 to-indigo-600', count: null },
    { label: 'تسجيل دفعة', icon: CreditCardIcon, color: 'from-green-500 to-emerald-600', count: null },
    { label: 'إنشاء مناسبة', icon: CalendarDaysIcon, color: 'from-purple-500 to-pink-600', count: null },
    { label: 'إرسال إشعار', icon: BellIcon, color: 'from-orange-500 to-red-600', count: '3' },
  ];

  const getActivityIcon = (type: RecentActivity['type']): string => {
    switch (type) {
      case 'payment': return '💰';
      case 'member': return '👤';
      case 'event': return '🎉';
      case 'initiative': return '❤️';
      default: return '📝';
    }
  };

  const getActivityColor = (type: RecentActivity['type']): string => {
    switch (type) {
      case 'payment': return 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400';
      case 'member': return 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400';
      case 'event': return 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400';
      case 'initiative': return 'from-orange-500/20 to-amber-500/20 border-orange-500/30 text-orange-400';
      default: return 'from-gray-500/20 to-slate-500/20 border-gray-500/30 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950" dir="rtl">

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Premium Header */}
      <header className="fixed top-0 right-0 left-0 z-50 bg-slate-900/80 backdrop-blur-2xl border-b border-white/10">
        <div className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 text-white border border-white/10"
            >
              {sidebarOpen ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <Bars3Icon className="w-5 h-5" />
              )}
            </button>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/25">
                <SparklesIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">عائلة الشعيل</h1>
                <p className="text-sm text-blue-400">نظام الإدارة المتكامل</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-white border border-white/10">
              <BellIcon className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">3</span>
            </button>

            <div className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">محمد عبدالله الشعيل</p>
                <p className="text-xs text-blue-400">المدير العام</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                م
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Premium Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-72' : 'w-20'
          } fixed right-0 top-20 bottom-0 bg-slate-900/50 backdrop-blur-2xl border-l border-white/10 transition-all duration-500 ease-in-out z-40 overflow-hidden`}
        >
          <div className="p-4 h-full flex flex-col">
            {sidebarOpen && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10">
                <p className="text-xs text-blue-400 mb-1">مجموع الأعضاء النشطين</p>
                <p className="text-2xl font-bold text-white">1,234</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  </div>
                  <span className="text-xs text-white/60">75%</span>
                </div>
              </div>
            )}

            <nav className="flex-1 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 text-white shadow-lg shadow-blue-500/20 border border-white/20'
                        : 'hover:bg-white/5 text-white/70 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-pulse"></div>
                    )}

                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-white/10' : 'bg-white/5 group-hover:bg-white/10'} transition-colors`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {sidebarOpen && (
                        <span className="text-sm font-medium">{item.label}</span>
                      )}
                    </div>

                    {sidebarOpen && item.badge && (
                      <span className={`px-2.5 py-1 text-xs rounded-lg font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80'
                      }`}>
                        {item.badge}
                      </span>
                    )}

                    {!sidebarOpen && item.badge && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {item.badge.length > 2 ? '9+' : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {sidebarOpen && (
              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-xs text-white/60">حالة النظام</p>
                </div>
                <p className="text-sm font-semibold text-green-400">يعمل بكفاءة 100%</p>
                <p className="text-xs text-white/40 mt-1">آخر تحديث: قبل دقيقتين</p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          className={`flex-1 ${
            sidebarOpen ? 'mr-72' : 'mr-20'
          } mt-20 p-8 transition-all duration-500 ease-in-out`}
        >
          {activeSection === 'dashboard' && (
            <div className="space-y-8">
              {/* Welcome Section */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-white/10 p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl opacity-20"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl opacity-20"></div>

                <div className="relative z-10">
                  <h2 className="text-4xl font-bold text-white mb-3">
                    مرحباً بعودتك، محمد! 👋
                  </h2>
                  <p className="text-lg text-white/80 mb-6">
                    إليك نظرة شاملة على أداء العائلة وآخر التحديثات
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur">
                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-white">23 مهمة مكتملة اليوم</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur">
                      <ClockIcon className="w-5 h-5 text-blue-400" />
                      <span className="text-sm text-white">5 مناسبات قادمة</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur">
                      <ExclamationCircleIcon className="w-5 h-5 text-amber-400" />
                      <span className="text-sm text-white">3 تنبيهات جديدة</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={index}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-white/10 p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full filter blur-2xl group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-colors"></div>

                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.bgColor} shadow-lg`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${
                            stat.trend === 'up'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {stat.trend === 'up' && <ArrowTrendingUpIcon className="w-3 h-3" />}
                            {stat.change}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-3xl font-bold text-white">
                            {stat.value}
                            {stat.subValue && <span className="text-lg font-normal text-white/60 mr-2">{stat.subValue}</span>}
                          </h3>
                          <p className="text-sm font-medium text-white/80">{stat.label}</p>
                          <p className="text-xs text-white/50">{stat.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Recent Activities */}
                <div className="xl:col-span-2 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white">النشاطات الأخيرة</h3>
                      <p className="text-sm text-white/60 mt-1">آخر التحديثات والعمليات</p>
                    </div>
                    <button className="px-4 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-all">
                      عرض الكل
                    </button>
                  </div>

                  <div className="space-y-3">
                    {recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="group flex items-center justify-between p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800/70 border border-white/5 hover:border-white/10 transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getActivityColor(activity.type)} border flex items-center justify-center text-xl`}>
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                              {activity.title}
                            </p>
                            <p className="text-xs text-white/50 mt-1">{activity.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-white/40">{activity.time}</span>
                              {activity.user && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">{activity.user.avatar}</span>
                                  <span className="text-xs text-white/60">{activity.user.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {activity.amount && (
                          <div className="text-right">
                            <span className="text-lg font-bold text-green-400">{activity.amount}</span>
                            <p className="text-xs text-white/50">ر.س</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Side Panel */}
                <div className="space-y-6">
                  {/* Quick Actions */}
                  <div className="rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">إجراءات سريعة</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {quickActions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={index}
                            className="group relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 hover:border-white/20 transition-all duration-200 hover:scale-105"
                          >
                            <div className="relative z-10">
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 mx-auto group-hover:scale-110 transition-transform shadow-lg`}>
                                <Icon className="w-5 h-5 text-white" />
                              </div>
                              <p className="text-xs font-medium text-white/80">{action.label}</p>
                              {action.count && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                  {action.count}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Upcoming Events */}
                  <div className="rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">المناسبات القادمة</h3>
                    <div className="space-y-3">
                      {upcomingEvents.map((event, index) => (
                        <div key={index} className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-sm font-medium text-white">{event.title}</p>
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              {event.attendees} حضور
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-white/50">
                            <span className="flex items-center gap-1">
                              <CalendarDaysIcon className="w-3 h-3" />
                              {event.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" />
                              {event.time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Chart */}
              <div className="rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">الأداء الشهري</h3>
                    <p className="text-sm text-white/60 mt-1">إحصائيات المساهمات والنشاطات</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                      شهري
                    </button>
                    <button className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg">
                      سنوي
                    </button>
                  </div>
                </div>

                <div className="h-80 flex items-end justify-between gap-3">
                  {[65, 72, 48, 81, 93, 67, 84, 76, 88, 79, 92, 95].map((height, index) => (
                    <div key={index} className="flex-1 group relative">
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {height * 100} ر.س
                      </div>
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-purple-600 rounded-t-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-200 relative overflow-hidden"
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-xs text-white/40 mt-4">
                  {['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'].map((month, index) => (
                    <span key={index}>{month}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Other Sections */}
          {activeSection !== 'dashboard' && (
            <div className="animate-fadeIn">
              <div className="rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8">
                <h2 className="text-3xl font-bold text-white mb-4">
                  {menuItems.find(item => item.id === activeSection)?.label}
                </h2>
                <p className="text-white/60 mb-8">
                  هذا القسم قيد التطوير وسيتم إضافة المحتوى قريباً...
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-48 rounded-xl bg-slate-800/50 border border-white/10 animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.6s ease-out;
          }
        `
      }} />
    </div>
  );
};

export default React.memo(AlShuailDashboard);