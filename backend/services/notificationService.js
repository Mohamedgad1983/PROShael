const axios = require('axios');
const supabase = require('../config/database');
const logger = require('../utils/logger');
const { formatHijriDate } = require('../utils/hijriDate');

// قوالب الإشعارات متعددة اللغات
const notificationTemplates = {
  // إشعارات التحويل البنكي
  bankTransferSubmitted: {
    admin: {
      ar: 'طلب موافقة: تحويل بنكي جديد بمبلغ {amount} ريال سعودي من العضو {memberName}. رقم الدفع: {paymentNumber}',
      en: 'Approval Request: New bank transfer of {amount} SAR from member {memberName}. Payment #: {paymentNumber}'
    }
  },

  // إشعارات الموافقة على الدفع
  paymentApproved: {
    member: {
      ar: 'تم قبول دفعتك بمبلغ {amount} ريال سعودي وتفعيل اشتراكك. رقم الدفع: {paymentNumber}',
      en: 'Your payment of {amount} SAR has been approved and your subscription activated. Payment #: {paymentNumber}'
    }
  },

  // إشعارات رفض الدفع
  paymentRejected: {
    member: {
      ar: 'تم رفض دفعتك بمبلغ {amount} ريال سعودي. السبب: {reason}. رقم الدفع: {paymentNumber}',
      en: 'Your payment of {amount} SAR has been rejected. Reason: {reason}. Payment #: {paymentNumber}'
    }
  },

  // إشعارات اكتمال الدفع
  paymentCompleted: {
    member: {
      ar: 'تم استلام دفعتك بمبلغ {amount} ريال سعودي بنجاح وتفعيل اشتراكك. رقم الدفع: {paymentNumber}',
      en: 'Payment of {amount} SAR received successfully and subscription activated. Payment #: {paymentNumber}'
    }
  },

  // إشعارات الدفع للآخرين
  paymentForOthersCompleted: {
    payer: {
      ar: 'تم استلام دفعتك بمبلغ {amount} ريال سعودي لصالح العضو {beneficiaryName} بنجاح. رقم الدفع: {paymentNumber}',
      en: 'Payment of {amount} SAR for member {beneficiaryName} completed successfully. Payment #: {paymentNumber}'
    },
    beneficiary: {
      ar: 'تم استلام دفعة بمبلغ {amount} ريال سعودي لاشتراكك من العضو {payerName}. رقم الدفع: {paymentNumber}',
      en: 'Payment of {amount} SAR for your subscription received from member {payerName}. Payment #: {paymentNumber}'
    }
  },

  // إشعارات انتهاء الاشتراك
  subscriptionExpiring: {
    member: {
      ar: 'تنبيه: اشتراكك سينتهي خلال {days} أيام. يُرجى تجديد الاشتراك لضمان استمرار الخدمة.',
      en: 'Warning: Your subscription will expire in {days} days. Please renew to continue service.'
    }
  },

  // إشعارات عامة
  general: {
    welcome: {
      ar: 'مرحباً بك في تطبيق الشعيل! تم تفعيل حسابك بنجاح.',
      en: 'Welcome to Al-Shuail App! Your account has been activated successfully.'
    }
  }
};

class NotificationService {

  constructor() {
    this.smsConfig = {
      apiKey: process.env.SMS_API_KEY,
      senderName: process.env.SMS_SENDER_NAME || 'Al-Shuail',
      apiUrl: process.env.SMS_API_URL,
      enabled: process.env.SMS_ENABLED === 'true'
    };
  }

