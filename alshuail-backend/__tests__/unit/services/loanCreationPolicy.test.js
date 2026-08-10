import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();
const mockAllocateSequence = jest.fn();
const mockRecordStatusChange = jest.fn();
const mockRunAll = jest.fn();
const mockCreateMemberNotification = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: mockGetClient,
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../../src/services/statusHistoryService.js', () => ({
  recordStatusChange: mockRecordStatusChange,
}));
jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({
  createMemberNotification: mockCreateMemberNotification,
}));
jest.unstable_mockModule('../../../src/services/sequenceGenerator.js', () => ({
  allocateSequence: mockAllocateSequence,
}));
jest.unstable_mockModule('../../../src/services/eligibilityChecker.js', () => ({
  checkSubscriptionsPaid: jest.fn(),
  checkProfileComplete: jest.fn(),
  runAll: mockRunAll,
}));

const {
  checkLoanEligibility,
  createLoanRequest,
  validateRequestPayload,
} = await import('../../../src/services/loanService.js');
const {
  FAMILY_FINANCING_TERMS_AR,
  FAMILY_FINANCING_TERMS_VERSION,
} = await import('../../../src/services/familyFinancingPolicy.js');

const payload = {
  applicant_name: 'اختبار سياسة التمويل',
  national_id: '1234567890',
  date_of_birth: '1990-01-01',
  employment_type: 'government',
  monthly_salary: '10000',
  monthly_obligations: '1000',
  requested_item_amount: '6000',
  terms_version: FAMILY_FINANCING_TERMS_VERSION,
};

const documents = [
  ['id_copy', 'member-1/loan-id/id.jpg', 'image/jpeg', 'id.jpg'],
  ['salary_certificate', 'member-1/loan-salary/salary.png', 'image/png', 'salary.png'],
  ['financial_statement', 'member-1/loan-statement/statement.jpg', 'image/jpeg', 'statement.jpg'],
].map(([documentType, filePath, fileType, originalName]) => ({
  document_type: documentType,
  file_path: filePath,
  file_size: 1024,
  file_type: fileType,
  original_name: originalName,
}));

describe('loan creation fixed financing policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunAll.mockResolvedValue({ ok: true });
    mockQuery.mockResolvedValue({
      rows: [{
        id: 1,
        min_loan_amount: 3000,
        max_loan_amount: 10000,
        max_dbr: 0.5,
        allowed_employment_types: 'government',
        enabled: true,
        financing_tiers: [
          { principal: 3000, fee: 500 },
          { principal: 6000, fee: 800 },
          { principal: 10000, fee: 1400 },
        ],
      }],
    });
    mockAllocateSequence.mockResolvedValue({
      formatted: '2026-0001',
      year: 2026,
      sequenceInYear: 1,
    });
    mockCreateMemberNotification.mockResolvedValue({
      success: true,
      inAppStored: true,
      deliveredVia: 'in_app',
    });
  });

  test('eligibility publishes the exact versioned acknowledgment to the app', async () => {
    const result = await checkLoanEligibility('member-1');

    expect(result).toMatchObject({
      ok: true,
      settings: {
        terms_version: FAMILY_FINANCING_TERMS_VERSION,
        terms_text_ar: FAMILY_FINANCING_TERMS_AR,
      },
    });
  });

  test('snapshots principal, fixed fee, and total in one transaction', async () => {
    let insertParameters;
    const client = {
      query: jest.fn((sql, params) => {
        if (String(sql).includes('INSERT INTO loan_requests')) {
          insertParameters = params;
          return { rows: [{ id: 'loan-1', sequence_number: '2026-0001' }] };
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValue(client);

    await createLoanRequest({ memberId: 'member-1', payload, documents });

    expect(insertParameters[10]).toBe(6000); // requested_item_amount
    expect(insertParameters[11]).toBe(6750); // loan_amount / displayed total
    expect(insertParameters[14]).toBe(750);  // financing_fee_amount
    expect(insertParameters[15]).toBe(6750); // total_repayment_amount
    const termsSnapshot = JSON.parse(insertParameters[16]);
    expect(termsSnapshot).toMatchObject({
      principal: 6000,
      fee: 750,
      total: 6750,
      terms_version: FAMILY_FINANCING_TERMS_VERSION,
      terms_text_ar: FAMILY_FINANCING_TERMS_AR,
      early_settlement_via_app: true,
    });
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.query.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO loan_request_documents')))
      .toHaveLength(3);
    expect(mockRecordStatusChange).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('server validation rejects an amount that is not an approved package', async () => {
    const result = await validateRequestPayload({
      ...payload,
      requested_item_amount: '4500',
      terms_accepted: 'true',
    });

    expect(result).toMatchObject({ code: 'INVALID_FINANCING_TIER' });
  });

  test('a document INSERT failure rolls back the loan, document rows, and initial history', async () => {
    let documentInsertCount = 0;
    const client = {
      query: jest.fn((sql) => {
        const statement = String(sql);
        if (statement.includes('INSERT INTO loan_requests')) {
          return { rows: [{ id: 'loan-rollback', sequence_number: '2026-0001' }] };
        }
        if (statement.includes('INSERT INTO loan_request_documents')) {
          documentInsertCount += 1;
          if (documentInsertCount === 2) {throw new Error('injected document insert failure');}
        }
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    mockGetClient.mockResolvedValue(client);

    await expect(createLoanRequest({ memberId: 'member-1', payload, documents }))
      .rejects.toThrow('injected document insert failure');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(mockRecordStatusChange).not.toHaveBeenCalled();
    expect(mockCreateMemberNotification).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
