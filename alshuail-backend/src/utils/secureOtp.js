/**
 * Secure OTP Generator
 *
 * Uses cryptographically secure random number generation
 * instead of Math.random() which is predictable.
 *
 * @author Al-Shuail Family System
 * @version 1.0.0
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically secure OTP
 *
 * @param {number} length - Number of digits (default: 6)
 * @returns {string} OTP code
 */
export const generateSecureOTP = (length = 6) => {
  // Use crypto.randomBytes for cryptographic randomness
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0);

  // Generate number in range [100000, 999999] for 6-digit OTP
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const range = max - min + 1;

  const otp = (num % range) + min;
  return otp.toString();
};

/**
 * Generate a secure random token for Face ID / biometric auth
 *
 * @param {number} bytes - Number of random bytes (default: 32)
 * @returns {string} Hex-encoded token
 */
export const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

export default {
  generateSecureOTP,
  generateSecureToken
};
