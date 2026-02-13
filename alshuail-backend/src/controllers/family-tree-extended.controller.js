/**
 * Extended Family Tree Controller Methods
 * For HTML-based family tree interface
 */

import { query } from "../services/database.js";
import { log } from '../utils/logger.js';


/**
 * Get all family branches (الفخوذ)
 * GET /api/tree/branches
 */
export const getBranches = async (req, res) => {
  try {
    // Simplified query without branch_head JOIN to avoid FK issues
    const { rows: branches } = await query(
      'SELECT * FROM family_branches ORDER BY branch_name ASC'
    );

    // Get member counts for each branch
    const branchesWithCounts = await Promise.all((branches || []).map(async (branch) => {
      const { rows: countRows } = await query(
        "SELECT COUNT(*)::int AS count FROM members WHERE family_branch_id = $1 AND membership_status = 'active'",
        [branch.id]
      );

      const { rows: pendingRows } = await query(
        "SELECT COUNT(*)::int AS count FROM members WHERE family_branch_id = $1 AND membership_status = 'pending_approval'",
        [branch.id]
      );

      return {
        ...branch,
        memberCount: countRows[0]?.count || 0,
        pendingCount: pendingRows[0]?.count || 0
      };
    }));

    res.json({
      success: true,
      data: branchesWithCounts
    });
  } catch (error) {
    log.error('Failed to fetch family branches', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch family branches'
    });
  }
};

/**
 * Get members organized by generation
 * GET /api/tree/generations
 */
export const getGenerations = async (req, res) => {
  try {
    const { branchId } = req.query;

    const conditions = ["m.membership_status = 'active'"];
    const params = [];
    let paramIndex = 1;

    if (branchId) {
      conditions.push(`m.family_branch_id = $${paramIndex++}`);
      params.push(branchId);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const { rows: members } = await query(
      `SELECT m.id, m.full_name_ar, m.full_name_en, m.generation_level, m.birth_order,
              m.date_of_birth, m.gender, m.is_alive, m.photo_url, m.family_branch_id,
              fb.id AS branch_id, fb.branch_name
       FROM members m
       LEFT JOIN family_branches fb ON m.family_branch_id = fb.id
       ${whereClause}
       ORDER BY m.generation_level DESC, m.birth_order ASC`,
      params
    );

    // Format to match previous nested structure
    const formattedMembers = members.map(m => ({
      id: m.id,
      full_name_ar: m.full_name_ar,
      full_name_en: m.full_name_en,
      generation_level: m.generation_level,
      birth_order: m.birth_order,
      date_of_birth: m.date_of_birth,
      gender: m.gender,
      is_alive: m.is_alive,
      photo_url: m.photo_url,
      family_branch_id: m.family_branch_id,
      family_branches: m.branch_id ? {
        id: m.branch_id,
        branch_name: m.branch_name
      } : null
    }));

    // Group members by generation
    const generationMap = {};
    formattedMembers.forEach(member => {
      const generation = member.generation_level || 0;
      if (!generationMap[generation]) {
        generationMap[generation] = [];
      }
      generationMap[generation].push(member);
    });

    // Convert to array format with generation metadata
    const generations = Object.keys(generationMap)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(gen => {
        const genNumber = parseInt(gen);
        const startYear = 1900 + (genNumber * 25); // Approximate 25 years per generation

        return {
          generation: genNumber,
          year: startYear,
          label: `الجيل ${genNumber + 1}`,
          yearRange: `${startYear} - ${startYear + 25}`,
          members: generationMap[gen],
          count: generationMap[gen].length
        };
      });

    res.json({
      success: true,
      data: generations
    });
  } catch (error) {
    log.error('Failed to fetch generation data', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch generation data'
    });
  }
};

/**
 * Get all members with filtering options
 * GET /api/tree/members
 */
