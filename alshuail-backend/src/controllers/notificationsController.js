import { query } from '../services/database.js';
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

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (member_id) {
      conditions.push(`member_id = $${paramIndex++}`);
      params.push(member_id);
    }

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }

    if (priority) {
      conditions.push(`priority = $${paramIndex++}`);
      params.push(priority);
    }

    if (is_read !== undefined) {
      conditions.push(`is_read = $${paramIndex++}`);
      params.push(is_read === 'true');
    }

    if (target_audience) {
      conditions.push(`target_audience = $${paramIndex++}`);
      params.push(target_audience);
    }

    if (start_date) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(parseInt(limit));
    const limitParam = paramIndex++;
    params.push(parseInt(offset));
    const offsetParam = paramIndex++;

    const { rows: notifications } = await query(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    );

    // Calculate summary statistics
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const readCount = notifications.filter(n => n.is_read).length;

    // Group by type and priority
    const typeStats = notifications.reduce((acc, notif) => {
      acc[notif.type] = (acc[notif.type] || 0) + 1;
      return acc;
    }, {});

    const priorityStats = notifications.reduce((acc, notif) => {
      acc[notif.priority] = (acc[notif.priority] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: notifications,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: notifications.length
      },
      summary: {
        total: notifications.length,
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

    const { rows } = await query(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'الإشعار غير موجود'
      });
    }

    res.json({
      success: true,
      data: rows[0],
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
      const { rows: memberRows } = await query(
        'SELECT id FROM members WHERE id = $1',
        [member_id]
      );

      if (memberRows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'العضو المحدد غير موجود'
        });
      }
    }

    let notifications = [];

    if (target_audience === 'specific' && member_id) {
      // Create notification for specific member
      const sentAt = send_immediately ? new Date().toISOString() : null;

      const { rows } = await query(
        `INSERT INTO notifications (title, message, type, priority, target_audience, member_id, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [title, message, type, priority, target_audience, member_id, sentAt]
      );
      notifications.push(rows[0]);

    } else {
      // Get target members based on audience
      let memberSql = 'SELECT id, full_name FROM members';
      const memberParams = [];

      switch (target_audience) {
        case 'active_members':
          memberSql += ' WHERE is_active = $1';
          memberParams.push(true);
          break;
        case 'admins':
          memberSql += ' WHERE is_active = $1';
          memberParams.push(true);
          break;
        // case 'all': no filter
      }

      const { rows: targetMembers } = await query(memberSql, memberParams);

      if (!targetMembers || targetMembers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'لم يتم العثور على أعضاء مستهدفين'
        });
      }

      // Create notifications for all target members using bulk insert
      const sentAt = send_immediately ? new Date().toISOString() : null;
      const valuePlaceholders = [];
      const insertParams = [];
      let idx = 1;

      for (const member of targetMembers) {
        valuePlaceholders.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6})`);
        insertParams.push(title, message, type, priority, target_audience, member.id, sentAt);
        idx += 7;
      }

      const { rows: newNotifications } = await query(
        `INSERT INTO notifications (title, message, type, priority, target_audience, member_id, sent_at)
         VALUES ${valuePlaceholders.join(', ')}
         RETURNING *`,
        insertParams
      );
      notifications = newNotifications;
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
    const { rows: existingRows } = await query(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'الإشعار غير موجود'
      });
    }

    const existingNotification = existingRows[0];

    // Verify member has access to this notification
    if (member_id && existingNotification.member_id !== member_id) {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح لك بالوصول لهذا الإشعار'
      });
    }

    const { rows } = await query(
      `UPDATE notifications SET is_read = true, read_at = $1 WHERE id = $2 RETURNING *`,
      [new Date().toISOString(), id]
    );

    res.json({
      success: true,
      data: rows[0],
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

    const params = [new Date().toISOString(), notification_ids];
    let sql = `UPDATE notifications SET is_read = true, read_at = $1 WHERE id = ANY($2)`;

    if (member_id) {
      sql += ` AND member_id = $3`;
      params.push(member_id);
    }

    sql += ' RETURNING *';

    const { rows: updatedNotifications } = await query(sql, params);

    res.json({
      success: true,
      data: updatedNotifications,
      updated_count: updatedNotifications.length,
      message: `تم وضع علامة قراءة على ${updatedNotifications.length} إشعار`
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
    const { rows: existingRows } = await query(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'الإشعار غير موجود'
      });
    }

    await query('DELETE FROM notifications WHERE id = $1', [id]);

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
    const { rows: memberRows } = await query(
      'SELECT id, full_name FROM members WHERE id = $1',
      [memberId]
    );

    if (memberRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود'
      });
    }

    const member = memberRows[0];

    const conditions = ['member_id = $1'];
    const params = [memberId];
    let paramIndex = 2;

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }

    if (priority) {
      conditions.push(`priority = $${paramIndex++}`);
      params.push(priority);
    }

    if (is_read !== undefined) {
      conditions.push(`is_read = $${paramIndex++}`);
      params.push(is_read === 'true');
    }

    params.push(parseInt(limit));
    const limitParam = paramIndex++;
    params.push(parseInt(offset));
    const offsetParam = paramIndex++;

    const { rows: notifications } = await query(
      `SELECT * FROM notifications WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    );

    // Calculate member-specific summary
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const readCount = notifications.filter(n => n.is_read).length;

    res.json({
      success: true,
      data: notifications,
      member: member,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: notifications.length
      },
      summary: {
        total: notifications.length,
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

    let sql = 'SELECT * FROM notifications';
    const params = [];

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
        sql += ' WHERE created_at >= $1';
        params.push(startDate.toISOString());
      }
    }

    const { rows: notifications } = await query(sql, params);

    // Calculate statistics
    const totalNotifications = notifications.length;
    const readNotifications = notifications.filter(n => n.is_read).length;
    const unreadNotifications = notifications.filter(n => !n.is_read).length;

    // Group by type, priority, and target audience
    const typeStats = notifications.reduce((acc, notif) => {
      acc[notif.type] = (acc[notif.type] || 0) + 1;
      return acc;
    }, {});

    const priorityStats = notifications.reduce((acc, notif) => {
      acc[notif.priority] = (acc[notif.priority] || 0) + 1;
      return acc;
    }, {});

    const audienceStats = notifications.reduce((acc, notif) => {
      acc[notif.target_audience] = (acc[notif.target_audience] || 0) + 1;
      return acc;
    }, {});

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

      const dayNotifications = notifications.filter(n => {
        const notifDate = new Date(n.created_at);
        return notifDate >= date && notifDate < nextDay;
      });

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
