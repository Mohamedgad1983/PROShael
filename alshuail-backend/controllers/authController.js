import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/database.js';

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            phone: user.phone,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

// Login controller
const login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        // Validate input
        if (!phone || !password) {
            return res.status(400).json({
                status: 'error',
                message_ar: 'رقم الهاتف وكلمة المرور مطلوبان',
                message_en: 'Phone and password are required'
            });
        }

        console.log(`Attempting login for phone: ${phone}`);

        // Get user from database using Supabase
        const { data: user, error } = await supabase
            .from('members')
            .select('*')
            .eq('phone', phone)
            .eq('is_active', true)
            .single();

        if (error) {
            console.error('Database error during login:', error);
            return res.status(401).json({
                status: 'error',
                message_ar: 'رقم الهاتف أو كلمة المرور غير صحيحة',
                message_en: 'Invalid phone or password'
            });
        }

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message_ar: 'رقم الهاتف أو كلمة المرور غير صحيحة',
                message_en: 'Invalid phone or password'
            });
        }

        // Verify password
        if (!user.password_hash) {
            return res.status(401).json({
                status: 'error',
                message_ar: 'الرجاء التواصل مع الإدارة لتفعيل حسابك',
                message_en: 'Please contact admin to activate your account'
            });
        }

        // Compare with stored hash
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            // Increment login attempts
            await supabase
                .from('members')
                .update({
                    login_attempts: (user.login_attempts || 0) + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            return res.status(401).json({
                status: 'error',
                message_ar: 'رقم الهاتف أو كلمة المرور غير صحيحة',
                message_en: 'Invalid phone or password'
            });
        }

        // Reset login attempts on successful login
        await supabase
            .from('members')
            .update({
                login_attempts: 0,
                last_login: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        // Generate JWT token
        const token = generateToken(user);

        // Prepare user data (exclude sensitive information)
        const userData = {
            id: user.id,
            name: user.full_name,
            phone: user.phone,
            role: user.role,
            membership_number: user.membership_number,
            is_active: user.is_active
        };

        console.log(`Login successful for user: ${user.full_name} (${user.role})`);

        res.json({
            status: 'success',
            message_ar: 'تم تسجيل الدخول بنجاح',
            message_en: 'Login successful',
            data: {
                token,
                user: userData,
                expires_in: process.env.JWT_EXPIRES_IN || '24h'
            },
            requires_password_change: user.requires_password_change || false,
            is_first_login: user.is_first_login || false
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            status: 'error',
            message_ar: 'خطأ في تسجيل الدخول',
            message_en: 'Login error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        // req.user is set by authentication middleware
        const userData = {
            id: req.user.id,
            name: req.user.full_name,
            phone: req.user.phone,
            role: req.user.role,
            membership_number: req.user.membership_number,
            is_active: req.user.is_active
        };

        res.json({
            status: 'success',
            message_ar: 'تم جلب بيانات المستخدم بنجاح',
            message_en: 'User profile retrieved successfully',
            data: userData
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            status: 'error',
            message_ar: 'خطأ في جلب بيانات المستخدم',
            message_en: 'Error retrieving user profile'
        });
    }
};

// Logout (client-side token removal)
const logout = (req, res) => {
    res.json({
        status: 'success',
        message_ar: 'تم تسجيل الخروج بنجاح',
        message_en: 'Logout successful'
    });
};

// Verify token
const verifyToken = async (req, res) => {
    try {
        // Token verification is done by middleware
        res.json({
            status: 'success',
            message_ar: 'الرمز صحيح',
            message_en: 'Token is valid',
            data: {
                user: {
                    id: req.user.id,
                    name: req.user.full_name,
                    phone: req.user.phone,
                    role: req.user.role
                }
            }
        });
    } catch (error) {
        res.status(401).json({
            status: 'error',
            message_ar: 'رمز غير صحيح',
            message_en: 'Invalid token'
        });
    }
};

// Get table structure for development
const getTableStructure = async (req, res) => {
    try {
        // Try to get a sample record to see the structure
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .limit(1);

        res.json({
            status: 'success',
            message_ar: 'بنية الجدول',
            message_en: 'Table structure',
            data: {
                sample_record: data && data.length > 0 ? data[0] : null,
                record_count: data ? data.length : 0,
                error: error ? error.message : null
            }
        });

    } catch (error) {
        console.error('Get table structure error:', error);
        res.status(500).json({
            status: 'error',
            message_ar: 'خطأ في جلب بنية الجدول',
            message_en: 'Error getting table structure',
            error: error.message
        });
    }
};

// Change password controller
const changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!new_password) {
            return res.status(400).json({
                status: 'error',
                message_ar: 'كلمة المرور الجديدة مطلوبة',
                message_en: 'New password is required'
            });
        }

        // Password validation
        if (new_password.length < 8) {
            return res.status(400).json({
                status: 'error',
                message_ar: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
                message_en: 'Password must be at least 8 characters'
            });
        }

        // Get member
        const { data: member, error: fetchError } = await supabase
            .from('members')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError || !member) {
            return res.status(404).json({
                status: 'error',
                message_ar: 'العضو غير موجود',
                message_en: 'Member not found'
            });
        }

        // Verify current password (skip on first login)
        if (!member.is_first_login && current_password) {
            const isValidPassword = await bcrypt.compare(current_password, member.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    status: 'error',
                    message_ar: 'كلمة المرور الحالية غير صحيحة',
                    message_en: 'Current password is incorrect'
                });
            }
        }

        // Hash new password
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

        // Update password
        const { error: updateError } = await supabase
            .from('members')
            .update({
                password_hash: newPasswordHash,
                is_first_login: false,
                requires_password_change: false,
                password_changed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            throw updateError;
        }

        console.log(`Password changed successfully for member: ${member.full_name}`);

        res.json({
            status: 'success',
            message_ar: 'تم تغيير كلمة المرور بنجاح',
            message_en: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            status: 'error',
            message_ar: 'حدث خطأ في تغيير كلمة المرور',
            message_en: 'Error changing password',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export {
    login,
    getProfile,
    logout,
    verifyToken,
    getTableStructure,
    changePassword
};