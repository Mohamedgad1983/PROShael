import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://api.alshailfund.com');

export interface Role {
  id: string;
  role_name: string;
  role_name_ar: string;
  description: string;
  priority: number;
  permissions: Record<string, boolean>;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  primary_role: string;
  membership_number?: string;
  source: 'users' | 'members';
  active_roles: RoleAssignment[];
}

export interface RoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  role_name: string;
  role_name_ar: string;
  start_date_gregorian: string | null;
  end_date_gregorian: string | null;
  start_date_hijri: string | null;
  end_date_hijri: string | null;
  notes: string;
  is_active: boolean;
  status: 'active' | 'pending' | 'expired';
  assigned_by: string;
  assigned_at: string;
  updated_by?: string;
  updated_at?: string;
}

export interface AssignRoleRequest {
  user_id: string;
  role_id: string;
  start_date_gregorian?: string;
  end_date_gregorian?: string;
  start_date_hijri?: string;
  end_date_hijri?: string;
  notes?: string;
  is_active?: boolean;
}

export interface UpdateRoleAssignmentRequest {
  start_date_gregorian?: string;
  end_date_gregorian?: string;
  start_date_hijri?: string;
  end_date_hijri?: string;
  notes?: string;
  is_active?: boolean;
}

class MultiRoleService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get all available roles
   */
  async getRoles(): Promise<Role[]> {
    const response = await axios.get(`${API_BASE_URL}/api/multi-role/roles`, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  /**
   * Search for members/users to assign roles
   */
  async searchMembers(query: string, limit: number = 20): Promise<User[]> {
    const response = await axios.get(`${API_BASE_URL}/api/multi-role/search-members`, {
      params: { q: query, limit },
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  /**
   * Get current user's active roles
   */
  async getMyRoles(): Promise<{
    active_roles: RoleAssignment[];
    merged_permissions: Record<string, boolean>;
    role_count: number;
  }> {
    const response = await axios.get(`${API_BASE_URL}/api/multi-role/my-roles`, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }

  /**
   * Assign a role to a user
   */
  async assignRole(data: AssignRoleRequest): Promise<{
    assignment: RoleAssignment;
    message: string;
  }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/multi-role/assign`,
      data,
      { headers: this.getAuthHeaders() }
    );
    return {
      assignment: response.data.data,
      message: response.data.message
    };
  }

  /**
   * Get all role assignments for a user
   */
  async getUserRoles(userId: string): Promise<RoleAssignment[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/multi-role/users/${userId}/roles`,
      { headers: this.getAuthHeaders() }
    );
    return response.data.data;
  }

  /**
   * Update a role assignment
   */
  async updateAssignment(
    assignmentId: string,
    data: UpdateRoleAssignmentRequest
  ): Promise<{
    assignment: RoleAssignment;
    message: string;
  }> {
    const response = await axios.put(
      `${API_BASE_URL}/api/multi-role/assignments/${assignmentId}`,
      data,
      { headers: this.getAuthHeaders() }
    );
    return {
      assignment: response.data.data,
      message: response.data.message
    };
  }

  /**
   * Revoke/delete a role assignment
   */
  async revokeAssignment(assignmentId: string): Promise<{ message: string }> {
    const response = await axios.delete(
      `${API_BASE_URL}/api/multi-role/assignments/${assignmentId}`,
      { headers: this.getAuthHeaders() }
    );
    return { message: response.data.message };
  }

  /**
   * Get all users with active role assignments
   */
  async getAllAssignments(): Promise<{
    users: Array<{
      user_id: string;
      full_name: string;
      email: string;
      phone: string;
      roles: Array<{
        assignment_id: string;
        role_id: string;
        role_name: string;
        role_name_ar: string;
        start_date_gregorian: string | null;
        end_date_gregorian: string | null;
        start_date_hijri: string | null;
        end_date_hijri: string | null;
        status: string;
        notes: string;
      }>;
    }>;
    total_users: number;
    total_assignments: number;
  }> {
    const response = await axios.get(`${API_BASE_URL}/api/multi-role/all-assignments`, {
      headers: this.getAuthHeaders()
    });
    return response.data.data;
  }
}

export const multiRoleService = new MultiRoleService();
export default multiRoleService;
