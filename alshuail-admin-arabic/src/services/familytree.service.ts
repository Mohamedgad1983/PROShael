// Family Tree Service - File 06 Integration
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://api.alshailfund.com/api');

// Create axios instance with auth token
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth token interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject({
      message: error.response?.data?.message || 'حدث خطأ',
      status: error.response?.status
    });
  }
);

export interface TreeNode {
  id: string;
  name: string;
  name_en?: string;
  gender: 'male' | 'female';
  birth_date?: string;
  death_date?: string;
  generation: number;
  children?: TreeNode[];
  spouse?: TreeNode;
  _relationships?: {
    father_id?: string;
    mother_id?: string;
    spouses?: string[];
  };
}

export interface MemberRelationship {
  id: string;
  member_id: string;
  father_id?: string;
  mother_id?: string;
  spouse_ids?: string[];
  children_ids?: string[];
  siblings_ids?: string[];
  relationship_type?: string;
  member_details?: {
    full_name_ar: string;
    full_name_en?: string;
    gender: string;
    generation?: number;
  };
}

export interface TreeStats {
  total_members: number;
  total_generations: number;
  male_count: number;
  female_count: number;
  married_count: number;
  average_children_per_family: number;
  oldest_generation: number;
  youngest_generation: number;
}

export interface AddRelationshipRequest {
  member_id: string;
  father_id?: string;
  mother_id?: string;
  spouse_id?: string;
  relationship_type: 'father' | 'mother' | 'spouse' | 'child';
}

class FamilyTreeService {
  /**
   * Get complete family tree in D3.js compatible format
   */
  async getFullTree(rootMemberId?: string) {
    const params = rootMemberId ? `?root=${rootMemberId}` : '';
    return await apiClient.get(`/tree/full${params}`);
  }

  /**
   * Get relationships for a specific member
   */
  async getMemberRelationships(memberId: string): Promise<{ success: boolean; data: MemberRelationship }> {
    return await apiClient.get(`/tree/member/${memberId}/relationships`);
  }

  /**
   * Search family tree by name
   */
  async searchTree(query: string) {
    return await apiClient.get(`/tree/search?q=${encodeURIComponent(query)}`);
  }

  /**
   * Get tree statistics
   */
  async getTreeStats(): Promise<{ success: boolean; data: TreeStats }> {
    return await apiClient.get('/tree/stats');
  }

  /**
   * Add a relationship between members
   */
  async addRelationship(relationshipData: AddRelationshipRequest) {
    return await apiClient.post('/tree/relationships', relationshipData);
  }

  /**
   * Update member generation
   */
  async updateMemberGeneration(memberId: string, generation: number) {
    return await apiClient.put(`/tree/member/${memberId}/generation`, { generation });
  }

  /**
   * Get ancestors of a member
   */
  async getAncestors(memberId: string, generations: number = 3) {
    return await apiClient.get(`/tree/member/${memberId}/ancestors?generations=${generations}`);
  }

  /**
   * Get descendants of a member
   */
  async getDescendants(memberId: string, generations: number = 3) {
    return await apiClient.get(`/tree/member/${memberId}/descendants?generations=${generations}`);
  }

  /**
   * Get siblings of a member
   */
  async getSiblings(memberId: string) {
    return await apiClient.get(`/tree/member/${memberId}/siblings`);
  }

  /**
   * Remove a relationship
   */
  async removeRelationship(memberId: string, relatedMemberId: string, relationshipType: string) {
    return await apiClient.delete(`/tree/relationships`, {
      data: {
        member_id: memberId,
        related_member_id: relatedMemberId,
        relationship_type: relationshipType
      }
    });
  }

  /**
   * Get all family branches (الفخوذ الثمانية)
   */
  async getBranches() {
    return await apiClient.get('/tree/branches');
  }

  /**
   * Get unassigned members (members without family_branch_id)
   */
  async getUnassignedMembers(page: number = 1, limit: number = 50, search: string = '') {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);

    return await apiClient.get(`/tree/unassigned-members?${params.toString()}`);
  }

  /**
   * Assign single member to a family branch
   */
  async assignMemberToBranch(memberId: string, branchId: string) {
    return await apiClient.post('/tree/assign-member', {
      memberId,
      branchId
    });
  }

  /**
   * Bulk assign multiple members to branches
   */
  async bulkAssignMembers(assignments: Array<{ memberId: string; branchId: string }>) {
    return await apiClient.post('/tree/bulk-assign', {
      assignments
    });
  }
}

export const familyTreeService = new FamilyTreeService();
export default familyTreeService;
