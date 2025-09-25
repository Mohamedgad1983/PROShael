import React, { useState, useEffect } from 'react';
import { toHijri, toGregorian } from 'hijri-converter';
import SimpleHijriDatePicker from '../Common/SimpleHijriDatePicker';
import {
  LightBulbIcon,
  SparklesIcon,
  RocketLaunchIcon,
  UsersIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  AcademicCapIcon,
  HeartIcon,
  BuildingLibraryIcon,
  GlobeAltIcon,
  StarIcon,
  FireIcon,
  TrophyIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  ShareIcon,
  HandRaisedIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
// CSS styles are inline

const AppleInitiativesManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newInitiative, setNewInitiative] = useState({
    title: '',
    category: 'financial',
    description: '',
    status: 'planning',
    startDate: '',
    startHijriDate: '',
    endDate: '',
    endHijriDate: '',
    budget: '',
    targetParticipants: '',
    manager: '',
    priority: 'medium',
    objectives: '',
    expectedOutcomes: ''
  });

  // Mock data for initiatives
  const mockInitiatives = [
    {
      id: 1,
      title: 'صندوق الطوارئ العائلي',
      category: 'financial',
      description: 'صندوق لدعم أفراد العائلة في حالات الطوارئ والحاجة',
      status: 'active',
      progress: 75,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      budget: 100000,
      raised: 75000,
      participants: 28,
      targetParticipants: 40,
      manager: 'أحمد الشعيل',
      priority: 'high',
      tags: ['مالي', 'طوارئ', 'دعم']
    },
    {
      id: 2,
      title: 'برنامج المنح التعليمية',
      category: 'education',
      description: 'منح دراسية لأطفال العائلة المتفوقين أكاديمياً',
      status: 'planning',
      progress: 30,
      startDate: '2024-03-01',
      endDate: '2024-08-31',
      budget: 50000,
      raised: 15000,
      participants: 12,
      targetParticipants: 20,
      manager: 'فاطمة الشعيل',
      priority: 'high',
      tags: ['تعليم', 'منح', 'أطفال']
    },
    {
      id: 3,
      title: 'مشروع كبار السن',
      category: 'social',
      description: 'رعاية وخدمات خاصة لكبار السن في العائلة',
      status: 'active',
      progress: 60,
      startDate: '2023-12-01',
      endDate: '2024-06-30',
      budget: 30000,
      raised: 18000,
      participants: 15,
      targetParticipants: 25,
      manager: 'محمد الشعيل',
      priority: 'medium',
      tags: ['اجتماعي', 'كبار السن', 'رعاية']
    },
    {
      id: 4,
      title: 'مبادرة البيئة الخضراء',
      category: 'environment',
      description: 'مشاريع بيئية لحماية البيئة وزراعة الأشجار',
      status: 'completed',
      progress: 100,
      startDate: '2023-09-01',
      endDate: '2023-12-31',
      budget: 20000,
      raised: 20000,
      participants: 35,
      targetParticipants: 30,
      manager: 'سارة الشعيل',
      priority: 'medium',
      tags: ['بيئة', 'أشجار', 'حماية']
    },
    {
      id: 5,
      title: 'مشروع ريادة الأعمال',
      category: 'business',
      description: 'دعم أفراد العائلة لبدء مشاريعهم التجارية',
      status: 'active',
      progress: 45,
      startDate: '2024-02-01',
      endDate: '2024-11-30',
      budget: 80000,
      raised: 36000,
      participants: 8,
      targetParticipants: 15,
      manager: 'خالد الشعيل',
      priority: 'high',
      tags: ['أعمال', 'ريادة', 'مشاريع']
    }
  ];

  useEffect(() => {
    setInitiatives(mockInitiatives);
  }, []);

  // Helper functions
  const getCategoryInfo = (category) => {
    const categories = {
      financial: { label: 'مالي', icon: CurrencyDollarIcon, color: '#007AFF', gradient: 'from-blue-500 to-indigo-500' },
      education: { label: 'تعليمي', icon: AcademicCapIcon, color: '#30D158', gradient: 'from-green-500 to-emerald-500' },
      social: { label: 'اجتماعي', icon: HeartIcon, color: '#FF3B30', gradient: 'from-red-500 to-pink-500' },
      environment: { label: 'بيئي', icon: GlobeAltIcon, color: '#30D158', gradient: 'from-green-500 to-teal-500' },
      business: { label: 'تجاري', icon: BuildingLibraryIcon, color: '#FF9500', gradient: 'from-orange-500 to-amber-500' },
      health: { label: 'صحي', icon: HeartIcon, color: '#FF2D92', gradient: 'from-pink-500 to-rose-500' },
      default: { label: 'عام', icon: LightBulbIcon, color: '#8E8E93', gradient: 'from-gray-500 to-gray-600' }
    };
    return categories[category] || categories.default;
  };

  const getStatusInfo = (status) => {
    const statuses = {
      planning: { label: 'التخطيط', color: '#FF9500', icon: ClockIcon },
      active: { label: 'نشط', color: '#30D158', icon: RocketLaunchIcon },
      paused: { label: 'متوقف مؤقتاً', color: '#FFCC02', icon: ExclamationTriangleIcon },
      completed: { label: 'مكتمل', color: '#007AFF', icon: CheckCircleIcon },
      cancelled: { label: 'ملغي', color: '#FF3B30', icon: ExclamationTriangleIcon }
    };
    return statuses[status] || statuses.planning;
  };

  const getPriorityInfo = (priority) => {
    const priorities = {
      high: { label: 'عالية', color: '#FF3B30', icon: FireIcon },
      medium: { label: 'متوسطة', color: '#FF9500', icon: StarIcon },
      low: { label: 'منخفضة', color: '#8E8E93', icon: ClockIcon }
    };
    return priorities[priority] || priorities.medium;
  };

  // Calculate statistics
  const totalInitiatives = initiatives.length;
  const activeInitiatives = initiatives.filter(init => init.status === 'active').length;
  const completedInitiatives = initiatives.filter(init => init.status === 'completed').length;
  const totalBudget = initiatives.reduce((sum, init) => sum + init.budget, 0);
  const totalRaised = initiatives.reduce((sum, init) => sum + init.raised, 0);
  const totalParticipants = initiatives.reduce((sum, init) => sum + init.participants, 0);

  // Initiative tabs
  const initiativeTabs = [
    { id: 'overview', label: 'نظرة عامة', icon: ChartBarIcon },
    { id: 'active', label: 'المبادرات النشطة', icon: RocketLaunchIcon },
    { id: 'all', label: 'جميع المبادرات', icon: LightBulbIcon },
    { id: 'reports', label: 'التقارير', icon: DocumentTextIcon },
    { id: 'proposals', label: 'اقتراحات جديدة', icon: HandRaisedIcon }
  ];

  const AppleStatCard = ({ title, value, icon: Icon, gradient, subtitle, trend, trendValue }) => (
    <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '24px', transform: 'scale(1)', transition: 'transform 0.3s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}>
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${gradient})`,
            animation: 'apple-glow 3s ease-in-out infinite'
          }}
        >
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            <span>{trendValue}</span>
            <ArrowTrendingUpIcon className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm text-gray-600 font-medium">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );

  const AppleInitiativeCard = ({ initiative }) => {
    const categoryInfo = getCategoryInfo(initiative.category);
    const statusInfo = getStatusInfo(initiative.status);
    const priorityInfo = getPriorityInfo(initiative.priority);
    const CategoryIcon = categoryInfo.icon;
    const StatusIcon = statusInfo.icon;
    const PriorityIcon = priorityInfo.icon;

    const fundingPercentage = (initiative.raised / initiative.budget) * 100;
    const participationPercentage = (initiative.participants / initiative.targetParticipants) * 100;

    return (
      <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '24px', transform: 'scale(1)', transition: 'all 0.3s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)' }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-r ${categoryInfo.gradient} flex items-center justify-center text-white shadow-lg`}
            >
              <CategoryIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {initiative.title}
              </h3>
              <p className="text-sm text-gray-600">{categoryInfo.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: `${priorityInfo.color}20`, color: priorityInfo.color }}
            >
              <PriorityIcon className="w-3 h-3" />
              {priorityInfo.label}
            </div>
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
            >
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </div>
            <div style={{ display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.3s' }} onMouseEnter={(e) => { e.currentTarget.style.opacity = 1 }} onMouseLeave={(e) => { e.currentTarget.style.opacity = 0 }}>
              <button style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EyeIcon className="w-4 h-4" />
              </button>
              <button style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PencilIcon className="w-4 h-4" />
              </button>
              <button style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShareIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{initiative.description}</p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-2">
            <span>التقدم العام</span>
            <span>{initiative.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
              style={{ width: `${initiative.progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>التمويل</span>
              <span>{fundingPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${fundingPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-700 mt-1">
              {initiative.raised.toLocaleString('ar-SA')} / {initiative.budget.toLocaleString('ar-SA')} ر.س
            </p>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>المشاركة</span>
              <span>{participationPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${participationPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {initiative.participants} / {initiative.targetParticipants} مشارك
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {initiative.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-200 rounded-lg text-xs text-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <span className="text-xs text-white font-bold">
                {initiative.manager?.split(' ')[0]?.charAt(0)}
              </span>
            </div>
            <span className="text-xs text-gray-600">{initiative.manager}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <EyeIcon className="w-3 h-3" />
              التفاصيل
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <AppleStatCard
                title="إجمالي المبادرات"
                value={totalInitiatives.toString()}
                icon={LightBulbIcon}
                gradient="#007AFF, #5856D6"
                trend="up"
                trendValue="+3"
              />
              <AppleStatCard
                title="المبادرات النشطة"
                value={activeInitiatives.toString()}
                icon={RocketLaunchIcon}
                gradient="#30D158, #32D74B"
                trend="up"
                trendValue="+2"
              />
              <AppleStatCard
                title="المبادرات المكتملة"
                value={completedInitiatives.toString()}
                icon={TrophyIcon}
                gradient="#FF9500, #FFCC02"
                trend="up"
                trendValue="+1"
              />
              <AppleStatCard
                title="معدل النجاح"
                value={`${((completedInitiatives / totalInitiatives) * 100).toFixed(0)}%`}
                icon={StarIcon}
                gradient="#FF3B30, #FF453A"
                subtitle="للمبادرات المكتملة"
              />
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '16px', padding: '24px' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                    <BanknotesIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">نظرة مالية</h3>
                    <p className="text-sm text-gray-400">إجمالي الميزانيات والتمويل</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">الميزانية الإجمالية</span>
                    <span className="text-white font-bold">{totalBudget.toLocaleString('ar-SA')} ر.س</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">المبلغ المجمع</span>
                    <span className="text-green-400 font-bold">{totalRaised.toLocaleString('ar-SA')} ر.س</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">نسبة التحقق</span>
                    <span className="text-blue-400 font-bold">{((totalRaised / totalBudget) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-700"
                      style={{ width: `${(totalRaised / totalBudget) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '16px', padding: '24px' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <UserGroupIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">المشاركة</h3>
                    <p className="text-sm text-gray-400">عدد المشاركين والمتطوعين</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">إجمالي المشاركين</span>
                    <span className="text-white font-bold">{totalParticipants}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">متوسط المشاركة</span>
                    <span className="text-purple-400 font-bold">
                      {(totalParticipants / totalInitiatives).toFixed(1)} / مبادرة
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">معدل الالتزام</span>
                    <span className="text-green-400 font-bold">87%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '16px', padding: '24px' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">إجراءات سريعة</h3>
                  <p className="text-sm text-gray-400">إدارة المبادرات والمشاريع</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <PlusIcon className="w-4 h-4" />
                  مبادرة جديدة
                </button>
                <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HandRaisedIcon className="w-4 h-4" />
                  اقتراح مبادرة
                </button>
                <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DocumentTextIcon className="w-4 h-4" />
                  التقارير
                </button>
                <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #F97316, #EA580C)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChartBarIcon className="w-4 h-4" />
                  التحليلات
                </button>
              </div>
            </div>

            {/* Top Performing Initiatives */}
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '16px', padding: '24px' }}>
              <h3 className="text-lg font-semibold text-white mb-4">أفضل المبادرات أداءً</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {initiatives
                  .sort((a, b) => b.progress - a.progress)
                  .slice(0, 3)
                  .map((initiative) => (
                    <AppleInitiativeCard key={initiative.id} initiative={initiative} />
                  ))}
              </div>
            </div>
          </div>
        );

      case 'active':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">المبادرات النشطة</h3>
                <p className="text-gray-400">المبادرات الجارية حالياً</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <PlusIcon className="w-4 h-4" />
                مبادرة جديدة
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {initiatives
                .filter(initiative => initiative.status === 'active')
                .map((initiative) => (
                  <AppleInitiativeCard key={initiative.id} initiative={initiative} />
                ))}
            </div>
          </div>
        );

      case 'all':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">جميع المبادرات</h3>
                <p className="text-gray-400">إدارة جميع مبادرات ومشاريع العائلة</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <PlusIcon className="w-4 h-4" />
                مبادرة جديدة
              </button>
            </div>

            {/* Filters */}
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '16px', padding: '16px' }}>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <div style={{ position: 'relative' }}>
                    <MagnifyingGlassIcon style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'rgba(255, 255, 255, 0.5)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="البحث في المبادرات..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px 12px 44px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', color: 'white', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', color: 'white', fontSize: '14px', outline: 'none' }}
                >
                  <option value="">جميع الفئات</option>
                  <option value="financial">مالي</option>
                  <option value="education">تعليمي</option>
                  <option value="social">اجتماعي</option>
                  <option value="environment">بيئي</option>
                  <option value="business">تجاري</option>
                  <option value="health">صحي</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', color: 'white', fontSize: '14px', outline: 'none' }}
                >
                  <option value="">جميع الحالات</option>
                  <option value="planning">التخطيط</option>
                  <option value="active">نشط</option>
                  <option value="paused">متوقف مؤقتاً</option>
                  <option value="completed">مكتمل</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>
            </div>

            {/* Initiatives Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {initiatives
                .filter(initiative =>
                  (!filterCategory || initiative.category === filterCategory) &&
                  (!filterStatus || initiative.status === filterStatus) &&
                  (!searchQuery || initiative.title.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map((initiative) => (
                  <AppleInitiativeCard key={initiative.id} initiative={initiative} />
                ))}
            </div>
          </div>
        );

      case 'reports':
        return (
          <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '32px', textAlign: 'center' }}>
            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">تقارير المبادرات</h3>
            <p className="text-gray-400">سيتم إضافة تقارير مفصلة عن أداء المبادرات قريباً</p>
          </div>
        );

      case 'proposals':
        return (
          <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '32px', textAlign: 'center' }}>
            <HandRaisedIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">اقتراحات المبادرات</h3>
            <p className="text-gray-400">سيتم إضافة نظام استقبال ومراجعة اقتراحات المبادرات الجديدة قريباً</p>
          </div>
        );

      default:
        return null;
    }
  };

  // Handle date changes with Hijri conversion
  const handleStartDateChange = (gregorianDate) => {
    setNewInitiative(prev => ({ ...prev, startDate: gregorianDate }));
    if (gregorianDate) {
      const date = new Date(gregorianDate);
      const hijri = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
      const hijriFormatted = `${hijri.hd}/${hijri.hm}/${hijri.hy} هـ`;
      setNewInitiative(prev => ({ ...prev, startHijriDate: hijriFormatted }));
    }
  };

  const handleEndDateChange = (gregorianDate) => {
    setNewInitiative(prev => ({ ...prev, endDate: gregorianDate }));
    if (gregorianDate) {
      const date = new Date(gregorianDate);
      const hijri = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
      const hijriFormatted = `${hijri.hd}/${hijri.hm}/${hijri.hy} هـ`;
      setNewInitiative(prev => ({ ...prev, endHijriDate: hijriFormatted }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add new initiative with generated ID
    const initiative = {
      id: initiatives.length + 1,
      ...newInitiative,
      budget: parseFloat(newInitiative.budget) || 0,
      raised: 0,
      participants: 0,
      targetParticipants: parseInt(newInitiative.targetParticipants) || 0,
      progress: 0,
      tags: [getCategoryInfo(newInitiative.category).label, getPriorityInfo(newInitiative.priority).label]
    };

    setInitiatives([initiative, ...initiatives]);
    setShowAddModal(false);

    // Reset form
    setNewInitiative({
      title: '',
      category: 'financial',
      description: '',
      status: 'planning',
      startDate: '',
      startHijriDate: '',
      endDate: '',
      endHijriDate: '',
      budget: '',
      targetParticipants: '',
      manager: '',
      priority: 'medium',
      objectives: '',
      expectedOutcomes: ''
    });
  };

  return (
    <div className="p-6 space-y-6" dir="rtl" style={{ backgroundColor: 'white', minHeight: '100vh' }}>
      {/* Apple Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px', background: 'linear-gradient(135deg, rgba(243, 244, 246, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', borderRadius: '16px', marginBottom: '24px' }}>
        {initiativeTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                background: isActive ? 'linear-gradient(135deg, #007AFF, #5856D6)' : 'transparent',
                border: 'none',
                color: isActive ? 'white' : '#86868B',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '100px',
                transition: 'all 0.3s'
              }}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ animation: 'apple-fade-up 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        {renderTabContent()}
      </div>

      {/* Add Initiative Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '0',
            width: '100%',
            maxWidth: '100%',
            height: '100vh',
            maxHeight: '100vh',
            overflow: 'hidden',
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              flexShrink: 0
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1F2937'
              }}>إضافة مبادرة جديدة</h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '8px',
                  background: '#F3F4F6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <XMarkIcon style={{ width: '24px', height: '24px', color: '#6B7280' }} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{
              flex: 1,
              overflowY: 'auto',
              padding: '32px',
              maxHeight: 'calc(100vh - 160px)'
            }}>
              <div style={{ display: 'grid', gap: '20px' }}>
                {/* Basic Information */}
                <div style={{
                  background: '#F9FAFB',
                  padding: '20px',
                  borderRadius: '12px'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '16px',
                    color: '#374151'
                  }}>المعلومات الأساسية</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        عنوان المبادرة *
                      </label>
                      <input
                        type="text"
                        required
                        value={newInitiative.title}
                        onChange={(e) => setNewInitiative(prev => ({ ...prev, title: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        الفئة *
                      </label>
                      <select
                        required
                        value={newInitiative.category}
                        onChange={(e) => setNewInitiative(prev => ({ ...prev, category: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="financial">مالي</option>
                        <option value="education">تعليمي</option>
                        <option value="social">اجتماعي</option>
                        <option value="environment">بيئي</option>
                        <option value="business">تجاري</option>
                        <option value="health">صحي</option>
                      </select>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        وصف المبادرة *
                      </label>
                      <textarea
                        required
                        value={newInitiative.description}
                        onChange={(e) => setNewInitiative(prev => ({ ...prev, description: e.target.value }))}
                        rows="3"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Timeline and Budget */}
                <div style={{
                  background: '#F9FAFB',
                  padding: '20px',
                  borderRadius: '12px'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '16px',
                    color: '#374151'
                  }}>الجدول الزمني والميزانية</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div>
                      <SimpleHijriDatePicker
                        label="تاريخ البداية"
                        value={newInitiative.startDate}
                        onChange={(gregorianDate) => setNewInitiative(prev => ({ ...prev, startDate: gregorianDate }))}
                        required={true}
                      />
                    </div>

                    <div>
                      <SimpleHijriDatePicker
                        label="تاريخ النهاية"
                        value={newInitiative.endDate}
                        onChange={(gregorianDate) => setNewInitiative(prev => ({ ...prev, endDate: gregorianDate }))}
                        required={true}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        الميزانية المتوقعة (ريال)
                      </label>
                      <input
                        type="number"
                        value={newInitiative.budget}
                        onChange={(e) => setNewInitiative(prev => ({ ...prev, budget: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        عدد المشاركين المستهدف
                      </label>
                      <input
                        type="number"
                        value={newInitiative.targetParticipants}
                        onChange={(e) => setNewInitiative(prev => ({ ...prev, targetParticipants: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Management Details */}
                <div style={{
                  background: '#F9FAFB',
                  padding: '20px',
                  borderRadius: '12px'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '16px',
                    color: '#374151'
                  }}>تفاصيل الإدارة</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        مدير المبادرة *
                      </label>
                      <input
                        type="text"
                        required
                        value={newInitiative.manager}
                        onChange={(e) => setNewInitiative(prev => ({ ...prev, manager: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        الحالة
                      </label>
                      <select
                        value={newInitiative.status}
                        onChange={(e) => setNewInitiative(prev => ({ ...prev, status: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="planning">التخطيط</option>
                        <option value="active">نشط</option>
                        <option value="paused">متوقف مؤقتاً</option>
                        <option value="completed">مكتمل</option>
                        <option value="cancelled">ملغي</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        الأولوية
                      </label>
                      <select
                        value={newInitiative.priority}
                        onChange={(e) => setNewInitiative(prev => ({ ...prev, priority: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="high">عالية</option>
                        <option value="medium">متوسطة</option>
                        <option value="low">منخفضة</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Objectives and Outcomes */}
                <div style={{
                  background: '#F9FAFB',
                  padding: '20px',
                  borderRadius: '12px'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '16px',
                    color: '#374151'
                  }}>الأهداف والنتائج المتوقعة</h3>

                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        أهداف المبادرة
                      </label>
                      <textarea
                        value={newInitiative.objectives}
                        onChange={(e) => setNewInitiative(prev => ({ ...prev, objectives: e.target.value }))}
                        rows="3"
                        placeholder="اذكر الأهداف الرئيسية للمبادرة..."
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#4B5563' }}>
                        النتائج المتوقعة
                      </label>
                      <textarea
                        value={newInitiative.expectedOutcomes}
                        onChange={(e) => setNewInitiative(prev => ({ ...prev, expectedOutcomes: e.target.value }))}
                        rows="3"
                        placeholder="ما هي النتائج والتأثيرات المتوقعة؟..."
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      padding: '10px 24px',
                      background: '#F3F4F6',
                      color: '#4B5563',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 24px',
                      background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    إضافة المبادرة
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppleInitiativesManagement;