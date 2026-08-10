import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockGetClient = jest.fn();
const mockRequireValidLoanDocumentEvidence = jest.fn();
const mockCreateRepaymentPlan = jest.fn();
const mockRecordStatusChange = jest.fn();
const mockDispatchStatusNotification = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: jest.fn(),
  getClient: mockGetClient,
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  deleteFromSupabase: jest.fn(),
  getSignedUrl: jest.fn(),
  LOAN_DOCUMENT_ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png'],
  uploadToSupabase: jest.fn(),
}));
jest.unstable_mockModule('../../../src/services/loanService.js', () => ({
  LOAN_STATUS: {
    READY_FOR_DISBURSEMENT: 'ready_for_disbursement',
    COMPLETED: 'completed',
  },
  transitionStatus: jest.fn(),
  dispatchStatusNotification: mockDispatchStatusNotification,
}));
jest.unstable_mockModule('../../../src/services/loanDocumentEvidenceService.js', () => ({
  LOAN_DOCUMENT_EVIDENCE_ERROR_CODE: 'LOAN_DOCUMENT_EVIDENCE_INVALID',
  requireValidLoanDocumentEvidence: mockRequireValidLoanDocumentEvidence,
}));
jest.unstable_mockModule('../../../src/services/statusHistoryService.js', () => ({
  getStatusHistory: jest.fn(),
  recordStatusChange: mockRecordStatusChange,
}));
jest.unstable_mockModule('../../../src/services/financingRepaymentService.js', () => ({
  FINANCING_PROGRAM: { FAMILY: 'family_financing' },
  createRepaymentPlanInTransaction: mockCreateRepaymentPlan,
  defaultFirstDueDate: jest.fn().mockReturnValue('2026-09-01'),
  getRepaymentPlanByRequest: jest.fn(),
  isFinancingRepaymentEnabled: jest.fn().mockReturnValue(true),
  resolveLoanDisbursementTerms: jest.fn(),
  validateInstallmentCount: jest.fn().mockReturnValue(12),
}));
jest.unstable_mockModule('../../../src/utils/hijriDateUtils.js', () => ({
  HijriDateManager: { convertToHijri: jest.fn() },
}));

const { recordDisbursement } = await import('../../../src/controllers/adminLoansController.js');

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

describe('loan disbursement evidence guard', () => {
  beforeEach(() => jest.clearAllMocks());

  test('missing or corrupt Najiz evidence rolls back before any disbursement mutation', async () => {
    const sqlCalls = [];
    const loan = {
      id: 'loan-ready-1',
      status: 'ready_for_disbursement',
      member_id: 'member-1',
      admin_fee_collected: false,
    };
    const client = {
      query: jest.fn((sql) => {
        sqlCalls.push(String(sql));
        if (String(sql).includes('SELECT * FROM loan_requests')) {return { rows: [loan] };}
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValue(client);
    mockRequireValidLoanDocumentEvidence.mockRejectedValue(Object.assign(
      new Error('Loan document evidence is invalid'),
      { code: 'LOAN_DOCUMENT_EVIDENCE_INVALID' }
    ));
    const res = responseRecorder();

    await recordDisbursement({
      params: { id: loan.id },
      body: { amount: 3000, installment_count: 12, first_due_date: '2026-09-01' },
      user: { id: 'admin-1', role: 'financial_manager' },
    }, res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ code: 'LOAN_DOCUMENT_EVIDENCE_INVALID' });
    expect(mockRequireValidLoanDocumentEvidence).toHaveBeenCalledWith({
      client,
      loanId: loan.id,
      requiredDocumentTypes: ['najiz_acknowledgment'],
    });
    expect(sqlCalls.some((sql) => /INSERT INTO expenses|UPDATE loan_requests/.test(sql))).toBe(false);
    expect(mockCreateRepaymentPlan).not.toHaveBeenCalled();
    expect(mockRecordStatusChange).not.toHaveBeenCalled();
    expect(mockDispatchStatusNotification).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('legacy admin-fee loan requires its fee receipt before disbursement', async () => {
    const sqlCalls = [];
    const loan = {
      id: 'loan-ready-legacy-fee',
      status: 'ready_for_disbursement',
      member_id: 'member-1',
      admin_fee_collected: true,
    };
    const client = {
      query: jest.fn((sql) => {
        sqlCalls.push(String(sql));
        if (String(sql).includes('SELECT * FROM loan_requests')) {return { rows: [loan] };}
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValue(client);
    mockRequireValidLoanDocumentEvidence.mockRejectedValue(Object.assign(
      new Error('Loan document evidence is invalid'),
      { code: 'LOAN_DOCUMENT_EVIDENCE_INVALID' }
    ));
    const res = responseRecorder();

    await recordDisbursement({
      params: { id: loan.id },
      body: { amount: 3000, installment_count: 12, first_due_date: '2026-09-01' },
      user: { id: 'admin-1', role: 'financial_manager' },
    }, res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ code: 'LOAN_DOCUMENT_EVIDENCE_INVALID' });
    expect(mockRequireValidLoanDocumentEvidence).toHaveBeenCalledWith({
      client,
      loanId: loan.id,
      requiredDocumentTypes: ['najiz_acknowledgment', 'fee_receipt'],
    });
    expect(sqlCalls.some((sql) => /INSERT INTO expenses|UPDATE loan_requests/.test(sql))).toBe(false);
    expect(mockCreateRepaymentPlan).not.toHaveBeenCalled();
    expect(mockRecordStatusChange).not.toHaveBeenCalled();
    expect(mockDispatchStatusNotification).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
