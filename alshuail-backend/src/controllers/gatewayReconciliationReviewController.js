import { getClient, query } from '../services/database.js';
import { logAdminAction } from '../utils/audit-logger.js';
import { log } from '../utils/logger.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REVIEW_READERS = new Set(['super_admin', 'financial_manager']);
const REVIEW_ACTIONS = new Set(['requeue', 'resolve']);

const ACTIVE_RECONCILIATION_PRINCIPAL_QUERY = `
  SELECT identity_source, current_role
    FROM (
      SELECT 'users'::text AS identity_source,
             users.role::text AS current_role,
             1 AS source_priority
        FROM users
       WHERE users.id = $1
         AND users.role = ANY($2::text[])
         AND users.is_active IS TRUE
      UNION ALL
      SELECT 'members'::text AS identity_source,
             members.role::text AS current_role,
             2 AS source_priority
        FROM members
       WHERE members.id = $1
         AND members.role = ANY($2::text[])
         AND members.is_active IS TRUE
         AND members.membership_status = 'active'
         AND (
           members.suspended_at IS NULL
           OR (
             members.reactivated_at IS NOT NULL
             AND members.reactivated_at >= members.suspended_at
           )
         )
    ) active_principal
   ORDER BY source_priority
   LIMIT 1`;

const REVIEW_QUEUE_PROJECTION = `
  SELECT state.payment_id,
         COALESCE(
           NULLIF(BTRIM(p.reference_number), ''),
           NULLIF(BTRIM(p.payment_number), ''),
           NULLIF(BTRIM(p.payment_reference), '')
         ) AS payment_reference,
         COALESCE(NULLIF(BTRIM(m.full_name), ''), NULLIF(BTRIM(p.payer_name), '')) AS member_name,
         CASE
           WHEN NULLIF(BTRIM(m.phone), '') IS NULL THEN NULL
           ELSE CONCAT(LEFT(BTRIM(m.phone), 3), '••••', RIGHT(BTRIM(m.phone), 2))
         END AS member_phone_masked,
         COALESCE(NULLIF(BTRIM(p.category), ''), NULLIF(BTRIM(p.payment_type), ''), 'subscription') AS category,
         p.status AS payment_status,
         p.amount,
         UPPER(COALESCE(NULLIF(BTRIM(p.gateway_currency), ''), NULLIF(BTRIM(p.currency), ''), 'SAR')) AS currency,
         LOWER(BTRIM(p.gateway_provider)) AS gateway_provider,
         CASE
           WHEN NULLIF(BTRIM(p.gateway_payment_id::text), '') IS NULL THEN NULL
           ELSE CONCAT('••••', RIGHT(BTRIM(p.gateway_payment_id::text), 12))
         END AS gateway_payment_id_masked,
         (p.financing_plan_id IS NOT NULL) AS is_financing,
         state.last_provider_status,
         state.last_provider_http_status,
         state.last_result,
         state.review_reason,
         state.consecutive_not_found,
         state.consecutive_failures,
         state.check_count,
         state.first_not_found_at,
         state.last_checked_at,
         CASE
           WHEN state.last_evidence_hash IS NULL THEN NULL
           ELSE CONCAT(LEFT(state.last_evidence_hash, 8), '…', RIGHT(state.last_evidence_hash, 8))
         END AS evidence_hash_masked,
         state.created_at AS reconciliation_started_at,
         state.updated_at`;

