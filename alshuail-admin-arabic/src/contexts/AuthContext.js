import React, { createContext, useState, useContext, useEffect } from 'react';

import { logger } from '../utils/logger';

const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://api.alshailfund.com';
logger.debug('🔧 AuthContext API_BASE_URL:', { API_BASE_URL });
logger.debug('🔧 process.env.REACT_APP_API_URL:', { REACT_APP_API_URL: process.env.REACT_APP_API_URL });

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const persistSession = (tokenValue, userData) => {
    if (!tokenValue || !userData) {
      return;
    }

    setToken(tokenValue);
    setUser(userData);
    setIsAuthenticated(true);

    localStorage.setItem('token', tokenValue);
    localStorage.setItem('auth_token', tokenValue);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('user_data', JSON.stringify(userData));
    localStorage.setItem('isLoggedIn', 'true');
    if (userData.email) {
      localStorage.setItem('userEmail', userData.email);
    }
    if (userData.role) {
      localStorage.setItem('userRole', userData.role);
    }
  };

  const clearSession = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };



  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const storedToken = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user') || localStorage.getItem('user_data');

      if (!storedToken || !storedUser) {
        clearSession();
        return;
      }

      let parsedUser = null;
      try {
        parsedUser = JSON.parse(storedUser);
      } catch (parseError) {
        logger.error('Failed to parse stored user payload', { parseError });
        clearSession();
        return;
      }

      const verifyUrl = `${API_BASE_URL}/api/auth/verify`;
      logger.debug('🔧 Verifying auth with URL:', { verifyUrl });
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${storedToken}`
        }
      });

      if (!response.ok) {
        // Try to refresh the token before giving up
        const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.success && refreshData.token) {
            persistSession(refreshData.token, refreshData.user || parsedUser);
            return;
          }
        }

        clearSession();
        return;
      }

      const verification = await response.json();
      const verifiedUser = verification?.user ? { ...parsedUser, ...verification.user } : parsedUser;

      // If server sent a new token (auto-refresh), use it
      if (verification.newToken) {
        persistSession(verification.newToken, verifiedUser);
      } else {
        persistSession(storedToken, verifiedUser);
      }
    } catch (error) {
      logger.error('Auth status check failed:', { error });
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();

    // Set up periodic auth check every 30 minutes
    const interval = setInterval(() => {
      if (isAuthenticated) {
        checkAuthStatus();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const authenticate = async (endpoint, payload) => {
    setLoading(true);
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      logger.debug('🔐 Attempting authentication:', { url, payload: { ...payload, password: '***' } });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success && (data.token || data?.data?.token)) {
        const sessionToken = data.token || data?.data?.token;
        const sessionUser = data.user || data?.data?.user;

        if (sessionToken && sessionUser) {
          persistSession(sessionToken, sessionUser);
          logger.info('✅ Authentication successful:', { user: sessionUser.email || sessionUser.phone });
          return {
            success: true,
            user: sessionUser,
            token: sessionToken,
            requires_password_change: data.requires_password_change || false,
            is_first_login: data.is_first_login || false
          };
        }
      }

      const errorMessage = data?.error || data?.message_ar || 'خطأ في تسجيل الدخول';
      logger.warn('⚠️ Authentication failed:', { status: response.status, error: errorMessage });
      return { success: false, error: errorMessage };
    } catch (error) {
      logger.error('❌ Authentication network error:', {
        error: error.message,
        endpoint,
        baseUrl: API_BASE_URL
      });

      // More specific error messages
      if (error.message === 'Failed to fetch') {
        return {
          success: false,
          error: 'لا يمكن الاتصال بالخادم. تأكد من تشغيل الخادم على المنفذ 3001'
        };
      }

      return {
        success: false,
        error: `خطأ في الاتصال: ${error.message}`
      };
    } finally {
      setLoading(false);
    }
  };

  const loginAdmin = async (phone, password, role = 'super_admin') => {
    // For admin login, we need to use email format - convert phone to email
    // or check if it's already an email
    const isEmail = phone.includes('@');
    const loginData = isEmail
      ? { email: phone, password }
      : { phone, password, role };

    return authenticate('/api/auth/login', loginData);
  };

  const loginMember = async (phone, password) => {
    return authenticate('/api/auth/member-login', { phone, password });
  };

  const login = async (phone, password, role = null) => {
    // If role is provided, it's an admin login, otherwise member login
    if (role && role !== 'user_member') {
      return loginAdmin(phone, password, role);
    }
    return loginMember(phone, password);
  };

  const logout = () => {
    clearSession();
  };

  const hasRole = (requiredRoles) => {
    if (!user) return false;

    // Support both single role string and array of roles
    const rolesToCheck = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    // New RBAC role hierarchy
    const roleHierarchy = {
      'super_admin': 100,
      'financial_manager': 80,
      'family_tree_admin': 70,
      'occasions_initiatives_diyas_admin': 60,
      'user_member': 10,
      // Legacy support
      'admin': 3,
      'organizer': 2,
      'member': 1
    };

    const userRoleLevel = roleHierarchy[user.role] || 0;

    // Check if user has any of the required roles
    return rolesToCheck.some(role => {
      const requiredRoleLevel = roleHierarchy[role] || 0;
      return userRoleLevel >= requiredRoleLevel;
    });
  };

  const hasPermission = (permission) => {
    if (!user) return false;

    if (user?.permissions && user.permissions.all_access) {
      return true;
    }

    // Updated permissions with new role system
    const permissions = {
      'super_admin': [
        'view_dashboard',
        'manage_users',
        'manage_roles',
        'manage_members',
        'manage_family_tree',
        'manage_activities',
        'manage_occasions',
        'manage_initiatives',
        'manage_diyas',
        'manage_finances',
        'view_reports',
        'system_settings',
        'audit_logs',
        'all_access'
      ],
      'financial_manager': [
        'view_dashboard',
        'view_financial_overview',
        'manage_subscriptions',
        'manage_payments',
        'view_financial_reports',
        'view_member_financial',
        'view_finances',
        'manage_finances'
      ],
      'family_tree_admin': [
        'view_dashboard',
        'manage_family_tree',
        'view_tree_management',
        'manage_relationships',
        'view_member_relationships'
      ],
      'occasions_initiatives_diyas_admin': [
        'view_dashboard',
        'manage_occasions',
        'manage_initiatives',
        'manage_diyas',
        'view_events_calendar',
        'manage_charity_projects',
        'manage_mediation_cases',
        'view_member_participation'
      ],
      'user_member': [
        'view_dashboard',
        'view_my_profile',
        'view_my_payments',
        'view_family_events',
        'view_volunteer_opportunities',
        'view_own_data'
      ],
      // Legacy support
      'admin': [
        'view_dashboard',
        'manage_users',
        'manage_activities',
        'manage_finances',
        'view_reports',
        'system_settings'
      ],
      'organizer': [
        'view_dashboard',
        'view_activities',
        'manage_activities',
        'view_finances',
        'view_reports'
      ],
      'member': [
        'view_dashboard',
        'view_activities'
      ]
    };

    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes(permission);
  };

  const canAccessModule = (module) => {
    if (!user) return false;

    // Module access configuration
    const moduleAccess = {
      'members': ['super_admin'],
      'financial': ['super_admin', 'financial_manager', 'admin', 'moderator'],
      'family_tree': ['super_admin', 'family_tree_admin'],
      'occasions': ['super_admin', 'occasions_initiatives_diyas_admin'],
      'initiatives': ['super_admin', 'occasions_initiatives_diyas_admin'],
      'diyas': ['super_admin', 'occasions_initiatives_diyas_admin'],
      'settings': ['super_admin'],
      'audit': ['super_admin'],
      'dashboard': ['super_admin', 'financial_manager', 'family_tree_admin', 'occasions_initiatives_diyas_admin', 'user_member']
    };

    const allowedRoles = moduleAccess[module] || [];
    return allowedRoles.includes(user.role);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    loginAdmin,
    loginMember,
    logout,
    hasRole,
    hasPermission,
    canAccessModule,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};











