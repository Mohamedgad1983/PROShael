import { apiService } from './api';

export type GatewayFinancialExceptionKind =
  | 'partial_capture'
  | 'partial_refund'
  | 'invalid_void_evidence';

export type GatewayFinancialExceptionReviewStatus = 'open' | 'resolved' | 'dismissed';

export interface GatewayFinancialExceptionSourceEvidence {
  type?: string | null;
  company?: string | null;
  number?: string | null;
  dpan?: string | null;
  reference_number?: string | null;
  message?: string | null;
  response_code?: string | null;
}

export interface GatewayFinancialExceptionEvidence {
  id?: string | null;
  status?: string | null;
  amount?: string | number | null;
  captured?: string | number | null;
  refunded?: string | number | null;
  captured_at?: string | null;
  refunded_at?: string | null;
  voided_at?: string | null;
  updated_at?: string | null;
  source?: GatewayFinancialExceptionSourceEvidence | null;
}

export interface GatewayFinancialException {
  id: string;
  payment_id: string;
  reference_number?: string | null;
  member_id?: string | null;
  member_name?: string | null;
  member_phone?: string | null;
  gateway_provider: string;
  gateway_payment_id: string;
  provider_status: string;
  exception_kind: GatewayFinancialExceptionKind;
  expected_minor: number;
  actual_minor: number | null;
  currency: string;
  evidence: GatewayFinancialExceptionEvidence;
  occurrence_count: number;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  review_status: GatewayFinancialExceptionReviewStatus;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
}

export interface GatewayFinancialExceptionList {
  items: GatewayFinancialException[];
  total: number;
}

export interface ReviewGatewayFinancialExceptionPayload {
  review_status: Exclude<GatewayFinancialExceptionReviewStatus, 'open'>;
  review_notes: string;
}

export interface GatewayFinancialExceptionReviewResult {
  success: true;
  data: {
    item: GatewayFinancialException;
  };
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const optionalString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const requiredString = (value: unknown, fieldName: string): string => {
  const normalized = optionalString(value);
  if (!normalized) throw new Error(`بيانات الاستثناء المالي غير مكتملة: ${fieldName}`);
  return normalized;
};

const optionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const positiveInteger = (value: unknown, fallback = 1): number => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback;
};

const normalizeText = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ');

export const isMeaningfulArabicReviewNotes = (value: unknown) => {
  const normalized = normalizeText(value);
  const arabicCharacters = normalized.match(/[\u0600-\u06FF]/g) || [];
  return normalized.length >= 10 && normalized.length <= 500 && arabicCharacters.length >= 8;
};

const maskSensitiveNumber = (value: unknown): string | null => {
  const normalized = optionalString(value);
  if (!normalized) return null;
  const lastFour = normalized.replace(/[^A-Za-z0-9]/g, '').slice(-4);
  return lastFour ? `•••• ${lastFour}` : 'رقم محجوب';
};

const sanitizeSourceEvidence = (value: unknown): GatewayFinancialExceptionSourceEvidence | null => {
  if (!isRecord(value)) return null;

  // Deliberately whitelist display-safe fields. In particular, source.token
  // and every unrecognised provider field are discarded at the service edge.
  return {
    type: optionalString(value.type),
    company: optionalString(value.company),
    number: maskSensitiveNumber(value.number),
    dpan: maskSensitiveNumber(value.dpan),
    reference_number: optionalString(value.reference_number),
    message: optionalString(value.message),
    response_code: optionalString(value.response_code),
  };
};

const sanitizeEvidence = (value: unknown): GatewayFinancialExceptionEvidence => {
  if (!isRecord(value)) return {};

  // Never retain or traverse raw provider_response. Only this documented,
  // server-sanitised evidence shape is allowed into React state.
  return {
    id: optionalString(value.id),
    status: optionalString(value.status),
    amount: optionalNumber(value.amount),
    captured: optionalNumber(value.captured),
    refunded: optionalNumber(value.refunded),
    captured_at: optionalString(value.captured_at),
    refunded_at: optionalString(value.refunded_at),
    voided_at: optionalString(value.voided_at),
    updated_at: optionalString(value.updated_at),
    source: sanitizeSourceEvidence(value.source),
  };
};

const validKinds = new Set<GatewayFinancialExceptionKind>([
  'partial_capture',
  'partial_refund',
  'invalid_void_evidence',
]);

const validReviewStatuses = new Set<GatewayFinancialExceptionReviewStatus>([
  'open',
  'resolved',
  'dismissed',
]);

