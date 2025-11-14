import React, {  useState, useEffect , useCallback } from 'react';
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
  XMarkIcon,
  StarIcon,
  MoonIcon,
  SunIcon
} from '@heroicons/react/24/outline';
import { HijriDateDisplay, HijriDateFilter, HijriCalendarWidget } from '../Common/HijriDateDisplay';
import { formatHijriDate, formatDualDate, getIslamicOccasion } from '../../utils/hijriDateUtils';
import { logger } from '../../utils/logger';

import '../../styles/ultra-premium-islamic-design.css';

interface Occasion {
  id: number;
  title: string;
  type: 'wedding' | 'birthday' | 'meeting' | 'trip' | 'celebration' | 'religious';
  date: string;
  time: string;
  endDate?: string;
  location: string;
  description: string;
  attendees: number;
  maxAttendees: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'planning';
  organizer: string;
  budget: number;
  spent: number;
  image?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  rsvpDeadline?: string;
  notificationSent: boolean;
}

const HijriOccasionsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | null>(null);

  // Mock data with dates
  const mockOccasions: Occasion[] = [
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
      tags: ['عائلي', 'احتفال', 'عيد ميلاد'],
      createdAt: '2024-02-01T10:00:00',
      updatedAt: '2024-03-10T14:30:00',
      rsvpDeadline: '2024-03-10',
      notificationSent: false
    },
    {
      id: 2,
      title: 'اجتماع العائلة الشهري',
      type: 'meeting',
      date: '2024-02-28',
      time: '19:30',
      endDate: '2024-02-28',
      location: 'بيت العائلة الرئيسي',
      description: 'اجتماع شهري لمناقشة شؤون العائلة والقرارات المهمة',
      attendees: 32,
      maxAttendees: 40,
      status: 'completed',
      organizer: 'محمد الشعيل',
      budget: 1500,
      spent: 1200,
      tags: ['اجتماع', 'مهم', 'قرارات'],
      createdAt: '2024-02-15T09:00:00',
      updatedAt: '2024-02-28T22:00:00',
      notificationSent: true
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
      tags: ['زفاف', 'مناسبة كبيرة', 'احتفال'],
      createdAt: '2024-01-10T13:00:00',
      updatedAt: '2024-03-12T16:00:00',
      rsvpDeadline: '2024-05-01',
      notificationSent: false
    }
  ];

  useEffect(() => {
    setOccasions(mockOccasions);
  }, []);

  // Helper functions
  const getOccasionTypeInfo = (type: string) => {
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

    const types: Record<string, any> = {
      birthday: { label: 'عيد ميلاد', icon: CakeIcon, color: '#FF3B30', gradient: 'from-red-500 to-pink-500' },
      wedding: { label: 'زفاف', icon: HeartIcon, color: '#FF2D92', gradient: 'from-pink-500 to-rose-500' },
      meeting: { label: 'اجتماع', icon: UsersIcon, color: '#007AFF', gradient: 'from-blue-500 to-indigo-500' },
      trip: { label: 'رحلة', icon: MapPinIcon, color: '#30D158', gradient: 'from-green-500 to-emerald-500' },
      celebration: { label: 'احتفال', icon: SparklesIcon, color: '#FF9500', gradient: 'from-orange-500 to-amber-500' },
      religious: { label: 'ديني', icon: MoonIcon, color: '#5856D6', gradient: 'from-purple-500 to-indigo-500' }
    };
    return types[type] || types.celebration;
  };

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, any> = {
      upcoming: { label: 'قادمة', color: '#007AFF', icon: ClockIcon },
      ongoing: { label: 'جارية', color: '#30D158', icon: CheckCircleIcon },
      completed: { label: 'منتهية', color: '#8E8E93', icon: CheckCircleIcon },
      cancelled: { label: 'ملغية', color: '#FF3B30', icon: ExclamationCircleIcon },
      planning: { label: 'تحت التخطيط', color: '#FF9500', icon: CalendarDaysIcon }
    };
    return statuses[status] || statuses.upcoming;
  };

  // Add Event Modal Component
  const AddEventModal: React.FC = () => {
    const [eventData, setEventData] = useState({
      title: '',
      type: 'celebration',
      date: '',
      time: '',
      endDate: '',
      location: '',
      description: '',
      maxAttendees: 50,
      budget: 0,
      organizer: '',
      tags: '',
      rsvpDeadline: '',
      // Hijri date fields - UPDATED FOR HIJRI DROPDOWNS
      startDay: '',
      startMonth: '',
      startYear: '1446',
      endDay: '',
      endMonth: '',
      endYear: '',
      rsvpDay: '',
      rsvpMonth: '',
      rsvpYear: ''
    });

    // Hijri months
    const hijriMonths = [
      { value: '01', label: 'محرم' },
      { value: '02', label: 'صفر' },
      { value: '03', label: 'ربيع الأول' },
      { value: '04', label: 'ربيع الآخر' },
      { value: '05', label: 'جمادى الأولى' },
      { value: '06', label: 'جمادى الآخرة' },
      { value: '07', label: 'رجب' },
      { value: '08', label: 'شعبان' },
      { value: '09', label: 'رمضان' },
      { value: '10', label: 'شوال' },
      { value: '11', label: 'ذو القعدة' },
      { value: '12', label: 'ذو الحجة' }
    ];

    // Generate days (1-30)
    const days = Array.from({ length: 30 }, (_, i) => ({
      value: String(i + 1).padStart(2, '0'),
      label: String(i + 1)
    }));

    // Generate years (1445-1450)
    const years = Array.from({ length: 6 }, (_, i) => ({
      value: String(1445 + i),
      label: String(1445 + i)
    }));

    return (
      <div className="modal-overlay-premium" onClick={() => setShowAddModal(false)}>
        <div className="modal-content-premium" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="icon-wrapper-gradient" style={{ background: 'var(--gradient-islamic)' }}>
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">إضافة مناسبة جديدة</h2>
            </div>
            <button
              onClick={() => setShowAddModal(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Form */}
          <form className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">عنوان المناسبة *</label>
              <input
                type="text"
                value={eventData.title}
                onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                className="input-premium w-full"
                placeholder="أدخل عنوان المناسبة"
                required
              />
            </div>

            {/* Type and Organizer */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع المناسبة *</label>
                <select
                  value={eventData.type}
                  onChange={(e) => setEventData({ ...eventData, type: e.target.value })}
                  className="input-premium w-full"
                >
                  <option value="celebration">احتفال</option>
                  <option value="wedding">زفاف</option>
                  <option value="birthday">عيد ميلاد</option>
                  <option value="meeting">اجتماع</option>
                  <option value="trip">رحلة</option>
                  <option value="religious">ديني</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المنظم *</label>
                <input
                  type="text"
                  value={eventData.organizer}
                  onChange={(e) => setEventData({ ...eventData, organizer: e.target.value })}
                  className="input-premium w-full"
                  placeholder="اسم المنظم"
                  required
                />
              </div>
            </div>

            {/* Date and Time with Hijri Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ البداية (هجري) *</label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={eventData.startDay}
                  onChange={(e) => setEventData({ ...eventData, startDay: e.target.value })}
                  className="input-premium"
                  required
                >
                  <option value="">اليوم</option>
                  {days.map(day => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
                <select
                  value={eventData.startMonth}
                  onChange={(e) => setEventData({ ...eventData, startMonth: e.target.value })}
                  className="input-premium"
                  required
                >
                  <option value="">الشهر</option>
                  {hijriMonths.map(month => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
                <select
                  value={eventData.startYear}
                  onChange={(e) => setEventData({ ...eventData, startYear: e.target.value })}
                  className="input-premium"
                  required
                >
                  <option value="">السنة</option>
                  {years.map(year => (
                    <option key={year.value} value={year.value}>{year.label} هـ</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الوقت *</label>
                <input
                  type="time"
                  value={eventData.time}
                  onChange={(e) => setEventData({ ...eventData, time: e.target.value })}
                  className="input-premium w-full"
                  required
                />
              </div>
            </div>

            {/* End Date and RSVP Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ النهاية (هجري - اختياري)</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={eventData.endDay}
                    onChange={(e) => setEventData({ ...eventData, endDay: e.target.value })}
                    className="input-premium"
                  >
                    <option value="">اليوم</option>
                    {days.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                  <select
                    value={eventData.endMonth}
                    onChange={(e) => setEventData({ ...eventData, endMonth: e.target.value })}
                    className="input-premium"
                  >
                    <option value="">الشهر</option>
                    {hijriMonths.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                  <select
                    value={eventData.endYear}
                    onChange={(e) => setEventData({ ...eventData, endYear: e.target.value })}
                    className="input-premium"
                  >
                    <option value="">السنة</option>
                    {years.map(year => (
                      <option key={year.value} value={year.value}>{year.label} هـ</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">آخر موعد للتأكيد (هجري)</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={eventData.rsvpDay}
                    onChange={(e) => setEventData({ ...eventData, rsvpDay: e.target.value })}
                    className="input-premium"
                  >
                    <option value="">اليوم</option>
                    {days.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                  <select
                    value={eventData.rsvpMonth}
                    onChange={(e) => setEventData({ ...eventData, rsvpMonth: e.target.value })}
                    className="input-premium"
                  >
                    <option value="">الشهر</option>
                    {hijriMonths.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                  <select
                    value={eventData.rsvpYear}
                    onChange={(e) => setEventData({ ...eventData, rsvpYear: e.target.value })}
                    className="input-premium"
                  >
                    <option value="">السنة</option>
                    {years.map(year => (
                      <option key={year.value} value={year.value}>{year.label} هـ</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المكان *</label>
              <input
                type="text"
                value={eventData.location}
                onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                className="input-premium w-full"
                placeholder="موقع المناسبة"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
              <textarea
                value={eventData.description}
                onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                className="input-premium w-full"
                rows={3}
                placeholder="وصف المناسبة"
              />
            </div>

            {/* Attendees and Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">العدد الأقصى للحضور</label>
                <input
                  type="number"
                  value={eventData.maxAttendees}
                  onChange={(e) => setEventData({ ...eventData, maxAttendees: parseInt(e.target.value) })}
                  className="input-premium w-full"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الميزانية (ريال)</label>
                <input
                  type="number"
                  value={eventData.budget}
                  onChange={(e) => setEventData({ ...eventData, budget: parseInt(e.target.value) })}
                  className="input-premium w-full"
                  min="0"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الوسوم (مفصولة بفاصلة)</label>
              <input
                type="text"
                value={eventData.tags}
                onChange={(e) => setEventData({ ...eventData, tags: e.target.value })}
                className="input-premium w-full"
                placeholder="مثال: عائلي، احتفال، مهم"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn-gradient-premium"
                onClick={(e) => {
                  e.preventDefault();
                  logger.debug('Event Data:', { eventData });
                  // Here you would handle the form submission
                  setShowAddModal(false);
                }}
              >
                إضافة المناسبة
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Calculate statistics
  const totalOccasions = occasions.length;
  const upcomingOccasions = occasions.filter(o => o.status === 'upcoming' || o.status === 'planning').length;
  const totalAttendees = occasions.reduce((sum, o) => sum + o.attendees, 0);
  const totalBudget = occasions.reduce((sum, o) => sum + o.budget, 0);
  const totalSpent = occasions.reduce((sum, o) => sum + o.spent, 0);

  // Occasion Card Component
  const OccasionCard: React.FC<{ occasion: Occasion }> = ({ occasion }) => {
    const typeInfo = getOccasionTypeInfo(occasion.type);
    const statusInfo = getStatusInfo(occasion.status);
    const TypeIcon = typeInfo.icon;
    const StatusIcon = statusInfo.icon;

    const attendancePercentage = (occasion.attendees / occasion.maxAttendees) * 100;
    const budgetPercentage = (occasion.spent / occasion.budget) * 100;

    // Check if it's an Islamic occasion
    const islamicOccasion = getIslamicOccasion && getIslamicOccasion(new Date(occasion.date));

    return (
      <div className="glass-card-premium" style={{ padding: '24px', marginBottom: '16px' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 rounded-xl bg-gradient-to-r ${typeInfo.gradient} flex items-center justify-center text-white shadow-lg`}
            >
              <TypeIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{occasion.title}</h3>
              <p className="text-sm text-gray-600">{occasion.description}</p>
              {islamicOccasion && (
                <div className="mt-1">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                    {islamicOccasion.nameAr}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium`}
                  style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Hijri Date Display */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">التاريخ:</span>
              <HijriDateDisplay
                date={occasion.date}
                format="full"
                showIcon={false}
                showBoth={true}
                highlightToday={new Date(occasion.date).toDateString() === new Date().toDateString()}
                style={{ padding: '4px 8px', fontSize: '13px' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">الوقت:</span>
              <span className="text-sm font-medium text-gray-900">{occasion.time}</span>
            </div>
          </div>

          {occasion.rsvpDeadline && (
            <div className="flex items-center gap-2">
              <BellIcon className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600">آخر موعد للتأكيد:</span>
              <HijriDateDisplay
                date={occasion.rsvpDeadline}
                format="medium"
                showIcon={false}
                showBoth={true}
                style={{ padding: '4px 8px', fontSize: '13px' }}
              />
            </div>
          )}
        </div>

        {/* Location and Organizer */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">المكان:</span>
            <span className="text-sm font-medium text-gray-900">{occasion.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserGroupIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">المنظم:</span>
            <span className="text-sm font-medium text-gray-900">{occasion.organizer}</span>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3 mb-4">
          {/* Attendance Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">
                الحضور: {occasion.attendees} / {occasion.maxAttendees} شخص
              </span>
              <span className="text-sm font-bold text-blue-600">{attendancePercentage.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${attendancePercentage}%`,
                  background: 'linear-gradient(135deg, #007AFF, #5856D6)'
                }}
              />
            </div>
          </div>

          {/* Budget Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">
                الميزانية: {occasion.spent.toLocaleString()} / {occasion.budget.toLocaleString()} ريال
              </span>
              <span className="text-sm font-bold text-green-600">{budgetPercentage.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${budgetPercentage}%`,
                  background: 'linear-gradient(135deg, #30D158, #34C759)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            {occasion.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs"
              >
                #{tag}
              </span>
            ))}
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
            <div className="icon-wrapper-gradient" style={{ background: 'var(--gradient-royal)' }}>
              <CalendarDaysIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">إدارة المناسبات</h1>
              <p className="text-sm text-gray-600">إدارة وتنظيم المناسبات العائلية</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-gradient-premium flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            مناسبة جديدة
          </button>
        </div>

        {/* Hijri Date Filter */}
        <HijriDateFilter
          onFilterChange={(filter) => {
            logger.debug('Date filter applied:', { filter });
          }}
        />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="إجمالي المناسبات"
          value={totalOccasions}
          icon={CalendarDaysIcon}
          gradient="#5856D6, #AF52DE"
          subtitle="جميع المناسبات"
        />
        <StatCard
          title="المناسبات القادمة"
          value={upcomingOccasions}
          icon={ClockIcon}
          gradient="#007AFF, #5AC8FA"
          subtitle="قيد التخطيط"
          trend="+2"
        />
        <StatCard
          title="إجمالي الحضور"
          value={totalAttendees}
          icon={UserGroupIcon}
          gradient="#FF2D92, #F43F5E"
          subtitle="مشارك مؤكد"
        />
        <StatCard
          title="الميزانية الكلية"
          value={`${totalBudget.toLocaleString()} ريال`}
          icon={GiftIcon}
          gradient="#FF9500, #F59E0B"
          subtitle="مخصص للمناسبات"
        />
        <StatCard
          title="المصروفات"
          value={`${totalSpent.toLocaleString()} ريال`}
          icon={ChartBarIcon}
          gradient="#30D158, #34C759"
          subtitle={`${((totalSpent / totalBudget) * 100).toFixed(1)}% من الميزانية`}
          trend="+8%"
        />
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="البحث في المناسبات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-premium w-full pr-10"
          />
          <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input-premium"
        >
          <option value="">جميع الأنواع</option>
          <option value="wedding">زفاف</option>
          <option value="birthday">عيد ميلاد</option>
          <option value="meeting">اجتماع</option>
          <option value="trip">رحلة</option>
          <option value="celebration">احتفال</option>
          <option value="religious">ديني</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-premium"
        >
          <option value="">جميع الحالات</option>
          <option value="upcoming">قادمة</option>
          <option value="ongoing">جارية</option>
          <option value="completed">منتهية</option>
          <option value="cancelled">ملغية</option>
          <option value="planning">تحت التخطيط</option>
        </select>
      </div>

      {/* Occasions List */}
      <div className="space-y-4">
        {occasions
          .filter(occasion => {
            const matchesSearch = occasion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 occasion.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = !filterType || occasion.type === filterType;
            const matchesStatus = !filterStatus || occasion.status === filterStatus;
            return matchesSearch && matchesType && matchesStatus;
          })
          .map(occasion => (
            <OccasionCard key={occasion.id} occasion={occasion} />
          ))}
      </div>

      {/* Add Event Modal */}
      {showAddModal && <AddEventModal />}

      {/* Empty State */}
      {occasions.length === 0 && (
        <div className="text-center py-12">
          <CalendarDaysIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مناسبات</h3>
          <p className="text-sm text-gray-600">ابدأ بإضافة أول مناسبة للعائلة</p>
        </div>
      )}
    </div>
  );
};


// Phase 4: Performance Optimization - Memoize to prevent unnecessary re-renders
export default React.memo(HijriOccasionsManagement);