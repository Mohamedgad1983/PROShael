import jwt from 'jsonwebtoken';
import { supabase } from '../src/config/database.js';
import { config } from '../src/config/env.js';

// Authentication middleware - Supports both httpOnly cookies and Authorization header
const authenticate = async (req, res, next) => {
    try {
        // Try to get token from cookie first (httpOnly - XSS-safe), then fallback to Authorization header
        let token = req.cookies?.auth_token;
        const authHeader = req.header('Authorization');

        if (!token && authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.replace('Bearer ', '');
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'رمز الوصول مطلوب',
                message_en: 'Access token required'
            });
        }

        // Use centralized JWT configuration
        const decoded = jwt.verify(token, config.jwt.secret);

        // Check if it's a member or admin based on the role in token
        let user;
        let error;

        if (decoded.role === 'member') {
            // For members, check in members table
            const { data: member, error: memberError } = await supabase
                .from('members')
                .select('*')
                .eq('id', decoded.id)
                .single();

            if (memberError || !member) {
                console.log(`[Auth] Member not found in database: ${decoded.id}`);
                // Still allow the request with token data for backward compatibility
                req.user = {
                    id: decoded.id,
                    role: decoded.role,
                    phone: decoded.phone,
                    fullName: decoded.fullName,
                    membershipNumber: decoded.membershipNumber
                };
            } else {
                // Check membership_status
                if (member.membership_status && member.membership_status !== 'active') {
                    console.log(`[Auth] Member is not active: ${member.membership_status}`);
                }
                req.user = {
                    ...member,
                    role: 'member',
                    id: member.id
                };
            }
        } else {
            // For admins/other roles, check in users table
            const { data: adminUser, error: adminError } = await supabase
                .from('users')
                .select('*')
                .eq('id', decoded.id)
                .eq('is_active', true)
                .single();

            if (adminError || !adminUser) {
                return res.status(401).json({
                    success: false,
                    message: 'المستخدم غير موجود أو غير نشط',
                    message_en: 'User not found or inactive'
                });
            }
            req.user = adminUser;
        }
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
        // Try to get token from cookie first, then fallback to Authorization header
        let token = req.cookies?.auth_token;
        const authHeader = req.header('Authorization');

        if (!token && authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.replace('Bearer ', '');
        }

        if (token) {
            // Use centralized JWT configuration
            const decoded = jwt.verify(token, config.jwt.secret);

            let user;
            let error;

            if (decoded.role === 'member') {
                ({ data: user, error } = await supabase
                    .from('members')
                    .select('*')
                    .eq('id', decoded.id)
                    .single());

                // Check membership_status instead of is_active for members
                if (user && user.membership_status && user.membership_status !== 'active') {
                    user = null;
                }
            } else {
                ({ data: user, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', decoded.id)
                    .eq('is_active', true)
                    .single());
            }

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

export {
    authenticate,
    authorize,
    optionalAuth
};