/**
 * Status History Service
 *
 * Tiny abstraction over append-only status-history tables (loan_request_status_history,
 * marriage_support_status_history, etc.). Every state transition should call this so we
 * keep a complete audit trail of who-did-what-when.
 *
 * Pattern across feature areas:
 *   <entity>_status_history (id, <entity>_id, from_status, to_status,
 *                            changed_by_id, changed_at, note)
 */

import { query } from './database.js';
import { log } from '../utils/logger.js';

/**
 * Append a status-change row.
 *
 * @param {Object} opts
 * @param {string}  opts.tableName       e.g. 'loan_request_status_history'
 * @param {string}  opts.foreignKey      e.g. 'loan_request_id'
 * @param {string}  opts.recordId        the parent record's id
 * @param {string?} opts.fromStatus      previous status (null for the first transition)
 * @param {string}  opts.toStatus        new status
 * @param {string?} opts.changedById     member id performing the action (nullable for system events)
 * @param {string?} opts.note            free-text reason / detail
 * @param {Object?} opts.client          optional pg client (use when inside a transaction)
 * @returns {Promise<void>}
 */
export async function recordStatusChange({
  tableName,
  foreignKey,
  recordId,
  fromStatus,
  toStatus,
  changedById,
  note,
  client,
}) {
  if (!tableName || !foreignKey || !recordId || !toStatus) {
    throw new Error('recordStatusChange: tableName, foreignKey, recordId, and toStatus are required');
  }

  const sql = `
    INSERT INTO ${tableName} (${foreignKey}, from_status, to_status, changed_by_id, note)
    VALUES ($1, $2, $3, $4, $5)
  `;
  const params = [recordId, fromStatus ?? null, toStatus, changedById ?? null, note ?? null];

  if (client) {
    await client.query(sql, params);
  } else {
    await query(sql, params);
  }

  log.debug('[statusHistory] recorded', { tableName, recordId, fromStatus, toStatus });
}

/**
 * Fetch the full history of a record, newest first.
 *
 * @returns {Promise<Array>} rows
 */
export async function getStatusHistory({ tableName, foreignKey, recordId }) {
  const { rows } = await query(
    `SELECT h.*, m.full_name AS changed_by_name, m.full_name_ar AS changed_by_name_ar
     FROM ${tableName} h
     LEFT JOIN members m ON h.changed_by_id = m.id
     WHERE h.${foreignKey} = $1
     ORDER BY h.changed_at DESC`,
    [recordId]
  );
  return rows;
}

export default { recordStatusChange, getStatusHistory };
