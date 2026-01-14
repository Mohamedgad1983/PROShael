/**
 * OTP Authentication Routes
 * 
 * Handles WhatsApp OTP sending and verification
 * for mobile app authentication
 * 
 * Endpoints:
 * - POST /api/otp/send - Send OTP to phone
 * - POST /api/otp/verify - Verify OTP and login
 * - POST /api/otp/resend - Resend OTP
 * 
 * @author Al-Shuail Family System
 * @version 1.0.0
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../config/database.js';
import { config } from '../config/env.js';
import { log } from '../utils/logger.js';
import * as ultramsgService from '../services/ultramsgService.js';

const router = express.Router();

// In-memory OTP store (use Redis in production for scalability)
const otpStore = new Map();

// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

// Test mode: Use fixed OTP '123456' in development
const TEST_OTP = '123456';
const USE_TEST_OTP = config.isDevelopment || process.env.USE_TEST_OTP === 'true';

/**
 * Generate secure random OTP
 * @returns {string} 6-digit OTP
 */
function generateOTP() {
  // In test mode, always return fixed OTP
  if (USE_TEST_OTP) {
    return TEST_OTP;
  }
  
  // Generate cryptographically secure random number
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0);
  const otp = (num % 900000 + 100000).toString();
  return otp;
}

/**
 * Normalize phone number to standard format
 * @param {string} phone - Raw phone number
 * @returns {string} Normalized phone (e.g., 966501234567)
 */
function normalizePhone(phone) {
  let clean = phone.replace(/[\s\-\(\)\+]/g, '');
  
  // Handle Saudi numbers
  if (clean.startsWith('05') && clean.length === 10) {
    clean = '966' + clean.substring(1);
  }
  // Handle Kuwait numbers
  else if (clean.startsWith('9') && clean.length === 8) {
    clean = '965' + clean;
  }
  // Handle numbers starting with 00
  else if (clean.startsWith('00')) {
    clean = clean.substring(2);
  }
  
  return clean;
}

/**
 * Store OTP with expiry
 * @param {string} phone - Normalized phone number
 * @param {string} otp - Generated OTP
 */
function storeOTP(phone, otp) {
  const expiresAt = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);
  
  otpStore.set(phone, {
    otp,
    expiresAt,
    attempts: 0,
    createdAt: Date.now()
  });
  
  // Auto-cleanup after expiry
  setTimeout(() => {
    otpStore.delete(phone);
  }, OTP_EXPIRY_MINUTES * 60 * 1000 + 1000);
}

/**
 * Verify OTP
 * @param {string} phone - Normalized phone number
 * @param {string} otp - User-provided OTP
 * @returns {{valid: boolean, error?: string}}
 */
function verifyOTP(phone, otp) {
  const stored = otpStore.get(phone);
  
  if (!stored) {
    return { valid: false, error: 'رمز التحقق منتهي الصلاحية أو غير موجود' };
  }
  
  // Check expiry
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return { valid: false, error: 'رمز التحقق منتهي الصلاحية' };
  }
  
  // Check attempts
  if (stored.attempts >= OTP_MAX_ATTEMPTS) {
    otpStore.delete(phone);
    return { valid: false, error: 'تم تجاوز عدد المحاولات المسموح بها' };
  }
  
  // Verify OTP
  if (stored.otp !== otp) {
    stored.attempts++;
    return { 
      valid: false, 
      error: `رمز التحقق غير صحيح. المحاولات المتبقية: ${OTP_MAX_ATTEMPTS - stored.attempts}` 
    };
  }
  
  // OTP is valid - delete it (one-time use)
  otpStore.delete(phone);
  return { valid: true };
}

/**
 * Find member by phone number
 * @param {string} phone - Normalized phone number
 * @returns {Promise<Object|null>}
 */
