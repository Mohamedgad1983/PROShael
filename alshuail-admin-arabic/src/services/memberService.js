<<<<<<< HEAD
import { apiService } from './api.js';

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
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
=======
// Member Service with enhanced functionality
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class MemberService {
  constructor() {
    this.baseURL = `${API_URL}/api/members`;
  }

  async makeRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
      throw error;
    }
  }

<<<<<<< HEAD
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
  async getMembersList(filters = {}, page = 1, limit = 10) {
    const params = new URLSearchParams({
=======
  // Get members list with filters and pagination
  async getMembersList(filters = {}, page = 1, limit = 10) {
    const queryParams = new URLSearchParams({
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });

<<<<<<< HEAD
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
=======
    return await this.makeRequest(`${this.baseURL}?${queryParams}`);
  }

  // Get member by ID
  async getMemberById(id) {
    return await this.makeRequest(`${this.baseURL}/${id}`);
  }

  // Create new member
  async createMember(memberData) {
    return await this.makeRequest(this.baseURL, {
      method: 'POST',
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
      body: JSON.stringify(memberData)
    });
  }

<<<<<<< HEAD
  /**
   * Delete a member
   * @param {string} memberId - Member ID
   * @returns {Promise} Deletion result
   */
  async deleteMember(memberId) {
    return this.makeRequest(`/api/members/${memberId}`, {
=======
  // Update member
  async updateMember(id, memberData) {
    return await this.makeRequest(`${this.baseURL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(memberData)
    });
  }

  // Delete member
  async deleteMember(id) {
    return await this.makeRequest(`${this.baseURL}/${id}`, {
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
      method: 'DELETE'
    });
  }

<<<<<<< HEAD
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
=======
  // Get member statistics
  async getMemberStatistics() {
    return await this.makeRequest(`${this.baseURL}/statistics`);
  }

  // Generate registration token
  async generateRegistrationToken(memberData) {
    return await this.makeRequest(`${API_URL}/api/registration/generate-token`, {
      method: 'POST',
      body: JSON.stringify(memberData)
    });
  }

  // Validate registration token
  async validateRegistrationToken(token) {
    return await this.makeRequest(`${API_URL}/api/registration/validate-token/${token}`);
  }

  // Complete member registration
  async completeRegistration(token, registrationData) {
    return await this.makeRequest(`${API_URL}/api/registration/complete/${token}`, {
      method: 'POST',
      body: JSON.stringify(registrationData)
    });
  }

  // Import members from Excel/CSV
  async importMembers(file, mappings) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mappings', JSON.stringify(mappings));

    const token = localStorage.getItem('token');
    
    return await fetch(`${this.baseURL}/import`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  }

  // Export members to various formats
  async exportMembers(filters = {}, format = 'xlsx', fields = []) {
    const queryParams = new URLSearchParams({
      format,
      fields: fields.join(','),
      ...filters
    });

    const token = localStorage.getItem('token');
    
    const response = await fetch(`${this.baseURL}/export?${queryParams}`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
      }
    });

    if (!response.ok) {
<<<<<<< HEAD
      throw new Error('Export failed');
=======
      throw new Error(`Export failed: ${response.status}`);
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
    }

    return response.blob();
  }

<<<<<<< HEAD
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
=======
  // Search members
  async searchMembers(query, filters = {}) {
    const searchParams = {
      search: query,
      ...filters
    };

    return await this.getMembersList(searchParams);
  }

  // Bulk operations
  async bulkUpdateMembers(memberIds, updateData) {
    return await this.makeRequest(`${this.baseURL}/bulk-update`, {
      method: 'POST',
      body: JSON.stringify({
        memberIds,
        updateData
      })
    });
  }

  async bulkDeleteMembers(memberIds) {
    return await this.makeRequest(`${this.baseURL}/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ memberIds })
    });
  }

  // Phone number validation (Saudi format)
  validateSaudiPhone(phone) {
    const saudiPhoneRegex = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
    return saudiPhoneRegex.test(phone.replace(/[\s-]/g, ''));
  }

  // National ID validation (Saudi format)
  validateSaudiNationalId(nationalId) {
    if (!/^[12]\d{9}$/.test(nationalId)) {
      return false;
    }

    const digits = nationalId.split('').map(Number);
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      if (i % 2 === 0) {
        const doubled = digits[i] * 2;
        sum += doubled > 9 ? doubled - 9 : doubled;
      } else {
        sum += digits[i];
      }
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === digits[9];
  }

  // Format member data for display
  formatMemberForDisplay(member) {
    return {
      ...member,
      formattedPhone: this.formatPhone(member.phone),
      formattedWhatsapp: this.formatPhone(member.whatsapp_number),
      statusBadge: this.getStatusBadge(member.status),
      profileCompletionPercentage: this.calculateProfileCompletion(member)
    };
  }

  formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('966')) {
      const local = cleaned.substring(3);
      return `+966 ${local.substring(0, 2)} ${local.substring(2, 5)} ${local.substring(5)}`;
    }
    return phone;
  }

  getStatusBadge(status) {
    const statusMap = {
      'active': { text: 'نشط', class: 'bg-green-100 text-green-800' },
      'inactive': { text: 'غير نشط', class: 'bg-gray-100 text-gray-800' },
      'pending': { text: 'في الانتظار', class: 'bg-yellow-100 text-yellow-800' },
      'suspended': { text: 'موقوف', class: 'bg-red-100 text-red-800' }
    };
    return statusMap[status] || statusMap['inactive'];
  }

  calculateProfileCompletion(member) {
    const requiredFields = [
      'full_name', 'national_id', 'phone', 'email', 'birth_date',
      'address', 'city', 'occupation', 'emergency_contact'
    ];
    
    const completedFields = requiredFields.filter(field => 
      member[field] && member[field].toString().trim() !== ''
    ).length;
    
    return Math.round((completedFields / requiredFields.length) * 100);
  }

  // Get member by membership number
  async getMemberByMembershipNumber(membershipNumber) {
    return await this.makeRequest(`${this.baseURL}/membership/${membershipNumber}`);
  }

  // Generate membership card
  async generateMembershipCard(memberId) {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${this.baseURL}/${memberId}/membership-card`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to generate membership card: ${response.status}`);
    }

    return response.blob();
  }
}

// Export singleton instance
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
export const memberService = new MemberService();
export default memberService;