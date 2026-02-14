// Family Tree Controller
import { query } from "../services/database.js";
import { log } from '../utils/logger.js';
import {
  buildTreeStructure,
  getDescendants,
  getAncestors,
  getSiblings,
  generateD3TreeData,
  getGenerationStats
} from '../utils/tree-generator.js';


/**
 * Get complete family tree
 * GET /api/family-tree
 */
export const getFullTree = async (req, res) => {
  try {
    const { subdivision_id } = req.query;

    const conditions = ["is_active = true", "membership_status = 'active'"];
    const params = [];
    let paramIndex = 1;

    // Filter by subdivision if provided
    if (subdivision_id) {
      conditions.push(`family_branch_id = $${paramIndex++}`);
      params.push(subdivision_id);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const { rows: members } = await query(`SELECT * FROM members ${whereClause}`, params);

    // Get member photos separately
    const memberIds = members.map(m => m.id);
    let memberPhotos = [];
    if (memberIds.length > 0) {
      const { rows: photos } = await query(
        'SELECT member_id, photo_url FROM member_photos WHERE member_id = ANY($1)',
        [memberIds]
      );
      memberPhotos = photos || [];
    }
    const photoMap = {};
    memberPhotos.forEach(p => { if (!photoMap[p.member_id]) { photoMap[p.member_id] = p.photo_url; } });

    // Add photo URL to member object
    const membersWithPhotos = members.map(member => ({
      ...member,
      photo_url: photoMap[member.id] || null
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
    log.error('Failed to fetch full family tree', { error: error.message, stack: error.stack });
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
    const { rows: allMembers } = await query(
      'SELECT * FROM members WHERE is_active = true'
    );

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
    log.error('Failed to fetch member relationships', { error: error.message, stack: error.stack, memberId: req.params.memberId });
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

    const searchPattern = `%${searchQuery}%`;

    const { rows: members } = await query(
      `SELECT m.id, m.member_id, m.full_name_ar, m.full_name_en, m.phone,
              fb.id AS branch_id, fb.branch_name
       FROM members m
       LEFT JOIN family_branches fb ON m.family_branch_id = fb.id
       WHERE m.is_active = true
         AND (m.full_name_ar ILIKE $1 OR m.full_name_en ILIKE $1 OR m.member_id ILIKE $1)
       LIMIT 20`,
      [searchPattern]
    );

    // Format to match previous nested structure
    const formattedMembers = members.map(m => ({
      id: m.id,
      member_id: m.member_id,
      full_name_ar: m.full_name_ar,
      full_name_en: m.full_name_en,
      phone: m.phone,
      family_branches: m.branch_id ? {
        id: m.branch_id,
        branch_name: m.branch_name
      } : null
    }));

    res.json({
      success: true,
      count: formattedMembers.length,
      data: formattedMembers
    });
  } catch (error) {
    log.error('Failed to search family tree members', { error: error.message, stack: error.stack });
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
    const { rows: countRows } = await query(
      "SELECT COUNT(*)::int AS count FROM members WHERE is_active = true"
    );
    const totalMembers = countRows[0].count;

    // Get all members for generation stats
    const { rows: members } = await query(
      "SELECT id, generation_level FROM members WHERE is_active = true"
    );

    const generationStats = getGenerationStats(members);

    res.json({
      success: true,
      data: {
        total_members: totalMembers || 0,
        generations: generationStats
      }
    });
  } catch (error) {
    log.error('Failed to fetch tree stats', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * Get family tree visualization data for a specific member
 * GET /api/family-tree/visualization/:memberId
 */
export const getVisualization = async (req, res) => {
  try {
    const { memberId } = req.params;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العضو مطلوب'
      });
    }

    // Get all members for building relationships
    const { rows: allMembers } = await query(
      `SELECT m.id, m.member_id, m.full_name, m.full_name_ar, m.full_name_en,
              m.phone, m.parent_member_id, m.spouse_id, m.generation_level,
              m.gender, m.is_active, m.current_balance,
              mp.photo_url
       FROM members m
       LEFT JOIN member_photos mp ON m.id = mp.member_id
       WHERE m.is_active = true`
    );

    // Find the target member
    const targetMember = allMembers.find(m => m.id === memberId);
    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: 'العضو غير موجود'
      });
    }

    // Build the tree structure
    const buildMemberTree = (targetMemberId, depth = 0, maxDepth = 4) => {
      if (depth > maxDepth) { return null; }

      const member = allMembers.find(m => m.id === targetMemberId);
      if (!member) { return null; }

      // Get children of this member
      const children = allMembers
        .filter(m => m.parent_member_id === targetMemberId)
        .map(child => buildMemberTree(child.id, depth + 1, maxDepth))
        .filter(child => child !== null);

      // Get spouse
      let spouse = null;
      if (member.spouse_id) {
        const spouseMember = allMembers.find(m => m.id === member.spouse_id);
        if (spouseMember) {
          spouse = {
            id: spouseMember.id,
            name: spouseMember.full_name_ar || spouseMember.full_name || spouseMember.full_name_en,
            memberId: spouseMember.member_id,
            phoneNumber: spouseMember.phone,
            balance: spouseMember.current_balance || 0,
            photo_url: spouseMember.photo_url || null
          };
        }
      }

      // Get parents
      const parents = [];
      if (member.parent_member_id) {
        const parentMember = allMembers.find(m => m.id === member.parent_member_id);
        if (parentMember) {
          parents.push({
            id: parentMember.id,
            name: parentMember.full_name_ar || parentMember.full_name || parentMember.full_name_en,
            memberId: parentMember.member_id,
            type: 'parent'
          });
        }
      }

      // Get siblings (same parent)
      const siblings = allMembers
        .filter(m =>
          m.parent_member_id === member.parent_member_id &&
          m.id !== targetMemberId &&
          member.parent_member_id !== null
        )
        .map(sibling => ({
          id: sibling.id,
          name: sibling.full_name_ar || sibling.full_name || sibling.full_name_en,
          memberId: sibling.member_id
        }));

      return {
        id: member.id,
        name: member.full_name_ar || member.full_name || member.full_name_en,
        memberId: member.member_id,
        phoneNumber: member.phone,
        balance: member.current_balance || 0,
        generation: member.generation_level || 0,
        gender: member.gender,
        photo_url: member.photo_url || null,
        children: children,
        spouse: spouse,
        parents: parents,
        siblings: siblings
      };
    };

    // Build tree starting from the requested member
    const treeData = buildMemberTree(memberId);

    if (!treeData) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على بيانات الشجرة'
      });
    }

    res.json({
      success: true,
      data: treeData
    });

  } catch (error) {
    log.error('Failed to generate tree visualization', { error: error.message, stack: error.stack, memberId: req.params.memberId });
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
