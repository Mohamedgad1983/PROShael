import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from '@jest/globals';

const here = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(
  path.resolve(here, '../../../migrations/20260822_retire_legacy_activity_contributions.sql'),
  'utf8'
);

describe('legacy activity contribution retirement migration', () => {
  test('is transactional, replay-safe and blocks every ledger mutation', () => {
    expect(sql).toMatch(/^BEGIN;/);
    expect(sql).toContain('CREATE OR REPLACE FUNCTION reject_legacy_activity_contribution_mutation');
    expect(sql).toContain('DROP TRIGGER IF EXISTS trg_reject_legacy_activity_contribution_mutation');
    expect(sql).toContain('BEFORE INSERT OR UPDATE OR DELETE ON activity_contributions');
    expect(sql).toContain("ERRCODE = '23514'");
    expect(sql).toMatch(/COMMIT;\s*$/);
  });
});
