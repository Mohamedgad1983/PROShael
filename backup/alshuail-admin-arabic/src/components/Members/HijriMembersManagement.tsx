import React, { useState, useEffect } from 'react';
import {
  UsersIcon,
  UserPlusIcon,
  UserGroupIcon,
  IdentificationIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  CalendarDaysIcon,
  MapPinIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  CakeIcon,
  HomeIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { HijriDateDisplay, HijriDateFilter, HijriCalendarWidget } from '../Common/HijriDateDisplay';
import { formatHijriDate, formatDualDate, calculateHijriAge, formatTimeAgo } from '../../utils/hijriDateUtils';
import '../../styles/ultra-premium-islamic-design.css';

interface Member {
  id: number;
  nationalId: string;
  fullName: string;
  phone: string;
  whatsapp: string;
  email: string;
  birthDate: string;
  birthDateHijri?: string;
  joinDate: string;
  address: string;
  city: string;
  district: string;
  occupation: string;
  education: string;
  maritalStatus: string;
  spouseName?: string;
  childrenCount: number;
  membershipStatus: 'active' | 'inactive' | 'suspended' | 'pending';
  membershipType: 'regular' | 'honorary' | 'founding';
  registrationNumber: string;
  createdAt: string;
  updatedAt: string;
  lastPayment?: string;
  totalContributions: number;
  notes?: string;
}

const HijriMembersManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberDetails, setShowMemberDetails] = useState(false);

  // Mock data with Hijri dates
  const mockMembers: Member[] = [
    {
      id: 1,
      nationalId: '1234567890',
      fullName: 'أحمد محمد الشعيل',
      phone: '0501234567',
      whatsapp: '0501234567',
      email: 'ahmad@alshuail.com',
      birthDate: '1985-03-15',
      joinDate: '2020-01-01',
      address: 'شارع الملك فهد',
      city: 'الرياض',
      district: 'العليا',
      occupation: 'مهندس',
      education: 'بكالوريوس',
      maritalStatus: 'متزوج',
      spouseName: 'فاطمة الشعيل',
      childrenCount: 3,
      membershipStatus: 'active',
      membershipType: 'founding',
      registrationNumber: 'FSH-001',
      createdAt: '2020-01-01T10:00:00',
      updatedAt: '2024-03-10T14:30:00',
      lastPayment: '2024-03-01',
      totalContributions: 45000,
      notes: 'عضو مؤسس - نشط في الأعمال التطوعية'
    },
    {
      id: 2,
      nationalId: '0987654321',
      fullName: 'سارة عبدالله الشعيل',
      phone: '0509876543',
      whatsapp: '0509876543',
      email: 'sara@alshuail.com',
      birthDate: '1992-07-22',
      joinDate: '2021-06-15',
      address: 'حي النرجس',
      city: 'الرياض',
      district: 'النرجس',
      occupation: 'طبيبة',
      education: 'دكتوراه',
      maritalStatus: 'متزوجة',
      spouseName: 'محمد العتيبي',
      childrenCount: 2,
      membershipStatus: 'active',
      membershipType: 'regular',
      registrationNumber: 'RSH-045',
      createdAt: '2021-06-15T09:00:00',
      updatedAt: '2024-03-08T11:00:00',
      lastPayment: '2024-02-15',
      totalContributions: 28000
    },
    {
      id: 3,
      nationalId: '1122334455',
      fullName: 'محمد خالد الشعيل',
      phone: '0555555555',
      whatsapp: '0555555555',
      email: 'mohammed@alshuail.com',
      birthDate: '1978-11-30',
      joinDate: '2019-03-20',
      address: 'حي الملقا',
      city: 'الرياض',
      district: 'الملقا',
      occupation: 'رجل أعمال',
      education: 'ماجستير',
      maritalStatus: 'متزوج',
      spouseName: 'نورا الشعيل',
      childrenCount: 4,
      membershipStatus: 'active',
      membershipType: 'honorary',
      registrationNumber: 'HSH-003',
      createdAt: '2019-03-20T12:00:00',
      updatedAt: '2024-03-05T16:00:00',
      lastPayment: '2024-03-05',
      totalContributions: 120000,
      notes: 'عضو شرفي - كفيل رئيسي للمبادرات'
    }
  ];

  useEffect(() => {
    setMembers(mockMembers);
  }, []);

  // Helper functions
  const getMembershipStatusInfo = (status: string) => {
    const statuses: Record<string, any> = {
      active: { label: 'نشط', color: '#30D158', icon: CheckCircleIcon, bgColor: 'bg-green-100' },
      inactive: { label: 'غير نشط', color: '#8E8E93', icon: XCircleIcon, bgColor: 'bg-gray-100' },
      suspended: { label: 'معلق', color: '#FF9500', icon: ClockIcon, bgColor: 'bg-orange-100' },
      pending: { label: 'قيد الانتظار', color: '#007AFF', icon: ClockIcon, bgColor: 'bg-blue-100' }
    };
    return statuses[status] || statuses.active;
  };

  const getMembershipTypeInfo = (type: string) => {
    const types: Record<string, any> = {
      regular: { label: 'عادي', color: '#007AFF', gradient: 'from-blue-500 to-indigo-500' },
      honorary: { label: 'شرفي', color: '#FFD700', gradient: 'from-yellow-400 to-orange-500' },
      founding: { label: 'مؤسس', color: '#5856D6', gradient: 'from-purple-500 to-indigo-500' }
    };
    return types[type] || types.regular;
  };

  // Calculate statistics
  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.membershipStatus === 'active').length;
  const totalContributions = members.reduce((sum, m) => sum + m.totalContributions, 0);
  const averageAge = members.reduce((sum, m) => {
    const age = new Date().getFullYear() - new Date(m.birthDate).getFullYear();
    return sum + age;
  }, 0) / members.length;

  // Member Card Component
  const MemberCard: React.FC<{ member: Member }> = ({ member }) => {
    const statusInfo = getMembershipStatusInfo(member.membershipStatus);
    const typeInfo = getMembershipTypeInfo(member.membershipType);
    const StatusIcon = statusInfo.icon;
    const hijriAge = calculateHijriAge(new Date(member.birthDate));

    return (
      <div className="glass-card-premium" style={{ padding: '24px', marginBottom: '16px' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                style={{
                  background: `linear-gradient(135deg, ${typeInfo.gradient.replace('from-', '').replace('to-', ',')})`
                }}
              >
                {member.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${statusInfo.bgColor} flex items-center justify-center`}>
                <StatusIcon className="w-3 h-3" style={{ color: statusInfo.color }} />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{member.fullName}</h3>
              <p className="text-sm text-gray-600">رقم العضوية: {member.registrationNumber}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor}`}
                      style={{ color: statusInfo.color }}>
                  {statusInfo.label}
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r text-white"
                      style={{ background: `linear-gradient(135deg, ${typeInfo.gradient.replace('from-', '').replace('to-', ',')})` }}>
                  {typeInfo.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedMember(member);
                setShowMemberDetails(true);
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <EyeIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <PencilIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <TrashIcon className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>

        {/* Member Info with Hijri Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Birth Date with Hijri */}
          <div className="flex items-center gap-2">
            <CakeIcon className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">تاريخ الميلاد</p>
              <HijriDateDisplay
                date={member.birthDate}
                format="medium"
                showIcon={false}
                showBoth={true}
                style={{ padding: '2px 0', fontSize: '13px' }}
              />
              <p className="text-xs text-gray-600">العمر: {hijriAge} سنة هجرية</p>
            </div>
          </div>

          {/* Join Date with Hijri */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">تاريخ الانضمام</p>
              <HijriDateDisplay
                date={member.joinDate}
                format="medium"
                showIcon={false}
                showBoth={true}
                style={{ padding: '2px 0', fontSize: '13px' }}
              />
            </div>
          </div>

          {/* Last Payment with Hijri */}
          {member.lastPayment && (
            <div className="flex items-center gap-2">
              <BriefcaseIcon className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">آخر دفعة</p>
                <HijriDateDisplay
                  date={member.lastPayment}
                  format="relative"
                  showIcon={false}
                  showBoth={false}
                  style={{ padding: '2px 0', fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          {/* Phone */}
          <div className="flex items-center gap-2">
            <PhoneIcon className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">الهاتف</p>
              <p className="text-sm text-gray-900" dir="ltr">{member.phone}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">البريد الإلكتروني</p>
              <p className="text-sm text-gray-900">{member.email}</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">الموقع</p>
              <p className="text-sm text-gray-900">{member.district}، {member.city}</p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center gap-4">
            {/* Family Status */}
            <div className="flex items-center gap-2">
              <HeartIcon className="w-4 h-4 text-pink-500" />
              <span className="text-sm text-gray-600">
                {member.maritalStatus} {member.childrenCount > 0 && `• ${member.childrenCount} أطفال`}
              </span>
            </div>

            {/* Education */}
            <div className="flex items-center gap-2">
              <AcademicCapIcon className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">{member.education}</span>
            </div>

            {/* Occupation */}
            <div className="flex items-center gap-2">
              <BriefcaseIcon className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">{member.occupation}</span>
            </div>
          </div>

          {/* Total Contributions */}
          <div className="text-right">
            <p className="text-xs text-gray-500">إجمالي المساهمات</p>
            <p className="text-lg font-bold text-green-600">{member.totalContributions.toLocaleString()} ريال</p>
          </div>
        </div>

        {/* Last Update */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            آخر تحديث: <HijriDateDisplay date={member.updatedAt} format="relative" showIcon={false} showBoth={false} />
          </p>
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
            <div className="icon-wrapper-gradient" style={{ background: 'var(--gradient-premium)' }}>
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">إدارة الأعضاء</h1>
              <p className="text-sm text-gray-600">إدارة بيانات أعضاء العائلة</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-gradient-premium flex items-center gap-2"
          >
            <UserPlusIcon className="w-5 h-5" />
            إضافة عضو جديد
          </button>
        </div>

        {/* Hijri Date Filter */}
        <HijriDateFilter
          onFilterChange={(filter) => {
            // Filter members by join date
            console.log('Filter applied:', filter);
          }}
        />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="إجمالي الأعضاء"
          value={totalMembers}
          icon={UserGroupIcon}
          gradient="#007AFF, #5856D6"
          subtitle="جميع الأعضاء المسجلين"
        />
        <StatCard
          title="الأعضاء النشطون"
          value={activeMembers}
          icon={CheckCircleIcon}
          gradient="#30D158, #34C759"
          subtitle={`${((activeMembers / totalMembers) * 100).toFixed(1)}% من الإجمالي`}
          trend="+3"
        />
        <StatCard
          title="إجمالي المساهمات"
          value={`${totalContributions.toLocaleString()} ريال`}
          icon={BriefcaseIcon}
          gradient="#FF9500, #F59E0B"
          subtitle="هذا العام"
          trend="+12%"
        />
        <StatCard
          title="متوسط العمر"
          value={`${Math.round(averageAge)} سنة`}
          icon={CalendarDaysIcon}
          gradient="#FF2D92, #F43F5E"
          subtitle="متوسط عمر الأعضاء"
        />
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="البحث عن عضو بالاسم أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-premium w-full pr-10"
          />
          <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-premium"
        >
          <option value="">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
          <option value="suspended">معلق</option>
          <option value="pending">قيد الانتظار</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input-premium"
        >
          <option value="">جميع الأنواع</option>
          <option value="regular">عادي</option>
          <option value="honorary">شرفي</option>
          <option value="founding">مؤسس</option>
        </select>
        <button className="btn-gradient-premium flex items-center gap-2" style={{ background: 'var(--gradient-islamic)' }}>
          <ArrowUpTrayIcon className="w-5 h-5" />
          استيراد
        </button>
        <button className="btn-gradient-premium flex items-center gap-2" style={{ background: 'var(--gradient-royal)' }}>
          <ArrowDownTrayIcon className="w-5 h-5" />
          تصدير
        </button>
      </div>

      {/* Members List */}
      <div className="space-y-4">
        {members
          .filter(member => {
            const matchesSearch = member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 member.phone.includes(searchQuery) ||
                                 member.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = !filterStatus || member.membershipStatus === filterStatus;
            const matchesType = !filterType || member.membershipType === filterType;
            return matchesSearch && matchesStatus && matchesType;
          })
          .map(member => (
            <MemberCard key={member.id} member={member} />
          ))}
      </div>

      {/* Empty State */}
      {members.length === 0 && (
        <div className="text-center py-12">
          <UsersIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد أعضاء</h3>
          <p className="text-sm text-gray-600">ابدأ بإضافة أول عضو في العائلة</p>
        </div>
      )}
    </div>
  );
};

export default HijriMembersManagement;