import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from '@jest/globals';

const here = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(
  path.resolve(here, '../../../migrations/20260814_require_bank_transfer_receipts.sql'),
  'utf8'
);

describe('bank-transfer receipt migration', () => {
  test('is transactional and rejects paid transitions without archived receipt', () => {
    expect(sql).toMatch(/^--[\s\S]*\bBEGIN;/);
    expect(sql).toContain("LOWER(BTRIM(COALESCE(NEW.payment_method, ''))) IN ('bank_transfer', 'transfer')");
    expect(sql).toContain("NEW.status = 'paid'");
    expect(sql).toContain('d.id = NEW.receipt_document_id');
    expect(sql).toContain("d.status = 'active'");
    expect(sql).toContain("d.category = 'receipts'");
    expect(sql).toContain('d.member_id = NEW.payer_id');
    expect(sql).toContain('pg_advisory_xact_lock(hashtextextended(NEW.receipt_document_id::text, 0))');
    expect(sql).toContain('pg_advisory_xact_lock(hashtextextended(OLD.id::text, 0))');
    expect(sql).not.toContain('OLD.status IS DISTINCT FROM NEW.status');
    expect(sql).toContain("USING ERRCODE = '23514'");
    expect(sql).toMatch(/COMMIT;\s*$/);
  });

  test('makes referenced payment and initiative receipts append-only', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.protect_referenced_financial_document()');
    expect(sql).toContain('p.receipt_document_id = OLD.id');
    expect(sql).toContain('d.receipt_document_id = OLD.id');
    expect(sql).toContain('c.receipt_document_id = OLD.id');
    expect(sql).toContain('BEFORE UPDATE OR DELETE ON public.documents_metadata');
    expect(sql).toContain("USING ERRCODE = '23514'");
  });
});
