import jwt from 'jsonwebtoken';
import { config } from '../src/config/env.js';
import { pool, query } from '../src/services/database.js';

const apiBase = process.env.SMOKE_API_BASE || 'http://127.0.0.1:5001/api';
const testTitle = `اختبار آلي بدون مبلغ ${Date.now()}`;
let initiativeId = null;

const request = async (path, options = {}) => {
  const response = await fetch(`${apiBase}${path}`, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
};

try {
  const { rows } = await query(
    `SELECT id, role
     FROM users
     WHERE role IN ('super_admin', 'admin')
     ORDER BY CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END
     LIMIT 1`
  );
  if (!rows[0]) {
    throw new Error('No admin user is available for the smoke test');
  }

  const admin = rows[0];
  const token = jwt.sign({ id: admin.id, role: admin.role }, config.jwt.secret, { expiresIn: '5m' });
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const created = await request('/initiatives-enhanced', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title_ar: testTitle, description_ar: 'ينبغي حذف هذه المبادرة تلقائياً', status: 'draft' })
  });
  if (created.response.status !== 201) {
    throw new Error(`Create failed (${created.response.status}): ${JSON.stringify(created.body)}`);
  }

  initiativeId = created.body?.initiative?.id;
  if (!initiativeId || created.body.initiative.target_amount !== null) {
    throw new Error('The server did not generate an ID with a null target amount');
  }

  const updated = await request(`/initiatives-enhanced/${initiativeId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ title_ar: testTitle, target_amount: '', description_ar: 'تم التحديث بدون مبلغ' })
  });
  if (!updated.response.ok || updated.body?.initiative?.target_amount !== null) {
    throw new Error(`Update failed (${updated.response.status}): ${JSON.stringify(updated.body)}`);
  }

  const listed = await request('/initiatives-enhanced/admin/all', { headers });
  if (!listed.response.ok || !listed.body?.initiatives?.some((item) => item.id === initiativeId)) {
    throw new Error(`List verification failed (${listed.response.status})`);
  }

  const invalidId = await request('/initiatives-enhanced/not-a-uuid/details', { headers });
  if (invalidId.response.status !== 400 || invalidId.body?.error !== 'معرّف المبادرة غير صالح') {
    throw new Error(`Invalid UUID handling failed (${invalidId.response.status})`);
  }

  console.log(JSON.stringify({
    success: true,
    createStatus: created.response.status,
    updateStatus: updated.response.status,
    listStatus: listed.response.status,
    invalidIdStatus: invalidId.response.status,
    generatedId: true,
    targetAmount: created.body.initiative.target_amount
  }));
} finally {
  try {
    if (initiativeId) {
      await query('DELETE FROM initiatives WHERE id = $1', [initiativeId]);
    }
    await query('DELETE FROM initiatives WHERE title_ar = $1', [testTitle]);
  } finally {
    await pool.end();
  }
}
