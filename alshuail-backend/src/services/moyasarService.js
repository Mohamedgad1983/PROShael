import { config } from '../config/env.js';

const MOYASAR_API_BASE = 'https://api.moyasar.com/v1';
const MOYASAR_REQUEST_TIMEOUT_MS = 15_000;
const GATEWAY_OPERATIONAL_READINESS_TTL_MS = 60_000;
const REQUIRED_RECONCILIATION_COLUMNS = Object.freeze([
  'consecutive_not_found',
  'first_not_found_at',
  'last_provider_http_status',
  'review_reason',
]);
const REQUIRED_RECONCILIATION_TRIGGERS = Object.freeze([
  Object.freeze({
    relation: 'gateway_payment_reconciliation_state',
    name: 'trg_enforce_gateway_reconciliation_operational_state',
  }),
  Object.freeze({
    relation: 'gateway_payment_reconciliation_state',
    name: 'trg_prevent_gateway_reconciliation_review_delete',
  }),
  Object.freeze({ relation: 'payments', name: 'trg_enforce_gateway_protocol_v2_state' }),
  Object.freeze({
    relation: 'payments',
    name: 'trg_enforce_gateway_capture_after_abandonment',
  }),
  Object.freeze({ relation: 'payments', name: 'trg_prevent_gateway_managed_payment_delete' }),
]);

let gatewayOperationalReadinessCache = null;
let gatewayOperationalReadinessRefresh = null;

const getMoyasarConfig = () => config.paymentGateway?.moyasar || {};

const integerOrNull = (value) => {
  if (value === null || value === undefined || value === '') {return null;}
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const stringOrNull = (value, transform = (text) => text) => {
  if (value === null || value === undefined) {return null;}
  const text = String(value).trim();
  return text ? transform(text) : null;
};

const lastFourDigitsOrNull = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? digits.slice(-4) : null;
};

const requestMoyasarJsonWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MOYASAR_REQUEST_TIMEOUT_MS);
  timeout.unref?.();
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      if (error?.name === 'AbortError') {throw error;}
    }
    return { response, payload };
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('Moyasar request timed out');
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Keep only payment evidence needed for identity, amount, reconciliation and
 * masked card diagnostics. Moyasar's source object can contain a reusable
 * `token`; raw responses may also contain redirect/authorization material and
 * arbitrary metadata. None of those values belong in local audit JSON.
 */
export const sanitizeMoyasarPaymentEvidence = (payment = {}) => {
  const evidence = {
    id: stringOrNull(payment.id),
    given_id: stringOrNull(payment.given_id),
    status: stringOrNull(payment.status, (value) => value.toLowerCase()),
    amount: integerOrNull(payment.amount),
    fee: integerOrNull(payment.fee),
    currency: stringOrNull(payment.currency, (value) => value.toUpperCase()),
    captured: integerOrNull(payment.captured),
    refunded: integerOrNull(payment.refunded),
  };

  for (const field of [
    'description',
    'created_at',
    'updated_at',
    'captured_at',
    'refunded_at',
    'voided_at',
    'reference_number',
    'message',
    'response_code',
  ]) {
    const safeValue = stringOrNull(payment[field]);
    if (safeValue !== null) {evidence[field] = safeValue;}
  }

  if (payment.source && typeof payment.source === 'object') {
    const safeSource = {};
    for (const field of [
      'type',
      'company',
      'gateway_id',
      'reference_number',
      'message',
      'response_code',
    ]) {
      const safeValue = stringOrNull(payment.source[field]);
      if (safeValue !== null) {safeSource[field] = safeValue;}
    }
    const number = lastFourDigitsOrNull(payment.source.number);
    const dpan = lastFourDigitsOrNull(payment.source.dpan);
    if (number !== null) {safeSource.number = number;}
    if (dpan !== null) {safeSource.dpan = dpan;}
    if (Object.keys(safeSource).length > 0) {evidence.source = safeSource;}
  }

  return evidence;
};

export const isMoyasarEnabledForIos = () => {
  const gateway = config.paymentGateway || {};
  const moyasar = getMoyasarConfig();

  return Boolean(
    gateway.enabled &&
    gateway.iosEnabled &&
    gateway.provider === 'moyasar' &&
    moyasar.publishableKey &&
    moyasar.secretKey
  );
};

export const getMoyasarPublicCheckoutConfig = () => {
  const gateway = config.paymentGateway || {};
  const moyasar = getMoyasarConfig();

  return {
    provider: 'moyasar',
    publishableKey: moyasar.publishableKey,
    currency: gateway.currency || 'SAR',
  };
};

/**
 * Fail-closed database capability probe for starting new gateway checkouts.
 * Provider verification, webhooks and refunds deliberately do not call this:
 * already-submitted money must remain resolvable while new checkout is off.
 */