function publicError(message, code, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function parseBoundedInteger(value, fallback, minimum, maximum) {
  if (value === undefined || value === null || value === '') {return fallback;}
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {return null;}
  return parsed;
}

function normalizedReason(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function isMeaningfulArabicReconciliationReason(value) {
  const reason = normalizedReason(value);
  const arabicLetters = reason.match(/[ء-ي]/g) || [];
  return reason.length >= 12 && reason.length <= 500 && arabicLetters.length >= 8;
}

function clientIp(req) {
  return req.ip || req.headers?.['x-forwarded-for'] || null;
}

function responseError(res, error, fallbackMessage) {
  log.error(fallbackMessage, { error: error.message, code: error.code || null });
  return res.status(error.statusCode || 500).json({
    success: false,
    error: error.statusCode ? error.message : 'تعذر إتمام مراجعة مصالحة بوابة الدفع',
    ...(error.code ? { code: error.code } : {}),
  });
}

async function resolveActiveReconciliationPrincipal(executor, actorId, allowedRoles) {
  const { rows } = await executor.query(
    ACTIVE_RECONCILIATION_PRINCIPAL_QUERY,
    [actorId, allowedRoles]
  );
  return rows[0] || null;
}

/**
 * GET /api/payments/gateway/reconciliation-reviews
 * Operational review queue. The projection deliberately excludes raw gateway
 * responses, provider identities and member contact details.
 */
export async function listGatewayReconciliationReviews(req, res) {
  try {
    if (!REVIEW_READERS.has(req.user?.role)) {
      throw publicError('ليس لديك الصلاحية لعرض قائمة مراجعة المصالحة', 'FORBIDDEN', 403);
    }
    const actorId = String(req.user?.id || '').trim();
    if (!UUID_PATTERN.test(actorId)) {
      throw publicError(
        'تعذر التحقق من هوية مراجع المصالحة',
        'INVALID_RECONCILIATION_REVIEWER_IDENTITY',
        403
      );
    }

    const requestedStatus = String(req.query?.status || 'review_required').trim().toLowerCase();
    if (requestedStatus !== 'review_required') {
      throw publicError(
        'هذه القائمة مخصصة للحالات التي تحتاج مراجعة فقط',
        'INVALID_RECONCILIATION_REVIEW_STATUS',
        400
      );
    }
    const page = parseBoundedInteger(req.query?.page, 1, 1, 10000);
    const limit = parseBoundedInteger(req.query?.limit, 25, 1, 100);
    if (page === null || limit === null) {
      throw publicError('قيم التصفح غير صالحة', 'INVALID_PAGINATION', 400);
    }
    const offset = (page - 1) * limit;

    const principal = await resolveActiveReconciliationPrincipal(
      { query },
      actorId,
      [...REVIEW_READERS]
    );
    if (!principal) {
      throw publicError(
        'الحساب غير نشط أو لم يعد مخولاً لعرض قائمة مراجعة المصالحة',
        'RECONCILIATION_REVIEWER_NOT_PRIVILEGED',
        403
      );
    }

    const { rows } = await query(
      `SELECT projected.*,
              COUNT(*) OVER() AS total_count
         FROM (
           ${REVIEW_QUEUE_PROJECTION}
             FROM gateway_payment_reconciliation_state state
             JOIN payments p ON p.id = state.payment_id
             LEFT JOIN members m ON m.id = COALESCE(p.beneficiary_id, p.payer_id)
            WHERE state.last_result = 'review_required'
              AND state.review_reason IS NOT NULL
         ) projected
        ORDER BY projected.last_checked_at DESC NULLS LAST,
                 projected.updated_at DESC,
                 projected.payment_id
        LIMIT $1
       OFFSET $2`,
      [limit, offset]
    );

    const total = rows.length ? Number(rows[0].total_count) : 0;
    const items = rows.map(({ total_count: _totalCount, ...item }) => item);
    return res.json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        total_pages: total === 0 ? 0 : Math.ceil(total / limit),
        status: 'review_required',
      },
    });
  } catch (error) {
    return responseError(res, error, 'listGatewayReconciliationReviews failed');
  }
}

/**
 * POST /api/payments/gateway/reconciliation-reviews/:paymentId/action
 * Super-admin-only cursor disposition. This transaction is intentionally
 * incapable of mutating payments, member balances, plans or installments.
 */