export const getMembers = async (req, res) => {
  try {
    const {
      branchId,
      generation,
      status = 'active',
      search
    } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (status) {
      conditions.push(`m.membership_status = $${paramIndex++}`);
      params.push(status);
    }
    if (branchId) {
      conditions.push(`m.family_branch_id = $${paramIndex++}`);
      params.push(branchId);
    }
    if (generation) {
      conditions.push(`m.generation_level = $${paramIndex++}`);
      params.push(generation);
    }
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(`(m.full_name ILIKE $${paramIndex} OR m.phone ILIKE $${paramIndex})`);
      paramIndex++;
      params.push(searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: members } = await query(
      `SELECT m.*, fb.id AS branch_id, fb.branch_name, fb.branch_name_en
       FROM members m
       LEFT JOIN family_branches fb ON m.family_branch_id = fb.id
       ${whereClause}
       ORDER BY m.full_name ASC`,
      params
    );

    // Map column names to match frontend expectations
    const mappedMembers = (members || []).map(member => ({
      ...member,
      full_name_ar: member.full_name, // Map full_name to full_name_ar for frontend
      birth_date: member.date_of_birth, // Map date_of_birth to birth_date for frontend
      family_branches: member.branch_id ? {
        id: member.branch_id,
        branch_name: member.branch_name,
        branch_name_en: member.branch_name_en
      } : null
    }));

    res.json({
      success: true,
      data: mappedMembers,
      count: mappedMembers.length
    });
  } catch (error) {
    log.error('Failed to fetch members', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch members',
      message: error.message
    });
  }
};

/**
 * Get family relationships for tree connections
 * GET /api/tree/relationships
 */
export const getRelationships = async (req, res) => {
  try {
    const { memberId } = req.query;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'Member ID is required'
      });
    }

    // Get the member's relationships with joined member data
    const { rows: relationships } = await query(
      `SELECT fr.*,
              m.id AS m_id, m.full_name_ar AS m_full_name_ar, m.full_name_en AS m_full_name_en, m.generation_level AS m_generation_level,
              f.id AS f_id, f.full_name_ar AS f_full_name_ar, f.full_name_en AS f_full_name_en, f.generation_level AS f_generation_level,
              mo.id AS mo_id, mo.full_name_ar AS mo_full_name_ar, mo.full_name_en AS mo_full_name_en, mo.generation_level AS mo_generation_level,
              r.id AS r_id, r.full_name_ar AS r_full_name_ar, r.full_name_en AS r_full_name_en, r.generation_level AS r_generation_level, r.relationship_type AS r_relationship_type
       FROM family_relationships fr
       LEFT JOIN members m ON fr.member_id = m.id
       LEFT JOIN members f ON fr.father_id = f.id
       LEFT JOIN members mo ON fr.mother_id = mo.id
       LEFT JOIN members r ON fr.related_member_id = r.id
       WHERE fr.member_id = $1 OR fr.related_member_id = $1`,
      [memberId]
    );

    // Build family tree structure
    const familyTree = {
      memberId,
      parents: [],
      children: [],
      siblings: [],
      spouse: null
    };

    (relationships || []).forEach(rel => {
      // Reconstruct nested objects
      const member = rel.m_id ? { id: rel.m_id, full_name_ar: rel.m_full_name_ar, full_name_en: rel.m_full_name_en, generation_level: rel.m_generation_level } : null;
      const father = rel.f_id ? { id: rel.f_id, full_name_ar: rel.f_full_name_ar, full_name_en: rel.f_full_name_en, generation_level: rel.f_generation_level } : null;
      const mother = rel.mo_id ? { id: rel.mo_id, full_name_ar: rel.mo_full_name_ar, full_name_en: rel.mo_full_name_en, generation_level: rel.mo_generation_level } : null;
      const related = rel.r_id ? { id: rel.r_id, full_name_ar: rel.r_full_name_ar, full_name_en: rel.r_full_name_en, generation_level: rel.r_generation_level, relationship_type: rel.r_relationship_type } : null;

      if (rel.member_id === memberId) {
        if (father) familyTree.parents.push({ ...father, type: 'father' });
        if (mother) familyTree.parents.push({ ...mother, type: 'mother' });
      }

      if (rel.relationship_type === 'child' && rel.member_id === memberId) {
        familyTree.children.push(related);
      }

      if (rel.relationship_type === 'sibling') {
        const sibling = rel.member_id === memberId ? related : member;
        if (sibling && sibling.id !== memberId) {
          familyTree.siblings.push(sibling);
        }
      }

      if (rel.relationship_type === 'spouse') {
        familyTree.spouse = rel.member_id === memberId ? related : member;
      }
    });

    res.json({
      success: true,
      data: familyTree
    });
  } catch (error) {
    log.error('Failed to fetch family relationships', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch family relationships'
    });
  }
};

/**
 * Approve a pending member registration
 * POST /api/tree/approve-member/:memberId
 */
