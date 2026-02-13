/**
 * =====================================================
 * AL-SHUAIL FAMILY FUND - PASSWORD AUTHENTICATION CONTROLLER
 * =====================================================
 * Handles: Password, OTP, Face ID authentication
 * Date: December 20, 2024
 * =====================================================
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../services/database.js';
import { sendWhatsAppOTP } from '../services/whatsappOtpService.js';
import { generateSecureOTP } from '../utils/secureOtp.js';
import { log } from '../utils/logger.js';

// Constants
const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 3;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

/**
 * Normalize phone number to international format
 * Handles Saudi (966) and Kuwait (965) numbers
 * @param {string} phone - Raw phone input
 * @returns {string} Normalized phone (e.g., 96551234567 or 966501234567)
 */
const normalizePhone = (phone) => {
    if (!phone) return '';

    // Remove all non-digit characters
    let clean = phone.replace(/[\s\-\(\)\+]/g, '');

    // Saudi Arabia: 05xxxxxxxx -> 966xxxxxxxx
    if (clean.startsWith('05') && clean.length === 10) {
        clean = '966' + clean.substring(1);
    }
    // Saudi Arabia: 5xxxxxxxx -> 9665xxxxxxxx
    else if (clean.startsWith('5') && clean.length === 9) {
        clean = '966' + clean;
    }
    // Kuwait: 5xxxxxxx or 6xxxxxxx or 9xxxxxxx (8 digits)
    else if (/^[569]\d{7}$/.test(clean)) {
        clean = '965' + clean;
    }
    // Already has country code
    else if (clean.startsWith('966') || clean.startsWith('965')) {
        // Already normalized
    }

    return clean;
};

// OTP generation now uses imported generateSecureOTP from utils/secureOtp.js
// which uses crypto.randomBytes() for cryptographic security

/**
 * Generate JWT Token
 */
