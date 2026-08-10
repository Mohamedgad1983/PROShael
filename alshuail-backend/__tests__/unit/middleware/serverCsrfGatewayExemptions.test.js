import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';

const mockValidateCSRFToken = jest.fn((req, res) => res.status(419).json({
  success: false,
  code: 'TEST_CSRF_VALIDATION_REACHED',
  original_url: req.originalUrl,
  mounted_path: req.path,
}));

const mockGenerateCSRFToken = jest.fn((req, res, next) => next());

jest.unstable_mockModule('../../../src/middleware/csrf.js', () => ({
  csrfOptions: {},
  csrfProtection: jest.fn((req, res, next) => next()),
  generateCSRFToken: mockGenerateCSRFToken,
  validateCSRFToken: mockValidateCSRFToken,
}));

// Importing the full application loads reporting/import helpers that otherwise
// bridge ExcelJS' CommonJS bundle to uuid's ESM-only distribution. They are not
// part of this middleware test, so keep those heavy adapters inert here.
jest.unstable_mockModule('exceljs', () => ({
  default: class MockWorkbook {},
}));

jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000000'),
}));

const { app } = await import('../../../server.js');

describe('server CSRF bearer and gateway exemptions at the /api mount', () => {
  beforeEach(() => {
    mockValidateCSRFToken.mockClear();
  });

  test('uses originalUrl to exempt the bearer-auth financing gateway session POST', async () => {
    const response = await request(app)
      .post('/api/financing/plans/plan-123/gateway-session')
      .set('Authorization', 'Bearer syntactically-valid-test-token')
      .send({ scope: 'next_installment' });

    expect(response.status).not.toBe(419);
    expect(response.body.code).not.toBe('TEST_CSRF_VALIDATION_REACHED');
    expect(mockValidateCSRFToken).not.toHaveBeenCalled();
  });

  test.each([
    ['post', '/api/payments/gateway/session/payment-123/submission-started'],
    ['post', '/api/payments/gateway/session/payment-123/verify'],
    ['delete', '/api/payments/gateway/session/payment-123'],
    ['post', '/api/payments/gateway/moyasar/webhook'],
  ])('exempts canonical gateway route %s %s', async (method, path) => {
    const pendingRequest = request(app)[method](path);
    if (!path.endsWith('/webhook')) {
      pendingRequest.set('Authorization', 'Bearer syntactically-valid-test-token');
    }
    const response = await pendingRequest.send({});

    expect(response.status).not.toBe(419);
    expect(response.body.code).not.toBe('TEST_CSRF_VALIDATION_REACHED');
    expect(mockValidateCSRFToken).not.toHaveBeenCalled();
  });

  test.each([
    ['post', '/api/financing/plans/plan-123/gateway-session'],
    ['post', '/api/payments/gateway/session/payment-123/submission-started'],
    ['post', '/api/payments/gateway/session/payment-123/verify'],
    ['delete', '/api/payments/gateway/session/payment-123'],
  ])('requires a Bearer credential before exempting %s %s', async (method, path) => {
    const response = await request(app)[method](path).send({});

    expect(response.status).toBe(419);
    expect(response.body).toEqual(expect.objectContaining({
      code: 'TEST_CSRF_VALIDATION_REACHED',
      original_url: path,
    }));
    expect(mockValidateCSRFToken).toHaveBeenCalledTimes(1);
  });

  test('does not exempt an unrelated state-changing POST', async () => {
    const response = await request(app)
      .post('/api/members')
      .send({ full_name_ar: 'اختبار' });

    expect(response.status).toBe(419);
    expect(response.body).toEqual({
      success: false,
      code: 'TEST_CSRF_VALIDATION_REACHED',
      original_url: '/api/members',
      mounted_path: '/members',
    });
    expect(mockValidateCSRFToken).toHaveBeenCalledTimes(1);
    expect(mockValidateCSRFToken.mock.calls[0][0]).toEqual(expect.objectContaining({
      originalUrl: '/api/members',
      path: '/members',
    }));
  });

  test('exempts an explicit Bearer-authenticated admin mutation', async () => {
    const response = await request(app)
      .post('/api/members')
      .set('Authorization', 'Bearer syntactically-valid-test-token')
      .send({ full_name_ar: 'اختبار' });

    expect(response.status).not.toBe(419);
    expect(response.body.code).not.toBe('TEST_CSRF_VALIDATION_REACHED');
    expect(mockValidateCSRFToken).not.toHaveBeenCalled();
  });
});

describe('protected document static aliases', () => {
  test.each([
    '/uploads/member-documents/member/id-copy.pdf',
    '/api/uploads/member-documents/member/id-copy.pdf',
  ])('never serves member documents directly from %s', async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, error: 'Not found' });
  });
});
