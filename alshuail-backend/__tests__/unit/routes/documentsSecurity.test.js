import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockUploadToStorage = jest.fn();
const mockDeleteFromStorage = jest.fn();
const mockGetSignedUrl = jest.fn((filePath) => `/uploads/member-documents/${filePath}`);
const mockReadSignedDocument = jest.fn();
const mockLog = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

jest.unstable_mockModule('../../../src/middleware/auth.js', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = JSON.parse(req.get('x-test-user'));
    next();
  },
}));

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
}));

jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  upload: {
    single: () => (req, _res, next) => {
      if (req.get('x-test-file') === 'present') {
        req.file = {
          buffer: Buffer.from('test receipt'),
          originalname: 'receipt.pdf',
          mimetype: 'application/pdf',
          size: 12,
        };
      }
      next();
    },
  },
  uploadToSupabase: mockUploadToStorage,
  deleteFromSupabase: mockDeleteFromStorage,
  getSignedUrl: mockGetSignedUrl,
  readSignedDocument: mockReadSignedDocument,
  DOCUMENT_CATEGORIES: {
    RECEIPTS: 'receipts',
    OTHER: 'other',
  },
  CATEGORY_TRANSLATIONS: {
    receipts: 'إيصالات الدفع',
    other: 'أخرى',
  },
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: mockLog,
}));

const { default: documentsRouter } = await import('../../../src/routes/documents.js');

const app = express();
app.use(express.json());
app.use('/api/documents', documentsRouter);

const asUser = (id, role = 'member') => JSON.stringify({ id, role });

describe('document archive authorization and upload rollback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not let a member list another member documents', async () => {
    const response = await request(app)
      .get('/api/documents/member/member-b')
      .set('x-test-user', asUser('member-a'));

    expect(response.status).toBe(403);
    expect(response.body).toEqual(expect.objectContaining({ success: false }));
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  test('serves a valid signed document without authentication and disables caching', async () => {
    mockReadSignedDocument.mockResolvedValueOnce({
      buffer: Buffer.from('signed document'),
      filename: 'receipt.pdf',
    });

    const response = await request(app).get('/api/documents/file/valid-signed-token');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/pdf/);
    expect(response.headers['cache-control']).toBe('private, no-store, max-age=0');
    expect(response.headers.pragma).toBe('no-cache');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(mockReadSignedDocument).toHaveBeenCalledWith('valid-signed-token');
  });

  test('rejects an invalid signed document token without logging the token', async () => {
    const tokenError = new Error('invalid');
    tokenError.code = 'DOCUMENT_TOKEN_INVALID';
    mockReadSignedDocument.mockRejectedValueOnce(tokenError);

    const response = await request(app).get('/api/documents/file/sensitive-invalid-token');

    expect(response.status).toBe(403);
    expect(response.headers['cache-control']).toBe('private, no-store, max-age=0');
    expect(response.body).toEqual(expect.objectContaining({ success: false }));
    expect(JSON.stringify(mockLog.warn.mock.calls)).not.toContain('sensitive-invalid-token');
  });

  test('normalizes identifier types when authorizing an owned download', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'document-1',
        member_id: 123,
        status: 'active',
        file_path: '123/receipts/receipt.pdf',
      }],
    });

    const response = await request(app)
      .get('/api/documents/document-1/download')
      .set('x-test-user', asUser('123'));

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/uploads/member-documents/123/receipts/receipt.pdf');
    expect(mockQuery.mock.calls[0][0]).toContain("status = 'active'");
  });

  test('does not expose a soft-deleted document through the download route', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .get('/api/documents/deleted-document/download')
      .set('x-test-user', asUser('member-a'));

    expect(response.status).toBe(404);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  test('removes the physical file when metadata persistence fails', async () => {
    mockUploadToStorage.mockResolvedValueOnce({
      path: 'member-a/receipts/uploaded-receipt.pdf',
      size: 12,
      type: 'application/pdf',
    });
    mockQuery.mockRejectedValueOnce(new Error('metadata insert failed'));
    mockDeleteFromStorage.mockResolvedValueOnce(true);

    const response = await request(app)
      .post('/api/documents/upload')
      .set('x-test-user', asUser('member-a'))
      .set('x-test-file', 'present')
      .send({ title: 'إيصال', category: 'receipts' });

    expect(response.status).toBe(500);
    expect(mockDeleteFromStorage).toHaveBeenCalledWith(
      'member-a/receipts/uploaded-receipt.pdf'
    );
  });

  test('does not treat an arbitrary non-member role as an archive administrator', async () => {
    const response = await request(app)
      .post('/api/documents/upload')
      .set('x-test-user', asUser('witness-a', 'committee_witness'))
      .set('x-test-file', 'present')
      .send({
        member_id: 'member-b',
        title: 'مستند غير مصرح',
        category: 'other',
      });

    expect(response.status).toBe(403);
    expect(mockUploadToStorage).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('does not delete a receipt already referenced as financial evidence', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'receipt-document',
          member_id: 'member-a',
          status: 'active',
          category: 'receipts',
          file_path: 'member-a/receipts/paid.pdf',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ is_financial_evidence: true }] });

    const response = await request(app)
      .delete('/api/documents/receipt-document')
      .set('x-test-user', asUser('member-a'));

    expect(response.status).toBe(409);
    expect(response.body).toEqual(expect.objectContaining({
      code: 'FINANCIAL_EVIDENCE_IMMUTABLE',
    }));
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[1][0]).toContain('bank_transfer_requests');
    expect(mockDeleteFromStorage).not.toHaveBeenCalled();
  });

  test('does not let a member request another member archive statistics', async () => {
    const response = await request(app)
      .get('/api/documents/stats/overview?member_id=member-b')
      .set('x-test-user', asUser('member-a'));

    expect(response.status).toBe(403);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
