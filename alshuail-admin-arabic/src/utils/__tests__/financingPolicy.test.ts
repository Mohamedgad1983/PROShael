import {
  APPROVED_FINANCING_TIERS,
  isApprovedFinancingPrincipal,
  nextMonthClampedDate,
} from '../financingPolicy';

describe('family financing and marriage-support fee policy', () => {
  it('keeps the three approved packages and their exact fees', () => {
    expect(APPROVED_FINANCING_TIERS).toEqual([
      { principal: 3000, fee: 450 },
      { principal: 6000, fee: 750 },
      { principal: 10000, fee: 1050 },
    ]);
  });

  it('accepts only approved package principals', () => {
    expect(isApprovedFinancingPrincipal(3000)).toBe(true);
    expect(isApprovedFinancingPrincipal(6000)).toBe(true);
    expect(isApprovedFinancingPrincipal(10000)).toBe(true);
    expect(isApprovedFinancingPrincipal(4500)).toBe(false);
  });

  it('clamps the next due date to the end of shorter months', () => {
    expect(nextMonthClampedDate(new Date(2026, 0, 31, 12))).toBe('2026-02-28');
    expect(nextMonthClampedDate(new Date(2028, 0, 31, 12))).toBe('2028-02-29');
    expect(nextMonthClampedDate(new Date(2026, 11, 15, 12))).toBe('2027-01-15');
  });
});
