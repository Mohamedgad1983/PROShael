// routes/familyTree.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// GET /api/family-tree/member/:memberId
// Get family tree data for a specific member
router.get('/member/:memberId', authenticateToken, async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // 1. Get the member details
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();
    
    if (memberError) {
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
    console.error('Error fetching family tree:', error);
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
    const { depth = 2 } = req.query; // How many generations to fetch
    
    // Get member
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, full_name, full_name_en, photo_url')
      .eq('id', memberId)
      .single();
    
    if (memberError) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Build tree structure recursively
    const buildTree = async (memberId, currentDepth = 0) => {
      if (currentDepth >= depth) return null;
      
      // Get children
      const { data: childRelations } = await supabase
        .from('family_relationships')
        .select(`
          member_to (
            id,
            full_name,
            full_name_en,
            photo_url
          )
        `)
        .eq('member_from', memberId)
        .in('relationship_type', ['father', 'mother'])
        .eq('is_active', true);
      
      const children = [];
      if (childRelations) {
        for (const relation of childRelations) {
          const childNode = {
            id: relation.member_to.id,
            name: relation.member_to.full_name,
            name_en: relation.member_to.full_name_en,
            photo: relation.member_to.photo_url,
            children: await buildTree(relation.member_to.id, currentDepth + 1) || []
          };
          children.push(childNode);
        }
      }
      
      return children;
    };
    
    // Get parents for upward tree
    const getAncestors = async (memberId, currentDepth = 0) => {
      if (currentDepth >= depth) return [];
      
      const { data: parentRelations } = await supabase
        .from('family_relationships')
        .select(`
          member_from (
            id,
            full_name,
            full_name_en,
            photo_url
          ),
          relationship_type
        `)
        .eq('member_to', memberId)
        .in('relationship_type', ['father', 'mother'])
        .eq('is_active', true);
      
      const parents = [];
      if (parentRelations) {
        for (const relation of parentRelations) {
          const parentNode = {
            id: relation.member_from.id,
            name: relation.member_from.full_name,
            name_en: relation.member_from.full_name_en,
            photo: relation.member_from.photo_url,
            relationship: relation.relationship_type,
            parents: await getAncestors(relation.member_from.id, currentDepth + 1)
          };
          parents.push(parentNode);
        }
      }
      
      return parents;
    };
    
    // Build complete tree
    const treeData = {
      id: member.id,
      name: member.full_name,
      name_en: member.full_name_en,
      photo: member.photo_url,
      children: await buildTree(memberId, 0) || [],
      parents: await getAncestors(memberId, 0) || []
    };
    
    res.json({
      success: true,
      data: treeData
    });
    
  } catch (error) {
    console.error('Error building family tree visualization:', error);
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
    const { data, error } = await supabase
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
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      message: 'Relationship created successfully',
      data
    });
    
  } catch (error) {
    console.error('Error creating relationship:', error);
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
    
    const { data, error } = await supabase
      .from('family_relationships')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Relationship updated successfully',
      data
    });
    
  } catch (error) {
    console.error('Error updating relationship:', error);
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
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Relationship deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting relationship:', error);
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
    
    const { data, error } = await supabase
      .from('members')
      .select('id, full_name, full_name_en, phone, email')
      .or(`full_name.ilike.%${query}%,full_name_en.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(20);
    
    if (error) throw error;
    
    res.json({
      success: true,
      data
    });
    
  } catch (error) {
    console.error('Error searching members:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching members',
      error: error.message
    });
  }
});

export default router;