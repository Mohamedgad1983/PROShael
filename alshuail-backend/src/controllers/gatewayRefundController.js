import { getClient, query } from '../services/database.js';
import {
  fetchMoyasarPayment,
  refundMoyasarPayment,
  sanitizeMoyasarPaymentEvidence,
} from '../services/moyasarService.js';
import { log } from '../utils/logger.js';

const REFUNDABLE_PROVIDER_STATUSES = new Set(['paid', 'captured']);
const RESOLVED_PROVIDER_STATUS = 'refunded';

function publicError(message, code, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function normalizedText(value) {
  return String(value ?? '').trim();
}

function clientIp(req) {
  const forwarded = normalizedText(req.headers?.['x-forwarded-for']);
  return (forwarded.split(',')[0] || req.ip || '').trim() || null;
}

function assertMatchingProviderEvidence(localPayment, providerPayment) {
  const expectedId = normalizedText(localPayment.gateway_payment_id);
  const providerId = normalizedText(providerPayment?.id);
  const providerGivenId = providerPayment?.given_id === undefined || providerPayment?.given_id === null
    ? null
    : normalizedText(providerPayment.given_id);
  const amountMinor = Math.round(Number(localPayment.amount) * 100);
  const hasStoredMinor = localPayment.gateway_amount_minor !== null
    && localPayment.gateway_amount_minor !== undefined;
  const storedMinor = hasStoredMinor ? Number(localPayment.gateway_amount_minor) : amountMinor;
  const expectedCurrency = normalizedText(localPayment.gateway_currency || 'SAR').toUpperCase();
  const providerCurrency = normalizedText(providerPayment?.currency).toUpperCase();

  if (
    !Number.isSafeInteger(amountMinor)
    || amountMinor <= 0
    || !Number.isSafeInteger(storedMinor)
    || storedMinor <= 0
    || storedMinor !== amountMinor
    || expectedCurrency !== 'SAR'
  ) {
    throw publicError(
      'بيانات مبلغ الاسترداد المحلية غير متطابقة وتتطلب مراجعة',
      'REFUND_LOCAL_EVIDENCE_INVALID',
      409
    );
  }
  const expectedMinor = storedMinor;

  if (
    !expectedId
    || providerId !== expectedId
    || (providerGivenId !== null && providerGivenId !== expectedId)
    || Number(providerPayment?.amount) !== expectedMinor
    || providerCurrency !== expectedCurrency
  ) {
    throw publicError(
      'بيانات عملية ميسر لا تطابق التزام الاسترداد المسجل',
      'REFUND_PROVIDER_EVIDENCE_MISMATCH',
      409
    );
  }

  return { expectedId, expectedMinor, expectedCurrency };
}

async function markRefundAttemptFailed(client, paymentId, message) {
  await client.query(
    `UPDATE gateway_refund_operations
        SET status = 'failed',
            last_error = $2,
            updated_at = NOW()
      WHERE payment_id = $1`,
    [paymentId, normalizedText(message).slice(0, 1000) || 'provider_refund_failed']
  );
}

/**
 * GET /api/payments/gateway/pending-refunds
 * Financial managers may review; only super_admin can execute a refund.
 */
export async function listPendingGatewayRefunds(_req, res) {
  try {
    const { rows } = await query(
      `SELECT p.id,
              p.payer_id,
              p.beneficiary_id,
              p.amount,
              p.category,
              p.financing_plan_id,
              p.reference_number,
              p.gateway_provider,
              p.gateway_payment_id,
              p.gateway_status,
              p.gateway_amount_minor,
              p.gateway_currency,
              p.gateway_failure_reason,
              p.gateway_verified_at,
              p.created_at,
              COALESCE(b.full_name, payer.full_name) AS member_name,
              COALESCE(b.phone, payer.phone) AS member_phone,
              p.gateway_response->'source'->>'type' AS source_type,
              p.gateway_response->'source'->>'company' AS source_company,
              RIGHT(
                REGEXP_REPLACE(
                  COALESCE(p.gateway_response->'source'->>'number', ''),
                  '[^0-9]', '', 'g'
                ),
                4
              ) AS masked_card,
              r.status AS refund_operation_status,
              r.attempt_count AS refund_attempt_count,
              r.last_error AS refund_last_error,
              r.requested_at AS refund_requested_at,
              r.completed_at AS refund_completed_at
         FROM payments p
         LEFT JOIN members payer ON payer.id = p.payer_id
         LEFT JOIN members b ON b.id = p.beneficiary_id
         LEFT JOIN gateway_refund_operations r ON r.payment_id = p.id
        WHERE p.status = 'pending_refund'
        ORDER BY p.gateway_verified_at ASC NULLS LAST, p.created_at ASC`,
      []
    );

    return res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    log.error('listPendingGatewayRefunds failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'تعذر تحميل عمليات الاسترداد المطلوبة',
      code: 'PENDING_REFUNDS_LOAD_FAILED',
    });
  }
}

