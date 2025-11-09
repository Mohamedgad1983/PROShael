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

// Force webpack to include the component
if (false) { console.log(MultiRoleManagement); }

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType;
  requiredRole?: string[];
  description: string;
}

const SettingsPage: React.FC = () => {
  const { user, hasRole, loading } = useRole();
  const [activeTab, setActiveTab] = useState('user-management');

  // Debug: Log user info
  useEffect(() => {
    console.log('SettingsPage - User:', user);
    console.log('SettingsPage - Loading:', loading);
    console.log('SettingsPage - Has super_admin role:', hasRole(['super_admin']));
  }, [user, loading, hasRole]);

  // Settings tabs configuration
  const settingsTabs: SettingsTab[] = [
    {
      id: 'user-management',
      label: 'إدارة المستخدمين والصلاحيات',
      icon: UsersIcon,
      component: UserManagement,
      requiredRole: ['super_admin'],
      description: 'إدارة المستخدمين وتعيين الأدوار والصلاحيات'
    },
    {
      id: 'multi-role-management',
      label: 'إدارة الأدوار المتعددة',
      icon: UserGroupIcon,
      component: MultiRoleManagement,
      requiredRole: ['super_admin'],
      description: 'تعيين أدوار متعددة مع فترات زمنية محددة'
    },
    {
      id: 'system-settings',
      label: 'إعدادات النظام',
      icon: ServerIcon,
      component: SystemSettings,
      requiredRole: ['super_admin'],
      description: 'إعدادات النظام العامة والتكوينات'
    },
    {
      id: 'audit-logs',
      label: 'سجلات التدقيق',
      icon: ShieldCheckIcon,
      component: AuditLogs,
      requiredRole: ['super_admin'],
      description: 'عرض سجلات النظام والأنشطة'
    }
  ];

  // Filter tabs based on user role
  const availableTabs = settingsTabs.filter(tab => {
    if (!tab.requiredRole) return true;
    return hasRole(tab.requiredRole as any);
  });

  const activeTabData = availableTabs.find(tab => tab.id === activeTab) || availableTabs[0];
  const ActiveComponent = activeTabData?.component;

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
            ActiveComponent && <ActiveComponent />
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;