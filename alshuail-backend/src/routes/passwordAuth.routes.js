/**
 * =====================================================
 * AL-SHUAIL FAMILY FUND - PASSWORD AUTHENTICATION ROUTES
 * =====================================================
 * API Routes for Password, OTP, Face ID authentication
 * Date: December 20, 2024
 * =====================================================
 */

import express from 'express';
import {
    loginWithPassword,
    checkPasswordStatus,
    requestOTP,
    verifyOTP,
    createPassword,
    resetPassword,
    loginWithFaceId,
    enableFaceId,
    disableFaceId,
    adminDeletePassword,
    adminDeleteFaceId,
    getMemberSecurityInfo
} from '../controllers/passwordAuth.controller.js';
import { authenticateToken, authorize } from '../middleware/authMiddleware.js';
import { requirePasswordAuth } from '../middleware/featureFlags.js';

const router = express.Router();

// =====================================================
// PUBLIC ROUTES (No authentication required)
// =====================================================

/**
 * @route   POST /api/auth/password/login
 * @desc    Login with phone + password
 * @access  Public (requires PASSWORD_AUTH_ENABLED feature flag)
 * @body    { phone, password }
 */
router.post('/login', requirePasswordAuth, loginWithPassword);

/**
 * @route   POST /api/auth/password/check-password
 * @desc    Check if member has password set up
 * @access  Public
 * @body    { phone }
 */
router.post('/check-password', checkPasswordStatus);

/**
 * @route   POST /api/auth/password/request-otp
 * @desc    Request OTP for login or password reset
 * @access  Public
 * @body    { phone, purpose: 'login' | 'password_reset' | 'first_login' }
 */
router.post('/request-otp', requestOTP);

/**
 * @route   POST /api/auth/password/verify-otp
 * @desc    Verify OTP and login
 * @access  Public
 * @body    { phone, otp }
 */
router.post('/verify-otp', verifyOTP);

/**
 * @route   POST /api/auth/password/reset-password
 * @desc    Reset password after OTP verification
 * @access  Public (requires PASSWORD_AUTH_ENABLED feature flag)
 * @body    { phone, otp, newPassword, confirmPassword }
 */
router.post('/reset-password', requirePasswordAuth, resetPassword);

/**
 * @route   POST /api/auth/password/face-id-login
 * @desc    Login with Face ID / Biometric
 * @access  Public
 * @body    { memberId, faceIdToken }
 */
router.post('/face-id-login', loginWithFaceId);

// =====================================================
// PROTECTED ROUTES (Authentication required)
// =====================================================

/**
 * @route   POST /api/auth/password/create-password
 * @desc    Create password (first time or after admin reset)
 * @access  Private (requires token and PASSWORD_AUTH_ENABLED feature flag)
 * @body    { password, confirmPassword }
 */
router.post('/create-password', requirePasswordAuth, authenticateToken, createPassword);

/**
 * @route   POST /api/auth/password/enable-face-id
 * @desc    Enable Face ID for the logged-in member
 * @access  Private (requires token)
 * @body    { faceIdToken }
 */
router.post('/enable-face-id', authenticateToken, enableFaceId);

/**
 * @route   POST /api/auth/password/disable-face-id
 * @desc    Disable Face ID for the logged-in member
 * @access  Private (requires token)
 */
router.post('/disable-face-id', authenticateToken, disableFaceId);

// =====================================================
// ADMIN ROUTES (Super Admin only)
// =====================================================

/**
 * @route   GET /api/auth/password/admin/member/:memberId/security
 * @desc    Get member's security info (password status, Face ID status, logs)
 * @access  Super Admin only
 */
router.get(
    '/admin/member/:memberId/security',
    authenticateToken,
    authorize(['super_admin']),
    getMemberSecurityInfo
);

/**
 * @route   DELETE /api/auth/password/admin/member/:memberId/password
 * @desc    Delete member's password (force password reset)
 * @access  Super Admin only
 */
router.delete(
    '/admin/member/:memberId/password',
    authenticateToken,
    authorize(['super_admin']),
    adminDeletePassword
);

/**
 * @route   DELETE /api/auth/password/admin/member/:memberId/face-id
 * @desc    Delete member's Face ID
 * @access  Super Admin only
 */
router.delete(
    '/admin/member/:memberId/face-id',
    authenticateToken,
    authorize(['super_admin']),
    adminDeleteFaceId
);

export default router;
