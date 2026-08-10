import { createHash, randomUUID } from 'node:crypto';
import { config } from '../config/env.js';
import { updatePaymentFromMoyasar } from '../controllers/paymentGatewayController.js';
import { log } from '../utils/logger.js';
import { query } from './database.js';
import {
  fetchMoyasarPayment,
  getMoyasarGatewayOperationalReadiness,
  sanitizeMoyasarPaymentEvidence,
} from './moyasarService.js';

const RECONCILABLE_STATUSES = Object.freeze([
  'pending',
  'pending_verification',
  'paid',
  'pending_refund',
  'cancelled',
]);
const TERMINAL_LOCAL_STATUSES = new Set(['refunded', 'cancelled', 'failed']);
const LEASE_MINUTES = 15;
const ABANDONED_IDENTITY_RETENTION_DAYS = 30;
const DEFAULT_BATCH_SIZE = 25;
const NOT_FOUND_REVIEW_THRESHOLD = 4;
const NOT_FOUND_REVIEW_MIN_AGE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DRAIN_MAX_BATCHES = 8;
const DEFAULT_DRAIN_MAX_DURATION_MS = 20_000;
const SCHEDULER_INTERVAL_MS = 15 * 60 * 1000;
const SCHEDULER_INITIAL_DELAY_MS = 45 * 1000;

let schedulerRunInFlight = false;

function boundedBatchSize(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {return DEFAULT_BATCH_SIZE;}
  return Math.min(parsed, 100);
}

function boundedPositiveInteger(value, fallback, maximum) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {return fallback;}
  return Math.min(parsed, maximum);
}

function boundedPositiveDuration(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {return fallback;}
  return Math.min(Math.floor(parsed), 60_000);
}

