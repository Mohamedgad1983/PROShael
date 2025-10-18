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
  MoonIcon,
  SunIcon,
  GiftIcon,
  HandRaisedIcon,
  LightBulbIcon,
  BookOpenIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { DesktopNavigation } from './DashboardNavigation';
import OverviewStats from './OverviewStats';
import OverviewCharts from './OverviewCharts';
import RecentActivities from './RecentActivities';
import styles from './styles';

// Type definitions
export type DashboardVariant = 'apple' | 'islamic' | 'premium' | 'simple' | 'complete';
export type ThemeMode = 'light' | 'dark';

export interface DashboardConfig {
  variant: DashboardVariant;
  theme?: ThemeMode;
  language?: 'ar' | 'en';
  hasCharts?: boolean;
  hasPrayerTimes?: boolean;
  sidebarCollapsible?: boolean;
  enableSearch?: boolean;
  enableNotifications?: boolean;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: string | number;
  description?: string;
}

export interface StatCard {
  id: string;
  title: string;
  value: string | number;
  trend: number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}

export interface UnifiedDashboardProps {
  config: DashboardConfig;
  onLogout?: () => void;
  onNavigate?: (section: string) => void;
}

// Default configurations for each variant
export const DASHBOARD_VARIANTS: Record<DashboardVariant, DashboardConfig> = {
  apple: {
    variant: 'apple',
    theme: 'light',
    language: 'ar',
    hasCharts: true,
    hasPrayerTimes: false,
    sidebarCollapsible: true,
    enableSearch: true,
    enableNotifications: true,
  },
  islamic: {
    variant: 'islamic',
    theme: 'light',
    language: 'ar',
    hasCharts: true,
    hasPrayerTimes: true,
    sidebarCollapsible: true,
    enableSearch: true,
    enableNotifications: true,
  },
  premium: {
    variant: 'premium',
    theme: 'light',
    language: 'ar',
    hasCharts: true,
    hasPrayerTimes: false,
    sidebarCollapsible: true,
    enableSearch: true,
    enableNotifications: true,
  },
  simple: {
    variant: 'simple',
    theme: 'light',
    language: 'ar',
    hasCharts: false,
    hasPrayerTimes: false,
    sidebarCollapsible: false,
    enableSearch: false,
    enableNotifications: true,
  },
  complete: {
    variant: 'complete',
    theme: 'light',
    language: 'ar',
    hasCharts: true,
    hasPrayerTimes: false,
    sidebarCollapsible: true,
    enableSearch: true,
    enableNotifications: true,
  },
};

