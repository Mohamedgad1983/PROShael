import { apiService } from './api.js';

import { logger } from '../utils/logger';

/**
 * Member Management Service
 * Handles all member-related API operations including Excel import,
 * member registration, and member management functionality.
 */

class MemberService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  }

  /**
   * Get authentication token from localStorage
   */
  getAuthToken() {
    return localStorage.getItem('token');
  }

  /**
   * Make API request with proper headers
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      headers: {
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = this.getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('API Error Response:', { errorData });

        // Return error data instead of throwing for better handling
        return {
          success: false,
          error: errorData.error || errorData.message || `HTTP error! status: ${response.status}`,
          status: response.status
        };
      }

      const data = await response.json();

      // Ensure we have a success field
      if (!('success' in data)) {
        data.success = true;
      }

      return data;
    } catch (error) {
      logger.error('API Error:', { error });
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  }

  // ==================== ADMIN FUNCTIONS ====================

  /**
   * Import members from Excel file
   * @param {File} file - Excel file containing member data
   * @returns {Promise} Import results with success/failure counts
   */
  async importMembersFromExcel(file) {
    const formData = new FormData();
    formData.append('excel', file);

    return this.makeRequest('/api/members/import', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header for FormData - browser will set it with boundary
      headers: {}
    });
  }

  /**
   * Get members list with optional filters
   * @param {Object} filters - Filter criteria
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Paginated members list
   */
  async getMembersList(filters = {}, page = 1, limit = 25) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });

    return this.makeRequest(`/api/members?${params}`);
  }

  /**
   * Get member statistics
   * @returns {Promise} Member statistics object
   */
  async getMemberStatistics() {
    return this.makeRequest('/api/members/statistics');
  }

  /**
   * Send registration reminders to members
   * @param {Array} memberIds - Array of member IDs (optional, if empty sends to all incomplete profiles)
   * @returns {Promise} SMS sending results
   */
  async sendRegistrationReminders(memberIds = []) {
    return this.makeRequest('/api/members/send-reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ memberIds })
    });
  }

  /**
   * Get member details by ID
   * @param {string} memberId - Member ID
   * @returns {Promise} Member details
   */
  async getMemberById(memberId) {
    return this.makeRequest(`/api/members/${memberId}`);
  }

  /**
   * Add a new member
   * @param {Object} memberData - New member data
   * @returns {Promise} Created member
   */
  async addMember(memberData) {
    return this.makeRequest('/api/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData)
    });
  }

  /**
   * Update member information
   * @param {string} memberId - Member ID
   * @param {Object} memberData - Updated member data
   * @returns {Promise} Updated member
   */
  async updateMember(memberId, memberData) {
    return this.makeRequest(`/api/members/${memberId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData)
    });
  }

  /**
   * Delete a member
   * @param {string} memberId - Member ID
   * @returns {Promise} Deletion result
   */
  async deleteMember(memberId) {
    return this.makeRequest(`/api/members/${memberId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Export members to Excel
   * @param {Object} filters - Export filters
   * @returns {Promise} Excel file blob
   */
  async exportMembersToExcel(filters = {}) {
    const params = new URLSearchParams(filters);

    const response = await fetch(`${this.baseURL}/api/members/export?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  /**
   * Get import history
   * @returns {Promise} Import history records
   */
  async getImportHistory() {
    return this.makeRequest('/api/members/import-history');
  }

  // ==================== PUBLIC REGISTRATION FUNCTIONS ====================

  /**
   * Verify registration token
   * @param {string} token - Registration token from URL
   * @returns {Promise} Token verification result with member data
   */
  async verifyRegistrationToken(token) {
    return this.makeRequest(`/api/members/verify-token/${token}`, {
      method: 'GET'
    });
  }

  /**
   * Complete member profile registration
   * @param {string} token - Registration token
   * @param {Object} profileData - Complete profile data
   * @returns {Promise} Registration completion result
   */
  async completeProfile(token, profileData) {
    const formData = new FormData();

    // Add text fields
    Object.keys(profileData).forEach(key => {
      if (key !== 'profile_photo' && profileData[key] !== null && profileData[key] !== undefined) {
        formData.append(key, profileData[key]);
      }
    });

    // Add photo file if provided
    if (profileData.profile_photo && profileData.profile_photo instanceof File) {
      formData.append('profile_photo', profileData.profile_photo);
    }

    return this.makeRequest(`/api/members/complete-profile/${token}`, {
      method: 'POST',
      body: formData,
      headers: {}
    });
  }

  /**
   * Upload profile photo
   * @param {string} token - Registration token
   * @param {File} photoFile - Photo file
   * @returns {Promise} Upload result
   */
  async uploadProfilePhoto(token, photoFile) {
    const formData = new FormData();
    formData.append('profile_photo', photoFile);

    return this.makeRequest(`/api/members/upload-photo/${token}`, {
      method: 'POST',
      body: formData,
      headers: {}
    });
  }

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Search members by name or phone
   * @param {string} query - Search query
   * @returns {Promise} Search results
   */
  async searchMembers(query) {
    const params = new URLSearchParams({ q: query });
    return this.makeRequest(`/api/members/search?${params}`);
  }

  /**
   * Get member by phone number
   * @param {string} phoneNumber - Phone number
   * @returns {Promise} Member data
   */
  async getMemberByPhone(phoneNumber) {
    return this.makeRequest(`/api/members/by-phone/${phoneNumber}`);
  }

  /**
   * Check if membership number is available
   * @param {string} membershipNumber - Membership number to check
   * @returns {Promise} Availability status
   */
  async checkMembershipNumberAvailability(membershipNumber) {
    return this.makeRequest(`/api/members/check-membership/${membershipNumber}`);
  }

  /**
   * Generate new membership number
   * @returns {Promise} New membership number
   */
  async generateMembershipNumber() {
    return this.makeRequest('/api/members/generate-membership-number');
  }

  /**
   * Send welcome SMS to new member
   * @param {string} memberId - Member ID
   * @returns {Promise} SMS sending result
   */
  async sendWelcomeSMS(memberId) {
    return this.makeRequest(`/api/members/${memberId}/send-welcome`, {
      method: 'POST'
    });
  }

  /**
   * Get member registration statistics
   * @param {Object} dateRange - Date range for statistics
   * @returns {Promise} Registration statistics
   */
  async getRegistrationStatistics(dateRange = {}) {
    const params = new URLSearchParams(dateRange);
    return this.makeRequest(`/api/members/registration-stats?${params}`);
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk update member status
   * @param {Array} memberIds - Array of member IDs
   * @param {string} status - New status
   * @returns {Promise} Bulk update result
   */
  async bulkUpdateStatus(memberIds, status) {
    return this.makeRequest('/api/members/bulk-update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ memberIds, status })
    });
  }

  /**
   * Send bulk SMS to selected members
   * @param {Array} memberIds - Array of member IDs
   * @param {string} message - SMS message
   * @returns {Promise} Bulk SMS result
   */
  async sendBulkSMS(memberIds, message) {
    return this.makeRequest('/api/members/bulk-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ memberIds, message })
    });
  }
}

// Create and export singleton instance
export const memberService = new MemberService();
export default memberService;