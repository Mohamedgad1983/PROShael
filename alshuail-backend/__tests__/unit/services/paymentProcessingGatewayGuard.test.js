import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: mockGetClient,
}));
jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({
  sendPushNotification: jest.fn(),
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { PaymentProcessingService } = await import(
  '../../../src/services/paymentProcessingService.js'
);

const PAYMENT_ID = '11111111-1111-4111-8111-111111111111';

function gatewayPayment(overrides = {}) {
  return {
    id: PAYMENT_ID,
    payer_id: '22222222-2222-4222-8222-222222222222',
    beneficiary_id: '22222222-2222-4222-8222-222222222222',
    category: 'subscription',
    status: 'pending_verification',
    amount: '100.00',
    payment_method: 'apple_pay',
    gateway_provider: 'moyasar',
    gateway_payment_id: PAYMENT_ID,
    financing_plan_id: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('generic payment status APIs cannot mutate gateway money', () => {
  test('generic creation rejects gateway-managed fields before member or DB lookup', async () => {
    const result = await PaymentProcessingService.createPayment(gatewayPayment());

    expect(result).toEqual(expect.objectContaining({
      success: false,
      code: 'GATEWAY_MANAGED_PAYMENT_STATUS_IMMUTABLE',
    }));
    expect(mockQuery).not.toHaveBeenCalled();
  });
  test.each([
    ['Moyasar identity', gatewayPayment()],
    ['financing plan', gatewayPayment({ gateway_provider: null, gateway_payment_id: null, payment_method: 'online', financing_plan_id: '33333333-3333-4333-8333-333333333333' })],
    ['legacy Apple Pay method', gatewayPayment({ gateway_provider: null, gateway_payment_id: null, payment_method: 'apple_pay' })],
    ['retired PWA app-payment method', gatewayPayment({ gateway_provider: null, gateway_payment_id: null, payment_method: 'app_payment' })],
  ])('rejects a generic status change for %s', async (_label, row) => {
    mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    const result = await PaymentProcessingService.updatePaymentStatus(row.id, 'paid');

    expect(result).toEqual(expect.objectContaining({
      success: false,
      code: 'GATEWAY_MANAGED_PAYMENT_STATUS_IMMUTABLE',
    }));
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('SELECT * FROM payments');
  });

  test('bulk updates inherit the same per-payment gateway guard', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [gatewayPayment()], rowCount: 1 });

    const result = await PaymentProcessingService.bulkUpdatePayments([
      { id: PAYMENT_ID, status: 'refunded' },
    ]);

    expect(result.success).toBe(false);
    expect(result.data.failed).toEqual([expect.objectContaining({
      id: PAYMENT_ID,
      error: expect.stringContaining('بوابة'),
    })]);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('generic process endpoint rolls back before changing a gateway row', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [gatewayPayment()] })
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValueOnce(client);

    // Use an otherwise valid manual method so this test reaches the locked
    // row-level gateway guard. Electronic aliases are rejected even earlier.
    const result = await PaymentProcessingService.processPayment(PAYMENT_ID, 'cash');

    expect(result).toEqual(expect.objectContaining({
      success: false,
      code: 'GATEWAY_MANAGED_PAYMENT_STATUS_IMMUTABLE',
    }));
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('SET status = \'paid\'')))
      .toBe(false);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('manual non-gateway payments retain their normal admin workflow', async () => {
    const manual = gatewayPayment({
      category: 'donation',
      payment_method: 'transfer',
      gateway_provider: null,
      gateway_payment_id: null,
    });
    mockQuery
      .mockResolvedValueOnce({ rows: [manual], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...manual, status: 'failed' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await PaymentProcessingService.updatePaymentStatus(manual.id, 'failed');

    expect(result.success).toBe(true);
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE payments'))).toBe(true);
  });

  test('bank transfer cannot be approved before its archived receipt is linked', async () => {
    const transfer = gatewayPayment({
      category: 'subscription',
      payment_method: 'bank_transfer',
      gateway_provider: null,
      gateway_payment_id: null,
      receipt_document_id: null,
    });
    mockQuery.mockResolvedValueOnce({ rows: [transfer], rowCount: 1 });

    const result = await PaymentProcessingService.updatePaymentStatus(transfer.id, 'paid');

    expect(result).toEqual(expect.objectContaining({
      success: false,
      code: 'BANK_TRANSFER_RECEIPT_REQUIRED',
    }));
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('process endpoint cannot bypass the bank-transfer receipt requirement', async () => {
    const transfer = gatewayPayment({
      payment_method: 'cash',
      gateway_provider: null,
      gateway_payment_id: null,
      receipt_document_id: null,
    });
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [transfer] })
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValueOnce(client);

    const result = await PaymentProcessingService.processPayment(PAYMENT_ID, 'transfer');

    expect(result).toEqual(expect.objectContaining({
      success: false,
      code: 'BANK_TRANSFER_RECEIPT_REQUIRED',
    }));
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("SET status = 'paid'")))
      .toBe(false);
  });

  test('legacy transfer alias is stored canonically when an archived receipt exists', async () => {
    const transfer = gatewayPayment({
      payment_method: 'cash',
      gateway_provider: null,
      gateway_payment_id: null,
      receipt_document_id: '44444444-4444-4444-8444-444444444444',
      category: 'donation',
    });
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [transfer] })
        .mockResolvedValueOnce({ rows: [{ ...transfer, status: 'paid', payment_method: 'bank_transfer' }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValueOnce(client);
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await PaymentProcessingService.processPayment(PAYMENT_ID, 'transfer');

    expect(result.success).toBe(true);
    const updateCall = client.query.mock.calls.find(([sql]) => String(sql).includes("SET status = 'paid'"));
    expect(updateCall?.[1]?.[0]).toBe('bank_transfer');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });
});