const generateToken = (member) => {
    return jwt.sign(
        {
            id: member.id,
            phone: member.phone,
            role: member.role || 'member'
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

/**
 * Check if account is locked
 */
const checkAccountLock = async (memberId) => {
    const { rows } = await query(
        'SELECT locked_until, failed_login_attempts FROM members WHERE id = $1',
        [memberId]
    );

    const data = rows[0];
    if (!data) return { locked: false };

    const { locked_until, failed_login_attempts } = data;

    if (locked_until && new Date(locked_until) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(locked_until) - new Date()) / 60000);
        return {
            locked: true,
            remainingMinutes,
            message: `الحساب مقفل. حاول بعد ${remainingMinutes} دقيقة`
        };
    }

    return { locked: false, attempts: failed_login_attempts };
};

/**
 * Security Action Types for monitoring
 */
const SECURITY_ACTION_LEVELS = {
    // Info level - normal operations
    'login_success': 'info',
    'otp_requested': 'info',
    'password_created': 'info',
    'face_id_enabled': 'info',
    'face_id_disabled': 'info',

    // Warning level - potential issues
    'login_failed': 'warn',
    'otp_verification_failed': 'warn',
    'password_reset_requested': 'warn',

    // Error level - security events
    'account_locked': 'error',
    'password_deleted_by_admin': 'error',
    'face_id_deleted_by_admin': 'error',
    'password_changed': 'warn'
};

/**
 * Log security action with structured logging for metrics
 * @param {string} memberId - Member ID
 * @param {string} actionType - Type of security action
 * @param {string} performedBy - Who performed the action
 * @param {object} details - Additional details
 * @param {string} ip - IP address
 */
const logSecurityAction = async (memberId, actionType, performedBy = null, details = {}, ip = null) => {
    const timestamp = new Date().toISOString();
    const level = SECURITY_ACTION_LEVELS[actionType] || 'info';

    // Emit structured log for monitoring/alerting
    const logEntry = {
        timestamp,
        level,
        event: 'security_action',
        action_type: actionType,
        member_id: memberId,
        performed_by: performedBy,
        ip_address: ip,
        details
    };

    // Log in structured format for log aggregators
    if (level === 'error') {
        log.error('Security action', { security: logEntry });
    } else if (level === 'warn') {
        log.warn('Security action', { security: logEntry });
    } else {
        log.info('Security action', { security: logEntry });
    }

    try {
        // Get member info for database record
        let member = null;
        if (memberId) {
            const { rows: memberRows } = await query(
                'SELECT full_name_ar, phone FROM members WHERE id = $1',
                [memberId]
            );
            member = memberRows[0] || null;
        }

        let performerName = null;
        let performerRole = null;

        if (performedBy) {
            const { rows: performerRows } = await query(
                'SELECT full_name_ar, role FROM members WHERE id = $1',
                [performedBy]
            );
            const performer = performerRows[0];
            if (performer) {
                performerName = performer.full_name_ar;
                performerRole = performer.role;
            }
        }

        await query(
            `INSERT INTO security_audit_log
                (member_id, member_name, member_phone, action_type, performed_by, performed_by_name, performed_by_role, details, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                memberId,
                member?.full_name_ar || null,
                member?.phone || null,
                actionType,
                performedBy,
                performerName,
                performerRole,
                JSON.stringify({ ...details, log_level: level }),
                ip
            ]
        );
    } catch (error) {
        log.error('Security audit log database write failed', { error: error.message });
    }
};

// =====================================================
// 1. LOGIN WITH PASSWORD
// =====================================================
export const loginWithPassword = async (req, res) => {
    try {
        const { phone, password } = req.body;
        const ip = req.ip || req.connection?.remoteAddress;

        // Validate input
        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'رقم الجوال وكلمة المرور مطلوبان'
            });
        }

        // Normalize phone number to international format
        const normalizedPhone = normalizePhone(phone);

        // Find member by phone
        const { rows: memberRows } = await query(
            `SELECT id, phone, full_name_ar, full_name_en, role, password_hash, has_password,
                    is_active, failed_login_attempts, locked_until, must_change_password
             FROM members WHERE phone = $1`,
            [normalizedPhone]
        );
        const member = memberRows[0];

        // OWASP: Use generic message to prevent phone enumeration
        if (!member) {
            return res.status(401).json({
                success: false,
                message: 'بيانات الدخول غير صحيحة'
            });
        }

        // Check if member is active
        if (!member.is_active) {
            return res.status(403).json({
                success: false,
                message: 'الحساب غير مفعل. تواصل مع الإدارة'
            });
        }

        // Check if account is locked
        const lockStatus = await checkAccountLock(member.id);
        if (lockStatus.locked) {
            return res.status(423).json({
                success: false,
                message: lockStatus.message,
                locked: true,
                remainingMinutes: lockStatus.remainingMinutes
            });
        }

        // Check if member has password
        if (!member.has_password || !member.password_hash) {
            return res.status(400).json({
                success: false,
                message: 'لم يتم إنشاء كلمة مرور. استخدم تسجيل الدخول بـ OTP',
                requiresPasswordSetup: true
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, member.password_hash);

        if (!isValidPassword) {
            // Handle failed login
            const newAttempts = (member.failed_login_attempts || 0) + 1;

            if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
                const lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000).toISOString();
                await query(
                    'UPDATE members SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
                    [newAttempts, lockedUntil, member.id]
                );
                await logSecurityAction(member.id, 'account_locked', null, { reason: 'too_many_failed_attempts', attempts: newAttempts }, ip);
            } else {
                await query(
                    'UPDATE members SET failed_login_attempts = $1 WHERE id = $2',
                    [newAttempts, member.id]
                );
            }

            await logSecurityAction(member.id, 'login_failed', null, { method: 'password' }, ip);

            return res.status(401).json({
                success: false,
                message: 'كلمة المرور غير صحيحة',
                attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - newAttempts),
                locked: newAttempts >= MAX_LOGIN_ATTEMPTS
            });
        }

        // Successful login - reset counters
        await query(
            `UPDATE members
             SET failed_login_attempts = 0, locked_until = NULL,
                 last_login_at = $1, last_login_method = 'password'
             WHERE id = $2`,
            [new Date().toISOString(), member.id]
        );

        await logSecurityAction(member.id, 'login_success', member.id, { method: 'password' }, ip);

        // Generate token
        const token = generateToken(member);

        res.json({
            success: true,
            message: member.must_change_password
                ? 'يجب تغيير كلمة المرور'
                : 'تم تسجيل الدخول بنجاح',
            token,
            member: {
                id: member.id,
                phone: member.phone,
                fullNameAr: member.full_name_ar,
                fullNameEn: member.full_name_en,
                role: member.role
            },
            mustChangePassword: !!member.must_change_password
        });

    } catch (error) {
        log.error('Login with password failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تسجيل الدخول'
        });
    }
};

// =====================================================
// 1b. CHECK PASSWORD STATUS
// =====================================================
export const checkPasswordStatus = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'رقم الجوال مطلوب'
            });
        }

        // Find member by phone
        const { rows } = await query(
            'SELECT id, has_password, is_active FROM members WHERE phone = $1',
            [phone]
        );
        const member = rows[0];

        // OWASP: Don't reveal if phone exists - return consistent response
        if (!member) {
            return res.json({
                success: true,
                hasPassword: false,
                canUsePassword: false
            });
        }

        res.json({
            success: true,
            hasPassword: !!member.has_password,
            canUsePassword: member.is_active && member.has_password
        });

    } catch (error) {
        log.error('Check password status failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في التحقق'
        });
    }
};

// =====================================================
// 2. REQUEST OTP (for login or password reset)
// =====================================================
// OWASP ASVS 2.5.2: Returns identical response regardless of phone existence
// to prevent phone number enumeration attacks
export const requestOTP = async (req, res) => {
    try {
        const { phone, purpose = 'login' } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'رقم الجوال مطلوب'
            });
        }

        // OWASP: Always apply rate limiting regardless of phone existence
        // Check for existing unexpired OTP - rate limiting
        const { rows: existingOTP } = await query(
            `SELECT id, created_at FROM password_reset_tokens
             WHERE phone = $1 AND is_used = false AND expires_at > $2
             ORDER BY created_at DESC LIMIT 1`,
            [phone, new Date().toISOString()]
        );

        if (existingOTP && existingOTP.length > 0) {
            const lastOTP = existingOTP[0];
            const timeSinceLastOTP = (new Date() - new Date(lastOTP.created_at)) / 1000;

            if (timeSinceLastOTP < 60) {
                return res.status(429).json({
                    success: false,
                    message: `انتظر ${Math.ceil(60 - timeSinceLastOTP)} ثانية قبل طلب رمز جديد`,
                    waitSeconds: Math.ceil(60 - timeSinceLastOTP)
                });
            }
        }

        // Find member (but don't reveal if not found)
        const { rows: memberRows } = await query(
            'SELECT id, phone, full_name_ar, is_active, has_password FROM members WHERE phone = $1',
            [phone]
        );
        const member = memberRows[0];

        // OWASP: Log internally but don't reveal to user
        if (!member) {
            log.info('OTP request for unregistered phone', { phoneSuffix: phone.slice(-4) });
            // Return success response (but don't actually send OTP)
            return res.json({
                success: true,
                message: 'إذا كان رقم الجوال مسجلاً، سيتم إرسال رمز التحقق إلى WhatsApp',
                expiresInMinutes: OTP_EXPIRY_MINUTES
            });
        }

        if (!member.is_active) {
            log.info('OTP request for inactive account', { memberId: member.id });
            // OWASP: Return same message even for inactive accounts
            return res.json({
                success: true,
                message: 'إذا كان رقم الجوال مسجلاً، سيتم إرسال رمز التحقق إلى WhatsApp',
                expiresInMinutes: OTP_EXPIRY_MINUTES
            });
        }

        // Generate OTP using secure method
        const otp = generateSecureOTP();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

        // Save OTP to database (hash only, no plain text)
        await query(
            `INSERT INTO password_reset_tokens (member_id, phone, otp_hash, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [member.id, phone, otpHash, expiresAt.toISOString()]
        );

        // Send OTP via WhatsApp
        const whatsappResult = await sendWhatsAppOTP(phone, otp, member.full_name_ar);

        if (!whatsappResult.success) {
            log.error('WhatsApp OTP send failed', { error: whatsappResult.error });
            // OWASP: Don't reveal WhatsApp failure to user
            return res.json({
                success: true,
                message: 'إذا كان رقم الجوال مسجلاً، سيتم إرسال رمز التحقق إلى WhatsApp',
                expiresInMinutes: OTP_EXPIRY_MINUTES
            });
        }

        // Log the action
        await logSecurityAction(
            member.id,
            purpose === 'password_reset' ? 'password_reset_requested' : 'otp_requested',
            null,
            { purpose }
        );

        // OWASP: Use consistent message
        res.json({
            success: true,
            message: 'إذا كان رقم الجوال مسجلاً، سيتم إرسال رمز التحقق إلى WhatsApp',
            expiresInMinutes: OTP_EXPIRY_MINUTES
        });

    } catch (error) {
        log.error('Request OTP failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في إرسال رمز التحقق'
        });
    }
};

// =====================================================
// 3. VERIFY OTP & LOGIN
// =====================================================
export const verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        const ip = req.ip || req.connection?.remoteAddress;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: 'رقم الجوال ورمز التحقق مطلوبان'
            });
        }

        // Find latest OTP for this phone
        const { rows: otpRecords } = await query(
            `SELECT id, member_id, otp_hash, attempts, expires_at
             FROM password_reset_tokens
             WHERE phone = $1 AND is_used = false AND expires_at > $2
             ORDER BY created_at DESC LIMIT 1`,
            [phone, new Date().toISOString()]
        );

        if (!otpRecords || otpRecords.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'رمز التحقق غير صالح أو منتهي الصلاحية'
            });
        }

        const otpRecord = otpRecords[0];

        // Check max attempts
        if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
            await query(
                'UPDATE password_reset_tokens SET is_used = true WHERE id = $1',
                [otpRecord.id]
            );

            return res.status(400).json({
                success: false,
                message: 'تم تجاوز عدد المحاولات. اطلب رمز جديد'
            });
        }

        // Verify OTP
        const isValidOTP = await bcrypt.compare(otp, otpRecord.otp_hash);

        if (!isValidOTP) {
            await query(
                'UPDATE password_reset_tokens SET attempts = $1 WHERE id = $2',
                [otpRecord.attempts + 1, otpRecord.id]
            );

            return res.status(400).json({
                success: false,
                message: 'رمز التحقق غير صحيح',
                attemptsRemaining: MAX_OTP_ATTEMPTS - otpRecord.attempts - 1
            });
        }

        // Mark OTP as used
        await query(
            'UPDATE password_reset_tokens SET is_used = true, used_at = $1 WHERE id = $2',
            [new Date().toISOString(), otpRecord.id]
        );

        // Get member details
        const { rows: memberRows } = await query(
            'SELECT id, phone, full_name_ar, full_name_en, role, has_password FROM members WHERE id = $1',
            [otpRecord.member_id]
        );
        const member = memberRows[0];

        // Update login info
        await query(
            `UPDATE members
             SET failed_login_attempts = 0, locked_until = NULL,
                 last_login_at = $1, last_login_method = 'otp'
             WHERE id = $2`,
            [new Date().toISOString(), member.id]
        );

        await logSecurityAction(member.id, 'login_success', member.id, { method: 'otp' }, ip);

        // Generate token
        const token = generateToken(member);

        res.json({
            success: true,
            message: 'تم التحقق بنجاح',
            token,
            member: {
                id: member.id,
                phone: member.phone,
                fullNameAr: member.full_name_ar,
                fullNameEn: member.full_name_en,
                role: member.role
            },
            requiresPasswordSetup: !member.has_password
        });

    } catch (error) {
        log.error('Verify OTP failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في التحقق'
        });
    }
};

