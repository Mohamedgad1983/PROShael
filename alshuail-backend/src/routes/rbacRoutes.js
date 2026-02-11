/* eslint-disable require-await */
/**
 * RBAC Routes Configuration
 * Defines all protected routes with their required roles
 */

import express from 'express';
import { query } from '../services/database.js';
import { log } from '../utils/logger.js';
import {
  requireRole as _requireRole,
  requirePermission,
  requireSuperAdmin,
  requireFinancialManager,
  requireFamilyTreeAdmin,
  requireOccasionsAdmin,
  requireAnyAuthenticated,
  validateRoleAssignment,
  hasPermission
} from '../middleware/rbacMiddleware.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ==========================================
// USER ROLE MANAGEMENT (Super Admin Only)
// ==========================================

// Get all roles
router.get('/roles',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const result = await query(
        `SELECT * FROM user_roles ORDER BY priority DESC`
      );

      res.json({
        success: true,
        roles: result.rows
      });
    } catch (error) {
      log.error('Error fetching roles:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الأدوار'
      });
    }
  }
);

// Assign role to user
router.post('/users/:userId/assign-role',
  authenticate,
  requireSuperAdmin,
  validateRoleAssignment,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { roleName } = req.body;

      // Get role ID
      const roleResult = await query(
        `SELECT id FROM user_roles WHERE role_name = $1`,
        [roleName]
      );

      if (roleResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'الدور المطلوب غير موجود'
        });
      }
      const role = roleResult.rows[0];

      // Deactivate existing roles
      await query(
        `UPDATE user_role_assignments SET is_active = false WHERE user_id = $1`,
        [userId]
      );

      // Assign new role
      await query(
        `INSERT INTO user_role_assignments (user_id, role_id, assigned_by, is_active)
         VALUES ($1, $2, $3, true)`,
        [userId, role.id, req.user.id]
      );

      // Update user's primary role
      await query(
        `UPDATE users
         SET primary_role_id = $1, role_assigned_at = $2, role_assigned_by = $3
         WHERE id = $4`,
        [role.id, new Date(), req.user.id, userId]
      );

      res.json({
        success: true,
        message: 'تم تعيين الدور بنجاح'
      });
    } catch (error) {
      log.error('Error assigning role:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'خطأ في تعيين الدور'
      });
    }
  }
);

// Get user's current role
router.get('/users/:userId/role',
  authenticate,
  requireAnyAuthenticated,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Users can only view their own role unless admin
      if (req.user.role !== 'super_admin' && req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك الصلاحية لعرض دور هذا المستخدم'
        });
      }

      const result = await query(
        `SELECT * FROM get_user_role($1)`,
        [userId]
      );

      res.json({
        success: true,
        role: result.rows[0] || null
      });
    } catch (error) {
      log.error('Error fetching user role:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب دور المستخدم'
      });
    }
  }
);

// ==========================================
// MEMBERS ROUTES WITH ROLE PROTECTION
// ==========================================

// View all members (Super Admin only)
router.get('/members/all',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    // Implementation in members controller
    res.json({ message: 'Access granted to all members data' });
  }
);

// View member details
router.get('/members/:id',
  authenticate,
  requireAnyAuthenticated,
  async (req, res) => {
    // Check permissions based on role
    if (req.user.role === 'super_admin') {
      // Can view any member
    } else if (req.user.role === 'financial_manager') {
      // Can view financial data only
    } else if (req.user.role === 'family_tree_admin') {
      // Can view family relationships only
    } else if (req.user.role === 'occasions_initiatives_diyas_admin') {
      // Can view participants only
    } else if (req.user.role === 'user_member') {
      // Can view own data only
      if (req.params.id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'يمكنك عرض بياناتك الشخصية فقط'
        });
      }
    }

    res.json({ message: 'Member data access based on role' });
  }
);

// ==========================================
// FINANCIAL ROUTES
// ==========================================

