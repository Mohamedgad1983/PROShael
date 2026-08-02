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

const { cancelGatewaySession } = await import('../../../src/controllers/paymentGatewayController.js');

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
    expect(mockQuery.mock.calls[1][0]).toContain("SET status = 'cancelled'");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 'payment-1', status: 'cancelled' },
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
