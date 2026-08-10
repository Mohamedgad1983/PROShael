import * as database from './database.js';
import { config } from '../config/env.js';
import { recordGatewayFinancialException } from './financingRepaymentService.js';
import { sanitizeMoyasarPaymentEvidence } from './moyasarService.js';

const getClient = (...args) => database.getClient(...args);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUSINESS_TIME_ZONE = config.financingRepayment?.businessTimeZone || 'Asia/Riyadh';
const EVIDENCE_SOURCES = new Set(['webhook', 'reconciliation', 'provider_api']);

const TERMINAL_EVIDENCE = Object.freeze({
  refunded: Object.freeze({
    reversalKind: 'refund',
    paymentStatus: 'refunded',
    failureReason: 'FINANCING_PROVIDER_FULL_REFUND',
  }),
  voided: Object.freeze({
    reversalKind: 'void',
    paymentStatus: 'cancelled',
    failureReason: 'FINANCING_PROVIDER_FULL_VOID',
  }),
});

function reversalError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function moneyCents(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : Number.NaN;
}

function canonicalProvider(value) {
  return String(value || '').trim().toLowerCase();
}

function canonicalCurrency(value) {
  return String(value || '').trim().toUpperCase();
}

function canonicalIdentity(value) {
  return String(value || '').trim();
}

function normalizeProviderEvidence({
  gatewayPaymentId,
  gatewayResponse,
}) {
  if (!gatewayResponse || typeof gatewayResponse !== 'object' || Array.isArray(gatewayResponse)) {
    throw reversalError(
      'نتيجة مزود الدفع الموثقة مطلوبة لعكس دفعة التمويل',
      'FINANCING_REVERSAL_EVIDENCE_REQUIRED'
    );
  }

  const providerResponse = sanitizeMoyasarPaymentEvidence(gatewayResponse);
  const gatewayId = canonicalIdentity(gatewayPaymentId);
  const responseId = canonicalIdentity(providerResponse.id);
  const responseGivenId = providerResponse.given_id === null
    || providerResponse.given_id === undefined
    ? null
    : canonicalIdentity(providerResponse.given_id);
  const providerStatus = canonicalProvider(providerResponse.status);
  const terminal = TERMINAL_EVIDENCE[providerStatus];
  const amountMinor = Number(providerResponse.amount);
  const currency = canonicalCurrency(providerResponse.currency);

  if (!gatewayId || responseId !== gatewayId || (responseGivenId !== null && responseGivenId !== gatewayId)) {
    throw reversalError(
      'هوية نتيجة مزود الدفع لا تطابق الدفعة',
      'FINANCING_REVERSAL_IDENTITY_MISMATCH'
    );
  }
  if (!terminal) {
    throw reversalError(
      'عكس دفعة التمويل يتطلب حالة مزود نهائية refunded أو voided',
      'FINANCING_REVERSAL_NOT_TERMINAL'
    );
  }
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || !currency) {
    throw reversalError(
      'مبلغ أو عملة نتيجة مزود الدفع غير صالحة',
      'FINANCING_REVERSAL_EVIDENCE_INVALID'
    );
  }
  const refundedMinor = providerResponse.refunded;
  const financialException = providerStatus === 'refunded'
    && (!Number.isSafeInteger(refundedMinor) || refundedMinor !== amountMinor)
    ? {
        code: 'FINANCING_PARTIAL_REFUND_REQUIRES_REVIEW',
        kind: 'partial_refund',
        reason: 'PARTIAL_OR_INVALID_PROVIDER_REFUND_REQUIRES_REVIEW',
        message: 'لا يمكن استعادة الخطة إلا بعد إثبات استرداد كامل المبلغ من مزود الدفع',
        providerStatus,
        expectedMinor: amountMinor,
        observedMinor: Number.isSafeInteger(refundedMinor) ? refundedMinor : null,
      }
    : null;
  if (
    providerStatus === 'refunded'
    && !financialException
    && !canonicalIdentity(providerResponse.refunded_at)
  ) {
    throw reversalError(
      'نتيجة مزود الدفع لا تتضمن وقت استرداد موثقاً',
      'FINANCING_REFUND_EVIDENCE_INVALID'
    );
  }
  if (
    providerStatus === 'voided'
    && (
      !Number.isSafeInteger(providerResponse.captured)
      || providerResponse.captured !== amountMinor
      || !canonicalIdentity(providerResponse.voided_at)
    )
  ) {
    throw reversalError(
      'نتيجة الإلغاء لا تثبت عكس المبلغ المحصل بالكامل',
      'FINANCING_VOID_EVIDENCE_INVALID'
    );
  }

  return {
    gatewayId,
    providerStatus,
    amountMinor,
    currency,
    providerResponse,
    financialException,
    ...terminal,
  };
}