// =====================================================
// 4. CREATE PASSWORD (First time or after reset)
// =====================================================
export const createPassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        const memberId = req.user.id;
        const ip = req.ip;

        if (!password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'كلمة المرور وتأكيدها مطلوبان'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'كلمة المرور وتأكيدها غير متطابقان'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Check if updating or creating
        const { rows: memberRows } = await query(
            'SELECT has_password FROM members WHERE id = $1',
            [memberId]
        );
        const memberData = memberRows[0];

        const isNewPassword = !memberData?.has_password;

        // Update member - clear must_change_password flag
        await query(
            `UPDATE members
             SET password_hash = $1, has_password = true, must_change_password = false,
                 password_updated_at = $2, failed_login_attempts = 0, locked_until = NULL
             WHERE id = $3`,
            [passwordHash, new Date().toISOString(), memberId]
        );

        // Log action
        await logSecurityAction(
            memberId,
            isNewPassword ? 'password_created' : 'password_changed',
            memberId,
            {},
            ip
        );

        res.json({
            success: true,
            message: isNewPassword ? 'تم إنشاء كلمة المرور بنجاح' : 'تم تغيير كلمة المرور بنجاح'
        });

    } catch (error) {
        log.error('Create password failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في إنشاء كلمة المرور'
        });
    }
};

