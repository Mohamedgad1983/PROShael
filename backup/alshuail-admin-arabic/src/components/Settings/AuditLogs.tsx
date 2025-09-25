/**
 * Audit Logs Component
 * System audit trail and activity logs viewer
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress: string;
  userAgent?: string;
  createdAt: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // Mock data - replace with actual API call
  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      // Mock audit logs data
      const mockLogs: AuditLog[] = [
        {
          id: '1',
          userId: '1',
          userEmail: 'admin@alshuail.com',
          userName: 'أحمد الشعيل',
          action: 'تغيير دور المستخدم',
          module: 'user_management',
          entityType: 'user',
          entityId: '5',
          oldValues: { role: 'user_member' },
          newValues: { role: 'financial_manager' },
          ipAddress: '192.168.1.1',
          createdAt: new Date().toISOString(),
          severity: 'warning'
        },
        {
          id: '2',
          userId: '2',
          userEmail: 'finance@alshuail.com',
          userName: 'محمد المالي',
          action: 'إضافة دفعة مالية',
          module: 'financial',
          entityType: 'payment',
          entityId: '123',
          newValues: { amount: 500, currency: 'SAR' },
          ipAddress: '192.168.1.2',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          severity: 'success'
        },
        {
          id: '3',
          userId: '1',
          userEmail: 'admin@alshuail.com',
          userName: 'أحمد الشعيل',
          action: 'تسجيل دخول',
          module: 'authentication',
          ipAddress: '192.168.1.1',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          severity: 'info'
        },
        {
          id: '4',
          userId: '3',
          userEmail: 'tree@alshuail.com',
          userName: 'سارة العائلة',
          action: 'تحديث شجرة العائلة',
          module: 'family_tree',
          entityType: 'relationship',
          entityId: '456',
          ipAddress: '192.168.1.3',
          createdAt: new Date(Date.now() - 10800000).toISOString(),
          severity: 'info'
        },
        {
          id: '5',
          userId: '1',
          userEmail: 'admin@alshuail.com',
          userName: 'أحمد الشعيل',
          action: 'حذف مستخدم',
          module: 'user_management',
          entityType: 'user',
          entityId: '789',
          oldValues: { email: 'deleted@alshuail.com' },
          ipAddress: '192.168.1.1',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          severity: 'error'
        }
      ];

      setLogs(mockLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesModule = selectedModule === 'all' || log.module === selectedModule;
    const matchesSeverity = selectedSeverity === 'all' || log.severity === selectedSeverity;

    return matchesSearch && matchesModule && matchesSeverity;
  });

  // Styles
  const getSeverityStyle = (severity: AuditLog['severity']) => {
    const styles = {
      info: { bg: '#DBEAFE', color: '#1E40AF', icon: InformationCircleIcon },
      warning: { bg: '#FED7AA', color: '#C2410C', icon: ExclamationTriangleIcon },
      error: { bg: '#FEE2E2', color: '#DC2626', icon: XCircleIcon },
      success: { bg: '#D1FAE5', color: '#065F46', icon: CheckCircleIcon }
    };
    return styles[severity];
  };

  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      user_management: 'إدارة المستخدمين',
      financial: 'النظام المالي',
      family_tree: 'شجرة العائلة',
      occasions: 'المناسبات',
      initiatives: 'المبادرات',
      diyas: 'الديات',
      authentication: 'المصادقة',
      system: 'النظام'
    };
    return labels[module] || module;
  };

  const getActionColor = (action: string) => {
    if (action.includes('حذف')) return '#DC2626';
    if (action.includes('إضافة') || action.includes('إنشاء')) return '#059669';
    if (action.includes('تحديث') || action.includes('تغيير')) return '#D97706';
    return '#6B7280';
  };

  return (
    <div>
      <h2 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <ShieldCheckIcon style={{ width: '28px', height: '28px' }} />
        سجلات التدقيق والنشاطات
      </h2>
      <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '30px' }}>
        عرض جميع النشاطات والعمليات التي تمت في النظام
      </p>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        {['info', 'success', 'warning', 'error'].map(severity => {
          const style = getSeverityStyle(severity as AuditLog['severity']);
          const Icon = style.icon;
          const count = logs.filter(l => l.severity === severity).length;

          return (
            <div key={severity} style={{
              background: style.bg,
              borderRadius: '12px',
              padding: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Icon style={{ width: '24px', height: '24px', color: style.color }} />
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: style.color }}>
                  {count}
                </div>
                <div style={{ fontSize: '12px', color: style.color, opacity: 0.8 }}>
                  {severity === 'info' && 'معلومات'}
                  {severity === 'success' && 'نجاح'}
                  {severity === 'warning' && 'تحذير'}
                  {severity === 'error' && 'خطأ'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          flex: 1,
          minWidth: '200px',
          position: 'relative'
        }}>
          <MagnifyingGlassIcon style={{
            width: '20px',
            height: '20px',
            position: 'absolute',
            right: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#6B7280'
          }} />
          <input
            type="text"
            placeholder="البحث في السجلات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 45px 12px 15px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          style={{
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: '150px'
          }}
        >
          <option value="all">كل الأقسام</option>
          <option value="user_management">إدارة المستخدمين</option>
          <option value="financial">النظام المالي</option>
          <option value="family_tree">شجرة العائلة</option>
          <option value="authentication">المصادقة</option>
        </select>

        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          style={{
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: '150px'
          }}
        >
          <option value="all">كل المستويات</option>
          <option value="info">معلومات</option>
          <option value="success">نجاح</option>
          <option value="warning">تحذير</option>
          <option value="error">خطأ</option>
        </select>

        <button
          onClick={fetchAuditLogs}
          style={{
            padding: '12px 20px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ArrowPathIcon style={{ width: '16px', height: '16px' }} />
          تحديث
        </button>
      </div>

      {/* Logs Timeline */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        padding: '20px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
            جاري التحميل...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
            لا توجد سجلات
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Timeline Line */}
            <div style={{
              position: 'absolute',
              right: '30px',
              top: '20px',
              bottom: '20px',
              width: '2px',
              background: 'linear-gradient(180deg, #E5E7EB 0%, transparent 100%)'
            }} />

            {filteredLogs.map((log, index) => {
              const severityStyle = getSeverityStyle(log.severity);
              const Icon = severityStyle.icon;

              return (
                <div key={log.id} style={{
                  display: 'flex',
                  gap: '20px',
                  marginBottom: index < filteredLogs.length - 1 ? '30px' : '0',
                  position: 'relative'
                }}>
                  {/* Timeline Icon */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: severityStyle.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 1,
                    border: `2px solid ${severityStyle.color}`
                  }}>
                    <Icon style={{ width: '20px', height: '20px', color: severityStyle.color }} />
                  </div>

                  {/* Log Content */}
                  <div style={{
                    flex: 1,
                    background: 'rgba(0, 0, 0, 0.02)',
                    borderRadius: '12px',
                    padding: '15px',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '10px'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: getActionColor(log.action),
                          marginBottom: '5px'
                        }}>
                          {log.action}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6B7280' }}>
                          <span style={{
                            padding: '3px 8px',
                            background: 'rgba(0, 0, 0, 0.05)',
                            borderRadius: '6px',
                            marginLeft: '8px'
                          }}>
                            {getModuleLabel(log.module)}
                          </span>
                          {log.entityType && (
                            <span style={{ marginRight: '8px' }}>
                              • {log.entityType} #{log.entityId}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'left', fontSize: '12px', color: '#9CA3AF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <ClockIcon style={{ width: '14px', height: '14px' }} />
                          {new Date(log.createdAt).toLocaleString('ar-SA')}
                        </div>
                        <div style={{ marginTop: '5px' }}>{log.ipAddress}</div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      color: '#4B5563'
                    }}>
                      <UserIcon style={{ width: '16px', height: '16px' }} />
                      <span style={{ fontWeight: '500' }}>{log.userName || log.userEmail}</span>
                      <span style={{ color: '#9CA3AF', fontSize: '12px' }}>({log.userEmail})</span>
                    </div>

                    {/* Show changed values if available */}
                    {(log.oldValues || log.newValues) && (
                      <div style={{
                        marginTop: '15px',
                        padding: '10px',
                        background: 'rgba(0, 0, 0, 0.02)',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}>
                        {log.oldValues && (
                          <div style={{ marginBottom: '5px' }}>
                            <span style={{ color: '#DC2626', fontWeight: '600' }}>قديم:</span>{' '}
                            <code style={{
                              background: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              direction: 'ltr',
                              display: 'inline-block'
                            }}>
                              {JSON.stringify(log.oldValues, null, 2)}
                            </code>
                          </div>
                        )}
                        {log.newValues && (
                          <div>
                            <span style={{ color: '#059669', fontWeight: '600' }}>جديد:</span>{' '}
                            <code style={{
                              background: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              direction: 'ltr',
                              display: 'inline-block'
                            }}>
                              {JSON.stringify(log.newValues, null, 2)}
                            </code>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;