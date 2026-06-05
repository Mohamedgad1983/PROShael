/**
 * Device Token Routes
 *
 * REST API endpoints for managing device tokens for push notifications
 *
 * Routes:
 * POST   /api/device-tokens          - Register new device token
 * GET    /api/device-tokens/:memberId - Get all devices for a member
 * PUT    /api/device-tokens/:tokenId - Update device information
 * DELETE /api/device-tokens/:tokenId - Delete/unregister device
 * PUT    /api/device-tokens/:tokenId/refresh - Refresh FCM token
 */

import express from 'express';
import {
  registerDeviceToken,
  getMemberDevices,
  updateDeviceToken,
  deleteDeviceToken,
  refreshDeviceToken
} from '../controllers/deviceTokenController.js';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../services/database.js';

const router = express.Router();
const ADMIN_ROLES = new Set(['super_admin', 'admin', 'financial_manager', 'operational_manager']);

const getUserId = (req) => req.user?.id || req.user?.member_id || req.user?.user_id;
const isAdmin = (req) => ADMIN_ROLES.has(req.user?.role);

const normalizeRegistrationBody = (req, res, next) => {
  req.body.member_id = req.body.member_id || req.body.memberId;
  req.body.token = req.body.token || req.body.device_token;
  if (req.body.platform === 'pwa') {
    req.body.platform = 'web';
  }
  next();
};

const requireSelfOrAdminFromBody = (req, res, next) => {
  if (isAdmin(req)) {
    return next();
  }

  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (req.body.member_id && req.body.member_id !== userId) {
    return res.status(403).json({ success: false, error: 'Cannot manage another member device token' });
  }

  req.body.member_id = userId;
  next();
};

const requireSelfOrAdminFromParam = (req, res, next) => {
  if (isAdmin(req)) {
    return next();
  }

  if (req.params.memberId !== getUserId(req)) {
    return res.status(403).json({ success: false, error: 'Cannot view another member devices' });
  }

  next();
};

const requireTokenOwnerOrAdmin = async (req, res, next) => {
  if (isAdmin(req)) {
    return next();
  }

  const { rows } = await query(
    'SELECT member_id FROM device_tokens WHERE id = $1',
    [req.params.tokenId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Device token not found' });
  }

  if (rows[0].member_id !== getUserId(req)) {
    return res.status(403).json({ success: false, error: 'Cannot manage another member device token' });
  }

  next();
};

/**
 * @route   POST /api/device-tokens
 * @desc    Register a new device token for push notifications
 * @access  Protected (requires authentication)
 * @body    {
 *   member_id: string (UUID),
 *   token: string (FCM registration token),
 *   platform: 'ios' | 'android' | 'web',
 *   device_name?: string,
 *   app_version?: string,
 *   os_version?: string
 * }
 */
router.post('/', authenticateToken, normalizeRegistrationBody, requireSelfOrAdminFromBody, registerDeviceToken);

// Backward-compatible alias used by the mobile PWA service.
router.post('/register', authenticateToken, normalizeRegistrationBody, requireSelfOrAdminFromBody, registerDeviceToken);

/**
 * @route   GET /api/device-tokens/:memberId
 * @desc    Get all device tokens for a member
 * @access  Protected (requires authentication)
 * @query   ?active_only=true - Only return active tokens
 */
router.get('/:memberId', authenticateToken, requireSelfOrAdminFromParam, getMemberDevices);

/**
 * @route   PUT /api/device-tokens/:tokenId
 * @desc    Update device token information
 * @access  Protected (requires authentication)
 * @body    {
 *   device_name?: string,
 *   app_version?: string,
 *   os_version?: string,
 *   is_active?: boolean
 * }
 */
router.put('/:tokenId', authenticateToken, requireTokenOwnerOrAdmin, updateDeviceToken);

/**
 * @route   DELETE /api/device-tokens/:tokenId
 * @desc    Delete/unregister a device token (soft delete)
 * @access  Protected (requires authentication)
 */
router.delete('/:tokenId', authenticateToken, requireTokenOwnerOrAdmin, deleteDeviceToken);

/**
 * @route   PUT /api/device-tokens/:tokenId/refresh
 * @desc    Refresh FCM token when Firebase rotates tokens
 * @access  Protected (requires authentication)
 * @body    {
 *   new_token: string (new FCM registration token)
 * }
 */
router.put('/:tokenId/refresh', authenticateToken, requireTokenOwnerOrAdmin, refreshDeviceToken);

export default router;
