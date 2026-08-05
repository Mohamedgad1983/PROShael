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
import { createMemberNotification } from './notificationService.js';
import {
  checkSubscriptionsPaid,
  checkProfileComplete,
  runAll,
} from './eligibilityChecker.js';
import {
  FAMILY_FINANCING_TERMS_AR,
  FAMILY_FINANCING_TERMS_VERSION,
  FAMILY_FINANCING_TIERS,
  normalizeFamilyFinancingTiers,
  resolveFamilyFinancingTier,
} from './familyFinancingPolicy.js';

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
  [LOAN_STATUS.NAJIZ_UPLOADED]:         [LOAN_STATUS.READY_FOR_DISBURSEMENT, LOAN_STATUS.FEE_COLLECTED, LOAN_STATUS.REJECTED],
  [LOAN_STATUS.FEE_COLLECTED]:          [LOAN_STATUS.READY_FOR_DISBURSEMENT, LOAN_STATUS.REJECTED],
  [LOAN_STATUS.READY_FOR_DISBURSEMENT]: [LOAN_STATUS.COMPLETED, LOAN_STATUS.REJECTED],
  [LOAN_STATUS.COMPLETED]:              [],
  [LOAN_STATUS.REJECTED]:               [],
  [LOAN_STATUS.CANCELLED]:              [],
};

// ─── notifications ────────────────────────────────────────────────────────────

/**
 * Member-notification template per status. Statuses not in this map are silent
 * because they are member-owned actions such as cancellation.
 *
 * Sent fire-and-forget AFTER the transition COMMIT — failures are logged but
 * never roll back the status change.
 */
const STATUS_NOTIFICATIONS = {
  [LOAN_STATUS.SUBMITTED]: {
    title: 'تم استلام طلب التمويل العائلي',
    body: (loan) => `تم استلام طلب التمويل العائلي رقم ${loan.sequence_number} بنجاح، وستصلك تحديثات كل مرحلة من خلال التطبيق.`,
  },
  [LOAN_STATUS.UNDER_FUND_REVIEW]: {
    title: 'جاري مراجعة طلب التمويل العائلي',
    body: (loan) => `بدأ الصندوق مراجعة طلب التمويل العائلي رقم ${loan.sequence_number}.`,
  },
  [LOAN_STATUS.APPROVED_BY_FUND]: {
    title: 'تمت الموافقة المبدئية',
    body: (loan) => `تمت موافقة الصندوق المبدئية على طلب التمويل العائلي رقم ${loan.sequence_number}. سيتم تحويله للمؤسسة.`,
  },
  [LOAN_STATUS.FORWARDED_TO_BROUJ]: {
    title: 'تم تحويل طلبك للمؤسسة',
    body: (loan) => `تم تحويل طلب التمويل العائلي رقم ${loan.sequence_number} لمؤسسة بروز الريادة لاتخاذ القرار.`,
  },
  [LOAN_STATUS.BROUJ_PROCESSING]: {
    title: 'وافقت المؤسسة على طلب التمويل',
    body: (loan) => `وافقت مؤسسة بروز الريادة على طلب التمويل العائلي رقم ${loan.sequence_number} وبدأت استكمال الإجراءات.`,
  },
  [LOAN_STATUS.NAJIZ_UPLOADED]: {
    title: 'تم تجهيز إقرار ناجز',
    body: (loan) => `تم رفع إقرار الدين من ناجز للطلب رقم ${loan.sequence_number}. طلبك جاهز للمرحلة النهائية.`,
  },
  [LOAN_STATUS.FEE_COLLECTED]: {
    title: 'تم استكمال المعالجة',
    body: (loan) => `تم استكمال معالجة الطلب رقم ${loan.sequence_number}. سيتم الصرف قريباً.`,
  },
  [LOAN_STATUS.READY_FOR_DISBURSEMENT]: {
    title: 'جاهز للصرف',
    body: (loan) => `طلب التمويل العائلي رقم ${loan.sequence_number} جاهز للصرف من الصندوق.`,
  },
  [LOAN_STATUS.COMPLETED]: {
    title: 'تم صرف التمويل العائلي',
    body: (loan) => `تم صرف التمويل العائلي رقم ${loan.sequence_number} وتفعيل جدول الأقساط.`,
  },
  [LOAN_STATUS.REJECTED]: {
    title: 'تم رفض طلب التمويل العائلي',
    body: (loan) => {
      const reason = loan.rejection_reason ? ` السبب: ${loan.rejection_reason}.` : '';
      return `تم رفض طلب التمويل العائلي رقم ${loan.sequence_number}.${reason} للاستفسار يرجى التواصل مع إدارة الصندوق.`;
    },
  },
};