  // إرسال رسالة SMS
  async sendSMS(phoneNumber, message, language = 'ar') {
    try {
      if (!this.smsConfig.enabled) {
        logger.info('SMS disabled, simulating send:', { phoneNumber, message });
        return {
          success: true,
          message: 'SMS simulation successful',
          messageId: `sim_${Date.now()}`
        };
      }

      if (!this.smsConfig.apiKey || !this.smsConfig.apiUrl) {
        throw new Error('SMS configuration missing');
      }

      // تنظيف رقم الهاتف
      const cleanPhone = this.cleanPhoneNumber(phoneNumber);

      // إعداد البيانات للإرسال
      const smsData = {
        api_key: this.smsConfig.apiKey,
        sender: this.smsConfig.senderName,
        to: cleanPhone,
        message: message,
        encoding: language === 'ar' ? 'unicode' : 'plain'
      };

      // إرسال الرسالة
      const response = await axios.post(this.smsConfig.apiUrl, smsData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      logger.info(`SMS sent successfully to ${cleanPhone}:`, response.data);

      return {
        success: true,
        message: 'SMS sent successfully',
        messageId: response.data.message_id || response.data.id,
        response: response.data
      };

    } catch (error) {
      logger.error('خطأ في إرسال SMS:', error);

      return {
        success: false,
        message: 'Failed to send SMS',
        error: error.message
      };
    }
  }

  // تنظيف رقم الهاتف
  cleanPhoneNumber(phone) {
    if (!phone) return '';

    // إزالة المسافات والرموز غير المرغوب فيها
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // إضافة رمز الكويت إذا كان الرقم يبدأ بـ 5
    if (cleaned.startsWith('5') && cleaned.length === 8) {
      cleaned = '965' + cleaned;
    }

    // إضافة + إذا لم تكن موجودة
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  // إشعار المديرين بالتحويل البنكي
  async notifyAdminsOfBankTransfer(paymentData, memberData) {
    try {
      // الحصول على قائمة المديرين والمسؤولين الماليين
      const { data: admins, error } = await supabase
        .from('members')
        .select('id, full_name, phone, role')
        .in('role', ['super_admin', 'admin', 'financial_manager'])
        .eq('status', 'active')
        .not('phone', 'is', null);

      if (error) {
        logger.error('خطأ في استرجاع قائمة المديرين:', error);
        throw error;
      }

      const template = notificationTemplates.bankTransferSubmitted.admin;
      const variables = {
        amount: paymentData.amount,
        memberName: memberData.full_name,
        paymentNumber: paymentData.payment_number
      };

      const results = [];

      // إرسال إشعار لكل مدير
      for (const admin of admins) {
        if (!admin.phone) continue;

        const message = this.replaceVariables(template.ar, variables);
        const messageEn = this.replaceVariables(template.en, variables);

        const smsResult = await this.sendSMS(admin.phone, message, 'ar');

        // حفظ الإشعار في قاعدة البيانات
        await this.saveNotification({
          recipient_id: admin.id,
          notification_type: 'bank_transfer_submitted',
          title: 'طلب موافقة تحويل بنكي',
          message: message,
          message_en: messageEn,
          payment_id: paymentData.id,
          sms_sent: smsResult.success,
          sms_message_id: smsResult.messageId
        });

        results.push({
          admin_id: admin.id,
          admin_name: admin.full_name,
          sms_result: smsResult
        });
      }

      logger.info(`تم إرسال ${results.length} إشعار للمديرين بالتحويل البنكي`);

      return {
        success: true,
        notifications_sent: results.length,
        results: results
      };

    } catch (error) {
      logger.error('خطأ في إشعار المديرين:', error);
      throw error;
    }
  }

  // إشعار العضو بالموافقة على الدفع
  async notifyMemberPaymentApproved(paymentData, memberData) {
    try {
      if (!memberData.phone) {
        logger.warn(`لا يوجد رقم هاتف للعضو ${memberData.full_name}`);
        return { success: false, message: 'No phone number for member' };
      }

      const template = notificationTemplates.paymentApproved.member;
      const variables = {
        amount: paymentData.amount,
        paymentNumber: paymentData.payment_number
      };

      const message = this.replaceVariables(template.ar, variables);
      const messageEn = this.replaceVariables(template.en, variables);

      const smsResult = await this.sendSMS(memberData.phone, message, 'ar');

      // حفظ الإشعار
      await this.saveNotification({
        recipient_id: memberData.id,
        notification_type: 'payment_approved',
        title: 'تم قبول الدفع',
        message: message,
        message_en: messageEn,
        payment_id: paymentData.id,
        sms_sent: smsResult.success,
        sms_message_id: smsResult.messageId
      });

      return smsResult;

    } catch (error) {
      logger.error('خطأ في إشعار العضو بالموافقة:', error);
      throw error;
    }
  }

  // إشعار العضو برفض الدفع
  async notifyMemberPaymentRejected(paymentData, memberData, reason = '') {
    try {
      if (!memberData.phone) {
        logger.warn(`لا يوجد رقم هاتف للعضو ${memberData.full_name}`);
        return { success: false, message: 'No phone number for member' };
      }

      const template = notificationTemplates.paymentRejected.member;
      const variables = {
        amount: paymentData.amount,
        paymentNumber: paymentData.payment_number,
        reason: reason || 'لم يتم توضيح السبب'
      };

      const message = this.replaceVariables(template.ar, variables);
      const messageEn = this.replaceVariables(template.en, variables);

      const smsResult = await this.sendSMS(memberData.phone, message, 'ar');

      // حفظ الإشعار
      await this.saveNotification({
        recipient_id: memberData.id,
        notification_type: 'payment_rejected',
        title: 'تم رفض الدفع',
        message: message,
        message_en: messageEn,
        payment_id: paymentData.id,
        sms_sent: smsResult.success,
        sms_message_id: smsResult.messageId
      });

      return smsResult;

    } catch (error) {
      logger.error('خطأ في إشعار العضو بالرفض:', error);
      throw error;
    }
  }

  // إشعار بالدفع للآخرين
  async notifyPaymentForOthers(paymentData, payerData, beneficiaryData) {
    try {
      const results = [];
      const template = notificationTemplates.paymentForOthersCompleted;

      // إشعار الدافع
      if (payerData.phone) {
        const payerVariables = {
          amount: paymentData.amount,
          beneficiaryName: beneficiaryData.full_name,
          paymentNumber: paymentData.payment_number
        };

        const payerMessage = this.replaceVariables(template.payer.ar, payerVariables);
        const payerMessageEn = this.replaceVariables(template.payer.en, payerVariables);

        const payerSmsResult = await this.sendSMS(payerData.phone, payerMessage, 'ar');

        await this.saveNotification({
          recipient_id: payerData.id,
          notification_type: 'payment_for_others_payer',
          title: 'تم استلام دفعتك للآخرين',
          message: payerMessage,
          message_en: payerMessageEn,
          payment_id: paymentData.id,
          sms_sent: payerSmsResult.success,
          sms_message_id: payerSmsResult.messageId
        });

        results.push({
          type: 'payer',
          member_id: payerData.id,
          result: payerSmsResult
        });
      }

      // إشعار المستفيد
      if (beneficiaryData.phone && beneficiaryData.id !== payerData.id) {
        const beneficiaryVariables = {
          amount: paymentData.amount,
          payerName: payerData.full_name,
          paymentNumber: paymentData.payment_number
        };

        const beneficiaryMessage = this.replaceVariables(template.beneficiary.ar, beneficiaryVariables);
        const beneficiaryMessageEn = this.replaceVariables(template.beneficiary.en, beneficiaryVariables);

        const beneficiarySmsResult = await this.sendSMS(beneficiaryData.phone, beneficiaryMessage, 'ar');

        await this.saveNotification({
          recipient_id: beneficiaryData.id,
          notification_type: 'payment_for_others_beneficiary',
          title: 'تم استلام دفعة لاشتراكك',
          message: beneficiaryMessage,
          message_en: beneficiaryMessageEn,
          payment_id: paymentData.id,
          sms_sent: beneficiarySmsResult.success,
          sms_message_id: beneficiarySmsResult.messageId
        });

        results.push({
          type: 'beneficiary',
          member_id: beneficiaryData.id,
          result: beneficiarySmsResult
        });
      }

      return {
        success: true,
        notifications_sent: results.length,
        results: results
      };

    } catch (error) {
      logger.error('خطأ في إشعار الدفع للآخرين:', error);
      throw error;
    }
  }

  // حفظ الإشعار في قاعدة البيانات
  async saveNotification(notificationData) {
    try {
      const { data, error } = await supabase
        .from('payment_notifications')
        .insert([{
          ...notificationData,
          created_at: new Date().toISOString(),
          hijri_created_at: formatHijriDate(new Date())
        }])
        .select('*')
        .single();

      if (error) {
        logger.error('خطأ في حفظ الإشعار:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('خطأ في حفظ الإشعار:', error);
      throw error;
    }
  }

  // استبدال المتغيرات في النص
  replaceVariables(template, variables) {
    let message = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), value);
    }

    return message;
  }

  // استرجاع إشعارات العضو
  async getMemberNotifications(memberId, filters = {}) {
    try {
      const { limit = 20, offset = 0, type } = filters;

      let query = supabase
        .from('payment_notifications')
        .select('*')
        .eq('recipient_id', memberId)
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('notification_type', type);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        logger.error('خطأ في استرجاع الإشعارات:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('خطأ في استرجاع إشعارات العضو:', error);
      throw error;
    }
  }

  // وضع علامة قراءة على الإشعار
  async markNotificationAsRead(notificationId, memberId) {
    try {
      const { data, error } = await supabase
        .from('payment_notifications')
        .update({
          read_at: new Date().toISOString(),
          hijri_read_at: formatHijriDate(new Date())
        })
        .eq('id', notificationId)
        .eq('recipient_id', memberId)
        .select('*')
        .single();

      if (error) {
        logger.error('خطأ في تحديث حالة الإشعار:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('خطأ في وضع علامة القراءة:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();