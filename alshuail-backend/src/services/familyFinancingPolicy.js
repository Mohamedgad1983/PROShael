/**
 * Canonical fixed-price packages for family financing.
 *
 * Keep the fee policy server-owned. Mobile clients receive these values from
 * the eligibility endpoint and must not calculate or invent alternative fees.
 */
export const FAMILY_FINANCING_TIERS = Object.freeze([
  Object.freeze({ principal: 3000, fee: 500 }),
  Object.freeze({ principal: 6000, fee: 800 }),
  Object.freeze({ principal: 10000, fee: 1400 }),
]);

const asMoney = (value) => Math.round(Number(value) * 100) / 100;

export function normalizeFamilyFinancingTiers(rawTiers) {
  let tiers = rawTiers;
  if (typeof tiers === 'string') {
    try {
      tiers = JSON.parse(tiers);
    } catch {
      tiers = null;
    }
  }

  if (!Array.isArray(tiers)) {
    return FAMILY_FINANCING_TIERS.map((tier) => ({ ...tier }));
  }

  const normalized = tiers
    .map((tier) => ({
      principal: asMoney(tier?.principal),
      fee: asMoney(tier?.fee),
    }))
    .filter((tier) => tier.principal > 0 && tier.fee >= 0)
    .sort((left, right) => left.principal - right.principal);

  return normalized.length
    ? normalized
    : FAMILY_FINANCING_TIERS.map((tier) => ({ ...tier }));
}

export function resolveFamilyFinancingTier(principalAmount, rawTiers) {
  const principal = asMoney(principalAmount);
  const tier = normalizeFamilyFinancingTiers(rawTiers)
    .find((candidate) => candidate.principal === principal);

  if (!tier) {
    const error = new Error('يجب اختيار إحدى باقات التمويل المعتمدة: 3,000 أو 6,000 أو 10,000 ريال');
    error.code = 'INVALID_FINANCING_TIER';
    throw error;
  }

  return {
    ...tier,
    total: asMoney(tier.principal + tier.fee),
  };
}
