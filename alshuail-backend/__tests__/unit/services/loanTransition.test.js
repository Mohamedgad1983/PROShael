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

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: mockGetClient
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }
}));
jest.unstable_mockModule('../../../src/services/statusHistoryService.js', () => ({ recordStatusChange: jest.fn() }));
jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({ sendPushNotification: jest.fn() }));
jest.unstable_mockModule('../../../src/services/sequenceGenerator.js', () => ({ allocateSequence: jest.fn() }));

const { transitionStatus, LOAN_STATUS } = await import('../../../src/services/loanService.js');

function makeClient(loanRow) {
  const calls = [];
  const client = {
    query: jest.fn(async (sql, params) => {
      const t = String(sql);
      calls.push(t.trim().split('\n')[0].slice(0, 40));
      if (t.includes('FOR UPDATE')) return { rows: loanRow ? [loanRow] : [] };
      if (t.includes('UPDATE loan_requests')) return { rows: [{ id: loanRow?.id, status: params[0] }] };
      return { rows: [] };
    }),
    release: jest.fn(),
    calls
  };
  return client;
}
const verbs = (c) => c.calls.map((x) => x.split(' ')[0]);

describe('loanService.transitionStatus — state machine + transaction', () => {
  beforeEach(() => jest.clearAllMocks());

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
});