/**
 * Fire-and-forget push dispatch. Looks up the template for `toStatus` and
 * sends a push to the loan's member. Internal try/catch — never throws.
 *
 * The `data` payload is what iOS / the Flutter app reads on tap to deep-link
 * straight to the loan detail screen.
 */
export async function dispatchStatusNotification(loan, toStatus) {
  const template = STATUS_NOTIFICATIONS[toStatus];
  if (!template) {return { success: true, skipped: true, inAppStored: false };}
  try {
    return await createMemberNotification(loan.member_id, {
      title: template.title,
      body: typeof template.body === 'function' ? template.body(loan) : template.body,
      type: 'family_financing_status_update',
      relatedId: loan.id,
      relatedType: 'family_financing',
      actionUrl: '/requests',
      data: {
        type: 'loan_status_update',
        loan_id: String(loan.id),
        sequence_number: String(loan.sequence_number || ''),
        status: String(toStatus),
      },
    });
  } catch (err) {
    log.warn('[loanService] status notification failed (non-fatal)', {
      error: err.message,
      loanId: loan.id,
      toStatus,
    });
    return { success: false, inAppStored: false, error: err.message };
  }
}

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
      admin_fee_rate: 0,
      min_loan_amount: 3000,
      max_loan_amount: 10000,
      max_dbr: 0.50,
      allowed_employment_types: 'government',
      financing_tiers: FAMILY_FINANCING_TIERS,
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
      message: 'خدمة التمويل العائلي غير متاحة حالياً',
      message_en: 'Family financing is currently disabled',
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
    message: 'يمكنك التقديم على التمويل العائلي',
    message_en: 'You can apply for family financing',
    settings: {
      min_loan_amount: Number(settings.min_loan_amount),
      max_loan_amount: Number(settings.max_loan_amount),
      // Kept for older app/admin clients that still decode the field. New
      // member UI must not display this as a separate fee.
      admin_fee_rate: 0,
      max_dbr: Number(settings.max_dbr),
      allowed_employment_types: String(settings.allowed_employment_types || 'government').split(','),
      financing_tiers: normalizeFamilyFinancingTiers(settings.financing_tiers),
      terms_version: FAMILY_FINANCING_TERMS_VERSION,
      terms_text_ar: FAMILY_FINANCING_TERMS_AR,
    },
  };
}

function requestedItemAmountFromPayload(payload) {
  return Number(payload.requested_item_amount ?? payload.loan_amount);
}

