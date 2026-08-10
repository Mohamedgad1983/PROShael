import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: jest.fn(),
  getClient: jest.fn(() => Promise.resolve(mockClient))
}));

jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  uploadToSupabase: jest.fn(),
  getSignedUrl: jest.fn(),
  deleteFromSupabase: jest.fn()
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: { isDevelopment: false }
}));

const { updateContributionStatus } = await import(
  '../../../src/controllers/initiativesController.js'
);

const activityId = '3e44330a-0ffd-4b7d-9083-a08d97c8593a';
const contributionId = '69fa2971-18c9-4bbe-bfa6-39d0e30257e7';
const memberId = 'ccbdad27-f72e-4c03-a2e4-a0eb90dc05a5';
const receiptId = '3bd406e7-6a94-482c-a8a6-87a93622738c';

const response = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res)
  };
  return res;
};

const request = (status = 'confirmed') => ({
  params: { id: activityId, contributionId },
  body: { status, notes: 'تمت مراجعة الإيصال' }
});

const contribution = (overrides = {}) => ({
  id: contributionId,
  activity_id: activityId,
  member_id: memberId,
  amount: '100.00',
  payment_method: 'bank_transfer',
  receipt_document_id: receiptId,
  status: 'pending',
  ...overrides
});

describe('initiative contribution approval evidence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('locks evidence, confirms once, and rebuilds the activity total', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
      if (sql.includes('SELECT id FROM activities') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: activityId }] };
      }
      if (sql.includes('FROM activity_contributions') && sql.includes('FOR UPDATE')) {
        return { rows: [contribution()] };
      }
      if (sql.includes('pg_advisory_xact_lock')) return { rows: [{}] };
      if (sql.includes('FROM documents_metadata')) return { rows: [{ id: receiptId }] };
      if (sql.includes('UPDATE activity_contributions')) {
        return { rows: [contribution({ status: 'confirmed' })] };
      }
      if (sql.includes('UPDATE activities a')) return { rows: [] };
      if (sql.includes('SELECT id, full_name, phone, email FROM members')) {
        return { rows: [{ id: memberId, full_name: 'عضو اختبار' }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const res = response();
    await updateContributionStatus(request(), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ status: 'confirmed' })
    }));
    expect(mockClient.query.mock.calls.map(([sql]) => sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('pg_advisory_xact_lock'),
        expect.stringContaining('UPDATE activity_contributions'),
        expect.stringContaining('UPDATE activities a')
      ])
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  test('rejects confirmation when the archived receipt is missing', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('SELECT id FROM activities')) return { rows: [{ id: activityId }] };
      if (sql.includes('FROM activity_contributions')) {
        return { rows: [contribution({ receipt_document_id: null })] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const res = response();
    await updateContributionStatus(request(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'INITIATIVE_RECEIPT_REQUIRED'
    }));
    expect(mockClient.query.mock.calls.some(([sql]) => sql.includes('UPDATE activity_contributions'))).toBe(false);
  });

  test('rejects an unverified electronic contribution even if it has a file id', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('SELECT id FROM activities')) return { rows: [{ id: activityId }] };
      if (sql.includes('FROM activity_contributions')) {
        return { rows: [contribution({ payment_method: 'apple_pay' })] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const res = response();
    await updateContributionStatus(request(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'UNVERIFIED_INITIATIVE_PAYMENT_METHOD'
    }));
  });
});
