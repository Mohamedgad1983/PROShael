import React, { createContext, useState, useContext, useEffect } from 'react';
<<<<<<< HEAD
=======
import { apiService } from '../services/api';
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409

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
<<<<<<< HEAD
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuthStatus = async () => {
    try {
      // Check both old and new localStorage keys for compatibility
      const storedToken = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user') || localStorage.getItem('user_data');

      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setToken(storedToken);
        setIsAuthenticated(true);

        // Ensure both keys exist for compatibility
        if (!localStorage.getItem('token') && localStorage.getItem('auth_token')) {
          localStorage.setItem('token', localStorage.getItem('auth_token'));
        }
        if (!localStorage.getItem('user') && localStorage.getItem('user_data')) {
          localStorage.setItem('user', localStorage.getItem('user_data'));
        }

        // No need to verify with backend every time, trust the stored data
        // This avoids potential backend issues
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      // Don't logout on error, just set not authenticated
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (phone, password, role = 'user_member') => {
    try {
      setLoading(true);

      // For demo/development - simulate login with selected role
      const mockUser = {
        id: 1,
        phone: phone,
        name: 'مستخدم تجريبي',
        role: role, // Use the selected role
        email: `${phone}@alshuail.com`,
        created_at: new Date().toISOString()
      };

      // Create a valid mock JWT token
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(JSON.stringify({
        id: 1,
        phone: phone,
        role: role,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // Expires in 24 hours
        iat: Math.floor(Date.now() / 1000)
      }));
      const signature = btoa('mock-signature');
      const mockToken = `${header}.${payload}.${signature}`;

      // Store in both keys for compatibility
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('token', mockToken); // Also store as 'token' for ExpenseManagement
      localStorage.setItem('user_data', JSON.stringify(mockUser));
      localStorage.setItem('user', JSON.stringify(mockUser)); // Also store as 'user' for compatibility

      setUser(mockUser);
      setToken(mockToken);
      setIsAuthenticated(true);

      return { success: true, user: mockUser, token: mockToken };

      /* Original backend integration code - uncomment when backend is ready
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone, password, role })
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
      */
    } catch (error) {
      return {
        success: false,
        error: 'خطأ في الاتصال بالخادم'
      };
=======
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Verify token with backend
        const response = await apiService.get('/auth/verify');
        if (response.data.valid) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  const logout = () => {
    // Remove both old and new localStorage keys
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
      'financial': ['super_admin', 'financial_manager'],
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
=======
  const login = async (email, password) => {
    try {
      const response = await apiService.login(email, password);
      const { user: userData, accessToken, refreshToken } = response;
      
      // Store tokens
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Set user state
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'فشل في تسجيل الدخول' 
      };
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear state regardless of API call success
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
    }
  };

  const updateUser = (userData) => {
    setUser(prevUser => ({ ...prevUser, ...userData }));
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiService.refreshAuthToken(refreshToken);
      const { accessToken } = response.data;
      
      localStorage.setItem('token', accessToken);
      return accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      throw error;
    }
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
  };

  const value = {
    user,
<<<<<<< HEAD
    token,
=======
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
    loading,
    isAuthenticated,
    login,
    logout,
<<<<<<< HEAD
    hasRole,
    hasPermission,
    canAccessModule,
    checkAuthStatus
=======
    updateUser,
    refreshToken,
    checkAuthState
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
<<<<<<< HEAD
};
=======
};

export default AuthContext;
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
