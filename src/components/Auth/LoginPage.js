import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './LoginPage.css';

const LoginPage = ({ onLogin = () => {} }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.phone.trim(), formData.password.trim());

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
          <h1>تطبيق عائلة الشعيل</h1>
          <p>لوحة التحكم الإدارية</p>
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
              كلمة المرور: 123456
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;