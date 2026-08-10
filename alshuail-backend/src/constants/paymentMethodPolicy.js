export const ELECTRONIC_PAYMENT_ALIASES = Object.freeze([
  'app_payment',
  'apple_pay',
  'card',
  'credit_card',
  'knet',
  'moyasar',
  'online',
]);

const ELECTRONIC_METHODS = new Set(ELECTRONIC_PAYMENT_ALIASES);
const MANUAL_METHODS = new Set(['bank_transfer', 'cash', 'check']);

export function normalizePaymentMethod(method, fallback = '') {
  const value = String(method ?? fallback).trim().toLowerCase();
  return value === 'transfer' ? 'bank_transfer' : value;
}

export function isElectronicPaymentMethod(method) {
  return ELECTRONIC_METHODS.has(normalizePaymentMethod(method));
}

export function isManualPaymentMethod(method) {
  return MANUAL_METHODS.has(normalizePaymentMethod(method));
}

export function assertManualPaymentMethod(method, {
  allowBankTransfer = true,
  fallback = 'cash',
} = {}) {
  const normalized = normalizePaymentMethod(method, fallback);
  if (isElectronicPaymentMethod(normalized)) {
    const error = new Error('الدفع الإلكتروني يجب أن يتم من خلال بوابة Moyasar المعتمدة');
    error.statusCode = 400;
    error.code = 'PAYMENT_GATEWAY_ROUTE_REQUIRED';
    throw error;
  }
  if (!isManualPaymentMethod(normalized) || (!allowBankTransfer && normalized === 'bank_transfer')) {
    const error = new Error(
      allowBankTransfer
        ? 'طريقة الدفع اليدوية غير صالحة'
        : 'التحويل البنكي يحتاج مسار رفع الإيصال والمراجعة'
    );
    error.statusCode = 400;
    error.code = normalized === 'bank_transfer'
      ? 'BANK_TRANSFER_RECEIPT_WORKFLOW_REQUIRED'
      : 'INVALID_MANUAL_PAYMENT_METHOD';
    throw error;
  }
  return normalized;
}

export default {
  ELECTRONIC_PAYMENT_ALIASES,
  assertManualPaymentMethod,
  isElectronicPaymentMethod,
  isManualPaymentMethod,
  normalizePaymentMethod,
};
