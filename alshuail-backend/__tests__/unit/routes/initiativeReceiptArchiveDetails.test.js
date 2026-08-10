import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease = jest.fn();
const mockGetSignedUrl = jest.fn();
const mockPersistMemberNotification = jest.fn();
const mockSendPushNotification = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: mockGetClient,
}));

jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({
  persistIdempotentMemberNotification: mockPersistMemberNotification,
  sendPushNotification: mockSendPushNotification,
}));

jest.unstable_mockModule('../../../src/middleware/auth.js', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', role: 'admin' };
    next();
  },
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const { default: initiativesEnhancedRouter } = await import(
  '../../../src/routes/initiativesEnhanced.js'
);

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/initiatives-enhanced', initiativesEnhancedRouter);

const INITIATIVE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('initiative details receipt archive metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClient.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
    mockGetSignedUrl.mockReturnValue('/api/documents/file/signed-receipt-token');
  });

  test('returns an absolute signed receipt URL without exposing a raw storage path', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('FROM users')) {
        return {
          rows: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', role: 'admin' }],
        };
      }
      throw new Error(`Unexpected authorization SQL: ${sql}`);
    });
    mockClientQuery.mockImplementation((sql) => {
      const statement = String(sql).trim();
      if (statement === 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'
        || statement === 'COMMIT'
        || statement === 'ROLLBACK') {
        return { rows: [] };
      }
      if (statement === 'SELECT * FROM initiatives WHERE id = $1') {
        return {
          rows: [{
            id: INITIATIVE_ID,
            target_amount: 1000,
            current_amount: 100,
            status: 'active',
          }],
        };
      }
      if (sql.includes('FROM initiative_donations d')) {
        expect(sql).toContain('LEFT JOIN documents_metadata dm');
        expect(sql).toContain("dm.status = 'active'");
        expect(sql).toContain('dm.member_id = d.member_id');
        expect(sql).toContain("dm.category = 'receipts'");
        return {
          rows: [
            {
              id: 'donation-1',
              member_id: 'member-1',
              amount: '100.00',
              status: 'pending',
              approved_by: null,
              approval_date: null,
              receipt_document_id: 'document-1',
              receipt_url: 'member-1/receipts/receipt.jpg',
              _receipt_metadata_id: 'document-1',
              _receipt_storage_path: 'member-1/receipts/receipt.jpg',
              _receipt_original_name: 'receipt.jpg',
              _receipt_file_size: 1234,
              _receipt_mime_type: 'image/jpeg',
              donor: { id: 'member-1', full_name: 'عضو اختبار' },
            },
            {
              id: 'legacy-partial-donation',
              member_id: 'member-1',
              amount: '900.00',
              status: 'pending',
              approved_by: 'legacy-reviewer-without-time',
              approval_date: null,
              receipt_document_id: null,
              donor: { id: 'member-1', full_name: 'عضو اختبار' },
            },
          ],
        };
      }
      throw new Error(`Unexpected report SQL: ${sql}`);
    });

    const response = await request(app)
      .get(`/api/initiatives-enhanced/${INITIATIVE_ID}/details`)
      .set('Host', 'attacker.example')
      .set('X-Forwarded-Proto', 'https');

    expect(response.status).toBe(200);
    expect(mockClientQuery).toHaveBeenNthCalledWith(
      1,
      'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'
    );
    expect(mockClientQuery.mock.calls.some(([sql]) => String(sql).trim() === 'COMMIT')).toBe(true);
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(mockGetSignedUrl).toHaveBeenCalledWith('member-1/receipts/receipt.jpg');
    expect(response.body.donations[0]).toEqual(expect.objectContaining({
      receipt_document_id: 'document-1',
      receipt_url: 'https://api.alshailfund.com/api/documents/file/signed-receipt-token',
      receipt_document: expect.objectContaining({
        id: 'document-1',
        receipt_url: 'https://api.alshailfund.com/api/documents/file/signed-receipt-token',
      }),
    }));
    expect(response.body.donations[0]).not.toHaveProperty('receipt_file_path');
    expect(response.body.donations[0].receipt_document).not.toHaveProperty('file_path');
    expect(response.text).not.toContain('member-1/receipts/receipt.jpg');
    expect(response.body.donations[0].receipt_url).not.toContain('/uploads/');
    expect(response.body.donations[0].review_state).toBe('pending');
    expect(response.body.donations[1].review_state).toBe('inconsistent');
    expect(response.body.stats.approvedAmount).toBe(0);
  });
});
