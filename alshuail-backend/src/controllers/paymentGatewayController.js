import crypto from 'crypto';
import * as database from '../services/database.js';
import {
  fetchMoyasarPayment,
  getMoyasarGatewayOperationalReadiness,
  getMoyasarPublicCheckoutConfig,
  isMoyasarEnabledForIos,
  sanitizeMoyasarPaymentEvidence,
} from '../services/moyasarService.js';
import { HijriDateManager } from '../utils/hijriDateUtils.js';
import { config } from '../config/env.js';
import { log } from '../utils/logger.js';
import {
  detectGatewayFinancialAmountException,
  gatewayFinancialExceptionError,
  isFinancingOnlinePaymentEnabled,
  recordGatewayFinancialException,
  settleFinancingPayment,
} from '../services/financingRepaymentService.js';
import { reverseSettledFinancingPayment } from '../services/financingReversalService.js';

const toMinorUnit = (amount) => Math.round(Number(amount) * 100);
const query = (...args) => database.query(...args);
const getClient = (...args) => database.getClient(...args);
const SUBSCRIPTION_LIMIT = 3000;
const GATEWAY_SESSION_TTL_MINUTES = config.financingRepayment?.intentTtlMinutes || 30;
export const GATEWAY_PROTOCOL_VERSION = 2;

const GATEWAY_STATE = Object.freeze({
  PREPARED: 'prepared_v2',
  SUBMISSION_STARTED: 'submission_started',
  NOT_SUBMITTED: 'not_submitted',
});

const OPEN_PAYMENT_STATUSES = Object.freeze(['pending', 'pending_verification']);
const LOCAL_ABANDON_REASONS = Object.freeze({
  CLIENT_CANCELLED: 'CLIENT_CANCELLED_BEFORE_PROVIDER_SUBMISSION',
  EXPIRED: 'SESSION_EXPIRED_BEFORE_PROVIDER_SUBMISSION',
});
const CAPTURE_AFTER_LOCAL_ABANDONMENT = 'CAPTURE_AFTER_LOCAL_ABANDONMENT';
const ABANDONMENT_TERMINAL_PROVIDER_STATUSES = new Set([
  'failed',
  'refunded',
  'voided',
  'canceled',
  'cancelled',
]);
const RECONCILIATION_EVIDENCE_REVIEW_CODES = new Set([
  'GATEWAY_EXPECTED_AMOUNT_INVALID',
  'GATEWAY_STORED_AMOUNT_MISMATCH',
  'GATEWAY_EXPECTED_CURRENCY_INVALID',
  'GATEWAY_AMOUNT_MISMATCH',
  'GATEWAY_CURRENCY_MISMATCH',
  'GATEWAY_PAYMENT_ID_MISMATCH',
]);

const generateReferenceNumber = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `MOY-${date}-${random}`;
};

const localStatusForMoyasarStatus = (status) => {
  switch (status) {
    case 'paid':
    case 'captured':
      return 'paid';
    case 'failed':
      return 'failed';
    case 'refunded':
      return 'refunded';
    case 'voided':
    case 'canceled':
    case 'cancelled':
      return 'cancelled';
    case 'initiated':
    case 'authorized':
    case 'verified':
      return 'pending_verification';
    default:
      return 'pending_verification';
  }
};

const protocolUpgradeResponse = (res) => res.status(426).json({
  success: false,
  error: 'يلزم تحديث التطبيق قبل استخدام بوابة الدفع',
  code: 'PAYMENT_PROTOCOL_UPGRADE_REQUIRED',
  required_protocol_version: GATEWAY_PROTOCOL_VERSION,
});

const isOwnedByMember = (payment, memberId) => (
  String(payment?.payer_id || '') === String(memberId || '')
  || String(payment?.beneficiary_id || '') === String(memberId || '')
);

const isGatewayProtocolV2 = (payment) => (
  Number(payment?.gateway_protocol_version) === GATEWAY_PROTOCOL_VERSION
);

const isSubmissionStarted = (payment) => Boolean(
  payment?.gateway_submission_started_at
  && payment?.gateway_status !== GATEWAY_STATE.PREPARED
  && payment?.gateway_status !== GATEWAY_STATE.NOT_SUBMITTED
);

const isVerifiedProviderCancellation = (payment) => Boolean(
  payment?.status === 'cancelled'
  && payment?.gateway_verified_at
  && ['voided', 'canceled', 'cancelled'].includes(
    String(payment?.gateway_status || '').trim().toLowerCase()
  )
);

const isLocallyAbandonedGatewaySession = (payment) => Boolean(
  payment?.status === 'cancelled'
  && String(payment?.gateway_status || '').trim().toLowerCase() === GATEWAY_STATE.NOT_SUBMITTED
);

const isGatewayResolutionConfigured = () => (
  String(config.paymentGateway?.provider || '').trim().toLowerCase() === 'moyasar'
  && Boolean(String(config.paymentGateway?.moyasar?.secretKey || '').trim())
);

const getGatewayCheckoutReadinessFailure = async () => {
  if (!isMoyasarEnabledForIos()) {
    return {
      code: 'PAYMENT_GATEWAY_DISABLED',
      error: 'بوابة الدفع الإلكتروني غير مفعلة حالياً',
    };
  }
  if (String(config.paymentGateway?.currency || '').trim().toUpperCase() !== 'SAR') {
    return {
      code: 'PAYMENT_GATEWAY_CURRENCY_UNSUPPORTED',
      error: 'عملة بوابة الدفع غير مدعومة',
    };
  }
  if (!String(config.paymentGateway?.moyasar?.webhookSecret || '').trim()) {
    return {
      code: 'PAYMENT_GATEWAY_WEBHOOK_NOT_CONFIGURED',
      error: 'إعدادات تأكيد الدفع الإلكتروني غير مكتملة',
    };
  }
  if (config.paymentGateway?.reconciliationEnabled !== true) {
    return {
      code: 'PAYMENT_GATEWAY_RECONCILIATION_DISABLED',
      error: 'خدمة المصالحة المالية الدورية غير مفعلة',
    };
  }
  const operationalReadiness = await getMoyasarGatewayOperationalReadiness();
  if (!operationalReadiness?.ready) {
    return {
      code: 'PAYMENT_GATEWAY_RECONCILIATION_SCHEMA_NOT_READY',
      error: 'قاعدة بيانات المصالحة المالية غير جاهزة لبدء دفعة جديدة',
    };
  }
  return null;
};

