/**
 * Calculation-engine tests for marriageSupportService.calculateAndSnapshot.
 *
 * This is the math that decides how much money a member receives, so it is
 * worth locking down. Formula (see service header):
 *   initial_total       = contributions_sum + (previous_ananiyat_count × ananiyat_per_unit)
 *   after_discount      = initial_total × (1 - competition_discount_rate)
 *   competitive_balance = max(after_discount, marriage_support_minimum)
 *   final_amount        = competitive_balance + (additional_support_balance × multiplier) + special_ananiya_value
 *
 * Defaults (used when the settings row is absent): discount 0.25, minimum 10000,
 * per-unit 500, multiplier 1.5.
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
// Stub sibling services so importing the module doesn't drag in their trees.
jest.unstable_mockModule('../../../src/services/sequenceGenerator.js', () => ({ allocateSequence: jest.fn() }));
jest.unstable_mockModule('../../../src/services/statusHistoryService.js', () => ({ recordStatusChange: jest.fn() }));
jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({ sendPushNotification: jest.fn() }));

const { calculateAndSnapshot } = await import('../../../src/services/marriageSupportService.js');

// Wire mockQuery to dispatch on SQL; capture the params of the snapshot UPDATE.
// Empty settings row -> getSettings() returns the documented defaults.
function setup({ prevCount = 0, memberFound = true } = {}) {
  const captured = {};
  mockQuery.mockImplementation(async (sql, params) => {
    const t = String(sql);
    if (t.includes('FROM marriage_support_settings')) return { rows: [] };
    if (t.includes('SELECT member_id FROM marriage_support_requests')) {
      return { rows: memberFound ? [{ member_id: 'mem1' }] : [] };
    }
    if (t.includes('FROM payments')) return { rows: [{ n: prevCount }] };
    if (t.includes('UPDATE marriage_support_requests')) {
      // param order (1-indexed in SQL): $10 initial, $11 after, $12 competitive, $13 final
      captured.autoCount = params[1];
      captured.initial = params[9];
      captured.after = params[10];
      captured.competitive = params[11];
      captured.final = params[12];
      return { rows: [{ final_amount: params[12] }] };
    }
    return { rows: [] };
  });
  return captured;
}

describe('calculateAndSnapshot — marriage support payout math', () => {
  beforeEach(() => jest.clearAllMocks());

  test('computes the four amounts per the documented formula', async () => {
    const cap = setup();
    await calculateAndSnapshot({
      requestId: 'req1', contributionsSum: 20000, previousAnaniyatOverride: 4,
      additionalSupportBalance: 2000, specialAnaniyaValue: 1000
    });
    // initial = 20000 + 4*500 = 22000; after = 22000*0.75 = 16500;
    // competitive = max(16500,10000) = 16500; final = 16500 + 2000*1.5 + 1000 = 20500
    expect(cap.initial).toBeCloseTo(22000);
    expect(cap.after).toBeCloseTo(16500);
    expect(cap.competitive).toBeCloseTo(16500);
    expect(cap.final).toBeCloseTo(20500);
  });

  test('applies the marriage-support minimum floor', async () => {
    const cap = setup();
    await calculateAndSnapshot({ requestId: 'req2', contributionsSum: 1000, previousAnaniyatOverride: 0 });
    // initial = 1000; after = 750; competitive = max(750,10000) = 10000; final = 10000
    expect(cap.competitive).toBeCloseTo(10000);
    expect(cap.final).toBeCloseTo(10000);
  });

  test('uses the auto-counted previous-ananiyat when no override is given', async () => {
    const cap = setup({ prevCount: 6 });
    await calculateAndSnapshot({ requestId: 'req3', contributionsSum: 10000 });
    // effectiveCount = autoCount = 6; initial = 10000 + 6*500 = 13000;
    // after = 9750; competitive = max(9750,10000) = 10000
    expect(cap.autoCount).toBe(6);
    expect(cap.initial).toBeCloseTo(13000);
    expect(cap.competitive).toBeCloseTo(10000);
  });

  test('throws NOT_FOUND when the request does not exist (no snapshot written)', async () => {
    setup({ memberFound: false });
    await expect(
      calculateAndSnapshot({ requestId: 'missing', contributionsSum: 100 })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    // the UPDATE must never run
    const ranUpdate = mockQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE marriage_support_requests'));
    expect(ranUpdate).toBe(false);
  });
});
