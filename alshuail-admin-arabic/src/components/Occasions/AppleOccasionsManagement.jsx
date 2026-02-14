import React, {  useState, useEffect , useCallback } from 'react';
import { toHijri, toGregorian } from 'hijri-converter';
import SimpleHijriDatePicker from '../Common/SimpleHijriDatePicker';
import { logger } from '../../utils/logger';

import {
  CalendarIcon,
  CalendarDaysIcon,
  UsersIcon,
  SparklesIcon,
  HeartIcon,
  GiftIcon,
  CakeIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  BellIcon,
  ShareIcon,
  CameraIcon,
  MapPinIcon,
  UserGroupIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
// CSS styles are inline

const AppleOccasionsManagement = () => {
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

  const [activeTab, setActiveTab] = useState('overview');
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOccasion, setNewOccasion] = useState({
    title: '',
    type: 'celebration',
    date: '',
    hijriDate: '',
    time: '',
    location: '',
    description: '',
    maxAttendees: '',
    budget: '',
    organizer: ''
  });

  // Mock data for occasions
  const mockOccasions = [
    {
      id: 1,
      title: 'عيد ميلاد أحمد الشعيل',
      type: 'birthday',
      date: '2024-03-15',
      time: '18:00',
      location: 'قاعة الشعيل - الرياض',
      description: 'احتفال بعيد ميلاد أحمد الشعيل الخامس والثلاثين',
      attendees: 45,
      maxAttendees: 60,
      status: 'upcoming',
      organizer: 'فاطمة الشعيل',
      budget: 5000,
      spent: 3200,
      image: null,
      tags: ['عائلي', 'احتفال', 'عيد ميلاد']
    },
    {
      id: 2,
      title: 'اجتماع العائلة الشهري',
      type: 'meeting',
      date: '2024-02-28',
      time: '19:30',
      location: 'بيت العائلة الرئيسي',
      description: 'اجتماع شهري لمناقشة شؤون العائلة والقرارات المهمة',
      attendees: 32,
      maxAttendees: 40,
      status: 'completed',
      organizer: 'محمد الشعيل',
      budget: 1500,
      spent: 1200,
      image: null,
      tags: ['اجتماع', 'مهم', 'قرارات']
    },
    {
      id: 3,
      title: 'حفل زفاف سارة الشعيل',
      type: 'wedding',
      date: '2024-05-20',
      time: '20:00',
      location: 'قصر الأحلام - جدة',
      description: 'حفل زفاف سارة الشعيل وعبدالله المحمد',
      attendees: 120,
      maxAttendees: 200,
      status: 'planning',
      organizer: 'نورا الشعيل',
      budget: 50000,
      spent: 15000,
      image: null,
      tags: ['زفاف', 'مناسبة كبيرة', 'احتفال']
    },
    {
      id: 4,
      title: 'رحلة العائلة الصيفية',
      type: 'trip',
      date: '2024-07-10',
      time: '08:00',
      location: 'شاطئ الدمام',
      description: 'رحلة عائلية صيفية لقضاء عطلة ممتعة',
      attendees: 28,
      maxAttendees: 35,
      status: 'planning',
      organizer: 'خالد الشعيل',
      budget: 15000,
      spent: 4000,
      image: null,
      tags: ['رحلة', 'صيف', 'ترفيه']
    }
  ];

  useEffect(() => {
    setOccasions(mockOccasions);
  }, []);

  // Handle Gregorian date change and convert to Hijri
  const handleDateChange = (gregorianDate) => {
    setNewOccasion(prev => ({ ...prev, date: gregorianDate }));

    if (gregorianDate) {
      const date = new Date(gregorianDate);
      const hijri = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
      const hijriFormatted = `${hijri.hd}/${hijri.hm}/${hijri.hy} هـ`;
      setNewOccasion(prev => ({ ...prev, hijriDate: hijriFormatted }));
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    const occasion = {
      ...newOccasion,
      id: Date.now(),
      attendees: 0,
      status: 'planning',
      spent: 0,
      image: null,
      tags: []
    };

    setOccasions(prev => [...prev, occasion]);
    setShowAddModal(false);

    // Reset form
    setNewOccasion({
      title: '',
      type: 'celebration',
      date: '',
      hijriDate: '',
      time: '',
      location: '',
      description: '',
      maxAttendees: '',
      budget: '',
      organizer: ''
    });
  };

  // Helper functions
  const getOccasionTypeInfo = (type) => {
    const types = {
      birthday: { label: 'عيد ميلاد', icon: CakeIcon, color: '#FF3B30', gradient: 'from-red-500 to-pink-500' },
      wedding: { label: 'زفاف', icon: HeartIcon, color: '#FF2D92', gradient: 'from-pink-500 to-rose-500' },
      meeting: { label: 'اجتماع', icon: UsersIcon, color: '#007AFF', gradient: 'from-blue-500 to-indigo-500' },
      trip: { label: 'رحلة', icon: MapPinIcon, color: '#30D158', gradient: 'from-green-500 to-emerald-500' },
      celebration: { label: 'احتفال', icon: SparklesIcon, color: '#FF9500', gradient: 'from-orange-500 to-amber-500' },
      default: { label: 'مناسبة', icon: CalendarIcon, color: '#8E8E93', gradient: 'from-gray-500 to-gray-600' }
    };
    return types[type] || types.default;
  };

  const getStatusInfo = (status) => {
    const statuses = {
      upcoming: { label: 'قادمة', color: '#007AFF', icon: ClockIcon },
      ongoing: { label: 'جارية', color: '#30D158', icon: CheckCircleIcon },
      completed: { label: 'منتهية', color: '#8E8E93', icon: CheckCircleIcon },
      cancelled: { label: 'ملغية', color: '#FF3B30', icon: ExclamationCircleIcon },
      planning: { label: 'تحت التخطيط', color: '#FF9500', icon: CalendarDaysIcon }
    };
    return statuses[status] || statuses.upcoming;
  };

  // Calculate statistics
  const totalOccasions = occasions.length;
  const upcomingOccasions = occasions.filter(occ => occ.status === 'upcoming' || occ.status === 'planning').length;
  const totalAttendees = occasions.reduce((sum, occ) => sum + occ.attendees, 0);
  const totalBudget = occasions.reduce((sum, occ) => sum + occ.budget, 0);
  const totalSpent = occasions.reduce((sum, occ) => sum + occ.spent, 0);

  // Occasion tabs
  const occasionTabs = [
    { id: 'overview', label: 'نظرة عامة', icon: ChartBarIcon },
    { id: 'calendar', label: 'التقويم', icon: CalendarIcon },
    { id: 'events', label: 'المناسبات', icon: CalendarDaysIcon },
    { id: 'planning', label: 'التخطيط', icon: SparklesIcon },
    { id: 'gallery', label: 'معرض الصور', icon: CameraIcon }
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
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            <span>{trendValue}</span>
            <div className={`w-0 h-0 border-l-4 border-r-4 border-transparent ${
              trend === 'up' ? 'border-b-4 border-b-green-600' : 'border-t-4 border-t-red-600'
            }`} />
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

  const AppleOccasionCard = ({ occasion }) => {
    const typeInfo = getOccasionTypeInfo(occasion.type);
    const statusInfo = getStatusInfo(occasion.status);
    const TypeIcon = typeInfo.icon;
    const StatusIcon = statusInfo.icon;

    const attendancePercentage = (occasion.attendees / occasion.maxAttendees) * 100;
    const budgetPercentage = (occasion.spent / occasion.budget) * 100;

    return (
      <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '24px', transform: 'scale(1)', transition: 'all 0.3s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)' }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-r ${typeInfo.gradient} flex items-center justify-center text-white shadow-lg`}
            >
              <TypeIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {occasion.title}
              </h3>
              <p className="text-sm text-gray-600">{typeInfo.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
            >
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </div>
            <div style={{ display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.3s' }} onMouseEnter={(e) => { e.currentTarget.style.opacity = 1 }} onMouseLeave={(e) => { e.currentTarget.style.opacity = 0 }}>
              <button style={{ padding: '8px', background: 'rgba(248, 250, 252, 1)', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EyeIcon className="w-4 h-4" />
              </button>
              <button style={{ padding: '8px', background: 'rgba(248, 250, 252, 1)', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PencilIcon className="w-4 h-4" />
              </button>
              <button style={{ padding: '8px', background: 'rgba(248, 250, 252, 1)', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShareIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CalendarIcon className="w-4 h-4" />
            <span>{occasion.date} - {occasion.time}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPinIcon className="w-4 h-4" />
            <span>{occasion.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <UserGroupIcon className="w-4 h-4" />
            <span>{occasion.attendees} من {occasion.maxAttendees} مشارك</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{occasion.description}</p>

        {/* Progress Bars */}
        <div className="space-y-3 mb-4">
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>الحضور</span>
              <span>{attendancePercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${attendancePercentage}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>الميزانية</span>
              <span>{budgetPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${budgetPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {occasion.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-200 rounded-lg text-xs text-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ flex: 1, padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <EyeIcon className="w-4 h-4" />
            عرض التفاصيل
          </button>
          <button style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BellIcon className="w-4 h-4" />
          </button>
          <button style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShareIcon className="w-4 h-4" />
          </button>
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
                title="إجمالي المناسبات"
                value={totalOccasions.toString()}
                icon={CalendarDaysIcon}
                gradient="#007AFF, #5856D6"
                trend="up"
                trendValue="+5"
              />
              <AppleStatCard
                title="المناسبات القادمة"
                value={upcomingOccasions.toString()}
                icon={ClockIcon}
                gradient="#30D158, #32D74B"
                trend="up"
                trendValue="+2"
              />
              <AppleStatCard
                title="إجمالي المشاركين"
                value={totalAttendees.toString()}
                icon={UsersIcon}
                gradient="#FF9500, #FFCC02"
                subtitle="هذا الشهر"
              />
              <AppleStatCard
                title="الميزانية المستخدمة"
                value={`${((totalSpent / totalBudget) * 100).toFixed(0)}%`}
                icon={ChartBarIcon}
                gradient="#FF3B30, #FF453A"
                subtitle={`${totalSpent.toLocaleString('ar-SA')} من ${totalBudget.toLocaleString('ar-SA')} ر.س`}
              />
            </div>

            {/* Quick Actions */}
            <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '24px' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">إجراءات سريعة</h3>
                  <p className="text-sm text-gray-600">إدارة المناسبات والفعاليات</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <PlusIcon className="w-4 h-4" />
                  إضافة مناسبة
                </button>
                <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarIcon className="w-4 h-4" />
                  عرض التقويم
                </button>
                <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChartBarIcon className="w-4 h-4" />
                  التقارير
                </button>
              </div>
            </div>

            {/* Recent Occasions */}
            <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '24px' }}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">المناسبات الأخيرة</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {occasions.slice(0, 4).map((occasion) => (
                  <AppleOccasionCard key={occasion.id} occasion={occasion} />
                ))}
              </div>
            </div>
          </div>
        );

      case 'calendar':
        return (
          <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '32px', textAlign: 'center' }}>
            <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">تقويم المناسبات</h3>
            <p className="text-gray-600">سيتم إضافة تقويم تفاعلي للمناسبات قريباً</p>
          </div>
        );

      case 'events':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">جميع المناسبات</h3>
                <p className="text-gray-600">إدارة مناسبات وفعاليات العائلة</p>
              </div>
              <button
                onClick={() => {
                  logger.debug('Add button clicked!');
                  setShowAddModal(true);
                }}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <PlusIcon className="w-4 h-4" />
                مناسبة جديدة
              </button>
            </div>

            {/* Filters */}
            <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '16px' }}>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <div style={{ position: 'relative' }}>
                    <MagnifyingGlassIcon style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="البحث في المناسبات..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px 12px 44px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#1f2937', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ padding: '12px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#1f2937', fontSize: '14px', outline: 'none' }}
                >
                  <option value="">جميع الأنواع</option>
                  <option value="birthday">عيد ميلاد</option>
                  <option value="wedding">زفاف</option>
                  <option value="meeting">اجتماع</option>
                  <option value="trip">رحلة</option>
                  <option value="celebration">احتفال</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ padding: '12px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#1f2937', fontSize: '14px', outline: 'none' }}
                >
                  <option value="">جميع الحالات</option>
                  <option value="upcoming">قادمة</option>
                  <option value="ongoing">جارية</option>
                  <option value="completed">منتهية</option>
                  <option value="planning">تحت التخطيط</option>
                  <option value="cancelled">ملغية</option>
                </select>
              </div>
            </div>

            {/* Occasions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {occasions
                .filter(occasion =>
                  (!filterType || occasion.type === filterType) &&
                  (!filterStatus || occasion.status === filterStatus) &&
                  (!searchQuery || occasion.title.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map((occasion) => (
                  <AppleOccasionCard key={occasion.id} occasion={occasion} />
                ))
              }
            </div>
          </div>
        );

      case 'planning':
        return (
          <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '32px', textAlign: 'center' }}>
            <SparklesIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">أدوات التخطيط</h3>
            <p className="text-gray-600">سيتم إضافة أدوات التخطيط المتقدمة للمناسبات قريباً</p>
          </div>
        );

      case 'gallery':
        return (
          <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(229, 231, 235, 0.5)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '32px', textAlign: 'center' }}>
            <CameraIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">معرض الصور</h3>
            <p className="text-gray-600">سيتم إضافة معرض صور المناسبات والذكريات قريباً</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl" style={{ backgroundColor: 'white', minHeight: '100vh' }}>
      {/* Apple Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px', background: 'linear-gradient(135deg, rgba(243, 244, 246, 0.9), rgba(249, 250, 251, 0.9))', backdropFilter: 'blur(10px)', borderRadius: '16px', marginBottom: '24px' }}>
        {occasionTabs.map((tab) => {
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

      {/* Add Occasion Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
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
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>إضافة مناسبة جديدة</h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                <XMarkIcon style={{ width: '24px', height: '24px' }} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{
              flex: 1,
              overflowY: 'auto',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 160px)'
            }}>
              <div style={{ display: 'grid', gap: '20px', flex: 1 }}>
                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    عنوان المناسبة *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOccasion.title}
                    onChange={(e) => setNewOccasion(prev => ({ ...prev, title: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '12px',
                      fontSize: '14px'
                    }}
                    placeholder="مثال: حفل زفاف أحمد"
                  />
                </div>

                {/* Type and Organizer */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      نوع المناسبة *
                    </label>
                    <select
                      required
                      value={newOccasion.type}
                      onChange={(e) => setNewOccasion(prev => ({ ...prev, type: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '12px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="celebration">احتفال</option>
                      <option value="wedding">زفاف</option>
                      <option value="birthday">عيد ميلاد</option>
                      <option value="meeting">اجتماع</option>
                      <option value="trip">رحلة</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      المنظم *
                    </label>
                    <input
                      type="text"
                      required
                      value={newOccasion.organizer}
                      onChange={(e) => setNewOccasion(prev => ({ ...prev, organizer: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '12px',
                        fontSize: '14px'
                      }}
                      placeholder="اسم المنظم"
                    />
                  </div>
                </div>

                {/* Date and Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <SimpleHijriDatePicker
                      label="تاريخ المناسبة"
                      value={newOccasion.date}
                      onChange={(gregorianDate) => setNewOccasion(prev => ({ ...prev, date: gregorianDate }))}
                      required={true}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      الوقت *
                    </label>
                    <input
                      type="time"
                      required
                      value={newOccasion.time}
                      onChange={(e) => setNewOccasion(prev => ({ ...prev, time: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '12px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    المكان *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOccasion.location}
                    onChange={(e) => setNewOccasion(prev => ({ ...prev, location: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '12px',
                      fontSize: '14px'
                    }}
                    placeholder="مثال: قاعة الاحتفالات - الرياض"
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    الوصف
                  </label>
                  <textarea
                    value={newOccasion.description}
                    onChange={(e) => setNewOccasion(prev => ({ ...prev, description: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '12px',
                      fontSize: '14px',
                      minHeight: '100px'
                    }}
                    placeholder="وصف المناسبة..."
                  />
                </div>

                {/* Max Attendees and Budget */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      عدد الحضور المتوقع
                    </label>
                    <input
                      type="number"
                      value={newOccasion.maxAttendees}
                      onChange={(e) => setNewOccasion(prev => ({ ...prev, maxAttendees: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '12px',
                        fontSize: '14px'
                      }}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      الميزانية (ريال)
                    </label>
                    <input
                      type="number"
                      value={newOccasion.budget}
                      onChange={(e) => setNewOccasion(prev => ({ ...prev, budget: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '12px',
                        fontSize: '14px'
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '24px',
                paddingTop: '24px',
                borderTop: '1px solid #e5e7eb',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '10px 24px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '12px',
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
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  إضافة المناسبة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


// Phase 4: Performance Optimization - Memoize to prevent unnecessary re-renders
export default React.memo(AppleOccasionsManagement);