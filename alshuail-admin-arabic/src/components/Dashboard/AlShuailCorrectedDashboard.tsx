import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon,
  UsersIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  HeartIcon,
  ScaleIcon,
  BellIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  PlusIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import MembersManager from '../Members/MembersManager';
import './CompleteDashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// TypeScript interfaces
interface NavigationItem {
  id: string;
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface Occasion {
  id: number;
  title: string;
  date_gregorian: string;
  date_hijri: string;
  type: string;
}

interface Initiative {
  id: number;
  title: string;
  target_amount: number;
  collected_amount: number;
  date_created: string;
  type: string;
}

interface Diya {
  id: number;
  title: string;
  amount: number;
  status: string;
  date_incident: string;
  date_hijri: string;
}

interface Payment {
  id: number;
  member: string;
  amount: number;
  date: string;
  date_hijri: string;
}

interface DashboardData {
  subscriptions: number;
  totalMembers: number;
  monthlyRevenue: number[];
  occasions: Occasion[];
  initiatives: Initiative[];
  diyas: Diya[];
  recentPayments: Payment[];
}

// =================================================================
// Al-Shuail Family Admin Dashboard - Corrected Version with TypeScript
// =================================================================

const AlShuailCorrectedDashboard: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    subscriptions: 0,
    totalMembers: 7,
    monthlyRevenue: [],
    occasions: [],
    initiatives: [],
    diyas: [],
    recentPayments: []
  });

  // Hijri months for proper Arabic calendar support
  const hijriMonths = [
    'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية',
    'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
  ];

  const gregorianMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  // Correct navigation items based on Al-Shuail family requirements
  const navigationItems: NavigationItem[] = [
    { id: 'dashboard', name: 'لوحة القيادة', icon: HomeIcon },
    { id: 'members', name: 'الأعضاء', icon: UsersIcon },
    { id: 'subscriptions', name: 'الاشتراكات', icon: CreditCardIcon },
    { id: 'payments', name: 'المدفوعات', icon: CurrencyDollarIcon },
    { id: 'occasions', name: 'المناسبات', icon: CalendarDaysIcon }, // الفعاليات → المناسبات
    { id: 'initiatives', name: 'المبادرات', icon: HeartIcon },
    { id: 'diyas', name: 'الديات', icon: ScaleIcon }, // منفصل عن المبادرات
    { id: 'notifications', name: 'الإشعارات', icon: BellIcon },
    { id: 'reports', name: 'التقارير', icon: DocumentTextIcon },
    { id: 'settings', name: 'الإعدادات', icon: Cog6ToothIcon }
  ];

  // Monthly revenue data with Arabic months
  const monthlyRevenueData = {
    labels: ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية'],
    datasets: [
      {
        label: 'الإيرادات الشهرية',
        data: [1200, 1900, 3000, 2500, 3200, 3500],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4
      }
    ]
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // Sample data with correct categories
    setDashboardData({
      subscriptions: 0,
      totalMembers: 7,
      monthlyRevenue: [1200, 1900, 3000, 2500, 3200, 3500],
      occasions: [
        {
          id: 1,
          title: 'اجتماع عائلي شهري',
          date_gregorian: '2025-09-20',
          date_hijri: '27 صفر 1447',
          type: 'meeting'
        },
        {
          id: 2,
          title: 'عقيقة المولود الجديد',
          date_gregorian: '2025-09-25',
          date_hijri: '2 ربيع الأول 1447',
          type: 'celebration'
        }
      ],
      initiatives: [
        {
          id: 1,
          title: 'كفالة يتيم - أحمد محمد',
          target_amount: 50000,
          collected_amount: 32000,
          date_created: '2025-09-01',
          type: 'sponsorship'
        },
        {
          id: 2,
          title: 'بناء مسجد الشعيل',
          target_amount: 500000,
          collected_amount: 125000,
          date_created: '2025-08-15',
          type: 'construction'
        }
      ],
      diyas: [
        {
          id: 1,
          title: 'دية حادث مروري - الأنصار',
          amount: 100000,
          status: 'pending',
          date_incident: '2025-09-10',
          date_hijri: '17 صفر 1447'
        },
        {
          id: 2,
          title: 'تعويض أضرار منزل - الصباح',
          amount: 30000,
          status: 'paid',
          date_incident: '2025-08-20',
          date_hijri: '26 محرم 1447'
        }
      ],
      recentPayments: [
        { id: 1, member: 'أحمد الشعيل', amount: 500, date: '2025-09-15', date_hijri: '22 صفر 1447' },
        { id: 2, member: 'فاطمة الشعيل', amount: 1000, date: '2025-09-14', date_hijri: '21 صفر 1447' }
      ]
    });
  };

  // Helper function to format dates
  const formatDate = (gregorianDate: string, hijriDate: string) => {
    return (
      <div className="text-sm">
        <div className="text-gray-900">{hijriDate}</div>
        <div className="text-gray-600">{gregorianDate}</div>
      </div>
    );
  };

  // Statistics Card Component
  interface StatCardProps {
    title: string;
    value: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    trend?: {
      positive: boolean;
      value: string;
    };
    color?: string;
  }

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        text: 'text-blue-600',
        bg: 'bg-blue-100',
        icon: 'text-blue-600'
      },
      green: {
        text: 'text-green-600',
        bg: 'bg-green-100',
        icon: 'text-green-600'
      },
      purple: {
        text: 'text-purple-600',
        bg: 'bg-purple-100',
        icon: 'text-purple-600'
      },
      red: {
        text: 'text-red-600',
        bg: 'bg-red-100',
        icon: 'text-red-600'
      },
      orange: {
        text: 'text-orange-600',
        bg: 'bg-orange-100',
        icon: 'text-orange-600'
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, color = "blue" }) => {
    const colorClasses = getColorClasses(color);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className={`text-2xl font-bold ${colorClasses.text}`}>{value}</p>
            {trend && (
              <p className={`text-xs ${trend.positive ? 'text-green-600' : 'text-red-600'} mt-1 flex items-center gap-1`}>
                <span>{trend.positive ? '↗' : '↘'}</span>
                <span>{trend.value}</span>
              </p>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses.bg}`}>
            <Icon className={`h-6 w-6 ${colorClasses.icon}`} />
          </div>
        </div>
      </div>
    );
  };

  // Main Dashboard Content
  const DashboardContent = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">لوحة القيادة</h1>
        <p className="text-gray-600">مرحباً بك في نظام إدارة عائلة الشعيل</p>
        <div className="mt-2 text-sm text-gray-500">
          <span>التاريخ الهجري: 22 صفر 1447 هـ</span>
          <span className="mx-2">|</span>
          <span>التاريخ الميلادي: 15 سبتمبر 2025 م</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="الاشتراكات"
          value="0"
          icon={CreditCardIcon}
          trend={{ positive: false, value: "مقارنة بالشهر الماضي" }}
          color="green"
        />
        <StatCard
          title="إجمالي الأعضاء"
          value="7"
          icon={UsersIcon}
          trend={{ positive: true, value: "12% مقارنة بالشهر الماضي" }}
          color="blue"
        />
        <StatCard
          title="المبادرات النشطة"
          value="2"
          icon={HeartIcon}
          color="purple"
        />
        <StatCard
          title="الديات المعلقة"
          value="1"
          icon={ScaleIcon}
          color="red"
        />
      </div>

      {/* Charts and Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">الإيرادات الشهرية</h3>
          <div className="h-64">
            <Line data={monthlyRevenueData} options={chartOptions} />
          </div>
        </div>

        {/* Recent Activities - All Types */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">الأنشطة الأخيرة</h3>
          <div className="space-y-3">
            {/* المناسبات */}
            {dashboardData.occasions.slice(0, 2).map((occasion) => (
              <div key={`occasion-${occasion.id}`} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{occasion.title}</p>
                  {formatDate(occasion.date_gregorian, occasion.date_hijri)}
                </div>
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  مناسبة
                </span>
              </div>
            ))}

            {/* المبادرات */}
            {dashboardData.initiatives.slice(0, 1).map((initiative) => (
              <div key={`initiative-${initiative.id}`} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{initiative.title}</p>
                  <p className="text-sm text-gray-600">
                    الهدف: {initiative.target_amount.toLocaleString()} ر.س |
                    المحصل: {initiative.collected_amount.toLocaleString()} ر.س
                  </p>
                </div>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  مبادرة
                </span>
              </div>
            ))}

            {/* الديات */}
            {dashboardData.diyas.slice(0, 1).map((diya) => (
              <div key={`diya-${diya.id}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{diya.title}</p>
                  <p className="text-sm text-gray-600">
                    المبلغ: {diya.amount.toLocaleString()} ر.س
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  diya.status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {diya.status === 'paid' ? 'مدفوعة' : 'معلقة'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">إجراءات سريعة</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <button className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <PlusIcon className="h-5 w-5 ml-2" />
            إضافة عضو جديد
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <CalendarDaysIcon className="h-5 w-5 ml-2" />
            إنشاء مناسبة
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <HeartIcon className="h-5 w-5 ml-2" />
            إضافة مبادرة
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            <ScaleIcon className="h-5 w-5 ml-2" />
            تسجيل دية
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
            <BellIcon className="h-5 w-5 ml-2" />
            إرسال إشعار
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="h-2 w-2 bg-green-500 rounded-full ml-3"></div>
          <span className="text-green-800 text-sm font-medium">متصل (0 اشتراك)</span>
        </div>
        <button onClick={logout} className="mt-2 text-sm text-green-700 hover:text-green-900 underline">
          ← تسجيل الخروج
        </button>
      </div>
    </div>
  );

  // Occasions Section (المناسبات - not فعاليات)
  const OccasionsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">إدارة المناسبات</h1>
          <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <PlusIcon className="h-5 w-5 ml-2" />
            إضافة مناسبة جديدة
          </button>
        </div>

        <div className="space-y-4">
          {dashboardData.occasions.map((occasion) => (
            <div key={occasion.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">{occasion.title}</h3>
                <div className="mt-1">
                  {formatDate(occasion.date_gregorian, occasion.date_hijri)}
                </div>
              </div>
              <span className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full">
                {occasion.type === 'meeting' ? 'اجتماع' : 'احتفال'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Initiatives Section (المبادرات)
  const InitiativesSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">إدارة المبادرات</h1>
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <PlusIcon className="h-5 w-5 ml-2" />
            إضافة مبادرة جديدة
          </button>
        </div>

        <div className="space-y-4">
          {dashboardData.initiatives.map((initiative) => (
            <div key={initiative.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">{initiative.title}</h3>
                <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
                  {initiative.type === 'sponsorship' ? 'كفالة' : 'مشروع'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-sm text-gray-600">الهدف المالي</p>
                  <p className="font-medium">{initiative.target_amount.toLocaleString()} ر.س</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">المبلغ المحصل</p>
                  <p className="font-medium text-green-600">{initiative.collected_amount.toLocaleString()} ر.س</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(initiative.collected_amount / initiative.target_amount) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {Math.round((initiative.collected_amount / initiative.target_amount) * 100)}% مكتمل
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Diyas Section (الديات - منفصل)
  const DiyasSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">إدارة الديات</h1>
          <button className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            <PlusIcon className="h-5 w-5 ml-2" />
            تسجيل دية جديدة
          </button>
        </div>

        <div className="space-y-4">
          {dashboardData.diyas.map((diya) => (
            <div key={diya.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">{diya.title}</h3>
                <span className={`px-3 py-1 text-sm rounded-full ${
                  diya.status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {diya.status === 'paid' ? 'مدفوعة' : 'معلقة'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-sm text-gray-600">مبلغ الدية</p>
                  <p className="font-medium text-red-600">{diya.amount.toLocaleString()} ر.س</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">تاريخ الحادث</p>
                  {formatDate(diya.date_incident, diya.date_hijri)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render section content
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardContent />;
      case 'members':
        return <MembersManager />;
      case 'occasions':
        return <OccasionsSection />;
      case 'initiatives':
        return <InitiativesSection />;
      case 'diyas':
        return <DiyasSection />;
      default:
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {navigationItems.find(item => item.id === activeSection)?.name}
            </h1>
            <div className="text-center py-12 text-gray-500">
              سيتم تطوير هذا القسم قريباً...
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg border-l border-gray-200 min-h-screen">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">ش</span>
              </div>
              <div>
                <h2 className="font-bold text-gray-900">عائلة شعيل</h2>
                <p className="text-sm text-gray-600">العنزي</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <p className="text-sm text-gray-600">مرحباً</p>
            <p className="font-medium text-gray-900">{user?.name || 'محمد عبدالله الشعيل'}</p>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {user?.role === 'admin' ? 'مدير' : user?.role || 'مدير'}
            </span>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="البحث عن الأعضاء، المدفوعات، المناسبات..."
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="px-4">
            <ul className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-5 w-5 ml-3" />
                      {item.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {renderSectionContent()}
        </div>
      </div>
    </div>
  );
};

export default React.memo(AlShuailCorrectedDashboard);