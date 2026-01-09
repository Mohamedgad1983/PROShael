# Feature 2: Profile Info Editing - Implementation Plan

**Date**: 2025-11-12
**Priority**: Priority 1 (Critical User Feature)
**Dependencies**: Feature 1 (Avatar Upload) - Complete ✅
**Status**: 📋 Planning Phase

---

## 🎯 FEATURE OVERVIEW

Enable users to edit their personal profile information with proper validation, conflict detection, and security measures.

**User Story**:
> As a user, I want to edit my profile information (name, email, phone) so that I can keep my account details up to date.

**Current State**:
- ✅ Profile display working (read-only)
- ✅ Avatar upload/delete working
- ❌ Info editing disabled ("سيتم إضافة إمكانية تعديل المعلومات الشخصية قريباً")
- ⚠️ PUT endpoint exists but incomplete

---

## 📊 SCOPE DEFINITION

### In Scope ✅
1. **Editable Fields**:
   - Full name (Arabic)
   - Full name (English) - if applicable
   - Email address
   - Phone number

2. **Backend Features**:
   - Field validation (format, length, required)
   - Uniqueness checks (email, phone)
   - Database updates (users + profiles tables)
   - Error handling and rollback

3. **Frontend Features**:
   - Edit mode toggle
   - Inline validation with Arabic messages
   - Conflict detection and display
   - Success/error feedback
   - Loading states

4. **Security**:
   - JWT authentication
   - User can only edit own profile
   - Email verification workflow (optional)
   - Audit logging of changes

### Out of Scope ❌
1. Password change (separate security feature)
2. Role/permission editing (admin-only)
3. Member ID changes (system-managed)
4. Email verification sending (future enhancement)
5. Profile deletion/deactivation

---

## 🗄️ DATABASE ARCHITECTURE REVIEW

### Current Tables

**`profiles` table** (Primary):
```sql
Columns:
- id (uuid, PK)
- email (text)
- full_name (text) -- Arabic name
- full_name_en (text) -- English name
- role (text)
- status (text)
- created_at (timestamp)
- updated_at (timestamp)
- role_id (uuid, FK)
- member_id (uuid, FK)
```

**`users` table** (public.users):
```sql
Columns:
- id (uuid, PK)
- email (text)
- phone (text)
- role (text)
- is_active (boolean)
- created_at (timestamp)
- updated_at (timestamp)
- full_name_ar (text)
- full_name_en (text)
- member_id (uuid, FK)
```

**`user_details` view** (Read-only):
```sql
SELECT
  p.id, p.email, p.full_name,
  m.phone,
  m.profile_image_url AS avatar_url,
  p.role, ur.role_name_ar, ...
FROM profiles p
LEFT JOIN user_roles ur ON (ur.role_name = p.role)
LEFT JOIN members m ON (m.id = p.member_id)
```

### Update Strategy

**Identified Issue**: Data is split across multiple tables
- Email/Name: Could be in `users` OR `profiles`
- Phone: In `members` table
- Need to determine authoritative source for each field

**Recommended Approach**:
1. **Primary updates**: `profiles` table (user-facing data)
2. **Sync updates**: `users` table (if exists)
3. **Member updates**: `members` table for phone only
4. **Use transactions**: Ensure atomicity across tables

---

## 🔧 BACKEND IMPLEMENTATION

### 1. Enhanced PUT /api/user/profile Endpoint

**Location**: `alshuail-backend/src/routes/profile.js` (lines 290-352)

**Current State**: Basic structure exists, needs enhancement

**Required Changes**:

