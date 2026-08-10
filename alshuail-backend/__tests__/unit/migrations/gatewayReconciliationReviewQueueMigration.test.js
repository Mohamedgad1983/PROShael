import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from '@jest/globals';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(
  currentDirectory,
  '../../../migrations/20260820_gateway_reconciliation_review_queue.sql'
);
const migration = fs.readFileSync(migrationPath, 'utf8');

describe('gateway reconciliation review queue migration', () => {
  test('is transactional, repeat-safe and append-only', () => {
    expect(migration.trim().startsWith('--')).toBe(true);
    expect(migration).toMatch(/BEGIN;/);
    expect(migration).toMatch(/COMMIT;/);
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.gateway_reconciliation_review_actions/);
    expect(migration).toMatch(/BEFORE UPDATE OR DELETE/);
    expect(migration).toMatch(/append-only/);
    expect(migration).toMatch(/enforce_gateway_reconciliation_resolved_disposition/);
    expect(migration).toMatch(/Resolved gateway reconciliation state cannot resume automation/);
  });

  test('binds every action to a payment, polymorphic super-admin actor and prior review state', () => {
    expect(migration).toMatch(/payment_id UUID NOT NULL REFERENCES public\.payments\(id\) ON DELETE RESTRICT/);
    expect(migration).toMatch(/actor_id UUID NOT NULL/);
    expect(migration).not.toMatch(/actor_id UUID NOT NULL REFERENCES public\.users/);
    expect(migration).toMatch(/actor_source IN \('users', 'members'\)/);
    expect(migration).toMatch(/enforce_gateway_reconciliation_review_actor/);
    expect(migration).toMatch(/FROM public\.members/);
    expect(migration).toMatch(/CHECK \(actor_role = 'super_admin'\)/);
    expect(migration).toMatch(/FROM public\.users[\s\S]*?is_active IS TRUE/);
    expect(migration).toMatch(/FROM public\.members[\s\S]*?is_active IS TRUE/);
    expect(migration).toMatch(/membership_status = 'active'/);
    expect(migration).toMatch(/suspended_at IS NULL/);
    expect(migration).toMatch(/reactivated_at >= suspended_at/);
    expect(migration).toMatch(/CHECK \(previous_last_result = 'review_required'\)/);
    expect(migration).toMatch(/action IN \('requeue', 'resolve'\)/);
  });

  test('requires a bounded meaningful Arabic rationale and stores no raw provider response', () => {
    expect(migration).toMatch(/char_length\(BTRIM\(reason\)\) BETWEEN 12 AND 500/);
    expect(migration).toMatch(/regexp_replace\(reason, '\[\^ء-ي\]'/);
    expect(migration).not.toContain('provider_response');
    expect(migration).not.toContain('gateway_response');
  });
});
