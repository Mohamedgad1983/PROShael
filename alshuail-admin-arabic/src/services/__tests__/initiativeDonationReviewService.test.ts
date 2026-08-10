import { apiService } from '../api';
import {
  initiativeDonationReviewService,
  validateDonationRejectionReason,
} from '../initiativeDonationReviewService';

jest.mock('../api', () => ({
  apiService: {
    request: jest.fn(),
    clearCache: jest.fn(),
  },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;

describe('initiativeDonationReviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses the internal donation id to approve without asking for a technical identifier', async () => {
    mockedApi.request.mockResolvedValue({
      success: true,
      message: 'تم اعتماد المساهمة بنجاح',
    });

    await initiativeDonationReviewService.approve('donation/1');

    expect(mockedApi.request).toHaveBeenCalledWith(
      '/api/initiatives-enhanced/donations/donation%2F1/approve',
      { method: 'PATCH' }
    );
    expect(mockedApi.clearCache).toHaveBeenCalledTimes(1);
  });

  test('normalizes and submits a meaningful rejection reason', async () => {
    mockedApi.request.mockResolvedValue({
      success: true,
      message: 'تم رفض المساهمة وتسجيل السبب',
    });

    await initiativeDonationReviewService.reject(
      'donation-1',
      '  مبلغ الإيصال   لا يطابق قيمة المساهمة المسجلة  '
    );

    expect(mockedApi.request).toHaveBeenCalledWith(
      '/api/initiatives-enhanced/donations/donation-1/reject',
      {
        method: 'PATCH',
        body: JSON.stringify({
          reason: 'مبلغ الإيصال لا يطابق قيمة المساهمة المسجلة',
        }),
      }
    );
    expect(mockedApi.clearCache).toHaveBeenCalledTimes(1);
  });

  test.each(['', 'قصير', '................', '،،،،،،،،،،،،']) (
    'rejects a non-meaningful reason before calling the API: %s',
    async (reason) => {
      expect(validateDonationRejectionReason(reason).valid).toBe(false);
      await expect(initiativeDonationReviewService.reject('donation-1', reason))
        .rejects.toThrow('سبب الرفض يجب أن يكون واضحاً ومن 10 إلى 500 حرف');
      expect(mockedApi.request).not.toHaveBeenCalled();
    }
  );

  test('fails closed when the backend does not return a success decision', async () => {
    mockedApi.request.mockResolvedValue({
      success: false,
      error: 'تغيرت حالة المساهمة أثناء المراجعة',
    });

    await expect(initiativeDonationReviewService.approve('donation-1'))
      .rejects.toThrow('تغيرت حالة المساهمة أثناء المراجعة');
  });
});