const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({
  config,
  onLogout = () => console.log('Logout'),
  onNavigate = (section: string) => console.log('Navigate to:', section),
}) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(config.theme === 'dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Time updates
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Menu items for navigation
  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        id: 'dashboard',
        label: 'لوحة القيادة',
        icon: HomeIcon,
        description: 'نظرة شاملة على النظام',
      },
      {
        id: 'members',
        label: 'الأعضاء',
        icon: UsersIcon,
        badge: 1234,
        description: 'إدارة أعضاء العائلة',
      },
      {
        id: 'subscriptions',
        label: 'الاشتراكات',
        icon: CreditCardIcon,
        badge: 856,
        description: 'متابعة الاشتراكات',
      },
      {
        id: 'payments',
        label: 'المدفوعات',
        icon: BanknotesIcon,
        description: 'إدارة المعاملات المالية',
      },
      {
        id: 'occasions',
        label: 'المناسبات',
        icon: CalendarDaysIcon,
        badge: 12,
        description: 'تنظيم المناسبات',
      },
      {
        id: 'initiatives',
        label: 'المبادرات',
        icon: HeartIcon,
        badge: 5,
        description: 'المشاريع الخيرية',
      },
      {
        id: 'diyas',
        label: 'الديات',
        icon: ScaleIcon,
        badge: 3,
        description: 'إدارة الديات',
      },
      {
        id: 'notifications',
        label: 'الإشعارات',
        icon: BellIcon,
        badge: 8,
        description: 'التنبيهات والرسائل',
      },
    ],
    []
  );

  // Stats data
  const statsData: StatCard[] = useMemo(
    () => [
      {
        id: 'total-members',
        title: 'إجمالي الأعضاء',
        value: 1234,
        trend: 12.5,
        icon: UsersIcon,
        color: '#3B82F6',
      },
      {
        id: 'active-subscriptions',
        title: 'الاشتراكات النشطة',
        value: 856,
        trend: 8.2,
        icon: CreditCardIcon,
        color: '#10B981',
      },
      {
        id: 'total-payments',
        title: 'إجمالي المدفوعات',
        value: '245,678',
        trend: 23.1,
        icon: BanknotesIcon,
        color: '#F59E0B',
      },
      {
        id: 'upcoming-events',
        title: 'المناسبات القادمة',
        value: 12,
        trend: 3,
        icon: CalendarDaysIcon,
        color: '#EC4899',
      },
    ],
    []
  );

  // Recent activities
  const recentActivities = useMemo(
    () => [
      {
        user: 'محمد أحمد الشعيل',
        action: 'تم استلام دفعة الاشتراك الشهري',
        time: 'قبل 5 دقائق',
        amount: '500 ر.س',
      },
      {
        user: 'سارة محمد الشعيل',
        action: 'انضمت إلى العائلة',
        time: 'قبل ساعة',
      },
      {
        user: 'أحمد عبدالله الشعيل',
        action: 'زفاف - الأسبوع القادم',
        time: 'قبل 3 ساعات',
      },
      {
        user: 'خالد سعد الشعيل',
        action: 'مساهمة في مبادرة كفالة يتيم',
        time: 'قبل 5 ساعات',
        amount: '1,000 ر.س',
      },
    ],
    []
  );

  const handleNavigationSelect = (id: string) => {
    setActiveSection(id);
    onNavigate(id);
  };

  if (!mounted) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} dir="rtl">
      {/* Header */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={styles.mobileMenuButton}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <XMarkIcon style={{ width: '20px' }} /> : <Bars3Icon style={{ width: '20px' }} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SparklesIcon style={{ width: '28px', color: 'white' }} />
            </div>
            <div>
              <h1 style={{ margin: '0', fontSize: '20px', fontWeight: '600' }}>عائلة الشعيل</h1>
              <p style={{ margin: '0', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>نظام الإدارة المتكامل</p>
            </div>
          </div>
        </div>

        {/* Header Right Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {config.enableSearch && (
            <input
              type="text"
              placeholder="البحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                textAlign: 'right',
              }}
            />
          )}

          {config.enableNotifications && (
            <button
              style={{
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                position: 'relative',
              }}
              aria-label="Notifications"
            >
              <BellIcon style={{ width: '20px' }} />
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                3
              </span>
            </button>
          )}

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
            }}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <SunIcon style={{ width: '20px' }} /> : <MoonIcon style={{ width: '20px' }} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            <span style={{ fontSize: '14px' }}>محمد الشعيل</span>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              م
            </div>
          </div>

          <button
            onClick={onLogout}
            style={{
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
            }}
            aria-label="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div style={styles.mainLayout}>
        {/* Sidebar Navigation */}
        <aside style={{ ...styles.sidebar, width: sidebarOpen ? '280px' : '80px', transition: 'width 0.3s' }}>
          <DesktopNavigation
            items={menuItems}
            activeSection={activeSection}
            onSelect={handleNavigationSelect}
            logoSrc="https://via.placeholder.com/140"
            title="عائلة الشعيل"
            subtitle="نظام الإدارة"
          />
        </aside>

        {/* Main Content */}
        <main style={styles.content}>
          {activeSection === 'dashboard' && (
            <div>
              {/* Welcome Section */}
              <div style={{ marginBottom: '2rem', padding: '2rem', background: 'rgba(255,255,255,0.1)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <h2 style={{ margin: '0 0 1rem 0', fontSize: '24px' }}>مرحباً بعودتك، محمد! 👋</h2>
                <p style={{ margin: '0', color: 'rgba(255,255,255,0.8)', marginBottom: '1rem' }}>
                  إليك نظرة شاملة على أداء العائلة وآخر التحديثات
                </p>
              </div>

              {/* Stats Cards */}
              <OverviewStats stats={statsData} />

              {/* Charts Section */}
              {config.hasCharts && (
                <div style={{ marginTop: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>التحليلات والإحصائيات</h3>
                  <OverviewCharts
                    revenueData={{
                      labels: ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة'],
                      datasets: [
                        {
                          label: 'الإيرادات الشهرية',
                          data: [42000, 45000, 44500, 47000, 46500, 47500],
                          borderColor: 'rgba(59, 130, 246, 1)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          tension: 0.4,
                          fill: true,
                        },
                      ],
                    }}
                    memberDistribution={{
                      labels: ['الأعضاء النشطون', 'الأعضاء الجدد', 'الأعضاء المعلقون'],
                      datasets: [
                        {
                          data: [142, 8, 6],
                          backgroundColor: [
                            'rgba(59, 130, 246, 0.9)',
                            'rgba(139, 92, 246, 0.9)',
                            'rgba(245, 158, 11, 0.9)',
                          ],
                          borderWidth: 0,
                        },
                      ],
                    }}
                    chartOptions={{
                      responsive: true,
                      plugins: {
                        legend: {
                          labels: { color: 'rgba(255, 255, 255, 0.8)' },
                        },
                      },
                      scales: {
                        y: {
                          ticks: { color: 'rgba(255, 255, 255, 0.8)' },
                          grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        },
                        x: {
                          ticks: { color: 'rgba(255, 255, 255, 0.8)' },
                          grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        },
                      },
                    }}
                  />
                </div>
              )}

              {/* Recent Activities */}
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>النشاطات الأخيرة</h3>
                <RecentActivities activities={recentActivities} />
              </div>
            </div>
          )}

          {activeSection !== 'dashboard' && (
            <div style={styles.emptyState}>
              <div style={styles.emptyStateIcon}>
                <ChartBarIcon style={{ width: '80px', height: '80px' }} />
              </div>
              <h2 style={{ fontSize: '24px', marginBottom: '1rem' }}>
                {menuItems.find((m) => m.id === activeSection)?.label}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>هذا القسم قيد التطوير وسيتم إضافة المحتوى قريباً...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default UnifiedDashboard;
