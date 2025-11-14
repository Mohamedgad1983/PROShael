/**
 * Profile Settings Component
 * Allows users to manage their profile information and avatar
 */

import React, { memo,  useState, useRef, useEffect } from 'react';
import { UserIcon, PhotoIcon, XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, EyeIcon, EyeSlashIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useRole } from '../../contexts/RoleContext';
import { logger } from '../../utils/logger';

import {
  SettingsCard,
  SettingsButton,
  SettingsInput
} from './shared';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDER_RADIUS,
  commonStyles
} from './sharedStyles';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface NotificationToggleProps {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange?: () => void;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({ label, description, checked, disabled, onChange }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.lg,
      background: COLORS.white,
      borderRadius: BORDER_RADIUS.md,
      border: `1px solid ${COLORS.border}`,
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer'
    }}
    onClick={!disabled && onChange ? onChange : undefined}
  >
    <div>
      <div style={{ fontSize: TYPOGRAPHY.base, fontWeight: TYPOGRAPHY.medium, color: COLORS.gray900, marginBottom: SPACING.xs }}>
        {label}
      </div>
      <div style={{ fontSize: TYPOGRAPHY.sm, color: COLORS.gray500 }}>
        {description}
      </div>
    </div>
    <div style={{
      width: '48px',
      height: '24px',
      borderRadius: '12px',
      background: checked ? COLORS.primary : COLORS.gray300,
      position: 'relative' as const,
      transition: 'background 0.3s ease'
    }}>
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: COLORS.white,
        position: 'absolute' as const,
        top: '2px',
        left: checked ? '26px' : '2px',
        transition: 'left 0.3s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }} />
    </div>
  </div>
);

interface FieldError {
  field: string;
  message: string;
  message_en: string;
}

interface ProfileFormData {
  full_name: string;
  email: string;
  phone: string;
}

