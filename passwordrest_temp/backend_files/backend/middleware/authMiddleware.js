/**
 * =====================================================
 * AL-SHUAIL FAMILY FUND - AUTH MIDDLEWARE
 * =====================================================
 * JWT Authentication & Role-based Authorization
 * Date: December 20, 2024
 * =====================================================
 */

const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Authenticate JWT Token
 * Extracts token from Authorization header and verifies it
 */
const authenticateToken = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'التوكن مطلوب للوصول'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get fresh member data from database
        const result = await pool.query(
            `SELECT id, phone, full_name_ar, full_name_en, role, is_active
             FROM members WHERE id = $1`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'العضو غير موجود'
            });
        }

        const member = result.rows[0];

        // Check if member is still active
        if (!member.is_active) {
            return res.status(403).json({
                success: false,
                message: 'الحساب غير مفعل'
            });
        }

        // Attach member to request
        req.member = member;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'التوكن غير صالح'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'انتهت صلاحية التوكن. يرجى تسجيل الدخول مرة أخرى'
            });
        }

        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في التحقق'
        });
    }
};

/**
 * Require Super Admin Role
 * Must be used after authenticateToken
 */
const requireSuperAdmin = (req, res, next) => {
    if (!req.member) {
        return res.status(401).json({
            success: false,
            message: 'غير مصرح'
        });
    }

    if (req.member.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'هذه العملية تتطلب صلاحيات المدير الأعلى'
        });
    }

    next();
};

/**
 * Require Admin Role (admin or super_admin)
 * Must be used after authenticateToken
 */
const requireAdmin = (req, res, next) => {
    if (!req.member) {
        return res.status(401).json({
            success: false,
            message: 'غير مصرح'
        });
    }

    const adminRoles = ['admin', 'super_admin', 'financial_admin', 'family_admin'];
    
    if (!adminRoles.includes(req.member.role)) {
        return res.status(403).json({
            success: false,
            message: 'هذه العملية تتطلب صلاحيات الإدارة'
        });
    }

    next();
};

/**
 * Require Specific Role(s)
 * @param {string|string[]} roles - Required role(s)
 */
const requireRole = (roles) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    return (req, res, next) => {
        if (!req.member) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح'
            });
        }

        if (!allowedRoles.includes(req.member.role)) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لهذه العملية'
            });
        }

        next();
    };
};

/**
 * Optional Authentication
 * Attaches member if token exists, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const result = await pool.query(
            `SELECT id, phone, full_name_ar, full_name_en, role, is_active
             FROM members WHERE id = $1`,
            [decoded.id]
        );

        if (result.rows.length > 0 && result.rows[0].is_active) {
            req.member = result.rows[0];
        }

        next();
    } catch (error) {
        // Token invalid or expired, continue without auth
        next();
    }
};

module.exports = {
    authenticateToken,
    requireSuperAdmin,
    requireAdmin,
    requireRole,
    optionalAuth
};
