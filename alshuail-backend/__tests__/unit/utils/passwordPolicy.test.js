import { describe, expect, test } from '@jest/globals';
import {
  generateTemporaryPassword,
  LEGACY_DEFAULT_PASSWORD,
  validateStrongPassword
} from '../../../src/utils/passwordPolicy.js';

const strongTemporaryPasswordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{14}$/;

describe('Password Policy Utilities', () => {
  test('generateTemporaryPassword returns a policy-compliant password', () => {
    for (let i = 0; i < 50; i++) {
      const password = generateTemporaryPassword();

      expect(password).toMatch(strongTemporaryPasswordPattern);
      expect(validateStrongPassword(password)).toEqual({ valid: true });
    }
  });

  test('validateStrongPassword rejects the legacy default password', () => {
    expect(validateStrongPassword(LEGACY_DEFAULT_PASSWORD)).toEqual(
      expect.objectContaining({ valid: false })
    );
  });
});
