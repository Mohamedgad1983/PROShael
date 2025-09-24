# ⚙️ Settings Panel with RBAC Admin Interface - Al-Shuail System
## Critical Implementation Guide

---

## 🎯 **Settings Panel Architecture**

### **Panel Structure by Role:**

```javascript
const SettingsPanelByRole = {
  super_admin: [
    'system_settings',      // Database, security, backups
    'user_management',      // Create/edit users and roles
    'rbac_administration',  // Role permissions management
    'audit_logs',          // System activity monitoring
    'general_settings'      // Basic configuration
  ],
  
  financial_manager: [
    'financial_preferences', // Payment reminders, currency
    'notification_settings'  // Financial alerts only
  ],
  
  family_tree_admin: [
    'tree_preferences',     // Display options, privacy
    'notification_settings' // Tree update alerts only
  ],
  
  occasions_initiatives_diyas_admin: [
    'event_preferences',    // Default settings for events
    'notification_settings' // Event/initiative alerts only
  ],
  
  user_member: [
    'personal_preferences', // Language, notifications
    'privacy_settings',     // Personal data visibility
    'notification_settings' // Personal alerts only
  ]
};
```

---

## 🔐 **RBAC Administration Interface**

### **User Management Component:**

```jsx
// UserManagement.jsx - SUPER ADMIN ONLY
import React, { useState, useEffect } from 'react';
import { UserPlusIcon, PencilIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const roleLabels = {
    super_admin: 'المدير الأعلى',
    financial_manager: 'المدير المالي',
    family_tree_admin: 'مدير شجرة العائلة',
    occasions_initiatives_diyas_admin: 'مدير المناسبات والمبادرات والديات',
    user_member: 'عضو عادي'
  };

  const roleDescriptions = {
    super_admin: 'صلاحية كاملة على جميع أجزاء النظام',
    financial_manager: 'إدارة الاشتراكات والمدفوعات والتحصيل فقط',
    family_tree_admin: 'إدارة شجرة العائلة والعلاقات الأسرية فقط',
    occasions_initiatives_diyas_admin: 'إدارة المناسبات والمبادرات والديات فقط',
    user_member: 'الوصول للبيانات الشخصية فقط'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6" dir="rtl">
      
      {/* Header */}
      <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة المستخدمين والأدوار</h1>
            <p className="text-white/60 mt-1">تحكم في صلاحيات وأدوار أعضاء النظام</p>
          </div>
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-all"
          >
            <UserPlusIcon className="w-5 h-5" />
            إضافة مستخدم جديد
          </button>
        </div>
      </div>

      {/* Role Definitions Card */}
      <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">تعريف الأدوار والصلاحيات</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(roleLabels).map(([roleKey, roleLabel]) => (
            <div key={roleKey} className="bg-white/[0.05] border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheckIcon className="w-5 h-5 text-blue-400" />
                <h3 className="font-medium text-white">{roleLabel}</h3>
              </div>
              <p className="text-white/70 text-sm">{roleDescriptions[roleKey]}</p>
              <div className="mt-2">
                <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(roleKey)}`}>
                  {roleKey}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">المستخدمون الحاليون</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-right p-3 text-white/80">الاسم</th>
                <th className="text-right p-3 text-white/80">البريد الإلكتروني</th>
                <th className="text-right p-3 text-white/80">الهاتف</th>
                <th className="text-right p-3 text-white/80">الدور</th>
                <th className="text-right p-3 text-white/80">الحالة</th>
                <th className="text-right p-3 text-white/80">آخر دخول</th>
                <th className="text-right p-3 text-white/80">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-white">{user.full_name}</td>
                  <td className="p-3 text-white/80">{user.email}</td>
                  <td className="p-3 text-white/80">{user.phone}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user.role)}`}>
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.is_active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                    }`}>
                      {user.is_active ? 'نشط' : 'معطل'}
                    </span>
                  </td>
                  <td className="p-3 text-white/80">{formatDate(user.last_login)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => editUser(user)}
                        className="p-1 text-blue-400 hover:text-blue-300"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showAddUser && (
        <UserFormModal
          user={selectedUser}
          roles={Object.keys(roleLabels)}
          onClose={() => {
            setShowAddUser(false);
            setSelectedUser(null);
          }}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
};