// =====================================================
// 5. RESET PASSWORD (After OTP verification)
// =====================================================
export const resetPassword = async (req, res) => {
    try {
        const { phone, otp, newPassword, confirmPassword } = req.body;
        const ip = req.ip;

        if (!phone || !otp || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'جميع الحقول مطلوبة'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'كلمة المرور الجديدة وتأكيدها غير متطابقان'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
            });
        }

        // Verify OTP first
        const { rows: otpRecords } = await query(
            `SELECT id, member_id, otp_hash, attempts
             FROM password_reset_tokens
             WHERE phone = $1 AND is_used = false AND expires_at > $2
             ORDER BY created_at DESC LIMIT 1`,
            [phone, new Date().toISOString()]
        );

        if (!otpRecords || otpRecords.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'رمز التحقق غير صالح أو منتهي الصلاحية'
            });
        }

        const otpRecord = otpRecords[0];
        const isValidOTP = await bcrypt.compare(otp, otpRecord.otp_hash);

        if (!isValidOTP) {
            await query(
                'UPDATE password_reset_tokens SET attempts = $1 WHERE id = $2',
                [otpRecord.attempts + 1, otpRecord.id]
            );

            return res.status(400).json({
                success: false,
                message: 'رمز التحقق غير صحيح'
            });
        }

        // Mark OTP as used
        await query(
            'UPDATE password_reset_tokens SET is_used = true, used_at = $1 WHERE id = $2',
            [new Date().toISOString(), otpRecord.id]
        );

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update member password
        await query(
            `UPDATE members
             SET password_hash = $1, has_password = true, password_updated_at = $2,
                 failed_login_attempts = 0, locked_until = NULL
             WHERE id = $3`,
            [passwordHash, new Date().toISOString(), otpRecord.member_id]
        );

        // Log action
        await logSecurityAction(
            otpRecord.member_id,
            'password_changed',
            otpRecord.member_id,
            { via: 'reset' },
            ip
        );

        res.json({
            success: true,
            message: 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن'
        });

    } catch (error) {
        log.error('Reset password failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في إعادة تعيين كلمة المرور'
        });
    }
};

