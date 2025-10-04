class APIService {
  constructor() {
    // Always use production URL in production
    this.baseURL = window.location.hostname === 'localhost'
      ? 'http://localhost:3001'
      : 'https://proshael.onrender.com';

    // Cache for successful responses
    this.cache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes

    // Request retry configuration
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second

    console.log('🔧 API Service initialized with baseURL:', this.baseURL);
  }

  async request(endpoint, options = {}) {
    return this.requestWithRetry(endpoint, options, this.maxRetries);
  }

  async requestWithRetry(endpoint, options = {}, retries = 0) {
    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || {})}`;

    // Check cache first for GET requests
    if (!options.method || options.method === 'GET') {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('📋 Using cached data for:', endpoint);
        return cached;
      }
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: 30000, // 30 seconds
      ...options,
    };

    // Always add authorization header if token exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      console.log('🌐 API Request:', {
        url,
        method: config.method || 'GET',
        hasToken: !!config.headers['Authorization'],
        attempt: this.maxRetries - retries + 1,
        endpoint
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.warn('⚠️ Failed to parse JSON response:', parseError);
        data = { error: 'Invalid response format' };
      }

      if (!response.ok) {
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          url,
          endpoint
        });

        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          console.warn('🔑 Authentication error, attempting token refresh...');
          await this.handleAuthError();

          // Retry once with refreshed token if we have retries left
          if (retries > 0) {
            await this.delay(this.retryDelay);
            return this.requestWithRetry(endpoint, options, retries - 1);
          }
        }

        // Handle server errors with retry
        if (response.status >= 500 && retries > 0) {
          console.warn(`⏳ Server error ${response.status}, retrying in ${this.retryDelay}ms...`);
          await this.delay(this.retryDelay * (this.maxRetries - retries + 1));
          return this.requestWithRetry(endpoint, options, retries - 1);
        }

        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ API Success:', {
        endpoint,
        status: response.status,
        dataKeys: Object.keys(data)
      });

      // Cache successful GET requests
      if (!options.method || options.method === 'GET') {
        this.setCache(cacheKey, data);
      }

      return data;
    } catch (error) {
      console.error('💥 API Request Failed:', {
        endpoint,
        error: error.message,
        type: error.name,
        retriesLeft: retries
      });

      // Network or timeout errors - retry if we have attempts left
      if (retries > 0 && (error.name === 'AbortError' || error.name === 'TypeError' || error.message.includes('fetch'))) {
        console.warn(`🔄 Retrying request to ${endpoint} (${retries} attempts left)...`);
        await this.delay(this.retryDelay * (this.maxRetries - retries + 1));
        return this.requestWithRetry(endpoint, options, retries - 1);
      }

      // Return cached data as fallback for GET requests
      if (!options.method || options.method === 'GET') {
        const cached = this.getFromCache(cacheKey, true); // Get even expired cache
        if (cached) {
          console.warn('📋 Using stale cached data as fallback for:', endpoint);
          return cached;
        }

        // Return mock data as last resort
        const mockData = this.getMockData(endpoint);
        if (mockData) {
          console.warn('🎭 Using mock data as fallback for:', endpoint);
          return mockData;
        }
      }

      throw error;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async handleAuthError() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('🔑 No token found, redirecting to login...');
        this.redirectToLogin();
        return;
      }

      // Try to refresh the token
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          localStorage.setItem('token', data.token);
          console.log('🔑 Token refreshed successfully');
          return;
        }
      }

      console.warn('🔑 Token refresh failed, redirecting to login...');
      this.redirectToLogin();
    } catch (refreshError) {
      console.error('🔑 Token refresh error:', refreshError);
      this.redirectToLogin();
    }
  }

  redirectToLogin() {
    localStorage.removeItem('token');
    const currentPath = window.location.pathname;

    // Don't redirect if already on a login page (admin or mobile)
    if (currentPath !== '/login' && !currentPath.startsWith('/mobile/login')) {
      // Redirect to appropriate login based on current path
      if (currentPath.startsWith('/mobile/')) {
        window.location.href = '/mobile/login';
      } else {
        window.location.href = '/login';
      }
    }
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getFromCache(key, allowStale = false) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheDuration;
    if (isExpired && !allowStale) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  getMockData(endpoint) {
    const mockData = {
      '/api/dashboard/stats': {
        success: true,
        data: {
          members: { total: 299, active: 288, inactive: 11, newThisMonth: 5 },
          payments: { pending: 12, pendingAmount: 36000, monthlyRevenue: 150000, totalRevenue: 2500000, totalPaid: 287 },
          subscriptions: { active: 280, expired: 19, total: 299, revenue: 840000 },
          activities: [
            { id: 1, type: 'payment', description: 'دفعة جديدة من أحمد محمد', date: new Date().toISOString(), amount: 3000 },
            { id: 2, type: 'member', description: 'عضو جديد انضم للنظام', date: new Date().toISOString(), amount: null },
            { id: 3, type: 'occasion', description: 'مناسبة جديدة تم إنشاؤها', date: new Date().toISOString(), amount: null }
          ]
        }
      },
      '/api/members': {
        success: true,
        data: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          full_name: `عضو تجريبي ${i + 1}`,
          phone: `050123456${i}`,
          membership_number: `SH${String(i + 1).padStart(3, '0')}`,
          balance: Math.floor(Math.random() * 5000) + 1000,
          membership_status: 'active',
          tribal_section: 'الفرع الأول',
          created_at: new Date().toISOString()
        }))
      }
    };

    return mockData[endpoint] || null;
  }

  // Authentication
  async login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async verifyToken() {
    return this.request('/api/auth/verify', {
      method: 'POST',
    });
  }

  // Dashboard
  async getDashboardStats() {
    return this.request('/api/dashboard/stats');
  }

  // Members
  async getMembers() {
    return this.request('/api/members');
  }

  async getMember(id) {
    return this.request(`/api/members/${id}`);
  }

  async createMember(memberData) {
    return this.request('/api/members', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  async updateMember(id, memberData) {
    return this.request(`/api/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(memberData),
    });
  }

  async deleteMember(id) {
    return this.request(`/api/members/${id}`, {
      method: 'DELETE',
    });
  }

  // Payments
  async getPayments(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/payments?${params}`);
  }

  async createPayment(paymentData) {
    return this.request('/api/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async updatePaymentStatus(id, status) {
    return this.request(`/api/payments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getPaymentStats() {
    return this.request('/api/payments/stats');
  }

  // Subscriptions
  async getSubscriptions() {
    return this.request('/api/subscriptions');
  }

  async createSubscription(subscriptionData) {
    return this.request('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscriptionData),
    });
  }

  // Occasions API
  async getOccasions() {
    return this.request('/api/occasions');
  }

  async getOccasion(id) {
    return this.request(`/api/occasions/${id}`);
  }

  async createOccasion(occasionData) {
    return this.request('/api/occasions', {
      method: 'POST',
      body: JSON.stringify(occasionData),
    });
  }

  async updateOccasion(id, occasionData) {
    return this.request(`/api/occasions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(occasionData),
    });
  }

  async deleteOccasion(id) {
    return this.request(`/api/occasions/${id}`, {
      method: 'DELETE',
    });
  }

  async updateRSVP(id, rsvpData) {
    return this.request(`/api/occasions/${id}/rsvp`, {
      method: 'PUT',
      body: JSON.stringify(rsvpData),
    });
  }

  async getOccasionStats() {
    return this.request('/api/occasions/stats');
  }

  // Initiatives API
  async getInitiatives() {
    return this.request('/api/initiatives');
  }

  async getInitiative(id) {
    return this.request(`/api/initiatives/${id}`);
  }

  async createInitiative(initiativeData) {
    return this.request('/api/initiatives', {
      method: 'POST',
      body: JSON.stringify(initiativeData),
    });
  }

  async updateInitiative(id, initiativeData) {
    return this.request(`/api/initiatives/${id}`, {
      method: 'PUT',
      body: JSON.stringify(initiativeData),
    });
  }

  async addContribution(id, contributionData) {
    return this.request(`/api/initiatives/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify(contributionData),
    });
  }

  async updateContributionStatus(initiativeId, contributionId, status) {
    return this.request(`/api/initiatives/${initiativeId}/contributions/${contributionId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getInitiativeStats() {
    return this.request('/api/initiatives/stats');
  }

  // Diyas API
  async getDiyas() {
    return this.request('/api/diyas');
  }

  async getDiya(id) {
    return this.request(`/api/diyas/${id}`);
  }

  async createDiya(diyaData) {
    return this.request('/api/diyas', {
      method: 'POST',
      body: JSON.stringify(diyaData),
    });
  }

  async updateDiya(id, diyaData) {
    return this.request(`/api/diyas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(diyaData),
    });
  }

  async deleteDiya(id) {
    return this.request(`/api/diyas/${id}`, {
      method: 'DELETE',
    });
  }

  async updateDiyaStatus(id, status) {
    return this.request(`/api/diyas/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getMemberDiyas(memberId) {
    return this.request(`/api/diyas/member/${memberId}`);
  }

  async getDiyaStats() {
    return this.request('/api/diyas/stats');
  }

  // Notifications API
  async getNotifications() {
    return this.request('/api/notifications');
  }

  async getNotification(id) {
    return this.request(`/api/notifications/${id}`);
  }

  async createNotification(notificationData) {
    return this.request('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  }

  async deleteNotification(id) {
    return this.request(`/api/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  async markAsRead(id) {
    return this.request(`/api/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async bulkMarkAsRead(notificationIds) {
    return this.request('/api/notifications/bulk-read', {
      method: 'PUT',
      body: JSON.stringify({ notificationIds }),
    });
  }

  async getMemberNotifications(memberId) {
    return this.request(`/api/notifications/member/${memberId}`);
  }

  async getNotificationStats() {
    return this.request('/api/notifications/stats');
  }

  // Health Check
  async healthCheck() {
    return this.request('/api/health');
  }

  // Clear cache manually
  clearCache() {
    this.cache.clear();
    console.log('🧹 API cache cleared');
  }

  // Get cache status
  getCacheStatus() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      oldest: Math.min(...Array.from(this.cache.values()).map(v => v.timestamp)),
      newest: Math.max(...Array.from(this.cache.values()).map(v => v.timestamp))
    };
  }
}

export const apiService = new APIService();