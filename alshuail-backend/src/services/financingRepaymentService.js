import { createHash, randomUUID } from 'node:crypto';
import * as database from './database.js';
import { log } from '../utils/logger.js';
import { createMemberNotification } from './notificationService.js';
import { config } from '../config/env.js';
import {
  fetchMoyasarPayment,
  getMoyasarGatewayOperationalReadiness,
  isMoyasarEnabledForIos,
  sanitizeMoyasarPaymentEvidence,
} from './moyasarService.js';
import {
  cancelFinancingReminderJobsForInstallmentInTransaction,
  isFinancingRemindersEnabled,
  processFinancingReminders,
  seedFinancingReminderJobsForInstallmentInTransaction,
  startFinancingReminderScheduler,
} from './financingReminderService.js';

const query = (...args) => database.query(...args);
const getClient = (...args) => database.getClient(...args);

export {
  isFinancingRemindersEnabled,
  processFinancingReminders,
  startFinancingReminderScheduler,
};

export const FINANCING_PROGRAM = Object.freeze({
  FAMILY: 'family_financing',
  MARRIAGE: 'marriage_support',
});

export const DEFAULT_FINANCING_TIERS = Object.freeze([
  Object.freeze({ principal: 3000, fee: 450 }),
  Object.freeze({ principal: 6000, fee: 750 }),
  Object.freeze({ principal: 10000, fee: 1050 }),
]);

const DEFAULT_INSTALLMENT_COUNT = 10;
const MAX_INSTALLMENT_COUNT = 12;
const OPEN_PAYMENT_STATUSES = Object.freeze(['pending', 'pending_verification']);
const GATEWAY_PROTOCOL_VERSION = 2;
const GATEWAY_PREPARED_STATUS = 'prepared_v2';
const PROVIDER_AMOUNT_EXCEPTION = Object.freeze({
  captured: Object.freeze({
    code: 'GATEWAY_CAPTURE_AMOUNT_MISMATCH_REVIEW_REQUIRED',
    kind: 'partial_capture',
    reason: 'PARTIAL_OR_INVALID_PROVIDER_CAPTURE_REQUIRES_REVIEW',
    message: 'مبلغ التحصيل المؤكد من بوابة الدفع لا يطابق المبلغ المطلوب؛ لم يتغير الرصيد',
    amountField: 'captured',
  }),
  refunded: Object.freeze({
    code: 'GATEWAY_REFUND_AMOUNT_MISMATCH_REVIEW_REQUIRED',
    kind: 'partial_refund',
    reason: 'PARTIAL_OR_INVALID_PROVIDER_REFUND_REQUIRES_REVIEW',
    message: 'مبلغ الاسترداد المؤكد من بوابة الدفع غير كامل؛ لم يتغير الرصيد',
    amountField: 'refunded',
  }),
  voided: Object.freeze({
    code: 'GATEWAY_VOID_EVIDENCE_INVALID_REVIEW_REQUIRED',
    kind: 'invalid_void_evidence',
    reason: 'CONTRADICTORY_PROVIDER_VOID_REQUIRES_REVIEW',
    message: 'إثبات إلغاء بوابة الدفع لا يطابق مبلغاً سبق تحصيله؛ لم يتغير الرصيد',
    amountField: 'captured',
  }),
});
export const FINANCING_BUSINESS_TIME_ZONE = config.financingRepayment?.businessTimeZone || 'Asia/Riyadh';

function serviceError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function isFinancingRepaymentEnabled() {
  return config.financingRepayment?.enabled === true;
}

export function isFinancingGatewayEnabled() {
  return config.financingRepayment?.gatewayEnabled === true;
}

export function isFinancingOnlinePaymentEnabled() {
  return isFinancingRepaymentEnabled()
    && isFinancingGatewayEnabled()
    && isMoyasarEnabledForIos()
    && config.paymentGateway?.reconciliationEnabled === true
    && String(config.paymentGateway?.currency || '').trim().toUpperCase() === 'SAR'
    && Boolean(String(config.paymentGateway?.moyasar?.webhookSecret || '').trim());
}

function asMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function moneyCents(value) {
  return Math.round(Number(value) * 100);
}

export function detectGatewayFinancialAmountException(localPayment, providerPayment) {
  const providerStatus = String(providerPayment?.status || '').trim().toLowerCase();
  const definition = PROVIDER_AMOUNT_EXCEPTION[providerStatus];
  if (!definition) {return null;}

  // A void before capture is an ordinary terminal result. A locally paid or
  // pending-refund row, however, represents money already treated as fully
  // captured. Such a contradictory provider void must prove the same full
  // captured amount and include Moyasar's void timestamp before any reversal
  // workflow is allowed to inspect it as valid evidence.
  const localStatus = String(localPayment?.status || '').trim().toLowerCase();
  if (providerStatus === 'voided' && !['paid', 'pending_refund'].includes(localStatus)) {
    return null;
  }

  const expectedMinor = Number(
    localPayment.gateway_amount_minor ?? moneyCents(localPayment.amount)
  );
  const rawObservedMinor = providerPayment?.[definition.amountField];
  const observedMinor = rawObservedMinor === null
    || rawObservedMinor === undefined
    || rawObservedMinor === ''
    ? Number.NaN
    : Number(rawObservedMinor);
  const exactObservedAmount = Number.isSafeInteger(observedMinor)
    && observedMinor === expectedMinor;
  const hasRequiredProviderTimestamp = providerStatus !== 'voided'
    || Boolean(String(providerPayment?.voided_at || '').trim());
  if (exactObservedAmount && hasRequiredProviderTimestamp) {
    return null;
  }

  return {
    ...definition,
    providerStatus,
    expectedMinor,
    observedMinor: Number.isSafeInteger(observedMinor) ? observedMinor : null,
    evidenceIssue: providerStatus === 'voided' && !hasRequiredProviderTimestamp
      ? 'voided_at_missing'
      : 'amount_mismatch',
  };
}

function gatewayEvidenceHash(canonicalEvidence) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalEvidence), 'utf8')
    .digest('hex');
}

