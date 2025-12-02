/**
 * Ultramsg WhatsApp Service
 * 
 * Easy WhatsApp API integration using Ultramsg.com
 * - No Docker or VPS setup required
 * - Just scan QR code once
 * - Unlimited messages for $39/month
 * 
 * Setup:
 * 1. Sign up at https://ultramsg.com
 * 2. Create an instance
 * 3. Scan QR code with WhatsApp
 * 4. Copy instance_id and token to .env
 * 
 * @author Al-Shuail Family System
 * @version 1.0.0
 */

import { config } from '../config/env.js';
import { log } from '../utils/logger.js';

const ULTRAMSG_BASE_URL = 'https://api.ultramsg.com';

/**
 * Send WhatsApp message via Ultramsg API
 * 
 * @param {string} to - Phone number (e.g., +966501234567 or 966501234567)
 * @param {string} body - Message text (supports Arabic)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendWhatsAppMessage(to, body) {
  if (!config.ultramsg.enabled) {
    log.warn('⚠️ Ultramsg not configured - WhatsApp message not sent');
    return {
      success: false,
      error: 'خدمة WhatsApp غير مفعلة'
    };
  }

  try {
    // Clean phone number - remove spaces, dashes, and ensure proper format
    let cleanPhone = to.replace(/[\s\-\(\)]/g, '');
    
    // Handle different phone formats
    if (cleanPhone.startsWith('0')) {
      // Local Saudi format: 05xxxxxxxx -> 9665xxxxxxxx
      cleanPhone = '966' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('+')) {
      // Remove + prefix
      cleanPhone = cleanPhone.substring(1);
    }
    
    // Ensure no + prefix for Ultramsg API
    cleanPhone = cleanPhone.replace(/^\+/, '');

    const url = `${ULTRAMSG_BASE_URL}/${config.ultramsg.instanceId}/messages/chat`;
    
    const formData = new URLSearchParams();
    formData.append('token', config.ultramsg.token);
    formData.append('to', cleanPhone);
    formData.append('body', body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const data = await response.json();

    if (data.sent === 'true' || data.sent === true || data.id) {
      log.info('✅ WhatsApp message sent via Ultramsg', { 
        to: cleanPhone,
        messageId: data.id 
      });
      
      return {
        success: true,
        messageId: data.id,
        status: 'sent'
      };
    } else {
      log.error('❌ Ultramsg API error', { 
        error: data.error || data.message || 'Unknown error',
        to: cleanPhone 
      });
      
      return {
        success: false,
        error: data.error || data.message || 'فشل إرسال الرسالة'
      };
    }

  } catch (error) {
    log.error('❌ Ultramsg request failed', { 
      error: error.message,
      to 
    });
    
    return {
      success: false,
      error: error.message || 'خطأ في الاتصال بخدمة WhatsApp'
    };
  }
}

/**
 * Send OTP via WhatsApp
 * 
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendOTP(phone, otp) {
  const message = `🔐 صندوق عائلة شعيل العنزي

رمز التحقق الخاص بك هو:
*${otp}*

⏱️ صالح لمدة 5 دقائق
⚠️ لا تشارك هذا الرمز مع أي شخص

━━━━━━━━━━━━━━━━
Shuail Al-Anzi Family Fund`;

  return sendWhatsAppMessage(phone, message);
}

/**
 * Send subscription reminder via WhatsApp
 * 
 * @param {string} phone - Phone number
 * @param {string} memberName - Member name
 * @param {number} amount - Amount due
 * @param {string} month - Month name (Arabic)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendSubscriptionReminder(phone, memberName, amount, month) {
  const message = `السلام عليكم ورحمة الله وبركاته 🌙

أخي الكريم / ${memberName}

نذكرك بأن اشتراك شهر *${month}* لم يتم سداده بعد.

💰 المبلغ المستحق: *${amount} ريال*

للدفع عبر التطبيق:
https://app.alshailfund.com/pay

━━━━━━━━━━━━━━━━
صندوق عائلة شعيل العنزي
Shuail Al-Anzi Family Fund`;

  return sendWhatsAppMessage(phone, message);
}

/**
 * Send payment confirmation via WhatsApp
 * 
 * @param {string} phone - Phone number
 * @param {string} memberName - Member name
 * @param {number} amount - Amount paid
 * @param {string} receiptNumber - Receipt number
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendPaymentConfirmation(phone, memberName, amount, receiptNumber) {
  const message = `✅ تأكيد الدفع

أخي الكريم / ${memberName}

تم استلام دفعتك بنجاح!

💰 المبلغ: *${amount} ريال*
🧾 رقم الإيصال: *${receiptNumber}*
📅 التاريخ: ${new Date().toLocaleDateString('ar-SA')}

شكراً لالتزامكم 🙏

━━━━━━━━━━━━━━━━
صندوق عائلة شعيل العنزي`;

  return sendWhatsAppMessage(phone, message);
}

/**
 * Send event notification via WhatsApp
 * 
 * @param {string} phone - Phone number
 * @param {string} eventTitle - Event title
 * @param {string} eventDate - Event date
 * @param {string} eventLocation - Event location
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendEventNotification(phone, eventTitle, eventDate, eventLocation) {
  const message = `📢 إعلان هام

${eventTitle}

📅 التاريخ: ${eventDate}
📍 المكان: ${eventLocation}

نتشرف بحضوركم 🌹

للتفاصيل:
https://app.alshailfund.com/events

━━━━━━━━━━━━━━━━
صندوق عائلة شعيل العنزي`;

  return sendWhatsAppMessage(phone, message);
}

/**
 * Send bulk messages to multiple recipients
 * 
 * @param {string[]} phones - Array of phone numbers
 * @param {string} message - Message text
 * @param {number} delayMs - Delay between messages (default: 1000ms)
 * @returns {Promise<{successCount: number, failureCount: number, results: Array}>}
 */
export async function sendBulkMessages(phones, message, delayMs = 1000) {
  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (const phone of phones) {
    const result = await sendWhatsAppMessage(phone, message);
    
    results.push({
      phone,
      ...result
    });

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }

    // Delay between messages to avoid rate limiting
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  log.info(`📊 Bulk WhatsApp: ${successCount} sent, ${failureCount} failed`);

  return {
    successCount,
    failureCount,
    results
  };
}

/**
 * Check if Ultramsg is configured and ready
 * 
 * @returns {boolean}
 */
export function isConfigured() {
  return config.ultramsg.enabled;
}

/**
 * Get service status
 * 
 * @returns {Promise<{success: boolean, status: string}>}
 */
export async function getStatus() {
  if (!config.ultramsg.enabled) {
    return {
      success: false,
      status: 'not_configured'
    };
  }

  try {
    const url = `${ULTRAMSG_BASE_URL}/${config.ultramsg.instanceId}/instance/status?token=${config.ultramsg.token}`;
    
    const response = await fetch(url);
    const data = await response.json();

    return {
      success: true,
      status: data.status?.accountStatus || 'unknown',
      phone: data.status?.phone || null
    };
  } catch (error) {
    return {
      success: false,
      status: 'error',
      error: error.message
    };
  }
}

export default {
  sendWhatsAppMessage,
  sendOTP,
  sendSubscriptionReminder,
  sendPaymentConfirmation,
  sendEventNotification,
  sendBulkMessages,
  isConfigured,
  getStatus
};