```javascript
router.put('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, full_name_en, email, phone } = req.body;

    // 1. Validation
    const validationErrors = validateProfileUpdates({
      full_name, full_name_en, email, phone
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        message_en: 'Invalid data',
        errors: validationErrors
      });
    }

    // 2. Check for changes
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('full_name, full_name_en, email, member_id')
      .eq('id', userId)
      .maybeSingle();

    if (!currentProfile) {
      return res.status(404).json({
        success: false,
        message: 'الملف الشخصي غير موجود',
        message_en: 'Profile not found'
      });
    }

    const hasChanges =
      full_name !== currentProfile.full_name ||
      full_name_en !== currentProfile.full_name_en ||
      email !== currentProfile.email;

    if (!hasChanges && !phone) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم تقديم أي تحديثات',
        message_en: 'No updates provided'
      });
    }

    // 3. Uniqueness checks (if email changed)
    if (email && email !== currentProfile.email) {
      const { data: emailExists } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .neq('id', userId)
        .maybeSingle();

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'البريد الإلكتروني مستخدم بالفعل',
          message_en: 'Email already in use',
          field: 'email'
        });
      }
    }

    // 4. Phone uniqueness check (if phone changed)
    if (phone && currentProfile.member_id) {
      const { data: currentMember } = await supabase
        .from('members')
        .select('phone')
        .eq('id', currentProfile.member_id)
        .maybeSingle();

      if (phone !== currentMember?.phone) {
        const { data: phoneExists } = await supabase
          .from('members')
          .select('id')
          .eq('phone', phone)
          .neq('id', currentProfile.member_id)
          .maybeSingle();

        if (phoneExists) {
          return res.status(409).json({
            success: false,
            message: 'رقم الهاتف مستخدم بالفعل',
            message_en: 'Phone number already in use',
            field: 'phone'
          });
        }
      }
    }

    // 5. Begin transaction-like updates
    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (full_name_en !== undefined) updates.full_name_en = full_name_en;
    if (email !== undefined) updates.email = email;
    updates.updated_at = new Date().toISOString();

    // Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (profileError) {
      log.error('Profile update error:', profileError);
      throw profileError;
    }

    // Update members table (phone)
    if (phone && currentProfile.member_id) {
      const { error: memberError } = await supabase
        .from('members')
        .update({
          phone: phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentProfile.member_id);

      if (memberError) {
        log.error('Member phone update error:', memberError);
        // Rollback profile update? Or just log warning?
        throw memberError;
      }
    }

    // 6. Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'profile_update',
        entity_type: 'profile',
        entity_id: userId,
        changes: updates,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

    // 7. Return updated profile
    const { data: updatedProfile } = await supabase
      .from('user_details')
      .select('id, email, full_name, full_name_en, phone, avatar_url, role, role_name_ar')
      .eq('id', userId)
      .maybeSingle();

    log.info(`Profile updated for user ${userId}`);

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      message_en: 'Profile updated successfully',
      data: updatedProfile
    });
  } catch (error) {
    log.error('Error in PUT /profile:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث الملف الشخصي',
      message_en: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
```

### 2. Validation Helper Function

**New file**: `alshuail-backend/src/utils/profileValidation.js`

```javascript
/**
 * Validate profile update data
 */
export function validateProfileUpdates(data) {
  const errors = [];

  // Full name validation (Arabic)
  if (data.full_name !== undefined) {
    if (!data.full_name || data.full_name.trim().length === 0) {
      errors.push({
        field: 'full_name',
        message: 'الاسم الكامل مطلوب',
        message_en: 'Full name is required'
      });
    } else if (data.full_name.length < 3) {
      errors.push({
        field: 'full_name',
        message: 'الاسم يجب أن يكون 3 أحرف على الأقل',
        message_en: 'Name must be at least 3 characters'
      });
    } else if (data.full_name.length > 100) {
      errors.push({
        field: 'full_name',
        message: 'الاسم يجب ألا يتجاوز 100 حرف',
        message_en: 'Name must not exceed 100 characters'
      });
    }
  }

  // Full name English validation (optional)
  if (data.full_name_en !== undefined && data.full_name_en) {
    if (data.full_name_en.length > 100) {
      errors.push({
        field: 'full_name_en',
        message: 'الاسم الإنجليزي يجب ألا يتجاوز 100 حرف',
        message_en: 'English name must not exceed 100 characters'
      });
    }
  }

  // Email validation
  if (data.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      errors.push({
        field: 'email',
        message: 'البريد الإلكتروني غير صالح',
        message_en: 'Invalid email address'
      });
    } else if (data.email.length > 255) {
      errors.push({
        field: 'email',
        message: 'البريد الإلكتروني يجب ألا يتجاوز 255 حرف',
        message_en: 'Email must not exceed 255 characters'
      });
    }
  }

  // Phone validation (Saudi format)
  if (data.phone !== undefined && data.phone) {
    const phoneRegex = /^(05|5)[0-9]{8}$/;
    if (!phoneRegex.test(data.phone)) {
      errors.push({
        field: 'phone',
        message: 'رقم الهاتف يجب أن يكون بصيغة سعودية صحيحة (05xxxxxxxx)',
        message_en: 'Phone must be a valid Saudi number (05xxxxxxxx)'
      });
    }
  }

  return errors;
}
```

