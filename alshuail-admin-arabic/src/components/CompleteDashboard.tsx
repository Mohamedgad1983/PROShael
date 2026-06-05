import {
ArrowTrendingUpIcon,BanknotesIcon,Bars3Icon,CalendarIcon,ChartBarIcon,ClockIcon,CogIcon,CreditCardIcon,DocumentTextIcon,HomeIcon,LightBulbIcon,ScaleIcon,UserGroupIcon,UsersIcon,XMarkIcon
} from '@heroicons/react/24/outline';
import {
ArcElement,CategoryScale,Chart as ChartJS,Legend,LinearScale,LineElement,PointElement,Title,
Tooltip
} from 'chart.js';
import React,{ useState } from 'react';
import { Doughnut,Line } from 'react-chartjs-2';
import FinancialReportsSimple from './Reports/FinancialReportsSimple';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Type definitions
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: number;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
}

interface PlaceholderSectionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Activity {
  type: 'payment' | 'member' | 'occasion' | 'initiative';
  user: string;
  action: string;
  time: string;
  amount: string | null;
}

// Glass Card Component
const GlassCard: React.FC<GlassCardProps> = ({ children, className = "" }) => (
  <div className={`bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-6 ${className}`}>
    {children}
  </div>
);

// Stat Card Component
const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, trend }) => (
  <GlassCard className="text-center transform hover:scale-105 transition-all duration-300">
    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center`}>
      <Icon className="w-8 h-8 text-white" />
    </div>
    <h3 className="text-white/60 text-sm font-medium mb-2">{title}</h3>
    <div className="text-2xl font-bold text-white mb-2">{value}</div>
    {trend && (
      <div className={`text-xs ${trend > 0 ? 'text-green-400' : 'text-red-400'} flex items-center justify-center gap-1`}>
        <ArrowTrendingUpIcon className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
        {Math.abs(trend)}%
      </div>
    )}
  </GlassCard>
);

// Navigation Menu Items
const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: HomeIcon, path: '/dashboard' },
  { id: 'members', label: 'الأعضاء', icon: UsersIcon, path: '/members' },
  { id: 'subscriptions', label: 'الاشتراكات', icon: CreditCardIcon, path: '/subscriptions' },
  { id: 'payments', label: 'المدفوعات', icon: BanknotesIcon, path: '/payments' },
  { id: 'occasions', label: 'المناسبات', icon: CalendarIcon, path: '/occasions' },
  { id: 'initiatives', label: 'المبادرات', icon: LightBulbIcon, path: '/initiatives' },
  { id: 'diyas', label: 'الديات', icon: ScaleIcon, path: '/diyas' },
  { id: 'reports', label: 'التقارير', icon: DocumentTextIcon, path: '/reports' },
  { id: 'settings', label: 'الإعدادات', icon: CogIcon, path: '/settings' }
];

// Sidebar Component
const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, activeSection, setActiveSection }) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full w-80 bg-white/[0.03] backdrop-blur-xl border-l border-white/10
        transform transition-transform duration-300 z-50
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:translate-x-0 lg:static lg:w-72 xl:w-80
      `}>
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">عائلة الشعيل</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-white/60 hover:text-white"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <p className="text-white/40 text-sm mt-2">نظام إدارة العائلة</p>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-4 px-4 py-3 rounded-xl text-right transition-all duration-200
                  ${isActive
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
                  }
                `}
              >
                <Icon className="w-5 h-5 ml-auto" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Status */}
        <div className="absolute bottom-4 left-4 right-4">
          <GlassCard className="text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-500 flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            <p className="text-white/60 text-xs">متصل</p>
            <p className="text-white text-sm font-medium">مدير النظام</p>
          </GlassCard>
        </div>
      </div>
    </>
  );
};

// Dashboard Content Component
const DashboardContent: React.FC = () => {
  // Sample data for charts
  const revenueData = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    datasets: [{
      label: 'الإيرادات الشهرية',
      data: [15000, 20000, 18000, 25000, 22000, 28000],
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  const memberDistribution = {
    labels: ['أعضاء نشطين', 'أعضاء غير نشطين', 'أعضاء جدد'],
    datasets: [{
      data: [35, 8, 12],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(168, 85, 247, 0.8)'
      ],
      borderWidth: 0
    }]
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            family: 'Tajawal'
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  const activities: Activity[] = [
    { type: 'payment', user: 'أحمد الشعيل', action: 'دفع اشتراك شهري', time: 'منذ ساعتين', amount: '500 ريال' },
    { type: 'member', user: 'فاطمة الشعيل', action: 'انضمام عضو جديد', time: 'منذ 4 ساعات', amount: null },
    { type: 'occasion', user: 'محمد الشعيل', action: 'تنظيم مناسبة عائلية', time: 'منذ يوم', amount: null },
    { type: 'initiative', user: 'سارة الشعيل', action: 'مساهمة في مبادرة خيرية', time: 'منذ يومين', amount: '1000 ريال' }
  ];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="المدفوعات المعلقة"
          value="8"
          icon={ClockIcon}
          color="from-green-500 to-emerald-600"
          trend={-12}
        />
        <StatCard
          title="الإيرادات الشهرية"
          value="25,000 ريال"
          icon={BanknotesIcon}
          color="from-blue-500 to-cyan-600"
          trend={18}
        />
        <StatCard
          title="الأنشطة النشطة"
          value="12"
          icon={ChartBarIcon}
          color="from-pink-500 to-rose-600"
          trend={8}
        />
        <StatCard
          title="إجمالي الأعضاء"
          value="45"
          icon={UserGroupIcon}
          color="from-purple-500 to-indigo-600"
          trend={5}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <GlassCard>
          <h3 className="text-xl font-bold text-white mb-6 text-right">الإيرادات الشهرية</h3>
          <div className="h-64">
            <Line data={revenueData} options={chartOptions} />
          </div>
        </GlassCard>

        {/* Member Distribution */}
        <GlassCard>
          <h3 className="text-xl font-bold text-white mb-6 text-right">توزيع الأعضاء</h3>
          <div className="h-64">
            <Doughnut data={memberDistribution} options={chartOptions} />
          </div>
        </GlassCard>
      </div>

      {/* Recent Activities */}
      <GlassCard>
        <h3 className="text-xl font-bold text-white mb-6 text-right">الأنشطة الحديثة</h3>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/5">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activity.type === 'payment' ? 'bg-green-500/20 text-green-400' :
                  activity.type === 'member' ? 'bg-blue-500/20 text-blue-400' :
                  activity.type === 'occasion' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {activity.type === 'payment' ? '💰' :
                   activity.type === 'member' ? '👤' :
                   activity.type === 'occasion' ? '📅' : '🎯'}
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{activity.user}</p>
                  <p className="text-white/60 text-sm">{activity.action}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-white/40 text-xs">{activity.time}</p>
                {activity.amount && (
                  <p className="text-green-400 text-sm font-medium">{activity.amount}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};

// Placeholder components for other sections
const PlaceholderSection: React.FC<PlaceholderSectionProps> = ({ title, description, icon: Icon }) => (
  <div className="flex items-center justify-center h-96">
    <GlassCard className="text-center max-w-md">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-white/60 mb-4">{description}</p>
      <button className="px-6 py-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-400/30 hover:bg-blue-500/30 transition-colors">
        قيد التطوير
      </button>
    </GlassCard>
  </div>
);

// Main Dashboard Component
const CompleteDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {

    switch(activeSection) {
      case 'dashboard':
        return <DashboardContent />;
      case 'members':
        return <PlaceholderSection title="الأعضاء" description="عرض وإدارة أعضاء العائلة" icon={UsersIcon} />;
      case 'subscriptions':
        return <PlaceholderSection title="الاشتراكات" description="إدارة خطط الاشتراكات والمدفوعات" icon={CreditCardIcon} />;
      case 'payments':
        return <PlaceholderSection title="المدفوعات" description="تتبع وإدارة جميع المدفوعات" icon={BanknotesIcon} />;
      case 'occasions':
        return <PlaceholderSection title="المناسبات" description="تنظيم وإدارة المناسبات العائلية" icon={CalendarIcon} />;
      case 'initiatives':
        return <PlaceholderSection title="المبادرات" description="إدارة المبادرات الخيرية والمشاريع" icon={LightBulbIcon} />;
      case 'diyas':
        return <PlaceholderSection title="الديات" description="إدارة الديات والتعويضات التقليدية" icon={ScaleIcon} />;
      case 'reports':
        return <FinancialReportsSimple />;
      case 'settings':
        return <PlaceholderSection title="الإعدادات" description="إعدادات النظام والتفضيلات" icon={CogIcon} />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" dir="rtl">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white/[0.03] backdrop-blur-xl border-b border-white/10">
        <h1 className="text-xl font-bold text-white">لوحة تحكم الشعيل</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onLogout}
            className="text-white/70 hover:text-white px-3 py-1 text-sm"
          >
            خروج
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/70 hover:text-white"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />

        {/* Main Content */}
        <div className="flex-1 lg:mr-72 xl:mr-80">
          <div className="p-6 lg:p-8">
            {/* Desktop Header */}
            <div className="hidden lg:flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  مرحباً بك في لوحة التحكم
                </h1>
                <p className="text-white/60">
                  نظام إدارة عائلة الشعيل - نظرة شاملة على الأنشطة والمالية
                </p>
              </div>
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg border border-red-400/30 hover:bg-red-500/30 transition-colors"
              >
                تسجيل الخروج
              </button>
            </div>

            {/* Content */}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteDashboard;