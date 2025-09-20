import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'admin' | 'manager' | 'member' | 'viewer';

export interface Permission {
  resource: string;
  actions: string[];
}

export interface RolePermissions {
  [key: string]: Permission[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
}

interface RoleContextType {
  currentUser: User | null;
  userRole: UserRole | null;
  permissions: Permission[];
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  setUser: (user: User | null) => void;
  loading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// Default role permissions
const DEFAULT_PERMISSIONS: RolePermissions = {
  admin: [
    { resource: 'members', actions: ['create', 'read', 'update', 'delete', 'export', 'import'] },
    { resource: 'payments', actions: ['create', 'read', 'update', 'delete', 'export'] },
    { resource: 'reports', actions: ['create', 'read', 'export'] },
    { resource: 'settings', actions: ['read', 'update'] },
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'activities', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'notifications', actions: ['create', 'read', 'update', 'delete', 'send'] },
    { resource: 'occasions', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'initiatives', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'diyas', actions: ['create', 'read', 'update', 'delete'] },
  ],
  manager: [
    { resource: 'members', actions: ['create', 'read', 'update', 'export'] },
    { resource: 'payments', actions: ['create', 'read', 'update', 'export'] },
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'activities', actions: ['create', 'read', 'update'] },
    { resource: 'notifications', actions: ['create', 'read', 'send'] },
    { resource: 'occasions', actions: ['create', 'read', 'update'] },
    { resource: 'initiatives', actions: ['create', 'read', 'update'] },
    { resource: 'diyas', actions: ['create', 'read', 'update'] },
  ],
  member: [
    { resource: 'members', actions: ['read'] },
    { resource: 'payments', actions: ['read'] },
    { resource: 'reports', actions: ['read'] },
    { resource: 'activities', actions: ['read'] },
    { resource: 'occasions', actions: ['read'] },
    { resource: 'initiatives', actions: ['read'] },
    { resource: 'diyas', actions: ['read'] },
  ],
  viewer: [
    { resource: 'members', actions: ['read'] },
    { resource: 'payments', actions: ['read'] },
    { resource: 'reports', actions: ['read'] },
    { resource: 'activities', actions: ['read'] },
  ],
};

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage or API
    const loadUser = async () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          // Ensure user has permissions based on role
          user.permissions = DEFAULT_PERMISSIONS[user.role] || [];
          setCurrentUser(user);
        } else {
          // Default admin user for development
          const defaultUser: User = {
            id: '1',
            email: 'admin@alshuail.com',
            name: 'مدير النظام',
            role: 'admin',
            permissions: DEFAULT_PERMISSIONS.admin,
          };
          setCurrentUser(defaultUser);
          localStorage.setItem('currentUser', JSON.stringify(defaultUser));
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const setUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      // Ensure user has permissions based on role
      user.permissions = DEFAULT_PERMISSIONS[user.role] || [];
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!currentUser) return false;
    
    return currentUser.permissions.some(
      permission => 
        permission.resource === resource && 
        permission.actions.includes(action)
    );
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!currentUser) return false;
    
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(currentUser.role);
  };

  const value: RoleContextType = {
    currentUser,
    userRole: currentUser?.role || null,
    permissions: currentUser?.permissions || [],
    hasPermission,
    hasRole,
    setUser,
    loading,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};

export default RoleContext;