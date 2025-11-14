/**
 * Settings Panel Component
 * Premium Apple-inspired settings interface with RBAC support
 * Features glassmorphism effects, sophisticated animations, and full RTL support
 */

import React, { memo,  useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import UserManagement from './UserManagement';
import SystemSettings from './SystemSettings';
import AuditLogs from './AuditLogs';
import MultiRoleManagement from './MultiRoleManagement';
import AccessControl from './AccessControl';
import { logger } from '../../utils/logger';

import '../Members/AppleDesignSystem.css';
import {
  CogIcon,
  UsersIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ServerIcon,
  KeyIcon,
  SparklesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const Settings = () => {
  const { user, hasRole, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('user-management');

  // Settings tabs configuration with RBAC
  const settingsTabs = [
    {
      id: 'user-management',
      label: 'إدارة المستخدمين',
      icon: UsersIcon,
      component: UserManagement,
      requiredRoles: ['super_admin', 'admin'],
      description: 'إدارة المستخدمين وتعيين الأدوار والصلاحيات',
      gradient: 'linear-gradient(135deg, var(--apple-blue-500) 0%, var(--apple-purple-600) 100%)',
      shadowColor: 'rgba(59, 130, 246, 0.3)'
    },
    {
      id: 'multi-role-management',
      label: 'إدارة الأدوار المتعددة',
      icon: UserGroupIcon,
      component: MultiRoleManagement,
      requiredRoles: ['super_admin'],
      description: 'تعيين أدوار متعددة مع فترات زمنية محددة',
      gradient: 'linear-gradient(135deg, var(--apple-indigo-500) 0%, var(--apple-purple-600) 100%)',
      shadowColor: 'rgba(99, 102, 241, 0.3)'
    },
    {
      id: 'password-management',
      label: 'إدارة كلمات المرور',
      icon: KeyIcon,
      component: AccessControl,
      requiredRoles: ['super_admin'],
      description: 'إنشاء وإعادة تعيين كلمات المرور للمستخدمين',
      gradient: 'linear-gradient(135deg, var(--apple-pink-500) 0%, var(--apple-rose-600) 100%)',
      shadowColor: 'rgba(236, 72, 153, 0.3)'
    },
    {
      id: 'system-settings',
      label: 'إعدادات النظام',
      icon: ServerIcon,
      component: SystemSettings,
      requiredRoles: ['super_admin', 'admin'],
      description: 'إعدادات النظام العامة والتكوينات',
      gradient: 'linear-gradient(135deg, var(--apple-emerald-500) 0%, var(--apple-teal-600) 100%)',
      shadowColor: 'rgba(16, 185, 129, 0.3)'
    },
    {
      id: 'audit-logs',
      label: 'سجلات التدقيق',
      icon: ShieldCheckIcon,
      component: AuditLogs,
      requiredRoles: ['super_admin', 'admin'],
      description: 'عرض سجلات النظام وأنشطة المستخدمين',
      gradient: 'linear-gradient(135deg, var(--apple-amber-500) 0%, var(--apple-orange-600) 100%)',
      shadowColor: 'rgba(245, 158, 11, 0.3)'
    }
  ];

  // Get user role from various sources
  const storedUser = localStorage.getItem('user');
  let userRole = user?.role;

  if (!userRole && storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser);
      userRole = parsedUser.role;
    } catch (e) {
      logger.error('Error parsing stored user:', { e });
    }
  }

  // Debug logging
  logger.debug('[Settings] User role:', { userRole });
  logger.debug('[Settings] User data:', { user });
  logger.debug('[Settings] hasRole function available:', {});

  // Filter tabs based on user role - always show for admin/super_admin
  const availableTabs = settingsTabs.filter(tab => {
    if (!tab.requiredRoles || tab.requiredRoles.length === 0) return true;

    // Check if user has admin or super_admin role
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    if (isAdmin) return true;

    // Check if user has required role using hasRole function if available
    if (hasRole && typeof hasRole === 'function') {
      return hasRole(tab.requiredRoles);
    }

    // Fallback: check userRole directly
    if (userRole) {
      return tab.requiredRoles.includes(userRole);
    }

    return false;
  });

  // Debug available tabs
  logger.debug('[Settings] Available tabs:'));
  logger.debug('[Settings] Active tab:', { activeTab });

  // Set first available tab as default
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(tab => tab.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  const activeTabData = availableTabs.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabData?.component;

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
                <CogIcon style={{ width: '32px', height: '32px', color: 'white', zIndex: 1 }} />
              </div>
              <div>
                <h1 style={{
                  fontSize: '2.25rem',
                  fontWeight: '700',
                  color: 'var(--apple-gray-900)',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-display)'
                }}>
                  إعدادات النظام
                </h1>
                <p style={{
                  fontSize: '1.125rem',
                  color: 'var(--apple-gray-600)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: '500'
                }}>
                  إدارة وتكوين إعدادات نظام عائلة الشعيل
                </p>
              </div>
            </div>

            {/* User Role Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, var(--apple-green-500) 0%, var(--apple-emerald-600) 100%)',
              color: 'white',
              borderRadius: 'var(--radius-full)',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: 'var(--apple-shadow-md)'
            }}>
              <SparklesIcon style={{ width: '16px', height: '16px' }} />
              <span>{user?.role === 'super_admin' ? 'المدير الأعلى' : user?.role || 'غير محدد'}</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="pill-navigation">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pill-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <Icon style={{ width: '16px', height: '16px' }} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // Access Denied Component
  const AccessDenied = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      textAlign: 'center'
    }}>
      <div style={{
        width: '120px',
        height: '120px',
        background: 'linear-gradient(135deg, var(--apple-red-500) 0%, var(--apple-rose-500) 100%)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem',
        boxShadow: 'var(--apple-shadow-lg)'
      }}>
        <ExclamationTriangleIcon style={{ width: '60px', height: '60px', color: 'white' }} />
      </div>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: '700',
        color: 'var(--apple-gray-900)',
        marginBottom: '1rem',
        fontFamily: 'var(--font-display)'
      }}>
        ليس لديك صلاحية للوصول
      </h2>
      <p style={{
        fontSize: '1rem',
        color: 'var(--apple-gray-600)',
        marginBottom: '1.5rem',
        fontFamily: 'var(--font-display)',
        lineHeight: '1.6'
      }}>
        هذه الصفحة مخصصة للمديرين فقط. يرجى التواصل مع المدير الأعلى للحصول على الصلاحيات المطلوبة.
      </p>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: 'rgba(239, 68, 68, 0.1)',
        color: 'var(--apple-red-500)',
        borderRadius: 'var(--radius-lg)',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        الدور الحالي: {user?.role || 'غير محدد'}
      </div>
    </div>
  );

  // Loading State
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 50%, #f3e8ff 100%)',
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        dir="rtl"
      >
        <div className="glass-container" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="loading-spinner" style={{
            width: '40px',
            height: '40px',
            margin: '0 auto 1.5rem',
            borderWidth: '3px',
            borderTopColor: 'var(--apple-blue-600)'
          }}></div>
          <div style={{
            fontSize: '1.125rem',
            color: 'var(--apple-gray-600)',
            fontFamily: 'var(--font-display)',
            fontWeight: '500'
          }}>
            جاري تحميل الإعدادات...
          </div>
        </div>
      </div>
    );
  }

  // userRole already extracted above

  // No Access for Non-Admins - check if user has admin or super_admin role
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  if (!isAdmin) {
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
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="glass-container slide-in-up">
            <AccessDenied />
          </div>
        </div>
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

        {/* Main Content Area */}
        <div className="glass-container slide-in-up" style={{
          padding: '2rem',
          minHeight: '600px',
          animationDelay: '200ms'
        }}>
          {activeTabData && (
            <div>
              {/* Tab Content Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '2rem',
                padding: '1rem',
                background: activeTabData.gradient,
                borderRadius: 'var(--radius-xl)',
                color: 'white'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <activeTabData.icon style={{ width: '24px', height: '24px' }} />
                </div>
                <div>
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    marginBottom: '0.25rem',
                    fontFamily: 'var(--font-display)'
                  }}>
                    {activeTabData.label}
                  </h2>
                  <p style={{
                    fontSize: '0.875rem',
                    opacity: 0.9,
                    fontFamily: 'var(--font-display)'
                  }}>
                    {activeTabData.description}
                  </p>
                </div>
              </div>

              {/* Component Content */}
              <div style={{ position: 'relative' }}>
                {(() => {
                  // Explicit component rendering to force webpack inclusion
                  switch (activeTab) {
                    case 'user-management':
                      return <UserManagement />;
                    case 'multi-role-management':
                      return <MultiRoleManagement />;
                    case 'password-management':
                      return <AccessControl />;
                    case 'system-settings':
                      return <SystemSettings />;
                    case 'audit-logs':
                      return <AuditLogs />;
                    default:
                      return (
                        <div style={{
                          padding: '2rem',
                          textAlign: 'center',
                          color: 'var(--apple-gray-600)'
                        }}>
                          <p>جاري تحميل المحتوى...</p>
                        </div>
                      );
                  }
                })()}
              </div>
            </div>
          )}

          {/* Debug Info and No Available Tabs */}
          {availableTabs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <KeyIcon style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 1rem',
                color: 'var(--apple-gray-400)'
              }} />
              <div style={{
                fontSize: '1.125rem',
                color: 'var(--apple-gray-600)',
                fontFamily: 'var(--font-display)',
                fontWeight: '500'
              }}>
                لا توجد إعدادات متاحة لدورك الحالي
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(Settings);