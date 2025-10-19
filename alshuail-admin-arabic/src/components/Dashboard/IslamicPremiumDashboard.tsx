import React, { useState, useEffect, useRef } from 'react';
import {
  HomeIcon,
  UsersIcon,
  CreditCardIcon,
  BanknotesIcon,
  CalendarIcon,
  LightBulbIcon,
  ChartBarIcon,
  BellIcon,
  MoonIcon,
  SunIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
  StarIcon,
  HeartIcon,
  GlobeAltIcon,
  BookOpenIcon,
  GiftIcon,
  HandRaisedIcon
} from '@heroicons/react/24/outline';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import '../../styles/ultra-premium-islamic-design.css';

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  monthlyContributions: number;
  totalBalance: number;
  upcomingEvents: number;
  pendingPayments: number;
  completedInitiatives: number;
  activeInitiatives: number;
}

const IslamicPremiumDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentHijriDate, setCurrentHijriDate] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 156,
    activeMembers: 142,
    monthlyContributions: 47500,
    totalBalance: 285600,
    upcomingEvents: 8,
    pendingPayments: 12,
    completedInitiatives: 24,
    activeInitiatives: 6
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulated Hijri date
  useEffect(() => {
    const hijriMonths = [
      'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة',
      'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
    ];
    const today = new Date();
    const hijriMonth = hijriMonths[today.getMonth()];
    const hijriYear = 1446;
    setCurrentHijriDate(`${today.getDate()} ${hijriMonth} ${hijriYear} هـ`);
  }, []);

  // Chart configuration
  const contributionChartData = {
    labels: ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة'],
    datasets: [
      {
        label: 'المساهمات الشهرية',
        data: [42000, 45000, 44500, 47000, 46500, 47500],
        borderColor: 'rgba(0, 168, 107, 1)',
        backgroundColor: 'rgba(0, 168, 107, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const memberDistributionData = {
    labels: ['الأعضاء النشطون', 'الأعضاء الجدد', 'الأعضاء المعلقون'],
    datasets: [
      {
        data: [142, 8, 6],
        backgroundColor: [
          'rgba(0, 168, 107, 0.9)',
          'rgba(88, 86, 214, 0.9)',
          'rgba(245, 158, 11, 0.9)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const navigationItems = [
    { id: 'overview', label: 'لوحة القيادة', icon: HomeIcon, badge: null },
    { id: 'members', label: 'إدارة الأعضاء', icon: UsersIcon, badge: '156' },
    { id: 'payments', label: 'المدفوعات', icon: CreditCardIcon, badge: '12' },
    { id: 'subscriptions', label: 'الاشتراكات', icon: BanknotesIcon, badge: null },
    { id: 'events', label: 'المناسبات', icon: CalendarIcon, badge: '8' },
    { id: 'initiatives', label: 'المبادرات', icon: LightBulbIcon, badge: '6' },
    { id: 'reports', label: 'التقارير', icon: ChartBarIcon, badge: null },
    { id: 'diyas', label: 'الديات', icon: HandRaisedIcon, badge: null },
  ];

  const renderStatCard = (
    icon: React.ReactNode,
    title: string,
    value: string | number,
    change: string,
    isPositive: boolean,
    gradient: string
  ) => (
    <div className="glass-card-premium stat-badge-premium group">
      <div className="flex items-center justify-between mb-4">
        <div className={`icon-wrapper-gradient ${gradient}`} style={{ background: `var(${gradient})` }}>
          {icon}
        </div>
        <div className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </div>
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full progress-bar-fill"
          style={{ width: `${isPositive ? '75%' : '45%'}`, background: `var(${gradient})` }}
        />
      </div>
    </div>
  );

  const renderPrayerTimes = () => {
    const prayers = [
      { name: 'الفجر', time: '04:45', isPassed: true },
      { name: 'الشروق', time: '06:02', isPassed: true },
      { name: 'الظهر', time: '11:52', isPassed: false },
      { name: 'العصر', time: '15:08', isPassed: false },
      { name: 'المغرب', time: '17:41', isPassed: false },
      { name: 'العشاء', time: '19:11', isPassed: false },
    ];

    return (
      <div className="glass-card-premium p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">أوقات الصلاة</h3>
          <MoonIcon className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="space-y-3">
          {prayers.map((prayer, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className={`text-sm ${prayer.isPassed ? 'text-gray-400' : 'text-gray-700'}`}>
                {prayer.name}
              </span>
              <span className={`text-sm font-medium ${prayer.isPassed ? 'text-gray-400' : 'text-indigo-600'}`}>
                {prayer.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50" dir="rtl">
      {/* Islamic Pattern Overlay */}
      <div className="islamic-pattern-overlay" />

      {/* Premium Header */}
      <header className="header-gradient-pattern relative z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-white/20 transition-all duration-300"
              >
                {sidebarOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
              </button>

              {/* Logo and Title */}
              <div className="flex items-center gap-3">
                <div className="icon-wrapper-gradient" style={{ background: 'var(--gradient-islamic)' }}>
                  <StarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    نظام إدارة عائلة الشعيل
                  </h1>
                  <p className="text-sm text-gray-600">منصة إدارية متميزة بتصميم إسلامي</p>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-4">
              {/* Hijri Date Display */}
              <div className="glass-card-premium px-4 py-2 floating-element">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm font-medium text-gray-700">{currentHijriDate}</span>
                </div>
              </div>

              {/* Time Display */}
              <div className="glass-card-premium px-4 py-2">
                <span className="text-sm font-medium text-gray-700">
                  {currentTime.toLocaleTimeString('ar-SA')}
                </span>
              </div>

              {/* Notifications */}
              <button className="relative p-3 rounded-lg hover:bg-white/20 transition-all duration-300">
                <BellIcon className="w-6 h-6" />
                <span className="notification-badge">5</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-3 rounded-lg hover:bg-white/20 transition-all duration-300"
              >
                {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
              </button>

              {/* User Profile */}
              <div className="flex items-center gap-3 glass-card-premium px-4 py-2">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">محمد الشعيل</p>
                  <p className="text-xs text-gray-600">مدير النظام</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  م
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative z-10">
        {/* Premium Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 h-screen sticky top-0`}>
          <div className="glass-card-premium h-full m-4 p-4">
            <nav className="space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group
                    ${activeTab === item.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                      : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'animate-pulse' : ''}`} />
                    {sidebarOpen && <span className="font-medium">{item.label}</span>}
                  </div>
                  {sidebarOpen && item.badge && (
                    <span className={`px-2 py-1 text-xs rounded-full font-bold
                      ${activeTab === item.id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          {/* Quick Stats Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">الإحصائيات السريعة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {renderStatCard(
                <UsersIcon className="w-6 h-6 text-white" />,
                'إجمالي الأعضاء',
                stats.totalMembers,
                '+8.5%',
                true,
                '--gradient-islamic'
              )}
              {renderStatCard(
                <BanknotesIcon className="w-6 h-6 text-white" />,
                'المساهمات الشهرية',
                `${stats.monthlyContributions.toLocaleString()} ريال`,
                '+12.3%',
                true,
                '--gradient-premium'
              )}
              {renderStatCard(
                <CalendarIcon className="w-6 h-6 text-white" />,
                'المناسبات القادمة',
                stats.upcomingEvents,
                '8 هذا الشهر',
                true,
                '--gradient-royal'
              )}
              {renderStatCard(
                <LightBulbIcon className="w-6 h-6 text-white" />,
                'المبادرات النشطة',
                stats.activeInitiatives,
                '6 مبادرات',
                true,
                '--gradient-sunset'
              )}
            </div>
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Contribution Chart */}
            <div className="lg:col-span-2 glass-card-premium p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">المساهمات الشهرية</h3>
                <select className="input-premium py-2 px-4 text-sm">
                  <option>السنة الحالية</option>
                  <option>الستة أشهر الماضية</option>
                  <option>الثلاثة أشهر الماضية</option>
                </select>
              </div>
              <Line data={contributionChartData} options={{ responsive: true, maintainAspectRatio: false }} height={250} />
            </div>

            {/* Member Distribution */}
            <div className="glass-card-premium p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">توزيع الأعضاء</h3>
              <Doughnut data={memberDistributionData} options={{ responsive: true, maintainAspectRatio: false }} height={250} />
            </div>
          </div>

          {/* Additional Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Prayer Times */}
            {renderPrayerTimes()}

            {/* Recent Activities */}
            <div className="glass-card-premium p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">النشاطات الأخيرة</h3>
                <SparklesIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div className="space-y-3">
                {[
                  { type: 'payment', text: 'دفع أحمد الشعيل اشتراك شهر رجب', time: 'قبل 5 دقائق' },
                  { type: 'member', text: 'انضم عضو جديد: سارة الشعيل', time: 'قبل ساعة' },
                  { type: 'event', text: 'تم إنشاء مناسبة: حفل التخرج', time: 'قبل 3 ساعات' },
                  { type: 'initiative', text: 'اكتملت مبادرة: صدقة رمضان', time: 'أمس' },
                ].map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mt-2" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{activity.text}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-card-premium p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">إجراءات سريعة</h3>
                <GiftIcon className="w-5 h-5 text-green-600" />
              </div>
              <div className="space-y-3">
                <button className="btn-gradient-premium w-full py-3 text-sm">
                  إضافة عضو جديد
                </button>
                <button className="btn-gradient-premium w-full py-3 text-sm" style={{ background: 'var(--gradient-islamic)' }}>
                  تسجيل دفعة
                </button>
                <button className="btn-gradient-premium w-full py-3 text-sm" style={{ background: 'var(--gradient-royal)' }}>
                  إنشاء مناسبة
                </button>
                <button className="btn-gradient-premium w-full py-3 text-sm" style={{ background: 'var(--gradient-sunset)' }}>
                  عرض التقارير
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default React.memo(IslamicPremiumDashboard);