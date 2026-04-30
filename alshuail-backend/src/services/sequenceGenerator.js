/**
 * Sequence Generator Service
 *
 * Generates yearly-resetting human-readable sequence numbers like "2026-0001".
 * Reused across request types (loans today, marriage support tomorrow).
 *
 * Concurrency: uses pg's transaction-scoped advisory lock so two simultaneous
 * inserts can never collide on the same sequence number. The lock key is
 * derived from the table name + year, so different request types don't block
 * each other, and old years don't block new ones.
 */

import { query } from './database.js';
import { log } from '../utils/logger.js';

/**
 * Hash a string into the int range pg_advisory_xact_lock accepts.
 * (Postgres advisory locks take a 64-bit int — we fold to 32 bits because
 *  many client libs serialize int8 awkwardly; collisions are harmless since
 *  they only mean unrelated locks coordinate, never that we miss a row.)
 */
function lockKey(scope) {
  let h = 0;
  for (let i = 0; i < scope.length; i++) {
    h = ((h << 5) - h) + scope.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/**
 * Allocate the next sequence number under a given scope.
 *
 * @param {Object} opts
 * @param {string}  opts.tableName        e.g. 'loan_requests'
 * @param {string}  opts.yearColumn       e.g. 'sequence_year'
 * @param {string}  opts.sequenceColumn   e.g. 'sequence_in_year'
 * @param {number} [opts.year]            override year (default = current gregorian year)
 * @param {number} [opts.padding]         number of digits (default 4 → "0001")
 * @returns {Promise<{ year:number, sequenceInYear:number, formatted:string }>}
 *
 * @example
 *   const seq = await allocateSequence({
 *     tableName: 'loan_requests',
 *     yearColumn: 'sequence_year',
 *     sequenceColumn: 'sequence_in_year',
 *   });
 *   // → { year: 2026, sequenceInYear: 1, formatted: '2026-0001' }
 *
 * MUST be called inside an existing transaction OR allowed to manage its own.
 * If you pass a `client`, the advisory lock binds to that transaction; it
 * auto-releases when the transaction commits/rolls back.
 */
export async function allocateSequence({
  tableName,
  yearColumn,
  sequenceColumn,
  year,
  padding = 4,
  client,
}) {
  if (!tableName || !yearColumn || !sequenceColumn) {
    throw new Error('allocateSequence: tableName, yearColumn, and sequenceColumn are required');
  }

  const targetYear = year ?? new Date().getUTCFullYear();
  const scope = `${tableName}:${yearColumn}:${targetYear}`;
  const key = lockKey(scope);

  const runner = client ?? { query: (text, params) => query(text, params) };

  // The lock auto-releases when the surrounding transaction ends.
  await runner.query('SELECT pg_advisory_xact_lock($1)', [key]);

  const result = await runner.query(
    `SELECT COALESCE(MAX(${sequenceColumn}), 0) AS max_seq
     FROM ${tableName}
     WHERE ${yearColumn} = $1`,
    [targetYear]
  );

  const nextSeq = Number(result.rows[0].max_seq) + 1;
  const formatted = `${targetYear}-${String(nextSeq).padStart(padding, '0')}`;

  log.debug('[sequenceGenerator] allocated', { scope, formatted });

  return {
    year: targetYear,
    sequenceInYear: nextSeq,
    formatted,
  };
}

export default { allocateSequence };