const normalizeException = (value: unknown): GatewayFinancialException => {
  if (!isRecord(value)) throw new Error('تعذر قراءة سجل الاستثناء المالي');

  const kind = requiredString(value.exception_kind, 'نوع الاستثناء') as GatewayFinancialExceptionKind;
  const reviewStatus = requiredString(value.review_status, 'حالة المراجعة') as GatewayFinancialExceptionReviewStatus;
  if (!validKinds.has(kind) || !validReviewStatuses.has(reviewStatus)) {
    throw new Error('بيانات الاستثناء المالي تحتوي حالة غير معروفة');
  }

  const expectedMinor = optionalNumber(value.expected_minor);
  if (expectedMinor === null || expectedMinor <= 0) {
    throw new Error('بيانات الاستثناء المالي لا تحتوي المبلغ المتوقع');
  }

  return {
    id: requiredString(value.id, 'رقم الاستثناء'),
    payment_id: requiredString(value.payment_id, 'رقم الدفعة'),
    reference_number: optionalString(value.reference_number),
    member_id: optionalString(value.member_id),
    member_name: optionalString(value.member_name),
    member_phone: optionalString(value.member_phone),
    gateway_provider: requiredString(value.gateway_provider, 'مزود الدفع'),
    gateway_payment_id: requiredString(value.gateway_payment_id, 'معرف المزود'),
    provider_status: requiredString(value.provider_status, 'حالة المزود'),
    exception_kind: kind,
    expected_minor: expectedMinor,
    actual_minor: optionalNumber(value.actual_minor),
    currency: requiredString(value.currency, 'العملة').toUpperCase(),
    evidence: sanitizeEvidence(value.evidence),
    occurrence_count: positiveInteger(value.occurrence_count),
    first_seen_at: optionalString(value.first_seen_at),
    last_seen_at: optionalString(value.last_seen_at),
    review_status: reviewStatus,
    reviewed_by_name: optionalString(value.reviewed_by_name),
    reviewed_at: optionalString(value.reviewed_at),
    review_notes: optionalString(value.review_notes),
  };
};

export const gatewayFinancialExceptionService = {
  async listOpenExceptions(limit = 50): Promise<GatewayFinancialExceptionList> {
    const safeLimit = Math.min(Math.max(Math.trunc(Number(limit) || 50), 1), 50);
    apiService.clearCache();
    const response = await apiService.request(
      `/api/payments/gateway/financial-exceptions?review_status=open&limit=${safeLimit}`
    ) as ApiEnvelope<{ items?: unknown; total?: unknown }>;

    if (response?.success !== true || !isRecord(response.data) || !Array.isArray(response.data.items)) {
      throw new Error(response?.error || response?.message || 'تعذر تحميل الاستثناءات المالية');
    }

    const items = response.data.items.map(normalizeException);
    const suppliedTotal = Number(response.data.total);
    return {
      items,
      total: Number.isFinite(suppliedTotal) && suppliedTotal >= 0 ? suppliedTotal : items.length,
    };
  },

  async reviewException(
    exceptionId: string,
    payload: ReviewGatewayFinancialExceptionPayload
  ): Promise<GatewayFinancialExceptionReviewResult> {
    const normalizedId = normalizeText(exceptionId);
    const normalizedNotes = normalizeText(payload.review_notes);
    if (!normalizedId) throw new Error('رقم الاستثناء المالي غير متاح');
    if (!['resolved', 'dismissed'].includes(payload.review_status)) {
      throw new Error('إجراء المراجعة غير صالح');
    }
    if (!isMeaningfulArabicReviewNotes(normalizedNotes)) {
      throw new Error('ملاحظات المراجعة يجب أن تكون عربية وواضحة ومن 10 إلى 500 حرف');
    }

    const response = await apiService.request(
      `/api/payments/gateway/financial-exceptions/${encodeURIComponent(normalizedId)}/review`,
      {
        method: 'POST',
        body: JSON.stringify({
          review_status: payload.review_status,
          review_notes: normalizedNotes,
        }),
      }
    ) as ApiEnvelope<{ item?: unknown }>;

    if (response?.success !== true || !isRecord(response.data) || !response.data.item) {
      throw new Error(response?.error || response?.message || 'تعذر حفظ مراجعة الاستثناء المالي');
    }

    apiService.clearCache();
    return {
      success: true,
      data: { item: normalizeException(response.data.item) },
    };
  },
};

export default gatewayFinancialExceptionService;
