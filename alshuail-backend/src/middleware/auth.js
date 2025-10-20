import jwt from 'jsonwebtoken';
import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

// Export both names for compatibility
// eslint-disable-next-line require-await
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    log.auth(`Auth request`, `${req.path} - Token: ${token ? 'Present' : 'Missing'}`);

    if (!token) {
      log.debug('No token provided');
      // Allow access without token for read-only dashboard endpoints
      if (req.originalUrl.includes('member-monitoring') || req.originalUrl.includes('dashboard/stats')) {
        log.info('Allowing public access to read-only dashboard endpoint');
        req.user = { id: 'public-access', role: 'viewer' };
        return next();
      }
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    // CRITICAL: Use consistent JWT_SECRET across all files
    const jwtSecret = config.jwt.secret;

    // Verify JWT token with better error handling
    jwt.verify(token, jwtSecret, async (err, decoded) => {
      if (err) {
        log.error('Token verification failed', { error: err.message });

        // Provide specific error messages
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: 'Token expired',
            message: 'Your session has expired. Please login again.'
          });
        }

        if (err.name === 'JsonWebTokenError') {
          // Allow access even with malformed token for read-only dashboard endpoints
          if (req.originalUrl.includes('member-monitoring') || req.originalUrl.includes('dashboard/stats')) {
            log.info('Allowing public access with malformed token for read-only endpoint');
            req.user = { id: 'public-access', role: 'viewer' };
            return next();
          }
          return res.status(401).json({
            success: false,
            error: 'Invalid token',
            message: 'The provided token is invalid.'
          });
        }

        // Generic token error
        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
          message: err.message
        });
      }

      // Successfully decoded
      log.auth('Login', decoded.id || decoded.user_id || 'unknown', true);

      // If it's a member, get their data from members table
      if (decoded.role === 'member') {
        const { data: member, error: _memberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', decoded.id)
          .single();

        if (_memberError || !member) {
          log.debug('Member not found in database', { memberId: decoded.id });
          // Still allow the request with token data
          req.user = {
            id: decoded.id,
            role: decoded.role,
            phone: decoded.phone,
            fullName: decoded.fullName || decoded.full_name,
            full_name: decoded.fullName || decoded.full_name,
            membershipNumber: decoded.membershipNumber,
            membership_number: decoded.membershipNumber
          };
        } else {
          req.user = {
            ...member,
            ...decoded,  // Keep token data like role
            id: member.id,
            role: 'member'
          };
        }
      } else {
        req.user = decoded;
      }

      // Ensure user object has expected structure
      if (!req.user.id && req.user.user_id) {
        req.user.id = req.user.user_id;
      }

      next();
    });
  } catch (error) {
    log.error('Unexpected authentication error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'An unexpected error occurred during authentication'
    });
  }
};

export const requireAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated first
    if (!req.user) {
      log.warn('RequireAdmin: No user object in request');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userId = req.user.id || req.user.user_id;
    const userRole = req.user.role;

    log.debug('Checking admin status', { userId, userRole });

    // Check if user has admin role
    const allowedRoles = ['admin', 'super_admin', 'financial_manager'];

    // If role is already in JWT token, use it
    if (userRole && allowedRoles.includes(userRole)) {
      log.auth('Admin access granted via token', userId, true);
      return next();
    }

    // Otherwise, check database for role
    const { data: member, error } = await supabase
      .from('members')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      log.error('RequireAdmin: Database error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }

    if (!member) {
      log.warn('RequireAdmin: No member record found', { userId });
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Member record not found'
      });
    }

    if (!allowedRoles.includes(member.role)) {
      log.warn('RequireAdmin: User role not authorized', { role: member.role, userId });
      return res.status(403).json({
        success: false,
        error: 'Admin privileges required',
        message: `Your role (${member.role}) does not have access to this resource`
      });
    }

    // Update req.user with correct role from database
    req.user.role = member.role;
    log.auth('Admin access granted via database', userId, true);
    next();
  } catch (error) {
    log.error('RequireAdmin unexpected error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Authorization error',
      message: 'An unexpected error occurred during authorization'
    });
  }
};

// Export authenticateToken as alias for compatibility
export const authenticateToken = authenticate;

// Export protect as alias for new routes compatibility
export const protect = authenticate;

export const requireSuperAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated first
    if (!req.user) {
      log.warn('RequireSuperAdmin: No user object in request');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userId = req.user.id || req.user.user_id;
    const userRole = req.user.role;

    log.debug('Checking super admin status', { userId, userRole });

    // If role is already in JWT token, use it
    if (userRole === 'super_admin') {
      log.auth('Super admin access granted via token', userId, true);
      return next();
    }

    // Otherwise, check database for role
    const { data: member, error } = await supabase
      .from('members')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      log.error('RequireSuperAdmin: Database error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }

    if (!member) {
      log.warn('RequireSuperAdmin: No member record found', { userId });
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Member record not found'
      });
    }

    if (member.role !== 'super_admin') {
      log.warn('RequireSuperAdmin: User role not super_admin', { role: member.role, userId });
      return res.status(403).json({
        success: false,
        error: 'Super Admin privileges required',
        message: 'This action requires Super Admin privileges'
      });
    }

    // Update req.user with correct role from database
    req.user.role = member.role;
    log.auth('Super admin access granted via database', userId, true);
    next();
  } catch (error) {
    log.error('RequireSuperAdmin unexpected error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Authorization error',
      message: 'An unexpected error occurred during authorization'
    });
  }
};