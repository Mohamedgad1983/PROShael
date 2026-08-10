import { describe, expect, test } from '@jest/globals';
import { config } from '../../../src/config/env.js';

describe('payment gateway configuration', () => {
  test('defaults gateway rollout flags to disabled', () => {
    expect(config.paymentGateway.enabled).toBe(false);
    expect(config.paymentGateway.iosEnabled).toBe(false);
  });

  test('defaults Moyasar credentials to fail-closed nested values', () => {
    expect(config.paymentGateway.provider).toBe('moyasar');
    expect(config.paymentGateway.currency).toBe('SAR');
    expect(config.paymentGateway.moyasar.publishableKey).toBe('');
    expect(config.paymentGateway.moyasar.secretKey).toBe('');
    expect(config.paymentGateway.moyasar.webhookSecret).toBe('');
  });
});
