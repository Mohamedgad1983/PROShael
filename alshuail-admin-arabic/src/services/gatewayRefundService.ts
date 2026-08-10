import { apiService } from './api';

export interface PendingGatewayRefund {
  id: string | number;
  payer_id?: string | null;
  beneficiary_id?: string | null;
  amount: string | number;
  category?: string | null;
  financing_plan_id?: string | null;
  reference_number?: string | null;
  gateway_provider: string;
  gateway_payment_id: string;
  gateway_status: string;
  gateway_amount_minor?: string | number | null;
  gateway_currency?: string | null;
  gateway_failure_reason?: string | null;
  gateway_verified_at?: string | null;
  created_at?: string | null;
  member_name?: string | null;
  member_phone?: string | null;
  source_type?: string | null;
  source_company?: string | null;
  masked_card?: string | null;
  refund_operation_status?: string | null;
  refund_attempt_count?: string | number | null;
  refund_last_error?: string | null;
  refund_requested_at?: string | null;
  refund_completed_at?: string | null;
}

export interface PendingGatewayRefundList {
  data: PendingGatewayRefund[];
  count: number;
}

export interface GatewayRefundResult {
  success: boolean;
  idempotent_replay?: boolean;
  data?: {
    payment_id?: string | number;
    id?: string | number;
    status?: string;
    gateway_status?: string;
    gateway_verified_at?: string;
    refund_operation?: {
      id?: string | number;
      status?: string;
      attempt_count?: number;
      completed_at?: string;
    } | null;
  };
}

export interface ExecuteGatewayRefundPayload {
  reason: string;
  confirmation_payment_id: string;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  count?: number;
  error?: string;
  message?: string;
}

const normalizeText = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ');

export const gatewayRefundService = {
  async listPendingRefunds(): Promise<PendingGatewayRefundList> {
    // This is an operational queue, so a previous five-minute API cache must
    // never hide a refund completed by another administrator.
    apiService.clearCache();
    const response = await apiService.request('/api/payments/gateway/pending-refunds') as
      ApiEnvelope<PendingGatewayRefund[]>;

    if (response?.success !== true || !Array.isArray(response?.data)) {
      throw new Error(response.error || response.message || 'تعذر تحميل عمليات الاسترداد المطلوبة');
    }

    const data = response.data;
    return {
      data,
      count: Number.isFinite(Number(response?.count)) ? Number(response.count) : data.length,
    };
  },

  async refundPendingPayment(
    paymentId: string | number,
    payload: ExecuteGatewayRefundPayload
  ): Promise<GatewayRefundResult> {
    const normalizedPaymentId = normalizeText(paymentId);
    const normalizedConfirmation = normalizeText(payload.confirmation_payment_id);
    const normalizedReason = normalizeText(payload.reason);
    const meaningfulCharacters = normalizedReason.match(/[A-Za-z0-9\u0600-\u06FF]/g) || [];

    if (!normalizedPaymentId || normalizedConfirmation !== normalizedPaymentId) {
      throw new Error('اكتب رقم العملية كاملاً لتأكيد الاسترداد');
    }
    if (
      normalizedReason.length < 10 ||
      normalizedReason.length > 500 ||
      meaningfulCharacters.length < 8
    ) {
      throw new Error('سبب الاسترداد يجب أن يكون واضحاً ومن 10 إلى 500 حرف');
    }

    const response = await apiService.request(
      `/api/payments/gateway/pending-refunds/${encodeURIComponent(normalizedPaymentId)}/refund`,
      {
        method: 'POST',
        body: JSON.stringify({
          reason: normalizedReason,
          confirmation_payment_id: normalizedConfirmation,
        }),
      }
    ) as GatewayRefundResult & ApiEnvelope<GatewayRefundResult['data']>;

    if (!response?.success) {
      throw new Error(response?.error || response?.message || 'تعذر تنفيذ الاسترداد الآمن');
    }

    apiService.clearCache();
    return response;
  },
};

export default gatewayRefundService;
