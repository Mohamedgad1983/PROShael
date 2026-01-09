# Feature 5: Settings Completion - Implementation Plan

**Date**: 2025-11-13
**Status**: Planning Complete - Ready for Implementation

---

## Overview

Implementing the three missing settings features identified by user:
1. **الإشعارات (Notifications Settings)**
2. **المظهر (Appearance/Theme Settings)**
3. **اللغة والمنطقة (Language & Region Settings)**

These are currently disabled placeholders in SettingsPage.tsx (lines 407-432).

---

## Feature 5.1: Notifications Settings

### Frontend Component
**File**: `alshuail-admin-arabic/src/components/Settings/NotificationsSettings.tsx`

**Features**:
- ✅ Email notifications toggle (enable/disable)
- ✅ SMS notifications toggle (enable/disable)
- ✅ Push notifications toggle (enable/disable)
- ✅ Notification types selection:
  - System updates
  - Security alerts
  - Member activities
  - Financial transactions
  - Family tree updates
- ✅ Notification frequency (instant, daily digest, weekly digest)
- ✅ Quiet hours configuration (start time, end time)
- ✅ Save preferences with backend persistence

### Backend Endpoint
**File**: `alshuail-backend/src/routes/profile.js`

**Endpoints**:
- `GET /api/user/profile/notification-settings` - Get current preferences
- `PUT /api/user/profile/notification-settings` - Update preferences

**Database**:
```sql
-- Add to users table (or create user_preferences table)
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "email_enabled": true,
  "sms_enabled": false,
  "push_enabled": true,
  "types": ["system", "security"],
  "frequency": "instant",
  "quiet_hours": {"start": "22:00", "end": "08:00"}
}'::jsonb;
```

---

## Feature 5.2: Appearance/Theme Settings

### Frontend Component
**File**: `alshuail-admin-arabic/src/components/Settings/AppearanceSettings.tsx`

**Features**:
- ✅ Theme selection (Light, Dark, Auto/System)
- ✅ Primary color picker (brand color customization)
- ✅ Sidebar position (Right/Left)
- ✅ Compact mode toggle (reduce spacing for more content)
- ✅ Font size adjustment (Small, Medium, Large)
- ✅ Animation preferences (Enable/Disable transitions)
- ✅ Live preview of theme changes
- ✅ Reset to defaults button

### Implementation Approach
**Use CSS Custom Properties + localStorage**:
```typescript
// Store theme in localStorage
const themeSettings = {
  mode: 'light' | 'dark' | 'auto',
  primaryColor: '#3B82F6',
  sidebarPosition: 'right' | 'left',
  compactMode: false,
  fontSize: 'medium',
  animationsEnabled: true
};

// Apply CSS variables dynamically
document.documentElement.style.setProperty('--primary-color', primaryColor);
document.documentElement.setAttribute('data-theme', mode);
```

### Backend Endpoint
**File**: `alshuail-backend/src/routes/profile.js`

**Endpoints**:
- `GET /api/user/profile/appearance-settings` - Get current theme
- `PUT /api/user/profile/appearance-settings` - Update theme

**Database**:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS appearance_settings JSONB DEFAULT '{
  "mode": "light",
  "primaryColor": "#3B82F6",
  "sidebarPosition": "right",
  "compactMode": false,
  "fontSize": "medium",
  "animationsEnabled": true
}'::jsonb;
```

---

## Feature 5.3: Language & Region Settings

### Frontend Component
**File**: `alshuail-admin-arabic/src/components/Settings/LanguageSettings.tsx`

**Features**:
- ✅ Language selection (Arabic, English, Both)
- ✅ Default language preference
- ✅ Region/Timezone selection
- ✅ Date format preference (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
- ✅ Time format (12-hour, 24-hour)
- ✅ Number format (Arabic numerals, Western numerals)
- ✅ Currency display (SAR, USD, etc.)
- ✅ First day of week (Saturday/Sunday)

### Backend Endpoint
**File**: `alshuail-backend/src/routes/profile.js`

**Endpoints**:
- `GET /api/user/profile/language-settings` - Get current preferences
- `PUT /api/user/profile/language-settings` - Update preferences

**Database**:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS language_settings JSONB DEFAULT '{
  "language": "ar",
  "region": "SA",
  "timezone": "Asia/Riyadh",
  "dateFormat": "DD/MM/YYYY",
  "timeFormat": "12h",
  "numberFormat": "western",
  "currency": "SAR",
  "weekStart": "saturday"
}'::jsonb;
```

---

## Implementation Order

### Phase 1: Notifications Settings (2-3 hours)
1. Create NotificationsSettings component
2. Add backend endpoints
3. Create database migration
4. Test and validate
5. Enable tab in SettingsPage.tsx

### Phase 2: Appearance Settings (2-3 hours)
1. Create AppearanceSettings component
2. Implement CSS variable system
3. Add backend endpoints
4. Create database migration
5. Test theme switching
6. Enable tab in SettingsPage.tsx

### Phase 3: Language & Region Settings (2-3 hours)
1. Create LanguageSettings component
2. Add backend endpoints
3. Create database migration
4. Implement format utilities
5. Test internationalization
6. Enable tab in SettingsPage.tsx

**Total Estimated Time**: 6-9 hours

---

