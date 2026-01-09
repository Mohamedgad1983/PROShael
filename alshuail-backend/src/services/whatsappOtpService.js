/**
 * =====================================================
 * AL-SHUAIL FAMILY FUND - WHATSAPP OTP SERVICE
 * =====================================================
 * Send OTP via WhatsApp using Ultramsg API
 * Date: December 20, 2024
 * =====================================================
 */

import axios from 'axios';

// Ultramsg Configuration
const ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE_ID;
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN;
const ULTRAMSG_BASE_URL = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE}`;

/**
 * Format phone number for WhatsApp
 * Converts local format to international format
 * @param {string} phone - Phone number (e.g., "0501234567")
 * @returns {string} - International format (e.g., "966501234567")
 */
export const formatPhoneNumber = (phone) => {
    // Remove any spaces or special characters
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // If starts with 0, replace with 966 (Saudi Arabia)
    if (cleaned.startsWith('0')) {
        cleaned = '966' + cleaned.substring(1);
    }

    // If starts with +, remove it
    if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
    }

    // If doesn't start with country code, add 966
    if (!cleaned.startsWith('966') && !cleaned.startsWith('965')) {
        cleaned = '966' + cleaned;
    }

    return cleaned;
};

/**
 * Send OTP via WhatsApp
 * @param {string} phone - Recipient phone number
 * @param {string} otp - 6-digit OTP code
 * @param {string} memberName - Member's name for personalization
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendWhatsAppOTP = async (phone, otp, memberName = '') => {
    try {
        const formattedPhone = formatPhoneNumber(phone);

        // Compose message in Arabic
        const message = `🔐 *صندوق عائلة شعيل العنزي*

مرحباً ${memberName || 'بك'}،

رمز التحقق الخاص بك هو:
*${otp}*

⏰ صالح لمدة 5 دقائق فقط.

⚠️ لا تشارك هذا الرمز مع أي شخص.

━━━━━━━━━━━━━━━
Al-Shuail Family Fund
Your verification code: *${otp}*
Valid for 5 minutes only.`;

        // Send via Ultramsg
        const response = await axios.post(
            `${ULTRAMSG_BASE_URL}/messages/chat`,
            {
                token: ULTRAMSG_TOKEN,
                to: formattedPhone,
                body: message
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        // Check response
        if (response.data && response.data.sent === 'true') {
            console.log(`✅ OTP sent successfully to ${phone}`);
            return {
                success: true,
                message: 'تم إرسال رمز التحقق بنجاح'
            };
        } else {
            console.error('❌ WhatsApp send failed:', response.data);
            return {
                success: false,
                message: 'فشل إرسال الرسالة'
            };
        }

    } catch (error) {
        console.error('❌ WhatsApp service error:', error.message);

        if (error.response) {
            return {
                success: false,
                message: 'خدمة WhatsApp غير متاحة حالياً'
            };
        } else if (error.request) {
            return {
                success: false,
                message: 'تعذر الاتصال بخدمة WhatsApp'
            };
        } else {
            return {
                success: false,
                message: 'حدث خطأ في إرسال الرسالة'
            };
        }
    }
};

/**
 * Send Password Reset Notification
 * @param {string} phone - Recipient phone number
 * @param {string} memberName - Member's name
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendPasswordResetNotification = async (phone, memberName = '') => {
    try {
        const formattedPhone = formatPhoneNumber(phone);

        const message = `🔔 *صندوق عائلة شعيل العنزي*

مرحباً ${memberName || 'بك'}،

تم إعادة تعيين كلمة المرور الخاصة بك بواسطة المشرف.

يرجى تسجيل الدخول باستخدام OTP وإنشاء كلمة مرور جديدة.

━━━━━━━━━━━━━━━
Al-Shuail Family Fund`;

        const response = await axios.post(
            `${ULTRAMSG_BASE_URL}/messages/chat`,
            {
                token: ULTRAMSG_TOKEN,
                to: formattedPhone,
                body: message
            }
        );

        return {
            success: response.data?.sent === 'true',
            message: response.data?.sent === 'true' ? 'تم الإرسال' : 'فشل الإرسال'
        };

    } catch (error) {
        console.error('WhatsApp notification error:', error.message);
        return { success: false, message: 'فشل الإرسال' };
    }
};

/**
 * Send Welcome Message to New Member
 * @param {string} phone - Recipient phone number
 * @param {string} memberName - Member's name
 * @param {string} membershipId - Membership ID (e.g., SH-0001)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendWelcomeMessage = async (phone, memberName, membershipId) => {
    try {
        const formattedPhone = formatPhoneNumber(phone);

        const message = `🎉 *أهلاً بك في صندوق عائلة شعيل العنزي*

مرحباً ${memberName}،

تم تسجيلك بنجاح في صندوق العائلة! 🌟

📋 *معلوماتك:*
• رقم العضوية: *${membershipId}*
• الجوال: ${phone}

📱 *للدخول للتطبيق:*
1. افتح التطبيق
2. أدخل رقم جوالك
3. ستصلك رسالة تحقق
4. أنشئ كلمة مرور خاصة بك

نتشرف بانضمامك للعائلة! 🤝

━━━━━━━━━━━━━━━
Al-Shuail Family Fund
Welcome to the family!`;

        const response = await axios.post(
            `${ULTRAMSG_BASE_URL}/messages/chat`,
            {
                token: ULTRAMSG_TOKEN,
                to: formattedPhone,
                body: message
            }
        );

        return {
            success: response.data?.sent === 'true',
            message: response.data?.sent === 'true' ? 'تم الإرسال' : 'فشل الإرسال'
        };

    } catch (error) {
        console.error('WhatsApp welcome error:', error.message);
        return { success: false, message: 'فشل الإرسال' };
    }
};

/**
 * Check WhatsApp Service Status
 * @returns {Promise<{available: boolean, status: string}>}
 */
export const checkServiceStatus = async () => {
    try {
        const response = await axios.get(
            `${ULTRAMSG_BASE_URL}/instance/status`,
            {
                params: { token: ULTRAMSG_TOKEN }
            }
        );

        return {
            available: response.data?.status?.accountStatus === 'authenticated',
            status: response.data?.status?.accountStatus || 'unknown'
        };

    } catch (error) {
        return {
            available: false,
            status: 'error'
        };
    }
};
