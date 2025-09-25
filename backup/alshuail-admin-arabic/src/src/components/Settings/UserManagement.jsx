/**
 * User Management Component
 * Premium Apple-inspired interface for RBAC user and role management
 * Features glassmorphism effects, sophisticated animations, and full RTL support
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../Members/AppleDesignSystem.css';
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
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronDownIcon,
  FunnelIcon,
  SparklesIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const UserManagement = () => {
  const { user: currentUser, hasRole, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    phone: '',
    name: '',
    role: 'user_member',
    password: '',
    isActive: true
  });

  // Role definitions with Arabic names and colors
  const roleDefinitions = {
    super_admin: {
      name: 'المدير الأعلى',
      nameEn: 'Super Admin',
      description: 'صلاحيات كاملة على جميع أجزاء النظام',
      color: 'linear-gradient(135deg, var(--apple-blue-600) 0%, var(--apple-purple-600) 100%)',
      shadowColor: 'rgba(59, 130, 246, 0.3)',
      level: 100
    },
    financial_manager: {
      name: 'المدير المالي',
      nameEn: 'Financial Manager',
      description: 'إدارة الشؤون المالية والاشتراكات والمدفوعات',
      color: 'linear-gradient(135deg, var(--apple-green-500) 0%, var(--apple-emerald-600) 100%)',
      shadowColor: 'rgba(34, 197, 94, 0.3)',
      level: 80
    },
    family_tree_admin: {
      name: 'مدير شجرة العائلة',
      nameEn: 'Family Tree Admin',
      description: 'إدارة شجرة العائلة والعلاقات الأسرية',
      color: 'linear-gradient(135deg, var(--apple-amber-500) 0%, var(--apple-orange-600) 100%)',
      shadowColor: 'rgba(245, 158, 11, 0.3)',
      level: 70
    },
    occasions_initiatives_diyas_admin: {
      name: 'مدير المناسبات والمبادرات',
      nameEn: 'Events & Initiatives Admin',
      description: 'إدارة المناسبات والمبادرات وحالات الديات',
      color: 'linear-gradient(135deg, var(--apple-purple-500) 0%, var(--apple-violet-600) 100%)',
      shadowColor: 'rgba(168, 85, 247, 0.3)',
      level: 60
    },
    user_member: {
      name: 'عضو عادي',
      nameEn: 'User Member',
      description: 'عضو عادي في العائلة مع صلاحيات محدودة',
      color: 'linear-gradient(135deg, var(--apple-gray-500) 0%, var(--apple-gray-600) 100%)',
      shadowColor: 'rgba(75, 85, 99, 0.3)',
      level: 10
    }
  };

  // Mock users data - replace with actual API calls
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockUsers = [
        {
          id: '1',
          email: 'admin@alshuail.com',
          phone: '0551234567',
          name: 'أحمد محمد الشعيل',
          role: 'super_admin',
          isActive: true,
          createdAt: '2024-01-01',
          lastLogin: '2024-12-20T10:30:00Z',
          loginCount: 156
        },
        {
          id: '2',
          email: 'finance@alshuail.com',
          phone: '0552345678',
          name: 'محمد عبدالله المالي',
          role: 'financial_manager',
          isActive: true,
          createdAt: '2024-01-15',
          lastLogin: '2024-12-19T14:20:00Z',
          loginCount: 89
        },
        {
          id: '3',
          email: 'tree@alshuail.com',
          phone: '0553456789',
          name: 'سارة أحمد العائلة',
          role: 'family_tree_admin',
          isActive: true,
          createdAt: '2024-02-01',
          lastLogin: '2024-12-18T09:15:00Z',
          loginCount: 67
        },
        {
          id: '4',
          email: 'events@alshuail.com',
          phone: '0554567890',
          name: 'فاطمة سعد المناسبات',
          role: 'occasions_initiatives_diyas_admin',
          isActive: true,
          createdAt: '2024-02-15',
          lastLogin: '2024-12-20T16:45:00Z',
          loginCount: 45
        },
        {
          id: '5',
          email: 'member1@alshuail.com',
          phone: '0555678901',
          name: 'خالد محمد الشعيل',
          role: 'user_member',
          isActive: true,
          createdAt: '2024-03-01',
          lastLogin: '2024-12-17T12:00:00Z',
          loginCount: 23
        },
        {
          id: '6',
          email: 'member2@alshuail.com',
          phone: '0556789012',
          name: 'نورا عبدالعزيز الشعيل',
          role: 'user_member',
          isActive: false,
          createdAt: '2024-03-15',
          lastLogin: '2024-12-10T08:30:00Z',
          loginCount: 8
        }
      ];

      // Simulate API delay
      setTimeout(() => {
        setUsers(mockUsers);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
      setMessage({ type: 'error', text: 'خطأ في جلب بيانات المستخدمين' });
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);

    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' ||
      (selectedStatus === 'active' && user.isActive) ||
      (selectedStatus === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Statistics
  const statistics = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    admins: users.filter(u => ['super_admin', 'financial_manager', 'family_tree_admin', 'occasions_initiatives_diyas_admin'].includes(u.role)).length,
    members: users.filter(u => u.role === 'user_member').length
  };

  const handleRoleChange = async (userId, newRole) => {
    setSaving(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setUsers(prev => prev.map(user =>
          user.id === userId ? { ...user, role: newRole } : user
        ));
        setMessage({ type: 'success', text: 'تم تحديث الدور بنجاح' });
        setShowEditModal(false);
        setSaving(false);
      }, 1000);
    } catch (error) {
      console.error('Error updating role:', error);
      setMessage({ type: 'error', text: 'خطأ في تحديث الدور' });
      setSaving(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, isActive: newStatus } : user
      ));
      setMessage({
        type: 'success',
        text: newStatus ? 'تم تفعيل المستخدم بنجاح' : 'تم إلغاء تفعيل المستخدم'
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'خطأ في تحديث حالة المستخدم' });
    }
  };

  const handleAddUser = async () => {
    setSaving(true);
    try {
      // Simulate API call
      setTimeout(() => {
        const newUserData = {
          id: Date.now().toString(),
          ...newUser,
          createdAt: new Date().toISOString().split('T')[0],
          loginCount: 0
        };
        setUsers(prev => [...prev, newUserData]);
        setMessage({ type: 'success', text: 'تم إضافة المستخدم بنجاح' });
        setShowAddModal(false);
        setNewUser({
          email: '',
          phone: '',
          name: '',
          role: 'user_member',
          password: '',
          isActive: true
        });
        setSaving(false);
      }, 1000);
    } catch (error) {
      setMessage({ type: 'error', text: 'خطأ في إضافة المستخدم' });
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    setSaving(true);
    try {
      setTimeout(() => {
        setUsers(prev => prev.filter(user => user.id !== selectedUser.id));
        setMessage({ type: 'success', text: 'تم حذف المستخدم بنجاح' });
        setShowDeleteModal(false);
        setSelectedUser(null);
        setSaving(false);
      }, 1000);
    } catch (error) {
      setMessage({ type: 'error', text: 'خطأ في حذف المستخدم' });
      setSaving(false);
    }
  };

  // Statistics Cards Component
  const StatisticsCards = () => {
    const statsConfig = [
      {
        icon: UserGroupIcon,
        value: statistics.total,
        label: 'إجمالي المستخدمين',
        gradient: 'linear-gradient(135deg, var(--apple-blue-500) 0%, var(--apple-blue-600) 100%)',
        shadowColor: 'rgba(59, 130, 246, 0.3)',
        delay: '0ms'
      },
      {
        icon: CheckCircleIcon,
        value: statistics.active,
        label: 'المستخدمون النشطون',
        gradient: 'linear-gradient(135deg, var(--apple-green-500) 0%, var(--apple-emerald-600) 100%)',
        shadowColor: 'rgba(34, 197, 94, 0.3)',
        delay: '100ms'
      },
      {
        icon: ShieldCheckIcon,
        value: statistics.admins,
        label: 'المديرون',
        gradient: 'linear-gradient(135deg, var(--apple-purple-500) 0%, var(--apple-violet-600) 100%)',
        shadowColor: 'rgba(168, 85, 247, 0.3)',
        delay: '200ms'
      },
      {
        icon: UserIcon,
        value: statistics.members,
        label: 'الأعضاء العاديون',
        gradient: 'linear-gradient(135deg, var(--apple-amber-500) 0%, var(--apple-orange-600) 100%)',
        shadowColor: 'rgba(245, 158, 11, 0.3)',
        delay: '300ms'
      }
    ];

    return (
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {statsConfig.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              className="stat-card slide-in-up"
              style={{ animationDelay: stat.delay }}
            >
              <div className="stat-icon-wrapper" style={{
                background: stat.gradient,
                boxShadow: `0 8px 25px ${stat.shadowColor}`
              }}>
                <IconComponent className="stat-icon" />
              </div>
              <div className="stat-number">{stat.value.toLocaleString('ar-SA')}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // Filters Section
  const FiltersSection = () => (
    <div className={`glass-container transition-all duration-500 ${
      showFilters ? 'opacity-100 transform translate-y-0 mb-6' : 'opacity-0 transform -translate-y-4 hidden'
    }`}>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <FunnelIcon style={{ width: '20px', height: '20px', color: 'var(--apple-blue-600)' }} />
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--apple-gray-900)',
            fontFamily: 'var(--font-display)'
          }}>
            فلاتر البحث المتقدمة
          </h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--apple-gray-700)',
              marginBottom: '0.5rem'
            }}>
              الدور
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="apple-select"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px'
              }}
            >
              <option value="all">جميع الأدوار</option>
              {Object.entries(roleDefinitions).map(([key, role]) => (
                <option key={key} value={key}>{role.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--apple-gray-700)',
              marginBottom: '0.5rem'
            }}>
              الحالة
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="apple-select"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px'
              }}
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  // Search and Actions Bar
  const SearchAndActionsBar = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      marginBottom: '1.5rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div className="apple-search-bar" style={{ flex: '1', maxWidth: '400px' }}>
          <MagnifyingGlassIcon className="apple-search-icon" style={{ width: '20px', height: '20px' }} />
          <input
            type="text"
            placeholder="البحث في المستخدمين..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="apple-search-input"
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAddModal(true)}
            className="apple-button-primary"
          >
            <PlusIcon style={{ width: '16px', height: '16px' }} />
            إضافة مستخدم
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="apple-button-secondary"
          >
            <FunnelIcon style={{ width: '16px', height: '16px' }} />
            الفلاتر
          </button>

          <button
            onClick={fetchUsers}
            className="apple-button-secondary"
            disabled={loading}
          >
            <ArrowPathIcon style={{ width: '16px', height: '16px' }} />
            تحديث
          </button>
        </div>
      </div>
    </div>
  );

  // Users Table Component
  const UsersTable = () => (
    <div className="apple-table-container slide-in-up">
      <div style={{ overflowX: 'auto' }}>
        <table className="apple-table">
          <thead className="apple-table-header">
            <tr>
              <th>المستخدم</th>
              <th>البريد الإلكتروني</th>
              <th>الهاتف</th>
              <th>الدور</th>
              <th>الحالة</th>
              <th>آخر دخول</th>
              <th>عدد مرات الدخول</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    <div className="loading-spinner"></div>
                    <span style={{ color: 'var(--apple-gray-600)', fontSize: '16px' }}>جاري التحميل...</span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--apple-gray-500)' }}>
                  لا توجد مستخدمين مطابقين للبحث
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => (
                <tr key={user.id} className="apple-table-row" style={{ animationDelay: `${index * 50}ms` }}>
                  <td className="apple-table-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: roleDefinitions[user.role]?.color || 'var(--apple-gray-500)',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        {user.name?.charAt(0) || 'ص'}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--apple-gray-900)', marginBottom: '2px' }}>
                          {user.name || 'غير محدد'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--apple-gray-500)' }}>
                          #{user.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="apple-table-cell" style={{ fontWeight: '500' }}>
                    {user.email}
                  </td>
                  <td className="apple-table-cell" style={{ fontWeight: '500', direction: 'ltr', textAlign: 'right' }}>
                    {user.phone || 'غير محدد'}
                  </td>
                  <td className="apple-table-cell">
                    <span
                      className="apple-badge"
                      style={{
                        background: roleDefinitions[user.role]?.color,
                        color: 'white',
                        boxShadow: `0 2px 8px ${roleDefinitions[user.role]?.shadowColor}`
                      }}
                    >
                      {roleDefinitions[user.role]?.name}
                    </span>
                  </td>
                  <td className="apple-table-cell">
                    <span className={`apple-badge ${user.isActive ? 'apple-badge-success' : 'apple-badge-neutral'}`}>
                      {user.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="apple-table-cell" style={{ color: 'var(--apple-gray-600)' }}>
                    {user.lastLogin ? (
                      <div>
                        <div>{new Date(user.lastLogin).toLocaleDateString('ar-SA')}</div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>
                          {new Date(user.lastLogin).toLocaleTimeString('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    ) : (
                      'لم يدخل بعد'
                    )}
                  </td>
                  <td className="apple-table-cell" style={{ textAlign: 'center', fontWeight: '600' }}>
                    {user.loginCount || 0}
                  </td>
                  <td className="apple-table-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                        className="apple-button-secondary"
                        style={{ padding: '0.5rem', minWidth: 'auto' }}
                        title="تعديل"
                      >
                        <PencilIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button
                        onClick={() => handleStatusChange(user.id, !user.isActive)}
                        className="apple-button-secondary"
                        style={{
                          padding: '0.5rem',
                          minWidth: 'auto',
                          color: user.isActive ? 'var(--apple-amber-600)' : 'var(--apple-green-600)'
                        }}
                        title={user.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
                      >
                        {user.isActive ? (
                          <EyeSlashIcon style={{ width: '16px', height: '16px' }} />
                        ) : (
                          <EyeIcon style={{ width: '16px', height: '16px' }} />
                        )}
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="apple-button-secondary"
                          style={{
                            padding: '0.5rem',
                            minWidth: 'auto',
                            color: 'var(--apple-red-500)',
                            borderColor: 'rgba(239, 68, 68, 0.3)'
                          }}
                          title="حذف"
                        >
                          <TrashIcon style={{ width: '16px', height: '16px' }} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Message Toast
  const MessageToast = () => {
    if (!message) return null;

    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        padding: '1rem 1.5rem',
        background: message.type === 'success'
          ? 'linear-gradient(135deg, var(--apple-green-500) 0%, var(--apple-emerald-600) 100%)'
          : 'linear-gradient(135deg, var(--apple-red-500) 0%, var(--apple-rose-500) 100%)',
        color: 'white',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--apple-shadow-lg)',
        animation: 'slideInUp 0.3s ease-out',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        {message.type === 'success' ? (
          <CheckCircleIcon style={{ width: '20px', height: '20px' }} />
        ) : (
          <ExclamationTriangleIcon style={{ width: '20px', height: '20px' }} />
        )}
        <span>{message.text}</span>
        <button
          onClick={() => setMessage(null)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '0.25rem',
            marginRight: '0.5rem'
          }}
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <div>
      {/* Statistics Cards */}
      <StatisticsCards />

      {/* Search and Actions */}
      <SearchAndActionsBar />

      {/* Filters */}
      <FiltersSection />

      {/* Users Table */}
      <UsersTable />

      {/* Message Toast */}
      <MessageToast />

      {/* Modals would go here - simplified for now */}
      {/* Add User Modal, Edit User Modal, Delete Confirmation Modal */}
    </div>
  );
};

export default UserManagement;