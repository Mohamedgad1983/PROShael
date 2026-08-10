import { describe, expect, test } from '@jest/globals';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL(
  '../../../migrations/20260811_financing_gateway_reversals.sql',
  import.meta.url
);
const migration = await readFile(migrationUrl, 'utf8');

describe('financing gateway reversal migration contract', () => {
  test('runs after every 20260810 gateway and reminder guard migration', () => {
    expect(migrationUrl.pathname).toContain('20260811_financing_gateway_reversals.sql');
    expect(migration).toContain('intentionally dated after the 20260810 gateway/reminder migrations');
  });

  test('keeps original allocations and reversal evidence append-only', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.financing_payment_reversals');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.financing_payment_reversal_allocations');
    expect(migration).toContain('Financing reversal evidence is append-only');
    expect(migration).toContain('Reversal allocation must exactly offset one original allocation');
    expect(migration).not.toMatch(/UPDATE\s+public\.financing_payment_allocations/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.financing_payment_allocations/i);
  });

  test('permits paid reversal only after exact full provider evidence and offset ledger', () => {
    expect(migration).toContain('Financing reversal requires exact full provider evidence');
    expect(migration).toContain("response_refunded IS DISTINCT FROM NEW.amount_minor");
    expect(migration).toContain('Partial financing refunds require quarantine and financial review');
    expect(migration).toContain('response_captured IS DISTINCT FROM NEW.amount_minor');
    expect(migration).toContain('Financing void evidence requires exact full captured amount and voided_at');
    expect(migration).toContain('public.financing_payment_has_exact_reversal');
    expect(migration).toContain("OLD.status = 'paid' AND exact_reversal");
    expect(migration).toContain("'installment_reversal_debit'");
    expect(migration).toContain('A settled financing payment requires exact full reversal evidence');
    expect(migration).toContain('A reversed financing payment is terminal financial evidence');
    expect(migration).toContain("OLD.status = 'paid'");
    expect(migration).toContain('NEW.status = reversal_row.target_payment_status');
  });

  test('preserves protocol-v2 prepared, submitted, and not-submitted semantics', () => {
    expect(migration).toContain('OLD.gateway_protocol_version = 2');
    expect(migration).toContain("OLD.gateway_status = 'prepared_v2'");
    expect(migration).toContain('OLD.gateway_submission_started_at IS NULL');
    expect(migration).toContain("NEW.gateway_status = 'not_submitted'");
    expect(migration).toContain('FINANCING_PROVIDER_FULL_REFUND');
    expect(migration).toContain('FINANCING_PROVIDER_FULL_VOID');
  });

  test('creates a fresh, auditable reminder generation after reopening', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS generation INTEGER NOT NULL DEFAULT 1');
    expect(migration).toContain('public.financing_reminder_generation_history');
    expect(migration).toContain('Financing reminder generation history is append-only');
    expect(migration).toContain('both its inbox idempotency identity and its provider collapse identity');
    expect(migration).not.toContain('CREATE OR REPLACE FUNCTION public.apply_financing_reminder_generation');
    expect(migration).not.toContain('CREATE OR REPLACE FUNCTION public.apply_financing_reminder_collapse_generation');
    expect(migration).toContain('DROP FUNCTION IF EXISTS public.apply_financing_reminder_generation');
    expect(migration).toContain('DROP FUNCTION IF EXISTS public.apply_financing_reminder_collapse_generation');
    expect(migration).not.toContain('DROP CONSTRAINT IF EXISTS financing_reminder_log_installment_id_reminder_type_key');
  });

  test('never mutates the subscription member balance', () => {
    expect(migration).not.toMatch(/UPDATE\s+(?:public\.)?members/i);
    expect(migration).not.toMatch(/current_balance\s*=/i);
    expect(migration).toContain('members.current_balance');
  });
});
