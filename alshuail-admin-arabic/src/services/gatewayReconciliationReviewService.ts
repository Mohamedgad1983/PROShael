import { apiService } from './api';

export type GatewayReconciliationReviewReason =
  | 'provider_not_found_bounded'
  | 'gateway_evidence_mismatch'
  | 'gateway_financial_exception'
  | 'legacy_manual_review';

export type GatewayReconciliationReviewAction = 'requeue' | 'resolve';

export interface GatewayReconciliationReviewItem {
  payment_id: string;
  payment_reference?: string | null;
  member_name?: string | null;
  member_phone_masked?: string | null;
  category: string;
  payment_status: string;
  amount: number;
  currency: string;
  gateway_provider: string;
  gateway_payment_id_masked?: string | null;
  is_financing: boolean;
  last_provider_status?: string | null;
  last_provider_http_status?: number | null;
  last_result: 'review_required';
  review_reason: GatewayReconciliationReviewReason;
  consecutive_not_found: number;
  consecutive_failures: number;
  check_count: number;
  first_not_found_at?: string | null;
  last_checked_at?: string | null;
  evidence_hash_masked?: string | null;
  reconciliation_started_at?: string | null;
  updated_at?: string | null;
}

export interface GatewayReconciliationReviewPage {
  items: GatewayReconciliationReviewItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  status: 'review_required';
}

export interface GatewayReconciliationReviewActionResult {
  payment_id: string;
  action: GatewayReconciliationReviewAction;
  state: 'checked' | 'terminal';
  next_check_at?: string | null;
  updated_at?: string | null;
  review_action_id: string;
  reviewed_at?: string | null;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

type UnknownRecord = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_REASONS = new Set<GatewayReconciliationReviewReason>([
  'provider_not_found_bounded',
  'gateway_evidence_mismatch',
  'gateway_financial_exception',
  'legacy_manual_review',
]);

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeText = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ');

const optionalString = (value: unknown): string | null => {
  const normalized = normalizeText(value);
  return normalized || null;
};

const requiredString = (value: unknown, fieldName: string): string => {
  const normalized = optionalString(value);
  if (!normalized) throw new Error(`بيانات مراجعة المصالحة غير مكتملة: ${fieldName}`);
  return normalized;
};

const nonNegativeInteger = (value: unknown, fieldName: string): number => {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0) {
    throw new Error(`بيانات مراجعة المصالحة غير صالحة: ${fieldName}`);
  }
  return numeric;
};

const optionalHttpStatus = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 100 && numeric <= 599 ? numeric : null;
};

const maskProviderIdentity = (value: unknown): string | null => {
  const normalized = optionalString(value);
  if (!normalized) return null;
  const compact = normalized.replace(/^•+/, '').replace(/\s+/g, '');
  const suffix = compact.slice(-12);
  return suffix ? `••••${suffix}` : null;
};

const maskPhone = (value: unknown): string | null => {
  const normalized = optionalString(value);
  if (!normalized) return null;
  const compact = normalized.replace(/•/g, '').replace(/\s+/g, '');
  if (normalized.includes('•')) return normalized.slice(0, 20);
  if (compact.length <= 5) return 'رقم محجوب';
  return `${compact.slice(0, 3)}••••${compact.slice(-2)}`;
};

const maskEvidenceHash = (value: unknown): string | null => {
  const normalized = optionalString(value);
  if (!normalized) return null;
  const compact = normalized.replace('…', '').replace(/\s+/g, '');
  if (compact.length <= 16) return normalized.slice(0, 24);
  return `${compact.slice(0, 8)}…${compact.slice(-8)}`;
};

export const isMeaningfulArabicReconciliationReviewReason = (value: unknown) => {
  const normalized = normalizeText(value);
  const arabicLetters = normalized.match(/[ء-ي]/g) || [];
  return normalized.length >= 12 && normalized.length <= 500 && arabicLetters.length >= 8;
};

