/**
 * Settings Page Component
 * Premium settings interface with RBAC user management for Super Admin
 * Last Modified: 2025-11-12 - Fixed profile-settings tab filtering bug
 */

import React, { memo,  useState, useEffect } from 'react';
import {
  CogIcon,
  UsersIcon,
  UserIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  KeyIcon,
  ServerIcon
} from '@heroicons/react/24/outline';
import { useRole } from '../../contexts/RoleContext';
import UserManagement from './UserManagement';
import SystemSettings from './SystemSettingsEnhanced';
import AuditLogs from './AuditLogs';
import MultiRoleManagement from './MultiRoleManagement';
import ProfileSettings from './ProfileSettings.modern';
import AppearanceSettings from './AppearanceSettings';
import LanguageSettings from './LanguageSettings.modern';
// CRITICAL: Import from feature package to prevent tree-shaking
import AccessControl, { __KEEP_ACCESS_CONTROL__ } from '../../features/access-control';
// Import shared styles for consistent design
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, commonStyles } from './sharedStyles';
import { PerformanceProfiler, PerformanceUtils } from './shared/PerformanceProfiler';
import { logger } from '../../utils/logger';

// CRITICAL: Reference the keep symbol to create explicit dependency
// DO NOT REMOVE - This prevents Webpack from tree-shaking the component
void __KEEP_ACCESS_CONTROL__;

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  requiredRole?: string[];
  description: string;
}

