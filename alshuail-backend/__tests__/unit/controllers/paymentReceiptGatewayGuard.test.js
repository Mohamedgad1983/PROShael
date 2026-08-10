import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();
const mockJwtVerify = jest.fn();
const mockUpload = jest.fn();
const mockGetDocumentUrl = jest.fn();
const mockDelete = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: mockGetClient,
}));
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { verify: mockJwtVerify },
}));
jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    jwt: { secret: 'test-secret' },
    paymentGateway: {
      enabled: false,
      iosEnabled: false,
      provider: 'moyasar',
      currency: 'SAR',
      moyasar: {},
    },
  },
}));
jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  uploadToSupabase: mockUpload,
  getSignedUrl: mockGetDocumentUrl,
  deleteFromSupabase: mockDelete,
}));
jest.unstable_mockModule('../../../src/services/financingRepaymentService.js', () => ({
  settleFinancingPayment: jest.fn(),
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const {
  getPendingPayments,
  getPendingPaymentsStats,
  uploadPaymentReceipt,
} = await import(
  '../../../src/controllers/paymentsController.js'
);

const PAYMENT_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '22222222-2222-4222-8222-222222222222';
const DOCUMENT_ID = '33333333-3333-4333-8333-333333333333';

function payment(overrides = {}) {
  return {
    id: PAYMENT_ID,
    payer_id: MEMBER_ID,
    beneficiary_id: MEMBER_ID,
    payer_full_name: 'عضو الاختبار',
    status: 'pending',
    category: 'subscription',
    amount: '100.00',
    payment_method: 'bank_transfer',
    gateway_provider: null,
    gateway_payment_id: null,
    financing_plan_id: null,
    receipt_document_id: null,
    reference_number: 'TEST-RECEIPT-1',
    notes: '',
    ...overrides,
  };
}

function request() {
  return {
    headers: { authorization: 'Bearer token' },
    params: { paymentId: PAYMENT_ID },
    body: {},
    file: {
      originalname: 'receipt.jpg',
      mimetype: 'image/jpeg',
      size: 1234,
      buffer: Buffer.from('test'),
    },
  };
}

function response() {
  const res = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockJwtVerify.mockReturnValue({ id: MEMBER_ID });
  mockUpload.mockResolvedValue({
    path: `${MEMBER_ID}/receipts/test_receipt.jpg`,
    size: 1234,
    type: 'image/jpeg',
  });
  mockGetDocumentUrl.mockReturnValue('/api/documents/file/signed-token');
  mockDelete.mockResolvedValue(true);
});

describe('payment receipt gateway boundary', () => {
  test.each([
    ['list', getPendingPayments],
    ['stats', getPendingPaymentsStats],
  ])('admin pending %s excludes gateway and financing rows', async (_label, handler) => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = response();
    const req = {
      query: {},
      protocol: 'https',
      get: jest.fn(() => 'api.alshailfund.com'),
    };

    await handler(req, res);

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('p.financing_plan_id IS NULL');
    expect(sql).toContain("COALESCE(p.gateway_provider, '')");
    expect(sql).toContain('p.gateway_payment_id::text');
    expect(sql).toContain("NOT IN ('app_payment', 'apple_pay', 'card', 'credit_card', 'knet', 'moyasar', 'online')");
    expect(sql).toContain("NOT IN ('bank_transfer', 'transfer')");
    expect(sql).toContain('p.receipt_document_id IS NOT NULL');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('pending receipt list returns an absolute signed URL without exposing storage paths', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        ...payment({ receipt_document_id: DOCUMENT_ID }),
        receipt_file_path: `${MEMBER_ID}/receipts/test_receipt.jpg`,
        receipt_uploaded: true,
      }],
    });
    const res = response();
    const req = {
      query: {},
      protocol: 'https',
      get: jest.fn(() => 'api.alshailfund.com'),
    };

    await getPendingPayments(req, res);

    expect(mockGetDocumentUrl).toHaveBeenCalledWith(
      `${MEMBER_ID}/receipts/test_receipt.jpg`
    );
    const payload = res.json.mock.calls[0][0];
    expect(payload.data[0].receipt_url)
      .toBe('https://api.alshailfund.com/api/documents/file/signed-token');
    expect(payload.data[0]).not.toHaveProperty('receipt_file_path');
  });

  test('rejects a paid Moyasar payment before file or metadata writes', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [payment({
        status: 'paid',
        payment_method: 'apple_pay',
        gateway_provider: 'moyasar',
        gateway_payment_id: PAYMENT_ID,
      })],
    });
    const res = response();

    await uploadPaymentReceipt(request(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'PAYMENT_RECEIPT_NOT_ALLOWED',
    }));
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockGetClient).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  test('commits bank-transfer metadata and status linkage atomically', async () => {
    const row = payment();
    mockQuery.mockResolvedValueOnce({ rows: [row] });
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rows: [{ id: DOCUMENT_ID }] })
        .mockResolvedValueOnce({ rows: [{ ...row, status: 'pending_verification', receipt_document_id: DOCUMENT_ID }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValueOnce(client);
    const res = response();

    await uploadPaymentReceipt(request(), res);

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query.mock.calls[1][0]).toContain('FOR UPDATE OF p');
    expect(client.query.mock.calls[2][0]).toContain('INSERT INTO documents_metadata');
    expect(client.query.mock.calls[3][0]).toContain("IN ('bank_transfer', 'transfer')");
    expect(client.query).toHaveBeenLastCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(mockDelete).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('accepts the legacy transfer alias through the same archived-receipt workflow', async () => {
    const row = payment({ payment_method: 'transfer' });
    mockQuery.mockResolvedValueOnce({ rows: [row] });
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rows: [{ id: DOCUMENT_ID }] })
        .mockResolvedValueOnce({ rows: [{ ...row, status: 'pending_verification', receipt_document_id: DOCUMENT_ID }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValueOnce(client);
    const res = response();

    await uploadPaymentReceipt(request(), res);

    expect(client.query.mock.calls[3][0]).toContain("IN ('bank_transfer', 'transfer')");
    expect(client.query).toHaveBeenLastCalledWith('COMMIT');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('a concurrent approval rolls back metadata and removes the uploaded file', async () => {
    const initial = payment();
    mockQuery.mockResolvedValueOnce({ rows: [initial] });
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [payment({ status: 'paid' })] })
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValueOnce(client);
    const res = response();

    await uploadPaymentReceipt(request(), res);

    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO documents_metadata')))
      .toBe(false);
    expect(mockDelete).toHaveBeenCalledWith(`${MEMBER_ID}/receipts/test_receipt.jpg`);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'PAYMENT_RECEIPT_NOT_ALLOWED',
    }));
  });
});
