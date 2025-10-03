import { supabase } from '../config/database.js';

// Get member profile
export const getMemberProfile = async (req, res) => {
  try {
    const memberId = req.user.id;

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (error) {
      console.error('Error fetching member profile:', error);
      return res.status(500).json({ message: 'خطأ في جلب البيانات' });
    }

    if (!data) {
      return res.status(404).json({ message: 'العضو غير موجود' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in getMemberProfile:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// Get member balance calculation
export const getMemberBalance = async (req, res) => {
  try {
    const memberId = req.user.id;

    // Get member's current balance
    const { data: member, error } = await supabase
      .from('members')
      .select('balance')
      .eq('id', memberId)
      .single();

    if (error) {
      console.error('Error fetching member balance:', error);
      return res.status(500).json({ message: 'خطأ في جلب البيانات' });
    }

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
    console.error('Error in getMemberBalance:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// Get member payments with filters
export const getMemberPayments = async (req, res) => {
  try {
    const memberId = req.user.id;
    const { year, month, status, limit = 50 } = req.query;

    let query = supabase
      .from('payments')
      .select(`
        *,
        on_behalf_of:members!payments_on_behalf_of_fkey (
          full_name,
          membership_number
        )
      `)
      .eq('member_id', memberId)
      .order('date', { ascending: false })
      .limit(parseInt(limit));

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (year) {
      const startDate = new Date(year, month || 0, 1);
      const endDate = month
        ? new Date(year, parseInt(month) + 1, 0)
        : new Date(year, 11, 31);

      query = query.gte('date', startDate.toISOString())
                   .lte('date', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payments:', error);
      return res.status(500).json({ message: 'خطأ في جلب البيانات' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error in getMemberPayments:', error);
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
    const paymentData = {
      member_id: memberId,
      amount: parseFloat(amount),
      notes: notes || null,
      receipt_url: receipt_url || null,
      status: 'pending',
      date: new Date().toISOString(),
      on_behalf_of: on_behalf_of || null
    };

    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      return res.status(500).json({ message: 'خطأ في إنشاء الدفعة' });
    }

    res.status(201).json({
      message: 'تم إرسال الدفعة بنجاح',
      payment: data
    });
  } catch (error) {
    console.error('Error in createPayment:', error);
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

    // Search by name, phone, or membership number
    const { data, error } = await supabase
      .from('members')
      .select('id, full_name, membership_number, phone, tribal_section')
      .neq('id', currentUserId) // Exclude current user
      .or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,membership_number.ilike.%${searchQuery}%`)
      .limit(10);

    if (error) {
      console.error('Error searching members:', error);
      return res.status(500).json({ message: 'خطأ في البحث' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error in searchMembers:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// Get member notifications
export const getMemberNotifications = async (req, res) => {
  try {
    const memberId = req.user.id;
    const { type, limit = 50 } = req.query;

    let query = supabase
      .from('notifications')
      .select('*')
      .or(`member_id.eq.${memberId},member_id.is.null`) // Member-specific or global notifications
      .order('date', { ascending: false })
      .limit(parseInt(limit));

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ message: 'خطأ في جلب الإشعارات' });
    }

    // Check which notifications are read by this member
    const { data: readNotifications } = await supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('member_id', memberId);

    const readIds = new Set(readNotifications?.map(r => r.notification_id) || []);

    const notificationsWithReadStatus = (data || []).map(notification => ({
      ...notification,
      is_read: readIds.has(notification.id)
    }));

    res.json(notificationsWithReadStatus);
  } catch (error) {
    console.error('Error in getMemberNotifications:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const memberId = req.user.id;
    const { id: notificationId } = req.params;

    // Check if already marked as read
    const { data: existing } = await supabase
      .from('notification_reads')
      .select('id')
      .eq('member_id', memberId)
      .eq('notification_id', notificationId)
      .single();

    if (!existing) {
      // Create read record
      await supabase
        .from('notification_reads')
        .insert([{
          member_id: memberId,
          notification_id: notificationId,
          read_at: new Date().toISOString()
        }]);
    }

    res.json({ message: 'تم تحديد الإشعار كمقروء' });
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const memberId = req.user.id;

    // Get all unread notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('id')
      .or(`member_id.eq.${memberId},member_id.is.null`);

    if (!notifications || notifications.length === 0) {
      return res.json({ message: 'لا توجد إشعارات لتحديدها كمقروءة' });
    }

    // Get already read notifications
    const { data: alreadyRead } = await supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('member_id', memberId);

    const readIds = new Set(alreadyRead?.map(r => r.notification_id) || []);

    // Filter unread notifications
    const unreadNotifications = notifications.filter(n => !readIds.has(n.id));

    if (unreadNotifications.length > 0) {
      // Create read records for all unread
      const readRecords = unreadNotifications.map(n => ({
        member_id: memberId,
        notification_id: n.id,
        read_at: new Date().toISOString()
      }));

      await supabase
        .from('notification_reads')
        .insert(readRecords);
    }

    res.json({ message: 'تم تحديد جميع الإشعارات كمقروءة' });
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// Upload receipt
export const uploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم رفع أي ملف' });
    }

    const memberId = req.user.id;
    const file = req.file;
    const fileName = `receipts/${memberId}/${Date.now()}-${file.originalname}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('Error uploading receipt:', error);
      return res.status(500).json({ message: 'خطأ في رفع الإيصال' });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);

    res.json({
      message: 'تم رفع الإيصال بنجاح',
      url: publicUrl,
      fileName: fileName
    });
  } catch (error) {
    console.error('Error in uploadReceipt:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
};