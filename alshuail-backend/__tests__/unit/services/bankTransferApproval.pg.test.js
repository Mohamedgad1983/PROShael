import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { randomUUID } from 'node:crypto';

const enabled = process.env.BANK_TRANSFER_APPROVAL_PG_REHEARSAL === '1';
const databaseName = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '')
  : process.env.DB_NAME || '';

if (enabled && !/^codex_gateway_reconciliation_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error('Refusing bank-transfer approval rehearsal outside a codex disposable database');
}

const describeRehearsal = enabled ? describe : describe.skip;

describeRehearsal('bank-transfer approval real PostgreSQL serialization', () => {
  let query;
  let pool;
  let approveBankTransfer;
  const requesterId = randomUUID();
  const beneficiaryId = randomUUID();
  const reviewerId = randomUUID();
  const documentId = randomUUID();
  const transferId = randomUUID();

  beforeAll(async () => {
    const database = await import('../../../src/services/database.js');
    ({ query, pool } = database);
    ({ approveBankTransfer } = await import('../../../src/services/bankTransferService.js'));

    await query(
      `INSERT INTO members (id, full_name, status, current_balance)
       VALUES ($1, 'Codex transfer requester', 'active', 0),
              ($2, 'Codex transfer beneficiary', 'active', 0)`,
      [requesterId, beneficiaryId]
    );
    await query(
      `INSERT INTO users (id, email, role, is_active, status)
       VALUES ($1, $2, 'financial_manager', TRUE, 'active')`,
      [reviewerId, `codex-bank-transfer-${reviewerId}@example.test`]
    );
    await query(
      `INSERT INTO documents_metadata (
         id, member_id, uploaded_by, title, description, category,
         file_path, file_size, file_type, original_name, status
       ) VALUES (
         $1, $2, $2, 'Codex transfer receipt', '', 'receipts',
         $3, 20, 'application/pdf', 'receipt.pdf', 'active'
       )`,
      [documentId, requesterId, `${requesterId}/receipts/${documentId}.pdf`]
    );
    await query(
      `INSERT INTO bank_transfer_requests (
         id, requester_id, beneficiary_id, amount, purpose,
         receipt_url, receipt_filename, receipt_document_id, status
       ) VALUES ($1, $2, $3, 125, 'general', $4, 'receipt.pdf', $5, 'pending')`,
      [
        transferId,
        requesterId,
        beneficiaryId,
        `/uploads/member-documents/${requesterId}/receipts/${documentId}.pdf`,
        documentId,
      ]
    );
  });

  afterAll(async () => {
    if (pool) {
      const cleanup = await pool.connect();
      try {
        await cleanup.query('BEGIN');
        await cleanup.query("SET LOCAL session_replication_role = 'replica'");
        await cleanup.query(
        `DELETE FROM payments
          WHERE receipt_document_id = $1
            AND payer_id = $2
            AND notes = $3`,
        [documentId, requesterId, `تحويل بنكي معتمد - رقم الطلب: ${transferId}`]
        );
        await cleanup.query('DELETE FROM bank_transfer_requests WHERE id = $1', [transferId]);
        await cleanup.query('DELETE FROM documents_metadata WHERE id = $1', [documentId]);
        await cleanup.query('DELETE FROM users WHERE id = $1', [reviewerId]);
        await cleanup.query('DELETE FROM members WHERE id = ANY($1::uuid[])', [[requesterId, beneficiaryId]]);
        await cleanup.query('COMMIT');
      } catch (error) {
        await cleanup.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        cleanup.release();
      }
    }
    if (pool) { await pool.end(); }
  });

  test('Promise.all produces one paid payment and one conflict', async () => {
    const results = await Promise.allSettled([
      approveBankTransfer(transferId, reviewerId, 'first concurrent approval'),
      approveBankTransfer(transferId, reviewerId, 'second concurrent approval'),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({
      statusCode: 409,
      code: 'BANK_TRANSFER_ALREADY_REVIEWED',
    });

    const { rows: paymentRows } = await query(
      `SELECT id, status, payment_method, receipt_document_id
         FROM payments
        WHERE receipt_document_id = $1
          AND payer_id = $2
          AND notes = $3`,
      [documentId, requesterId, `تحويل بنكي معتمد - رقم الطلب: ${transferId}`]
    );
    expect(paymentRows).toHaveLength(1);
    expect(paymentRows[0]).toEqual(expect.objectContaining({
      status: 'paid',
      payment_method: 'bank_transfer',
      receipt_document_id: documentId,
    }));

    const { rows: requestRows } = await query(
      'SELECT status, receipt_document_id FROM bank_transfer_requests WHERE id = $1',
      [transferId]
    );
    expect(requestRows[0]).toEqual({
      status: 'approved',
      receipt_document_id: documentId,
    });
  });
});
