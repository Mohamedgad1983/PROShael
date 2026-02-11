/**
 * Family Tree API Routes
 * Al-Shuail Family Management System
 *
 * These routes provide data for the new HTML-based family tree visualization
 * Required by: admin_clan_management.html, family-tree-timeline.html
 */

import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { query } from '../src/services/database.js';

const router = express.Router();

/**
 * GET /api/tree/stats
 * Get overall family tree statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Get total members count
    const totalMembersResult = await query('SELECT COUNT(*) FROM members');
    const totalMembers = parseInt(totalMembersResult.rows[0].count);

    // Get active members count
    const activeMembersResult = await query(
      'SELECT COUNT(*) FROM members WHERE membership_status = $1',
      ['active']
    );
    const activeMembers = parseInt(activeMembersResult.rows[0].count);

    // Get pending approvals count
    const pendingApprovalsResult = await query(
      'SELECT COUNT(*) FROM members WHERE membership_status = $1',
      ['pending_approval']
    );
    const pendingApprovals = parseInt(pendingApprovalsResult.rows[0].count);

    // Get total branches count
    const totalBranchesResult = await query('SELECT COUNT(*) FROM family_branches');
    const totalBranches = parseInt(totalBranchesResult.rows[0].count);

    // Get generation statistics
    const generationStatsResult = await query(
      'SELECT DISTINCT generation_level FROM members WHERE generation_level IS NOT NULL'
    );
    const generations = generationStatsResult.rows.length;

    res.json({
      success: true,
      data: {
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        pendingApprovals: pendingApprovals || 0,
        totalBranches: totalBranches || 8, // Default to 8 founding branches
        totalGenerations: generations || 12,
        completionRate: totalMembers ? Math.round((activeMembers / totalMembers) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching tree stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tree statistics'
    });
  }
});

/**
 * GET /api/tree/branches
 * Get all family branches (الفخوذ)
 */
router.get('/branches', authenticate, async (req, res) => {
  try {
    // Get all branches with branch head information
    const branchesResult = await query(`
      SELECT
        fb.*,
        json_build_object(
          'id', m.id,
          'full_name_ar', m.full_name_ar,
          'full_name_en', m.full_name_en,
          'phone', m.phone
        ) as branch_head
      FROM family_branches fb
      LEFT JOIN members m ON fb.branch_head_id = m.id
      ORDER BY fb.branch_name ASC
    `);

    const branches = branchesResult.rows;

    // Get member counts for each branch
    const branchesWithCounts = await Promise.all(branches.map(async (branch) => {
      const memberCountResult = await query(
        'SELECT COUNT(*) FROM members WHERE family_branch_id = $1 AND membership_status = $2',
        [branch.id, 'active']
      );
      const memberCount = parseInt(memberCountResult.rows[0].count);

      const pendingCountResult = await query(
        'SELECT COUNT(*) FROM members WHERE family_branch_id = $1 AND membership_status = $2',
        [branch.id, 'pending_approval']
      );
      const pendingCount = parseInt(pendingCountResult.rows[0].count);

      return {
        ...branch,
        memberCount: memberCount || 0,
        pendingCount: pendingCount || 0
      };
    }));

    res.json({
      success: true,
      data: branchesWithCounts
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch family branches'
    });
  }
});

/**
 * GET /api/tree/generations
 * Get members organized by generation
 */
