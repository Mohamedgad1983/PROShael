const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/database');

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
            .from('temp_members')
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

        // For development, if no password hash exists, create one
        let passwordMatch = false;

        if (!user.password_hash) {
            // For development - set default password "123456"
            if (password === '123456' || password === 'admin') {
                passwordMatch = true;

                // Hash and update password in database for future use
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                const { error: updateError } = await supabase
                    .from('temp_members')
                    .update({ password_hash: hashedPassword })
                    .eq('id', user.id);

                if (updateError) {
                    console.error('Error updating password hash:', updateError);
                }
            }
        } else {
            // Compare with stored hash
            passwordMatch = await bcrypt.compare(password, user.password_hash);
        }

        if (!passwordMatch) {
            return res.status(401).json({
                status: 'error',
                message_ar: 'رقم الهاتف أو كلمة المرور غير صحيحة',
                message_en: 'Invalid phone or password'
            });
        }

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
            }
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
        const { supabase } = require('../config/database');

        // Try to get a sample record to see the structure
        const { data, error } = await supabase
            .from('temp_members')
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

module.exports = {
    login,
    getProfile,
    logout,
    verifyToken,
    getTableStructure
};