import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toHijri } from 'hijri-converter';
import {
  CalendarDaysIcon,
  SparklesIcon,
  UserGroupIcon,
  HeartIcon,
  GiftIcon,
  CakeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  CurrencyDollarIcon,
  UsersIcon,
  MapPinIcon,
  CalendarIcon,
  DocumentTextIcon,
  PhotoIcon,
  ShareIcon,
  BellIcon,
  StarIcon
} from '@heroicons/react/24/outline';

const OccasionsManagement = () => {
  const { user, canAccessModule } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    date_range: '',
    budget_range: ''
  });
  const [selectedOccasion, setSelectedOccasion] = useState(null);
  const [showOccasionModal, setShowOccasionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock occasions data
  const mockOccasions = [
    {
      id: 1,
      title: 'حفل زفاف أحمد الشعيل',
      title_en: 'Ahmed Al-Shuail Wedding',
      description: 'حفل زفاف كريم أحمد محمد الشعيل على كريمة عبدالله سعد الشعيل',
      type: 'wedding',
      status: 'upcoming',
      date: '2024-03-15',
      time: '20:00',
      hijri_date: toHijri(2024, 3, 15),
      location: 'قاعة الملك فهد للاحتفالات - الرياض',
      budget: 25000,
      spent_amount: 18500,
      attendees_expected: 150,
      attendees_confirmed: 120,
      organizer: 'لجنة المناسبات العائلية',
      created_by: 'أحمد محمد الشعيل',
      created_date: '2024-01-10',
      image_url: '/images/wedding-placeholder.jpg',
      rsvp_deadline: '2024-03-10',
      special_requirements: 'تجهيز قاعة للنساء منفصلة، خدمة شاي وقهوة عربية',
      contribution_target: 15000,
      contribution_collected: 12000,
      priority: 'high'
    },
    {
      id: 2,
      title: 'حفل تخرج فاطمة الشعيل',
      title_en: 'Fatima Al-Shuail Graduation',
      description: 'احتفال بتخرج فاطمة عبدالله الشعيل من كلية الطب',
      type: 'graduation',
      status: 'planning',
      date: '2024-05-20',
      time: '18:00',
      hijri_date: toHijri(2024, 5, 20),
      location: 'قاعة الاحتفالات - جامعة الملك سعود',
      budget: 8000,
      spent_amount: 2500,
      attendees_expected: 80,
      attendees_confirmed: 45,
      organizer: 'عائلة عبدالله الشعيل',
      created_by: 'فاطمة عبدالله الشعيل',
      created_date: '2024-01-25',
      image_url: '/images/graduation-placeholder.jpg',
      rsvp_deadline: '2024-05-15',
      special_requirements: 'كاميرا تصوير احترافية، هدايا تذكارية',
      contribution_target: 5000,
      contribution_collected: 3200,
      priority: 'medium'
    },
    {
      id: 3,
      title: 'ذكرى وفاة الوالد رحمه الله',
      title_en: 'Father Memorial',
      description: 'إحياء الذكرى السنوية لوفاة الوالد محمد الشعيل رحمه الله',
      type: 'memorial',
      status: 'completed',
      date: '2024-01-30',
      time: '15:00',
      hijri_date: toHijri(2024, 1, 30),
      location: 'مسجد الإمام محمد بن سعود - الرياض',
      budget: 5000,
      spent_amount: 4800,
      attendees_expected: 200,
      attendees_confirmed: 180,
      organizer: 'أبناء المرحوم محمد الشعيل',
      created_by: 'عبدالرحمن محمد الشعيل',
      created_date: '2024-01-05',
      image_url: '/images/memorial-placeholder.jpg',
      rsvp_deadline: '2024-01-25',
      special_requirements: 'تنظيم مأدبة غداء، توزيع مصاحف',
      contribution_target: 4000,
      contribution_collected: 4800,
      priority: 'high'
    },
    {
      id: 4,
      title: 'احتفال مولود جديد',
      title_en: 'New Baby Celebration',
      description: 'احتفال بقدوم المولود الجديد لعائلة سعد الشعيل',
      type: 'birth',
      status: 'cancelled',
      date: '2024-02-15',
      time: '16:00',
      hijri_date: toHijri(2024, 2, 15),
      location: 'منزل العائلة - الرياض',
      budget: 3000,
      spent_amount: 500,
      attendees_expected: 50,
      attendees_confirmed: 25,
      organizer: 'عائلة سعد الشعيل',
      created_by: 'سعد أحمد الشعيل',
      created_date: '2024-01-20',
      image_url: '/images/baby-placeholder.jpg',
      rsvp_deadline: '2024-02-10',
      special_requirements: 'تجهيز هدايا للأطفال، حلويات',
      contribution_target: 2000,
      contribution_collected: 800,
      priority: 'low'
    }
  ];

  useEffect(() => {
    if (canAccessModule('occasions')) {
      loadOccasionsData();
    }
  }, [filters]);

  const loadOccasionsData = async () => {
    setLoading(true);
    try {
      // Load mock data - replace with actual API calls
      setOccasions(mockOccasions);
    } catch (error) {
      console.error('Error loading occasions data:', error);
    } finally {
      setLoading(false);
    }
  };

  // RBAC Access Control
  if (!canAccessModule('occasions')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center" dir="rtl">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
            <ShieldExclamationIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">غير مصرح بالوصول</h2>
          <p className="text-gray-600 mb-6">
            ليس لديك صلاحية للوصول إلى قسم إدارة المناسبات. يتطلب هذا القسم صلاحيات مدير المناسبات أو المدير العام.
          </p>
          <div className="text-sm text-gray-500">
            الصلاحية الحالية: {user?.role || 'غير محدد'}
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const statistics = {
    total_occasions: occasions.length,
    upcoming_occasions: occasions.filter(o => o.status === 'upcoming').length,
    planning_occasions: occasions.filter(o => o.status === 'planning').length,
    completed_occasions: occasions.filter(o => o.status === 'completed').length,
    cancelled_occasions: occasions.filter(o => o.status === 'cancelled').length,
    total_budget: occasions.reduce((sum, o) => sum + o.budget, 0),
    total_spent: occasions.reduce((sum, o) => sum + o.spent_amount, 0),
    total_attendees: occasions.reduce((sum, o) => sum + o.attendees_expected, 0),
    total_contributions: occasions.reduce((sum, o) => sum + o.contribution_collected, 0)
  };

  // Filter occasions
  const filteredOccasions = occasions.filter(occasion => {
    const matchesSearch = !searchQuery ||
      occasion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      occasion.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      occasion.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      occasion.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !filters.status || occasion.status === filters.status;
    const matchesType = !filters.type || occasion.type === filters.type;

    return matchesSearch && matchesStatus && matchesType;
  });

  const formatHijriDate = (gregorianDate) => {
    try {
      const date = new Date(gregorianDate);
      const hijriDate = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
      return `${hijriDate.hy}/${hijriDate.hm}/${hijriDate.hd} هـ`;
    } catch (error) {
      return gregorianDate;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'upcoming':
        return <CalendarIcon className="w-5 h-5 text-blue-500" />;
      case 'planning':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'upcoming': return 'قادم';
      case 'planning': return 'قيد التخطيط';
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default: return 'غير محدد';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'wedding':
        return <HeartIcon className="w-6 h-6 text-pink-500" />;
      case 'graduation':
        return <StarIcon className="w-6 h-6 text-blue-500" />;
      case 'birth':
        return <CakeIcon className="w-6 h-6 text-green-500" />;
      case 'memorial':
        return <SparklesIcon className="w-6 h-6 text-purple-500" />;
      case 'engagement':
        return <GiftIcon className="w-6 h-6 text-red-500" />;
      default:
        return <CalendarDaysIcon className="w-6 h-6 text-gray-500" />;
    }
  };

  const getTypeText = (type) => {
    switch (type) {
      case 'wedding': return 'زفاف';
      case 'graduation': return 'تخرج';
      case 'birth': return 'مولود';
      case 'memorial': return 'ذكرى';
      case 'engagement': return 'خطوبة';
      default: return 'أخرى';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return 'عالية';
      case 'medium': return 'متوسطة';
      case 'low': return 'منخفضة';
      default: return 'غير محدد';
    }
  };

  // Statistics Cards Component
  const StatisticsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-6 mb-8">
      {/* Total Occasions */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">إجمالي المناسبات</p>
            <p className="text-3xl font-bold text-gray-900">{statistics.total_occasions}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
            <CalendarDaysIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Upcoming Occasions */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">القادمة</p>
            <p className="text-3xl font-bold text-blue-600">{statistics.upcoming_occasions}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Planning Occasions */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">قيد التخطيط</p>
            <p className="text-3xl font-bold text-yellow-600">{statistics.planning_occasions}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
            <ClockIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Completed Occasions */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">المكتملة</p>
            <p className="text-3xl font-bold text-green-600">{statistics.completed_occasions}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <CheckCircleIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Budget */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">إجمالي الميزانية</p>
            <p className="text-2xl font-bold text-purple-600">{statistics.total_budget.toLocaleString()} ريال</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
            <CurrencyDollarIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Spent */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">إجمالي المصروف</p>
            <p className="text-2xl font-bold text-red-600">{statistics.total_spent.toLocaleString()} ريال</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
            <CurrencyDollarIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Attendees */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">إجمالي الحضور</p>
            <p className="text-3xl font-bold text-indigo-600">{statistics.total_attendees}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <UsersIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Contributions */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">إجمالي المساهمات</p>
            <p className="text-2xl font-bold text-cyan-600">{statistics.total_contributions.toLocaleString()} ريال</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <GiftIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Budget Efficiency */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">كفاءة الميزانية</p>
            <p className="text-3xl font-bold text-teal-600">
              {statistics.total_budget > 0 ? ((statistics.total_spent / statistics.total_budget) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
            <DocumentTextIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );

  // Occasions Grid Component
  const OccasionsGrid = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <MagnifyingGlassIcon className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث بالعنوان أو الوصف أو المنظم أو المكان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white"
            >
              <option value="">جميع الحالات</option>
              <option value="upcoming">قادم</option>
              <option value="planning">قيد التخطيط</option>
              <option value="completed">مكتمل</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white"
            >
              <option value="">جميع الأنواع</option>
              <option value="wedding">زفاف</option>
              <option value="graduation">تخرج</option>
              <option value="birth">مولود</option>
              <option value="memorial">ذكرى</option>
              <option value="engagement">خطوبة</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="premium-btn flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            مناسبة جديدة
          </button>
        </div>
      </div>

      {/* Occasions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOccasions.map((occasion) => (
          <div key={occasion.id} className="glass-card hover:scale-105 transition-all duration-300 overflow-hidden">
            {/* Occasion Image */}
            <div className="h-48 bg-gradient-to-br from-pink-100 to-purple-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <div className="absolute top-4 right-4 flex gap-2">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(occasion.status)}`}>
                  {getStatusText(occasion.status)}
                </span>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(occasion.priority)}`}>
                  أولوية {getPriorityText(occasion.priority)}
                </span>
              </div>
              <div className="absolute bottom-4 left-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  {getTypeIcon(occasion.type)}
                </div>
              </div>
            </div>

            {/* Occasion Content */}
            <div className="p-6">
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{occasion.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{occasion.description}</p>
              </div>

              {/* Date and Location */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{occasion.date} - {occasion.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{formatHijriDate(occasion.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPinIcon className="w-4 h-4" />
                  <span className="line-clamp-1">{occasion.location}</span>
                </div>
              </div>

              {/* Budget and Attendees */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">الميزانية</p>
                  <p className="text-lg font-bold text-purple-600">{occasion.budget.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">مصروف: {occasion.spent_amount.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">الحضور</p>
                  <p className="text-lg font-bold text-blue-600">{occasion.attendees_confirmed}</p>
                  <p className="text-xs text-gray-500">متوقع: {occasion.attendees_expected}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>تقدم المساهمات</span>
                  <span>{((occasion.contribution_collected / occasion.contribution_target) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((occasion.contribution_collected / occasion.contribution_target) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{occasion.contribution_collected.toLocaleString()} ريال</span>
                  <span>الهدف: {occasion.contribution_target.toLocaleString()} ريال</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {setSelectedOccasion(occasion); setShowOccasionModal(true);}}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <EyeIcon className="w-4 h-4" />
                  عرض
                </button>
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200">
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200">
                  <ShareIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredOccasions.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <CalendarDaysIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مناسبات</h3>
          <p className="text-gray-500">لم يتم العثور على مناسبات تطابق المعايير المحددة</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات المناسبات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                <CalendarDaysIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">إدارة المناسبات</h1>
                <p className="text-sm text-gray-600">تنظيم ومتابعة المناسبات والاحتفالات العائلية</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">مرحباً، {user?.full_name || user?.name}</span>
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {(user?.full_name || user?.name || '').charAt(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <StatisticsCards />

        {/* Tab Navigation */}
        <div className="glass-card p-6 mb-8">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              نظرة عامة
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'calendar'
                  ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              التقويم
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'upcoming'
                  ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              المناسبات القادمة
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'archive'
                  ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              الأرشيف
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {(activeTab === 'overview' || activeTab === 'upcoming') && <OccasionsGrid />}
        {activeTab === 'calendar' && (
          <div className="glass-card p-8 text-center">
            <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">تقويم المناسبات قريباً</h3>
            <p className="text-gray-500">سيتم إضافة عرض التقويم التفاعلي قريباً</p>
          </div>
        )}
        {activeTab === 'archive' && (
          <div className="glass-card p-8 text-center">
            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">أرشيف المناسبات قريباً</h3>
            <p className="text-gray-500">سيتم إضافة أرشيف المناسبات المكتملة قريباً</p>
          </div>
        )}
      </div>

      {/* Add CSS Styles */}
      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glass-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.12);
        }

        .premium-btn {
          background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%);
          padding: 12px 24px;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          border: none;
          cursor: pointer;
        }

        .premium-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(236, 72, 153, 0.3);
        }

        .premium-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .premium-btn:hover::before {
          left: 100%;
        }

        .line-clamp-1 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
        }

        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      `}</style>
    </div>
  );
};

export default OccasionsManagement;