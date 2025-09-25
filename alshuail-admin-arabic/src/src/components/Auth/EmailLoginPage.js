import React, { useState } from 'react';
import './LoginPage.css';

const EmailLoginPage = ({ onLogin = () => {} }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password
        })
      });

      const data = await response.json();

      if (data.success) {
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Call parent onLogin function if provided
        if (onLogin) {
          onLogin(data.user, data.token);
        }

        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        setError(data.error || 'خطأ في تسجيل الدخول');
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
      [e.target.name]: e.target.value
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
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="admin@alshuail.com"
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
          <p>للاختبار: admin@alshuail.com / Admin@123456</p>
        </div>
      </div>
    </div>
  );
};

export default EmailLoginPage;