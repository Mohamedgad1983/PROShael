/**
 * NewMobileLogin - Modern, Clean Mobile Login Interface
 * Features: Simple design, proper text direction, clear visibility
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './NewMobileLogin.css';

const NewMobileLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    // For phone number, only allow digits
    if (name === 'phone') {
      const cleanedValue = value.replace(/\D/g, '');
      if (cleanedValue.length <= 10) {
        setFormData(prev => ({ ...prev, [name]: cleanedValue }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    } else if (!/^(05|5)[0-9]{8}$/.test(formData.phone)) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 4) {
      newErrors.password = 'كلمة المرور قصيرة جداً';
    }

    return newErrors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Store mock user data
      localStorage.setItem('pwa_user', JSON.stringify({
        phone: formData.phone,
        name: 'عضو تجريبي',
        balance: 5000,
        token: 'mock-token-' + Date.now()
      }));

      // Navigate to dashboard
      navigate('/pwa/dashboard');

    } catch (error) {
      setErrors({ general: 'فشل تسجيل الدخول. حاول مرة أخرى' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-mobile-login">
      {/* Background Gradient */}
      <div className="login-background">
        <div className="gradient-overlay"></div>
        <div className="pattern-overlay"></div>
      </div>

      {/* Login Container */}
      <div className="login-container">

        {/* Logo Section */}
        <div className="logo-section">
          <div className="logo-circle">
            <span className="logo-text">الشعيل</span>
          </div>
          <h1 className="app-title">نظام إدارة الأسرة</h1>
          <p className="app-subtitle">Al-Shuail Family System</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">

          {/* Phone Input */}
          <div className="input-group">
            <label htmlFor="phone" className="input-label">
              رقم الهاتف
            </label>
            <div className="input-wrapper">
              <span className="input-icon">📱</span>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="05XXXXXXXX"
                className={`input-field ${errors.phone ? 'error' : ''}`}
                dir="ltr"
                autoComplete="tel"
                maxLength="10"
              />
            </div>
            {errors.phone && (
              <span className="error-message">{errors.phone}</span>
            )}
          </div>

          {/* Password Input */}
          <div className="input-group">
            <label htmlFor="password" className="input-label">
              كلمة المرور
            </label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`input-field ${errors.password ? 'error' : ''}`}
                dir="ltr"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="general-error">
              {errors.general}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? (
              <span className="loading">
                <span className="spinner"></span>
                جاري التحميل...
              </span>
            ) : (
              'تسجيل الدخول'
            )}
          </button>

          {/* Help Links */}
          <div className="help-links">
            <a href="#" className="help-link">نسيت كلمة المرور؟</a>
            <span className="separator">•</span>
            <a href="#" className="help-link">تسجيل جديد</a>
          </div>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <p className="footer-text">
            © 2024 صندوق آل شعيل - جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
};

export default NewMobileLogin;