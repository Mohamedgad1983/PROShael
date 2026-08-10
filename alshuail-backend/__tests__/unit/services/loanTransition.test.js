/**
 * State-machine / transaction tests for loanService.transitionStatus.
 *
 * The loan lifecycle moves money (disbursement creates an expenses row), so the
 * important safety property is that ONLY allowed transitions run, inside a
 * transaction, with the row locked (FOR UPDATE). In particular a terminal loan
 * (completed/rejected/cancelled) must not transition again — that blocks e.g.
 * re-completing (double-disbursing) a loan.
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();
const mockRecordStatusChange = jest.fn();
const mockCreateMemberNotification = jest.fn();
const mockRequireValidLoanDocumentEvidence = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: mockGetClient
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }
}));
jest.unstable_mockModule('../../../src/services/statusHistoryService.js', () => ({
  recordStatusChange: mockRecordStatusChange,
}));
jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({
  createMemberNotification: mockCreateMemberNotification,
}));
jest.unstable_mockModule('../../../src/services/sequenceGenerator.js', () => ({ allocateSequence: jest.fn() }));
jest.unstable_mockModule('../../../src/services/loanDocumentEvidenceService.js', () => ({
  requireValidLoanDocumentEvidence: mockRequireValidLoanDocumentEvidence,
}));

const { transitionStatus, LOAN_STATUS } = await import('../../../src/services/loanService.js');

function makeClient(loanRow) {
  const calls = [];
  const client = {
    query: jest.fn((sql, params) => {
      const t = String(sql);
      calls.push(t.trim().split('\n')[0].slice(0, 40));
      if (t.includes('FOR UPDATE')) {return { rows: loanRow ? [loanRow] : [] };}
      if (t.includes('UPDATE loan_requests')) {return { rows: [{ id: loanRow?.id, status: params[0] }] };}
      return { rows: [] };
    }),
    release: jest.fn(),
    calls
  };
  return client;
}
const verbs = (c) => c.calls.map((x) => x.split(' ')[0]);

describe('loanService.transitionStatus — state machine + transaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMemberNotification.mockResolvedValue({ success: true, inAppStored: true, deliveredVia: 'in_app' });
    mockRequireValidLoanDocumentEvidence.mockResolvedValue(true);
  });

  test('missing loan rolls back and never commits (NOT_FOUND)', async () => {
    const client = makeClient(null);
    mockGetClient.mockResolvedValue(client);

    await expect(
      transitionStatus({ loanId: 'x', toStatus: LOAN_STATUS.UNDER_FUND_REVIEW, changedById: 'u1' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const v = verbs(client);
    expect(v).toContain('ROLLBACK');
    expect(v).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('illegal transition on a terminal loan is blocked — no UPDATE, rollback (double-disburse guard)', async () => {
    const client = makeClient({ id: 'L1', status: LOAN_STATUS.COMPLETED });
    mockGetClient.mockResolvedValue(client);

    await expect(
      transitionStatus({ loanId: 'L1', toStatus: LOAN_STATUS.COMPLETED, changedById: 'u1' })
    ).rejects.toMatchObject({ code: 'ILLEGAL_TRANSITION' });

    expect(client.calls.some((c) => c.includes('UPDATE loan_requests'))).toBe(false);
    const v = verbs(client);
    expect(v).toContain('ROLLBACK');
    expect(v).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('a valid transition updates + commits exactly once', async () => {
    const client = makeClient({ id: 'L2', status: LOAN_STATUS.SUBMITTED });
    mockGetClient.mockResolvedValue(client);

    const res = await transitionStatus({ loanId: 'L2', toStatus: LOAN_STATUS.UNDER_FUND_REVIEW, changedById: 'u1' });

    expect(client.calls.some((c) => c.includes('UPDATE loan_requests'))).toBe(true);
    const v = verbs(client);
    expect(v.filter((x) => x === 'COMMIT')).toHaveLength(1);
    expect(v).not.toContain('ROLLBACK');
    expect(res).toMatchObject({ status: LOAN_STATUS.UNDER_FUND_REVIEW });
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('an already-forwarded row with invalid evidence cannot advance or create side effects', async () => {
    const client = makeClient({ id: 'L-stale', status: LOAN_STATUS.FORWARDED_TO_BROUJ });
    mockGetClient.mockResolvedValue(client);
    mockRequireValidLoanDocumentEvidence.mockRejectedValue(
      Object.assign(new Error('safe evidence failure'), { code: 'LOAN_DOCUMENT_EVIDENCE_INVALID' })
    );

    await expect(transitionStatus({
      loanId: 'L-stale',
      toStatus: LOAN_STATUS.BROUJ_PROCESSING,
      changedById: 'brouj-1',
    })).rejects.toMatchObject({ code: 'LOAN_DOCUMENT_EVIDENCE_INVALID' });

    expect(mockRequireValidLoanDocumentEvidence).toHaveBeenCalledWith({
      client,
      loanId: 'L-stale',
      requiredDocumentTypes: [],
    });
    expect(client.calls.some((call) => call.includes('UPDATE loan_requests'))).toBe(false);
    expect(mockRecordStatusChange).not.toHaveBeenCalled();
    expect(mockCreateMemberNotification).not.toHaveBeenCalled();
    expect(verbs(client)).toContain('ROLLBACK');
    expect(verbs(client)).not.toContain('COMMIT');
  });

  test.each(['missing', 'corrupt'])(
    '%s Najiz evidence blocks the transition to ready without side effects',
    async () => {
      const client = makeClient({
        id: 'L-najiz-invalid',
        status: LOAN_STATUS.NAJIZ_UPLOADED,
        admin_fee_collected: false,
      });
      mockGetClient.mockResolvedValue(client);
      mockRequireValidLoanDocumentEvidence.mockRejectedValue(Object.assign(
        new Error('safe evidence failure'),
        { code: 'LOAN_DOCUMENT_EVIDENCE_INVALID' }
      ));

      await expect(transitionStatus({
        loanId: 'L-najiz-invalid',
        toStatus: LOAN_STATUS.READY_FOR_DISBURSEMENT,
        changedById: 'brouj-1',
      })).rejects.toMatchObject({ code: 'LOAN_DOCUMENT_EVIDENCE_INVALID' });

      expect(mockRequireValidLoanDocumentEvidence).toHaveBeenCalledWith({
        client,
        loanId: 'L-najiz-invalid',
        requiredDocumentTypes: ['najiz_acknowledgment'],
      });
      expect(client.calls.some((call) => call.includes('UPDATE loan_requests'))).toBe(false);
      expect(mockRecordStatusChange).not.toHaveBeenCalled();
      expect(mockCreateMemberNotification).not.toHaveBeenCalled();
      expect(verbs(client)).toContain('ROLLBACK');
      expect(verbs(client)).not.toContain('COMMIT');
    }
  );

  test('legacy fee-collected row cannot advance without Najiz and fee receipt evidence', async () => {
    const client = makeClient({
      id: 'L-legacy-fee',
      status: LOAN_STATUS.FEE_COLLECTED,
      admin_fee_collected: true,
    });
    mockGetClient.mockResolvedValue(client);
    mockRequireValidLoanDocumentEvidence.mockRejectedValue(Object.assign(
      new Error('safe evidence failure'),
      { code: 'LOAN_DOCUMENT_EVIDENCE_INVALID' }
    ));

    await expect(transitionStatus({
      loanId: 'L-legacy-fee',
      toStatus: LOAN_STATUS.READY_FOR_DISBURSEMENT,
      changedById: 'admin-1',
    })).rejects.toMatchObject({ code: 'LOAN_DOCUMENT_EVIDENCE_INVALID' });

    expect(mockRequireValidLoanDocumentEvidence).toHaveBeenCalledWith({
      client,
      loanId: 'L-legacy-fee',
      requiredDocumentTypes: ['najiz_acknowledgment', 'fee_receipt'],
    });
    expect(client.calls.some((call) => call.includes('UPDATE loan_requests'))).toBe(false);
    expect(mockRecordStatusChange).not.toHaveBeenCalled();
    expect(verbs(client)).toContain('ROLLBACK');
  });

  test('new no-fee path advances with base and Najiz evidence only', async () => {
    const client = makeClient({
      id: 'L-no-fee',
      status: LOAN_STATUS.NAJIZ_UPLOADED,
      admin_fee_collected: false,
    });
    mockGetClient.mockResolvedValue(client);

    await expect(transitionStatus({
      loanId: 'L-no-fee',
      toStatus: LOAN_STATUS.READY_FOR_DISBURSEMENT,
      changedById: 'brouj-1',
    })).resolves.toMatchObject({ status: LOAN_STATUS.READY_FOR_DISBURSEMENT });

    expect(mockRequireValidLoanDocumentEvidence).toHaveBeenCalledWith({
      client,
      loanId: 'L-no-fee',
      requiredDocumentTypes: ['najiz_acknowledgment'],
    });
    expect(client.calls.some((call) => call.includes('UPDATE loan_requests'))).toBe(true);
    expect(verbs(client)).toContain('COMMIT');
    expect(verbs(client)).not.toContain('ROLLBACK');
  });

  test('an existing transaction defers commit, rollback, release, and notification to its caller', async () => {
    const client = makeClient({ id: 'L-outer', status: LOAN_STATUS.FORWARDED_TO_BROUJ });

    const updated = await transitionStatus({
      loanId: 'L-outer',
      toStatus: LOAN_STATUS.BROUJ_PROCESSING,
      changedById: 'brouj-1',
      client,
    });

    expect(updated).toMatchObject({ id: 'L-outer', status: LOAN_STATUS.BROUJ_PROCESSING });
    expect(verbs(client)).not.toContain('BEGIN');
    expect(verbs(client)).not.toContain('COMMIT');
    expect(verbs(client)).not.toContain('ROLLBACK');
    expect(client.release).not.toHaveBeenCalled();
    expect(mockRecordStatusChange).toHaveBeenCalledTimes(1);
    expect(mockCreateMemberNotification).not.toHaveBeenCalled();
  });
});
