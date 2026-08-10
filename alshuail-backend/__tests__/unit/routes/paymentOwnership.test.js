import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const noop = jest.fn();
const pass = (_req, _res, next) => next();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
}));

jest.unstable_mockModule('../../../src/controllers/paymentsController.js', () => ({
  getAllPayments: noop,
  createPayment: noop,
  updatePaymentStatus: noop,
  getPaymentStats: noop,
  getPaymentStatistics: noop,
  getMemberPayments: noop,
  bulkUpdatePayments: noop,
  generateFinancialReport: noop,
  generateReceipt: noop,
  processPayment: noop,
  getOverduePayments: noop,
  getPaymentById: noop,
  getRevenueStats: noop,
  getPaymentsByCategory: noop,
  getMemberContributions: noop,
  getHijriCalendarData: noop,
  getPaymentsGroupedByHijri: noop,
  getHijriFinancialStats: noop,
  payForInitiative: noop,
  payForDiya: noop,
  paySubscription: noop,
  payForMember: noop,
  uploadPaymentReceipt: noop,
  getPendingPayments: noop,
  getPendingPaymentsStats: noop,
}));

jest.unstable_mockModule('../../../src/controllers/paymentGatewayController.js', () => ({
  cancelGatewaySession: noop,
  createGatewaySession: noop,
  handleMoyasarWebhook: noop,
  markGatewaySubmissionStarted: noop,
  verifyGatewaySession: noop,
}));

jest.unstable_mockModule('../../../src/controllers/initiativeReceiptCompatibilityController.js', () => ({
  uploadLegacyInitiativeReceipt: noop,
}));

jest.unstable_mockModule('../../../src/middleware/rbacMiddleware.js', () => ({
  requireRole: jest.fn(() => pass),
}));

jest.unstable_mockModule('../../../src/middleware/payment-validator.js', () => ({
  validatePaymentInitiation: pass,
}));

jest.unstable_mockModule('../../../src/middleware/dynamicAmountValidator.js', () => ({
  validateMinimumAmount: jest.fn(() => pass),
}));

const {
  requireLegacyMobileBankTransfer,
  requirePaymentOwnerForMember,
} = await import('../../../src/routes/payments.js');

function response() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('single-payment member ownership guard', () => {
  test('allows a financing payment payer to read detail/receipt data', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ payer_id: 'member-1', beneficiary_id: 'member-1' }],
    });
    const next = jest.fn();
    const res = response();

    await requirePaymentOwnerForMember({
      user: { id: 'member-1', role: 'member' },
      params: { paymentId: 'payment-1' },
    }, res, next);

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['payment-1']);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('blocks another member even when they know the payment UUID', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ payer_id: 'member-owner', beneficiary_id: 'member-owner' }],
    });
    const next = jest.fn();
    const res = response();

    await requirePaymentOwnerForMember({
      user: { id: 'member-attacker', role: 'member' },
      params: { id: 'payment-1' },
    }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('does not add a redundant database lookup for authorized finance staff', async () => {
    const next = jest.fn();
    await requirePaymentOwnerForMember({
      user: { id: 'finance-1', role: 'financial_manager' },
      params: { id: 'payment-1' },
    }, response(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('retired mobile payment route boundary', () => {
  test.each(['app_payment', 'card', 'credit_card', 'apple_pay', 'moyasar'])(
    'rejects unverified %s before the controller',
    (method) => {
      const next = jest.fn();
      const res = response();

      requireLegacyMobileBankTransfer({ body: { payment_method: method } }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'UNVERIFIED_MOBILE_PAYMENT_METHOD',
      }));
      expect(next).not.toHaveBeenCalled();
    }
  );

  test('keeps the native iOS bank-transfer path and normalizes missing method', () => {
    const req = { body: {} };
    const next = jest.fn();

    requireLegacyMobileBankTransfer(req, response(), next);

    expect(req.body).toEqual({ method: 'bank_transfer', payment_method: 'bank_transfer' });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
