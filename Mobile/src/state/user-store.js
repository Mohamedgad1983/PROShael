/**
 * User Store - Manages user state and authentication
 * @module user-store
 */

import stateManager from './state-manager.js';
import apiClient from '../api/api-client.js';
import tokenManager from '../auth/token-manager.js';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  profile: null,
  preferences: {
    language: 'ar',
    notifications: {
      events: true,
      payments: true,
      crisis: true,
      announcements: true
    },
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '07:00'
    }
  }
};

// Actions
const actions = {
  /**
   * Initialize user from stored token
   * @param {Object} state - Current state
   */
  async initialize(state) {
    state.isLoading = true;

    try {
      // Check if token exists
      const token = tokenManager.getToken();
      const userData = tokenManager.getUserData();

      if (token && tokenManager.isTokenValid(token)) {
        state.user = userData;
        state.isAuthenticated = true;

        // Fetch fresh user data from API
        await this.fetchProfile(state);
      }
    } catch (error) {
      state.error = 'فشل في تحميل بيانات المستخدم';
    } finally {
      state.isLoading = false;
    }
  },

  /**
   * Login user
   * @param {Object} state - Current state
   * @param {string} phone - Phone number
   * @param {string} otp - OTP code
   */
  async login(state, phone, otp) {
    state.isLoading = true;
    state.error = null;

    try {
      // This would call the auth API
      // For now, we use the mock OTP from Phase 1
      const result = await apiClient.post('/api/auth/verify-otp', {
        phone,
        otp
      }, { requiresAuth: false });

      if (result.success) {
        state.user = result.data.user;
        state.isAuthenticated = true;

        // Save token
        tokenManager.saveToken(
          result.data.token,
          result.data.user,
          result.data.refreshToken
        );

        return { success: true };
      } else {
        state.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      state.error = 'فشل تسجيل الدخول';
      return { success: false, error: 'فشل تسجيل الدخول' };
    } finally {
      state.isLoading = false;
    }
  },

  /**
   * Logout user
   * @param {Object} state - Current state
   */
  logout(state) {
    state.user = null;
    state.isAuthenticated = false;
    state.profile = null;
    state.error = null;

    // Clear token
    tokenManager.clearAuth();

    // Redirect to login
    window.location.href = '/login.html';
  },

  /**
   * Fetch user profile
   * @param {Object} state - Current state
   */
  async fetchProfile(state) {
    try {
      const result = await apiClient.get('/api/members/me');

      if (result.success) {
        state.profile = result.data;
        return { success: true, data: result.data };
      } else {
        state.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      state.error = 'فشل في تحميل الملف الشخصي';
      return { success: false, error: 'فشل في تحميل الملف الشخصي' };
    }
  },

  /**
   * Update user profile
   * @param {Object} state - Current state
   * @param {Object} updates - Profile updates
   */
  async updateProfile(state, updates) {
    state.isLoading = true;

    try {
      const result = await apiClient.put('/api/members/me', updates);

      if (result.success) {
        state.profile = { ...state.profile, ...result.data };
        return { success: true };
      } else {
        state.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      state.error = 'فشل في تحديث الملف الشخصي';
      return { success: false, error: 'فشل في تحديث الملف الشخصي' };
    } finally {
      state.isLoading = false;
    }
  },

  /**
   * Update user preferences
   * @param {Object} state - Current state
   * @param {Object} preferences - New preferences
   */
  updatePreferences(state, preferences) {
    state.preferences = { ...state.preferences, ...preferences };
  },

  /**
   * Set error
   * @param {Object} state - Current state
   * @param {string} error - Error message
   */
  setError(state, error) {
    state.error = error;
  },

  /**
   * Clear error
   * @param {Object} state - Current state
   */
  clearError(state) {
    state.error = null;
  }
};

// Computed properties
const computed = {
  /**
   * Get user display name
   * @param {Object} state - Current state
   * @returns {string} Display name
   */
  displayName(state) {
    if (!state.user) return '';
    return state.user.name || state.user.full_name || state.user.phone;
  },

  /**
   * Check if user has specific role
   * @param {Object} state - Current state
   * @returns {Function} Role checker function
   */
  hasRole(state) {
    return (role) => {
      if (!state.user) return false;
      return state.user.role === role;
    };
  },

  /**
   * Check if notifications are enabled
   * @param {Object} state - Current state
   * @returns {boolean} Whether notifications enabled
   */
  notificationsEnabled(state) {
    const prefs = state.preferences.notifications;
    return Object.values(prefs).some(enabled => enabled);
  }
};

// Create store
const userStore = stateManager.createStore('user', initialState, {
  persist: true,
  actions,
  computed
});

export default userStore;
