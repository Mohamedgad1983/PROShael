import { describe, expect, jest, test } from '@jest/globals';

const mockCreateFinancingPaymentIntent = jest.fn();
const mockCleanupExpiredGatewaySessions = jest.fn();
const mockGetMoyasarGatewayOperationalReadiness = jest.fn();

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { error: jest.fn() },
}));

jest.unstable_mockModule('../../../src/services/moyasarService.js', () => ({
  getMoyasarGatewayOperationalReadiness: mockGetMoyasarGatewayOperationalReadiness,
  getMoyasarPublicCheckoutConfig: jest.fn(() => ({
    provider: 'moyasar',
    publishableKey: 'pk_test',
    currency: 'SAR',
  })),
}));

jest.unstable_mockModule('../../../src/controllers/paymentGatewayController.js', () => ({
  cleanupExpiredGatewaySessions: mockCleanupExpiredGatewaySessions,
  GATEWAY_PROTOCOL_VERSION: 2,
}));

jest.unstable_mockModule('../../../src/services/financingRepaymentService.js', () => ({
  createFinancingPaymentIntent: mockCreateFinancingPaymentIntent,
  getRepaymentPlanById: jest.fn(),
  isFinancingOnlinePaymentEnabled: jest.fn(() => true),
  processFinancingReminders: jest.fn(),
  reconcilePendingFinancingPayments: jest.fn(),
}));

const { createGatewaySession } = await import(
  '../../../src/controllers/financingRepaymentController.js'
);

const makeResponse = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

describe('financing gateway operational readiness response', () => {
  test('maps a stale reconciliation schema to retryable 503 without checkout data', async () => {
    mockGetMoyasarGatewayOperationalReadiness.mockResolvedValue({ ready: false });
    const res = makeResponse();

    await createGatewaySession({
      params: { planId: '11111111-1111-4111-8111-111111111111' },
      user: { id: '22222222-2222-4222-8222-222222222222' },
      body: { protocol_version: 2, pay_all: false },
    }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: 'PAYMENT_GATEWAY_RECONCILIATION_SCHEMA_NOT_READY',
    }));
    expect(mockCleanupExpiredGatewaySessions).not.toHaveBeenCalled();
    expect(mockCreateFinancingPaymentIntent).not.toHaveBeenCalled();
  });
});