// =====================================================
// 6. LOGIN WITH FACE ID
// =====================================================
export const loginWithFaceId = async (req, res) => {
    try {
        const { memberId, faceIdToken } = req.body;
        const ip = req.ip;

        if (!memberId || !faceIdToken) {
            return res.status(400).json({
                success: false,
                message: 'بيانات Face ID غير مكتملة'
            });
        }

        // Get member
        const { rows: memberRows } = await query(
            `SELECT id, phone, full_name_ar, full_name_en, role, face_id_token, has_face_id, is_active
             FROM members WHERE id = $1`,
            [memberId]
        );
        const member = memberRows[0];

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'العضو غير موجود'
            });
        }

        if (!member.is_active) {
            return res.status(403).json({
                success: false,
                message: 'الحساب غير مفعل'
            });
        }

        if (!member.has_face_id || !member.face_id_token) {
            return res.status(400).json({
                success: false,
                message: 'Face ID غير مفعل لهذا الحساب'
            });
        }

        // Verify Face ID token
        const isValidToken = member.face_id_token === faceIdToken;

        if (!isValidToken) {
            await logSecurityAction(member.id, 'login_failed', null, { method: 'face_id' }, ip);
            return res.status(401).json({
                success: false,
                message: 'فشل التحقق من Face ID'
            });
        }

        // Successful login
        await query(
            `UPDATE members
             SET failed_login_attempts = 0, locked_until = NULL,
                 last_login_at = $1, last_login_method = 'face_id'
             WHERE id = $2`,
            [new Date().toISOString(), member.id]
        );

        await logSecurityAction(member.id, 'login_success', member.id, { method: 'face_id' }, ip);

        const token = generateToken(member);

        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            token,
            member: {
                id: member.id,
                phone: member.phone,
                fullNameAr: member.full_name_ar,
                fullNameEn: member.full_name_en,
                role: member.role
            }
        });

    } catch (error) {
        log.error('Face ID login failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تسجيل الدخول'
        });
    }
};

