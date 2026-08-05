import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
}));

jest.unstable_mockModule('../../../src/services/moyasarService.js', () => ({
  fetchMoyasarPayment: jest.fn(),
  getMoyasarPublicCheckoutConfig: jest.fn(),
  isMoyasarEnabledForIos: jest.fn(),
}));

jest.unstable_mockModule('../../../src/utils/hijriDateUtils.js', () => ({
  HijriDateManager: { convertToHijri: jest.fn() },
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: { paymentGateway: { currency: 'SAR', moyasar: {} } },
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const {
  fetchMoyasarPayment,
  getMoyasarPublicCheckoutConfig,
  isMoyasarEnabledForIos,
} = await import('../../../src/services/moyasarService.js');
const { HijriDateManager } = await import('../../../src/utils/hijriDateUtils.js');
const {
  cancelGatewaySession,
  createGatewaySession,
  handleMoyasarWebhook,
  verifyGatewaySession,
} = await import('../../../src/controllers/paymentGatewayController.js');

const createResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

const createRequest = (overrides = {}) => ({
  params: { paymentId: 'payment-1' },
  user: { id: 'member-1', role: 'member' },
  ...overrides,
});

describe('cancelGatewaySession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isMoyasarEnabledForIos.mockReturnValue(true);
  });

  test('cancels an owned pending session', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'payment-1',
          payer_id: 'member-1',
          beneficiary_id: 'member-1',
          status: 'pending',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'payment-1', status: 'cancelled' }],
      });
    const res = createResponse();

    await cancelGatewaySession(createRequest(), res);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[1][0]).toContain('DELETE FROM payments');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { payment_id: 'payment-1', status: 'cancelled' },
    });
  });

  test('is idempotent when the session is already cancelled', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'payment-1',
        payer_id: 'member-1',
        beneficiary_id: 'member-1',
        status: 'cancelled',
      }],
    });
    const res = createResponse();

    await cancelGatewaySession(createRequest(), res);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { payment_id: 'payment-1', status: 'cancelled' },
    });
  });

  test('rejects a member who does not own the session', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'payment-1',
        payer_id: 'member-2',
        beneficiary_id: 'member-2',
        status: 'pending',
      }],
    });
    const res = createResponse();

    await cancelGatewaySession(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('does not cancel a processed session', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'payment-1',
        payer_id: 'member-1',
        beneficiary_id: 'member-1',
        status: 'paid',
      }],
    });
    const res = createResponse();

    await cancelGatewaySession(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('returns 404 for an unknown session', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = createResponse();

    await cancelGatewaySession(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('automatic Moyasar reconciliation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isMoyasarEnabledForIos.mockReturnValue(true);
  });

  test('rejects a checkout that would exceed the SAR 3,000 subscription limit', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [{ current_balance: '2950.00', active_gateway_amount: '0.00' }],
      });
    const res = createResponse();

    await createGatewaySession(createRequest({
      body: { amount: 100, memberId: 'member-1' },
    }), res);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
      available_amount: 50,
    }));
  });

  test('creates a checkout within the available member balance', async () => {
    getMoyasarPublicCheckoutConfig.mockReturnValue({
      provider: 'moyasar',
      publishableKey: 'pk_test',
      currency: 'SAR',
    });
    HijriDateManager.convertToHijri.mockReturnValue({
      hijri_date_string: '1448-01-01',
      hijri_year: 1448,
      hijri_month: 1,
      hijri_day: 1,
      hijri_month_name: 'محرم',
    });
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [{ current_balance: '2900.00', active_gateway_amount: '0.00' }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'subscription-1' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'payment-1',
          status: 'pending',
          reference_number: 'MOY-20260805-TEST',
        }],
      });
    const res = createResponse();

    await createGatewaySession(createRequest({
      body: { amount: 100, memberId: 'member-1' },
    }), res);

    expect(mockQuery).toHaveBeenCalledTimes(4);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        payment_id: 'payment-1',
        status: 'pending',
        amount_minor: 10000,
      }),
    }));
  });

  test('marks a verified paid subscription as paid without admin approval', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'payment-1',
          payer_id: 'member-1',
          beneficiary_id: 'member-1',
          status: 'pending',
          gateway_provider: 'moyasar',
          gateway_payment_id: 'gateway-1',
          gateway_amount_minor: 5000,
          gateway_currency: 'SAR',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'payment-1', status: 'paid' }],
      });
    fetchMoyasarPayment.mockResolvedValue({
      id: 'gateway-1',
      status: 'paid',
      amount: 5000,
      currency: 'SAR',
      created_at: '2026-08-05T09:00:00+03:00',
    });
    const req = createRequest({
      body: { gateway_payment_id: 'gateway-1' },
    });
    const res = createResponse();

    await verifyGatewaySession(req, res);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[1][0]).toContain('SET status = $1::varchar');
    expect(mockQuery.mock.calls[1][1][0]).toBe('paid');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        payment_id: 'payment-1',
        status: 'paid',
        provider: 'moyasar',
        gateway_payment_id: 'gateway-1',
        failure_reason: null,
      },
    });
  });

  test('marks a webhook-confirmed failed payment as failed', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'payment-1',
          status: 'pending',
          gateway_amount_minor: 5000,
          gateway_currency: 'SAR',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'payment-1', status: 'failed' }],
      });
    const res = createResponse();

    await handleMoyasarWebhook({
      body: {
        data: {
          id: 'gateway-1',
          status: 'failed',
          amount: 5000,
          currency: 'SAR',
          created_at: '2026-08-05T09:00:00+03:00',
        },
      },
    }, res);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[1][1][0]).toBe('failed');
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
