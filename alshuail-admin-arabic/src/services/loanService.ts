/**
 * Loan Request Service (طلبات السلف)
 *
 * Wraps the backend's three URL trees:
 *   /api/admin/loans   ← fund staff (super_admin, admin, financial_manager)
 *   /api/brouj/loans   ← brouj_partner (server-side filter applied)
 *   /api/loans/me/:id  ← used here only when an admin/super_admin pretends to be a member
 *
 * Routing decision lives in the controllers — this service just calls the
 * appropriate URL based on the current user's role.
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://api.alshailfund.com/api';

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── types ────────────────────────────────────────────────────────────────────

export type LoanStatus =
  | 'draft'
  | 'submitted'
  | 'under_fund_review'
  | 'approved_by_fund'
  | 'forwarded_to_brouj'
  | 'brouj_processing'
  | 'najiz_uploaded'
  | 'fee_collected'
  | 'ready_for_disbursement'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface LoanDocument {
  id: string;
  document_type:
    | 'id_copy'
    | 'salary_certificate'
    | 'financial_statement'
    | 'najiz_acknowledgment'
    | 'fee_receipt';
  file_path?: string;
  file_size?: number;
  file_type?: string;
  original_name?: string;
  uploaded_at?: string;
  uploaded_by?: string;
}

export interface LoanStatusHistoryEntry {
  id: string;
  from_status?: string | null;
  to_status: string;
  note?: string;
  changed_at?: string;
  changed_by_id?: string;
  changed_by_name?: string;
  changed_by_name_ar?: string;
}

export interface LoanRequest {
  id: string;
  sequence_number: string;
  sequence_year: number;
  sequence_in_year: number;
  member_id: string;
  applicant_name: string;
  national_id: string;
  date_of_birth: string;
  employment_type: string;
  monthly_salary: string | number;
  monthly_obligations: string | number;
  loan_amount: string | number;
  admin_fee_rate: string | number;
  admin_fee_amount: string | number;
  admin_fee_collected: boolean;
  status: LoanStatus;
  member_phone?: string;
  member_full_name_ar?: string;
  reviewed_by_fund_id?: string | null;
  reviewed_by_fund_at?: string | null;
  fund_review_note?: string | null;
  forwarded_to_brouj_at?: string | null;
  forwarded_by_id?: string | null;
  processed_by_brouj_id?: string | null;
  najiz_uploaded_at?: string | null;
  fee_collected_at?: string | null;
  disbursed_at?: string | null;
  disbursed_amount?: string | number | null;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  rejected_by_id?: string | null;
  cancelled_at?: string | null;
  cancelled_by_id?: string | null;
  created_at: string;
  updated_at: string;
  documents?: LoanDocument[];
  history?: LoanStatusHistoryEntry[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

// Filter query for the list endpoint.
export interface LoanListFilters {
  status?: LoanStatus | '';
  year?: number;
  q?: string;
  limit?: number;
  offset?: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * The current user's role drives whether we hit `/api/admin/loans` or
 * `/api/brouj/loans`. Both endpoints accept the same query params and the
 * server enforces the brouj filter — so this is just URL selection.
 */
function urlBase(): string {
  let role = '';
  try {
    const userData = localStorage.getItem('user_data') || localStorage.getItem('user');
    if (userData) {
      const u = JSON.parse(userData);
      role = u?.role || u?.user?.role || '';
    }
  } catch {
    // ignore — default to admin path
  }
  return role === 'brouj_partner' ? '/brouj/loans' : '/admin/loans';
}

// ─── api ──────────────────────────────────────────────────────────────────────

