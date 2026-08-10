import { apiService } from './api';

export type InitiativeDonationDecision = 'approved' | 'rejected';

export interface InitiativeDonationReviewResult {
  success: boolean;
  idempotent_replay?: boolean;
  message?: string;
  error?: string;
  donation?: Record<string, unknown>;
}

const normalizeText = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ');

export const normalizeDonationRejectionReason = (value: unknown) => normalizeText(value);

export const validateDonationRejectionReason = (value: unknown) => {
  const reason = normalizeDonationRejectionReason(value);
  const meaningfulCharacters = reason.match(/[A-Za-z0-9ء-ي]/g) || [];

  if (reason.length < 10 || reason.length > 500 || meaningfulCharacters.length < 8) {
    return {
      valid: false as const,
      reason,
      error: 'سبب الرفض يجب أن يكون واضحاً ومن 10 إلى 500 حرف',
    };
  }

  return { valid: true as const, reason, error: null };
};

const assertSuccessfulReview = (
  response: InitiativeDonationReviewResult,
  fallbackMessage: string
) => {
  if (response?.success !== true) {
    throw new Error(response?.error || response?.message || fallbackMessage);
  }
  return response;
};

export const initiativeDonationReviewService = {
  async approve(donationId: string | number): Promise<InitiativeDonationReviewResult> {
    const response = await apiService.request(
      `/api/initiatives-enhanced/donations/${encodeURIComponent(String(donationId))}/approve`,
      { method: 'PATCH' }
    ) as InitiativeDonationReviewResult;

    apiService.clearCache();
    return assertSuccessfulReview(response, 'تعذر اعتماد المساهمة');
  },

  async reject(
    donationId: string | number,
    rejectionReason: unknown
  ): Promise<InitiativeDonationReviewResult> {
    const validation = validateDonationRejectionReason(rejectionReason);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const response = await apiService.request(
      `/api/initiatives-enhanced/donations/${encodeURIComponent(String(donationId))}/reject`,
      {
        method: 'PATCH',
        body: JSON.stringify({ reason: validation.reason }),
      }
    ) as InitiativeDonationReviewResult;

    apiService.clearCache();
    return assertSuccessfulReview(response, 'تعذر رفض المساهمة');
  },
};

export default initiativeDonationReviewService;
