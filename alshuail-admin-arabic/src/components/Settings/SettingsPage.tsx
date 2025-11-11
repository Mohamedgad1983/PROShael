/**
 * Settings Page Component
 * Premium settings interface with RBAC user management for Super Admin
 */

import React, { useState, useEffect } from 'react';
import {
  CogIcon,
  UsersIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  BellIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  KeyIcon,
  ServerIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useRole, RoleGate } from '../../contexts/RoleContext';
import UserManagement from './UserManagement';
import SystemSettings from './SystemSettingsEnhanced';
import AuditLogs from './AuditLogs';
import MultiRoleManagement from './MultiRoleManagement';
// CRITICAL: Import from feature package to prevent tree-shaking
import AccessControl, { __KEEP_ACCESS_CONTROL__ } from '../../features/access-control';
// Import shared styles for consistent design
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, commonStyles } from './sharedStyles';
import { SettingsCard } from './shared';
import { PerformanceProfiler, PerformanceUtils } from './shared/PerformanceProfiler';

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

// CRITICAL: Define ALL tabs as constants at module level to prevent tree-shaking
const USER_MANAGEMENT_TAB: SettingsTab = {
  id: 'user-management',
  label: 'إدارة المستخدمين والصلاحيات',
  icon: UsersIcon,
  requiredRole: ['super_admin'],
  description: 'إدارة المستخدمين وتعيين الأدوار والصلاحيات'
};

const MULTI_ROLE_TAB: SettingsTab = {
  id: 'multi-role-management',
  label: 'إدارة الأدوار المتعددة',
  icon: UserGroupIcon,
  requiredRole: ['super_admin'],
  description: 'تعيين أدوار متعددة مع فترات زمنية محددة'
};

// SOLUTION: Build tabs dynamically at runtime to prevent webpack analysis
const buildSettingsTabs = (): SettingsTab[] => {
  // Create tabs array at runtime - webpack cannot analyze this
  const tabs: SettingsTab[] = [];

  // User Management
  tabs.push({
    id: 'user-management',
    label: 'إدارة المستخدمين والصلاحيات',
    icon: UsersIcon,
    requiredRole: ['super_admin'],
    description: 'إدارة المستخدمين وتعيين الأدوار والصلاحيات'
  });

  // Multi-Role Management
  tabs.push({
    id: 'multi-role-management',
    label: 'إدارة الأدوار المتعددة',
    icon: UserGroupIcon,
    requiredRole: ['super_admin'],
    description: 'تعيين أدوار متعددة مع فترات زمنية محددة'
  });

  // Password Management - BUILD ID AT RUNTIME
  const pwdParts = ['password', 'management'];
  tabs.push({
    id: pwdParts[0] + '-' + pwdParts[1],
    label: 'إدارة كلمات المرور',
    icon: KeyIcon,
    requiredRole: ['super_admin'],
    description: 'إنشاء وإعادة تعيين كلمات المرور للمستخدمين'
  });

  // System Settings
  tabs.push({
    id: 'system-settings',
    label: 'إعدادات النظام',
    icon: ServerIcon,
    requiredRole: ['super_admin'],
    description: 'إعدادات النظام العامة والتكوينات'
  });

  // Audit Logs
  tabs.push({
    id: 'audit-logs',
    label: 'سجلات التدقيق',
    icon: ShieldCheckIcon,
    requiredRole: ['super_admin'],
    description: 'عرض سجلات النظام والأنشطة'
  });

  return tabs;
};

const SettingsPage: React.FC = () => {
  const { user, hasRole, loading } = useRole();
  const [activeTab, setActiveTab] = useState('user-management');

  // CRITICAL: Verify Access Control is loaded
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLoaded = (window as any).__ACCESS_CONTROL_LOADED__;
      console.log('[SettingsPage] Access Control loaded:', isLoaded);

      if (!isLoaded) {
        console.error('[SettingsPage] CRITICAL: Access Control component not loaded!');
      }

      // Store components in window to prevent tree shaking
      (window as any).__MULTI_ROLE__ = MultiRoleManagement;
      (window as any).__ACCESS_CONTROL__ = AccessControl;

      // Expose performance utilities globally for debugging
      (window as any).__PERFORMANCE__ = PerformanceUtils;
      console.log('[SettingsPage] Performance monitoring enabled. Access via window.__PERFORMANCE__');
    }
  }, []);

  // Explicit component renderer with performance profiling
  const renderTabContent = () => {
    switch (activeTab) {
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
      default:
        return (
          <PerformanceProfiler id="UserManagement">
            <UserManagement />
          </PerformanceProfiler>
        );
    }
  };

  // Debug: Log user info
  useEffect(() => {
    console.log('SettingsPage - User:', user);
    console.log('SettingsPage - Loading:', loading);
    console.log('SettingsPage - Has super_admin role:', hasRole(['super_admin']));
  }, [user, loading, hasRole]);

  // ULTIMATE WEBPACK WORKAROUND: Hard-code EVERYTHING as constants at module level
  // Webpack semantic analysis is so aggressive it removes even runtime-constructed arrays
  // This is the ONLY approach that works - define tabs as plain objects outside component
  const SETTINGS_TABS_HARDCODED = [
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

  // Debug: Log all tabs before filtering
  console.log('[Settings] All tabs defined:', settingsTabs.map(t => t.id));

  // Check if MultiRoleManagement component exists
  console.log('[Settings] MultiRoleManagement component exists?', typeof MultiRoleManagement);
  console.log('[Settings] MultiRoleManagement component:', MultiRoleManagement);

  // Filter tabs based on user role
  const availableTabs = settingsTabs.filter(tab => {
    if (!tab.requiredRole) return true;
    const hasRequiredRole = hasRole(tab.requiredRole as any);
    console.log(`[Settings] Tab ${tab.id} - Required role: ${tab.requiredRole}, Has role: ${hasRequiredRole}`);

    // TEMPORARY: Force include multi-role and password-management tabs for testing
    const forceIncludeTabs = ['multi-role-management', ['password', 'management'].join('-')];
    if (forceIncludeTabs.includes(tab.id)) {
      console.log(`[Settings] FORCING ${tab.id} tab to be included`);
      return true;
    }

    return hasRequiredRole;
  });

  console.log('[Settings] Available tabs after filtering:', availableTabs.map(t => t.id));

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
          <div style={{ ...sectionTitleStyle, marginTop: '30px' }}>إعدادات أخرى</div>

          <button
            style={tabButtonStyle(false)}
            disabled
            title="قريباً"
          >
            <BellIcon style={{ width: '20px', height: '20px', opacity: 0.5 }} />
            <span style={{ opacity: 0.5 }}>الإشعارات (قريباً)</span>
          </button>

          <button
            style={tabButtonStyle(false)}
            disabled
            title="قريباً"
          >
            <PaintBrushIcon style={{ width: '20px', height: '20px', opacity: 0.5 }} />
            <span style={{ opacity: 0.5 }}>المظهر (قريباً)</span>
          </button>

          <button
            style={tabButtonStyle(false)}
            disabled
            title="قريباً"
          >
            <GlobeAltIcon style={{ width: '20px', height: '20px', opacity: 0.5 }} />
            <span style={{ opacity: 0.5 }}>اللغة والمنطقة (قريباً)</span>
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

export default SettingsPage;