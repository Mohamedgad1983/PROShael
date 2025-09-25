import React, { useState, useEffect } from 'react';
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
  CalendarIcon
} from '@heroicons/react/24/outline';
import { HijriDateDisplay, HijriDateFilter, HijriCalendarWidget } from '../Common/HijriDateDisplay';
import { formatHijriDate, formatDualDate, formatTimeAgo } from '../../utils/hijriDateUtils';
import '../../styles/ultra-premium-islamic-design.css';

interface Initiative {
  id: number;
  title: string;
  category: string;
  description: string;
  status: 'active' | 'planning' | 'completed' | 'paused';
  progress: number;
  startDate: string;
  endDate: string;
  budget: number;
  raised: number;
  participants: number;
  targetParticipants: number;
  manager: string;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const HijriInitiativesManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date; end: Date } | null>(null);

  // Mock data with Hijri dates
  const mockInitiatives: Initiative[] = [
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
      tags: ['مالي', 'طوارئ', 'دعم'],
      createdAt: '2023-12-15T10:00:00',
      updatedAt: '2024-03-10T14:30:00'
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
      tags: ['تعليم', 'منح', 'أطفال'],
      createdAt: '2024-02-01T09:00:00',
      updatedAt: '2024-03-05T11:00:00'
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
      tags: ['اجتماعي', 'كبار السن', 'رعاية'],
      createdAt: '2023-11-20T13:00:00',
      updatedAt: '2024-03-08T16:00:00'
    }
  ];

  useEffect(() => {
    setInitiatives(mockInitiatives);
  }, []);

  // Helper functions
  const getCategoryInfo = (category: string) => {
    const categories: Record<string, any> = {
      financial: { label: 'مالي', icon: BanknotesIcon, color: '#007AFF', gradient: 'from-blue-500 to-indigo-500' },
      education: { label: 'تعليمي', icon: AcademicCapIcon, color: '#FF9500', gradient: 'from-orange-500 to-amber-500' },
      social: { label: 'اجتماعي', icon: HeartIcon, color: '#FF2D92', gradient: 'from-pink-500 to-rose-500' },
      environment: { label: 'بيئي', icon: GlobeAltIcon, color: '#30D158', gradient: 'from-green-500 to-emerald-500' },
      religious: { label: 'ديني', icon: BuildingLibraryIcon, color: '#5856D6', gradient: 'from-purple-500 to-indigo-500' }
    };
    return categories[category] || categories.financial;
  };

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, any> = {
      active: { label: 'نشطة', color: '#30D158', icon: CheckCircleIcon, bgColor: 'bg-green-100' },
      planning: { label: 'تحت التخطيط', color: '#FF9500', icon: ClockIcon, bgColor: 'bg-orange-100' },
      completed: { label: 'مكتملة', color: '#8E8E93', icon: CheckCircleIcon, bgColor: 'bg-gray-100' },
      paused: { label: 'متوقفة', color: '#FF3B30', icon: ExclamationTriangleIcon, bgColor: 'bg-red-100' }
    };
    return statuses[status] || statuses.active;
  };

  const getPriorityInfo = (priority: string) => {
    const priorities: Record<string, any> = {
      high: { label: 'عالية', color: '#FF3B30', icon: FireIcon },
      medium: { label: 'متوسطة', color: '#FF9500', icon: StarIcon },
      low: { label: 'منخفضة', color: '#8E8E93', icon: ClockIcon }
    };
    return priorities[priority] || priorities.medium;
  };

  // Calculate statistics
  const totalInitiatives = initiatives.length;
  const activeInitiatives = initiatives.filter(i => i.status === 'active').length;
  const totalBudget = initiatives.reduce((sum, i) => sum + i.budget, 0);
  const totalRaised = initiatives.reduce((sum, i) => sum + i.raised, 0);
  const totalParticipants = initiatives.reduce((sum, i) => sum + i.participants, 0);

  // Initiative Card Component with Hijri Dates
  const InitiativeCard: React.FC<{ initiative: Initiative }> = ({ initiative }) => {
    const categoryInfo = getCategoryInfo(initiative.category);
    const statusInfo = getStatusInfo(initiative.status);
    const priorityInfo = getPriorityInfo(initiative.priority);
    const CategoryIcon = categoryInfo.icon;
    const StatusIcon = statusInfo.icon;

    const progressPercentage = initiative.progress;
    const fundingPercentage = (initiative.raised / initiative.budget) * 100;
    const participationPercentage = (initiative.participants / initiative.targetParticipants) * 100;

    return (
      <div className="glass-card-premium" style={{ padding: '24px', marginBottom: '16px' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 rounded-xl bg-gradient-to-r ${categoryInfo.gradient} flex items-center justify-center text-white shadow-lg`}
            >
              <CategoryIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{initiative.title}</h3>
              <p className="text-sm text-gray-600">{initiative.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor}`}
                  style={{ color: statusInfo.color }}>
              {statusInfo.label}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100"
                  style={{ color: priorityInfo.color }}>
              {priorityInfo.label}
            </span>
          </div>
        </div>

        {/* Hijri Date Display */}
        <div className="mb-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">تاريخ البداية:</span>
            <HijriDateDisplay
              date={initiative.startDate}
              format="long"
              showIcon={false}
              showBoth={true}
              style={{ padding: '4px 8px', fontSize: '13px' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">تاريخ النهاية:</span>
            <HijriDateDisplay
              date={initiative.endDate}
              format="long"
              showIcon={false}
              showBoth={true}
              style={{ padding: '4px 8px', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3 mb-4">
          {/* Overall Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">التقدم العام</span>
              <span className="text-sm font-bold" style={{ color: categoryInfo.color }}>
                {progressPercentage}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full progress-bar-fill"
                style={{
                  width: `${progressPercentage}%`,
                  background: `linear-gradient(135deg, ${categoryInfo.color}, ${categoryInfo.color}dd)`
                }}
              />
            </div>
          </div>

          {/* Funding Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">
                التمويل: {initiative.raised.toLocaleString()} / {initiative.budget.toLocaleString()} ريال
              </span>
              <span className="text-sm font-bold text-green-600">{fundingPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${fundingPercentage}%`,
                  background: 'linear-gradient(135deg, #30D158, #34C759)'
                }}
              />
            </div>
          </div>

          {/* Participation Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">
                المشاركون: {initiative.participants} / {initiative.targetParticipants} عضو
              </span>
              <span className="text-sm font-bold text-blue-600">{participationPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${participationPercentage}%`,
                  background: 'linear-gradient(135deg, #007AFF, #5856D6)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(initiative.manager)}&background=007AFF&color=fff&font-size=0.4&rounded=true&bold=true`}
              alt={initiative.manager}
              className="w-8 h-8 rounded-full"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">المدير: {initiative.manager}</p>
              <p className="text-xs text-gray-600">
                آخر تحديث: <HijriDateDisplay date={initiative.updatedAt} format="relative" showIcon={false} showBoth={false} />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <EyeIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <PencilIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ShareIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {initiative.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Statistics Cards
  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: any;
    gradient: string;
    subtitle?: string;
    trend?: string
  }> = ({ title, value, icon: Icon, gradient, subtitle, trend }) => (
    <div className="glass-card-premium stat-badge-premium">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg icon-wrapper-gradient"
          style={{ background: `linear-gradient(135deg, ${gradient})` }}
        >
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`text-sm font-medium ${trend.includes('+') ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm text-gray-600 font-medium">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-700">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="icon-wrapper-gradient" style={{ background: 'var(--gradient-islamic)' }}>
              <LightBulbIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">إدارة المبادرات</h1>
              <p className="text-sm text-gray-600">إدارة وتتبع المبادرات العائلية</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-gradient-premium flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            مبادرة جديدة
          </button>
        </div>

        {/* Hijri Date Filter */}
        <HijriDateFilter
          onFilterChange={(filter) => {
            setSelectedDateRange({ start: filter.start, end: filter.end });
          }}
        />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="إجمالي المبادرات"
          value={totalInitiatives}
          icon={RocketLaunchIcon}
          gradient="#007AFF, #5856D6"
          subtitle="جميع المبادرات"
        />
        <StatCard
          title="المبادرات النشطة"
          value={activeInitiatives}
          icon={CheckCircleIcon}
          gradient="#30D158, #34C759"
          subtitle="قيد التنفيذ"
          trend="+2"
        />
        <StatCard
          title="الميزانية الإجمالية"
          value={`${totalBudget.toLocaleString()} ريال`}
          icon={BanknotesIcon}
          gradient="#FF9500, #F59E0B"
          subtitle="مخصص للمبادرات"
        />
        <StatCard
          title="المبلغ المحصل"
          value={`${totalRaised.toLocaleString()} ريال`}
          icon={CurrencyDollarIcon}
          gradient="#00A86B, #06B6D4"
          subtitle={`${((totalRaised / totalBudget) * 100).toFixed(1)}% من الهدف`}
          trend="+15%"
        />
        <StatCard
          title="المشاركون"
          value={totalParticipants}
          icon={UserGroupIcon}
          gradient="#FF2D92, #F43F5E"
          subtitle="عضو مشارك"
          trend="+8"
        />
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="البحث في المبادرات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-premium w-full pr-10"
          />
          <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input-premium"
        >
          <option value="">جميع الفئات</option>
          <option value="financial">مالية</option>
          <option value="education">تعليمية</option>
          <option value="social">اجتماعية</option>
          <option value="environment">بيئية</option>
          <option value="religious">دينية</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-premium"
        >
          <option value="">جميع الحالات</option>
          <option value="active">نشطة</option>
          <option value="planning">تحت التخطيط</option>
          <option value="completed">مكتملة</option>
          <option value="paused">متوقفة</option>
        </select>
      </div>

      {/* Initiatives List */}
      <div className="space-y-4">
        {initiatives
          .filter(initiative => {
            const matchesSearch = initiative.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 initiative.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = !filterCategory || initiative.category === filterCategory;
            const matchesStatus = !filterStatus || initiative.status === filterStatus;
            return matchesSearch && matchesCategory && matchesStatus;
          })
          .map(initiative => (
            <InitiativeCard key={initiative.id} initiative={initiative} />
          ))}
      </div>

      {/* Empty State */}
      {initiatives.length === 0 && (
        <div className="text-center py-12">
          <LightBulbIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مبادرات</h3>
          <p className="text-sm text-gray-600">ابدأ بإنشاء أول مبادرة للعائلة</p>
        </div>
      )}
    </div>
  );
};

export default HijriInitiativesManagement;