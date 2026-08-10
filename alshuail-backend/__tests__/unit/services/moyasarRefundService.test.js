import { afterAll, beforeEach, describe, expect, jest, test } from '@jest/globals';

const originalFetch = global.fetch;
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockConfig = {
  paymentGateway: {
    moyasar: { secretKey: 'sk_test_refund' },
  },
};

jest.unstable_mockModule('../../../src/config/env.js', () => ({ config: mockConfig }));

const {
  refundMoyasarPayment,
  sanitizeMoyasarPaymentEvidence,
} = await import('../../../src/services/moyasarService.js');

beforeEach(() => {
  mockFetch.mockReset();
  mockConfig.paymentGateway.moyasar.secretKey = 'sk_test_refund';
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('Moyasar full refund client', () => {
  test('uses the secret-key server endpoint and never accepts an operator amount', async () => {
    const paymentId = '11111111-1111-4111-8111-111111111111';
    const response = {
      id: paymentId,
      status: 'refunded',
      amount: 5000,
      refunded: 5000,
      currency: 'SAR',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(response),
    });

    await expect(refundMoyasarPayment(paymentId)).resolves.toEqual(response);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe(`https://api.moyasar.com/v1/payments/${paymentId}/refund`);
    expect(options.method).toBe('POST');
    expect(options.body).toBeUndefined();
    expect(options.headers.Authorization).toMatch(/^Basic /);
  });

  test('returns a structured provider error without leaking authorization data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
    });

    await expect(refundMoyasarPayment('payment-id')).rejects.toMatchObject({
      message: 'Unauthorized',
      statusCode: 401,
    });
  });

  test('fails closed when the secret key is absent', async () => {
    mockConfig.paymentGateway.moyasar.secretKey = '';

    await expect(refundMoyasarPayment('payment-id')).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('aborts a provider request that exceeds the bounded timeout', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }));

    const request = refundMoyasarPayment('payment-id');
    const assertion = expect(request).rejects.toMatchObject({ statusCode: 504 });
    await jest.advanceTimersByTimeAsync(15_000);
    await assertion;
    jest.useRealTimers();
  });

  test('keeps the timeout active while reading a stalled provider body', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementationOnce((_url, options) => Promise.resolve({
      ok: true,
      json: () => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('aborted body');
          error.name = 'AbortError';
          reject(error);
        });
      }),
    }));

    const request = refundMoyasarPayment('payment-id');
    const assertion = expect(request).rejects.toMatchObject({ statusCode: 504 });
    await jest.advanceTimersByTimeAsync(15_000);
    await assertion;
    jest.useRealTimers();
  });
});

describe('Moyasar persisted evidence sanitizer', () => {
  test('retains only canonical financial/masked-card fields and removes provider secrets', () => {
    const sanitized = sanitizeMoyasarPaymentEvidence({
      id: 'payment-1',
      given_id: 'given-1',
      status: 'CAPTURED',
      amount: 10000,
      fee: 150,
      currency: 'sar',
      captured: 1000,
      refunded: 0,
      description: 'subscription payment',
      created_at: '2026-08-10T10:00:00Z',
      updated_at: '2026-08-10T10:01:00Z',
      captured_at: '2026-08-10T10:01:00Z',
      refunded_at: null,
      voided_at: null,
      reference_number: 'MOY-1',
      message: 'approved',
      response_code: '00',
      transaction_url: 'https://secret.example/redirect',
      authorization_code: 'AUTH-SECRET',
      metadata: { member: 'secret-metadata' },
      unexpected_secret: 'do-not-store',
      source: {
        type: 'applepay',
        company: 'visa',
        number: '4242',
        dpan: '1111',
        gateway_id: 'gateway-1',
        reference_number: 'source-ref-1',
        message: 'approved',
        response_code: '00',
        token: 'tok_live_must_not_persist',
        transaction_url: 'https://secret.example/source',
        authorization_code: 'SOURCE-AUTH-SECRET',
        metadata: { raw: 'secret' },
      },
    });

    expect(sanitized).toEqual({
      id: 'payment-1',
      given_id: 'given-1',
      status: 'captured',
      amount: 10000,
      fee: 150,
      currency: 'SAR',
      captured: 1000,
      refunded: 0,
      description: 'subscription payment',
      created_at: '2026-08-10T10:00:00Z',
      updated_at: '2026-08-10T10:01:00Z',
      captured_at: '2026-08-10T10:01:00Z',
      reference_number: 'MOY-1',
      message: 'approved',
      response_code: '00',
      source: {
        type: 'applepay',
        company: 'visa',
        number: '4242',
        dpan: '1111',
        gateway_id: 'gateway-1',
        reference_number: 'source-ref-1',
        message: 'approved',
        response_code: '00',
      },
    });
    const serialized = JSON.stringify(sanitized);
    expect(serialized).not.toContain('tok_live_must_not_persist');
    expect(serialized).not.toContain('AUTH-SECRET');
    expect(serialized).not.toContain('secret.example');
    expect(serialized).not.toContain('secret-metadata');
    expect(serialized).not.toContain('do-not-store');
  });

  test('never persists more than the final four card digits', () => {
    const sanitized = sanitizeMoyasarPaymentEvidence({
      source: {
        number: '4111111111114242',
        dpan: '5555555555551111',
      },
    });

    expect(sanitized.source).toEqual({ number: '4242', dpan: '1111' });
    expect(JSON.stringify(sanitized)).not.toContain('411111111111');
    expect(JSON.stringify(sanitized)).not.toContain('555555555555');
  });
});
