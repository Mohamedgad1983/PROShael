// Family Tree Controller
import { createClient } from '@supabase/supabase-js';
import {
  buildTreeStructure,
  getDescendants,
  getAncestors,
  getSiblings,
  calculateRelationship,
  generateD3TreeData,
  getGenerationStats
} from '../utils/tree-generator.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get complete family tree
 * GET /api/family-tree
 */
export const getFullTree = async (req, res) => {
  try {
    const { subdivision_id } = req.query;

    let query = supabase
      .from('members')
      .select(`
        *,
        family_branches (
          id,
          branch_name
        ),
        member_photos!left (
          id,
          photo_url,
          photo_type
        )
      `)
      .eq('is_active', true)
      .eq('registration_status', 'approved');

    // Filter by subdivision if provided
    if (subdivision_id) {
      query = query.eq('family_branch_id', subdivision_id);
    }

    const { data: members, error } = await query;

    if (error) {
      console.error('Get Tree Error:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب شجرة العائلة'
      });
    }

    // Add photo URL to member object
    const membersWithPhotos = members.map(member => ({
      ...member,
      photo_url: member.member_photos?.[0]?.photo_url || null
    }));

    // Generate tree structure
    const treeData = generateD3TreeData(membersWithPhotos);

    // Get statistics
    const stats = getGenerationStats(membersWithPhotos);

    res.json({
      success: true,
      data: {
        tree: treeData,
        total_members: members.length,
        generations: stats
      }
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Get member's family relationships
 * GET /api/family-tree/:memberId/relationships
 */
export const getMemberRelationships = async (req, res) => {
  try {
    const { memberId } = req.params;

    // Get all members for relationship calculation
    const { data: allMembers, error: membersError } = await supabase
      .from('members')
      .select('*')
      .eq('is_active', true);

    if (membersError) {
      console.error('Get Members Error:', membersError);
      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب الأعضاء'
      });
    }

    const { memberMap } = buildTreeStructure(allMembers);

    // Get relationships
    const relationships = {
      parents: [],
      children: [],
      siblings: [],
      spouse: null,
      ancestors: [],
      descendants: []
    };

    const member = memberMap.get(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'العضو غير موجود'
      });
    }

    // Parents
    if (member.parent_member_id) {
      const parent = memberMap.get(member.parent_member_id);
      if (parent) {
        relationships.parents.push({
          id: parent.id,
          name: parent.full_name_ar,
          member_id: parent.member_id
        });
      }
    }

    // Children
    if (member.children) {
      relationships.children = member.children.map(child => ({
        id: child.id,
        name: child.full_name_ar,
        member_id: child.member_id
      }));
    }

    // Siblings
    const siblings = getSiblings(memberId, memberMap);
    relationships.siblings = siblings.map(sibling => ({
      id: sibling.id,
      name: sibling.full_name_ar,
      member_id: sibling.member_id
    }));

    // Spouse
    if (member.spouse_id) {
      const spouse = memberMap.get(member.spouse_id);
      if (spouse) {
        relationships.spouse = {
          id: spouse.id,
          name: spouse.full_name_ar,
          member_id: spouse.member_id
        };
      }
    }

    // Ancestors (up to 3 generations)
    const ancestors = getAncestors(memberId, memberMap).slice(0, 3);
    relationships.ancestors = ancestors.map(ancestor => ({
      id: ancestor.id,
      name: ancestor.full_name_ar,
      member_id: ancestor.member_id,
      generation_level: ancestor.generation_level
    }));

    // Descendants (up to 2 generations)
    const descendants = getDescendants(memberId, memberMap).slice(0, 10);
    relationships.descendants = descendants.map(descendant => ({
      id: descendant.id,
      name: descendant.full_name_ar,
      member_id: descendant.member_id,
      generation_level: descendant.generation_level
    }));

    res.json({
      success: true,
      data: relationships
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Search family tree members
 * GET /api/family-tree/search
 */
export const searchMembers = async (req, res) => {
  try {
    const { query: searchQuery } = req.query;

    if (!searchQuery || searchQuery.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'يجب إدخال حرفين على الأقل للبحث'
      });
    }

    const { data: members, error } = await supabase
      .from('members')
      .select(`
        id,
        member_id,
        full_name_ar,
        full_name_en,
        phone,
        family_branches (
          id,
          branch_name
        )
      `)
      .eq('is_active', true)
      .or(`full_name_ar.ilike.%${searchQuery}%,full_name_en.ilike.%${searchQuery}%,member_id.ilike.%${searchQuery}%`)
      .limit(20);

    if (error) {
      console.error('Search Error:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في البحث'
      });
    }

    res.json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Get family tree statistics
 * GET /api/family-tree/stats
 */
export const getTreeStats = async (req, res) => {
  try {
    // Total members
    const { count: totalMembers } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get all members for generation stats
    const { data: members } = await supabase
      .from('members')
      .select('id, generation_level')
      .eq('is_active', true);

    const generationStats = getGenerationStats(members);

    res.json({
      success: true,
      data: {
        total_members: totalMembers || 0,
        generations: generationStats
      }
    });
  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

// Re-export extended controller methods
export {
  getBranches,
  getGenerations,
  getMembers,
  getRelationships,
  approveMember,
  rejectMember,
  getUnassignedMembers,
  assignMemberToBranch,
  bulkAssignMembers
} from './family-tree-extended.controller.js';