---

## 🎨 FRONTEND IMPLEMENTATION

### 1. Enhanced ProfileSettings Component

**Location**: `alshuail-admin-arabic/src/components/Settings/ProfileSettings.tsx`

**Required Changes**:

**Add State for Edit Mode**:
```typescript
const [editMode, setEditMode] = useState(false);
const [formData, setFormData] = useState({
  full_name: '',
  full_name_en: '',
  email: '',
  phone: ''
});
const [originalData, setOriginalData] = useState({});
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
const [saving, setSaving] = useState(false);
```

**Initialize Form Data**:
```typescript
useEffect(() => {
  if (user) {
    const data = {
      full_name: user.name || '',
      full_name_en: user.name_en || '',
      email: user.email || '',
      phone: user.phone || ''
    };
    setFormData(data);
    setOriginalData(data);
  }
}, [user]);
```

**Add Input Change Handler**:
```typescript
const handleInputChange = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));

  // Clear field error when user starts typing
  if (fieldErrors[field]) {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }
};
```

**Add Save Handler**:
```typescript
const handleSave = async () => {
  try {
    setSaving(true);
    setMessage(null);
    setFieldErrors({});

    // Check if there are actual changes
    const hasChanges = Object.keys(formData).some(
      key => formData[key] !== originalData[key]
    );

    if (!hasChanges) {
      setMessage({
        type: 'info',
        text: 'لم يتم إجراء أي تغييرات'
      });
      setEditMode(false);
      setSaving(false);
      return;
    }

    const token = localStorage.getItem('token');
    const response = await axios.put(
      `${API_BASE}/api/user/profile`,
      formData,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (response.data.success) {
      setOriginalData(formData);
      setEditMode(false);
      setMessage({
        type: 'success',
        text: 'تم تحديث المعلومات بنجاح'
      });

      // Refresh user context
      await refreshUserRole();
    }
  } catch (error: any) {
    console.error('Profile update error:', error);

    if (error.response?.status === 409) {
      // Conflict error (duplicate email/phone)
      const conflictField = error.response.data.field;
      setFieldErrors({
        [conflictField]: error.response.data.message
      });
      setMessage({
        type: 'error',
        text: error.response.data.message
      });
    } else if (error.response?.status === 400 && error.response.data.errors) {
      // Validation errors
      const errors: Record<string, string> = {};
      error.response.data.errors.forEach((err: any) => {
        errors[err.field] = err.message;
      });
      setFieldErrors(errors);
      setMessage({
        type: 'error',
        text: 'يرجى تصحيح الأخطاء في النموذج'
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
```

**Add Cancel Handler**:
```typescript
const handleCancel = () => {
  setFormData(originalData);
  setFieldErrors({});
  setMessage(null);
  setEditMode(false);
};
```

