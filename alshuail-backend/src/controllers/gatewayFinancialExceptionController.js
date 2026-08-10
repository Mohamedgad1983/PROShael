import { getClient, query } from '../services/database.js';
import { logAdminAction } from '../utils/audit-logger.js';
import { log } from '../utils/logger.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REVIEW_STATUSES = new Set(['open', 'resolved', 'dismissed']);
const FINAL_REVIEW_STATUSES = new Set(['resolved', 'dismissed']);

const EXCEPTION_PROJECTION = `
  SELECT e.id,
         e.payment_id,
         p.reference_number,
         COALESCE(p.beneficiary_id, p.payer_id) AS member_id,
         m.full_name AS member_name,
         m.phone AS member_phone,
         e.gateway_provider,
         e.gateway_payment_id,
         e.provider_status,
         e.exception_kind,
         e.expected_minor,
         e.actual_minor,
         e.currency,
         jsonb_strip_nulls(jsonb_build_object(
           'id', e.provider_response->>'id',
           'given_id', e.provider_response->>'given_id',
           'status', e.provider_response->>'status',
           'amount', e.provider_response->'amount',
           'currency', e.provider_response->>'currency',
           'captured', e.provider_response->'captured',
           'refunded', e.provider_response->'refunded',
           'captured_at', e.provider_response->>'captured_at',
           'refunded_at', e.provider_response->>'refunded_at',
           'voided_at', e.provider_response->>'voided_at',
           'updated_at', e.provider_response->>'updated_at',
           'source', CASE
             WHEN jsonb_typeof(e.provider_response->'source') = 'object' THEN
               jsonb_strip_nulls(jsonb_build_object(
                 'type', e.provider_response->'source'->>'type',
                 'company', e.provider_response->'source'->>'company',
                 'number', NULLIF(RIGHT(e.provider_response->'source'->>'number', 4), ''),
                 'dpan', NULLIF(RIGHT(e.provider_response->'source'->>'dpan', 4), ''),
                 'reference_number', e.provider_response->'source'->>'reference_number',
                 'message', e.provider_response->'source'->>'message',
                 'response_code', e.provider_response->'source'->>'response_code'
               ))
             ELSE NULL
           END
         )) AS evidence,
         e.occurrence_count,
         e.first_seen_at,
         e.last_seen_at,
         e.review_status,
         COALESCE(NULLIF(BTRIM(u.full_name_ar), ''), NULLIF(BTRIM(u.full_name_en), ''), u.phone) AS reviewed_by_name,
         e.reviewed_at,
         e.review_notes
    FROM gateway_financial_exceptions e
    JOIN payments p ON p.id = e.payment_id
    LEFT JOIN members m ON m.id = COALESCE(p.beneficiary_id, p.payer_id)
    LEFT JOIN users u ON u.id = e.reviewed_by`;

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

function responseError(res, error, fallback) {
  log.error(fallback, { error: error.message, code: error.code || null });
  return res.status(error.statusCode || 500).json({
    success: false,
    error: error.statusCode ? error.message : 'تعذر إتمام مراجعة الاستثناء المالي',
    ...(error.code ? { code: error.code } : {}),
  });
}

async function loadExceptionById(executeQuery, exceptionId) {
  const { rows } = await executeQuery(
    `${EXCEPTION_PROJECTION}
      WHERE e.id = $1
      LIMIT 1`,
    [exceptionId]
  );
  return rows[0] || null;
}

/**
 * GET /api/payments/gateway/financial-exceptions
 * Read-only queue for super administrators and financial managers.
 */
export async function listGatewayFinancialExceptions(req, res) {
  try {
    const requestedStatus = String(req.query?.review_status || 'open').trim().toLowerCase();
    if (requestedStatus !== 'all' && !REVIEW_STATUSES.has(requestedStatus)) {
      throw publicError('حالة المراجعة غير صالحة', 'INVALID_REVIEW_STATUS', 400);
    }
    const limit = parseBoundedInteger(req.query?.limit, 50, 1, 100);
    const offset = parseBoundedInteger(req.query?.offset, 0, 0, 100000);
    if (limit === null || offset === null) {
      throw publicError('قيم التصفح غير صالحة', 'INVALID_PAGINATION', 400);
    }

    const params = [];
    let whereClause = '';
    if (requestedStatus !== 'all') {
      params.push(requestedStatus);
      whereClause = `WHERE e.review_status = $${params.length}`;
    }
    params.push(limit, offset);
    const limitParameter = `$${params.length - 1}`;
    const offsetParameter = `$${params.length}`;

    const { rows } = await query(
      `SELECT projected.*,
              COUNT(*) OVER() AS total_count
         FROM (
           ${EXCEPTION_PROJECTION}
           ${whereClause}
         ) projected
        ORDER BY projected.last_seen_at DESC, projected.id DESC
        LIMIT ${limitParameter}
       OFFSET ${offsetParameter}`,
      params
    );

    const total = rows.length ? Number(rows[0].total_count) : 0;
    const items = rows.map(({ total_count: _totalCount, ...item }) => item);
    return res.json({ success: true, data: { items, total } });
  } catch (error) {
    return responseError(res, error, 'listGatewayFinancialExceptions failed');
  }
}

/**
 * POST /api/payments/gateway/financial-exceptions/:id/review
 * Records review only; it never mutates a payment, member balance, or plan.
 */
export async function reviewGatewayFinancialException(req, res) {
  const exceptionId = String(req.params?.id || '').trim();
  const reviewStatus = String(req.body?.review_status || '').trim().toLowerCase();
  const reviewNotes = String(req.body?.review_notes || '').trim();
  const reviewerId = String(req.user?.id || '').trim();

  if (!UUID_PATTERN.test(exceptionId)) {
    return res.status(400).json({
      success: false,
      error: 'معرف الاستثناء المالي غير صالح',
      code: 'INVALID_FINANCIAL_EXCEPTION_ID',
    });
  }
  if (!FINAL_REVIEW_STATUSES.has(reviewStatus)) {
    return res.status(400).json({
      success: false,
      error: 'نتيجة المراجعة يجب أن تكون معالجة أو مستبعدة',
      code: 'INVALID_REVIEW_STATUS',
    });
  }
  if (reviewNotes.length < 10 || reviewNotes.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'ملاحظات المراجعة مطلوبة من 10 إلى 500 حرف',
      code: 'INVALID_REVIEW_NOTES',
    });
  }
  if (!UUID_PATTERN.test(reviewerId)) {
    return res.status(403).json({
      success: false,
      error: 'هوية المراجع غير صالحة',
      code: 'INVALID_REVIEWER_IDENTITY',
    });
  }

  const client = await getClient();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    const { rows: lockedRows } = await client.query(
      `SELECT id, review_status, review_notes
         FROM gateway_financial_exceptions
        WHERE id = $1
        FOR UPDATE`,
      [exceptionId]
    );
    const locked = lockedRows[0];
    if (!locked) {
      throw publicError('الاستثناء المالي غير موجود', 'FINANCIAL_EXCEPTION_NOT_FOUND', 404);
    }

    let idempotentReplay = false;
    if (locked.review_status !== 'open') {
      if (locked.review_status === reviewStatus && String(locked.review_notes || '') === reviewNotes) {
        idempotentReplay = true;
      } else {
        throw publicError(
          'تمت مراجعة هذا الاستثناء مسبقاً ولا يمكن إعادة فتحه أو تغيير نتيجته',
          'FINANCIAL_EXCEPTION_ALREADY_REVIEWED',
          409
        );
      }
    } else {
      await client.query(
        `UPDATE gateway_financial_exceptions
            SET review_status = $1,
                reviewed_by = $2,
                reviewed_at = NOW(),
                review_notes = $3
          WHERE id = $4`,
        [reviewStatus, reviewerId, reviewNotes, exceptionId]
      );
    }

    const item = await loadExceptionById(client.query.bind(client), exceptionId);
    await client.query('COMMIT');
    transactionOpen = false;

    if (!idempotentReplay) {
      await logAdminAction({
        adminId: reviewerId,
        action: 'gateway_financial_exception_reviewed',
        resourceType: 'gateway_financial_exception',
        resourceId: exceptionId,
        changes: { review_status: reviewStatus, review_notes: reviewNotes },
        ipAddress: req.ip || req.headers?.['x-forwarded-for'] || null,
        userAgent: req.headers?.['user-agent'] || null,
      });
    }

    return res.json({ success: true, idempotent_replay: idempotentReplay, data: { item } });
  } catch (error) {
    if (transactionOpen) {
      try {await client.query('ROLLBACK');} catch (_rollbackError) { /* preserve original */ }
    }
    return responseError(res, error, 'reviewGatewayFinancialException failed');
  } finally {
    client.release();
  }
}

export default {
  listGatewayFinancialExceptions,
  reviewGatewayFinancialException,
};