export const approveMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    // Update member status
    const { rows } = await query(
      `UPDATE members SET membership_status = 'active', approved_at = $1, approved_by = $2
       WHERE id = $3
       RETURNING *`,
      [new Date().toISOString(), req.user?.id || 'admin', memberId]
    );

    const data = rows[0];

    res.json({
      success: true,
      message: 'تم اعتماد العضو بنجاح',
      data
    });
  } catch (error) {
    log.error('Failed to approve member', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to approve member'
    });
  }
};

/**
 * Reject a pending member registration
 * POST /api/tree/reject-member/:memberId
 */
export const rejectMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { reason } = req.body;

    // Update member status
    const { rows } = await query(
      `UPDATE members SET membership_status = 'rejected', rejection_reason = $1, rejected_at = $2, rejected_by = $3
       WHERE id = $4
       RETURNING *`,
      [reason, new Date().toISOString(), req.user?.id || 'admin', memberId]
    );

    const data = rows[0];

    res.json({
      success: true,
      message: 'تم رفض الطلب',
      data
    });
  } catch (error) {
    log.error('Failed to reject member', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to reject member'
    });
  }
};

/**
 * Get unassigned members (members without branch assignment)
 * GET /api/tree/unassigned-members
 */
export const getUnassignedMembers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    const conditions = ["family_branch_id IS NULL", "membership_status = 'active'"];
    const params = [];
    let paramIndex = 1;

    // Apply search filter if provided
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(`(full_name_ar ILIKE $${paramIndex} OR full_name_en ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`);
      paramIndex++;
      params.push(searchPattern);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Get count
    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS count FROM members ${whereClause}`,
      params
    );
    const count = countRows[0].count;

    // Get paginated results
    params.push(parseInt(limit));
    const limitParam = paramIndex++;
    params.push(parseInt(offset));
    const offsetParam = paramIndex++;

    const { rows: members } = await query(
      `SELECT * FROM members ${whereClause} ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    );

    res.json({
      success: true,
      data: members || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    log.error('Failed to fetch unassigned members', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unassigned members'
    });
  }
};

/**
 * Assign a member to a family branch
 * POST /api/tree/assign-member
 */
export const assignMemberToBranch = async (req, res) => {
  try {
    const { memberId, branchId } = req.body;

    if (!memberId || !branchId) {
      return res.status(400).json({
        success: false,
        error: 'Member ID and Branch ID are required'
      });
    }

    // Verify branch exists
    const { rows: branchRows } = await query(
      'SELECT id, branch_name FROM family_branches WHERE id = $1',
      [branchId]
    );

    if (branchRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found'
      });
    }

    const branch = branchRows[0];

    // Update member's branch assignment and fetch with branch info
    const { rows: memberRows } = await query(
      `UPDATE members SET family_branch_id = $1, updated_at = $2
       WHERE id = $3
       RETURNING *`,
      [branchId, new Date().toISOString(), memberId]
    );

    const member = memberRows[0];

    // Fetch branch info separately
    if (member) {
      const { rows: branchInfo } = await query(
        'SELECT id, branch_name, branch_name_en FROM family_branches WHERE id = $1',
        [branchId]
      );
      member.family_branches = branchInfo[0] || null;
    }

    res.json({
      success: true,
      message: `تم تعيين العضو إلى فخذ ${branch.branch_name}`,
      data: member
    });
  } catch (error) {
    log.error('Failed to assign member to branch', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to assign member to branch'
    });
  }
};

/**
 * Bulk assign multiple members to branches
 * POST /api/tree/bulk-assign
 */
export const bulkAssignMembers = async (req, res) => {
  try {
    const { assignments } = req.body; // Array of { memberId, branchId }

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Assignments array is required'
      });
    }

    const results = [];
    const errors = [];

    // Process each assignment
    for (const assignment of assignments) {
      const { memberId, branchId } = assignment;

      try {
        const { rows } = await query(
          `UPDATE members SET family_branch_id = $1, updated_at = $2
           WHERE id = $3
           RETURNING *`,
          [branchId, new Date().toISOString(), memberId]
        );

        if (rows.length === 0) {
          errors.push({ memberId, branchId, error: 'Member not found' });
        } else {
          results.push({ memberId, branchId, success: true });
        }
      } catch (err) {
        errors.push({ memberId, branchId, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `تم تعيين ${results.length} عضو بنجاح`,
      data: {
        successful: results.length,
        failed: errors.length,
        results,
        errors
      }
    });
  } catch (error) {
    log.error('Failed to bulk assign members', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to bulk assign members'
    });
  }
};