export async function recordGatewayFinancialException({
  localPayment,
  providerPayment,
  exception,
  executeQuery = query,
}) {
  const observed = exception.observedMinor === null ? 'missing_or_invalid' : exception.observedMinor;
  const reviewReason = `${exception.reason}; expected_minor=${exception.expectedMinor}; observed_minor=${observed}; evidence_issue=${exception.evidenceIssue || 'amount_mismatch'}`;
  const canonicalEvidence = sanitizeMoyasarPaymentEvidence(providerPayment);
  const evidenceHash = gatewayEvidenceHash(canonicalEvidence);
  const { rows } = await executeQuery(
    `INSERT INTO gateway_financial_exceptions (
       payment_id, gateway_provider, gateway_payment_id, provider_status,
       exception_kind, expected_minor, actual_minor, currency,
       evidence_hash, provider_response, review_status,
       occurrence_count, first_seen_at, last_seen_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8,
       $9, $10::jsonb, 'open', 1, NOW(), NOW()
     )
     ON CONFLICT (payment_id, provider_status, evidence_hash) DO UPDATE
       SET occurrence_count = gateway_financial_exceptions.occurrence_count + 1,
           last_seen_at = NOW()
     RETURNING id, review_status, occurrence_count`,
    [
      localPayment.id,
      String(localPayment.gateway_provider || 'moyasar').trim().toLowerCase(),
      String(localPayment.gateway_payment_id || '').trim(),
      exception.providerStatus,
      exception.kind,
      exception.expectedMinor,
      exception.observedMinor,
      String(localPayment.gateway_currency || 'SAR').trim().toUpperCase(),
      evidenceHash,
      JSON.stringify(canonicalEvidence),
    ]
  );

  return {
    evidenceHash,
    reviewReason,
    exceptionRecord: rows[0] || null,
  };
}

export function gatewayFinancialExceptionError(exception, reviewRecorded = false) {
  const error = serviceError(exception.message, exception.code);
  error.statusCode = 409;
  error.reviewRequired = true;
  error.reviewRecorded = reviewRecorded;
  return error;
}

function sameMoney(left, right) {
  return moneyCents(left) === moneyCents(right);
}

function parseDateOnly(value) {
  const raw = String(value || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) {
    const error = new Error('تاريخ أول قسط غير صالح');
    error.code = 'INVALID_FIRST_DUE_DATE';
    throw error;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    const error = new Error('تاريخ أول قسط غير صالح');
    error.code = 'INVALID_FIRST_DUE_DATE';
    throw error;
  }
  return date;
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function databaseDateOnly(value) {
  if (value instanceof Date) {return formatDateOnly(value);}
  return String(value || '').slice(0, 10);
}

export function financingBusinessDate(fromDate = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: FINANCING_BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(fromDate)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function validateFirstDueDate(value, { today = financingBusinessDate() } = {}) {
  const dueDate = formatDateOnly(parseDateOnly(value));
  const businessToday = formatDateOnly(parseDateOnly(today));
  if (dueDate < businessToday) {
    throw serviceError('تاريخ أول قسط لا يمكن أن يكون في الماضي', 'FIRST_DUE_DATE_IN_PAST');
  }
  return dueDate;
}

function addMonthsClamped(date, monthOffset) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + monthOffset;
  const day = date.getUTCDate();
  const first = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, lastDay)));
}

export function normalizeFinancingTiers(_rawTiers) {
  // Package amounts and fees are a fixed programme policy. Stored settings
  // cannot silently override them. Always returning fresh objects protects the
  // frozen defaults and canonicalises databases that still hold legacy fees.
  return DEFAULT_FINANCING_TIERS.map((tier) => ({ ...tier }));
}

export function resolveFinancingTier(principalAmount, rawTiers, { requireExact = true } = {}) {
  const principal = asMoney(principalAmount);
  const tiers = normalizeFinancingTiers(rawTiers);
  const exact = tiers.find((tier) => tier.principal === principal);
  if (exact) {
    return { ...exact, total: asMoney(exact.principal + exact.fee) };
  }
  if (requireExact) {
    const error = new Error('يجب اختيار إحدى باقات التمويل المعتمدة: 3,000 أو 6,000 أو 10,000 ريال');
    error.code = 'INVALID_FINANCING_TIER';
    throw error;
  }
  const bracket = tiers.find((tier) => principal <= tier.principal) || tiers[tiers.length - 1];
  return { principal, fee: bracket.fee, total: asMoney(principal + bracket.fee) };
}

function validMoney(value, { allowZero = false } = {}) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && (allowZero ? numeric >= 0 : numeric > 0);
}

function invalidTermsSnapshot() {
  return serviceError(
    'بيانات شروط التمويل المحفوظة غير صالحة وتتطلب مراجعة مالية',
    'FINANCING_TERMS_SNAPSHOT_INVALID'
  );
}

/**
 * Resolve immutable request-time loan terms without repricing historical rows.
 * Valid snapshots (including the 3,000 + 500 v2 production terms) remain
 * authoritative; NULL snapshots use the original amount/generated admin fee.
 */