function assertEvidenceMatchesPayment({ payment, provider, evidence }) {
  const expectedAmountMinor = Number(payment.gateway_amount_minor ?? moneyCents(payment.amount));
  const expectedCurrency = canonicalCurrency(payment.gateway_currency);
  if (
    canonicalProvider(payment.gateway_provider) !== provider
    || canonicalIdentity(payment.gateway_payment_id) !== evidence.gatewayId
    || evidence.amountMinor !== expectedAmountMinor
    || evidence.amountMinor !== moneyCents(payment.amount)
    || evidence.currency !== expectedCurrency
  ) {
    throw reversalError(
      'دليل العكس لا يطابق هوية ومبلغ وعملة الدفعة المسددة بالكامل',
      'FINANCING_REVERSAL_PAYMENT_MISMATCH'
    );
  }
}

function isSameStoredReversal({ reversal, payment, provider, evidence }) {
  return reversal
    && String(reversal.payment_id) === String(payment.id)
    && String(reversal.plan_id) === String(payment.financing_plan_id)
    && String(reversal.member_id) === String(payment.payer_id)
    && reversal.target_payment_status === evidence.paymentStatus
    && reversal.reversal_kind === evidence.reversalKind
    && canonicalProvider(reversal.gateway_provider) === provider
    && canonicalIdentity(reversal.gateway_payment_id) === evidence.gatewayId
    && canonicalProvider(reversal.provider_status) === evidence.providerStatus
    && Number(reversal.amount_minor) === evidence.amountMinor
    && canonicalCurrency(reversal.currency) === evidence.currency;
}

/**
 * Atomically reverse one fully settled financing gateway payment.
 *
 * Lock order is deliberately plan -> payment -> installments -> reminders.
 * Original allocation rows are never changed. The caller must pass the exact
 * authoritative provider payment object with status `refunded` or `voided`.
 */
