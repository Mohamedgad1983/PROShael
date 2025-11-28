// Admin Management Service - File 06 Integration
import axios from 'axios';

const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://api.alshailfund.com/api';

// Create axios instance with auth token interceptor
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    }

    // Extract error message
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      'حدث خطأ غير متوقع';

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

export interface Subdivision {
  id: string;
  branch_name: string;
  branch_name_en?: string;
  description?: string;
  member_count?: number;
}

export interface DashboardStats {
  total_members: number;
  pending_approvals: number;
  active_members: number;
  total_subdivisions: number;
  monthly_growth?: number;
  registration_rate?: number;
}

export interface AddMemberRequest {
  full_name_ar: string;
  full_name_en?: string;
  phone: string;
  family_branch_id: string;
}

export interface UpdateSubdivisionRequest {
  family_branch_id: string;
}

class AdminService {
  /**
   * Add new member (Admin only)
   */
  async addMember(memberData: AddMemberRequest) {
    return await apiClient.post('/admin/members', memberData);
  }

  /**
   * Update member subdivision
   */
  async updateMemberSubdivision(memberId: string, subdivisionId: string) {
    return await apiClient.put(`/admin/members/${memberId}/subdivision`, {
      family_branch_id: subdivisionId
    });
  }

  /**
   * Get all subdivisions (فخوذ)
   */
  async getSubdivisions(): Promise<{ success: boolean; data: Subdivision[] }> {
    return await apiClient.get('/admin/subdivisions');
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<{ success: boolean; data: DashboardStats }> {
    return await apiClient.get('/admin/dashboard/stats');
  }

  /**
   * Delete member (Admin only)
   */
  async deleteMember(memberId: string) {
    return await apiClient.delete(`/admin/members/${memberId}`);
  }

  /**
   * Get all members with filters
   */
  async getAllMembers(filters: {
    status?: string;
    subdivision_id?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams(filters as any);
    return await apiClient.get(`/members?${params}`);
  }

  /**
   * Search members
   */
  async searchMembers(query: string) {
    return await apiClient.get(`/members/search?q=${encodeURIComponent(query)}`);
  }
}

export const adminService = new AdminService();
export default adminService;
