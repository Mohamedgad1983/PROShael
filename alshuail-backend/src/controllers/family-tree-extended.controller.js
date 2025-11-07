/**
 * Extended Family Tree Controller Methods
 * For HTML-based family tree interface
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get all family branches (الفخوذ)
 * GET /api/tree/branches
 */
export const getBranches = async (req, res) => {
  try {
    // Simplified query without branch_head JOIN to avoid FK issues
    const { data: branches, error } = await supabase
      .from('family_branches')
      .select('*')
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
};

/**
 * Get members organized by generation
 * GET /api/tree/generations
 */
export const getGenerations = async (req, res) => {
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

    let query = supabase
      .from('members')
      .select(`
        *,
        family_branches(
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
      // Fixed: Use proper column references with quotes for Supabase
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Order by name only (generation_level can be NULL causing errors)
    query = query
      .order('full_name', { ascending: true });

    const { data: members, error } = await query;

    if (error) {
      console.error('Supabase query error details:', error);
      throw error;
    }

    // Map column names to match frontend expectations
    const mappedMembers = (members || []).map(member => ({
      ...member,
      full_name_ar: member.full_name, // Map full_name to full_name_ar for frontend
      birth_date: member.date_of_birth // Map date_of_birth to birth_date for frontend
    }));

    res.json({
      success: true,
      data: mappedMembers,
      count: mappedMembers.length
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    console.error('Error details:', error.message, error.details, error.hint);
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
};

/**
 * Approve a pending member registration
 * POST /api/tree/approve-member/:memberId
 */
export const approveMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    // Update member status
    const { data, error } = await supabase
      .from('members')
      .update({
        membership_status: 'active',
        approved_at: new Date().toISOString(),
        approved_by: req.user?.id || 'admin'
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
    const { data, error } = await supabase
      .from('members')
      .update({
        membership_status: 'rejected',
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
        rejected_by: req.user?.id || 'admin'
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
};

/**
 * Get unassigned members (members without branch assignment)
 * GET /api/tree/unassigned-members
 */
export const getUnassignedMembers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    // Base query for unassigned members
    let query = supabase
      .from('members')
      .select('*', { count: 'exact' })
      .is('family_branch_id', null)
      .eq('membership_status', 'active');

    // Apply search filter if provided
    if (search) {
      query = query.or(`full_name_ar.ilike.%${search}%,full_name_en.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: members, error, count } = await query;

    if (error) throw error;

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
    console.error('Error fetching unassigned members:', error);
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
    const { data: branch, error: branchError } = await supabase
      .from('family_branches')
      .select('id, branch_name')
      .eq('id', branchId)
      .single();

    if (branchError || !branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found'
      });
    }

    // Update member's branch assignment
    const { data: member, error: updateError } = await supabase
      .from('members')
      .update({
        family_branch_id: branchId,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select(`
        *,
        family_branches!members_family_branch_id_fkey(
          id,
          branch_name,
          branch_name_en
        )
      `)
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: `تم تعيين العضو إلى فخذ ${branch.branch_name}`,
      data: member
    });
  } catch (error) {
    console.error('Error assigning member to branch:', error);
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
        const { data, error } = await supabase
          .from('members')
          .update({
            family_branch_id: branchId,
            updated_at: new Date().toISOString()
          })
          .eq('id', memberId)
          .select()
          .single();

        if (error) throw error;

        results.push({ memberId, branchId, success: true });
      } catch (error) {
        errors.push({ memberId, branchId, error: error.message });
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
    console.error('Error bulk assigning members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk assign members'
    });
  }
};