export function resolveLoanDisbursementTerms(loan) {
  let snapshot = loan.financing_terms_snapshot;
  if (typeof snapshot === 'string') {
    try {
      snapshot = JSON.parse(snapshot);
    } catch (_error) {
      throw invalidTermsSnapshot();
    }
  }

  if (snapshot !== null && snapshot !== undefined) {
    if (typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      throw invalidTermsSnapshot();
    }
    const principal = Number(snapshot.principal);
    const feeAmount = Number(snapshot.fee);
    const totalAmount = Number(snapshot.total);
    if (
      !validMoney(principal)
      || !validMoney(feeAmount, { allowZero: true })
      || !validMoney(totalAmount)
      || moneyCents(principal + feeAmount) !== moneyCents(totalAmount)
    ) {
      throw invalidTermsSnapshot();
    }

    const requestedPrincipal = Number(loan.requested_item_amount);
    const loanAmount = Number(loan.loan_amount);
    const requestMatches = validMoney(requestedPrincipal)
      ? moneyCents(requestedPrincipal) === moneyCents(principal)
      : (
        validMoney(loanAmount)
        && [moneyCents(principal), moneyCents(totalAmount)].includes(moneyCents(loanAmount))
      );
    if (
      !requestMatches
      || (
        loan.financing_fee_amount !== null
        && loan.financing_fee_amount !== undefined
        && moneyCents(loan.financing_fee_amount) !== moneyCents(feeAmount)
      )
      || (
        loan.total_repayment_amount !== null
        && loan.total_repayment_amount !== undefined
        && moneyCents(loan.total_repayment_amount) !== moneyCents(totalAmount)
      )
    ) {
      throw invalidTermsSnapshot();
    }
    return {
      principal,
      feeAmount,
      totalAmount,
      isLegacy: Number(snapshot.policy_version || 0) < 3,
    };
  }

  const requestedPrincipal = Number(loan.requested_item_amount);
  const loanAmount = Number(loan.loan_amount);
  const principal = validMoney(requestedPrincipal) ? requestedPrincipal : loanAmount;
  if (!validMoney(principal)) {throw invalidTermsSnapshot();}
  const legacyAdminFee = Number(loan.admin_fee_amount);
  const feeAmount = validMoney(requestedPrincipal) && validMoney(loanAmount) && loanAmount > principal
    ? Math.round((loanAmount - principal) * 100) / 100
    : Math.max(0, Number.isFinite(legacyAdminFee) ? legacyAdminFee : 0);
  return {
    principal,
    feeAmount,
    totalAmount: Math.round((principal + feeAmount) * 100) / 100,
    isLegacy: true,
  };
}

export function buildInstallmentSchedule({ totalAmount, installmentCount, firstDueDate }) {
  const totalCents = Math.round(Number(totalAmount) * 100);
  const count = Number(installmentCount);
  if (!Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENT_COUNT) {
    const error = new Error('عدد الأقساط يجب أن يكون من شهر واحد إلى 12 شهراً');
    error.code = 'INVALID_INSTALLMENT_COUNT';
    throw error;
  }
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    const error = new Error('إجمالي التمويل غير صالح');
    error.code = 'INVALID_TOTAL_AMOUNT';
    throw error;
  }
  const startDate = parseDateOnly(firstDueDate);
  const baseCents = Math.floor(totalCents / count);
  let remainder = totalCents - (baseCents * count);
  return Array.from({ length: count }, (_, index) => {
    const amountCents = baseCents + (remainder > 0 ? 1 : 0);
    if (remainder > 0) {remainder -= 1;}
    return {
      installmentNumber: index + 1,
      dueDate: formatDateOnly(addMonthsClamped(startDate, index)),
      amount: amountCents / 100,
    };
  });
}

export function defaultFirstDueDate(fromDate = new Date()) {
  const source = parseDateOnly(financingBusinessDate(fromDate));
  return formatDateOnly(addMonthsClamped(source, 1));
}

export function validateInstallmentCount(value, maxCount = MAX_INSTALLMENT_COUNT) {
  const count = value === undefined || value === null
    ? DEFAULT_INSTALLMENT_COUNT
    : Number(value);
  const max = Math.min(MAX_INSTALLMENT_COUNT, Math.max(1, Number(maxCount) || MAX_INSTALLMENT_COUNT));
  if (!Number.isInteger(count) || count < 1 || count > max) {
    const error = new Error(`عدد الأقساط يجب أن يكون بين 1 و${max} شهراً`);
    error.code = 'INVALID_INSTALLMENT_COUNT';
    throw error;
  }
  return count;
}

export async function createRepaymentPlanInTransaction({
  client,
  programType,
  requestId,
  memberId,
  principalAmount,
  feeAmount,
  installmentCount = DEFAULT_INSTALLMENT_COUNT,
  firstDueDate = defaultFirstDueDate(),
  createdById,
}) {
  if (!isFinancingRepaymentEnabled()) {
    throw serviceError('نظام جداول سداد التمويل غير مفعل حالياً', 'FINANCING_REPAYMENT_DISABLED');
  }
  if (!Object.values(FINANCING_PROGRAM).includes(programType)) {
    throw serviceError('نوع برنامج التمويل غير صالح', 'INVALID_PROGRAM_TYPE');
  }
  const count = validateInstallmentCount(installmentCount);
  const principal = asMoney(principalAmount);
  const fee = asMoney(feeAmount);
  if (!Number.isFinite(principal) || principal <= 0) {
    throw serviceError('مبلغ أصل التمويل غير صالح', 'INVALID_PRINCIPAL_AMOUNT');
  }
  if (!Number.isFinite(fee) || fee < 0) {
    throw serviceError('رسوم التمويل غير صالحة', 'INVALID_FEE_AMOUNT');
  }
  const total = asMoney(principal + fee);
  const canonicalFirstDueDate = validateFirstDueDate(firstDueDate);
  const schedule = buildInstallmentSchedule({
    totalAmount: total,
    installmentCount: count,
    firstDueDate: canonicalFirstDueDate,
  });

  const { rows: existingRows } = await client.query(
    `SELECT * FROM financing_repayment_plans
     WHERE program_type = $1 AND request_id = $2
     FOR UPDATE`,
    [programType, requestId]
  );
  if (existingRows.length) {
    const existing = existingRows[0];
    const isSamePlan = String(existing.member_id) === String(memberId)
      && sameMoney(existing.principal_amount, principal)
      && sameMoney(existing.fee_amount, fee)
      && Number(existing.installment_count) === count
      && databaseDateOnly(existing.first_due_date) === canonicalFirstDueDate;
    if (!isSamePlan) {
      throw serviceError(
        'يوجد جدول سداد مختلف لهذا الطلب ويتطلب مراجعة مالية',
        'REPAYMENT_PLAN_CONFLICT'
      );
    }
    return { ...existing, idempotent_replay: true };
  }

  const { rows: memberRows } = await client.query(
    'SELECT id FROM members WHERE id = $1 FOR UPDATE',
    [memberId]
  );
  if (!memberRows.length) {
    const error = new Error('العضو غير موجود');
    error.code = 'MEMBER_NOT_FOUND';
    throw error;
  }
  const { rows: planRows } = await client.query(
    `INSERT INTO financing_repayment_plans (
       program_type, request_id, member_id,
       principal_amount, fee_amount, total_amount, outstanding_amount,
       installment_count, first_due_date, status,
       created_by_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, 'active', $9)
     RETURNING *`,
    [programType, requestId, memberId, principal, fee, total, count, canonicalFirstDueDate, createdById || null]
  );
  const plan = planRows[0];

  for (const item of schedule) {
    const { rows: installmentRows } = await client.query(
      `INSERT INTO financing_installments (
         plan_id, installment_number, due_date, amount, paid_amount, status
       ) VALUES ($1, $2, $3, $4, 0, 'scheduled')
       RETURNING id, due_date`,
      [plan.id, item.installmentNumber, item.dueDate, item.amount]
    );
    await seedFinancingReminderJobsForInstallmentInTransaction({
      client,
      installmentId: installmentRows[0].id,
      dueDate: installmentRows[0].due_date,
    });
  }

  // members.current_balance is exclusively the 2021-2025 subscription ledger.
  // Financing debt starts at total_amount and is tracked only by the plan,
  // installments, allocations, and this immutable financing ledger.
  await client.query(
    `INSERT INTO financing_balance_transactions (
       plan_id, member_id, transaction_type, amount,
       balance_before, balance_after, idempotency_key
     ) VALUES ($1, $2, 'disbursement_debit', $3, $4, $5, $6)`,
    [plan.id, memberId, total, 0, total, `financing-plan:${plan.id}:activation`]
  );

  return plan;
}