**Update JSX for Edit Mode**:
```typescript
// Replace read-only inputs with editable ones
<SettingsInput
  label="الاسم الكامل"
  value={formData.full_name}
  onChange={(e) => handleInputChange('full_name', e.target.value)}
  disabled={!editMode || saving}
  error={fieldErrors.full_name}
  required
/>

<SettingsInput
  label="الاسم بالإنجليزية (اختياري)"
  value={formData.full_name_en}
  onChange={(e) => handleInputChange('full_name_en', e.target.value)}
  disabled={!editMode || saving}
  error={fieldErrors.full_name_en}
/>

<SettingsInput
  label="البريد الإلكتروني"
  type="email"
  value={formData.email}
  onChange={(e) => handleInputChange('email', e.target.value)}
  disabled={!editMode || saving}
  error={fieldErrors.email}
  required
/>

<SettingsInput
  label="رقم الهاتف"
  value={formData.phone}
  onChange={(e) => handleInputChange('phone', e.target.value)}
  disabled={!editMode || saving}
  error={fieldErrors.phone}
  placeholder="05xxxxxxxx"
/>
```

**Add Edit/Save/Cancel Buttons**:
```typescript
<div style={{ display: 'flex', gap: SPACING.md, marginTop: SPACING.xl }}>
  {!editMode ? (
    <SettingsButton
      variant="primary"
      onClick={() => setEditMode(true)}
    >
      <PencilIcon style={{ width: '20px', height: '20px' }} />
      تعديل المعلومات
    </SettingsButton>
  ) : (
    <>
      <SettingsButton
        variant="primary"
        onClick={handleSave}
        disabled={saving}
        loading={saving}
      >
        <CheckCircleIcon style={{ width: '20px', height: '20px' }} />
        {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
      </SettingsButton>
      <SettingsButton
        variant="secondary"
        onClick={handleCancel}
        disabled={saving}
      >
        <XMarkIcon style={{ width: '20px', height: '20px' }} />
        إلغاء
      </SettingsButton>
    </>
  )}
</div>
```

### 2. Enhanced SettingsInput Component

**Update**: `alshuail-admin-arabic/src/components/Settings/shared/SettingsInput.tsx`

**Add Error Display**:
```typescript
interface SettingsInputProps {
  label: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: string; // NEW
  required?: boolean; // NEW
  type?: string;
  placeholder?: string;
}

export const SettingsInput: React.FC<SettingsInputProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  error,
  required = false,
  type = 'text',
  placeholder
}) => {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: SPACING.lg,
    border: error
      ? `2px solid ${COLORS.error}`
      : `1px solid ${COLORS.border}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: TYPOGRAPHY.base,
    backgroundColor: disabled ? COLORS.gray100 : COLORS.white,
    color: disabled ? COLORS.gray400 : COLORS.gray900,
    cursor: disabled ? 'not-allowed' : 'text',
    transition: 'border-color 0.2s ease',
    direction: 'rtl'
  };

  return (
    <div style={{ marginBottom: SPACING.lg }}>
      <label style={{
        display: 'block',
        marginBottom: SPACING.sm,
        fontSize: TYPOGRAPHY.sm,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.gray700
      }}>
        {label}
        {required && <span style={{ color: COLORS.error, marginRight: SPACING.xs }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        style={inputStyle}
      />
      {error && (
        <div style={{
          marginTop: SPACING.sm,
          fontSize: TYPOGRAPHY.sm,
          color: COLORS.errorText,
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.xs
        }}>
          <ExclamationCircleIcon style={{ width: '16px', height: '16px' }} />
          {error}
        </div>
      )}
    </div>
  );
};
```

---

## 🧪 TESTING PLAN

### Backend Tests

**1. Validation Tests**:
```bash
# Test invalid email
curl -X PUT "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email"}'
# Expected: 400 with validation error

# Test short name
curl -X PUT "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name": "ab"}'
# Expected: 400 with validation error

# Test invalid Saudi phone
curl -X PUT "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "1234567890"}'
# Expected: 400 with validation error
```

**2. Uniqueness Tests**:
```bash
# Test duplicate email
curl -X PUT "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "existing@alshuail.com"}'
# Expected: 409 conflict error

