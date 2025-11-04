# 05-FAMILY-TREE-APIS.md
# Al-Shuail Family Tree APIs - Claude Code Instructions

## 📋 OVERVIEW

Create comprehensive family tree and genealogy APIs for:
- Family relationship management
- Generational tree visualization
- Member connections (father, mother, spouse, children)
- Photo integration with family tree
- Search and filtering

**Prerequisites**: Files 01, 02, 03, 04 completed

---

## 🎯 IMPLEMENTATION CHECKLIST

```
□ Family relationship CRUD endpoints
□ Tree generation algorithms
□ Generational calculation
□ Photo integration
□ Search and filtering
□ Statistics and insights
```

---

## 📁 FILE STRUCTURE TO CREATE

```
backend/
├── routes/
│   └── family-tree.routes.js       ← Create this
├── controllers/
│   └── family-tree.controller.js   ← Create this
└── utils/
    └── tree-generator.js           ← Create this (Tree algorithms)
```

---

## STEP 1: TREE GENERATOR UTILITY

### File: `backend/utils/tree-generator.js`

```javascript
// Family Tree Generation Algorithms

/**
 * Calculate generation level from root ancestor
 */
function calculateGenerationLevel(member, allMembers, maxDepth = 20) {
  let level = 0;
  let currentMember = member;
  let visited = new Set();

  while (currentMember.parent_member_id && level < maxDepth) {
    if (visited.has(currentMember.id)) {
      // Circular reference detected
      break;
    }
    
    visited.add(currentMember.id);
    const parent = allMembers.find(m => m.id === currentMember.parent_member_id);
    
    if (!parent) break;
    
    level++;
    currentMember = parent;
  }

  return level;
}

/**
 * Build tree structure from flat member list
 */
function buildTreeStructure(members) {
  // Create member map for quick lookup
  const memberMap = new Map();
  members.forEach(member => {
    memberMap.set(member.id, {
      ...member,
      children: []
    });
  });

  // Build parent-child relationships
  const rootMembers = [];
  
  memberMap.forEach(member => {
    if (member.parent_member_id) {
      const parent = memberMap.get(member.parent_member_id);
      if (parent) {
        parent.children.push(member);
      } else {
        rootMembers.push(member);
      }
    } else {
      rootMembers.push(member);
    }
  });

  return {
    roots: rootMembers,
    memberMap: memberMap
  };
}

/**
 * Get all descendants of a member
 */
function getDescendants(memberId, memberMap, includeSpouses = false) {
  const descendants = [];
  const member = memberMap.get(memberId);
  
  if (!member) return descendants;

  function traverse(node) {
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        descendants.push(child);
        
        // Include spouse if requested
        if (includeSpouses && child.spouse_id) {
          const spouse = memberMap.get(child.spouse_id);
          if (spouse) {
            descendants.push(spouse);
          }
        }
        
        traverse(child);
      });
    }
  }

  traverse(member);
  return descendants;
}

/**
 * Get all ancestors of a member
 */
function getAncestors(memberId, memberMap) {
  const ancestors = [];
  let currentId = memberId;
  let visited = new Set();
  
  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    
    const member = memberMap.get(currentId);
    if (!member || !member.parent_member_id) break;
    
    const parent = memberMap.get(member.parent_member_id);
    if (parent) {
      ancestors.push(parent);
      currentId = parent.id;
    } else {
      break;
    }
  }
  
  return ancestors;
}

/**
 * Get siblings of a member
 */
function getSiblings(memberId, memberMap) {
  const member = memberMap.get(memberId);
  if (!member || !member.parent_member_id) return [];
  
  const parent = memberMap.get(member.parent_member_id);
  if (!parent || !parent.children) return [];
  
  return parent.children.filter(child => child.id !== memberId);
}

/**
 * Calculate relationship between two members
 */
function calculateRelationship(member1Id, member2Id, memberMap) {
  const member1 = memberMap.get(member1Id);
  const member2 = memberMap.get(member2Id);
  
  if (!member1 || !member2) return 'unknown';
  
  // Direct relationships
  if (member1.parent_member_id === member2Id) return 'child_of';
  if (member2.parent_member_id === member1Id) return 'parent_of';
  if (member1.spouse_id === member2Id) return 'spouse';
  
  // Siblings
  if (member1.parent_member_id && member1.parent_member_id === member2.parent_member_id) {
    return 'sibling';
  }
  
  // Grandparent/Grandchild
  const ancestors1 = getAncestors(member1Id, memberMap);
  const ancestors2 = getAncestors(member2Id, memberMap);
  
  if (ancestors1.some(a => a.id === member2Id)) {
    const distance = ancestors1.findIndex(a => a.id === member2Id) + 1;
    return distance === 2 ? 'grandchild_of' : `descendant_${distance}`;
  }
  
  if (ancestors2.some(a => a.id === member1Id)) {
    const distance = ancestors2.findIndex(a => a.id === member1Id) + 1;
    return distance === 2 ? 'grandparent_of' : `ancestor_${distance}`;
  }
  
  // Find common ancestor for cousins
  const commonAncestor = ancestors1.find(a1 => 
    ancestors2.some(a2 => a2.id === a1.id)
  );
  
  if (commonAncestor) {
    return 'cousin';
  }
  
  return 'distant_relative';
}

/**
 * Generate D3.js compatible tree data
 */
function generateD3TreeData(members) {
  const { roots, memberMap } = buildTreeStructure(members);
  
  function convertToD3Format(member) {
    return {
      id: member.id,
      name: member.full_name_ar,
      name_en: member.full_name_en,
      member_id: member.member_id,
      birth_date: member.date_of_birth,
      generation_level: member.generation_level,
      photo_url: member.photo_url,
      phone: member.phone,
      is_alive: member.is_alive,
      children: member.children.map(child => convertToD3Format(child))
    };
  }
  
  return roots.map(root => convertToD3Format(root));
}

/**
 * Get generation statistics
 */
function getGenerationStats(members) {
  const generations = {};
  
  members.forEach(member => {
    const level = member.generation_level || 0;
    if (!generations[level]) {
      generations[level] = {
        level: level,
        count: 0,
        members: []
      };
    }
    generations[level].count++;
    generations[level].members.push({
      id: member.id,
      name: member.full_name_ar
    });
  });
  
  return Object.values(generations).sort((a, b) => a.level - b.level);
}

module.exports = {
  calculateGenerationLevel,
  buildTreeStructure,
  getDescendants,
  getAncestors,
  getSiblings,
  calculateRelationship,
  generateD3TreeData,
  getGenerationStats
};
```

