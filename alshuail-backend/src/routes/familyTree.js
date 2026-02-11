// routes/familyTree.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../services/database.js';
import { log } from '../utils/logger.js';

const router = express.Router();

// GET /api/family-tree/member/:memberId
// Get family tree data for a specific member
router.get('/member/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;

    // 1. Get the member details
    const memberResult = await query(
      'SELECT * FROM members WHERE id = $1',
      [memberId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    const member = memberResult.rows[0];

    // 2. Get parents (those who are fathers/mothers of this member)
    const parentsResult = await query(`
      SELECT
        fr.id,
        fr.relationship_type,
        fr.relationship_name_ar,
        m.id as member_id,
        m.full_name,
        m.full_name_en,
        m.phone,
        m.email,
        m.photo_url
      FROM family_relationships fr
      JOIN members m ON fr.member_from = m.id
      WHERE fr.member_to = $1
        AND fr.relationship_type = ANY($2)
        AND fr.is_active = true
    `, [memberId, ['father', 'mother']]);

    const parents = parentsResult.rows.map(row => ({
      id: row.id,
      relationship_type: row.relationship_type,
      relationship_name_ar: row.relationship_name_ar,
      member_from: {
        id: row.member_id,
        full_name: row.full_name,
        full_name_en: row.full_name_en,
        phone: row.phone,
        email: row.email,
        photo_url: row.photo_url
      }
    }));

    // 3. Get children (those who this member is father/mother to)
    const childrenResult = await query(`
      SELECT
        fr.id,
        fr.relationship_type,
        fr.relationship_name_ar,
        m.id as member_id,
        m.full_name,
        m.full_name_en,
        m.phone,
        m.email,
        m.photo_url
      FROM family_relationships fr
      JOIN members m ON fr.member_to = m.id
      WHERE fr.member_from = $1
        AND fr.relationship_type = ANY($2)
        AND fr.is_active = true
    `, [memberId, ['father', 'mother']]);

    const children = childrenResult.rows.map(row => ({
      id: row.id,
      relationship_type: row.relationship_type,
      relationship_name_ar: row.relationship_name_ar,
      member_to: {
        id: row.member_id,
        full_name: row.full_name,
        full_name_en: row.full_name_en,
        phone: row.phone,
        email: row.email,
        photo_url: row.photo_url
      }
    }));

    // 4. Get spouse relationships
    const spousesResult = await query(`
      SELECT
        fr.id,
        fr.relationship_type,
        fr.relationship_name_ar,
        fr.marriage_date,
        fr.marriage_date_hijri,
        m.id as member_id,
        m.full_name,
        m.full_name_en,
        m.phone,
        m.email,
        m.photo_url
      FROM family_relationships fr
      JOIN members m ON fr.member_to = m.id
      WHERE fr.member_from = $1
        AND fr.relationship_type = 'spouse'
        AND fr.is_active = true
    `, [memberId]);

    const spouses = spousesResult.rows.map(row => ({
      id: row.id,
      relationship_type: row.relationship_type,
      relationship_name_ar: row.relationship_name_ar,
      marriage_date: row.marriage_date,
      marriage_date_hijri: row.marriage_date_hijri,
      member_to: {
        id: row.member_id,
        full_name: row.full_name,
        full_name_en: row.full_name_en,
        phone: row.phone,
        email: row.email,
        photo_url: row.photo_url
      }
    }));

    // 5. Get siblings (share same parents)
    let siblings = [];
    if (parents && parents.length > 0) {
      const parentIds = parents.map(p => p.member_from.id);

      const siblingsResult = await query(`
        SELECT DISTINCT
          m.id,
          m.full_name,
          m.full_name_en,
          m.phone,
          m.email,
          m.photo_url
        FROM family_relationships fr
        JOIN members m ON fr.member_to = m.id
        WHERE fr.member_from = ANY($1)
          AND fr.relationship_type = ANY($2)
          AND fr.member_to != $3
          AND fr.is_active = true
      `, [parentIds, ['father', 'mother'], memberId]);

      siblings = siblingsResult.rows;
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
    const allMembersResult = await query(`
      SELECT
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
      FROM members
      WHERE is_active = true
    `);

    const allMembers = allMembersResult.rows;

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
    const existingResult = await query(`
      SELECT id FROM family_relationships
      WHERE member_from = $1
        AND member_to = $2
        AND relationship_type = $3
        AND is_active = true
      LIMIT 1
    `, [member_from, member_to, relationship_type]);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This relationship already exists'
      });
    }

    // Create the relationship
    const insertResult = await query(`
      INSERT INTO family_relationships (
        member_from,
        member_to,
        relationship_type,
        relationship_name_ar,
        relationship_name_en,
        marriage_date,
        marriage_date_hijri,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *
    `, [
      member_from,
      member_to,
      relationship_type,
      relationship_name_ar,
      relationship_name_en,
      marriage_date,
      marriage_date_hijri
    ]);

    res.status(201).json({
      success: true,
      message: 'Relationship created successfully',
      data: insertResult.rows[0]
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

    // Build dynamic UPDATE query
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const updateResult = await query(
      `UPDATE family_relationships SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Relationship not found'
      });
    }

    res.json({
      success: true,
      message: 'Relationship updated successfully',
      data: updateResult.rows[0]
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

    await query(
      'UPDATE family_relationships SET is_active = false WHERE id = $1',
      [id]
    );

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
    const { query: searchQuery } = req.query;

    if (!searchQuery || searchQuery.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchPattern = `%${searchQuery}%`;
    const searchResult = await query(`
      SELECT id, full_name, full_name_en, phone, email
      FROM members
      WHERE full_name ILIKE $1
        OR full_name_en ILIKE $1
        OR phone ILIKE $1
      LIMIT 20
    `, [searchPattern]);

    res.json({
      success: true,
      data: searchResult.rows
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
    const memberResult = await query(
      'SELECT id, family_branch_id, tribal_section FROM members WHERE id = $1',
      [memberId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'العضو غير موجود'
      });
    }
    const member = memberResult.rows[0];

    // Get branch info
    let branchInfo = null;
    if (member.family_branch_id) {
      const branchResult = await query(
        'SELECT id, branch_name_ar, branch_name_en, member_count FROM family_branches WHERE id = $1',
        [member.family_branch_id]
      );

      if (branchResult.rows.length > 0) {
        branchInfo = branchResult.rows[0];
      }
    }

    // Get all members in the same branch
    let branchMembers = [];
    if (member.family_branch_id) {
      const membersResult = await query(`
        SELECT id, membership_number, full_name_ar, status
        FROM members
        WHERE family_branch_id = $1
        ORDER BY full_name_ar
      `, [member.family_branch_id]);

      branchMembers = membersResult.rows;
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
    const parentResult = await query(
      'SELECT id, family_branch_id, generation_level, full_name, full_name_ar, gender FROM members WHERE id = $1',
      [parentMemberId]
    );

    if (parentResult.rows.length === 0) {
      log.error('Parent member not found:', { parentMemberId });
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على بيانات العضو الأب'
      });
    }
    const parentMember = parentResult.rows[0];

    // Generate new membership_number (SH-XXXX format)
    const lastMemberResult = await query(`
      SELECT membership_number
      FROM members
      WHERE membership_number LIKE 'SH-%'
      ORDER BY membership_number DESC
      LIMIT 1
    `);

    let newMembershipNumber = 1;
    if (lastMemberResult.rows.length > 0 && lastMemberResult.rows[0].membership_number) {
      const lastNumber = parseInt(lastMemberResult.rows[0].membership_number.replace('SH-', ''), 10);
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

    const childResult = await query(`
      INSERT INTO members (
        membership_number,
        full_name,
        full_name_ar,
        email,
        gender,
        date_of_birth_hijri,
        family_branch_id,
        parent_member_id,
        generation_level,
        status,
        is_active,
        membership_status,
        current_balance,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      newMembershipId,
      full_name.trim(),
      full_name.trim(),
      placeholderEmail,
      gender || null,
      birth_date || null,
      parentMember.family_branch_id,
      parentMemberId,
      childGenerationLevel,
      'active',
      true,
      'pending',
      0,
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    const newChild = childResult.rows[0];

    // Create family relationship record (parent -> child)
    try {
      await query(`
        INSERT INTO family_relationships (
          member_from,
          member_to,
          relationship_type,
          relationship_name_ar,
          relationship_name_en,
          is_active,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        parentMemberId,
        newChild.id,
        relationshipType,
        relationshipNameAr,
        relationshipType,
        true,
        new Date().toISOString()
      ]);
    } catch (relationshipError) {
      log.warn('Error creating family relationship (non-critical):', { error: relationshipError.message });
      // Continue even if relationship creation fails - member is already created
    }

    // Update branch member count
    if (parentMember.family_branch_id) {
      try {
        await query(
          'SELECT increment_branch_member_count($1)',
          [parentMember.family_branch_id]
        );
      } catch (rpcError) {
        // Silently fail if function doesn't exist
        log.debug('Function increment_branch_member_count not available:', rpcError?.message);
      }
    }

    // Create audit log entry
    try {
      await query(`
        INSERT INTO audit_logs (
          user_id,
          action,
          entity_type,
          entity_id,
          details,
          ip_address,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        req.user.id,
        'ADD_CHILD',
        'member',
        newChild.id,
        JSON.stringify({
          parent_id: parentMemberId,
          parent_name: parentMember.full_name || parentMember.full_name_ar,
          child_name: full_name,
          membership_number: newMembershipId
        }),
        req.ip || req.connection?.remoteAddress,
        new Date().toISOString()
      ]);
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
