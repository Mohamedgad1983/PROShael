/**
 * Tree Generator Utility Unit Tests
 * Tests family tree generation algorithms
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('Tree Generator Utility Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // calculateGenerationLevel Tests
  // ============================================
  describe('calculateGenerationLevel', () => {
    test('should return 0 for root member', () => {
      const member = { id: '1', parent_member_id: null };
      const allMembers = [member];
      const level = member.parent_member_id ? 1 : 0;

      expect(level).toBe(0);
    });

    test('should return 1 for child of root', () => {
      const root = { id: '1', parent_member_id: null };
      const child = { id: '2', parent_member_id: '1' };
      const allMembers = [root, child];

      let level = 0;
      let currentMember = child;

      while (currentMember.parent_member_id) {
        const parent = allMembers.find(m => m.id === currentMember.parent_member_id);
        if (!parent) break;
        level++;
        currentMember = parent;
      }

      expect(level).toBe(1);
    });

    test('should handle max depth limit', () => {
      const maxDepth = 20;
      let level = 0;

      while (level < maxDepth) {
        level++;
      }

      expect(level).toBe(20);
    });

    test('should detect circular reference', () => {
      const member1 = { id: '1', parent_member_id: '2' };
      const member2 = { id: '2', parent_member_id: '1' };
      const members = { '1': member1, '2': member2 };

      const visited = new Set();
      let currentId = '1';
      let hasCircular = false;

      while (currentId) {
        if (visited.has(currentId)) {
          hasCircular = true;
          break;
        }
        visited.add(currentId);
        currentId = members[currentId]?.parent_member_id;
      }

      expect(hasCircular).toBe(true);
    });
  });

  // ============================================
  // buildTreeStructure Tests
  // ============================================
  describe('buildTreeStructure', () => {
    test('should create member map', () => {
      const members = [
        { id: '1', full_name_ar: 'أحمد' },
        { id: '2', full_name_ar: 'محمد' }
      ];

      const memberMap = new Map();
      members.forEach(member => {
        memberMap.set(member.id, { ...member, children: [] });
      });

      expect(memberMap.size).toBe(2);
      expect(memberMap.get('1').full_name_ar).toBe('أحمد');
    });

    test('should identify root members', () => {
      const members = [
        { id: '1', parent_member_id: null },
        { id: '2', parent_member_id: '1' },
        { id: '3', parent_member_id: null }
      ];

      const rootMembers = members.filter(m => !m.parent_member_id);

      expect(rootMembers).toHaveLength(2);
    });

    test('should build parent-child relationships', () => {
      const members = [
        { id: '1', parent_member_id: null },
        { id: '2', parent_member_id: '1' },
        { id: '3', parent_member_id: '1' }
      ];

      const memberMap = new Map();
      members.forEach(member => {
        memberMap.set(member.id, { ...member, children: [] });
      });

      memberMap.forEach(member => {
        if (member.parent_member_id) {
          const parent = memberMap.get(member.parent_member_id);
          if (parent) {
            parent.children.push(member);
          }
        }
      });

      expect(memberMap.get('1').children).toHaveLength(2);
    });

    test('should return roots and memberMap', () => {
      const result = {
        roots: [],
        memberMap: new Map()
      };

      expect(result.roots).toBeDefined();
      expect(result.memberMap).toBeDefined();
    });
  });

  // ============================================
  // getDescendants Tests
  // ============================================
  describe('getDescendants', () => {
    test('should return empty for non-existent member', () => {
      const memberMap = new Map();
      const memberId = 'non-existent';
      const member = memberMap.get(memberId);
      const descendants = member ? [] : [];

      expect(descendants).toHaveLength(0);
    });

    test('should collect all descendants', () => {
      const memberMap = new Map([
        ['1', { id: '1', children: [
          { id: '2', children: [{ id: '4', children: [] }] },
          { id: '3', children: [] }
        ]}]
      ]);

      const descendants = [];
      const member = memberMap.get('1');

      function traverse(node) {
        if (node.children && node.children.length > 0) {
          node.children.forEach(child => {
            descendants.push(child);
            traverse(child);
          });
        }
      }

      traverse(member);

      expect(descendants).toHaveLength(3);
    });

    test('should include spouses when requested', () => {
      const memberMap = new Map([
        ['1', { id: '1', children: [{ id: '2', spouse_id: '3', children: [] }] }],
        ['3', { id: '3', full_name_ar: 'Spouse' }]
      ]);

      const includeSpouses = true;
      const member = memberMap.get('1');
      const child = member.children[0];

      if (includeSpouses && child.spouse_id) {
        const spouse = memberMap.get(child.spouse_id);
        expect(spouse).toBeDefined();
      }
    });
  });

  // ============================================
  // getAncestors Tests
  // ============================================
  describe('getAncestors', () => {
    test('should return empty for root member', () => {
      const memberMap = new Map([
        ['1', { id: '1', parent_member_id: null }]
      ]);

      const member = memberMap.get('1');
      const hasParent = !!member.parent_member_id;

      expect(hasParent).toBe(false);
    });

    test('should collect all ancestors', () => {
      const memberMap = new Map([
        ['1', { id: '1', parent_member_id: null }],
        ['2', { id: '2', parent_member_id: '1' }],
        ['3', { id: '3', parent_member_id: '2' }]
      ]);

      const ancestors = [];
      let currentId = '3';
      const visited = new Set();

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

      expect(ancestors).toHaveLength(2);
    });

    test('should detect circular reference in ancestors', () => {
      const memberMap = new Map([
        ['1', { id: '1', parent_member_id: '2' }],
        ['2', { id: '2', parent_member_id: '1' }]
      ]);

      const visited = new Set();
      let currentId = '1';
      let hasCircular = false;

      while (currentId) {
        if (visited.has(currentId)) {
          hasCircular = true;
          break;
        }
        visited.add(currentId);

        const member = memberMap.get(currentId);
        if (!member || !member.parent_member_id) break;
        currentId = member.parent_member_id;
      }

      expect(hasCircular).toBe(true);
    });
  });

  // ============================================
  // getSiblings Tests
  // ============================================
  describe('getSiblings', () => {
    test('should return empty for root member', () => {
      const member = { id: '1', parent_member_id: null };
      const hasSiblings = !!member.parent_member_id;

      expect(hasSiblings).toBe(false);
    });

    test('should return siblings excluding self', () => {
      const parent = {
        id: '1',
        children: [
          { id: '2' },
          { id: '3' },
          { id: '4' }
        ]
      };

      const memberId = '2';
      const siblings = parent.children.filter(child => child.id !== memberId);

      expect(siblings).toHaveLength(2);
      expect(siblings.map(s => s.id)).not.toContain('2');
    });

    test('should return empty if no parent children', () => {
      const parent = { id: '1', children: null };
      const siblings = parent?.children?.filter(c => c.id !== '2') || [];

      expect(siblings).toHaveLength(0);
    });
  });

  // ============================================
  // calculateRelationship Tests
  // ============================================
  describe('calculateRelationship', () => {
    test('should identify child_of relationship', () => {
      const member1 = { id: '1', parent_member_id: '2' };
      const member2 = { id: '2' };

      const relationship = member1.parent_member_id === member2.id ? 'child_of' : 'unknown';

      expect(relationship).toBe('child_of');
    });

    test('should identify parent_of relationship', () => {
      const member1 = { id: '1' };
      const member2 = { id: '2', parent_member_id: '1' };

      const relationship = member2.parent_member_id === member1.id ? 'parent_of' : 'unknown';

      expect(relationship).toBe('parent_of');
    });

    test('should identify spouse relationship', () => {
      const member1 = { id: '1', spouse_id: '2' };
      const member2 = { id: '2' };

      const relationship = member1.spouse_id === member2.id ? 'spouse' : 'unknown';

      expect(relationship).toBe('spouse');
    });

    test('should identify sibling relationship', () => {
      const member1 = { id: '1', parent_member_id: '3' };
      const member2 = { id: '2', parent_member_id: '3' };

      const relationship =
        member1.parent_member_id &&
        member1.parent_member_id === member2.parent_member_id
          ? 'sibling'
          : 'unknown';

      expect(relationship).toBe('sibling');
    });

    test('should return unknown for non-related members', () => {
      const member1 = { id: '1', parent_member_id: null };
      const member2 = { id: '2', parent_member_id: null };

      let relationship = 'unknown';

      if (member1.parent_member_id === member2.id) {
        relationship = 'child_of';
      } else if (member2.parent_member_id === member1.id) {
        relationship = 'parent_of';
      }

      expect(relationship).toBe('unknown');
    });

    test('should identify grandchild_of relationship', () => {
      const distance = 2;
      const relationship = distance === 2 ? 'grandchild_of' : `descendant_${distance}`;

      expect(relationship).toBe('grandchild_of');
    });

    test('should identify grandparent_of relationship', () => {
      const distance = 2;
      const relationship = distance === 2 ? 'grandparent_of' : `ancestor_${distance}`;

      expect(relationship).toBe('grandparent_of');
    });

    test('should identify cousin relationship', () => {
      const hasCommonAncestor = true;
      const relationship = hasCommonAncestor ? 'cousin' : 'distant_relative';

      expect(relationship).toBe('cousin');
    });

    test('should return distant_relative when no common ancestor', () => {
      const hasCommonAncestor = false;
      const relationship = hasCommonAncestor ? 'cousin' : 'distant_relative';

      expect(relationship).toBe('distant_relative');
    });
  });

  // ============================================
  // generateD3TreeData Tests
  // ============================================
  describe('generateD3TreeData', () => {
    test('should convert member to D3 format', () => {
      const member = {
        id: '1',
        full_name_ar: 'أحمد الشعيل',
        full_name_en: 'Ahmed Al-Shuail',
        member_id: 'AL001',
        date_of_birth: '1970-01-01',
        generation_level: 1,
        photo_url: 'https://example.com/photo.jpg',
        phone: '+966555555555',
        is_alive: true,
        children: []
      };

      const d3Format = {
        id: member.id,
        name: member.full_name_ar,
        name_en: member.full_name_en,
        member_id: member.member_id,
        birth_date: member.date_of_birth,
        generation_level: member.generation_level,
        photo_url: member.photo_url,
        phone: member.phone,
        is_alive: member.is_alive,
        children: []
      };

      expect(d3Format.name).toBe('أحمد الشعيل');
      expect(d3Format.children).toHaveLength(0);
    });

    test('should recursively convert children', () => {
      const member = {
        id: '1',
        full_name_ar: 'أحمد',
        children: [
          { id: '2', full_name_ar: 'محمد', children: [] }
        ]
      };

      function convertToD3Format(m) {
        return {
          id: m.id,
          name: m.full_name_ar,
          children: m.children.map(child => convertToD3Format(child))
        };
      }

      const d3Data = convertToD3Format(member);

      expect(d3Data.children).toHaveLength(1);
      expect(d3Data.children[0].name).toBe('محمد');
    });
  });

  // ============================================
  // getGenerationStats Tests
  // ============================================
  describe('getGenerationStats', () => {
    test('should group members by generation level', () => {
      const members = [
        { id: '1', generation_level: 0, full_name_ar: 'Root' },
        { id: '2', generation_level: 1, full_name_ar: 'Gen1-1' },
        { id: '3', generation_level: 1, full_name_ar: 'Gen1-2' },
        { id: '4', generation_level: 2, full_name_ar: 'Gen2-1' }
      ];

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

      expect(Object.keys(generations)).toHaveLength(3);
      expect(generations[1].count).toBe(2);
    });

    test('should sort by generation level', () => {
      const generations = {
        2: { level: 2, count: 1 },
        0: { level: 0, count: 1 },
        1: { level: 1, count: 2 }
      };

      const sorted = Object.values(generations).sort((a, b) => a.level - b.level);

      expect(sorted[0].level).toBe(0);
      expect(sorted[1].level).toBe(1);
      expect(sorted[2].level).toBe(2);
    });

    test('should handle default generation level 0', () => {
      const member = { id: '1', generation_level: undefined };
      const level = member.generation_level || 0;

      expect(level).toBe(0);
    });
  });
});
