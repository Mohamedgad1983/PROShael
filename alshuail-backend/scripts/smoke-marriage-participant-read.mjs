import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [witnessId, requestId] = process.argv.slice(2);
if (!witnessId || !requestId) {
  throw new Error('Usage: smoke-marriage-participant-read.mjs <witness-id> <request-id>');
}

const backendRoot = process.env.MARRIAGE_BACKEND_ROOT || process.cwd();
const apiOrigin = process.env.MARRIAGE_API_ORIGIN || 'http://127.0.0.1:5001';
const requireFromBackend = createRequire(pathToFileURL(path.join(backendRoot, 'package.json')));
const jwt = requireFromBackend('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

const token = jwt.sign(
  { id: witnessId, role: 'member' },
  process.env.JWT_SECRET,
  { expiresIn: '5m' }
);
const headers = { Authorization: `Bearer ${token}` };

const listResponse = await fetch(`${apiOrigin}/api/marriage-support/me`, { headers });
const list = await listResponse.json();
const current = (list.data || []).find((item) => item.id === requestId);

const detailResponse = await fetch(`${apiOrigin}/api/marriage-support/me/${requestId}`, { headers });
const detail = await detailResponse.json();

const notificationResponse = await fetch(`${apiOrigin}/api/member/notifications`, { headers });
const notificationPayload = await notificationResponse.json();
const notificationBuckets = notificationPayload.data?.notifications || {};
const notifications = Object.values(notificationBuckets).flatMap((bucket) =>
  Array.isArray(bucket) ? bucket : []
);
const relatedNotification = notifications.find((item) => item.relatedId === requestId);

process.stdout.write(JSON.stringify({
  list_status: listResponse.status,
  list_count: (list.data || []).length,
  current: current && {
    status: current.status,
    participant_role: current.participant_role,
    next_signer_role: current.next_signer_role,
    can_current_user_sign: current.can_current_user_sign,
    signed_count: current.signature_summary?.signed_count,
  },
  detail_status: detailResponse.status,
  detail: detail.data && {
    participant_role: detail.data.participant_role,
    next_signer_role: detail.data.next_signer_role,
    can_current_user_sign: detail.data.can_current_user_sign,
    signature_count: (detail.data.signatures || []).length,
    repayment_plan: detail.data.repayment_plan ?? null,
  },
  notification_status: notificationResponse.status,
  related_notification: relatedNotification && {
    title: relatedNotification.title,
    is_read: relatedNotification.isRead,
    related_type: relatedNotification.relatedType,
  },
}));
