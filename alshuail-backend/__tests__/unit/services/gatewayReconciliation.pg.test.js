import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import { randomUUID } from 'node:crypto';

const enabled = process.env.GATEWAY_RECONCILIATION_PG_REHEARSAL === '1';
const databaseName = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '')
  : process.env.DB_NAME || '';

if (enabled && !/^codex_gateway_reconciliation_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error('Refusing gateway reconciliation rehearsal outside a codex disposable database');
}

if (enabled) {
  process.env.PAYMENT_GATEWAY_RECONCILIATION_ENABLED = 'true';
  process.env.PAYMENT_GATEWAY_PROVIDER = 'moyasar';
  process.env.PAYMENT_GATEWAY_CURRENCY = 'SAR';
  process.env.MOYASAR_SECRET_KEY = 'sk_test_reconciliation';
}

const describeRehearsal = enabled ? describe : describe.skip;

describeRehearsal('gateway reconciliation real PostgreSQL leasing', () => {
  let query;
  let pool;
  let reconcileGatewayPayments;
  let getMoyasarGatewayOperationalReadiness;
  let baselineIds = [];
  let baselineStateRows = [];
  let baselineSnapshotComplete = false;
  const memberId = randomUUID();
  const paymentIds = [randomUUID(), randomUUID(), randomUUID()];

  beforeAll(async () => {
    const database = await import('../../../src/services/database.js');
    ({ query, pool } = database);
    ({ reconcileGatewayPayments } = await import(
      '../../../src/services/gatewayReconciliationService.js'
    ));
    ({ getMoyasarGatewayOperationalReadiness } = await import(
      '../../../src/services/moyasarService.js'
    ));

    const baseline = await query(
      `SELECT p.id
         FROM payments p
        WHERE LOWER(BTRIM(p.gateway_provider)) = 'moyasar'
          AND NULLIF(BTRIM(p.gateway_payment_id::text), '') IS NOT NULL
          AND (p.financing_plan_id IS NOT NULL OR p.category = 'subscription')`
    );
    baselineIds = baseline.rows.map((row) => row.id);
    if (baselineIds.length) {
      const snapshot = await query(
        `SELECT *
           FROM gateway_payment_reconciliation_state
          WHERE payment_id = ANY($1::uuid[])`,
        [baselineIds]
      );
      baselineStateRows = snapshot.rows;
      baselineSnapshotComplete = true;
      await query(
        `INSERT INTO gateway_payment_reconciliation_state (
           payment_id, next_check_at, claim_token, lease_expires_at,
           consecutive_failures, check_count, created_at, updated_at
         )
         SELECT id, NULL, NULL, NULL, 0, 0, NOW(), NOW()
           FROM payments
          WHERE id = ANY($1::uuid[])
         ON CONFLICT (payment_id) DO UPDATE
           SET next_check_at = NULL,
               claim_token = NULL,
               lease_expires_at = NULL,
               updated_at = NOW()`,
        [baselineIds]
      );
    }

    await query(
      `INSERT INTO members (id, full_name, status, current_balance)
       VALUES ($1, 'Codex reconciliation lease', 'active', 0)`,
      [memberId]
    );
    for (const paymentId of paymentIds) {
      await query(
        `INSERT INTO payments (
           id, payer_id, beneficiary_id, amount, category, status, payment_method,
           gateway_provider, gateway_payment_id, gateway_status,
           gateway_amount_minor, gateway_currency, gateway_response,
           gateway_protocol_version, gateway_submission_started_at
         ) VALUES (
           $1, $2, $2, 1, 'subscription', 'pending', 'moyasar',
           'moyasar', $3, 'prepared_v2',
           100, 'SAR', '{"protocol_version":2}'::jsonb, 2, NULL
         )`,
        [paymentId, memberId, paymentId]
      );
      await query(
        `UPDATE payments
            SET status = 'pending_verification',
                gateway_status = 'submission_started',
                gateway_submission_started_at = clock_timestamp(),
                updated_at = clock_timestamp()
          WHERE id = $1`,
        [paymentId]
      );
      await query(
        `UPDATE payments
            SET status = 'paid',
                gateway_status = 'paid',
                gateway_verified_at = clock_timestamp(),
                gateway_response = jsonb_build_object(
                  'id', $2::text,
                  'status', 'paid',
                  'amount', 100,
                  'currency', 'SAR'
                ),
                updated_at = clock_timestamp()
          WHERE id = $1`,
        [paymentId, paymentId]
      );
    }
  });

  afterAll(async () => {
    if (query) {
      await query('BEGIN');
      try {
        // This suite is hard-gated to a disposable Codex database above. Production
        // deliberately forbids deleting gateway identities after local abandonment.
        await query("SET LOCAL session_replication_role = 'replica'");
        await query('DELETE FROM gateway_payment_reconciliation_state WHERE payment_id = ANY($1::uuid[])', [paymentIds]);
        await query('DELETE FROM payments WHERE id = ANY($1::uuid[])', [paymentIds]);
        await query('DELETE FROM members WHERE id = $1', [memberId]);
        await query('COMMIT');
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
      if (baselineIds.length && baselineSnapshotComplete) {
        await query(
          'DELETE FROM gateway_payment_reconciliation_state WHERE payment_id = ANY($1::uuid[])',
          [baselineIds]
        );
        for (const row of baselineStateRows) {
          await query(
            `INSERT INTO gateway_payment_reconciliation_state (
               payment_id, next_check_at, claim_token, lease_expires_at,
               last_checked_at, last_provider_status, last_result,
               last_evidence_hash, last_error, consecutive_failures,
               consecutive_not_found, first_not_found_at,
               last_provider_http_status, review_reason,
               check_count, created_at, updated_at
             ) VALUES (
               $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
               $14, $15, $16, $17
             )`,
            [
              row.payment_id,
              row.next_check_at,
              row.claim_token,
              row.lease_expires_at,
              row.last_checked_at,
              row.last_provider_status,
              row.last_result,
              row.last_evidence_hash,
              row.last_error,
              row.consecutive_failures,
              row.consecutive_not_found,
              row.first_not_found_at,
              row.last_provider_http_status,
              row.review_reason,
              row.check_count,
              row.created_at,
              row.updated_at,
            ]
          );
        }
      }
    }
    if (pool) {await pool.end();}
  });

  test('two concurrent workers and a catch-up pass process each identity once', async () => {
    const providerCalls = [];
    const applyCalls = [];
    const fetchPayment = jest.fn(async (paymentId) => {
      providerCalls.push(paymentId);
      await new Promise((resolve) => setTimeout(resolve, 25));
      return { id: paymentId, status: 'paid', amount: 100, currency: 'SAR' };
    });
    const applyProviderState = jest.fn(({ localPayment }) => {
      applyCalls.push(localPayment.id);
      return localPayment;
    });

    const concurrentResults = await Promise.all([
      reconcileGatewayPayments({ limit: 2, fetchPayment, applyProviderState }),
      reconcileGatewayPayments({ limit: 2, fetchPayment, applyProviderState }),
    ]);
    const catchUpResult = await reconcileGatewayPayments({
      limit: 3,
      fetchPayment,
      applyProviderState,
    });

    expect(concurrentResults.reduce((total, result) => total + result.examined, 0))
      .toBe(paymentIds.length);
    expect(catchUpResult.examined).toBe(0);
    expect(new Set(providerCalls)).toEqual(new Set(paymentIds));
    expect(providerCalls).toHaveLength(paymentIds.length);
    expect(new Set(applyCalls)).toEqual(new Set(paymentIds));
    const { rows } = await query(
      `SELECT COUNT(*)::int AS state_count,
              COUNT(*) FILTER (WHERE claim_token IS NOT NULL OR lease_expires_at IS NOT NULL)::int AS leased_count,
              MIN(check_count)::int AS min_checks,
              MAX(check_count)::int AS max_checks
         FROM gateway_payment_reconciliation_state
        WHERE payment_id = ANY($1::uuid[])`,
      [paymentIds]
    );
    expect(rows[0]).toEqual({
      state_count: paymentIds.length,
      leased_count: 0,
      min_checks: 1,
      max_checks: 1,
    });
  });

  test('final schema probe passes and the fourth aged 404 stops without mutating payment', async () => {
    await expect(getMoyasarGatewayOperationalReadiness({ forceRefresh: true }))
      .resolves.toMatchObject({ ready: true, code: null });
    await query(
      `UPDATE gateway_payment_reconciliation_state
          SET next_check_at = NOW(),
              last_result = 'provider_error',
              last_error = 'provider not found',
              consecutive_failures = 3,
              consecutive_not_found = 3,
              first_not_found_at = NOW() - INTERVAL '25 hours',
              last_provider_http_status = 404,
              review_reason = NULL,
              claim_token = NULL,
              lease_expires_at = NULL,
              updated_at = NOW()
        WHERE payment_id = $1`,
      [paymentIds[0]]
    );
    const fetchPayment = jest.fn().mockRejectedValue(
      Object.assign(new Error('not found'), { statusCode: 404 })
    );
    const applyProviderState = jest.fn();

    const result = await reconcileGatewayPayments({
      limit: 1,
      fetchPayment,
      applyProviderState,
    });

    expect(result).toMatchObject({ examined: 1, review_required: 1, failed: 0 });
    expect(applyProviderState).not.toHaveBeenCalled();
    const { rows } = await query(
      `SELECT p.status, p.gateway_status,
              state.last_result, state.next_check_at, state.review_reason,
              state.consecutive_not_found, state.last_provider_http_status
         FROM payments p
         JOIN gateway_payment_reconciliation_state state ON state.payment_id = p.id
        WHERE p.id = $1`,
      [paymentIds[0]]
    );
    expect(rows[0]).toEqual({
      status: 'paid',
      gateway_status: 'paid',
      last_result: 'review_required',
      next_check_at: null,
      review_reason: 'provider_not_found_bounded',
      consecutive_not_found: 4,
      last_provider_http_status: 404,
    });
  });

  test('database rejects an early 404 review and a later 500 resets the 404-only count', async () => {
    await expect(query(
      'DELETE FROM gateway_payment_reconciliation_state WHERE payment_id = $1',
      [paymentIds[0]]
    )).rejects.toMatchObject({ code: '23514' });

    await expect(query(
      `UPDATE gateway_payment_reconciliation_state
          SET next_check_at = NULL,
              last_result = 'review_required',
              consecutive_not_found = 3,
              first_not_found_at = NOW() - INTERVAL '25 hours',
              last_provider_http_status = 404,
              review_reason = 'provider_not_found_bounded',
              claim_token = NULL,
              lease_expires_at = NULL,
              updated_at = NOW()
        WHERE payment_id = $1`,
      [paymentIds[1]]
    )).rejects.toMatchObject({ code: '23514' });

    await query(
      `UPDATE gateway_payment_reconciliation_state
          SET next_check_at = NOW(),
              last_result = 'provider_error',
              consecutive_failures = 3,
              consecutive_not_found = 3,
              first_not_found_at = NOW() - INTERVAL '25 hours',
              last_provider_http_status = 404,
              review_reason = NULL,
              claim_token = NULL,
              lease_expires_at = NULL,
              updated_at = NOW()
        WHERE payment_id = $1`,
      [paymentIds[1]]
    );
    const fetchPayment = jest.fn().mockRejectedValue(
      Object.assign(new Error('provider unavailable'), { statusCode: 500 })
    );

    const result = await reconcileGatewayPayments({
      limit: 1,
      fetchPayment,
      applyProviderState: jest.fn(),
    });

    expect(result).toMatchObject({ examined: 1, failed: 1, review_required: 0 });
    const { rows } = await query(
      `SELECT next_check_at, last_result, consecutive_not_found,
              first_not_found_at, last_provider_http_status, review_reason
         FROM gateway_payment_reconciliation_state
        WHERE payment_id = $1`,
      [paymentIds[1]]
    );
    expect(rows[0]).toMatchObject({
      last_result: 'provider_error',
      consecutive_not_found: 0,
      first_not_found_at: null,
      last_provider_http_status: 500,
      review_reason: null,
    });
    expect(rows[0].next_check_at).not.toBeNull();
  });

  test('authoritative amount mismatch becomes a sanitized durable review without payment mutation', async () => {
    await query(
      `UPDATE gateway_payment_reconciliation_state
          SET next_check_at = NOW(),
              last_result = 'checked',
              last_error = NULL,
              consecutive_failures = 0,
              consecutive_not_found = 0,
              first_not_found_at = NULL,
              last_provider_http_status = NULL,
              review_reason = NULL,
              claim_token = NULL,
              lease_expires_at = NULL,
              updated_at = NOW()
        WHERE payment_id = $1`,
      [paymentIds[2]]
    );
    const fetchPayment = jest.fn((paymentId) => ({
      id: paymentId,
      status: 'paid',
      amount: 99,
      currency: 'SAR',
      source: { type: 'applepay', token: 'must-never-persist' },
    }));

    const result = await reconcileGatewayPayments({ limit: 1, fetchPayment });

    expect(result).toMatchObject({ examined: 1, review_required: 1, failed: 0 });
    const { rows } = await query(
      `SELECT p.status, p.gateway_amount_minor,
              state.last_result, state.next_check_at, state.review_reason,
              state.last_evidence_hash, state.last_error
         FROM payments p
         JOIN gateway_payment_reconciliation_state state ON state.payment_id = p.id
        WHERE p.id = $1`,
      [paymentIds[2]]
    );
    expect(rows[0]).toMatchObject({
      status: 'paid',
      gateway_amount_minor: 100,
      last_result: 'review_required',
      next_check_at: null,
      review_reason: 'gateway_evidence_mismatch',
    });
    expect(rows[0].last_evidence_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].last_error).toContain('GATEWAY_AMOUNT_MISMATCH');
    expect(rows[0].last_error).not.toContain('must-never-persist');
  });
});
