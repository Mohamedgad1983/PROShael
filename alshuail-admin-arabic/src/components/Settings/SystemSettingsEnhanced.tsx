/**
 * Enhanced System Settings Component
 * Full API integration with validation and error handling
 */

import React, { useState, useEffect } from 'react';
import {
  ServerIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
// Import shared styles for consistent design
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, commonStyles, getMessageStyle } from './sharedStyles';
import { SettingsButton } from './shared';

interface SystemSettings {
  system_name: string;
  system_version: string;
  api_url: string;
  max_upload_size_mb: number;
  session_timeout: number;
  enable_notifications: boolean;
  enable_auto_backup: boolean;
  backup_frequency: string;
  maintenance_mode: boolean;
  debug_mode: boolean;
  password_requirements: {
    min_length: number;
    require_uppercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
  };
  backup_settings: {
    auto_backup: boolean;
    backup_frequency: string;
    retention_days: number;
  };
  security_settings: {
    two_factor_required: boolean;
    ip_whitelisting: boolean;
    audit_logging: boolean;
  };
}

const SystemSettingsEnhanced: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/settings/system`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = response.data.data || response.data;
      setSettings({
        system_name: data.system_name || 'نظام إدارة عائلة الشعيل',
        system_version: data.system_version || '2.0.1',
        api_url: data.api_url || API_BASE,
        max_upload_size_mb: data.max_upload_size_mb || 10,
        session_timeout: data.session_timeout || 1440,
        enable_notifications: data.enable_notifications !== false,
        enable_auto_backup: data.backup_settings?.auto_backup !== false,
        backup_frequency: data.backup_settings?.backup_frequency || 'daily',
        maintenance_mode: data.maintenance_mode || false,
        debug_mode: data.debug_mode || false,
        password_requirements: data.password_requirements || {
          min_length: 8,
          require_uppercase: true,
          require_numbers: true,
          require_special_chars: true
        },
        backup_settings: data.backup_settings || {
          auto_backup: true,
          backup_frequency: 'daily',
          retention_days: 30
        },
        security_settings: data.security_settings || {
          two_factor_required: false,
          ip_whitelisting: false,
          audit_logging: true
        }
      });
    } catch (err: any) {
      console.error('Failed to fetch settings:', err);
      setError(err.response?.data?.message || err.message || 'فشل تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const validateSettings = (): boolean => {
    const errors: Record<string, string> = {};

    if (!settings) return false;

    if (settings.session_timeout < 5 || settings.session_timeout > 10080) {
      errors.session_timeout = 'يجب أن تكون مدة الجلسة بين 5 دقائق و 7 أيام';
    }

    if (settings.max_upload_size_mb < 1 || settings.max_upload_size_mb > 100) {
      errors.max_upload_size_mb = 'يجب أن يكون حجم الرفع بين 1 و 100 ميجابايت';
    }

    if (settings.password_requirements.min_length < 6 || settings.password_requirements.min_length > 32) {
      errors.password_min_length = 'يجب أن يكون الحد الأدنى لطول كلمة المرور بين 6 و 32 حرف';
    }

    if (settings.backup_settings.retention_days < 1 || settings.backup_settings.retention_days > 365) {
      errors.retention_days = 'يجب أن تكون فترة الاحتفاظ بين 1 و 365 يوم';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!settings) return;

    if (!validateSettings()) {
      setError('يرجى تصحيح الأخطاء في النموذج');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');

      // Prepare payload
      const payload = {
        system_name: settings.system_name,
        api_url: settings.api_url,
        max_upload_size_mb: settings.max_upload_size_mb,
        session_timeout: settings.session_timeout,
        enable_notifications: settings.enable_notifications,
        maintenance_mode: settings.maintenance_mode,
        debug_mode: settings.debug_mode,
        password_requirements: settings.password_requirements,
        backup_settings: {
          auto_backup: settings.enable_auto_backup,
          backup_frequency: settings.backup_frequency,
          retention_days: settings.backup_settings.retention_days
        },
        security_settings: settings.security_settings
      };

      const response = await axios.put(`${API_BASE}/api/settings/system`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setSuccess('تم حفظ الإعدادات بنجاح');
      setTimeout(() => setSuccess(null), 5000);

      // Refresh settings
      await fetchSettings();
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'فشل حفظ الإعدادات';

      if (err.response?.data?.details) {
        const details = err.response.data.details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
        setError(`${errorMessage}: ${details}`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  // Use shared styles for consistent design
  const inputStyle: React.CSSProperties = {
    ...commonStyles.input
  };

  const errorInputStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: COLORS.error,
    background: COLORS.errorBg
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: SPACING.sm,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.gray700
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: SPACING['3xl'],
    padding: SPACING.xl,
    background: COLORS.gray100,
    borderRadius: BORDER_RADIUS.xl
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: SPACING['4xl'] }}>
        <ArrowPathIcon style={{ width: '40px', height: '40px', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: SPACING.xl, fontSize: TYPOGRAPHY.lg, color: COLORS.gray500 }}>
          جاري تحميل الإعدادات...
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div style={{ textAlign: 'center', padding: SPACING['4xl'] }}>
        <ExclamationCircleIcon style={{ width: '60px', height: '60px', margin: '0 auto', color: COLORS.error }} />
        <div style={{ marginTop: SPACING.xl, fontSize: TYPOGRAPHY.lg, color: COLORS.gray500 }}>
          فشل تحميل الإعدادات
        </div>
        <SettingsButton
          variant="primary"
          onClick={fetchSettings}
          style={{marginTop: SPACING.xl}}
        >
          إعادة المحاولة
        </SettingsButton>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: '30px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <ServerIcon style={{ width: '28px', height: '28px' }} />
        إعدادات النظام العامة
      </h2>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '16px',
          marginBottom: '20px',
          background: '#FEE2E2',
          border: '1px solid #EF4444',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#DC2626'
        }}>
          <ExclamationCircleIcon style={{ width: '24px', height: '24px', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div style={{
          padding: '16px',
          marginBottom: '20px',
          background: '#D1FAE5',
          border: '1px solid #10B981',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#065F46'
        }}>
          <CheckCircleIcon style={{ width: '24px', height: '24px', flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      {/* System Information */}
      <div style={sectionStyle}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CpuChipIcon style={{ width: '20px', height: '20px' }} />
          معلومات النظام
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={labelStyle}>اسم النظام</label>
            <input
              type="text"
              value={settings.system_name}
              onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>إصدار النظام</label>
            <input
              type="text"
              value={settings.system_version}
              readOnly
              style={{ ...inputStyle, backgroundColor: '#F3F4F6', cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label style={labelStyle}>رابط API</label>
            <input
              type="text"
              value={settings.api_url}
              onChange={(e) => setSettings({ ...settings, api_url: e.target.value })}
              style={inputStyle}
              dir="ltr"
            />
          </div>

          <div>
            <label style={labelStyle}>حجم الرفع الأقصى (MB)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.max_upload_size_mb}
              onChange={(e) => setSettings({ ...settings, max_upload_size_mb: parseInt(e.target.value) || 10 })}
              style={validationErrors.max_upload_size_mb ? errorInputStyle : inputStyle}
            />
            {validationErrors.max_upload_size_mb && (
              <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>
                {validationErrors.max_upload_size_mb}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div style={sectionStyle}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <ShieldCheckIcon style={{ width: '20px', height: '20px' }} />
          إعدادات الأمان
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={labelStyle}>مدة الجلسة (دقيقة)</label>
            <input
              type="number"
              min="5"
              max="10080"
              value={settings.session_timeout}
              onChange={(e) => setSettings({ ...settings, session_timeout: parseInt(e.target.value) || 1440 })}
              style={validationErrors.session_timeout ? errorInputStyle : inputStyle}
            />
            {validationErrors.session_timeout && (
              <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>
                {validationErrors.session_timeout}
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>تكرار النسخ الاحتياطي</label>
            <select
              value={settings.backup_frequency}
              onChange={(e) => setSettings({ ...settings, backup_frequency: e.target.value })}
              style={inputStyle}
            >
              <option value="hourly">كل ساعة</option>
              <option value="daily">يومياً</option>
              <option value="weekly">أسبوعياً</option>
              <option value="monthly">شهرياً</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>الحد الأدنى لطول كلمة المرور</label>
            <input
              type="number"
              min="6"
              max="32"
              value={settings.password_requirements.min_length}
              onChange={(e) => setSettings({
                ...settings,
                password_requirements: {
                  ...settings.password_requirements,
                  min_length: parseInt(e.target.value) || 8
                }
              })}
              style={validationErrors.password_min_length ? errorInputStyle : inputStyle}
            />
            {validationErrors.password_min_length && (
              <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>
                {validationErrors.password_min_length}
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>فترة الاحتفاظ بالنسخ (أيام)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.backup_settings.retention_days}
              onChange={(e) => setSettings({
                ...settings,
                backup_settings: {
                  ...settings.backup_settings,
                  retention_days: parseInt(e.target.value) || 30
                }
              })}
              style={validationErrors.retention_days ? errorInputStyle : inputStyle}
            />
            {validationErrors.retention_days && (
              <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>
                {validationErrors.retention_days}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'grid', gap: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.enable_auto_backup}
              onChange={(e) => setSettings({ ...settings, enable_auto_backup: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>تفعيل النسخ الاحتياطي التلقائي</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.password_requirements.require_uppercase}
              onChange={(e) => setSettings({
                ...settings,
                password_requirements: {
                  ...settings.password_requirements,
                  require_uppercase: e.target.checked
                }
              })}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>يتطلب أحرف كبيرة في كلمة المرور</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.password_requirements.require_numbers}
              onChange={(e) => setSettings({
                ...settings,
                password_requirements: {
                  ...settings.password_requirements,
                  require_numbers: e.target.checked
                }
              })}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>يتطلب أرقام في كلمة المرور</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.password_requirements.require_special_chars}
              onChange={(e) => setSettings({
                ...settings,
                password_requirements: {
                  ...settings.password_requirements,
                  require_special_chars: e.target.checked
                }
              })}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>يتطلب رموز خاصة في كلمة المرور</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.security_settings.audit_logging}
              onChange={(e) => setSettings({
                ...settings,
                security_settings: {
                  ...settings.security_settings,
                  audit_logging: e.target.checked
                }
              })}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>تفعيل سجلات التدقيق</span>
          </label>
        </div>
      </div>

      {/* System Status */}
      <div style={sectionStyle}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <ClockIcon style={{ width: '20px', height: '20px' }} />
          حالة النظام
        </h3>

        <div style={{ display: 'grid', gap: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>وضع الصيانة</span>
            {settings.maintenance_mode && (
              <span style={{
                padding: '4px 8px',
                background: '#FEE2E2',
                color: '#DC2626',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                نشط
              </span>
            )}
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.debug_mode}
              onChange={(e) => setSettings({ ...settings, debug_mode: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>وضع التطوير</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.enable_notifications}
              onChange={(e) => setSettings({ ...settings, enable_notifications: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>تفعيل الإشعارات</span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '30px'
      }}>
        <button
          onClick={fetchSettings}
          disabled={saving}
          style={{
            padding: '12px 30px',
            borderRadius: '12px',
            background: 'transparent',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            color: '#374151',
            fontSize: '14px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            opacity: saving ? 0.6 : 1
          }}
        >
          إعادة التحميل
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 30px',
            borderRadius: '12px',
            background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {saving && <ArrowPathIcon style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />}
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
};

export default SystemSettingsEnhanced;
