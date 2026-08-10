import { apiService } from '../api';
import { gatewayFinancialExceptionService } from '../gatewayFinancialExceptionService';

jest.mock('../api', () => ({
  apiService: {
    request: jest.fn(),
    clearCache: jest.fn(),
  },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;

const openException = {
  id: 'exception-1',
  payment_id: 'payment-1',
  reference_number: 'MOY-20260810-ABCD',
  member_id: 'member-1',
  member_name: 'أحمد محمد الشعيل',
  member_phone: '0501234567',
  gateway_provider: 'moyasar',
  gateway_payment_id: 'provider-payment-1',
  provider_status: 'captured',
  exception_kind: 'partial_capture',
  expected_minor: 10000,
  actual_minor: 5000,
  currency: 'sar',
  evidence: {
    id: 'provider-payment-1',
    status: 'captured',
    amount: 5000,
    captured: 5000,
    captured_at: '2026-08-10T08:00:00.000Z',
    source: {
      type: 'applepay',
      company: 'visa',
      number: '4242',
      response_code: '00',
      token: 'must-never-enter-react-state',
    },
  },
  provider_response: {
    source: { token: 'raw-provider-secret' },
  },
  occurrence_count: 2,
  first_seen_at: '2026-08-10T08:00:00.000Z',
  last_seen_at: '2026-08-10T08:10:00.000Z',
  review_status: 'open',
};

describe('gatewayFinancialExceptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads only open exceptions and strips raw provider data and source tokens', async () => {
    mockedApi.request.mockResolvedValue({
      success: true,
      data: { items: [openException], total: 1 },
    });

    const result = await gatewayFinancialExceptionService.listOpenExceptions(50);

    expect(mockedApi.clearCache).toHaveBeenCalledTimes(1);
    expect(mockedApi.request).toHaveBeenCalledWith(
      '/api/payments/gateway/financial-exceptions?review_status=open&limit=50'
    );
    expect(result.total).toBe(1);
    expect(result.items[0].currency).toBe('SAR');
    expect(result.items[0]).not.toHaveProperty('provider_response');
    expect(result.items[0].evidence.source).not.toHaveProperty('token');
    expect(result.items[0].evidence.source?.number).toBe('•••• 4242');
  });

  test('fails closed when the list envelope or financial identity is incomplete', async () => {
    mockedApi.request.mockResolvedValue({ success: true, data: { items: [{}], total: 1 } });

    await expect(gatewayFinancialExceptionService.listOpenExceptions())
      .rejects.toThrow('بيانات الاستثناء المالي غير مكتملة');
  });

  test('posts only the final review status and normalized Arabic notes', async () => {
    mockedApi.request.mockResolvedValue({
      success: true,
      data: {
        item: {
          ...openException,
          review_status: 'resolved',
          reviewed_by_name: 'المشرف العام',
          reviewed_at: '2026-08-10T09:00:00.000Z',
          review_notes: 'تمت مطابقة كشف ميسر مع القيد البنكي واعتماد المعالجة',
        },
      },
    });

    await gatewayFinancialExceptionService.reviewException('exception/1', {
      review_status: 'resolved',
      review_notes: '  تمت   مطابقة كشف ميسر مع القيد البنكي واعتماد المعالجة  ',
    });

    expect(mockedApi.request).toHaveBeenCalledWith(
      '/api/payments/gateway/financial-exceptions/exception%2F1/review',
      {
        method: 'POST',
        body: JSON.stringify({
          review_status: 'resolved',
          review_notes: 'تمت مطابقة كشف ميسر مع القيد البنكي واعتماد المعالجة',
        }),
      }
    );
    expect(mockedApi.clearCache).toHaveBeenCalledTimes(1);
  });

  test('rejects English-only or meaningless notes before calling the backend', async () => {
    await expect(gatewayFinancialExceptionService.reviewException('exception-1', {
      review_status: 'dismissed',
      review_notes: 'resolved after checking the gateway record',
    })).rejects.toThrow('ملاحظات المراجعة يجب أن تكون عربية وواضحة');

    expect(mockedApi.request).not.toHaveBeenCalled();
  });
});
