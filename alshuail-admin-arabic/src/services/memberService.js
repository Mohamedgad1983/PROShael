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
      throw error;
    }
  }

  // Get members list with filters and pagination
  async getMembersList(filters = {}, page = 1, limit = 10) {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });

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
      body: JSON.stringify(memberData)
    });
  }

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
      method: 'DELETE'
    });
  }

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
      }
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    return response.blob();
  }

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
export const memberService = new MemberService();
export default memberService;