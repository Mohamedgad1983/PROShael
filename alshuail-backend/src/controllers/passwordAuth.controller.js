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
import { supabase } from '../config/database.js';
import { sendWhatsAppOTP } from '../services/whatsappOtpService.js';

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
    const { data, error } = await supabase
        .from('members')
        .select('locked_until, failed_login_attempts')
        .eq('id', memberId)
        .single();

    if (error || !data) return { locked: false };

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
 * Log security action
 */
const logSecurityAction = async (memberId, actionType, performedBy = null, details = {}, ip = null) => {
    try {
        // Get member info
        const { data: member } = await supabase
            .from('members')
            .select('full_name_ar, phone')
            .eq('id', memberId)
            .single();

        let performerName = null;
        let performerRole = null;

        if (performedBy) {
            const { data: performer } = await supabase
                .from('members')
                .select('full_name_ar, role')
                .eq('id', performedBy)
                .single();
            if (performer) {
                performerName = performer.full_name_ar;
                performerRole = performer.role;
            }
        }

        await supabase.from('security_audit_log').insert({
            member_id: memberId,
            member_name: member?.full_name_ar,
            member_phone: member?.phone,
            action_type: actionType,
            performed_by: performedBy,
            performed_by_name: performerName,
            performed_by_role: performerRole,
            details,
            ip_address: ip
        });
    } catch (error) {
        console.error('Error logging security action:', error);
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

        // Find member by phone
        const { data: member, error } = await supabase
            .from('members')
            .select('id, phone, full_name_ar, full_name_en, role, password_hash, has_password, is_active, failed_login_attempts, locked_until')
            .eq('phone', phone)
            .single();

        if (error || !member) {
            return res.status(401).json({
                success: false,
                message: 'رقم الجوال غير مسجل'
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
            const updateData = { failed_login_attempts: newAttempts };

            if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
                updateData.locked_until = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000).toISOString();
                await logSecurityAction(member.id, 'account_locked', null, { reason: 'too_many_failed_attempts', attempts: newAttempts }, ip);
            }

            await supabase.from('members').update(updateData).eq('id', member.id);
            await logSecurityAction(member.id, 'login_failed', null, { method: 'password' }, ip);

            return res.status(401).json({
                success: false,
                message: 'كلمة المرور غير صحيحة',
                attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - newAttempts),
                locked: newAttempts >= MAX_LOGIN_ATTEMPTS
            });
        }

        // Successful login - reset counters
        await supabase.from('members').update({
            failed_login_attempts: 0,
            locked_until: null,
            last_login_at: new Date().toISOString(),
            last_login_method: 'password'
        }).eq('id', member.id);

        await logSecurityAction(member.id, 'login_success', member.id, { method: 'password' }, ip);

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
export const requestOTP = async (req, res) => {
    try {
        const { phone, purpose = 'login' } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'رقم الجوال مطلوب'
            });
        }

        // Find member
        const { data: member, error } = await supabase
            .from('members')
            .select('id, phone, full_name_ar, is_active, has_password')
            .eq('phone', phone)
            .single();

        if (error || !member) {
            return res.status(404).json({
                success: false,
                message: 'رقم الجوال غير مسجل في النظام'
            });
        }

        if (!member.is_active) {
            return res.status(403).json({
                success: false,
                message: 'الحساب غير مفعل'
            });
        }

        // Check for existing unexpired OTP - rate limiting
        const { data: existingOTP } = await supabase
            .from('password_reset_tokens')
            .select('id, created_at')
            .eq('phone', phone)
            .eq('is_used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

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

        // Generate OTP
        const otp = generateOTP();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

        // Save OTP to database
        await supabase.from('password_reset_tokens').insert({
            member_id: member.id,
            phone: phone,
            otp_code: otp,
            otp_hash: otpHash,
            expires_at: expiresAt.toISOString()
        });

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
        const { data: otpRecords, error } = await supabase
            .from('password_reset_tokens')
            .select('id, member_id, otp_hash, attempts, expires_at')
            .eq('phone', phone)
            .eq('is_used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        if (error || !otpRecords || otpRecords.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'رمز التحقق غير صالح أو منتهي الصلاحية'
            });
        }

        const otpRecord = otpRecords[0];

        // Check max attempts
        if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
            await supabase.from('password_reset_tokens')
                .update({ is_used: true })
                .eq('id', otpRecord.id);

            return res.status(400).json({
                success: false,
                message: 'تم تجاوز عدد المحاولات. اطلب رمز جديد'
            });
        }

        // Verify OTP
        const isValidOTP = await bcrypt.compare(otp, otpRecord.otp_hash);

        if (!isValidOTP) {
            await supabase.from('password_reset_tokens')
                .update({ attempts: otpRecord.attempts + 1 })
                .eq('id', otpRecord.id);

            return res.status(400).json({
                success: false,
                message: 'رمز التحقق غير صحيح',
                attemptsRemaining: MAX_OTP_ATTEMPTS - otpRecord.attempts - 1
            });
        }

        // Mark OTP as used
        await supabase.from('password_reset_tokens')
            .update({ is_used: true, used_at: new Date().toISOString() })
            .eq('id', otpRecord.id);

        // Get member details
        const { data: member } = await supabase
            .from('members')
            .select('id, phone, full_name_ar, full_name_en, role, has_password')
            .eq('id', otpRecord.member_id)
            .single();

        // Update login info
        await supabase.from('members').update({
            failed_login_attempts: 0,
            locked_until: null,
            last_login_at: new Date().toISOString(),
            last_login_method: 'otp'
        }).eq('id', member.id);

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
        const { data: memberData } = await supabase
            .from('members')
            .select('has_password')
            .eq('id', memberId)
            .single();

        const isNewPassword = !memberData?.has_password;

        // Update member
        await supabase.from('members').update({
            password_hash: passwordHash,
            has_password: true,
            password_updated_at: new Date().toISOString(),
            failed_login_attempts: 0,
            locked_until: null
        }).eq('id', memberId);

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
        const { data: otpRecords } = await supabase
            .from('password_reset_tokens')
            .select('id, member_id, otp_hash, attempts')
            .eq('phone', phone)
            .eq('is_used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        if (!otpRecords || otpRecords.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'رمز التحقق غير صالح أو منتهي الصلاحية'
            });
        }

        const otpRecord = otpRecords[0];
        const isValidOTP = await bcrypt.compare(otp, otpRecord.otp_hash);

        if (!isValidOTP) {
            await supabase.from('password_reset_tokens')
                .update({ attempts: otpRecord.attempts + 1 })
                .eq('id', otpRecord.id);

            return res.status(400).json({
                success: false,
                message: 'رمز التحقق غير صحيح'
            });
        }

        // Mark OTP as used
        await supabase.from('password_reset_tokens')
            .update({ is_used: true, used_at: new Date().toISOString() })
            .eq('id', otpRecord.id);

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update member password
        await supabase.from('members').update({
            password_hash: passwordHash,
            has_password: true,
            password_updated_at: new Date().toISOString(),
            failed_login_attempts: 0,
            locked_until: null
        }).eq('id', otpRecord.member_id);

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
        const { data: member, error } = await supabase
            .from('members')
            .select('id, phone, full_name_ar, full_name_en, role, face_id_token, has_face_id, is_active')
            .eq('id', memberId)
            .single();

        if (error || !member) {
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
        await supabase.from('members').update({
            failed_login_attempts: 0,
            locked_until: null,
            last_login_at: new Date().toISOString(),
            last_login_method: 'face_id'
        }).eq('id', member.id);

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

        await supabase.from('members').update({
            face_id_token: faceIdToken,
            has_face_id: true,
            face_id_enabled_at: new Date().toISOString()
        }).eq('id', memberId);

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
export const disableFaceId = async (req, res) => {
    try {
        const memberId = req.user.id;
        const ip = req.ip;

        await supabase.from('members').update({
            face_id_token: null,
            has_face_id: false,
            face_id_enabled_at: null
        }).eq('id', memberId);

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
        const { data: member, error } = await supabase
            .from('members')
            .select('full_name_ar, phone')
            .eq('id', memberId)
            .single();

        if (error || !member) {
            return res.status(404).json({
                success: false,
                message: 'العضو غير موجود'
            });
        }

        // Delete password
        await supabase.from('members').update({
            password_hash: null,
            has_password: false,
            password_updated_at: null
        }).eq('id', memberId);

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
        const { data: member, error } = await supabase
            .from('members')
            .select('full_name_ar, phone')
            .eq('id', memberId)
            .single();

        if (error || !member) {
            return res.status(404).json({
                success: false,
                message: 'العضو غير موجود'
            });
        }

        // Delete Face ID
        await supabase.from('members').update({
            face_id_token: null,
            has_face_id: false,
            face_id_enabled_at: null
        }).eq('id', memberId);

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
        const { data: securityInfo, error } = await supabase
            .from('members')
            .select('has_password, password_updated_at, has_face_id, face_id_enabled_at, failed_login_attempts, locked_until, last_login_at, last_login_method')
            .eq('id', memberId)
            .single();

        if (error || !securityInfo) {
            return res.status(404).json({
                success: false,
                message: 'العضو غير موجود'
            });
        }

        // Get recent security logs
        const { data: logs } = await supabase
            .from('security_audit_log')
            .select('action_type, performed_by_name, created_at, details')
            .eq('member_id', memberId)
            .order('created_at', { ascending: false })
            .limit(10);

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
        console.error('Get security info error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب معلومات الأمان'
        });
    }
};
