/**
 * Unified API Client for Al-Shuail Mobile PWA
 *
 * Features:
 * - Automatic JWT token injection
 * - Automatic token refresh on 401
 * - Request/response interceptors
 * - Offline queue support
 * - Retry logic for failed requests
 * - Bilingual error messages (Arabic/English)
 *
 * @module api-client
 */

import tokenManager from '../auth/token-manager.js';
import csrfManager from '../security/csrf-manager.js';
import logger from '../utils/logger.js';

class APIClient {
  constructor() {
    this.config = {
      baseURL: import.meta.env.VITE_API_URL || 'https://api.alshailfund.com',
      timeout: 30000, // 30 seconds
      maxRetries: 3,
      retryDelay: 1000, // 1 second
    };

    // Offline queue for requests made while offline
    this.offlineQueue = [];
    this.isOnline = navigator.onLine;

    // Listen for online/offline events
    this.initializeNetworkListeners();

    // Error messages in Arabic and English
    this.errors = {
      network: {
        ar: 'خطأ في الاتصال بالإنترنت. يرجى التحقق من اتصالك.',
        en: 'Network error. Please check your internet connection.'
      },
      timeout: {
        ar: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
        en: 'Request timeout. Please try again.'
      },
      unauthorized: {
        ar: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.',
        en: 'Session expired. Please login again.'
      },
      forbidden: {
        ar: 'ليس لديك صلاحية للوصول إلى هذا المورد.',
        en: 'You do not have permission to access this resource.'
      },
      notFound: {
        ar: 'المورد المطلوب غير موجود.',
        en: 'Resource not found.'
      },
      serverError: {
        ar: 'خطأ في الخادم. يرجى المحاولة لاحقاً.',
        en: 'Server error. Please try again later.'
      },
      unknown: {
        ar: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
        en: 'An unexpected error occurred. Please try again.'
      }
    };
  }

