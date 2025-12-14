import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

/**
 * Get all notifications with pagination and filtering
 * GET /api/notifications
 */
export const getAllNotifications = async (req, res) => {
  try {
    const {
      member_id,
      type,
      priority,
      is_read,
      target_audience,
      limit = 50,
      offset = 0,
      start_date,
      end_date
    } = req.query;

    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (member_id) {
      query = query.eq('member_id', member_id);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (is_read !== undefined) {
      query = query.eq('is_read', is_read === 'true');
    }

    if (target_audience) {
      query = query.eq('target_audience', target_audience);
    }

    // Date range filter
    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: notifications, error, count } = await query;

    if (error) {throw error;}

    // Calculate summary statistics
    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
    const readCount = notifications?.filter(n => n.is_read).length || 0;

    // Group by type and priority
    const typeStats = notifications?.reduce((acc, notif) => {
      acc[notif.type] = (acc[notif.type] || 0) + 1;
      return acc;
    }, {}) || {};

    const priorityStats = notifications?.reduce((acc, notif) => {
      acc[notif.priority] = (acc[notif.priority] || 0) + 1;
      return acc;
    }, {}) || {};

    res.json({
      success: true,
      data: notifications || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count || notifications?.length || 0
      },
      summary: {
        total: notifications?.length || 0,
        unread: unreadCount,
        read: readCount,
        by_type: typeStats,
        by_priority: priorityStats
      },
      message: 'تم جلب الإشعارات بنجاح'
    });
  } catch (error) {
    log.error('Error fetching notifications', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب الإشعارات',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Get notification by ID
 * GET /api/notifications/:id
 */
export const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: notification, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'الإشعار غير موجود'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: notification,
      message: 'تم جلب بيانات الإشعار بنجاح'
    });
  } catch (error) {
    log.error('Error fetching notification', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب بيانات الإشعار',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Create and dispatch new notification
 * POST /api/notifications
 */
export const createNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type = 'general',
      priority = 'normal',
      target_audience = 'all',
      member_id,
      send_immediately = true
    } = req.body;

    // Validation
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'العنوان والرسالة مطلوبان'
      });
    }

    if (!['general', 'payment', 'event', 'initiative', 'diya', 'system'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'نوع الإشعار غير صحيح'
      });
    }

    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({
        success: false,
        error: 'أولوية الإشعار غير صحيحة'
      });
    }

    if (!['all', 'specific', 'admins', 'active_members'].includes(target_audience)) {
      return res.status(400).json({
        success: false,
        error: 'جمهور الإشعار غير صحيح'
      });
    }

    // Validate member if targeting specific member
    if (target_audience === 'specific' && member_id) {
      const { data: member, error: _memberError } = await supabase
        .from('members')
        .select('id')
        .eq('id', member_id)
        .single();

      if (_memberError || !member) {
        return res.status(400).json({
          success: false,
          error: 'العضو المحدد غير موجود'
        });
      }
    }

    let notifications = [];

    if (target_audience === 'specific' && member_id) {
      // Create notification for specific member
      const notificationData = {
        title,
        message,
        type,
        priority,
        target_audience,
        member_id,
        sent_at: send_immediately ? new Date().toISOString() : null
      };

      const { data: newNotification, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select('*')
        .single();

      if (error) {throw error;}
      notifications.push(newNotification);

    } else {
      // Get target members based on audience
      let memberQuery = supabase.from('members').select('id, full_name');

      switch (target_audience) {
        case 'all':
          // No additional filter needed
          break;
        case 'active_members':
          memberQuery = memberQuery.eq('is_active', true);
          break;
        case 'admins':
          // Assuming admins have a specific role or flag
          // This would need to be adjusted based on your member schema
          memberQuery = memberQuery.eq('is_active', true); // Placeholder
          break;
      }

      const { data: targetMembers, error: _membersError } = await memberQuery;

      if (_membersError) {throw _membersError;}

      if (!targetMembers || targetMembers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'لم يتم العثور على أعضاء مستهدفين'
        });
      }

      // Create notifications for all target members
      const notificationsData = targetMembers.map(member => ({
        title,
        message,
        type,
        priority,
        target_audience,
        member_id: member.id,
        sent_at: send_immediately ? new Date().toISOString() : null
      }));

      const { data: newNotifications, error } = await supabase
        .from('notifications')
        .insert(notificationsData)
        .select('*');

      if (error) {throw error;}
      notifications = newNotifications || [];
    }

    res.status(201).json({
      success: true,
      data: {
        notifications,
        sent_count: notifications.length,
        target_audience,
        send_immediately
      },
      message: `تم إرسال ${notifications.length} إشعار بنجاح`
    });
  } catch (error) {
    log.error('Error creating notification', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في إنشاء الإشعار',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { member_id } = req.body;

    // Check if notification exists
    const { data: existingNotification, error: _checkError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (_checkError || !existingNotification) {
      return res.status(404).json({
        success: false,
        error: 'الإشعار غير موجود'
      });
    }

    // Verify member has access to this notification
    if (member_id && existingNotification.member_id !== member_id) {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح لك بالوصول لهذا الإشعار'
      });
    }

    const { data: updatedNotification, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {throw error;}

    res.json({
      success: true,
      data: updatedNotification,
      message: 'تم وضع علامة قراءة على الإشعار'
    });
  } catch (error) {
    log.error('Error marking notification as read', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في تحديث حالة الإشعار',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Mark multiple notifications as read
 * PUT /api/notifications/bulk-read
 */
export const bulkMarkAsRead = async (req, res) => {
  try {
    const { notification_ids, member_id } = req.body;

    if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'قائمة معرفات الإشعارات مطلوبة'
      });
    }

    let query = supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .in('id', notification_ids);

    // If member_id is provided, only update notifications for that member
    if (member_id) {
      query = query.eq('member_id', member_id);
    }

    const { data: updatedNotifications, error } = await query
      .select('*');

    if (error) {throw error;}

    res.json({
      success: true,
      data: updatedNotifications || [],
      updated_count: updatedNotifications?.length || 0,
      message: `تم وضع علامة قراءة على ${updatedNotifications?.length || 0} إشعار`
    });
  } catch (error) {
    log.error('Error bulk marking notifications as read', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في تحديث حالة الإشعارات',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if notification exists
    const { data: existingNotification, error: _checkError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (_checkError || !existingNotification) {
      return res.status(404).json({
        success: false,
        error: 'الإشعار غير موجود'
      });
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {throw error;}

    res.json({
      success: true,
      message: 'تم حذف الإشعار بنجاح'
    });
  } catch (error) {
    log.error('Error deleting notification', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في حذف الإشعار',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Get member-specific notifications
 * GET /api/notifications/member/:memberId
 */
export const getMemberNotifications = async (req, res) => {
  try {
    const { memberId } = req.params;
    const {
      type,
      priority,
      is_read,
      limit = 50,
      offset = 0
    } = req.query;

    // Check if member exists
    const { data: member, error: _memberError } = await supabase
      .from('members')
      .select('id, full_name')
      .eq('id', memberId)
      .single();

    if (_memberError || !member) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود'
      });
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (is_read !== undefined) {
      query = query.eq('is_read', is_read === 'true');
    }

    const { data: notifications, error, count } = await query;

    if (error) {throw error;}

    // Calculate member-specific summary
    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
    const readCount = notifications?.filter(n => n.is_read).length || 0;

    res.json({
      success: true,
      data: notifications || [],
      member: member,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count || notifications?.length || 0
      },
      summary: {
        total: notifications?.length || 0,
        unread: unreadCount,
        read: readCount
      },
      message: 'تم جلب إشعارات العضو بنجاح'
    });
  } catch (error) {
    log.error('Error fetching member notifications', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب إشعارات العضو',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Get notification statistics
 * GET /api/notifications/stats
 */
export const getNotificationStats = async (req, res) => {
  try {
    const { period = 'all' } = req.query;

    let query = supabase
      .from('notifications')
      .select('*');

    // Apply period filter
    if (period !== 'all') {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'day':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
    }

    const { data: notifications, error } = await query;

    if (error) {throw error;}

    // Calculate statistics
    const totalNotifications = notifications?.length || 0;
    const readNotifications = notifications?.filter(n => n.is_read).length || 0;
    const unreadNotifications = notifications?.filter(n => !n.is_read).length || 0;

    // Group by type, priority, and target audience
    const typeStats = notifications?.reduce((acc, notif) => {
      acc[notif.type] = (acc[notif.type] || 0) + 1;
      return acc;
    }, {}) || {};

    const priorityStats = notifications?.reduce((acc, notif) => {
      acc[notif.priority] = (acc[notif.priority] || 0) + 1;
      return acc;
    }, {}) || {};

    const audienceStats = notifications?.reduce((acc, notif) => {
      acc[notif.target_audience] = (acc[notif.target_audience] || 0) + 1;
      return acc;
    }, {}) || {};

    // Calculate read rate
    const readRate = totalNotifications > 0 ? Math.round((readNotifications / totalNotifications) * 100) : 0;

    // Daily trend (last 7 days)
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      const dayNotifications = notifications?.filter(n => {
        const notifDate = new Date(n.created_at);
        return notifDate >= date && notifDate < nextDay;
      }) || [];

      dailyData.push({
        date: date.toLocaleDateString('ar-SA'),
        total: dayNotifications.length,
        read: dayNotifications.filter(n => n.is_read).length,
        unread: dayNotifications.filter(n => !n.is_read).length
      });
    }

    res.json({
      success: true,
      data: {
        overview: {
          total_notifications: totalNotifications,
          read_notifications: readNotifications,
          unread_notifications: unreadNotifications,
          read_rate: readRate
        },
        by_type: typeStats,
        by_priority: priorityStats,
        by_audience: audienceStats,
        daily_trend: dailyData
      },
      message: 'تم جلب إحصائيات الإشعارات بنجاح'
    });
  } catch (error) {
    log.error('Error fetching notification stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب إحصائيات الإشعارات',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};