export async function reverseSettledFinancingPayment({
  paymentId,
  gatewayPaymentId,
  gatewayProvider = 'moyasar',
  gatewayResponse,
  evidenceSource = 'reconciliation',
  reversedById = null,
}) {
  const localPaymentId = canonicalIdentity(paymentId);
  const provider = canonicalProvider(gatewayProvider);
  const source = canonicalProvider(evidenceSource);

  if (!UUID_PATTERN.test(localPaymentId)) {
    throw reversalError('معرف دفعة التمويل غير صالح', 'INVALID_FINANCING_PAYMENT_ID');
  }
  if (!provider) {
    throw reversalError('اسم مزود الدفع مطلوب', 'INVALID_GATEWAY_PROVIDER');
  }
  if (!EVIDENCE_SOURCES.has(source)) {
    throw reversalError('مصدر دليل العكس غير صالح', 'INVALID_REVERSAL_EVIDENCE_SOURCE');
  }
  const evidence = normalizeProviderEvidence({ gatewayPaymentId, gatewayResponse });
  const client = await getClient();
  let transactionFinished = false;

  try {
    await client.query('BEGIN');

    // Pointer read is intentionally non-locking. Every mutation lock begins at
    // the plan so checkout, settlement, reminder, and reversal cannot deadlock.
    const { rows: pointerRows } = await client.query(
      `SELECT financing_plan_id
         FROM payments
        WHERE id = $1
          AND financing_plan_id IS NOT NULL`,
      [localPaymentId]
    );
    if (!pointerRows.length) {
      throw reversalError('دفعة التمويل غير موجودة', 'FINANCING_PAYMENT_NOT_FOUND');
    }
    const planId = pointerRows[0].financing_plan_id;

    const { rows: planRows } = await client.query(
      `SELECT *
         FROM financing_repayment_plans
        WHERE id = $1
        FOR UPDATE`,
      [planId]
    );
    if (!planRows.length) {
      throw reversalError('خطة سداد التمويل غير موجودة', 'FINANCING_PLAN_NOT_FOUND');
    }
    const plan = planRows[0];

    const { rows: paymentRows } = await client.query(
      `SELECT *
         FROM payments
        WHERE id = $1
          AND financing_plan_id = $2
        FOR UPDATE`,
      [localPaymentId, planId]
    );
    if (!paymentRows.length) {
      throw reversalError('دفعة التمويل غير موجودة', 'FINANCING_PAYMENT_NOT_FOUND');
    }
    const payment = paymentRows[0];
    assertEvidenceMatchesPayment({ payment, provider, evidence });

    if (evidence.financialException) {
      const recorded = await recordGatewayFinancialException({
        localPayment: payment,
        providerPayment: evidence.providerResponse,
        exception: evidence.financialException,
        executeQuery: client.query.bind(client),
      });
      await client.query('COMMIT');
      transactionFinished = true;
      const error = reversalError(
        evidence.financialException.message,
        evidence.financialException.code
      );
      error.statusCode = 409;
      error.reviewRequired = true;
      error.reviewRecorded = Boolean(recorded.exceptionRecord);
      error.financialExceptionId = recorded.exceptionRecord?.id || null;
      throw error;
    }

    const { rows: existingReversalRows } = await client.query(
      `SELECT *
         FROM financing_payment_reversals
        WHERE payment_id = $1`,
      [localPaymentId]
    );
    const existingReversal = existingReversalRows[0] || null;
    if (existingReversal) {
      if (
        !isSameStoredReversal({ reversal: existingReversal, payment, provider, evidence })
        || payment.status !== existingReversal.target_payment_status
      ) {
        throw reversalError(
          'يوجد عكس مختلف لهذه الدفعة ويتطلب مراجعة مالية',
          'FINANCING_REVERSAL_CONFLICT'
        );
      }
      await client.query('COMMIT');
      return {
        payment,
        plan,
        reversal: existingReversal,
        reopened_installment_ids: [],
        idempotent_replay: true,
      };
    }

    if (payment.status !== 'paid') {
      throw reversalError(
        'يمكن عكس دفعة تمويل مسددة فقط',
        'FINANCING_PAYMENT_NOT_REVERSIBLE'
      );
    }
    if (String(plan.member_id) !== String(payment.payer_id)) {
      throw reversalError(
        'مالك الدفعة لا يطابق مالك خطة التمويل',
        'FINANCING_PAYMENT_PLAN_MEMBER_MISMATCH'
      );
    }

    const { rows: allocations } = await client.query(
      `SELECT a.id AS original_allocation_id,
              a.payment_id,
              a.plan_id,
              a.installment_id,
              a.amount AS allocation_amount,
              i.installment_number,
              i.due_date,
              i.amount AS installment_amount,
              i.paid_amount,
              i.status AS installment_status,
              i.paid_at
         FROM financing_payment_allocations a
         JOIN financing_installments i ON i.id = a.installment_id
        WHERE a.payment_id = $1
          AND a.plan_id = $2
        ORDER BY i.installment_number ASC, i.id ASC
        FOR UPDATE OF i`,
      [localPaymentId, planId]
    );
    if (!allocations.length) {
      throw reversalError(
        'الدفعة المسددة لا تحتوي على تخصيصات أقساط أصلية',
        'FINANCING_REVERSAL_ALLOCATIONS_MISSING'
      );
    }
    const allocatedCents = allocations.reduce(
      (total, allocation) => total + moneyCents(allocation.allocation_amount),
      0
    );
    if (allocatedCents !== evidence.amountMinor) {
      throw reversalError(
        'تخصيصات الدفعة الأصلية لا تساوي مبلغ العكس الكامل',
        'FINANCING_REVERSAL_ALLOCATION_MISMATCH'
      );
    }

    const installmentIds = allocations.map((allocation) => allocation.installment_id);
    await client.query(
      `SELECT id
         FROM financing_reminder_log
        WHERE installment_id = ANY($1::uuid[])
        ORDER BY installment_id ASC, reminder_type ASC
        FOR UPDATE`,
      [installmentIds]
    );

    const verifiedAt = new Date();
    const idempotencyKey = `financing-payment:${localPaymentId}:provider-reversal`;
    const { rows: reversalRows } = await client.query(
      `INSERT INTO financing_payment_reversals (
         payment_id, plan_id, member_id,
         reversal_kind, target_payment_status,
         gateway_provider, gateway_payment_id, provider_status,
         amount_minor, currency, provider_response, provider_verified_at,
         evidence_source, reversed_by_id, idempotency_key
       ) VALUES (
         $1, $2, $3,
         $4, $5,
         $6, $7, $8,
         $9, $10, $11::jsonb, $12,
         $13, $14, $15
       )
       RETURNING *`,
      [
        localPaymentId,
        planId,
        payment.payer_id,
        evidence.reversalKind,
        evidence.paymentStatus,
        provider,
        evidence.gatewayId,
        evidence.providerStatus,
        evidence.amountMinor,
        evidence.currency,
        JSON.stringify(evidence.providerResponse),
        verifiedAt.toISOString(),
        source,
        reversedById || null,
        idempotencyKey,
      ]
    );
    const reversal = reversalRows[0];

    const { rowCount: reversalAllocationCount } = await client.query(
      `INSERT INTO financing_payment_reversal_allocations (
         reversal_id, original_allocation_id,
         payment_id, plan_id, installment_id, amount
       )
       SELECT $1, a.id, a.payment_id, a.plan_id, a.installment_id, a.amount
         FROM financing_payment_allocations a
         JOIN financing_installments i ON i.id = a.installment_id
        WHERE a.payment_id = $2
          AND a.plan_id = $3
        ORDER BY i.installment_number ASC, i.id ASC`,
      [reversal.id, localPaymentId, planId]
    );
    if (Number(reversalAllocationCount) !== allocations.length) {
      throw reversalError(
        'تعذر إنشاء تخصيص عكس مطابق لكل تخصيص أصلي',
        'FINANCING_REVERSAL_ALLOCATION_MISMATCH'
      );
    }

    const reopenedInstallments = [];
    for (const allocation of allocations) {
      const paidCents = moneyCents(allocation.paid_amount);
      const allocationCents = moneyCents(allocation.allocation_amount);
      const installmentCents = moneyCents(allocation.installment_amount);
      if (
        !Number.isSafeInteger(paidCents)
        || allocationCents <= 0
        || paidCents < allocationCents
      ) {
        throw reversalError(
          'رصيد القسط لا يحتمل تخصيص العكس المسجل',
          'FINANCING_REVERSAL_INSTALLMENT_CONFLICT'
        );
      }
      const restoredPaidCents = paidCents - allocationCents;
      const restoredPaidAmount = restoredPaidCents / 100;
      const { rows: updatedInstallmentRows } = await client.query(
        `UPDATE financing_installments
            SET paid_amount = $1,
                status = CASE
                  WHEN $2::bigint = ROUND(amount * 100)::bigint THEN 'paid'
                  WHEN due_date < (NOW() AT TIME ZONE $3)::date THEN 'overdue'
                  WHEN due_date = (NOW() AT TIME ZONE $3)::date THEN 'due'
                  WHEN $2::bigint > 0 THEN 'partially_paid'
                  ELSE 'scheduled'
                END,
                paid_at = CASE
                  WHEN $2::bigint = ROUND(amount * 100)::bigint THEN paid_at
                  ELSE NULL
                END,
                updated_at = NOW()
          WHERE id = $4
          RETURNING id, installment_number, due_date, amount, paid_amount, status, paid_at`,
        [restoredPaidAmount, restoredPaidCents, BUSINESS_TIME_ZONE, allocation.installment_id]
      );
      const updatedInstallment = updatedInstallmentRows[0];
      if (!updatedInstallment || restoredPaidCents < installmentCents) {
        reopenedInstallments.push(updatedInstallment);
      }
    }

    for (const installment of reopenedInstallments) {
      if (!installment) {
        throw reversalError(
          'تعذر استعادة أحد الأقساط بعد العكس',
          'FINANCING_REVERSAL_INSTALLMENT_CONFLICT'
        );
      }
      // Preserve the complete prior delivery state before reusing the durable
      // reminder row for its next generation. History itself is append-only.
      await client.query(
        `INSERT INTO financing_reminder_generation_history (
           reminder_id, installment_id, reminder_type, generation,
           reversal_id, reminder_snapshot
         )
         SELECT l.id, l.installment_id, l.reminder_type, l.generation,
                $2, to_jsonb(l)
           FROM financing_reminder_log l
          WHERE l.installment_id = $1
         ON CONFLICT (reminder_id, generation) DO NOTHING`,
        [installment.id, reversal.id]
      );
      await client.query(
        `INSERT INTO financing_reminder_log (
           installment_id, reminder_type, scheduled_for,
           delivery_status, attempt_count, next_attempt_at,
           sent_at, updated_at, generation, reopened_by_reversal_id
         )
         SELECT $1, milestone.reminder_type, $2::date + milestone.offset_days,
                'pending', 0, NOW(),
                NULL, NOW(), 2, $3
           FROM (
             VALUES
               ('due_7_days'::varchar, -7),
               ('due_3_days'::varchar, -3),
               ('due_tomorrow'::varchar, -1),
               ('due_today'::varchar, 0),
               ('overdue_1_day'::varchar, 1),
               ('overdue_7_days'::varchar, 7)
           ) AS milestone(reminder_type, offset_days)
         ON CONFLICT (installment_id, reminder_type) DO UPDATE
           SET scheduled_for = EXCLUDED.scheduled_for,
               delivery_status = 'pending',
               channel = NULL,
               attempt_count = 0,
               last_error = NULL,
               sent_at = NULL,
               next_attempt_at = NOW(),
               claim_token = NULL,
               claimed_at = NULL,
               lease_expires_at = NULL,
               delivered_at = NULL,
               notification_id = NULL,
               cancelled_at = NULL,
               cancellation_reason = NULL,
               collapse_key = NULL,
               external_status = 'pending',
               external_attempt_count = 0,
               external_delivered_at = NULL,
               external_last_error = NULL,
               generation = financing_reminder_log.generation + 1,
               reopened_by_reversal_id = EXCLUDED.reopened_by_reversal_id,
               updated_at = NOW()`,
        [installment.id, installment.due_date, reversal.id]
      );
    }

    const currentOutstandingCents = moneyCents(plan.outstanding_amount);
    const totalCents = moneyCents(plan.total_amount);
    const restoredOutstandingCents = currentOutstandingCents + evidence.amountMinor;
    if (restoredOutstandingCents > totalCents) {
      throw reversalError(
        'عكس الدفعة سيتجاوز إجمالي رصيد الخطة',
        'FINANCING_REVERSAL_PLAN_BALANCE_CONFLICT'
      );
    }
    const { rows: planCheckRows } = await client.query(
      `SELECT COALESCE(SUM(ROUND(paid_amount * 100)::bigint), 0)::bigint AS paid_minor,
              BOOL_OR(
                paid_amount < amount
                AND due_date < (NOW() AT TIME ZONE $2)::date
              ) AS has_overdue
         FROM financing_installments
        WHERE plan_id = $1`,
      [planId, BUSINESS_TIME_ZONE]
    );
    const planCheck = planCheckRows[0];
    if (Number(planCheck?.paid_minor) !== totalCents - restoredOutstandingCents) {
      throw reversalError(
        'الرصيد المستعاد لا يطابق مجموع الأقساط بعد العكس',
        'FINANCING_REVERSAL_PLAN_BALANCE_CONFLICT'
      );
    }
    const restoredPlanStatus = planCheck?.has_overdue === true ? 'overdue' : 'active';
    const { rows: updatedPlanRows } = await client.query(
      `UPDATE financing_repayment_plans
          SET outstanding_amount = $1,
              status = $2,
              paid_at = NULL,
              updated_at = NOW()
        WHERE id = $3
        RETURNING *`,
      [restoredOutstandingCents / 100, restoredPlanStatus, planId]
    );
    const updatedPlan = updatedPlanRows[0];

    await client.query(
      `INSERT INTO financing_balance_transactions (
         plan_id, payment_id, member_id, transaction_type, amount,
         balance_before, balance_after, idempotency_key
       ) VALUES (
         $1, $2, $3, 'installment_reversal_debit', $4,
         $5, $6, $7
       )`,
      [
        planId,
        localPaymentId,
        payment.payer_id,
        evidence.amountMinor / 100,
        currentOutstandingCents / 100,
        restoredOutstandingCents / 100,
        `financing-payment:${localPaymentId}:reversal-ledger`,
      ]
    );

    const { rows: updatedPaymentRows } = await client.query(
      `UPDATE payments
          SET status = $1,
              gateway_status = $2,
              gateway_failure_reason = $3,
              gateway_response = $4::jsonb,
              gateway_verified_at = $5,
              updated_at = NOW()
        WHERE id = $6
        RETURNING *`,
      [
        evidence.paymentStatus,
        evidence.providerStatus,
        evidence.failureReason,
        JSON.stringify(evidence.providerResponse),
        verifiedAt.toISOString(),
        localPaymentId,
      ]
    );
    const updatedPayment = updatedPaymentRows[0];
    if (!updatedPayment) {
      throw reversalError(
        'تعذر تثبيت الحالة النهائية لعكس الدفعة',
        'FINANCING_REVERSAL_PAYMENT_UPDATE_FAILED'
      );
    }

    await client.query('COMMIT');
    transactionFinished = true;
    return {
      payment: updatedPayment,
      plan: updatedPlan,
      reversal,
      reopened_installment_ids: reopenedInstallments.map((installment) => String(installment.id)),
      idempotent_replay: false,
    };
  } catch (error) {
    if (!transactionFinished) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original financial error.
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

export default {
  reverseSettledFinancingPayment,
};
