import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetSignedUrl = jest.fn((filePath) => `/api/documents/file/signed-${filePath}`);
const mockGetRepaymentPlan = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  getSignedUrl: mockGetSignedUrl,
  uploadToSupabase: jest.fn(),
}));

jest.unstable_mockModule('../../../src/services/loanService.js', () => ({
  LOAN_STATUS: {
    FORWARDED_TO_BROUJ: 'forwarded_to_brouj',
    BROUJ_PROCESSING: 'brouj_processing',
    NAJIZ_UPLOADED: 'najiz_uploaded',
    FEE_COLLECTED: 'fee_collected',
    READY_FOR_DISBURSEMENT: 'ready_for_disbursement',
    COMPLETED: 'completed',
  },
  checkLoanEligibility: jest.fn(),
  validateRequestPayload: jest.fn(),
  createLoanRequest: jest.fn(),
  transitionStatus: jest.fn(),
  dispatchStatusNotification: jest.fn(),
}));

jest.unstable_mockModule('../../../src/services/statusHistoryService.js', () => ({
  getStatusHistory: jest.fn().mockResolvedValue([]),
  recordStatusChange: jest.fn(),
}));

jest.unstable_mockModule('../../../src/services/financingRepaymentService.js', () => ({
  FINANCING_PROGRAM: { FAMILY: 'family_financing' },
  createRepaymentPlanInTransaction: jest.fn(),
  defaultFirstDueDate: jest.fn(),
  getRepaymentPlanByRequest: mockGetRepaymentPlan,
  isFinancingRepaymentEnabled: jest.fn(),
  resolveLoanDisbursementTerms: jest.fn(),
  validateInstallmentCount: jest.fn(),
}));

jest.unstable_mockModule('../../../src/utils/hijriDateUtils.js', () => ({
  HijriDateManager: { convertToHijri: jest.fn() },
}));

const { getLoan } = await import('../../../src/controllers/adminLoansController.js');
const { getMyLoan } = await import('../../../src/controllers/loansController.js');

const responseRecorder = () => {
  const res = {
    statusCode: 200,
    body: null,
    status: jest.fn((statusCode) => {
      res.statusCode = statusCode;
      return res;
    }),
    json: jest.fn((body) => {
      res.body = body;
      return res;
    }),
  };
  return res;
};

const loanFixture = {
  id: 'loan-1',
  member_id: 'member-1',
  sequence_number: 'LN-2026-001',
  status: 'submitted',
};

const documentFixture = {
  id: 'document-1',
  document_type: 'id_copy',
  file_path: 'member-1/loan-id_copy/id.pdf',
  original_name: 'id.pdf',
};

describe('loan detail document delivery contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRepaymentPlan.mockResolvedValue(null);
  });

  test('admin detail returns a short-lived signed_url without the raw storage path', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [loanFixture] })
      .mockResolvedValueOnce({ rows: [documentFixture] });
    const res = responseRecorder();

    await getLoan({ params: { id: loanFixture.id }, user: { id: 'admin-1', role: 'admin' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.documents).toEqual([expect.objectContaining({
      id: documentFixture.id,
      signed_url: '/api/documents/file/signed-member-1/loan-id_copy/id.pdf',
    })]);
    expect(res.body.data.documents[0]).not.toHaveProperty('file_path');
    expect(mockGetSignedUrl).toHaveBeenCalledWith(documentFixture.file_path);
  });

  test('member detail applies the same signed URL contract to an owned request', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [loanFixture] })
      .mockResolvedValueOnce({ rows: [documentFixture] });
    const res = responseRecorder();

    await getMyLoan({ params: { id: loanFixture.id }, user: { id: loanFixture.member_id } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.documents[0]).toEqual(expect.objectContaining({
      signed_url: '/api/documents/file/signed-member-1/loan-id_copy/id.pdf',
    }));
    expect(res.body.data.documents[0]).not.toHaveProperty('file_path');
  });
});
