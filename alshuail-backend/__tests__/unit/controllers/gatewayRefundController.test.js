import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease = jest.fn();
const mockFetchMoyasarPayment = jest.fn();
const mockRefundMoyasarPayment = jest.fn();
const mockSanitizeMoyasarPaymentEvidence = jest.fn((payment) => {
  const evidence = {
    id: payment.id,
    given_id: payment.given_id ?? null,
    status: String(payment.status || '').toLowerCase() || null,
    amount: Number(payment.amount),
    fee: null,
    currency: String(payment.currency || '').toUpperCase() || null,
    captured: payment.captured ?? null,
    refunded: payment.refunded ?? null,
  };
  if (payment.refunded_at) {evidence.refunded_at = payment.refunded_at;}
  if (payment.source) {
    evidence.source = {
      type: payment.source.type,
      number: payment.source.number,
    };
  }
  return evidence;
});

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  getClient: mockGetClient,
  query: mockQuery,
}));

jest.unstable_mockModule('../../../src/services/moyasarService.js', () => ({
  fetchMoyasarPayment: mockFetchMoyasarPayment,
  refundMoyasarPayment: mockRefundMoyasarPayment,
  sanitizeMoyasarPaymentEvidence: mockSanitizeMoyasarPaymentEvidence,
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const {
  listPendingGatewayRefunds,
  refundPendingGatewayPayment,
} = await import('../../../src/controllers/gatewayRefundController.js');

const PAYMENT_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';

const localPayment = (overrides = {}) => ({
  id: PAYMENT_ID,
  payer_id: '33333333-3333-4333-8333-333333333333',
  beneficiary_id: '33333333-3333-4333-8333-333333333333',
  amount: '50.00',
  category: 'subscription',
  status: 'pending_refund',
  gateway_provider: 'moyasar',
  gateway_payment_id: PAYMENT_ID,
  gateway_status: 'paid',
  gateway_amount_minor: 5000,
  gateway_currency: 'SAR',
  ...overrides,
});

const providerPayment = (overrides = {}) => ({
  id: PAYMENT_ID,
  given_id: PAYMENT_ID,
  amount: 5000,
  currency: 'SAR',
  status: 'paid',
  refunded: 0,
  ...overrides,
});

const makeRequest = (overrides = {}) => ({
  params: { paymentId: PAYMENT_ID },
  body: {
    confirmation_payment_id: PAYMENT_ID,
    reason: 'تجاوز رصيد الاشتراك الحد المسموح بعد الخصم',
  },
  headers: {
    'user-agent': 'Jest',
    'x-forwarded-for': '127.0.0.1',
  },
  ip: '127.0.0.1',
  user: { id: ADMIN_ID, role: 'super_admin' },
  ...overrides,
});

const makeResponse = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

function installSuccessfulDatabase(payment = localPayment()) {
  mockClientQuery.mockImplementation((sql) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {return { rows: [] };}
    if (sql.includes('SELECT *') && sql.includes('FROM payments')) {return { rows: [payment] };}
    if (sql.includes('INSERT INTO gateway_refund_operations')) {
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes("SET status = 'failed'")) {return { rows: [], rowCount: 1 };}
    if (sql.includes('UPDATE payments')) {
      return { rows: [{ ...payment, status: 'refunded', gateway_status: 'refunded' }] };
    }
    if (sql.includes('UPDATE gateway_refund_operations')) {
      return { rows: [{ id: 'refund-op', status: 'succeeded', attempt_count: 1 }] };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetClient.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
});

describe('controlled pending-refund workflow', () => {
  test('lists only the dedicated pending-refund review projection', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: PAYMENT_ID, status: 'pending_refund' }] });
    const res = makeResponse();

    await listPendingGatewayRefunds(makeRequest(), res);

    expect(mockQuery.mock.calls[0][0]).toContain("WHERE p.status = 'pending_refund'");
    expect(mockQuery.mock.calls[0][0]).toContain('REGEXP_REPLACE');
    expect(mockQuery.mock.calls[0][0]).toContain('RIGHT(');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: PAYMENT_ID, status: 'pending_refund' }],
      count: 1,
    });
  });

  test('requires typing the exact payment id before acquiring a database client', async () => {
    const res = makeResponse();
    await refundPendingGatewayPayment(makeRequest({
      body: { confirmation_payment_id: 'wrong', reason: 'سبب واضح وكامل للاسترداد' },
    }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'REFUND_CONFIRMATION_MISMATCH',
    }));
    expect(mockGetClient).not.toHaveBeenCalled();
  });

  test('preflights provider evidence and performs one full refund', async () => {
    installSuccessfulDatabase();
    mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment());
    mockRefundMoyasarPayment.mockResolvedValueOnce(providerPayment({
      status: 'refunded',
      refunded: 5000,
      refunded_at: '2026-08-10T12:00:00.000Z',
      source: {
        type: 'applepay',
        number: '**** 4242',
        token: 'reusable-provider-token',
      },
      transaction_url: 'https://provider.example/secret',
      authorization_code: 'secret-authorization-code',
      metadata: { internal_secret: 'must-not-persist' },
    }));
    const res = makeResponse();

    await refundPendingGatewayPayment(makeRequest(), res);

    expect(mockRefundMoyasarPayment).toHaveBeenCalledTimes(1);
    expect(mockRefundMoyasarPayment).toHaveBeenCalledWith(PAYMENT_ID);
    const paymentUpdate = mockClientQuery.mock.calls.find(([sql]) => sql.includes('UPDATE payments'));
    expect(paymentUpdate[0]).toContain("status = 'refunded'");
    const operationUpdate = mockClientQuery.mock.calls.find(([sql]) =>
      sql.includes('UPDATE gateway_refund_operations'));
    const paymentEvidence = JSON.parse(paymentUpdate[1][1]);
    const operationEvidence = JSON.parse(operationUpdate[1][1]);
    expect(mockSanitizeMoyasarPaymentEvidence).toHaveBeenCalledTimes(1);
    expect(paymentEvidence).toEqual(operationEvidence);
    expect(JSON.stringify(paymentEvidence)).not.toContain('reusable-provider-token');
    expect(JSON.stringify(paymentEvidence)).not.toContain('secret-authorization-code');
    expect(JSON.stringify(paymentEvidence)).not.toContain('internal_secret');
    expect(paymentEvidence).not.toHaveProperty('transaction_url');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      idempotent_replay: false,
    }));
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  test('recovers a lost refund response by fetching provider state instead of refunding twice', async () => {
    installSuccessfulDatabase();
    mockFetchMoyasarPayment
      .mockResolvedValueOnce(providerPayment())
      .mockResolvedValueOnce(providerPayment({
        status: 'refunded',
        refunded: 5000,
        refunded_at: '2026-08-10T12:00:00.000Z',
      }));
    mockRefundMoyasarPayment.mockRejectedValueOnce(new Error('socket closed'));
    const res = makeResponse();

    await refundPendingGatewayPayment(makeRequest(), res);

    expect(mockRefundMoyasarPayment).toHaveBeenCalledTimes(1);
    expect(mockFetchMoyasarPayment).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('rejects a provider partial refund without resolving either local record', async () => {
    installSuccessfulDatabase();
    mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment());
    mockRefundMoyasarPayment.mockResolvedValueOnce(providerPayment({
      status: 'refunded',
      refunded: 1000,
      refunded_at: '2026-08-10T12:00:00.000Z',
    }));
    const res = makeResponse();

    await refundPendingGatewayPayment(makeRequest(), res);

    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes("SET status = 'failed'")))
      .toBe(true);
    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes('UPDATE payments'))).toBe(false);
    expect(mockClientQuery.mock.calls.some(([sql]) =>
      sql.includes("SET status = 'succeeded'"))).toBe(false);
    expect(mockSanitizeMoyasarPaymentEvidence).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'MOYASAR_REFUND_INCOMPLETE',
    }));
  });

  test('records a provider preflight failure and never changes the local payment status', async () => {
    installSuccessfulDatabase();
    const providerError = new Error('Unauthorized');
    providerError.statusCode = 401;
    mockFetchMoyasarPayment.mockRejectedValueOnce(providerError);
    const res = makeResponse();

    await refundPendingGatewayPayment(makeRequest(), res);

    expect(mockRefundMoyasarPayment).not.toHaveBeenCalled();
    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes("SET status = 'failed'"))).toBe(true);
    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes('UPDATE payments'))).toBe(false);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'MOYASAR_REFUND_PREFLIGHT_FAILED',
    }));
  });

  test('records mismatched provider evidence and never calls the refund endpoint', async () => {
    installSuccessfulDatabase();
    mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment({ amount: 5100 }));
    const res = makeResponse();

    await refundPendingGatewayPayment(makeRequest(), res);

    expect(mockRefundMoyasarPayment).not.toHaveBeenCalled();
    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes("SET status = 'failed'"))).toBe(true);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'REFUND_PROVIDER_EVIDENCE_MISMATCH',
    }));
  });

  test('rejects a corrupt local minor amount before calling the provider refund endpoint', async () => {
    installSuccessfulDatabase(localPayment({ gateway_amount_minor: 4900 }));
    mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment({ amount: 4900 }));
    const res = makeResponse();

    await refundPendingGatewayPayment(makeRequest(), res);

    expect(mockRefundMoyasarPayment).not.toHaveBeenCalled();
    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes("SET status = 'failed'")))
      .toBe(true);
    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes('UPDATE payments')))
      .toBe(false);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'REFUND_LOCAL_EVIDENCE_INVALID',
    }));
  });

  test('uses the controlled full-refund workflow for a captured abandoned financing payment', async () => {
    const financingPayment = localPayment({
      category: 'financing_installment',
      financing_plan_id: '44444444-4444-4444-8444-444444444444',
      gateway_failure_reason: 'CAPTURE_AFTER_LOCAL_ABANDONMENT',
    });
    installSuccessfulDatabase(financingPayment);
    mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment());
    mockRefundMoyasarPayment.mockResolvedValueOnce(providerPayment({
      status: 'refunded',
      refunded: 5000,
      refunded_at: '2026-08-10T12:00:00.000Z',
    }));
    const res = makeResponse();

    await refundPendingGatewayPayment(makeRequest(), res);

    expect(mockRefundMoyasarPayment).toHaveBeenCalledWith(PAYMENT_ID);
    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes('financing_payment_allocations')))
      .toBe(false);
    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes('financing_installments')))
      .toBe(false);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      idempotent_replay: false,
    }));
  });

  test('treats an already-refunded local row as an idempotent replay', async () => {
    const payment = localPayment({ status: 'refunded', gateway_status: 'refunded' });
    mockClientQuery.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {return { rows: [] };}
      if (sql.includes('SELECT *') && sql.includes('FROM payments')) {
        return { rows: [payment] };
      }
      if (sql.includes('FROM gateway_refund_operations')) {
        return { rows: [{ id: 'refund-op', status: 'succeeded' }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const res = makeResponse();

    await refundPendingGatewayPayment(makeRequest(), res);

    expect(mockFetchMoyasarPayment).not.toHaveBeenCalled();
    expect(mockRefundMoyasarPayment).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      idempotent_replay: true,
    }));
  });
});
