/**
 * Password Management Component
 * Allows superadmin to create and reset passwords for users
 */

import React, { useState } from 'react';
import {
  KeyIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/outline';

// Remove /api suffix if present to avoid double /api in URL
const API_URL = (process.env.REACT_APP_API_URL || 'https://proshael.onrender.com').replace(/\/api$/, '');

// FORCE WEBPACK INCLUSION - This side effect prevents tree-shaking
if (typeof window !== 'undefined') {
  (window as any).__PASSWORD_MGMT_LOADED__ = true;
}

interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: string;
  isActive: boolean;
  hasPassword: boolean;
  source?: 'user' | 'member'; // 'user' = existing auth user, 'member' = member needing auth
}

const AccessControl: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forceOverwrite, setForceOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Password strength validation
  const validatePassword = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    const isValid = Object.values(checks).every(check => check);
    return { isValid, checks };
  };

  // Search users
  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) {
      setMessage({ type: 'warning', text: 'يرجى إدخال حرفين على الأقل للبحث' });
      return;
    }

    setSearching(true);
    setMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_URL}/api/password-management/search-users?query=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setSearchResults(data.data);
        if (data.data.length === 0) {
          setMessage({ type: 'warning', text: 'لا توجد نتائج للبحث' });
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'فشل البحث عن المستخدمين' });
      }
    } catch (error) {
      console.error('Search error:', error);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء البحث' });
    } finally {
      setSearching(false);
    }
  };

  // Create or reset password
  const handlePasswordOperation = async (operation: 'create' | 'reset') => {
    if (!selectedUser) return;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'كلمات المرور غير متطابقة' });
      return;
    }

    // Validate password strength
    const { isValid } = validatePassword(newPassword);
    if (!isValid) {
      setMessage({ type: 'error', text: 'كلمة المرور لا تستوفي متطلبات الأمان' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = getAuthToken();
      const endpoint = operation === 'create'
        ? `${API_URL}/api/password-management/create`
        : `${API_URL}/api/password-management/reset`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIdentifier: selectedUser.email,
          newPassword,
          forceOverwrite: operation === 'create' ? forceOverwrite : undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: operation === 'create'
            ? 'تم إنشاء كلمة المرور بنجاح'
            : 'تم إعادة تعيين كلمة المرور بنجاح'
        });

        // Reset form
        setNewPassword('');
        setConfirmPassword('');
        setForceOverwrite(false);

        // Refresh user info
        handleSearch();
      } else {
        setMessage({ type: 'error', text: data.message || 'فشلت العملية' });
      }
    } catch (error) {
      console.error('Password operation error:', error);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء العملية' });
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const renderPasswordStrength = () => {
    if (!newPassword) return null;

    const { isValid, checks } = validatePassword(newPassword);

    return (
      <div style={passwordStrengthContainerStyle}>
        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
          قوة كلمة المرور:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <StrengthItem check={checks.length} label="8 أحرف على الأقل" />
          <StrengthItem check={checks.uppercase} label="حرف كبير" />
          <StrengthItem check={checks.lowercase} label="حرف صغير" />
          <StrengthItem check={checks.number} label="رقم" />
          <StrengthItem check={checks.special} label="رمز خاص" />
        </div>
      </div>
    );
  };

  const StrengthItem: React.FC<{ check: boolean; label: string }> = ({ check, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
      {check ? (
        <CheckCircleIcon style={{ width: '14px', height: '14px', color: '#10B981' }} />
      ) : (
        <XCircleIcon style={{ width: '14px', height: '14px', color: '#EF4444' }} />
      )}
      <span style={{ color: check ? '#10B981' : '#6B7280' }}>{label}</span>
    </div>
  );

  const containerStyle: React.CSSProperties = {
    padding: '20px',
    direction: 'rtl'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #E5E7EB'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  };

  const searchSectionStyle: React.CSSProperties = {
    background: '#F9FAFB',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px'
  };

  const searchBoxStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px'
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none'
  };

  const buttonStyle = (variant: 'primary' | 'secondary' | 'danger' = 'primary'): React.CSSProperties => {
    const variants = {
      primary: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      },
      secondary: {
        background: '#F3F4F6',
        color: '#374151'
      },
      danger: {
        background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        color: 'white'
      }
    };

    return {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      ...variants[variant]
    };
  };

  const resultsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '15px'
  };

  const userCardStyle = (isSelected: boolean): React.CSSProperties => ({
    background: isSelected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
    border: `2px solid ${isSelected ? '#667eea' : '#E5E7EB'}`,
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    color: isSelected ? 'white' : '#1F2937'
  });

  const passwordSectionStyle: React.CSSProperties = {
    background: '#F9FAFB',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '20px'
  };

  const passwordStrengthContainerStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '15px',
    border: '1px solid #E5E7EB'
  };

  const messageStyle = (type: 'success' | 'error' | 'warning'): React.CSSProperties => {
    const colors = {
      success: { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
      error: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
      warning: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' }
    };

    return {
      background: colors[type].bg,
      color: colors[type].text,
      border: `1px solid ${colors[type].border}`,
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '20px',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    };
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <KeyIcon style={{ width: '32px', height: '32px', color: '#667eea' }} />
        <div>
          <h2 style={titleStyle}>إدارة كلمات المرور</h2>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
            إنشاء وإعادة تعيين كلمات المرور للمستخدمين
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={messageStyle(message.type)}>
          {message.type === 'success' && <CheckCircleIcon style={{ width: '20px', height: '20px' }} />}
          {message.type === 'error' && <XCircleIcon style={{ width: '20px', height: '20px' }} />}
          {message.type === 'warning' && <ExclamationTriangleIcon style={{ width: '20px', height: '20px' }} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Search Section */}
      <div style={searchSectionStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', color: '#1F2937' }}>
          البحث عن مستخدم
        </h3>
        <div style={searchBoxStyle}>
          <input
            type="text"
            style={inputStyle}
            placeholder="ابحث بالبريد الإلكتروني، الهاتف، أو الاسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            style={buttonStyle('primary')}
            onClick={handleSearch}
            disabled={searching}
          >
            <MagnifyingGlassIcon style={{ width: '18px', height: '18px' }} />
            {searching ? 'جاري البحث...' : 'بحث'}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div style={resultsGridStyle}>
            {searchResults.map(user => (
              <div
                key={user.id}
                style={userCardStyle(selectedUser?.id === user.id)}
                onClick={() => setSelectedUser(user)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <UserIcon style={{ width: '24px', height: '24px' }} />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{user.fullName}</div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>{user.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <span style={{
                    background: selectedUser?.id === user.id ? 'rgba(255,255,255,0.2)' : '#F3F4F6',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: selectedUser?.id === user.id ? 'white' : '#374151'
                  }}>
                    {user.role}
                  </span>
                  {user.source === 'member' && (
                    <span style={{
                      background: selectedUser?.id === user.id ? 'rgba(59, 130, 246, 0.3)' : '#DBEAFE',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: selectedUser?.id === user.id ? 'white' : '#1E40AF'
                    }}>
                      عضو بحاجة لحساب
                    </span>
                  )}
                  <span style={{
                    background: user.hasPassword
                      ? (selectedUser?.id === user.id ? 'rgba(16, 185, 129, 0.3)' : '#D1FAE5')
                      : (selectedUser?.id === user.id ? 'rgba(239, 68, 68, 0.3)' : '#FEE2E2'),
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: selectedUser?.id === user.id ? 'white' : (user.hasPassword ? '#065F46' : '#991B1B')
                  }}>
                    {user.hasPassword ? (
                      <>
                        <LockClosedIcon style={{ width: '12px', height: '12px' }} />
                        لديه كلمة مرور
                      </>
                    ) : (
                      <>
                        <LockOpenIcon style={{ width: '12px', height: '12px' }} />
                        بدون كلمة مرور
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Management Section */}
      {selectedUser && (
        <div style={passwordSectionStyle}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', color: '#1F2937' }}>
            {selectedUser.hasPassword ? 'إعادة تعيين كلمة المرور' : 'إنشاء كلمة مرور جديدة'}
          </h3>
          <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>
            المستخدم المحدد: <strong>{selectedUser.fullName}</strong> ({selectedUser.email})
          </p>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              كلمة المرور الجديدة
            </label>
            <input
              type="password"
              style={inputStyle}
              placeholder="أدخل كلمة المرور الجديدة"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
              تأكيد كلمة المرور
            </label>
            <input
              type="password"
              style={inputStyle}
              placeholder="أعد إدخال كلمة المرور"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {renderPasswordStrength()}

          {!selectedUser.hasPassword && (
            <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="forceOverwrite"
                checked={forceOverwrite}
                onChange={(e) => setForceOverwrite(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="forceOverwrite" style={{ fontSize: '13px', color: '#6B7280', cursor: 'pointer' }}>
                الكتابة فوق كلمة المرور الموجودة (إن وجدت)
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              style={buttonStyle(selectedUser.hasPassword ? 'danger' : 'primary')}
              onClick={() => handlePasswordOperation(selectedUser.hasPassword ? 'reset' : 'create')}
              disabled={loading || !newPassword || !confirmPassword}
            >
              <KeyIcon style={{ width: '18px', height: '18px' }} />
              {loading
                ? 'جاري المعالجة...'
                : (selectedUser.hasPassword ? 'إعادة تعيين كلمة المرور' : 'إنشاء كلمة المرور')
              }
            </button>
            <button
              style={buttonStyle('secondary')}
              onClick={() => {
                setSelectedUser(null);
                setNewPassword('');
                setConfirmPassword('');
                setForceOverwrite(false);
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessControl;
