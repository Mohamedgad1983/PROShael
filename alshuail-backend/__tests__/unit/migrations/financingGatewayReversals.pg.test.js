import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import pg from 'pg';
import { randomUUID } from 'node:crypto';

const { Client } = pg;
const REHEARSAL_NAME_PATTERN = /^codex_financing_reversal_rehearsal_[a-z0-9_]+$/;
const rehearsalEnabled = process.env.FINANCING_REVERSAL_PG_REHEARSAL === '1';

function configuredDatabaseName() {
  if (process.env.DATABASE_URL) {
    try {
      return new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '');
    } catch {
      return '';
    }
  }
  return process.env.DB_NAME || '';
}

const databaseName = configuredDatabaseName();
if (rehearsalEnabled && !REHEARSAL_NAME_PATTERN.test(databaseName)) {
  throw new Error(
    'Refusing financing reversal PG rehearsal outside an explicit codex disposable database'
  );
}

const describeRehearsal = rehearsalEnabled ? describe : describe.skip;

describeRehearsal('financing reversal real PostgreSQL rehearsal', () => {
  let adminClient;
  let databasePool;
  let reverseSettledFinancingPayment;
  let persistIdempotentMemberNotification;
  let financingReminderCollapseKey;
  let financingReminderIdempotencyKey;

  const ids = {
    member: randomUUID(),
    plan: randomUUID(),
    request: randomUUID(),
    payment: randomUUID(),
    installments: [randomUUID(), randomUUID()],
  };

  beforeAll(async () => {
    adminClient = new Client(
      process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 5432),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
          }
    );
    await adminClient.connect();

    const reversalModule = await import('../../../src/services/financingReversalService.js');
    const reminderModule = await import('../../../src/services/financingReminderService.js');
    const notificationModule = await import('../../../src/services/notificationService.js');
    const databaseModule = await import('../../../src/services/database.js');
    reverseSettledFinancingPayment = reversalModule.reverseSettledFinancingPayment;
    financingReminderCollapseKey = reminderModule.financingReminderCollapseKey;
    financingReminderIdempotencyKey = reminderModule.financingReminderIdempotencyKey;
    persistIdempotentMemberNotification = notificationModule.persistIdempotentMemberNotification;
    databasePool = databaseModule.pool;
  });

  afterAll(async () => {
    if (adminClient) {await adminClient.end();}
    if (databasePool) {await databasePool.end();}
  });

  async function createSettledFixture() {
    const paidProviderResponse = {
      id: ids.payment,
      given_id: ids.payment,
      status: 'paid',
      amount: 20000,
      currency: 'SAR',
      captured: 20000,
      refunded: 0,
    };

    await adminClient.query('BEGIN');
    try {
      await adminClient.query(
        `INSERT INTO members (
           id, full_name, full_name_ar, phone, membership_number,
           status, membership_status, current_balance
         ) VALUES ($1, 'Codex Reversal Rehearsal', 'محاكاة عكس تمويل', $2, $3,
                   'active', 'active', 123.45)`,
        [ids.member, `+9665${Date.now().toString().slice(-8)}`, `REV-${ids.member.slice(0, 8)}`]
      );
      await adminClient.query(
        `INSERT INTO financing_repayment_plans (
           id, program_type, request_id, member_id,
           principal_amount, fee_amount, total_amount, outstanding_amount,
           installment_count, first_due_date, status, paid_at
         ) VALUES (
           $1, 'family_financing', $2, $3,
           200, 0, 200, 200,
           2, CURRENT_DATE - 30, 'active', NULL
         )`,
        [ids.plan, ids.request, ids.member]
      );
      await adminClient.query(
        `INSERT INTO financing_installments (
           id, plan_id, installment_number, due_date,
           amount, paid_amount, status
         ) VALUES
           ($1, $3, 1, CURRENT_DATE - 30, 100, 0, 'overdue'),
           ($2, $3, 2, CURRENT_DATE + 30, 100, 0, 'scheduled')`,
        [ids.installments[0], ids.installments[1], ids.plan]
      );
      await adminClient.query(
        `INSERT INTO financing_reminder_log (
           installment_id, reminder_type, scheduled_for,
           delivery_status, channel, attempt_count, sent_at, delivered_at,
           external_status, external_attempt_count, external_delivered_at,
           generation, updated_at
         )
         SELECT i.id, milestone.reminder_type,
                i.due_date + milestone.offset_days,
                'sent', 'in_app', 1, NOW(), NOW(),
                'sent', 1, NOW(), 1, NOW()
           FROM financing_installments i
           CROSS JOIN (
             VALUES
               ('due_7_days'::varchar, -7),
               ('due_3_days'::varchar, -3),
               ('due_tomorrow'::varchar, -1),
               ('due_today'::varchar, 0),
               ('overdue_1_day'::varchar, 1),
               ('overdue_7_days'::varchar, 7)
           ) AS milestone(reminder_type, offset_days)
          WHERE i.plan_id = $1`,
        [ids.plan]
      );
      await adminClient.query(
        `INSERT INTO payments (
           id, payer_id, beneficiary_id, amount, currency,
           payment_type, payment_method, category, status,
           financing_plan_id, financing_payment_scope,
           gateway_provider, gateway_payment_id, gateway_status,
           gateway_amount_minor, gateway_currency, gateway_response,
           gateway_protocol_version, gateway_submission_started_at,
           gateway_abandoned_at
         ) VALUES (
           $1, $2, $2, 200, 'SAR',
           'financing_installment', 'apple_pay', 'family_financing', 'pending',
           $3, 'all',
           'moyasar', $1::uuid::text, 'prepared_v2',
           20000, 'SAR', '{}'::jsonb,
           2, NULL, NULL
         )`,
        [ids.payment, ids.member, ids.plan]
      );
      await adminClient.query(
        `UPDATE payments
            SET status = 'pending_verification',
                gateway_status = 'submission_started',
                gateway_submission_started_at = NOW(),
                updated_at = NOW()
          WHERE id = $1`,
        [ids.payment]
      );
      await adminClient.query(
        `INSERT INTO financing_payment_allocations (
           plan_id, installment_id, payment_id, amount
         ) VALUES
           ($1, $2, $4, 100),
           ($1, $3, $4, 100)`,
        [ids.plan, ids.installments[0], ids.installments[1], ids.payment]
      );
      await adminClient.query(
        `UPDATE financing_installments
            SET paid_amount = amount, status = 'paid', paid_at = NOW(), updated_at = NOW()
          WHERE plan_id = $1`,
        [ids.plan]
      );
      await adminClient.query(
        `UPDATE financing_repayment_plans
            SET outstanding_amount = 0, status = 'paid', paid_at = NOW(), updated_at = NOW()
          WHERE id = $1`,
        [ids.plan]
      );
      await adminClient.query(
        `INSERT INTO financing_balance_transactions (
           plan_id, payment_id, member_id, transaction_type,
           amount, balance_before, balance_after, idempotency_key
         ) VALUES (
           $1, $2, $3, 'installment_credit',
           200, 200, 0, $4
         )`,
        [ids.plan, ids.payment, ids.member, `financing-payment:${ids.payment}:settlement-ledger`]
      );
      await adminClient.query(
        `UPDATE payments
            SET status = 'paid', gateway_status = 'paid',
                gateway_verified_at = NOW(), gateway_response = $2::jsonb,
                gateway_failure_reason = NULL, updated_at = NOW()
          WHERE id = $1`,
        [ids.payment, JSON.stringify(paidProviderResponse)]
      );
      await adminClient.query('COMMIT');
    } catch (error) {
      await adminClient.query('ROLLBACK');
      throw error;
    }
  }

  async function persistNotification(idempotencyKey, generation) {
    const client = await databasePool.connect();
    try {
      await client.query('BEGIN');
      const result = await persistIdempotentMemberNotification(
        ids.member,
        {
          title: 'تذكير بقسط التمويل',
          body: 'موعد القسط قريب',
          type: 'financing_installment_reminder',
          priority: 'high',
          relatedId: ids.plan,
          relatedType: 'family_financing',
          actionUrl: '/requests',
          data: {
            financing_plan_id: ids.plan,
            installment_id: ids.installments[0],
            reminder_type: 'due_today',
            reminder_generation: String(generation),
          },
        },
        { client, idempotencyKey }
      );
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  test('reverses exactly once under concurrency and reopens immutable evidence/reminder generations', async () => {
    await createSettledFixture();
    const memberBalanceBefore = await adminClient.query(
      'SELECT current_balance FROM members WHERE id = $1',
      [ids.member]
    );
    const partialEvidence = {
      id: ids.payment,
      given_id: ids.payment,
      status: 'refunded',
      amount: 20000,
      currency: 'SAR',
      captured: 20000,
      refunded: 1000,
      refunded_at: new Date().toISOString(),
      token: 'must-not-enter-financial-evidence',
      source: {
        type: 'applepay',
        number: '**** 4242',
        token: 'must-not-enter-source-evidence',
        name: 'Sensitive Cardholder',
      },
    };
    await expect(reverseSettledFinancingPayment({
      paymentId: ids.payment,
      gatewayPaymentId: ids.payment,
      gatewayProvider: 'moyasar',
      gatewayResponse: partialEvidence,
      evidenceSource: 'reconciliation',
    })).rejects.toMatchObject({
      code: 'FINANCING_PARTIAL_REFUND_REQUIRES_REVIEW',
      reviewRequired: true,
      reviewRecorded: true,
    });
    const quarantine = await adminClient.query(
      `SELECT e.provider_status, e.exception_kind, e.expected_minor,
              e.actual_minor, e.review_status, e.occurrence_count,
              e.provider_response,
              p.status AS payment_status,
              plan.status AS plan_status,
              plan.outstanding_amount
         FROM gateway_financial_exceptions e
         JOIN payments p ON p.id = e.payment_id
         JOIN financing_repayment_plans plan ON plan.id = p.financing_plan_id
        WHERE e.payment_id = $1`,
      [ids.payment]
    );
    expect(quarantine.rows[0]).toEqual(expect.objectContaining({
      provider_status: 'refunded',
      exception_kind: 'partial_refund',
      expected_minor: '20000',
      actual_minor: '1000',
      review_status: 'open',
      occurrence_count: 1,
      payment_status: 'paid',
      plan_status: 'paid',
      outstanding_amount: '0.00',
    }));
    expect(JSON.stringify(quarantine.rows[0].provider_response)).not.toMatch(
      /must-not-enter-financial-evidence|must-not-enter-source-evidence|Sensitive Cardholder/
    );

    const refundEvidence = {
      id: ids.payment,
      given_id: ids.payment,
      status: 'refunded',
      amount: 20000,
      currency: 'SAR',
      captured: 20000,
      refunded: 20000,
      refunded_at: new Date().toISOString(),
      voided_at: null,
    };
    const reverseInput = {
      paymentId: ids.payment,
      gatewayPaymentId: ids.payment,
      gatewayProvider: 'moyasar',
      gatewayResponse: refundEvidence,
      evidenceSource: 'reconciliation',
    };

    const results = await Promise.all([
      reverseSettledFinancingPayment(reverseInput),
      reverseSettledFinancingPayment(reverseInput),
    ]);
    expect(results.map((result) => result.idempotent_replay).sort())
      .toEqual([false, true]);
    const firstResult = results.find((result) => result.idempotent_replay === false);
    expect(firstResult.reopened_installment_ids).toHaveLength(2);
    expect(new Set(firstResult.reopened_installment_ids).size).toBe(2);

    const state = await adminClient.query(
      `SELECT
         (SELECT status FROM payments WHERE id = $1) AS payment_status,
         (SELECT gateway_status FROM payments WHERE id = $1) AS gateway_status,
         (SELECT status FROM financing_repayment_plans WHERE id = $2) AS plan_status,
         (SELECT outstanding_amount FROM financing_repayment_plans WHERE id = $2) AS outstanding,
         (SELECT paid_at FROM financing_repayment_plans WHERE id = $2) AS plan_paid_at,
         (SELECT COUNT(*) FROM financing_payment_allocations WHERE payment_id = $1)::int AS original_count,
         (SELECT SUM(amount) FROM financing_payment_allocations WHERE payment_id = $1) AS original_total,
         (SELECT COUNT(*) FROM financing_payment_reversals WHERE payment_id = $1)::int AS reversal_count,
         (SELECT COUNT(*) FROM financing_payment_reversal_allocations WHERE payment_id = $1)::int AS reversal_allocation_count,
         (SELECT SUM(amount) FROM financing_payment_reversal_allocations WHERE payment_id = $1) AS reversal_total,
         (SELECT COUNT(*) FROM financing_balance_transactions
           WHERE payment_id = $1 AND transaction_type = 'installment_reversal_debit')::int AS reversal_ledger_count,
         (SELECT current_balance FROM members WHERE id = $3) AS member_balance`,
      [ids.payment, ids.plan, ids.member]
    );
    expect(state.rows[0]).toEqual(expect.objectContaining({
      payment_status: 'refunded',
      gateway_status: 'refunded',
      plan_status: 'overdue',
      outstanding: '200.00',
      plan_paid_at: null,
      original_count: 2,
      original_total: '200.00',
      reversal_count: 1,
      reversal_allocation_count: 2,
      reversal_total: '200.00',
      reversal_ledger_count: 1,
      member_balance: memberBalanceBefore.rows[0].current_balance,
    }));

    const installmentState = await adminClient.query(
      `SELECT installment_number, paid_amount, status, paid_at
         FROM financing_installments
        WHERE plan_id = $1
        ORDER BY installment_number`,
      [ids.plan]
    );
    expect(installmentState.rows).toEqual([
      expect.objectContaining({ installment_number: 1, paid_amount: '0.00', status: 'overdue', paid_at: null }),
      expect.objectContaining({ installment_number: 2, paid_amount: '0.00', status: 'scheduled', paid_at: null }),
    ]);

    const reminderState = await adminClient.query(
      `SELECT
         COUNT(*)::int AS current_count,
         COUNT(*) FILTER (WHERE generation = 2)::int AS generation_two_count,
         COUNT(*) FILTER (
           WHERE delivery_status = 'pending'
             AND external_status = 'pending'
             AND notification_id IS NULL
             AND collapse_key IS NULL
         )::int AS fresh_count,
         (SELECT COUNT(*)::int
            FROM financing_reminder_generation_history h
           WHERE h.installment_id = ANY($1::uuid[])
             AND h.generation = 1) AS history_count
        FROM financing_reminder_log
       WHERE installment_id = ANY($1::uuid[])`,
      [ids.installments]
    );
    expect(reminderState.rows[0]).toEqual({
      current_count: 12,
      generation_two_count: 12,
      fresh_count: 12,
      history_count: 12,
    });

    const generationOneKey = financingReminderIdempotencyKey(
      ids.installments[0],
      'due_today',
      1
    );
    const generationTwoKey = financingReminderIdempotencyKey(
      ids.installments[0],
      'due_today',
      2
    );
    const generationOne = await persistNotification(generationOneKey, 1);
    const generationTwoFirst = await persistNotification(generationTwoKey, 2);
    const generationTwoRetry = await persistNotification(generationTwoKey, 2);
    expect(generationOne.created).toBe(true);
    expect(generationTwoFirst.created).toBe(true);
    expect(generationTwoRetry).toEqual({
      notificationId: generationTwoFirst.notificationId,
      created: false,
    });
    expect(generationOne.notificationId).not.toBe(generationTwoFirst.notificationId);
    expect(financingReminderCollapseKey(ids.installments[0], 'due_today', 1))
      .not.toBe(financingReminderCollapseKey(ids.installments[0], 'due_today', 2));

    const notificationRows = await adminClient.query(
      `SELECT idempotency_key, metadata->>'reminder_generation' AS generation
         FROM notifications
        WHERE idempotency_key IN ($1, $2)
        ORDER BY idempotency_key`,
      [generationOneKey, generationTwoKey]
    );
    expect(notificationRows.rows).toEqual(expect.arrayContaining([
      { idempotency_key: generationOneKey, generation: '1' },
      { idempotency_key: generationTwoKey, generation: '2' },
    ]));

    const originalAllocation = await adminClient.query(
      'SELECT id FROM financing_payment_allocations WHERE payment_id = $1 LIMIT 1',
      [ids.payment]
    );
    const reversal = await adminClient.query(
      'SELECT id FROM financing_payment_reversals WHERE payment_id = $1',
      [ids.payment]
    );
    const history = await adminClient.query(
      `SELECT id FROM financing_reminder_generation_history
        WHERE installment_id = $1 LIMIT 1`,
      [ids.installments[0]]
    );
    const ledger = await adminClient.query(
      `SELECT id FROM financing_balance_transactions
        WHERE payment_id = $1 AND transaction_type = 'installment_reversal_debit'`,
      [ids.payment]
    );

    await expect(adminClient.query(
      'UPDATE financing_payment_allocations SET amount = amount WHERE id = $1',
      [originalAllocation.rows[0].id]
    )).rejects.toMatchObject({ code: '23514' });
    await expect(adminClient.query(
      'UPDATE financing_payment_reversals SET provider_status = provider_status WHERE id = $1',
      [reversal.rows[0].id]
    )).rejects.toMatchObject({ code: '23514' });
    await expect(adminClient.query(
      'UPDATE financing_reminder_generation_history SET archived_at = archived_at WHERE id = $1',
      [history.rows[0].id]
    )).rejects.toMatchObject({ code: '23514' });
    await expect(adminClient.query(
      'UPDATE financing_balance_transactions SET amount = amount WHERE id = $1',
      [ledger.rows[0].id]
    )).rejects.toMatchObject({ code: '23514' });
    await expect(adminClient.query(
      "UPDATE payments SET status = 'paid' WHERE id = $1",
      [ids.payment]
    )).rejects.toMatchObject({ code: '23514' });
  }, 30000);
});
