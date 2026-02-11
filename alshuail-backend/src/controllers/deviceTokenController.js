/**
 * Device Token Controller
 *
 * Handles device token management for push notifications
 * Supports iOS, Android, and Web platforms
 *
 * Features:
 * - Register new device tokens
 * - List all devices for a member
 * - Update device information
 * - Delete/unregister devices
 * - Refresh token (when FCM token rotates)
 */

import { query } from '../services/database.js';
import { log } from '../utils/logger.js';

/**
 * Register a new device token for push notifications
 *
 * POST /api/device-tokens
 * Body: {
 *   member_id: string (UUID),
 *   token: string (FCM registration token),
 *   platform: 'ios' | 'android' | 'web',
 *   device_name?: string,
 *   app_version?: string,
 *   os_version?: string
 * }
 */
export async function registerDeviceToken(req, res) {
  try {
    const {
      member_id,
      token,
      platform,
      device_name,
      app_version,
      os_version
    } = req.body;

    // Validate required fields
    if (!member_id || !token || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: member_id, token, platform'
      });
    }

    // Validate platform
    const validPlatforms = ['ios', 'android', 'web'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`
      });
    }

    // Validate member exists
    const { rows: memberRows } = await query(
      'SELECT id FROM members WHERE id = $1',
      [member_id]
    );

    if (memberRows.length === 0) {
      log.warn('Device token registration failed - member not found', {
        member_id
      });
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    // Check if token already exists
    const { rows: existingRows } = await query(
      'SELECT * FROM device_tokens WHERE member_id = $1 AND token = $2',
      [member_id, token]
    );

    if (existingRows.length > 0) {
      const existingToken = existingRows[0];

      // Token already registered - update it (reactivate if inactive)
      const { rows: updatedRows } = await query(
        `UPDATE device_tokens
         SET is_active = true, device_name = $1, app_version = $2, os_version = $3, last_used_at = $4
         WHERE id = $5
         RETURNING *`,
        [device_name, app_version, os_version, new Date().toISOString(), existingToken.id]
      );

      if (updatedRows.length === 0) {
        log.error('Failed to update existing device token', {
          token_id: existingToken.id
        });
        return res.status(500).json({
          success: false,
          error: 'Failed to update device token'
        });
      }

      const updatedToken = updatedRows[0];

      log.info('Device token reactivated', {
        member_id,
        token_id: updatedToken.id,
        platform
      });

      return res.status(200).json({
        success: true,
        message: 'Device token updated successfully',
        data: updatedToken
      });
    }

    // Register new device token
    const { rows: insertedRows } = await query(
      `INSERT INTO device_tokens (member_id, token, platform, device_name, app_version, os_version, is_active, last_used_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       RETURNING *`,
      [member_id, token, platform, device_name, app_version, os_version, new Date().toISOString()]
    );

    if (insertedRows.length === 0) {
      log.error('Failed to register device token', {
        member_id,
        platform
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to register device token'
      });
    }

    const newToken = insertedRows[0];

    log.info('Device token registered successfully', {
      member_id,
      token_id: newToken.id,
      platform
    });

    return res.status(201).json({
      success: true,
      message: 'Device token registered successfully',
      data: newToken
    });

  } catch (error) {
    log.error('Device token registration exception', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Get all device tokens for a member
 *
 * GET /api/device-tokens/:memberId
 * Query params:
 *   ?active_only=true - Only return active tokens
 */
export async function getMemberDevices(req, res) {
  try {
    const { memberId } = req.params;
    const { active_only } = req.query;

    // Validate member exists
    const { rows: memberRows } = await query(
      'SELECT id FROM members WHERE id = $1',
      [memberId]
    );

    if (memberRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    // Build query
    let sql = 'SELECT * FROM device_tokens WHERE member_id = $1';
    const params = [memberId];

    if (active_only === 'true') {
      sql += ' AND is_active = $2';
      params.push(true);
    }

    sql += ' ORDER BY created_at DESC';

    const { rows: devices } = await query(sql, params);

    log.info('Member devices fetched', {
      memberId,
      count: devices.length,
      active_only: active_only === 'true'
    });

    return res.status(200).json({
      success: true,
      data: devices,
      count: devices.length
    });

  } catch (error) {
    log.error('Get member devices exception', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Update device token information
 *
 * PUT /api/device-tokens/:tokenId
 * Body: {
 *   device_name?: string,
 *   app_version?: string,
 *   os_version?: string,
 *   is_active?: boolean
 * }
 */
export async function updateDeviceToken(req, res) {
  try {
    const { tokenId } = req.params;
    const { device_name, app_version, os_version, is_active } = req.body;

    // Check if device token exists
    const { rows: existingRows } = await query(
      'SELECT * FROM device_tokens WHERE id = $1',
      [tokenId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Device token not found'
      });
    }

    // Build dynamic SET clause
    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    if (device_name !== undefined) {
      setClauses.push(`device_name = $${paramIndex++}`);
      params.push(device_name);
    }
    if (app_version !== undefined) {
      setClauses.push(`app_version = $${paramIndex++}`);
      params.push(app_version);
    }
    if (os_version !== undefined) {
      setClauses.push(`os_version = $${paramIndex++}`);
      params.push(os_version);
    }
    if (is_active !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      params.push(is_active);
    }

    setClauses.push(`last_used_at = $${paramIndex++}`);
    params.push(new Date().toISOString());

    params.push(tokenId);

    const { rows: updatedRows } = await query(
      `UPDATE device_tokens SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (updatedRows.length === 0) {
      log.error('Failed to update device token', { tokenId });
      return res.status(500).json({
        success: false,
        error: 'Failed to update device token'
      });
    }

    const updatedToken = updatedRows[0];

    log.info('Device token updated', {
      tokenId,
      member_id: updatedToken.member_id,
      updates: Object.keys(req.body)
    });

    return res.status(200).json({
      success: true,
      message: 'Device token updated successfully',
      data: updatedToken
    });

  } catch (error) {
    log.error('Update device token exception', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Delete/unregister a device token
 *
 * DELETE /api/device-tokens/:tokenId
 */
export async function deleteDeviceToken(req, res) {
  try {
    const { tokenId } = req.params;

    // Check if device token exists
    const { rows: existingRows } = await query(
      'SELECT * FROM device_tokens WHERE id = $1',
      [tokenId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Device token not found'
      });
    }

    const existingToken = existingRows[0];

    // Soft delete - mark as inactive instead of hard delete
    const { rowCount } = await query(
      'UPDATE device_tokens SET is_active = false WHERE id = $1',
      [tokenId]
    );

    if (rowCount === 0) {
      log.error('Failed to delete device token', { tokenId });
      return res.status(500).json({
        success: false,
        error: 'Failed to delete device token'
      });
    }

    log.info('Device token deleted (soft delete)', {
      tokenId,
      member_id: existingToken.member_id,
      platform: existingToken.platform
    });

    return res.status(200).json({
      success: true,
      message: 'Device token deleted successfully'
    });

  } catch (error) {
    log.error('Delete device token exception', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Refresh FCM token (when Firebase rotates tokens)
 *
 * PUT /api/device-tokens/:tokenId/refresh
 * Body: {
 *   new_token: string (new FCM registration token)
 * }
 */
export async function refreshDeviceToken(req, res) {
  try {
    const { tokenId } = req.params;
    const { new_token } = req.body;

    if (!new_token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: new_token'
      });
    }

    // Check if device token exists
    const { rows: existingRows } = await query(
      'SELECT * FROM device_tokens WHERE id = $1',
      [tokenId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Device token not found'
      });
    }

    const existingToken = existingRows[0];

    // Check if new token already exists for this member
    const { rows: duplicateRows } = await query(
      'SELECT id FROM device_tokens WHERE member_id = $1 AND token = $2 AND id != $3',
      [existingToken.member_id, new_token, tokenId]
    );

    if (duplicateRows.length > 0) {
      // New token already exists - delete old one
      await query(
        'UPDATE device_tokens SET is_active = false WHERE id = $1',
        [tokenId]
      );

      log.info('Old device token deactivated (duplicate new token exists)', {
        old_token_id: tokenId,
        new_token_id: duplicateRows[0].id,
        member_id: existingToken.member_id
      });

      return res.status(200).json({
        success: true,
        message: 'Token already updated (duplicate removed)',
        data: { token_id: duplicateRows[0].id }
      });
    }

    // Update token
    const { rows: updatedRows } = await query(
      `UPDATE device_tokens
       SET token = $1, is_active = true, last_used_at = $2
       WHERE id = $3
       RETURNING *`,
      [new_token, new Date().toISOString(), tokenId]
    );

    if (updatedRows.length === 0) {
      log.error('Failed to refresh device token', { tokenId });
      return res.status(500).json({
        success: false,
        error: 'Failed to refresh device token'
      });
    }

    const updatedToken = updatedRows[0];

    log.info('Device token refreshed', {
      tokenId,
      member_id: updatedToken.member_id,
      platform: updatedToken.platform
    });

    return res.status(200).json({
      success: true,
      message: 'Device token refreshed successfully',
      data: updatedToken
    });

  } catch (error) {
    log.error('Refresh device token exception', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default {
  registerDeviceToken,
  getMemberDevices,
  updateDeviceToken,
  deleteDeviceToken,
  refreshDeviceToken
};