async function findMemberByPhone(phone) {
  // Try different phone formats
  const phoneVariants = [
    phone,
    `+${phone}`,
    phone.startsWith('966') ? `0${phone.substring(3)}` : phone,
    phone.startsWith('965') ? phone.substring(3) : phone
  ];
  
  for (const variant of phoneVariants) {
    const { data, error } = await supabase
      .from('members')
      .select(`
        id, 
        full_name, 
        phone, 
        membership_number, 
        membership_status,
        balance,
        family_branch_id,
        created_at
      `)
      .or(`phone.eq.${variant},phone.eq.+${variant}`)
      .single();
    
    if (data && !error) {
      return data;
    }
  }
  
  return null;
}

/**
 * POST /api/otp/send
 * Send OTP to phone number
 */
router.post('/send', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مطلوب'
      });
    }
    
    const normalizedPhone = normalizePhone(phone);
    
    // OWASP: Apply rate limiting BEFORE checking member existence
    // Check cooldown (prevent spam) - applies to all requests
    const existing = otpStore.get(normalizedPhone);
    if (existing) {
      const timeSinceCreated = (Date.now() - existing.createdAt) / 1000;
      if (timeSinceCreated < OTP_RESEND_COOLDOWN_SECONDS) {
        const waitTime = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - timeSinceCreated);
        return res.status(429).json({
          success: false,
          message: `يرجى الانتظار ${waitTime} ثانية قبل إعادة الإرسال`,
          retryAfter: waitTime
        });
      }
    }

    // Check if member exists
    const member = await findMemberByPhone(normalizedPhone);

    // OWASP ASVS 2.5.2: Don't reveal if phone exists
    if (!member) {
      log.info('📱 OTP request for unregistered phone', {
        phone: normalizedPhone.substring(0, 4) + '****'
      });
      // Return success response but don't send OTP
      return res.json({
        success: true,
        message: 'إذا كان رقم الجوال مسجلاً، سيتم إرسال رمز التحقق',
        expiresIn: OTP_EXPIRY_MINUTES * 60
      });
    }

    // Check membership status - but don't reveal to user
    if (member.membership_status === 'suspended') {
      log.info('📱 OTP request for suspended member', { memberId: member.id });
      // OWASP: Return same message
      return res.json({
        success: true,
        message: 'إذا كان رقم الجوال مسجلاً، سيتم إرسال رمز التحقق',
        expiresIn: OTP_EXPIRY_MINUTES * 60
      });
    }

    // Generate and store OTP
    const otp = generateOTP();
    storeOTP(normalizedPhone, otp);

    // Send OTP via WhatsApp
    let sendResult = { success: false };

    if (ultramsgService.isConfigured()) {
      sendResult = await ultramsgService.sendOTP(normalizedPhone, otp);
    }

    // In development or if WhatsApp fails, still allow login with test OTP
    if (!sendResult.success && USE_TEST_OTP) {
      log.warn('⚠️ WhatsApp not configured - using test OTP mode');
      sendResult = { success: true, testMode: true };
    }

    if (!sendResult.success && !USE_TEST_OTP) {
      log.error('📱 WhatsApp send failed', { phone: normalizedPhone });
      // OWASP: Don't reveal WhatsApp failure
      return res.json({
        success: true,
        message: 'إذا كان رقم الجوال مسجلاً، سيتم إرسال رمز التحقق',
        expiresIn: OTP_EXPIRY_MINUTES * 60
      });
    }

    log.info('📱 OTP sent', {
      phone: normalizedPhone,
      memberId: member.id,
      testMode: USE_TEST_OTP
    });

    // OWASP: Use consistent message
    return res.json({
      success: true,
      message: USE_TEST_OTP
        ? 'تم إرسال رمز التحقق (وضع التجربة: 123456)'
        : 'إذا كان رقم الجوال مسجلاً، سيتم إرسال رمز التحقق',
      expiresIn: OTP_EXPIRY_MINUTES * 60,
      // In test mode only, include OTP in response
      ...(USE_TEST_OTP && { testOtp: TEST_OTP })
    });
    
  } catch (error) {
    log.error('❌ OTP send error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'خطأ في إرسال رمز التحقق'
    });
  }
});

/**
 * POST /api/otp/verify
 * Verify OTP and authenticate user
 */