function applicantNameFromPayload(payload) {
  return String(
    payload.applicant_name
    ?? payload.applicantName
    ?? payload.full_name
    ?? payload.name
    ?? ''
  )
    .trim()
    .replace(/\s+/g, ' ');
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

  // New mobile flow sends the applicant name typed exactly as shown on the
  // national ID. Keep a fallback for older app versions until the iOS update is
  // fully distributed.
  const hasApplicantNameField = ['applicant_name', 'applicantName', 'full_name', 'name']
    .some((key) => Object.prototype.hasOwnProperty.call(payload, key));
  const applicantName = applicantNameFromPayload(payload);
  if (hasApplicantNameField && (applicantName.length < 2 || applicantName.length > 150)) {
    return {
      code: 'INVALID_APPLICANT_NAME',
      message: 'يرجى إدخال الاسم حسب ما هو مدون بالهوية الوطنية',
      message_en: 'Applicant name must match the national ID record',
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
  const requestedItemAmount = requestedItemAmountFromPayload(payload);

  if (!Number.isFinite(salary) || salary <= 0) {
    return { code: 'INVALID_SALARY', message: 'الراتب الشهري غير صالح', message_en: 'Invalid salary' };
  }
  if (!Number.isFinite(obligations) || obligations < 0) {
    return { code: 'INVALID_OBLIGATIONS', message: 'الالتزامات غير صالحة', message_en: 'Invalid obligations' };
  }
  if (!Number.isFinite(requestedItemAmount)) {
    return { code: 'INVALID_AMOUNT', message: 'مبلغ السلعة غير صالح', message_en: 'Invalid item amount' };
  }

  if (requestedItemAmount < Number(settings.min_loan_amount) || requestedItemAmount > Number(settings.max_loan_amount)) {
    return {
      code: 'AMOUNT_OUT_OF_RANGE',
      message: `يجب أن يتراوح مبلغ السلعة بين ${settings.min_loan_amount} و ${settings.max_loan_amount} ريال`,
      message_en: `Item amount must be between ${settings.min_loan_amount} and ${settings.max_loan_amount} SAR`,
    };
  }

  try {
    resolveFamilyFinancingTier(requestedItemAmount, settings.financing_tiers);
  } catch (error) {
    return {
      code: error.code || 'INVALID_FINANCING_TIER',
      message: error.message,
      message_en: 'Choose an approved financing tier: 3,000, 6,000, or 10,000 SAR',
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

    // Prefer the name typed by the applicant as written on the national ID.
    // Fall back to the member profile only for older mobile builds that do not
    // send applicant_name yet.
    let applicantName = applicantNameFromPayload(payload);
    if (!applicantName) {
      const { rows: memberRows } = await client.query(
        'SELECT full_name_ar, full_name FROM members WHERE id = $1',
        [memberId]
      );
      const m = memberRows[0] || {};
      applicantName = (m.full_name_ar || m.full_name || '').trim();
    }
    const requestedItemAmount = requestedItemAmountFromPayload(payload);
    const tier = resolveFamilyFinancingTier(requestedItemAmount, settings.financing_tiers);
    const effectiveMultiplier = Math.round((tier.total / tier.principal) * 10_000) / 10_000;
    const submittedTermsVersion = String(payload.terms_version || '').trim();
    const acceptedCurrentTerms = submittedTermsVersion === FAMILY_FINANCING_TERMS_VERSION;

    const insert = await client.query(
      `INSERT INTO loan_requests (
         sequence_number, sequence_year, sequence_in_year,
         member_id,
         applicant_name, national_id, date_of_birth,
         employment_type,
         monthly_salary, monthly_obligations, requested_item_amount, loan_amount,
         admin_fee_rate, item_price_multiplier,
         financing_fee_amount, total_repayment_amount, financing_terms_snapshot,
         terms_accepted_at,
         status
       ) VALUES (
         $1, $2, $3,
         $4,
         $5, $6, $7,
         $8,
         $9, $10, $11, $12,
         $13, $14,
         $15, $16, $17,
         NOW(),
         $18
       )
       RETURNING *`,
      [
        seq.formatted, seq.year, seq.sequenceInYear,
        memberId,
        applicantName, String(payload.national_id), payload.date_of_birth,
        String(payload.employment_type),
        Number(payload.monthly_salary), Number(payload.monthly_obligations), requestedItemAmount, tier.total,
        0, effectiveMultiplier,
        tier.fee, tier.total, JSON.stringify({
          policy: 'fixed_family_financing_tiers_v1',
          principal: tier.principal,
          fee: tier.fee,
          total: tier.total,
          terms_version: acceptedCurrentTerms
            ? FAMILY_FINANCING_TERMS_VERSION
            : 'legacy_unversioned',
          terms_text_ar: acceptedCurrentTerms ? FAMILY_FINANCING_TERMS_AR : null,
          early_settlement_via_app: acceptedCurrentTerms,
        }),
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
    const notificationDelivery = await dispatchStatusNotification(created, LOAN_STATUS.SUBMITTED);
    return { ...created, notification_delivery: notificationDelivery };
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

    // Push notification to the borrower — AFTER commit so we never notify on
    // a transition that ended up rolling back. dispatchStatusNotification has
    // its own try/catch so failures here never bubble up.
    const notificationDelivery = await dispatchStatusNotification(updated[0], toStatus);

    return { ...updated[0], notification_delivery: notificationDelivery };
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
