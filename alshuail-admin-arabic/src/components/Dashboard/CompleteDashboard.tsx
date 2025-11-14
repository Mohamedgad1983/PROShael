import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ActivitiesManager from '../Activities/ActivitiesManager';
import MembersManager from '../Members/MembersManager';
import {
  HomeIcon,
  UsersIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CogIcon,
  BellIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  UserPlusIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { logger } from '../../utils/logger';

import './CompleteDashboard.css';

// Enhanced TypeScript interfaces with proper typing
interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles: ('member' | 'organizer' | 'admin')[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  action: () => void;
  roles: ('member' | 'organizer' | 'admin')[];
}

interface Activity {
  id: number;
  title: string;
  date: string;
  status: string;
}

interface DashboardData {
  totalMembers: number;
  activeActivities: number;
  monthlyRevenue: number;
  pendingPayments: number;
  recentActivities: Activity[];
  monthlyRevenueData: number[];
  notifications: number;
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CompleteDashboard = () => {
  const { user, logout, hasRole } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalMembers: 45,
    activeActivities: 9,
    monthlyRevenue: 15750,
    pendingPayments: 3,
    recentActivities: [] as Activity[],
    monthlyRevenueData: [12000, 15000, 18000, 16000, 15750, 14000],
    notifications: 5
  });
  const [loading, setLoading] = useState(true);

  const navigationItems: NavigationItem[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: HomeIcon, roles: ['member', 'organizer', 'admin'] },
    { id: 'members', label: 'إدارة الأعضاء', icon: UsersIcon, roles: ['admin'] },
    { id: 'activities', label: 'إدارة الأنشطة', icon: CalendarIcon, roles: ['organizer', 'admin'] },
    { id: 'finance', label: 'المالية', icon: CurrencyDollarIcon, roles: ['admin'] },
    { id: 'reports', label: 'التقارير', icon: ChartBarIcon, roles: ['organizer', 'admin'] },
    { id: 'documents', label: 'الوثائق', icon: DocumentTextIcon, roles: ['organizer', 'admin'] },
    { id: 'notifications', label: 'الإشعارات', icon: BellIcon, roles: ['member', 'organizer', 'admin'] },
    { id: 'settings', label: 'الإعدادات', icon: CogIcon, roles: ['admin'] }
  ];

  const quickActions: QuickAction[] = [
    { id: 'add-member', label: 'إضافة عضو جديد', icon: UserPlusIcon, action: () => setActiveSection('members'), roles: ['admin'] },
    { id: 'create-activity', label: 'إنشاء نشاط جديد', icon: PlusIcon, action: () => setActiveSection('activities'), roles: ['organizer', 'admin'] },
    { id: 'financial-report', label: 'تقرير مالي', icon: DocumentPlusIcon, action: () => setActiveSection('reports'), roles: ['admin'] },
    { id: 'view-analytics', label: 'عرض الإحصائيات', icon: ArrowTrendingUpIcon, action: () => setActiveSection('reports'), roles: ['organizer', 'admin'] }
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Simulate API calls - in real implementation, these would be actual API calls
        setTimeout(() => {
          setDashboardData(prev => ({
            ...prev,
            recentActivities: [
              { id: 1, title: 'رحلة عائلية إلى الطائف', date: '2025-09-20', status: 'مخطط' },
              { id: 2, title: 'جمعة خيرية للأيتام', date: '2025-09-15', status: 'نشط' },
              { id: 3, title: 'لقاء شهري للعائلة', date: '2025-09-10', status: 'مكتمل' }
            ]
          }));
          setLoading(false);
        }, 1000);
      } catch (error) {
        logger.error('Error fetching dashboard data:', { error });
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const chartData = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    datasets: [
      {
        label: 'الإيرادات الشهرية (ريال)',
        data: dashboardData.monthlyRevenueData,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: 'Cairo'
          }
        }
      },
      title: {
        display: true,
        text: 'الإيرادات الشهرية لعام 2025',
        font: {
          family: 'Cairo',
          size: 16
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            family: 'Cairo'
          }
        }
      },
      x: {
        ticks: {
          font: {
            family: 'Cairo'
          }
        }
      }
    },
  };

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>جاري تحميل البيانات...</p>
        </div>
      );
    }

    return (
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>مرحباً بك، {user?.name}</h1>
          <p>لوحة التحكم الرئيسية - تطبيق عائلة الشعيل</p>
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon members">
              <UsersIcon className="icon" />
            </div>
            <div className="stat-content">
              <h3>{dashboardData.totalMembers}</h3>
              <p>إجمالي الأعضاء</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon activities">
              <CalendarIcon className="icon" />
            </div>
            <div className="stat-content">
              <h3>{dashboardData.activeActivities}</h3>
              <p>الأنشطة النشطة</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon revenue">
              <CurrencyDollarIcon className="icon" />
            </div>
            <div className="stat-content">
              <h3>{dashboardData.monthlyRevenue.toLocaleString()} ريال</h3>
              <p>الإيرادات الشهرية</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending">
              <BellIcon className="icon" />
            </div>
            <div className="stat-content">
              <h3>{dashboardData.pendingPayments}</h3>
              <p>المدفوعات المعلقة</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-section">
          <h2>الإجراءات السريعة</h2>
          <div className="quick-actions-grid">
            {quickActions
              .filter(action => action.roles.some(role => hasRole(role)))
              .map(action => (
                <button
                  key={action.id}
                  className="quick-action-btn"
                  onClick={action.action}
                >
                  <action.icon className="action-icon" />
                  <span>{action.label}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Charts and Recent Activities */}
        <div className="dashboard-grid">
          <div className="chart-section">
            <h2>الإيرادات الشهرية</h2>
            <div className="chart-container">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="recent-activities-section">
            <h2>الأنشطة الأخيرة</h2>
            <div className="activities-list">
              {dashboardData.recentActivities.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-info">
                    <h4>{activity.title}</h4>
                    <p>{activity.date}</p>
                  </div>
                  <span className={`activity-status ${activity.status}`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboardContent();
      case 'members':
        return hasRole('admin') ? <MembersManager /> : <div className="access-denied">ليس لديك صلاحية للوصول لهذا القسم</div>;
      case 'activities':
        return (hasRole('organizer') || hasRole('admin')) ? <ActivitiesManager /> : <div className="access-denied">ليس لديك صلاحية للوصول لهذا القسم</div>;
      case 'finance':
        return hasRole('admin') ? (
          <div className="section-placeholder">
            <h2>قسم المالية</h2>
            <p>قيد التطوير - سيتم إضافة إدارة المالية قريباً</p>
          </div>
        ) : <div className="access-denied">ليس لديك صلاحية للوصول لهذا القسم</div>;
      case 'reports':
        return (hasRole('organizer') || hasRole('admin')) ? (
          <div className="section-placeholder">
            <h2>التقارير والإحصائيات</h2>
            <p>قيد التطوير - سيتم إضافة التقارير المفصلة قريباً</p>
          </div>
        ) : <div className="access-denied">ليس لديك صلاحية للوصول لهذا القسم</div>;
      case 'documents':
        return (hasRole('organizer') || hasRole('admin')) ? (
          <div className="section-placeholder">
            <h2>إدارة الوثائق</h2>
            <p>قيد التطوير - سيتم إضافة إدارة الوثائق قريباً</p>
          </div>
        ) : <div className="access-denied">ليس لديك صلاحية للوصول لهذا القسم</div>;
      case 'notifications':
        return (
          <div className="section-placeholder">
            <h2>الإشعارات</h2>
            <p>قيد التطوير - سيتم إضافة نظام الإشعارات قريباً</p>
          </div>
        );
      case 'settings':
        return hasRole('admin') ? (
          <div className="section-placeholder">
            <h2>إعدادات النظام</h2>
            <p>قيد التطوير - سيتم إضافة الإعدادات قريباً</p>
          </div>
        ) : <div className="access-denied">ليس لديك صلاحية للوصول لهذا القسم</div>;
      default:
        return renderDashboardContent();
    }
  };

  return (
    <div className="complete-dashboard" dir="rtl">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>تطبيق عائلة الشعيل</h2>
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0) || 'ع'}
            </div>
            <div className="user-details">
              <p className="user-name">{user?.name}</p>
              <p className="user-role">{user?.role}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigationItems
            .filter(item => item.roles.some(role => hasRole(role)))
            .map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                <item.icon className="nav-icon" />
                <span>{item.label}</span>
                {item.id === 'notifications' && dashboardData.notifications > 0 && (
                  <span className="notification-badge">{dashboardData.notifications}</span>
                )}
              </button>
            ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-container">
          {renderSectionContent()}
        </div>
      </div>
    </div>
  );
};

export default React.memo(CompleteDashboard);