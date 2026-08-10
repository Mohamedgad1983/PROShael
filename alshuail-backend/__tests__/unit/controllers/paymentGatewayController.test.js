import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
}));

jest.unstable_mockModule('../../../src/services/moyasarService.js', () => ({
  fetchMoyasarPayment: jest.fn(),
  getMoyasarGatewayOperationalReadiness: jest.fn().mockResolvedValue({ ready: true, reasons: [] }),
  getMoyasarPublicCheckoutConfig: jest.fn(),
  isMoyasarEnabledForIos: jest.fn(),
  sanitizeMoyasarPaymentEvidence: jest.fn((value) => value),
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

const paymentRow = (overrides = {}) => ({
  id: 'payment-1',
  payer_id: 'member-1',
  beneficiary_id: 'member-1',
  status: 'pending',
  gateway_protocol_version: 2,
  gateway_status: 'prepared_v2',
  gateway_submission_started_at: null,
  ...overrides,
});

describe('protocol-v2 cancelGatewaySession safety contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 404 when the retained payment identity does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = createResponse();

    await cancelGatewaySession(createRequest(), res);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'لم يتم العثور على جلسة الدفع',
    });
  });

  test('returns 403 before mutation when a member does not own the identity', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [paymentRow({ payer_id: 'member-2', beneficiary_id: 'member-2' })],
    });
    const res = createResponse();

    await cancelGatewaySession(createRequest(), res);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'ليس لديك الصلاحية للوصول إلى جلسة الدفع',
    });
  });

  test('returns 409 without mutation for an already processed payment', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [paymentRow({ status: 'paid', gateway_status: 'paid' })],
    });
    const res = createResponse();

    await cancelGatewaySession(createRequest(), res);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'لا يمكن إلغاء جلسة دفع تمت معالجتها',
    });
  });

  test('replays an already not-submitted terminalization idempotently', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [paymentRow({ status: 'cancelled', gateway_status: 'not_submitted' })],
    });
    const res = createResponse();

    await cancelGatewaySession(createRequest(), res);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        payment_id: 'payment-1',
        status: 'cancelled',
        gateway_status: 'not_submitted',
        released: true,
        idempotent_replay: true,
      },
    });
  });
});
