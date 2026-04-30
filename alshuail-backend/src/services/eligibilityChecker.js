/**
 * Eligibility Checker Service
 *
 * Composable, pure-async checks members must pass before opening a request
 * (loans, marriage support, future request types). Each check returns an
 * { ok, code, message, message_en } object so callers can either short-circuit
 * with a 403 or surface a clear UX message in the iOS app.
 *
 * Reused — DON'T inline copies of these checks in feature controllers; extend
 * here so every request type stays consistent.
 */

import { query } from './database.js';
import { log } from '../utils/logger.js';

/**
 * Member must have no unpaid subscriptions.
 *
 * The truth source is `members.current_balance`. The fund treats `current_balance < 0`
 * as "owes the fund" — so a non-negative balance means subscriptions are settled.
 *
 * @param {string} memberId
 * @returns {Promise<{ok:boolean, code:string, message:string, message_en:string, balance:number}>}
 */
export async function checkSubscriptionsPaid(memberId) {
  const { rows } = await query(
    'SELECT current_balance FROM members WHERE id = $1',
    [memberId]
  );

  if (rows.length === 0) {
    return {
      ok: false,
      code: 'MEMBER_NOT_FOUND',
      message: 'العضو غير موجود',
      message_en: 'Member not found',
      balance: 0,
    };
  }

  const balance = Number(rows[0].current_balance) || 0;
  if (balance < 0) {
    return {
      ok: false,
      code: 'SUBSCRIPTIONS_UNPAID',
      message: `لا يمكنك التقديم — رصيدك الحالي ${balance.toLocaleString('ar-SA')} ر.س. يرجى تسوية الاشتراكات أولاً.`,
      message_en: `Cannot apply — current balance is ${balance} SAR. Please settle subscriptions first.`,
      balance,
    };
  }

  return {
    ok: true,
    code: 'SUBSCRIPTIONS_PAID',
    message: 'الاشتراكات مسددة',
    message_en: 'Subscriptions paid',
    balance,
  };
}

/**
 * Member's profile must contain the fields required for a request.
 *
 * @param {string} memberId
 * @param {string[]} [requiredFields] DB column names (default = the fields
 *   needed for loans/marriage: name, national_id, phone, IBAN, employer)
 * @returns {Promise<{ok:boolean, code:string, message:string, message_en:string, missing?:string[]}>}
 */
export async function checkProfileComplete(
  memberId,
  requiredFields = ['full_name_ar', 'national_id', 'phone', 'iban', 'employer']
) {
  // Build a SELECT that only references columns that actually exist on the
  // members table — older deployments may not have iban/employer yet.
  const { rows: cols } = await query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'members'`
  );
  const existingCols = new Set(cols.map(r => r.column_name));
  const usableFields = requiredFields.filter(f => existingCols.has(f));

  if (usableFields.length === 0) {
    log.warn('[eligibility] no required columns exist on members table', { requiredFields });
    return { ok: true, code: 'PROFILE_OK', message: 'الملف مكتمل', message_en: 'Profile complete' };
  }

  const selectList = usableFields.join(', ');
  const { rows } = await query(
    `SELECT ${selectList} FROM members WHERE id = $1`,
    [memberId]
  );

  if (rows.length === 0) {
    return {
      ok: false,
      code: 'MEMBER_NOT_FOUND',
      message: 'العضو غير موجود',
      message_en: 'Member not found',
    };
  }

  const member = rows[0];
  const missing = usableFields.filter(f => {
    const v = member[f];
    return v === null || v === undefined || String(v).trim() === '';
  });

  if (missing.length > 0) {
    return {
      ok: false,
      code: 'PROFILE_INCOMPLETE',
      message: 'يرجى إكمال بياناتك الشخصية أولاً',
      message_en: 'Please complete your profile first',
      missing,
    };
  }

  return {
    ok: true,
    code: 'PROFILE_OK',
    message: 'الملف مكتمل',
    message_en: 'Profile complete',
  };
}

/**
 * Run multiple checks in order, returning the first failure or success-all.
 *
 * @param {Array<Function>} checks  array of () => Promise<CheckResult>
 * @returns {Promise<{ok:boolean, results: CheckResult[], failedCheck?: CheckResult}>}
 */
export async function runAll(checks) {
  const results = [];
  for (const check of checks) {
    const r = await check();
    results.push(r);
    if (!r.ok) {
      return { ok: false, results, failedCheck: r };
    }
  }
  return { ok: true, results };
}

export default { checkSubscriptionsPaid, checkProfileComplete, runAll };
