/**
 * Profile Settings Component - MODERNIZED VERSION
 * Allows users to manage their profile information, avatar, notifications, and password
 *
 * @version 2.0.0 (Modern Design System)
 * @date 2025-11-13
 */

import React, { memo,  useState, useRef, useEffect } from 'react';
import {
  UserIcon,
  PhotoIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useRole } from '../../contexts/RoleContext';
import {
  ModernCard,
  ModernButton,
  ModernInput,
  ModernSwitch,
  ModernBadge,
  ModernDivider,
  ModernSkeleton,
  ModernTooltip
} from './shared/modern';
import { getTheme } from './modernDesignSystem';

import { logger } from '../../utils/logger';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface Message {
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

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

interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  member_updates: boolean;
  financial_alerts: boolean;
  system_updates: boolean;
}

const ProfileSettings: React.FC = () => {
  const { user, refreshUserRole } = useRole();
  const theme = getTheme(false, true); // Light mode, RTL

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
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
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
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

  // General message state
  const [message, setMessage] = useState<Message | null>(null);

  // Loading state
  const [loading, setLoading] = useState(true);

  // =========================================================================
  // DATA FETCHING
  // =========================================================================

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        fetchUserProfile(),
        fetchNotificationPreferences()
      ]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        setAvatarUrl(response.data.data.avatar_url);
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

  // =========================================================================
  // AVATAR MANAGEMENT
  // =========================================================================

  const getInitials = (name: string | undefined) => {
    if (!name) return '؟';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({
        type: 'error',
        text: 'نوع الملف غير مدعوم. الرجاء استخدام PNG أو JPG'
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({
        type: 'error',
        text: 'حجم الملف يتجاوز 2 ميجابايت'
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
      setSelectedFile(file);
      setMessage(null);
    };
    reader.readAsDataURL(file);
  };

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
        await refreshUserRole();
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

  const handleCancelPreview = () => {
    setPreviewImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('هل أنت متأكد من حذف الصورة الشخصية؟')) return;

    try {
      setUploading(true);
      setMessage(null);

      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API_BASE}/api/user/profile/avatar`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setAvatarUrl(null);
        setMessage({
          type: 'success',
          text: 'تم حذف الصورة بنجاح'
        });
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

  // =========================================================================
  // PROFILE EDITING
  // =========================================================================

  const handleEditModeToggle = () => {
    if (isEditMode) {
      setFormData(originalData);
      setFieldErrors({});
      setMessage(null);
    }
    setIsEditMode(!isEditMode);
  };

  const handleInputChange = (field: keyof ProfileFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setMessage(null);
      setFieldErrors({});

      const updates: Partial<ProfileFormData> = {};
      if (formData.full_name !== originalData.full_name) updates.full_name = formData.full_name;
      if (formData.email !== originalData.email) updates.email = formData.email;
      if (formData.phone !== originalData.phone) updates.phone = formData.phone;

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
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'تم تحديث المعلومات بنجاح'
        });
        setIsEditMode(false);
        await refreshUserRole();
        await fetchUserProfile();
      }
    } catch (error: any) {
      logger.error('Profile update error:', { error });

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

  // =========================================================================
  // NOTIFICATION PREFERENCES
  // =========================================================================

  const handleNotificationToggle = async (key: keyof NotificationPreferences) => {
    const newValue = !notificationPreferences[key];

    setNotificationPreferences(prev => ({
      ...prev,
      [key]: newValue
    }));

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

  // =========================================================================
  // PASSWORD CHANGE
  // =========================================================================

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

  const handlePasswordChange = (field: keyof typeof passwordData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPasswordData(prev => ({ ...prev, [field]: value }));

    if (field === 'newPassword') {
      if (value) {
        setPasswordStrength(calculatePasswordStrength(value));
      } else {
        setPasswordStrength(null);
      }
    }

    if (passwordErrors[field]) {
      setPasswordErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

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
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'تم تغيير كلمة المرور بنجاح'
        });

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

  // Auto-dismiss success messages
  useEffect(() => {
    if (message && message.type === 'success') {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // =========================================================================
  // MESSAGE RENDERING
  // =========================================================================

  const renderMessage = () => {
    if (!message) return null;

    const messageColors = {
      success: {
        background: theme.colors.success[50],
        border: theme.colors.success[200],
        text: theme.colors.success[700]
      },
      error: {
        background: theme.colors.error[50],
        border: theme.colors.error[200],
        text: theme.colors.error[700]
      },
      info: {
        background: theme.colors.info[50],
        border: theme.colors.info[200],
        text: theme.colors.info[700]
      },
      warning: {
        background: theme.colors.warning[50],
        border: theme.colors.warning[200],
        text: theme.colors.warning[700]
      }
    };

    const colors = messageColors[message.type];
    const Icon = message.type === 'success' ? CheckCircleIcon :
                 message.type === 'error' ? XMarkIcon :
                 message.type === 'warning' ? ExclamationCircleIcon :
                 InformationCircleIcon;

    return (
      <ModernCard
        elevation="sm"
        padding="md"
        style={{
          background: colors.background,
          border: `1px solid ${colors.border}`,
          marginBottom: theme.spacing.xl
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
          <Icon style={{ width: '20px', height: '20px', color: colors.text, flexShrink: 0 }} />
          <span style={{
            fontSize: theme.fontSize.body,
            fontWeight: theme.fontWeight.medium,
            color: colors.text,
            fontFamily: theme.fonts.primary
          }}>
            {message.text}
          </span>
        </div>
      </ModernCard>
    );
  };

  // =========================================================================
  // LOADING STATE
  // =========================================================================

  if (loading) {
    return (
      <div>
        <div style={{
          fontSize: theme.fontSize.h2,
          fontWeight: theme.fontWeight.bold,
          marginBottom: theme.spacing['3xl'],
          color: theme.colors.gray[700],
          fontFamily: theme.fonts.primary
        }}>
          الملف الشخصي
        </div>

        <ModernCard elevation="md" padding="lg">
          <ModernSkeleton variant="circle" width="120px" height="120px" />
          <ModernDivider style={{ margin: `${theme.spacing.xl} 0` }} />
          <ModernSkeleton variant="text" width="40%" height="24px" />
          <ModernSkeleton variant="rounded" width="100%" height="48px" lines={4} lineGap={theme.spacing.md} />
        </ModernCard>
      </div>
    );
  }

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

  return (
    <div>
      {/* Page Header */}
      <div style={{
        fontSize: theme.fontSize.h2,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing['3xl'],
        color: theme.colors.gray[700],
        fontFamily: theme.fonts.primary
      }}>
        الملف الشخصي
      </div>

      {/* Global Messages */}
      {renderMessage()}

      {/* Main Card */}
      <ModernCard elevation="md" padding="none">
        {/* =====================================================================
            AVATAR SECTION
        ===================================================================== */}
        <div style={{ padding: theme.spacing['3xl'] }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing['3xl'],
            padding: theme.spacing['3xl'],
            background: `${theme.colors.primary[500]}08`,
            borderRadius: theme.borderRadius.xl,
            border: `1px dashed ${theme.colors.primary[300]}`
          }}>
            {/* Avatar Display */}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: theme.fontSize.h1,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.white,
              boxShadow: theme.shadows.md,
              border: `4px solid ${theme.colors.white}`,
              flexShrink: 0,
              fontFamily: theme.fonts.primary
            }}>
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

            {/* Avatar Controls */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: theme.fontSize.h3,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.gray[700],
                marginBottom: theme.spacing.xs,
                fontFamily: theme.fonts.primary
              }}>
                الصورة الشخصية
              </div>
              <div style={{
                fontSize: theme.fontSize.bodySm,
                color: theme.colors.gray[600],
                marginBottom: theme.spacing.lg,
                fontFamily: theme.fonts.primary
              }}>
                PNG أو JPG • الحد الأقصى 2 ميجابايت • يوصى بحجم 512×512 بكسل
              </div>

              <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' }}>
                <ModernButton
                  variant="secondary"
                  size="medium"
                  onClick={handleFileSelect}
                  disabled={uploading}
                  icon={<PhotoIcon style={{ width: '20px', height: '20px' }} />}
                >
                  {avatarUrl ? 'تغيير الصورة' : 'رفع صورة'}
                </ModernButton>

                {avatarUrl && (
                  <ModernTooltip content="حذف الصورة الشخصية الحالية" placement="top">
                    <ModernButton
                      variant="ghost"
                      size="medium"
                      onClick={handleRemoveAvatar}
                      disabled={uploading}
                      icon={<XMarkIcon style={{ width: '20px', height: '20px' }} />}
                      style={{ color: theme.colors.error[500] }}
                    >
                      حذف الصورة
                    </ModernButton>
                  </ModernTooltip>
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
        </div>

        <ModernDivider />

        {/* =====================================================================
            PERSONAL INFORMATION SECTION
        ===================================================================== */}
        <div style={{ padding: theme.spacing['3xl'] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xl }}>
            <div>
              <div style={{
                fontSize: theme.fontSize.h3,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.gray[700],
                marginBottom: theme.spacing['2xs'],
                fontFamily: theme.fonts.primary
              }}>
                المعلومات الشخصية
              </div>
              <div style={{
                fontSize: theme.fontSize.bodySm,
                color: theme.colors.gray[600],
                fontFamily: theme.fonts.primary
              }}>
                قم بتحديث معلوماتك الشخصية
              </div>
            </div>

            {!isEditMode && (
              <ModernButton
                variant="secondary"
                size="medium"
                onClick={handleEditModeToggle}
                icon={<PencilIcon style={{ width: '18px', height: '18px' }} />}
              >
                تعديل المعلومات
              </ModernButton>
            )}
          </div>

          <div style={{ display: 'grid', gap: theme.spacing.lg }}>
            <ModernInput
              label="الاسم الكامل"
              value={isEditMode ? formData.full_name : originalData.full_name}
              disabled={!isEditMode}
              onChange={isEditMode ? handleInputChange('full_name') : undefined}
              validation={fieldErrors.full_name ? 'error' : 'default'}
              helperText={fieldErrors.full_name}
              required={isEditMode}
              size="large"
              variant="outlined"
            />
            <ModernInput
              label="البريد الإلكتروني"
              value={isEditMode ? formData.email : (user?.email || '')}
              disabled={!isEditMode}
              onChange={isEditMode ? handleInputChange('email') : undefined}
              validation={fieldErrors.email ? 'error' : 'default'}
              helperText={fieldErrors.email}
              required={isEditMode}
              size="large"
              variant="outlined"
              type="email"
            />
            <ModernInput
              label="رقم الهاتف"
              value={isEditMode ? formData.phone : originalData.phone}
              disabled={!isEditMode}
              onChange={isEditMode ? handleInputChange('phone') : undefined}
              validation={fieldErrors.phone ? 'error' : 'default'}
              helperText={fieldErrors.phone}
              placeholder="05xxxxxxxx"
              size="large"
              variant="outlined"
              type="tel"
            />
            <ModernInput
              label="الدور"
              value={user?.roleAr || user?.role || ''}
              disabled
              size="large"
              variant="outlined"
            />
          </div>

          {isEditMode && (
            <div style={{ display: 'flex', gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
              <ModernButton
                variant="primary"
                size="large"
                onClick={handleSaveProfile}
                disabled={saving}
                loading={saving}
              >
                حفظ التغييرات
              </ModernButton>
              <ModernButton
                variant="secondary"
                size="large"
                onClick={handleEditModeToggle}
                disabled={saving}
              >
                إلغاء
              </ModernButton>
            </div>
          )}
        </div>

        <ModernDivider />

        {/* =====================================================================
            NOTIFICATION PREFERENCES SECTION
        ===================================================================== */}
        <div style={{ padding: theme.spacing['3xl'] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xl }}>
            <div>
              <div style={{
                fontSize: theme.fontSize.h3,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.gray[700],
                marginBottom: theme.spacing['2xs'],
                fontFamily: theme.fonts.primary
              }}>
                إعدادات الإشعارات
              </div>
              <div style={{
                fontSize: theme.fontSize.bodySm,
                color: theme.colors.gray[600],
                fontFamily: theme.fonts.primary
              }}>
                قم بتخصيص تفضيلات الإشعارات الخاصة بك
              </div>
            </div>

            {savingNotifications && (
              <ModernBadge variant="info" size="medium">
                جاري الحفظ...
              </ModernBadge>
            )}
          </div>

          <div style={{
            display: 'grid',
            gap: theme.spacing.md,
            padding: theme.spacing.xl,
            background: theme.colors.gray[50],
            borderRadius: theme.borderRadius.lg
          }}>
            <ModernSwitch
              checked={notificationPreferences.email_notifications}
              onChange={(checked) => handleNotificationToggle('email_notifications')}
              disabled={savingNotifications}
              label="إشعارات البريد الإلكتروني"
              description="استقبل التنبيهات المهمة عبر البريد الإلكتروني"
              size="medium"
              labelPosition="right"
            />

            <ModernDivider style={{ margin: `${theme.spacing.xs} 0` }} />

            <ModernSwitch
              checked={notificationPreferences.push_notifications}
              onChange={(checked) => handleNotificationToggle('push_notifications')}
              disabled={savingNotifications}
              label="إشعارات المتصفح"
              description="استقبل تنبيهات فورية في المتصفح"
              size="medium"
              labelPosition="right"
            />

            <ModernDivider style={{ margin: `${theme.spacing.xs} 0` }} />

            <ModernSwitch
              checked={notificationPreferences.member_updates}
              onChange={(checked) => handleNotificationToggle('member_updates')}
              disabled={savingNotifications}
              label="تحديثات الأعضاء"
              description="إشعارات عند تغيير حالة الأعضاء أو معلوماتهم"
              size="medium"
              labelPosition="right"
            />

            <ModernDivider style={{ margin: `${theme.spacing.xs} 0` }} />

            <ModernSwitch
              checked={notificationPreferences.financial_alerts}
              onChange={(checked) => handleNotificationToggle('financial_alerts')}
              disabled={savingNotifications}
              label="التنبيهات المالية"
              description="إشعارات المعاملات المالية والمدفوعات"
              size="medium"
              labelPosition="right"
            />

            <ModernDivider style={{ margin: `${theme.spacing.xs} 0` }} />

            <ModernSwitch
              checked={notificationPreferences.system_updates}
              onChange={(checked) => handleNotificationToggle('system_updates')}
              disabled={savingNotifications}
              label="تحديثات النظام"
              description="إشعارات الصيانة والتحديثات الجديدة"
              size="medium"
              labelPosition="right"
            />
          </div>
        </div>

        <ModernDivider />

        {/* =====================================================================
            PASSWORD CHANGE SECTION
        ===================================================================== */}
        <div style={{ padding: theme.spacing['3xl'] }}>
          <div style={{ marginBottom: theme.spacing.xl }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing['2xs'] }}>
              <LockClosedIcon style={{ width: '24px', height: '24px', color: theme.colors.primary[500] }} />
              <div style={{
                fontSize: theme.fontSize.h3,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.gray[700],
                fontFamily: theme.fonts.primary
              }}>
                تغيير كلمة المرور
              </div>
            </div>
            <div style={{
              fontSize: theme.fontSize.bodySm,
              color: theme.colors.gray[600],
              fontFamily: theme.fonts.primary
            }}>
              قم بتحديث كلمة المرور الخاصة بك للحفاظ على أمان حسابك
            </div>
          </div>

          <div style={{
            display: 'grid',
            gap: theme.spacing.lg,
            padding: theme.spacing.xl,
            background: theme.colors.gray[50],
            borderRadius: theme.borderRadius.lg
          }}>
            {/* Current Password */}
            <div style={{ position: 'relative' }}>
              <ModernInput
                type={showPasswords.current ? 'text' : 'password'}
                label="كلمة المرور الحالية"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange('currentPassword')}
                disabled={changingPassword}
                required
                size="large"
                variant="outlined"
                validation={passwordErrors.currentPassword ? 'error' : 'default'}
                helperText={passwordErrors.currentPassword}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                disabled={changingPassword}
                style={{
                  position: 'absolute',
                  left: theme.spacing.md,
                  top: '45px',
                  background: 'none',
                  border: 'none',
                  cursor: changingPassword ? 'not-allowed' : 'pointer',
                  padding: theme.spacing.xs,
                  color: theme.colors.gray[500]
                }}
              >
                {showPasswords.current ?
                  <EyeSlashIcon style={{ width: '20px', height: '20px' }} /> :
                  <EyeIcon style={{ width: '20px', height: '20px' }} />
                }
              </button>
            </div>

            {/* New Password */}
            <div>
              <div style={{ position: 'relative' }}>
                <ModernInput
                  type={showPasswords.new ? 'text' : 'password'}
                  label="كلمة المرور الجديدة"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange('newPassword')}
                  disabled={changingPassword}
                  required
                  size="large"
                  variant="outlined"
                  validation={passwordErrors.newPassword ? 'error' : 'default'}
                  helperText={passwordErrors.newPassword || '8 أحرف على الأقل، أحرف كبيرة وصغيرة، وأرقام'}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  disabled={changingPassword}
                  style={{
                    position: 'absolute',
                    left: theme.spacing.md,
                    top: '45px',
                    background: 'none',
                    border: 'none',
                    cursor: changingPassword ? 'not-allowed' : 'pointer',
                    padding: theme.spacing.xs,
                    color: theme.colors.gray[500]
                  }}
                >
                  {showPasswords.new ?
                    <EyeSlashIcon style={{ width: '20px', height: '20px' }} /> :
                    <EyeIcon style={{ width: '20px', height: '20px' }} />
                  }
                </button>
              </div>

              {/* Password Strength Indicator */}
              {passwordStrength && (
                <div style={{ marginTop: theme.spacing.md }}>
                  <div style={{ display: 'flex', gap: theme.spacing.xs, marginBottom: theme.spacing.xs }}>
                    <div style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: passwordStrength === 'weak' ? theme.colors.error[500] :
                                 passwordStrength === 'medium' ? theme.colors.warning[500] :
                                 theme.colors.success[500]
                    }} />
                    <div style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: passwordStrength === 'medium' || passwordStrength === 'strong' ?
                                 (passwordStrength === 'medium' ? theme.colors.warning[500] : theme.colors.success[500]) :
                                 theme.colors.gray[300]
                    }} />
                    <div style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: passwordStrength === 'strong' ? theme.colors.success[500] : theme.colors.gray[300]
                    }} />
                  </div>
                  <ModernBadge
                    variant={passwordStrength === 'weak' ? 'error' : passwordStrength === 'medium' ? 'warning' : 'success'}
                    size="small"
                  >
                    {passwordStrength === 'weak' ? 'ضعيفة' :
                     passwordStrength === 'medium' ? 'متوسطة' :
                     'قوية'}
                  </ModernBadge>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div style={{ position: 'relative' }}>
              <ModernInput
                type={showPasswords.confirm ? 'text' : 'password'}
                label="تأكيد كلمة المرور الجديدة"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange('confirmPassword')}
                disabled={changingPassword}
                required
                size="large"
                variant="outlined"
                validation={passwordErrors.confirmPassword ? 'error' : 'default'}
                helperText={passwordErrors.confirmPassword}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                disabled={changingPassword}
                style={{
                  position: 'absolute',
                  left: theme.spacing.md,
                  top: '45px',
                  background: 'none',
                  border: 'none',
                  cursor: changingPassword ? 'not-allowed' : 'pointer',
                  padding: theme.spacing.xs,
                  color: theme.colors.gray[500]
                }}
              >
                {showPasswords.confirm ?
                  <EyeSlashIcon style={{ width: '20px', height: '20px' }} /> :
                  <EyeIcon style={{ width: '20px', height: '20px' }} />
                }
              </button>
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: theme.spacing.md }}>
              <ModernButton
                variant="primary"
                size="large"
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                loading={changingPassword}
              >
                تغيير كلمة المرور
              </ModernButton>
            </div>
          </div>
        </div>
      </ModernCard>

      {/* =====================================================================
          PREVIEW MODAL
      ===================================================================== */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: theme.spacing['4xl']
          }}
          onClick={handleCancelPreview}
        >
          <ModernCard
            elevation="xl"
            padding="lg"
            style={{
              maxWidth: '500px',
              width: '100%',
              textAlign: 'center'
            }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: theme.fontSize.h3,
              fontWeight: theme.fontWeight.bold,
              marginBottom: theme.spacing.xl,
              fontFamily: theme.fonts.primary,
              color: theme.colors.gray[700]
            }}>
              معاينة الصورة الشخصية
            </h3>

            <img
              src={previewImage}
              alt="Preview"
              style={{
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                margin: `0 auto ${theme.spacing['3xl']}`,
                objectFit: 'cover',
                border: `4px solid ${theme.colors.primary[500]}`
              }}
            />

            <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'center' }}>
              <ModernButton
                variant="primary"
                size="large"
                onClick={handleUpload}
                disabled={uploading}
                loading={uploading}
              >
                حفظ الصورة
              </ModernButton>
              <ModernButton
                variant="secondary"
                size="large"
                onClick={handleCancelPreview}
                disabled={uploading}
              >
                إلغاء
              </ModernButton>
            </div>
          </ModernCard>
        </div>
      )}
    </div>
  );
};

export default memo(ProfileSettings);
