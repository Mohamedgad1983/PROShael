import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockUploadReceipt = jest.fn();
const mockRemoveUploadedReceipt = jest.fn();
const mockCreateRequest = jest.fn();
const mockApprove = jest.fn();
const mockGetById = jest.fn();

jest.unstable_mockModule('../../../src/services/bankTransferService.js', () => ({
  uploadReceipt: mockUploadReceipt,
  removeUploadedReceipt: mockRemoveUploadedReceipt,
  createBankTransferRequest: mockCreateRequest,
  approveBankTransfer: mockApprove,
  getBankTransferRequests: jest.fn(),
  getBankTransferById: mockGetById,
  rejectBankTransfer: jest.fn(),
  getMemberTransferRequests: jest.fn(),
}));
jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: jest.fn(),
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const {
  approveTransfer,
  getBankTransfer,
  submitBankTransfer,
} = await import('../../../src/controllers/bankTransfersController.js');

const MEMBER_ID = '11111111-1111-4111-8111-111111111111';
const TRANSFER_ID = '22222222-2222-4222-8222-222222222222';

const response = () => {
  const res = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('bank transfer controller evidence failures', () => {
  test('removes the uploaded file if the metadata/request transaction fails', async () => {
    const receipt = {
      path: `${MEMBER_ID}/receipts/test.pdf`,
      url: '/uploads/member-documents/test.pdf',
      size: 20,
      type: 'application/pdf',
      originalName: 'test.pdf',
    };
    mockUploadReceipt.mockResolvedValueOnce(receipt);
    mockCreateRequest.mockRejectedValueOnce(Object.assign(
      new Error('تعذر أرشفة الإيصال'),
      { statusCode: 409, code: 'BANK_TRANSFER_RECEIPT_ARCHIVE_REQUIRED' }
    ));
    mockRemoveUploadedReceipt.mockResolvedValueOnce(true);
    const req = {
      user: { id: MEMBER_ID },
      file: { buffer: Buffer.from('x'), originalname: 'test.pdf' },
      body: {
        beneficiary_id: MEMBER_ID,
        amount: '100',
        purpose: 'general',
      },
    };
    const res = response();

    await submitBankTransfer(req, res);

    expect(mockRemoveUploadedReceipt).toHaveBeenCalledWith(receipt.path);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'BANK_TRANSFER_RECEIPT_ARCHIVE_REQUIRED',
    }));
  });

  test('returns a professional conflict for a concurrently reviewed request', async () => {
    mockApprove.mockRejectedValueOnce(Object.assign(
      new Error('تمت مراجعة هذا الطلب مسبقاً'),
      { statusCode: 409, code: 'BANK_TRANSFER_ALREADY_REVIEWED' }
    ));
    const req = {
      user: { id: MEMBER_ID },
      params: { id: TRANSFER_ID },
      body: {},
    };
    const res = response();

    await approveTransfer(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'BANK_TRANSFER_ALREADY_REVIEWED',
    }));
  });

  test('scopes member detail reads to the authenticated requester', async () => {
    mockGetById.mockResolvedValueOnce(null);
    const req = {
      user: { id: MEMBER_ID, role: 'member' },
      params: { id: TRANSFER_ID },
    };
    const res = response();

    await getBankTransfer(req, res);

    expect(mockGetById).toHaveBeenCalledWith(TRANSFER_ID, MEMBER_ID);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('keeps elevated detail reads global', async () => {
    mockGetById.mockResolvedValueOnce({ id: TRANSFER_ID });
    const req = {
      user: { id: MEMBER_ID, role: 'financial_manager' },
      params: { id: TRANSFER_ID },
    };
    const res = response();

    await getBankTransfer(req, res);

    expect(mockGetById).toHaveBeenCalledWith(TRANSFER_ID, null);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: { id: TRANSFER_ID },
    }));
  });
});