export async function getRepaymentPlanByRequest({ programType, requestId, memberId = null, client = null }) {
  const run = client ? client.query.bind(client) : query;
  const params = [programType, requestId];
  let memberCondition = '';
  if (memberId) {
    params.push(memberId);
    memberCondition = ' AND member_id = $3';
  }
  try {
    const { rows } = await run(
      `SELECT * FROM financing_repayment_plans
       WHERE program_type = $1 AND request_id = $2${memberCondition}
       LIMIT 1`,
      params
    );
    if (!rows.length) {return null;}
    const plan = rows[0];
    const { rows: installments } = await run(
      `SELECT id, installment_number, due_date, amount, paid_amount, status, paid_at
       FROM financing_installments
       WHERE plan_id = $1
       ORDER BY installment_number ASC`,
      [plan.id]
    );
    return { ...plan, installments, online_payment_enabled: isFinancingOnlinePaymentEnabled() };
  } catch (error) {
    if (!isFinancingRepaymentEnabled() && ['42P01', '42703'].includes(error?.code)) {
      return null;
    }
    throw error;
  }
}

export async function getRepaymentPlanById({ planId, memberId = null }) {
  const params = [planId];
  let memberCondition = '';
  if (memberId) {
    params.push(memberId);
    memberCondition = ' AND member_id = $2';
  }
  try {
    const { rows } = await query(
      `SELECT * FROM financing_repayment_plans
       WHERE id = $1${memberCondition}
       LIMIT 1`,
      params
    );
    if (!rows.length) {return null;}
    const plan = rows[0];
    const { rows: installments } = await query(
      `SELECT id, installment_number, due_date, amount, paid_amount, status, paid_at
       FROM financing_installments WHERE plan_id = $1 ORDER BY installment_number`,
      [plan.id]
    );
    return { ...plan, installments, online_payment_enabled: isFinancingOnlinePaymentEnabled() };
  } catch (error) {
    if (!isFinancingRepaymentEnabled() && ['42P01', '42703'].includes(error?.code)) {
      return null;
    }
    throw error;
  }
}

function generatePaymentReference() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
  return `FIN-${timestamp}-${random}`;
}

