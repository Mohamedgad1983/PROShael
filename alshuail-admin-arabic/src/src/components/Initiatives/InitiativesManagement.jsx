import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toHijri } from 'hijri-converter';
import {
  HandRaisedIcon,
  HeartIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  TrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  CalendarIcon,
  MapPinIcon,
  DocumentTextIcon,
  PhotoIcon,
  BellIcon,
  GiftIcon,
  ShieldExclamationIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
  // MedicalBag, // This icon doesn't exist, commenting out
  HomeIcon,
  StarIcon
} from '@heroicons/react/24/outline';

const InitiativesManagement = () => {
  const { user, canAccessModule } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    funding_status: ''
  });
  const [selectedInitiative, setSelectedInitiative] = useState(null);
  const [showInitiativeModal, setShowInitiativeModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock initiatives data
  const mockInitiatives = [
    {
      id: 1,
      title: 'مبادرة كسوة الشتاء',
      title_en: 'Winter Clothing Initiative',
      description: 'توزيع ملابس شتوية للأسر المحتاجة في منطقة الرياض والمناطق المجاورة',
      category: 'charity',
      status: 'active',
      priority: 'high',
      funding_status: 'partially_funded',
      target_amount: 50000,
      collected_amount: 32000,
      target_beneficiaries: 200,
      current_beneficiaries: 120,
      start_date: '2024-01-01',
      end_date: '2024-03-31',
      hijri_start: toHijri(2024, 1, 1),
      hijri_end: toHijri(2024, 3, 31),
      organizer: 'لجنة الأعمال الخيرية',
      manager: 'أحمد محمد الشعيل',
      location: 'الرياض ومناطق مختلفة',
      image_url: '/images/winter-clothes.jpg',
      created_date: '2023-12-15',
      contributors_count: 45,
      volunteers_count: 15,
      progress_percentage: 64,
      impact_report: 'تم توزيع 1200 قطعة ملابس حتى الآن',
      next_milestone: 'توزيع الدفعة الثانية في فبراير',
      tags: ['خيرية', 'ملابس', 'شتاء', 'أسر محتاجة']
    },
    {
      id: 2,
      title: 'مبادرة تعليم القرآن الكريم',
      title_en: 'Quran Education Initiative',
      description: 'برنامج تعليم القرآن الكريم للأطفال والكبار مع معلمين متخصصين',
      category: 'education',
      status: 'planning',
      priority: 'medium',
      funding_status: 'seeking_funding',
      target_amount: 30000,
      collected_amount: 8500,
      target_beneficiaries: 100,
      current_beneficiaries: 0,
      start_date: '2024-02-15',
      end_date: '2024-12-31',
      hijri_start: toHijri(2024, 2, 15),
      hijri_end: toHijri(2024, 12, 31),
      organizer: 'قسم التعليم والثقافة',
      manager: 'فاطمة عبدالله الشعيل',
      location: 'مسجد الحي ومراكز تعليمية',
      image_url: '/images/quran-education.jpg',
      created_date: '2024-01-10',
      contributors_count: 12,
      volunteers_count: 8,
      progress_percentage: 28,
      impact_report: 'تم إعداد المناهج والمواد التعليمية',
      next_milestone: 'بدء التسجيل للطلاب في فبراير',
      tags: ['تعليم', 'قرآن', 'أطفال', 'دين']
    },
    {
      id: 3,
      title: 'مبادرة الرعاية الصحية المجانية',
      title_en: 'Free Healthcare Initiative',
      description: 'تقديم خدمات طبية مجانية وفحوصات دورية للأسر ذات الدخل المحدود',
      category: 'health',
      status: 'completed',
      priority: 'high',
      funding_status: 'fully_funded',
      target_amount: 75000,
      collected_amount: 78000,
      target_beneficiaries: 300,
      current_beneficiaries: 320,
      start_date: '2023-10-01',
      end_date: '2023-12-31',
      hijri_start: toHijri(2023, 10, 1),
      hijri_end: toHijri(2023, 12, 31),
      organizer: 'الفريق الطبي التطوعي',
      manager: 'د. محمد سعد الشعيل',
      location: 'عيادات متنقلة في مناطق مختلفة',
      image_url: '/images/healthcare.jpg',
      created_date: '2023-09-01',
      contributors_count: 67,
      volunteers_count: 25,
      progress_percentage: 100,
      impact_report: 'تم إجراء 850 فحص طبي و 120 عملية جراحية بسيطة',
      next_milestone: 'تقييم النتائج وإعداد تقرير نهائي',
      tags: ['صحة', 'طب', 'فحوصات', 'عيادات']
    },
    {
      id: 4,
      title: 'مبادرة ترميم البيوت الشعبية',
      title_en: 'Traditional Houses Renovation',
      description: 'ترميم وصيانة البيوت التراثية والشعبية القديمة للحفاظ على التراث',
      category: 'community',
      status: 'paused',
      priority: 'low',
      funding_status: 'needs_funding',
      target_amount: 120000,
      collected_amount: 15000,
      target_beneficiaries: 25,
      current_beneficiaries: 3,
      start_date: '2024-01-01',
      end_date: '2024-06-30',
      hijri_start: toHijri(2024, 1, 1),
      hijri_end: toHijri(2024, 6, 30),
      organizer: 'لجنة التراث والثقافة',
      manager: 'عبدالرحمن علي الشعيل',
      location: 'الحي التراثي - الدرعية',
      image_url: '/images/heritage-houses.jpg',
      created_date: '2023-11-20',
      contributors_count: 8,
      volunteers_count: 12,
      progress_percentage: 12,
      impact_report: 'تم ترميم 3 منازل تراثية',
      next_milestone: 'البحث عن مصادر تمويل إضافية',
      tags: ['تراث', 'ترميم', 'بيوت', 'ثقافة']
    },
    {
      id: 5,
      title: 'مبادرة منح دراسية للطلاب المتفوقين',
      title_en: 'Scholarships for Outstanding Students',
      description: 'تقديم منح دراسية للطلاب المتفوقين من العائلة لمواصلة تعليمهم الجامعي',
      category: 'education',
      status: 'active',
      priority: 'high',
      funding_status: 'partially_funded',
      target_amount: 200000,
      collected_amount: 145000,
      target_beneficiaries: 20,
      current_beneficiaries: 15,
      start_date: '2023-09-01',
      end_date: '2025-06-30',
      hijri_start: toHijri(2023, 9, 1),
      hijri_end: toHijri(2025, 6, 30),
      organizer: 'صندوق التعليم العائلي',
      manager: 'خديجة أحمد الشعيل',
      location: 'جامعات مختلفة',
      image_url: '/images/scholarships.jpg',
      created_date: '2023-07-15',
      contributors_count: 35,
      volunteers_count: 5,
      progress_percentage: 72,
      impact_report: '15 طالب يتلقون منح دراسية حالياً',
      next_milestone: 'إضافة 5 طلاب جدد في الفصل القادم',
      tags: ['تعليم', 'منح', 'طلاب', 'جامعة']
    }
  ];

  useEffect(() => {
    if (canAccessModule('initiatives')) {
      loadInitiativesData();
    }
  }, [filters]);

  const loadInitiativesData = async () => {
    setLoading(true);
    try {
      // Load mock data - replace with actual API calls
      setInitiatives(mockInitiatives);
    } catch (error) {
      console.error('Error loading initiatives data:', error);
    } finally {
      setLoading(false);
    }
  };

  // RBAC Access Control
  if (!canAccessModule('initiatives')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center" dir="rtl">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
            <ShieldExclamationIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">غير مصرح بالوصول</h2>
          <p className="text-gray-600 mb-6">
            ليس لديك صلاحية للوصول إلى قسم إدارة المبادرات. يتطلب هذا القسم صلاحيات مدير المناسبات والمبادرات أو المدير العام.
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
    total_initiatives: initiatives.length,
    active_initiatives: initiatives.filter(i => i.status === 'active').length,
    completed_initiatives: initiatives.filter(i => i.status === 'completed').length,
    planning_initiatives: initiatives.filter(i => i.status === 'planning').length,
    paused_initiatives: initiatives.filter(i => i.status === 'paused').length,
    total_target_amount: initiatives.reduce((sum, i) => sum + i.target_amount, 0),
    total_collected_amount: initiatives.reduce((sum, i) => sum + i.collected_amount, 0),
    total_beneficiaries: initiatives.reduce((sum, i) => sum + i.current_beneficiaries, 0),
    total_contributors: initiatives.reduce((sum, i) => sum + i.contributors_count, 0),
    total_volunteers: initiatives.reduce((sum, i) => sum + i.volunteers_count, 0)
  };

  // Filter initiatives
  const filteredInitiatives = initiatives.filter(initiative => {
    const matchesSearch = !searchQuery ||
      initiative.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      initiative.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      initiative.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      initiative.manager.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !filters.status || initiative.status === filters.status;
    const matchesCategory = !filters.category || initiative.category === filters.category;
    const matchesPriority = !filters.priority || initiative.priority === filters.priority;
    const matchesFunding = !filters.funding_status || initiative.funding_status === filters.funding_status;

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesFunding;
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
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'planning':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-blue-500" />;
      case 'paused':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />;
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'planning': return 'قيد التخطيط';
      case 'completed': return 'مكتمل';
      case 'paused': return 'متوقف';
      case 'cancelled': return 'ملغي';
      default: return 'غير محدد';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'planning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paused': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'charity':
        return <HeartIcon className="w-6 h-6 text-red-500" />;
      case 'education':
        return <AcademicCapIcon className="w-6 h-6 text-blue-500" />;
      case 'health':
        return <HeartIcon className="w-6 h-6 text-green-500" />;
      case 'community':
        return <BuildingLibraryIcon className="w-6 h-6 text-purple-500" />;
      case 'environment':
        return <SparklesIcon className="w-6 h-6 text-teal-500" />;
      default:
        return <HandRaisedIcon className="w-6 h-6 text-gray-500" />;
    }
  };

  const getCategoryText = (category) => {
    switch (category) {
      case 'charity': return 'خيرية';
      case 'education': return 'تعليمية';
      case 'health': return 'صحية';
      case 'community': return 'مجتمعية';
      case 'environment': return 'بيئية';
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

  const getFundingStatusText = (status) => {
    switch (status) {
      case 'fully_funded': return 'مُموّل بالكامل';
      case 'partially_funded': return 'مُموّل جزئياً';
      case 'seeking_funding': return 'يبحث عن تمويل';
      case 'needs_funding': return 'يحتاج تمويل';
      default: return 'غير محدد';
    }
  };

  const getFundingStatusColor = (status) => {
    switch (status) {
      case 'fully_funded': return 'bg-green-100 text-green-800 border-green-200';
      case 'partially_funded': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'seeking_funding': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'needs_funding': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Statistics Cards Component
  const StatisticsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-10 gap-6 mb-8">
      {/* Total Initiatives */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">إجمالي المبادرات</p>
            <p className="text-3xl font-bold text-gray-900">{statistics.total_initiatives}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
            <HandRaisedIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Active Initiatives */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">النشطة</p>
            <p className="text-3xl font-bold text-green-600">{statistics.active_initiatives}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <CheckCircleIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Completed Initiatives */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">المكتملة</p>
            <p className="text-3xl font-bold text-blue-600">{statistics.completed_initiatives}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <StarIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Planning Initiatives */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">قيد التخطيط</p>
            <p className="text-3xl font-bold text-yellow-600">{statistics.planning_initiatives}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
            <ClockIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Paused Initiatives */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">المتوقفة</p>
            <p className="text-3xl font-bold text-orange-600">{statistics.paused_initiatives}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Target Amount */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">الهدف المالي</p>
            <p className="text-2xl font-bold text-purple-600">{statistics.total_target_amount.toLocaleString()} ريال</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
            <CurrencyDollarIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Collected Amount */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">المبلغ المجمع</p>
            <p className="text-2xl font-bold text-indigo-600">{statistics.total_collected_amount.toLocaleString()} ريال</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <GiftIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Beneficiaries */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">إجمالي المستفيدين</p>
            <p className="text-3xl font-bold text-cyan-600">{statistics.total_beneficiaries}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <UserGroupIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Contributors */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">المساهمين</p>
            <p className="text-3xl font-bold text-pink-600">{statistics.total_contributors}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
            <HeartIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Total Volunteers */}
      <div className="glass-card p-6 hover:scale-105 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">المتطوعين</p>
            <p className="text-3xl font-bold text-teal-600">{statistics.total_volunteers}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
            <HandRaisedIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );

  // Initiatives Grid Component
  const InitiativesGrid = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <MagnifyingGlassIcon className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث بالعنوان أو الوصف أو المنظم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            >
              <option value="">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="planning">قيد التخطيط</option>
              <option value="completed">مكتمل</option>
              <option value="paused">متوقف</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            >
              <option value="">جميع الفئات</option>
              <option value="charity">خيرية</option>
              <option value="education">تعليمية</option>
              <option value="health">صحية</option>
              <option value="community">مجتمعية</option>
              <option value="environment">بيئية</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            >
              <option value="">جميع الأولويات</option>
              <option value="high">عالية</option>
              <option value="medium">متوسطة</option>
              <option value="low">منخفضة</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="premium-btn flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            مبادرة جديدة
          </button>
        </div>
      </div>

      {/* Initiatives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInitiatives.map((initiative) => (
          <div key={initiative.id} className="glass-card hover:scale-105 transition-all duration-300 overflow-hidden">
            {/* Initiative Image */}
            <div className="h-48 bg-gradient-to-br from-green-100 to-blue-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(initiative.status)}`}>
                  {getStatusText(initiative.status)}
                </span>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(initiative.priority)}`}>
                  أولوية {getPriorityText(initiative.priority)}
                </span>
              </div>
              <div className="absolute bottom-4 left-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  {getCategoryIcon(initiative.category)}
                </div>
              </div>
              <div className="absolute bottom-4 right-4">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getFundingStatusColor(initiative.funding_status)}`}>
                  {getFundingStatusText(initiative.funding_status)}
                </span>
              </div>
            </div>

            {/* Initiative Content */}
            <div className="p-6">
              {/* Header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  {getCategoryIcon(initiative.category)}
                  <span className="text-sm font-medium text-gray-600">{getCategoryText(initiative.category)}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{initiative.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{initiative.description}</p>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>التقدم المالي</span>
                  <span>{((initiative.collected_amount / initiative.target_amount) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((initiative.collected_amount / initiative.target_amount) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{initiative.collected_amount.toLocaleString()} ريال</span>
                  <span>الهدف: {initiative.target_amount.toLocaleString()} ريال</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">المستفيدين</p>
                  <p className="text-lg font-bold text-green-600">{initiative.current_beneficiaries}</p>
                  <p className="text-xs text-gray-500">من {initiative.target_beneficiaries}</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">المساهمين</p>
                  <p className="text-lg font-bold text-blue-600">{initiative.contributors_count}</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">المتطوعين</p>
                  <p className="text-lg font-bold text-purple-600">{initiative.volunteers_count}</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2 mb-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  <span>البداية: {initiative.start_date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  <span>النهاية: {initiative.end_date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4" />
                  <span className="line-clamp-1">{initiative.location}</span>
                </div>
              </div>

              {/* Manager */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">المدير المسؤول</p>
                <p className="text-sm font-medium text-gray-900">{initiative.manager}</p>
                <p className="text-xs text-gray-500">{initiative.organizer}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {setSelectedInitiative(initiative); setShowInitiativeModal(true);}}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
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

      {filteredInitiatives.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <HandRaisedIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مبادرات</h3>
          <p className="text-gray-500">لم يتم العثور على مبادرات تطابق المعايير المحددة</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات المبادرات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                <HandRaisedIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">إدارة المبادرات</h1>
                <p className="text-sm text-gray-600">تنظيم ومتابعة المبادرات الخيرية والمجتمعية</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">مرحباً، {user?.full_name || user?.name}</span>
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
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
                  ? 'bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              نظرة عامة
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'active'
                  ? 'bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              المبادرات النشطة
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'completed'
                  ? 'bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              المبادرات المكتملة
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              التحليلات
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {(activeTab === 'overview' || activeTab === 'active' || activeTab === 'completed') && <InitiativesGrid />}
        {activeTab === 'analytics' && (
          <div className="glass-card p-8 text-center">
            <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">تحليلات المبادرات قريباً</h3>
            <p className="text-gray-500">سيتم إضافة الرسوم البيانية والتحليلات التفصيلية قريباً</p>
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
          background: linear-gradient(135deg, #22C55E 0%, #3B82F6 100%);
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
          box-shadow: 0 10px 30px rgba(34, 197, 94, 0.3);
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

export default InitiativesManagement;