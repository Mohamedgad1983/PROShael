import express from 'express';
import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import Joi from 'joi';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const assignRoleSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  role_id: Joi.string().uuid().required(),
  start_date_gregorian: Joi.date().iso().optional().allow(null),
  end_date_gregorian: Joi.date().iso().min(Joi.ref('start_date_gregorian')).optional().allow(null),
  start_date_hijri: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().allow(null),
  end_date_hijri: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().allow(null),
  notes: Joi.string().max(500).optional().allow(''),
  is_active: Joi.boolean().optional().default(true)
});

const updateRoleAssignmentSchema = Joi.object({
  start_date_gregorian: Joi.date().iso().optional().allow(null),
  end_date_gregorian: Joi.date().iso().optional().allow(null),
  start_date_hijri: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().allow(null),
  end_date_hijri: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().allow(null),
  notes: Joi.string().max(500).optional().allow(''),
  is_active: Joi.boolean().optional()
});

// ============================================================================
// MEMBER SEARCH ENDPOINT
// ============================================================================

/**
 * Search for members to assign roles
 * GET /api/multi-role/search-members?q=<search_term>&limit=20
 */
router.get('/search-members', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;
    const searchTerm = `%${q}%`;

    // Search in both users and members tables
    const { data: usersResults, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name_en, phone, role, is_active')
      .or(`email.ilike.${searchTerm},full_name_en.ilike.${searchTerm},phone.ilike.${searchTerm}`)
      .eq('is_active', true)
      .limit(limit);

    const { data: membersResults, error: membersError } = await supabase
      .from('members')
      .select('id, email, full_name, phone, role, is_active, membership_number')
      .or(`email.ilike.${searchTerm},full_name.ilike.${searchTerm},phone.ilike.${searchTerm},membership_number.ilike.${searchTerm}`)
      .eq('is_active', true)
      .limit(limit);

    if (usersError) throw usersError;
    if (membersError) throw membersError;

    // Get current roles for each user
    const allResults = [
      ...(usersResults || []).map(u => ({ ...u, full_name: u.full_name_en, source: 'users' })),
      ...(membersResults || []).map(m => ({ ...m, source: 'members' }))
    ];

    // Fetch active role assignments for all found users
    const userIds = allResults.map(u => u.id);
    const { data: roleAssignments } = await supabase
      .from('v_user_roles_with_periods')
      .select('*')
      .in('user_id', userIds)
      .eq('status', 'active');

    // Group roles by user_id
    const rolesByUser = (roleAssignments || []).reduce((acc, assignment) => {
      if (!acc[assignment.user_id]) acc[assignment.user_id] = [];
      acc[assignment.user_id].push({
        role_id: assignment.role_id,
        role_name: assignment.role_name,
        role_name_ar: assignment.role_name_ar,
        start_date: assignment.start_date_gregorian,
        end_date: assignment.end_date_gregorian,
        start_date_hijri: assignment.start_date_hijri,
        end_date_hijri: assignment.end_date_hijri
      });
      return acc;
    }, {});

    // Attach roles to each user
    const resultsWithRoles = allResults.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      primary_role: user.role,
      membership_number: user.membership_number,
      source: user.source,
      active_roles: rolesByUser[user.id] || []
    }));

    res.json({
      success: true,
      data: resultsWithRoles,
      count: resultsWithRoles.length
    });

  } catch (error) {
    log.error('Member search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to search members'
    });
  }
});

// ============================================================================
// GET USER'S ROLE ASSIGNMENTS
// ============================================================================

/**
 * Get all role assignments for a user (active, pending, expired)
 * GET /api/multi-role/users/:userId/roles
 */
router.get('/users/:userId/roles', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: assignments, error } = await supabase
      .from('v_user_roles_with_periods')
      .select('*')
      .eq('user_id', userId)
      .order('start_date_gregorian', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: assignments || [],
      count: (assignments || []).length
    });

  } catch (error) {
    log.error('Failed to fetch user roles', { error: error.message, userId: req.params.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user roles'
    });
  }
});

// ============================================================================
// ASSIGN ROLE TO USER
// ============================================================================

/**
 * Assign a role to a user with optional time period
 * POST /api/multi-role/assign
 */
