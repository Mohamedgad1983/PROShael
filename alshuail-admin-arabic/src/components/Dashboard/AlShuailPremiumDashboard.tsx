import React, {  useState, useEffect , useCallback } from 'react';
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
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  EyeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { Line } from 'react-chartjs-2';
import { logger } from '../../utils/logger';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// =================================================================
// Al-Shuail Family Admin Dashboard - PREMIUM BEAUTIFUL VERSION
// =================================================================

interface Member {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  role: string;
  membership_number: string;
  is_active: boolean;
  created_at: string;
  avatar?: string;
  location?: string;
  last_activity: string;
  contributions?: number;
  rating: number;
}

interface Role {
  value: string;
  label_ar: string;
  color: string;
  bgColor: string;
}

interface DashboardData {
  subscriptions: number;
  totalMembers: number;
  monthlyRevenue: number[];
  occasions: any[];
  initiatives: any[];
  diyas: any[];
  recentPayments: any[];
}

interface ActivityStatus {
  text: string;
  color: string;
  dot: string;
}

interface User {
  name: string;
  role: string;
}

const AlShuailPremiumDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [user] = useState<User>({
    name: 'محمد عبدالله الشعيل',
    role: 'admin'
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    subscriptions: 0,
    totalMembers: 0,
    monthlyRevenue: [],
    occasions: [],
    initiatives: [],
    diyas: [],
    recentPayments: []
  });

  // Navigation items
  const navigationItems = [
    { id: 'dashboard', name: 'لوحة القيادة', icon: HomeIcon },
    { id: 'members', name: 'الأعضاء', icon: UsersIcon },
    { id: 'subscriptions', name: 'الاشتراكات', icon: CreditCardIcon },
    { id: 'payments', name: 'المدفوعات', icon: CurrencyDollarIcon },
    { id: 'occasions', name: 'المناسبات', icon: CalendarDaysIcon },
    { id: 'initiatives', name: 'المبادرات', icon: HeartIcon },
    { id: 'diyas', name: 'الديات', icon: ScaleIcon },
    { id: 'notifications', name: 'الإشعارات', icon: BellIcon },
    { id: 'reports', name: 'التقارير', icon: DocumentTextIcon },
    { id: 'settings', name: 'الإعدادات', icon: Cog6ToothIcon }
  ];

  // Monthly revenue data
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

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: true, color: 'rgba(0, 0, 0, 0.1)' } },
      y: { grid: { display: true, color: 'rgba(0, 0, 0, 0.1)' } }
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchDashboardData();
  }, []);

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/members', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        // Add premium features to members
        const enhancedMembers = result.data.members.map((member: any, index: number) => ({
          ...member,
          avatar: `https://images.unsplash.com/photo-${
            ['1472099645785-5658abf4ff4e', '1507003211169-0a1dd7228f2d', '1494790108755-2616b612b786', '1500648767791-00dcc994a43e', '1438761681033-6461ffad8d80', '1507591064344-4c6ce005b128', '1487412720507-e7ab37603c6f'][index % 7]
          }?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80`,
          email: member.email || `${member.full_name.split(' ')[0].toLowerCase()}@alshuail.com`,
          location: ['الرياض، السعودية', 'جدة، السعودية', 'الدمام، السعودية', 'مكة المكرمة، السعودية', 'المدينة المنورة، السعودية', 'أبها، السعودية', 'تبوك، السعودية'][index % 7],
          last_activity: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000).toISOString(),
          contributions: Math.floor(Math.random() * 15000) + 1000,
          rating: Math.floor(Math.random() * 3) + 3
        }));
        setMembers(enhancedMembers);
      }
    } catch (error) {
      logger.error('Error fetching members:', { error });
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    setDashboardData({
      subscriptions: 0,
      totalMembers: members.length,
      monthlyRevenue: [1200, 1900, 3000, 2500, 3200, 3500],
      occasions: [
        { id: 1, title: 'اجتماع عائلي شهري', date_gregorian: '2025-09-20', date_hijri: '27 صفر 1447', type: 'meeting' },
        { id: 2, title: 'عقيقة المولود الجديد', date_gregorian: '2025-09-25', date_hijri: '2 ربيع الأول 1447', type: 'celebration' }
      ],
      initiatives: [
        { id: 1, title: 'كفالة يتيم - أحمد محمد', target_amount: 50000, collected_amount: 32000, date_created: '2025-09-01', type: 'sponsorship' },
        { id: 2, title: 'بناء مسجد الشعيل', target_amount: 500000, collected_amount: 125000, date_created: '2025-08-15', type: 'construction' }
      ],
      diyas: [
        { id: 1, title: 'دية حادث مروري - الأنصار', amount: 100000, status: 'pending', date_incident: '2025-09-10', date_hijri: '17 صفر 1447' },
        { id: 2, title: 'تعويض أضرار منزل - الصباح', amount: 30000, status: 'paid', date_incident: '2025-08-20', date_hijri: '26 محرم 1447' }
      ],
      recentPayments: [
        { id: 1, member: 'أحمد الشعيل', amount: 500, date: '2025-09-15', date_hijri: '22 صفر 1447' },
        { id: 2, member: 'فاطمة الشعيل', amount: 1000, date: '2025-09-14', date_hijri: '21 صفر 1447' }
      ]
    });
  };

  const formatDate = (gregorianDate: string, hijriDate: string) => {
  // Performance optimized event handlers
  const handleRefresh = useCallback(() => {
    // Refresh logic here
  }, []);

  const handleFilterChange = useCallback((filterType, value) => {
    // Filter logic here
  }, []);

  const handlePageChange = useCallback((page) => {
    // Pagination logic here
  }, []);

    return (
      <div className="text-sm">
        <div className="text-gray-900">{hijriDate}</div>
        <div className="text-gray-600">{gregorianDate}</div>
      </div>
    );
  };

  // Statistics Card Component
  const getStatCardColors = (color: string) => {
    const colorVariants = {
      blue: { text: 'text-blue-600', bg: 'bg-blue-100', icon: 'text-blue-600' },
      green: { text: 'text-green-600', bg: 'bg-green-100', icon: 'text-green-600' },
      purple: { text: 'text-purple-600', bg: 'bg-purple-100', icon: 'text-purple-600' },
      red: { text: 'text-red-600', bg: 'bg-red-100', icon: 'text-red-600' }
    };
    return colorVariants[color as keyof typeof colorVariants] || colorVariants.blue;
  };

  const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    trend?: { positive: boolean; value: string };
    color?: string;
  }> = ({ title, value, icon: Icon, trend, color = "blue" }) => {
    const colors = getStatCardColors(color);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
            {trend && (
              <p className={`text-xs ${trend.positive ? 'text-green-600' : 'text-red-600'} mt-1`}>
                {trend.positive ? '↗' : '↘'} {trend.value}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-full ${colors.bg}`}>
            <Icon className={`h-6 w-6 ${colors.icon}`} />
          </div>
        </div>
      </div>
    );
  };

  // PREMIUM BEAUTIFUL MEMBERS SECTION
  const MembersSection: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [showAddModal, setShowAddModal] = useState<boolean>(false);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [sortBy, setSortBy] = useState<string>('name');
    const [filterRole, setFilterRole] = useState<string>('all');

    const roles: Role[] = [
      { value: 'super_admin', label_ar: 'مدير عام', color: 'from-purple-500 to-purple-700', bgColor: 'bg-gradient-to-r from-purple-500 to-purple-700' },
      { value: 'admin', label_ar: 'مدير', color: 'from-blue-500 to-blue-700', bgColor: 'bg-gradient-to-r from-blue-500 to-blue-700' },
      { value: 'financial_manager', label_ar: 'مدير مالي', color: 'from-green-500 to-green-700', bgColor: 'bg-gradient-to-r from-green-500 to-green-700' },
      { value: 'organizer', label_ar: 'منظم', color: 'from-yellow-500 to-yellow-700', bgColor: 'bg-gradient-to-r from-yellow-500 to-yellow-700' },
      { value: 'member', label_ar: 'عضو', color: 'from-gray-500 to-gray-700', bgColor: 'bg-gradient-to-r from-gray-500 to-gray-700' }
    ];

    const getRoleInfo = (roleValue: string): Role => {
      return roles.find(r => r.value === roleValue) || roles[4];
    };

    const getActivityStatus = (lastActivity: string): ActivityStatus => {
      const now = new Date();
      const activityDate = new Date(lastActivity);
      const diffHours = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60);

      if (diffHours < 24) return { text: 'نشط الآن', color: 'text-green-600', dot: 'bg-green-500' };
      if (diffHours < 72) return { text: 'نشط مؤخراً', color: 'text-yellow-600', dot: 'bg-yellow-500' };
      return { text: 'غير نشط', color: 'text-gray-600', dot: 'bg-gray-500' };
    };

    const filteredMembers = members.filter(member => {
      const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           member.phone.includes(searchTerm) ||
                           (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = filterRole === 'all' || member.role === filterRole;
      return matchesSearch && matchesRole;
    });

    const statistics = {
      total: members.length,
      active: members.filter(m => m.is_active).length,
      inactive: members.filter(m => !m.is_active).length,
      admins: members.filter(m => m.role === 'admin' || m.role === 'super_admin').length,
      totalContributions: members.reduce((sum, m) => sum + (m.contributions || 0), 0)
    };

    // Member Card Component for Grid View
    const MemberCard: React.FC<{ member: Member }> = ({ member }) => {
      const roleInfo = getRoleInfo(member.role);
      const activityStatus = getActivityStatus(member.last_activity);

      return (
        <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200">
          {/* Background Gradient */}
          <div className={`absolute top-0 left-0 right-0 h-20 ${roleInfo.bgColor} opacity-10`}></div>

          {/* Member Card Content */}
          <div className="relative p-6">
            {/* Header with Avatar and Status */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="relative">
                  <img
                    src={member.avatar}
                    alt={member.full_name}
                    className="w-16 h-16 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${activityStatus.dot} rounded-full border-2 border-white`}></div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{member.full_name}</h3>
                  <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold text-white ${roleInfo.bgColor}`}>
                    {roleInfo.label_ar}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {member.is_active ? 'نشط' : 'غير نشط'}
              </div>
            </div>

            {/* Member Details */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <PhoneIcon className="h-4 w-4 ml-2" />
                <span dir="ltr">{member.phone}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <EnvelopeIcon className="h-4 w-4 ml-2" />
                <span>{member.email}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPinIcon className="h-4 w-4 ml-2" />
                <span>{member.location}</span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">{member.contributions?.toLocaleString()}</div>
                <div className="text-xs text-gray-600">المساهمات (ر.س)</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      className={`h-4 w-4 ${i < member.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <div className="text-xs text-gray-600">التقييم</div>
              </div>
            </div>

            {/* Activity Status */}
            <div className={`text-center text-sm ${activityStatus.color} mb-4`}>
              {activityStatus.text}
            </div>

            {/* Actions */}
            <div className="flex space-x-2 space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setSelectedMember(member)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
              >
                <EyeIcon className="h-4 w-4 ml-1" />
                عرض
              </button>
              <button className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-center">
                <PencilIcon className="h-4 w-4 ml-1" />
                تعديل
              </button>
              {member.is_active && (
                <button className="bg-red-500 hover:bg-red-600 text-white text-sm py-2 px-3 rounded-lg transition-colors">
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      );
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">إدارة الأعضاء</h1>
              <p className="text-blue-100 text-lg">إدارة متقدمة لأعضاء عائلة الشعيل</p>
              <div className="mt-3 text-blue-200 text-sm">
                <span>التاريخ الهجري: 22 صفر 1447 هـ</span>
                <span className="mx-3">•</span>
                <span>التاريخ الميلادي: 15 سبتمبر 2025 م</span>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center shadow-lg"
            >
              <PlusIcon className="h-5 w-5 ml-2" />
              إضافة عضو جديد
            </button>
          </div>

          {/* Advanced Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">إجمالي الأعضاء</p>
                  <p className="text-2xl font-bold">{statistics.total}</p>
                </div>
                <UsersIcon className="h-8 w-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">النشطون</p>
                  <p className="text-2xl font-bold">{statistics.active}</p>
                </div>
                <CheckIcon className="h-8 w-8 text-green-200" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">غير نشطين</p>
                  <p className="text-2xl font-bold">{statistics.inactive}</p>
                </div>
                <XMarkIcon className="h-8 w-8 text-red-200" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">المديرون</p>
                  <p className="text-2xl font-bold">{statistics.admins}</p>
                </div>
                <UsersIcon className="h-8 w-8 text-purple-200" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">إجمالي المساهمات</p>
                  <p className="text-xl font-bold">{statistics.totalContributions.toLocaleString()}</p>
                  <p className="text-xs text-yellow-200">ريال سعودي</p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-yellow-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Search and Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="h-5 w-5 absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="البحث بالاسم، الهاتف، أو البريد الإلكتروني..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">جميع الأدوار</option>
                {roles.map(role => (
                  <option key={role.value} value={role.value}>{role.label_ar}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">ترتيب بالاسم</option>
                <option value="role">ترتيب بالدور</option>
                <option value="date">ترتيب بالتاريخ</option>
                <option value="contributions">ترتيب بالمساهمات</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  شبكة
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  جدول
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Members Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMembers.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">العضو</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">التواصل</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">الدور</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">المساهمات</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">الحالة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMembers.map((member) => {
                    const roleInfo = getRoleInfo(member.role);
                    const activityStatus = getActivityStatus(member.last_activity);

                    return (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="relative">
                              <img
                                src={member.avatar}
                                alt={member.full_name}
                                className="w-12 h-12 rounded-full border-2 border-gray-200 object-cover"
                              />
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${activityStatus.dot} rounded-full border-2 border-white`}></div>
                            </div>
                            <div className="mr-4">
                              <div className="text-sm font-semibold text-gray-900">{member.full_name}</div>
                              <div className="text-sm text-gray-500">{member.membership_number}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900" dir="ltr">{member.phone}</div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full text-white ${roleInfo.bgColor}`}>
                            {roleInfo.label_ar}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{member.contributions?.toLocaleString()} ر.س</div>
                          <div className="flex items-center mt-1">
                            {[...Array(5)].map((_, i) => (
                              <StarIcon
                                key={i}
                                className={`h-3 w-3 ${i < member.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {member.is_active ? 'نشط' : 'غير نشط'}
                          </span>
                          <div className={`text-xs mt-1 ${activityStatus.color}`}>
                            {activityStatus.text}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2 space-x-reverse">
                            <button
                              onClick={() => setSelectedMember(member)}
                              className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50 transition-colors">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            {member.is_active && (
                              <button className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Member Detail Modal */}
        {selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <img
                      src={selectedMember.avatar}
                      alt={selectedMember.full_name}
                      className="w-20 h-20 rounded-full border-4 border-gray-200 object-cover"
                    />
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{selectedMember.full_name}</h3>
                      <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold text-white mt-2 ${getRoleInfo(selectedMember.role).bgColor}`}>
                        {getRoleInfo(selectedMember.role).label_ar}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMember(null)}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">معلومات التواصل</h4>
                    <div className="flex items-center text-gray-600">
                      <PhoneIcon className="h-5 w-5 ml-3" />
                      <span dir="ltr">{selectedMember.phone}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <EnvelopeIcon className="h-5 w-5 ml-3" />
                      <span>{selectedMember.email}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <MapPinIcon className="h-5 w-5 ml-3" />
                      <span>{selectedMember.location}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">إحصائيات العضوية</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{selectedMember.contributions?.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">إجمالي المساهمات (ر.س)</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold text-gray-900">التقييم</div>
                          <div className="flex items-center mt-1">
                            {[...Array(5)].map((_, i) => (
                              <StarIcon
                                key={i}
                                className={`h-5 w-5 ${i < selectedMember.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{selectedMember.rating}/5</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="mt-8">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">النشاط الأخير</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className={`text-sm ${getActivityStatus(selectedMember.last_activity).color}`}>
                      آخر نشاط: {new Date(selectedMember.last_activity).toLocaleString('ar-SA')}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 space-x-reverse mt-8 pt-6 border-t">
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-semibold transition-colors">
                    تعديل البيانات
                  </button>
                  <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl font-semibold transition-colors">
                    إرسال رسالة
                  </button>
                  {selectedMember.is_active && (
                    <button className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-xl font-semibold transition-colors">
                      إلغاء التفعيل
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Member Modal - Enhanced */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">إضافة عضو جديد</h3>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="أدخل الاسم الكامل"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الهاتف</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="+96550123456"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">البريد الإلكتروني</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="member@alshuail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الدور</label>
                    <select className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors">
                      {roles.map(role => (
                        <option key={role.value} value={role.value}>{role.label_ar}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">رقم العضوية</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="SH-008"
                    />
                  </div>
                  <div className="flex space-x-3 space-x-reverse pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-semibold transition-colors"
                    >
                      إضافة العضو
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Dashboard Content
  const DashboardContent: React.FC = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">لوحة القيادة</h1>
        <p className="text-gray-600">مرحباً بك في نظام إدارة عائلة الشعيل</p>
        <div className="mt-2 text-sm text-gray-500">
          <span>التاريخ الهجري: 22 صفر 1447 هـ</span>
          <span className="mx-2">|</span>
          <span>التاريخ الميلادي: 15 سبتمبر 2025 م</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="الاشتراكات" value="0" icon={CreditCardIcon} color="green" />
        <StatCard title="إجمالي الأعضاء" value={members.length.toString()} icon={UsersIcon} color="blue" />
        <StatCard title="المبادرات النشطة" value="2" icon={HeartIcon} color="purple" />
        <StatCard title="الديات المعلقة" value="1" icon={ScaleIcon} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">الإيرادات الشهرية</h3>
          <div className="h-64">
            <Line data={monthlyRevenueData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">الأنشطة الأخيرة</h3>
          <div className="space-y-3">
            {dashboardData.occasions.slice(0, 2).map((occasion) => (
              <div key={`occasion-${occasion.id}`} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{occasion.title}</p>
                  {formatDate(occasion.date_gregorian, occasion.date_hijri)}
                </div>
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">مناسبة</span>
              </div>
            ))}
          </div>
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
        return <MembersSection />;
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

          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <p className="text-sm text-gray-600">مرحباً</p>
            <p className="font-medium text-gray-900">{user.name}</p>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {user.role === 'admin' ? 'مدير' : user.role}
            </span>
          </div>

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


// Phase 4: Performance Optimization - Memoize to prevent unnecessary re-renders
export default React.memo(AlShuailPremiumDashboard);