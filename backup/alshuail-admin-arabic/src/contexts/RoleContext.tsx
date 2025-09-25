/**
 * Role Context for RBAC System
 * Manages user roles and permissions throughout the application
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Role types definition
export type UserRole =
  | 'super_admin'
  | 'financial_manager'
  | 'family_tree_admin'
  | 'occasions_initiatives_diyas_admin'
  | 'user_member';

// Permission structure
interface Permissions {
  [key: string]: any;
}

// User with role information
interface UserWithRole {
  id: string;
  email: string;
  role: UserRole;
  roleAr: string;
  permissions: Permissions;
}

// Context type
interface RoleContextType {
  user: UserWithRole | null;
  loading: boolean;
  error: string | null;
  checkPermission: (permission: string) => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canAccessModule: (module: string) => boolean;
  refreshUserRole: () => Promise<void>;
}

// Create context
const RoleContext = createContext<RoleContextType | undefined>(undefined);

// Navigation configuration by role
const ROLE_NAVIGATION = {
  super_admin: {
    modules: [
      'dashboard',
      'members',
      'family-tree',
      'financial',
      'occasions',
      'initiatives',
      'diyas',
      'reports',
      'settings',
      'audit'
    ],
    permissions: {
      all_access: true
    }
  },
  financial_manager: {
    modules: [
      'dashboard',
      'financial-overview',
      'subscriptions',
      'payments',
      'financial-reports'
    ],
    permissions: {
      financial_only: true,
      view_member_financial: true
    }
  },
  family_tree_admin: {
    modules: [
      'dashboard',
      'family-tree',
      'tree-management',
      'relationships'
    ],
    permissions: {
      family_tree_only: true,
      view_member_relationships: true
    }
  },
  occasions_initiatives_diyas_admin: {
    modules: [
      'dashboard',
      'occasions',
      'initiatives',
      'diyas',
      'events-calendar',
      'charity-projects',
      'mediation-cases'
    ],
    permissions: {
      occasions_access: true,
      initiatives_access: true,
      diyas_access: true,
      view_member_participation: true
    }
  },
  user_member: {
    modules: [
      'dashboard',
      'my-profile',
      'my-payments',
      'family-events',
      'volunteer-opportunities'
    ],
    permissions: {
      personal_only: true,
      view_own_data: true
    }
  }
};

// Permission checking helpers
const PERMISSION_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  financial_manager: 80,
  family_tree_admin: 70,
  occasions_initiatives_diyas_admin: 60,
  user_member: 10
};

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user role on mount
  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is logged in (from localStorage)
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const userEmail = localStorage.getItem('userEmail');

      if (!isLoggedIn || isLoggedIn !== 'true') {
        setUser(null);
        return;
      }

      // Try to get user from localStorage first
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (storedUser && token) {
        try {
          const userData = JSON.parse(storedUser);

          // Map the stored user data to UserWithRole format
          const user: UserWithRole = {
            id: userData.id || '1',
            email: userData.email || userEmail || 'admin@alshuail.com',
            role: userData.role as UserRole || 'super_admin',
            roleAr: userData.role === 'super_admin' ? 'مدير النظام الرئيسي' : 'مدير النظام',
            permissions: userData.permissions || {
              users: { create: true, read: true, update: true, delete: true },
              settings: { read: true, update: true },
              roles: { assign: true, revoke: true },
              all: true
            }
          };

          setUser(user);
          return;
        } catch (err) {
          console.error('Error parsing stored user:', err);
        }
      }

      // Fallback to mock user for testing
      const mockUser: UserWithRole = {
        id: '1',
        email: userEmail || 'admin@alshuail.com',
        role: 'super_admin',
        roleAr: 'مدير النظام الرئيسي',
        permissions: {
          users: { create: true, read: true, update: true, delete: true },
          settings: { read: true, update: true },
          roles: { assign: true, revoke: true },
          all: true
        }
      };

      setUser(mockUser);
    } catch (err) {
      console.error('Error fetching user role:', err);
      setError('خطأ في جلب صلاحيات المستخدم');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserRole = async () => {
    await fetchUserRole();
  };

  const checkPermission = (permission: string): boolean => {
    if (!user) return false;

    // Super admin has all permissions
    if (user.role === 'super_admin') return true;

    // Check specific permission in user's permissions object
    const permissionParts = permission.split('.');
    let currentLevel: any = user.permissions;

    for (const part of permissionParts) {
      if (currentLevel && typeof currentLevel === 'object' && part in currentLevel) {
        currentLevel = currentLevel[part];
      } else {
        return false;
      }
    }

    return currentLevel === true;
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;

    // Super admin has access to everything
    if (user.role === 'super_admin') return true;

    // Check if user's role is in the required roles
    return roles.includes(user.role);
  };

  const canAccessModule = (module: string): boolean => {
    if (!user) return false;

    const roleConfig = ROLE_NAVIGATION[user.role];
    if (!roleConfig) return false;

    return roleConfig.modules.includes(module);
  };

  const contextValue: RoleContextType = {
    user,
    loading,
    error,
    checkPermission,
    hasRole,
    canAccessModule,
    refreshUserRole
  };

  return (
    <RoleContext.Provider value={contextValue}>
      {children}
    </RoleContext.Provider>
  );
};

// Custom hook to use role context
export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};

// HOC for role-based component protection
export const withRoleProtection = <P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[]
): React.FC<P> => {
  return (props: P) => {
    const { user, loading, hasRole } = useRole();

    if (loading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
          color: '#666'
        }}>
          جاري التحقق من الصلاحيات...
        </div>
      );
    }

    if (!user || !hasRole(allowedRoles)) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
          color: '#dc2626'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⛔</div>
          <div>ليس لديك الصلاحية للوصول إلى هذه الصفحة</div>
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            الرجاء التواصل مع المدير للحصول على الصلاحيات المطلوبة
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

// Role-based visibility component
interface RoleGateProps {
  roles?: UserRole[];
  permission?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  roles,
  permission,
  children,
  fallback = null
}) => {
  const { hasRole, checkPermission } = useRole();

  let hasAccess = false;

  if (roles && roles.length > 0) {
    hasAccess = hasRole(roles);
  }

  if (permission) {
    hasAccess = hasAccess || checkPermission(permission);
  }

  return <>{hasAccess ? children : fallback}</>;
};

// Export role configuration
export const getRoleConfig = (role: UserRole) => {
  return ROLE_NAVIGATION[role] || null;
};

// Export role display names
export const ROLE_DISPLAY_NAMES = {
  super_admin: { en: 'Super Admin', ar: 'المدير الأعلى' },
  financial_manager: { en: 'Financial Manager', ar: 'المدير المالي' },
  family_tree_admin: { en: 'Family Tree Admin', ar: 'مدير شجرة العائلة' },
  occasions_initiatives_diyas_admin: {
    en: 'Occasions, Initiatives & Diyas Admin',
    ar: 'مدير المناسبات والمبادرات والديات'
  },
  user_member: { en: 'User Member', ar: 'عضو عادي' }
};

// Export module access configuration
export const MODULE_ACCESS = {
  members: ['super_admin'],
  financial: ['super_admin', 'financial_manager'],
  family_tree: ['super_admin', 'family_tree_admin'],
  occasions: ['super_admin', 'occasions_initiatives_diyas_admin'],
  initiatives: ['super_admin', 'occasions_initiatives_diyas_admin'],
  diyas: ['super_admin', 'occasions_initiatives_diyas_admin'],
  settings: ['super_admin'],
  audit: ['super_admin']
} as const;

export default RoleContext;