router.post('/assign', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    // Validate input
    const { error: validationError, value } = assignRoleSchema.validate(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationError.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const {
      user_id,
      role_id,
      start_date_gregorian,
      end_date_gregorian,
      start_date_hijri,
      end_date_hijri,
      notes,
      is_active
    } = value;

    // Check if user exists in either users or members table
    const { data: userInUsers } = await supabase
      .from('users')
      .select('id, email, full_name_en')
      .eq('id', user_id)
      .single();

    const { data: userInMembers } = await supabase
      .from('members')
      .select('id, email, full_name')
      .eq('id', user_id)
      .single();

    if (!userInUsers && !userInMembers) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userInUsers ? { ...userInUsers, full_name: userInUsers.full_name_en } : userInMembers;

    // Check if role exists
    const { data: role, error: roleError } = await supabase
      .from('user_roles')
      .select('id, role_name, role_name_ar')
      .eq('id', role_id)
      .single();

    if (roleError || !role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }

    // Check for overlapping active assignments (same role, overlapping dates)
    const { data: overlapping } = await supabase
      .from('user_role_assignments')
      .select('id, start_date_gregorian, end_date_gregorian')
      .eq('user_id', user_id)
      .eq('role_id', role_id)
      .eq('is_active', true);

    if (overlapping && overlapping.length > 0) {
      // Check for date overlap
      const hasOverlap = overlapping.some(existing => {
        const existingStart = existing.start_date_gregorian ? new Date(existing.start_date_gregorian) : null;
        const existingEnd = existing.end_date_gregorian ? new Date(existing.end_date_gregorian) : null;
        const newStart = start_date_gregorian ? new Date(start_date_gregorian) : null;
        const newEnd = end_date_gregorian ? new Date(end_date_gregorian) : null;

        // If both are permanent (no dates), that's an overlap
        if (!existingStart && !existingEnd && !newStart && !newEnd) return true;

        // Check for date range overlap
        if (existingStart && newEnd && existingStart > newEnd) return false;
        if (newStart && existingEnd && newStart > existingEnd) return false;

        return true; // Overlap detected
      });

      if (hasOverlap) {
        return res.status(409).json({
          success: false,
          error: 'User already has an overlapping assignment for this role',
          existing_assignments: overlapping
        });
      }
    }

    // Create the role assignment
    const { data: assignment, error: assignError } = await supabase
      .from('user_role_assignments')
      .insert({
        user_id,
        role_id,
        start_date_gregorian,
        end_date_gregorian,
        start_date_hijri,
        end_date_hijri,
        notes,
        is_active,
        assigned_by: req.user.id,
        assigned_at: new Date().toISOString()
      })
      .select()
      .single();

    if (assignError) throw assignError;

    log.info('Role assigned to user', {
      assignment_id: assignment.id,
      user_id,
      user_name: user.full_name,
      role_name: role.role_name,
      assigned_by: req.user.email
    });

    res.status(201).json({
      success: true,
      data: assignment,
      message: `تم تعيين صلاحية ${role.role_name_ar} للمستخدم ${user.full_name} بنجاح`
    });

  } catch (error) {
    log.error('Failed to assign role', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to assign role'
    });
  }
});

// ============================================================================
// UPDATE ROLE ASSIGNMENT
// ============================================================================

/**
 * Update an existing role assignment (dates, active status, notes)
 * PUT /api/multi-role/assignments/:assignmentId
 */
router.put('/assignments/:assignmentId', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // Validate input
    const { error: validationError, value } = updateRoleAssignmentSchema.validate(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationError.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    // Update the assignment
    const { data: updated, error: updateError } = await supabase
      .from('user_role_assignments')
      .update({
        ...value,
        updated_by: req.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .select()
      .single();

    if (updateError) throw updateError;

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Role assignment not found'
      });
    }

    log.info('Role assignment updated', {
      assignment_id: assignmentId,
      updated_by: req.user.email
    });

    res.json({
      success: true,
      data: updated,
      message: 'تم تحديث تعيين الصلاحية بنجاح'
    });

  } catch (error) {
    log.error('Failed to update role assignment', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update role assignment'
    });
  }
});

// ============================================================================
// DELETE/REVOKE ROLE ASSIGNMENT
// ============================================================================

