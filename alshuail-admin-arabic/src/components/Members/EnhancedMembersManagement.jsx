import React, { useState, useEffect, useCallback } from 'react';
import { memberService } from '../../services/memberService';
import PremiumImportMembers from './PremiumImportMembers';
import PremiumRegistration from '../Registration/PremiumRegistration';
import PremiumExportMembers from './PremiumExportMembers';
import './AppleDesignSystem.css';
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
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  DocumentArrowDownIcon,
  BellIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const EnhancedMembersManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [members, setMembers] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    profile_completed: '',
    social_security_beneficiary: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showPremiumRegistration, setShowPremiumRegistration] = useState(false);

  // Load data on component mount and when filters change
  useEffect(() => {
    loadStatistics();
  }, []);

  useEffect(() => {
    loadMembers();
  }, [filters, pagination.page, searchQuery]);

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

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSelectMember = (memberId) => {
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

  const handleExportToExcel = async () => {
    try {
      const blob = await memberService.exportMembersToExcel(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `الأعضاء_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('حدث خطأ أثناء تصدير البيانات');
    }
  };

  const handleSendBulkReminders = async () => {
    if (selectedMembers.length === 0) {
      alert('يرجى اختيار عضو واحد على الأقل');
      return;
    }

    try {
      const result = await memberService.sendRegistrationReminders(selectedMembers);
      alert(`تم إرسال ${result.sentCount} رسالة تذكيرية بنجاح`);
      setSelectedMembers([]);
    } catch (error) {
      console.error('Error sending reminders:', error);
      alert('حدث خطأ أثناء إرسال التذكيرات');
    }
  };

  const handleMemberAdded = (newMember) => {
    setShowPremiumRegistration(false);
    loadMembers();
    loadStatistics();
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Premium Header Component
  const PremiumHeader = () => (
    <div className="glass-container-strong slide-in-up" style={{ marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background Effects */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
          zIndex: 1
        }}
      />
      <div className="floating-element" style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '100px',
        height: '100px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
        borderRadius: '50%',
        filter: 'blur(20px)',
        zIndex: 1
      }} />

      <div style={{ position: 'relative', zIndex: 2, padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="breathing-element" style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, var(--apple-blue-600) 0%, var(--apple-purple-600) 100%)',
                borderRadius: 'var(--radius-xl)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--apple-shadow-lg)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                  animation: 'shimmer 3s infinite'
                }} />
                <SparklesIcon style={{ width: '32px', height: '32px', color: 'white', zIndex: 1 }} />
              </div>
              <div>
                <h1 style={{
                  fontSize: '2.25rem',
                  fontWeight: '700',
                  color: 'var(--apple-gray-900)',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-display)'
                }}>
                  إدارة الأعضاء
                </h1>
                <p style={{
                  fontSize: '1.125rem',
                  color: 'var(--apple-gray-600)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: '500'
                }}>
                  متابعة وإدارة أعضاء عائلة الشعيل بأناقة وكفاءة
                </p>
              </div>
            </div>

            {/* Pill Navigation */}
            <div className="pill-navigation">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pill-tab ${activeTab === 'overview' ? 'active' : ''}`}
              >
                <UserGroupIcon style={{ width: '16px', height: '16px' }} />
                لوحة الأعضاء
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`pill-tab ${activeTab === 'import' ? 'active' : ''}`}
              >
                <DocumentArrowDownIcon style={{ width: '16px', height: '16px' }} />
                استيراد الأعضاء
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`pill-tab ${activeTab === 'export' ? 'active' : ''}`}
              >
                <ArrowDownTrayIcon style={{ width: '16px', height: '16px' }} />
                تصدير الأعضاء
              </button>
            </div>
          </div>

          {/* Bottom Section - Stats Summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                background: 'var(--apple-green-500)',
                borderRadius: '50%',
                boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)'
              }} />
              <span style={{ fontSize: '14px', color: 'var(--apple-gray-600)', fontWeight: '500' }}>
                {statistics.total || 0} عضو مسجل
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                background: 'var(--apple-blue-500)',
                borderRadius: '50%',
                boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
              }} />
              <span style={{ fontSize: '14px', color: 'var(--apple-gray-600)', fontWeight: '500' }}>
                {statistics.active || 0} نشط
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                background: 'var(--apple-yellow-500)',
                borderRadius: '50%',
                boxShadow: '0 0 10px rgba(234, 179, 8, 0.5)'
              }} />
              <span style={{ fontSize: '14px', color: 'var(--apple-gray-600)', fontWeight: '500' }}>
                {statistics.pending_registration || 0} في انتظار التسجيل
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Enhanced Statistics Cards Component
  const StatisticsCards = () => {
    const statsConfig = [
      {
        icon: UserGroupIcon,
        value: statistics.total || 0,
        label: 'إجمالي الأعضاء',
        gradient: 'linear-gradient(135deg, var(--apple-blue-500) 0%, var(--apple-blue-600) 100%)',
        shadowColor: 'rgba(59, 130, 246, 0.3)',
        delay: '0ms'
      },
      {
        icon: UserIcon,
        value: statistics.active || 0,
        label: 'الأعضاء النشطون',
        gradient: 'linear-gradient(135deg, var(--apple-green-500) 0%, var(--apple-emerald-600) 100%)',
        shadowColor: 'rgba(34, 197, 94, 0.3)',
        delay: '100ms'
      },
      {
        icon: CheckCircleIcon,
        value: statistics.completed_profiles || 0,
        label: 'ملفات مكتملة',
        gradient: 'linear-gradient(135deg, var(--apple-emerald-500) 0%, var(--apple-teal-600) 100%)',
        shadowColor: 'rgba(16, 185, 129, 0.3)',
        delay: '200ms'
      },
      {
        icon: ClockIcon,
        value: statistics.pending_registration || 0,
        label: 'في انتظار التسجيل',
        gradient: 'linear-gradient(135deg, var(--apple-amber-500) 0%, var(--apple-orange-600) 100%)',
        shadowColor: 'rgba(245, 158, 11, 0.3)',
        delay: '300ms'
      },
      {
        icon: ShieldCheckIcon,
        value: statistics.social_security_beneficiaries || 0,
        label: 'مستفيدو الضمان',
        gradient: 'linear-gradient(135deg, var(--apple-purple-500) 0%, var(--apple-violet-600) 100%)',
        shadowColor: 'rgba(168, 85, 247, 0.3)',
        delay: '400ms'
      }
    ];

    return (
      <div className="stats-grid">
        {statsConfig.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              className="stat-card slide-in-up"
              style={{ animationDelay: stat.delay }}
            >
              <div className="stat-icon-wrapper" style={{
                background: stat.gradient,
                boxShadow: `0 8px 25px ${stat.shadowColor}`
              }}>
                <IconComponent className="stat-icon" />
              </div>
              <div className="stat-number">{stat.value.toLocaleString('ar-SA')}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // Enhanced Filters Section
  const FiltersSection = () => (
    <div className={`glass-container transition-all duration-500 ${
      showFilters ? 'opacity-100 transform translate-y-0 mb-6' : 'opacity-0 transform -translate-y-4 hidden'
    }`}>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <AdjustmentsHorizontalIcon style={{ width: '20px', height: '20px', color: 'var(--apple-blue-600)' }} />
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--apple-gray-900)',
            fontFamily: 'var(--font-display)'
          }}>
            الفلاتر المتقدمة
          </h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--apple-gray-700)',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-display)'
            }}>
              الحالة
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px',
                color: 'var(--apple-gray-800)',
                fontFamily: 'var(--font-display)',
                transition: 'all var(--duration-normal) var(--ease-apple)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)'
              }}
            >
              <option value="">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="suspended">موقوف</option>
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--apple-gray-700)',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-display)'
            }}>
              حالة الملف الشخصي
            </label>
            <select
              value={filters.profile_completed}
              onChange={(e) => handleFilterChange('profile_completed', e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px',
                color: 'var(--apple-gray-800)',
                fontFamily: 'var(--font-display)',
                transition: 'all var(--duration-normal) var(--ease-apple)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)'
              }}
            >
              <option value="">جميع الملفات</option>
              <option value="true">مكتمل</option>
              <option value="false">غير مكتمل</option>
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--apple-gray-700)',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-display)'
            }}>
              مستفيد من الضمان الاجتماعي
            </label>
            <select
              value={filters.social_security_beneficiary}
              onChange={(e) => handleFilterChange('social_security_beneficiary', e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px',
                color: 'var(--apple-gray-800)',
                fontFamily: 'var(--font-display)',
                transition: 'all var(--duration-normal) var(--ease-apple)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)'
              }}
            >
              <option value="">الكل</option>
              <option value="true">نعم</option>
              <option value="false">لا</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  // Enhanced Search and Actions Bar
  const SearchAndActionsBar = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      marginBottom: '1.5rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Enhanced Search Bar */}
        <div className="apple-search-bar" style={{ flex: '1', maxWidth: '400px' }}>
          <MagnifyingGlassIcon className="apple-search-icon" style={{ width: '20px', height: '20px' }} />
          <input
            type="text"
            placeholder="البحث في الأعضاء..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="apple-search-input"
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowPremiumRegistration(true)}
            className="apple-button-primary"
          >
            <PlusIcon style={{ width: '16px', height: '16px' }} />
            إضافة عضو
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="apple-button-secondary"
          >
            <FunnelIcon style={{ width: '16px', height: '16px' }} />
            الفلاتر
          </button>

          <button
            onClick={handleExportToExcel}
            className="apple-button-secondary"
          >
            <ArrowDownTrayIcon style={{ width: '16px', height: '16px' }} />
            تصدير
          </button>

          {selectedMembers.length > 0 && (
            <button
              onClick={handleSendBulkReminders}
              className="apple-button-primary"
            >
              <BellIcon style={{ width: '16px', height: '16px' }} />
              إرسال تذكيرات ({selectedMembers.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Enhanced Members Table Component
  const MembersTable = () => (
    <div className="apple-table-container slide-in-up">
      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="apple-table">
          <thead className="apple-table-header">
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedMembers.length === members.length && members.length > 0}
                  onChange={handleSelectAll}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: 'var(--apple-blue-600)',
                    borderRadius: '4px'
                  }}
                />
              </th>
              <th>الاسم</th>
              <th>رقم العضوية</th>
              <th>رقم الهاتف</th>
              <th>حالة الملف</th>
              <th>الحالة</th>
              <th>تاريخ التسجيل</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    <div className="loading-spinner"></div>
                    <span style={{ color: 'var(--apple-gray-600)', fontSize: '16px' }}>جاري التحميل...</span>
                  </div>
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--apple-gray-500)' }}>
                  لا توجد أعضاء مطابقة للبحث
                </td>
              </tr>
            ) : (
              members.map((member, index) => (
                <tr key={member.id} className="apple-table-row" style={{ animationDelay: `${index * 50}ms` }}>
                  <td className="apple-table-cell">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => handleSelectMember(member.id)}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: 'var(--apple-blue-600)',
                        borderRadius: '4px'
                      }}
                    />
                  </td>
                  <td className="apple-table-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, var(--apple-blue-500) 0%, var(--apple-purple-600) 100%)',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '14px',
                        boxShadow: 'var(--apple-shadow-sm)'
                      }}>
                        {member.full_name_arabic?.charAt(0) || 'ع'}
                      </div>
                      <div>
                        <div style={{
                          fontWeight: '600',
                          color: 'var(--apple-gray-900)',
                          marginBottom: '2px'
                        }}>
                          {member.full_name_arabic || 'غير محدد'}
                        </div>
                        {member.email && (
                          <div style={{ fontSize: '12px', color: 'var(--apple-gray-500)' }}>
                            {member.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="apple-table-cell" style={{ fontWeight: '500' }}>
                    {member.membership_number || 'غير محدد'}
                  </td>
                  <td className="apple-table-cell" style={{ fontWeight: '500', direction: 'ltr', textAlign: 'right' }}>
                    {member.phone || 'غير محدد'}
                  </td>
                  <td className="apple-table-cell">
                    <span className={`apple-badge ${
                      member.profile_completed ? 'apple-badge-success' : 'apple-badge-warning'
                    }`}>
                      {member.profile_completed ? 'مكتمل' : 'غير مكتمل'}
                    </span>
                  </td>
                  <td className="apple-table-cell">
                    <span className={`apple-badge ${
                      member.status === 'active' ? 'apple-badge-success' :
                      member.status === 'inactive' ? 'apple-badge-neutral' : 'apple-badge-error'
                    }`}>
                      {member.status === 'active' ? 'نشط' :
                       member.status === 'inactive' ? 'غير نشط' : 'موقوف'}
                    </span>
                  </td>
                  <td className="apple-table-cell" style={{ color: 'var(--apple-gray-600)' }}>
                    {member.created_at ? new Date(member.created_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                  </td>
                  <td className="apple-table-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        className="apple-button-secondary"
                        style={{ padding: '0.5rem', minWidth: 'auto' }}
                      >
                        <EyeIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button
                        className="apple-button-secondary"
                        style={{ padding: '0.5rem', minWidth: 'auto' }}
                      >
                        <PencilIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button
                        className="apple-button-secondary"
                        style={{
                          padding: '0.5rem',
                          minWidth: 'auto',
                          color: 'var(--apple-red-500)',
                          borderColor: 'rgba(239, 68, 68, 0.3)'
                        }}
                      >
                        <TrashIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Enhanced Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          background: 'rgba(248, 250, 252, 0.8)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '14px', color: 'var(--apple-gray-600)', fontWeight: '500' }}>
              عرض {((pagination.page - 1) * pagination.limit) + 1} إلى {Math.min(pagination.page * pagination.limit, pagination.total)} من {pagination.total} عضو
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="apple-button-secondary"
                style={{
                  padding: '0.5rem',
                  minWidth: 'auto',
                  opacity: pagination.page === 1 ? 0.5 : 1,
                  cursor: pagination.page === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronRightIcon style={{ width: '16px', height: '16px' }} />
              </button>

              <div style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, var(--apple-blue-600) 0%, var(--apple-blue-700) 100%)',
                color: 'white',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px',
                fontWeight: '600',
                minWidth: '40px',
                textAlign: 'center',
                boxShadow: 'var(--apple-shadow-sm)'
              }}>
                {pagination.page}
              </div>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="apple-button-secondary"
                style={{
                  padding: '0.5rem',
                  minWidth: 'auto',
                  opacity: pagination.page === pagination.totalPages ? 0.5 : 1,
                  cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeftIcon style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (activeTab === 'import') {
    return (
      <div>
        <div style={{
          padding: '20px 40px',
          background: 'white',
          borderBottom: '1px solid #e5e5ea',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateX(4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateX(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.1), rgba(88, 86, 214, 0.1))',
              border: '1px solid rgba(0, 122, 255, 0.2)',
              borderRadius: '100px',
              color: '#007AFF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Cairo", sans-serif'
            }}
          >
            <ArrowLeftIcon style={{ width: '16px', height: '16px' }} />
            العودة إلى لوحة الأعضاء
          </button>
          <span style={{ fontSize: '14px', color: '#86868B' }}>استيراد الأعضاء</span>
        </div>
        <PremiumImportMembers />
      </div>
    );
  }

  if (activeTab === 'export') {
    return (
      <div>
        <div style={{
          padding: '20px 40px',
          background: 'white',
          borderBottom: '1px solid #e5e5ea',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateX(4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateX(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.1), rgba(88, 86, 214, 0.1))',
              border: '1px solid rgba(0, 122, 255, 0.2)',
              borderRadius: '100px',
              color: '#007AFF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Cairo", sans-serif'
            }}
          >
            <ArrowLeftIcon style={{ width: '16px', height: '16px' }} />
            العودة إلى لوحة الأعضاء
          </button>
          <span style={{ fontSize: '14px', color: '#86868B' }}>تصدير الأعضاء</span>
        </div>
        <PremiumExportMembers />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 50%, #f3e8ff 100%)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}
      dir="rtl"
    >
      {/* Background Effects */}
      <div className="floating-element" style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '200px',
        height: '200px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        zIndex: 0
      }} />
      <div className="floating-element" style={{
        position: 'absolute',
        bottom: '10%',
        right: '10%',
        width: '150px',
        height: '150px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%)',
        borderRadius: '50%',
        filter: 'blur(30px)',
        zIndex: 0,
        animationDelay: '2s'
      }} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Premium Header */}
        <PremiumHeader />

        {/* Statistics */}
        <StatisticsCards />

        {/* Filters */}
        <FiltersSection />

        {/* Search and Actions */}
        <SearchAndActionsBar />

        {/* Members Table */}
        <MembersTable />

        {/* Premium Registration Form */}
        {showPremiumRegistration && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            overflow: 'auto'
          }}>
            <div style={{
              position: 'relative',
              width: '100%',
              minHeight: '100vh',
              backgroundColor: 'white'
            }}>
              <button
                onClick={() => setShowPremiumRegistration(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  zIndex: 10000,
                  padding: '10px 20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid #e5e5ea',
                  borderRadius: '100px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#007aff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                إغلاق
              </button>
              <PremiumRegistration onClose={() => setShowPremiumRegistration(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// Phase 4: Performance Optimization - Memoize to prevent unnecessary re-renders
export default React.memo(EnhancedMembersManagement);