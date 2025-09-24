import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './LoginPage.css';
import logo from '../../assets/logo.svg';

const LoginPage = ({ onLogin = () => {} }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    role: 'user_member' // Default to regular member
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // All RBAC roles for Al-Shuail system
  const roles = [
    { value: 'super_admin', label: 'المدير الأعلى' },
    { value: 'financial_manager', label: 'المدير المالي' },
    { value: 'family_tree_admin', label: 'مدير شجرة العائلة' },
    { value: 'occasions_initiatives_diyas_admin', label: 'مدير المناسبات والمبادرات والديات' },
    { value: 'user_member', label: 'عضو عادي' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.phone.trim(), formData.password.trim(), formData.role);

      if (result.success) {
        // Call parent onLogin function if provided
        if (onLogin) {
          onLogin(result.user, result.token);
        }
        // The AuthContext will handle the state updates and redirect
      } else {
        setError(result.error || 'خطأ في تسجيل الدخول');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value.trim()
    }));
  };

  return (
    <div className="login-container" dir="rtl">
      <div className="login-form-wrapper">
        <div className="login-header">
          <img
            src={logo}
            alt="Shuail Al-Anzi Fund"
            style={{
              width: '150px',
              height: '150px',
              marginBottom: '20px',
              filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
            }}
          />
          <h1>صندوق شعيل العنزي</h1>
          <p>Shuail Al-Anzi Fund</p>
          <div style={{
            background: 'linear-gradient(135deg, rgba(94,92,230,0.1) 0%, rgba(191,90,242,0.1) 100%)',
            padding: '12px 20px',
            borderRadius: '10px',
            marginTop: '15px'
          }}>
            <p style={{ fontSize: '14px', color: '#5E5CE6', fontWeight: '600' }}>
              مرحباً بكم في نظام الإدارة
            </p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              S.A.F Management System
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="phone">رقم الهاتف</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+96550123456"
              required
              dir="ltr"
              style={{
                direction: 'ltr',
                textAlign: 'left',
                unicodeBidi: 'embed',
                fontFamily: 'Arial, Helvetica, sans-serif'
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">كلمة المرور</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">الدور الوظيفي</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="role-select"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '16px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
            >
              {roles.map(role => (
                <option
                  key={role.value}
                  value={role.value}
                  style={{
                    backgroundColor: '#2a5298',
                    color: 'white'
                  }}
                >
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'جاري التحميل...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="login-footer">
          <p>للمساعدة التقنية، تواصل مع إدارة النظام</p>
          <div className="demo-credentials">
            <small>
              <strong>بيانات تجريبية:</strong><br />
              الهاتف: +96550123456<br />
              كلمة المرور: 123456<br />
              <span style={{ fontSize: '11px', opacity: 0.8 }}>
                يمكن اختيار أي دور وظيفي للتجربة
              </span>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;