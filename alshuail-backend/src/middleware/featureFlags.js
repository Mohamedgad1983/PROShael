/**
 * Feature Flags Middleware
 *
 * Provides middleware functions for feature flag checks.
 * Allows instant enable/disable of features without code deployment.
 *
 * @author Al-Shuail Family System
 * @version 1.0.0
 */

import { config } from '../config/env.js';

/**
 * Middleware to check if password authentication is enabled
 * Returns 503 Service Unavailable if disabled
 *
 * @returns {Function} Express middleware
 */
export const requirePasswordAuth = (req, res, next) => {
  if (!config.featureFlags.passwordAuthEnabled) {
    return res.status(503).json({
      success: false,
      message: 'تسجيل الدخول بكلمة المرور غير متاح حالياً. استخدم رمز التحقق OTP',
      errorCode: 'PASSWORD_AUTH_DISABLED',
      fallback: '/api/otp/send'
    });
  }
  next();
};

/**
 * Middleware to check if OTP authentication is enabled
 * Should always be enabled as fallback
 *
 * @returns {Function} Express middleware
 */
export const requireOtpAuth = (req, res, next) => {
  if (!config.featureFlags.otpAuthEnabled) {
    return res.status(503).json({
      success: false,
      message: 'خدمة رمز التحقق غير متاحة حالياً',
      errorCode: 'OTP_AUTH_DISABLED'
    });
  }
  next();
};

/**
 * Get current feature flag status
 * Useful for client apps to check available auth methods
 *
 * @returns {Object} Feature flag status
 */
export const getFeatureFlagStatus = () => ({
  passwordAuthEnabled: config.featureFlags.passwordAuthEnabled,
  otpAuthEnabled: config.featureFlags.otpAuthEnabled,
});

export default {
  requirePasswordAuth,
  requireOtpAuth,
  getFeatureFlagStatus
};
