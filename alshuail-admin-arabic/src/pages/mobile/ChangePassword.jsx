import { CheckCircleIcon,EyeIcon,EyeSlashIcon,LockClosedIcon,XCircleIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import React,{ useState } from 'react';
import { useLocation,useNavigate } from 'react-router-dom';
import { API_ORIGIN } from '../../utils/apiConfig';
import './ChangePassword.css';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const isFirstLogin = location.state?.isFirstLogin || false;

  // Password strength checker
  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 12.5;
    if (/[@$!%*?&#]/.test(password)) strength += 12.5;
    return strength;
  };

  const handleNewPasswordChange = (value) => {
    setNewPassword(value);
    setPasswordStrength(checkPasswordStrength(value));
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push('8 أحرف على الأقل');
    if (!/[A-Z]/.test(password)) errors.push('حرف كبير');
    if (!/[a-z]/.test(password)) errors.push('حرف صغير');
    if (!/[0-9]/.test(password)) errors.push('رقم');
    if (!/[@$!%*?&#]/.test(password)) errors.push('رمز خاص');
    if (password === '123456') errors.push('كلمة مرور مختلفة عن الافتراضية القديمة');
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      setLoading(false);
      return;
    }

    // Validate password strength
    const validationErrors = validatePassword(newPassword);
    if (validationErrors.length > 0) {
      setError(`كلمة المرور ضعيفة. يجب أن تحتوي على: ${validationErrors.join('، ')}`);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_URL = API_ORIGIN;

      const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message_ar || data.message || 'فشل تغيير كلمة المرور');
      }

      // Check if the response indicates success
      if (data.success) {
        // Show success message
        alert('✅ تم تغيير كلمة المرور بنجاح!');

        // Navigate to dashboard
        setTimeout(() => {
          navigate('/mobile/dashboard');
        }, 500);
      } else {
        throw new Error(data.message || 'فشل تغيير كلمة المرور');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength < 50) return '#FF3B30';
    if (passwordStrength < 75) return '#FF9500';
    return '#34C759';
  };

  const getStrengthText = () => {
    if (passwordStrength < 50) return 'ضعيفة';
    if (passwordStrength < 75) return 'متوسطة';
    return 'قوية';
  };

  return (
    <div className="change-password-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="change-password-card"
      >
        {/* Header */}
        <div className="header-section">
          <div className="icon-wrapper">
            <LockClosedIcon className="lock-icon" />
          </div>
          <h1 className="title">
            {isFirstLogin ? 'مرحباً بك! 👋' : 'تغيير كلمة المرور'}
          </h1>
          <p className="subtitle">
            {isFirstLogin
              ? 'هذا هو دخولك الأول. الرجاء تعيين كلمة مرور قوية وآمنة.'
              : 'قم بتغيير كلمة المرور الخاصة بك'}
          </p>
        </div>

        {isFirstLogin && (
          <div className="info-box">
            <CheckCircleIcon className="info-icon" />
            <div>
              <p className="info-title">نصائح لكلمة مرور قوية:</p>
              <ul className="info-list">
                <li>استخدم 8 أحرف على الأقل</li>
                <li>امزج بين الأحرف الكبيرة والصغيرة</li>
                <li>أضف أرقاماً ورموزاً خاصة</li>
                <li>لا تستخدم معلومات شخصية</li>
              </ul>
            </div>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="error-message"
          >
            <XCircleIcon className="error-icon" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="password-form">
          {!isFirstLogin && (
            <div className="form-group">
              <label>كلمة المرور الحالية</label>
              <div className="input-wrapper">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="form-input"
                  placeholder="أدخل كلمة المرور الحالية"
                  dir="ltr"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeSlashIcon className="eye-icon" />
                  ) : (
                    <EyeIcon className="eye-icon" />
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>كلمة المرور الجديدة</label>
            <div className="input-wrapper">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => handleNewPasswordChange(e.target.value)}
                required
                className="form-input"
                placeholder="8 أحرف على الأقل"
                dir="ltr"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeSlashIcon className="eye-icon" />
                ) : (
                  <EyeIcon className="eye-icon" />
                )}
              </button>
            </div>
            {newPassword && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${passwordStrength}%`,
                      backgroundColor: getStrengthColor()
                    }}
                  />
                </div>
                <span className="strength-text" style={{ color: getStrengthColor() }}>
                  {getStrengthText()}
                </span>
              </div>
            )}
            <small className="hint">
              يجب أن تحتوي على: حروف كبيرة، صغيرة، أرقام، ورموز خاصة (@$!%*?&#)
            </small>
          </div>

          <div className="form-group">
            <label>تأكيد كلمة المرور</label>
            <div className="input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="form-input"
                placeholder="أعد إدخال كلمة المرور"
                dir="ltr"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="eye-icon" />
                ) : (
                  <EyeIcon className="eye-icon" />
                )}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <small className="error-hint">كلمات المرور غير متطابقة</small>
            )}
            {confirmPassword && newPassword === confirmPassword && (
              <small className="success-hint">✓ كلمات المرور متطابقة</small>
            )}
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
          >
            {loading ? (
              <>
                <span className="spinner" />
                جاري التغيير...
              </>
            ) : (
              <>
                <LockClosedIcon className="btn-icon" />
                {isFirstLogin ? 'تعيين كلمة المرور' : 'تغيير كلمة المرور'}
              </>
            )}
          </button>
        </form>

        <div className="security-note">
          <p>🔒 كلمة المرور يتم تشفيرها وحفظها بشكل آمن</p>
        </div>
      </motion.div>
    </div>
  );
};

export default ChangePassword;