export const loanService = {
  /** List loans visible to the current user (filtered server-side for brouj). */
  async list(filters: LoanListFilters = {}): Promise<LoanRequest[]> {
    const params: Record<string, unknown> = {};
    if (filters.status) params.status = filters.status;
    if (filters.year) params.year = filters.year;
    if (filters.q) params.q = filters.q;
    if (filters.limit !== undefined) params.limit = filters.limit;
    if (filters.offset !== undefined) params.offset = filters.offset;

    const res = await client.get<ApiEnvelope<LoanRequest[]>>(urlBase(), { params });
    return res.data.data ?? [];
  },

  async getOne(id: string): Promise<LoanRequest | null> {
    const res = await client.get<ApiEnvelope<LoanRequest>>(`${urlBase()}/${id}`);
    return res.data.data ?? null;
  },

  // ─── fund-side actions ───────────────────────────────────────────────────────
  async startReview(id: string): Promise<LoanRequest> {
    const res = await client.post<ApiEnvelope<LoanRequest>>(`/admin/loans/${id}/start-review`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || res.data.error || 'فشل تنفيذ الإجراء');
    }
    return res.data.data;
  },

  async approve(id: string, note?: string): Promise<LoanRequest> {
    const res = await client.post<ApiEnvelope<LoanRequest>>(`/admin/loans/${id}/approve`, { note });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || res.data.error || 'فشل تنفيذ الإجراء');
    }
    return res.data.data;
  },

  async reject(id: string, reason: string): Promise<LoanRequest> {
    const res = await client.post<ApiEnvelope<LoanRequest>>(`/admin/loans/${id}/reject`, { reason });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || res.data.error || 'فشل تنفيذ الإجراء');
    }
    return res.data.data;
  },

  async forwardToBrouj(id: string): Promise<LoanRequest> {
    const res = await client.post<ApiEnvelope<LoanRequest>>(`/admin/loans/${id}/forward`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || res.data.error || 'فشل تنفيذ الإجراء');
    }
    return res.data.data;
  },

  async recordDisbursement(id: string, amount: number, note?: string): Promise<LoanRequest> {
    const res = await client.post<ApiEnvelope<LoanRequest>>(`/admin/loans/${id}/disburse`, { amount, note });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || res.data.error || 'فشل تنفيذ الإجراء');
    }
    return res.data.data;
  },

  // ─── Brouj-side actions ──────────────────────────────────────────────────────
  async broujUploadNajiz(id: string, file: File): Promise<LoanRequest> {
    const form = new FormData();
    form.append('najiz_acknowledgment', file);
    const res = await client.post<ApiEnvelope<LoanRequest>>(
      `/brouj/loans/${id}/upload-najiz`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || res.data.error || 'فشل رفع إقرار ناجز');
    }
    return res.data.data;
  },

  async broujConfirmFee(id: string, file: File): Promise<LoanRequest> {
    const form = new FormData();
    form.append('fee_receipt', file);
    const res = await client.post<ApiEnvelope<LoanRequest>>(
      `/brouj/loans/${id}/confirm-fee`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || res.data.error || 'فشل تأكيد الرسوم');
    }
    return res.data.data;
  },
};

// ─── ui helpers ───────────────────────────────────────────────────────────────

export const STATUS_LABELS_AR: Record<LoanStatus, string> = {
  draft: 'مسودة',
  submitted: 'تم الاستلام',
  under_fund_review: 'قيد المراجعة',
  approved_by_fund: 'تمت الموافقة الأولية',
  forwarded_to_brouj: 'محال إلى بروز الريادة',
  brouj_processing: 'قيد المعالجة',
  najiz_uploaded: 'تم رفع إقرار ناجز',
  fee_collected: 'تم تحصيل الرسوم',
  ready_for_disbursement: 'جاهز للصرف',
  completed: 'تم الصرف',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
};

export const STATUS_COLORS: Record<LoanStatus, string> = {
  draft: '#9CA3AF',
  submitted: '#3B82F6',
  under_fund_review: '#3B82F6',
  approved_by_fund: '#F59E0B',
  forwarded_to_brouj: '#F59E0B',
  brouj_processing: '#F59E0B',
  najiz_uploaded: '#F59E0B',
  fee_collected: '#F59E0B',
  ready_for_disbursement: '#F59E0B',
  completed: '#10B981',
  rejected: '#EF4444',
  cancelled: '#EF4444',
};

export const DOCUMENT_LABELS_AR: Record<string, string> = {
  id_copy: 'صورة الهوية',
  salary_certificate: 'مشهد الراتب',
  financial_statement: 'كشف الحساب / سمة',
  najiz_acknowledgment: 'إقرار ناجز',
  fee_receipt: 'إيصال الرسوم',
};

export function isFundRole(role?: string): boolean {
  return ['super_admin', 'admin', 'financial_manager'].includes(role || '');
}

export function isBroujRole(role?: string): boolean {
  return role === 'brouj_partner';
}
