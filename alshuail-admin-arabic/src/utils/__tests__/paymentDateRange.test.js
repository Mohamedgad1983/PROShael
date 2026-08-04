import {
  KUWAIT_TIMEZONE,
  formatPaymentReceivedAt,
  getPaymentDatePreset
} from '../paymentDateRange';

describe('paymentDateRange', () => {
  const now = new Date('2026-08-04T12:00:00Z');

  test('creates inclusive Kuwait date presets', () => {
    expect(getPaymentDatePreset('today', now)).toEqual({
      start: '2026-08-04',
      end: '2026-08-04'
    });
    expect(getPaymentDatePreset('last7', now)).toEqual({
      start: '2026-07-29',
      end: '2026-08-04'
    });
    expect(getPaymentDatePreset('month', now)).toEqual({
      start: '2026-08-01',
      end: '2026-08-04'
    });
  });

  test('uses Kuwait day at the UTC date boundary', () => {
    expect(getPaymentDatePreset('today', new Date('2026-08-03T22:30:00Z')))
      .toEqual({ start: '2026-08-04', end: '2026-08-04' });
  });

  test('formats received timestamps and handles invalid values', () => {
    expect(KUWAIT_TIMEZONE).toBe('Asia/Kuwait');
    expect(formatPaymentReceivedAt('2026-08-04T09:00:00Z')).not.toBe('غير محدد');
    expect(formatPaymentReceivedAt('invalid')).toBe('غير محدد');
  });
});
