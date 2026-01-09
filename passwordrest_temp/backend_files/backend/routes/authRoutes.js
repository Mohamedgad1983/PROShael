/**
 * =====================================================
 * AL-SHUAIL FAMILY FUND - AUTHENTICATION ROUTES
 * =====================================================
 * API Routes for Password, OTP, Face ID authentication
 * Date: December 20, 2024
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireSuperAdmin } = require('../middleware/authMiddleware');

// =====================================================
// PUBLIC ROUTES (No authentication required)
// =====================================================

/**
 * @route   POST /api/auth/login
 * @desc    Login with phone + password
 * @access  Public
 * @body    { phone, password }
 */
router.post('/login', authController.loginWithPassword);

/**
 * @route   POST /api/auth/request-otp
 * @desc    Request OTP for login or password reset
 * @access  Public
 * @body    { phone, purpose: 'login' | 'password_reset' | 'first_login' }
 */
router.post('/request-otp', authController.requestOTP);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and login
 * @access  Public
 * @body    { phone, otp }
 */
router.post('/verify-otp', authController.verifyOTP);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password after OTP verification
 * @access  Public
 * @body    { phone, otp, newPassword, confirmPassword }
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @route   POST /api/auth/face-id-login
 * @desc    Login with Face ID / Biometric
 * @access  Public
 * @body    { memberId, faceIdToken }
 */
router.post('/face-id-login', authController.loginWithFaceId);

// =====================================================
// PROTECTED ROUTES (Authentication required)
// =====================================================

/**
 * @route   POST /api/auth/create-password
 * @desc    Create password (first time or after admin reset)
 * @access  Private (requires token)
 * @body    { password, confirmPassword }
 */
router.post('/create-password', authenticateToken, authController.createPassword);

/**
 * @route   POST /api/auth/enable-face-id
 * @desc    Enable Face ID for the logged-in member
 * @access  Private (requires token)
 * @body    { faceIdToken }
 */
router.post('/enable-face-id', authenticateToken, authController.enableFaceId);

/**
 * @route   POST /api/auth/disable-face-id
 * @desc    Disable Face ID for the logged-in member
 * @access  Private (requires token)
 */
router.post('/disable-face-id', authenticateToken, authController.disableFaceId);

// =====================================================
// ADMIN ROUTES (Super Admin only)
// =====================================================

/**
 * @route   GET /api/auth/admin/member/:memberId/security
 * @desc    Get member's security info (password status, Face ID status, logs)
 * @access  Super Admin only
 */
router.get(
    '/admin/member/:memberId/security',
    authenticateToken,
    requireSuperAdmin,
    authController.getMemberSecurityInfo
);

/**
 * @route   DELETE /api/auth/admin/member/:memberId/password
 * @desc    Delete member's password (force password reset)
 * @access  Super Admin only
 */
router.delete(
    '/admin/member/:memberId/password',
    authenticateToken,
    requireSuperAdmin,
    authController.adminDeletePassword
);

/**
 * @route   DELETE /api/auth/admin/member/:memberId/face-id
 * @desc    Delete member's Face ID
 * @access  Super Admin only
 */
router.delete(
    '/admin/member/:memberId/face-id',
    authenticateToken,
    requireSuperAdmin,
    authController.adminDeleteFaceId
);

module.exports = router;
