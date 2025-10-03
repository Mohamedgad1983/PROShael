import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PhoneIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { isBiometricAvailable, authenticateBiometric, getBiometricType } from '../../utils/biometricAuth.jsx';
import '../../styles/mobile/Login.css';

const MobileLogin = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if biometric is available and enabled
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      const enabled = localStorage.getItem('biometric_enabled') === 'true';
      setBiometricAvailable(available && enabled);
      if (available) {
        setBiometricType(getBiometricType());
      }
    };
    checkBiometric();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://proshael.onrender.com';

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message_ar || data.error || 'فشل تسجيل الدخول');
      }

      // Store token
      localStorage.setItem('token', data.data?.token || data.token);
      localStorage.setItem('user', JSON.stringify(data.data?.user || data.user));

      // Check if password change required
      if (data.requires_password_change || data.is_first_login) {
        navigate('/mobile/change-password', {
          state: { isFirstLogin: data.is_first_login }
        });
      } else {
        navigate('/mobile/dashboard');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await authenticateBiometric();

      if (!result.success) {
        throw new Error(result.error || 'فشل التحقق البيومتري');
      }

      // Get stored token
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      if (token && user) {
        navigate('/mobile/dashboard');
      } else {
        throw new Error('الرجاء تسجيل الدخول بكلمة المرور أولاً');
      }

    } catch (err: any) {
      setError(err.message);
      // If biometric fails, keep form visible for password login
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-login-container">
      {/* Background Gradient */}
      <div className="mobile-login-bg" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mobile-login-card"
      >
        {/* Logo & Header */}
        <div className="mobile-login-header">
          <div className="logo-circle">
            <span className="logo-text">الشعيل</span>
          </div>
          <h1 className="login-title">نظام إدارة العائلة</h1>
          <p className="login-subtitle">Al-Shuail Family Management</p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="error-box"
          >
            ⚠️ {error}
          </motion.div>
        )}

        {/* Biometric Login (if available) */}
        {biometricAvailable && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleBiometricLogin}
            className="biometric-button"
            disabled={loading}
            whileTap={{ scale: 0.95 }}
          >
            <span className="biometric-icon">
              {biometricType === 'Face ID' ? '🔐' : '👆'}
            </span>
            <span>تسجيل الدخول ب{biometricType}</span>
          </motion.button>
        )}

        {biometricAvailable && <div className="divider">أو</div>}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="login-form">
          {/* Phone Input */}
          <div className="form-group">
            <label>رقم الجوال</label>
            <div className="input-wrapper">
              <PhoneIcon className="input-icon" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                required
                dir="ltr"
                className="form-input"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label>كلمة المرور</label>
            <div className="input-wrapper">
              <LockClosedIcon className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="form-input"
                dir="ltr"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="eye-icon" />
                ) : (
                  <EyeIcon className="eye-icon" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            className="login-button"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <>
                <span className="spinner" />
                جاري التحقق...
              </>
            ) : (
              <>
                تسجيل الدخول
              </>
            )}
          </motion.button>
        </form>

        {/* Help Text */}
        <div className="help-section">
          <p className="help-text">
            🔒 كلمة المرور الافتراضية: <strong>123456</strong>
          </p>
          <p className="help-subtext">
            ستُطلب منك تغييرها عند أول دخول
          </p>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>© 2025 عائلة الشعيل - جميع الحقوق محفوظة</p>
        </div>
      </motion.div>
    </div>
  );
};

export default MobileLogin;
