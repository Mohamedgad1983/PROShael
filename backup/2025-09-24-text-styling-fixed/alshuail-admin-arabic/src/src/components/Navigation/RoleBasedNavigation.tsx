/**
 * Role-Based Navigation Component
 * Displays navigation items based on user's role
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRole, UserRole, ROLE_DISPLAY_NAMES } from '../../contexts/RoleContext';
import {
  HomeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarIcon,
  HeartIcon,
  ScaleIcon,
  CogIcon,
  DocumentTextIcon,
  UserCircleIcon,
  LockClosedIcon,
  GlobeAltIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

// Navigation items configuration
const NAVIGATION_ITEMS: Record<string, {
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  roles: UserRole[];
}> = {
  // Common items
  dashboard: {
    label: 'لوحة التحكم',
    icon: HomeIcon,
    path: '/dashboard',
    roles: ['super_admin', 'financial_manager', 'family_tree_admin', 'occasions_initiatives_diyas_admin', 'user_member'] as UserRole[]
  },

  // Super Admin & specific roles
  members: {
    label: 'إدارة الأعضاء',
    icon: UsersIcon,
    path: '/members',
    roles: ['super_admin'] as UserRole[]
  },

  // Financial
  financial_overview: {
    label: 'النظرة المالية',
    icon: ChartBarIcon,
    path: '/financial/overview',
    roles: ['super_admin', 'financial_manager'] as UserRole[]
  },
  subscriptions: {
    label: 'الاشتراكات',
    icon: DocumentTextIcon,
    path: '/financial/subscriptions',
    roles: ['super_admin', 'financial_manager'] as UserRole[]
  },
  payments: {
    label: 'المدفوعات',
    icon: CurrencyDollarIcon,
    path: '/financial/payments',
    roles: ['super_admin', 'financial_manager'] as UserRole[]
  },
  financial_reports: {
    label: 'التقارير المالية',
    icon: ChartBarIcon,
    path: '/financial/reports',
    roles: ['super_admin', 'financial_manager'] as UserRole[]
  },

  // Family Tree
  family_tree: {
    label: 'شجرة العائلة',
    icon: AcademicCapIcon,
    path: '/family-tree',
    roles: ['super_admin', 'family_tree_admin'] as UserRole[]
  },
  tree_management: {
    label: 'إدارة الشجرة',
    icon: AcademicCapIcon,
    path: '/family-tree/manage',
    roles: ['super_admin', 'family_tree_admin'] as UserRole[]
  },
  relationships: {
    label: 'العلاقات العائلية',
    icon: HeartIcon,
    path: '/family-tree/relationships',
    roles: ['super_admin', 'family_tree_admin'] as UserRole[]
  },

  // Occasions, Initiatives, Diyas
  occasions: {
    label: 'المناسبات',
    icon: CalendarIcon,
    path: '/occasions',
    roles: ['super_admin', 'occasions_initiatives_diyas_admin'] as UserRole[]
  },
  initiatives: {
    label: 'المبادرات',
    icon: HeartIcon,
    path: '/initiatives',
    roles: ['super_admin', 'occasions_initiatives_diyas_admin'] as UserRole[]
  },
  diyas: {
    label: 'الديات',
    icon: ScaleIcon,
    path: '/diyas',
    roles: ['super_admin', 'occasions_initiatives_diyas_admin'] as UserRole[]
  },
  events_calendar: {
    label: 'تقويم الفعاليات',
    icon: CalendarIcon,
    path: '/events-calendar',
    roles: ['super_admin', 'occasions_initiatives_diyas_admin'] as UserRole[]
  },
  charity_projects: {
    label: 'المشاريع الخيرية',
    icon: HeartIcon,
    path: '/charity-projects',
    roles: ['super_admin', 'occasions_initiatives_diyas_admin'] as UserRole[]
  },
  mediation_cases: {
    label: 'قضايا الوساطة',
    icon: ScaleIcon,
    path: '/mediation-cases',
    roles: ['super_admin', 'occasions_initiatives_diyas_admin'] as UserRole[]
  },

  // User Member
  my_profile: {
    label: 'ملفي الشخصي',
    icon: UserCircleIcon,
    path: '/profile',
    roles: ['user_member', 'super_admin', 'financial_manager', 'family_tree_admin', 'occasions_initiatives_diyas_admin'] as UserRole[]
  },
  my_payments: {
    label: 'مدفوعاتي',
    icon: CurrencyDollarIcon,
    path: '/my-payments',
    roles: ['user_member'] as UserRole[]
  },
  family_events: {
    label: 'فعاليات العائلة',
    icon: CalendarIcon,
    path: '/family-events',
    roles: ['user_member'] as UserRole[]
  },
  volunteer_opportunities: {
    label: 'فرص التطوع',
    icon: HeartIcon,
    path: '/volunteer',
    roles: ['user_member'] as UserRole[]
  },

  // Admin only
  settings: {
    label: 'الإعدادات',
    icon: CogIcon,
    path: '/settings',
    roles: ['super_admin'] as UserRole[]
  },
  audit: {
    label: 'سجلات التدقيق',
    icon: LockClosedIcon,
    path: '/audit-logs',
    roles: ['super_admin'] as UserRole[]
  }
};

interface NavigationItemProps {
  item: {
    label: string;
    icon: React.ComponentType<any>;
    path: string;
    roles: UserRole[];
  };
  isActive: boolean;
}

const NavigationItem: React.FC<NavigationItemProps> = ({ item, isActive }) => {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 20px',
        color: isActive ? '#007AFF' : '#374151',
        backgroundColor: isActive ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
        borderRadius: '12px',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        marginBottom: '4px',
        fontWeight: isActive ? '600' : '500'
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <Icon
        style={{
          width: '20px',
          height: '20px',
          marginLeft: '12px',
          color: isActive ? '#007AFF' : '#6B7280'
        }}
      />
      <span>{item.label}</span>
    </Link>
  );
};

const RoleBasedNavigation: React.FC = () => {
  const { user, hasRole } = useRole();
  const location = useLocation();

  if (!user) {
    return null;
  }

  // Filter navigation items based on user role
  const userNavigationItems = Object.entries(NAVIGATION_ITEMS).filter(([_, item]) => {
    return hasRole(item.roles);
  });

  // Group navigation items by category
  const groupedItems = {
    main: [] as typeof userNavigationItems,
    financial: [] as typeof userNavigationItems,
    family: [] as typeof userNavigationItems,
    events: [] as typeof userNavigationItems,
    personal: [] as typeof userNavigationItems,
    admin: [] as typeof userNavigationItems
  };

  userNavigationItems.forEach(([key, item]) => {
    if (['dashboard'].includes(key)) {
      groupedItems.main.push([key, item]);
    } else if (key.startsWith('financial_') || ['subscriptions', 'payments'].includes(key)) {
      groupedItems.financial.push([key, item]);
    } else if (key.startsWith('family_') || key.startsWith('tree_') || ['relationships'].includes(key)) {
      groupedItems.family.push([key, item]);
    } else if (['occasions', 'initiatives', 'diyas', 'events_calendar', 'charity_projects', 'mediation_cases'].includes(key)) {
      groupedItems.events.push([key, item]);
    } else if (key.startsWith('my_') || ['volunteer_opportunities', 'family_events'].includes(key)) {
      groupedItems.personal.push([key, item]);
    } else if (['members', 'settings', 'audit'].includes(key)) {
      groupedItems.admin.push([key, item]);
    } else {
      groupedItems.main.push([key, item]);
    }
  });

  const roleDisplayName = ROLE_DISPLAY_NAMES[user.role];

  return (
    <div style={{
      width: '280px',
      height: '100vh',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(0, 0, 0, 0.1)',
      padding: '20px',
      overflowY: 'auto',
      direction: 'rtl'
    }}>
      {/* User Info */}
      <div style={{
        padding: '20px',
        marginBottom: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        color: 'white',
        textAlign: 'center'
      }}>
        <UserCircleIcon style={{ width: '48px', height: '48px', margin: '0 auto 10px' }} />
        <div style={{ fontSize: '14px', opacity: 0.9 }}>{user.email}</div>
        <div style={{
          marginTop: '8px',
          padding: '4px 12px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          fontSize: '12px',
          display: 'inline-block'
        }}>
          {roleDisplayName.ar}
        </div>
      </div>

      {/* Navigation Sections */}
      <nav>
        {/* Main */}
        {groupedItems.main.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            {groupedItems.main.map(([key, item]) => (
              <NavigationItem
                key={key}
                item={item}
                isActive={location.pathname === item.path}
              />
            ))}
          </div>
        )}

        {/* Admin */}
        {groupedItems.admin.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '12px',
              color: '#9CA3AF',
              marginBottom: '8px',
              paddingRight: '12px',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              الإدارة
            </div>
            {groupedItems.admin.map(([key, item]) => (
              <NavigationItem
                key={key}
                item={item}
                isActive={location.pathname === item.path}
              />
            ))}
          </div>
        )}

        {/* Financial */}
        {groupedItems.financial.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '12px',
              color: '#9CA3AF',
              marginBottom: '8px',
              paddingRight: '12px',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              المالية
            </div>
            {groupedItems.financial.map(([key, item]) => (
              <NavigationItem
                key={key}
                item={item}
                isActive={location.pathname === item.path}
              />
            ))}
          </div>
        )}

        {/* Family */}
        {groupedItems.family.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '12px',
              color: '#9CA3AF',
              marginBottom: '8px',
              paddingRight: '12px',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              العائلة
            </div>
            {groupedItems.family.map(([key, item]) => (
              <NavigationItem
                key={key}
                item={item}
                isActive={location.pathname === item.path}
              />
            ))}
          </div>
        )}

        {/* Events & Community */}
        {groupedItems.events.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '12px',
              color: '#9CA3AF',
              marginBottom: '8px',
              paddingRight: '12px',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              الفعاليات والمجتمع
            </div>
            {groupedItems.events.map(([key, item]) => (
              <NavigationItem
                key={key}
                item={item}
                isActive={location.pathname === item.path}
              />
            ))}
          </div>
        )}

        {/* Personal */}
        {groupedItems.personal.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '12px',
              color: '#9CA3AF',
              marginBottom: '8px',
              paddingRight: '12px',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              الشخصي
            </div>
            {groupedItems.personal.map(([key, item]) => (
              <NavigationItem
                key={key}
                item={item}
                isActive={location.pathname === item.path}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Logout Button */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        left: '20px'
      }}>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#DC2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#EF4444';
          }}
        >
          <LockClosedIcon style={{ width: '16px', height: '16px', marginLeft: '8px' }} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
};

export default RoleBasedNavigation;