// Financial dashboard (Financial Manager & Super Admin)
router.get('/financial/dashboard',
  authenticate,
  requireFinancialManager,
  async (req, res) => {
    res.json({ message: 'Financial dashboard access granted' });
  }
);

// Manage subscriptions
router.post('/financial/subscriptions',
  authenticate,
  requirePermission('financial.manage_subscriptions'),
  async (req, res) => {
    res.json({ message: 'Subscription management access granted' });
  }
);

// Record payments
router.post('/financial/payments',
  authenticate,
  requirePermission('financial.record_payments'),
  async (req, res) => {
    res.json({ message: 'Payment recording access granted' });
  }
);

// ==========================================
// FAMILY TREE ROUTES
// ==========================================

// View full family tree
router.get('/family-tree/full',
  authenticate,
  requireFamilyTreeAdmin,
  async (req, res) => {
    res.json({ message: 'Full family tree access granted' });
  }
);

// Manage relationships
router.post('/family-tree/relationships',
  authenticate,
  requirePermission('family_tree.edit_relationships'),
  async (req, res) => {
    res.json({ message: 'Family relationship management access granted' });
  }
);

// ==========================================
// OCCASIONS ROUTES
// ==========================================

// View all occasions
router.get('/occasions/all',
  authenticate,
  requireOccasionsAdmin,
  async (req, res) => {
    res.json({ message: 'All occasions access granted' });
  }
);

// Create occasion
router.post('/occasions',
  authenticate,
  requirePermission('occasions.create'),
  async (req, res) => {
    res.json({ message: 'Occasion creation access granted' });
  }
);

// ==========================================
// INITIATIVES ROUTES
// ==========================================

// View all initiatives
router.get('/initiatives/all',
  authenticate,
  requireOccasionsAdmin,
  async (req, res) => {
    res.json({ message: 'All initiatives access granted' });
  }
);

// Manage donations
router.post('/initiatives/:id/donations',
  authenticate,
  requirePermission('initiatives.manage_donations'),
  async (req, res) => {
    res.json({ message: 'Donation management access granted' });
  }
);

// ==========================================
// DIYAS ROUTES
// ==========================================

// View all diyas cases
router.get('/diyas/all',
  authenticate,
  requireOccasionsAdmin,
  async (req, res) => {
    res.json({ message: 'All diyas cases access granted' });
  }
);

// Manage compensation
router.post('/diyas/:id/compensation',
  authenticate,
  requirePermission('diyas.manage_compensation'),
  async (req, res) => {
    res.json({ message: 'Compensation management access granted' });
  }
);

// ==========================================
// AUDIT LOGS (Super Admin Only)
// ==========================================

router.get('/audit-logs',
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const result = await query(
        `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`
      );

      res.json({
        success: true,
        logs: result.rows
      });
    } catch (error) {
      log.error('Error fetching audit logs:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب سجلات التدقيق'
      });
    }
  }
);

// ==========================================
// USER PROFILE ROUTES
// ==========================================

// Get own profile (Any authenticated user)
router.get('/profile/me',
  authenticate,
  requireAnyAuthenticated,
  async (req, res) => {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        roleAr: req.user.roleAr,
        permissions: req.user.permissions
      }
    });
  }
);

// Update own profile
router.put('/profile/me',
  authenticate,
  requireAnyAuthenticated,
  async (req, res) => {
    // Users can update their own profile
    res.json({ message: 'Profile update access granted' });
  }
);

// ==========================================
// PERMISSION CHECK ENDPOINT
// ==========================================

// Check if user has specific permission
router.post('/check-permission',
  authenticate,
  async (req, res) => {
    try {
      const { permission } = req.body;

      if (!permission) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد الصلاحية المطلوبة'
        });
      }

      const hasUserPermission = await hasPermission(req.user.id, permission);

      res.json({
        success: true,
        hasPermission: hasUserPermission,
        userRole: req.user.role
      });
    } catch (error) {
      log.error('Error checking permission:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحية'
      });
    }
  }
);

export default router;