const rejectUnreadyGatewayCheckout = (res, readinessFailure) => res.status(503).json({
  success: false,
  ...readinessFailure,
});

const getFailureReason = (moyasarPayment) => (
  moyasarPayment?.source?.message ||
  moyasarPayment?.message ||
  moyasarPayment?.error ||
  null
);

const hasProviderTimestamp = (value) => (
  typeof value === 'string' && value.trim().length > 0
);

const findLatestSubscriptionId = async (memberId) => {
  try {
    const { rows } = await query(
      'SELECT id FROM subscriptions WHERE member_id = $1 ORDER BY created_at DESC LIMIT 1',
      [memberId]
    );
    return rows[0]?.id || null;
  } catch (error) {
    log.warn('Gateway payment subscription lookup failed', {
      memberId,
      error: error.message,
    });
    return null;
  }
};

export const cleanupExpiredGatewaySessions = async () => {
  const { rows: abandonedSessions } = await query(
    `UPDATE payments
        SET status = 'cancelled',
            gateway_status = $1,
            gateway_failure_reason = $2,
            gateway_abandoned_at = NOW(),
            updated_at = NOW()
      WHERE gateway_provider = 'moyasar'
        AND gateway_protocol_version = $3
        AND status = 'pending'
        AND gateway_status = $4
        AND gateway_submission_started_at IS NULL
        AND created_at < NOW() - ($5::integer * INTERVAL '1 minute')
      RETURNING id`,
    [
      GATEWAY_STATE.NOT_SUBMITTED,
      LOCAL_ABANDON_REASONS.EXPIRED,
      GATEWAY_PROTOCOL_VERSION,
      GATEWAY_STATE.PREPARED,
      GATEWAY_SESSION_TTL_MINUTES,
    ]
  );

  const abandonedCount = abandonedSessions.length;
  if (abandonedCount > 0) {
    log.info('Unsubmitted Moyasar sessions expired locally', { abandonedCount });
  }
  return { abandonedCount };
};

const getAvailableSubscriptionAmount = async (memberId, executeQuery = query) => {
  const { rows } = await executeQuery(
    `SELECT m.current_balance,
            COALESCE((
              SELECT SUM(p.amount)
                FROM payments p
               WHERE COALESCE(p.beneficiary_id, p.payer_id) = m.id
                 AND p.gateway_provider = 'moyasar'
                 AND p.financing_plan_id IS NULL
                 AND p.category = 'subscription'
                 AND (
                   p.status IN ('pending', 'pending_verification')
                   OR p.status = 'pending_refund'
                 )
            ), 0) AS reserved_gateway_amount
       FROM members m
      WHERE m.id = $1
      LIMIT 1`,
    [memberId]
  );

  if (!rows[0]) {
    const error = new Error('العضو المستفيد غير موجود');
    error.statusCode = 404;
    throw error;
  }

  const currentBalance = Math.max(0, Number(rows[0].current_balance) || 0);
  const reservedGatewayAmount = Math.max(0, Number(rows[0].reserved_gateway_amount) || 0);
  return Math.max(0, SUBSCRIPTION_LIMIT - currentBalance - reservedGatewayAmount);
};

const getValidatedExpectedGatewayDetails = (localPayment) => {
  const storedMinor = localPayment.gateway_amount_minor;
  const amountMinor = toMinorUnit(localPayment.amount);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    const error = new Error('Gateway expected amount is invalid');
    error.statusCode = 409;
    error.code = 'GATEWAY_EXPECTED_AMOUNT_INVALID';
    throw error;
  }

  const hasStoredMinor = storedMinor !== null && storedMinor !== undefined;
  const parsedStoredMinor = hasStoredMinor ? Number(storedMinor) : amountMinor;
  if (!Number.isSafeInteger(parsedStoredMinor) || parsedStoredMinor <= 0) {
    const error = new Error('Gateway expected amount is invalid');
    error.statusCode = 409;
    error.code = 'GATEWAY_EXPECTED_AMOUNT_INVALID';
    throw error;
  }
  if (hasStoredMinor && parsedStoredMinor !== amountMinor) {
    const error = new Error('Gateway stored amount mismatch');
    error.statusCode = 409;
    error.code = 'GATEWAY_STORED_AMOUNT_MISMATCH';
    throw error;
  }
  const expectedMinor = parsedStoredMinor;

  const configuredCurrency = String(config.paymentGateway.currency || '').trim().toUpperCase();
  const expectedCurrency = String(
    localPayment.gateway_currency || configuredCurrency
  ).trim().toUpperCase();
  if (expectedCurrency !== 'SAR') {
    const error = new Error('Gateway currency mismatch');
    error.statusCode = 409;
    error.code = 'GATEWAY_EXPECTED_CURRENCY_INVALID';
    throw error;
  }

  return { expectedMinor, expectedCurrency };
};

