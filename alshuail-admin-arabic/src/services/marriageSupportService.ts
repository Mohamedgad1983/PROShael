/**
 * Marriage Support Service (طلبات دعم المقبلين على الزواج)
 *
 * Wraps the backend's two URL trees:
 *   /api/admin/marriage-support  ← committee chair + chairman + viewers
 *   /api/marriage-support/me/:id ← used here only when an admin pretends to be a member
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

export type MarriageStatus =
  | 'submitted'
  | 'under_committee_review'
  | 'data_entered'
  | 'awaiting_signatures'
  | 'signatures_complete'
  | 'approved_by_chairman'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type SignerRole = 'beneficiary' | 'witness_1' | 'witness_2' | 'committee_chair';

export interface MarriageSignature {
  id: string;
  signer_role: SignerRole;
  signer_member_id: string;
  signer_name?: string;
  signed_at: string;
  ip_address?: string;
  signature_method?: string;
}

export interface MarriageStatusHistoryEntry {
  id: string;
  from_status?: string | null;
  to_status: string;
  note?: string;
  changed_at?: string;
  changed_by_id?: string;
  actor_role?: string;
}

export interface MarriageRequest {
  id: string;
  sequence_number: string;
  sequence_year: number;
  sequence_in_year: number;
  member_id: string;
  applicant_name: string;
  national_id: string;
  date_of_birth?: string | null;
  spouse_name_ar: string;
  spouse_national_id?: string | null;
  marriage_date: string;
  marriage_contract_url?: string | null;
  linked_initiative_id?: string | null;
  contributions_sum?: string | number | null;
  previous_ananiyat_count_auto?: number | null;
  previous_ananiyat_count_override?: number | null;
  additional_support_balance?: string | number | null;
  special_ananiya_value?: string | number | null;
  snapshot_competition_discount_rate?: string | number | null;
  snapshot_marriage_support_minimum?: string | number | null;
  snapshot_ananiyat_per_unit?: string | number | null;
  snapshot_additional_support_multiplier?: string | number | null;
  initial_total?: string | number | null;
  after_discount?: string | number | null;
  competitive_balance?: string | number | null;
  final_amount?: string | number | null;
  calculated_at?: string | null;
  witness_1_id?: string | null;
  witness_1_name?: string | null;
  witness_2_id?: string | null;
  witness_2_name?: string | null;
  pdf_url?: string | null;
  pdf_generated_at?: string | null;
  pdf_data_hash?: string | null;
  status: MarriageStatus;
  committee_chair_id?: string | null;
  reviewed_at?: string | null;
  committee_note?: string | null;
  chairman_id?: string | null;
  chairman_approved_at?: string | null;
  chairman_note?: string | null;
  disbursed_at?: string | null;
  disbursed_amount?: string | number | null;
  disbursed_by_id?: string | null;
  disbursement_expense_id?: string | null;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  rejected_by_id?: string | null;
  cancelled_at?: string | null;
  cancelled_by_id?: string | null;
  created_at: string;
  updated_at: string;
  signatures?: MarriageSignature[];
  history?: MarriageStatusHistoryEntry[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export interface MarriageListFilters {
  status?: MarriageStatus | '';
  year?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── api ──────────────────────────────────────────────────────────────────────

export const marriageSupportService = {
  async list(filters: MarriageListFilters = {}): Promise<MarriageRequest[]> {
    const params: Record<string, unknown> = {};
    if (filters.status) params.status = filters.status;
    if (filters.year) params.year = filters.year;
    if (filters.search) params.search = filters.search;
    if (filters.limit !== undefined) params.limit = filters.limit;
    if (filters.offset !== undefined) params.offset = filters.offset;

    const res = await client.get<ApiEnvelope<MarriageRequest[]>>('/admin/marriage-support', { params });
    return res.data.data ?? [];
  },

  async getOne(id: string): Promise<MarriageRequest | null> {
    const res = await client.get<ApiEnvelope<MarriageRequest>>(`/admin/marriage-support/${id}`);
    return res.data.data ?? null;
  },

  async startReview(id: string): Promise<MarriageRequest> {
    const res = await client.post<ApiEnvelope<MarriageRequest>>(`/admin/marriage-support/${id}/start-review`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || res.data.error || 'فشل تنفيذ الإجراء');
    }
    return res.data.data;
  },

  async linkInitiative(id: string, initiativeId: string): Promise<MarriageRequest> {
    const res = await client.post<ApiEnvelope<MarriageRequest>>(
      `/admin/marriage-support/${id}/link-initiative`,
      { initiative_id: initiativeId }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || res.data.error || 'فشل ربط المبادرة');
    }
    return res.data.data;
  },

  async enterData(id: string, payload: {
    contributions_sum: number;
    previous_ananiyat_count_override?: number | null;
    additional_support_balance?: number;
    special_ananiya_value?: number;
    witness_1_id?: string | null;
    witness_1_name?: string | null;
    witness_2_id?: string | null;
    witness_2_name?: string | null;
  }): Promise<MarriageRequest> {
    const res = await client.post<ApiEnvelope<MarriageRequest>>(
      `/admin/marriage-support/${id}/enter-data`,
      payload
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || res.data.error || 'فشل إدخال البيانات');
    }
    return res.data.data;
  },

  async generatePdf(id: string): Promise<MarriageRequest> {
    const res = await client.post<ApiEnvelope<MarriageRequest>>(`/admin/marriage-support/${id}/generate-pdf`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || res.data.error || 'فشل إعداد إقرار الدين');
    }
    return res.data.data;
  },

  async signCommittee(id: string): Promise<{ ok: boolean; allDone?: boolean; nextSigner?: string | null }> {
    const res = await client.post<ApiEnvelope<{ ok: boolean; allDone?: boolean; nextSigner?: string | null }>>(
      `/admin/marriage-support/${id}/sign-committee`
    );
    if (!res.data.success) {
      throw new Error(res.data.message || res.data.error || 'فشل تسجيل التوقيع');
    }
    return res.data.data ?? { ok: true };
  },

  async signWitness(id: string, role: 'witness_1' | 'witness_2'): Promise<{ ok: boolean; allDone?: boolean; nextSigner?: string | null }> {
    const res = await client.post<ApiEnvelope<{ ok: boolean; allDone?: boolean; nextSigner?: string | null }>>(
      `/admin/marriage-support/${id}/sign-witness`,
      { signer_role: role }
    );
    if (!res.data.success) {
      throw new Error(res.data.message || res.data.error || 'فشل تسجيل التوقيع');
    }
    return res.data.data ?? { ok: true };
  },

  async reject(id: string, reason: string): Promise<MarriageRequest> {
    const res = await client.post<ApiEnvelope<MarriageRequest>>(
      `/admin/marriage-support/${id}/reject`,
      { reason }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || res.data.error || 'فشل الرفض');
    }
    return res.data.data;
  },

  async chairmanApprove(id: string, note?: string): Promise<MarriageRequest> {
    const res = await client.post<ApiEnvelope<MarriageRequest>>(
      `/admin/marriage-support/${id}/chairman-approve`,
      { note }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || res.data.error || 'فشل الاعتماد');
    }
    return res.data.data;
  },

  async recordDisbursement(id: string, amount: number, note?: string): Promise<MarriageRequest> {
    const res = await client.post<ApiEnvelope<MarriageRequest>>(
      `/admin/marriage-support/${id}/disburse`,
      { amount, note }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || res.data.error || 'فشل تسجيل الصرف');
    }
    return res.data.data;
  },
};

// ─── ui helpers ───────────────────────────────────────────────────────────────

export const STATUS_LABELS_AR: Record<MarriageStatus, string> = {
  submitted: 'تم الاستلام',
  under_committee_review: 'قيد مراجعة اللجنة',
  data_entered: 'تم إدخال البيانات',
  awaiting_signatures: 'في انتظار التوقيعات',
  signatures_complete: 'اكتملت التوقيعات',
  approved_by_chairman: 'اعتماد رئيس الصندوق',
  completed: 'تم الصرف',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
};

export const STATUS_COLORS: Record<MarriageStatus, string> = {
  submitted: '#3B82F6',
  under_committee_review: '#3B82F6',
  data_entered: '#F59E0B',
  awaiting_signatures: '#F59E0B',
  signatures_complete: '#F59E0B',
  approved_by_chairman: '#F59E0B',
  completed: '#10B981',
  rejected: '#EF4444',
  cancelled: '#9CA3AF',
};

export const SIGNER_ROLE_LABELS_AR: Record<SignerRole, string> = {
  beneficiary: 'المستفيد',
  witness_1: 'الشاهد الأول',
  witness_2: 'الشاهد الثاني',
  committee_chair: 'رئيس اللجنة',
};

export function isCommitteeRole(role?: string): boolean {
  return role === 'marriage_committee_chair' || role === 'super_admin';
}

export function isChairmanRole(role?: string): boolean {
  return role === 'super_admin';
}

export function fmtAmount(n?: string | number | null): string {
  if (n === null || n === undefined || n === '') return '—';
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('ar-SA', { maximumFractionDigits: 0 }) + ' ر.س';
}
