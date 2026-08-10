import { apiService } from '../api';
import { gatewayRefundService } from '../gatewayRefundService';

jest.mock('../api', () => ({
  apiService: {
    request: jest.fn(),
    clearCache: jest.fn(),
  },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;

describe('gatewayRefundService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads the dedicated pending-refund queue without relying on stale GET cache', async () => {
    mockedApi.request.mockResolvedValue({
      success: true,
      data: [{
        id: 'payment-1',
        amount: '100',
        gateway_provider: 'moyasar',
        gateway_payment_id: 'provider-1',
        gateway_status: 'captured',
      }],
      count: 1,
    });

    const result = await gatewayRefundService.listPendingRefunds();

    expect(mockedApi.clearCache).toHaveBeenCalledTimes(1);
    expect(mockedApi.request).toHaveBeenCalledWith('/api/payments/gateway/pending-refunds');
    expect(result.count).toBe(1);
  });

  test('fails closed when the queue response is not the expected success envelope', async () => {
    mockedApi.request.mockResolvedValue({ success: true, data: null });

    await expect(gatewayRefundService.listPendingRefunds())
      .rejects.toThrow('تعذر تحميل عمليات الاسترداد المطلوبة');
  });

  test('posts the exact payment confirmation and normalized reason to the refund endpoint', async () => {
    mockedApi.request.mockResolvedValue({
      success: true,
      data: { payment_id: 'payment/1', status: 'refunded' },
    });

    await gatewayRefundService.refundPendingPayment('payment/1', {
      reason: '  تجاوز   سقف الاشتراك بعد الخصم  ',
      confirmation_payment_id: 'payment/1',
    });

    expect(mockedApi.request).toHaveBeenCalledWith(
      '/api/payments/gateway/pending-refunds/payment%2F1/refund',
      {
        method: 'POST',
        body: JSON.stringify({
          reason: 'تجاوز سقف الاشتراك بعد الخصم',
          confirmation_payment_id: 'payment/1',
        }),
      }
    );
    expect(mockedApi.clearCache).toHaveBeenCalledTimes(1);
  });

  test('refuses a mismatched confirmation before calling the backend', async () => {
    await expect(gatewayRefundService.refundPendingPayment('payment-1', {
      reason: 'تجاوز سقف الاشتراك بعد الخصم',
      confirmation_payment_id: 'payment-2',
    })).rejects.toThrow('اكتب رقم العملية كاملاً لتأكيد الاسترداد');

    expect(mockedApi.request).not.toHaveBeenCalled();
  });

  test('refuses a punctuation-only reason before calling the backend', async () => {
    await expect(gatewayRefundService.refundPendingPayment('payment-1', {
      reason: '...............',
      confirmation_payment_id: 'payment-1',
    })).rejects.toThrow('سبب الاسترداد يجب أن يكون واضحاً');

    expect(mockedApi.request).not.toHaveBeenCalled();
  });
});