  /**
   * Initialize network status listeners
   * @private
   */
  initializeNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Make HTTP request with automatic token injection and error handling
   * @param {string} endpoint - API endpoint (e.g., '/api/members/me')
   * @param {Object} options - Request options
   * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE)
   * @param {Object} options.body - Request body (will be JSON stringified)
   * @param {Object} options.headers - Additional headers
   * @param {boolean} options.requiresAuth - Whether request requires authentication (default: true)
   * @param {boolean} options.queueIfOffline - Whether to queue request if offline (default: false)
   * @param {number} options.retries - Number of retries (default: 3)
   * @param {string} options.lang - Language for error messages (default: 'ar')
   * @returns {Promise<Object>} Response data
   */
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers = {},
      requiresAuth = true,
      queueIfOffline = false,
      retries = this.config.maxRetries,
      lang = 'ar'
    } = options;

    // If offline and queue enabled, add to queue
    if (!this.isOnline && queueIfOffline) {
      return this.addToOfflineQueue(endpoint, options);
    }

    // Build request URL
    const url = `${this.config.baseURL}${endpoint}`;

    // Build request headers
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    // Add JWT token if authentication required
    if (requiresAuth) {
      const token = tokenManager.getToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // Add CSRF token for state-changing requests
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const csrfToken = await csrfManager.getCSRFToken();
        if (csrfToken) {
          requestHeaders['X-CSRF-Token'] = csrfToken;
        }
      } catch (error) {
        logger.warn('Failed to get CSRF token', { error: error.message });
      }
    }

    // Build request options
    const requestOptions = {
      credentials: 'include', // Include cookies for CSRF
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(this.config.timeout)
    };

    // Add body if provided
    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    // Execute request with retry logic
    return this.executeWithRetry(url, requestOptions, retries, lang);
  }

  /**
   * Execute request with automatic retry on failure
   * @private
   * @param {string} url - Request URL
   * @param {Object} requestOptions - Fetch options
   * @param {number} retries - Remaining retries
   * @param {string} lang - Language for error messages
   * @returns {Promise<Object>} Response data
   */
  async executeWithRetry(url, requestOptions, retries, lang) {
    try {
      const response = await fetch(url, requestOptions);

      // Handle HTTP errors
      if (!response.ok) {
        return this.handleErrorResponse(response, url, requestOptions, retries, lang);
      }

      // Parse JSON response
      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      // Handle network errors
      if (error.name === 'AbortError') {
        // Timeout error
        if (retries > 0) {
          await this.delay(this.config.retryDelay);
          return this.executeWithRetry(url, requestOptions, retries - 1, lang);
        }
        return { success: false, error: this.errors.timeout[lang] };
      }

      // Network error
      if (retries > 0) {
        await this.delay(this.config.retryDelay);
        return this.executeWithRetry(url, requestOptions, retries - 1, lang);
      }

      return { success: false, error: this.errors.network[lang] };
    }
  }

  /**
   * Handle HTTP error responses
   * @private
   * @param {Response} response - Fetch response
   * @param {string} url - Request URL
   * @param {Object} requestOptions - Fetch options
   * @param {number} retries - Remaining retries
   * @param {string} lang - Language for error messages
   * @returns {Promise<Object>} Error response
   */
  async handleErrorResponse(response, url, requestOptions, retries, lang) {
    const status = response.status;

    // 401 Unauthorized - try to refresh token
    if (status === 401) {
      const refreshSuccess = await this.attemptTokenRefresh();

      if (refreshSuccess) {
        // Retry request with new token
        const newToken = tokenManager.getToken();
        requestOptions.headers['Authorization'] = `Bearer ${newToken}`;
        return this.executeWithRetry(url, requestOptions, retries - 1, lang);
      }

      // Token refresh failed, redirect to login
      tokenManager.clearAuth();
      window.location.href = '/login.html';
      return { success: false, error: this.errors.unauthorized[lang] };
    }

    // 403 Forbidden
    if (status === 403) {
      return { success: false, error: this.errors.forbidden[lang] };
    }

    // 404 Not Found
    if (status === 404) {
      return { success: false, error: this.errors.notFound[lang] };
    }

    // 500+ Server Error - retry with backoff
    if (status >= 500 && retries > 0) {
      await this.delay(this.config.retryDelay * (this.config.maxRetries - retries + 1));
      return this.executeWithRetry(url, requestOptions, retries - 1, lang);
    }

    // Try to parse error message from response
    try {
      const errorData = await response.json();
      return { success: false, error: errorData.message || this.errors.serverError[lang] };
    } catch {
      return { success: false, error: this.errors.serverError[lang] };
    }
  }

  /**
   * Attempt to refresh JWT token
   * @private
   * @returns {Promise<boolean>} Whether refresh was successful
   */
  async attemptTokenRefresh() {
    try {
      const refreshResult = await tokenManager.refreshToken();
      return refreshResult.success;
    } catch {
      return false;
    }
  }

  /**
   * Add request to offline queue
   * @private
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Queued response
   */
  addToOfflineQueue(endpoint, options) {
    return new Promise((resolve, reject) => {
      this.offlineQueue.push({
        endpoint,
        options,
        resolve,
        reject,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Process offline queue when connection restored
   * @private
   */
  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    logger.info('Processing offline queue', { queueLength: this.offlineQueue.length });

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of queue) {
      try {
        const result = await this.request(item.endpoint, item.options);
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }
  }

  /**
   * Delay utility for retry backoff
   * @private
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET request helper
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request helper
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request helper
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request helper
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Upload file with multipart/form-data
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with file
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async upload(endpoint, formData, options = {}) {
    const { lang = 'ar', requiresAuth = true } = options;

    const url = `${this.config.baseURL}${endpoint}`;

    // Build request headers (no Content-Type for FormData)
    const requestHeaders = {};

    // Add JWT token if authentication required
    if (requiresAuth) {
      const token = tokenManager.getToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // Add CSRF token for upload requests
    try {
      const csrfToken = await csrfManager.getCSRFToken();
      if (csrfToken) {
        requestHeaders['X-CSRF-Token'] = csrfToken;
      }
    } catch (error) {
      console.warn('Failed to get CSRF token:', error);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: formData,
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      return { success: false, error: this.errors.network[lang] };
    }
  }

  /**
   * Check API health
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    return this.get('/api/health', { requiresAuth: false, retries: 1 });
  }

  /**
   * Get current network status
   * @returns {boolean} Whether online
   */
  isConnected() {
    return this.isOnline;
  }

  /**
   * Get offline queue length
   * @returns {number} Number of queued requests
   */
  getQueueLength() {
    return this.offlineQueue.length;
  }
}

// Create singleton instance
const apiClient = new APIClient();

export default apiClient;
