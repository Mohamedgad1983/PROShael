import { describe, expect, test } from '@jest/globals';
import {
  initiativeProgress,
  isUuid,
  normalizeInitiativeInput
} from '../../../src/utils/initiativeInput.js';

describe('initiative input contract', () => {
  test('creates an initiative without a financial target', () => {
    const result = normalizeInitiativeInput({
      title_ar: 'مبادرة اجتماعية',
      target_amount: '',
      min_contribution: '',
      max_contribution: '',
      start_date: '',
      end_date: '',
      status: 'active',
      id: 'not-accepted-from-client',
      created_by: 'not-accepted-from-client'
    });

    expect(result.errors).toEqual([]);
    expect(result.data).toEqual(expect.objectContaining({
      title_ar: 'مبادرة اجتماعية',
      target_amount: null,
      min_contribution: null,
      max_contribution: null,
      start_date: null,
      end_date: null,
      status: 'active'
    }));
    expect(result.data).not.toHaveProperty('id');
    expect(result.data).not.toHaveProperty('created_by');
  });

  test('keeps a valid optional target amount', () => {
    const result = normalizeInitiativeInput({
      title_ar: 'مبادرة مالية',
      target_amount: '12500.50'
    });

    expect(result.errors).toEqual([]);
    expect(result.data.target_amount).toBe(12500.5);
  });

  test('rejects invalid numeric and date values with Arabic messages', () => {
    const result = normalizeInitiativeInput({
      title_ar: 'مبادرة',
      target_amount: 'not-a-number',
      start_date: '2026-10-10',
      end_date: '2026-01-01'
    });

    expect(result.errors).toContain('المبلغ المستهدف يجب أن يكون رقماً موجباً أو صفراً');
    expect(result.errors).toContain('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
  });

  test('recognizes UUIDs without requiring them in the form', () => {
    expect(isUuid('a4ed4bc2-b61e-49ce-90c4-386b131d054e')).toBe(true);
    expect(isUuid('admin')).toBe(false);
    expect(isUuid('')).toBe(false);
  });

  test('returns no progress when there is no financial target', () => {
    expect(initiativeProgress(500, null)).toBeNull();
    expect(initiativeProgress(500, 0)).toBeNull();
    expect(initiativeProgress(500, 1000)).toBe(50);
  });
});
