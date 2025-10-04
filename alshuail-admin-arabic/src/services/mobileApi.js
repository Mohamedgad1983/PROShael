/**
 * ============================================
 * AL-SHUAIL MOBILE PWA
 * Mobile API Service
 * ============================================
 * Purpose: API calls for mobile member features
 * ============================================
 */

import axios from 'axios';

// API Base URL (production)
const API_BASE_URL = 'https://proshael.onrender.com/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to all requests
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Check if we're already on login page to avoid redirect loop
      if (window.location.pathname.includes('/mobile/login')) {
        return Promise.reject(error);
      }

      // Check if token exists - if not, user needs to login
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/mobile/login';
        return Promise.reject(error);
      }

      // For profile endpoint, don't auto-logout immediately
      // This could be a backend issue, not expired token
      if (error.config?.url?.includes('/member/profile')) {
        console.error('Profile endpoint failed, but keeping user logged in');
        return Promise.reject(error);
      }

      // For other endpoints, if we get 401 with a token, it's likely expired
      console.error('Token appears to be expired, redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('memberData');
      window.location.href = '/mobile/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Member Profile & Balance APIs
 */

// Get member profile
export const getMemberProfile = async () => {
  try {
    const response = await apiClient.get('/member/profile');
    return response.data;
  } catch (error) {
    console.error('Error fetching member profile:', error);
    throw error;
  }
};

// Get member balance
export const getMemberBalance = async () => {
  try {
    const response = await apiClient.get('/member/balance');
    return response.data;
  } catch (error) {
    console.error('Error fetching member balance:', error);
    throw error;
  }
};

/**
 * Payment APIs
 */

// Get member payments
export const getMemberPayments = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `/member/payments${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching member payments:', error);
    throw error;
  }
};

// Submit new payment
export const submitPayment = async (paymentData) => {
  try {
    const response = await apiClient.post('/member/payments', paymentData);
    return response.data;
  } catch (error) {
    console.error('Error submitting payment:', error);
    throw error;
  }
};

// Upload receipt
export const uploadReceipt = async (file, paymentId) => {
  try {
    const formData = new FormData();
    formData.append('receipt', file);
    if (paymentId) {
      formData.append('payment_id', paymentId);
    }

    const response = await apiClient.post('/receipts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
};

/**
 * Notification APIs
 */

// Get member notifications
export const getMemberNotifications = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `/member/notifications${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Mark notification as read
export const markNotificationRead = async (notificationId) => {
  try {
    const response = await apiClient.post(`/member/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Member Search API (for pay-on-behalf)
 */

// Search members
export const searchMembers = async (searchQuery) => {
  try {
    const response = await apiClient.get('/member/search', {
      params: { q: searchQuery }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching members:', error);
    throw error;
  }
};

/**
 * ID Card API
 */

// Get member ID card
export const getMemberIdCard = async () => {
  try {
    const response = await apiClient.get('/member/id-card', {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching ID card:', error);
    throw error;
  }
};

/**
 * Dashboard Data API
 */

// Get all dashboard data in one call
export const getDashboardData = async () => {
  // Fetch each piece of data independently so one failure doesn't break all
  let profile = null;
  let balance = null;
  let payments = [];
  let notifications = [];

  // Try to get profile (might fail due to auth issue)
  try {
    profile = await getMemberProfile();
  } catch (error) {
    console.error('Failed to fetch profile, using localStorage:', error);
    // Fallback to localStorage data
    const userData = localStorage.getItem('user');
    if (userData) {
      profile = { data: JSON.parse(userData) };
    }
  }

  // Try to get balance
  try {
    balance = await getMemberBalance();
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    // Use default balance
    balance = { data: { current_balance: 0, total_paid: 0 } };
  }

  // Try to get recent payments
  try {
    payments = await getMemberPayments({ limit: 5 });
  } catch (error) {
    console.error('Failed to fetch payments:', error);
  }

  // Try to get notifications
  try {
    notifications = await getMemberNotifications({ unread: true, limit: 5 });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
  }

  return {
    profile,
    balance,
    recentPayments: payments,
    notifications
  };
};

export default {
  getMemberProfile,
  getMemberBalance,
  getMemberPayments,
  submitPayment,
  uploadReceipt,
  getMemberNotifications,
  markNotificationRead,
  searchMembers,
  getMemberIdCard,
  getDashboardData
};