**Command to create:**
```bash
cat > backend/utils/tree-generator.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 2: FAMILY TREE CONTROLLER

### File: `backend/controllers/family-tree.controller.js`

```javascript
// Family Tree Controller
const { createClient } = require('@supabase/supabase-js');
const {
  buildTreeStructure,
  getDescendants,
  getAncestors,
  getSiblings,
  calculateRelationship,
  generateD3TreeData,
  getGenerationStats
} = require('../utils/tree-generator');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get complete family tree
 * GET /api/family-tree
 */
exports.getFullTree = async (req, res) => {
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
exports.getMemberRelationships = async (req, res) => {
  try {
    const { memberId } = req.params;

    // Get the member
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select(`
        *,
        member_photos!left (
          photo_url
        )
      `)
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({
        success: false,
        message: 'العضو غير موجود'
      });
    }

    // Get all family members for relationship calculation
    const { data: allMembers } = await supabase
      .from('members')
      .select('*')
      .eq('is_active', true);

    const { memberMap } = buildTreeStructure(allMembers);

    // Get relationships
    const relationships = {
      parent: null,
      spouse: null,
      children: [],
      siblings: [],
      grandparents: [],
      grandchildren: []
    };

    // Parent
    if (member.parent_member_id) {
      const { data: parent } = await supabase
        .from('members')
        .select(`
          *,
          member_photos!left (photo_url)
        `)
        .eq('id', member.parent_member_id)
        .single();
      relationships.parent = parent;
    }

    // Spouse
    if (member.spouse_id) {
      const { data: spouse } = await supabase
        .from('members')
        .select(`
          *,
          member_photos!left (photo_url)
        `)
        .eq('id', member.spouse_id)
        .single();
      relationships.spouse = spouse;
    }

    // Children
    const { data: children } = await supabase
      .from('members')
      .select(`
        *,
        member_photos!left (photo_url)
      `)
      .eq('parent_member_id', memberId);
    relationships.children = children || [];

    // Siblings
    const siblings = getSiblings(memberId, memberMap);
    if (siblings.length > 0) {
      const siblingIds = siblings.map(s => s.id);
      const { data: siblingData } = await supabase
        .from('members')
        .select(`
          *,
          member_photos!left (photo_url)
        `)
        .in('id', siblingIds);
      relationships.siblings = siblingData || [];
    }

    // Grandparents (parent's parent)
    if (member.parent_member_id) {
      const parent = memberMap.get(member.parent_member_id);
      if (parent && parent.parent_member_id) {
        const { data: grandparent } = await supabase
          .from('members')
          .select(`
            *,
            member_photos!left (photo_url)
          `)
          .eq('id', parent.parent_member_id)
          .single();
        if (grandparent) {
          relationships.grandparents.push(grandparent);
        }
      }
    }

    // Grandchildren (children's children)
    if (children && children.length > 0) {
      for (const child of children) {
        const { data: grandchildren } = await supabase
          .from('members')
          .select(`
            *,
            member_photos!left (photo_url)
          `)
          .eq('parent_member_id', child.id);
        
        if (grandchildren) {
          relationships.grandchildren.push(...grandchildren);
        }
      }
    }

    res.json({
      success: true,
      data: {
        member: member,
        relationships: relationships
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
 * Add family relationship
 * POST /api/family-tree/relationships
 */
exports.addRelationship = async (req, res) => {
  try {
    const {
      member_from,
      member_to,
      relationship_type,
      notes
    } = req.body;

    const adminId = req.user.id;

    // Validate required fields
    if (!member_from || !member_to || !relationship_type) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة'
      });
    }

    // Validate relationship type
    const validTypes = [
      'father', 'mother', 'son', 'daughter',
      'spouse', 'brother', 'sister',
      'grandfather', 'grandmother'
    ];

    if (!validTypes.includes(relationship_type)) {
      return res.status(400).json({
        success: false,
        message: 'نوع العلاقة غير صحيح'
      });
    }

    // Check if both members exist
    const { data: members } = await supabase
      .from('members')
      .select('id')
      .in('id', [member_from, member_to]);

    if (!members || members.length !== 2) {
      return res.status(404).json({
        success: false,
        message: 'أحد الأعضاء غير موجود'
      });
    }

    // Insert relationship
    const { data: relationship, error: insertError } = await supabase
      .from('family_relationships')
      .insert({
        member_from: member_from,
        member_to: member_to,
        relationship_type: relationship_type,
        notes: notes || null,
        created_by: adminId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert Error:', insertError);
      return res.status(500).json({
        success: false,
        message: 'خطأ في إضافة العلاقة'
      });
    }

    // Update parent_member_id or spouse_id if applicable
    if (relationship_type === 'father' || relationship_type === 'mother') {
      await supabase
        .from('members')
        .update({ parent_member_id: member_from })
        .eq('id', member_to);
    } else if (relationship_type === 'spouse') {
      await supabase
        .from('members')
        .update({ spouse_id: member_to })
        .eq('id', member_from);
      
      await supabase
        .from('members')
        .update({ spouse_id: member_from })
        .eq('id', member_to);
    }

    res.status(201).json({
      success: true,
      message: 'تمت إضافة العلاقة بنجاح',
      data: relationship
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
 * Search family tree
 * GET /api/family-tree/search
 */
exports.searchTree = async (req, res) => {
  try {
    const { query, generation, subdivision_id } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'يجب إدخال حرفين على الأقل للبحث'
      });
    }

    let dbQuery = supabase
      .from('members')
      .select(`
        *,
        family_branches (
          id,
          branch_name
        ),
        member_photos!left (
          photo_url
        )
      `)
      .eq('is_active', true)
      .or(`full_name_ar.ilike.%${query}%,full_name_en.ilike.%${query}%,member_id.ilike.%${query}%`);

    // Filter by generation
    if (generation) {
      dbQuery = dbQuery.eq('generation_level', parseInt(generation));
    }

    // Filter by subdivision
    if (subdivision_id) {
      dbQuery = dbQuery.eq('family_branch_id', subdivision_id);
    }

    const { data: members, error } = await dbQuery.limit(50);

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
exports.getTreeStats = async (req, res) => {
  try {
    const { subdivision_id } = req.query;

    let query = supabase
      .from('members')
      .select('*')
      .eq('is_active', true)
      .eq('registration_status', 'approved');

    if (subdivision_id) {
      query = query.eq('family_branch_id', subdivision_id);
    }

    const { data: members } = await query;

    if (!members) {
      return res.json({
        success: true,
        data: {
          total_members: 0,
          by_generation: [],
          by_subdivision: [],
          alive_deceased: { alive: 0, deceased: 0 }
        }
      });
    }

    // Generation statistics
    const generationStats = getGenerationStats(members);

    // Subdivision statistics
    const subdivisionStats = {};
    members.forEach(member => {
      const branchId = member.family_branch_id;
      if (!subdivisionStats[branchId]) {
        subdivisionStats[branchId] = 0;
      }
      subdivisionStats[branchId]++;
    });

    // Alive/Deceased count
    const aliveCount = members.filter(m => m.is_alive !== false).length;
    const deceasedCount = members.length - aliveCount;

    res.json({
      success: true,
      data: {
        total_members: members.length,
        by_generation: generationStats,
        by_subdivision: subdivisionStats,
        alive_deceased: {
          alive: aliveCount,
          deceased: deceasedCount
        }
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

module.exports = exports;
```

**Command to create:**
```bash
cat > backend/controllers/family-tree.controller.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 3: FAMILY TREE ROUTES

### File: `backend/routes/family-tree.routes.js`

```javascript
// Family Tree Routes
const express = require('express');
const router = express.Router();
const familyTreeController = require('../controllers/family-tree.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * Get full family tree
 */
router.get('/', familyTreeController.getFullTree);

/**
 * Get member relationships
 */
router.get('/:memberId/relationships', familyTreeController.getMemberRelationships);

/**
 * Add family relationship
 */
router.post('/relationships', familyTreeController.addRelationship);

/**
 * Search tree
 */
router.get('/search', familyTreeController.searchTree);

/**
 * Get statistics
 */
router.get('/stats', familyTreeController.getTreeStats);

module.exports = router;
```

**Command to create:**
```bash
cat > backend/routes/family-tree.routes.js << 'EOF'
[paste code above]
EOF
```

---

## STEP 4: UPDATE SERVER.JS

Add family tree routes:

```bash
# Add to backend/server.js
cat >> backend/server.js << 'EOF'

// Family Tree Routes
const familyTreeRoutes = require('./routes/family-tree.routes');
app.use('/api/family-tree', familyTreeRoutes);
EOF
```

---

## STEP 5: TEST THE APIS

### Test 1: Get Full Tree
```bash
curl http://localhost:3000/api/family-tree \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 2: Get Member Relationships
```bash
curl http://localhost:3000/api/family-tree/MEMBER_ID/relationships \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 3: Add Relationship
```bash
curl -X POST http://localhost:3000/api/family-tree/relationships \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "member_from": "parent-uuid",
    "member_to": "child-uuid",
    "relationship_type": "father",
    "notes": "تم التحقق من العلاقة"
  }'
```

### Test 4: Search Tree
```bash
curl "http://localhost:3000/api/family-tree/search?query=أحمد" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 5: Get Statistics
```bash
curl http://localhost:3000/api/family-tree/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ VERIFICATION CHECKLIST

```
□ Full tree retrieval works
□ Member relationships display correctly
□ Can add parent-child relationships
□ Can add spouse relationships
□ Search finds members correctly
□ Statistics calculate properly
□ Photos display in tree
□ Generation levels correct
```

---

## 🔧 TROUBLESHOOTING

### Issue: Circular relationships detected
**Solution**: Check parent_member_id chains:
```sql
WITH RECURSIVE tree AS (
  SELECT id, parent_member_id, full_name_ar, 0 as level
  FROM members WHERE parent_member_id IS NULL
  UNION ALL
  SELECT m.id, m.parent_member_id, m.full_name_ar, t.level + 1
  FROM members m
  JOIN tree t ON m.parent_member_id = t.id
  WHERE t.level < 20
)
SELECT * FROM tree WHERE level > 10;
```

### Issue: Photos not showing
**Solution**: Check member_photos join:
```sql
SELECT 
  m.id,
  m.full_name_ar,
  mp.photo_url
FROM members m
LEFT JOIN member_photos mp ON m.id = mp.member_id
WHERE mp.photo_type = 'profile';
```

---

## 📊 DATABASE QUERIES FOR TESTING

```sql
-- View family tree structure
SELECT 
  m.id,
  m.member_id,
  m.full_name_ar,
  m.generation_level,
  parent.full_name_ar as parent_name,
  spouse.full_name_ar as spouse_name
FROM members m
LEFT JOIN members parent ON m.parent_member_id = parent.id
LEFT JOIN members spouse ON m.spouse_id = spouse.id
WHERE m.is_active = true
ORDER BY m.generation_level, m.full_name_ar;

-- Count members by generation
SELECT 
  generation_level,
  COUNT(*) as count
FROM members
WHERE is_active = true
GROUP BY generation_level
ORDER BY generation_level;

-- View all relationships
SELECT 
  mf.full_name_ar as from_member,
  mt.full_name_ar as to_member,
  fr.relationship_type,
  fr.created_at
FROM family_relationships fr
JOIN members mf ON fr.member_from = mf.id
JOIN members mt ON fr.member_to = mt.id
ORDER BY fr.created_at DESC;
```

---

## 📝 NEXT STEPS

After completing this file:
- ✅ Family tree APIs working
- ✅ Relationships management implemented
- ✅ Search and statistics functional
- ⏭️ **NEXT**: File 06 - Frontend Integration

---

**Status**: Ready for Claude Code execution
**Estimated Time**: 25-35 minutes
**Dependencies**: Files 01, 02, 03, 04 must be completed first
**Next File**: 06-FRONTEND-INTEGRATION.md
