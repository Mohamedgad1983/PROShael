/**
 * ProfessionalMobileLogin - High-quality, professional mobile login
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfessionalMobileLogin.css';

const ProfessionalMobileLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Update form data
    if (name === 'phone') {
      // Allow only numbers for phone
      const cleanedValue = value.replace(/\D/g, '');
      if (cleanedValue.length <= 10) {
        setFormData(prev => ({ ...prev, phone: cleanedValue }));
      }
    } else {
      // For password, allow any characters
      setFormData(prev => ({ ...prev, password: value }));
    }

    // Clear any errors for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate login with test credentials
    setTimeout(() => {
      // Check for test credentials
      if (formData.phone === '0555555555' && formData.password === 'Test1234') {
        localStorage.setItem('pwa_user', JSON.stringify({
          phone: formData.phone,
          name: 'محمد أحمد',
          balance: 5000,
          token: 'test-token-' + Date.now()
        }));
        localStorage.setItem('pwa_token', 'test-token-' + Date.now());
        navigate('/pwa/dashboard');
      } else {
        // Allow any login for testing
        localStorage.setItem('pwa_user', JSON.stringify({
          phone: formData.phone,
          name: 'عضو تجريبي',
          balance: 5000,
          token: 'test-token-' + Date.now()
        }));
        localStorage.setItem('pwa_token', 'test-token-' + Date.now());
        navigate('/pwa/dashboard');
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="professional-login">
      {/* Top Section with Logo */}
      <div className="login-header">
        <div className="logo-container">
          <div className="logo">
            <svg viewBox="0 0 100 100" className="logo-svg">
              <circle cx="50" cy="50" r="45" fill="#2c3e50" />
              <text x="50" y="65" fontSize="35" fill="white" textAnchor="middle" fontFamily="Arial">ش</text>
            </svg>
          </div>
          <h1 className="brand-name">صندوق آل شعيل</h1>
          <p className="brand-subtitle">نظام إدارة الأسرة</p>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="login-body">
        <div className="form-container">
          <h2 className="form-title">تسجيل الدخول</h2>

          <form onSubmit={handleSubmit} className="login-form">
            {/* Phone Input */}
            <div className="form-field">
              <label className="field-label">رقم الجوال</label>
              <div className="input-container">
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="05XXXXXXXX"
                  className="form-input"
                  dir="ltr"
                  autoComplete="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="10"
                  required
                />
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 5.5C3 14.06 9.94 21 18.5 21c.38 0 .77-.03 1.15-.08.31-.04.6-.19.79-.46.23-.32.28-.74.13-1.1l-1.88-4.24c-.14-.33-.43-.58-.78-.66l-3.28-.65c-.35-.07-.71.04-.97.27l-2.14 1.93c-2.36-1.3-4.29-3.23-5.59-5.59l1.93-2.14c.23-.26.34-.62.27-.97l-.65-3.28c-.08-.35-.33-.64-.66-.78L2.58 1.47c-.36-.15-.78-.1-1.1.13-.27.19-.42.48-.46.79C1.03 2.77 1 3.13 1 3.5c0 .69.06 1.36.16 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>
            </div>

            {/* Password Input */}
            <div className="form-field">
              <label className="field-label">كلمة المرور</label>
              <div className="input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password || ''}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="form-input"
                  dir="ltr"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="10" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>
            </div>

            {/* Remember Me */}
            <div className="form-options">
              <label className="checkbox-container">
                <input type="checkbox" className="checkbox-input" />
                <span className="checkbox-label">تذكرني</span>
              </label>
              <a href="#" className="forgot-link">نسيت كلمة المرور؟</a>
            </div>

            {/* Submit Button */}
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <span>جاري الدخول...</span>
                </div>
              ) : (
                'دخول'
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="register-section">
            <p>ليس لديك حساب؟</p>
            <a href="/register" className="register-link">سجل الآن</a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="login-footer">
        <p>© 2024 صندوق آل شعيل - جميع الحقوق محفوظة</p>
      </div>
    </div>
  );
};

export default ProfessionalMobileLogin;