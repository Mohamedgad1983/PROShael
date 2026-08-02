import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();
const mockAllocateSequence = jest.fn();
const mockRecordStatusChange = jest.fn();

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
  sendPushNotification: jest.fn(),
}));
jest.unstable_mockModule('../../../src/services/sequenceGenerator.js', () => ({
  allocateSequence: mockAllocateSequence,
}));

const { createLoanRequest, validateRequestPayload } = await import('../../../src/services/loanService.js');

const payload = {
  applicant_name: 'اختبار سياسة التمويل',
  national_id: '1234567890',
  date_of_birth: '1990-01-01',
  employment_type: 'government',
  monthly_salary: '10000',
  monthly_obligations: '1000',
  requested_item_amount: '6000',
};

describe('loan creation fixed financing policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({
      rows: [{
        id: 1,
        min_loan_amount: 3000,
        max_loan_amount: 10000,
        max_dbr: 0.5,
        allowed_employment_types: 'government',
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

    await createLoanRequest({ memberId: 'member-1', payload });

    expect(insertParameters[10]).toBe(6000); // requested_item_amount
    expect(insertParameters[11]).toBe(6800); // loan_amount / displayed total
    expect(insertParameters[14]).toBe(800);  // financing_fee_amount
    expect(insertParameters[15]).toBe(6800); // total_repayment_amount
    expect(JSON.parse(insertParameters[16])).toMatchObject({
      principal: 6000,
      fee: 800,
      total: 6800,
    });
    expect(client.query).toHaveBeenCalledWith('COMMIT');
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
});
