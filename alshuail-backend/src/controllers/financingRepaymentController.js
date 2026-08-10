import { log } from '../utils/logger.js';
import {
  getMoyasarGatewayOperationalReadiness,
  getMoyasarPublicCheckoutConfig,
} from '../services/moyasarService.js';
import {
  cleanupExpiredGatewaySessions,
  GATEWAY_PROTOCOL_VERSION,
} from './paymentGatewayController.js';
import {
  createFinancingPaymentIntent,
  getRepaymentPlanById,
  isFinancingOnlinePaymentEnabled,
  processFinancingReminders,
  reconcilePendingFinancingPayments,
} from '../services/financingRepaymentService.js';

function handleError(res, error) {
  const badRequestCodes = new Set([
    'PLAN_ALREADY_PAID',
    'INSTALLMENT_NOT_FOUND',
    'INSTALLMENT_NOT_NEXT',
    'INVALID_INSTALLMENT_COUNT',
    'INVALID_FIRST_DUE_DATE',
    'FIRST_DUE_DATE_IN_PAST',
    'INVALID_RECONCILIATION_AGE',
    'INVALID_RECONCILIATION_LIMIT',
  ]);
  const serviceUnavailableCodes = new Set([
    'FINANCING_GATEWAY_DISABLED',
    'FINANCING_REMINDERS_DISABLED',
    'FINANCING_REPAYMENT_DISABLED',
    'GATEWAY_NOT_CONFIGURED',
    'GATEWAY_CLIENT_UNAVAILABLE',
    'PAYMENT_GATEWAY_RECONCILIATION_SCHEMA_NOT_READY',
  ]);
  const conflictCodes = new Set([
    'PAYMENT_INTENT_IN_PROGRESS',
    'PLAN_NOT_PAYABLE',
    'PAYMENT_ALREADY_SETTLED',
    'GATEWAY_PAYMENT_REUSED',
  ]);
  if (serviceUnavailableCodes.has(error?.code)) {
    return res.status(503).json({ success: false, code: error.code, error: error.message });
  }
  if (error?.code === 'PLAN_NOT_FOUND') {
    return res.status(404).json({ success: false, code: error.code, error: error.message });
  }
  if (badRequestCodes.has(error?.code)) {
    return res.status(400).json({ success: false, code: error.code, error: error.message });
  }
  if (conflictCodes.has(error?.code)) {
    return res.status(409).json({ success: false, code: error.code, error: error.message });
  }
  log.error('[financing] controller error', { error: error?.message, stack: error?.stack });
  return res.status(500).json({ success: false, error: 'تعذر تنفيذ عملية التمويل' });
}

export const getMyPlan = async (req, res) => {
  try {
    const plan = await getRepaymentPlanById({
      planId: req.params.planId,
      memberId: req.user.id,
    });
    if (!plan) {
      return res.status(404).json({ success: false, error: 'خطة الأقساط غير موجودة' });
    }
    return res.json({ success: true, data: plan });
  } catch (error) {
    return handleError(res, error);
  }
};

export const createGatewaySession = async (req, res) => {
  try {
    if (!isFinancingOnlinePaymentEnabled()) {
      return res.status(503).json({
        success: false,
        code: 'FINANCING_GATEWAY_DISABLED',
        error: 'سداد أقساط التمويل عبر البوابة غير مفعل حالياً'
      });
    }
    if (Number(req.body?.protocol_version) !== GATEWAY_PROTOCOL_VERSION) {
      return res.status(426).json({
        success: false,
        code: 'PAYMENT_PROTOCOL_UPGRADE_REQUIRED',
        error: 'يلزم تحديث التطبيق قبل استخدام بوابة دفع الأقساط',
        required_protocol_version: GATEWAY_PROTOCOL_VERSION,
      });
    }
    const operationalReadiness = await getMoyasarGatewayOperationalReadiness();
    if (!operationalReadiness?.ready) {
      return res.status(503).json({
        success: false,
        code: 'PAYMENT_GATEWAY_RECONCILIATION_SCHEMA_NOT_READY',
        error: 'قاعدة بيانات المصالحة المالية غير جاهزة لبدء دفعة أقساط جديدة',
      });
    }
    await cleanupExpiredGatewaySessions();
    const gateway = getMoyasarPublicCheckoutConfig();
    const { payment, reused } = await createFinancingPaymentIntent({
      planId: req.params.planId,
      memberId: req.user.id,
      payAll: req.body?.pay_all === true,
      installmentId: req.body?.installment_id || null,
      protocolVersion: req.body?.protocol_version,
    });
    const amount = Number(payment.amount);
    return res.status(reused ? 200 : 201).json({
      success: true,
      data: {
        payment_id: payment.id,
        checkout_url: null,
        provider: gateway.provider,
        gateway_session_id: payment.gateway_payment_id,
        status: payment.status,
        publishable_key: gateway.publishableKey,
        amount_minor: Number(payment.gateway_amount_minor || Math.round(amount * 100)),
        currency: payment.gateway_currency || gateway.currency,
        reused,
        protocol_version: GATEWAY_PROTOCOL_VERSION,
        description: payment.financing_payment_scope === 'all'
          ? 'Al-Shuail financing early settlement'
          : 'Al-Shuail financing installment',
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const runReminders = async (_req, res) => {
  try {
    const result = await processFinancingReminders();
    return res.json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

export const reconcilePendingGatewayPayments = async (req, res) => {
  try {
    const result = await reconcilePendingFinancingPayments({
      minAgeMinutes: req.body?.min_age_minutes ?? 5,
      limit: req.body?.limit ?? 25,
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

export default {
  getMyPlan,
  createGatewaySession,
  runReminders,
  reconcilePendingGatewayPayments,
};
