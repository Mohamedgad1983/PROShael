class APIService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (localStorage.getItem('token')) {
      config.headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
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
}

export const apiService = new APIService();