## SettingsPage.tsx Changes

### Current (Disabled):
```typescript
// Lines 407-432
<button style={tabButtonStyle(false)} disabled title="قريباً">
  <BellIcon style={{ width: '20px', height: '20px', opacity: 0.5 }} />
  <span style={{ opacity: 0.5 }}>الإشعارات (قريباً)</span>
</button>
```

### After Implementation:
```typescript
// Add to SETTINGS_TABS_HARDCODED array
{
  id: 'notifications',
  label: 'إعدادات الإشعارات',
  icon: BellIcon,
  requiredRole: [], // Available to all users
  description: 'إدارة تفضيلات الإشعارات'
},
{
  id: 'appearance',
  label: 'المظهر والثيم',
  icon: PaintBrushIcon,
  requiredRole: [], // Available to all users
  description: 'تخصيص المظهر والألوان'
},
{
  id: 'language-region',
  label: 'اللغة والمنطقة',
  icon: GlobeAltIcon,
  requiredRole: [], // Available to all users
  description: 'إعدادات اللغة والتنسيق'
}

// Add to renderTabContent() switch
case 'notifications':
  return <NotificationsSettings />;
case 'appearance':
  return <AppearanceSettings />;
case 'language-region':
  return <LanguageSettings />;
```

---

## Database Migration

**File**: `alshuail-backend/migrations/[timestamp]_add_user_preferences.sql`

```sql
-- Add user preferences columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "email_enabled": true,
  "sms_enabled": false,
  "push_enabled": true,
  "types": ["system", "security"],
  "frequency": "instant",
  "quiet_hours": {"start": "22:00", "end": "08:00"}
}'::jsonb;

ALTER TABLE users ADD COLUMN IF NOT EXISTS appearance_settings JSONB DEFAULT '{
  "mode": "light",
  "primaryColor": "#3B82F6",
  "sidebarPosition": "right",
  "compactMode": false,
  "fontSize": "medium",
  "animationsEnabled": true
}'::jsonb;

ALTER TABLE users ADD COLUMN IF NOT EXISTS language_settings JSONB DEFAULT '{
  "language": "ar",
  "region": "SA",
  "timezone": "Asia/Riyadh",
  "dateFormat": "DD/MM/YYYY",
  "timeFormat": "12h",
  "numberFormat": "western",
  "currency": "SAR",
  "weekStart": "saturday"
}'::jsonb;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING gin (notification_settings, appearance_settings, language_settings);

-- Add updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Security Considerations

### Authentication
- ✅ All endpoints require JWT authentication
- ✅ Users can only modify their own settings
- ✅ No admin override for personal preferences

### Validation
- ✅ Validate all input values
- ✅ Sanitize user-provided content
- ✅ Enforce allowed values for enums (theme mode, language, etc.)
- ✅ Validate color codes in appearance settings

### Rate Limiting
- ✅ Apply rate limiting (10 updates per hour per user)
- ✅ Prevent rapid-fire setting changes

---

## Testing Strategy

### Frontend Testing
1. **Notifications Settings**:
   - Toggle each notification type
   - Change frequency settings
   - Set quiet hours
   - Verify form validation
   - Test save and reload

2. **Appearance Settings**:
   - Switch themes (light/dark/auto)
   - Change primary color
   - Toggle compact mode
   - Adjust font size
   - Test live preview
   - Verify persistence

3. **Language Settings**:
   - Change language preference
   - Select different regions
   - Test date/time formats
   - Verify number formatting
   - Test currency display

### Backend Testing
1. **GET Endpoints**: Retrieve default settings for new users
2. **PUT Endpoints**: Update each setting type
3. **Validation**: Test invalid inputs
4. **Authentication**: Verify JWT required
5. **Authorization**: Ensure users can only modify own settings

### Integration Testing
1. Settings persist after logout/login
2. Settings sync across browser tabs
3. Theme applies immediately
4. Notification preferences affect actual notifications
5. Language changes reflect in UI

---

## Deliverables

### Frontend Components (3 files)
1. `NotificationsSettings.tsx` - Notification preferences UI
2. `AppearanceSettings.tsx` - Theme customization UI
3. `LanguageSettings.tsx` - Language/region preferences UI

### Backend Routes (1 file)
1. `profile.js` - Add 6 new endpoints (GET/PUT for each setting type)

### Database Migration (1 file)
1. Migration script to add preference columns

### Documentation (1 file)
1. Feature 5 implementation summary with usage guide

### Updated Files
1. `SettingsPage.tsx` - Enable new tabs and routing

**Total New Files**: 5
**Total Modified Files**: 2

---

## Success Criteria

✅ All three settings tabs functional and accessible
✅ Settings persist in database
✅ Settings apply immediately to UI
✅ Backend validation working
✅ Frontend form validation working
✅ No console errors
✅ Responsive design on mobile
✅ Bilingual support (Arabic/English)
✅ User acceptance testing passed

---

## Next Steps

**Ready to proceed with implementation?**

The plan is complete. I can start implementing in this order:
1. Database migration first
2. Backend endpoints
3. Frontend components (one at a time)
4. Integration testing
5. Deployment

**Estimated Total Time**: 6-9 hours across 3 phases

Would you like me to start with Phase 1 (Notifications Settings)?
