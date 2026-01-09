/**
 * =====================================================
 * AL-SHUAIL FAMILY FUND - AUTHENTICATION CONTROLLER
 * =====================================================
 * Handles: Password, OTP, Face ID authentication
 * Date: December 20, 2024
 * =====================================================
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { sendWhatsAppOTP } = require('../services/whatsappService');

// Constants
const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 3;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

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
    const result = await pool.query(
        `SELECT locked_until, failed_login_attempts 
         FROM members WHERE id = $1`,
        [memberId]
    );
    
    if (result.rows.length === 0) return { locked: false };
    
    const { locked_until, failed_login_attempts } = result.rows[0];
    
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
 * Log security action
 */
const logSecurityAction = async (memberId, actionType, performedBy = null, details = {}, ip = null) => {
    try {
        await pool.query(
            `SELECT log_security_action($1, $2, $3, $4, $5)`,
            [memberId, actionType, performedBy, JSON.stringify(details), ip]
        );
    } catch (error) {
        console.error('Error logging security action:', error);
    }
};

// =====================================================
// 1. LOGIN WITH PASSWORD
// =====================================================
exports.loginWithPassword = async (req, res) => {
    try {
        const { phone, password } = req.body;
        const ip = req.ip || req.connection.remoteAddress;

        // Validate input
        if (!phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'رقم الجوال وكلمة المرور مطلوبان'
            });
        }

        // Find member by phone
        const memberResult = await pool.query(
            `SELECT id, phone, full_name_ar, full_name_en, role, 
                    password_hash, has_password, is_active,
                    failed_login_attempts, locked_until
             FROM members 
             WHERE phone = $1`,
            [phone]
        );

        if (memberResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'رقم الجوال غير مسجل'
            });
        }

        const member = memberResult.rows[0];

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
            await pool.query(
                `SELECT handle_failed_login($1)`,
                [member.id]
            );
            
            await logSecurityAction(member.id, 'login_failed', null, { method: 'password' }, ip);

            const newLockStatus = await checkAccountLock(member.id);
            
            return res.status(401).json({
                success: false,
                message: 'كلمة المرور غير صحيحة',
                attemptsRemaining: MAX_LOGIN_ATTEMPTS - (newLockStatus.attempts || 0) - 1,
                locked: newLockStatus.locked
            });
        }

        // Successful login
        await pool.query(
            `SELECT handle_successful_login($1, $2)`,
            [member.id, 'password']
        );

        // Generate token
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
        console.error('Login with password error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تسجيل الدخول'
        });
    }
};

// =====================================================
// 2. REQUEST OTP (for login or password reset)
// =====================================================
exports.requestOTP = async (req, res) => {
    try {
        const { phone, purpose = 'login' } = req.body;
        // purpose: 'login' | 'password_reset' | 'first_login'

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'رقم الجوال مطلوب'
            });
        }

        // Find member
        const memberResult = await pool.query(
            `SELECT id, phone, full_name_ar, is_active, has_password
             FROM members WHERE phone = $1`,
            [phone]
        );

        if (memberResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'رقم الجوال غير مسجل في النظام'
            });
        }

        const member = memberResult.rows[0];

        if (!member.is_active) {
            return res.status(403).json({
                success: false,
                message: 'الحساب غير مفعل'
            });
        }

        // Check for existing unexpired OTP
        const existingOTP = await pool.query(
            `SELECT id, created_at FROM password_reset_tokens 
             WHERE phone = $1 AND is_used = FALSE AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [phone]
        );

        // Rate limiting - 1 OTP per minute
        if (existingOTP.rows.length > 0) {
            const lastOTP = existingOTP.rows[0];
            const timeSinceLastOTP = (new Date() - new Date(lastOTP.created_at)) / 1000;
            
            if (timeSinceLastOTP < 60) {
                return res.status(429).json({
                    success: false,
                    message: `انتظر ${Math.ceil(60 - timeSinceLastOTP)} ثانية قبل طلب رمز جديد`,
                    waitSeconds: Math.ceil(60 - timeSinceLastOTP)
                });
            }
        }

        // Generate OTP
        const otp = generateOTP();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

        // Save OTP to database
        await pool.query(
            `INSERT INTO password_reset_tokens 
             (member_id, phone, otp_code, otp_hash, expires_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [member.id, phone, otp, otpHash, expiresAt]
        );

        // Send OTP via WhatsApp
        const whatsappResult = await sendWhatsAppOTP(phone, otp, member.full_name_ar);

        if (!whatsappResult.success) {
            return res.status(500).json({
                success: false,
                message: 'فشل إرسال رمز التحقق. حاول مرة أخرى'
            });
        }

        // Log the action
        await logSecurityAction(
            member.id, 
            purpose === 'password_reset' ? 'password_reset_requested' : 'otp_requested',
            null,
            { purpose }
        );

        res.json({
            success: true,
            message: 'تم إرسال رمز التحقق إلى WhatsApp',
            expiresInMinutes: OTP_EXPIRY_MINUTES,
            // For first-time users
            requiresPasswordSetup: !member.has_password && purpose === 'login'
        });

    } catch (error) {
        console.error('Request OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في إرسال رمز التحقق'
        });
    }
};

