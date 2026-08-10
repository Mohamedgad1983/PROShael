import { apiService } from '../api';
import { gatewayReconciliationReviewService } from '../gatewayReconciliationReviewService';

jest.mock('../api', () => ({
  apiService: {
    request: jest.fn(),
    clearCache: jest.fn(),
  },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;
const paymentId = '11111111-1111-4111-8111-111111111111';

const reviewItem = {
  payment_id: paymentId,
  payment_reference: 'MOY-20260820-REVIEW',
  member_name: 'أحمد محمد الشعيل',
  member_phone_masked: '+966••••00',
  category: 'subscription',
  payment_status: 'cancelled',
  amount: '100.00',
  currency: 'sar',
  gateway_provider: 'Moyasar',
  gateway_payment_id_masked: '••••123456789012',
  gateway_payment_id: 'raw-provider-identity-must-not-survive',
  gateway_response: { source: { token: 'must-never-enter-react-state' } },
  is_financing: false,
  last_provider_status: null,
  last_provider_http_status: 404,
  last_result: 'review_required',
  review_reason: 'provider_not_found_bounded',
  consecutive_not_found: 4,
  consecutive_failures: 4,
  check_count: 5,
  first_not_found_at: '2026-08-19T00:00:00.000Z',
  last_checked_at: '2026-08-20T00:00:00.000Z',
  evidence_hash_masked: '12345678…87654321',
  reconciliation_started_at: '2026-08-18T00:00:00.000Z',
  updated_at: '2026-08-20T00:00:00.000Z',
};

describe('gatewayReconciliationReviewService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('loads only review-required rows and keeps only the masked whitelist', async () => {
    mockedApi.request.mockResolvedValue({
      success: true,
      data: {
        items: [reviewItem],
        total: 1,
        page: 1,
        limit: 25,
        total_pages: 1,
        status: 'review_required',
      },
    });

    const result = await gatewayReconciliationReviewService.listReviewRequired(1, 25);

    expect(mockedApi.request).toHaveBeenCalledWith(
      '/api/payments/gateway/reconciliation-reviews?status=review_required&page=1&limit=25'
    );
    expect(result.items[0]).not.toHaveProperty('gateway_payment_id');
    expect(result.items[0]).not.toHaveProperty('gateway_response');
    expect(JSON.stringify(result)).not.toContain('must-never-enter-react-state');
    expect(result.items[0]).toMatchObject({
      amount: 100,
      currency: 'SAR',
      gateway_provider: 'moyasar',
      gateway_payment_id_masked: '••••123456789012',
    });
  });

  test('posts exact selected payment identity, action and normalized Arabic reason', async () => {
    mockedApi.request.mockResolvedValue({
      success: true,
      data: {
        payment_id: paymentId,
        action: 'requeue',
        state: 'checked',
        next_check_at: '2026-08-20T10:00:00.000Z',
        updated_at: '2026-08-20T10:00:00.000Z',
        review_action_id: 'audit-action-1',
        reviewed_at: '2026-08-20T10:00:00.000Z',
      },
    });

    await gatewayReconciliationReviewService.act(
      paymentId,
      'requeue',
      '  تمت   مطابقة العملية مع لوحة ميسر وإعادة التحقق الآمن  '
    );

    expect(mockedApi.request).toHaveBeenCalledWith(
      `/api/payments/gateway/reconciliation-reviews/${paymentId}/action`,
      {
        method: 'POST',
        body: JSON.stringify({
          payment_id: paymentId,
          action: 'requeue',
          reason: 'تمت مطابقة العملية مع لوحة ميسر وإعادة التحقق الآمن',
        }),
      }
    );
    expect(mockedApi.clearCache).toHaveBeenCalled();
  });

  test('rejects English-only reasons, invalid ids and mismatched server acknowledgements', async () => {
    await expect(gatewayReconciliationReviewService.act(
      paymentId,
      'resolve',
      'resolved after checking the provider record'
    )).rejects.toThrow('سبب المراجعة يجب أن يكون عربياً');
    await expect(gatewayReconciliationReviewService.act(
      'not-a-payment-id',
      'resolve',
      'تمت مراجعة العملية وإغلاق المتابعة الآلية بشكل موثق'
    )).rejects.toThrow('رقم الدفعة غير صالح');
    expect(mockedApi.request).not.toHaveBeenCalled();

    mockedApi.request.mockResolvedValue({
      success: true,
      data: {
        payment_id: paymentId,
        action: 'resolve',
        state: 'checked',
        review_action_id: 'audit-action-2',
      },
    });
    await expect(gatewayReconciliationReviewService.act(
      paymentId,
      'resolve',
      'تمت مراجعة العملية وإغلاق المتابعة الآلية بشكل موثق'
    )).rejects.toThrow('لا تطابق السجل المحدد');
  });
});
