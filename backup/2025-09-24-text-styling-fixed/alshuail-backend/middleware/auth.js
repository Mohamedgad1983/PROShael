const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');

// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'رمز الوصول مطلوب',
                message_en: 'Access token required'
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database using Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.id)
            .eq('is_active', true)
            .single();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير موجود أو غير نشط',
                message_en: 'User not found or inactive'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'رمز وصول غير صحيح',
                message_en: 'Invalid access token'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'رمز الوصول منتهي الصلاحية',
                message_en: 'Access token expired'
            });
        }
        
        console.error('Auth error:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في التحقق من الهوية',
            message_en: 'Authentication error'
        });
    }
};

// Authorization middleware
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح بالوصول',
                message_en: 'Unauthorized access'
            });
        }

        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول لهذا المحتوى',
                message_en: 'Insufficient permissions',
                required_roles: roles,
                user_role: req.user.role
            });
        }

        next();
    };
};

// Optional authentication (for public endpoints with user context)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', decoded.id)
                .eq('is_active', true)
                .single();

            if (!error && user) {
                req.user = user;
            }
        }
        
        next();
    } catch (error) {
        // Ignore auth errors in optional auth
        next();
    }
};

module.exports = { 
    authenticate, 
    authorize, 
    optionalAuth 
};
