import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

import { logger } from '../../utils/logger';

// Arabic relationship types
export const RELATIONSHIP_TYPES = {
  FATHER: 'أب',
  MOTHER: 'أم',
  SON: 'ابن',
  DAUGHTER: 'ابنة',
  HUSBAND: 'زوج',
  WIFE: 'زوجة',
  BROTHER: 'أخ',
  SISTER: 'أخت',
  GRANDFATHER: 'جد',
  GRANDMOTHER: 'جدة',
  GRANDSON: 'حفيد',
  GRANDDAUGHTER: 'حفيدة',
  UNCLE_PATERNAL: 'عم',
  AUNT_PATERNAL: 'عمة',
  UNCLE_MATERNAL: 'خال',
  AUNT_MATERNAL: 'خالة',
  COUSIN_MALE: 'ابن عم',
  COUSIN_FEMALE: 'بنت عم'
} as const;

// Family member interface
export interface FamilyMember {
  id: string;
  name: string;
  nameAr: string;
  gender: 'male' | 'female';
  birthDate?: string;
  hijriDate?: string;
  age?: number;
  relationship?: string;
  tribe?: string;
  section?: string;
  phoneNumber?: string;
  email?: string;
  status?: 'active' | 'inactive';
  balance?: number;
  parentId?: string;
  motherId?: string;
  spouseIds?: string[];
  childrenIds?: string[];
  isPrivate?: boolean;
  generation?: number;
  membershipNumber?: string;
  profileImage?: string;
}

// Tree node interface for react-d3-tree
export interface TreeNode {
  name: string;
  attributes?: {
    id: string;
    nameAr: string;
    gender: string;
    age?: number;
    relationship?: string;
    status?: string;
    isPrivate?: boolean;
    tribe?: string;
    section?: string;
    balance?: number;
    membershipNumber?: string;
  };
  children?: TreeNode[];
}

// Convert flat member list to tree structure
const buildFamilyTree = (members: FamilyMember[]): TreeNode | null => {
  if (!members || members.length === 0) return null;

  // Create a map for quick lookup
  const memberMap = new Map<string, FamilyMember>();
  members.forEach(member => memberMap.set(member.id, member));

  // Find the root member (oldest generation or specified root)
  const rootMember = members.find(m => !m.parentId) || members[0];

  // Recursive function to build tree
  const buildNode = (member: FamilyMember): TreeNode => {
    const children = members
      .filter(m => m.parentId === member.id)
      .map(child => buildNode(child));

    return {
      name: member.nameAr || member.name,
      attributes: {
        id: member.id,
        nameAr: member.nameAr,
        gender: member.gender,
        age: member.age,
        relationship: member.relationship,
        status: member.status,
        isPrivate: member.isPrivate,
        tribe: member.tribe,
        section: member.section,
        balance: member.balance,
        membershipNumber: member.membershipNumber
      },
      children: children.length > 0 ? children : undefined
    };
  };

  return buildNode(rootMember);
};

