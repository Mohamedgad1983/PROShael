import { describe, test, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { createAdaptiveApiLimiter } from '../../../src/middleware/apiRateLimiters.js';

describe('adaptive API rate limiter', () => {
  test('uses independent counters for reads and writes and returns Arabic 429 data', async () => {
    const app = express();
    app.set('trust proxy', 1);
    app.use(createAdaptiveApiLimiter({ windowMs: 60_000, readMax: 1, writeMax: 1 }));
    app.get('/resource', (_req, res) => res.json({ ok: true }));
    app.post('/resource', (_req, res) => res.json({ ok: true }));

    await request(app).get('/resource').expect(200);

    const blockedRead = await request(app).get('/resource').expect(429);
    expect(blockedRead.body).toEqual(expect.objectContaining({
      success: false,
      code: 'RATE_LIMITED',
      error: expect.stringContaining('طلبات كثيرة'),
      retry_after_seconds: expect.any(Number)
    }));
    expect(blockedRead.headers['retry-after']).toBeDefined();

    // Exhausting the read bucket must not block the first valid write.
    await request(app).post('/resource').expect(200);
    await request(app).post('/resource').expect(429);
  });
});
