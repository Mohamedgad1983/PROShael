import crypto from 'crypto';
import { query } from '../services/database.js';
import {
  fetchMoyasarPayment,
  getMoyasarPublicCheckoutConfig,
  isMoyasarEnabledForIos,
} from '../services/moyasarService.js';
import { HijriDateManager } from '../utils/hijriDateUtils.js';
import { config } from '../config/env.js';
import { log } from '../utils/logger.js';

const toMinorUnit = (amount) => Math.round(Number(amount) * 100);

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
      return 'cancelled';
    default:
      return 'pending';
  }
};

const getFailureReason = (moyasarPayment) => (
  moyasarPayment?.source?.message ||
  moyasarPayment?.message ||
  moyasarPayment?.error ||
  null
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

const updatePaymentFromMoyasar = async ({ localPayment, moyasarPayment }) => {
  const expectedMinor = Number(localPayment.gateway_amount_minor);
  const expectedCurrency = localPayment.gateway_currency || config.paymentGateway.currency || 'SAR';

  if (Number(moyasarPayment.amount) !== expectedMinor) {
    const error = new Error('Gateway amount mismatch');
    error.statusCode = 409;
    throw error;
  }

  if ((moyasarPayment.currency || '').toUpperCase() !== expectedCurrency.toUpperCase()) {
    const error = new Error('Gateway currency mismatch');
    error.statusCode = 409;
    throw error;
  }

  const gatewayStatus = moyasarPayment.status;
  const mappedStatus = localStatusForMoyasarStatus(gatewayStatus);
  const nextStatus = localPayment.status === 'paid' && ['pending', 'failed'].includes(mappedStatus)
    ? localPayment.status
    : mappedStatus;

  const { rows } = await query(
    `UPDATE payments
        SET status = $1,
            payment_method = 'moyasar',
            gateway_status = $2,
            gateway_response = $3::jsonb,
            gateway_verified_at = NOW(),
            processed_at = CASE
              WHEN $1 = 'paid' THEN COALESCE(processed_at, NOW())
              ELSE processed_at
            END,
            updated_at = NOW()
      WHERE id = $4
      RETURNING *`,
    [
      nextStatus,
      gatewayStatus,
      JSON.stringify(moyasarPayment),
      localPayment.id,
    ]
  );

  return rows[0];
};

export const createGatewaySession = async (req, res) => {
  try {
    if (!isMoyasarEnabledForIos()) {
      return res.status(503).json({
        success: false,
        error: 'بوابة الدفع الإلكتروني غير مفعلة حالياً',
        code: 'PAYMENT_GATEWAY_DISABLED',
      });
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

    const amountMinor = toMinorUnit(amount);
    const { provider, publishableKey, currency } = getMoyasarPublicCheckoutConfig();
    const gatewayPaymentId = crypto.randomUUID();
    const currentDate = new Date();
    const hijriData = HijriDateManager.convertToHijri(currentDate);
    const subscriptionId = await findLatestSubscriptionId(beneficiaryId);
    const description = `Al-Shuail subscription payment ${generateReferenceNumber()}`;

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
      generateReferenceNumber(),
      `Moyasar subscription payment${planId ? ` plan=${planId}` : ''}. ${notes}`.trim(),
      hijriData.hijri_date_string,
      hijriData.hijri_year,
      hijriData.hijri_month,
      hijriData.hijri_day,
      hijriData.hijri_month_name,
      provider,
      gatewayPaymentId,
      'created',
      amountMinor,
      currency,
      JSON.stringify({ provider, gateway_payment_id: gatewayPaymentId }),
      currentDate.toISOString(),
      currentDate.toISOString(),
    ];

    if (subscriptionId) {
      cols.push('subscription_id');
      vals.push(subscriptionId);
    }

    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(
      `INSERT INTO payments (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      vals
    );

    const payment = rows[0];

    return res.status(201).json({
      success: true,
      data: {
        payment_id: payment.id,
        checkout_url: null,
        provider,
        gateway_session_id: gatewayPaymentId,
        status: payment.status,
        publishable_key: publishableKey,
        amount_minor: amountMinor,
        currency,
        description,
      },
      message: 'تم إنشاء جلسة الدفع الإلكتروني',
    });
  } catch (error) {
    log.error('createGatewaySession failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل في إنشاء جلسة الدفع الإلكتروني',
    });
  }
};

export const verifyGatewaySession = async (req, res) => {
  try {
    if (!isMoyasarEnabledForIos()) {
      return res.status(503).json({
        success: false,
        error: 'بوابة الدفع الإلكتروني غير مفعلة حالياً',
        code: 'PAYMENT_GATEWAY_DISABLED',
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
      localPayment.payer_id !== req.user.id &&
      localPayment.beneficiary_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك الصلاحية للوصول إلى هذه الدفعة',
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
    const updated = await updatePaymentFromMoyasar({ localPayment, moyasarPayment });

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
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'فشل في التحقق من الدفع الإلكتروني',
    });
  }
};

export const handleMoyasarWebhook = async (req, res) => {
  try {
    const configuredSecret = config.paymentGateway?.moyasar?.webhookSecret;
    if (configuredSecret && req.body?.secret_token !== configuredSecret) {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook secret',
      });
    }

    const moyasarPayment = req.body?.data;
    const gatewayPaymentId = moyasarPayment?.id;

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

    await updatePaymentFromMoyasar({ localPayment, moyasarPayment });

    return res.json({
      success: true,
    });
  } catch (error) {
    log.error('handleMoyasarWebhook failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
    });
  }
};