export const getMoyasarGatewayOperationalReadiness = async ({
  forceRefresh = false,
  executeQuery = null,
  now = Date.now(),
} = {}) => {
  const nowMs = Number(now);
  const cacheAgeMs = gatewayOperationalReadinessCache
    ? nowMs - gatewayOperationalReadinessCache.checkedAtMs
    : null;
  if (
    !forceRefresh
    && gatewayOperationalReadinessCache
    && Number.isFinite(nowMs)
    && cacheAgeMs >= 0
    && cacheAgeMs < GATEWAY_OPERATIONAL_READINESS_TTL_MS
  ) {
    return gatewayOperationalReadinessCache.result;
  }
  if (gatewayOperationalReadinessRefresh) {
    return gatewayOperationalReadinessRefresh;
  }

  const refresh = (async () => {
    let result;
    try {
      const runQuery = executeQuery || (await import('./database.js')).query;
      const { rows } = await runQuery(
        `WITH required_triggers(relation_name, trigger_name) AS (
           SELECT * FROM UNNEST($3::text[], $4::text[])
         )
         SELECT
           to_regclass('public.gateway_payment_reconciliation_state') IS NOT NULL
             AS state_table_ready,
           (
             SELECT COUNT(*) = $1::int
               FROM pg_attribute a
              WHERE a.attrelid = to_regclass('public.gateway_payment_reconciliation_state')
                AND a.attname = ANY($2::text[])
                AND a.attnum > 0
                AND NOT a.attisdropped
           ) AS state_columns_ready,
           (
             SELECT COUNT(*) = $5::int
               FROM required_triggers required
               JOIN pg_namespace n ON n.nspname = 'public'
               JOIN pg_class c ON c.relnamespace = n.oid
                              AND c.relname = required.relation_name
               JOIN pg_trigger t ON t.tgrelid = c.oid
                                AND t.tgname = required.trigger_name
                                AND NOT t.tgisinternal
                                AND t.tgenabled <> 'D'
           ) AS required_triggers_ready`,
        [
          REQUIRED_RECONCILIATION_COLUMNS.length,
          REQUIRED_RECONCILIATION_COLUMNS,
          REQUIRED_RECONCILIATION_TRIGGERS.map((trigger) => trigger.relation),
          REQUIRED_RECONCILIATION_TRIGGERS.map((trigger) => trigger.name),
          REQUIRED_RECONCILIATION_TRIGGERS.length,
        ]
      );
      const probe = rows[0] || {};
      const ready = probe.state_table_ready === true
        && probe.state_columns_ready === true
        && probe.required_triggers_ready === true;
      result = {
        ready,
        code: ready ? null : 'PAYMENT_GATEWAY_RECONCILIATION_SCHEMA_NOT_READY',
        checked_at: new Date(Number.isFinite(nowMs) ? nowMs : Date.now()).toISOString(),
      };
    } catch {
      result = {
        ready: false,
        code: 'PAYMENT_GATEWAY_RECONCILIATION_SCHEMA_NOT_READY',
        checked_at: new Date(Number.isFinite(nowMs) ? nowMs : Date.now()).toISOString(),
      };
    }

    gatewayOperationalReadinessCache = {
      checkedAtMs: Number.isFinite(nowMs) ? nowMs : Date.now(),
      result,
    };
    return result;
  })();

  gatewayOperationalReadinessRefresh = refresh;
  try {
    return await refresh;
  } finally {
    if (gatewayOperationalReadinessRefresh === refresh) {
      gatewayOperationalReadinessRefresh = null;
    }
  }
};

export const resetMoyasarGatewayOperationalReadinessCache = () => {
  gatewayOperationalReadinessCache = null;
  gatewayOperationalReadinessRefresh = null;
};

export const fetchMoyasarPayment = async (paymentId) => {
  const { secretKey } = getMoyasarConfig();
  if (!secretKey) {
    throw new Error('MOYASAR_SECRET_KEY is not configured');
  }

  const credentials = Buffer.from(`${secretKey}:`, 'utf8').toString('base64');
  const { response, payload } = await requestMoyasarJsonWithTimeout(`${MOYASAR_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Moyasar request failed with ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

/**
 * Refund a captured Moyasar payment in full.
 *
 * This server-only operation intentionally has no amount argument. The refund
 * workflow validates the provider payment against the immutable local amount
 * before calling it, so a partial or operator-entered amount cannot drift from
 * the recorded refund obligation.
 */
export const refundMoyasarPayment = async (paymentId) => {
  const { secretKey } = getMoyasarConfig();
  if (!secretKey) {
    const error = new Error('MOYASAR_SECRET_KEY is not configured');
    error.statusCode = 503;
    throw error;
  }

  const credentials = Buffer.from(`${secretKey}:`, 'utf8').toString('base64');
  const { response, payload } = await requestMoyasarJsonWithTimeout(
    `${MOYASAR_API_BASE}/payments/${encodeURIComponent(paymentId)}/refund`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Moyasar refund failed with ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};
