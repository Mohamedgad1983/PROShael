import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';

import './MembersManager.css';

const MembersManager = () => {
  const { user, token, hasRole } = useAuth();
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(null);

  useEffect(() => {
    loadMembers();
    loadRoles();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/members`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.status === 'success') {
        setMembers(data.data.members || []);
      } else {
        setError(data.message_ar || 'خطأ في تحميل قائمة الأعضاء');
      }
    } catch (error) {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/members/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.status === 'success') {
        setRoles(data.data.roles || []);
      }
    } catch (error) {
      logger.error('Error loading roles:', { error });
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();
      if (data.status === 'success') {
        loadMembers(); // Refresh list
        setShowRoleModal(null);
      } else {
        setError(data.message_ar || 'خطأ في تحديث دور العضو');
      }
    } catch (error) {
      setError('خطأ في تحديث دور العضو');
    }
  };

  const handleDeactivateMember = async (memberId) => {
    if (!window.confirm('هل أنت متأكد من إلغاء تفعيل هذا العضو؟')) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.status === 'success') {
        loadMembers(); // Refresh list
      } else {
        setError(data.message_ar || 'خطأ في إلغاء تفعيل العضو');
      }
    } catch (error) {
      setError('خطأ في إلغاء تفعيل العضو');
    }
  };

  const getRoleLabel = (roleValue) => {
    const role = roles.find(r => r.value === roleValue);
    return role ? role.label_ar : roleValue;
  };

  const getRoleBadgeClass = (roleValue) => {
    const roleClasses = {
      'super_admin': 'role-super-admin',
      'admin': 'role-admin',
      'financial_manager': 'role-financial',
      'organizer': 'role-organizer',
      'member': 'role-member'
    };
    return roleClasses[roleValue] || 'role-default';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-SA');
  };

  const canManageMembers = hasRole('admin') || hasRole('super_admin');

  if (loading) {
    return (
      <div className="members-manager" dir="rtl">
        <div className="loading-container">
          <div className="spinner"></div>
          <span>جاري تحميل قائمة الأعضاء...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="members-manager" dir="rtl">
      <div className="members-header">
        <h2>إدارة أعضاء العائلة</h2>
        <p>نظام إدارة أعضاء عائلة الشعيل والأدوار</p>
        {canManageMembers && (
          <button
            className="btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            إضافة عضو جديد
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')} className="error-close">×</button>
        </div>
      )}

      <div className="members-stats">
        <div className="stat-card">
          <h3>{members.length}</h3>
          <p>إجمالي الأعضاء</p>
        </div>
        <div className="stat-card">
          <h3>{members.filter(m => m.is_active).length}</h3>
          <p>الأعضاء النشطين</p>
        </div>
        <div className="stat-card">
          <h3>{members.filter(m => m.role === 'admin' || m.role === 'super_admin').length}</h3>
          <p>المدراء</p>
        </div>
        <div className="stat-card">
          <h3>{members.filter(m => m.role === 'organizer').length}</h3>
          <p>المنظمين</p>
        </div>
      </div>

      <div className="members-grid">
        {members.length === 0 ? (
          <div className="empty-state">
            <h3>لا يوجد أعضاء</h3>
            <p>ابدأ بإضافة أعضاء جدد لعائلة الشعيل</p>
            {canManageMembers && (
              <button
                className="btn-primary"
                onClick={() => setShowAddForm(true)}
              >
                إضافة أول عضو
              </button>
            )}
          </div>
        ) : (
          members.map(member => (
            <div key={member.id} className={`member-card ${!member.is_active ? 'inactive' : ''}`}>
              <div className="member-header">
                <h3>{member.full_name}</h3>
                <span className={`role-badge ${getRoleBadgeClass(member.role)}`}>
                  {getRoleLabel(member.role)}
                </span>
              </div>

              <div className="member-details">
                <div className="detail-item">
                  <strong>رقم الهاتف:</strong> {member.phone}
                </div>
                <div className="detail-item">
                  <strong>رقم العضوية:</strong> {member.membership_number}
                </div>
                <div className="detail-item">
                  <strong>تاريخ الانضمام:</strong> {formatDate(member.created_at)}
                </div>
                <div className="detail-item">
                  <strong>الحالة:</strong>
                  <span className={`status ${member.is_active ? 'active' : 'inactive'}`}>
                    {member.is_active ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>

              {canManageMembers && member.id !== user.id && (
                <div className="member-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setEditingMember(member)}
                  >
                    تعديل
                  </button>
                  <button
                    className="btn-role"
                    onClick={() => setShowRoleModal(member)}
                  >
                    تغيير الدور
                  </button>
                  {member.is_active && (
                    <button
                      className="btn-danger"
                      onClick={() => handleDeactivateMember(member.id)}
                    >
                      إلغاء التفعيل
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showAddForm && (
        <MemberForm
          onClose={() => setShowAddForm(false)}
          onSave={() => {
            setShowAddForm(false);
            loadMembers();
          }}
          token={token}
          roles={roles}
        />
      )}

      {editingMember && (
        <MemberForm
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={() => {
            setEditingMember(null);
            loadMembers();
          }}
          token={token}
          roles={roles}
        />
      )}

      {showRoleModal && (
        <RoleUpdateModal
          member={showRoleModal}
          roles={roles}
          onUpdate={handleUpdateRole}
          onClose={() => setShowRoleModal(null)}
        />
      )}
    </div>
  );
};

// Member Form Component for Add/Edit
const MemberForm = ({ member, onClose, onSave, token, roles }) => {
  const [formData, setFormData] = useState({
    full_name: member?.full_name || '',
    phone: member?.phone || '',
    role: member?.role || 'member',
    membership_number: member?.membership_number || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = member
        ? `${process.env.REACT_APP_API_URL}/api/members/${member.id}`
        : `${process.env.REACT_APP_API_URL}/api/members`;

      const method = member ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.status === 'success') {
        onSave();
      } else {
        setError(data.message_ar || 'خطأ في حفظ بيانات العضو');
      }
    } catch (error) {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{member ? 'تعديل بيانات العضو' : 'إضافة عضو جديد'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="member-form">
          <div className="form-group">
            <label>الاسم الكامل</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>رقم الهاتف</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+96550123456"
              required
            />
          </div>

          <div className="form-group">
            <label>الدور</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              required
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label_ar}
                </option>
              ))}
            </select>
          </div>

          {!member && (
            <div className="form-group">
              <label>رقم العضوية (اختياري)</label>
              <input
                type="text"
                name="membership_number"
                value={formData.membership_number}
                onChange={handleInputChange}
                placeholder="سيتم إنشاؤه تلقائياً إذا ترك فارغاً"
              />
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              إلغاء
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'جاري الحفظ...' : (member ? 'تحديث' : 'إضافة')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Role Update Modal Component
const RoleUpdateModal = ({ member, roles, onUpdate, onClose }) => {
  const [selectedRole, setSelectedRole] = useState(member.role);

  const handleUpdate = () => {
    if (selectedRole !== member.role) {
      onUpdate(member.id, selectedRole);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content role-modal">
        <div className="modal-header">
          <h3>تغيير دور العضو</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="role-update-content">
          <div className="member-info">
            <h4>{member.full_name}</h4>
            <p>الدور الحالي: <strong>{roles.find(r => r.value === member.role)?.label_ar}</strong></p>
          </div>

          <div className="role-selection">
            <label>اختر الدور الجديد:</label>
            <div className="roles-grid">
              {roles.map(role => (
                <div
                  key={role.value}
                  className={`role-option ${selectedRole === role.value ? 'selected' : ''}`}
                  onClick={() => setSelectedRole(role.value)}
                >
                  <div className="role-name">{role.label_ar}</div>
                  <div className="role-level">المستوى: {role.level}</div>
                  <div className="role-description">{role.description_ar}</div>
                  <div className="role-permissions">
                    {role.permissions.slice(0, 2).map(permission => (
                      <span key={permission} className="permission-tag">
                        {permission === 'all' ? 'جميع الصلاحيات' : permission}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="role-actions">
            <button onClick={onClose} className="btn-secondary">
              إلغاء
            </button>
            <button onClick={handleUpdate} className="btn-primary">
              تحديث الدور
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembersManager;