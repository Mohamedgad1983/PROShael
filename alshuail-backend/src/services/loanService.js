/**
 * Loan Service — business logic for refundable loan requests (طلب سلفة مستردة)
 *
 * Centralises the state machine, eligibility logic, and CRUD around
 * loan_requests so the controllers stay thin and the rules don't drift.
 *
 * State machine (see migration 20260427_loan_request_system.sql):
 *
 *   submitted ─► under_fund_review ─► approved_by_fund ─► forwarded_to_brouj
 *                                  └► rejected                 │
 *                                                              ▼
 *                                                       brouj_processing
 *                                                              │ (Najiz upload)
 *                                                              ▼
 *                                                       najiz_uploaded
 *                                                              │ (fee receipt)
 *                                                              ▼
 *                                                        fee_collected
 *                                                              │ (fund disburses)
 *                                                              ▼
 *                                                  ready_for_disbursement → completed
 *
 *   At any point while still on the member side: cancelled
 */

import { query, getClient } from './database.js';
import { log } from '../utils/logger.js';
import { allocateSequence } from './sequenceGenerator.js';
import { recordStatusChange } from './statusHistoryService.js';
import {
  checkSubscriptionsPaid,
  checkProfileComplete,
  runAll,
} from './eligibilityChecker.js';

// ─── constants ────────────────────────────────────────────────────────────────
export const LOAN_STATUS = Object.freeze({
  DRAFT:                  'draft',
  SUBMITTED:              'submitted',
  UNDER_FUND_REVIEW:      'under_fund_review',
  APPROVED_BY_FUND:       'approved_by_fund',
  FORWARDED_TO_BROUJ:     'forwarded_to_brouj',
  BROUJ_PROCESSING:       'brouj_processing',
  NAJIZ_UPLOADED:         'najiz_uploaded',
  FEE_COLLECTED:          'fee_collected',
  READY_FOR_DISBURSEMENT: 'ready_for_disbursement',
  COMPLETED:              'completed',
  REJECTED:               'rejected',
  CANCELLED:              'cancelled',
});

/**
 * Allowed forward transitions. Reverse / sideways edits are not permitted —
 * once a request is rejected/cancelled it stays there.
 */
const ALLOWED_TRANSITIONS = {
  [LOAN_STATUS.SUBMITTED]:              [LOAN_STATUS.UNDER_FUND_REVIEW, LOAN_STATUS.CANCELLED, LOAN_STATUS.REJECTED],
  [LOAN_STATUS.UNDER_FUND_REVIEW]:      [LOAN_STATUS.APPROVED_BY_FUND, LOAN_STATUS.REJECTED, LOAN_STATUS.CANCELLED],
  [LOAN_STATUS.APPROVED_BY_FUND]:       [LOAN_STATUS.FORWARDED_TO_BROUJ, LOAN_STATUS.REJECTED],
  [LOAN_STATUS.FORWARDED_TO_BROUJ]:     [LOAN_STATUS.BROUJ_PROCESSING, LOAN_STATUS.REJECTED],
  [LOAN_STATUS.BROUJ_PROCESSING]:       [LOAN_STATUS.NAJIZ_UPLOADED, LOAN_STATUS.REJECTED],
  [LOAN_STATUS.NAJIZ_UPLOADED]:         [LOAN_STATUS.FEE_COLLECTED, LOAN_STATUS.REJECTED],
  [LOAN_STATUS.FEE_COLLECTED]:          [LOAN_STATUS.READY_FOR_DISBURSEMENT, LOAN_STATUS.REJECTED],
  [LOAN_STATUS.READY_FOR_DISBURSEMENT]: [LOAN_STATUS.COMPLETED, LOAN_STATUS.REJECTED],
  [LOAN_STATUS.COMPLETED]:              [],
  [LOAN_STATUS.REJECTED]:               [],
  [LOAN_STATUS.CANCELLED]:              [],
};

// ─── settings ─────────────────────────────────────────────────────────────────

/**
 * Read the single-row loan_settings table. All callers should use this so
 * tunables flow through one place. Returns sensible fallbacks if the row
 * hasn't been initialised yet (e.g. fresh dev DB).
 */
