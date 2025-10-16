/**
 * System Settings Component
 * General system configuration and settings
 */

import React, { useState } from 'react';
import {
  ServerIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    systemName: 'نظام إدارة عائلة الشعيل',
    systemVersion: '2.0.1',
    apiUrl: 'http://localhost:3001',
    maxUploadSize: '10',
    sessionTimeout: '30',
    enableNotifications: true,
    enableAutoBackup: true,
    backupFrequency: 'daily',
    maintenanceMode: false,
    debugMode: false
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Save settings API call
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s ease'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '30px',
    padding: '20px',
    background: 'rgba(0, 0, 0, 0.02)',
    borderRadius: '16px'
  };

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
              value={settings.systemName}
              onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>إصدار النظام</label>
            <input
              type="text"
              value={settings.systemVersion}
              readOnly
              style={{ ...inputStyle, backgroundColor: '#F3F4F6', cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label style={labelStyle}>رابط API</label>
            <input
              type="text"
              value={settings.apiUrl}
              onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
              style={inputStyle}
              dir="ltr"
            />
          </div>

          <div>
            <label style={labelStyle}>حجم الرفع الأقصى (MB)</label>
            <input
              type="number"
              value={settings.maxUploadSize}
              onChange={(e) => setSettings({ ...settings, maxUploadSize: e.target.value })}
              style={inputStyle}
            />
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
              value={settings.sessionTimeout}
              onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>تكرار النسخ الاحتياطي</label>
            <select
              value={settings.backupFrequency}
              onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
              style={inputStyle}
            >
              <option value="hourly">كل ساعة</option>
              <option value="daily">يومياً</option>
              <option value="weekly">أسبوعياً</option>
              <option value="monthly">شهرياً</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={settings.enableAutoBackup}
              onChange={(e) => setSettings({ ...settings, enableAutoBackup: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>تفعيل النسخ الاحتياطي التلقائي</span>
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
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>وضع الصيانة</span>
            {settings.maintenanceMode && (
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

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={settings.debugMode}
              onChange={(e) => setSettings({ ...settings, debugMode: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>وضع التطوير</span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={settings.enableNotifications}
              onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
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
        {saved && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: '#D1FAE5',
            color: '#065F46',
            borderRadius: '12px',
            fontSize: '14px'
          }}>
            <CheckCircleIcon style={{ width: '20px', height: '20px' }} />
            تم الحفظ بنجاح
          </div>
        )}

        <button
          onClick={handleSave}
          style={{
            padding: '12px 30px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          حفظ الإعدادات
        </button>
      </div>
    </div>
  );
};

export default SystemSettings;