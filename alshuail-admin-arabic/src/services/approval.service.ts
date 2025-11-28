// Approval Workflow Service - File 06 Integration
import axios from 'axios';

const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://api.alshailfund.com/api';

// Create axios instance with auth token
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth token interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject({
      message: error.response?.data?.message || 'حدث خطأ',
      status: error.response?.status
    });
  }
);

export interface PendingMember {
  id: string;
  member_id: string;
  full_name_ar: string;
  full_name_en?: string;
  phone: string;
  national_id?: string;
  family_branches?: {
    branch_name: string;
  };
  created_at: string;
  registration_status: string;
}

export interface ApprovalStats {
  pending_count: number;
  approved_today: number;
  rejected_today: number;
  total_pending_time_avg: number;
}

class ApprovalService {
  /**
   * Get all pending approvals
   */
  async getPendingApprovals(): Promise<{ success: boolean; data: PendingMember[]; count: number }> {
    return await apiClient.get('/approvals/pending');
  }

  /**
   * Get member details for approval review
   */
  async getMemberForApproval(memberId: string) {
    return await apiClient.get(`/approvals/${memberId}`);
  }

  /**
   * Approve member
   */
  async approveMember(memberId: string, notes: string = '') {
    return await apiClient.post(`/approvals/${memberId}/approve`, { notes });
  }

  /**
   * Reject member
   */
  async rejectMember(memberId: string, reason: string) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('يجب إدخال سبب الرفض');
    }
    return await apiClient.post(`/approvals/${memberId}/reject`, { reason });
  }

  /**
   * Get approval statistics
   */
  async getApprovalStats(): Promise<{ success: boolean; data: ApprovalStats }> {
    return await apiClient.get('/approvals/stats');
  }

  /**
   * Bulk approve members
   */
  async bulkApproveMem(memberIds: string[], notes: string = '') {
    const promises = memberIds.map(id => this.approveMember(id, notes));
    return await Promise.all(promises);
  }

  /**
   * Bulk reject members
   */
  async bulkRejectMembers(memberIds: string[], reason: string) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('يجب إدخال سبب الرفض');
    }
    const promises = memberIds.map(id => this.rejectMember(id, reason));
    return await Promise.all(promises);
  }
}

export const approvalService = new ApprovalService();
export default approvalService;
