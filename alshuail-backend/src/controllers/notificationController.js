// ===============================================
// NOTIFICATION API - BACKEND IMPLEMENTATION
// File: backend/controllers/notificationController.js
// ===============================================

import { query } from '../services/database.js';
import { log } from '../utils/logger.js';
import { getCategoryFromType, getDefaultIcon, formatTimeAgo, organizeNotificationsByCategory } from '../utils/notificationHelpers.js';

/**
 * Get all notifications for a member
 * Organizes by category and priority
 *
 * @route GET /api/member/notifications
 * @access Private (requires JWT token)
 */
export const getMemberNotifications = async (req, res) => {
  try {
    const memberId = req.user.id; // From auth middleware

    log.debug('Fetching notifications for member', { memberId });

    // Fetch notifications from database
    const { rows: notifications } = await query(
      `SELECT id, title, title_ar, message, message_ar, type, priority,
              is_read, created_at, related_id, related_type, icon, action_url
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [memberId]
    );

    // Organize notifications by category
    const organized = {
      news: [],
      initiatives: [],
      diyas: [],
      occasions: [],
      statements: [],
      other: []
    };

    notifications.forEach(notif => {
      const category = getCategoryFromType(notif.type);
      const formattedNotif = {
        id: notif.id,
        title: notif.title_ar || notif.title,
        body: notif.message_ar || notif.message,
        time: formatTimeAgo(notif.created_at),
        timestamp: notif.created_at,
        icon: notif.icon || getDefaultIcon(notif.type),
        priority: notif.priority || 'normal',
        isRead: notif.is_read || false,
        category: category,
        actionUrl: notif.action_url,
        relatedId: notif.related_id,
        relatedType: notif.related_type
      };

      if (organized[category]) {
        organized[category].push(formattedNotif);
      } else {
        organized.other.push(formattedNotif);
      }
    });

    // Count unread notifications
    const unreadCount = notifications.filter(n => !n.is_read).length;

    log.debug('Notifications found', { total: notifications.length, unread: unreadCount });

    res.json({
      success: true,
      data: {
        notifications: organized,
        unreadCount,
        total: notifications.length
      }
    });

  } catch (error) {
    log.error('Notifications exception', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorAr: 'خطأ في الخادم'
    });
  }
};

/**
 * Get notification categories with counts
 *
 * @route GET /api/member/notifications/summary
 * @access Private
 */
export const getNotificationSummary = async (req, res) => {
  try {
    const memberId = req.user.id;

    const { rows: notifications } = await query(
      'SELECT type, is_read FROM notifications WHERE user_id = $1',
      [memberId]
    );

    // Count by category
    const summary = {
      news: { total: 0, unread: 0 },
      initiatives: { total: 0, unread: 0 },
      diyas: { total: 0, unread: 0 },
      occasions: { total: 0, unread: 0 },
      statements: { total: 0, unread: 0 }
    };

    notifications.forEach(notif => {
      const category = getCategoryFromType(notif.type);
      if (summary[category]) {
        summary[category].total++;
        if (!notif.is_read) {summary[category].unread++;}
      }
    });

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    log.error('Notifications summary error', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Mark notification as read
 *
 * @route PUT /api/member/notifications/:id/read
 * @access Private
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const memberId = req.user.id;

    log.debug('Marking notification as read', { notificationId: id, memberId });

    // Update notification - only update own notifications (security)
    const { rows } = await query(
      `UPDATE notifications
       SET is_read = true, read_at = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [new Date().toISOString(), id, memberId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        errorAr: 'الإشعار غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      messageAr: 'تم تحديث الإشعار'
    });

  } catch (error) {
    log.error('Notification mark read exception', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Mark all notifications as read
 *
 * @route PUT /api/member/notifications/read-all
 * @access Private
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const memberId = req.user.id;

    log.debug('Marking all notifications as read', { memberId });

    const { rowCount } = await query(
      `UPDATE notifications
       SET is_read = true, read_at = $1
       WHERE user_id = $2 AND is_read = false`,
      [new Date().toISOString(), memberId]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      messageAr: 'تم تحديث جميع الإشعارات',
      count: rowCount || 0
    });

  } catch (error) {
    log.error('Mark all notifications read error', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete a notification
 *
 * @route DELETE /api/member/notifications/:id
 * @access Private
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const memberId = req.user.id;

    await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [id, memberId]
    );

    res.json({
      success: true,
      message: 'Notification deleted',
      messageAr: 'تم حذف الإشعار'
    });

  } catch (error) {
    log.error('Notification delete error', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================================
// HELPER FUNCTIONS
// ===============================================

/**
 * Map notification type to category
 */
// Helper functions moved to notificationHelpers.js for shared use

// ===============================================
// EXPORTS
// ===============================================

export default {
  getMemberNotifications,
  getNotificationSummary,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
};