/**
 * Revoke/delete a role assignment
 * DELETE /api/multi-role/assignments/:assignmentId
 */
router.delete('/assignments/:assignmentId', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // Soft delete by setting is_active = false
    const { data: deleted, error: deleteError } = await supabase
      .from('user_role_assignments')
      .update({
        is_active: false,
        updated_by: req.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .select()
      .single();

    if (deleteError) throw deleteError;

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Role assignment not found'
      });
    }

    log.info('Role assignment revoked', {
      assignment_id: assignmentId,
      revoked_by: req.user.email
    });

    res.json({
      success: true,
      message: 'تم إلغاء تعيين الصلاحية بنجاح'
    });

  } catch (error) {
    log.error('Failed to revoke role assignment', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to revoke role assignment'
    });
  }
});

// ============================================================================
// GET ALL USERS WITH ROLE ASSIGNMENTS
// ============================================================================

/**
 * Get all users with active role assignments
 * GET /api/multi-role/all-assignments
 */
router.get('/all-assignments', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    // Get all active role assignments with user details
    const { data: assignments, error: assignmentError } = await supabase
      .from('v_user_roles_with_periods')
      .select('*')
      .eq('status', 'active')
      .order('user_id', { ascending: true })
      .order('start_date_gregorian', { ascending: false });

    if (assignmentError) throw assignmentError;

    // Group assignments by user
    const usersByIdMap = {};

    (assignments || []).forEach(assignment => {
      if (!usersByIdMap[assignment.user_id]) {
        usersByIdMap[assignment.user_id] = {
          user_id: assignment.user_id,
          full_name: assignment.user_name,
          email: assignment.user_email,
          phone: assignment.user_phone,
          roles: []
        };
      }

      usersByIdMap[assignment.user_id].roles.push({
        assignment_id: assignment.id,
        role_id: assignment.role_id,
        role_name: assignment.role_name,
        role_name_ar: assignment.role_name_ar,
        start_date_gregorian: assignment.start_date_gregorian,
        end_date_gregorian: assignment.end_date_gregorian,
        start_date_hijri: assignment.start_date_hijri,
        end_date_hijri: assignment.end_date_hijri,
        status: assignment.status,
        notes: assignment.notes
      });
    });

    // Convert map to array
    const usersWithRoles = Object.values(usersByIdMap);

    log.info('Fetched all users with role assignments', {
      user_count: usersWithRoles.length,
      total_assignments: (assignments || []).length
    });

    res.json({
      success: true,
      data: {
        users: usersWithRoles,
        total_users: usersWithRoles.length,
        total_assignments: (assignments || []).length
      }
    });

  } catch (error) {
    log.error('Failed to fetch all role assignments', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch all role assignments'
    });
  }
});

// ============================================================================
// GET ALL AVAILABLE ROLES
// ============================================================================

/**
 * Get list of all available roles for assignment
 * GET /api/multi-role/roles
 */
router.get('/roles', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('id, role_name, role_name_ar, description, priority, permissions')
      .order('priority', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: roles || []
    });

  } catch (error) {
    log.error('Failed to fetch roles', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roles'
    });
  }
});

// ============================================================================
// GET ACTIVE ROLES FOR AUTHENTICATED USER
// ============================================================================

/**
 * Get active roles for the currently authenticated user
 * GET /api/multi-role/my-roles
 */
router.get('/my-roles', authenticateToken, async (req, res) => {
  try {
    const { data: activeRoles, error } = await supabase
      .rpc('get_active_roles', {
        p_user_id: req.user.id,
        p_check_date: new Date().toISOString().split('T')[0]
      });

    if (error) throw error;

    // Get merged permissions
    const { data: mergedPermissions, error: permError } = await supabase
      .rpc('get_merged_permissions', {
        p_user_id: req.user.id,
        p_check_date: new Date().toISOString().split('T')[0]
      });

    if (permError) throw permError;

    res.json({
      success: true,
      data: {
        active_roles: activeRoles || [],
        merged_permissions: mergedPermissions || {},
        role_count: (activeRoles || []).length
      }
    });

  } catch (error) {
    log.error('Failed to fetch user active roles', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active roles'
    });
  }
});

export default router;