router.get('/generations', authenticate, async (req, res) => {
  try {
    const { branchId } = req.query;

    // Build SQL query with optional branch filter
    let sqlQuery = `
      SELECT
        m.id,
        m.full_name_ar,
        m.full_name_en,
        m.generation_level,
        m.birth_order,
        m.date_of_birth,
        m.gender,
        m.is_alive,
        m.photo_url,
        m.family_branch_id,
        json_build_object(
          'id', fb.id,
          'branch_name', fb.branch_name
        ) as family_branches
      FROM members m
      LEFT JOIN family_branches fb ON m.family_branch_id = fb.id
      WHERE m.membership_status = $1
    `;
    const params = ['active'];

    if (branchId) {
      sqlQuery += ' AND m.family_branch_id = $2';
      params.push(branchId);
    }

    sqlQuery += ' ORDER BY m.generation_level DESC, m.birth_order ASC';

    const membersResult = await query(sqlQuery, params);
    const members = membersResult.rows;

    // Group members by generation
    const generationMap = {};
    members.forEach(member => {
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
    console.error('Error fetching generations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch generation data'
    });
  }
});

/**
 * GET /api/tree/members
 * Get all members with filtering options
 */
router.get('/members', authenticate, async (req, res) => {
  try {
    const {
      branchId,
      generation,
      status = 'active',
      search
    } = req.query;

    // Build SQL query with optional filters
    let sqlQuery = `
      SELECT
        m.*,
        json_build_object(
          'id', fb.id,
          'branch_name', fb.branch_name,
          'branch_name_en', fb.branch_name_en
        ) as family_branches
      FROM members m
      LEFT JOIN family_branches fb ON m.family_branch_id = fb.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Apply filters
    if (status) {
      paramCount++;
      sqlQuery += ` AND m.membership_status = $${paramCount}`;
      params.push(status);
    }
    if (branchId) {
      paramCount++;
      sqlQuery += ` AND m.family_branch_id = $${paramCount}`;
      params.push(branchId);
    }
    if (generation) {
      paramCount++;
      sqlQuery += ` AND m.generation_level = $${paramCount}`;
      params.push(generation);
    }
    if (search) {
      paramCount++;
      sqlQuery += ` AND (
        m.full_name_ar ILIKE $${paramCount}
        OR m.full_name_en ILIKE $${paramCount}
        OR m.phone ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    // Order by generation and birth order
    sqlQuery += `
      ORDER BY
        m.generation_level DESC NULLS LAST,
        m.birth_order ASC NULLS LAST,
        m.full_name_ar ASC NULLS LAST
    `;

    const membersResult = await query(sqlQuery, params);
    const members = membersResult.rows;

    res.json({
      success: true,
      data: members || [],
      count: members.length
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch members'
    });
  }
});

/**
 * GET /api/tree/relationships
 * Get family relationships for tree connections
 */
router.get('/relationships', authenticate, async (req, res) => {
  try {
    const { memberId, depth = 3 } = req.query;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'Member ID is required'
      });
    }

    // Get the member's relationships with all related member data
    const relationshipsResult = await query(`
      SELECT
        fr.*,
        json_build_object(
          'id', m1.id,
          'full_name_ar', m1.full_name_ar,
          'full_name_en', m1.full_name_en,
          'generation_level', m1.generation_level
        ) as member,
        json_build_object(
          'id', m_father.id,
          'full_name_ar', m_father.full_name_ar,
          'full_name_en', m_father.full_name_en,
          'generation_level', m_father.generation_level
        ) as father,
        json_build_object(
          'id', m_mother.id,
          'full_name_ar', m_mother.full_name_ar,
          'full_name_en', m_mother.full_name_en,
          'generation_level', m_mother.generation_level
        ) as mother,
        json_build_object(
          'id', m_related.id,
          'full_name_ar', m_related.full_name_ar,
          'full_name_en', m_related.full_name_en,
          'generation_level', m_related.generation_level,
          'relationship_type', fr.relationship_type
        ) as related
      FROM family_relationships fr
      LEFT JOIN members m1 ON fr.member_id = m1.id
      LEFT JOIN members m_father ON fr.father_id = m_father.id
      LEFT JOIN members m_mother ON fr.mother_id = m_mother.id
      LEFT JOIN members m_related ON fr.related_member_id = m_related.id
      WHERE fr.member_id = $1 OR fr.related_member_id = $1
    `, [memberId]);

    const relationships = relationshipsResult.rows;

    // Build family tree structure
    const familyTree = {
      memberId,
      parents: [],
      children: [],
      siblings: [],
      spouse: null
    };

    relationships.forEach(rel => {
      if (rel.member_id === memberId) {
        if (rel.father && rel.father.id) {
          familyTree.parents.push({ ...rel.father, type: 'father' });
        }
        if (rel.mother && rel.mother.id) {
          familyTree.parents.push({ ...rel.mother, type: 'mother' });
        }
      }

      if (rel.relationship_type === 'child' && rel.member_id === memberId) {
        if (rel.related && rel.related.id) {
          familyTree.children.push(rel.related);
        }
      }

      if (rel.relationship_type === 'sibling') {
        const sibling = rel.member_id === memberId ? rel.related : rel.member;
        if (sibling && sibling.id && sibling.id !== memberId) {
          familyTree.siblings.push(sibling);
        }
      }

      if (rel.relationship_type === 'spouse') {
        const spouse = rel.member_id === memberId ? rel.related : rel.member;
        if (spouse && spouse.id) {
          familyTree.spouse = spouse;
        }
      }
    });

    res.json({
      success: true,
      data: familyTree
    });
  } catch (error) {
    console.error('Error fetching relationships:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch family relationships'
    });
  }
});

/**
 * POST /api/tree/approve-member
 * Approve a pending member registration
 */
router.post('/approve-member/:memberId', authenticate, async (req, res) => {
  try {
    const { memberId } = req.params;

    // Update member status
    const result = await query(
      `UPDATE members
       SET membership_status = $1,
           approved_at = $2,
           approved_by = $3
       WHERE id = $4
       RETURNING *`,
      ['active', new Date().toISOString(), req.user.id, memberId]
    );

    const data = result.rows[0];

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    res.json({
      success: true,
      message: 'تم اعتماد العضو بنجاح',
      data
    });
  } catch (error) {
    console.error('Error approving member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve member'
    });
  }
});

/**
 * POST /api/tree/reject-member
 * Reject a pending member registration
 */
router.post('/reject-member/:memberId', authenticate, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { reason } = req.body;

    // Update member status
    const result = await query(
      `UPDATE members
       SET membership_status = $1,
           rejection_reason = $2,
           rejected_at = $3,
           rejected_by = $4
       WHERE id = $5
       RETURNING *`,
      ['rejected', reason, new Date().toISOString(), req.user.id, memberId]
    );

    const data = result.rows[0];

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    res.json({
      success: true,
      message: 'تم رفض الطلب',
      data
    });
  } catch (error) {
    console.error('Error rejecting member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject member'
    });
  }
});

export default router;