router.post('/verify', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف ورمز التحقق مطلوبان'
      });
    }
    
    const normalizedPhone = normalizePhone(phone);
    
    // Verify OTP
    const verification = verifyOTP(normalizedPhone, otp);
    
    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: verification.error
      });
    }
    
    // Find member
    const member = await findMemberByPhone(normalizedPhone);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على العضو'
      });
    }
    
    // Get branch info
    let branchName = 'غير محدد';
    if (member.family_branch_id) {
      const { data: branch } = await supabase
        .from('family_branches')
        .select('branch_name')
        .eq('id', member.family_branch_id)
        .single();
      
      if (branch) {
        branchName = branch.branch_name;
      }
    }
    
    // Generate JWT token
    const tokenPayload = {
      id: member.id,
      phone: member.phone,
      role: 'member',
      membershipNumber: member.membership_number,
      fullName: member.full_name
    };
    
    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.memberTtl
    });
    
    log.info('✅ OTP verified - member logged in', {
      memberId: member.id,
      phone: normalizedPhone
    });
    
    return res.json({
      success: true,
      message: 'تم التحقق بنجاح',
      token,
      user: {
        id: member.id,
        name: member.full_name,
        phone: member.phone,
        membershipId: member.membership_number,
        membershipNumber: member.membership_number,
        balance: member.balance || 0,
        branchName,
        status: member.membership_status || 'active',
        joinDate: member.created_at,
        role: 'member'
      }
    });
    
  } catch (error) {
    log.error('❌ OTP verify error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق'
    });
  }
});

/**
 * POST /api/otp/resend
 * Resend OTP
 */
router.post('/resend', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مطلوب'
      });
    }
    
    const normalizedPhone = normalizePhone(phone);
    
    // Check cooldown
    const existing = otpStore.get(normalizedPhone);
    if (existing) {
      const timeSinceCreated = (Date.now() - existing.createdAt) / 1000;
      if (timeSinceCreated < OTP_RESEND_COOLDOWN_SECONDS) {
        const waitTime = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - timeSinceCreated);
        return res.status(429).json({
          success: false,
          message: `يرجى الانتظار ${waitTime} ثانية`,
          retryAfter: waitTime
        });
      }
    }
    
    // Delete old OTP and generate new
    otpStore.delete(normalizedPhone);

    // Check member exists - but don't reveal to user
    const member = await findMemberByPhone(normalizedPhone);
    if (!member) {
      log.info('📱 OTP resend for unregistered phone', {
        phone: normalizedPhone.substring(0, 4) + '****'
      });
      // OWASP: Return success but don't send
      return res.json({
        success: true,
        message: 'إذا كان رقم الجوال مسجلاً، سيتم إرسال رمز التحقق',
        expiresIn: OTP_EXPIRY_MINUTES * 60
      });
    }
    
    // Generate new OTP
    const otp = generateOTP();
    storeOTP(normalizedPhone, otp);
    
    // Send via WhatsApp
    let sendResult = { success: false };
    
    if (ultramsgService.isConfigured()) {
      sendResult = await ultramsgService.sendOTP(normalizedPhone, otp);
    }
    
    if (!sendResult.success && USE_TEST_OTP) {
      sendResult = { success: true, testMode: true };
    }
    
    if (!sendResult.success && !USE_TEST_OTP) {
      return res.status(500).json({
        success: false,
        message: 'فشل إعادة إرسال رمز التحقق'
      });
    }
    
    return res.json({
      success: true,
      message: 'تم إعادة إرسال رمز التحقق',
      expiresIn: OTP_EXPIRY_MINUTES * 60,
      ...(USE_TEST_OTP && { testOtp: TEST_OTP })
    });
    
  } catch (error) {
    log.error('❌ OTP resend error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'خطأ في إعادة الإرسال'
    });
  }
});

/**
 * GET /api/otp/status
 * Check WhatsApp service status (admin only)
 */
router.get('/status', async (req, res) => {
  try {
    const status = await ultramsgService.getStatus();
    
    return res.json({
      success: true,
      whatsapp: status,
      testMode: USE_TEST_OTP
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
