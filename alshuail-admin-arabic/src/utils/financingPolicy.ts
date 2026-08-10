export interface ApprovedFinancingTier {
  principal: number;
  fee: number;
}

export const APPROVED_FINANCING_TIERS: readonly ApprovedFinancingTier[] = Object.freeze([
  Object.freeze({ principal: 3000, fee: 450 }),
  Object.freeze({ principal: 6000, fee: 750 }),
  Object.freeze({ principal: 10000, fee: 1050 }),
]);

export const isApprovedFinancingPrincipal = (value: number): boolean =>
  APPROVED_FINANCING_TIERS.some((tier) => tier.principal === value);

/**
 * Return the same local calendar day next month, clamped to that month's end.
 * This avoids JavaScript's `setMonth` overflow (for example Jan 31 → Mar 3)
 * and mirrors the repayment schedule policy enforced by the API.
 */
export const nextMonthClampedDate = (from: Date = new Date()): string => {
  const sourceYear = from.getFullYear();
  const sourceMonth = from.getMonth();
  const sourceDay = from.getDate();
  const targetMonthStart = new Date(Date.UTC(sourceYear, sourceMonth + 1, 1));
  const targetYear = targetMonthStart.getUTCFullYear();
  const targetMonth = targetMonthStart.getUTCMonth();
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(sourceDay, lastDay);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${targetYear}-${pad(targetMonth + 1)}-${pad(targetDay)}`;
};
