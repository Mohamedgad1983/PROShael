/* eslint-disable no-console */
import crypto from 'crypto';
import pg from 'pg';

const { Pool } = pg;
const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    };

const pool = new Pool(connectionConfig);
const client = await pool.connect();

try {
  await client.query('BEGIN');

  const { rows: memberRows } = await client.query(
    'SELECT id FROM members WHERE is_active = true ORDER BY created_at LIMIT 1'
  );
  const member = memberRows[0];
  if (!member) {
    throw new Error('No active member available for contribution smoke test');
  }

  const { rows: initiativeRows } = await client.query(
    "SELECT id FROM initiatives WHERE status = 'active' ORDER BY created_at LIMIT 1"
  );
  if (initiativeRows[0]) {
    await client.query(
      `INSERT INTO initiative_donations
       (initiative_id, member_id, amount, payment_method, status, client_request_id)
       VALUES ($1, $2, 50, 'bank_transfer', 'pending', $3)`,
      [initiativeRows[0].id, member.id, crypto.randomUUID()]
    );
    console.log('CURRENT_INITIATIVE_INSERT_OK');
  } else {
    console.log('NO_ACTIVE_CURRENT_INITIATIVE');
  }

  const { rows: activityRows } = await client.query(
    "SELECT id FROM activities WHERE status = 'active' ORDER BY created_at LIMIT 1"
  );
  if (activityRows[0]) {
    await client.query(
      `INSERT INTO activity_contributions
       (activity_id, member_id, amount, payment_method, status, client_request_id)
       VALUES ($1, $2, 50, 'bank_transfer', 'pending', $3)`,
      [activityRows[0].id, member.id, crypto.randomUUID()]
    );
    console.log('LEGACY_ACTIVITY_INSERT_OK');
  } else {
    console.log('NO_ACTIVE_LEGACY_ACTIVITY');
  }

  await client.query('ROLLBACK');
  console.log('ROLLBACK_OK');
} catch (error) {
  await client.query('ROLLBACK');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