// Hook for managing family tree data
export const useFamilyTreeData = () => {
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<FamilyMember[]>([]);

  // Fetch family members from API
  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'https://api.alshailfund.com'}/api/members`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const membersData: FamilyMember[] = response.data.members.map((member: any) => ({
        id: member.id,
        name: member.name,
        nameAr: member.nameAr || member.name,
        gender: member.gender || 'male',
        birthDate: member.birthDate,
        hijriDate: member.hijriDate,
        age: member.age,
        relationship: member.relationship,
        tribe: member.tribe || 'الشعيل',
        section: member.section,
        phoneNumber: member.phoneNumber,
        email: member.email,
        status: member.status || 'active',
        balance: member.balance || 0,
        parentId: member.parentId,
        motherId: member.motherId,
        spouseIds: member.spouseIds || [],
        childrenIds: member.childrenIds || [],
        isPrivate: member.isPrivate || false,
        generation: member.generation || 0,
        membershipNumber: member.membershipNumber || member.id,
        profileImage: member.profileImage
      }));

      setMembers(membersData);
      const tree = buildFamilyTree(membersData);
      setTreeData(tree);
    } catch (err) {
      logger.error('Error fetching family members:', { err });
      setError('فشل في تحميل بيانات العائلة');

      // Use mock data as fallback
      const mockData = generateMockData();
      setMembers(mockData);
      const tree = buildFamilyTree(mockData);
      setTreeData(tree);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search members by name or ID
  const searchMembers = useCallback((searchTerm: string) => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }

    const results = members.filter(member =>
      member.nameAr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.id.includes(searchTerm) ||
      member.membershipNumber?.includes(searchTerm) ||
      member.phoneNumber?.includes(searchTerm)
    );

    setSearchResults(results);
  }, [members]);

  // Add a new relationship
  const addRelationship = useCallback(async (
    memberId: string,
    relatedMemberId: string,
    relationshipType: keyof typeof RELATIONSHIP_TYPES
  ) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL || 'https://api.alshailfund.com'}/api/members/${memberId}/relationships`,
        {
          relatedMemberId,
          relationshipType
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Refresh data
      await fetchMembers();
    } catch (err) {
      logger.error('Error adding relationship:', { err });
      throw new Error('فشل في إضافة العلاقة');
    }
  }, [fetchMembers]);

  // Update member information
  const updateMember = useCallback(async (memberId: string, updates: Partial<FamilyMember>) => {
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_URL || 'https://api.alshailfund.com'}/api/members/${memberId}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Refresh data
      await fetchMembers();
    } catch (err) {
      logger.error('Error updating member:', { err });
      throw new Error('فشل في تحديث البيانات');
    }
  }, [fetchMembers]);

  // Initial data fetch
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    treeData,
    members,
    loading,
    error,
    searchResults,
    searchMembers,
    addRelationship,
    updateMember,
    refresh: fetchMembers
  };
};

// Generate mock data for development/fallback
const generateMockData = (): FamilyMember[] => {
  return [
    {
      id: '1',
      name: 'Mohammed bin Abdullah Al-Shuail',
      nameAr: 'محمد بن عبدالله الشعيل',
      gender: 'male',
      age: 75,
      relationship: 'الجد الأكبر',
      tribe: 'الشعيل',
      section: 'آل محمد',
      status: 'active',
      balance: 15000,
      childrenIds: ['2', '3'],
      generation: 1,
      membershipNumber: '001'
    },
    {
      id: '2',
      name: 'Abdulrahman bin Mohammed Al-Shuail',
      nameAr: 'عبدالرحمن بن محمد الشعيل',
      gender: 'male',
      age: 45,
      relationship: RELATIONSHIP_TYPES.SON,
      tribe: 'الشعيل',
      section: 'آل محمد',
      status: 'active',
      balance: 8500,
      parentId: '1',
      childrenIds: ['4', '5'],
      generation: 2,
      membershipNumber: '002'
    },
    {
      id: '3',
      name: 'Khalid bin Mohammed Al-Shuail',
      nameAr: 'خالد بن محمد الشعيل',
      gender: 'male',
      age: 42,
      relationship: RELATIONSHIP_TYPES.SON,
      tribe: 'الشعيل',
      section: 'آل محمد',
      status: 'active',
      balance: 6200,
      parentId: '1',
      childrenIds: ['6'],
      generation: 2,
      membershipNumber: '003'
    },
    {
      id: '4',
      name: 'Fahad bin Abdulrahman Al-Shuail',
      nameAr: 'فهد بن عبدالرحمن الشعيل',
      gender: 'male',
      age: 22,
      relationship: RELATIONSHIP_TYPES.GRANDSON,
      tribe: 'الشعيل',
      section: 'آل محمد',
      status: 'active',
      balance: 3200,
      parentId: '2',
      generation: 3,
      membershipNumber: '004'
    },
    {
      id: '5',
      name: 'Noura bint Abdulrahman Al-Shuail',
      nameAr: 'نورة بنت عبدالرحمن الشعيل',
      gender: 'female',
      age: 20,
      relationship: RELATIONSHIP_TYPES.GRANDDAUGHTER,
      tribe: 'الشعيل',
      section: 'آل محمد',
      status: 'active',
      balance: 2800,
      parentId: '2',
      isPrivate: true,
      generation: 3,
      membershipNumber: '005'
    },
    {
      id: '6',
      name: 'Saud bin Khalid Al-Shuail',
      nameAr: 'سعود بن خالد الشعيل',
      gender: 'male',
      age: 18,
      relationship: RELATIONSHIP_TYPES.GRANDSON,
      tribe: 'الشعيل',
      section: 'آل محمد',
      status: 'active',
      balance: 1500,
      parentId: '3',
      generation: 3,
      membershipNumber: '006'
    }
  ];
};

export default useFamilyTreeData;