/**
 * ModernMobileLogin - Clean, modern login without glassmorphism
 * Based on Al_Shuail_PWA_Interface_Emergency_Fix.md
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/pwa-emergency-fix.css';

const ModernMobileLogin = ({ onLogin }) => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    // Clear any previous errors
    setError('');

    // Basic validation
    if (!phone || !password) {
      setError('الرجاء إدخال رقم الهاتف وكلمة المرور');
      return;
    }

    // Validate Saudi phone number format
    const phoneRegex = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
    const cleanPhone = phone.replace(/[\s-]/g, '');

    if (!phoneRegex.test(cleanPhone)) {
      setError('الرجاء إدخال رقم هاتف سعودي صحيح');
      return;
    }

    setLoading(true);

    try {
      // Check for test credentials
      const isTestUser = (cleanPhone === '0501234567' && password === 'password123') ||
                         (cleanPhone === '0555555555' && password === 'password123') ||
                         (cleanPhone === '0512345678' && password === 'password123');

      if (isTestUser) {
        // Mock user data
        const userData = {
          id: 'test-user-' + cleanPhone,
          phone: cleanPhone,
          name: cleanPhone === '0501234567' ? 'أحمد محمد الشعيل' : 'عضو تجريبي',
          balance: cleanPhone === '0501234567' ? 2500 : 3500,
          membershipId: cleanPhone === '0501234567' ? 'SH001' : 'SH002',
          joinDate: '2023-06-15',
          totalPaid: 450,
          minimumBalance: 3000,
          avatar: null,
          role: 'member'
        };

        // Store authentication data
        localStorage.setItem('pwa_user', JSON.stringify(userData));
        localStorage.setItem('pwa_token', 'test-token-' + Date.now());

        // Navigate to dashboard
        setTimeout(() => {
          if (onLogin) {
            onLogin({ phone: cleanPhone, password, rememberMe: false });
          } else {
            window.location.href = '/pwa/dashboard';
          }
        }, 500);
      } else {
        // Try actual API login
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        const response = await fetch(`${API_URL}/api/auth/mobile-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone, password })
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('pwa_user', JSON.stringify(data.user));
          localStorage.setItem('pwa_token', data.token);

          if (onLogin) {
            onLogin({ phone: cleanPhone, password, rememberMe: false });
          } else {
            window.location.href = '/pwa/dashboard';
          }
        } else {
          throw new Error('فشل تسجيل الدخول');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'حدث خطأ في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-app" dir="rtl">
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '40px 24px',
        maxWidth: '400px',
        margin: '0 auto',
        width: '100%'
      }}>

        {/* Logo Section */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 className="text-title" style={{
            fontSize: '2rem',
            marginBottom: '8px',
            color: '#ffffff'
          }}>
            صندوق الشعيل
          </h1>
          <p className="text-body" style={{ color: 'var(--text-muted)' }}>
            نظام إدارة الأسرة المالي
          </p>
        </div>

        {/* Login Form */}
        <div style={{ marginBottom: '32px' }}>

          {/* Phone Input */}
          <div style={{ marginBottom: '24px' }}>
            <label className="form-label">رقم الهاتف</label>
            <input
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xxxxxxxx"
              style={{ direction: 'ltr', textAlign: 'left' }}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: '32px' }}>
            <label className="form-label">كلمة المرور</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message" style={{ marginBottom: '24px' }}>
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            className="btn-primary"
            disabled={loading || !phone || !password}
            onClick={handleLogin}
            style={{
              opacity: loading || !phone || !password ? 0.6 : 1,
              cursor: loading || !phone || !password ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </div>

        {/* Test Credentials Hint */}
        <div style={{
          background: 'var(--success-bg)',
          border: '1px solid var(--success)',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '20px'
        }}>
          <p style={{
            fontSize: '14px',
            color: 'var(--success)',
            fontWeight: '600',
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            بيانات تجريبية للدخول:
          </p>
          <div style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            lineHeight: '1.8'
          }}>
            <div>الهاتف: <span dir="ltr" style={{
              fontFamily: 'monospace',
              color: 'var(--text-primary)'
            }}>0501234567</span></div>
            <div>كلمة المرور: <span style={{
              fontFamily: 'monospace',
              color: 'var(--text-primary)'
            }}>password123</span></div>
            <div style={{
              marginTop: '8px',
              color: 'var(--error)',
              fontSize: '12px'
            }}>
              الرصيد: 2500 ر.س (أقل من الحد الأدنى)
            </div>
          </div>
        </div>

        {/* Forgot Password Link */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center'
        }}>
          <a href="#" style={{
            color: 'var(--text-accent)',
            textDecoration: 'none',
            fontSize: '14px'
          }}>
            نسيت كلمة المرور؟
          </a>
        </div>
      </div>
    </div>
  );
};

export default ModernMobileLogin;