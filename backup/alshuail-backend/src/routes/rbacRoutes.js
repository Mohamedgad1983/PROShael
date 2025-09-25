/**
 * RBAC Routes Configuration
 * Defines all protected routes with their required roles
 */

import express from 'express';
import {
  requireRole,
  requirePermission,
  requireSuperAdmin,
  requireFinancialManager,
  requireFamilyTreeAdmin,
  requireOccasionsAdmin,
  requireAnyAuthenticated,
  validateRoleAssignment
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
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        roles: data
      });
    } catch (error) {
      console.error('Error fetching roles:', error);
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
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role_name', roleName)
        .single();

      if (roleError || !role) {
        return res.status(400).json({
          success: false,
          message: 'الدور المطلوب غير موجود'
        });
      }

      // Deactivate existing roles
      await supabase
        .from('user_role_assignments')
        .update({ is_active: false })
        .eq('user_id', userId);

      // Assign new role
      const { error: assignError } = await supabase
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_id: role.id,
          assigned_by: req.user.id,
          is_active: true
        });

      if (assignError) throw assignError;

      // Update user's primary role
      await supabase
        .from('users')
        .update({
          primary_role_id: role.id,
          role_assigned_at: new Date(),
          role_assigned_by: req.user.id
        })
        .eq('id', userId);

      res.json({
        success: true,
        message: 'تم تعيين الدور بنجاح'
      });
    } catch (error) {
      console.error('Error assigning role:', error);
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

      const { data, error } = await supabase.rpc('get_user_role', {
        p_user_id: userId
      });

      if (error) throw error;

      res.json({
        success: true,
        role: data?.[0] || null
      });
    } catch (error) {
      console.error('Error fetching user role:', error);
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
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      res.json({
        success: true,
        logs: data
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
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
      console.error('Error checking permission:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الصلاحية'
      });
    }
  }
);

export default router;