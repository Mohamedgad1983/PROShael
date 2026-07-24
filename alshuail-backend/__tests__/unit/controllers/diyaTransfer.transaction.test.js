/**
 * Transaction/atomicity tests for transferDiyaToExpense (P1 money-write fix).
 *
 * Verifies the diya -> expense transfer:
 *  - runs inside BEGIN/COMMIT,
 *  - rolls back (and never commits) when the diya was already transferred
 *    (the double-spend guard, protected by SELECT ... FOR UPDATE),
 *  - rolls back and releases the client if a write throws mid-transaction.
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

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: { isDevelopment: false }
}));

jest.unstable_mockModule('../../../src/utils/hijriDateUtils.js', () => ({
  HijriDateManager: {
    convertToHijri: () => ({
      hijri_date_string: '1447-01-01',
      hijri_year: 1447,
      hijri_month: 1,
      hijri_day: 1,
      hijri_month_name: 'محرم'
    })
  }
}));

const { transferDiyaToExpense } = await import('../../../src/controllers/diyasController.js');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

// Build a mock pooled client whose query() dispatches on the SQL text.
const makeClient = (diyaRow, { failOn } = {}) => {
  const calls = [];
  const client = {
    query: jest.fn(async (sql) => {
      const text = String(sql);
      calls.push(text.trim().split('\n')[0].slice(0, 40));
      if (failOn && text.includes(failOn)) throw new Error(`boom: ${failOn}`);
      if (text.includes('FOR UPDATE')) return { rows: diyaRow ? [diyaRow] : [] };
      if (text.includes('INSERT INTO expenses')) return { rows: [{ id: 'exp-1' }] };
      return { rows: [], rowCount: 1 };
    }),
    release: jest.fn(),
    calls
  };
  return client;
};

const verbs = (client) => client.calls.map((c) => c.split(' ')[0]);

describe('transferDiyaToExpense — transactional integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The pooled query() is used only for the (non-txn) contributions sum.
    mockQuery.mockResolvedValue({ rows: [{ total: 0 }] });
  });

  test('already-transferred diya rolls back, never commits (double-spend guard)', async () => {
    const client = makeClient({ id: 'd1', status: 'transferred_to_expense', target_amount: 1000 });
    mockGetClient.mockResolvedValue(client);
    const res = makeRes();

    await transferDiyaToExpense({ params: { id: 'd1' }, user: { id: 'u1' }, body: {} }, res);

    const v = verbs(client);
    expect(v).toContain('BEGIN');
    expect(v).toContain('ROLLBACK');
    expect(v).not.toContain('COMMIT');
    expect(client.calls.some((c) => c.includes('INSERT INTO expenses'))).toBe(false);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('happy path commits the expense insert + activity update exactly once', async () => {
    const client = makeClient({ id: 'd2', status: 'active', target_amount: 1000, title_ar: 'دية' });
    mockGetClient.mockResolvedValue(client);
    const res = makeRes();

    await transferDiyaToExpense({ params: { id: 'd2' }, user: { id: 'u1' }, body: {} }, res);

    expect(client.calls.some((c) => c.includes('INSERT INTO expenses'))).toBe(true);
    expect(client.calls.some((c) => c.includes('UPDATE activities'))).toBe(true);
    const v = verbs(client);
    expect(v.filter((x) => x === 'COMMIT')).toHaveLength(1);
    expect(v).not.toContain('ROLLBACK');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('a write failing mid-transaction rolls back and releases the client', async () => {
    const client = makeClient(
      { id: 'd3', status: 'active', target_amount: 1000 },
      { failOn: 'INSERT INTO expenses' }
    );
    mockGetClient.mockResolvedValue(client);
    const res = makeRes();

    await transferDiyaToExpense({ params: { id: 'd3' }, user: { id: 'u1' }, body: {} }, res);

    const v = verbs(client);
    expect(v).toContain('ROLLBACK');
    expect(v).not.toContain('COMMIT');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
