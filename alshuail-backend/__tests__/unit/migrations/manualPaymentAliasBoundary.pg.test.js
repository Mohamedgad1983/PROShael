import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { randomUUID } from 'node:crypto';

const enabled = process.env.MANUAL_PAYMENT_ALIAS_PG_REHEARSAL === '1';
const databaseName = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '')
  : process.env.DB_NAME || '';

if (enabled && !/^codex_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error('Refusing payment-alias rehearsal outside a codex disposable database');
}

const describeRehearsal = enabled ? describe : describe.skip;

describeRehearsal('electronic payment alias real PostgreSQL boundary', () => {
  let query;
  let pool;
  const memberId = randomUUID();

  beforeAll(async () => {
    const database = await import('../../../src/services/database.js');
    ({ query, pool } = database);
    await query(
      `INSERT INTO members (id, full_name, status, current_balance)
       VALUES ($1, 'Codex electronic alias boundary', 'active', 125)`,
      [memberId]
    );
  });

  afterAll(async () => {
    if (query) {
      await query('DELETE FROM members WHERE id = $1', [memberId]);
    }
    if (pool) {await pool.end();}
  });

  test.each([
    'app_payment',
    'apple_pay',
    'card',
    'credit_card',
    'knet',
    'moyasar',
    'online',
  ])('rejects a new bare %s payment', async (method) => {
    const paymentId = randomUUID();

    await expect(query(
      `INSERT INTO payments (
         id, payer_id, beneficiary_id, amount, category, status, payment_method
       ) VALUES ($1, $2, $2, 50, 'subscription', 'paid', $3)`,
      [paymentId, memberId, method]
    )).rejects.toMatchObject({ code: '23514' });

    const paymentCount = await query(
      'SELECT COUNT(*)::int AS count FROM payments WHERE id = $1',
      [paymentId]
    );
    const member = await query(
      'SELECT current_balance FROM members WHERE id = $1',
      [memberId]
    );
    expect(paymentCount.rows[0].count).toBe(0);
    expect(Number(member.rows[0].current_balance)).toBe(125);
  });

  test('preserves the canonical prepared Moyasar protocol-v2 insertion path', async () => {
    const paymentId = randomUUID();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO payments (
           id, payer_id, beneficiary_id, amount, category, status, payment_method,
           gateway_provider, gateway_payment_id, gateway_status,
           gateway_amount_minor, gateway_currency, gateway_response,
           gateway_protocol_version, gateway_submission_started_at,
           gateway_abandoned_at, gateway_verified_at
         ) VALUES (
           $1, $2, $2, 50, 'subscription', 'pending', 'moyasar',
           'moyasar', $1::uuid::text, 'prepared_v2',
           5000, 'SAR', '{}'::jsonb,
           2, NULL, NULL, NULL
         ) RETURNING id, status, gateway_status`,
        [paymentId, memberId]
      );
      expect(inserted.rows[0]).toMatchObject({
        id: paymentId,
        status: 'pending',
        gateway_status: 'prepared_v2',
      });

      const submitted = await client.query(
        `UPDATE payments
            SET status = 'pending_verification',
                gateway_status = 'submission_started',
                gateway_submission_started_at = NOW()
          WHERE id = $1
          RETURNING status, gateway_status`,
        [paymentId]
      );
      expect(submitted.rows[0]).toMatchObject({
        status: 'pending_verification',
        gateway_status: 'submission_started',
      });

      const providerEvidence = {
        id: paymentId,
        given_id: paymentId,
        status: 'paid',
        amount: 5000,
        captured: 5000,
        refunded: 0,
        currency: 'SAR',
      };
      const paid = await client.query(
        `UPDATE payments
            SET status = 'paid',
                payment_method = 'moyasar',
                gateway_status = 'paid',
                gateway_response = $2::jsonb,
                gateway_verified_at = NOW(),
                processed_at = NOW()
          WHERE id = $1
          RETURNING status, gateway_status`,
        [paymentId, JSON.stringify(providerEvidence)]
      );
      expect(paid.rows[0]).toMatchObject({ status: 'paid', gateway_status: 'paid' });

      const creditedMember = await client.query(
        'SELECT current_balance FROM members WHERE id = $1',
        [memberId]
      );
      expect(Number(creditedMember.rows[0].current_balance)).toBe(175);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('does not block cash, pending bank transfer, or check rows', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO payments (
           id, payer_id, beneficiary_id, amount, category, status, payment_method
         ) VALUES
           ($1, $4, $4, 10, 'subscription', 'paid', 'cash'),
           ($2, $4, $4, 10, 'subscription', 'pending', 'bank_transfer'),
           ($3, $4, $4, 10, 'subscription', 'paid', 'check')
         RETURNING payment_method`,
        [randomUUID(), randomUUID(), randomUUID(), memberId]
      );
      expect(inserted.rows.map((row) => row.payment_method).sort()).toEqual([
        'bank_transfer', 'cash', 'check',
      ]);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('prevents relabelling a manual row as electronic', async () => {
    const paymentId = randomUUID();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO payments (
           id, payer_id, beneficiary_id, amount, category, status, payment_method
         ) VALUES ($1, $2, $2, 10, 'subscription', 'paid', 'cash')`,
        [paymentId, memberId]
      );
      await client.query('SAVEPOINT before_unsafe_relabel');
      await expect(client.query(
        "UPDATE payments SET payment_method = 'online' WHERE id = $1",
        [paymentId]
      )).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT before_unsafe_relabel');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('prevents hard deletion of a settled cash payment', async () => {
    const client = await pool.connect();
    const paymentId = randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO payments (
           id, payer_id, beneficiary_id, amount, category, status, payment_method
         ) VALUES ($1, $2, $2, 10, 'initiative', 'paid', 'cash')`,
        [paymentId, memberId]
      );
      await client.query('SAVEPOINT before_settled_delete');
      await expect(client.query(
        'DELETE FROM payments WHERE id = $1',
        [paymentId]
      )).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT before_settled_delete');

      const retained = await client.query(
        'SELECT status, payment_method FROM payments WHERE id = $1',
        [paymentId]
      );
      expect(retained.rows[0]).toMatchObject({ status: 'paid', payment_method: 'cash' });
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  test('freezes and protects a pre-migration bare electronic evidence row', async () => {
    const client = await pool.connect();
    const paymentId = randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(
        'ALTER TABLE payments DISABLE TRIGGER trg_enforce_electronic_payment_alias_boundary'
      );
      await client.query(
        `INSERT INTO payments (
           id, payer_id, beneficiary_id, amount, category, status, payment_method
         ) VALUES ($1, $2, $2, 10, 'subscription', 'pending', 'online')`,
        [paymentId, memberId]
      );
      await client.query(
        'ALTER TABLE payments ENABLE TRIGGER trg_enforce_electronic_payment_alias_boundary'
      );

      await client.query('SAVEPOINT before_historical_update');
      await expect(client.query(
        "UPDATE payments SET status = 'paid' WHERE id = $1",
        [paymentId]
      )).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT before_historical_update');

      await client.query('SAVEPOINT before_historical_delete');
      await expect(client.query(
        'DELETE FROM payments WHERE id = $1',
        [paymentId]
      )).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT before_historical_delete');

      const corrected = await client.query(
        "UPDATE payments SET notes = 'legacy evidence retained' WHERE id = $1 RETURNING notes",
        [paymentId]
      );
      expect(corrected.rows[0].notes).toBe('legacy evidence retained');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });
});
