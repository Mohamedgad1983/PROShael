import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};
const mockUpload = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  getClient: jest.fn(() => Promise.resolve(mockClient))
}));

jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  uploadToSupabase: mockUpload,
  getSignedUrl: jest.fn((path) => `/uploads/member-documents/${path}`),
  deleteFromSupabase: jest.fn()
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    error: jest.fn(),
    warn: jest.fn()
  }
}));

const { uploadLegacyInitiativeReceipt } = await import(
  '../../../src/controllers/initiativeReceiptCompatibilityController.js'
);

const memberId = '33f37c38-30cc-44eb-a319-f1960883e311';
const activityId = 'f4fc6855-2f8c-4335-86d7-10e91d144dc3';

const createResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res)
  };
  return res;
};

describe('legacy initiative receipt compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('links the old iOS activityId upload to the latest pending contribution', async () => {
    mockUpload.mockResolvedValue({
      path: `${memberId}/receipts/receipt.jpg`,
      size: 1200,
      type: 'image/jpeg'
    });

    mockClient.query.mockImplementation((sql, params) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      if (sql.includes('FROM activity_contributions ac')) {
        expect(params).toEqual([activityId, memberId]);
        return {
          rows: [{
            id: 'contribution-1',
            reference_number: 'CT-2026-TEST',
            initiative_title: 'عانية زواج أحمد'
          }]
        };
      }
      if (sql.includes('INSERT INTO documents_metadata')) {
        return { rows: [{ id: 'document-1' }] };
      }
      if (sql.includes('UPDATE activity_contributions')) {
        expect(params).toEqual(['document-1', 'contribution-1', memberId]);
        return { rows: [] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const req = {
      body: { activityId },
      user: { id: memberId },
      files: [{
        originalname: 'receipt.jpg',
        mimetype: 'image/jpeg',
        size: 1200,
        buffer: Buffer.from('receipt')
      }]
    };
    const res = createResponse();

    await uploadLegacyInitiativeReceipt(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        contribution_id: 'contribution-1',
        receipt_document_id: 'document-1',
        source_type: 'activity'
      })
    }));
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  test('does not fall through to a subscription receipt when no contribution exists', async () => {
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
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const res = createResponse();
    await uploadLegacyInitiativeReceipt({
      body: { activityId },
      user: { id: memberId },
      files: [{ originalname: 'receipt.jpg' }]
    }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.stringContaining('مساهمة معلقة')
    }));
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
