// routes/familyTree.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { log } from '../utils/logger.js';

const router = express.Router();

// GET /api/family-tree/member/:memberId
// Get family tree data for a specific member
router.get('/member/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;

    // 1. Get the member details
    const { data: member, error: _memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (_memberError) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // 2. Get parents (those who are fathers/mothers of this member)
    const { data: parents } = await supabase
      .from('family_relationships')
      .select(`
        id,
        relationship_type,
        relationship_name_ar,
        member_from (
          id,
          full_name,
          full_name_en,
          phone,
          email,
          photo_url
        )
      `)
      .eq('member_to', memberId)
      .in('relationship_type', ['father', 'mother'])
      .eq('is_active', true);

    // 3. Get children (those who this member is father/mother to)
    const { data: children } = await supabase
      .from('family_relationships')
      .select(`
        id,
        relationship_type,
        relationship_name_ar,
        member_to (
          id,
          full_name,
          full_name_en,
          phone,
          email,
          photo_url
        )
      `)
      .eq('member_from', memberId)
      .in('relationship_type', ['father', 'mother'])
      .eq('is_active', true);

    // 4. Get spouse relationships
    const { data: spouses } = await supabase
      .from('family_relationships')
      .select(`
        id,
        relationship_type,
        relationship_name_ar,
        marriage_date,
        marriage_date_hijri,
        member_to (
          id,
          full_name,
          full_name_en,
          phone,
          email,
          photo_url
        )
      `)
      .eq('member_from', memberId)
      .eq('relationship_type', 'spouse')
      .eq('is_active', true);

    // 5. Get siblings (share same parents)
    let siblings = [];
    if (parents && parents.length > 0) {
      const parentIds = parents.map(p => p.member_from.id);

      const { data: siblingsData } = await supabase
        .from('family_relationships')
        .select(`
          member_to (
            id,
            full_name,
            full_name_en,
            phone,
            email,
            photo_url
          )
        `)
        .in('member_from', parentIds)
        .in('relationship_type', ['father', 'mother'])
        .neq('member_to', memberId)
        .eq('is_active', true);

      // Remove duplicates
      const uniqueSiblings = new Map();
      siblingsData?.forEach(s => {
        uniqueSiblings.set(s.member_to.id, s.member_to);
      });
      siblings = Array.from(uniqueSiblings.values());
    }

    // 6. Build response
    const familyTree = {
      member: {
        ...member,
        role: 'self'
      },
      relationships: {
        parents: parents?.map(p => ({
          ...p.member_from,
          relationship: p.relationship_name_ar,
          relationship_type: p.relationship_type
        })) || [],
        children: children?.map(c => ({
          ...c.member_to,
          relationship: c.relationship_name_ar,
          relationship_type: c.relationship_type
        })) || [],
        spouses: spouses?.map(s => ({
          ...s.member_to,
          relationship: s.relationship_name_ar,
          relationship_type: s.relationship_type,
          marriage_date: s.marriage_date,
          marriage_date_hijri: s.marriage_date_hijri
        })) || [],
        siblings: siblings
      },
      statistics: {
        total_parents: parents?.length || 0,
        total_children: children?.length || 0,
        total_spouses: spouses?.length || 0,
        total_siblings: siblings.length,
        total_family_members: (parents?.length || 0) + (children?.length || 0) + (spouses?.length || 0) + siblings.length + 1
      }
    };

    res.json({
      success: true,
      data: familyTree
    });

  } catch (error) {
    log.error('Error fetching family tree:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching family tree',
      error: error.message
    });
  }
});

// GET /api/family-tree/visualization/:memberId
// Get simplified tree structure for D3/visualization libraries
router.get('/visualization/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { depth = 4 } = req.query; // How many generations to fetch

    // Get all members for building the tree
    const { data: allMembers, error: allMembersError } = await supabase
      .from('members')
      .select(`
        id,
        member_id,
        full_name,
        full_name_ar,
        full_name_en,
        phone,
        parent_member_id,
        spouse_id,
        generation_level,
        gender,
        is_active,
        current_balance,
        photo_url
      `)
      .eq('is_active', true);

    if (allMembersError) {
      log.error('Error fetching members:', { error: allMembersError.message });
      return res.status(500).json({
        success: false,
        message: 'Error fetching members'
      });
    }

    // Find the target member
    const targetMember = allMembers.find(m => m.id === memberId);
    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Build tree structure using parent_member_id from members table
    const buildMemberTree = (targetMemberId, currentDepth = 0, maxDepth = parseInt(depth)) => {
      if (currentDepth > maxDepth) return null;

      const member = allMembers.find(m => m.id === targetMemberId);
      if (!member) return null;

      // Get children of this member (members whose parent_member_id is this member)
      const children = allMembers
        .filter(m => m.parent_member_id === targetMemberId)
        .map(child => buildMemberTree(child.id, currentDepth + 1, maxDepth))
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
            photo_url: spouseMember.photo_url
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
        photo_url: member.photo_url,
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
        message: 'Could not build tree data'
      });
    }

    res.json({
      success: true,
      data: treeData
    });

  } catch (error) {
    log.error('Error building family tree visualization:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error building family tree',
      error: error.message
    });
  }
});

// POST /api/family-tree/relationship
// Add a new family relationship
router.post('/relationship', authenticateToken, async (req, res) => {
  try {
    const {
      member_from,
      member_to,
      relationship_type,
      relationship_name_ar,
      relationship_name_en,
      marriage_date,
      marriage_date_hijri
    } = req.body;

    // Validate required fields
    if (!member_from || !member_to || !relationship_type || !relationship_name_ar) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('family_relationships')
      .select('id')
      .eq('member_from', member_from)
      .eq('member_to', member_to)
      .eq('relationship_type', relationship_type)
      .eq('is_active', true)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This relationship already exists'
      });
    }

    // Create the relationship
    const { data: _data, error: _error } = await supabase
      .from('family_relationships')
      .insert({
        member_from,
        member_to,
        relationship_type,
        relationship_name_ar,
        relationship_name_en,
        marriage_date,
        marriage_date_hijri,
        is_active: true
      })
      .select()
      .single();

    if (_error) {throw _error;}

    res.status(201).json({
      success: true,
      message: 'Relationship created successfully',
      data: _data
    });

  } catch (error) {
    log.error('Error creating relationship:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error creating relationship',
      error: error.message
    });
  }
});

// PUT /api/family-tree/relationship/:id
// Update a family relationship
router.put('/relationship/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: _data, error: _error } = await supabase
      .from('family_relationships')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (_error) {throw _error;}

    res.json({
      success: true,
      message: 'Relationship updated successfully',
      data: _data
    });

  } catch (error) {
    log.error('Error updating relationship:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error updating relationship',
      error: error.message
    });
  }
});

// DELETE /api/family-tree/relationship/:id
// Soft delete a relationship
router.delete('/relationship/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('family_relationships')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {throw error;}

    res.json({
      success: true,
      message: 'Relationship deleted successfully'
    });

  } catch (error) {
    log.error('Error deleting relationship:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error deleting relationship',
      error: error.message
    });
  }
});

// GET /api/family-tree/search
// Search for family members to add relationships
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const { data: _data, error: _error } = await supabase
      .from('members')
      .select('id, full_name, full_name_en, phone, email')
      .or(`full_name.ilike.%${query}%,full_name_en.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(20);

    if (_error) {throw _error;}

    res.json({
      success: true,
      data: _data
    });

  } catch (error) {
    log.error('Error searching members:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error searching members',
      error: error.message
    });
  }
});

export default router;