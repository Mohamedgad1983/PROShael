import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockGetClient = jest.fn();
const mockUpload = jest.fn();
const mockDelete = jest.fn();
const mockTransitionStatus = jest.fn();
const mockDispatchStatusNotification = jest.fn();
const mockRequireEvidence = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: jest.fn(),
  getClient: mockGetClient,
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  deleteFromSupabase: mockDelete,
  getSignedUrl: jest.fn(),
  LOAN_DOCUMENT_ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png'],
  uploadToSupabase: mockUpload,
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
  transitionStatus: mockTransitionStatus,
  dispatchStatusNotification: mockDispatchStatusNotification,
}));
jest.unstable_mockModule('../../../src/services/loanDocumentEvidenceService.js', () => ({
  LOAN_DOCUMENT_EVIDENCE_ERROR_CODE: 'LOAN_DOCUMENT_EVIDENCE_INVALID',
  requireValidLoanDocumentEvidence: mockRequireEvidence,
}));
jest.unstable_mockModule('../../../src/services/statusHistoryService.js', () => ({
  getStatusHistory: jest.fn(),
  recordStatusChange: jest.fn(),
}));
jest.unstable_mockModule('../../../src/services/financingRepaymentService.js', () => ({
  FINANCING_PROGRAM: { FAMILY: 'family_financing' },
  createRepaymentPlanInTransaction: jest.fn(),
  defaultFirstDueDate: jest.fn(),
  getRepaymentPlanByRequest: jest.fn(),
  isFinancingRepaymentEnabled: jest.fn(),
  resolveLoanDisbursementTerms: jest.fn(),
  validateInstallmentCount: jest.fn(),
}));
jest.unstable_mockModule('../../../src/utils/hijriDateUtils.js', () => ({
  HijriDateManager: { convertToHijri: jest.fn() },
}));

const {
  broujConfirmFee,
  broujUploadNajiz,
} = await import('../../../src/controllers/adminLoansController.js');

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

const workflowCases = [
  {
    label: 'Najiz',
    handler: broujUploadNajiz,
    status: 'forwarded_to_brouj',
    file: { originalname: 'najiz.jpg' },
    storedPath: 'loan-1/loan-najiz/new.jpg',
  },
  {
    label: 'fee',
    handler: broujConfirmFee,
    status: 'najiz_uploaded',
    file: { originalname: 'fee.png' },
    storedPath: 'loan-1/loan-fee/new.png',
  },
];

const makeClient = (status) => {
  const statements = [];
  const client = {
    query: jest.fn((sql) => {
      const statement = String(sql);
      statements.push(statement);
      if (statement.includes('SELECT id, status FROM loan_requests')) {
        return { rows: [{ id: 'loan-1', status }] };
      }
      return { rows: [] };
    }),
    release: jest.fn(),
    statements,
  };
  return client;
};

describe('Brouj document workflow atomicity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDelete.mockResolvedValue(true);
    mockDispatchStatusNotification.mockResolvedValue({ success: true });
  });

  test.each(workflowCases)(
    '$label invalid required evidence is rejected before upload or document INSERT',
    async ({ handler, status, file }) => {
      const client = makeClient(status);
      mockGetClient.mockResolvedValue(client);
      mockRequireEvidence.mockRejectedValue(Object.assign(
        new Error('Loan document evidence is invalid'),
        { code: 'LOAN_DOCUMENT_EVIDENCE_INVALID' }
      ));
      const res = responseRecorder();

      await handler({
        params: { id: 'loan-1' },
        user: { id: 'brouj-1', role: 'brouj_partner' },
        file,
      }, res);

      expect(res.statusCode).toBe(409);
      expect(res.body).toMatchObject({ code: 'LOAN_DOCUMENT_EVIDENCE_INVALID' });
      expect(mockUpload).not.toHaveBeenCalled();
      expect(client.statements.some((sql) => sql.includes('INSERT INTO loan_request_documents'))).toBe(false);
      expect(mockTransitionStatus).not.toHaveBeenCalled();
      expect(mockDispatchStatusNotification).not.toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    }
  );

  test.each(workflowCases)(
    '$label downstream transition failure rolls back metadata and removes only its new file',
    async ({ handler, status, file, storedPath }) => {
      const client = makeClient(status);
      mockGetClient.mockResolvedValue(client);
      mockRequireEvidence.mockResolvedValue(true);
      mockUpload.mockResolvedValue({
        path: storedPath,
        size: 256,
        type: file.originalname.endsWith('.png') ? 'image/png' : 'image/jpeg',
      });
      mockTransitionStatus.mockRejectedValue(Object.assign(
        new Error('injected transition failure'),
        { code: 'ILLEGAL_TRANSITION' }
      ));
      const res = responseRecorder();

      await handler({
        params: { id: 'loan-1' },
        user: { id: 'brouj-1', role: 'brouj_partner' },
        file,
      }, res);

      expect(res.statusCode).toBe(409);
      expect(client.statements.some((sql) => sql.includes('INSERT INTO loan_request_documents'))).toBe(true);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.query).not.toHaveBeenCalledWith('COMMIT');
      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(mockDelete).toHaveBeenCalledWith(storedPath);
      expect(mockDispatchStatusNotification).not.toHaveBeenCalled();
      expect(client.release).toHaveBeenCalledTimes(1);
    }
  );
});