// =====================================================
// 3. VERIFY OTP & LOGIN
// =====================================================
exports.verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        const ip = req.ip || req.connection.remoteAddress;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: 'رقم الجوال ورمز التحقق مطلوبان'
            });
        }

        // Find latest OTP for this phone
        const otpResult = await pool.query(
            `SELECT id, member_id, otp_hash, attempts, expires_at
             FROM password_reset_tokens
             WHERE phone = $1 AND is_used = FALSE AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [phone]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'رمز التحقق غير صالح أو منتهي الصلاحية'
            });
        }

        const otpRecord = otpResult.rows[0];

        // Check max attempts
        if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
            await pool.query(
                `UPDATE password_reset_tokens SET is_used = TRUE WHERE id = $1`,
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
            // Increment attempts
            await pool.query(
                `UPDATE password_reset_tokens 
                 SET attempts = attempts + 1 
                 WHERE id = $1`,
                [otpRecord.id]
            );

            return res.status(400).json({
                success: false,
                message: 'رمز التحقق غير صحيح',
                attemptsRemaining: MAX_OTP_ATTEMPTS - otpRecord.attempts - 1
            });
        }

        // Mark OTP as used
        await pool.query(
            `UPDATE password_reset_tokens 
             SET is_used = TRUE, used_at = NOW() 
             WHERE id = $1`,
            [otpRecord.id]
        );

        // Get member details
        const memberResult = await pool.query(
            `SELECT id, phone, full_name_ar, full_name_en, role, has_password
             FROM members WHERE id = $1`,
            [otpRecord.member_id]
        );

        const member = memberResult.rows[0];

        // Log successful login
        await pool.query(
            `SELECT handle_successful_login($1, $2)`,
            [member.id, 'otp']
        );

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
            // If first time, prompt to create password
            requiresPasswordSetup: !member.has_password
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في التحقق'
        });
    }
};

// =====================================================
// 4. CREATE PASSWORD (First time or after reset)
// =====================================================
exports.createPassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        const memberId = req.member.id; // From auth middleware
        const ip = req.ip;

        // Validate input
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

        // Password strength validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Check if updating or creating
        const memberResult = await pool.query(
            `SELECT has_password FROM members WHERE id = $1`,
            [memberId]
        );

        const isNewPassword = !memberResult.rows[0]?.has_password;

        // Update member
        await pool.query(
            `UPDATE members SET
                password_hash = $1,
                has_password = TRUE,
                password_updated_at = NOW(),
                failed_login_attempts = 0,
                locked_until = NULL
             WHERE id = $2`,
            [passwordHash, memberId]
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
        console.error('Create password error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في إنشاء كلمة المرور'
        });
    }
};

// =====================================================
// 5. RESET PASSWORD (After OTP verification)
// =====================================================
exports.resetPassword = async (req, res) => {
    try {
        const { phone, otp, newPassword, confirmPassword } = req.body;
        const ip = req.ip;

        // Validate input
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
        const otpResult = await pool.query(
            `SELECT id, member_id, otp_hash, attempts
             FROM password_reset_tokens
             WHERE phone = $1 AND is_used = FALSE AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [phone]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'رمز التحقق غير صالح أو منتهي الصلاحية'
            });
        }

        const otpRecord = otpResult.rows[0];
        const isValidOTP = await bcrypt.compare(otp, otpRecord.otp_hash);

        if (!isValidOTP) {
            await pool.query(
                `UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = $1`,
                [otpRecord.id]
            );
            return res.status(400).json({
                success: false,
                message: 'رمز التحقق غير صحيح'
            });
        }

        // Mark OTP as used
        await pool.query(
            `UPDATE password_reset_tokens SET is_used = TRUE, used_at = NOW() WHERE id = $1`,
            [otpRecord.id]
        );

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update member password
        await pool.query(
            `UPDATE members SET
                password_hash = $1,
                has_password = TRUE,
                password_updated_at = NOW(),
                failed_login_attempts = 0,
                locked_until = NULL
             WHERE id = $2`,
            [passwordHash, otpRecord.member_id]
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
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في إعادة تعيين كلمة المرور'
        });
    }
};

// =====================================================
// 6. LOGIN WITH FACE ID
// =====================================================
exports.loginWithFaceId = async (req, res) => {
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
        const memberResult = await pool.query(
            `SELECT id, phone, full_name_ar, full_name_en, role,
                    face_id_token, has_face_id, is_active
             FROM members WHERE id = $1`,
            [memberId]
        );

        if (memberResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'العضو غير موجود'
            });
        }

        const member = memberResult.rows[0];

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
        // In real implementation, this would verify the biometric token
        // For now, we compare the stored token
        const isValidToken = member.face_id_token === faceIdToken;

        if (!isValidToken) {
            await logSecurityAction(member.id, 'login_failed', null, { method: 'face_id' }, ip);
            return res.status(401).json({
                success: false,
                message: 'فشل التحقق من Face ID'
            });
        }

        // Successful login
        await pool.query(
            `SELECT handle_successful_login($1, $2)`,
            [member.id, 'face_id']
        );

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
        console.error('Face ID login error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تسجيل الدخول'
        });
    }
};