export async function actOnGatewayReconciliationReview(req, res) {
  const pathPaymentId = String(req.params?.paymentId || '').trim();
  const bodyPaymentId = String(req.body?.payment_id || '').trim();
  const action = String(req.body?.action || '').trim().toLowerCase();
  const reason = normalizedReason(req.body?.reason);
  const actorId = String(req.user?.id || '').trim();

  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'إجراءات قائمة المصالحة متاحة للمشرف العام فقط',
      code: 'RECONCILIATION_REVIEW_ACTION_FORBIDDEN',
    });
  }
  if (!UUID_PATTERN.test(pathPaymentId) || !UUID_PATTERN.test(bodyPaymentId)) {
    return res.status(400).json({
      success: false,
      error: 'معرف الدفعة غير صالح',
      code: 'INVALID_RECONCILIATION_PAYMENT_ID',
    });
  }
  if (pathPaymentId.toLowerCase() !== bodyPaymentId.toLowerCase()) {
    return res.status(400).json({
      success: false,
      error: 'معرف الدفعة في الطلب لا يطابق السجل المحدد',
      code: 'RECONCILIATION_PAYMENT_ID_MISMATCH',
    });
  }
  if (!UUID_PATTERN.test(actorId)) {
    return res.status(403).json({
      success: false,
      error: 'هوية المشرف غير صالحة',
      code: 'INVALID_RECONCILIATION_REVIEWER_IDENTITY',
    });
  }
  if (!REVIEW_ACTIONS.has(action)) {
    return res.status(400).json({
      success: false,
      error: 'إجراء المراجعة غير صالح',
      code: 'INVALID_RECONCILIATION_REVIEW_ACTION',
    });
  }
  if (!isMeaningfulArabicReconciliationReason(reason)) {
    return res.status(400).json({
      success: false,
      error: 'سبب المراجعة يجب أن يكون عربياً وواضحاً ومن 12 إلى 500 حرف',
      code: 'INVALID_RECONCILIATION_REVIEW_REASON',
    });
  }

  const client = await getClient();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    const principal = await resolveActiveReconciliationPrincipal(
      client,
      actorId,
      ['super_admin']
    );
    if (!principal) {
      throw publicError(
        'الحساب غير نشط أو لم يعد مخولاً لإجراء مراجعة المصالحة',
        'RECONCILIATION_REVIEWER_NOT_PRIVILEGED',
        403
      );
    }
    const { rows: lockedRows } = await client.query(
      `SELECT state.payment_id,
              state.last_result,
              state.review_reason,
              state.check_count,
              state.consecutive_not_found,
              state.consecutive_failures,
              state.last_provider_http_status,
              state.last_provider_status,
              state.last_evidence_hash,
              state.last_checked_at
         FROM gateway_payment_reconciliation_state state
         JOIN payments p ON p.id = state.payment_id
        WHERE state.payment_id = $1
        FOR UPDATE OF state`,
      [pathPaymentId]
    );
    const locked = lockedRows[0];
    if (!locked) {
      throw publicError('سجل مصالحة الدفعة غير موجود', 'RECONCILIATION_REVIEW_NOT_FOUND', 404);
    }
    if (locked.last_result !== 'review_required' || !locked.review_reason) {
      throw publicError(
        'لم تعد هذه الدفعة بانتظار المراجعة؛ حدّث القائمة قبل المتابعة',
        'RECONCILIATION_REVIEW_ALREADY_DISPOSITIONED',
        409
      );
    }

    let stateResult;
    if (action === 'requeue') {
      const { rows } = await client.query(
        `UPDATE gateway_payment_reconciliation_state
            SET next_check_at = NOW(),
                claim_token = NULL,
                lease_expires_at = NULL,
                last_result = 'checked',
                review_reason = NULL,
                consecutive_failures = 0,
                consecutive_not_found = 0,
                first_not_found_at = NULL,
                last_provider_http_status = NULL,
                updated_at = NOW()
          WHERE payment_id = $1
          RETURNING payment_id, last_result, next_check_at, updated_at`,
        [pathPaymentId]
      );
      stateResult = rows[0];
    } else {
      const { rows } = await client.query(
        `UPDATE gateway_payment_reconciliation_state
            SET next_check_at = NULL,
                claim_token = NULL,
                lease_expires_at = NULL,
                last_result = 'terminal',
                review_reason = NULL,
                updated_at = NOW()
          WHERE payment_id = $1
          RETURNING payment_id, last_result, next_check_at, updated_at`,
        [pathPaymentId]
      );
      stateResult = rows[0];
    }

    const { rows: auditRows } = await client.query(
      `INSERT INTO gateway_reconciliation_review_actions (
         payment_id, action, reason, actor_id, actor_source, actor_role,
         previous_last_result, previous_review_reason,
         previous_check_count, previous_consecutive_not_found,
         previous_consecutive_failures, previous_provider_http_status,
         previous_provider_status, previous_evidence_hash,
         request_ip, user_agent
       ) VALUES (
         $1, $2, $3, $4, $5, 'super_admin',
         $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
       )
       RETURNING id, created_at`,
      [
        pathPaymentId,
        action,
        reason,
        actorId,
        principal.identity_source,
        locked.last_result,
        locked.review_reason,
        Number(locked.check_count || 0),
        Number(locked.consecutive_not_found || 0),
        Number(locked.consecutive_failures || 0),
        locked.last_provider_http_status,
        locked.last_provider_status,
        locked.last_evidence_hash,
        clientIp(req),
        String(req.headers?.['user-agent'] || '').slice(0, 1000) || null,
      ]
    );

    await client.query('COMMIT');
    transactionOpen = false;

    const globalAudit = await logAdminAction({
      adminId: actorId,
      action: action === 'requeue'
        ? 'gateway_reconciliation_review_requeued'
        : 'gateway_reconciliation_review_resolved',
      resourceType: 'gateway_payment_reconciliation',
      resourceId: pathPaymentId,
      changes: {
        action,
        reason,
        previous_review_reason: locked.review_reason,
        previous_check_count: Number(locked.check_count || 0),
      },
      ipAddress: clientIp(req),
      userAgent: req.headers?.['user-agent'] || null,
    });
    if (!globalAudit?.success) {
      log.warn('Global audit mirror failed for reconciliation review', {
        paymentId: pathPaymentId,
        action,
      });
    }

    return res.json({
      success: true,
      data: {
        payment_id: stateResult.payment_id,
        action,
        state: stateResult.last_result,
        next_check_at: stateResult.next_check_at,
        updated_at: stateResult.updated_at,
        review_action_id: auditRows[0].id,
        reviewed_at: auditRows[0].created_at,
      },
    });
  } catch (error) {
    if (transactionOpen) {
      try {await client.query('ROLLBACK');} catch (_rollbackError) { /* preserve original */ }
    }
    return responseError(res, error, 'actOnGatewayReconciliationReview failed');
  } finally {
    client.release();
  }
}

export default {
  listGatewayReconciliationReviews,
  actOnGatewayReconciliationReview,
};