const assertMoyasarPaymentMatches = (localPayment, moyasarPayment) => {
  const { expectedMinor, expectedCurrency } = getValidatedExpectedGatewayDetails(localPayment);

  if (Number(moyasarPayment.amount) !== expectedMinor) {
    const error = new Error('Gateway amount mismatch');
    error.statusCode = 409;
    error.code = 'GATEWAY_AMOUNT_MISMATCH';
    throw error;
  }

  if (String(moyasarPayment.currency || '').trim().toUpperCase() !== expectedCurrency) {
    const error = new Error('Gateway currency mismatch');
    error.statusCode = 409;
    error.code = 'GATEWAY_CURRENCY_MISMATCH';
    throw error;
  }

  const expectedGatewayPaymentId = String(localPayment.gateway_payment_id || '').trim();
  const providerPaymentId = String(moyasarPayment.id || '').trim();
  const providerGivenId = moyasarPayment.given_id === null || moyasarPayment.given_id === undefined
    ? null
    : String(moyasarPayment.given_id).trim();
  if (
    !expectedGatewayPaymentId
    || providerPaymentId !== expectedGatewayPaymentId
    || (providerGivenId !== null && providerGivenId !== expectedGatewayPaymentId)
  ) {
    const error = new Error('Gateway payment identity mismatch');
    error.statusCode = 409;
    error.code = 'GATEWAY_PAYMENT_ID_MISMATCH';
    throw error;
  }

  return { expectedGatewayPaymentId, expectedMinor };
};

