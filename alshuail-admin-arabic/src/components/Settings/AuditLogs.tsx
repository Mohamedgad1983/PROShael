/**
 * Audit Logs Component
 * System audit trail and activity logs viewer
 * MIGRATED: Now uses shared component system for consistency
 */

import React, { memo,  useState, useEffect, useCallback } from 'react';
import {
  ShieldCheckIcon,
  ClockIcon,
  UserIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { SettingsCard } from './shared/SettingsCard';
import { SettingsButton } from './shared/SettingsButton';
import { SettingsInput } from './shared/SettingsInput';
import { SettingsSelect } from './shared/SettingsSelect';
import { StatusBadge } from './shared/StatusBadge';
import { commonStyles, COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from './sharedStyles';

import { logger } from '../../utils/logger';

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

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const AUDIT_LOGS_ENDPOINT = `${API_BASE_URL}/api/settings/audit-logs`;

const severityFromAction = (action?: string): AuditLog['severity'] => {
  if (!action) return 'info';
  const normalized = action.toLowerCase();
  if (normalized.includes('delete') || normalized.includes('failed')) return 'error';
  if (normalized.includes('create') || normalized.includes('success')) return 'success';
  if (normalized.includes('update') || normalized.includes('permission')) return 'warning';
  return 'info';
};

const safeParseDetails = (details: unknown): Record<string, any> => {
  if (!details) return {};
  if (typeof details === 'object') return details as Record<string, any>;
  if (typeof details === 'string') {
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  }
  return {};
};

const mapAuditLog = (raw: any): AuditLog => {
  const details = safeParseDetails(raw?.details);
  const changes = details?.changes || {};

  return {
    id: raw?.id || `${raw?.user_id || 'log'}-${raw?.created_at || Date.now()}`,
    userId: raw?.user_id || 'unknown',
    userEmail: raw?.user_email || 'unknown@alshuail.com',
    userName: details?.user_name || details?.actor_name || raw?.user_name || raw?.user_email,
    action: details?.action || raw?.action_type || '??????',
    module: String(details?.resource_type || 'system'),
    entityType: details?.resource_type,
    entityId: details?.resource_id ? String(details.resource_id) : undefined,
    oldValues: changes?.old || changes?.previous || null,
    newValues: changes?.new || changes?.current || null,
    ipAddress: raw?.ip_address || '?? ?????',
    userAgent: raw?.user_agent,
    createdAt: raw?.created_at || new Date().toISOString(),
    severity: severityFromAction(raw?.action_type)
  };
};

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');

  const [message, setMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('?? ????? ?????? ???????');
      }

      const response = await fetch(`${AUDIT_LOGS_ENDPOINT}?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || '??? ?? ??? ??????? ?????????');
      }

      const rows = payload?.logs || payload || [];
      setLogs(rows.map(mapAuditLog));
    } catch (error: any) {
      logger.error('Error fetching audit logs:', { error });
      setLogs([]);
      setMessage({ type: 'error', text: error?.message || '??? ?? ??? ??????? ?????????' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

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

  // Helper functions
  const getSeverityData = (severity: AuditLog['severity']) => {
    const data = {
      info: {
        type: 'info' as const,
        icon: InformationCircleIcon,
        label: 'معلومات',
        bg: COLORS.infoBg,
        color: COLORS.info
      },
      warning: {
        type: 'warning' as const,
        icon: ExclamationTriangleIcon,
        label: 'تحذير',
        bg: COLORS.warningBg,
        color: COLORS.warning
      },
      error: {
        type: 'error' as const,
        icon: XCircleIcon,
        label: 'خطأ',
        bg: COLORS.errorBg,
        color: COLORS.error
      },
      success: {
        type: 'success' as const,
        icon: CheckCircleIcon,
        label: 'نجاح',
        bg: COLORS.successBg,
        color: COLORS.success
      }
    };
    return data[severity];
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
    if (action.includes('حذف')) return COLORS.error;
    if (action.includes('إضافة') || action.includes('إنشاء')) return COLORS.success;
    if (action.includes('تحديث') || action.includes('تغيير')) return COLORS.warning;
    return COLORS.gray600;
  };

  // Component styles
  const headerStyle: React.CSSProperties = {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.gray900,
    marginBottom: SPACING.sm,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm
  };

  const subtitleStyle: React.CSSProperties = {
    color: COLORS.gray500,
    fontSize: TYPOGRAPHY.sm,
    marginBottom: SPACING['2xl']
  };

  const statsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: SPACING.lg,
    marginBottom: SPACING['2xl']
  };

  const statsCardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg
  };

  const filterContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
    flexWrap: 'wrap'
  };

  const searchWrapperStyle: React.CSSProperties = {
    flex: 1,
    minWidth: '200px',
    position: 'relative'
  };

  const searchIconStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    position: 'absolute',
    right: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: COLORS.gray500,
    pointerEvents: 'none'
  };

  const timelineLineStyle: React.CSSProperties = {
    position: 'absolute',
    right: '30px',
    top: '20px',
    bottom: '20px',
    width: '2px',
    background: 'linear-gradient(180deg, #E5E7EB 0%, transparent 100%)'
  };

  const timelineItemStyle: React.CSSProperties = {
    display: 'flex',
    gap: SPACING.xl,
    marginBottom: SPACING['2xl'],
    position: 'relative'
  };

  const logContentStyle: React.CSSProperties = {
    flex: 1,
    background: 'rgba(0, 0, 0, 0.02)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    border: `1px solid ${COLORS.gray200}`
  };

  const logHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm
  };

  const moduleTagStyle: React.CSSProperties = {
    padding: '3px 8px',
    background: 'rgba(0, 0, 0, 0.05)',
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.sm,
    fontSize: TYPOGRAPHY.xs
  };

  const timestampStyle: React.CSSProperties = {
    textAlign: 'left',
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.gray400,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.xs
  };

  const userInfoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.gray700
  };

  const changesBoxStyle: React.CSSProperties = {
    marginTop: SPACING.lg,
    padding: SPACING.sm,
    background: 'rgba(0, 0, 0, 0.02)',
    borderRadius: BORDER_RADIUS.md,
    fontSize: TYPOGRAPHY.xs
  };

  const codeStyle: React.CSSProperties = {
    background: COLORS.white,
    padding: '2px 6px',
    borderRadius: BORDER_RADIUS.sm,
    direction: 'ltr',
    display: 'inline-block',
    fontFamily: 'monospace'
  };

  return (
    <div>
      <h2 style={headerStyle}>
        <ShieldCheckIcon style={{ width: '28px', height: '28px' }} />
        سجلات التدقيق والنشاطات
      </h2>
      <p style={subtitleStyle}>
        عرض جميع النشاطات والعمليات التي تمت في النظام
      </p>

      {/* Statistics Cards */}
      <div style={statsGridStyle}>
        {(['info', 'success', 'warning', 'error'] as const).map(severity => {
          const data = getSeverityData(severity);
          const Icon = data.icon;
          const count = logs.filter(l => l.severity === severity).length;

          return (
            <SettingsCard key={severity} style={{ ...statsCardStyle, background: data.bg }}>
              <Icon style={{ width: '24px', height: '24px', color: data.color }} />
              <div>
                <div style={{ fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.bold, color: data.color }}>
                  {count}
                </div>
                <div style={{ fontSize: TYPOGRAPHY.xs, color: data.color, opacity: 0.8 }}>
                  {data.label}
                </div>
              </div>
            </SettingsCard>
          );
        })}
      </div>

      {/* Filters */}
      <div style={filterContainerStyle}>
        <div style={searchWrapperStyle}>
          <MagnifyingGlassIcon style={searchIconStyle} />
          <SettingsInput
            label="البحث"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث في السجلات..."
            style={{ paddingRight: '45px' }}
          />
        </div>

        <SettingsSelect
          label="القسم"
          value={selectedModule}
          onChange={setSelectedModule}
          options={[
            { value: 'all', label: 'كل الأقسام' },
            { value: 'user_management', label: 'إدارة المستخدمين' },
            { value: 'financial', label: 'النظام المالي' },
            { value: 'family_tree', label: 'شجرة العائلة' },
            { value: 'authentication', label: 'المصادقة' }
          ]}
          style={{ minWidth: '150px' }}
        />

        <SettingsSelect
          label="المستوى"
          value={selectedSeverity}
          onChange={setSelectedSeverity}
          options={[
            { value: 'all', label: 'كل المستويات' },
            { value: 'info', label: 'معلومات' },
            { value: 'success', label: 'نجاح' },
            { value: 'warning', label: 'تحذير' },
            { value: 'error', label: 'خطأ' }
          ]}
          style={{ minWidth: '150px' }}
        />

        <SettingsButton
          variant="primary"
          icon={<ArrowPathIcon style={{ width: '16px', height: '16px' }} />}
          onClick={fetchAuditLogs}
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          تحديث
        </SettingsButton>
      </div>

      {message && (
        <SettingsCard style={{
          marginBottom: SPACING.lg,
          background: message.type === 'error' ? COLORS.errorBg : COLORS.infoBg,
          color: message.type === 'error' ? COLORS.errorText : COLORS.infoText,
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.sm
        }}>
          {message.type === 'error' ? (
            <XCircleIcon style={{ width: '20px', height: '20px' }} />
          ) : (
            <InformationCircleIcon style={{ width: '20px', height: '20px' }} />
          )}
          <span>{message.text}</span>
        </SettingsCard>
      )}
      {/* Logs Timeline */}
      <SettingsCard>
        {loading ? (
          <div style={{ textAlign: 'center', padding: SPACING['4xl'], color: COLORS.gray400 }}>
            جاري التحميل...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: SPACING['4xl'], color: COLORS.gray400 }}>
            لا توجد سجلات
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Timeline Line */}
            <div style={timelineLineStyle} />

            {filteredLogs.map((log, index) => {
              const severityData = getSeverityData(log.severity);
              const Icon = severityData.icon;

              return (
                <div
                  key={log.id}
                  style={{
                    ...timelineItemStyle,
                    marginBottom: index < filteredLogs.length - 1 ? SPACING['2xl'] : '0'
                  }}
                >
                  {/* Timeline Icon */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: severityData.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 1,
                    border: `2px solid ${severityData.color}`
                  }}>
                    <Icon style={{ width: '20px', height: '20px', color: severityData.color }} />
                  </div>

                  {/* Log Content */}
                  <div style={logContentStyle}>
                    <div style={logHeaderStyle}>
                      <div>
                        <div style={{
                          fontSize: TYPOGRAPHY.base,
                          fontWeight: TYPOGRAPHY.semibold,
                          color: getActionColor(log.action),
                          marginBottom: SPACING.xs
                        }}>
                          {log.action}
                        </div>
                        <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500 }}>
                          <span style={moduleTagStyle}>
                            {getModuleLabel(log.module)}
                          </span>
                          {log.entityType && (
                            <span style={{ marginRight: SPACING.sm }}>
                              • {log.entityType} #{log.entityId}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={timestampStyle}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
                            <ClockIcon style={{ width: '14px', height: '14px' }} />
                            {new Date(log.createdAt).toLocaleString('ar-SA')}
                          </div>
                          <div style={{ marginTop: SPACING.xs }}>{log.ipAddress}</div>
                        </div>
                      </div>
                    </div>

                    <div style={userInfoStyle}>
                      <UserIcon style={{ width: '16px', height: '16px' }} />
                      <span style={{ fontWeight: TYPOGRAPHY.medium }}>{log.userName || log.userEmail}</span>
                      <span style={{ color: COLORS.gray400, fontSize: TYPOGRAPHY.xs }}>({log.userEmail})</span>
                    </div>

                    {/* Show changed values if available */}
                    {(log.oldValues || log.newValues) && (
                      <div style={changesBoxStyle}>
                        {log.oldValues && (
                          <div style={{ marginBottom: SPACING.xs }}>
                            <span style={{ color: COLORS.error, fontWeight: TYPOGRAPHY.semibold }}>قديم:</span>{' '}
                            <code style={codeStyle}>
                              {JSON.stringify(log.oldValues, null, 2)}
                            </code>
                          </div>
                        )}
                        {log.newValues && (
                          <div>
                            <span style={{ color: COLORS.success, fontWeight: TYPOGRAPHY.semibold }}>جديد:</span>{' '}
                            <code style={codeStyle}>
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
      </SettingsCard>
    </div>
  );
};

export default memo(AuditLogs);
