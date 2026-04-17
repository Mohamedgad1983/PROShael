// Payment Approval Service
// Wraps the backend endpoints at /api/payments/pending and /api/payments/:id/status
// for the admin "موافقات الدفعات" screen.

import axios from 'axios';

const API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://api.alshailfund.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(
  (config) => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject({
      message: error.response?.data?.message || 'حدث خطأ',
      status: error.response?.status
    });
  }
);

export interface PendingPayment {
  id: string;
  payer_id: string;
  beneficiary_id: string | null;
  amount: number | string;
  category: 'subscription' | 'initiative' | 'diya' | 'for_member' | string;
  status: 'pending' | 'pending_verification' | string;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  payer_name: string | null;
  payer_phone: string | null;
  payer_membership_number: string | null;
  beneficiary_name: string | null;
  // Receipt fields — populated when the member uploaded a file.
  // The backend joins documents_metadata and builds the URL for us.
  receipt_uploaded: boolean | null;
  receipt_filename: string | null;
  receipt_mimetype: string | null;
  receipt_document_id: string | null;
  receipt_file_path: string | null;
  receipt_original_name: string | null;
  receipt_url: string | null;
}

export interface PendingPaymentsStats {
  total_pending: number;
  total_amount: number | string;
  unique_payers: number;
  subscription_count: number;
  initiative_count: number;
  diya_count: number;
  awaiting_action: number;
  awaiting_verification: number;
}

export const paymentApprovalService = {
  /** List pending payments, optionally filtered by category. */
  async getPendingPayments(params: { category?: string; limit?: number; offset?: number } = {}) {
    const query = new URLSearchParams();
    if (params.category) query.append('category', params.category);
    if (params.limit) query.append('limit', String(params.limit));
    if (params.offset) query.append('offset', String(params.offset));
    const qs = query.toString();
    const path = qs ? `/payments/pending?${qs}` : '/payments/pending';
    const res = await apiClient.get<{ success: boolean; data: PendingPayment[]; count: number }>(path);
    return res as unknown as { success: boolean; data: PendingPayment[]; count: number };
  },

  /** Stats card for the queue top. */
  async getPendingStats() {
    const res = await apiClient.get<{ success: boolean; data: PendingPaymentsStats }>(
      '/payments/pending/stats'
    );
    return res as unknown as { success: boolean; data: PendingPaymentsStats };
  },

  /** Approve = set status to 'paid'. Balance trigger fires automatically. */
  async approvePayment(paymentId: string) {
    const res = await apiClient.put(`/payments/${paymentId}/status`, { status: 'paid' });
    return res;
  },

  /** Reject = set status to 'cancelled' with an optional reason. */
  async rejectPayment(paymentId: string, reason?: string) {
    const res = await apiClient.put(`/payments/${paymentId}/status`, {
      status: 'cancelled',
      reason
    });
    return res;
  }
};
