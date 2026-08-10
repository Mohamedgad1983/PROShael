import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();
const mockUploadDocument = jest.fn();
const mockDeleteDocument = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: mockGetClient,
}));
jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  DOCUMENT_CATEGORIES: { RECEIPTS: 'receipts' },
  uploadToSupabase: mockUploadDocument,
  deleteFromSupabase: mockDeleteDocument,
  getSignedUrl: jest.fn((filePath) => `/api/documents/file/signed-${encodeURIComponent(filePath)}`),
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const {
  approveBankTransfer,
  createBankTransferRequest,
  uploadReceipt,
} = await import('../../../src/services/bankTransferService.js');

const REQUESTER_ID = '11111111-1111-4111-8111-111111111111';
const BENEFICIARY_ID = '22222222-2222-4222-8222-222222222222';
const REVIEWER_ID = '33333333-3333-4333-8333-333333333333';
const DOCUMENT_ID = '44444444-4444-4444-8444-444444444444';
const TRANSFER_ID = '55555555-5555-4555-8555-555555555555';
const PAYMENT_ID = '66666666-6666-4666-8666-666666666666';

const archivedReceipt = {
  path: `${REQUESTER_ID}/receipts/receipt.pdf`,
  url: `/uploads/member-documents/${REQUESTER_ID}/receipts/receipt.pdf`,
  size: 123,
  type: 'application/pdf',
  filename: 'receipt.pdf',
  originalName: 'receipt.pdf',
};

const transfer = (overrides = {}) => ({
  id: TRANSFER_ID,
  requester_id: REQUESTER_ID,
  beneficiary_id: BENEFICIARY_ID,
  amount: '125.00',
  purpose: 'general',
  purpose_reference_id: null,
  receipt_document_id: DOCUMENT_ID,
  notes: '',
  status: 'pending',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('bank-transfer receipt archiving', () => {
  test('writes the receipt into the canonical private document store', async () => {
    const file = {
      buffer: Buffer.from('receipt'),
      originalname: 'receipt.pdf',
      mimetype: 'application/pdf',
      size: 123,
    };
    mockUploadDocument.mockResolvedValueOnce(archivedReceipt);

    const result = await uploadReceipt(file, REQUESTER_ID);

    expect(mockUploadDocument).toHaveBeenCalledWith(file, REQUESTER_ID, 'receipts');
    expect(result).toEqual(expect.objectContaining({
      path: archivedReceipt.path,
      originalName: 'receipt.pdf',
    }));
  });

  test('commits document metadata and request linkage in one transaction', async () => {
    const requester = { id: REQUESTER_ID, full_name: 'صاحب الطلب' };
    const beneficiary = { id: BENEFICIARY_ID, full_name: 'المستفيد' };
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [requester, beneficiary] })
        .mockResolvedValueOnce({ rows: [{ id: DOCUMENT_ID }] })
        .mockResolvedValueOnce({ rows: [transfer()] })
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValueOnce(client);

    const result = await createBankTransferRequest({
      requester_id: REQUESTER_ID,
      beneficiary_id: BENEFICIARY_ID,
      amount: 125,
      purpose: 'general',
      receipt: archivedReceipt,
      notes: 'إيصال اختبار',
    });

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query.mock.calls[2][0]).toContain('INSERT INTO documents_metadata');
    expect(client.query.mock.calls[3][0]).toContain('receipt_document_id');
    expect(client.query.mock.calls[3][1]).toContain(DOCUMENT_ID);
    expect(client.query).toHaveBeenLastCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({
      id: TRANSFER_ID,
      requester,
      beneficiary,
    }));
  });
});

describe('bank-transfer approval serialization and evidence', () => {
  test('legacy URL-only request fails closed before creating a payment', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [transfer({ receipt_document_id: null })] })
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValueOnce(client);

    await expect(approveBankTransfer(TRANSFER_ID, REVIEWER_ID)).rejects.toMatchObject({
      statusCode: 409,
      code: 'BANK_TRANSFER_RECEIPT_ARCHIVE_REQUIRED',
    });

    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO payments')))
      .toBe(false);
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
  });

  test('locks the request and copies its receipt link into the paid payment', async () => {
    const approvedTransfer = transfer({ status: 'approved' });
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [transfer()] })
        .mockResolvedValueOnce({ rows: [{ pg_advisory_xact_lock: '' }] })
        .mockResolvedValueOnce({ rows: [{ id: DOCUMENT_ID }] })
        .mockResolvedValueOnce({ rows: [approvedTransfer] })
        .mockResolvedValueOnce({ rows: [{ id: PAYMENT_ID, receipt_document_id: DOCUMENT_ID }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValueOnce(client);

    const result = await approveBankTransfer(TRANSFER_ID, REVIEWER_ID);

    expect(client.query.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(client.query.mock.calls[4][0]).toContain("status = 'pending'");
    expect(client.query.mock.calls[5][0]).toContain('receipt_document_id');
    expect(client.query.mock.calls[5][1]).toContain(DOCUMENT_ID);
    expect(client.query).toHaveBeenLastCalledWith('COMMIT');
    expect(result.payment).toEqual(expect.objectContaining({
      id: PAYMENT_ID,
      receipt_document_id: DOCUMENT_ID,
    }));
  });
});
