import { config } from '../config/env.js';

const MOYASAR_API_BASE = 'https://api.moyasar.com/v1';

const getMoyasarConfig = () => config.paymentGateway?.moyasar || {};

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

export const fetchMoyasarPayment = async (paymentId) => {
  const { secretKey } = getMoyasarConfig();
  if (!secretKey) {
    throw new Error('MOYASAR_SECRET_KEY is not configured');
  }

  const credentials = Buffer.from(`${secretKey}:`, 'utf8').toString('base64');
  const response = await fetch(`${MOYASAR_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || payload?.error || `Moyasar request failed with ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};
