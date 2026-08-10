/**
 * Authoritative family-fund subscription policy.
 *
 * The closed subscription period is January 2021 through December 2025:
 * 60 months x SAR 50 = SAR 3,000 maximum subscription balance.
 */
export const SUBSCRIPTION_POLICY = Object.freeze({
  START_YEAR: 2021,
  END_YEAR: 2025,
  MONTHLY_FEE: 50,
  ANNUAL_FEE: 600,
  MAX_MONTHS: 60,
  MAX_BALANCE: 3000
});

export const toFiniteAmount = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const clampSubscriptionBalance = (value) => Math.min(
  SUBSCRIPTION_POLICY.MAX_BALANCE,
  Math.max(0, toFiniteAmount(value))
);

export const subscriptionMonthsFromBalance = (value) => Math.min(
  SUBSCRIPTION_POLICY.MAX_MONTHS,
  Math.floor(clampSubscriptionBalance(value) / SUBSCRIPTION_POLICY.MONTHLY_FEE)
);

export const remainingSubscriptionBalance = (value) => Math.max(
  0,
  SUBSCRIPTION_POLICY.MAX_BALANCE - clampSubscriptionBalance(value)
);

export const subscriptionStatusFromBalance = (value) => (
  clampSubscriptionBalance(value) >= SUBSCRIPTION_POLICY.MAX_BALANCE
    ? 'active'
    : 'overdue'
);
