/**
 * PremiumMobileLogin - Premium Apple-inspired login screen with glassmorphism
 * Based on the MemberMobileApp design
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MemberMobileApp.css';
import '../../styles/pwa-design-system.css';
import logo from '../../assets/logo.svg';

const PremiumMobileLogin = ({ onLogin }) => {
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleLogin = async () => {
    // Clear any previous errors
    setError('');

    // Basic validation
    if (!loginData.phone || !loginData.password) {
      setError('الرجاء إدخال رقم الهاتف وكلمة المرور');
      return;
    }

    // Validate Saudi phone number format
    const phoneRegex = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
    const cleanPhone = loginData.phone.replace(/[\s-]/g, '');

    if (!phoneRegex.test(cleanPhone)) {
      setError('الرجاء إدخال رقم هاتف سعودي صحيح');
      return;
    }

    setLoading(true);

    try {
      // Check for test credentials first
      const isTestUser = (cleanPhone === '0501234567' && loginData.password === 'password123') ||
                         (cleanPhone === '0555555555' && loginData.password === 'password123') ||
                         (cleanPhone === '0512345678' && loginData.password === 'password123');

      if (isTestUser) {
        // Mock successful login data
        const mockCredentials = {
          phone: cleanPhone,
          password: loginData.password,
          rememberMe: false
        };

        // Show success message
        setSuccess(true);

        // Small delay for user feedback
        setTimeout(async () => {
          // Use the parent's handleLogin function if available
          if (onLogin) {
            await onLogin(mockCredentials);
        } else {
          // Fallback: manual authentication data storage
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

          localStorage.setItem('pwa_user', JSON.stringify(userData));
          localStorage.setItem('pwa_token', 'test-token-' + Date.now());

          // Force navigation using window.location for reliable refresh
          window.location.href = '/pwa/dashboard';
        }
        }, 1000); // 1 second delay for success feedback
      } else {
        // Try actual API login
        if (onLogin) {
          await onLogin({
            phone: cleanPhone,
            password: loginData.password,
            rememberMe: false
          });
        } else {
          // Fallback API call
          const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
          const response = await fetch(`${API_URL}/api/auth/mobile-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone, password: loginData.password })
          });

          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('pwa_user', JSON.stringify(data.user));
            localStorage.setItem('pwa_token', data.token);
            window.location.href = '/pwa/dashboard';
          } else {
            throw new Error('فشل تسجيل الدخول');
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'حدث خطأ في تسجيل الدخول. الرجاء المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="member-mobile-app" dir="rtl">
      <div className="mobile-login-screen">
        <div className="login-header">
          <div className="app-logo">
            {logo && <img src={logo} alt="صندوق شعيل العنزي" className="mobile-logo" />}
          </div>
          <h1>صندوق شعيل العنزي</h1>
          <p>تسجيل الدخول إلى حسابك</p>
        </div>

        <div className="login-form">
          <div className="form-group">
            <label>رقم الهاتف</label>
            <div className="input-with-icon">
              <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
              <input
                type="tel"
                placeholder="05XXXXXXXX"
                value={loginData.phone}
                onChange={(e) => setLoginData({...loginData, phone: e.target.value})}
                dir="ltr"
              />
            </div>
          </div>

          <div className="form-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              placeholder="••••••••"
              value={loginData.password}
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              dir="ltr"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && (
            <div className="error-message" style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#dc2626',
              fontSize: '14px',
              textAlign: 'center',
              marginBottom: '16px',
              animation: 'shake 0.5s ease-in-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="success-message" style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#22c55e',
              fontSize: '14px',
              textAlign: 'center',
              marginBottom: '16px',
              animation: 'fadeIn 0.5s ease-in-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                تم تسجيل الدخول بنجاح! جاري التحويل...
              </div>
            </div>
          )}

          <button
            className={`login-btn ${loading ? 'loading' : ''}`}
            onClick={handleLogin}
            disabled={loading}
            type="button"
            style={{
              width: '100%',
              padding: '16px 24px',
              background: loading
                ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
              transform: loading ? 'none' : 'translateY(0)',
              boxShadow: loading
                ? 'none'
                : '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
              }
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                جاري تسجيل الدخول...
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10,17 15,12 10,7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                تسجيل الدخول
              </div>
            )}
          </button>

          <div className="login-footer">
            <a href="#">نسيت كلمة المرور؟</a>
          </div>

          {/* Test credentials hint */}
          <div className="test-hint" style={{
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '12px',
            padding: '15px',
            marginTop: '20px',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <p style={{fontSize: '13px', color: '#10b981', fontWeight: '600', marginBottom: '8px', textAlign: 'center'}}>
              بيانات تجريبية للدخول:
            </p>
            <div style={{fontSize: '12px', color: '#666', textAlign: 'center', lineHeight: '1.6'}}>
              <div>الهاتف: <span dir="ltr" style={{fontFamily: 'monospace', color: '#333'}}>0501234567</span></div>
              <div>كلمة المرور: <span style={{fontFamily: 'monospace', color: '#333'}}>password123</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Add animations and loading styles */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .form-group {
          position: relative;
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .form-group input {
          width: 100%;
          padding: 16px 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 16px;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .form-group input:focus {
          outline: none;
          border-color: rgba(16, 185, 129, 0.5);
          background: rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .form-group input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }

        .input-with-icon {
          position: relative;
        }

        .input-with-icon input {
          padding-right: 50px;
        }

        .input-icon {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.6);
        }
      `}</style>
    </div>
  );
};

export default PremiumMobileLogin;