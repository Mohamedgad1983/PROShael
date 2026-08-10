import { describe, expect, test } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(
  __dirname,
  '../../../migrations/20260816_archive_bank_transfer_receipts.sql'
);
const sql = fs.readFileSync(migrationPath, 'utf8');

describe('bank-transfer request receipt migration', () => {
  test('adds a restrictive receipt FK without fabricating a URL backfill', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS receipt_document_id UUID');
    expect(sql).toContain('ON DELETE RESTRICT');
    expect(sql).not.toMatch(/UPDATE\s+public\.bank_transfer_requests\s+SET\s+receipt_document_id/i);
  });

  test('requires active requester-owned archived evidence and protects it', () => {
    expect(sql).toContain("d.member_id = NEW.requester_id");
    expect(sql).toContain("d.category = 'receipts'");
    expect(sql).toContain("d.status = 'active'");
    expect(sql).toContain('btr.receipt_document_id = OLD.id');
    expect(sql).toContain('pg_advisory_xact_lock');
  });
});