export async function getLoanSettings() {
  const { rows } = await query('SELECT * FROM loan_settings WHERE id = 1');
  if (rows.length === 0) {
    return {
      admin_fee_rate: 0.10,
      min_loan_amount: 1000,
      max_loan_amount: 10000,
      max_dbr: 0.50,
      allowed_employment_types: 'government',
      enabled: true,
    };
  }
  return rows[0];
}

// ─── eligibility ──────────────────────────────────────────────────────────────

/**
 * Public eligibility check used by the iOS app BEFORE the user starts the form.
 * Returns the exact reason the user is/isn't allowed to apply.
 */
export async function checkLoanEligibility(memberId) {
  const settings = await getLoanSettings();

  if (!settings.enabled) {
    return {
      ok: false,
      code: 'LOAN_DISABLED',
      message: 'خدمة طلبات السلف غير متاحة حالياً',
      message_en: 'Loan service is currently disabled',
    };
  }

  const result = await runAll([
    () => checkSubscriptionsPaid(memberId),
    () => checkProfileComplete(memberId, ['full_name_ar', 'national_id', 'phone']),
  ]);

  if (!result.ok) {return result.failedCheck;}

  return {
    ok: true,
    code: 'ELIGIBLE',
    message: 'يمكنك التقديم على طلب سلفة',
    message_en: 'You can apply for a loan',
    settings: {
      min_loan_amount: Number(settings.min_loan_amount),
      max_loan_amount: Number(settings.max_loan_amount),
      admin_fee_rate: Number(settings.admin_fee_rate),
      max_dbr: Number(settings.max_dbr),
      allowed_employment_types: String(settings.allowed_employment_types || 'government').split(','),
    },
  };
}

// ─── validation ───────────────────────────────────────────────────────────────

/**
 * Validates the *content* of a submitted request body against current
 * settings. Returns null on success or { code, message, message_en } on
 * failure. Always called server-side regardless of what the client did.
 */
export async function validateRequestPayload(payload) {
  const settings = await getLoanSettings();

  const requiredFields = [
    'national_id',
    'date_of_birth',
    'employment_type',
    'monthly_salary',
    'monthly_obligations',
    'loan_amount',
    'terms_accepted',
  ];
  for (const f of requiredFields) {
    const v = payload[f];
    const isEmpty = v === undefined || v === null || v === '';
    if (isEmpty) {
      return {
        code: 'MISSING_FIELD',
        message: `حقل مطلوب: ${f}`,
        message_en: `Missing required field: ${f}`,
      };
    }
  }

  if (payload.terms_accepted !== true && payload.terms_accepted !== 'true') {
    return {
      code: 'TERMS_NOT_ACCEPTED',
      message: 'يجب الموافقة على التعهد والإقرار',
      message_en: 'You must accept the terms',
    };
  }

  // employment type must be in the allowed list (currently 'government' only)
  const allowedTypes = String(settings.allowed_employment_types || 'government').split(',');
  if (!allowedTypes.includes(String(payload.employment_type))) {
    return {
      code: 'EMPLOYMENT_TYPE_NOT_ALLOWED',
      message: 'هذه الخدمة متاحة للموظفين الحكوميين فقط',
      message_en: 'Service is available to government employees only',
    };
  }

  const salary = Number(payload.monthly_salary);
  const obligations = Number(payload.monthly_obligations);
  const amount = Number(payload.loan_amount);

  if (!Number.isFinite(salary) || salary <= 0) {
    return { code: 'INVALID_SALARY', message: 'الراتب الشهري غير صالح', message_en: 'Invalid salary' };
  }
  if (!Number.isFinite(obligations) || obligations < 0) {
    return { code: 'INVALID_OBLIGATIONS', message: 'الالتزامات غير صالحة', message_en: 'Invalid obligations' };
  }
  if (!Number.isFinite(amount)) {
    return { code: 'INVALID_AMOUNT', message: 'مبلغ السلفة غير صالح', message_en: 'Invalid loan amount' };
  }

  if (amount < Number(settings.min_loan_amount) || amount > Number(settings.max_loan_amount)) {
    return {
      code: 'AMOUNT_OUT_OF_RANGE',
      message: `يجب أن يتراوح مبلغ السلفة بين ${settings.min_loan_amount} و ${settings.max_loan_amount} ريال`,
      message_en: `Loan amount must be between ${settings.min_loan_amount} and ${settings.max_loan_amount} SAR`,
    };
  }

  // Debt-burden ratio: obligations as a fraction of GROSS salary.
  if (obligations / salary > Number(settings.max_dbr)) {
    return {
      code: 'DBR_EXCEEDED',
      message: `الالتزامات تتجاوز ${Math.round(Number(settings.max_dbr) * 100)}% من الراتب`,
      message_en: `Obligations exceed ${Math.round(Number(settings.max_dbr) * 100)}% of salary`,
    };
  }

  return null;
}

