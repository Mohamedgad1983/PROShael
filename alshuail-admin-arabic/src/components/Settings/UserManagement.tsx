/**
 * User Management Component
 * RBAC user and role management for Super Admin
 * Migrated to use shared styles and components
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  PencilIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { ROLE_DISPLAY_NAMES, UserRole } from '../../contexts/RoleContext';
import { SettingsCard } from './shared/SettingsCard';
import { SettingsButton } from './shared/SettingsButton';
import { SettingsInput } from './shared/SettingsInput';
import { SettingsSelect } from './shared/SettingsSelect';
import { SettingsTable, SettingsTableColumn } from './shared/SettingsTable';
import { StatusBadge } from './shared/StatusBadge';
import { commonStyles, COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from './sharedStyles';

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
      if (!newUser.email || !newUser.name || !newUser.phone || !newUser.password) {
        setMessage({ type: 'error', text: 'يرجى ملء جميع الحقول المطلوبة' });
        setSaving(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

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

      setUsers(prev => [...prev, userToAdd]);
      setMessage({ type: 'success', text: 'تم إضافة المستخدم بنجاح' });
      setShowAddModal(false);

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

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const handleFilterChange = useCallback((filterType: string, value: any) => {
    console.log('Filter changed:', filterType, value);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    console.log('Page changed:', page);
  }, []);

  const getRoleNameAr = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'super_admin': 'المدير الأعلى',
      'financial_manager': 'المدير المالي',
      'family_tree_admin': 'مدير شجرة العائلة',
      'occasions_initiatives_diyas_admin': 'مدير المناسبات والمبادرات',
      'user_member': 'عضو عادي'
    };
    return roleMap[role] || role;
  };

  const getRoleBadgeType = (role: UserRole): 'success' | 'error' | 'warning' | 'info' => {
    const typeMap: Record<UserRole, 'success' | 'error' | 'warning' | 'info'> = {
      super_admin: 'error',
      financial_manager: 'success',
      family_tree_admin: 'info',
      occasions_initiatives_diyas_admin: 'warning',
      user_member: 'info'
    };
    return typeMap[role] || 'info';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.includes(searchTerm);
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const roleStats = {
    super_admin: users.filter(u => u.role === 'super_admin').length,
    financial_manager: users.filter(u => u.role === 'financial_manager').length,
    family_tree_admin: users.filter(u => u.role === 'family_tree_admin').length,
    occasions_initiatives_diyas_admin: users.filter(u => u.role === 'occasions_initiatives_diyas_admin').length,
    user_member: users.filter(u => u.role === 'user_member').length
  };

  // Styles using shared style system
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
    background: COLORS.white,
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING['3xl'],
    width: '500px',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: SHADOWS.premium
  };

  const statsCardStyle: React.CSSProperties = {
    ...commonStyles.card,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.lg,
    transition: 'all 0.3s ease'
  };

  const searchInputStyle: React.CSSProperties = {
    ...commonStyles.input,
    paddingRight: '45px'
  };

  const roleOptions = [
    { value: 'all', label: 'كل الأدوار' },
    { value: 'super_admin', label: 'المدير الأعلى' },
    { value: 'financial_manager', label: 'المدير المالي' },
    { value: 'family_tree_admin', label: 'مدير شجرة العائلة' },
    { value: 'occasions_initiatives_diyas_admin', label: 'مدير المناسبات' },
    { value: 'user_member', label: 'عضو عادي' }
  ];

  // Table columns definition
  const tableColumns: SettingsTableColumn<User>[] = [
    {
      key: 'user',
      label: 'المستخدم',
      render: (user) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: COLORS.primaryGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: COLORS.white,
            fontWeight: TYPOGRAPHY.semibold,
            fontSize: TYPOGRAPHY.sm
          }}>
            {user.name ? user.name[0] : user.email[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: TYPOGRAPHY.semibold }}>{user.name || user.email}</div>
            <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500 }}>{user.email}</div>
            {user.phone && (
              <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500 }}>{user.phone}</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'الدور الحالي',
      render: (user) => (
        <StatusBadge type={getRoleBadgeType(user.role)}>
          {user.roleAr}
        </StatusBadge>
      )
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (user) => (
        <StatusBadge
          type={user.isActive ? 'success' : 'error'}
          icon={
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: user.isActive ? COLORS.success : COLORS.error
            }} />
          }
        >
          {user.isActive ? 'نشط' : 'غير نشط'}
        </StatusBadge>
      )
    },
    {
      key: 'createdAt',
      label: 'تاريخ الإنضمام',
      render: (user) => (
        <span style={{ fontSize: TYPOGRAPHY.sm, color: COLORS.gray500 }}>
          {new Date(user.createdAt).toLocaleDateString('ar-SA')}
        </span>
      )
    },
    {
      key: 'lastLogin',
      label: 'آخر دخول',
      render: (user) => (
        <span style={{ fontSize: TYPOGRAPHY.sm, color: COLORS.gray500 }}>
          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ar-SA') : 'لم يدخل بعد'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (user) => (
        <SettingsButton
          variant="secondary"
          icon={<PencilIcon style={{ width: '16px', height: '16px' }} />}
          onClick={() => {
            setSelectedUser(user);
            setShowEditModal(true);
          }}
        >
          تعديل
        </SettingsButton>
      )
    }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: SPACING['3xl'] }}>
        <h2 style={{
          ...commonStyles.header,
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.md
        }}>
          <UserGroupIcon style={{ width: '28px', height: '28px' }} />
          إدارة المستخدمين والصلاحيات
        </h2>
        <p style={{ color: COLORS.gray500, fontSize: TYPOGRAPHY.sm }}>
          إدارة المستخدمين وتعيين الأدوار والصلاحيات لكل مستخدم في النظام
        </p>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: SPACING.lg,
        marginBottom: SPACING['3xl']
      }}>
        <SettingsCard style={statsCardStyle}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: BORDER_RADIUS.lg,
            background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheckIcon style={{ width: '20px', height: '20px', color: COLORS.white }} />
          </div>
          <div>
            <div style={{ fontSize: TYPOGRAPHY['2xl'], fontWeight: TYPOGRAPHY.bold }}>{roleStats.super_admin}</div>
            <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500 }}>مدير أعلى</div>
          </div>
        </SettingsCard>

        <SettingsCard style={statsCardStyle}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: BORDER_RADIUS.lg,
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserIcon style={{ width: '20px', height: '20px', color: COLORS.white }} />
          </div>
          <div>
            <div style={{ fontSize: TYPOGRAPHY['2xl'], fontWeight: TYPOGRAPHY.bold }}>{roleStats.financial_manager}</div>
            <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500 }}>مدير مالي</div>
          </div>
        </SettingsCard>

        <SettingsCard style={statsCardStyle}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: BORDER_RADIUS.lg,
            background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserIcon style={{ width: '20px', height: '20px', color: COLORS.white }} />
          </div>
          <div>
            <div style={{ fontSize: TYPOGRAPHY['2xl'], fontWeight: TYPOGRAPHY.bold }}>{roleStats.family_tree_admin}</div>
            <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500 }}>مدير شجرة</div>
          </div>
        </SettingsCard>

        <SettingsCard style={statsCardStyle}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: BORDER_RADIUS.lg,
            background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserIcon style={{ width: '20px', height: '20px', color: COLORS.white }} />
          </div>
          <div>
            <div style={{ fontSize: TYPOGRAPHY['2xl'], fontWeight: TYPOGRAPHY.bold }}>{roleStats.user_member}</div>
            <div style={{ fontSize: TYPOGRAPHY.xs, color: COLORS.gray500 }}>عضو عادي</div>
          </div>
        </SettingsCard>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: SPACING.lg,
        marginBottom: SPACING.xl,
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <MagnifyingGlassIcon style={{
            width: '20px',
            height: '20px',
            position: 'absolute',
            right: SPACING.lg,
            top: '50%',
            transform: 'translateY(-50%)',
            color: COLORS.gray500
          }} />
          <input
            type="text"
            placeholder="البحث عن مستخدم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
          />
        </div>

        <SettingsSelect
          label=""
          value={selectedRole}
          onChange={setSelectedRole}
          options={roleOptions}
          style={{ minWidth: '150px', marginBottom: 0 }}
        />

        <SettingsButton
          variant="primary"
          icon={<ArrowPathIcon style={{ width: '16px', height: '16px' }} />}
          onClick={fetchUsers}
        >
          تحديث
        </SettingsButton>

        <SettingsButton
          variant="primary"
          icon={<PlusIcon style={{ width: '16px', height: '16px' }} />}
          onClick={() => setShowAddModal(true)}
          style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
        >
          إضافة مستخدم
        </SettingsButton>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: `${SPACING.md} ${SPACING.xl}`,
          borderRadius: BORDER_RADIUS.lg,
          marginBottom: SPACING.xl,
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.md,
          backgroundColor: message.type === 'success' ? COLORS.successBg :
                         message.type === 'error' ? COLORS.errorBg : COLORS.infoBg,
          color: message.type === 'success' ? COLORS.successText :
                message.type === 'error' ? COLORS.errorText : COLORS.infoText
        }}>
          {message.type === 'success' && <CheckCircleIcon style={{ width: '20px', height: '20px' }} />}
          {message.type === 'error' && <XCircleIcon style={{ width: '20px', height: '20px' }} />}
          {message.type === 'info' && <ExclamationTriangleIcon style={{ width: '20px', height: '20px' }} />}
          {message.text}
        </div>
      )}

      {/* Users Table using SettingsTable */}
      <SettingsCard>
        {loading ? (
          <div style={{ textAlign: 'center', padding: SPACING['4xl'], color: COLORS.gray400 }}>
            جاري التحميل...
          </div>
        ) : (
          <SettingsTable
            columns={tableColumns}
            data={filteredUsers}
            keyExtractor={(user) => user.id}
            emptyMessage="لا توجد نتائج"
          />
        )}
      </SettingsCard>

      {/* Edit Role Modal */}
      {showEditModal && selectedUser && (
        <div style={modalOverlayStyle} onClick={() => setShowEditModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{
              ...commonStyles.header,
              fontSize: TYPOGRAPHY.xl,
              marginBottom: SPACING.xl,
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.md
            }}>
              <KeyIcon style={{ width: '24px', height: '24px' }} />
              تغيير دور المستخدم
            </h3>

            <SettingsCard style={{
              padding: SPACING.xl,
              background: COLORS.gray50,
              marginBottom: SPACING.xl
            }}>
              <div style={{ marginBottom: SPACING.md }}>
                <strong>المستخدم:</strong> {selectedUser.name || selectedUser.email}
              </div>
              <div style={{ marginBottom: SPACING.md }}>
                <strong>البريد الإلكتروني:</strong> {selectedUser.email}
              </div>
              <div>
                <strong>الدور الحالي:</strong>{' '}
                <StatusBadge type={getRoleBadgeType(selectedUser.role)}>
                  {selectedUser.roleAr}
                </StatusBadge>
              </div>
            </SettingsCard>

            <SettingsSelect
              label="اختر الدور الجديد"
              value={selectedUser.role}
              onChange={(value) => {
                setSelectedUser({
                  ...selectedUser,
                  role: value as UserRole
                });
              }}
              options={Object.entries(ROLE_DISPLAY_NAMES).map(([role, names]) => ({
                value: role,
                label: names.ar
              }))}
            />

            {/* Role Permissions Display */}
            <div style={{
              padding: SPACING.lg,
              background: COLORS.warningBg,
              borderRadius: BORDER_RADIUS.lg,
              marginTop: SPACING.xl,
              marginBottom: SPACING.xl
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.sm,
                marginBottom: SPACING.md,
                color: COLORS.warningText
              }}>
                <ExclamationTriangleIcon style={{ width: '20px', height: '20px' }} />
                <strong>صلاحيات الدور المختار:</strong>
              </div>
              <ul style={{
                margin: '0',
                paddingRight: SPACING.xl,
                fontSize: TYPOGRAPHY.sm,
                color: COLORS.warningText,
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
              gap: SPACING.md,
              justifyContent: 'flex-end'
            }}>
              <SettingsButton
                variant="secondary"
                onClick={() => setShowEditModal(false)}
              >
                إلغاء
              </SettingsButton>
              <SettingsButton
                variant="primary"
                onClick={() => handleRoleChange(selectedUser.id, selectedUser.role)}
                disabled={saving}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </SettingsButton>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div style={modalOverlayStyle} onClick={() => setShowAddModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{
              ...commonStyles.header,
              fontSize: TYPOGRAPHY.xl,
              marginBottom: SPACING['2xl'],
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.md
            }}>
              <PlusIcon style={{ width: '24px', height: '24px', color: COLORS.success }} />
              إضافة مستخدم جديد
            </h3>

            <div style={{ display: 'grid', gap: SPACING.lg }}>
              <SettingsInput
                label="الاسم الكامل"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="أدخل الاسم الكامل"
                required
              />

              <SettingsInput
                label="البريد الإلكتروني"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="example@alshuail.com"
                required
              />

              <SettingsInput
                label="رقم الهاتف"
                type="tel"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                placeholder="05XXXXXXXX"
                required
              />

              <SettingsInput
                label="كلمة المرور"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="••••••••"
                required
              />

              <SettingsSelect
                label="الدور الوظيفي"
                value={newUser.role}
                onChange={(value) => setNewUser({ ...newUser, role: value })}
                options={[
                  { value: 'super_admin', label: 'المدير الأعلى' },
                  { value: 'financial_manager', label: 'المدير المالي' },
                  { value: 'family_tree_admin', label: 'مدير شجرة العائلة' },
                  { value: 'occasions_initiatives_diyas_admin', label: 'مدير المناسبات والمبادرات والديات' },
                  { value: 'user_member', label: 'عضو عادي' }
                ]}
                required
              />
            </div>

            <div style={{
              display: 'flex',
              gap: SPACING.md,
              marginTop: SPACING['2xl'],
              justifyContent: 'flex-end'
            }}>
              <SettingsButton
                variant="secondary"
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
              >
                إلغاء
              </SettingsButton>
              <SettingsButton
                variant="primary"
                onClick={handleAddUser}
                disabled={saving}
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                {saving ? 'جاري الإضافة...' : 'إضافة المستخدم'}
              </SettingsButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(UserManagement);
