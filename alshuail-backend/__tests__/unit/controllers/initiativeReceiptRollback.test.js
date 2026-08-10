import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};
const mockUpload = jest.fn();
const mockDelete = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: jest.fn(),
  getClient: jest.fn(() => Promise.resolve(mockClient)),
}));

jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  uploadToSupabase: mockUpload,
  getSignedUrl: jest.fn((filePath) => `/uploads/member-documents/${filePath}`),
  deleteFromSupabase: mockDelete,
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: { isDevelopment: false },
}));

const { addContribution } = await import('../../../src/controllers/initiativesController.js');

const ACTIVITY_ID = 'f4fc6855-2f8c-4335-86d7-10e91d144dc3';
const MEMBER_ID = '33f37c38-30cc-44eb-a319-f1960883e311';
const REQUEST_ID = '33c65aec-65f7-4b70-b97c-e958177ecdd6';

const createResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
};

describe('initiative receipt transaction cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockResolvedValue({
      path: `${MEMBER_ID}/receipts/test-receipt.jpg`,
      size: 20,
      type: 'image/jpeg',
    });
    mockDelete.mockResolvedValue(true);
  });

  test('rolls back the transaction and deletes the receipt when metadata insert fails', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('FROM activity_contributions ac')) {
        return { rows: [] };
      }
      if (sql.includes('FROM initiative_donations d')) {
        return { rows: [] };
      }
      if (sql.includes('FROM activities') && sql.includes('FOR UPDATE')) {
        return { rows: [] };
      }
      if (sql.includes('FROM initiatives') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: ACTIVITY_ID,
            status: 'active',
            title: 'مبادرة اختبار',
            end_date: null,
            min_contribution: 50,
            max_contribution: 50000,
          }],
        };
      }
      if (sql.includes('SELECT id, full_name, phone, email FROM members')) {
        return { rows: [{ id: MEMBER_ID, full_name: 'عضو اختبار' }] };
      }
      if (sql.includes('INSERT INTO documents_metadata')) {
        throw new Error('document metadata insert failed');
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const req = {
      params: { id: ACTIVITY_ID },
      body: {
        amount: 100,
        client_request_id: REQUEST_ID,
      },
      user: { id: MEMBER_ID, role: 'member' },
      file: {
        originalname: 'test-receipt.jpg',
        mimetype: 'image/jpeg',
        size: 20,
        buffer: Buffer.from('test initiative receipt'),
      },
      get: jest.fn(() => null),
    };
    const res = createResponse();

    await addContribution(req, res);

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockDelete).toHaveBeenCalledWith(
      `${MEMBER_ID}/receipts/test-receipt.jpg`
    );
    expect(mockClient.release).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
