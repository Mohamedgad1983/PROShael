import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from '@jest/globals';

const here = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(
  path.resolve(here, '../../../migrations/20260817_harden_initiative_contribution_evidence.sql'),
  'utf8'
);

describe('initiative contribution evidence migration', () => {
  test('is transactional and gates both contribution ledgers', () => {
    expect(sql).toMatch(/^--[\s\S]*\bBEGIN;/);
    expect(sql).toContain("<> 'bank_transfer'");
    expect(sql).toContain('NEW.receipt_document_id IS NULL');
    expect(sql).toContain("d.category = 'receipts'");
    expect(sql).toContain("d.status = 'active'");
    expect(sql).toContain('d.member_id = NEW.member_id');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('ON public.activity_contributions');
    expect(sql).toContain('ON public.initiative_donations');
    expect(sql).toMatch(/COMMIT;\s*$/);
  });

  test('rebuilds the activity total from confirmed ledger rows', () => {
    expect(sql).toContain('recalculate_activity_contribution_amount');
    expect(sql).toContain("COALESCE(c.status, '')" );
    expect(sql).toContain("= 'confirmed'");
    expect(sql).toContain('COALESCE(SUM(c.amount), 0)');
  });
});
