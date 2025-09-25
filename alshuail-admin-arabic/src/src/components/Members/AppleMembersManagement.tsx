import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { memberService } from '../../services/memberService';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserGroupIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  ChatBubbleBottomCenterTextIcon,
  UsersIcon,
  StarIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  MapPinIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import '../../styles/apple-design-system.css';

// Enhanced TypeScript interfaces
interface Member {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  status: 'active' | 'inactive' | 'pending';
  profile_completed: boolean;
  social_security_beneficiary: boolean;
  registration_date: string;
  last_payment_date?: string;
  total_payments: number;
  membership_type: 'premium' | 'standard' | 'trial';
  avatar?: string;
  address?: string;
  birth_date?: string;
  family_members_count?: number;
}

interface Statistics {
  total: number;
  active: number;
  completed_profiles: number;
  pending_profiles: number;
  social_security_beneficiaries: number;
  premium_members: number;
  total_payments: number;
  new_this_month: number;
}

interface FilterState {
  status: string;
  profile_completed: string;
  social_security_beneficiary: string;
  membership_type: string;
  registration_period: string;
  search?: string; // Add search property
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const AppleMembersManagement: React.FC = () => {
  // State management
  const [members, setMembers] = useState<Member[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({} as Statistics);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    profile_completed: '',
    social_security_beneficiary: '',
    membership_type: '',
    registration_period: ''
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 0
  });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortBy, setSortBy] = useState<string>('registration_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load data effects
  useEffect(() => {
    loadStatistics();
  }, []);

  useEffect(() => {
    loadMembers();
  }, [filters, pagination.page, searchQuery, sortBy, sortOrder]);

  // Data loading functions
  const loadStatistics = async () => {
    try {
      const stats = await memberService.getMemberStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadMembers = async () => {
    setLoading(true);
    try {
      const searchFilters = { ...filters };
      if (searchQuery.trim()) {
        searchFilters.search = searchQuery.trim();
      }

      const response = await memberService.getMembersList(
        searchFilters,
        pagination.page,
        pagination.limit
      );

      setMembers(response.members || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0,
        totalPages: response.totalPages || 0
      }));
    } catch (error) {
      console.error('Error loading members:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Event handlers
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFilterChange = (filterKey: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSelectMember = (memberId: string) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map(member => member.id));
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Utility functions
  const getMemberStatusColor = (status: Member['status']): string => {
    switch (status) {
      case 'active': return 'apple-badge-success';
      case 'inactive': return 'apple-badge-danger';
      case 'pending': return 'apple-badge-warning';
      default: return 'apple-badge';
    }
  };

  const getMemberStatusText = (status: Member['status']): string => {
    switch (status) {
      case 'active': return 'نشط';
      case 'inactive': return 'غير نشط';
      case 'pending': return 'في الانتظار';
      default: return 'غير محدد';
    }
  };

  const getMemberTypeColor = (type: Member['membership_type']): string => {
    switch (type) {
      case 'premium': return 'apple-badge-primary';
      case 'standard': return 'apple-badge';
      case 'trial': return 'apple-badge-warning';
      default: return 'apple-badge';
    }
  };

  const getMemberTypeText = (type: Member['membership_type']): string => {
    switch (type) {
      case 'premium': return 'مميز';
      case 'standard': return 'عادي';
      case 'trial': return 'تجريبي';
      default: return 'غير محدد';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Statistics cards data
  const statisticsCards = useMemo(() => [
    {
      title: 'إجمالي الأعضاء',
      value: statistics.total || 0,
      icon: UserGroupIcon,
      color: 'system-blue',
      bgGradient: 'from-blue-500 to-indigo-600',
      description: 'العدد الكلي للأعضاء'
    },
    {
      title: 'الأعضاء النشطون',
      value: statistics.active || 0,
      icon: CheckCircleIcon,
      color: 'system-green',
      bgGradient: 'from-green-500 to-emerald-600',
      description: 'الأعضاء النشطون حالياً'
    },
    {
      title: 'الملفات المكتملة',
      value: statistics.completed_profiles || 0,
      icon: CheckCircleIconSolid,
      color: 'system-mint',
      bgGradient: 'from-teal-500 to-cyan-600',
      description: 'ملفات البيانات المكتملة'
    },
    {
      title: 'الأعضاء المميزون',
      value: statistics.premium_members || 0,
      icon: StarIconSolid,
      color: 'system-purple',
      bgGradient: 'from-purple-500 to-pink-600',
      description: 'الأعضاء بالعضوية المميزة'
    },
    {
      title: 'إجمالي المدفوعات',
      value: formatCurrency(statistics.total_payments || 0),
      icon: BanknotesIcon,
      color: 'system-orange',
      bgGradient: 'from-orange-500 to-amber-600',
      description: 'المبلغ الإجمالي للمدفوعات'
    }
  ], [statistics]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(value => value !== '').length;
  }, [filters]);

  return (
    <div className="min-h-screen apple-font-system p-6" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }} dir="rtl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="apple-flex-between items-start mb-6">
          <div>
            <h1 className="apple-title-1 text-gray-900 mb-2">إدارة الأعضاء</h1>
            <p className="apple-body text-gray-600">نظام شامل لإدارة أعضاء العائلة ومتابعة بياناتهم</p>
          </div>
          <div className="apple-flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`apple-button ${showFilters ? 'apple-button-primary' : 'apple-button-secondary'} apple-flex items-center gap-2`}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              <span>الفلاتر</span>
              {activeFiltersCount > 0 && (
                <span className="apple-badge apple-badge-danger">{activeFiltersCount}</span>
              )}
            </button>
            <button className="apple-button apple-button-secondary apple-flex items-center gap-2">
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>تصدير</span>
            </button>
            <button className="apple-button apple-button-primary apple-flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              <span>إضافة عضو</span>
            </button>
          </div>
        </div>

        {/* Search and View Controls */}
        <div className="apple-flex-between items-center mb-6">
          <div className="apple-input-floating" style={{ width: '400px' }}>
            <input
              type="text"
              placeholder=" "
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="apple-input"
            />
            <label>البحث في الأعضاء...</label>
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>

          <div className="apple-flex items-center gap-3">
            <div className="apple-flex bg-white rounded-xl border border-gray-200 p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'table' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                جدول
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'cards' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                بطاقات
              </button>
            </div>
            {selectedMembers.length > 0 && (
              <button className="apple-button apple-button-secondary apple-flex items-center gap-2">
                <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                <span>إرسال رسالة ({selectedMembers.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="apple-grid apple-grid-5 gap-6 mb-8">
          {statisticsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="apple-card p-6 group apple-animate-delay"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="apple-flex-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl apple-flex-center text-white shadow-lg bg-gradient-to-br ${stat.bgGradient}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <h3 className="apple-title-2 text-gray-900 mb-1">{stat.value}</h3>
                  <p className="apple-callout text-gray-900 mb-1">{stat.title}</p>
                  <p className="apple-caption-1 text-gray-600">{stat.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="apple-card p-6 mb-6 apple-animate-slide-up">
            <div className="apple-flex-between items-center mb-4">
              <h3 className="apple-title-3 text-gray-900">فلاتر البحث</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="apple-button apple-button-secondary !min-h-8 !px-2"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="apple-grid apple-grid-4 gap-4">
              <div>
                <label className="apple-caption-1 text-gray-600 block mb-2">حالة العضوية</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="apple-input"
                >
                  <option value="">جميع الحالات</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="pending">في الانتظار</option>
                </select>
              </div>
              <div>
                <label className="apple-caption-1 text-gray-600 block mb-2">اكتمال الملف</label>
                <select
                  value={filters.profile_completed}
                  onChange={(e) => handleFilterChange('profile_completed', e.target.value)}
                  className="apple-input"
                >
                  <option value="">جميع الملفات</option>
                  <option value="true">مكتمل</option>
                  <option value="false">غير مكتمل</option>
                </select>
              </div>
              <div>
                <label className="apple-caption-1 text-gray-600 block mb-2">نوع العضوية</label>
                <select
                  value={filters.membership_type}
                  onChange={(e) => handleFilterChange('membership_type', e.target.value)}
                  className="apple-input"
                >
                  <option value="">جميع الأنواع</option>
                  <option value="premium">مميز</option>
                  <option value="standard">عادي</option>
                  <option value="trial">تجريبي</option>
                </select>
              </div>
              <div>
                <label className="apple-caption-1 text-gray-600 block mb-2">فترة التسجيل</label>
                <select
                  value={filters.registration_period}
                  onChange={(e) => handleFilterChange('registration_period', e.target.value)}
                  className="apple-input"
                >
                  <option value="">جميع الفترات</option>
                  <option value="last_week">الأسبوع الماضي</option>
                  <option value="last_month">الشهر الماضي</option>
                  <option value="last_3_months">آخر 3 أشهر</option>
                  <option value="last_year">السنة الماضية</option>
                </select>
              </div>
            </div>
            <div className="apple-flex gap-3 mt-4">
              <button
                onClick={() => setFilters({
                  status: '',
                  profile_completed: '',
                  social_security_beneficiary: '',
                  membership_type: '',
                  registration_period: ''
                })}
                className="apple-button apple-button-secondary"
              >
                مسح الفلاتر
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Members Content */}
      {loading ? (
        <div className="apple-card p-12">
          <div className="apple-flex-center">
            <div className="text-center">
              <div className="w-12 h-12 mb-4 mx-auto apple-skeleton rounded-xl"></div>
              <p className="apple-body text-gray-600">جاري تحميل بيانات الأعضاء...</p>
            </div>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="apple-card overflow-hidden">
          <table className="apple-table">
            <thead>
              <tr>
                <th className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedMembers.length === members.length && members.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('full_name')}
                >
                  <div className="apple-flex items-center gap-2">
                    <span>الاسم</span>
                    {sortBy === 'full_name' && (
                      <ChevronLeftIcon className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th>الحالة</th>
                <th>نوع العضوية</th>
                <th
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('registration_date')}
                >
                  <div className="apple-flex items-center gap-2">
                    <span>تاريخ التسجيل</span>
                    {sortBy === 'registration_date' && (
                      <ChevronLeftIcon className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th>المدفوعات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="group">
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => handleSelectMember(member.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td>
                    <div className="apple-flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg apple-flex-center font-semibold text-white bg-gradient-to-br from-blue-500 to-indigo-600">
                        {member.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="apple-callout text-gray-900">{member.full_name}</p>
                        <div className="apple-flex items-center gap-4 mt-1">
                          {member.phone && (
                            <div className="apple-flex items-center gap-1">
                              <PhoneIcon className="w-3 h-3 text-gray-400" />
                              <span className="apple-caption-1 text-gray-600">{member.phone}</span>
                            </div>
                          )}
                          {member.email && (
                            <div className="apple-flex items-center gap-1">
                              <EnvelopeIcon className="w-3 h-3 text-gray-400" />
                              <span className="apple-caption-1 text-gray-600">{member.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`apple-badge ${getMemberStatusColor(member.status)}`}>
                      {getMemberStatusText(member.status)}
                    </span>
                  </td>
                  <td>
                    <span className={`apple-badge ${getMemberTypeColor(member.membership_type)}`}>
                      {getMemberTypeText(member.membership_type)}
                    </span>
                  </td>
                  <td>
                    <div className="apple-flex items-center gap-1">
                      <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                      <span className="apple-caption-1 text-gray-600">{formatDate(member.registration_date)}</span>
                    </div>
                  </td>
                  <td>
                    <span className="apple-callout text-green-600">{formatCurrency(member.total_payments)}</span>
                  </td>
                  <td>
                    <div className="apple-flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="apple-button apple-button-secondary !min-h-8 !px-2">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button className="apple-button apple-button-secondary !min-h-8 !px-2">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button className="apple-button apple-button-secondary !min-h-8 !px-2 text-red-600">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="apple-flex-between items-center p-6 border-t border-gray-200">
              <p className="apple-caption-1 text-gray-600">
                عرض {(pagination.page - 1) * pagination.limit + 1} إلى {Math.min(pagination.page * pagination.limit, pagination.total)} من أصل {pagination.total} عضو
              </p>
              <div className="apple-flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="apple-button apple-button-secondary !min-h-8 !px-3 disabled:opacity-50"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setPagination(prev => ({ ...prev, page }))}
                      className={`apple-button !min-h-8 !px-3 ${
                        pagination.page === page ? 'apple-button-primary' : 'apple-button-secondary'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="apple-button apple-button-secondary !min-h-8 !px-3 disabled:opacity-50"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Cards View */
        <div className="apple-grid apple-grid-3 gap-6">
          {members.map((member) => (
            <div key={member.id} className="apple-card p-6 group hover:scale-105 transition-all duration-200">
              <div className="apple-flex-between items-start mb-4">
                <div className="apple-flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl apple-flex-center font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-600">
                    {member.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="apple-callout text-gray-900">{member.full_name}</h3>
                    <span className={`apple-badge ${getMemberStatusColor(member.status)} mt-1`}>
                      {getMemberStatusText(member.status)}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(member.id)}
                  onChange={() => handleSelectMember(member.id)}
                  className="rounded border-gray-300"
                />
              </div>

              <div className="space-y-3 mb-4">
                {member.phone && (
                  <div className="apple-flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <span className="apple-caption-1 text-gray-600">{member.phone}</span>
                  </div>
                )}
                {member.email && (
                  <div className="apple-flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    <span className="apple-caption-1 text-gray-600">{member.email}</span>
                  </div>
                )}
                <div className="apple-flex items-center gap-2">
                  <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                  <span className="apple-caption-1 text-gray-600">{formatDate(member.registration_date)}</span>
                </div>
              </div>

              <div className="apple-flex-between items-center pt-4 border-t border-gray-200">
                <span className={`apple-badge ${getMemberTypeColor(member.membership_type)}`}>
                  {getMemberTypeText(member.membership_type)}
                </span>
                <span className="apple-callout text-green-600">{formatCurrency(member.total_payments)}</span>
              </div>

              <div className="apple-flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="apple-button apple-button-secondary flex-1">
                  <EyeIcon className="w-4 h-4 ml-2" />
                  عرض
                </button>
                <button className="apple-button apple-button-secondary flex-1">
                  <PencilIcon className="w-4 h-4 ml-2" />
                  تعديل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && members.length === 0 && (
        <div className="apple-card p-12 text-center">
          <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="apple-title-3 text-gray-900 mb-2">لا توجد أعضاء</h3>
          <p className="apple-body text-gray-600 mb-6">
            {searchQuery || activeFiltersCount > 0
              ? 'لم يتم العثور على أعضاء يطابقون معايير البحث الحالية.'
              : 'لم يتم تسجيل أي أعضاء بعد. قم بإضافة العضو الأول.'}
          </p>
          <button className="apple-button apple-button-primary">
            <PlusIcon className="w-4 h-4 ml-2" />
            إضافة عضو جديد
          </button>
        </div>
      )}
    </div>
  );
};

export default AppleMembersManagement;