// Family Tree Generation Algorithms

/**
 * Calculate generation level from root ancestor
 */
export function calculateGenerationLevel(member, allMembers, maxDepth = 20) {
  let level = 0;
  let currentMember = member;
  const visited = new Set();

  while (currentMember.parent_member_id && level < maxDepth) {
    if (visited.has(currentMember.id)) {
      // Circular reference detected
      break;
    }

    visited.add(currentMember.id);
    const parent = allMembers.find(m => m.id === currentMember.parent_member_id);

    if (!parent) { break; }

    level++;
    currentMember = parent;
  }

  return level;
}

/**
 * Build tree structure from flat member list
 */
export function buildTreeStructure(members) {
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
export function getDescendants(memberId, memberMap, includeSpouses = false) {
  const descendants = [];
  const member = memberMap.get(memberId);

  if (!member) { return descendants; }

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
export function getAncestors(memberId, memberMap) {
  const ancestors = [];
  let currentId = memberId;
  const visited = new Set();

  while (currentId) {
    if (visited.has(currentId)) { break; }
    visited.add(currentId);

    const member = memberMap.get(currentId);
    if (!member || !member.parent_member_id) { break; }

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
export function getSiblings(memberId, memberMap) {
  const member = memberMap.get(memberId);
  if (!member || !member.parent_member_id) { return []; }

  const parent = memberMap.get(member.parent_member_id);
  if (!parent || !parent.children) { return []; }

  return parent.children.filter(child => child.id !== memberId);
}

/**
 * Calculate relationship between two members
 */
export function calculateRelationship(member1Id, member2Id, memberMap) {
  const member1 = memberMap.get(member1Id);
  const member2 = memberMap.get(member2Id);

  if (!member1 || !member2) { return 'unknown'; }

  // Direct relationships
  if (member1.parent_member_id === member2Id) { return 'child_of'; }
  if (member2.parent_member_id === member1Id) { return 'parent_of'; }
  if (member1.spouse_id === member2Id) { return 'spouse'; }

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
export function generateD3TreeData(members) {
  const { roots, memberMap: _memberMap } = buildTreeStructure(members);

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
export function getGenerationStats(members) {
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
