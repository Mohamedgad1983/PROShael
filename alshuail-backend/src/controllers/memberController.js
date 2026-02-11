import { query } from '../services/database.js';
import { log } from '../utils/logger.js';

// Get member profile
export const getMemberProfile = async (req, res) => {
  try {
    const memberId = req.user.id;

    const { rows } = await query('SELECT * FROM members WHERE id = $1', [memberId]);
    const member = rows[0];

    if (!member) {
      return res.status(404).json({ message: 'العضو غير موجود' });
    }

    res.json(member);
  } catch (error) {
    log.error('Error in getMemberProfile', { error: error.message });
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// Get member balance calculation
export const getMemberBalance = async (req, res) => {
  try {
    const memberId = req.user.id;

    // Get member's current balance
    const { rows } = await query('SELECT balance FROM members WHERE id = $1', [memberId]);
    const member = rows[0];

    const currentBalance = member?.balance || 0;
    const targetBalance = 3000;
    const remaining = Math.max(0, targetBalance - currentBalance);
    const percentage = Math.round((currentBalance / targetBalance) * 100);
    const isCompliant = currentBalance >= targetBalance;

    res.json({
      current: currentBalance,
      target: targetBalance,
      remaining: remaining,
      percentage: percentage,
      status: isCompliant ? 'compliant' : 'non-compliant',
      is_compliant: isCompliant,
      color: isCompliant ? 'green' : 'red'
    });
  } catch (error) {
    log.error('Error in getMemberBalance', { error: error.message });
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// Get member payments with filters
export const getMemberPayments = async (req, res) => {
  try {
    const memberId = req.user.id;
    const { year, month, status, limit = 50 } = req.query;

    // Build dynamic query
    const conditions = ['p.member_id = $1'];
    const params = [memberId];
    let paramIndex = 2;

    // Apply filters
    if (status && status !== 'all') {
      conditions.push(`p.status = $${paramIndex++}`);
      params.push(status);
    }

    if (year) {
      const startDate = new Date(year, month || 0, 1);
      const endDate = month
        ? new Date(year, parseInt(month) + 1, 0)
        : new Date(year, 11, 31);

      conditions.push(`p.date >= $${paramIndex++}`);
      params.push(startDate.toISOString());
      conditions.push(`p.date <= $${paramIndex++}`);
      params.push(endDate.toISOString());
    }

    const whereClause = conditions.join(' AND ');
    params.push(parseInt(limit));

    const { rows } = await query(
      `SELECT p.*,
        json_build_object(
          'full_name', m.full_name,
          'membership_number', m.membership_number
        ) AS on_behalf_of
       FROM payments p
       LEFT JOIN members m ON m.id = p.on_behalf_of
       WHERE ${whereClause}
       ORDER BY p.date DESC
       LIMIT $${paramIndex}`,
      params
    );

    res.json(rows || []);
  } catch (error) {
    log.error('Error in getMemberPayments', { error: error.message });
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// Create new payment
export const createPayment = async (req, res) => {
  try {
    const memberId = req.user.id;
    const { amount, notes, receipt_url, on_behalf_of } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'المبلغ غير صحيح' });
    }

    // Create payment record
    const { rows } = await query(
      `INSERT INTO payments (member_id, amount, notes, receipt_url, status, date, on_behalf_of)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        memberId, parseFloat(amount), notes || null,
        receipt_url || null, 'pending', new Date().toISOString(),
        on_behalf_of || null
      ]
    );

    const payment = rows[0];

    res.status(201).json({
      message: 'تم إرسال الدفعة بنجاح',
      payment: payment
    });
  } catch (error) {
    log.error('Error in createPayment', { error: error.message });
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// Search members for payment on behalf
export const searchMembers = async (req, res) => {
  try {
    const { query: searchQuery } = req.query;
    const currentUserId = req.user.id;

    if (!searchQuery || searchQuery.length < 2) {
      return res.json([]);
    }

    const searchPattern = `%${searchQuery}%`;

    // Search by name, phone, or membership number
    const { rows } = await query(
      `SELECT id, full_name, membership_number, phone, tribal_section
       FROM members
       WHERE id != $1
         AND (full_name ILIKE $2 OR phone ILIKE $2 OR membership_number ILIKE $2)
       LIMIT 10`,
      [currentUserId, searchPattern]
    );

    res.json(rows || []);
  } catch (error) {
    log.error('Error in searchMembers', { error: error.message });
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// Get member notifications
export const getMemberNotifications = async (req, res) => {
  try {
    const memberId = req.user.id;
    const { type, limit = 50 } = req.query;

    // Build dynamic query
    const conditions = ['(member_id = $1 OR member_id IS NULL)'];
    const params = [memberId];
    let paramIndex = 2;

    if (type && type !== 'all') {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }

    const whereClause = conditions.join(' AND ');
    params.push(parseInt(limit));

    const { rows: notifications } = await query(
      `SELECT * FROM notifications
       WHERE ${whereClause}
       ORDER BY date DESC
       LIMIT $${paramIndex}`,
      params
    );

    // Check which notifications are read by this member
    const { rows: readNotifications } = await query(
      'SELECT notification_id FROM notification_reads WHERE member_id = $1',
      [memberId]
    );

    const readIds = new Set(readNotifications?.map(r => r.notification_id) || []);

    const notificationsWithReadStatus = (notifications || []).map(notification => ({
      ...notification,
      is_read: readIds.has(notification.id)
    }));

    res.json(notificationsWithReadStatus);
  } catch (error) {
    log.error('Error in getMemberNotifications', { error: error.message });
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const memberId = req.user.id;
    const { id: notificationId } = req.params;

    // Check if already marked as read
    const { rows: existingRows } = await query(
      'SELECT id FROM notification_reads WHERE member_id = $1 AND notification_id = $2',
      [memberId, notificationId]
    );

    if (existingRows.length === 0) {
      // Create read record
      await query(
        'INSERT INTO notification_reads (member_id, notification_id, read_at) VALUES ($1, $2, $3)',
        [memberId, notificationId, new Date().toISOString()]
      );
    }

    res.json({ message: 'تم تحديد الإشعار كمقروء' });
  } catch (error) {
    log.error('Error in markNotificationAsRead', { error: error.message });
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const memberId = req.user.id;

    // Get all unread notifications
    const { rows: notifications } = await query(
      'SELECT id FROM notifications WHERE (member_id = $1 OR member_id IS NULL)',
      [memberId]
    );

    if (!notifications || notifications.length === 0) {
      return res.json({ message: 'لا توجد إشعارات لتحديدها كمقروءة' });
    }

    // Get already read notifications
    const { rows: alreadyRead } = await query(
      'SELECT notification_id FROM notification_reads WHERE member_id = $1',
      [memberId]
    );

    const readIds = new Set(alreadyRead?.map(r => r.notification_id) || []);

    // Filter unread notifications
    const unreadNotifications = notifications.filter(n => !readIds.has(n.id));

    if (unreadNotifications.length > 0) {
      // Create read records for all unread using a batch insert
      const valuePlaceholders = unreadNotifications.map((_, i) => {
        const base = i * 3;
        return `($${base + 1}, $${base + 2}, $${base + 3})`;
      }).join(', ');

      const values = unreadNotifications.flatMap(n => [
        memberId,
        n.id,
        new Date().toISOString()
      ]);

      await query(
        `INSERT INTO notification_reads (member_id, notification_id, read_at) VALUES ${valuePlaceholders}`,
        values
      );
    }

    res.json({ message: 'تم تحديد جميع الإشعارات كمقروءة' });
  } catch (error) {
    log.error('Error in markAllNotificationsAsRead', { error: error.message });
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// Upload receipt
// NOTE: This function previously used Supabase Storage (supabase.storage.from('receipts')).
// It needs to be migrated to a local file storage solution or an S3-compatible service.
// For now, it returns an error indicating the feature needs reconfiguration.
export const uploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم رفع أي ملف' });
    }

    // TODO: Replace with local file storage or S3-compatible service.
    // The previous implementation used Supabase Storage which is no longer available
    // after migrating to direct PostgreSQL.
    log.warn('uploadReceipt called but Supabase Storage is no longer configured');

    return res.status(501).json({
      message: 'خدمة رفع الإيصالات قيد إعادة التهيئة'
    });
  } catch (error) {
    log.error('Error in uploadReceipt', { error: error.message });
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};
