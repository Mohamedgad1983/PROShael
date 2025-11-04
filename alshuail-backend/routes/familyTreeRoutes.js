/**
 * Family Tree API Routes
 * Al-Shuail Family Management System
 *
 * These routes provide data for the new HTML-based family tree visualization
 * Required by: admin_clan_management.html, family-tree-timeline.html
 */

import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /api/tree/stats
 * Get overall family tree statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Get total members count
    const { count: totalMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    // Get active members count
    const { count: activeMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('membership_status', 'active');

    // Get pending approvals count
    const { count: pendingApprovals } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('membership_status', 'pending_approval');

    // Get total branches count
    const { count: totalBranches } = await supabase
      .from('family_branches')
      .select('*', { count: 'exact', head: true });

    // Get generation statistics
    const { data: generationStats } = await supabase
      .from('members')
      .select('generation_level')
      .not('generation_level', 'is', null);

    const generations = generationStats ?
      [...new Set(generationStats.map(m => m.generation_level))].length : 0;

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
    const { data: branches, error } = await supabase
      .from('family_branches')
      .select(`
        *,
        branch_head:members!family_branches_branch_head_id_fkey(
          id,
          full_name_ar,
          full_name_en,
          phone
        )
      `)
      .order('branch_name', { ascending: true });

    if (error) throw error;

    // Get member counts for each branch
    const branchesWithCounts = await Promise.all((branches || []).map(async (branch) => {
      const { count } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('family_branch_id', branch.id)
        .eq('membership_status', 'active');

      const { count: pendingCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('family_branch_id', branch.id)
        .eq('membership_status', 'pending_approval');

      return {
        ...branch,
        memberCount: count || 0,
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

    let query = supabase
      .from('members')
      .select(`
        id,
        full_name_ar,
        full_name_en,
        generation_level,
        birth_order,
        date_of_birth,
        gender,
        is_alive,
        photo_url,
        family_branch_id,
        family_branches!members_family_branch_id_fkey(
          id,
          branch_name
        )
      `)
      .eq('membership_status', 'active')
      .order('generation_level', { ascending: false })
      .order('birth_order', { ascending: true });

    if (branchId) {
      query = query.eq('family_branch_id', branchId);
    }

    const { data: members, error } = await query;

    if (error) throw error;

    // Group members by generation
    const generationMap = {};
    (members || []).forEach(member => {
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

    let query = supabase
      .from('members')
      .select(`
        *,
        family_branches!members_family_branch_id_fkey(
          id,
          branch_name,
          branch_name_en
        )
      `);

    // Apply filters
    if (status) {
      query = query.eq('membership_status', status);
    }
    if (branchId) {
      query = query.eq('family_branch_id', branchId);
    }
    if (generation) {
      query = query.eq('generation_level', generation);
    }
    if (search) {
      query = query.or(`full_name_ar.ilike.%${search}%,full_name_en.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Order by generation and birth order
    query = query
      .order('generation_level', { ascending: false })
      .order('birth_order', { ascending: true })
      .order('full_name_ar', { ascending: true });

    const { data: members, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: members || [],
      count: (members || []).length
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

    // Get the member's relationships
    const { data: relationships, error } = await supabase
      .from('family_relationships')
      .select(`
        *,
        member:members!family_relationships_member_id_fkey(
          id,
          full_name_ar,
          full_name_en,
          generation_level
        ),
        father:members!family_relationships_father_id_fkey(
          id,
          full_name_ar,
          full_name_en,
          generation_level
        ),
        mother:members!family_relationships_mother_id_fkey(
          id,
          full_name_ar,
          full_name_en,
          generation_level
        ),
        related:members!family_relationships_related_member_id_fkey(
          id,
          full_name_ar,
          full_name_en,
          generation_level,
          relationship_type
        )
      `)
      .or(`member_id.eq.${memberId},related_member_id.eq.${memberId}`);

    if (error) throw error;

    // Build family tree structure
    const familyTree = {
      memberId,
      parents: [],
      children: [],
      siblings: [],
      spouse: null
    };

    (relationships || []).forEach(rel => {
      if (rel.member_id === memberId) {
        if (rel.father) familyTree.parents.push({ ...rel.father, type: 'father' });
        if (rel.mother) familyTree.parents.push({ ...rel.mother, type: 'mother' });
      }

      if (rel.relationship_type === 'child' && rel.member_id === memberId) {
        familyTree.children.push(rel.related);
      }

      if (rel.relationship_type === 'sibling') {
        const sibling = rel.member_id === memberId ? rel.related : rel.member;
        if (sibling && sibling.id !== memberId) {
          familyTree.siblings.push(sibling);
        }
      }

      if (rel.relationship_type === 'spouse') {
        familyTree.spouse = rel.member_id === memberId ? rel.related : rel.member;
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
    const { data, error } = await supabase
      .from('members')
      .update({
        membership_status: 'active',
        approved_at: new Date().toISOString(),
        approved_by: req.user.id
      })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;

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
    const { data, error } = await supabase
      .from('members')
      .update({
        membership_status: 'rejected',
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
        rejected_by: req.user.id
      })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;

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