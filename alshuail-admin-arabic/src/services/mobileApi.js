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
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
  try {
    const [profile, balance, payments, notifications] = await Promise.all([
      getMemberProfile(),
      getMemberBalance(),
      getMemberPayments({ limit: 5 }),
      getMemberNotifications({ unread: true, limit: 5 })
    ]);

    return {
      profile,
      balance,
      recentPayments: payments,
      notifications
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Return partial data if some calls succeed
    return {
      profile: null,
      balance: null,
      recentPayments: [],
      notifications: []
    };
  }
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