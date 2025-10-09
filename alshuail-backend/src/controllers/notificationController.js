// ===============================================
// NOTIFICATION API - BACKEND IMPLEMENTATION
// File: backend/controllers/notificationController.js
// ===============================================

import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

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
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select(`
        id,
        title,
        title_ar,
        message,
        message_ar,
        type,
        priority,
        is_read,
        created_at,
        related_id,
        related_type,
        icon,
        action_url
      `)
      .eq('user_id', memberId)
      .order('created_at', { ascending: false })
      .limit(50); // Last 50 notifications

    if (error) {
      log.error('Notifications database error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications',
        errorAr: 'فشل في جلب الإشعارات'
      });
    }

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

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('type, is_read')
      .eq('user_id', memberId);

    if (error) {throw error;}

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

    // Update notification
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', memberId) // Security: only update own notifications
      .select()
      .single();

    if (error) {
      log.error('Notification mark read error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Failed to mark as read',
        errorAr: 'فشل في تحديث الإشعار'
      });
    }

    if (!data) {
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

    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', memberId)
      .eq('is_read', false); // Only update unread ones

    if (error) {throw error;}

    res.json({
      success: true,
      message: 'All notifications marked as read',
      messageAr: 'تم تحديث جميع الإشعارات',
      count: data?.length || 0
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

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', memberId);

    if (error) {throw error;}

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
function getCategoryFromType(type) {
  const mapping = {
    // News
    'news': 'news',
    'announcement': 'news',
    'update': 'news',

    // Initiatives
    'initiative': 'initiatives',
    'charity': 'initiatives',
    'donation': 'initiatives',
    'fundraising': 'initiatives',

    // Diya
    'diya': 'diyas',
    'blood_money': 'diyas',
    'urgent_case': 'diyas',

    // Occasions
    'occasion': 'occasions',
    'event': 'occasions',
    'celebration': 'occasions',
    'wedding': 'occasions',
    'condolence': 'occasions',

    // Statements
    'statement': 'statements',
    'payment': 'statements',
    'subscription': 'statements',
    'financial': 'statements',
    'receipt': 'statements'
  };

  return mapping[type?.toLowerCase()] || 'other';
}

/**
 * Get default icon for notification type
 */
function getDefaultIcon(type) {
  const icons = {
    news: '📰',
    announcement: '📢',
    initiative: '🤝',
    charity: '❤️',
    diya: '⚖️',
    occasion: '🎉',
    event: '📅',
    statement: '📊',
    payment: '💰',
    subscription: '💳'
  };

  return icons[type?.toLowerCase()] || '🔔';
}

/**
 * Format timestamp to Arabic time ago
 */
function formatTimeAgo(timestamp) {
  const now = new Date();
  const notifDate = new Date(timestamp);
  const diffMs = now - notifDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {return 'الآن';}
  if (diffMins < 60) {return `منذ ${diffMins} دقيقة`;}
  if (diffHours < 24) {return `منذ ${diffHours} ساعة`;}
  if (diffDays < 7) {return `منذ ${diffDays} يوم`;}

  // Format as date
  return notifDate.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

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