const normalizeReviewItem = (value: unknown): GatewayReconciliationReviewItem => {
  if (!isRecord(value)) throw new Error('تعذر قراءة سجل مراجعة المصالحة');

  const paymentId = requiredString(value.payment_id, 'رقم الدفعة');
  if (!UUID_PATTERN.test(paymentId)) throw new Error('سجل مراجعة المصالحة يحتوي رقم دفعة غير صالح');
  const reviewReason = requiredString(value.review_reason, 'سبب المراجعة') as GatewayReconciliationReviewReason;
  if (!VALID_REASONS.has(reviewReason) || value.last_result !== 'review_required') {
    throw new Error('سجل مراجعة المصالحة لا ينتظر المراجعة');
  }
  const amount = Number(value.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('سجل مراجعة المصالحة يحتوي مبلغاً غير صالح');
  }

  // Whitelist only the display contract. Raw gateway identities, responses,
  // metadata and unexpected server properties never enter React state.
  return {
    payment_id: paymentId,
    payment_reference: optionalString(value.payment_reference),
    member_name: optionalString(value.member_name),
    member_phone_masked: maskPhone(value.member_phone_masked),
    category: requiredString(value.category, 'نوع الدفعة'),
    payment_status: requiredString(value.payment_status, 'حالة الدفعة'),
    amount,
    currency: requiredString(value.currency, 'العملة').toUpperCase(),
    gateway_provider: requiredString(value.gateway_provider, 'مزود الدفع').toLowerCase(),
    gateway_payment_id_masked: maskProviderIdentity(value.gateway_payment_id_masked),
    is_financing: value.is_financing === true,
    last_provider_status: optionalString(value.last_provider_status),
    last_provider_http_status: optionalHttpStatus(value.last_provider_http_status),
    last_result: 'review_required',
    review_reason: reviewReason,
    consecutive_not_found: nonNegativeInteger(value.consecutive_not_found, 'عدد عدم العثور'),
    consecutive_failures: nonNegativeInteger(value.consecutive_failures, 'عدد الإخفاقات'),
    check_count: nonNegativeInteger(value.check_count, 'عدد المحاولات'),
    first_not_found_at: optionalString(value.first_not_found_at),
    last_checked_at: optionalString(value.last_checked_at),
    evidence_hash_masked: maskEvidenceHash(value.evidence_hash_masked),
    reconciliation_started_at: optionalString(value.reconciliation_started_at),
    updated_at: optionalString(value.updated_at),
  };
};

const boundedInteger = (value: unknown, fallback: number, minimum: number, maximum: number) => {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) return fallback;
  return Math.min(Math.max(numeric, minimum), maximum);
};

export const gatewayReconciliationReviewService = {
  async listReviewRequired(page = 1, limit = 25): Promise<GatewayReconciliationReviewPage> {
    const safePage = boundedInteger(page, 1, 1, 10000);
    const safeLimit = boundedInteger(limit, 25, 1, 100);
    apiService.clearCache();
    const response = await apiService.request(
      `/api/payments/gateway/reconciliation-reviews?status=review_required&page=${safePage}&limit=${safeLimit}`
    ) as ApiEnvelope<UnknownRecord>;

    if (response?.success !== true || !isRecord(response.data) || !Array.isArray(response.data.items)) {
      throw new Error(response?.error || response?.message || 'تعذر تحميل قائمة مراجعة المصالحة');
    }
    const items = response.data.items.map(normalizeReviewItem);
    const total = nonNegativeInteger(response.data.total ?? items.length, 'إجمالي السجلات');
    const totalPages = nonNegativeInteger(response.data.total_pages ?? (total ? 1 : 0), 'عدد الصفحات');
    return {
      items,
      total,
      page: boundedInteger(response.data.page, safePage, 1, 10000),
      limit: boundedInteger(response.data.limit, safeLimit, 1, 100),
      total_pages: totalPages,
      status: 'review_required',
    };
  },

  async act(
    paymentId: string,
    action: GatewayReconciliationReviewAction,
    reason: string
  ): Promise<GatewayReconciliationReviewActionResult> {
    const normalizedPaymentId = normalizeText(paymentId);
    const normalizedReason = normalizeText(reason);
    if (!UUID_PATTERN.test(normalizedPaymentId)) throw new Error('رقم الدفعة غير صالح');
    if (!['requeue', 'resolve'].includes(action)) throw new Error('إجراء المراجعة غير صالح');
    if (!isMeaningfulArabicReconciliationReviewReason(normalizedReason)) {
      throw new Error('سبب المراجعة يجب أن يكون عربياً وواضحاً ومن 12 إلى 500 حرف');
    }

    const response = await apiService.request(
      `/api/payments/gateway/reconciliation-reviews/${encodeURIComponent(normalizedPaymentId)}/action`,
      {
        method: 'POST',
        body: JSON.stringify({
          payment_id: normalizedPaymentId,
          action,
          reason: normalizedReason,
        }),
      }
    ) as ApiEnvelope<UnknownRecord>;

    if (response?.success !== true || !isRecord(response.data)) {
      throw new Error(response?.error || response?.message || 'تعذر حفظ قرار مراجعة المصالحة');
    }
    const returnedPaymentId = requiredString(response.data.payment_id, 'رقم الدفعة');
    const returnedAction = requiredString(response.data.action, 'الإجراء') as GatewayReconciliationReviewAction;
    const returnedState = requiredString(response.data.state, 'الحالة') as 'checked' | 'terminal';
    const expectedState = action === 'requeue' ? 'checked' : 'terminal';
    if (
      returnedPaymentId.toLowerCase() !== normalizedPaymentId.toLowerCase()
      || returnedAction !== action
      || returnedState !== expectedState
    ) {
      throw new Error('استجابة قرار المراجعة لا تطابق السجل المحدد');
    }

    apiService.clearCache();
    return {
      payment_id: returnedPaymentId,
      action: returnedAction,
      state: returnedState,
      next_check_at: optionalString(response.data.next_check_at),
      updated_at: optionalString(response.data.updated_at),
      review_action_id: requiredString(response.data.review_action_id, 'سجل التدقيق'),
      reviewed_at: optionalString(response.data.reviewed_at),
    };
  },
};

export default gatewayReconciliationReviewService;
