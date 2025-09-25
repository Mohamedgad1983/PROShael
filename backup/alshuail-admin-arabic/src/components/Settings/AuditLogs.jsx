/**
 * Audit Logs Component
 * Premium Apple-inspired interface for system audit trails
 * Features advanced filtering, glassmorphism effects, and full RTL support
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../Members/AppleDesignSystem.css';
import {
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  EyeIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  GlobeAltIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const AuditLogs = () => {
  const { user, hasPermission } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Log level definitions with colors and icons
  const logLevels = {
    info: {
      name: 'معلومات',
      icon: InformationCircleIcon,
      color: 'linear-gradient(135deg, var(--apple-blue-500) 0%, var(--apple-blue-600) 100%)',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      textColor: 'var(--apple-blue-700)'
    },
    success: {
      name: 'نجح',
      icon: CheckCircleIcon,
      color: 'linear-gradient(135deg, var(--apple-green-500) 0%, var(--apple-emerald-600) 100%)',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      textColor: 'var(--apple-green-700)'
    },
    warning: {
      name: 'تحذير',
      icon: ExclamationTriangleIcon,
      color: 'linear-gradient(135deg, var(--apple-amber-500) 0%, var(--apple-orange-600) 100%)',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      textColor: 'var(--apple-amber-700)'
    },
    error: {
      name: 'خطأ',
      icon: XCircleIcon,
      color: 'linear-gradient(135deg, var(--apple-red-500) 0%, var(--apple-rose-600) 100%)',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      textColor: 'var(--apple-red-700)'
    }
  };

  // Action types with Arabic names
  const actionTypes = {
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    create: 'إنشاء',
    update: 'تحديث',
    delete: 'حذف',
    view: 'عرض',
    export: 'تصدير',
    import: 'استيراد',
    settings_change: 'تغيير الإعدادات',
    role_change: 'تغيير الدور',
    password_change: 'تغيير كلمة المرور',
    failed_login: 'فشل تسجيل الدخول',
    security_alert: 'تنبيه أمني'
  };

  // Mock audit logs data
  useEffect(() => {
    fetchLogs();
  }, [pagination.page, selectedLevel, selectedAction, selectedUser, dateRange]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockLogs = [
        {
          id: '1',
          timestamp: '2024-12-20T14:30:00Z',
          level: 'info',
          action: 'login',
          user: {
            id: '1',
            name: 'أحمد محمد الشعيل',
            email: 'admin@alshuail.com',
            role: 'super_admin'
          },
          description: 'تسجيل دخول المدير الأعلى بنجاح',
          details: {
            ip: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            location: 'الرياض، المملكة العربية السعودية',
            sessionId: 'sess_abc123def456'
          },
          module: 'auth',
          resource: 'user_session',
          changes: null
        },
        {
          id: '2',
          timestamp: '2024-12-20T14:25:00Z',
          level: 'success',
          action: 'create',
          user: {
            id: '1',
            name: 'أحمد محمد الشعيل',
            email: 'admin@alshuail.com',
            role: 'super_admin'
          },
          description: 'إضافة مستخدم جديد بنجاح',
          details: {
            ip: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            location: 'الرياض، المملكة العربية السعودية'
          },
          module: 'users',
          resource: 'user',
          resourceId: '6',
          changes: {
            before: null,
            after: {
              name: 'محمد الجديد',
              email: 'new@alshuail.com',
              role: 'user_member'
            }
          }
        },
        {
          id: '3',
          timestamp: '2024-12-20T14:20:00Z',
          level: 'warning',
          action: 'failed_login',
          user: null,
          description: 'محاولة تسجيل دخول فاشلة',
          details: {
            ip: '203.0.113.1',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            location: 'غير معروف',
            attemptedEmail: 'hacker@example.com',
            reason: 'كلمة مرور خاطئة'
          },
          module: 'auth',
          resource: 'login_attempt'
        },
        {
          id: '4',
          timestamp: '2024-12-20T14:15:00Z',
          level: 'info',
          action: 'settings_change',
          user: {
            id: '1',
            name: 'أحمد محمد الشعيل',
            email: 'admin@alshuail.com',
            role: 'super_admin'
          },
          description: 'تحديث إعدادات النظام',
          details: {
            ip: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            location: 'الرياض، المملكة العربية السعودية'
          },
          module: 'settings',
          resource: 'system_settings',
          changes: {
            before: { enableMaintenance: false },
            after: { enableMaintenance: true }
          }
        },
        {
          id: '5',
          timestamp: '2024-12-20T14:10:00Z',
          level: 'success',
          action: 'role_change',
          user: {
            id: '1',
            name: 'أحمد محمد الشعيل',
            email: 'admin@alshuail.com',
            role: 'super_admin'
          },
          description: 'تغيير دور المستخدم',
          details: {
            ip: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            location: 'الرياض، المملكة العربية السعودية',
            targetUser: 'محمد المالي'
          },
          module: 'users',
          resource: 'user_role',
          resourceId: '2',
          changes: {
            before: { role: 'user_member' },
            after: { role: 'financial_manager' }
          }
        },
        {
          id: '6',
          timestamp: '2024-12-20T14:05:00Z',
          level: 'error',
          action: 'security_alert',
          user: null,
          description: 'محاولات دخول مشبوهة متعددة من نفس IP',
          details: {
            ip: '203.0.113.1',
            attemptCount: 10,
            timeWindow: '5 دقائق',
            action: 'تم حظر IP تلقائياً'
          },
          module: 'security',
          resource: 'ip_block'
        }
      ];

      // Simulate API delay and filtering
      setTimeout(() => {
        let filteredLogs = mockLogs;

        // Apply filters
        if (selectedLevel !== 'all') {
          filteredLogs = filteredLogs.filter(log => log.level === selectedLevel);
        }
        if (selectedAction !== 'all') {
          filteredLogs = filteredLogs.filter(log => log.action === selectedAction);
        }
        if (selectedUser !== 'all') {
          filteredLogs = filteredLogs.filter(log => log.user?.id === selectedUser);
        }
        if (searchTerm) {
          filteredLogs = filteredLogs.filter(log =>
            log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setLogs(filteredLogs);
        setPagination(prev => ({
          ...prev,
          total: filteredLogs.length,
          totalPages: Math.ceil(filteredLogs.length / prev.limit)
        }));
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLoading(false);
    }
  };

  // Statistics
  const statistics = {
    total: logs.length,
    info: logs.filter(log => log.level === 'info').length,
    success: logs.filter(log => log.level === 'success').length,
    warning: logs.filter(log => log.level === 'warning').length,
    error: logs.filter(log => log.level === 'error').length
  };

  // Export logs
  const handleExportLogs = () => {
    const csvContent = [
      ['التاريخ والوقت', 'المستوى', 'الإجراء', 'المستخدم', 'الوصف', 'عنوان IP'],
      ...logs.map(log => [
        new Date(log.timestamp).toLocaleString('ar-SA'),
        logLevels[log.level]?.name || log.level,
        actionTypes[log.action] || log.action,
        log.user?.name || 'نظام',
        log.description,
        log.details?.ip || 'غير محدد'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Statistics Cards Component
  const StatisticsCards = () => {
    const statsConfig = [
      {
        icon: DocumentTextIcon,
        value: statistics.total,
        label: 'إجمالي السجلات',
        gradient: 'linear-gradient(135deg, var(--apple-blue-500) 0%, var(--apple-blue-600) 100%)',
        shadowColor: 'rgba(59, 130, 246, 0.3)',
        delay: '0ms'
      },
      {
        icon: CheckCircleIcon,
        value: statistics.success,
        label: 'عمليات ناجحة',
        gradient: 'linear-gradient(135deg, var(--apple-green-500) 0%, var(--apple-emerald-600) 100%)',
        shadowColor: 'rgba(34, 197, 94, 0.3)',
        delay: '100ms'
      },
      {
        icon: ExclamationTriangleIcon,
        value: statistics.warning,
        label: 'تحذيرات',
        gradient: 'linear-gradient(135deg, var(--apple-amber-500) 0%, var(--apple-orange-600) 100%)',
        shadowColor: 'rgba(245, 158, 11, 0.3)',
        delay: '200ms'
      },
      {
        icon: XCircleIcon,
        value: statistics.error,
        label: 'أخطاء',
        gradient: 'linear-gradient(135deg, var(--apple-red-500) 0%, var(--apple-rose-600) 100%)',
        shadowColor: 'rgba(239, 68, 68, 0.3)',
        delay: '300ms'
      }
    ];

    return (
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
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

  // Filters Section
  const FiltersSection = () => (
    <div className={`glass-container transition-all duration-500 ${
      showFilters ? 'opacity-100 transform translate-y-0 mb-6' : 'opacity-0 transform -translate-y-4 hidden'
    }`}>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <FunnelIcon style={{ width: '20px', height: '20px', color: 'var(--apple-blue-600)' }} />
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--apple-gray-900)',
            fontFamily: 'var(--font-display)'
          }}>
            فلاتر البحث المتقدمة
          </h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--apple-gray-700)',
              marginBottom: '0.5rem'
            }}>
              مستوى السجل
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px'
              }}
            >
              <option value="all">جميع المستويات</option>
              {Object.entries(logLevels).map(([key, level]) => (
                <option key={key} value={key}>{level.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--apple-gray-700)',
              marginBottom: '0.5rem'
            }}>
              نوع الإجراء
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px'
              }}
            >
              <option value="all">جميع الإجراءات</option>
              {Object.entries(actionTypes).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--apple-gray-700)',
              marginBottom: '0.5rem'
            }}>
              من تاريخ
            </label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--apple-gray-700)',
              marginBottom: '0.5rem'
            }}>
              إلى تاريخ
            </label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Search and Actions Bar
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
        <div className="apple-search-bar" style={{ flex: '1', maxWidth: '400px' }}>
          <MagnifyingGlassIcon className="apple-search-icon" style={{ width: '20px', height: '20px' }} />
          <input
            type="text"
            placeholder="البحث في السجلات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="apple-search-input"
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="apple-button-secondary"
          >
            <FunnelIcon style={{ width: '16px', height: '16px' }} />
            الفلاتر
          </button>

          <button
            onClick={handleExportLogs}
            className="apple-button-secondary"
          >
            <ArrowDownTrayIcon style={{ width: '16px', height: '16px' }} />
            تصدير
          </button>

          <button
            onClick={fetchLogs}
            className="apple-button-secondary"
            disabled={loading}
          >
            <ArrowPathIcon style={{ width: '16px', height: '16px' }} />
            تحديث
          </button>
        </div>
      </div>
    </div>
  );

  // Logs Table Component
  const LogsTable = () => (
    <div className="apple-table-container slide-in-up">
      <div style={{ overflowX: 'auto' }}>
        <table className="apple-table">
          <thead className="apple-table-header">
            <tr>
              <th>الوقت</th>
              <th>المستوى</th>
              <th>الإجراء</th>
              <th>المستخدم</th>
              <th>الوصف</th>
              <th>عنوان IP</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    <div className="loading-spinner"></div>
                    <span style={{ color: 'var(--apple-gray-600)', fontSize: '16px' }}>جاري التحميل...</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--apple-gray-500)' }}>
                  لا توجد سجلات مطابقة للبحث
                </td>
              </tr>
            ) : (
              logs.map((log, index) => {
                const levelData = logLevels[log.level];
                const LevelIcon = levelData?.icon || InformationCircleIcon;

                return (
                  <tr key={log.id} className="apple-table-row" style={{ animationDelay: `${index * 50}ms` }}>
                    <td className="apple-table-cell">
                      <div style={{ fontSize: '14px', color: 'var(--apple-gray-600)' }}>
                        <div>{new Date(log.timestamp).toLocaleDateString('ar-SA')}</div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>
                          {new Date(log.timestamp).toLocaleTimeString('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </td>
                    <td className="apple-table-cell">
                      <span
                        className="apple-badge"
                        style={{
                          background: levelData?.bgColor,
                          color: levelData?.textColor,
                          border: `1px solid ${levelData?.textColor}20`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          width: 'fit-content'
                        }}
                      >
                        <LevelIcon style={{ width: '14px', height: '14px' }} />
                        {levelData?.name}
                      </span>
                    </td>
                    <td className="apple-table-cell" style={{ fontWeight: '500' }}>
                      {actionTypes[log.action] || log.action}
                    </td>
                    <td className="apple-table-cell">
                      {log.user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            background: 'linear-gradient(135deg, var(--apple-blue-500) 0%, var(--apple-purple-600) 100%)',
                            borderRadius: 'var(--radius-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {log.user.name?.charAt(0) || 'ص'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '13px' }}>
                              {log.user.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--apple-gray-500)' }}>
                              {log.user.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--apple-gray-500)', fontSize: '14px' }}>
                          نظام
                        </span>
                      )}
                    </td>
                    <td className="apple-table-cell" style={{ maxWidth: '300px' }}>
                      <div style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '14px'
                      }}>
                        {log.description}
                      </div>
                    </td>
                    <td className="apple-table-cell" style={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      color: 'var(--apple-gray-600)'
                    }}>
                      {log.details?.ip || 'غير محدد'}
                    </td>
                    <td className="apple-table-cell">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setShowDetailsModal(true);
                        }}
                        className="apple-button-secondary"
                        style={{ padding: '0.5rem', minWidth: 'auto' }}
                        title="عرض التفاصيل"
                      >
                        <EyeIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          background: 'rgba(248, 250, 252, 0.8)',
          backdropFilter: 'var(--glass-blur)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '14px', color: 'var(--apple-gray-600)', fontWeight: '500' }}>
            عرض {((pagination.page - 1) * pagination.limit) + 1} إلى {Math.min(pagination.page * pagination.limit, pagination.total)} من {pagination.total} سجل
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="apple-button-secondary"
              style={{
                padding: '0.5rem',
                minWidth: 'auto',
                opacity: pagination.page === 1 ? 0.5 : 1
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
              textAlign: 'center'
            }}>
              {pagination.page}
            </div>

            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="apple-button-secondary"
              style={{
                padding: '0.5rem',
                minWidth: 'auto',
                opacity: pagination.page === pagination.totalPages ? 0.5 : 1
              }}
            >
              <ChevronLeftIcon style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (loading && logs.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <div className="loading-spinner" style={{ width: '40px', height: '40px', marginLeft: '1rem' }}></div>
        <span style={{ fontSize: '1.125rem', color: 'var(--apple-gray-600)' }}>
          جاري تحميل سجلات التدقيق...
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Statistics Cards */}
      <StatisticsCards />

      {/* Search and Actions */}
      <SearchAndActionsBar />

      {/* Filters */}
      <FiltersSection />

      {/* Logs Table */}
      <LogsTable />

      {/* Details Modal would go here - simplified for now */}
    </div>
  );
};

export default AuditLogs;