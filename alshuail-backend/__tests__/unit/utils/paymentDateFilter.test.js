import {
  PAYMENT_REPORTING_TIMEZONE,
  appendPaymentReceivedDateFilters,
  normalizePaymentReceivedDateRange,
  paymentReceivedDateSelect
} from '../../../src/utils/paymentDateFilter.js';

describe('paymentDateFilter', () => {
  test('accepts a complete inclusive date range', () => {
    expect(normalizePaymentReceivedDateRange({
      start_date: '2026-08-01',
      end_date: '2026-08-04'
    })).toEqual({ startDate: '2026-08-01', endDate: '2026-08-04' });
  });

  test('accepts one-sided ranges and report aliases', () => {
    expect(normalizePaymentReceivedDateRange({ date_from: '2026-08-01' }))
      .toEqual({ startDate: '2026-08-01', endDate: null });
    expect(normalizePaymentReceivedDateRange({ date_to: '2026-08-04' }))
      .toEqual({ startDate: null, endDate: '2026-08-04' });
  });

  test('rejects malformed and impossible dates', () => {
    expect(() => normalizePaymentReceivedDateRange({ start_date: '04/08/2026' }))
      .toThrow('YYYY-MM-DD');
    expect(() => normalizePaymentReceivedDateRange({ end_date: '2026-02-30' }))
      .toThrow('غير صالح');
  });

  test('rejects a reversed range', () => {
    expect(() => normalizePaymentReceivedDateRange({
      start_date: '2026-08-05',
      end_date: '2026-08-04'
    })).toThrow('تاريخ البداية');
  });

  test('builds Kuwait-aware inclusive SQL boundaries', () => {
    const conditions = ['p.status = $1'];
    const params = ['pending'];
    const next = appendPaymentReceivedDateFilters({
      conditions,
      params,
      paramIndex: 2,
      startDate: '2026-08-01',
      endDate: '2026-08-04'
    });

    expect(next).toBe(4);
    expect(params).toEqual(['pending', '2026-08-01', '2026-08-04']);
    expect(conditions[1]).toContain(`AT TIME ZONE '${PAYMENT_REPORTING_TIMEZONE}'`);
    expect(conditions[1]).toContain('>= ($2');
    expect(conditions[2]).toContain("INTERVAL '1 day'");
    expect(conditions[2]).toContain('< (($3');
  });

  test('serializes the received day as a stable date-only string', () => {
    const sql = paymentReceivedDateSelect();
    expect(sql).toContain('TO_CHAR');
    expect(sql).toContain(`AT TIME ZONE '${PAYMENT_REPORTING_TIMEZONE}'`);
    expect(sql).toContain("'YYYY-MM-DD'");
  });
});