// =====================================================
// 7. ENABLE FACE ID
// =====================================================
exports.enableFaceId = async (req, res) => {
    try {
        const { faceIdToken } = req.body;
        const memberId = req.member.id;
        const ip = req.ip;

        if (!faceIdToken) {
            return res.status(400).json({
                success: false,
                message: 'رمز Face ID مطلوب'
            });
        }

        await pool.query(
            `UPDATE members SET
                face_id_token = $1,
                has_face_id = TRUE,
                face_id_enabled_at = NOW()
             WHERE id = $2`,
            [faceIdToken, memberId]
        );

        await logSecurityAction(memberId, 'face_id_enabled', memberId, {}, ip);

        res.json({
            success: true,
            message: 'تم تفعيل Face ID بنجاح'
        });

    } catch (error) {
        console.error('Enable Face ID error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في تفعيل Face ID'
        });
    }
};

// =====================================================
// 8. DISABLE FACE ID (by member)
// =====================================================
exports.disableFaceId = async (req, res) => {
    try {
        const memberId = req.member.id;
        const ip = req.ip;

        await pool.query(
            `UPDATE members SET
                face_id_token = NULL,
                has_face_id = FALSE,
                face_id_enabled_at = NULL
             WHERE id = $1`,
            [memberId]
        );

        await logSecurityAction(memberId, 'face_id_disabled', memberId, {}, ip);

        res.json({
            success: true,
            message: 'تم إلغاء Face ID بنجاح'
        });

    } catch (error) {
        console.error('Disable Face ID error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في إلغاء Face ID'
        });
    }
};

// =====================================================
// 9. ADMIN: DELETE PASSWORD (Super Admin only)
// =====================================================
exports.adminDeletePassword = async (req, res) => {
    try {
        const { memberId } = req.params;
        const adminId = req.member.id;
        const adminRole = req.member.role;
        const ip = req.ip;

        // Check if super admin
        if (adminRole !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بهذه العملية'
            });
        }

        // Get member info for logging
        const memberResult = await pool.query(
            `SELECT full_name_ar, phone FROM members WHERE id = $1`,
            [memberId]
        );

        if (memberResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'العضو غير موجود'
            });
        }

        const member = memberResult.rows[0];

        // Delete password
        await pool.query(
            `UPDATE members SET
                password_hash = NULL,
                has_password = FALSE,
                password_updated_at = NULL
             WHERE id = $1`,
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
        console.error('Admin delete password error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في حذف كلمة المرور'
        });
    }
};

// =====================================================
// 10. ADMIN: DELETE FACE ID (Super Admin only)
// =====================================================
exports.adminDeleteFaceId = async (req, res) => {
    try {
        const { memberId } = req.params;
        const adminId = req.member.id;
        const adminRole = req.member.role;
        const ip = req.ip;

        // Check if super admin
        if (adminRole !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بهذه العملية'
            });
        }

        // Get member info
        const memberResult = await pool.query(
            `SELECT full_name_ar, phone FROM members WHERE id = $1`,
            [memberId]
        );

        if (memberResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'العضو غير موجود'
            });
        }

        const member = memberResult.rows[0];

        // Delete Face ID
        await pool.query(
            `UPDATE members SET
                face_id_token = NULL,
                has_face_id = FALSE,
                face_id_enabled_at = NULL
             WHERE id = $1`,
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
        console.error('Admin delete Face ID error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في حذف Face ID'
        });
    }
};

// =====================================================
// 11. GET MEMBER SECURITY INFO (Super Admin only)
// =====================================================
exports.getMemberSecurityInfo = async (req, res) => {
    try {
        const { memberId } = req.params;
        const adminRole = req.member.role;

        // Check if super admin
        if (adminRole !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بهذه العملية'
            });
        }

        // Get security info
        const result = await pool.query(
            `SELECT 
                has_password,
                password_updated_at,
                has_face_id,
                face_id_enabled_at,
                failed_login_attempts,
                locked_until,
                last_login_at,
                last_login_method
             FROM members WHERE id = $1`,
            [memberId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'العضو غير موجود'
            });
        }

        const securityInfo = result.rows[0];

        // Get recent security logs
        const logsResult = await pool.query(
            `SELECT action_type, performed_by_name, created_at, details
             FROM security_audit_log
             WHERE member_id = $1
             ORDER BY created_at DESC
             LIMIT 10`,
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
            recentLogs: logsResult.rows
        });

    } catch (error) {
        console.error('Get security info error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب معلومات الأمان'
        });
    }
};
