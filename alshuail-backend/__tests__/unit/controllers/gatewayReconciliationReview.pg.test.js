import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { randomUUID } from 'node:crypto';

const enabled = process.env.GATEWAY_RECONCILIATION_REVIEW_PG_REHEARSAL === '1';
const databaseName = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '')
  : process.env.DB_NAME || '';

if (enabled && !/^codex_gateway_reconciliation_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error('Refusing reconciliation review rehearsal outside a Codex disposable database');
}

const describeRehearsal = enabled ? describe : describe.skip;

describeRehearsal('gateway reconciliation review queue real PostgreSQL boundary', () => {
  let query;
  let pool;
  let actOnGatewayReconciliationReview;
  let listGatewayReconciliationReviews;
  const actorId = randomUUID();
  const activeFinancialUserId = randomUUID();
  const activeFinancialMemberId = randomUUID();
  const disabledUserId = randomUUID();
  const inactiveMemberActorId = randomUUID();
  const suspendedMemberActorId = randomUUID();
  const memberId = randomUUID();
  const paymentId = randomUUID();
  const reason = 'تمت مراجعة السجل مع ميسر وإعادة المحاولة بعد مطابقة البيانات';

  const response = () => {
    const res = {
      statusCode: 200,
      payload: null,
      status(code) {this.statusCode = code; return this;},
      json(payload) {this.payload = payload; return this;},
    };
    return res;
  };

  const requestFor = (action, reviewerId = actorId) => ({
    params: { paymentId },
    body: { payment_id: paymentId, action, reason },
    user: { id: reviewerId, role: 'super_admin' },
    headers: { 'user-agent': 'Codex PG reconciliation review rehearsal' },
    ip: '127.0.0.1',
  });

  const listRequestFor = (reviewerId, role = 'super_admin') => ({
    query: { status: 'review_required', page: '1', limit: '25' },
    user: { id: reviewerId, role },
    headers: { 'user-agent': 'Codex PG reconciliation review rehearsal' },
    ip: '127.0.0.1',
  });

  const insertReviewAuditDirectly = (reviewerId, actorSource) => query(
    `INSERT INTO gateway_reconciliation_review_actions (
       payment_id, action, reason, actor_id, actor_source, actor_role,
       previous_last_result, previous_review_reason,
       previous_check_count, previous_consecutive_not_found,
       previous_consecutive_failures
     ) VALUES (
       $1, 'requeue', $2, $3, $4, 'super_admin',
       'review_required', 'legacy_manual_review', 2, 0, 0
     )`,
    [paymentId, reason, reviewerId, actorSource]
  );

  beforeAll(async () => {
    const database = await import('../../../src/services/database.js');
    ({ query, pool } = database);
    ({ actOnGatewayReconciliationReview, listGatewayReconciliationReviews } = await import(
      '../../../src/controllers/gatewayReconciliationReviewController.js'
    ));

    const readiness = await query(`
      SELECT to_regclass('public.gateway_reconciliation_review_actions') IS NOT NULL AS ready
    `);
    if (!readiness.rows[0]?.ready) {
      throw new Error('Apply 20260820_gateway_reconciliation_review_queue.sql before this rehearsal');
    }

    await query(
      `INSERT INTO members (
         id, full_name, role, status, current_balance,
         is_active, membership_status, suspended_at, reactivated_at
       )
       VALUES
         ($1, 'Codex member-backed super admin', 'super_admin', 'active', 0, TRUE, 'active', NULL, NULL),
         ($2, 'Codex active member-backed financial manager', 'financial_manager', 'active', 0, TRUE, 'active', NULL, NULL),
         ($3, 'Codex inactive member-backed super admin', 'super_admin', 'active', 0, FALSE, 'active', NULL, NULL),
         ($4, 'Codex suspended member-backed super admin', 'super_admin', 'active', 0, TRUE, 'active', NOW(), NULL),
         ($5, 'Codex reconciliation member', 'member', 'active', 250, TRUE, 'active', NULL, NULL)`,
      [
        actorId,
        activeFinancialMemberId,
        inactiveMemberActorId,
        suspendedMemberActorId,
        memberId,
      ]
    );
    await query(
      `INSERT INTO users (id, role, is_active, status)
       VALUES
         ($1, 'financial_manager', TRUE, 'active'),
         ($2, 'super_admin', FALSE, 'active')`,
      [activeFinancialUserId, disabledUserId]
    );
    await query(
      `INSERT INTO payments (
         id, payer_id, beneficiary_id, amount, currency,
         category, status, payment_method, reference_number
       ) VALUES (
         $1, $2, $2, 100, 'SAR',
         'subscription', 'pending', 'bank_transfer', 'CODEX-RECON-REVIEW'
       )`,
      [paymentId, memberId]
    );
    await query(
      `INSERT INTO gateway_payment_reconciliation_state (
         payment_id, next_check_at, claim_token, lease_expires_at,
         last_checked_at, last_result, consecutive_failures,
         consecutive_not_found, check_count, review_reason,
         created_at, updated_at
       ) VALUES (
         $1, NULL, NULL, NULL,
         NOW(), 'review_required', 0,
         0, 2, 'legacy_manual_review',
         NOW(), NOW()
       )`,
      [paymentId]
    );
  });

  afterAll(async () => {
    if (query) {
      await query('BEGIN');
      try {
        await query("SET LOCAL session_replication_role = 'replica'");
        await query('DELETE FROM gateway_reconciliation_review_actions WHERE payment_id = $1', [paymentId]);
        await query('DELETE FROM gateway_payment_reconciliation_state WHERE payment_id = $1', [paymentId]);
        await query('DELETE FROM payments WHERE id = $1', [paymentId]);
        await query(
          'DELETE FROM users WHERE id = ANY($1::uuid[])',
          [[activeFinancialUserId, disabledUserId]]
        );
        await query(
          'DELETE FROM members WHERE id = ANY($1::uuid[])',
          [[
            actorId,
            activeFinancialMemberId,
            inactiveMemberActorId,
            suspendedMemberActorId,
            memberId,
          ]]
        );
        await query('COMMIT');
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    }
    if (pool) {await pool.end();}
  });

  test('active users and members financial managers can read the masked review queue', async () => {
    for (const reviewerId of [activeFinancialUserId, activeFinancialMemberId]) {
      const res = response();
      await listGatewayReconciliationReviews(
        listRequestFor(reviewerId, 'financial_manager'),
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload).toMatchObject({
        success: true,
        data: {
          total: 1,
          status: 'review_required',
          items: [expect.objectContaining({ payment_id: paymentId })],
        },
      });
      expect(res.payload.data.items[0]).not.toHaveProperty('gateway_payment_id');
      expect(res.payload.data.items[0]).not.toHaveProperty('gateway_response');
    }
  });

  test('disabled users and inactive or suspended members cannot read or act', async () => {
    for (const reviewerId of [disabledUserId, inactiveMemberActorId, suspendedMemberActorId]) {
      const listRes = response();
      await listGatewayReconciliationReviews(listRequestFor(reviewerId), listRes);
      expect(listRes.statusCode).toBe(403);
      expect(listRes.payload).toMatchObject({
        success: false,
        code: 'RECONCILIATION_REVIEWER_NOT_PRIVILEGED',
      });

      const actionRes = response();
      await actOnGatewayReconciliationReview(requestFor('requeue', reviewerId), actionRes);
      expect(actionRes.statusCode).toBe(403);
      expect(actionRes.payload).toMatchObject({
        success: false,
        code: 'RECONCILIATION_REVIEWER_NOT_PRIVILEGED',
      });
    }

    const untouched = await query(
      `SELECT last_result, review_reason,
              (SELECT COUNT(*)::int
                 FROM gateway_reconciliation_review_actions action_row
                WHERE action_row.payment_id = state.payment_id) AS action_count
         FROM gateway_payment_reconciliation_state state
        WHERE payment_id = $1`,
      [paymentId]
    );
    expect(untouched.rows[0]).toMatchObject({
      last_result: 'review_required',
      review_reason: 'legacy_manual_review',
      action_count: 0,
    });
  });

  test('database trigger rejects disabled, inactive and suspended super-admin principals', async () => {
    await expect(insertReviewAuditDirectly(disabledUserId, 'users'))
      .rejects.toThrow(/not active and privileged/);
    await expect(insertReviewAuditDirectly(inactiveMemberActorId, 'members'))
      .rejects.toThrow(/not active and privileged/);
    await expect(insertReviewAuditDirectly(suspendedMemberActorId, 'members'))
      .rejects.toThrow(/not active and privileged/);

    const count = await query(
      'SELECT COUNT(*)::int AS count FROM gateway_reconciliation_review_actions WHERE payment_id = $1',
      [paymentId]
    );
    expect(count.rows[0].count).toBe(0);
  });

  test('member-backed super admin requeues only the cursor with immutable audit', async () => {
    const before = await query(
      `SELECT p.status, p.amount, m.current_balance
         FROM payments p
         JOIN members m ON m.id = p.beneficiary_id
        WHERE p.id = $1`,
      [paymentId]
    );
    const res = response();
    await actOnGatewayReconciliationReview(requestFor('requeue'), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({
      success: true,
      data: { payment_id: paymentId, action: 'requeue', state: 'checked' },
    });
    const after = await query(
      `SELECT p.status, p.amount, m.current_balance,
              state.last_result, state.next_check_at
         FROM payments p
         JOIN members m ON m.id = p.beneficiary_id
         JOIN gateway_payment_reconciliation_state state ON state.payment_id = p.id
        WHERE p.id = $1`,
      [paymentId]
    );
    expect(after.rows[0]).toMatchObject({
      status: before.rows[0].status,
      amount: before.rows[0].amount,
      current_balance: before.rows[0].current_balance,
      last_result: 'checked',
    });
    expect(after.rows[0].next_check_at).toBeTruthy();
    const audit = await query(
      `SELECT action, actor_id, actor_source, actor_role, previous_last_result
         FROM gateway_reconciliation_review_actions
        WHERE payment_id = $1`,
      [paymentId]
    );
    expect(audit.rows).toEqual([{
      action: 'requeue',
      actor_id: actorId,
      actor_source: 'members',
      actor_role: 'super_admin',
      previous_last_result: 'review_required',
    }]);

    await expect(query(
      `UPDATE gateway_reconciliation_review_actions
          SET reason = 'تم تغيير السبب وهذا يجب أن يرفضه سجل التدقيق غير القابل للتعديل'
        WHERE payment_id = $1`,
      [paymentId]
    )).rejects.toThrow(/append-only/);
  });

  test('resolve stops automation terminally and still leaves payment and balance untouched', async () => {
    await query(
      `UPDATE gateway_payment_reconciliation_state
          SET next_check_at = NULL,
              claim_token = NULL,
              lease_expires_at = NULL,
              last_result = 'review_required',
              review_reason = 'legacy_manual_review',
              updated_at = NOW()
        WHERE payment_id = $1`,
      [paymentId]
    );
    const res = response();
    await actOnGatewayReconciliationReview(requestFor('resolve'), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({
      success: true,
      data: { payment_id: paymentId, action: 'resolve', state: 'terminal', next_check_at: null },
    });
    const finalState = await query(
      `SELECT p.status, p.amount, m.current_balance,
              state.last_result, state.next_check_at, state.review_reason,
              (SELECT COUNT(*)::int
                 FROM gateway_reconciliation_review_actions action_row
                WHERE action_row.payment_id = p.id) AS action_count
         FROM payments p
         JOIN members m ON m.id = p.beneficiary_id
         JOIN gateway_payment_reconciliation_state state ON state.payment_id = p.id
        WHERE p.id = $1`,
      [paymentId]
    );
    expect(finalState.rows[0]).toMatchObject({
      status: 'pending',
      amount: '100.00',
      current_balance: '250.00',
      last_result: 'terminal',
      next_check_at: null,
      review_reason: null,
      action_count: 2,
    });

    await expect(query(
      `UPDATE gateway_payment_reconciliation_state
          SET last_result = 'checked', next_check_at = NOW()
        WHERE payment_id = $1`,
      [paymentId]
    )).rejects.toThrow(/cannot resume automation/);
    await expect(query(
      'DELETE FROM gateway_payment_reconciliation_state WHERE payment_id = $1',
      [paymentId]
    )).rejects.toThrow(/cannot be deleted/);
  });
});
