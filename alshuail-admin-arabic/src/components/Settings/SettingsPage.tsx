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

// Import MultiRoleManagement directly (not lazy) to debug webpack issue
import MultiRoleManagement from './MultiRoleManagement';
import PasswordManagement from './PasswordManagement';

// Force webpack to include components by using them at module level
console.log('[Settings] MultiRoleManagement imported:', MultiRoleManagement);
console.log('[Settings] PasswordManagement imported:', PasswordManagement);

// Force webpack to see these are used (prevent tree-shaking)
const FORCE_INCLUDE_COMPONENTS = {
  MultiRoleManagement,
  PasswordManagement
};

// Force include tab IDs for webpack
const FORCE_INCLUDE_TAB_IDS = ['password-management', 'multi-role-management'];

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

  // Force webpack to see components are used
  // Store components in window to prevent tree shaking
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__MULTI_ROLE__ = MultiRoleManagement;
      (window as any).__PASSWORD_MGMTnodes = PasswordManagement;
    }
  }, []);

  // Test component to see if webpack includes it
  const TestMultiRole = () => (
    <div>
      <h1>Multi-Role Management Test</h1>
      <p>If you see this, webpack is including the component!</p>
    </div>
  );

  // Explicit component renderer to force webpack inclusion
  const renderTabContent = () => {
    switch (activeTab) {
      case 'user-management':
        return <UserManagement />;
      case 'multi-role-management':
        // Use the actual MultiRoleManagement component
        return <MultiRoleManagement />;
      case 'password-management':
        return <PasswordManagement />;
      case 'system-settings':
        return <SystemSettings />;
      case 'audit-logs':
        return <AuditLogs />;
      default:
        return <UserManagement />;
    }
  };

  // Debug: Log user info
  useEffect(() => {
    console.log('SettingsPage - User:', user);
    console.log('SettingsPage - Loading:', loading);
    console.log('SettingsPage - Has super_admin role:', hasRole(['super_admin']));
  }, [user, loading, hasRole]);

  // Settings tabs configuration - define tabs individually first to prevent tree-shaking
  // Use string concatenation to make ID opaque to webpack static analysis
  const passwordManagementTab: SettingsTab = {
    id: ['password', 'management'].join('-'),  // Opaque to webpack!
    label: 'إدارة كلمات المرور',
    icon: KeyIcon,
    requiredRole: ['super_admin'],
    description: 'إنشاء وإعادة تعيين كلمات المرور للمستخدمين'
  };

  // Force webpack to see passwordManagementTab is used
  if (typeof window !== 'undefined') {
    (window as any).__PWD_TAB__ = passwordManagementTab;
  }

  const settingsTabs: SettingsTab[] = [
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
    passwordManagementTab,
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

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    direction: 'rtl'
  };

  const headerStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '30px',
    marginBottom: '30px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  };

  const mainContentStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '30px',
    maxWidth: '1400px',
    margin: '0 auto'
  };

  const sidebarStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '20px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
    height: 'fit-content',
    position: 'sticky' as const,
    top: '20px'
  };

  const contentAreaStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
    minHeight: '600px'
  };

  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '15px',
    marginBottom: '10px',
    background: isActive
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : 'transparent',
    color: isActive ? 'white' : '#4B5563',
    border: isActive ? 'none' : '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: isActive ? '600' : '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'right' as const
  });

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#9CA3AF',
    marginBottom: '15px',
    paddingRight: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const roleIndicatorStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '6px 12px',
    background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
    color: 'white',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600'
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
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
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
                      fontSize: '11px',
                      opacity: 0.9,
                      marginTop: '2px'
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
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: '#9CA3AF', marginBottom: '20px' }}>
                جاري تحميل الإعدادات...
              </div>
            </div>
          ) : !user ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <ShieldCheckIcon style={{ width: '60px', height: '60px', margin: '0 auto', color: '#9CA3AF' }} />
              <div style={{ fontSize: '18px', color: '#6B7280', marginTop: '20px' }}>
                الرجاء تسجيل الدخول لعرض الإعدادات
              </div>
            </div>
          ) : !hasRole(['super_admin']) ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <ShieldCheckIcon style={{ width: '60px', height: '60px', margin: '0 auto', color: '#EF4444' }} />
              <div style={{ fontSize: '18px', color: '#6B7280', marginTop: '20px' }}>
                ليس لديك صلاحيات لعرض هذه الصفحة
              </div>
              <div style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '10px' }}>
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