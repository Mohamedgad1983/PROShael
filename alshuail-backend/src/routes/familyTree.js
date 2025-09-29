import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * Get family tree structure for a specific member
 * Builds hierarchical tree from relationships
 */
router.get('/tree/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;

    // First, get the member details
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Get all relationships for this member
    const { data: relationships, error: relError } = await supabase
      .from('family_relationships')
      .select('*')
      .or(`member_from.eq.${memberId},member_to.eq.${memberId}`);

    if (relError) {
      console.error('Error fetching relationships:', relError);
      return res.status(500).json({ error: 'Failed to fetch relationships' });
    }

    // Build family tree structure
    const familyTree = await buildFamilyTree(member, relationships || []);

    res.json({
      success: true,
      data: familyTree,
      relationshipCount: relationships?.length || 0
    });

  } catch (error) {
    console.error('Error in family tree endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all relationships for a specific member
 */
router.get('/relationships/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;

    const { data: relationships, error } = await supabase
      .from('family_relationships')
      .select('*')
      .or(`member_from.eq.${memberId},member_to.eq.${memberId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching relationships:', error);
      return res.status(500).json({ error: 'Failed to fetch relationships' });
    }

    // Format relationships for easier consumption
    const formattedRelationships = (relationships || []).map(rel => {
      const isMemberSource = rel.member_from === memberId;
      return {
        id: rel.id,
        relationshipType: rel.relationship_type,
        relationshipNameAr: rel.relationship_name_ar,
        relationshipNameEn: rel.relationship_name_en,
        memberFromId: rel.member_from,
        memberToId: rel.member_to,
        direction: isMemberSource ? 'outgoing' : 'incoming',
        isActive: rel.is_active,
        createdAt: rel.created_at
      };
    });

    res.json({
      success: true,
      data: formattedRelationships,
      count: formattedRelationships.length
    });

  } catch (error) {
    console.error('Error fetching relationships:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create a new family relationship
 */
router.post('/relationships', authenticateToken, async (req, res) => {
  try {
    const { memberFrom, memberTo, relationshipType } = req.body;

    // Validate input
    if (!memberFrom || !memberTo || !relationshipType) {
      return res.status(400).json({
        error: 'Missing required fields: memberFrom, memberTo, relationshipType'
      });
    }

    // Validate relationship type
    const validTypes = ['father', 'mother', 'spouse', 'child', 'sibling', 'grandfather', 'grandmother', 'uncle', 'aunt', 'cousin'];
    if (!validTypes.includes(relationshipType)) {
      return res.status(400).json({
        error: `Invalid relationship type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('family_relationships')
      .select('id')
      .eq('member_from', memberFrom)
      .eq('member_to', memberTo)
      .eq('relationship_type', relationshipType)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Relationship already exists' });
    }

    // Create the relationship
    const relationshipNames = {
      father: { ar: 'أب', en: 'Father' },
      mother: { ar: 'أم', en: 'Mother' },
      spouse: { ar: 'زوج/زوجة', en: 'Spouse' },
      child: { ar: 'ابن/ابنة', en: 'Child' },
      sibling: { ar: 'أخ/أخت', en: 'Sibling' },
      grandfather: { ar: 'جد', en: 'Grandfather' },
      grandmother: { ar: 'جدة', en: 'Grandmother' },
      uncle: { ar: 'عم/خال', en: 'Uncle' },
      aunt: { ar: 'عمة/خالة', en: 'Aunt' },
      cousin: { ar: 'ابن عم/ابن خال', en: 'Cousin' }
    };

    const { data: relationship, error } = await supabase
      .from('family_relationships')
      .insert({
        member_from: memberFrom,
        member_to: memberTo,
        relationship_type: relationshipType,
        relationship_name_ar: relationshipNames[relationshipType]?.ar || relationshipType,
        relationship_name_en: relationshipNames[relationshipType]?.en || relationshipType,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating relationship:', error);
      return res.status(500).json({ error: 'Failed to create relationship' });
    }

    res.status(201).json({
      success: true,
      data: relationship,
      message: 'Relationship created successfully'
    });

  } catch (error) {
    console.error('Error creating relationship:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update a relationship (verify or change type)
 */
router.put('/relationships/:relationshipId', authenticateToken, async (req, res) => {
  try {
    const { relationshipId } = req.params;
    const { isVerified, relationshipType } = req.body;

    const updateData = {};
    if (typeof isVerified === 'boolean') updateData.is_verified = isVerified;
    if (relationshipType) updateData.relationship_type = relationshipType;

    const { data: relationship, error } = await supabase
      .from('family_relationships')
      .update(updateData)
      .eq('id', relationshipId)
      .select()
      .single();

    if (error) {
      console.error('Error updating relationship:', error);
      return res.status(500).json({ error: 'Failed to update relationship' });
    }

    res.json({
      success: true,
      data: relationship,
      message: 'Relationship updated successfully'
    });

  } catch (error) {
    console.error('Error updating relationship:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete a relationship
 */
router.delete('/relationships/:relationshipId', authenticateToken, async (req, res) => {
  try {
    const { relationshipId } = req.params;

    const { error } = await supabase
      .from('family_relationships')
      .delete()
      .eq('id', relationshipId);

    if (error) {
      console.error('Error deleting relationship:', error);
      return res.status(500).json({ error: 'Failed to delete relationship' });
    }

    res.json({
      success: true,
      message: 'Relationship deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting relationship:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get family statistics for analytics
 */
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    // Get total relationships count
    const { count: totalRelationships } = await supabase
      .from('family_relationships')
      .select('*', { count: 'exact', head: true });

    // Get relationship type distribution
    const { data: typeDistribution } = await supabase
      .from('family_relationships')
      .select('relationship_type')
      .order('relationship_type');

    // Count by type
    const typeCounts = {};
    (typeDistribution || []).forEach(rel => {
      typeCounts[rel.relationship_type] = (typeCounts[rel.relationship_type] || 0) + 1;
    });

    // Get members with most relationships
    const { data: connectedMembers } = await supabase
      .rpc('get_most_connected_members', { limit_count: 10 });

    res.json({
      success: true,
      data: {
        totalRelationships,
        relationshipTypes: typeCounts,
        mostConnectedMembers: connectedMembers || [],
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper function to build hierarchical family tree
 */
async function buildFamilyTree(rootMember, relationships) {
  const tree = {
    id: rootMember.id,
    name: rootMember.name,
    phoneNumber: rootMember.phone_number,
    memberId: rootMember.member_id,
    balance: rootMember.balance,
    avatarUrl: rootMember.avatar_url,
    tribalSection: rootMember.tribal_section,
    children: [],
    parents: [],
    spouse: null,
    siblings: []
  };

  // Get related member IDs to fetch their details
  const relatedMemberIds = new Set();
  relationships.forEach(rel => {
    if (rel.member_from === rootMember.id) {
      relatedMemberIds.add(rel.member_to);
    } else {
      relatedMemberIds.add(rel.member_from);
    }
  });

  // Fetch related member details if any relationships exist
  let memberDetails = {};
  if (relatedMemberIds.size > 0) {
    const { data: relatedMembers } = await supabase
      .from('members')
      .select('id, name, phone_number, member_id')
      .in('id', Array.from(relatedMemberIds));

    if (relatedMembers) {
      relatedMembers.forEach(member => {
        memberDetails[member.id] = member;
      });
    }
  }

  // Process relationships
  relationships.forEach(rel => {
    const isMemberSource = rel.member_from === rootMember.id;
    const relatedMemberId = isMemberSource ? rel.member_to : rel.member_from;
    const relatedMember = memberDetails[relatedMemberId];

    if (!relatedMember) return;

    const memberNode = {
      id: relatedMember.id,
      name: relatedMember.name,
      phoneNumber: relatedMember.phone_number,
      memberId: relatedMember.member_id,
      relationshipType: rel.relationship_type
    };

    // Categorize relationships based on direction
    if (isMemberSource) {
      switch (rel.relationship_type) {
        case 'child':
          tree.children.push(memberNode);
          break;
        case 'father':
        case 'mother':
          tree.parents.push(memberNode);
          break;
        case 'spouse':
          tree.spouse = memberNode;
          break;
        case 'sibling':
          tree.siblings.push(memberNode);
          break;
      }
    } else {
      // Inverse relationships
      switch (rel.relationship_type) {
        case 'father':
        case 'mother':
          tree.children.push(memberNode);
          break;
        case 'child':
          tree.parents.push(memberNode);
          break;
        case 'spouse':
          tree.spouse = memberNode;
          break;
        case 'sibling':
          tree.siblings.push(memberNode);
          break;
      }
    }
  });

  return tree;
}

export default router;