export async function createFinancingPaymentIntent({
  planId,
  memberId,
  payAll = false,
  installmentId = null,
  protocolVersion,
}) {
  if (!isFinancingOnlinePaymentEnabled()) {
    throw serviceError('سداد أقساط التمويل عبر البوابة غير مفعل حالياً', 'FINANCING_GATEWAY_DISABLED');
  }
  if (Number(protocolVersion) !== GATEWAY_PROTOCOL_VERSION) {
    throw serviceError('يلزم تحديث التطبيق قبل استخدام بوابة دفع الأقساط', 'PAYMENT_PROTOCOL_UPGRADE_REQUIRED');
  }
  const operationalReadiness = await getMoyasarGatewayOperationalReadiness();
  if (!operationalReadiness?.ready) {
    throw serviceError(
      'قاعدة بيانات المصالحة المالية غير جاهزة لبدء دفعة أقساط جديدة',
      'PAYMENT_GATEWAY_RECONCILIATION_SCHEMA_NOT_READY'
    );
  }
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows: planRows } = await client.query(
      `SELECT * FROM financing_repayment_plans
       WHERE id = $1 AND member_id = $2
       FOR UPDATE`,
      [planId, memberId]
    );
    if (!planRows.length) {
      const error = new Error('خطة الأقساط غير موجودة');
      error.code = 'PLAN_NOT_FOUND';
      throw error;
    }
    const plan = planRows[0];
    if (plan.status === 'paid' || Number(plan.outstanding_amount) <= 0) {
      const error = new Error('تم سداد الخطة بالكامل');
      error.code = 'PLAN_ALREADY_PAID';
      throw error;
    }
    if (!['active', 'overdue'].includes(plan.status)) {
      throw serviceError('خطة الأقساط غير متاحة للسداد', 'PLAN_NOT_PAYABLE');
    }

    let amount;
    let scope;
    if (payAll) {
      amount = asMoney(plan.outstanding_amount);
      scope = 'all';
    } else {
      const { rows: installmentRows } = await client.query(
        `SELECT * FROM financing_installments
         WHERE plan_id = $1
           AND paid_amount < amount
         ORDER BY installment_number ASC
         LIMIT 1
         FOR UPDATE`,
        [plan.id]
      );
      if (!installmentRows.length) {
        const error = new Error('لا يوجد قسط مستحق للسداد');
        error.code = 'INSTALLMENT_NOT_FOUND';
        throw error;
      }
      const nextInstallment = installmentRows[0];
      if (installmentId && String(installmentId) !== String(nextInstallment.id)) {
        throw serviceError(
          'يمكن سداد القسط التالي غير المسدد فقط',
          'INSTALLMENT_NOT_NEXT'
        );
      }
      amount = asMoney(Number(nextInstallment.amount) - Number(nextInstallment.paid_amount));
      scope = 'next';
    }

    const { rows: openPaymentRows } = await client.query(
      `SELECT * FROM payments
        WHERE financing_plan_id = $1
          AND status = ANY($2::text[])
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE`,
      [plan.id, OPEN_PAYMENT_STATUSES]
    );
    if (openPaymentRows.length) {
      const openPayment = openPaymentRows[0];
      if (
        openPayment.financing_payment_scope === scope
        && sameMoney(openPayment.amount, amount)
        && openPayment.gateway_provider
        && openPayment.gateway_payment_id
        && Number(openPayment.gateway_protocol_version) === GATEWAY_PROTOCOL_VERSION
      ) {
        await client.query('COMMIT');
        return { payment: openPayment, plan, reused: true };
      }
      throw serviceError(
        'توجد عملية دفع معلقة لهذه الخطة؛ أكملها أو ألغها قبل بدء عملية أخرى',
        'PAYMENT_INTENT_IN_PROGRESS'
      );
    }

    const now = new Date();
    const paymentId = randomUUID();
    const gatewayProvider = String(config.paymentGateway?.provider || 'moyasar').trim().toLowerCase();
    const gatewayCurrency = String(config.paymentGateway?.currency || 'SAR').trim().toUpperCase();
    const { rows: paymentRows } = await client.query(
      `INSERT INTO payments (
         id, payer_id, beneficiary_id, amount, payment_date,
         payment_method, category, status, reference_number, notes,
         financing_plan_id, financing_payment_scope,
         gateway_provider, gateway_payment_id, gateway_status,
         gateway_amount_minor, gateway_currency, gateway_response,
         gateway_protocol_version, gateway_submission_started_at,
         gateway_abandoned_at,
         created_at, updated_at
       ) VALUES (
         $1::text::uuid, $2, $2, $3, $4,
         'moyasar', $5, 'pending', $6, $7,
         $8, $9,
         $10, $1::text, $15,
         $11, $12, $13::jsonb,
         $16, NULL, NULL,
         $14, $14
       ) RETURNING *`,
      [
        paymentId,
        memberId,
        amount,
        financingBusinessDate(now),
        'other',
        generatePaymentReference(),
        scope === 'all' ? 'سداد مبكر لكامل أقساط التمويل' : 'سداد قسط تمويل',
        plan.id,
        scope,
        gatewayProvider,
        moneyCents(amount),
        gatewayCurrency,
        JSON.stringify({
          provider: gatewayProvider,
          gateway_payment_id: paymentId,
          financing_plan_id: String(plan.id),
          scope,
          protocol_version: GATEWAY_PROTOCOL_VERSION,
        }),
        now.toISOString(),
        GATEWAY_PREPARED_STATUS,
        GATEWAY_PROTOCOL_VERSION,
      ]
    );
    await client.query('COMMIT');
    return { payment: paymentRows[0], plan, reused: false };
  } catch (error) {
    await client.query('ROLLBACK');
    if (
      error?.code === '23505'
      && error?.constraint === 'uq_financing_one_open_intent_per_plan'
    ) {
      throw serviceError(
        'توجد عملية دفع معلقة لهذه الخطة؛ أكملها أو ألغها قبل بدء عملية أخرى',
        'PAYMENT_INTENT_IN_PROGRESS'
      );
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function settleFinancingPayment({
  paymentId,
  gatewayPaymentId,
  gatewayProvider = 'moyasar',
  gatewayResponse = null,
}) {
  const provider = String(gatewayProvider || '').trim().toLowerCase();
  const providerPaymentId = String(gatewayPaymentId || '').trim();
  if (!provider || !providerPaymentId) {
    throw serviceError('هوية عملية بوابة الدفع مطلوبة', 'INVALID_GATEWAY_IDENTITY');
  }
  const client = await getClient();
  let settledPayment;
  let settledPlan;
  let idempotentReplay = false;
  try {
    await client.query('BEGIN');
    const { rows: paymentPointerRows } = await client.query(
      `SELECT financing_plan_id
         FROM payments
        WHERE id = $1
          AND financing_plan_id IS NOT NULL`,
      [paymentId]
    );
    if (!paymentPointerRows.length) {
      const error = new Error('دفعة التمويل غير موجودة');
      error.code = 'PAYMENT_NOT_FOUND';
      throw error;
    }
    const lockedPlanId = paymentPointerRows[0].financing_plan_id;
    // All repayment mutations use plan -> payment lock order. Intent creation
    // already locks the plan first; matching it here prevents an AB/BA deadlock
    // between a callback settlement and a concurrent checkout request.
    const { rows: planRows } = await client.query(
      'SELECT * FROM financing_repayment_plans WHERE id = $1 FOR UPDATE',
      [lockedPlanId]
    );
    if (!planRows.length) {
      throw serviceError('خطة الأقساط غير موجودة', 'PLAN_NOT_FOUND');
    }
    const plan = planRows[0];
    const { rows: paymentRows } = await client.query(
      `SELECT * FROM payments
       WHERE id = $1 AND financing_plan_id = $2
       FOR UPDATE`,
      [paymentId, lockedPlanId]
    );
    if (!paymentRows.length) {
      const error = new Error('دفعة التمويل غير موجودة');
      error.code = 'PAYMENT_NOT_FOUND';
      throw error;
    }
    const payment = paymentRows[0];
    const sameLocalGatewayIdentity = String(payment.gateway_provider || '').trim().toLowerCase() === provider
      && String(payment.gateway_payment_id || '').trim() === providerPaymentId;
    if (!sameLocalGatewayIdentity) {
      throw serviceError(
        'هوية عملية البوابة لا تطابق جلسة الدفع المحلية',
        'GATEWAY_PAYMENT_MISMATCH'
      );
    }
    const providerStatus = String(gatewayResponse?.status || '').trim().toLowerCase();
    const providerResponseId = String(gatewayResponse?.id || '').trim();
    const providerGivenId = gatewayResponse?.given_id === null
      || gatewayResponse?.given_id === undefined
      ? null
      : String(gatewayResponse.given_id).trim();
    const expectedAmountMinor = Number(payment.gateway_amount_minor ?? moneyCents(payment.amount));
    const expectedCurrency = String(
      payment.gateway_currency || config.paymentGateway?.currency || 'SAR'
    ).trim().toUpperCase();
    if (
      gatewayResponse
      && (
        providerResponseId !== providerPaymentId
        || (providerGivenId !== null && providerGivenId !== providerPaymentId)
        || Number(gatewayResponse.amount) !== expectedAmountMinor
        || String(gatewayResponse.currency || '').trim().toUpperCase() !== expectedCurrency
      )
    ) {
      throw serviceError(
        'لا توجد نتيجة بوابة دفع مكتملة ومطابقة لتسوية الدفعة',
        'GATEWAY_PAYMENT_MISMATCH'
      );
    }
    const amountException = detectGatewayFinancialAmountException(payment, gatewayResponse);
    if (amountException) {
      await recordGatewayFinancialException({
        localPayment: payment,
        providerPayment: gatewayResponse,
        exception: amountException,
        executeQuery: (text, params) => client.query(text, params),
      });
      await client.query('COMMIT');
      const error = gatewayFinancialExceptionError(amountException, true);
      error.transactionCommitted = true;
      throw error;
    }
    const { rows: existingAllocations } = await client.query(
      'SELECT id FROM financing_payment_allocations WHERE payment_id = $1 LIMIT 1',
      [paymentId]
    );
    if (payment.status === 'paid') {
      if (!existingAllocations.length) {
        throw serviceError(
          'تمت تسوية الدفعة مسبقاً بهوية بوابة مختلفة أو بحالة غير مكتملة',
          'PAYMENT_ALREADY_SETTLED'
        );
      }
      settledPayment = payment;
      settledPlan = plan;
      idempotentReplay = true;
      await client.query('COMMIT');
    } else {
      if (
        !gatewayResponse
        || !['paid', 'captured'].includes(providerStatus)
        || providerResponseId !== providerPaymentId
        || (providerGivenId !== null && providerGivenId !== providerPaymentId)
        || Number(gatewayResponse.amount) !== expectedAmountMinor
        || String(gatewayResponse.currency || '').trim().toUpperCase() !== expectedCurrency
      ) {
        throw serviceError(
          'لا توجد نتيجة بوابة دفع مكتملة ومطابقة لتسوية الدفعة',
          'GATEWAY_PAYMENT_MISMATCH'
        );
      }
      if (existingAllocations.length) {
        throw serviceError(
          'توجد تخصيصات أقساط لدفعة غير مسددة وتتطلب مراجعة',
          'SETTLEMENT_STATE_CONFLICT'
        );
      }
      if (!OPEN_PAYMENT_STATUSES.includes(payment.status)) {
        throw serviceError('حالة الدفعة لا تسمح بالتسوية', 'PAYMENT_NOT_SETTLEABLE');
      }

      const { rows: reusedGatewayRows } = await client.query(
        `SELECT id
           FROM payments
          WHERE id <> $1
            AND LOWER(BTRIM(gateway_provider)) = $2
            AND BTRIM(gateway_payment_id::text) = $3
          LIMIT 1
          FOR UPDATE`,
        [paymentId, provider, providerPaymentId]
      );
      if (reusedGatewayRows.length) {
        throw serviceError(
          'تم استخدام عملية بوابة الدفع لتسوية دفعة أخرى',
          'GATEWAY_PAYMENT_REUSED'
        );
      }

      if (String(plan.member_id) !== String(payment.payer_id)) {
        throw serviceError('مالك الدفعة لا يطابق مالك خطة التمويل', 'PAYMENT_PLAN_MEMBER_MISMATCH');
      }
      if (!['active', 'overdue'].includes(plan.status)) {
        throw serviceError('خطة الأقساط غير متاحة للتسوية', 'PLAN_NOT_PAYABLE');
      }
      const amount = asMoney(payment.amount);
      const outstanding = asMoney(plan.outstanding_amount);
      if (amount <= 0 || amount > outstanding) {
        const error = new Error('مبلغ الدفعة لا يطابق الرصيد المتبقي');
        error.code = 'PAYMENT_AMOUNT_MISMATCH';
        throw error;
      }

      const { rows: installments } = await client.query(
        `SELECT * FROM financing_installments
         WHERE plan_id = $1 AND paid_amount < amount
         ORDER BY installment_number ASC
         FOR UPDATE`,
        [plan.id]
      );
      if (!installments.length) {
        throw serviceError('لا توجد أقساط قابلة للتسوية', 'INSTALLMENT_NOT_FOUND');
      }
      const installmentOutstandingCents = installments.reduce(
        (sum, installment) => sum + moneyCents(Number(installment.amount) - Number(installment.paid_amount)),
        0
      );
      if (installmentOutstandingCents !== moneyCents(outstanding)) {
        throw serviceError(
          'رصيد الخطة لا يطابق مجموع الأقساط المتبقية',
          'PLAN_BALANCE_MISMATCH'
        );
      }

      if (payment.financing_payment_scope === 'all') {
        if (!sameMoney(amount, outstanding)) {
          throw serviceError('دفعة السداد الكامل لا تطابق الرصيد المتبقي', 'PAYMENT_AMOUNT_MISMATCH');
        }
      } else if (payment.financing_payment_scope === 'next') {
        const nextDue = asMoney(Number(installments[0].amount) - Number(installments[0].paid_amount));
        if (!sameMoney(amount, nextDue)) {
          throw serviceError('دفعة القسط لا تطابق القسط التالي', 'PAYMENT_AMOUNT_MISMATCH');
        }
      } else {
        throw serviceError('نطاق دفعة التمويل غير صالح', 'INVALID_PAYMENT_SCOPE');
      }

      let remainingCents = moneyCents(amount);
      for (const installment of installments) {
        if (remainingCents <= 0) {break;}
        const dueCents = moneyCents(Number(installment.amount) - Number(installment.paid_amount));
        const allocationCents = Math.min(remainingCents, dueCents);
        const allocation = allocationCents / 100;
        const newPaid = asMoney(Number(installment.paid_amount) + allocation);
        const isPaid = sameMoney(newPaid, installment.amount);
        await client.query(
          `UPDATE financing_installments
           SET paid_amount = $1,
               status = CASE
                 WHEN $2::boolean THEN 'paid'
                 WHEN due_date < (NOW() AT TIME ZONE $3)::date THEN 'overdue'
                 ELSE 'partially_paid'
               END,
               paid_at = CASE WHEN $2::boolean THEN NOW() ELSE paid_at END
           WHERE id = $4`,
          [newPaid, isPaid, FINANCING_BUSINESS_TIME_ZONE, installment.id]
        );
        if (isPaid) {
          await cancelFinancingReminderJobsForInstallmentInTransaction({
            client,
            installmentId: installment.id,
            reason: 'installment_paid',
          });
        }
        await client.query(
          `INSERT INTO financing_payment_allocations
             (plan_id, installment_id, payment_id, amount)
           VALUES ($1, $2, $3, $4)`,
          [plan.id, installment.id, paymentId, allocation]
        );
        remainingCents -= allocationCents;
      }
      if (remainingCents !== 0) {
        const error = new Error('تعذر توزيع كامل مبلغ الدفعة على الأقساط');
        error.code = 'ALLOCATION_MISMATCH';
        throw error;
      }

      const newOutstanding = asMoney(outstanding - amount);
      let planStatus = 'paid';
      if (newOutstanding > 0) {
        const { rows: overdueRows } = await client.query(
          `SELECT EXISTS (
             SELECT 1
               FROM financing_installments
              WHERE plan_id = $1
                AND paid_amount < amount
                AND due_date < (NOW() AT TIME ZONE $2)::date
           ) AS has_overdue`,
          [plan.id, FINANCING_BUSINESS_TIME_ZONE]
        );
        planStatus = overdueRows[0]?.has_overdue ? 'overdue' : 'active';
      }
      const { rows: updatedPlanRows } = await client.query(
        `UPDATE financing_repayment_plans
         SET outstanding_amount = $1,
             status = $2::varchar,
             paid_at = CASE WHEN $2::varchar = 'paid' THEN NOW() ELSE NULL END
         WHERE id = $3
         RETURNING *`,
        [newOutstanding, planStatus, plan.id]
      );
      settledPlan = updatedPlanRows[0];

      // Allocations are deliberately inserted before the paid transition. The
      // database enforcement trigger rejects every other path to status=paid.
      const now = new Date().toISOString();
      const { rows: updatedPaymentRows } = await client.query(
        `UPDATE payments
         SET status = 'paid', approved_at = $1, updated_at = $1,
             gateway_provider = $2, gateway_payment_id = $3,
             gateway_status = 'paid', gateway_failure_reason = NULL,
             gateway_response = COALESCE($4::jsonb, gateway_response),
             gateway_verified_at = NOW(),
             processed_at = COALESCE(processed_at, $1),
             payment_method = 'moyasar'
         WHERE id = $5
         RETURNING *`,
        [
          now,
          provider,
          providerPaymentId,
          gatewayResponse
            ? JSON.stringify(sanitizeMoyasarPaymentEvidence(gatewayResponse))
            : null,
          paymentId,
        ]
      );
      settledPayment = updatedPaymentRows[0];

      // Keep financing completely outside members.current_balance. The plan
      // outstanding balance is reduced atomically and mirrored in the immutable
      // ledger for audit/reconciliation.
      await client.query(
        `INSERT INTO financing_balance_transactions (
           plan_id, payment_id, member_id, transaction_type, amount,
           balance_before, balance_after, idempotency_key
         ) VALUES ($1, $2, $3, 'installment_credit', $4, $5, $6, $7)`,
        [plan.id, paymentId, payment.payer_id, amount, outstanding, newOutstanding, `financing-payment:${paymentId}`]
      );

      await client.query('COMMIT');
    }
  } catch (error) {
    if (!error.transactionCommitted) {
      await client.query('ROLLBACK');
    }
    if (error?.code === '23505' && error?.constraint === 'uq_payments_gateway_identity') {
      throw serviceError('تم استخدام عملية بوابة الدفع لتسوية دفعة أخرى', 'GATEWAY_PAYMENT_REUSED');
    }
    throw error;
  } finally {
    client.release();
  }

  if (!idempotentReplay) {
    createMemberNotification(settledPayment.payer_id, {
      title: settledPlan.status === 'paid' ? 'تم سداد التمويل بالكامل' : 'تم استلام القسط',
      body: settledPlan.status === 'paid'
        ? 'اكتمل سداد جميع أقساط برنامج التمويل، شكراً لالتزامك.'
        : `تم استلام دفعتك بقيمة ${Number(settledPayment.amount).toLocaleString('ar-SA')} ر.س. الرصيد المتبقي ${Number(settledPlan.outstanding_amount).toLocaleString('ar-SA')} ر.س.`,
      type: 'financing_payment',
      relatedId: settledPlan.id,
      relatedType: settledPlan.program_type,
      actionUrl: '/requests',
      data: { financing_plan_id: String(settledPlan.id) },
    }).catch((error) => {
      log.warn('[financing] payment notification failed', { paymentId, error: error.message });
    });
  }

  return getRepaymentPlanById({ planId: settledPlan.id, memberId: settledPayment.payer_id });
}

/**
 * Recover provider captures whose client callback never reached the API.
 * Moyasar's given_id is the local payment UUID and becomes the provider id, so
 * reconciliation always fetches /payments/{local UUID} and requires an exact
 * identity/amount/currency match before invoking the idempotent settlement.
 */
export async function reconcilePendingFinancingPayments({
  minAgeMinutes = 5,
  limit = 25,
  fetchPayment = fetchMoyasarPayment,
} = {}) {
  // A checkout kill switch blocks creation and the submission marker only.
  // Already-submitted identities must remain resolvable after it is disabled,
  // otherwise a captured payment could be stranded until a webhook succeeds.
  if (
    config.paymentGateway?.provider !== 'moyasar'
    || !config.paymentGateway?.moyasar?.secretKey
  ) {
    throw serviceError('إعدادات بوابة الدفع غير مكتملة', 'GATEWAY_NOT_CONFIGURED');
  }
  if (typeof fetchPayment !== 'function') {
    throw serviceError('عميل بوابة الدفع غير متاح', 'GATEWAY_CLIENT_UNAVAILABLE');
  }
  const age = Number(minAgeMinutes);
  const batchLimit = Number(limit);
  if (!Number.isInteger(age) || age < 1 || age > 1440) {
    throw serviceError('عمر عملية المصالحة غير صالح', 'INVALID_RECONCILIATION_AGE');
  }
  if (!Number.isInteger(batchLimit) || batchLimit < 1 || batchLimit > 100) {
    throw serviceError('حجم دفعة المصالحة غير صالح', 'INVALID_RECONCILIATION_LIMIT');
  }

  const { rows: candidates } = await query(
    `SELECT id, payer_id, amount, financing_plan_id, status,
            gateway_provider, gateway_payment_id, gateway_amount_minor,
            gateway_currency
       FROM payments
      WHERE financing_plan_id IS NOT NULL
        AND status = ANY($1::text[])
        AND gateway_protocol_version = 2
        AND gateway_submission_started_at IS NOT NULL
        AND gateway_status <> 'not_submitted'
        AND created_at <= NOW() - ($2 * INTERVAL '1 minute')
      ORDER BY created_at ASC
      LIMIT $3`,
    [OPEN_PAYMENT_STATUSES, age, batchLimit]
  );

  const summary = {
    examined: candidates.length,
    settled: 0,
    failed: 0,
    still_pending: 0,
    errors: [],
  };
  const provider = 'moyasar';
  const currency = String(config.paymentGateway.currency || 'SAR').trim().toUpperCase();

  for (const payment of candidates) {
    try {
      const localPaymentId = String(payment.id);
      const expectedGatewayPaymentId = String(payment.gateway_payment_id || '').trim();
      if (!expectedGatewayPaymentId || String(payment.gateway_provider || '').toLowerCase() !== provider) {
        throw serviceError('هوية بوابة الدفعة المحلية غير مكتملة', 'INVALID_GATEWAY_IDENTITY');
      }
      const providerPayment = await fetchPayment(expectedGatewayPaymentId);

      const providerId = String(providerPayment.id || '').trim();
      const returnedGivenId = providerPayment.given_id === null || providerPayment.given_id === undefined
        ? null
        : String(providerPayment.given_id).trim();
      if (
        providerId !== expectedGatewayPaymentId
        || (returnedGivenId !== null && returnedGivenId !== expectedGatewayPaymentId)
        || Number(providerPayment.amount) !== Number(payment.gateway_amount_minor ?? moneyCents(payment.amount))
        || String(providerPayment.currency || '').toUpperCase()
          !== String(payment.gateway_currency || currency).toUpperCase()
      ) {
        throw serviceError('بيانات بوابة الدفع لا تطابق الدفعة المحلية', 'GATEWAY_PAYMENT_MISMATCH');
      }

      const providerStatus = String(providerPayment.status || '').toLowerCase();
      const amountException = detectGatewayFinancialAmountException(payment, providerPayment);
      if (amountException) {
        await recordGatewayFinancialException({
          localPayment: payment,
          providerPayment,
          exception: amountException,
        });
        throw gatewayFinancialExceptionError(amountException, true);
      }
      if (['paid', 'captured'].includes(providerStatus)) {
        await settleFinancingPayment({
          paymentId: localPaymentId,
          gatewayPaymentId: providerId,
          gatewayProvider: provider,
          gatewayResponse: providerPayment,
        });
        summary.settled += 1;
      } else if (['failed', 'canceled', 'cancelled', 'voided', 'refunded'].includes(providerStatus)) {
        const terminalStatus = providerStatus === 'failed'
          ? 'failed'
          : providerStatus === 'refunded'
            ? 'refunded'
            : 'cancelled';
        await query(
          `UPDATE payments
              SET status = $1,
                  gateway_provider = $2,
                  gateway_payment_id = $3,
                  gateway_status = $4,
                  gateway_failure_reason = $5,
                  gateway_response = $6::jsonb,
                  gateway_verified_at = NOW(),
                  updated_at = NOW()
            WHERE id = $7
              AND status = ANY($8::text[])`,
          [
            terminalStatus,
            provider,
            providerId,
            providerStatus,
            providerPayment.source?.message || providerPayment.message || 'Gateway payment failed',
            JSON.stringify(sanitizeMoyasarPaymentEvidence(providerPayment)),
            localPaymentId,
            OPEN_PAYMENT_STATUSES,
          ]
        );
        summary.failed += 1;
      } else {
        await query(
          `UPDATE payments
              SET status = 'pending_verification',
                  gateway_provider = $1,
                  gateway_payment_id = $2,
                  gateway_status = $3,
                  gateway_failure_reason = NULL,
                  gateway_response = $4::jsonb,
                  gateway_verified_at = NOW(),
                  updated_at = NOW()
            WHERE id = $5
              AND status = ANY($6::text[])`,
          [
            provider,
            providerId,
            providerStatus || 'pending',
            JSON.stringify(sanitizeMoyasarPaymentEvidence(providerPayment)),
            localPaymentId,
            OPEN_PAYMENT_STATUSES,
          ]
        );
        summary.still_pending += 1;
      }
    } catch (error) {
      summary.errors.push({ payment_id: String(payment.id), code: error.code || 'RECONCILIATION_ERROR' });
      log.warn('[financing] pending gateway reconciliation failed', {
        paymentId: payment.id,
        code: error.code,
        error: error.message,
      });
    }
  }

  return summary;
}

export default {
  FINANCING_PROGRAM,
  DEFAULT_FINANCING_TIERS,
  normalizeFinancingTiers,
  resolveFinancingTier,
  resolveLoanDisbursementTerms,
  buildInstallmentSchedule,
  defaultFirstDueDate,
  validateInstallmentCount,
  validateFirstDueDate,
  financingBusinessDate,
  isFinancingRepaymentEnabled,
  isFinancingGatewayEnabled,
  isFinancingRemindersEnabled,
  isFinancingOnlinePaymentEnabled,
  createRepaymentPlanInTransaction,
  getRepaymentPlanByRequest,
  getRepaymentPlanById,
  createFinancingPaymentIntent,
  settleFinancingPayment,
  reconcilePendingFinancingPayments,
  processFinancingReminders,
  startFinancingReminderScheduler,
};