const SettingsPage: React.FC = () => {
  const { user, hasRole, loading } = useRole();
  const [activeTab, setActiveTab] = useState('user-management');

  // CRITICAL: Verify Access Control is loaded
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLoaded = (window as any).__ACCESS_CONTROL_LOADED__;
      logger.debug('Access Control loaded', { isLoaded, component: 'SettingsPage' });

      if (!isLoaded) {
        logger.error('CRITICAL: Access Control component not loaded!', undefined, { component: 'SettingsPage' });
      }

      // Development-only debug tools
      if (process.env.NODE_ENV === 'development') {
        (window as any).__DEV_TOOLS__ = {
          components: { MultiRoleManagement, AccessControl },
          performance: PerformanceUtils
        };
        logger.debug('Development tools exposed at window.__DEV_TOOLS__');
      }
    }
  }, []);

  // Explicit component renderer with performance profiling
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile-settings':
        return (
          <PerformanceProfiler id="ProfileSettings">
            <ProfileSettings />
          </PerformanceProfiler>
        );
      case 'user-management':
        return (
          <PerformanceProfiler id="UserManagement">
            <UserManagement />
          </PerformanceProfiler>
        );
      case 'multi-role-management':
        return (
          <PerformanceProfiler id="MultiRoleManagement">
            <MultiRoleManagement />
          </PerformanceProfiler>
        );
      case 'password-management':
        return (
          <PerformanceProfiler id="AccessControl">
            <AccessControl />
          </PerformanceProfiler>
        );
      case 'system-settings':
        return (
          <PerformanceProfiler id="SystemSettings">
            <SystemSettings />
          </PerformanceProfiler>
        );
      case 'audit-logs':
        return (
          <PerformanceProfiler id="AuditLogs">
            <AuditLogs />
          </PerformanceProfiler>
        );
      case 'appearance-settings':
        return (
          <PerformanceProfiler id="AppearanceSettings">
            <AppearanceSettings />
          </PerformanceProfiler>
        );
      case 'language-settings':
        return (
          <PerformanceProfiler id="LanguageSettings">
            <LanguageSettings />
          </PerformanceProfiler>
        );
      default:
        return (
          <PerformanceProfiler id="UserManagement">
            <UserManagement />
          </PerformanceProfiler>
        );
    }
  };

  // Log user authentication state
  useEffect(() => {
    logger.debug('User authentication state', {
      component: 'SettingsPage',
      userId: user?.id,
      role: user?.role,
      loading,
      hasSuperAdmin: hasRole(['super_admin'])
    });
  }, [user, loading, hasRole]);

  // ULTIMATE WEBPACK WORKAROUND: Hard-code EVERYTHING as constants at module level
  // Webpack semantic analysis is so aggressive it removes even runtime-constructed arrays
  // This is the ONLY approach that works - define tabs as plain objects outside component
  const SETTINGS_TABS_HARDCODED = [
    {
      id: 'profile-settings',
      label: 'الملف الشخصي',
      icon: UserIcon,
      requiredRole: [], // Available to all users
      description: 'إدارة الصورة الشخصية والمعلومات'
    },
    {
      id: 'user-management',
      label: 'إدارة المستخدمين والصلاحيات',
      icon: UsersIcon,
      requiredRole: ['super_admin'],
      description: 'إدارة المستخدمين وتعيين الأدوار والصلاحيات'
    },
    {
      id: 'multi-role-management',
      label: 'إدارة الأدوار المتعددة',
      icon: UserGroupIcon,
      requiredRole: ['super_admin'],
      description: 'تعيين أدوار متعددة مع فترات زمنية محددة'
    },
    {
      id: 'password-management',
      label: 'إدارة كلمات المرور',
      icon: KeyIcon,
      requiredRole: ['super_admin'],
      description: 'إنشاء وإعادة تعيين كلمات المرور للمستخدمين'
    },
    {
      id: 'system-settings',
      label: 'إعدادات النظام',
      icon: ServerIcon,
      requiredRole: ['super_admin'],
      description: 'إعدادات النظام العامة والتكوينات'
    },
    {
      id: 'audit-logs',
      label: 'سجلات التدقيق',
      icon: ShieldCheckIcon,
      requiredRole: ['super_admin'],
      description: 'عرض سجلات النظام والأنشطة'
    }
  ];

  const settingsTabs = SETTINGS_TABS_HARDCODED;

  // Log tabs configuration
  logger.debug('Settings tabs configuration', {
    component: 'SettingsPage',
    totalTabs: settingsTabs.length,
    tabIds: settingsTabs.map(t => t.id),
    multiRoleExists: typeof MultiRoleManagement !== 'undefined'
  });

  // Filter tabs based on user role
  const availableTabs = settingsTabs.filter(tab => {
    // If requiredRole is undefined or empty array, available to all users
    if (!tab.requiredRole || tab.requiredRole.length === 0) {
      logger.debug('Tab available to all users', {
        component: 'SettingsPage',
        tabId: tab.id
      });
      return true;
    }

    const hasRequiredRole = hasRole(tab.requiredRole as any);
    logger.debug('Tab role check', {
      component: 'SettingsPage',
      tabId: tab.id,
      requiredRole: tab.requiredRole,
      hasRole: hasRequiredRole
    });

    return hasRequiredRole;
  });

  logger.debug('Available tabs after filtering', {
    component: 'SettingsPage',
    availableTabIds: availableTabs.map(t => t.id),
    count: availableTabs.length
  });

  // Use shared styles for consistent design and performance
  const containerStyle: React.CSSProperties = {
    ...commonStyles.container,
    padding: SPACING.xl
  };

  const headerStyle: React.CSSProperties = {
    ...commonStyles.card,
    padding: SPACING['3xl'],
    marginBottom: SPACING['3xl'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const titleStyle: React.CSSProperties = {
    ...commonStyles.header,
    fontSize: TYPOGRAPHY['3xl'],
    gap: SPACING.lg
  };

  const mainContentStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: SPACING['3xl'],
    maxWidth: '1400px',
    margin: '0 auto'
  };

  const sidebarStyle: React.CSSProperties = {
    ...commonStyles.card,
    padding: SPACING.xl,
    height: 'fit-content',
    position: 'sticky' as const,
    top: SPACING.xl
  };

  const contentAreaStyle: React.CSSProperties = {
    ...commonStyles.card,
    padding: SPACING['3xl'],
    minHeight: '600px'
  };

  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    width: '100%',
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    background: isActive ? COLORS.primaryGradient : 'transparent',
    color: isActive ? COLORS.white : COLORS.gray600,
    border: isActive ? 'none' : `1px solid ${COLORS.border}`,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: TYPOGRAPHY.base,
    fontWeight: isActive ? TYPOGRAPHY.semibold : TYPOGRAPHY.medium,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    textAlign: 'right' as const
  });

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.gray400,
    marginBottom: SPACING.lg,
    paddingRight: SPACING.sm,
    fontWeight: TYPOGRAPHY.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const roleIndicatorStyle: React.CSSProperties = {
    ...commonStyles.badge.success,
    display: 'inline-block',
    background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
    borderRadius: BORDER_RADIUS.full
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={titleStyle}>
          <CogIcon style={{ width: '40px', height: '40px' }} />
          <span>إعدادات النظام</span>
        </div>
        <div style={roleIndicatorStyle}>
          {user?.roleAr || 'غير محدد'}
        </div>
      </div>

      {/* Main Content */}
      <div style={mainContentStyle}>
        {/* Sidebar */}
        <div style={sidebarStyle}>
          <div style={sectionTitleStyle}>إعدادات النظام</div>

          {availableTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                style={tabButtonStyle(activeTab === tab.id)}
                onClick={() => setActiveTab(tab.id)}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = COLORS.primaryLight;
                    e.currentTarget.style.transform = 'translateX(-5px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }
                }}
              >
                <Icon style={{ width: '20px', height: '20px' }} />
                <div style={{ textAlign: 'right', flex: 1 }}>
                  <div>{tab.label}</div>
                  {activeTab === tab.id && (
                    <div style={{
                      fontSize: TYPOGRAPHY.xs,
                      opacity: 0.9,
                      marginTop: SPACING.xs
                    }}>
                      {tab.description}
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {/* Additional Settings Categories */}
          <div style={{ ...sectionTitleStyle, marginTop: '30px' }}>إعدادات إضافية</div>

          <button
            style={tabButtonStyle(activeTab === 'appearance-settings')}
            onClick={() => setActiveTab('appearance-settings')}
            onMouseEnter={(e) => {
              if (activeTab !== 'appearance-settings') {
                e.currentTarget.style.background = COLORS.primaryLight;
                e.currentTarget.style.transform = 'translateX(-5px)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'appearance-settings') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateX(0)';
              }
            }}
          >
            <PaintBrushIcon style={{ width: '20px', height: '20px' }} />
            <div style={{ textAlign: 'right', flex: 1 }}>
              <div>المظهر</div>
              {activeTab === 'appearance-settings' && (
                <div style={{
                  fontSize: TYPOGRAPHY.xs,
                  opacity: 0.9,
                  marginTop: SPACING.xs
                }}>
                  تخصيص المظهر والألوان والخطوط
                </div>
              )}
            </div>
          </button>

          <button
            style={tabButtonStyle(activeTab === 'language-settings')}
            onClick={() => setActiveTab('language-settings')}
            onMouseEnter={(e) => {
              if (activeTab !== 'language-settings') {
                e.currentTarget.style.background = COLORS.primaryLight;
                e.currentTarget.style.transform = 'translateX(-5px)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'language-settings') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateX(0)';
              }
            }}
          >
            <GlobeAltIcon style={{ width: '20px', height: '20px' }} />
            <div style={{ textAlign: 'right', flex: 1 }}>
              <div>اللغة والمنطقة</div>
              {activeTab === 'language-settings' && (
                <div style={{
                  fontSize: TYPOGRAPHY.xs,
                  opacity: 0.9,
                  marginTop: SPACING.xs
                }}>
                  تخصيص اللغة والمنطقة وتنسيق التاريخ والوقت
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Content Area */}
        <div style={contentAreaStyle}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: SPACING['4xl'] }}>
              <div style={{ fontSize: TYPOGRAPHY.lg, color: COLORS.gray400, marginBottom: SPACING.xl }}>
                جاري تحميل الإعدادات...
              </div>
            </div>
          ) : !user ? (
            <div style={{ textAlign: 'center', padding: SPACING['4xl'] }}>
              <ShieldCheckIcon style={{ width: '60px', height: '60px', margin: '0 auto', color: COLORS.gray400 }} />
              <div style={{ fontSize: TYPOGRAPHY.lg, color: COLORS.gray500, marginTop: SPACING.xl }}>
                الرجاء تسجيل الدخول لعرض الإعدادات
              </div>
            </div>
          ) : !hasRole(['super_admin']) ? (
            <div style={{ textAlign: 'center', padding: SPACING['4xl'] }}>
              <ShieldCheckIcon style={{ width: '60px', height: '60px', margin: '0 auto', color: COLORS.error }} />
              <div style={{ fontSize: TYPOGRAPHY.lg, color: COLORS.gray500, marginTop: SPACING.xl }}>
                ليس لديك صلاحيات لعرض هذه الصفحة
              </div>
              <div style={{ fontSize: TYPOGRAPHY.base, color: COLORS.gray400, marginTop: SPACING.sm }}>
                الدور الحالي: {user.roleAr || user.role}
              </div>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(SettingsPage);
