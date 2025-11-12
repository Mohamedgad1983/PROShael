/**
 * Profile Settings Component
 * Allows users to manage their profile information and avatar
 */

import React, { useState, useRef, useEffect } from 'react';
import { UserIcon, PhotoIcon, XMarkIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useRole } from '../../contexts/RoleContext';
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

const ProfileSettings: React.FC = () => {
  const { user, refreshUserRole } = useRole();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        setAvatarUrl(response.data.data.avatar_url);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
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
      console.error('Avatar upload error:', error);
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
      console.error('Avatar remove error:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'فشل في حذف الصورة'
      });
    } finally {
      setUploading(false);
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
              <span>{getInitials(user?.name)}</span>
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

        {/* User Info (Read-only for now) */}
        <div style={{ marginTop: SPACING['4xl'], paddingTop: SPACING['4xl'], borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.semibold, marginBottom: SPACING.xl, color: COLORS.gray900 }}>
            المعلومات الشخصية
          </div>

          <div style={{ display: 'grid', gap: SPACING.lg }}>
            <SettingsInput
              label="الاسم الكامل"
              value={user?.name || ''}
              disabled
            />
            <SettingsInput
              label="البريد الإلكتروني"
              value={user?.email || ''}
              disabled
            />
            <SettingsInput
              label="رقم الهاتف"
              value={user?.phone || ''}
              disabled
            />
            <SettingsInput
              label="الدور"
              value={user?.roleAr || user?.role || ''}
              disabled
            />
          </div>

          <div style={{
            marginTop: SPACING.xl,
            padding: SPACING.lg,
            background: COLORS.infoBg,
            borderRadius: BORDER_RADIUS.md,
            fontSize: TYPOGRAPHY.sm,
            color: COLORS.infoText
          }}>
            💡 سيتم إضافة إمكانية تعديل المعلومات الشخصية قريباً
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
                loading={uploading}
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