// =====================================================
// 7. ENABLE FACE ID
// =====================================================
export const enableFaceId = async (req, res) => {
    try {
        const { faceIdToken } = req.body;
        const memberId = req.user.id;
        const ip = req.ip;

        if (!faceIdToken) {
            return res.status(400).json({
                success: false,
                message: 'رمز Face ID مطلوب'
            });
        }

        await query(
            `UPDATE members
             SET face_id_token = $1, has_face_id = true, face_id_enabled_at = $2
             WHERE id = $3`,
            [faceIdToken, new Date().toISOString(), memberId]
        );

        await logSecurityAction(memberId, 'face_id_enabled', memberId, {}, ip);

        res.json({
            success: true,
            message: 'تم تفعيل Face ID بنجاح'
        });

    } catch (error) {
        log.error('Enable Face ID failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تفعيل Face ID'
        });
    }
};

// =====================================================
// 8. DISABLE FACE ID (by member)
// =====================================================
export const disableFaceId = async (req, res) => {
    try {
        const memberId = req.user.id;
        const ip = req.ip;

        await query(
            `UPDATE members
             SET face_id_token = NULL, has_face_id = false, face_id_enabled_at = NULL
             WHERE id = $1`,
            [memberId]
        );

        await logSecurityAction(memberId, 'face_id_disabled', memberId, {}, ip);

        res.json({
            success: true,
            message: 'تم إلغاء Face ID بنجاح'
        });

    } catch (error) {
        log.error('Disable Face ID failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في إلغاء Face ID'
        });
    }
};

// =====================================================
// 9. ADMIN: DELETE PASSWORD (Super Admin only)
// =====================================================
export const adminDeletePassword = async (req, res) => {
    try {
        const { memberId } = req.params;
        const adminId = req.user.id;
        const adminRole = req.user.role;
        const ip = req.ip;

        if (adminRole !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بهذه العملية'
            });
        }

        // Get member info
        const { rows: memberRows } = await query(
            'SELECT full_name_ar, phone FROM members WHERE id = $1',
            [memberId]
        );
        const member = memberRows[0];

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'العضو غير موجود'
            });
        }

        // Delete password
        await query(
            'UPDATE members SET password_hash = NULL, has_password = false, password_updated_at = NULL WHERE id = $1',
            [memberId]
        );

        // Log action
        await logSecurityAction(
            memberId,
            'password_deleted_by_admin',
            adminId,
            { member_name: member.full_name_ar, member_phone: member.phone },
            ip
        );

        res.json({
            success: true,
            message: `تم حذف كلمة المرور للعضو ${member.full_name_ar}`
        });

    } catch (error) {
        log.error('Admin delete password failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في حذف كلمة المرور'
        });
    }
};

// =====================================================
// 10. ADMIN: DELETE FACE ID (Super Admin only)
// =====================================================
export const adminDeleteFaceId = async (req, res) => {
    try {
        const { memberId } = req.params;
        const adminId = req.user.id;
        const adminRole = req.user.role;
        const ip = req.ip;

        if (adminRole !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بهذه العملية'
            });
        }

        // Get member info
        const { rows: memberRows } = await query(
            'SELECT full_name_ar, phone FROM members WHERE id = $1',
            [memberId]
        );
        const member = memberRows[0];

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'العضو غير موجود'
            });
        }

        // Delete Face ID
        await query(
            'UPDATE members SET face_id_token = NULL, has_face_id = false, face_id_enabled_at = NULL WHERE id = $1',
            [memberId]
        );

        // Log action
        await logSecurityAction(
            memberId,
            'face_id_deleted_by_admin',
            adminId,
            { member_name: member.full_name_ar, member_phone: member.phone },
            ip
        );

        res.json({
            success: true,
            message: `تم حذف Face ID للعضو ${member.full_name_ar}`
        });

    } catch (error) {
        log.error('Admin delete Face ID failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في حذف Face ID'
        });
    }
};

