import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { randomUUID } from 'node:crypto';

const enabled = process.env.INITIATIVE_DONATION_REVIEW_PG_REHEARSAL === '1';
const databaseName = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '')
  : process.env.DB_NAME || '';

if (enabled && !/^codex_gateway_reconciliation_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error('Refusing initiative donation review rehearsal outside a codex disposable database');
}

const describeRehearsal = enabled ? describe : describe.skip;

describeRehearsal('initiative donation review audit on real PostgreSQL', () => {
  let query;
  let pool;
  const memberId = randomUUID();
  const initiativeId = randomUUID();
  const receiptId = randomUUID();
  const donationId = randomUUID();
  const approvedReceiptId = randomUUID();
  const approvedDonationId = randomUUID();
  const duplicateReceiptDonationId = randomUUID();
  const reviewerId = randomUUID();
  const rejectionReason = 'قيمة التحويل في الإيصال لا تطابق المساهمة المسجلة';

  beforeAll(async () => {
    ({ query, pool } = await import('../../../src/services/database.js'));
    await query(
      `INSERT INTO members (id, full_name, status, current_balance)
       VALUES ($1, 'Codex initiative reviewer', 'active', 0)`,
      [memberId]
    );
    await query(
      `INSERT INTO members (
         id, full_name, status, membership_status, is_active, role, current_balance
       ) VALUES (
         $1, 'Codex member-backed financial reviewer', 'active', 'active', true,
         'financial_manager', 0
       )`,
      [reviewerId]
    );
    await query(
      `INSERT INTO initiatives (id, title, status, current_amount, collected_amount)
       VALUES ($1, 'Codex review audit', 'active', 0, 0)`,
      [initiativeId]
    );
    await query(
      `INSERT INTO documents_metadata (
         id, member_id, uploaded_by, title, category, file_path, file_size,
         file_type, original_name, status
       ) VALUES ($1, $2, $2, 'Codex review receipt', 'receipts', $3,
                 20, 'image/jpeg', 'receipt.jpg', 'active')`,
      [receiptId, memberId, `${memberId}/receipts/review.jpg`]
    );
    await query(
      `INSERT INTO documents_metadata (
         id, member_id, uploaded_by, title, category, file_path, file_size,
         file_type, original_name, status
       ) VALUES ($1, $2, $2, 'Codex approval receipt', 'receipts', $3,
                 20, 'image/jpeg', 'approval-receipt.jpg', 'active')`,
      [approvedReceiptId, memberId, `${memberId}/receipts/approval-review.jpg`]
    );
    await query(
      `INSERT INTO initiative_donations (
         id, initiative_id, member_id, amount, payment_method, status,
         receipt_document_id
       ) VALUES ($1, $2, $3, 125, 'bank_transfer', 'pending', $4)`,
      [donationId, initiativeId, memberId, receiptId]
    );
    await query(
      `INSERT INTO initiative_donations (
         id, initiative_id, member_id, amount, payment_method, status,
         receipt_document_id
       ) VALUES ($1, $2, $3, 75, 'bank_transfer', 'pending', $4)`,
      [approvedDonationId, initiativeId, memberId, approvedReceiptId]
    );
    await query(
      `INSERT INTO initiative_donations (
         id, initiative_id, member_id, amount, payment_method, status,
         receipt_document_id
       ) VALUES ($1, $2, $3, 25, 'bank_transfer', 'pending', $4)`,
      [duplicateReceiptDonationId, initiativeId, memberId, approvedReceiptId]
    );
  });

  afterAll(async () => {
    if (pool) {
      const cleanup = await pool.connect();
      try {
        await cleanup.query('BEGIN');
        // Exact fixture cleanup in the explicitly validated disposable DB.
        // Reviewed donations remain append-only in every normal session.
        await cleanup.query("SET LOCAL session_replication_role = 'replica'");
        await cleanup.query(
          'DELETE FROM initiative_donations WHERE id = ANY($1::uuid[])',
          [[donationId, approvedDonationId, duplicateReceiptDonationId]]
        );
        await cleanup.query(
          'DELETE FROM documents_metadata WHERE id = ANY($1::uuid[])',
          [[receiptId, approvedReceiptId]]
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
    if (pool) {
      await pool.end();
    }
  });

  test('requires the complete rejection audit tuple', async () => {
    await expect(query(
      "UPDATE initiative_donations SET status = 'rejected' WHERE id = $1",
      [donationId]
    )).rejects.toMatchObject({ code: '23514' });

    await expect(query(
      `UPDATE initiative_donations
          SET status = 'rejected', rejection_reason = '..........',
              rejected_by_id = $2, rejected_at = NOW()
        WHERE id = $1`,
      [donationId, reviewerId]
    )).rejects.toMatchObject({ code: '23514' });

    await expect(query(
      `UPDATE initiative_donations
          SET approved_by = $2, approval_date = NOW()
        WHERE id = $1`,
      [approvedDonationId, reviewerId]
    )).rejects.toMatchObject({ code: '23514' });
  });

  test('persists a meaningful rejection without changing totals and freezes its audit', async () => {
    const rejected = await query(
      `UPDATE initiative_donations
          SET status = 'rejected', rejection_reason = $2,
              rejected_by_id = $3, rejected_at = NOW()
        WHERE id = $1
        RETURNING status, rejection_reason, rejected_by_id, rejected_at`,
      [donationId, rejectionReason, reviewerId]
    );

    expect(rejected.rows[0]).toEqual(expect.objectContaining({
      status: 'rejected',
      rejection_reason: rejectionReason,
      rejected_by_id: reviewerId,
    }));
    expect(rejected.rows[0].rejected_at).toBeTruthy();

    const initiative = await query(
      'SELECT current_amount, collected_amount FROM initiatives WHERE id = $1',
      [initiativeId]
    );
    expect(Number(initiative.rows[0].current_amount)).toBe(0);
    expect(Number(initiative.rows[0].collected_amount)).toBe(0);

    await expect(query(
      'UPDATE initiative_donations SET rejection_reason = $2 WHERE id = $1',
      [donationId, 'محاولة لاحقة لتغيير سبب الرفض بعد تثبيت القرار']
    )).rejects.toMatchObject({ code: '23514' });
    await expect(query(
      "UPDATE initiative_donations SET status = 'pending' WHERE id = $1",
      [donationId]
    )).rejects.toMatchObject({ code: '23514' });
    await expect(query(
      'UPDATE initiative_donations SET amount = amount + 1 WHERE id = $1',
      [donationId]
    )).rejects.toMatchObject({ code: '23514' });
    await expect(query(
      "UPDATE initiative_donations SET payment_reference = 'changed' WHERE id = $1",
      [donationId]
    )).rejects.toMatchObject({ code: '23514' });
    await expect(query(
      "UPDATE initiative_donations SET payment_date = NOW() + INTERVAL '1 day' WHERE id = $1",
      [donationId]
    )).rejects.toMatchObject({ code: '23514' });
    await expect(query(
      'DELETE FROM initiative_donations WHERE id = $1',
      [donationId]
    )).rejects.toMatchObject({ code: '23514' });

    const stillPresent = await query(
      'SELECT status, rejection_reason FROM initiative_donations WHERE id = $1',
      [donationId]
    );
    expect(stillPresent.rows[0]).toEqual(expect.objectContaining({
      status: 'rejected',
      rejection_reason: rejectionReason,
    }));
  });

  test('approves once with CAS, recalculates totals, and freezes the approval audit', async () => {
    const usersOnlyApprovalForeignKey = await query(
      `SELECT constraint_row.conname
         FROM pg_constraint constraint_row
         JOIN pg_attribute column_row
           ON column_row.attrelid = constraint_row.conrelid
          AND column_row.attnum = ANY(constraint_row.conkey)
        WHERE constraint_row.conrelid = 'initiative_donations'::regclass
          AND constraint_row.contype = 'f'
          AND column_row.attname = 'approved_by'`
    );
    expect(usersOnlyApprovalForeignKey.rowCount).toBe(0);

    const approved = await query(
      `UPDATE initiative_donations
          SET status = 'completed', approved_by = $2, approval_date = NOW()
        WHERE id = $1
          AND LOWER(BTRIM(COALESCE(status, ''))) = 'pending'
        RETURNING status, approved_by, approval_date`,
      [approvedDonationId, reviewerId]
    );

    expect(approved.rowCount).toBe(1);
    expect(approved.rows[0]).toEqual(expect.objectContaining({
      status: 'completed',
      approved_by: reviewerId,
    }));
    expect(approved.rows[0].approval_date).toBeTruthy();

    const replay = await query(
      `UPDATE initiative_donations
          SET status = 'completed', approved_by = $2, approval_date = NOW()
        WHERE id = $1
          AND LOWER(BTRIM(COALESCE(status, ''))) = 'pending'
        RETURNING id`,
      [approvedDonationId, randomUUID()]
    );
    expect(replay.rowCount).toBe(0);

    const initiative = await query(
      'SELECT current_amount, collected_amount FROM initiatives WHERE id = $1',
      [initiativeId]
    );
    expect(Number(initiative.rows[0].current_amount)).toBe(75);
    expect(Number(initiative.rows[0].collected_amount)).toBe(75);

    await expect(query(
      `UPDATE initiative_donations
          SET status = 'completed', approved_by = $2, approval_date = NOW()
        WHERE id = $1`,
      [duplicateReceiptDonationId, reviewerId]
    )).rejects.toMatchObject({ code: '23514' });

    await expect(query(
      'UPDATE initiative_donations SET approved_by = $2 WHERE id = $1',
      [approvedDonationId, randomUUID()]
    )).rejects.toMatchObject({ code: '23514' });
    await expect(query(
      "UPDATE initiative_donations SET status = 'pending' WHERE id = $1",
      [approvedDonationId]
    )).rejects.toMatchObject({ code: '23514' });
    await expect(query(
      'UPDATE initiative_donations SET amount = amount + 1 WHERE id = $1',
      [approvedDonationId]
    )).rejects.toMatchObject({ code: '23514' });
    await expect(query(
      "UPDATE initiative_donations SET payment_reference = 'changed' WHERE id = $1",
      [approvedDonationId]
    )).rejects.toMatchObject({ code: '23514' });
    await expect(query(
      "UPDATE initiative_donations SET payment_date = NOW() + INTERVAL '1 day' WHERE id = $1",
      [approvedDonationId]
    )).rejects.toMatchObject({ code: '23514' });
    await expect(query(
      'DELETE FROM initiative_donations WHERE id = $1',
      [approvedDonationId]
    )).rejects.toMatchObject({ code: '23514' });

    const stillPresent = await query(
      `SELECT status, approved_by, approval_date
         FROM initiative_donations
        WHERE id = $1`,
      [approvedDonationId]
    );
    expect(stillPresent.rows[0]).toEqual(expect.objectContaining({
      status: 'completed',
      approved_by: reviewerId,
      approval_date: approved.rows[0].approval_date,
    }));
  });
});