const getRoleColor = (role) => {
  const colors = {
    super_admin: 'bg-purple-600/20 text-purple-400',
    financial_manager: 'bg-green-600/20 text-green-400',
    family_tree_admin: 'bg-blue-600/20 text-blue-400',
    occasions_initiatives_diyas_admin: 'bg-orange-600/20 text-orange-400',
    user_member: 'bg-gray-600/20 text-gray-400'
  };
  return colors[role] || 'bg-gray-600/20 text-gray-400';
};
```

### **System Settings Component:**

```jsx
// SystemSettings.jsx - SUPER ADMIN ONLY
const SystemSettings = () => {
  const [settings, setSettings] = useState({
    system_name: 'نظام إدارة عائلة الشعيل',
    default_language: 'ar',
    hijri_calendar_primary: true,
    session_timeout: 1440, // minutes
    max_login_attempts: 5,
    password_requirements: {
      min_length: 8,
      require_uppercase: true,
      require_numbers: true,
      require_special_chars: true
    },
    backup_settings: {
      auto_backup: true,
      backup_frequency: 'daily',
      retention_days: 30
    },
    security_settings: {
      two_factor_required: false,
      ip_whitelisting: false,
      audit_logging: true
    }
  });

  return (
    <div className="space-y-6">
      
      {/* General Settings */}
      <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">الإعدادات العامة</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-white/80 text-sm mb-2">اسم النظام</label>
            <input
              type="text"
              value={settings.system_name}
              onChange={(e) => updateSetting('system_name', e.target.value)}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-white/80 text-sm mb-2">اللغة الافتراضية</label>
            <select
              value={settings.default_language}
              onChange={(e) => updateSetting('default_language', e.target.value)}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.hijri_calendar_primary}
              onChange={(e) => updateSetting('hijri_calendar_primary', e.target.checked)}
              className="rounded"
            />
            <span className="text-white/80">استخدام التقويم الهجري كأساسي</span>
          </label>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">إعدادات الأمان</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-white/80 text-sm mb-2">مهلة انتهاء الجلسة (دقيقة)</label>
            <input
              type="number"
              value={settings.session_timeout}
              onChange={(e) => updateSetting('session_timeout', parseInt(e.target.value))}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-white/80 text-sm mb-2">الحد الأقصى لمحاولات تسجيل الدخول</label>
            <input
              type="number"
              value={settings.max_login_attempts}
              onChange={(e) => updateSetting('max_login_attempts', parseInt(e.target.value))}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.security_settings.two_factor_required}
              onChange={(e) => updateSecuritySetting('two_factor_required', e.target.checked)}
              className="rounded"
            />
            <span className="text-white/80">المصادقة الثنائية مطلوبة</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.security_settings.audit_logging}
              onChange={(e) => updateSecuritySetting('audit_logging', e.target.checked)}
              className="rounded"
            />
            <span className="text-white/80">تسجيل العمليات والأنشطة</span>
          </label>
        </div>
      </div>

      {/* Backup Settings */}
      <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">إعدادات النسخ الاحتياطي</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-white/80 text-sm mb-2">تكرار النسخ الاحتياطي</label>
            <select
              value={settings.backup_settings.backup_frequency}
              onChange={(e) => updateBackupSetting('backup_frequency', e.target.value)}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="daily">يومي</option>
              <option value="weekly">أسبوعي</option>
              <option value="monthly">شهري</option>
            </select>
          </div>
          <div>
            <label className="block text-white/80 text-sm mb-2">مدة الاحتفاظ (أيام)</label>
            <input
              type="number"
              value={settings.backup_settings.retention_days}
              onChange={(e) => updateBackupSetting('retention_days', parseInt(e.target.value))}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.backup_settings.auto_backup}
              onChange={(e) => updateBackupSetting('auto_backup', e.target.checked)}
              className="rounded"
            />
            <span className="text-white/80">النسخ الاحتياطي التلقائي</span>
          </label>
        </div>
        
        <div className="mt-4 flex gap-4">
          <button
            onClick={createBackupNow}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
          >
            إنشاء نسخة احتياطية الآن
          </button>
          <button
            onClick={restoreFromBackup}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
          >
            استعادة من النسخة الاحتياطية
          </button>
        </div>
      </div>

      {/* Save Settings */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all"
        >
          حفظ الإعدادات
        </button>
      </div>
    </div>
  );
};
```

### **Audit Logs Viewer:**

```jsx
// AuditLogs.jsx - SUPER ADMIN ONLY
const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    user_role: '',
    action_type: '',
    date_from: '',
    date_to: '',
    search: ''
  });

  const actionTypes = {
    'user_login': 'تسجيل دخول',
    'user_logout': 'تسجيل خروج',
    'member_create': 'إضافة عضو',
    'member_update': 'تعديل عضو',
    'member_delete': 'حذف عضو',
    'payment_record': 'تسجيل دفعة',
    'tree_update': 'تعديل شجرة العائلة',
    'occasion_create': 'إنشاء مناسبة',
    'initiative_create': 'إنشاء مبادرة',
    'diya_case_create': 'إنشاء قضية دية',
    'settings_update': 'تعديل الإعدادات',
    'role_change': 'تغيير دور المستخدم'
  };

  return (
    <div className="space-y-6">
      
      {/* Filters */}
      <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">تصفية السجلات</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-white/80 text-sm mb-2">دور المستخدم</label>
            <select
              value={filters.user_role}
              onChange={(e) => setFilters({...filters, user_role: e.target.value})}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="">جميع الأدوار</option>
              <option value="super_admin">المدير الأعلى</option>
              <option value="financial_manager">المدير المالي</option>
              <option value="family_tree_admin">مدير شجرة العائلة</option>
              <option value="occasions_initiatives_diyas_admin">مدير المناسبات والمبادرات والديات</option>
              <option value="user_member">عضو عادي</option>
            </select>
          </div>
          
          <div>
            <label className="block text-white/80 text-sm mb-2">نوع العملية</label>
            <select
              value={filters.action_type}
              onChange={(e) => setFilters({...filters, action_type: e.target.value})}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="">جميع العمليات</option>
              {Object.entries(actionTypes).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-white/80 text-sm mb-2">من تاريخ</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({...filters, date_from: e.target.value})}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>
          
          <div>
            <label className="block text-white/80 text-sm mb-2">إلى تاريخ</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({...filters, date_to: e.target.value})}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <input
            type="search"
            placeholder="البحث في السجلات..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">سجل العمليات</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-right p-3 text-white/80">الوقت</th>
                <th className="text-right p-3 text-white/80">المستخدم</th>
                <th className="text-right p-3 text-white/80">الدور</th>
                <th className="text-right p-3 text-white/80">العملية</th>
                <th className="text-right p-3 text-white/80">التفاصيل</th>
                <th className="text-right p-3 text-white/80">عنوان IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-white/80">{formatDateTime(log.created_at)}</td>
                  <td className="p-3 text-white">{log.user_email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(log.user_role)}`}>
                      {roleLabels[log.user_role]}
                    </span>
                  </td>
                  <td className="p-3 text-white">{actionTypes[log.action_type]}</td>
                  <td className="p-3 text-white/80">{log.details}</td>
                  <td className="p-3 text-white/60">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
```

---

## 🔧 **Backend API Implementation**

### **Settings API Routes:**

```javascript
// routes/settings.js
import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// System settings - Super Admin only
router.get('/system', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .single();
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

router.put('/system', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { data: settings } = await supabase
      .from('system_settings')
      .update(req.body)
      .single();
    
    // Log the settings change
    await logActivity(req.user.id, 'settings_update', 'System settings updated', req.ip);
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

// User management - Super Admin only
router.get('/users', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { data: users } = await supabase
      .from('users')
      .select('id, email, phone, role, is_active, created_at, last_login')
      .order('created_at', { ascending: false });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { email, phone, role, temporary_password } = req.body;
    
    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(temporary_password, 10);
    
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        email,
        phone,
        role,
        password_hash: hashedPassword,
        is_active: true
      })
      .single();
    
    // Log user creation
    await logActivity(req.user.id, 'user_create', `Created user: ${email} with role: ${role}`, req.ip);
    
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Audit logs - Super Admin only
router.get('/audit-logs', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const { user_role, action_type, date_from, date_to, search } = req.query;
    
    let query = supabase
      .from('audit_logs')
      .select('*, users(email, role)')
      .order('created_at', { ascending: false });
    
    if (user_role) query = query.eq('user_role', user_role);
    if (action_type) query = query.eq('action_type', action_type);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to);
    if (search) query = query.ilike('details', `%${search}%`);
    
    const { data: logs } = await query.limit(100);
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
```

### **Database Schema for Settings:**

```sql
-- System settings table
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name VARCHAR(255) DEFAULT 'نظام إدارة عائلة الشعيل',
  default_language VARCHAR(5) DEFAULT 'ar',
  hijri_calendar_primary BOOLEAN DEFAULT true,
  session_timeout INTEGER DEFAULT 1440, -- minutes
  max_login_attempts INTEGER DEFAULT 5,
  password_requirements JSONB DEFAULT '{
    "min_length": 8,
    "require_uppercase": true,
    "require_numbers": true,
    "require_special_chars": true
  }',
  backup_settings JSONB DEFAULT '{
    "auto_backup": true,
    "backup_frequency": "daily",
    "retention_days": 30
  }',
  security_settings JSONB DEFAULT '{
    "two_factor_required": false,
    "ip_whitelisting": false,
    "audit_logging": true
  }',
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  action_type VARCHAR(50) NOT NULL,
  details TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_role ON audit_logs(user_role);
```

---

## 🎯 **Implementation Checklist**

### **Priority 1 - Core Settings (3-4 hours):**
- [ ] Basic settings panel structure
- [ ] Role-based settings access
- [ ] User preferences by role
- [ ] Settings persistence

### **Priority 2 - RBAC Administration (4-5 hours):**
- [ ] User management interface
- [ ] Role assignment functionality
- [ ] Permission display and editing
- [ ] User creation and deletion

### **Priority 3 - System Administration (3-4 hours):**
- [ ] System configuration settings
- [ ] Security settings management
- [ ] Backup and restore functionality
- [ ] Performance monitoring

### **Priority 4 - Audit System (2-3 hours):**
- [ ] Audit logs viewer
- [ ] Activity filtering and search
- [ ] Export audit reports
- [ ] Real-time activity monitoring

**Total Estimated Time: 12-16 hours**

This Settings Panel provides comprehensive RBAC administration while maintaining the premium Apple-inspired design and proper role-based access control for the Al-Shuail family management system.