function validDateOrNull(value) {
  if (!value) {return null;}
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function canonicalProviderLookupError(httpStatus) {
  const status = Number(httpStatus);
  const error = new Error(Number.isInteger(status)
    ? `Authoritative Moyasar lookup returned HTTP ${status}`
    : 'Authoritative Moyasar lookup was unavailable');
  error.code = Number.isInteger(status) ? `MOYASAR_HTTP_${status}` : 'MOYASAR_LOOKUP_UNAVAILABLE';
  return error;
}

function evidenceHash(providerPayment) {
  const canonical = sanitizeMoyasarPaymentEvidence(providerPayment);
  return createHash('sha256')
    .update(JSON.stringify(canonical), 'utf8')
    .digest('hex');
}

function isLocallyAbandonedIdentity(payment) {
  return String(payment?.status || '').trim().toLowerCase() === 'cancelled'
    && String(payment?.gateway_status || '').trim().toLowerCase() === 'not_submitted';
}

function isTerminalReconciliationResult(payment) {
  const status = String(payment?.status || '').trim().toLowerCase();
  if (status === 'cancelled' && isLocallyAbandonedIdentity(payment)) {return false;}
  return TERMINAL_LOCAL_STATUSES.has(status);
}

function nextSuccessfulCheckAt(payment) {
  const now = Date.now();
  if (isLocallyAbandonedIdentity(payment)) {
    const abandonedAt = new Date(
      payment?.gateway_abandoned_at || payment?.updated_at || payment?.created_at || now
    ).getTime();
    const ageMs = Number.isFinite(abandonedAt) ? Math.max(0, now - abandonedAt) : 0;
    const dayMs = 24 * 60 * 60 * 1000;
    if (ageMs <= dayMs) {return new Date(now + 15 * 60 * 1000);}
    if (ageMs <= 7 * dayMs) {return new Date(now + 60 * 60 * 1000);}
    return new Date(now + 6 * 60 * 60 * 1000);
  }
  if (payment?.status === 'pending_refund') {
    return new Date(now + 60 * 60 * 1000);
  }
  if (payment?.status === 'pending' || payment?.status === 'pending_verification') {
    return new Date(now + 15 * 60 * 1000);
  }

  const createdAt = new Date(payment?.created_at || payment?.gateway_verified_at || now).getTime();
  const ageMs = Number.isFinite(createdAt) ? Math.max(0, now - createdAt) : 0;
  const dayMs = 24 * 60 * 60 * 1000;
  if (ageMs <= 7 * dayMs) {return new Date(now + 6 * 60 * 60 * 1000);}
  if (ageMs <= 30 * dayMs) {return new Date(now + dayMs);}
  return new Date(now + 7 * dayMs);
}

function nextFailureCheckAt(consecutiveFailures) {
  const delaysMinutes = [15, 60, 360, 1440];
  const index = Math.max(0, Math.min(Number(consecutiveFailures || 1) - 1, delaysMinutes.length - 1));
  return new Date(Date.now() + delaysMinutes[index] * 60 * 1000);
}

export function isGatewayReconciliationEnabled() {
  return config.paymentGateway?.reconciliationEnabled === true
    && String(config.paymentGateway?.provider || '').trim().toLowerCase() === 'moyasar'
    && Boolean(String(config.paymentGateway?.moyasar?.secretKey || '').trim());
}

async function claimGatewayReconciliationBatch(limit) {
  const claimToken = randomUUID();
  const { rows } = await query(
    `WITH candidates AS (
       SELECT p.id
         FROM payments p
         LEFT JOIN gateway_payment_reconciliation_state state
           ON state.payment_id = p.id
        WHERE LOWER(BTRIM(p.gateway_provider)) = 'moyasar'
          AND NULLIF(BTRIM(p.gateway_payment_id::text), '') IS NOT NULL
          AND (p.financing_plan_id IS NOT NULL OR p.category = 'subscription')
          AND p.status = ANY($1::text[])
          AND (
            (
              p.status IN ('pending', 'pending_verification')
              AND (
                (
                  p.gateway_protocol_version = 2
                  AND p.gateway_submission_started_at IS NOT NULL
                  AND p.gateway_status <> 'not_submitted'
                )
                OR (
                  COALESCE(p.gateway_protocol_version, 0) <> 2
                  AND COALESCE(p.gateway_status, '') <> 'not_submitted'
                )
              )
            )
            OR (
              p.status IN ('paid', 'pending_refund')
              AND p.gateway_verified_at IS NOT NULL
            )
            OR (
              p.status = 'cancelled'
              AND p.gateway_status = 'not_submitted'
              AND p.gateway_protocol_version = 2
              AND p.gateway_submission_started_at IS NULL
              AND COALESCE(p.gateway_abandoned_at, p.updated_at, p.created_at) >=
                    NOW() - ($5::int * INTERVAL '1 day')
            )
          )
          AND (
            state.payment_id IS NULL
            OR (
              state.next_check_at IS NOT NULL
              AND state.next_check_at <= NOW()
              AND (state.lease_expires_at IS NULL OR state.lease_expires_at < NOW())
            )
          )
        ORDER BY COALESCE(state.next_check_at, p.gateway_verified_at, p.created_at) ASC,
                 p.id ASC
        LIMIT $4
        FOR UPDATE OF p SKIP LOCKED
     ), claimed AS (
       INSERT INTO gateway_payment_reconciliation_state AS state (
         payment_id, next_check_at, claim_token, lease_expires_at,
         consecutive_failures, check_count, created_at, updated_at
       )
       SELECT c.id, NOW(), $2::uuid,
              NOW() + ($3::int * INTERVAL '1 minute'),
              0, 0, NOW(), NOW()
         FROM candidates c
       ON CONFLICT (payment_id) DO UPDATE
         SET claim_token = EXCLUDED.claim_token,
             lease_expires_at = EXCLUDED.lease_expires_at,
             updated_at = NOW()
       WHERE state.next_check_at IS NOT NULL
         AND state.next_check_at <= NOW()
         AND (state.lease_expires_at IS NULL OR state.lease_expires_at < NOW())
       RETURNING state.payment_id, state.claim_token, state.consecutive_failures,
                 state.consecutive_not_found, state.first_not_found_at
     )
     SELECT p.*, c.claim_token, c.consecutive_failures,
            c.consecutive_not_found, c.first_not_found_at
       FROM claimed c
       JOIN payments p ON p.id = c.payment_id
      ORDER BY p.created_at ASC, p.id ASC`,
    [
      RECONCILABLE_STATUSES,
      claimToken,
      LEASE_MINUTES,
      boundedBatchSize(limit),
      ABANDONED_IDENTITY_RETENTION_DAYS,
    ]
  );
  return rows;
}

async function completeClaim(payment, {
  result,
  providerStatus = null,
  evidence = null,
  error = null,
  nextCheckAt = null,
  consecutiveFailures = 0,
  consecutiveNotFound = 0,
  firstNotFoundAt = null,
  providerHttpStatus = null,
  reviewReason = null,
}) {
  const errorMessage = error
    ? [error?.code, error?.message || String(error)].filter(Boolean).join(': ').slice(0, 2000)
    : null;
  const resultRow = await query(
    `UPDATE gateway_payment_reconciliation_state
        SET next_check_at = $3,
            last_checked_at = NOW(),
            last_provider_status = $4,
            last_result = $5,
            last_evidence_hash = $6,
            last_error = $7,
            consecutive_failures = $8,
            consecutive_not_found = $9,
            first_not_found_at = $10,
            last_provider_http_status = $11,
            review_reason = $12,
            check_count = check_count + 1,
            claim_token = NULL,
            lease_expires_at = NULL,
            updated_at = NOW()
      WHERE payment_id = $1
        AND claim_token = $2::uuid
        AND lease_expires_at > NOW()
      RETURNING payment_id`,
    [
      payment.id,
      payment.claim_token,
      nextCheckAt ? nextCheckAt.toISOString() : null,
      providerStatus,
      result,
      evidence,
      errorMessage,
      consecutiveFailures,
      consecutiveNotFound,
      firstNotFoundAt ? firstNotFoundAt.toISOString() : null,
      providerHttpStatus,
      reviewReason,
    ]
  );
  return resultRow.rowCount === 1 || resultRow.rows?.length === 1;
}

async function renewClaimBeforeApply(payment) {
  const { rows } = await query(
    `UPDATE gateway_payment_reconciliation_state
        SET lease_expires_at = NOW() + ($3::int * INTERVAL '1 minute'),
            updated_at = NOW()
      WHERE payment_id = $1
        AND claim_token = $2::uuid
        AND lease_expires_at > NOW()
      RETURNING payment_id`,
    [payment.id, payment.claim_token, LEASE_MINUTES]
  );
  return rows.length === 1;
}

/**
 * Reconcile open and already-settled Moyasar identities using durable DB
 * leases. Provider IO happens only after the claim statement commits, so no
 * payment/plan/member lock is held across the network request.
 */
export async function reconcileGatewayPayments({
  limit = DEFAULT_BATCH_SIZE,
  fetchPayment = fetchMoyasarPayment,
  applyProviderState = updatePaymentFromMoyasar,
} = {}) {
  if (!isGatewayReconciliationEnabled()) {
    return {
      skipped: true,
      reason: 'disabled_or_unconfigured',
      examined: 0,
      reconciled: 0,
      terminal: 0,
      review_required: 0,
      failed: 0,
      lost_lease: 0,
    };
  }
  if (typeof fetchPayment !== 'function' || typeof applyProviderState !== 'function') {
    throw new TypeError('Gateway reconciliation dependencies are invalid');
  }

  const candidates = await claimGatewayReconciliationBatch(limit);
  const summary = {
    skipped: false,
    examined: candidates.length,
    reconciled: 0,
    terminal: 0,
    review_required: 0,
    failed: 0,
    lost_lease: 0,
  };

  for (const payment of candidates) {
    let providerPayment = null;
    let providerStatus = null;
    let canonicalHash = null;
    try {
      providerPayment = await fetchPayment(payment.gateway_payment_id);
      providerStatus = String(providerPayment?.status || '').trim().toLowerCase() || null;
      canonicalHash = evidenceHash(providerPayment);
      if (!await renewClaimBeforeApply(payment)) {
        summary.lost_lease += 1;
        continue;
      }
      const updated = await applyProviderState({
        localPayment: payment,
        moyasarPayment: providerPayment,
        evidenceSource: 'reconciliation',
      });
      const terminal = isTerminalReconciliationResult(updated);
      const completed = await completeClaim(payment, {
        result: terminal ? 'terminal' : 'checked',
        providerStatus,
        evidence: canonicalHash,
        nextCheckAt: terminal ? null : nextSuccessfulCheckAt(updated || payment),
        consecutiveFailures: 0,
      });
      if (!completed) {
        summary.lost_lease += 1;
        continue;
      }
      summary.reconciled += 1;
      if (terminal) {summary.terminal += 1;}
    } catch (error) {
      if (error?.reviewRequired) {
        const completed = await completeClaim(payment, {
          result: 'review_required',
          providerStatus,
          evidence: canonicalHash,
          error,
          nextCheckAt: null,
          consecutiveFailures: 0,
          consecutiveNotFound: 0,
          firstNotFoundAt: null,
          providerHttpStatus: null,
          reviewReason: error.reviewReason || 'gateway_financial_exception',
        });
        if (!completed) {
          summary.lost_lease += 1;
          continue;
        }
        summary.review_required += 1;
        continue;
      }

      const rawProviderHttpStatus = providerPayment ? null : Number(error?.statusCode);
      const providerHttpStatus = Number.isInteger(rawProviderHttpStatus)
        && rawProviderHttpStatus >= 100
        && rawProviderHttpStatus <= 599
        ? rawProviderHttpStatus
        : null;
      const failures = Number(payment.consecutive_failures || 0) + 1;
      if (providerHttpStatus === 404) {
        const consecutiveNotFound = Number(payment.consecutive_not_found || 0) + 1;
        const firstNotFoundAt = validDateOrNull(payment.first_not_found_at) || new Date();
        const notFoundAgeMs = Math.max(0, Date.now() - firstNotFoundAt.getTime());
        const requiresReview = consecutiveNotFound >= NOT_FOUND_REVIEW_THRESHOLD
          && notFoundAgeMs >= NOT_FOUND_REVIEW_MIN_AGE_MS;
        const completed = await completeClaim(payment, {
          result: requiresReview ? 'review_required' : 'provider_error',
          providerStatus,
          evidence: canonicalHash,
          error: canonicalProviderLookupError(providerHttpStatus),
          nextCheckAt: requiresReview ? null : nextFailureCheckAt(failures),
          consecutiveFailures: failures,
          consecutiveNotFound,
          firstNotFoundAt,
          providerHttpStatus,
          reviewReason: requiresReview ? 'provider_not_found_bounded' : null,
        });
        if (!completed) {
          summary.lost_lease += 1;
          continue;
        }
        if (requiresReview) {
          summary.review_required += 1;
        } else {
          summary.failed += 1;
        }
        continue;
      }

      const completed = await completeClaim(payment, {
        result: providerPayment ? 'processing_error' : 'provider_error',
        providerStatus,
        evidence: canonicalHash,
        error: providerPayment ? error : canonicalProviderLookupError(providerHttpStatus),
        nextCheckAt: nextFailureCheckAt(failures),
        consecutiveFailures: failures,
        consecutiveNotFound: 0,
        firstNotFoundAt: null,
        providerHttpStatus,
        reviewReason: null,
      });
      if (!completed) {
        summary.lost_lease += 1;
        continue;
      }
      summary.failed += 1;
      log.warn('Gateway payment reconciliation failed', {
        paymentId: payment.id,
        gatewayPaymentId: payment.gateway_payment_id,
        providerStatus,
        error: error.message,
      });
    }
  }

  return summary;
}

export async function drainGatewayReconciliationQueue({
  batchSize = DEFAULT_BATCH_SIZE,
  maxBatches = DEFAULT_DRAIN_MAX_BATCHES,
  maxDurationMs = DEFAULT_DRAIN_MAX_DURATION_MS,
  reconcileBatch = reconcileGatewayPayments,
  clock = Date.now,
} = {}) {
  if (typeof reconcileBatch !== 'function' || typeof clock !== 'function') {
    throw new TypeError('Gateway reconciliation drain dependencies are invalid');
  }
  const boundedSize = boundedBatchSize(batchSize);
  const boundedBatches = boundedPositiveInteger(maxBatches, DEFAULT_DRAIN_MAX_BATCHES, 32);
  const boundedDuration = boundedPositiveDuration(
    maxDurationMs,
    DEFAULT_DRAIN_MAX_DURATION_MS
  );
  const startedAt = Number(clock());
  const aggregate = {
    skipped: false,
    examined: 0,
    reconciled: 0,
    terminal: 0,
    review_required: 0,
    failed: 0,
    lost_lease: 0,
    batches: 0,
    drained: false,
    stopped_reason: 'batch_cap',
  };

  for (let batch = 0; batch < boundedBatches; batch += 1) {
    if (batch > 0 && Number(clock()) - startedAt >= boundedDuration) {
      aggregate.stopped_reason = 'time_cap';
      break;
    }
    const summary = await reconcileBatch({ limit: boundedSize });
    if (summary?.skipped) {
      return {
        ...aggregate,
        ...summary,
        batches: aggregate.batches,
        drained: false,
        stopped_reason: summary.reason || 'disabled_or_unconfigured',
      };
    }
    aggregate.batches += 1;
    for (const field of [
      'examined',
      'reconciled',
      'terminal',
      'review_required',
      'failed',
      'lost_lease',
    ]) {
      aggregate[field] += Number(summary?.[field] || 0);
    }
    if (Number(summary?.examined || 0) < boundedSize) {
      aggregate.drained = true;
      aggregate.stopped_reason = 'queue_drained';
      break;
    }
  }

  return aggregate;
}

export function startGatewayReconciliationScheduler() {
  if (!isGatewayReconciliationEnabled()) {
    log.info('Gateway reconciliation scheduler disabled');
    return null;
  }

  void getMoyasarGatewayOperationalReadiness({ forceRefresh: true })
    .then((readiness) => {
      if (!readiness?.ready) {
        log.error('Gateway reconciliation schema is not operationally ready');
      }
    })
    .catch((error) => {
      log.error('Gateway reconciliation readiness probe failed', { error: error.message });
    });

  const run = async () => {
    if (schedulerRunInFlight) {return;}
    schedulerRunInFlight = true;
    try {
      const readiness = await getMoyasarGatewayOperationalReadiness();
      if (!readiness?.ready) {
        log.error('Gateway reconciliation run skipped: schema not ready');
        return;
      }
      const summary = await drainGatewayReconciliationQueue();
      if (summary.examined > 0) {
        log.info('Gateway reconciliation drain completed', summary);
      }
    } catch (error) {
      log.error('Gateway reconciliation scheduler failed', { error: error.message });
    } finally {
      schedulerRunInFlight = false;
    }
  };

  const initialTimer = setTimeout(run, SCHEDULER_INITIAL_DELAY_MS);
  const intervalTimer = setInterval(run, SCHEDULER_INTERVAL_MS);
  initialTimer.unref?.();
  intervalTimer.unref?.();

  return () => {
    clearTimeout(initialTimer);
    clearInterval(intervalTimer);
  };
}

export default {
  drainGatewayReconciliationQueue,
  isGatewayReconciliationEnabled,
  reconcileGatewayPayments,
  startGatewayReconciliationScheduler,
};
