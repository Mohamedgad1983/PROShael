import { jest, describe, test, expect, beforeAll } from '@jest/globals';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

const mockLog = {
  error: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    csrf: { secret: 'test-csrf-secret-that-is-long-enough' },
    isProduction: false
  }
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: mockLog
}));

let generateCSRFToken;
let validateCSRFToken;

beforeAll(async () => {
  ({ generateCSRFToken, validateCSRFToken } = await import('../../../src/middleware/csrf.js'));
});

function createApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());

  app.get('/csrf-token', generateCSRFToken, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  app.post('/protected', validateCSRFToken, (req, res) => {
    res.json({ success: true });
  });

  return app;
}

describe('csrf-csrf v4 integration', () => {
  test('generates a token and matching double-submit cookie', async () => {
    const response = await request(createApp()).get('/csrf-token').expect(200);
    const cookie = response.headers['set-cookie']?.[0];

    expect(response.body.csrfToken).toMatch(/^[a-f0-9]+\.[a-f0-9]+$/);
    expect(cookie).toContain(`x-csrf-token=${response.body.csrfToken}`);
    expect(cookie).toContain('SameSite=Lax');
  });

  test('allows a protected request with matching cookie and header tokens', async () => {
    const agent = request.agent(createApp());
    const tokenResponse = await agent.get('/csrf-token').expect(200);

    await agent
      .post('/protected')
      .set('x-csrf-token', tokenResponse.body.csrfToken)
      .send({ value: 'safe' })
      .expect(200, { success: true });
  });

  test.each([
    ['missing', undefined],
    ['invalid', 'not-the-issued-token']
  ])('rejects a protected request with a %s token', async (_label, token) => {
    const agent = request.agent(createApp());
    await agent.get('/csrf-token').expect(200);

    const protectedRequest = agent.post('/protected').send({ value: 'unsafe' });
    if (token) {
      protectedRequest.set('x-csrf-token', token);
    }

    const response = await protectedRequest.expect(403);
    expect(response.body).toEqual({
      success: false,
      error: 'Invalid security token. Please refresh and try again.',
      code: 'CSRF_VALIDATION_FAILED'
    });
  });
});
