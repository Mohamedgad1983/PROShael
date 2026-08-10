import express from 'express';
import request from 'supertest';
import { describe, expect, jest, test } from '@jest/globals';

const mockListReviews = jest.fn((_req, res) => res.json({ success: true, data: { items: [] } }));
const mockActOnReview = jest.fn((_req, res) => res.json({ success: true }));
const noOpHandler = (_req, res) => res.json({ success: true });

jest.unstable_mockModule('../../../src/controllers/paymentsController.js', () => ({
  getAllPayments: noOpHandler,
  createPayment: noOpHandler,
  updatePaymentStatus: noOpHandler,
  getPaymentStats: noOpHandler,
  getPaymentStatistics: noOpHandler,
  getMemberPayments: noOpHandler,
  bulkUpdatePayments: noOpHandler,
  generateFinancialReport: noOpHandler,
  generateReceipt: noOpHandler,
  processPayment: noOpHandler,
  getOverduePayments: noOpHandler,
  getPaymentById: noOpHandler,
  getRevenueStats: noOpHandler,
  getPaymentsByCategory: noOpHandler,
  getMemberContributions: noOpHandler,
  getHijriCalendarData: noOpHandler,
  getPaymentsGroupedByHijri: noOpHandler,
  getHijriFinancialStats: noOpHandler,
  payForInitiative: noOpHandler,
  payForDiya: noOpHandler,
  paySubscription: noOpHandler,
  payForMember: noOpHandler,
  uploadPaymentReceipt: noOpHandler,
  getPendingPayments: noOpHandler,
  getPendingPaymentsStats: noOpHandler,
}));

jest.unstable_mockModule('../../../src/controllers/paymentGatewayController.js', () => ({
  cancelGatewaySession: noOpHandler,
  createGatewaySession: noOpHandler,
  handleMoyasarWebhook: noOpHandler,
  markGatewaySubmissionStarted: noOpHandler,
  verifyGatewaySession: noOpHandler,
}));

jest.unstable_mockModule('../../../src/controllers/gatewayRefundController.js', () => ({
  listPendingGatewayRefunds: noOpHandler,
  refundPendingGatewayPayment: noOpHandler,
}));

jest.unstable_mockModule('../../../src/controllers/gatewayFinancialExceptionController.js', () => ({
  listGatewayFinancialExceptions: noOpHandler,
  reviewGatewayFinancialException: noOpHandler,
}));

jest.unstable_mockModule('../../../src/controllers/gatewayReconciliationReviewController.js', () => ({
  listGatewayReconciliationReviews: mockListReviews,
  actOnGatewayReconciliationReview: mockActOnReview,
}));

jest.unstable_mockModule('../../../src/middleware/rbacMiddleware.js', () => ({
  requireRole: (roles) => (req, res, next) => {
    const role = req.get('x-test-role');
    req.user = { id: 'test-admin-id', role };
    if (!roles.includes(role)) {return res.status(403).json({ success: false });}
    return next();
  },
}));

jest.unstable_mockModule('../../../src/middleware/payment-validator.js', () => ({
  validatePaymentInitiation: (_req, _res, next) => next(),
}));

jest.unstable_mockModule('../../../src/middleware/dynamicAmountValidator.js', () => ({
  validateMinimumAmount: () => (_req, _res, next) => next(),
}));

jest.unstable_mockModule('../../../src/controllers/initiativeReceiptCompatibilityController.js', () => ({
  uploadLegacyInitiativeReceipt: noOpHandler,
}));

jest.unstable_mockModule('../../../src/services/database.js', () => ({ query: jest.fn() }));

const { default: paymentsRouter } = await import('../../../src/routes/payments.js');

const app = express();
app.use(express.json());
app.use('/api/payments', paymentsRouter);

describe('gateway reconciliation review route RBAC and ordering', () => {
  test.each(['super_admin', 'financial_manager'])(
    'allows %s to read the review queue',
    async (role) => {
      const response = await request(app)
        .get('/api/payments/gateway/reconciliation-reviews')
        .set('x-test-role', role);

      expect(response.status).toBe(200);
      expect(mockListReviews).toHaveBeenCalled();
    }
  );

  test('keeps the static queue route ahead of the generic payment id route', async () => {
    const response = await request(app)
      .get('/api/payments/gateway/reconciliation-reviews')
      .set('x-test-role', 'financial_manager');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ data: { items: [] } });
  });

  test('financial manager is read-only and cannot reach the action controller', async () => {
    const response = await request(app)
      .post('/api/payments/gateway/reconciliation-reviews/payment-id/action')
      .set('x-test-role', 'financial_manager')
      .send({});

    expect(response.status).toBe(403);
    expect(mockActOnReview).not.toHaveBeenCalled();
  });

  test('only super admin reaches the action controller', async () => {
    const response = await request(app)
      .post('/api/payments/gateway/reconciliation-reviews/payment-id/action')
      .set('x-test-role', 'super_admin')
      .send({});

    expect(response.status).toBe(200);
    expect(mockActOnReview).toHaveBeenCalled();
  });

  test('rejects unrelated admin roles for reads', async () => {
    const response = await request(app)
      .get('/api/payments/gateway/reconciliation-reviews')
      .set('x-test-role', 'admin');

    expect(response.status).toBe(403);
  });
});
