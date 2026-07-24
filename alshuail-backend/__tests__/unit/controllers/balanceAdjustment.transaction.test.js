/**
 * Transaction/atomicity tests for balanceAdjustmentController.adjustBalance (P1).
 *
 * Verifies the balance adjustment:
 *  - opens a transaction and locks the member row (SELECT ... FOR UPDATE),
 *  - commits the member update + both audit rows together on success,
 *  - rolls back (never commits) when the member is missing,
 *  - rolls back and releases the client if a write throws mid-transaction,
 *  - never opens a transaction when input validation fails.
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

const { adjustBalance } = await import('../../../src/controllers/balanceAdjustmentController.js');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const makeReq = (body) => ({
  body,
  user: { id: 'u1', email: 'admin@x.com', role: 'super_admin' },
  ip: '1.2.3.4',
  headers: { 'user-agent': 'jest' },
  connection: { remoteAddress: '1.2.3.4' }
});

const makeClient = (memberRow, { failOn } = {}) => {
  const calls = [];
  const client = {
    query: jest.fn(async (sql) => {
      const t = String(sql);
      calls.push(t.trim().split('\n')[0].slice(0, 45));
      if (failOn && t.includes(failOn)) throw new Error(`boom: ${failOn}`);
      if (t.includes('FOR UPDATE')) return { rows: memberRow ? [memberRow] : [] };
      if (t.includes('FROM subscriptions')) return { rows: [] };
      if (t.includes('INSERT INTO balance_adjustments')) return { rows: [{ id: 'adj-1' }] };
      return { rows: [], rowCount: 1 };
    }),
    release: jest.fn(),
    calls
  };
  return client;
};

const verbs = (c) => c.calls.map((x) => x.split(' ')[0]);

const validBody = { member_id: 'm1', adjustment_type: 'credit', amount: 100, reason: 'valid reason text' };
const memberRow = {
  id: 'm1', full_name: 'Test', membership_number: '123', balance: '0',
  payment_2021: 0, payment_2022: 0, payment_2023: 0, payment_2024: 0, payment_2025: 0
};

describe('adjustBalance — transactional integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  test('member not found rolls back, never commits (404)', async () => {
    const client = makeClient(null);
    mockGetClient.mockResolvedValue(client);
    const res = makeRes();

    await adjustBalance(makeReq(validBody), res);

    const v = verbs(client);
    expect(v).toContain('BEGIN');
    expect(v).toContain('ROLLBACK');
    expect(v).not.toContain('COMMIT');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('happy path commits member update + both audit rows once', async () => {
    const client = makeClient(memberRow);
    mockGetClient.mockResolvedValue(client);
    const res = makeRes();

    await adjustBalance(makeReq(validBody), res);

    expect(client.calls.some((c) => c.includes('UPDATE members'))).toBe(true);
    expect(client.calls.some((c) => c.includes('INSERT INTO balance_adjustments'))).toBe(true);
    expect(client.calls.some((c) => c.includes('INSERT INTO financial_audit_trail'))).toBe(true);
    const v = verbs(client);
    expect(v.filter((x) => x === 'COMMIT')).toHaveLength(1);
    expect(v).not.toContain('ROLLBACK');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('a write failing mid-transaction rolls back and releases (500)', async () => {
    const client = makeClient(memberRow, { failOn: 'INSERT INTO balance_adjustments' });
    mockGetClient.mockResolvedValue(client);
    const res = makeRes();

    await adjustBalance(makeReq(validBody), res);

    const v = verbs(client);
    expect(v).toContain('ROLLBACK');
    expect(v).not.toContain('COMMIT');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('validation failure never opens a transaction (400)', async () => {
    const res = makeRes();

    await adjustBalance(makeReq({ member_id: 'm1', adjustment_type: 'credit', amount: 0, reason: 'x' }), res);

    expect(mockGetClient).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
