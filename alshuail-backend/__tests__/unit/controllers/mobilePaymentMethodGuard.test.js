import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockJwtVerify = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
}));
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { verify: mockJwtVerify },
}));
jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    jwt: { secret: 'test-secret' },
    paymentGateway: {
      enabled: false,
      iosEnabled: false,
      provider: 'moyasar',
      currency: 'SAR',
      moyasar: {},
    },
  },
}));
jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  uploadToSupabase: jest.fn(),
  getSignedUrl: jest.fn(),
  deleteFromSupabase: jest.fn(),
}));
jest.unstable_mockModule('../../../src/services/financingRepaymentService.js', () => ({
  settleFinancingPayment: jest.fn(),
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const {
  payForDiya,
  payForInitiative,
  payForMember,
  paySubscription,
} = await import('../../../src/controllers/paymentsController.js');

const MEMBER_ID = '22222222-2222-4222-8222-222222222222';

function response() {
  const res = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function request(method, overrides = {}) {
  return {
    headers: { authorization: 'Bearer token' },
    body: {
      payment_method: method,
      amount: 100,
      initiative_id: 'initiative-1',
      diya_id: 'diya-1',
      beneficiary_id: MEMBER_ID,
      payment_category: 'subscription',
      ...overrides,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockJwtVerify.mockReturnValue({ id: MEMBER_ID });
});

describe('legacy mobile payments are bank-transfer only', () => {
  const handlers = [
    ['initiative', payForInitiative],
    ['diya', payForDiya],
    ['subscription', paySubscription],
    ['for-member', payForMember],
  ];

  test.each(handlers.flatMap(([label, handler]) =>
    ['app_payment', 'card', 'credit_card', 'apple_pay', 'moyasar']
      .map((method) => [label, method, handler])
  ))('%s rejects unverified %s before any database access', async (_label, method, handler) => {
    const res = response();

    await handler(request(method), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'UNVERIFIED_MOBILE_PAYMENT_METHOD',
    }));
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('persists an omitted-method initiative as bank transfer', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'payment-1', payment_method: 'bank_transfer' }] });
    const req = request(undefined);
    delete req.body.payment_method;
    const res = response();

    await payForInitiative(req, res);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[1][1][4]).toBe('bank_transfer');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('persists an omitted-method diya as bank transfer with no fake subscription FK', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'payment-2', payment_method: 'bank_transfer' }] });
    const req = request(undefined);
    delete req.body.payment_method;
    const res = response();

    await payForDiya(req, res);

    expect(mockQuery.mock.calls[0][1][2]).toBeNull();
    expect(mockQuery.mock.calls[0][1][5]).toBe('bank_transfer');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('persists an omitted-method subscription as pending bank transfer', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ current_balance: 0, pending_subscription_amount: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'payment-3', payment_method: 'bank_transfer' }] });
    const req = request(undefined);
    delete req.body.payment_method;
    const res = response();

    await paySubscription(req, res);

    expect(mockQuery.mock.calls[2][1][4]).toBe('bank_transfer');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('persists an omitted-method payment for another member as bank transfer with no fake subscription FK', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: MEMBER_ID, full_name: 'عضو الاختبار', membership_status: 'active' }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'payment-4', payment_method: 'bank_transfer' }] });
    const req = request(undefined, { payment_category: 'diya' });
    delete req.body.payment_method;
    const res = response();

    await payForMember(req, res);

    expect(mockQuery.mock.calls[1][1][2]).toBeNull();
    expect(mockQuery.mock.calls[1][1][5]).toBe('bank_transfer');
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
