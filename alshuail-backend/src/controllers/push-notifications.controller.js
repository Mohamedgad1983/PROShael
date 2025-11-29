/**
 * Push Notifications Controller
 * Handles FCM push notifications for Al-Shuail Mobile PWA
 * 
 * @module push-notifications.controller
 */

import { supabase } from '../config/supabase.js';
import { log } from '../utils/logger.js';
import firebaseAdmin from '../utils/firebase-admin.js';

/**
 * Send notification to a specific member
 * POST /api/notifications/push/send
 */
export const sendPushNotification = async (req, res) => {
  try {
    const { memberId, title, body, data = {}, icon } = req.body;

    if (!memberId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'memberId, title, and body are required'
      });
    }

    // Get member's device tokens
    const { data: tokens, error } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('member_id', memberId)
      .eq('is_active', true);

    if (error) {
      log.error('Error fetching device tokens:', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب بيانات الجهاز'
      });
    }

    if (!tokens || tokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'لا توجد أجهزة مسجلة لهذا العضو'
      });
    }

    // Send to all member's devices
    const tokenList = tokens.map(t => t.token);
    const result = await firebaseAdmin.sendMulticastNotification(
      tokenList,
      { title, body, icon },
      data
    );

    // Log notification
    await supabase.from('notification_logs').insert({
      member_id: memberId,
      title,
      body,
      data,
      status: result.success ? 'sent' : 'failed',
      success_count: result.successCount || 0,
      failure_count: result.failureCount || 0,
      sent_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'تم إرسال الإشعار بنجاح',
      data: result
    });

  } catch (error) {
    log.error('Push notification error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال الإشعار'
    });
  }
};

/**
 * Send notification to all members
 * POST /api/notifications/push/broadcast
 */
export const broadcastNotification = async (req, res) => {
  try {
    const { title, body, data = {}, icon, topic = 'all_members' } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'title and body are required'
      });
    }

    // Send via topic
    const result = await firebaseAdmin.sendTopicNotification(
      topic,
      { title, body, icon },
      data
    );

    // Log broadcast
    await supabase.from('notification_logs').insert({
      member_id: null,
      title,
      body,
      data,
      is_broadcast: true,
      topic,
      status: result.success ? 'sent' : 'failed',
      sent_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'تم إرسال الإشعار لجميع الأعضاء',
      data: result
    });

  } catch (error) {
    log.error('Broadcast notification error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال الإشعار'
    });
  }
};

/**
 * Register device token
 * POST /api/notifications/push/register
 */
export const registerDeviceToken = async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const memberId = req.user?.memberId || req.body.memberId;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Device token is required'
      });
    }

    // Check if token already exists
    const { data: existing } = await supabase
      .from('device_tokens')
      .select('id')
      .eq('token', token)
      .single();

    if (existing) {
      // Update existing token
      await supabase
        .from('device_tokens')
        .update({
          member_id: memberId,
          platform,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('token', token);
    } else {
      // Insert new token
      await supabase.from('device_tokens').insert({
        token,
        member_id: memberId,
        platform,
        is_active: true,
        created_at: new Date().toISOString()
      });
    }

    // Subscribe to all_members topic
    if (memberId) {
      await firebaseAdmin.subscribeToTopic([token], 'all_members');
    }

    res.json({
      success: true,
      message: 'تم تسجيل الجهاز بنجاح'
    });

  } catch (error) {
    log.error('Register device token error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الجهاز'
    });
  }
};

/**
 * Unregister device token
 * POST /api/notifications/push/unregister
 */
export const unregisterDeviceToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Device token is required'
      });
    }

    // Deactivate token
    await supabase
      .from('device_tokens')
      .update({ is_active: false })
      .eq('token', token);

    // Unsubscribe from topics
    await firebaseAdmin.unsubscribeFromTopic([token], 'all_members');

    res.json({
      success: true,
      message: 'تم إلغاء تسجيل الجهاز'
    });

  } catch (error) {
    log.error('Unregister device token error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في إلغاء تسجيل الجهاز'
    });
  }
};

/**
 * Send payment reminder notification
 * POST /api/notifications/push/payment-reminder
 */
export const sendPaymentReminder = async (req, res) => {
  try {
    const { memberId, amount, dueDate } = req.body;

    const title = 'تذكير بموعد السداد 💰';
    const body = `لديك اشتراك مستحق بقيمة ${amount} ريال. موعد السداد: ${dueDate}`;

    // Get member's tokens
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('member_id', memberId)
      .eq('is_active', true);

    if (!tokens || tokens.length === 0) {
      return res.json({
        success: false,
        message: 'لا توجد أجهزة مسجلة'
      });
    }

    const tokenList = tokens.map(t => t.token);
    const result = await firebaseAdmin.sendMulticastNotification(
      tokenList,
      { 
        title, 
        body,
        icon: '/icons/payment-icon.png',
        click_action: '/payment.html'
      },
      { type: 'payment_reminder', amount: String(amount), memberId }
    );

    res.json({
      success: true,
      message: 'تم إرسال التذكير',
      data: result
    });

  } catch (error) {
    log.error('Payment reminder error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال التذكير'
    });
  }
};

/**
 * Send event notification
 * POST /api/notifications/push/event
 */
export const sendEventNotification = async (req, res) => {
  try {
    const { eventTitle, eventDate, eventLocation } = req.body;

    const title = `📅 مناسبة جديدة: ${eventTitle}`;
    const body = `التاريخ: ${eventDate}\nالمكان: ${eventLocation}`;

    const result = await firebaseAdmin.sendTopicNotification(
      'all_members',
      { 
        title, 
        body,
        icon: '/icons/event-icon.png',
        click_action: '/events.html'
      },
      { type: 'event', eventTitle, eventDate }
    );

    res.json({
      success: true,
      message: 'تم إرسال إشعار المناسبة',
      data: result
    });

  } catch (error) {
    log.error('Event notification error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال الإشعار'
    });
  }
};

export default {
  sendPushNotification,
  broadcastNotification,
  registerDeviceToken,
  unregisterDeviceToken,
  sendPaymentReminder,
  sendEventNotification
};
