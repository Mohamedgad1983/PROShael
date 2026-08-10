import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockUpload = jest.fn();
const mockDelete = jest.fn();
const mockValidateUpload = jest.fn();
const mockCreateLoanRequest = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  deleteFromSupabase: mockDelete,
  getSignedUrl: jest.fn(),
  LOAN_DOCUMENT_ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png'],
  uploadToSupabase: mockUpload,
  validateUploadedFile: mockValidateUpload,
}));
jest.unstable_mockModule('../../../src/services/loanService.js', () => ({
  LOAN_STATUS: { SUBMITTED: 'submitted', UNDER_FUND_REVIEW: 'under_fund_review', CANCELLED: 'cancelled' },
  checkLoanEligibility: jest.fn().mockResolvedValue({ ok: true }),
  validateRequestPayload: jest.fn().mockResolvedValue(null),
  createLoanRequest: mockCreateLoanRequest,
  transitionStatus: jest.fn(),
}));
jest.unstable_mockModule('../../../src/services/statusHistoryService.js', () => ({
  getStatusHistory: jest.fn(),
}));
jest.unstable_mockModule('../../../src/services/financingRepaymentService.js', () => ({
  FINANCING_PROGRAM: { FAMILY: 'family_financing' },
  getRepaymentPlanByRequest: jest.fn(),
}));

const { createLoan } = await import('../../../src/controllers/loansController.js');

const requestFixture = () => ({
  user: { id: 'member-1' },
  body: {},
  files: {
    id_copy: [{ originalname: 'id.jpg' }],
    salary_certificate: [{ originalname: 'salary.png' }],
    financial_statement: [{ originalname: 'statement.jpg' }],
  },
});

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

const stored = (path, type) => ({ path, size: 100, type });

describe('member loan creation atomic file compensation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateUpload.mockResolvedValue({ mimeType: 'image/jpeg', size: 100 });
    mockDelete.mockResolvedValue(true);
  });

  test('a second upload failure deletes only the first new file and never creates a loan', async () => {
    mockUpload
      .mockResolvedValueOnce(stored('member-1/loan-id/new-id.jpg', 'image/jpeg'))
      .mockRejectedValueOnce(new Error('injected second upload failure'));
    const res = responseRecorder();

    await createLoan(requestFixture(), res);

    expect(res.statusCode).toBe(500);
    expect(mockCreateLoanRequest).not.toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith('member-1/loan-id/new-id.jpg');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('a document INSERT transaction failure compensates all newly uploaded files', async () => {
    mockUpload
      .mockResolvedValueOnce(stored('member-1/loan-id/new-id.jpg', 'image/jpeg'))
      .mockResolvedValueOnce(stored('member-1/loan-salary/new-salary.png', 'image/png'))
      .mockResolvedValueOnce(stored('member-1/loan-statement/new-statement.jpg', 'image/jpeg'));
    mockCreateLoanRequest.mockRejectedValue(Object.assign(
      new Error('injected document insert failure'),
      { code: 'DOCUMENT_INSERT_FAILED' }
    ));
    const res = responseRecorder();

    await createLoan(requestFixture(), res);

    expect(res.statusCode).toBe(500);
    expect(mockDelete.mock.calls.map(([filePath]) => filePath)).toEqual([
      'member-1/loan-statement/new-statement.jpg',
      'member-1/loan-salary/new-salary.png',
      'member-1/loan-id/new-id.jpg',
    ]);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