const ProfileSettings: React.FC = () => {
  const { user, refreshUserRole } = useRole();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    phone: ''
  });
  const [originalData, setOriginalData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    phone: ''
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Notification preferences state
  const [notificationPreferences, setNotificationPreferences] = useState({
    email_notifications: true,
    push_notifications: false,
    member_updates: true,
    financial_alerts: true,
    system_updates: false
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);

  // Fetch user profile and notifications on mount
  useEffect(() => {
    fetchUserProfile();
    fetchNotificationPreferences();
  }, []);

  const fetchNotificationPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/user/profile/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        setNotificationPreferences(response.data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch notification preferences:', { error });
    }
  };

  const handleNotificationToggle = async (key: keyof typeof notificationPreferences) => {
    const newValue = !notificationPreferences[key];

    // Optimistic update
    setNotificationPreferences(prev => ({
      ...prev,
      [key]: newValue
    }));

    // Save to backend
    setSavingNotifications(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE}/api/user/profile/notifications`,
        { [key]: newValue },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessage({ type: 'success', text: 'تم تحديث إعدادات الإشعارات بنجاح' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error: any) {
      // Revert on error
      setNotificationPreferences(prev => ({
        ...prev,
        [key]: !newValue
      }));
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'فشل في تحديث إعدادات الإشعارات'
      });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSavingNotifications(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        setAvatarUrl(response.data.data.avatar_url);
        // Initialize form data and original data
        const profileData = {
          full_name: response.data.data.full_name || '',
          email: response.data.data.email || '',
          phone: response.data.data.phone || ''
        };
        setFormData(profileData);
        setOriginalData(profileData);
      }
    } catch (error) {
      logger.error('Failed to fetch profile:', { error });
    }
  };

  // Handle edit mode toggle
  const handleEditModeToggle = () => {
    if (isEditMode) {
      // Cancel edit - reset form data to original
      setFormData(originalData);
      setFieldErrors({});
      setMessage(null);
    }
    setIsEditMode(!isEditMode);
  };

  // Handle input change
  const handleInputChange = (field: keyof ProfileFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle save profile
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setMessage(null);
      setFieldErrors({});

      // Prepare update data (only changed fields)
      const updates: Partial<ProfileFormData> = {};
      if (formData.full_name !== originalData.full_name) updates.full_name = formData.full_name;
      if (formData.email !== originalData.email) updates.email = formData.email;
      if (formData.phone !== originalData.phone) updates.phone = formData.phone;

      // Check if any changes made
      if (Object.keys(updates).length === 0) {
        setMessage({
          type: 'info',
          text: 'لم يتم إجراء أي تغييرات'
        });
        return;
      }

      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE}/api/user/profile`,
        updates,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'تم تحديث المعلومات بنجاح'
        });
        setIsEditMode(false);

        // Refresh user context to update globally
        await refreshUserRole();

        // Refresh profile data
        await fetchUserProfile();
      }
    } catch (error: any) {
      logger.error('Profile update error:', { error });

      // Handle validation errors
      if (error.response?.status === 400 && error.response?.data?.errors) {
        const errors: Record<string, string> = {};
        error.response.data.errors.forEach((err: FieldError) => {
          errors[err.field] = err.message;
        });
        setFieldErrors(errors);
        setMessage({
          type: 'error',
          text: error.response.data.message || 'بيانات غير صالحة'
        });
      } else if (error.response?.status === 409) {
        // Uniqueness conflict
        const errors: Record<string, string> = {};
        if (error.response.data.errors) {
          error.response.data.errors.forEach((err: FieldError) => {
            errors[err.field] = err.message;
          });
        }
        setFieldErrors(errors);
        setMessage({
          type: 'error',
          text: error.response.data.message || 'القيمة مستخدمة بالفعل'
        });
      } else {
        setMessage({
          type: 'error',
          text: error.response?.data?.message || 'فشل في تحديث المعلومات'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // Get user initials for avatar placeholder
  const getInitials = (name: string | undefined) => {
    if (!name) return '؟';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2);
  };

  // Handle file selection
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Validate and preview file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({
        type: 'error',
        text: 'نوع الملف غير مدعوم. الرجاء استخدام PNG أو JPG'
      });
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({
        type: 'error',
        text: 'حجم الملف يتجاوز 2 ميجابايت'
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
      setSelectedFile(file);
      setMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // Upload avatar
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setMessage(null);

      const formData = new FormData();
      formData.append('avatar', selectedFile);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/api/user/profile/avatar`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setAvatarUrl(response.data.data.avatar_url);
        setPreviewImage(null);
        setSelectedFile(null);
        setMessage({
          type: 'success',
          text: 'تم رفع الصورة بنجاح'
        });

        // Refresh user context to update avatar globally
        await refreshUserRole();

        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error: any) {
      logger.error('Avatar upload error:', { error });
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'فشل في رفع الصورة'
      });
    } finally {
      setUploading(false);
    }
  };

  // Cancel preview
  const handleCancelPreview = () => {
    setPreviewImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove avatar
  const handleRemoveAvatar = async () => {
    if (!window.confirm('هل أنت متأكد من حذف الصورة الشخصية؟')) return;

    try {
      setUploading(true);
      setMessage(null);

      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API_BASE}/api/user/profile/avatar`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setAvatarUrl(null);
        setMessage({
          type: 'success',
          text: 'تم حذف الصورة بنجاح'
        });

        // Refresh user context
        await refreshUserRole();
      }
    } catch (error: any) {
      logger.error('Avatar remove error:', { error });
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'فشل في حذف الصورة'
      });
    } finally {
      setUploading(false);
    }
  };

  // Password strength calculator
  const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 3) return 'medium';
    return 'strong';
  };

  // Handle password input change
  const handlePasswordChange = (field: keyof typeof passwordData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPasswordData(prev => ({ ...prev, [field]: value }));

    // Calculate strength for new password
    if (field === 'newPassword') {
      if (value) {
        setPasswordStrength(calculatePasswordStrength(value));
      } else {
        setPasswordStrength(null);
      }
    }

    // Clear field error
    if (passwordErrors[field]) {
      setPasswordErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Validate password change form
  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'كلمة المرور الحالية مطلوبة';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'كلمة المرور الجديدة مطلوبة';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      errors.newPassword = 'يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'تأكيد كلمة المرور مطلوب';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'كلمتا المرور غير متطابقتين';
    }

    if (passwordData.currentPassword && passwordData.newPassword &&
        passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword = 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle password change submission
  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;

    try {
      setChangingPassword(true);
      setMessage(null);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/api/user/profile/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'تم تغيير كلمة المرور بنجاح'
        });

        // Clear form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setPasswordStrength(null);
        setPasswordErrors({});
      }
    } catch (error: any) {
      logger.error('Password change error:', { error });

      if (error.response?.status === 401) {
        setPasswordErrors({ currentPassword: 'كلمة المرور الحالية غير صحيحة' });
        setMessage({
          type: 'error',
          text: 'كلمة المرور الحالية غير صحيحة'
        });
      } else if (error.response?.status === 429) {
        setMessage({
          type: 'error',
          text: 'تم تجاوز عدد المحاولات. يرجى المحاولة لاحقاً'
        });
      } else {
        setMessage({
          type: 'error',
          text: error.response?.data?.message || 'فشل في تغيير كلمة المرور'
        });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (message && message.type === 'success') {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Styles
  const avatarSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING['3xl'],
    marginBottom: SPACING['4xl'],
    padding: SPACING['3xl'],
    background: COLORS.primaryLight + '20',
    borderRadius: BORDER_RADIUS.xl,
    border: `1px dashed ${COLORS.primary}`
  };

  const avatarPreviewStyle: React.CSSProperties = {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    overflow: 'hidden',
    background: avatarUrl ? 'transparent' : COLORS.primaryGradient,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: TYPOGRAPHY['3xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.white,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: `4px solid ${COLORS.white}`,
    flexShrink: 0
  };

  const avatarControlsStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.md,
    flex: 1
  };

  const previewModalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: SPACING['4xl']
  };

  const previewContentStyle: React.CSSProperties = {
    background: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING['4xl'],
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center'
  };

  const previewImgStyle: React.CSSProperties = {
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    margin: '0 auto ' + SPACING['3xl'],
    objectFit: 'cover' as const,
    border: `4px solid ${COLORS.primary}`
  };

  const messageStyle = (type: Message['type']): React.CSSProperties => ({
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xl,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    background: type === 'success' ? COLORS.successBg :
                type === 'error' ? COLORS.errorBg : COLORS.infoBg,
    color: type === 'success' ? COLORS.successText :
           type === 'error' ? COLORS.errorText : COLORS.infoText,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium
  });

  return (
    <div>
      <div style={{
        fontSize: TYPOGRAPHY['2xl'],
        fontWeight: TYPOGRAPHY.bold,
        marginBottom: SPACING['3xl'],
        color: COLORS.gray900
      }}>
        الملف الشخصي
      </div>

      <SettingsCard>
        {/* Avatar Section */}
        <div style={avatarSectionStyle}>
          <div style={avatarPreviewStyle}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span>{getInitials(originalData.full_name)}</span>
            )}
          </div>

          <div style={avatarControlsStyle}>
            <div style={{ fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.semibold, color: COLORS.gray900 }}>
              الصورة الشخصية
            </div>
            <div style={{ fontSize: TYPOGRAPHY.sm, color: COLORS.gray500, marginBottom: SPACING.md }}>
              PNG أو JPG • الحد الأقصى 2 ميجابايت • يوصى بحجم 512x512 بكسل
            </div>

            <div style={{ display: 'flex', gap: SPACING.md, flexWrap: 'wrap' }}>
              <SettingsButton
                variant="secondary"
                onClick={handleFileSelect}
                disabled={uploading}
              >
                <PhotoIcon style={{ width: '20px', height: '20px' }} />
                {avatarUrl ? 'تغيير الصورة' : 'رفع صورة'}
              </SettingsButton>

              {avatarUrl && (
                <SettingsButton
                  variant="danger"
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                >
                  <XMarkIcon style={{ width: '20px', height: '20px' }} />
                  حذف الصورة
                </SettingsButton>
              )}
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileChange}
          />
        </div>

        {/* Messages */}
        {message && (
          <div style={messageStyle(message.type)}>
            {message.type === 'success' && <CheckCircleIcon style={{ width: '20px', height: '20px' }} />}
            {message.type === 'error' && <XMarkIcon style={{ width: '20px', height: '20px' }} />}
            {message.type === 'info' && <ExclamationCircleIcon style={{ width: '20px', height: '20px' }} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* User Info */}
        <div style={{ marginTop: SPACING['4xl'], paddingTop: SPACING['4xl'], borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl }}>
            <div style={{ fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.semibold, color: COLORS.gray900 }}>
              المعلومات الشخصية
            </div>

            {!isEditMode && (
              <SettingsButton
                variant="secondary"
                onClick={handleEditModeToggle}
              >
                تعديل المعلومات
              </SettingsButton>
            )}
          </div>

          <div style={{ display: 'grid', gap: SPACING.lg }}>
            <SettingsInput
              label="الاسم الكامل"
              value={isEditMode ? formData.full_name : originalData.full_name}
              disabled={!isEditMode}
              onChange={isEditMode ? handleInputChange('full_name') : undefined}
              error={fieldErrors.full_name}
              required={isEditMode}
            />
            <SettingsInput
              label="البريد الإلكتروني"
              value={isEditMode ? formData.email : (user?.email || '')}
              disabled={!isEditMode}
              onChange={isEditMode ? handleInputChange('email') : undefined}
              error={fieldErrors.email}
              required={isEditMode}
            />
            <SettingsInput
              label="رقم الهاتف"
              value={isEditMode ? formData.phone : originalData.phone}
              disabled={!isEditMode}
              onChange={isEditMode ? handleInputChange('phone') : undefined}
              error={fieldErrors.phone}
              placeholder="05xxxxxxxx"
            />
            <SettingsInput
              label="الدور"
              value={user?.roleAr || user?.role || ''}
              disabled
            />
          </div>

          {isEditMode && (
            <div style={{ display: 'flex', gap: SPACING.md, marginTop: SPACING.xl }}>
              <SettingsButton
                variant="primary"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </SettingsButton>
              <SettingsButton
                variant="secondary"
                onClick={handleEditModeToggle}
                disabled={saving}
              >
                إلغاء
              </SettingsButton>
            </div>
          )}
        </div>

        {/* Notification Settings Section */}
        <div style={{ marginTop: SPACING['4xl'], paddingTop: SPACING['4xl'], borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl }}>
            <div>
              <div style={{ fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.semibold, color: COLORS.gray900 }}>
                إعدادات الإشعارات
              </div>
              <div style={{ fontSize: TYPOGRAPHY.sm, color: COLORS.gray500, marginTop: SPACING.xs }}>
                قم بتخصيص تفضيلات الإشعارات الخاصة بك
              </div>
            </div>
            {savingNotifications && (
              <div style={{ fontSize: TYPOGRAPHY.sm, color: COLORS.primary }}>
                جاري الحفظ...
              </div>
            )}
          </div>

          {/* Notification Options */}
          <div style={{
            display: 'grid',
            gap: SPACING.lg,
            padding: SPACING.xl,
            background: COLORS.gray50,
            borderRadius: BORDER_RADIUS.lg
          }}>
            {/* Email Notifications */}
            <NotificationToggle
              label="إشعارات البريد الإلكتروني"
              description="استقبل التنبيهات المهمة عبر البريد الإلكتروني"
              checked={notificationPreferences.email_notifications}
              disabled={savingNotifications}
              onChange={() => handleNotificationToggle('email_notifications')}
            />

            {/* Push Notifications */}
            <NotificationToggle
              label="إشعارات المتصفح"
              description="استقبل تنبيهات فورية في المتصفح"
              checked={notificationPreferences.push_notifications}
              disabled={savingNotifications}
              onChange={() => handleNotificationToggle('push_notifications')}
            />

            {/* Member Updates */}
            <NotificationToggle
              label="تحديثات الأعضاء"
              description="إشعارات عند تغيير حالة الأعضاء أو معلوماتهم"
              checked={notificationPreferences.member_updates}
              disabled={savingNotifications}
              onChange={() => handleNotificationToggle('member_updates')}
            />

            {/* Financial Alerts */}
            <NotificationToggle
              label="التنبيهات المالية"
              description="إشعارات المعاملات المالية والمدفوعات"
              checked={notificationPreferences.financial_alerts}
              disabled={savingNotifications}
              onChange={() => handleNotificationToggle('financial_alerts')}
            />

            {/* System Updates */}
            <NotificationToggle
              label="تحديثات النظام"
              description="إشعارات الصيانة والتحديثات الجديدة"
              checked={notificationPreferences.system_updates}
              disabled={savingNotifications}
              onChange={() => handleNotificationToggle('system_updates')}
            />
          </div>
        </div>

        {/* Password Change Section */}
        <div style={{ marginTop: SPACING['4xl'], paddingTop: SPACING['4xl'], borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ marginBottom: SPACING.xl }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.xs }}>
              <LockClosedIcon style={{ width: '24px', height: '24px', color: COLORS.primary }} />
              <div style={{ fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.semibold, color: COLORS.gray900 }}>
                تغيير كلمة المرور
              </div>
            </div>
            <div style={{ fontSize: TYPOGRAPHY.sm, color: COLORS.gray500 }}>
              قم بتحديث كلمة المرور الخاصة بك للحفاظ على أمان حسابك
            </div>
          </div>

          <div style={{
            display: 'grid',
            gap: SPACING.lg,
            padding: SPACING.xl,
            background: COLORS.gray50,
            borderRadius: BORDER_RADIUS.lg
          }}>
            {/* Current Password */}
            <div>
              <label style={{
                display: 'block',
                fontSize: TYPOGRAPHY.sm,
                fontWeight: TYPOGRAPHY.medium,
                color: COLORS.gray700,
                marginBottom: SPACING.xs
              }}>
                كلمة المرور الحالية <span style={{ color: COLORS.error }}>*</span>
              </label>
              <div style={{ position: 'relative' as const }}>
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange('currentPassword')}
                  disabled={changingPassword}
                  style={{
                    width: '100%',
                    padding: `${SPACING.md} ${SPACING['5xl']} ${SPACING.md} ${SPACING.md}`,
                    border: `1px solid ${passwordErrors.currentPassword ? COLORS.error : COLORS.border}`,
                    borderRadius: BORDER_RADIUS.md,
                    fontSize: TYPOGRAPHY.base,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    background: changingPassword ? COLORS.gray100 : COLORS.white
                  }}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  disabled={changingPassword}
                  style={{
                    position: 'absolute' as const,
                    left: SPACING.md,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: changingPassword ? 'not-allowed' : 'pointer',
                    padding: SPACING.xs,
                    color: COLORS.gray500
                  }}
                >
                  {showPasswords.current ?
                    <EyeSlashIcon style={{ width: '20px', height: '20px' }} /> :
                    <EyeIcon style={{ width: '20px', height: '20px' }} />
                  }
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <div style={{
                  fontSize: TYPOGRAPHY.sm,
                  color: COLORS.error,
                  marginTop: SPACING.xs
                }}>
                  {passwordErrors.currentPassword}
                </div>
              )}
            </div>

            {/* New Password */}
            <div>
              <label style={{
                display: 'block',
                fontSize: TYPOGRAPHY.sm,
                fontWeight: TYPOGRAPHY.medium,
                color: COLORS.gray700,
                marginBottom: SPACING.xs
              }}>
                كلمة المرور الجديدة <span style={{ color: COLORS.error }}>*</span>
              </label>
              <div style={{ position: 'relative' as const }}>
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange('newPassword')}
                  disabled={changingPassword}
                  style={{
                    width: '100%',
                    padding: `${SPACING.md} ${SPACING['5xl']} ${SPACING.md} ${SPACING.md}`,
                    border: `1px solid ${passwordErrors.newPassword ? COLORS.error : COLORS.border}`,
                    borderRadius: BORDER_RADIUS.md,
                    fontSize: TYPOGRAPHY.base,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    background: changingPassword ? COLORS.gray100 : COLORS.white
                  }}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  disabled={changingPassword}
                  style={{
                    position: 'absolute' as const,
                    left: SPACING.md,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: changingPassword ? 'not-allowed' : 'pointer',
                    padding: SPACING.xs,
                    color: COLORS.gray500
                  }}
                >
                  {showPasswords.new ?
                    <EyeSlashIcon style={{ width: '20px', height: '20px' }} /> :
                    <EyeIcon style={{ width: '20px', height: '20px' }} />
                  }
                </button>
              </div>
              {passwordErrors.newPassword && (
                <div style={{
                  fontSize: TYPOGRAPHY.sm,
                  color: COLORS.error,
                  marginTop: SPACING.xs
                }}>
                  {passwordErrors.newPassword}
                </div>
              )}
              {/* Password Strength Indicator */}
              {passwordStrength && (
                <div style={{ marginTop: SPACING.md }}>
                  <div style={{ display: 'flex', gap: SPACING.xs, marginBottom: SPACING.xs }}>
                    <div style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: passwordStrength === 'weak' ? COLORS.error :
                                 passwordStrength === 'medium' ? '#F59E0B' :
                                 COLORS.success
                    }} />
                    <div style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: passwordStrength === 'medium' || passwordStrength === 'strong' ?
                                 (passwordStrength === 'medium' ? '#F59E0B' : COLORS.success) :
                                 COLORS.gray300
                    }} />
                    <div style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: passwordStrength === 'strong' ? COLORS.success : COLORS.gray300
                    }} />
                  </div>
                  <div style={{
                    fontSize: TYPOGRAPHY.sm,
                    color: passwordStrength === 'weak' ? COLORS.error :
                           passwordStrength === 'medium' ? '#F59E0B' :
                           COLORS.success
                  }}>
                    {passwordStrength === 'weak' ? 'ضعيفة' :
                     passwordStrength === 'medium' ? 'متوسطة' :
                     'قوية'}
                  </div>
                </div>
              )}
              <div style={{
                fontSize: TYPOGRAPHY.xs,
                color: COLORS.gray500,
                marginTop: SPACING.xs
              }}>
                8 أحرف على الأقل، أحرف كبيرة وصغيرة، وأرقام
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{
                display: 'block',
                fontSize: TYPOGRAPHY.sm,
                fontWeight: TYPOGRAPHY.medium,
                color: COLORS.gray700,
                marginBottom: SPACING.xs
              }}>
                تأكيد كلمة المرور الجديدة <span style={{ color: COLORS.error }}>*</span>
              </label>
              <div style={{ position: 'relative' as const }}>
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange('confirmPassword')}
                  disabled={changingPassword}
                  style={{
                    width: '100%',
                    padding: `${SPACING.md} ${SPACING['5xl']} ${SPACING.md} ${SPACING.md}`,
                    border: `1px solid ${passwordErrors.confirmPassword ? COLORS.error : COLORS.border}`,
                    borderRadius: BORDER_RADIUS.md,
                    fontSize: TYPOGRAPHY.base,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    background: changingPassword ? COLORS.gray100 : COLORS.white
                  }}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  disabled={changingPassword}
                  style={{
                    position: 'absolute' as const,
                    left: SPACING.md,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: changingPassword ? 'not-allowed' : 'pointer',
                    padding: SPACING.xs,
                    color: COLORS.gray500
                  }}
                >
                  {showPasswords.confirm ?
                    <EyeSlashIcon style={{ width: '20px', height: '20px' }} /> :
                    <EyeIcon style={{ width: '20px', height: '20px' }} />
                  }
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <div style={{
                  fontSize: TYPOGRAPHY.sm,
                  color: COLORS.error,
                  marginTop: SPACING.xs
                }}>
                  {passwordErrors.confirmPassword}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: SPACING.md }}>
              <SettingsButton
                variant="primary"
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              >
                {changingPassword ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
              </SettingsButton>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Preview Modal */}
      {previewImage && (
        <div style={previewModalStyle} onClick={handleCancelPreview}>
          <div style={previewContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.bold, marginBottom: SPACING.xl }}>
              معاينة الصورة الشخصية
            </h3>

            <img src={previewImage} alt="Preview" style={previewImgStyle} />

            <div style={{ display: 'flex', gap: SPACING.md, justifyContent: 'center' }}>
              <SettingsButton
                variant="primary"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? 'جاري الرفع...' : 'حفظ الصورة'}
              </SettingsButton>
              <SettingsButton
                variant="secondary"
                onClick={handleCancelPreview}
                disabled={uploading}
              >
                إلغاء
              </SettingsButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;

