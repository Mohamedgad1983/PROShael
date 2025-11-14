/**
 * Authentication Helper Utilities
 * Handles token refresh and session management
 */
import { logger } from './logger';


const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Check if token is expired
 */
export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    // Parse JWT token
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expirationTime;
  } catch (error) {
    return true;
  }
};

/**
 * Get valid token or redirect to login
 */
export const getValidToken = () => {
  const token = localStorage.getItem('token');

  if (!token || isTokenExpired(token)) {
    // Clear invalid token
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Redirect to appropriate login page
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/mobile/')) {
      window.location.href = '/mobile/login';
    } else {
      window.location.href = '/login';
    }
    return null;
  }

  return token;
};

/**
 * Refresh token if needed
 */
export const refreshTokenIfNeeded = async () => {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');

  if (!token || !refreshToken) {
    return false;
  }

  // Check if token will expire in next 5 minutes
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000;
    const timeUntilExpiry = expirationTime - Date.now();

    if (timeUntilExpiry < 5 * 60 * 1000) { // Less than 5 minutes
      // Attempt to refresh token
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        return true;
      }
    }

    return true; // Token still valid
  } catch (error) {
    logger.error('Token refresh error:', { error });
    return false;
  }
};

/**
 * Make authenticated API request with auto-retry
 */
export const authenticatedFetch = async (url, options = {}) => {
  // First attempt
  let token = getValidToken();
  if (!token) return null;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  // If unauthorized, try refreshing token once
  if (response.status === 401) {
    const refreshed = await refreshTokenIfNeeded();
    if (refreshed) {
      // Retry with new token
      token = localStorage.getItem('token');
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
        },
      });
    } else {
      // Redirect to appropriate login page
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/mobile/')) {
        window.location.href = '/mobile/login';
      } else {
        window.location.href = '/login';
      }
      return null;
    }
  }

  return response;
};

export default {
  isTokenExpired,
  getValidToken,
  refreshTokenIfNeeded,
  authenticatedFetch
};