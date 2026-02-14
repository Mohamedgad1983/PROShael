/**
 * Unified Database Service - Direct PostgreSQL via pg.Pool
 *
 * Single database access point for all backend code.
 * Replaces pgQueryBuilder.js and config/database.js.
 *
 * Exports:
 *   query(text, params) - Execute parameterized SQL, returns { rows, rowCount }
 *   getClient()         - Get a client from pool for transactions
 *   pool                - Direct pool access (advanced use only)
 */

import pg from 'pg';
import { log } from '../utils/logger.js';

const { Pool } = pg;

// Build connection config: prefer DATABASE_URL, fall back to individual DB_* vars
const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'alshuail_db',
      user: process.env.DB_USER || 'alshuail',
      password: process.env.DB_PASSWORD,
    };

const pool = new Pool({
  ...connectionConfig,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Pool error handler - log but don't crash
pool.on('error', (err) => {
  log.error('[Database] Unexpected pool error', { error: err.message });
});

pool.on('connect', () => {
  log.debug('[Database] New client connected');
});

/**
 * Execute a parameterized SQL query
 * @param {string} text - SQL query with $1, $2... placeholders
 * @param {Array} params - Parameter values
 * @returns {Promise<{rows: Array, rowCount: number}>}
 */
export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  log.debug('[Database] Query executed', {
    text: text.substring(0, 100),
    duration,
    rowCount: result.rowCount,
  });
  return result;
}

/**
 * Get a client from the pool for transactions
 * MUST call client.release() in a finally block
 *
 * Usage:
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     await client.query('INSERT INTO ...', [...]);
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 */
export function getClient() {
  return pool.connect();
}

log.info('[Database] Service initialized', {
  mode: process.env.DATABASE_URL ? 'DATABASE_URL' : 'DB_* variables',
  max: 20,
  min: 2,
});

export { pool };
export default { query, getClient, pool };
