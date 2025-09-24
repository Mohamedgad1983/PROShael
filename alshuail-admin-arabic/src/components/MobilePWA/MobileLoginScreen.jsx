/**
 * MobileLoginScreen - Phone-based login with Saudi phone validation
 * Features: Phone authentication, password toggle, remember me, glassmorphic design
 */

import React, { useState, useEffect } from 'react';
import { useMobile, useHapticFeedback } from '../../hooks/useMobile';
import '../../styles/mobile-arabic.css';

const MobileLoginScreen = ({ onLogin, loading = false, error = null }) => {
  const { device, viewport, applySafeArea } = useMobile();
  const { feedback } = useHapticFeedback();

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    rememberMe: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Saudi phone number validation pattern
  const SAUDI_PHONE_PATTERN = /^(05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;

  // Validate phone number
  const validatePhone = (phone) => {
    if (!phone) return 'رقم الهاتف مطلوب';
    if (!SAUDI_PHONE_PATTERN.test(phone)) {
      return 'يجب أن يكون رقم الهاتف سعودي صحيح (05xxxxxxxx)';
    }
    return null;
  };

  // Validate password
  const validatePassword = (password) => {
    if (!password) return 'كلمة المرور مطلوبة';
    if (password.length < 6) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    return null;
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Format phone number (add spaces for readability)
  const formatPhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
  };

  // Handle phone input with formatting
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length <= 10) {
      handleInputChange('phone', value);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    feedback('light');

    // Validate form
    const phoneError = validatePhone(formData.phone);
    const passwordError = validatePassword(formData.password);

    if (phoneError || passwordError) {
      setValidationErrors({
        phone: phoneError,
        password: passwordError
      });
      feedback('error');
      return;
    }

    setIsSubmitting(true);

    try {
      if (onLogin) {
        await onLogin(formData);
        feedback('success');
      }
    } catch (err) {
      feedback('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
    feedback('light');
  };

  // Auto-focus phone input on mobile
  useEffect(() => {
    if (device.isMobile) {
      const phoneInput = document.getElementById('phone-input');
      if (phoneInput) {
        setTimeout(() => phoneInput.focus(), 100);
      }
    }
  }, [device.isMobile]);

  return (
    <div className="min-h-screen bg-gradient-primary" dir="rtl">
      {/* Safe area container */}
      <div className="safe-area-container">

        {/* Header with logo */}
        <header
          className="text-center py-8"
          style={applySafeArea(['top'])}
        >
          <div className="container">
            {/* Logo */}
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-accent rounded-full flex items-center justify-center shadow-xl">
              <span className="text-white font-bold text-3xl">ش</span>
            </div>

            {/* App title */}
            <h1 className="text-3xl font-bold text-white mb-2">آل شعيل</h1>
            <p className="text-slate-300 text-lg">نظام إدارة الأسرة</p>
          </div>
        </header>

        {/* Login form */}
        <main className="container px-6">
          <div className="max-w-md mx-auto">

            {/* Welcome message */}
            <div className="glass-card text-center mb-8">
              <h2 className="text-xl font-semibold text-white mb-2">أهلاً وسهلاً</h2>
              <p className="text-slate-300">قم بتسجيل الدخول للوصول إلى حسابك</p>
            </div>

            {/* Error message */}
            {error && (
              <div className="glass-card bg-error bg-opacity-20 border-error border mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 text-error">⚠️</div>
                  <p className="text-error text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Login form */}
            <form onSubmit={handleSubmit} className="glass-card">

              {/* Phone number input */}
              <div className="form-group">
                <label htmlFor="phone-input" className="form-label">
                  <span className="flex items-center gap-2">
                    📱 رقم الهاتف
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="phone-input"
                    type="tel"
                    dir="ltr"
                    className={`form-input text-left ${validationErrors.phone ? 'border-error' : ''}`}
                    placeholder="05X XXX XXXX"
                    value={formatPhoneNumber(formData.phone)}
                    onChange={handlePhoneChange}
                    maxLength={13} // For formatted display
                    inputMode="numeric"
                    autoComplete="tel"
                    style={{ direction: 'ltr', textAlign: 'left' }}
                  />
                  {formData.phone && (
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <span className="text-success">✓</span>
                    </div>
                  )}
                </div>
                {validationErrors.phone && (
                  <p className="form-error">{validationErrors.phone}</p>
                )}
              </div>

              {/* Password input */}
              <div className="form-group">
                <label htmlFor="password-input" className="form-label">
                  <span className="flex items-center gap-2">
                    🔒 كلمة المرور
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    className={`form-input pl-12 ${validationErrors.password ? 'border-error' : ''}`}
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    autoComplete="current-password"
                    style={{ direction: 'ltr', textAlign: 'left' }}
                  />
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 touch-target"
                    onClick={togglePasswordVisibility}
                    tabIndex={-1}
                  >
                    <span className="text-slate-400 text-lg">
                      {showPassword ? '🙈' : '👁️'}
                    </span>
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="form-error">{validationErrors.password}</p>
                )}
              </div>

              {/* Remember me checkbox */}
              <div className="form-group">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                  />
                  <span className="text-slate-300 text-sm">تذكر بياناتي</span>
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className={`btn btn-primary w-full mb-4 ${
                  (isSubmitting || loading) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {(isSubmitting || loading) ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جاري تسجيل الدخول...
                  </span>
                ) : (
                  'تسجيل الدخول'
                )}
              </button>

              {/* Forgot password link */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-accent hover:text-accent-light transition-colors text-sm"
                  onClick={() => feedback('light')}
                >
                  هل نسيت كلمة المرور؟
                </button>
              </div>
            </form>

            {/* Contact support */}
            <div className="glass-card mt-6 text-center">
              <p className="text-slate-300 text-sm mb-3">تحتاج مساعدة؟</p>
              <div className="flex gap-4 justify-center">
                <button
                  className="touch-target glass rounded-lg flex items-center gap-2 px-4 py-2"
                  onClick={() => feedback('light')}
                >
                  <span>📞</span>
                  <span className="text-white text-sm">اتصل بنا</span>
                </button>
                <button
                  className="touch-target glass rounded-lg flex items-center gap-2 px-4 py-2"
                  onClick={() => feedback('light')}
                >
                  <span>💬</span>
                  <span className="text-white text-sm">واتساب</span>
                </button>
              </div>
            </div>

          </div>
        </main>

        {/* Footer */}
        <footer
          className="text-center py-6 mt-8"
          style={applySafeArea(['bottom'])}
        >
          <div className="container">
            <p className="text-slate-400 text-xs">
              تطبيق آل شعيل © 2024
            </p>
            <p className="text-slate-500 text-xs mt-1">
              الإصدار 1.0.0
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default MobileLoginScreen;