// =====================================================
// 11. GET MEMBER SECURITY INFO (Super Admin only)
// =====================================================
export const getMemberSecurityInfo = async (req, res) => {
    try {
        const { memberId } = req.params;
        const adminRole = req.user.role;

        if (adminRole !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بهذه العملية'
            });
        }

        // Get security info
        const { rows: securityRows } = await query(
            `SELECT has_password, password_updated_at, has_face_id, face_id_enabled_at,
                    failed_login_attempts, locked_until, last_login_at, last_login_method
             FROM members WHERE id = $1`,
            [memberId]
        );
        const securityInfo = securityRows[0];

        if (!securityInfo) {
            return res.status(404).json({
                success: false,
                message: 'العضو غير موجود'
            });
        }

        // Get recent security logs
        const { rows: logs } = await query(
            `SELECT action_type, performed_by_name, created_at, details
             FROM security_audit_log
             WHERE member_id = $1
             ORDER BY created_at DESC LIMIT 10`,
            [memberId]
        );

        res.json({
            success: true,
            security: {
                password: {
                    enabled: securityInfo.has_password,
                    lastUpdated: securityInfo.password_updated_at
                },
                faceId: {
                    enabled: securityInfo.has_face_id,
                    enabledAt: securityInfo.face_id_enabled_at
                },
                account: {
                    failedAttempts: securityInfo.failed_login_attempts,
                    lockedUntil: securityInfo.locked_until,
                    lastLogin: securityInfo.last_login_at,
                    lastLoginMethod: securityInfo.last_login_method
                }
            },
            recentLogs: logs || []
        });

    } catch (error) {
        log.error('Get security info failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب معلومات الأمان'
        });
    }
};

// =====================================================
// 12. ADMIN: SET DEFAULT PASSWORD FOR MEMBERS
// =====================================================
/**
 * Set default password "123456" for all members or specific member
 * Members will be required to change password on first login
 */
export const adminSetDefaultPassword = async (req, res) => {
    try {
        const { memberId, allMembers } = req.body;
        const adminId = req.user.id;
        const adminRole = req.user.role;
        const ip = req.ip;

        if (adminRole !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بهذه العملية'
            });
        }

        // Default password
        const DEFAULT_PASSWORD = '123456';
        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

        let updatedCount = 0;

        if (allMembers === true) {
            // Set default password for ALL members (except admin)
            const result = await query(
                `UPDATE members
                 SET password_hash = $1, has_password = true, must_change_password = true,
                     password_updated_at = $2
                 WHERE id != $3`,
                [passwordHash, new Date().toISOString(), adminId]
            );

            // Count updated members
            const { rows: countRows } = await query(
                'SELECT COUNT(*) as count FROM members WHERE has_password = true AND must_change_password = true'
            );

            updatedCount = parseInt(countRows[0].count) || 0;

            await logSecurityAction(
                null,
                'default_password_set_all',
                adminId,
                { count: updatedCount, default_password: '123456' },
                ip
            );

        } else if (memberId) {
            // Set default password for specific member
            const { rows: memberRows } = await query(
                'SELECT id, full_name_ar, phone FROM members WHERE id = $1',
                [memberId]
            );
            const member = memberRows[0];

            if (!member) {
                return res.status(404).json({
                    success: false,
                    message: 'العضو غير موجود'
                });
            }

            await query(
                `UPDATE members
                 SET password_hash = $1, has_password = true, must_change_password = true,
                     password_updated_at = $2
                 WHERE id = $3`,
                [passwordHash, new Date().toISOString(), memberId]
            );

            updatedCount = 1;

            await logSecurityAction(
                memberId,
                'default_password_set',
                adminId,
                { member_name: member.full_name_ar, default_password: '123456' },
                ip
            );

        } else {
            return res.status(400).json({
                success: false,
                message: 'يجب تحديد العضو أو تفعيل allMembers'
            });
        }

        res.json({
            success: true,
            message: `تم تعيين كلمة المرور الافتراضية لـ ${updatedCount} عضو`,
            updatedCount,
            defaultPassword: DEFAULT_PASSWORD,
            note: 'سيُطلب من الأعضاء تغيير كلمة المرور عند أول تسجيل دخول'
        });

    } catch (error) {
        log.error('Set default password failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تعيين كلمة المرور الافتراضية'
        });
    }
};
