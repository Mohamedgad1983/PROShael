import { describe, expect, test } from '@jest/globals';
import {
  FAMILY_FINANCING_TIERS,
  normalizeFamilyFinancingTiers,
  resolveFamilyFinancingTier,
} from '../../../src/services/familyFinancingPolicy.js';

describe('family financing fee policy', () => {
  test.each([
    [3000, 500, 3500],
    [6000, 800, 6800],
    [10000, 1400, 11400],
  ])('maps principal %i to fee %i and total %i', (principal, fee, total) => {
    expect(resolveFamilyFinancingTier(principal)).toEqual({ principal, fee, total });
  });

  test('rejects values outside the three approved packages', () => {
    expect(() => resolveFamilyFinancingTier(4500)).toThrow('باقات التمويل المعتمدة');
  });

  test('uses canonical values when database settings are malformed', () => {
    expect(normalizeFamilyFinancingTiers('not-json')).toEqual(FAMILY_FINANCING_TIERS);
    expect(normalizeFamilyFinancingTiers([{ principal: 0, fee: -1 }]))
      .toEqual(FAMILY_FINANCING_TIERS);
  });
});
