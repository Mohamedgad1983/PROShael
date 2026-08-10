import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { randomUUID } from 'node:crypto';

const enabled = process.env.BANK_TRANSFER_RECEIPT_PG_REHEARSAL === '1';
const databaseName = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '')
  : process.env.DB_NAME || '';

if (enabled && !/^codex_gateway_reconciliation_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error('Refusing bank-transfer receipt rehearsal outside a codex disposable database');
}

const describeRehearsal = enabled ? describe : describe.skip;

describeRehearsal('bank-transfer receipt real PostgreSQL evidence guards', () => {
  let query;
  let pool;
  const memberId = randomUUID();
  const documentId = randomUUID();
  const paymentId = randomUUID();
  const cashPaymentId = randomUUID();
  const legacyTransferPaymentId = randomUUID();
  const racePaymentId = randomUUID();
  const raceDocumentId = randomUUID();

  beforeAll(async () => {
    const database = await import('../../../src/services/database.js');
    ({ query, pool } = database);
    await query(
      `INSERT INTO members (id, full_name, status, current_balance)
       VALUES ($1, 'Codex bank transfer receipt', 'active', 0)`,
      [memberId]
    );
  });

  afterAll(async () => {
    if (pool) {
      const cleanup = await pool.connect();
      try {
        await cleanup.query('BEGIN');
        // Exact fixture cleanup in an explicitly validated disposable DB.
        // Production hard-delete guards remain enabled for every normal path.
        await cleanup.query("SET LOCAL session_replication_role = 'replica'");
        await cleanup.query('DELETE FROM payments WHERE id = ANY($1::uuid[])', [[paymentId, cashPaymentId, legacyTransferPaymentId, racePaymentId]]);
        await cleanup.query('DELETE FROM documents_metadata WHERE id = ANY($1::uuid[])', [[documentId, raceDocumentId]]);
        await cleanup.query('DELETE FROM members WHERE id = $1', [memberId]);
        await cleanup.query('COMMIT');
      } catch (error) {
        await cleanup.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        cleanup.release();
      }
    }
    if (pool) {await pool.end();}
  });

  test('approval requires a matching active receipt and then protects it from deletion', async () => {
    await query(
      `INSERT INTO payments (
         id, payer_id, beneficiary_id, amount, category, status, payment_method
       ) VALUES ($1, $2, $2, 100, 'initiative', 'pending', 'bank_transfer')`,
      [paymentId, memberId]
    );

    await expect(query(
      "UPDATE payments SET status = 'paid' WHERE id = $1",
      [paymentId]
    )).rejects.toMatchObject({ code: '23514' });

    await query(
      `INSERT INTO documents_metadata (
         id, member_id, title, category, file_path, file_size,
         file_type, original_name, uploaded_by, status
       ) VALUES ($1, $2, 'Codex receipt', 'receipts', $3, 10,
                 'application/pdf', 'receipt.pdf', $2, 'active')`,
      [documentId, memberId, `${memberId}/receipts/codex.pdf`]
    );
    await query(
      'UPDATE payments SET receipt_document_id = $1 WHERE id = $2',
      [documentId, paymentId]
    );
    const approved = await query(
      "UPDATE payments SET status = 'paid' WHERE id = $1 RETURNING status",
      [paymentId]
    );
    expect(approved.rows[0].status).toBe('paid');

    await expect(query(
      "UPDATE documents_metadata SET status = 'deleted' WHERE id = $1",
      [documentId]
    )).rejects.toMatchObject({ code: '23514' });
    await expect(query(
      'DELETE FROM documents_metadata WHERE id = $1',
      [documentId]
    )).rejects.toMatchObject({ code: '23514' });

    const renamed = await query(
      "UPDATE documents_metadata SET title = 'إيصال محفوظ' WHERE id = $1 RETURNING status",
      [documentId]
    );
    expect(renamed.rows[0].status).toBe('active');
  });

  test('cannot relabel a paid cash row as bank transfer without a receipt', async () => {
    await query(
      `INSERT INTO payments (
         id, payer_id, beneficiary_id, amount, category, status, payment_method
       ) VALUES ($1, $2, $2, 10, 'initiative', 'paid', 'cash')`,
      [cashPaymentId, memberId]
    );

    await expect(query(
      "UPDATE payments SET payment_method = 'bank_transfer' WHERE id = $1",
      [cashPaymentId]
    )).rejects.toMatchObject({ code: '23514' });
  });

  test('legacy transfer alias cannot approve a cash row without archived evidence', async () => {
    await query(
      `INSERT INTO payments (
         id, payer_id, beneficiary_id, amount, category, status, payment_method
       ) VALUES ($1, $2, $2, 20, 'initiative', 'pending', 'cash')`,
      [legacyTransferPaymentId, memberId]
    );

    await expect(query(
      "UPDATE payments SET status = 'paid', payment_method = 'transfer' WHERE id = $1",
      [legacyTransferPaymentId]
    )).rejects.toMatchObject({ code: '23514' });

    await query(
      'UPDATE payments SET receipt_document_id = $1 WHERE id = $2',
      [documentId, legacyTransferPaymentId]
    );
    const approved = await query(
      "UPDATE payments SET status = 'paid', payment_method = 'transfer' WHERE id = $1 RETURNING status",
      [legacyTransferPaymentId]
    );
    expect(approved.rows[0].status).toBe('paid');
  });

  test('approval and receipt deletion serialize on one advisory lock', async () => {
    await query(
      `INSERT INTO documents_metadata (
         id, member_id, title, category, file_path, file_size,
         file_type, original_name, uploaded_by, status
       ) VALUES ($1, $2, 'Race receipt', 'receipts', $3, 10,
                 'application/pdf', 'race.pdf', $2, 'active')`,
      [raceDocumentId, memberId, `${memberId}/receipts/race.pdf`]
    );
    await query(
      `INSERT INTO payments (
         id, payer_id, beneficiary_id, amount, category, status,
         payment_method, receipt_document_id
       ) VALUES ($1, $2, $2, 75, 'initiative', 'pending', 'bank_transfer', $3)`,
      [racePaymentId, memberId, raceDocumentId]
    );

    const approver = await pool.connect();
    const deleter = await pool.connect();
    try {
      await approver.query('BEGIN');
      await approver.query(
        "UPDATE payments SET status = 'paid' WHERE id = $1",
        [racePaymentId]
      );

      await deleter.query('BEGIN');
      let deleteSettled = false;
      const blockedDelete = deleter.query(
        "UPDATE documents_metadata SET status = 'deleted' WHERE id = $1",
        [raceDocumentId]
      ).finally(() => { deleteSettled = true; });
      const deleteAssertion = expect(blockedDelete).rejects.toMatchObject({ code: '23514' });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(deleteSettled).toBe(false);
      await approver.query('COMMIT');
      await deleteAssertion;
      await deleter.query('ROLLBACK');
    } finally {
      await approver.query('ROLLBACK').catch(() => {});
      await deleter.query('ROLLBACK').catch(() => {});
      approver.release();
      deleter.release();
    }
  });
});
