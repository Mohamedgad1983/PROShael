import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockUpload = jest.fn();
const mockDelete = jest.fn();
const mockCheckEligibility = jest.fn();
const mockValidatePayload = jest.fn();
const mockCreateRequest = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: jest.fn(),
}));

jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  uploadToSupabase: mockUpload,
  deleteFromSupabase: mockDelete,
}));

jest.unstable_mockModule('../../../src/services/marriageSupportService.js', () => ({
  MARRIAGE_STATUS: {
    SUBMITTED: 'submitted',
    UNDER_COMMITTEE_REVIEW: 'under_committee_review',
    CANCELLED: 'cancelled',
  },
  SIGNER_ROLE: { BENEFICIARY: 'beneficiary' },
  checkEligibility: mockCheckEligibility,
  validateRequestPayload: mockValidatePayload,
  createRequest: mockCreateRequest,
  transitionStatus: jest.fn(),
  recordSignature: jest.fn(),
}));

jest.unstable_mockModule('../../../src/services/marriageSupportPdf.js', () => ({
  streamMarriageSupportPdf: jest.fn(),
}));

jest.unstable_mockModule('../../../src/services/statusHistoryService.js', () => ({
  getStatusHistory: jest.fn(),
}));

jest.unstable_mockModule('../../../src/services/financingRepaymentService.js', () => ({
  FINANCING_PROGRAM: { MARRIAGE: 'marriage' },
  getRepaymentPlanByRequest: jest.fn(),
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const { create } = await import('../../../src/controllers/marriageSupportController.js');

const MEMBER_ID = '22222222-2222-4222-8222-222222222222';
const CONTRACT_PATH = `${MEMBER_ID}/marriage-contract/contract.pdf`;

const createRequestObject = () => ({
  user: { id: MEMBER_ID, role: 'member' },
  body: {
    spouse_name_ar: 'زوجة اختبار',
    spouse_national_id: '1234567890',
    marriage_date: '2026-08-01',
  },
  file: {
    buffer: Buffer.from('test marriage contract'),
    originalname: 'contract.pdf',
    mimetype: 'application/pdf',
    size: 22,
  },
});

const createResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
};

describe('marriage contract upload lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckEligibility.mockResolvedValue({ ok: true });
    mockValidatePayload.mockResolvedValue(null);
    mockDelete.mockResolvedValue(true);
  });

  test('fails the whole request when a selected contract cannot be uploaded', async () => {
    mockUpload.mockRejectedValueOnce(new Error('storage unavailable'));
    const res = createResponse();

    await create(createRequestObject(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: 'MARRIAGE_CONTRACT_UPLOAD_FAILED',
    }));
    expect(mockCreateRequest).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  test('deletes the uploaded contract when request persistence fails', async () => {
    mockUpload.mockResolvedValueOnce({
      path: CONTRACT_PATH,
      size: 22,
      type: 'application/pdf',
    });
    mockCreateRequest.mockRejectedValueOnce(new Error('request insert failed'));
    const res = createResponse();

    await create(createRequestObject(), res);

    expect(mockDelete).toHaveBeenCalledWith(CONTRACT_PATH);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('persists the contract path and keeps the file after a successful request', async () => {
    mockUpload.mockResolvedValueOnce({
      path: CONTRACT_PATH,
      size: 22,
      type: 'application/pdf',
    });
    mockCreateRequest.mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      sequence_number: '2026-0001',
      marriage_contract_url: CONTRACT_PATH,
    });
    const res = createResponse();

    await create(createRequestObject(), res);

    expect(mockCreateRequest).toHaveBeenCalledWith(expect.objectContaining({
      memberId: MEMBER_ID,
      payload: expect.objectContaining({ marriage_contract_url: CONTRACT_PATH }),
    }));
    expect(mockDelete).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
