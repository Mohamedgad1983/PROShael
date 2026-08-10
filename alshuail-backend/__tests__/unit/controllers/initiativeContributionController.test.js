import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

const mockQuery = jest.fn();
const mockUpload = jest.fn();
const mockDelete = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn(() => Promise.resolve(mockClient))
}));

jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  uploadToSupabase: mockUpload,
  getSignedUrl: jest.fn((path) => `/uploads/member-documents/${path}`),
  deleteFromSupabase: mockDelete
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: { isDevelopment: false }
}));

const { addContribution } = await import('../../../src/controllers/initiativesController.js');

const requestId = '33c65aec-65f7-4b70-b97c-e958177ecdd6';
const memberId = '33f37c38-30cc-44eb-a319-f1960883e311';
const activityId = 'f4fc6855-2f8c-4335-86d7-10e91d144dc3';

const createRequest = (overrides = {}) => ({
  params: { id: activityId },
  body: {
    amount: 100,
    notes: 'مساهمة اختبارية',
    client_request_id: requestId,
    member_id: 'spoofed-member-id'
  },
  user: { id: memberId, role: 'member' },
  file: {
    originalname: 'receipt.jpg',
    mimetype: 'image/jpeg',
    size: 16,
    buffer: Buffer.from('initiative receipt')
  },
  get: jest.fn(() => null),
  ...overrides
});

const createResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    set: jest.fn(() => res)
  };
  return res;
};

const empty = { rows: [] };

describe('initiative contribution lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockResolvedValue({
      path: `${memberId}/receipts/receipt.jpg`,
      size: 16,
      type: 'image/jpeg'
    });
    mockDelete.mockResolvedValue(true);
  });

  test('retires new legacy activity contributions before archiving a receipt', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return empty;
      }
      if (sql.includes('FROM activity_contributions ac')) {
        return empty;
      }
      if (sql.includes('FROM initiative_donations d')) {
        return empty;
      }
      if (sql.includes('FROM activities') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: activityId,
            status: 'active',
            title: 'عانية زواج أحمد',
            target_amount: null,
            current_amount: 0,
            end_date: null
          }]
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const req = createRequest();
    const res = createResponse();
    await addContribution(req, res);

    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: 'LEGACY_INITIATIVE_CONTRIBUTIONS_RETIRED'
    }));
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockClient.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO activity_contributions'))).toBe(false);
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  test('returns the existing row for the same client request id', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return empty;
      }
      if (sql.includes('FROM activity_contributions ac')) {
        return {
          rows: [{
            id: 'existing-contribution',
            activity_id: activityId,
            member_id: memberId,
            amount: '100.00',
            status: 'pending',
            source_type: 'activity',
            client_request_id: requestId
          }]
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const res = createResponse();
    await addContribution(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ id: 'existing-contribution' }),
      message: 'تم تسجيل هذه المساهمة مسبقاً'
    }));
    expect(mockClient.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO'))).toBe(false);
  });

  test('supports initiatives from the current initiatives table', async () => {
    mockClient.query.mockImplementation((sql, params) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return empty;
      }
      if (sql.includes('FROM activity_contributions ac')) {
        return empty;
      }
      if (sql.includes('FROM initiative_donations d')) {
        return empty;
      }
      if (sql.includes('FROM activities') && sql.includes('FOR UPDATE')) {
        return empty;
      }
      if (sql.includes('FROM initiatives') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: activityId,
            status: 'active',
            title: 'مبادرة حديثة',
            min_contribution: 50,
            max_contribution: 500,
            end_date: null
          }]
        };
      }
      if (sql.includes('SELECT id, full_name, phone, email FROM members')) {
        return { rows: [{ id: memberId, full_name: 'عضو اختبار' }] };
      }
      if (sql.includes('INSERT INTO documents_metadata')) {
        return { rows: [{ id: '8aba6b6b-fac8-45ef-9f50-9057a974ad13' }] };
      }
      if (sql.includes('INSERT INTO initiative_donations')) {
        expect(params[1]).toBe(memberId);
        return {
          rows: [{
            id: 'donation-1',
            initiative_id: activityId,
            member_id: memberId,
            amount: '100.00',
            payment_method: 'bank_transfer',
            client_request_id: requestId
          }]
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const res = createResponse();
    await addContribution(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ source_type: 'initiative' })
    }));
  });

  test('rejects an invalid amount before opening a database transaction', async () => {
    const res = createResponse();
    await addContribution(createRequest({
      body: { amount: 0, client_request_id: requestId }
    }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockClient.query).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'مبلغ المساهمة يجب أن يكون أكبر من صفر'
    });
  });

  test('rejects a new contribution without an archived receipt', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return empty;
      }
      if (sql.includes('FROM activity_contributions ac') || sql.includes('FROM initiative_donations d')) {
        return empty;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const res = createResponse();
    await addContribution(createRequest({ file: null }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'INITIATIVE_RECEIPT_REQUIRED'
    }));
    expect(mockUpload).not.toHaveBeenCalled();
  });

  test.each(['app_payment', 'apple_pay', 'card', 'moyasar'])(
    'rejects the unverified electronic method %s before opening a transaction',
    async (paymentMethod) => {
      const res = createResponse();
      await addContribution(createRequest({
        body: {
          amount: 100,
          payment_method: paymentMethod,
          client_request_id: requestId
        }
      }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'UNVERIFIED_INITIATIVE_PAYMENT_METHOD'
      }));
      expect(mockClient.query).not.toHaveBeenCalled();
    }
  );
});
