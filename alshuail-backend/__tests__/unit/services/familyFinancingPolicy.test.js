import { describe, expect, test } from '@jest/globals';
import {
  FAMILY_FINANCING_TERMS_AR,
  FAMILY_FINANCING_TERMS_VERSION,
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

  test('keeps the complete base acknowledgment and app settlement clause versioned', () => {
    expect(FAMILY_FINANCING_TERMS_VERSION).toBe('family_financing_terms_ar_v2_2026-08-02');
    expect(FAMILY_FINANCING_TERMS_AR).toContain('مؤسسة بروز الريادة');
    expect(FAMILY_FINANCING_TERMS_AR).toContain('ألتزم باستلام السلعة فور جهوزيتها');
    expect(FAMILY_FINANCING_TERMS_AR).toContain('إخلاء مسؤولية صندوق الشعيل');
    expect(FAMILY_FINANCING_TERMS_AR).toContain('السداد المبكر لكامل المبلغ المتبقي عبر التطبيق');
    expect(FAMILY_FINANCING_TERMS_AR).not.toContain('Apple Pay');
  });
});
