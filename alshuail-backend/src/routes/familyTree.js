// routes/familyTree.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { supabase } from '../config/database.js';
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

// GET /api/family-tree/my-branch
// Get current user's branch and branch members
router.get('/my-branch', authenticateToken, async (req, res) => {
  try {
    const memberId = req.user.id; // Use id, not memberId

    // Get current member with their branch info
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, family_branch_id, tribal_section')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({
        success: false,
        message: 'العضو غير موجود'
      });
    }

    // Get branch info
    let branchInfo = null;
    if (member.family_branch_id) {
      const { data: branch } = await supabase
        .from('family_branches')
        .select('id, branch_name_ar, branch_name_en, member_count')
        .eq('id', member.family_branch_id)
        .single();

      if (branch) {
        branchInfo = branch;
      }
    }

    // Get all members in the same branch
    let branchMembers = [];
    if (member.family_branch_id) {
      const { data: members } = await supabase
        .from('members')
        .select('id, membership_number, full_name_ar, status')
        .eq('family_branch_id', member.family_branch_id)
        .order('full_name_ar');

      branchMembers = members || [];
    }

    res.json({
      success: true,
      branch: {
        id: branchInfo?.id || member.family_branch_id,
        name: branchInfo?.branch_name_ar || member.tribal_section || 'غير محدد',
        member_count: branchInfo?.member_count || branchMembers.length
      },
      members: branchMembers
    });

  } catch (error) {
    log.error('Error fetching my branch:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب بيانات الفخذ',
      error: error.message
    });
  }
});

// POST /api/family-tree/add-child
// Add a new child member to the family tree
router.post('/add-child', authenticateToken, async (req, res) => {
  try {
    const parentMemberId = req.user.id; // Use id, not memberId
    const { full_name, gender, birth_date } = req.body;

    // Validate required fields
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'اسم الطفل مطلوب'
      });
    }

    // Get parent member details
    const { data: parentMember, error: parentError } = await supabase
      .from('members')
      .select('id, family_branch_id, generation_level, full_name, full_name_ar, gender')
      .eq('id', parentMemberId)
      .single();

    if (parentError || !parentMember) {
      log.error('Parent member not found:', { parentMemberId, error: parentError?.message });
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على بيانات العضو الأب'
      });
    }

    // Generate new membership_number (SH-XXXX format)
    const { data: lastMember } = await supabase
      .from('members')
      .select('membership_number')
      .like('membership_number', 'SH-%')
      .order('membership_number', { ascending: false })
      .limit(1)
      .single();

    let newMembershipNumber = 1;
    if (lastMember && lastMember.membership_number) {
      const lastNumber = parseInt(lastMember.membership_number.replace('SH-', ''), 10);
      if (!isNaN(lastNumber)) {
        newMembershipNumber = lastNumber + 1;
      }
    }
    const newMembershipId = `SH-${String(newMembershipNumber).padStart(4, '0')}`;

    // Calculate generation level (parent's level + 1)
    const childGenerationLevel = (parentMember.generation_level || 1) + 1;

    // Determine relationship type based on parent's gender
    const relationshipType = parentMember.gender === 'female' ? 'mother' : 'father';
    const relationshipNameAr = parentMember.gender === 'female' ? 'أم' : 'أب';

    // Create the child member record
    // Generate a placeholder email based on membership number
    const placeholderEmail = `${newMembershipId.toLowerCase().replace('-', '')}@child.alshuail.local`;

    const childData = {
      membership_number: newMembershipId,
      full_name: full_name.trim(),
      full_name_ar: full_name.trim(),
      email: placeholderEmail,
      gender: gender || null,
      date_of_birth_hijri: birth_date || null, // Using hijri date field
      family_branch_id: parentMember.family_branch_id,
      parent_member_id: parentMemberId,
      generation_level: childGenerationLevel,
      status: 'active',
      is_active: true,
      membership_status: 'pending',
      current_balance: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newChild, error: childError } = await supabase
      .from('members')
      .insert(childData)
      .select()
      .single();

    if (childError) {
      log.error('Error creating child member:', { error: childError.message, childData });
      throw childError;
    }

    // Create family relationship record (parent -> child)
    const relationshipData = {
      member_from: parentMemberId,
      member_to: newChild.id,
      relationship_type: relationshipType,
      relationship_name_ar: relationshipNameAr,
      relationship_name_en: relationshipType,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const { error: relationshipError } = await supabase
      .from('family_relationships')
      .insert(relationshipData);

    if (relationshipError) {
      log.warn('Error creating family relationship (non-critical):', { error: relationshipError.message });
      // Continue even if relationship creation fails - member is already created
    }

    // Update branch member count
    if (parentMember.family_branch_id) {
      try {
        await supabase.rpc('increment_branch_member_count', {
          branch_id: parentMember.family_branch_id
        });
      } catch (rpcError) {
        // Silently fail if RPC doesn't exist
        log.debug('RPC increment_branch_member_count not available:', rpcError?.message);
      }
    }

    // Create audit log entry
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: req.user.id,
          action: 'ADD_CHILD',
          entity_type: 'member',
          entity_id: newChild.id,
          details: {
            parent_id: parentMemberId,
            parent_name: parentMember.full_name || parentMember.full_name_ar,
            child_name: full_name,
            membership_number: newMembershipId
          },
          ip_address: req.ip || req.connection?.remoteAddress,
          created_at: new Date().toISOString()
        });
    } catch (auditError) {
      log.warn('Failed to create audit log:', { error: auditError.message });
    }

    log.info('Child member added successfully', {
      parentId: parentMemberId,
      childId: newChild.id,
      membershipId: newMembershipId
    });

    res.status(201).json({
      success: true,
      message: 'تمت إضافة الطفل بنجاح',
      data: {
        id: newChild.id,
        membership_number: newChild.membership_number,
        full_name: newChild.full_name,
        full_name_ar: newChild.full_name_ar,
        gender: newChild.gender,
        birth_date: newChild.birth_date,
        parent_member_id: newChild.parent_member_id,
        family_branch_id: newChild.family_branch_id,
        generation_level: newChild.generation_level,
        status: newChild.status
      }
    });

  } catch (error) {
    log.error('Error adding child member:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إضافة الطفل',
      error: error.message
    });
  }
});

export default router;


