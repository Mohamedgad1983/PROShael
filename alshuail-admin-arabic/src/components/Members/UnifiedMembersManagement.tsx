/**
 * Unified Members Management Component
 * Consolidates all member management variants (Apple, Hijri, etc.)
 *
 * Configuration-driven architecture replacing 20+ duplicate components
 * Supports different design variants while sharing core functionality
 */

import React, { memo,  useState, useEffect, useCallback, useMemo } from 'react';
import {
  FunnelIcon,
  UserGroupIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  UsersIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

import { logger } from '../../utils/logger';

// Configuration types
export type MembersVariant = 'apple' | 'hijri' | 'premium' | 'simple';
export type ThemeMode = 'light' | 'dark';

export interface MembersConfig {
  variant: MembersVariant;
  theme?: ThemeMode;
  language?: 'ar' | 'en';
  enableFilters?: boolean;
  enableExport?: boolean;
  enableBulkActions?: boolean;
  displayMode?: 'table' | 'cards' | 'grid';
}

// Data interfaces
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
  search?: string;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Default configurations
export const MEMBERS_VARIANTS: Record<MembersVariant, MembersConfig> = {
  apple: {
    variant: 'apple',
    theme: 'light',
    language: 'ar',
    enableFilters: true,
    enableExport: true,
    enableBulkActions: true,
    displayMode: 'table',
  },
  hijri: {
    variant: 'hijri',
    theme: 'light',
    language: 'ar',
    enableFilters: true,
    enableExport: true,
    enableBulkActions: true,
    displayMode: 'table',
  },
  premium: {
    variant: 'premium',
    theme: 'light',
    language: 'ar',
    enableFilters: true,
    enableExport: true,
    enableBulkActions: true,
    displayMode: 'grid',
  },
  simple: {
    variant: 'simple',
    theme: 'light',
    language: 'ar',
    enableFilters: false,
    enableExport: false,
    enableBulkActions: false,
    displayMode: 'table',
  },
};

interface UnifiedMembersManagementProps {
  config: MembersConfig;
  onMemberSelect?: (member: Member) => void;
  onRefresh?: () => void;
}

const UnifiedMembersManagement: React.FC<UnifiedMembersManagementProps> = ({
  config,
  onMemberSelect,
  onRefresh,
}) => {
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
    registration_period: '',
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 0,
  });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(config.theme === 'dark');

  // Mock members data
  const mockMembersData = useMemo(
    () => [
      {
        id: '1',
        full_name: 'أحمد محمد الشعيل',
        phone: '966501234567',
        email: 'ahmed@example.com',
        status: 'active' as const,
        profile_completed: true,
        social_security_beneficiary: false,
        registration_date: '2024-01-15',
        last_payment_date: '2024-10-15',
        total_payments: 5000,
        membership_type: 'premium' as const,
      },
      {
        id: '2',
        full_name: 'فاطمة علي العتيبي',
        phone: '966502345678',
        email: 'fatima@example.com',
        status: 'active' as const,
        profile_completed: true,
        social_security_beneficiary: true,
        registration_date: '2024-02-10',
        last_payment_date: '2024-10-10',
        total_payments: 3000,
        membership_type: 'standard' as const,
      },
    ],
    []
  );

  // Mock statistics
  const mockStatistics: Statistics = useMemo(
    () => ({
      total: 250,
      active: 200,
      completed_profiles: 180,
      pending_profiles: 70,
      social_security_beneficiaries: 45,
      premium_members: 80,
      total_payments: 450000,
      new_this_month: 25,
    }),
    []
  );

  // Fetch members data
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call with mock data
      await new Promise((resolve) => setTimeout(resolve, 300));

      setMembers(mockMembersData);
      setPagination((prev) => ({
        ...prev,
        total: mockMembersData.length,
        totalPages: Math.ceil(mockMembersData.length / pagination.limit),
      }));

      setStatistics(mockStatistics);
    } catch (error) {
      logger.error('Error fetching members:', { error });
    } finally {
      setLoading(false);
    }
  }, [mockMembersData, mockStatistics, pagination.limit]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle pagination
  const handlePaginationChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Handle member selection
  const handleMemberSelect = (member: Member) => {
    if (onMemberSelect) {
      onMemberSelect(member);
    }
  };

  // Render stats cards
  const renderStatsCards = () => {
    const stats = [
      {
        id: 'total',
        label: 'إجمالي الأعضاء',
        value: statistics.total || 0,
        icon: UserGroupIcon,
      },
      {
        id: 'active',
        label: 'الأعضاء النشطون',
        value: statistics.active || 0,
        icon: CheckCircleIcon,
      },
      {
        id: 'premium',
        label: 'الأعضاء المميزين',
        value: statistics.premium_members || 0,
        icon: StarIconSolid,
      },
      {
        id: 'payments',
        label: 'إجمالي المدفوعات',
        value: `${(statistics.total_payments || 0).toLocaleString()} ر.س`,
        icon: BanknotesIcon,
      },
    ];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              style={{
                padding: '1.5rem',
                background: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`,
                backdropFilter: 'blur(10px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Icon style={{ width: '24px', height: '24px' }} />
                </div>
                <h3 style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>{stat.label}</h3>
              </div>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{stat.value}</p>
            </div>
          );
        })}
      </div>
    );
  };

  // Render members table
  const renderMembersTable = () => {
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}` }}>
              {config.enableBulkActions && (
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>
                  <input type="checkbox" onChange={(e) => setSelectedMembers(e.target.checked ? members.map((m) => m.id) : [])} />
                </th>
              )}
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>الاسم</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>الهاتف</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>الحالة</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>نوع الاشتراك</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}>
                  جاري التحميل...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}>
                  لا توجد أعضاء
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr
                  key={member.id}
                  style={{
                    borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}`,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => handleMemberSelect(member)}
                >
                  {config.enableBulkActions && (
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedMembers((prev) =>
                            e.target.checked ? [...prev, member.id] : prev.filter((id) => id !== member.id)
                          );
                        }}
                      />
                    </td>
                  )}
                  <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>{member.full_name}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', opacity: 0.8 }}>{member.phone}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '12px',
                        background: member.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                        color: member.status === 'active' ? '#10b981' : '#6b7280',
                      }}
                    >
                      {member.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontSize: '14px', opacity: 0.8 }}>
                    {member.membership_type === 'premium' ? 'مميز' : member.membership_type === 'standard' ? 'عادي' : 'تجريبي'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                        <EyeIcon style={{ width: '18px', height: '18px' }} />
                      </button>
                      <button style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                        <PencilIcon style={{ width: '18px', height: '18px' }} />
                      </button>
                      <button style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <TrashIcon style={{ width: '18px', height: '18px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: isDarkMode ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '2rem',
    direction: 'rtl',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '28px' }}>إدارة الأعضاء</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <PlusIcon style={{ width: '20px', height: '20px' }} />
            إضافة عضو جديد
          </button>
          {config.enableExport && (
            <button
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <ArrowDownTrayIcon style={{ width: '20px', height: '20px' }} />
              تصدير
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="البحث عن عضو..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            textAlign: 'right',
            backdropFilter: 'blur(10px)',
          }}
        />
      </div>

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Members Table */}
      <div
        style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {renderMembersTable()}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
          <button
            disabled={pagination.page === 1}
            onClick={() => handlePaginationChange(pagination.page - 1)}
            style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}
          >
            <ChevronLeftIcon style={{ width: '20px', height: '20px' }} />
          </button>
          <span>
            الصفحة {pagination.page} من {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page === pagination.totalPages}
            onClick={() => handlePaginationChange(pagination.page + 1)}
            style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}
          >
            <ChevronRightIcon style={{ width: '20px', height: '20px' }} />
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(UnifiedMembersManagement);
