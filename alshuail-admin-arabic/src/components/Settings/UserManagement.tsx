/**
 * User Management Component
 * RBAC user and role management for Super Admin
 */

import React, {  useState, useEffect , useCallback } from 'react';
import {
  UserIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { ROLE_DISPLAY_NAMES, UserRole } from '../../contexts/RoleContext';

interface User {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  role: UserRole;
  roleAr: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    phone: '',
    name: '',
    role: 'super_admin',
    password: ''
  });

  // Mock data - replace with actual API calls
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockUsers: User[] = [
        {
          id: '1',
          email: 'admin@alshuail.com',
          phone: '0551234567',
          name: 'أحمد الشعيل',
          role: 'super_admin',
          roleAr: 'المدير الأعلى',
          isActive: true,
          createdAt: '2024-01-01',
          lastLogin: '2024-12-20'
        },
        {
          id: '2',
          email: 'finance@alshuail.com',
          phone: '0552345678',
          name: 'محمد المالي',
          role: 'financial_manager',
          roleAr: 'المدير المالي',
          isActive: true,
          createdAt: '2024-01-15',
          lastLogin: '2024-12-19'
        },
        {
          id: '3',
          email: 'tree@alshuail.com',
          phone: '0553456789',
          name: 'سارة العائلة',
          role: 'family_tree_admin',
          roleAr: 'مدير شجرة العائلة',
          isActive: true,
          createdAt: '2024-02-01',
          lastLogin: '2024-12-18'
        },
        {
          id: '4',
          email: 'events@alshuail.com',
          phone: '0554567890',
          name: 'فاطمة المناسبات',
          role: 'occasions_initiatives_diyas_admin',
          roleAr: 'مدير المناسبات والمبادرات والديات',
          isActive: true,
          createdAt: '2024-02-15',
          lastLogin: '2024-12-20'
        },
        {
          id: '5',
          email: 'member1@alshuail.com',
          phone: '0555678901',
          name: 'خالد الشعيل',
          role: 'user_member',
          roleAr: 'عضو عادي',
          isActive: true,
          createdAt: '2024-03-01'
        }
      ];

      setUsers(mockUsers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
      setMessage({ type: 'error', text: 'خطأ في جلب بيانات المستخدمين' });
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setSaving(true);
    try {
      // Make API call to update role
      const response = await fetch(`http://localhost:3001/api/users/${userId}/assign-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ roleName: newRole })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'تم تحديث الدور بنجاح' });
        setShowEditModal(false);
        fetchUsers();
      } else {
        throw new Error('Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      setMessage({ type: 'error', text: 'خطأ في تحديث الدور' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Validate form fields
      if (!newUser.email || !newUser.name || !newUser.phone || !newUser.password) {
        setMessage({ type: 'error', text: 'يرجى ملء جميع الحقول المطلوبة' });
        setSaving(false);
        return;
      }

      // Mock API call - replace with actual API when backend is ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create new user object
      const userToAdd: User = {
        id: String(Date.now()),
        email: newUser.email,
        phone: newUser.phone,
        name: newUser.name,
        role: newUser.role as UserRole,
        roleAr: getRoleNameAr(newUser.role),
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0]
      };

      // Add to users list (in production, this would be done via API)
      setUsers(prev => [...prev, userToAdd]);

      setMessage({ type: 'success', text: 'تم إضافة المستخدم بنجاح' });
      setShowAddModal(false);

      // Reset form
      setNewUser({
        email: '',
        phone: '',
        name: '',
        role: 'user_member',
        password: ''
      });
    } catch (error) {
      console.error('Error adding user:', error);
      setMessage({ type: 'error', text: 'خطأ في إضافة المستخدم' });
    } finally {
      setSaving(false);
    }
  };

  const getRoleNameAr = (role: string) => {
  // Performance optimized event handlers
  const handleRefresh = useCallback(() => {
    // Refresh logic here
  }, []);

  const handleFilterChange = useCallback((filterType, value) => {
    // Filter logic here
  }, []);

  const handlePageChange = useCallback((page) => {
    // Pagination logic here
  }, []);

    const roleMap: { [key: string]: string } = {
      'super_admin': 'المدير الأعلى',
      'financial_manager': 'المدير المالي',
      'family_tree_admin': 'مدير شجرة العائلة',
      'occasions_initiatives_diyas_admin': 'مدير المناسبات والمبادرات',
      'user_member': 'عضو عادي'
    };
    return roleMap[role] || role;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.includes(searchTerm);
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Styles
  const statsCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    transition: 'all 0.3s ease'
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0',
    marginTop: '20px'
  };

  const thStyle: React.CSSProperties = {
    padding: '15px',
    textAlign: 'right',
    borderBottom: '2px solid rgba(0, 0, 0, 0.1)',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const tdStyle: React.CSSProperties = {
    padding: '15px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    fontSize: '14px',
    color: '#1F2937'
  };

  const roleTagStyle = (role: UserRole): React.CSSProperties => {
    const colors: Record<UserRole, { bg: string; text: string }> = {
      super_admin: { bg: '#DC2626', text: 'white' },
      financial_manager: { bg: '#059669', text: 'white' },
      family_tree_admin: { bg: '#7C3AED', text: 'white' },
      occasions_initiatives_diyas_admin: { bg: '#EA580C', text: 'white' },
      user_member: { bg: '#6B7280', text: 'white' }
    };

    const color = colors[role] || colors.user_member;

    return {
      display: 'inline-block',
      padding: '6px 12px',
      backgroundColor: color.bg,
      color: color.text,
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600'
    };
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalContentStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    width: '500px',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  };

  // Role statistics
  const roleStats = {
    super_admin: users.filter(u => u.role === 'super_admin').length,
    financial_manager: users.filter(u => u.role === 'financial_manager').length,
    family_tree_admin: users.filter(u => u.role === 'family_tree_admin').length,
    occasions_initiatives_diyas_admin: users.filter(u => u.role === 'occasions_initiatives_diyas_admin').length,
    user_member: users.filter(u => u.role === 'user_member').length
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#1F2937',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <UserGroupIcon style={{ width: '28px', height: '28px' }} />
          إدارة المستخدمين والصلاحيات
        </h2>
        <p style={{ color: '#6B7280', fontSize: '14px' }}>
          إدارة المستخدمين وتعيين الأدوار والصلاحيات لكل مستخدم في النظام
        </p>
      </div>

      {/* Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <div style={statsCardStyle}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheckIcon style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{roleStats.super_admin}</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>مدير أعلى</div>
          </div>
        </div>

        <div style={statsCardStyle}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserIcon style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{roleStats.financial_manager}</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>مدير مالي</div>
          </div>
        </div>

        <div style={statsCardStyle}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserIcon style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{roleStats.family_tree_admin}</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>مدير شجرة</div>
          </div>
        </div>

        <div style={statsCardStyle}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserIcon style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{roleStats.user_member}</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>عضو عادي</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          flex: 1,
          minWidth: '200px',
          position: 'relative'
        }}>
          <MagnifyingGlassIcon style={{
            width: '20px',
            height: '20px',
            position: 'absolute',
            right: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#6B7280'
          }} />
          <input
            type="text"
            placeholder="البحث عن مستخدم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 45px 12px 15px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
          />
        </div>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          style={{
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer',
            minWidth: '150px'
          }}
        >
          <option value="all">كل الأدوار</option>
          <option value="super_admin">المدير الأعلى</option>
          <option value="financial_manager">المدير المالي</option>
          <option value="family_tree_admin">مدير شجرة العائلة</option>
          <option value="occasions_initiatives_diyas_admin">مدير المناسبات</option>
          <option value="user_member">عضو عادي</option>
        </select>

        <button
          onClick={fetchUsers}
          style={{
            padding: '12px 20px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease'
          }}
        >
          <ArrowPathIcon style={{ width: '16px', height: '16px' }} />
          تحديث
        </button>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '12px 20px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease'
          }}
        >
          <PlusIcon style={{ width: '16px', height: '16px' }} />
          إضافة مستخدم
        </button>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: message.type === 'success' ? '#D1FAE5' :
                         message.type === 'error' ? '#FEE2E2' : '#DBEAFE',
          color: message.type === 'success' ? '#065F46' :
                message.type === 'error' ? '#991B1B' : '#1E40AF'
        }}>
          {message.type === 'success' && <CheckCircleIcon style={{ width: '20px', height: '20px' }} />}
          {message.type === 'error' && <XCircleIcon style={{ width: '20px', height: '20px' }} />}
          {message.type === 'info' && <ExclamationTriangleIcon style={{ width: '20px', height: '20px' }} />}
          {message.text}
        </div>
      )}

      {/* Users Table */}
      <div style={{
        overflowX: 'auto',
        background: 'white',
        borderRadius: '12px',
        border: '1px solid rgba(0, 0, 0, 0.1)'
      }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>المستخدم</th>
              <th style={thStyle}>الدور الحالي</th>
              <th style={thStyle}>الحالة</th>
              <th style={thStyle}>تاريخ الإنضمام</th>
              <th style={thStyle}>آخر دخول</th>
              <th style={thStyle}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', padding: '40px' }}>
                  جاري التحميل...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', padding: '40px' }}>
                  لا توجد نتائج
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} style={{
                  transition: 'background 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        {user.name ? user.name[0] : user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600' }}>{user.name || user.email}</div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>{user.email}</div>
                        {user.phone && (
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{user.phone}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={roleTagStyle(user.role)}>
                      {user.roleAr}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: user.isActive ? '#10B981' : '#EF4444'
                      }} />
                      <span style={{
                        fontSize: '13px',
                        color: user.isActive ? '#059669' : '#DC2626'
                      }}>
                        {user.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: '13px', color: '#6B7280' }}>
                    {new Date(user.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td style={{ ...tdStyle, fontSize: '13px', color: '#6B7280' }}>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ar-SA') : 'لم يدخل بعد'}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          background: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                          e.currentTarget.style.borderColor = 'transparent';
                          const icon = e.currentTarget.querySelector('svg');
                          if (icon) (icon as SVGElement).style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                          const icon = e.currentTarget.querySelector('svg');
                          if (icon) (icon as SVGElement).style.color = '#6B7280';
                        }}
                      >
                        <PencilIcon style={{ width: '16px', height: '16px', color: '#6B7280' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Role Modal */}
      {showEditModal && selectedUser && (
        <div style={modalOverlayStyle} onClick={() => setShowEditModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <KeyIcon style={{ width: '24px', height: '24px' }} />
              تغيير دور المستخدم
            </h3>

            <div style={{
              padding: '20px',
              background: 'rgba(0, 0, 0, 0.02)',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <strong>المستخدم:</strong> {selectedUser.name || selectedUser.email}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>البريد الإلكتروني:</strong> {selectedUser.email}
              </div>
              <div>
                <strong>الدور الحالي:</strong>{' '}
                <span style={roleTagStyle(selectedUser.role)}>{selectedUser.roleAr}</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '10px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                اختر الدور الجديد:
              </label>
              <select
                defaultValue={selectedUser.role}
                onChange={(e) => {
                  setSelectedUser({
                    ...selectedUser,
                    role: e.target.value as UserRole
                  });
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {Object.entries(ROLE_DISPLAY_NAMES).map(([role, names]) => (
                  <option key={role} value={role}>
                    {names.ar}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Permissions Display */}
            <div style={{
              padding: '15px',
              background: 'rgba(251, 191, 36, 0.1)',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
                color: '#92400E'
              }}>
                <ExclamationTriangleIcon style={{ width: '20px', height: '20px' }} />
                <strong>صلاحيات الدور المختار:</strong>
              </div>
              <ul style={{
                margin: '0',
                paddingRight: '20px',
                fontSize: '13px',
                color: '#78350F',
                lineHeight: '1.8'
              }}>
                {selectedUser.role === 'super_admin' && (
                  <>
                    <li>الوصول الكامل لجميع أنحاء النظام</li>
                    <li>إدارة المستخدمين والأدوار</li>
                    <li>عرض جميع بيانات الأعضاء</li>
                    <li>الوصول لسجلات التدقيق</li>
                  </>
                )}
                {selectedUser.role === 'financial_manager' && (
                  <>
                    <li>إدارة الاشتراكات والمدفوعات</li>
                    <li>عرض التقارير المالية</li>
                    <li>لا يمكنه الوصول للمناسبات أو المبادرات</li>
                  </>
                )}
                {selectedUser.role === 'family_tree_admin' && (
                  <>
                    <li>إدارة شجرة العائلة</li>
                    <li>تعديل العلاقات العائلية</li>
                    <li>لا يمكنه الوصول للبيانات المالية</li>
                  </>
                )}
                {selectedUser.role === 'occasions_initiatives_diyas_admin' && (
                  <>
                    <li>إدارة المناسبات والفعاليات</li>
                    <li>إدارة المبادرات الخيرية</li>
                    <li>إدارة الديات والتعويضات</li>
                    <li>لا يمكنه الوصول للبيانات المالية أو شجرة العائلة</li>
                  </>
                )}
                {selectedUser.role === 'user_member' && (
                  <>
                    <li>عرض البيانات الشخصية فقط</li>
                    <li>التسجيل في الفعاليات</li>
                    <li>عرض المدفوعات الخاصة</li>
                    <li>لا يمكنه عرض بيانات الآخرين</li>
                  </>
                )}
              </ul>
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  background: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                إلغاء
              </button>
              <button
                onClick={() => handleRoleChange(selectedUser.id, selectedUser.role)}
                disabled={saving}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div style={modalOverlayStyle} onClick={() => setShowAddModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <PlusIcon style={{ width: '24px', height: '24px', color: '#10B981' }} />
              إضافة مستخدم جديد
            </h3>

            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Name Field */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  placeholder="أدخل الاسم الكامل"
                />
              </div>

              {/* Email Field */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  البريد الإلكتروني *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  placeholder="example@alshuail.com"
                  dir="ltr"
                />
              </div>

              {/* Phone Field */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  رقم الهاتف *
                </label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                />
              </div>

              {/* Password Field */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  كلمة المرور *
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  الدور الوظيفي *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '2px solid #007AFF',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                    backgroundColor: '#FFFFFF',
                    color: '#1F2937'
                  }}
                >
                  <option value="super_admin">المدير الأعلى</option>
                  <option value="financial_manager">المدير المالي</option>
                  <option value="family_tree_admin">مدير شجرة العائلة</option>
                  <option value="occasions_initiatives_diyas_admin">مدير المناسبات والمبادرات والديات</option>
                  <option value="user_member">عضو عادي</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewUser({
                    email: '',
                    phone: '',
                    name: '',
                    role: 'user_member',
                    password: ''
                  });
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: '#F3F4F6',
                  color: '#6B7280',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleAddUser}
                disabled={saving}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {saving ? 'جاري الإضافة...' : 'إضافة المستخدم'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// Phase 4: Performance Optimization - Memoize to prevent unnecessary re-renders
export default React.memo(UserManagement);