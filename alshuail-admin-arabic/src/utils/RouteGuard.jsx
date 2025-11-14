// Route Guard Components for Role-Based Access Control
// This ensures members cannot access admin pages and vice versa

import React from 'react';
import { Navigate } from 'react-router-dom';

import { logger } from './logger';

/**
 * AdminRoute - Protects admin-only routes
 * Redirects members to mobile dashboard
 */
export const AdminRoute = ({ children }) => {
  // Get user from localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // Check if user exists and has authentication
  if (!user || !localStorage.getItem('token')) {
    // Not logged in, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Check user role - Include financial_manager for subscription access
  const adminRoles = ['admin', 'super_admin', 'moderator', 'financial_manager'];

  if (!adminRoles.includes(user.role)) {
    // User is a member, redirect to mobile dashboard
    logger.warn('Member attempted to access admin route, redirecting to mobile');
    return <Navigate to="/mobile/dashboard" replace />;
  }

  // User is admin, allow access
  return children;
};

/**
 * MemberRoute - Protects member-only routes
 * Redirects admins to admin dashboard
 */
export const MemberRoute = ({ children }) => {
  // Get user from localStorage with error handling
  let user = null;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      user = JSON.parse(userStr);
    }
  } catch (error) {
    logger.error('Failed to parse user data:', { error });
    localStorage.removeItem('user');
  }

  const token = localStorage.getItem('token');

  // Check if user exists and has authentication
  if (!user || !token) {
    // Not logged in, redirect to mobile login
    logger.debug('MemberRoute: No auth, redirecting to login');
    return <Navigate to="/mobile/login" replace />;
  }

  // Allow members to access
  if (user.role === 'member') {
    logger.debug('MemberRoute: Member authenticated, allowing access');
    return children;
  }

  // Allow admins to view member pages (for testing/support)
  if (['admin', 'super_admin', 'moderator', 'financial_manager'].includes(user.role)) {
    logger.debug('MemberRoute: Admin accessing member route for testing/support, allowing access');
    return children;
  }

  // Unknown role but has token - redirect to login
  logger.warn('MemberRoute: Unknown role, redirecting to login');
  return <Navigate to="/mobile/login" replace />;
};

/**
 * PublicRoute - For routes that don't require authentication
 * But redirect logged-in users to appropriate dashboard
 */
export const PublicRoute = ({ children }) => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const token = localStorage.getItem('token');

  // If user is logged in, redirect to appropriate dashboard
  if (user && token) {
    if (user.role === 'member') {
      return <Navigate to="/mobile/dashboard" replace />;
    } else if (['admin', 'super_admin', 'moderator', 'financial_manager'].includes(user.role)) {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  // Not logged in, show public content
  return children;
};

/**
 * RequireAuth - General authentication guard
 * Ensures user is logged in regardless of role
 */
export const RequireAuth = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Check if token is expired (optional, implement if needed)
  try {
    const userData = JSON.parse(user);
    // You can add token expiration check here

    // User is authenticated, allow access
    return children;
  } catch (error) {
    logger.error('Invalid user data in localStorage');
    // Clear invalid data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }
};

/**
 * RoleBasedRedirect - Smart redirect based on user role
 * Used after login to redirect to appropriate dashboard
 */
export const RoleBasedRedirect = () => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  switch (user.role) {
    case 'member':
      return <Navigate to="/mobile/dashboard" replace />;
    case 'admin':
    case 'super_admin':
    case 'moderator':
    case 'financial_manager':
      return <Navigate to="/admin/dashboard" replace />;
    default:
      logger.error('Unknown user role:', { role: user.role });
      return <Navigate to="/login" replace />;
  }
};

/**
 * PermissionRoute - Checks for specific permissions
 * More granular control than role-based routing
 */
export const PermissionRoute = ({ children, permission }) => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!user || !localStorage.getItem('token')) {
    return <Navigate to="/login" replace />;
  }

  // Define permissions for each role
  const rolePermissions = {
    super_admin: ['*'], // All permissions
    admin: [
      'view_dashboard',
      'manage_members',
      'manage_payments',
      'manage_notifications',
      'view_reports'
    ],
    financial_manager: [
      'view_dashboard',
      'manage_payments',
      'manage_subscriptions',
      'view_reports',
      'send_payment_reminders'
    ],
    moderator: [
      'view_dashboard',
      'view_members',
      'approve_payments',
      'send_notifications'
    ],
    member: [
      'view_own_profile',
      'make_payment',
      'view_notifications',
      'view_own_payments'
    ]
  };

  const userPermissions = rolePermissions[user.role] || [];

  // Check if user has required permission
  if (userPermissions.includes('*') || userPermissions.includes(permission)) {
    return children;
  }

  // No permission, show error or redirect
  logger.error(`User lacks permission: ${permission}`);
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px'
      }}>
        <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>⚠️ غير مصرح</h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          ليس لديك صلاحية لعرض هذه الصفحة
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          العودة
        </button>
      </div>
    </div>
  );
};

export default {
  AdminRoute,
  MemberRoute,
  PublicRoute,
  RequireAuth,
  RoleBasedRedirect,
  PermissionRoute
};