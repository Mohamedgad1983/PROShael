/**
 * Dynamic Amount Validator — unit tests
 *
 * Covers the Phase 2 migration from hardcoded MIN_AMOUNT to a per-category
 * floor pulled from the DB (subscription_plans) with Redis caching and a
 * hardcoded safety floor fallback.
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock the DB query function.
const mockQuery = jest.fn();
jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn()
}));

// Mock the cache service so we can control hit/miss.
const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();
const mockCacheDel = jest.fn();
jest.unstable_mockModule('../../../src/services/cacheService.js', () => ({
  default: {
    get: mockCacheGet,
    set: mockCacheSet,
    del: mockCacheDel
  }
}));

// Silence the logger.
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

const {
  getMinimumAmountForCategory,
  validateMinimumAmount,
  invalidateMinAmountCache,
  __internals
} = await import('../../../src/middleware/dynamicAmountValidator.js');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

beforeEach(() => {
  mockQuery.mockReset();
  mockCacheGet.mockReset();
  mockCacheSet.mockReset();
  mockCacheDel.mockReset();
  // Default: cache miss
  mockCacheGet.mockResolvedValue(null);
});

describe('getMinimumAmountForCategory', () => {
  test('subscription → reads MIN(base_amount) from active subscription_plans', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ min_amount: 50 }] });
    const min = await getMinimumAmountForCategory('subscription');
    expect(min).toBe(50);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toMatch(/subscription_plans/);
    expect(mockQuery.mock.calls[0][0]).toMatch(/is_active = TRUE/);
  });

  test('for_member uses the same subscription_plans query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ min_amount: 50 }] });
    const min = await getMinimumAmountForCategory('for_member');
    expect(min).toBe(50);
    expect(mockQuery.mock.calls[0][0]).toMatch(/subscription_plans/);
  });

  test('initiative and diya use absolute floor (no DB query)', async () => {
    const minInit = await getMinimumAmountForCategory('initiative');
    const minDiya = await getMinimumAmountForCategory('diya');
    expect(minInit).toBe(__internals.ABSOLUTE_FLOOR_SAR);
    expect(minDiya).toBe(__internals.ABSOLUTE_FLOOR_SAR);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('cache hit short-circuits the DB query', async () => {
    mockCacheGet.mockResolvedValueOnce(75);
    const min = await getMinimumAmountForCategory('subscription');
    expect(min).toBe(75);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('cache miss writes the computed value back to cache', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ min_amount: 100 }] });
    await getMinimumAmountForCategory('subscription');
    expect(mockCacheSet).toHaveBeenCalledWith('min_amount:subscription', 100, 300);
  });

  test('DB error returns absolute floor', async () => {
    mockQuery.mockRejectedValueOnce(new Error('db down'));
    const min = await getMinimumAmountForCategory('subscription');
    expect(min).toBe(__internals.ABSOLUTE_FLOOR_SAR);
  });

  test('null/NaN DB result returns absolute floor', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ min_amount: null }] });
    const min = await getMinimumAmountForCategory('subscription');
    expect(min).toBe(__internals.ABSOLUTE_FLOOR_SAR);
  });

  test('unknown category returns absolute floor', async () => {
    const min = await getMinimumAmountForCategory('bogus_category');
    expect(min).toBe(__internals.ABSOLUTE_FLOOR_SAR);
  });
});

describe('validateMinimumAmount middleware', () => {
  test('rejects request when amount is below dynamic minimum', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ min_amount: 50 }] });
    const mw = validateMinimumAmount('subscription');
    const req = { body: { amount: 25 } };
    const res = makeRes();
    const next = jest.fn();

    await mw(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.error_code).toBe('AMOUNT_BELOW_MINIMUM');
    expect(payload.min_amount).toBe(50);
    expect(payload.category).toBe('subscription');
  });

  test('allows request when amount meets dynamic minimum', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ min_amount: 50 }] });
    const mw = validateMinimumAmount('subscription');
    const req = { body: { amount: 50 } };
    const res = makeRes();
    const next = jest.fn();

    await mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.dynamicMinAmount).toBe(50);
  });

  test('passes through non-numeric amounts for the static validator to reject', async () => {
    const mw = validateMinimumAmount('subscription');
    const req = { body: { amount: 'hello' } };
    const res = makeRes();
    const next = jest.fn();

    await mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('coerces string numbers correctly', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ min_amount: 50 }] });
    const mw = validateMinimumAmount('subscription');
    const req = { body: { amount: '75' } };
    const res = makeRes();
    const next = jest.fn();

    await mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.dynamicMinAmount).toBe(50);
  });

  test('middleware errors fall through instead of blocking', async () => {
    mockQuery.mockRejectedValueOnce(new Error('boom'));
    const mw = validateMinimumAmount('subscription');
    const req = { body: { amount: 75 } };
    const res = makeRes();
    const next = jest.fn();

    await mw(req, res, next);

    // Falls back to ABSOLUTE_FLOOR_SAR (1), and 75 > 1 so next() is called
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('invalidateMinAmountCache', () => {
  test('deletes a single category key when called with an argument', async () => {
    await invalidateMinAmountCache('subscription');
    expect(mockCacheDel).toHaveBeenCalledWith('min_amount:subscription');
    expect(mockCacheDel).toHaveBeenCalledTimes(1);
  });

  test('deletes all known category keys when called without an argument', async () => {
    await invalidateMinAmountCache();
    expect(mockCacheDel).toHaveBeenCalledTimes(4);
    const keys = mockCacheDel.mock.calls.map((c) => c[0]);
    expect(keys).toEqual(
      expect.arrayContaining([
        'min_amount:subscription',
        'min_amount:for_member',
        'min_amount:initiative',
        'min_amount:diya'
      ])
    );
  });
});
