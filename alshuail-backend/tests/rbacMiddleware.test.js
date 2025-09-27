import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'service-service-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-secret';

const { supabase } = await import('../src/config/database.js');
const { requireRole } = await import('../src/middleware/rbacMiddleware.js');

const originalRpc = supabase.rpc;
const originalFrom = supabase.from;

const createResponseMock = () => {
  const res = {
    statusCode: 200,
    body: undefined
  };

  res.status = (code) => {
    res.statusCode = code;
    return res;
  };

  res.json = (payload) => {
    res.body = payload;
    return res;
  };

  return res;
};

beforeEach(() => {
  supabase.rpc = async () => ({ data: [], error: null });
  supabase.from = () => ({
    insert: async () => ({ data: null, error: null })
  });
});

after(() => {
  supabase.rpc = originalRpc;
  supabase.from = originalFrom;
});

test('requireRole returns 401 when Authorization header missing', async () => {
  const middleware = requireRole(['super_admin']);
  const req = { headers: {}, method: 'GET', path: '/api/test' };
  const res = createResponseMock();
  let nextCalled = false;

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
  assert.equal(res.body.success, false);
});

test('requireRole returns 403 when user role not allowed', async () => {
  supabase.rpc = async (fn) => {
    if (fn === 'get_user_role') {
      return {
        data: [{ role_name: 'financial_manager', role_name_ar: '??? ??????', permissions: {} }],
        error: null
      };
    }
    return { data: [], error: null };
  };

  const middleware = requireRole(['super_admin']);
  const token = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET);
  const req = {
    headers: { authorization: `Bearer ${token}` },
    method: 'GET',
    path: '/api/payments'
  };
  const res = createResponseMock();

  await middleware(req, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
});

test('requireRole allows request when role is permitted', async () => {
  supabase.rpc = async (fn) => {
    if (fn === 'get_user_role') {
      return {
        data: [{ role_name: 'super_admin', role_name_ar: '?????? ??????', permissions: { all_access: true } }],
        error: null
      };
    }
    return { data: [], error: null };
  };

  const middleware = requireRole(['super_admin']);
  const token = jwt.sign({ id: 'admin-1' }, process.env.JWT_SECRET);
  const req = {
    headers: { authorization: `Bearer ${token}` },
    method: 'POST',
    path: '/api/members'
  };
  const res = createResponseMock();
  let nextCalled = false;

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
  assert.ok(req.user);
  assert.equal(req.user.role, 'super_admin');
});

