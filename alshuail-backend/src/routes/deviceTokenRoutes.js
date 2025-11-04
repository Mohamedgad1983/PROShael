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

const router = express.Router();

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
router.post('/', registerDeviceToken);

/**
 * @route   GET /api/device-tokens/:memberId
 * @desc    Get all device tokens for a member
 * @access  Protected (requires authentication)
 * @query   ?active_only=true - Only return active tokens
 */
router.get('/:memberId', getMemberDevices);

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
router.put('/:tokenId', updateDeviceToken);

/**
 * @route   DELETE /api/device-tokens/:tokenId
 * @desc    Delete/unregister a device token (soft delete)
 * @access  Protected (requires authentication)
 */
router.delete('/:tokenId', deleteDeviceToken);

/**
 * @route   PUT /api/device-tokens/:tokenId/refresh
 * @desc    Refresh FCM token when Firebase rotates tokens
 * @access  Protected (requires authentication)
 * @body    {
 *   new_token: string (new FCM registration token)
 * }
 */
router.put('/:tokenId/refresh', refreshDeviceToken);

export default router;