// ─── creation ─────────────────────────────────────────────────────────────────

/**
 * Insert a new loan_requests row + its initial status_history entry inside a
 * transaction. The caller separately attaches uploaded documents.
 *
 * @returns {Promise<Object>} the inserted loan_requests row
 */
export async function createLoanRequest({ memberId, payload }) {
  const settings = await getLoanSettings();
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const seq = await allocateSequence({
      tableName: 'loan_requests',
      yearColumn: 'sequence_year',
      sequenceColumn: 'sequence_in_year',
      client,
    });

    // Snapshot the applicant's name from the members table at submit time.
    const { rows: memberRows } = await client.query(
      'SELECT full_name_ar, full_name FROM members WHERE id = $1',
      [memberId]
    );
    const m = memberRows[0] || {};
    const applicantName = (m.full_name_ar || m.full_name || '').trim();

    const insert = await client.query(
      `INSERT INTO loan_requests (
         sequence_number, sequence_year, sequence_in_year,
         member_id,
         applicant_name, national_id, date_of_birth,
         employment_type,
         monthly_salary, monthly_obligations, loan_amount,
         admin_fee_rate,
         terms_accepted_at,
         status
       ) VALUES (
         $1, $2, $3,
         $4,
         $5, $6, $7,
         $8,
         $9, $10, $11,
         $12,
         NOW(),
         $13
       )
       RETURNING *`,
      [
        seq.formatted, seq.year, seq.sequenceInYear,
        memberId,
        applicantName, String(payload.national_id), payload.date_of_birth,
        String(payload.employment_type),
        Number(payload.monthly_salary), Number(payload.monthly_obligations), Number(payload.loan_amount),
        Number(settings.admin_fee_rate),
        LOAN_STATUS.SUBMITTED,
      ]
    );
    const created = insert.rows[0];

    await recordStatusChange({
      tableName: 'loan_request_status_history',
      foreignKey: 'loan_request_id',
      recordId: created.id,
      fromStatus: null,
      toStatus: LOAN_STATUS.SUBMITTED,
      changedById: memberId,
      note: 'تم إنشاء الطلب',
      client,
    });

    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    log.error('[loanService] createLoanRequest rollback', { error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

// ─── transition ───────────────────────────────────────────────────────────────

/**
 * Move a request from one status to another, validating the transition is
 * allowed and writing the audit row. Pass `extraUpdates` to set additional
 * columns in the same UPDATE (e.g. reviewed_by_fund_id).
 *
 * @returns {Promise<Object>} updated loan_requests row
 */
export async function transitionStatus({
  loanId,
  toStatus,
  changedById,
  note,
  extraUpdates = {},
}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows: current } = await client.query(
      'SELECT id, status FROM loan_requests WHERE id = $1 FOR UPDATE',
      [loanId]
    );
    if (current.length === 0) {
      const e = new Error('Loan request not found');
      e.code = 'NOT_FOUND';
      throw e;
    }
    const fromStatus = current[0].status;

    const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      const e = new Error(`Illegal transition ${fromStatus} → ${toStatus}`);
      e.code = 'ILLEGAL_TRANSITION';
      throw e;
    }

    // Build dynamic UPDATE: set status + any extras.
    const fields = ['status = $1'];
    const params = [toStatus];
    let p = 2;
    for (const [k, v] of Object.entries(extraUpdates)) {
      fields.push(`${k} = $${p++}`);
      params.push(v);
    }
    params.push(loanId);

    const { rows: updated } = await client.query(
      `UPDATE loan_requests SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
      params
    );

    await recordStatusChange({
      tableName: 'loan_request_status_history',
      foreignKey: 'loan_request_id',
      recordId: loanId,
      fromStatus,
      toStatus,
      changedById,
      note,
      client,
    });

    await client.query('COMMIT');
    return updated[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default {
  LOAN_STATUS,
  getLoanSettings,
  checkLoanEligibility,
  validateRequestPayload,
  createLoanRequest,
  transitionStatus,
};
