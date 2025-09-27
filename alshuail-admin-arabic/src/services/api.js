class APIService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
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
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async verifyToken() {
    return this.request('/auth/verify', {
      method: 'POST',
    });
  }

  // Dashboard
  async getDashboardStats() {
    return this.request('/api/dashboard/stats');
  }

  // Members
  async getMembers() {
    return this.request('/members');
  }

  async getMember(id) {
    return this.request(`/members/${id}`);
  }

  async createMember(memberData) {
    return this.request('/members', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  async updateMember(id, memberData) {
    return this.request(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(memberData),
    });
  }

  async deleteMember(id) {
    return this.request(`/members/${id}`, {
      method: 'DELETE',
    });
  }

  // Payments
  async getPayments(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/payments?${params}`);
  }

  async createPayment(paymentData) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async updatePaymentStatus(id, status) {
    return this.request(`/payments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getPaymentStats() {
    return this.request('/payments/stats');
  }

  // Subscriptions
  async getSubscriptions() {
    return this.request('/subscriptions');
  }

  async createSubscription(subscriptionData) {
    return this.request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscriptionData),
    });
  }

  // Occasions API
  async getOccasions() {
    return this.request('/occasions');
  }

  async getOccasion(id) {
    return this.request(`/occasions/${id}`);
  }

  async createOccasion(occasionData) {
    return this.request('/occasions', {
      method: 'POST',
      body: JSON.stringify(occasionData),
    });
  }

  async updateOccasion(id, occasionData) {
    return this.request(`/occasions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(occasionData),
    });
  }

  async deleteOccasion(id) {
    return this.request(`/occasions/${id}`, {
      method: 'DELETE',
    });
  }

  async updateRSVP(id, rsvpData) {
    return this.request(`/occasions/${id}/rsvp`, {
      method: 'PUT',
      body: JSON.stringify(rsvpData),
    });
  }

  async getOccasionStats() {
    return this.request('/occasions/stats');
  }

  // Initiatives API
  async getInitiatives() {
    return this.request('/initiatives');
  }

  async getInitiative(id) {
    return this.request(`/initiatives/${id}`);
  }

  async createInitiative(initiativeData) {
    return this.request('/initiatives', {
      method: 'POST',
      body: JSON.stringify(initiativeData),
    });
  }

  async updateInitiative(id, initiativeData) {
    return this.request(`/initiatives/${id}`, {
      method: 'PUT',
      body: JSON.stringify(initiativeData),
    });
  }

  async addContribution(id, contributionData) {
    return this.request(`/initiatives/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify(contributionData),
    });
  }

  async updateContributionStatus(initiativeId, contributionId, status) {
    return this.request(`/initiatives/${initiativeId}/contributions/${contributionId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getInitiativeStats() {
    return this.request('/initiatives/stats');
  }

  // Diyas API
  async getDiyas() {
    return this.request('/diyas');
  }

  async getDiya(id) {
    return this.request(`/diyas/${id}`);
  }

  async createDiya(diyaData) {
    return this.request('/diyas', {
      method: 'POST',
      body: JSON.stringify(diyaData),
    });
  }

  async updateDiya(id, diyaData) {
    return this.request(`/diyas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(diyaData),
    });
  }

  async deleteDiya(id) {
    return this.request(`/diyas/${id}`, {
      method: 'DELETE',
    });
  }

  async updateDiyaStatus(id, status) {
    return this.request(`/diyas/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getMemberDiyas(memberId) {
    return this.request(`/diyas/member/${memberId}`);
  }

  async getDiyaStats() {
    return this.request('/diyas/stats');
  }

  // Notifications API
  async getNotifications() {
    return this.request('/notifications');
  }

  async getNotification(id) {
    return this.request(`/notifications/${id}`);
  }

  async createNotification(notificationData) {
    return this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  }

  async deleteNotification(id) {
    return this.request(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  async markAsRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async bulkMarkAsRead(notificationIds) {
    return this.request('/notifications/bulk-read', {
      method: 'PUT',
      body: JSON.stringify({ notificationIds }),
    });
  }

  async getMemberNotifications(memberId) {
    return this.request(`/notifications/member/${memberId}`);
  }

  async getNotificationStats() {
    return this.request('/notifications/stats');
  }

  // Health Check
  async healthCheck() {
    return this.request('/health');
  }
}

export const apiService = new APIService();