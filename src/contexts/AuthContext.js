import React, { createContext, useState, useContext, useEffect } from 'react';

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

  const checkAuthStatus = async () => {
    try {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user_data');

      if (storedToken && storedUser) {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/verify`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setToken(storedToken);
          setIsAuthenticated(true);
        } else {
          logout();
        }
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (phone, password) => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone, password })
      });

      const data = await response.json();

      if (data.status === 'success') {
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('user_data', JSON.stringify(data.data.user));

        setUser(data.data.user);
        setToken(data.data.token);
        setIsAuthenticated(true);

        return { success: true, user: data.data.user, token: data.data.token };
      } else {
        return {
          success: false,
          error: data.message_ar || 'خطأ في تسجيل الدخول'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'خطأ في الاتصال بالخادم'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  const hasRole = (requiredRole) => {
    if (!user) return false;

    const roleHierarchy = {
      'admin': 3,
      'organizer': 2,
      'member': 1
    };

    const userRoleLevel = roleHierarchy[user.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    return userRoleLevel >= requiredRoleLevel;
  };

  const hasPermission = (permission) => {
    if (!user) return false;

    const permissions = {
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

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
    hasRole,
    hasPermission,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};