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

import { supabase } from '../config/database.js';
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
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('id', member_id)
      .single();

    if (memberError || !member) {
      log.warn('Device token registration failed - member not found', {
        member_id,
        error: memberError?.message
      });
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    // Check if token already exists
    const { data: existingToken } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('member_id', member_id)
      .eq('token', token)
      .single();

    if (existingToken) {
      // Token already registered - update it (reactivate if inactive)
      const { data: updatedToken, error: updateError } = await supabase
        .from('device_tokens')
        .update({
          is_active: true,
          device_name,
          app_version,
          os_version,
          last_used_at: new Date().toISOString()
        })
        .eq('id', existingToken.id)
        .select()
        .single();

      if (updateError) {
        log.error('Failed to update existing device token', {
          error: updateError.message,
          token_id: existingToken.id
        });
        return res.status(500).json({
          success: false,
          error: 'Failed to update device token'
        });
      }

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
    const { data: newToken, error: insertError } = await supabase
      .from('device_tokens')
      .insert({
        member_id,
        token,
        platform,
        device_name,
        app_version,
        os_version,
        is_active: true,
        last_used_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      log.error('Failed to register device token', {
        error: insertError.message,
        member_id,
        platform
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to register device token'
      });
    }

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
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    // Build query
    let query = supabase
      .from('device_tokens')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    // Filter by active status if requested
    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    const { data: devices, error } = await query;

    if (error) {
      log.error('Failed to fetch member devices', {
        error: error.message,
        memberId
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch devices'
      });
    }

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
    const { data: existingToken, error: fetchError } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (fetchError || !existingToken) {
      return res.status(404).json({
        success: false,
        error: 'Device token not found'
      });
    }

    // Prepare update data
    const updateData = {
      ...(device_name !== undefined && { device_name }),
      ...(app_version !== undefined && { app_version }),
      ...(os_version !== undefined && { os_version }),
      ...(is_active !== undefined && { is_active }),
      last_used_at: new Date().toISOString()
    };

    // Update device token
    const { data: updatedToken, error: updateError } = await supabase
      .from('device_tokens')
      .update(updateData)
      .eq('id', tokenId)
      .select()
      .single();

    if (updateError) {
      log.error('Failed to update device token', {
        error: updateError.message,
        tokenId
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to update device token'
      });
    }

    log.info('Device token updated', {
      tokenId,
      member_id: updatedToken.member_id,
      updates: Object.keys(updateData)
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
    const { data: existingToken, error: fetchError } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (fetchError || !existingToken) {
      return res.status(404).json({
        success: false,
        error: 'Device token not found'
      });
    }

    // Soft delete - mark as inactive instead of hard delete
    const { error: updateError } = await supabase
      .from('device_tokens')
      .update({ is_active: false })
      .eq('id', tokenId);

    if (updateError) {
      log.error('Failed to delete device token', {
        error: updateError.message,
        tokenId
      });
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
    const { data: existingToken, error: fetchError } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (fetchError || !existingToken) {
      return res.status(404).json({
        success: false,
        error: 'Device token not found'
      });
    }

    // Check if new token already exists for this member
    const { data: duplicateToken } = await supabase
      .from('device_tokens')
      .select('id')
      .eq('member_id', existingToken.member_id)
      .eq('token', new_token)
      .neq('id', tokenId)
      .single();

    if (duplicateToken) {
      // New token already exists - delete old one
      await supabase
        .from('device_tokens')
        .update({ is_active: false })
        .eq('id', tokenId);

      log.info('Old device token deactivated (duplicate new token exists)', {
        old_token_id: tokenId,
        new_token_id: duplicateToken.id,
        member_id: existingToken.member_id
      });

      return res.status(200).json({
        success: true,
        message: 'Token already updated (duplicate removed)',
        data: { token_id: duplicateToken.id }
      });
    }

    // Update token
    const { data: updatedToken, error: updateError } = await supabase
      .from('device_tokens')
      .update({
        token: new_token,
        is_active: true,
        last_used_at: new Date().toISOString()
      })
      .eq('id', tokenId)
      .select()
      .single();

    if (updateError) {
      log.error('Failed to refresh device token', {
        error: updateError.message,
        tokenId
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to refresh device token'
      });
    }

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
