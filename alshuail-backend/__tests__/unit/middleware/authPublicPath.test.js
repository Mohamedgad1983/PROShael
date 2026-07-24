/**
 * Regression tests for the authenticate() public-path allow-list.
 *
 * Guards the P0 fix: a crafted query string like `?x=dashboard/stats` must NOT
 * bypass authentication on an otherwise-protected route. Only the real public
 * read-only paths (/dashboard/stats, /member-monitoring) may pass without a token.
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockVerify = jest.fn();

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { verify: mockVerify, sign: jest.fn() },
  verify: mockVerify,
  sign: jest.fn()
}));

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: jest.fn(),
  getClient: jest.fn()
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    auth: jest.fn()
  }
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: { jwt: { secret: 'test-secret' } }
}));

const { authenticate } = await import('../../../src/middleware/auth.js');

const makeReq = (originalUrl) => ({
  headers: {},
  originalUrl,
  url: originalUrl,
  path: originalUrl.split('?')[0]
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('authenticate() public-path allow-list (P0 auth-bypass regression)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('EXPLOIT: ?x=dashboard/stats on a protected route is rejected (401)', async () => {
    const req = makeReq('/api/subscriptions/member/subscription?x=dashboard/stats');
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('EXPLOIT: ?x=member-monitoring on a protected route is rejected (401)', async () => {
    const req = makeReq('/api/members?x=member-monitoring');
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('protected route with no token is rejected (401)', async () => {
    const req = makeReq('/api/payments');
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('legit public /dashboard/stats passes without a token', async () => {
    const req = makeReq('/api/dashboard/stats');
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'public-access', role: 'viewer' });
  });

  test('legit public /member-monitoring passes without a token', async () => {
    const req = makeReq('/api/member-monitoring/summary');
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'public-access', role: 'viewer' });
  });

  test('near-miss segment (member-monitoring-x) does NOT pass', async () => {
    const req = makeReq('/api/member-monitoring-x/members');
    const res = makeRes();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