const persistVerifiedSubscriptionCapture = async ({ localPayment, moyasarPayment, gatewayStatus }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Session creation serializes on the beneficiary before inserting the
    // payment. Keep the same member -> payment lock order during capture to
    // avoid a cross-flow deadlock.
    const expectedMemberId = localPayment.beneficiary_id || localPayment.payer_id;
    if (!expectedMemberId) {
      const error = new Error('Subscription beneficiary is missing');
      error.statusCode = 409;
      throw error;
    }
    const { rows: memberRows } = await client.query(
      `SELECT id, current_balance
         FROM members
        WHERE id = $1
        FOR UPDATE`,
      [expectedMemberId]
    );
    const lockedMember = memberRows[0];
    if (!lockedMember) {
      const error = new Error('Subscription beneficiary no longer exists');
      error.statusCode = 409;
      throw error;
    }

    const { rows: paymentRows } = await client.query(
      'SELECT * FROM payments WHERE id = $1 FOR UPDATE',
      [localPayment.id]
    );
    const lockedPayment = paymentRows[0];
    if (!lockedPayment) {
      const error = new Error('Gateway payment no longer exists');
      error.statusCode = 404;
      throw error;
    }
    if (lockedPayment.financing_plan_id || lockedPayment.category !== 'subscription') {
      const error = new Error('Gateway payment type changed during verification');
      error.statusCode = 409;
      throw error;
    }
    const lockedMemberId = lockedPayment.beneficiary_id || lockedPayment.payer_id;
    if (String(lockedMemberId || '') !== String(expectedMemberId)) {
      const error = new Error('Subscription beneficiary changed during verification');
      error.statusCode = 409;
      throw error;
    }
    const { expectedMinor: lockedAmountMinor } = assertMoyasarPaymentMatches(
      lockedPayment,
      moyasarPayment
    );

    if (
      ['paid', 'refunded'].includes(lockedPayment.status)
      || isVerifiedProviderCancellation(lockedPayment)
    ) {
      await client.query('COMMIT');
      return lockedPayment;
    }

    // Only an unresolved checkout may consume current member balance and
    // transition to paid/pending_refund. A concurrent terminal or exceptional
    // state wins over this stale provider capture snapshot.
    if (!['pending', 'pending_verification', 'pending_refund'].includes(lockedPayment.status)) {
      await client.query('COMMIT');
      return lockedPayment;
    }

    let nextStatus = lockedPayment.status;
    if (lockedPayment.status !== 'pending_refund') {
      const currentBalanceMinor = toMinorUnit(lockedMember.current_balance ?? 0);
      const resultingBalanceMinor = currentBalanceMinor + lockedAmountMinor;
      if (
        !Number.isSafeInteger(currentBalanceMinor)
        || !Number.isSafeInteger(resultingBalanceMinor)
      ) {
        const error = new Error('Subscription balance is invalid');
        error.statusCode = 409;
        throw error;
      }
      nextStatus = resultingBalanceMinor > toMinorUnit(SUBSCRIPTION_LIMIT)
        ? 'pending_refund'
        : 'paid';
    }

    const { rows: updatedRows } = await client.query(
      `UPDATE payments
          SET status = $1::varchar,
              payment_method = 'moyasar',
              gateway_status = $2::varchar,
              gateway_response = $3::jsonb,
              gateway_verified_at = NOW(),
              gateway_failure_reason = CASE
                WHEN $1::varchar = 'pending_refund'
                  THEN 'SUBSCRIPTION_LIMIT_EXCEEDED_AFTER_CAPTURE'
                ELSE NULL
              END,
              processed_at = CASE
                WHEN $1::varchar = 'paid'
                  THEN COALESCE(processed_at, $4::timestamptz, NOW())
                ELSE processed_at
              END,
              updated_at = NOW()
        WHERE id = $5
        RETURNING *`,
      [
        nextStatus,
        gatewayStatus,
        JSON.stringify(sanitizeMoyasarPaymentEvidence(moyasarPayment)),
        moyasarPayment.created_at || moyasarPayment.updated_at || null,
        lockedPayment.id,
      ]
    );

    await client.query('COMMIT');
    return updatedRows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const persistProviderStateAfterLocalAbandonment = async ({
  localPayment,
  moyasarPayment,
  gatewayStatus,
}) => {
  const isCaptured = ['paid', 'captured'].includes(gatewayStatus);
  const nextStatus = isCaptured
    ? 'pending_refund'
    : gatewayStatus === 'refunded'
      ? 'refunded'
      : gatewayStatus === 'failed'
        ? 'failed'
        : 'cancelled';
  const failureReason = isCaptured
    ? CAPTURE_AFTER_LOCAL_ABANDONMENT
    : gatewayStatus === 'refunded'
      ? null
      : (getFailureReason(moyasarPayment) || localPayment.gateway_failure_reason || null);
  const { rows } = await query(
    `UPDATE payments
        SET status = $1::varchar,
            payment_method = 'moyasar',
            gateway_status = $2::varchar,
            gateway_response = $3::jsonb,
            gateway_verified_at = NOW(),
            gateway_failure_reason = $4::text,
            updated_at = NOW()
      WHERE id = $5
        AND status = 'cancelled'
        AND gateway_status = 'not_submitted'
      RETURNING *`,
    [
      nextStatus,
      gatewayStatus,
      JSON.stringify(sanitizeMoyasarPaymentEvidence(moyasarPayment)),
      failureReason,
      localPayment.id,
    ]
  );
  if (rows[0]) {return rows[0];}

  const { rows: currentRows } = await query(
    'SELECT * FROM payments WHERE id = $1 LIMIT 1',
    [localPayment.id]
  );
  if (!currentRows[0]) {
    const error = new Error('Gateway payment no longer exists');
    error.statusCode = 404;
    throw error;
  }
  return currentRows[0];
};

export const updatePaymentFromMoyasar = async ({
  localPayment,
  moyasarPayment,
  evidenceSource = 'provider_api',
}) => {
  let expectedGatewayPaymentId;
  let expectedMinor;
  try {
    ({
      expectedGatewayPaymentId,
      expectedMinor,
    } = assertMoyasarPaymentMatches(localPayment, moyasarPayment));
  } catch (error) {
    if (
      evidenceSource === 'reconciliation'
      && RECONCILIATION_EVIDENCE_REVIEW_CODES.has(error?.code)
    ) {
      error.reviewRequired = true;
      error.reviewRecorded = false;
      error.reviewReason = 'gateway_evidence_mismatch';
    }
    throw error;
  }

  // A completed provider refund is terminal financial evidence. Moyasar may
  // retry an older `paid` webhook after the refund workflow has committed;
  // that stale event must never resurrect or re-credit the local payment.
  if (localPayment.status === 'refunded' || isVerifiedProviderCancellation(localPayment)) {
    return localPayment;
  }

  const amountException = detectGatewayFinancialAmountException(localPayment, moyasarPayment);
  if (amountException) {
    let reviewRecorded = false;
    try {
      await recordGatewayFinancialException({
        localPayment,
        providerPayment: moyasarPayment,
        exception: amountException,
      });
      reviewRecorded = true;
    } catch (auditError) {
      log.error('Gateway financial exception persistence failed', {
        paymentId: localPayment.id,
        code: amountException.code,
        error: auditError.message,
      });
    }
    throw gatewayFinancialExceptionError(amountException, reviewRecorded);
  }

  const gatewayStatus = String(moyasarPayment.status || '').trim().toLowerCase();

  if (isLocallyAbandonedGatewaySession(localPayment)) {
    const isExactTimestampedRefund = gatewayStatus === 'refunded'
      && Number(moyasarPayment.refunded) === expectedMinor
      && hasProviderTimestamp(moyasarPayment.refunded_at);
    if (
      ['paid', 'captured'].includes(gatewayStatus)
      || isExactTimestampedRefund
      || (ABANDONMENT_TERMINAL_PROVIDER_STATUSES.has(gatewayStatus)
        && gatewayStatus !== 'refunded')
    ) {
      return persistProviderStateAfterLocalAbandonment({
        localPayment,
        moyasarPayment,
        gatewayStatus,
      });
    }
    // Provider progress/unknown states do not resurrect a checkout the client
    // proved locally abandoned. Durable reconciliation keeps the identity
    // under observation until provider terminal evidence or retention expiry.
    return localPayment;
  }

  // Once a non-financing payment has credited the local balance, provider
  // progress/failure words must never regress or debit it. Only authoritative
  // evidence of the entire original amount leaving the provider may cross
  // this boundary. Financing uses its separate atomic reversal workflow below.
  if (localPayment.status === 'paid' && !localPayment.financing_plan_id) {
    const refundedMinor = Number(moyasarPayment.refunded);
    const capturedMinor = Number(moyasarPayment.captured);
    const isExactFullRefund = gatewayStatus === 'refunded'
      && Number.isSafeInteger(refundedMinor)
      && refundedMinor === expectedMinor
      && hasProviderTimestamp(moyasarPayment.refunded_at);
    const isExactFullVoid = gatewayStatus === 'voided'
      && Number.isSafeInteger(capturedMinor)
      && capturedMinor === expectedMinor
      && hasProviderTimestamp(moyasarPayment.voided_at);

    if (!isExactFullRefund && !isExactFullVoid) {
      return localPayment;
    }
  }

  const mappedStatus = localStatusForMoyasarStatus(gatewayStatus);
  const nextStatus = localPayment.status === 'paid' && ['pending', 'failed'].includes(mappedStatus)
    ? localPayment.status
    : mappedStatus;

  if (localPayment.financing_plan_id) {
    if (localPayment.status === 'paid') {
      if (gatewayStatus === 'refunded' || gatewayStatus === 'voided') {
        const reversal = await reverseSettledFinancingPayment({
          paymentId: localPayment.id,
          gatewayPaymentId: expectedGatewayPaymentId,
          gatewayProvider: 'moyasar',
          gatewayResponse: moyasarPayment,
          evidenceSource,
          reversedById: null,
        });
        return reversal.payment;
      }
      return localPayment;
    }
    if (nextStatus === 'paid') {
      await settleFinancingPayment({
        paymentId: localPayment.id,
        gatewayPaymentId: expectedGatewayPaymentId,
        gatewayProvider: 'moyasar',
        gatewayResponse: moyasarPayment,
      });
      const { rows: settledRows } = await query(
        'SELECT * FROM payments WHERE id = $1 LIMIT 1',
        [localPayment.id]
      );
      return settledRows[0];
    }
  }

  if (
    !localPayment.financing_plan_id
    && localPayment.category === 'subscription'
    && nextStatus === 'paid'
  ) {
    return persistVerifiedSubscriptionCapture({
      localPayment,
      moyasarPayment,
      gatewayStatus,
    });
  }

  const { rows } = await query(
    `UPDATE payments
        SET status = $1::varchar,
            payment_method = 'moyasar',
            gateway_status = $2::varchar,
            gateway_response = $3::jsonb,
            gateway_verified_at = NOW(),
            processed_at = CASE
              WHEN $1::varchar = 'paid' THEN COALESCE(processed_at, $4::timestamptz, NOW())
              ELSE processed_at
            END,
            updated_at = NOW()
      WHERE id = $5
        AND status IS NOT DISTINCT FROM $6::varchar
      RETURNING *`,
    [
      nextStatus,
      gatewayStatus,
      JSON.stringify(sanitizeMoyasarPaymentEvidence(moyasarPayment)),
      moyasarPayment.created_at || moyasarPayment.updated_at || null,
      localPayment.id,
      localPayment.status,
    ]
  );

  if (rows[0]) {
    return rows[0];
  }

  // The authoritative provider lookup may race another webhook/reconciler.
  // Never overwrite a newer local transition derived from the same provider
  // identity; return the row that won the compare-and-swap instead.
  const { rows: currentRows } = await query(
    'SELECT * FROM payments WHERE id = $1 LIMIT 1',
    [localPayment.id]
  );
  if (!currentRows[0]) {
    const error = new Error('Gateway payment no longer exists');
    error.statusCode = 404;
    throw error;
  }
  return currentRows[0];
};

export const createGatewaySession = async (req, res) => {
  try {
    const readinessFailure = await getGatewayCheckoutReadinessFailure();
    if (readinessFailure) {
      return rejectUnreadyGatewayCheckout(res, readinessFailure);
    }
    if (Number(req.body?.protocol_version) !== GATEWAY_PROTOCOL_VERSION) {
      return protocolUpgradeResponse(res);
    }

    const payerId = req.user?.id;
    const beneficiaryId = req.body?.memberId || payerId;
    const amount = Number(req.body?.amount);
    const planId = req.body?.planId || null;
    const notes = req.body?.notes || '';

    if (!payerId) {
      return res.status(401).json({
        success: false,
        error: 'الرجاء تسجيل الدخول للمتابعة',
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'المبلغ غير صحيح',
      });
    }

    if (amount % 50 !== 0) {
      return res.status(400).json({
        success: false,
        error: 'مبلغ الاشتراك يجب أن يكون من مضاعفات 50 ريال',
      });
    }

    await cleanupExpiredGatewaySessions();

    const amountMinor = toMinorUnit(amount);
    const {
      provider,
      publishableKey,
      currency: configuredCurrency,
    } = getMoyasarPublicCheckoutConfig();
    const currency = String(configuredCurrency || '').trim().toUpperCase();
    const gatewayPaymentId = crypto.randomUUID();
    const referenceNumber = generateReferenceNumber();
    const preparedDescription = `Al-Shuail subscription payment ${referenceNumber}`;
    const currentDate = new Date();
    const hijriData = HijriDateManager.convertToHijri(currentDate);
    const subscriptionId = await findLatestSubscriptionId(beneficiaryId);

    const cols = [
      'payer_id',
      'beneficiary_id',
      'amount',
      'payment_date',
      'payment_method',
      'category',
      'status',
      'reference_number',
      'notes',
      'hijri_date_string',
      'hijri_year',
      'hijri_month',
      'hijri_day',
      'hijri_month_name',
      'gateway_provider',
      'gateway_payment_id',
      'gateway_status',
      'gateway_amount_minor',
      'gateway_currency',
      'gateway_response',
      'gateway_protocol_version',
      'gateway_submission_started_at',
      'gateway_abandoned_at',
      'created_at',
      'updated_at',
    ];
    const vals = [
      payerId,
      beneficiaryId,
      amount,
      currentDate.toISOString().split('T')[0],
      'moyasar',
      'subscription',
      'pending',
      referenceNumber,
      `Moyasar subscription payment${planId ? ` plan=${planId}` : ''}. ${notes}`.trim(),
      hijriData.hijri_date_string,
      hijriData.hijri_year,
      hijriData.hijri_month,
      hijriData.hijri_day,
      hijriData.hijri_month_name,
      provider,
      gatewayPaymentId,
      GATEWAY_STATE.PREPARED,
      amountMinor,
      currency,
      JSON.stringify({
        provider,
        gateway_payment_id: gatewayPaymentId,
        protocol_version: GATEWAY_PROTOCOL_VERSION,
        description: preparedDescription,
      }),
      GATEWAY_PROTOCOL_VERSION,
      null,
      null,
      currentDate.toISOString(),
      currentDate.toISOString(),
    ];

    if (subscriptionId) {
      cols.push('subscription_id');
      vals.push(subscriptionId);
    }

    const client = await getClient();
    let transactionStarted = false;
    let payment;
    let reused = false;
    try {
      await client.query('BEGIN');
      transactionStarted = true;

      // Serialize availability checks for one beneficiary. A separate lock
      // statement is intentional: after waiting, the following statement gets
      // a fresh READ COMMITTED snapshot that includes the prior session insert.
      const { rows: memberRows } = await client.query(
        'SELECT id FROM members WHERE id = $1 FOR UPDATE',
        [beneficiaryId]
      );
      if (!memberRows[0]) {
        const error = new Error('العضو المستفيد غير موجود');
        error.statusCode = 404;
        throw error;
      }

      // One beneficiary may have only one unresolved subscription provider
      // identity. An ambiguous Apple Pay timeout must retry the exact same
      // given_id; a different payer or amount waits until the first identity is
      // terminal. The member lock above serializes the read with concurrent
      // inserts, and the partial unique index remains the database backstop.
      const { rows: openPaymentRows } = await client.query(
        `SELECT *
           FROM payments
          WHERE COALESCE(beneficiary_id, payer_id) = $1
            AND financing_plan_id IS NULL
            AND category = 'subscription'
            AND LOWER(BTRIM(gateway_provider)) = 'moyasar'
            AND status = ANY($2::text[])
          ORDER BY created_at DESC
          LIMIT 1
          FOR UPDATE`,
        [beneficiaryId, OPEN_PAYMENT_STATUSES]
      );
      if (openPaymentRows[0]) {
        const openPayment = openPaymentRows[0];
        const compatible = (
          String(openPayment.payer_id || '') === String(payerId)
          && String(openPayment.beneficiary_id || openPayment.payer_id || '') === String(beneficiaryId)
          && Number(openPayment.gateway_protocol_version) === GATEWAY_PROTOCOL_VERSION
          && Number(openPayment.gateway_amount_minor) === amountMinor
          && Number(openPayment.amount) === amount
          && String(openPayment.gateway_currency || '').trim().toUpperCase() === currency
          && Boolean(String(openPayment.gateway_payment_id || '').trim())
        );
        if (!compatible) {
          const error = new Error(
            'توجد عملية دفع إلكتروني معلقة لهذا العضو؛ أكملها أو ألغها قبل بدء عملية مختلفة'
          );
          error.statusCode = 409;
          error.code = 'PAYMENT_INTENT_IN_PROGRESS';
          throw error;
        }
        payment = openPayment;
        reused = true;
      }

      if (!reused) {
        const availableAmount = await getAvailableSubscriptionAmount(
          beneficiaryId,
          (text, params) => client.query(text, params)
        );
        if (amount > availableAmount) {
          const error = new Error(availableAmount > 0
            ? `الحد المتاح للاشتراك هو ${availableAmount} ريال`
            : 'رصيد الاشتراك مكتمل ولا يمكن دفع مبلغ إضافي');
          error.statusCode = 409;
          error.code = 'SUBSCRIPTION_LIMIT_EXCEEDED';
          error.availableAmount = availableAmount;
          throw error;
        }

        const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
        const { rows } = await client.query(
          `INSERT INTO payments (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
          vals
        );
        payment = rows[0];
      }
      await client.query('COMMIT');
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) {
        await client.query('ROLLBACK');
      }
      throw error;
    } finally {
      client.release();
    }

    const responseDescription = (
      typeof payment.gateway_response === 'object'
      && payment.gateway_response?.description
    ) || `Al-Shuail subscription payment ${payment.reference_number || referenceNumber}`;

    return res.status(reused ? 200 : 201).json({
      success: true,
      data: {
        payment_id: payment.id,
        checkout_url: null,
        provider: payment.gateway_provider || provider,
        gateway_session_id: payment.gateway_payment_id,
        status: payment.status,
        publishable_key: publishableKey,
        amount_minor: Number(payment.gateway_amount_minor || amountMinor),
        currency: payment.gateway_currency || currency,
        description: responseDescription,
        protocol_version: GATEWAY_PROTOCOL_VERSION,
        reused,
      },
      message: 'تم إنشاء جلسة الدفع الإلكتروني',
    });
  } catch (error) {
    if (
      error?.code === '23505'
      && error?.constraint === 'uq_subscription_one_open_gateway_intent_per_beneficiary'
    ) {
      error.statusCode = 409;
      error.code = 'PAYMENT_INTENT_IN_PROGRESS';
      error.message = 'توجد عملية دفع إلكتروني معلقة لهذا العضو';
    }
    log.error('createGatewaySession failed', { error: error.message });
    const payload = {
      success: false,
      error: error.message || 'فشل في إنشاء جلسة الدفع الإلكتروني',
    };
    if (error.code) {payload.code = error.code;}
    if (error.availableAmount !== undefined) {
      payload.available_amount = error.availableAmount;
    }
    return res.status(error.statusCode || 500).json(payload);
  }
};

const loadGatewayPayment = async (paymentId) => {
  const { rows } = await query(
    `SELECT *
       FROM payments
      WHERE id = $1
        AND gateway_provider = 'moyasar'
      LIMIT 1`,
    [paymentId]
  );
  return rows[0] || null;
};

export const markGatewaySubmissionStarted = async (req, res) => {
  try {
    if (Number(req.body?.protocol_version) !== GATEWAY_PROTOCOL_VERSION) {
      return protocolUpgradeResponse(res);
    }

    const localPaymentId = req.params.paymentId;
    const suppliedGatewayPaymentId = String(req.body?.gateway_payment_id || '').trim();
    let localPayment = await loadGatewayPayment(localPaymentId);
    if (!localPayment) {
      return res.status(404).json({ success: false, error: 'لم يتم العثور على جلسة الدفع' });
    }
    if (!isOwnedByMember(localPayment, req.user?.id)) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك الصلاحية للوصول إلى جلسة الدفع',
      });
    }
    if (!isGatewayProtocolV2(localPayment)) {
      return protocolUpgradeResponse(res);
    }
    if (
      !suppliedGatewayPaymentId
      || suppliedGatewayPaymentId !== String(localPayment.gateway_payment_id || '').trim()
    ) {
      return res.status(409).json({
        success: false,
        code: 'GATEWAY_PAYMENT_ID_MISMATCH',
        error: 'رقم عملية الدفع غير مطابق',
      });
    }

    // Re-check both kill switches at the last safe boundary. Operations may
    // disable checkout after a session was prepared but before Apple Pay calls
    // Moyasar; in that race the client must never receive permission to submit.
    const readinessFailure = await getGatewayCheckoutReadinessFailure();
    if (readinessFailure) {
      return rejectUnreadyGatewayCheckout(res, readinessFailure);
    }
    if (localPayment.financing_plan_id && !isFinancingOnlinePaymentEnabled()) {
      return res.status(503).json({
        success: false,
        code: 'FINANCING_GATEWAY_DISABLED',
        error: 'سداد أقساط التمويل عبر البوابة غير مفعل حالياً',
      });
    }

    if (isSubmissionStarted(localPayment) && OPEN_PAYMENT_STATUSES.includes(localPayment.status)) {
      return res.json({
        success: true,
        data: {
          payment_id: localPayment.id,
          status: localPayment.status,
          gateway_status: localPayment.gateway_status,
          protocol_version: GATEWAY_PROTOCOL_VERSION,
          idempotent_replay: true,
        },
      });
    }

    const { rows: updatedRows } = await query(
      `UPDATE payments
          SET status = 'pending_verification',
              gateway_status = $1,
              gateway_submission_started_at = COALESCE(gateway_submission_started_at, NOW()),
              gateway_failure_reason = NULL,
              updated_at = NOW()
        WHERE id = $2
          AND gateway_provider = 'moyasar'
          AND gateway_payment_id = $3
          AND gateway_protocol_version = $4
          AND status = 'pending'
          AND gateway_status = $5
          AND gateway_submission_started_at IS NULL
        RETURNING *`,
      [
        GATEWAY_STATE.SUBMISSION_STARTED,
        localPayment.id,
        suppliedGatewayPaymentId,
        GATEWAY_PROTOCOL_VERSION,
        GATEWAY_STATE.PREPARED,
      ]
    );

    localPayment = updatedRows[0] || await loadGatewayPayment(localPayment.id);
    if (localPayment && isSubmissionStarted(localPayment) && OPEN_PAYMENT_STATUSES.includes(localPayment.status)) {
      return res.json({
        success: true,
        data: {
          payment_id: localPayment.id,
          status: localPayment.status,
          gateway_status: localPayment.gateway_status,
          protocol_version: GATEWAY_PROTOCOL_VERSION,
          idempotent_replay: updatedRows.length === 0,
        },
      });
    }

    return res.status(409).json({
      success: false,
      code: 'PAYMENT_SESSION_NOT_PREPARED',
      error: 'جلسة الدفع لم تعد متاحة لبدء الإرسال',
    });
  } catch (error) {
    log.error('markGatewaySubmissionStarted failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'فشل تأمين بدء عملية الدفع الإلكتروني',
    });
  }
};

export const cancelGatewaySession = async (req, res) => {
  try {
    const localPaymentId = req.params.paymentId;
    let localPayment = await loadGatewayPayment(localPaymentId);
    if (!localPayment) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على جلسة الدفع',
      });
    }

    if (
      req.user?.role === 'member' &&
      !isOwnedByMember(localPayment, req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك الصلاحية للوصول إلى جلسة الدفع',
      });
    }

    if (
      localPayment.status === 'cancelled'
      && localPayment.gateway_status === GATEWAY_STATE.NOT_SUBMITTED
    ) {
      return res.json({
        success: true,
        data: {
          payment_id: localPayment.id,
          status: localPayment.status,
          gateway_status: localPayment.gateway_status,
          released: true,
          idempotent_replay: true,
        },
      });
    }

    if (
      isGatewayProtocolV2(localPayment)
      && localPayment.status === 'pending'
      && localPayment.gateway_status === GATEWAY_STATE.PREPARED
      && !localPayment.gateway_submission_started_at
    ) {
      const { rows: cancelledRows } = await query(
        `UPDATE payments
            SET status = 'cancelled',
                gateway_status = $1,
                gateway_failure_reason = $2,
                gateway_abandoned_at = NOW(),
                updated_at = NOW()
          WHERE id = $3
            AND gateway_protocol_version = $4
            AND status = 'pending'
            AND gateway_status = $5
            AND gateway_submission_started_at IS NULL
          RETURNING *`,
        [
          GATEWAY_STATE.NOT_SUBMITTED,
          LOCAL_ABANDON_REASONS.CLIENT_CANCELLED,
          localPayment.id,
          GATEWAY_PROTOCOL_VERSION,
          GATEWAY_STATE.PREPARED,
        ]
      );
      if (cancelledRows[0]) {
        return res.json({
          success: true,
          data: {
            payment_id: cancelledRows[0].id,
            status: cancelledRows[0].status,
            gateway_status: cancelledRows[0].gateway_status,
            released: true,
          },
        });
      }
      localPayment = await loadGatewayPayment(localPayment.id);
    }

    if (
      localPayment
      && isGatewayProtocolV2(localPayment)
      && OPEN_PAYMENT_STATUSES.includes(localPayment.status)
      && isSubmissionStarted(localPayment)
    ) {
      try {
        const providerPayment = await fetchMoyasarPayment(localPayment.gateway_payment_id);
        const updated = await updatePaymentFromMoyasar({
          localPayment,
          moyasarPayment: providerPayment,
          evidenceSource: 'provider_api',
        });
        const retained = OPEN_PAYMENT_STATUSES.includes(updated?.status);
        return res.status(retained ? 202 : 200).json({
          success: true,
          data: {
            payment_id: updated.id,
            status: updated.status,
            gateway_status: updated.gateway_status,
            retained_for_reconciliation: retained,
            released: !retained && updated.status !== 'paid',
          },
        });
      } catch (error) {
        // A 404 or transport failure after submission started is not proof that
        // Moyasar did not receive the idempotent create request. Keep the exact
        // given_id locked so a retry cannot create a second live identity.
        log.warn('Submitted Moyasar session cancellation retained for reconciliation', {
          paymentId: localPayment.id,
          gatewayPaymentId: localPayment.gateway_payment_id,
          statusCode: error.statusCode,
          error: error.message,
        });
        return res.status(202).json({
          success: true,
          data: {
            payment_id: localPayment.id,
            status: localPayment.status,
            gateway_status: localPayment.gateway_status,
            retained_for_reconciliation: true,
            released: false,
          },
        });
      }
    }

    if (!localPayment || !OPEN_PAYMENT_STATUSES.includes(localPayment.status)) {
      return res.status(409).json({
        success: false,
        error: 'لا يمكن إلغاء جلسة دفع تمت معالجتها',
      });
    }

    // Legacy sessions have no submission marker. Retain them conservatively;
    // protocol v2 is the only path allowed to prove no provider request began.
    return res.status(202).json({
      success: true,
      data: {
        payment_id: localPayment.id,
        status: localPayment.status,
        gateway_status: localPayment.gateway_status,
        retained_for_reconciliation: true,
        released: false,
      },
    });
  } catch (error) {
    log.error('cancelGatewaySession failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'فشل في إلغاء جلسة الدفع الإلكتروني',
    });
  }
};

export const verifyGatewaySession = async (req, res) => {
  try {
    // Disabling new checkout must not strand a charge that may already have
    // reached Moyasar. Resolution needs only server-side provider credentials;
    // creation/marker kill switches are deliberately not consulted here.
    if (!isGatewayResolutionConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'إعدادات التحقق من بوابة الدفع غير مكتملة',
        code: 'GATEWAY_NOT_CONFIGURED',
      });
    }

    const localPaymentId = req.params.paymentId;
    const gatewayPaymentId = req.body?.gateway_payment_id;

    const { rows } = await query(
      `SELECT *
         FROM payments
        WHERE id = $1
          AND gateway_provider = 'moyasar'
        LIMIT 1`,
      [localPaymentId]
    );

    const localPayment = rows[0];
    if (!localPayment) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على الدفعة',
      });
    }

    if (
      req.user?.role === 'member' &&
      !isOwnedByMember(localPayment, req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك الصلاحية للوصول إلى هذه الدفعة',
      });
    }

    if (!isGatewayProtocolV2(localPayment) || !isSubmissionStarted(localPayment)) {
      return res.status(409).json({
        success: false,
        code: 'GATEWAY_SUBMISSION_NOT_STARTED',
        error: 'لم يبدأ إرسال جلسة الدفع إلى البوابة',
      });
    }

    const expectedGatewayPaymentId = localPayment.gateway_payment_id;
    if (gatewayPaymentId && gatewayPaymentId !== expectedGatewayPaymentId) {
      return res.status(409).json({
        success: false,
        error: 'رقم عملية الدفع غير مطابق',
      });
    }

    const moyasarPayment = await fetchMoyasarPayment(expectedGatewayPaymentId);
    const updated = await updatePaymentFromMoyasar({
      localPayment,
      moyasarPayment,
      evidenceSource: 'provider_api',
    });

    return res.json({
      success: true,
      data: {
        payment_id: updated.id,
        status: updated.status,
        provider: 'moyasar',
        gateway_payment_id: expectedGatewayPaymentId,
        failure_reason: getFailureReason(moyasarPayment),
      },
    });
  } catch (error) {
    log.error('verifyGatewaySession failed', { error: error.message });
    const payload = {
      success: false,
      error: error.message || 'فشل في التحقق من الدفع الإلكتروني',
    };
    if (error.code) {payload.code = error.code;}
    if (error.reviewRequired) {
      payload.review_required = true;
      payload.review_recorded = Boolean(error.reviewRecorded);
    }
    return res.status(error.statusCode || 500).json(payload);
  }
};

export const handleMoyasarWebhook = async (req, res) => {
  try {
    const configuredSecret = config.paymentGateway?.moyasar?.webhookSecret;
    if (!configuredSecret) {
      log.error('Moyasar webhook rejected because MOYASAR_WEBHOOK_SECRET is not configured');
      return res.status(503).json({
        success: false,
        error: 'Webhook is not configured',
      });
    }
    const suppliedSecret = String(req.body?.secret_token || '');
    const configuredBuffer = Buffer.from(configuredSecret);
    const suppliedBuffer = Buffer.from(suppliedSecret);
    if (
      configuredBuffer.length !== suppliedBuffer.length
      || !crypto.timingSafeEqual(configuredBuffer, suppliedBuffer)
    ) {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook secret',
      });
    }

    // Webhook payloads are delivery hints, not authoritative financial state.
    // Use only the provider identity from the body; every known payment is
    // resolved from Moyasar's authenticated API before any local transition.
    const gatewayPaymentId = String(req.body?.data?.id || '').trim();

    if (!gatewayPaymentId) {
      return res.status(200).json({
        success: true,
        ignored: true,
      });
    }

    const { rows } = await query(
      `SELECT *
         FROM payments
        WHERE gateway_provider = 'moyasar'
          AND gateway_payment_id = $1
        LIMIT 1`,
      [gatewayPaymentId]
    );

    const localPayment = rows[0];
    if (!localPayment) {
      log.warn('Moyasar webhook received for unknown payment', { gatewayPaymentId });
      return res.status(200).json({
        success: true,
        ignored: true,
      });
    }

    let moyasarPayment;
    try {
      moyasarPayment = await fetchMoyasarPayment(gatewayPaymentId);
    } catch (error) {
      // Do not acknowledge an event whose current provider state could not be
      // verified. A retryable response lets Moyasar deliver it again while the
      // local row and its reserved provider identity remain unchanged.
      log.warn('Moyasar webhook authoritative lookup failed', {
        gatewayPaymentId,
        providerStatusCode: error.statusCode || null,
        error: error.message,
      });
      return res.status(503).json({
        success: false,
        retryable: true,
        error: 'Provider verification unavailable',
      });
    }

    await updatePaymentFromMoyasar({
      localPayment,
      moyasarPayment,
      evidenceSource: 'webhook',
    });

    return res.json({
      success: true,
    });
  } catch (error) {
    log.error('handleMoyasarWebhook failed', { error: error.message });
    if (error.reviewRequired && error.code) {
      return res.status(error.statusCode || 409).json({
        success: false,
        error: error.message,
        code: error.code,
        review_required: true,
        review_recorded: Boolean(error.reviewRecorded),
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
    });
  }
};
