/**
 * Multi-Role Time-Based Management Component
 * Allows super admins to assign multiple time-based roles to users
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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import multiRoleService, {
  Role,
  User,
  RoleAssignment,
  AssignRoleRequest,
  UpdateRoleAssignmentRequest
} from '../../services/multiRoleService';
import { HijriDatePicker } from '../Common/HijriDatePicker';

const MultiRoleManagement: React.FC = () => {
  // State management
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userAssignments, setUserAssignments] = useState<RoleAssignment[]>([]);
  const [allUsersWithRoles, setAllUsersWithRoles] = useState<Array<{
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
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<RoleAssignment | null>(null);
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

  const loadAllUsersWithRoles = async () => {
    try {
      setLoadingAllUsers(true);
      const data = await multiRoleService.getAllAssignments();
      setAllUsersWithRoles(data.users || []);
    } catch (error) {
      // Don't show error if endpoint doesn't exist yet
      console.log('Load all users with roles:', error);
    } finally {
      setLoadingAllUsers(false);
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

  const handleAssignRole = async () => {
    if (!selectedUser || !assignForm.role_id) {
      showNotification('error', 'الرجاء إكمال جميع الحقول المطلوبة');
      return;
    }

    try {
      setLoading(true);
      const data: AssignRoleRequest = {
        user_id: selectedUser.id,
        role_id: assignForm.role_id,
        start_date_gregorian: assignForm.start_date_gregorian || undefined,
        end_date_gregorian: assignForm.end_date_gregorian || undefined,
        notes: assignForm.notes || undefined
      };

      const result = await multiRoleService.assignRole(data);
      showNotification('success', result.message || 'تم تعيين الصلاحية بنجاح');
      setShowAssignModal(false);
      resetAssignForm();
      loadUserAssignments(selectedUser.id);
      loadAllUsersWithRoles(); // Refresh the all users list
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'فشل تعيين الصلاحية';
      showNotification('error', errorMsg);
      console.error('Assign role error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;

    try {
      setLoading(true);
      const data: UpdateRoleAssignmentRequest = {
        start_date_gregorian: assignForm.start_date_gregorian || undefined,
        end_date_gregorian: assignForm.end_date_gregorian || undefined,
        notes: assignForm.notes || undefined
      };

      const result = await multiRoleService.updateAssignment(editingAssignment.id, data);
      showNotification('success', result.message || 'تم تحديث الصلاحية بنجاح');
      setShowEditModal(false);
      setEditingAssignment(null);
      resetAssignForm();
      if (selectedUser) {
        loadUserAssignments(selectedUser.id);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'فشل تحديث الصلاحية';
      showNotification('error', errorMsg);
      console.error('Update assignment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAssignment = async (assignment: RoleAssignment) => {
    if (!window.confirm(`هل أنت متأكد من إلغاء صلاحية "${assignment.role_name_ar}"؟`)) {
      return;
    }

    try {
      setLoading(true);
      const result = await multiRoleService.revokeAssignment(assignment.id);
      showNotification('success', result.message || 'تم إلغاء الصلاحية بنجاح');
      if (selectedUser) {
        loadUserAssignments(selectedUser.id);
      }
      loadAllUsersWithRoles(); // Refresh the all users list
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'فشل إلغاء الصلاحية';
      showNotification('error', errorMsg);
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
      start_date_hijri: '',  // Will be populated by HijriDatePicker
      end_date_hijri: '',    // Will be populated by HijriDatePicker
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

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { color: '#10B981', bg: '#D1FAE5', text: 'نشط' },
      pending: { color: '#F59E0B', bg: '#FEF3C7', text: 'قيد الانتظار' },
      expired: { color: '#EF4444', bg: '#FEE2E2', text: 'منتهي' }
    };
    const badge = badges[status as keyof typeof badges] || badges.expired;

    return (
      <span style={{
        padding: '4px 12px',
        background: badge.bg,
        color: badge.color,
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        {badge.text}
      </span>
    );
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'غير محدد';
    return new Date(date).toLocaleDateString('ar-SA');
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    direction: 'rtl'
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '30px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '20px'
  };

  const searchContainerStyle: React.CSSProperties = {
    position: 'relative',
    marginBottom: '20px'
  };

  const searchInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 45px 12px 15px',
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s ease'
  };

  const searchIconStyle: React.CSSProperties = {
    position: 'absolute',
    right: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '20px',
    height: '20px',
    color: '#9CA3AF'
  };

  const searchResultsStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    marginTop: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: 10
  };

  const searchResultItemStyle: React.CSSProperties = {
    padding: '12px 15px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    transition: 'background 0.2s ease'
  };

  const selectedUserCardStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse' as const
  };

  const thStyle: React.CSSProperties = {
    padding: '12px',
    textAlign: 'right' as const,
    borderBottom: '2px solid rgba(0, 0, 0, 0.1)',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  };

  const tdStyle: React.CSSProperties = {
    padding: '15px 12px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    fontSize: '14px'
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalContentStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    direction: 'rtl'
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

      {/* All Users with Roles Section */}
      {allUsersWithRoles.length > 0 && (
        <div style={{
          background: '#F9FAFB',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '30px',
          border: '1px solid rgba(0, 0, 0, 0.08)'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1F2937',
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldCheckIcon style={{ width: '22px', height: '22px', color: '#6366F1' }} />
            جميع المستخدمين مع الأدوار المعينة ({allUsersWithRoles.length} مستخدم)
          </h3>

          <div style={{ display: 'grid', gap: '12px' }}>
            {loadingAllUsers ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6B7280' }}>
                جاري التحميل...
              </div>
            ) : (
              allUsersWithRoles.map((user) => (
                <div
                  key={user.user_id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid rgba(0, 0, 0, 0.08)'
                  }}
                  onClick={() => {
                    const userObj = {
                      id: user.user_id,
                      full_name: user.full_name,
                      email: user.email,
                      phone: user.phone,
                      primary_role: '',
                      source: 'users' as const,
                      active_roles: []
                    };
                    handleSelectUser(userObj);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: '#1F2937' }}>
                        {user.full_name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                        {user.email}
                      </div>
                    </div>
                    <div style={{
                      background: '#6366F1',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {user.roles.length} {user.roles.length === 1 ? 'دور' : 'أدوار'}
                    </div>
                  </div>

                  {/* Show role details on hover */}
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {user.roles.map((role, index) => (
                        <span key={index}>
                          {role.role_name_ar}
                          {index < user.roles.length - 1 && ' • '}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
            style={buttonStyle}
          >
            <PlusIcon style={{ width: '20px', height: '20px' }} />
            تعيين دور جديد
          </button>
        </div>
      )}

      {/* User Assignments Table */}
      {selectedUser && userAssignments.length > 0 && (
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>الدور</th>
                <th style={thStyle}>تاريخ البدء</th>
                <th style={thStyle}>تاريخ الانتهاء</th>
                <th style={thStyle}>الحالة</th>
                <th style={thStyle}>الملاحظات</th>
                <th style={thStyle}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {userAssignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: '600' }}>{assignment.role_name_ar}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      {assignment.role_name}
                    </div>
                  </td>
                  <td style={tdStyle}>{formatDate(assignment.start_date_gregorian)}</td>
                  <td style={tdStyle}>{formatDate(assignment.end_date_gregorian)}</td>
                  <td style={tdStyle}>{getStatusBadge(assignment.status)}</td>
                  <td style={tdStyle}>{assignment.notes || '-'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openEditModal(assignment)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: '#F3F4F6',
                          color: '#4B5563',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="تعديل"
                      >
                        <PencilIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button
                        onClick={() => handleRevokeAssignment(assignment)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="إلغاء"
                      >
                        <TrashIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedUser && userAssignments.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'rgba(0, 0, 0, 0.02)',
          borderRadius: '16px'
        }}>
          <ShieldCheckIcon style={{
            width: '60px',
            height: '60px',
            margin: '0 auto 15px',
            color: '#9CA3AF'
          }} />
          <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '10px' }}>
            لا توجد أدوار مُعينة لهذا العضو
          </div>
          <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
            انقر على "تعيين دور جديد" لإضافة دور
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showAssignModal && (
        <div style={modalOverlayStyle} onClick={() => setShowAssignModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
              تعيين دور جديد
            </h3>

            <div>
              <label style={labelStyle}>اختر الدور *</label>
              <select
                value={assignForm.role_id}
                onChange={(e) => setAssignForm({ ...assignForm, role_id: e.target.value })}
                style={inputStyle}
              >
                <option value="">-- اختر الدور --</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.role_name_ar} ({role.role_name})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <HijriDatePicker
                label="تاريخ البدء (اختياري)"
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

            <div style={{ marginBottom: '15px' }}>
              <HijriDatePicker
                label="تاريخ الانتهاء (اختياري)"
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

            <div>
              <label style={labelStyle}>ملاحظات (اختياري)</label>
              <textarea
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' as const }}
                placeholder="أضف أي ملاحظات إضافية..."
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleAssignRole}
                disabled={loading || !assignForm.role_id}
                style={{
                  ...buttonStyle,
                  opacity: loading || !assignForm.role_id ? 0.5 : 1,
                  cursor: loading || !assignForm.role_id ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'جاري التعيين...' : 'تعيين الدور'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {showEditModal && editingAssignment && (
        <div style={modalOverlayStyle} onClick={() => setShowEditModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
              تعديل تعيين الدور
            </h3>

            <div style={{
              padding: '12px',
              background: 'rgba(102, 126, 234, 0.1)',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                {editingAssignment.role_name_ar}
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                {editingAssignment.role_name}
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <HijriDatePicker
                label="تاريخ البدء"
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

            <div style={{ marginBottom: '15px' }}>
              <HijriDatePicker
                label="تاريخ الانتهاء"
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

            <div>
              <label style={labelStyle}>ملاحظات</label>
              <textarea
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' as const }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingAssignment(null);
                  resetAssignForm();
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: '#F3F4F6',
                  color: '#4B5563',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleUpdateAssignment}
                disabled={loading}
                style={{
                  ...buttonStyle,
                  opacity: loading ? 0.5 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && !showAssignModal && !showEditModal && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'rgba(0, 0, 0, 0.02)',
          borderRadius: '16px',
          marginTop: '20px'
        }}>
          <div style={{ fontSize: '16px', color: '#6B7280' }}>
            جاري التحميل...
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiRoleManagement;