/**
 * POST /api/payments/gateway/pending-refunds/:paymentId/refund
 *
 * Holds a row lock while checking/issuing the provider operation. If the
 * network response is lost after Moyasar accepts the refund, a second fetch is
 * authoritative and completes the local transition without issuing it again.
 */
export async function refundPendingGatewayPayment(req, res) {
  const paymentId = normalizedText(req.params.paymentId);
  const confirmationPaymentId = normalizedText(req.body?.confirmation_payment_id);
  const reason = normalizedText(req.body?.reason);

  if (!paymentId || confirmationPaymentId !== paymentId) {
    return res.status(400).json({
      success: false,
      error: 'اكتب رقم العملية كاملاً لتأكيد الاسترداد',
      code: 'REFUND_CONFIRMATION_MISMATCH',
    });
  }
  if (reason.length < 10 || reason.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'سبب الاسترداد يجب أن يكون واضحاً ومن 10 إلى 500 حرف',
      code: 'INVALID_REFUND_REASON',
    });
  }

  const client = await getClient();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;

    const { rows: paymentRows } = await client.query(
      `SELECT *
         FROM payments
        WHERE id = $1
          AND gateway_provider = 'moyasar'
        FOR UPDATE`,
      [paymentId]
    );
    const payment = paymentRows[0];
    if (!payment) {
      throw publicError('عملية الدفع غير موجودة', 'PAYMENT_NOT_FOUND', 404);
    }

    if (payment.status === 'refunded') {
      const { rows: operationRows } = await client.query(
        `SELECT id, status, completed_at
           FROM gateway_refund_operations
          WHERE payment_id = $1`,
        [paymentId]
      );
      await client.query('COMMIT');
      transactionOpen = false;
      return res.json({
        success: true,
        idempotent_replay: true,
        data: {
          payment_id: payment.id,
          status: payment.status,
          gateway_status: payment.gateway_status,
          refund_operation: operationRows[0] || null,
        },
      });
    }

    if (payment.status !== 'pending_refund') {
      throw publicError(
        'هذه العملية ليست ضمن قائمة الاسترداد المطلوبة',
        'PAYMENT_NOT_PENDING_REFUND',
        409
      );
    }
    if (!['paid', 'captured'].includes(normalizedText(payment.gateway_status).toLowerCase())) {
      throw publicError(
        'لا يوجد إثبات محلي بأن ميسر خصمت العملية',
        'REFUND_CAPTURE_EVIDENCE_MISSING',
        409
      );
    }

    const actorId = req.user?.id || req.user?.user_id || null;
    await client.query(
      `INSERT INTO gateway_refund_operations (
         payment_id, gateway_provider, gateway_payment_id,
         amount_minor, currency, status, reason, requested_by,
         request_ip, user_agent, attempt_count, requested_at, updated_at
       ) VALUES (
         $1, 'moyasar', $2, $3, $4, 'processing', $5, $6,
         $7, $8, 1, NOW(), NOW()
       )
       ON CONFLICT (payment_id) DO UPDATE
         SET status = 'processing',
             reason = EXCLUDED.reason,
             requested_by = EXCLUDED.requested_by,
             request_ip = EXCLUDED.request_ip,
             user_agent = EXCLUDED.user_agent,
             attempt_count = gateway_refund_operations.attempt_count + 1,
             last_error = NULL,
             requested_at = NOW(),
             updated_at = NOW()
       WHERE gateway_refund_operations.status <> 'succeeded'`,
      [
        payment.id,
        payment.gateway_payment_id,
        Number(payment.gateway_amount_minor ?? Math.round(Number(payment.amount) * 100)),
        normalizedText(payment.gateway_currency || 'SAR').toUpperCase(),
        reason,
        actorId,
        clientIp(req),
        normalizedText(req.headers?.['user-agent']).slice(0, 1000) || null,
      ]
    );

    let providerPayment;
    try {
      providerPayment = await fetchMoyasarPayment(payment.gateway_payment_id);
    } catch (fetchError) {
      await markRefundAttemptFailed(client, payment.id, fetchError.message);
      await client.query('COMMIT');
      transactionOpen = false;
      throw publicError(
        'تعذر التحقق من العملية لدى ميسر؛ لم يتم إرسال طلب استرداد',
        'MOYASAR_REFUND_PREFLIGHT_FAILED',
        fetchError.statusCode === 401 ? 503 : 502
      );
    }
    let expected;
    try {
      expected = assertMatchingProviderEvidence(payment, providerPayment);
    } catch (evidenceError) {
      await markRefundAttemptFailed(client, payment.id, evidenceError.code || evidenceError.message);
      await client.query('COMMIT');
      transactionOpen = false;
      throw evidenceError;
    }
    let providerStatus = normalizedText(providerPayment.status).toLowerCase();

    if (REFUNDABLE_PROVIDER_STATUSES.has(providerStatus)) {
      try {
        providerPayment = await refundMoyasarPayment(expected.expectedId);
      } catch (refundError) {
        // The POST may have succeeded even if its response was lost. Fetching
        // the resource before deciding failure prevents a second refund call.
        try {
          providerPayment = await fetchMoyasarPayment(expected.expectedId);
        } catch {
          await markRefundAttemptFailed(client, payment.id, refundError.message);
          await client.query('COMMIT');
          transactionOpen = false;
          throw publicError(
            'تعذر تأكيد الاسترداد من ميسر؛ لم تتغير حالة العملية محلياً',
            'MOYASAR_REFUND_NOT_CONFIRMED',
            refundError.statusCode === 401 ? 503 : 502
          );
        }
      }
      try {
        assertMatchingProviderEvidence(payment, providerPayment);
      } catch (evidenceError) {
        await markRefundAttemptFailed(client, payment.id, evidenceError.code || evidenceError.message);
        await client.query('COMMIT');
        transactionOpen = false;
        throw evidenceError;
      }
      providerStatus = normalizedText(providerPayment.status).toLowerCase();
    }

    const refundedMinor = Number(providerPayment.refunded ?? 0);
    const refundedAt = normalizedText(providerPayment.refunded_at);
    if (
      providerStatus !== RESOLVED_PROVIDER_STATUS
      || !Number.isFinite(refundedMinor)
      || refundedMinor !== expected.expectedMinor
      || !refundedAt
    ) {
      await markRefundAttemptFailed(
        client,
        payment.id,
        `provider_status=${providerStatus || 'unknown'}`
      );
      await client.query('COMMIT');
      transactionOpen = false;
      throw publicError(
        'ميسر لم تؤكد استرداد كامل المبلغ؛ لم تتغير حالة العملية محلياً',
        'MOYASAR_REFUND_INCOMPLETE',
        409
      );
    }

    const sanitizedProviderPayment = sanitizeMoyasarPaymentEvidence(providerPayment);
    const serializedProviderEvidence = JSON.stringify(sanitizedProviderPayment);

    const { rows: updatedPaymentRows } = await client.query(
      `UPDATE payments
          SET status = 'refunded',
              gateway_status = 'refunded',
              gateway_response = $2::jsonb,
              gateway_verified_at = NOW(),
              gateway_failure_reason = NULL,
              processed_at = COALESCE(processed_at, NOW()),
              updated_at = NOW()
        WHERE id = $1
        RETURNING id, status, gateway_status, gateway_verified_at, amount,
                  gateway_currency, gateway_payment_id`,
      [payment.id, serializedProviderEvidence]
    );

    const { rows: operationRows } = await client.query(
      `UPDATE gateway_refund_operations
          SET status = 'succeeded',
              provider_response = $2::jsonb,
              last_error = NULL,
              completed_at = NOW(),
              updated_at = NOW()
        WHERE payment_id = $1
        RETURNING id, status, attempt_count, completed_at`,
      [payment.id, serializedProviderEvidence]
    );

    await client.query('COMMIT');
    transactionOpen = false;
    return res.json({
      success: true,
      idempotent_replay: false,
      data: {
        ...updatedPaymentRows[0],
        refund_operation: operationRows[0],
      },
    });
  } catch (error) {
    if (transactionOpen) {
      await client.query('ROLLBACK').catch(() => {});
    }
    log.error('refundPendingGatewayPayment failed', {
      paymentId,
      code: error.code,
      error: error.message,
    });
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.statusCode
        ? error.message
        : 'تعذر تنفيذ الاسترداد الآمن؛ لم تتغير حالة العملية محلياً',
      code: error.code || 'GATEWAY_REFUND_FAILED',
    });
  } finally {
    client.release();
  }
}

export default {
  listPendingGatewayRefunds,
  refundPendingGatewayPayment,
};
