import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [actorId, requestId] = process.argv.slice(2);
if (!actorId || !requestId) {
  throw new Error('Usage: remind-marriage-next-signer.mjs <actor-id> <request-id>');
}

const backendRoot = process.env.MARRIAGE_BACKEND_ROOT || process.cwd();
const apiOrigin = process.env.MARRIAGE_API_ORIGIN || 'http://127.0.0.1:5001';
const requireFromBackend = createRequire(pathToFileURL(path.join(backendRoot, 'package.json')));
const jwt = requireFromBackend('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

const token = jwt.sign(
  { id: actorId, role: 'super_admin' },
  process.env.JWT_SECRET,
  { expiresIn: '5m' }
);

const response = await fetch(
  `${apiOrigin}/api/admin/marriage-support/${requestId}/remind-next-signer`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
);
const payload = await response.json();
const delivery = payload.data?.notification_delivery || {};

process.stdout.write(JSON.stringify({
  status: response.status,
  success: payload.success === true,
  message: payload.message || payload.error || null,
  notified: payload.data?.notified ?? null,
  cooldown_active: payload.data?.cooldown_active ?? null,
  next_signer_role: payload.data?.next_signer_role ?? null,
  next_signer_name: payload.data?.next_signer_name ?? null,
  delivery: {
    success: delivery.success ?? null,
    delivered_via: delivery.deliveredVia || delivery.delivered_via || null,
    in_app_stored: delivery.inAppStored ?? delivery.in_app_stored ?? null,
  },
}));
