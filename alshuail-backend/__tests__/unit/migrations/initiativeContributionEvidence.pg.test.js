import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { randomUUID } from 'node:crypto';

const enabled = process.env.INITIATIVE_EVIDENCE_PG_REHEARSAL === '1';
const databaseName = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '')
  : process.env.DB_NAME || '';

if (enabled && !/^codex_gateway_reconciliation_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error('Refusing initiative evidence rehearsal outside a codex disposable database');
}

const describeRehearsal = enabled ? describe : describe.skip;

describeRehearsal('initiative receipt evidence on real PostgreSQL', () => {
  let query;
  let pool;
  const memberId = randomUUID();
  const reviewerId = randomUUID();
  const initiativeId = randomUUID();
  const firstReceiptId = randomUUID();
  const secondReceiptId = randomUUID();
  const firstDonationId = randomUUID();
  const secondDonationId = randomUUID();

  beforeAll(async () => {
    ({ query, pool } = await import('../../../src/services/database.js'));
    await query(
      `INSERT INTO members (id, full_name, status, current_balance)
       VALUES ($1, 'Codex initiative evidence', 'active', 0)`,
      [memberId]
    );
    await query(
      `INSERT INTO members (
         id, full_name, status, membership_status, is_active, role, current_balance
       ) VALUES (
         $1, 'Codex initiative reviewer', 'active', 'active', true,
         'financial_manager', 0
       )`,
      [reviewerId]
    );
    await query(
      `INSERT INTO initiatives (id, title, status, current_amount, collected_amount)
       VALUES ($1, 'Codex initiative evidence', 'active', 0, 0)`,
      [initiativeId]
    );
    await query(
      `INSERT INTO documents_metadata (
         id, member_id, uploaded_by, title, category, file_path, file_size,
         file_type, original_name, status
       ) VALUES ($1, $2, $2, 'Codex initiative receipt', 'receipts', $3,
                 20, 'image/jpeg', 'receipt.jpg', 'active')`,
      [firstReceiptId, memberId, `${memberId}/receipts/initiative-one.jpg`]
    );
    await query(
      `INSERT INTO documents_metadata (
         id, member_id, uploaded_by, title, category, file_path, file_size,
         file_type, original_name, status
       ) VALUES ($1, $2, $2, 'Codex initiative receipt two', 'receipts', $3,
                 20, 'image/jpeg', 'receipt-two.jpg', 'active')`,
      [secondReceiptId, memberId, `${memberId}/receipts/initiative-two.jpg`]
    );
  });

  afterAll(async () => {
    if (pool) {
      const cleanup = await pool.connect();
      try {
        await cleanup.query('BEGIN');
        await cleanup.query("SET LOCAL session_replication_role = 'replica'");
        await cleanup.query(
          'DELETE FROM initiative_donations WHERE id = ANY($1::uuid[])',
          [[firstDonationId, secondDonationId]]
        );
        await cleanup.query(
          'DELETE FROM documents_metadata WHERE id = ANY($1::uuid[])',
          [[firstReceiptId, secondReceiptId]]
        );
        await cleanup.query('DELETE FROM initiatives WHERE id = $1', [initiativeId]);
        await cleanup.query(
          'DELETE FROM members WHERE id = ANY($1::uuid[])',
          [[memberId, reviewerId]]
        );
        await cleanup.query('COMMIT');
      } catch (error) {
        await cleanup.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        cleanup.release();
      }
    }
    if (pool) await pool.end();
  });

  test('rejects missing receipts and electronic aliases', async () => {
    await expect(query(
      `INSERT INTO initiative_donations (
         id, initiative_id, member_id, amount, payment_method, status
       ) VALUES ($1, $2, $3, 100, 'bank_transfer', 'pending')`,
      [randomUUID(), initiativeId, memberId]
    )).rejects.toMatchObject({ code: '23514' });

    await expect(query(
      `INSERT INTO initiative_donations (
         id, initiative_id, member_id, amount, payment_method, status,
         receipt_document_id
       ) VALUES ($1, $2, $3, 100, 'apple_pay', 'pending', $4)`,
      [randomUUID(), initiativeId, memberId, firstReceiptId]
    )).rejects.toMatchObject({ code: '23514' });
  });

  test('serializes repeated approval and counts each contribution once', async () => {
    await query(
      `INSERT INTO initiative_donations (
         id, initiative_id, member_id, amount, payment_method, status,
         receipt_document_id
       ) VALUES ($1, $2, $3, 100, 'bank_transfer', 'pending', $4)`,
      [firstDonationId, initiativeId, memberId, firstReceiptId]
    );

    const approvals = await Promise.all([
      query(
        `UPDATE initiative_donations
            SET status = 'completed', approved_by = $2, approval_date = NOW()
          WHERE id = $1 AND status = 'pending'
          RETURNING id`,
        [firstDonationId, reviewerId]
      ),
      query(
        `UPDATE initiative_donations
            SET status = 'completed', approved_by = $2, approval_date = NOW()
          WHERE id = $1 AND status = 'pending'
          RETURNING id`,
        [firstDonationId, reviewerId]
      )
    ]);
    expect(approvals.map((result) => result.rowCount).sort()).toEqual([0, 1]);

    const initiative = await query(
      'SELECT current_amount, collected_amount FROM initiatives WHERE id = $1',
      [initiativeId]
    );
    expect(Number(initiative.rows[0].current_amount)).toBe(100);
    expect(Number(initiative.rows[0].collected_amount)).toBe(100);
  });

  test('updates the current initiative ledger only with an active owned receipt', async () => {
    await query(
      `INSERT INTO initiative_donations (
         id, initiative_id, member_id, amount, payment_method, status,
         receipt_document_id
       ) VALUES ($1, $2, $3, 125, 'bank_transfer', 'pending', $4)`,
      [secondDonationId, initiativeId, memberId, secondReceiptId]
    );
    await query(
      `UPDATE initiative_donations
          SET status = 'completed', approved_by = $2, approval_date = NOW()
        WHERE id = $1`,
      [secondDonationId, reviewerId]
    );

    const initiative = await query(
      'SELECT current_amount, collected_amount FROM initiatives WHERE id = $1',
      [initiativeId]
    );
    expect(Number(initiative.rows[0].current_amount)).toBe(225);
    expect(Number(initiative.rows[0].collected_amount)).toBe(225);

    await expect(query(
      "UPDATE documents_metadata SET status = 'deleted' WHERE id = $1",
      [secondReceiptId]
    )).rejects.toMatchObject({ code: '23514' });
  });
});
