import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../../../migrations/20260818_harden_manual_payment_aliases.sql', import.meta.url),
  'utf8'
);

describe('manual/electronic payment alias boundary migration', () => {
  test.each([
    'app_payment',
    'apple_pay',
    'card',
    'credit_card',
    'knet',
    'moyasar',
    'online',
  ])('classifies %s as an electronic alias', (method) => {
    expect(migration).toContain(`'${method}'`);
  });

  test('requires the exact prepared protocol-v2 Moyasar shape on insert', () => {
    expect(migration).toContain("NEW.gateway_protocol_version = 2");
    expect(migration).toContain("NEW.gateway_status = 'prepared_v2'");
    expect(migration).toContain("NEW.status = 'pending'");
    expect(migration).toContain("LOWER(BTRIM(COALESCE(NEW.gateway_provider, ''))) = 'moyasar'");
    expect(migration).toContain('NEW.gateway_amount_minor = ROUND(NEW.amount::numeric * 100)::bigint');
    expect(migration).toContain("UPPER(BTRIM(COALESCE(NEW.gateway_currency, ''))) = 'SAR'");
  });

  test('guards insert, update and delete without classifying manual methods', () => {
    expect(migration).toContain('BEFORE INSERT OR UPDATE OR DELETE ON public.payments');
    expect(migration).toContain('Historical bare electronic payment financial state is immutable');
    expect(migration).toContain(
      'Electronic, settled, or refund-required payment evidence cannot be hard-deleted'
    );
    expect(migration).toContain("'paid', 'refunded', 'pending_refund'");
    expect(migration).not.toMatch(/'cash'\s*,|'bank_transfer'\s*,|'check'\s*,/);
  });
});