# Test duplicate phone
curl -X PUT "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "0550000001"}'
# Expected: 409 conflict error
```

**3. Success Tests**:
```bash
# Test valid update
curl -X PUT "http://localhost:3001/api/user/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "محمد أحمد السديري",
    "full_name_en": "Mohammed Ahmed",
    "email": "new-email@alshuail.com",
    "phone": "0551234567"
  }'
# Expected: 200 with updated profile data
```

### Frontend Tests

**Manual UI Testing Scenarios** (10 tests):

1. **Enter Edit Mode**: Click "تعديل المعلومات" → fields become editable
2. **Cancel Without Changes**: Click "إلغاء" → returns to read-only mode
3. **Save Without Changes**: No edits → shows info message
4. **Update Name**: Change name → Save → Success message + data persists
5. **Update Email**: Change to new email → Save → Success + context refreshed
6. **Duplicate Email**: Use existing email → Save → Error shown on email field
7. **Invalid Email**: Enter "test@" → Save → Validation error
8. **Invalid Phone**: Enter "123" → Save → Validation error
9. **Update Multiple Fields**: Change name + email + phone → Save → All updated
10. **Server Error Handling**: Disconnect internet → Save → Error message shown

---

## 📈 IMPLEMENTATION TIMELINE

### Phase 1: Backend (Estimated: 2-3 hours)
- [  ] Create validation utility function
- [  ] Enhance PUT endpoint with full logic
- [  ] Add uniqueness checks
- [  ] Add audit logging
- [  ] Test all backend scenarios

### Phase 2: Frontend (Estimated: 2-3 hours)
- [  ] Add edit mode state management
- [  ] Implement form handlers (save, cancel, change)
- [  ] Update ProfileSettings UI with edit mode
- [  ] Enhance SettingsInput with error display
- [  ] Add loading states

### Phase 3: Testing (Estimated: 1 hour)
- [  ] Backend endpoint tests (curl)
- [  ] Frontend UI tests (manual)
- [  ] Integration tests (end-to-end)
- [  ] Cross-browser validation

### Phase 4: Documentation (Estimated: 30 min)
- [  ] Update API documentation
- [  ] Create user guide
- [  ] Write testing report

**Total Estimated Time**: 5-7 hours

---

## 🔒 SECURITY CONSIDERATIONS

### Authentication
- ✅ JWT token required
- ✅ User can only edit own profile
- ✅ Token validated on every request

### Validation
- ✅ Server-side validation (never trust client)
- ✅ Field-level validation
- ✅ Type checking
- ✅ Length limits enforced

### Data Integrity
- ✅ Uniqueness constraints (email, phone)
- ✅ Transaction-like updates (rollback on error)
- ✅ Audit trail logging

### Privacy
- ✅ No sensitive data in logs
- ✅ User agent + IP logged for security
- ✅ Error messages don't leak data

---

## 🎯 SUCCESS CRITERIA

### Backend
- [  ] All validation rules enforced
- [  ] Uniqueness checks working
- [  ] Updates applied to correct tables
- [  ] Audit logs created
- [  ] No 500 errors under normal operation

### Frontend
- [  ] Edit mode toggle working
- [  ] All fields editable
- [  ] Validation errors displayed clearly
- [  ] Success/error messages shown
- [  ] Context refreshed after save
- [  ] No console errors

### User Experience
- [  ] Clear feedback on all actions
- [  ] Loading states during operations
- [  ] Error messages in Arabic
- [  ] Smooth transitions between modes
- [  ] Data persists after page refresh

---

## 📋 DEPENDENCIES

### Backend
- ✅ Supabase client configured
- ✅ JWT authentication working
- ✅ profiles/users/members tables exist
- ✅ audit_logs table available

### Frontend
- ✅ ProfileSettings component exists
- ✅ Shared components (SettingsInput, SettingsButton) available
- ✅ RoleContext with refreshUserRole() working
- ✅ Axios configured with proper base URL

### External
- ⚠️ Test database with profile/member data (needed for full testing)

---

**STATUS**: 📋 Ready for Implementation
**NEXT STEP**: Begin Phase 1 - Backend validation utility
