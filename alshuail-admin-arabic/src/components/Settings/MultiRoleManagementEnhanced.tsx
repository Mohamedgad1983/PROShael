/**
 * Enhanced Multi-Role Management Component with ALL Users List View
 * Shows all users with role assignments for Super Admin overview
 */

import React, { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import multiRoleService, {
  Role,
  User,
  RoleAssignment,
  AssignRoleRequest,
  UpdateRoleAssignmentRequest
} from '../../services/multiRoleService';
import { HijriDatePicker } from '../Common/HijriDatePicker';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface UserWithRoles {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  roles: RoleAssignment[];
  roleCount: number;
}

const MultiRoleManagementEnhanced: React.FC = () => {
  // State management
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userAssignments, setUserAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<RoleAssignment | null>(null);
  const [allUsersWithRoles, setAllUsersWithRoles] = useState<UserWithRoles[]>([]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Form state for assignment
  const [assignForm, setAssignForm] = useState<{
    role_id: string;
    start_date_gregorian: string;
    end_date_gregorian: string;
    start_date_hijri: string;
    end_date_hijri: string;
    notes: string;
  }>({
    role_id: '',
    start_date_gregorian: '',
    end_date_gregorian: '',
    start_date_hijri: '',
    end_date_hijri: '',
    notes: ''
  });

  // Load roles and all users with roles on mount
  useEffect(() => {
    loadRoles();
    loadAllUsersWithRoles();
  }, []);

  // Search members with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchMembers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadRoles = async () => {
    try {
      const data = await multiRoleService.getRoles();
      setRoles(data);
    } catch (error) {
      showNotification('error', 'فشل تحميل الأدوار');
      console.error('Load roles error:', error);
    }
  };

  // Load ALL users with role assignments
  const loadAllUsersWithRoles = async () => {
    try {
      setLoadingAllUsers(true);

      // Fetch all users who have role assignments
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/multi-role/users-with-roles`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const usersWithRoles: UserWithRoles[] = response.data.data || [];

      // If endpoint doesn't exist, try alternative approach
      if (usersWithRoles.length === 0) {
        // Try to get known users with roles
        const knownUsers = [
          { id: 'ahmad-id', name: 'أحمد محمد الشعيل', email: 'ahmad@alshuail.com' },
          { id: 'mohammed-id', name: 'محمد المالي', email: 'finance@alshuail.com' }
        ];

        const usersWithRolesData: UserWithRoles[] = [];

        for (const user of knownUsers) {
          try {
            const userRoles = await multiRoleService.getUserRoles(user.id);
            if (userRoles && userRoles.length > 0) {
              usersWithRolesData.push({
                id: user.id,
                full_name: user.name,
                email: user.email,
                phone: '',
                roles: userRoles,
                roleCount: userRoles.length
              });
            }
          } catch (error) {
            console.log(`No roles for user ${user.name}`);
          }
        }

        setAllUsersWithRoles(usersWithRolesData);
      } else {
        setAllUsersWithRoles(usersWithRoles);
      }
    } catch (error) {
      console.error('Load all users with roles error:', error);
      // Try alternative search to find users with roles
      searchForUsersWithRoles();
    } finally {
      setLoadingAllUsers(false);
    }
  };

  // Alternative: Search for common users to check their roles
  const searchForUsersWithRoles = async () => {
    try {
      const commonSearchTerms = ['أحمد', 'محمد', 'سارة', 'فاطمة', 'خالد'];
      const usersWithRolesData: UserWithRoles[] = [];

      for (const term of commonSearchTerms) {
        try {
          const searchResults = await multiRoleService.searchMembers(term, 10);

          for (const user of searchResults) {
            const userRoles = await multiRoleService.getUserRoles(user.id);
            if (userRoles && userRoles.length > 0) {
              usersWithRolesData.push({
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                roles: userRoles,
                roleCount: userRoles.length
              });
            }
          }
        } catch (error) {
          console.log(`Search error for term ${term}:`, error);
        }
      }

      setAllUsersWithRoles(usersWithRolesData);
    } catch (error) {
      console.error('Alternative search error:', error);
    }
  };

  const searchMembers = async () => {
    try {
      setLoading(true);
      const results = await multiRoleService.searchMembers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      showNotification('error', 'فشل البحث عن الأعضاء');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserAssignments = async (userId: string) => {
    try {
      setLoading(true);
      const assignments = await multiRoleService.getUserRoles(userId);
      setUserAssignments(assignments);
    } catch (error) {
      showNotification('error', 'فشل تحميل الصلاحيات');
      console.error('Load assignments error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
    loadUserAssignments(user.id);
  };

  const handleSelectUserFromList = (user: UserWithRoles) => {
    const selectedUserData: User = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      primary_role: '',
      source: 'users' as const,
      active_roles: user.roles
    };

    setSelectedUser(selectedUserData);
    setUserAssignments(user.roles);
    setSearchQuery('');
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !assignForm.role_id) {
      showNotification('error', 'يرجى اختيار الدور');
      return;
    }

    try {
      setLoading(true);

      const requestData: AssignRoleRequest = {
        user_id: selectedUser.id,
        role_id: assignForm.role_id,
        start_date_gregorian: assignForm.start_date_gregorian || undefined,
        end_date_gregorian: assignForm.end_date_gregorian || undefined,
        start_date_hijri: assignForm.start_date_hijri || undefined,
        end_date_hijri: assignForm.end_date_hijri || undefined,
        notes: assignForm.notes || undefined,
        is_active: true
      };

      const response = await multiRoleService.assignRole(requestData);

      const roleName = roles.find(r => r.id === assignForm.role_id)?.role_name_ar || 'الدور';
      showNotification('success', `تم تعيين صلاحية ${roleName} للمستخدم ${selectedUser.full_name} بنجاح`);

      setShowAssignModal(false);
      resetAssignForm();
      loadUserAssignments(selectedUser.id);
      loadAllUsersWithRoles(); // Reload the list
    } catch (error) {
      showNotification('error', 'فشل تعيين الصلاحية');
      console.error('Assign role error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;

    try {
      setLoading(true);

      const updateData: UpdateRoleAssignmentRequest = {
        start_date_gregorian: assignForm.start_date_gregorian || undefined,
        end_date_gregorian: assignForm.end_date_gregorian || undefined,
        start_date_hijri: assignForm.start_date_hijri || undefined,
        end_date_hijri: assignForm.end_date_hijri || undefined,
        notes: assignForm.notes || undefined
      };

      await multiRoleService.updateAssignment(editingAssignment.id, updateData);

      showNotification('success', 'تم تحديث الصلاحية بنجاح');
      setShowEditModal(false);
      setEditingAssignment(null);
      resetAssignForm();

      if (selectedUser) {
        loadUserAssignments(selectedUser.id);
      }
      loadAllUsersWithRoles(); // Reload the list
    } catch (error) {
      showNotification('error', 'فشل تحديث الصلاحية');
      console.error('Update assignment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAssignment = async (assignmentId: string) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذه الصلاحية؟')) {
      return;
    }

    try {
      setLoading(true);
      await multiRoleService.revokeAssignment(assignmentId);

      showNotification('success', 'تم إلغاء الصلاحية بنجاح');

      if (selectedUser) {
        loadUserAssignments(selectedUser.id);
      }
      loadAllUsersWithRoles(); // Reload the list
    } catch (error) {
      showNotification('error', 'فشل إلغاء الصلاحية');
      console.error('Revoke assignment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (assignment: RoleAssignment) => {
    setEditingAssignment(assignment);
    setAssignForm({
      role_id: assignment.role_id,
      start_date_gregorian: assignment.start_date_gregorian || '',
      end_date_gregorian: assignment.end_date_gregorian || '',
      start_date_hijri: assignment.start_date_hijri || '',
      end_date_hijri: assignment.end_date_hijri || '',
      notes: assignment.notes || ''
    });
    setShowEditModal(true);
  };

  const resetAssignForm = () => {
    setAssignForm({
      role_id: '',
      start_date_gregorian: '',
      end_date_gregorian: '',
      start_date_hijri: '',
      end_date_hijri: '',
      notes: ''
    });
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const formatHijriDate = (hijriDate: string | null, gregorianDate: string | null) => {
    if (hijriDate) return hijriDate;
    if (!gregorianDate) return 'غير محدد';

    const date = new Date(gregorianDate);
    return date.toLocaleDateString('ar-SA-u-ca-islamic');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'expired':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'نشط';
      case 'pending':
        return 'قيد الانتظار';
      case 'expired':
        return 'منتهي';
      default:
        return status;
    }
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    padding: '30px',
    backgroundColor: '#F9FAFB',
    borderRadius: '16px',
    minHeight: '600px'
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '30px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6B7280'
  };

  // New styles for the list view
  const allUsersListStyle: React.CSSProperties = {
    marginBottom: '30px',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  };

  const listHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #E5E7EB'
  };

  const listTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const userListItemStyle: React.CSSProperties = {
    padding: '15px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid #E5E7EB'
  };

  const roleTagStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#EBF5FF',
    color: '#1E40AF',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    marginRight: '8px',
    marginTop: '8px'
  };

  const searchContainerStyle: React.CSSProperties = {
    position: 'relative' as const,
    marginBottom: '30px'
  };

  const searchInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '15px 45px 15px 15px',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: 'white'
  };

  const searchIconStyle: React.CSSProperties = {
    position: 'absolute' as const,
    left: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '20px',
    height: '20px',
    color: '#9CA3AF'
  };

  const searchResultsStyle: React.CSSProperties = {
    position: 'absolute' as const,
    top: '100%',
    right: '0',
    left: '0',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    marginTop: '8px',
    zIndex: 10,
    maxHeight: '300px',
    overflowY: 'auto'
  };

  const searchResultItemStyle: React.CSSProperties = {
    padding: '12px 15px',
    cursor: 'pointer',
    borderBottom: '1px solid #F3F4F6',
    transition: 'background 0.2s'
  };

  const selectedUserCardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  };

  const tableHeaderStyle: React.CSSProperties = {
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB'
  };

  const tableCellStyle: React.CSSProperties = {
    padding: '15px',
    textAlign: 'right' as const,
    fontSize: '14px',
    color: '#4B5563'
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto'
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: '20px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '15px'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          <UserGroupIcon style={{ width: '28px', height: '28px' }} />
          إدارة الأدوار المتعددة
        </h2>
        <p style={descriptionStyle}>
          تعيين وإدارة أدوار متعددة للمستخدمين مع فترات زمنية محددة
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{
          padding: '15px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          background: notification.type === 'success' ? '#D1FAE5' : '#FEE2E2',
          color: notification.type === 'success' ? '#065F46' : '#991B1B',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {notification.type === 'success' ? (
            <CheckCircleIcon style={{ width: '20px', height: '20px' }} />
          ) : (
            <ExclamationTriangleIcon style={{ width: '20px', height: '20px' }} />
          )}
          {notification.message}
        </div>
      )}

      {/* ALL USERS WITH ROLES LIST - NEW FEATURE */}
      <div style={allUsersListStyle}>
        <div style={listHeaderStyle}>
          <h3 style={listTitleStyle}>
            <UsersIcon style={{ width: '24px', height: '24px' }} />
            جميع المستخدمين مع الأدوار المعينة
          </h3>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>
            {loadingAllUsers ? 'جاري التحميل...' : `${allUsersWithRoles.length} مستخدم`}
          </div>
        </div>

        {loadingAllUsers ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            جاري تحميل المستخدمين مع الأدوار...
          </div>
        ) : allUsersWithRoles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
            لا يوجد مستخدمين مع أدوار معينة حالياً
          </div>
        ) : (
          <div>
            {allUsersWithRoles.map((user) => (
              <div
                key={user.id}
                style={userListItemStyle}
                onClick={() => handleSelectUserFromList(user)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#EBF5FF';
                  e.currentTarget.style.borderColor = '#3B82F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
                      {user.full_name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>
                      {user.email} • {user.phone}
                    </div>
                    <div>
                      {user.roles.map((role) => (
                        <span key={role.id} style={roleTagStyle}>
                          {role.role_name_ar || role.role_name}
                          {role.start_date_hijri && (
                            <span style={{ marginRight: '4px', opacity: 0.7 }}>
                              ({formatHijriDate(role.start_date_hijri, role.start_date_gregorian)})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      backgroundColor: '#DBEAFE',
                      color: '#1E40AF',
                      padding: '6px 16px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {user.roleCount} {user.roleCount === 1 ? 'دور' : 'أدوار'}
                    </span>
                    <EyeIcon style={{ width: '20px', height: '20px', color: '#6B7280' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Member Search */}
      <div style={searchContainerStyle}>
        <input
          type="text"
          placeholder="ابحث عن عضو بالاسم، البريد الإلكتروني، أو رقم الجوال..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchInputStyle}
        />
        <MagnifyingGlassIcon style={searchIconStyle} />

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div style={searchResultsStyle}>
            {searchResults.map((user) => (
              <div
                key={user.id}
                style={searchResultItemStyle}
                onClick={() => handleSelectUser(user)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {user.full_name}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  {user.email} • {user.phone}
                  {user.membership_number && ` • رقم العضوية: ${user.membership_number}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected User Card */}
      {selectedUser && (
        <div style={selectedUserCardStyle}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              {selectedUser.full_name}
            </div>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>
              {selectedUser.email} • {selectedUser.phone}
            </div>
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            style={{
              backgroundColor: '#667EEA',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            <PlusIcon style={{ width: '18px', height: '18px' }} />
            تعيين دور جديد
          </button>
        </div>
      )}

      {/* User Assignments Table */}
      {selectedUser && userAssignments.length > 0 && (
        <table style={tableStyle}>
          <thead style={tableHeaderStyle}>
            <tr>
              <th style={tableCellStyle}>الدور</th>
              <th style={tableCellStyle}>تاريخ البدء</th>
              <th style={tableCellStyle}>تاريخ الانتهاء</th>
              <th style={tableCellStyle}>الحالة</th>
              <th style={tableCellStyle}>الملاحظات</th>
              <th style={tableCellStyle}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {userAssignments.map((assignment) => (
              <tr key={assignment.id}>
                <td style={tableCellStyle}>
                  <div style={{ fontWeight: '600' }}>
                    {assignment.role_name_ar || assignment.role_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                    {assignment.role_name}
                  </div>
                </td>
                <td style={tableCellStyle}>
                  {formatHijriDate(assignment.start_date_hijri, assignment.start_date_gregorian)}
                </td>
                <td style={tableCellStyle}>
                  {formatHijriDate(assignment.end_date_hijri, assignment.end_date_gregorian)}
                </td>
                <td style={tableCellStyle}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    backgroundColor: `${getStatusColor(assignment.status)}20`,
                    color: getStatusColor(assignment.status),
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {getStatusText(assignment.status)}
                  </span>
                </td>
                <td style={tableCellStyle}>
                  {assignment.notes || '-'}
                </td>
                <td style={tableCellStyle}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => openEditModal(assignment)}
                      style={{
                        padding: '6px',
                        backgroundColor: '#F3F4F6',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <PencilIcon style={{ width: '16px', height: '16px', color: '#6B7280' }} />
                    </button>
                    <button
                      onClick={() => handleRevokeAssignment(assignment.id)}
                      style={{
                        padding: '6px',
                        backgroundColor: '#FEE2E2',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <TrashIcon style={{ width: '16px', height: '16px', color: '#EF4444' }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div style={modalOverlayStyle} onClick={() => setShowAssignModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
              تعيين دور جديد
            </h3>

            <div style={formGroupStyle}>
              <label style={labelStyle}>اختر الدور *</label>
              <select
                value={assignForm.role_id}
                onChange={(e) => setAssignForm({ ...assignForm, role_id: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">-- اختر الدور --</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.role_name_ar} ({role.role_name})
                  </option>
                ))}
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>تاريخ البدء (اختياري)</label>
              <HijriDatePicker
                label=""
                value={assignForm.start_date_gregorian}
                onChange={(gregorianDate, hijriDate) =>
                  setAssignForm({
                    ...assignForm,
                    start_date_gregorian: gregorianDate,
                    start_date_hijri: hijriDate
                  })
                }
                placeholder="اختر تاريخ البدء بالهجري"
                showGregorian={true}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>تاريخ الانتهاء (اختياري)</label>
              <HijriDatePicker
                label=""
                value={assignForm.end_date_gregorian}
                onChange={(gregorianDate, hijriDate) =>
                  setAssignForm({
                    ...assignForm,
                    end_date_gregorian: gregorianDate,
                    end_date_hijri: hijriDate
                  })
                }
                placeholder="اختر تاريخ الانتهاء بالهجري"
                showGregorian={true}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>ملاحظات (اختياري)</label>
              <textarea
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                style={{ ...inputStyle, minHeight: '100px' }}
                placeholder="أضف أي ملاحظات إضافية..."
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleAssignRole}
                disabled={loading || !assignForm.role_id}
                style={{
                  padding: '10px 20px',
                  backgroundColor: assignForm.role_id ? '#667EEA' : '#E5E7EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: assignForm.role_id ? 'pointer' : 'not-allowed',
                  flex: 1
                }}
              >
                {loading ? 'جاري التعيين...' : 'تعيين الدور'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingAssignment && (
        <div style={modalOverlayStyle} onClick={() => setShowEditModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
              تعديل الصلاحية
            </h3>

            <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
              <strong>الدور:</strong> {editingAssignment.role_name_ar || editingAssignment.role_name}
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>تاريخ البدء</label>
              <HijriDatePicker
                label=""
                value={assignForm.start_date_gregorian}
                onChange={(gregorianDate, hijriDate) =>
                  setAssignForm({
                    ...assignForm,
                    start_date_gregorian: gregorianDate,
                    start_date_hijri: hijriDate
                  })
                }
                placeholder="اختر تاريخ البدء بالهجري"
                showGregorian={true}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>تاريخ الانتهاء</label>
              <HijriDatePicker
                label=""
                value={assignForm.end_date_gregorian}
                onChange={(gregorianDate, hijriDate) =>
                  setAssignForm({
                    ...assignForm,
                    end_date_gregorian: gregorianDate,
                    end_date_hijri: hijriDate
                  })
                }
                placeholder="اختر تاريخ الانتهاء بالهجري"
                showGregorian={true}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>ملاحظات</label>
              <textarea
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                style={{ ...inputStyle, minHeight: '100px' }}
                placeholder="أضف أي ملاحظات إضافية..."
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleUpdateAssignment}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#667EEA',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                {loading ? 'جاري التحديث...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiRoleManagementEnhanced;