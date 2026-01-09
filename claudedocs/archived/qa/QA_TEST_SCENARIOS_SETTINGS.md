# Comprehensive QA Test Scenarios - Settings & Multi-Role Management
**Version**: 1.0
**Date**: November 8, 2025
**System**: Al-Shuail Family Management System

## 1. User Management Tab Tests

### Scenario 1.1: View User List
**Objective**: Verify user list displays correctly with all information
```
Given: Admin is logged in and on Settings page
When: User Management tab is selected
Then:
  - User table displays with columns: User, Current Role, Status, Join Date, Last Login, Actions
  - All users are listed with accurate information
  - Arabic text displays correctly (RTL layout)
  - Role badges show appropriate colors
```

### Scenario 1.2: Search Users
**Test Cases**:
| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| TC1.2.1 | Search by name "أحمد" | Shows only users with أحمد in name |
| TC1.2.2 | Search by email "admin@" | Shows users with matching email pattern |
| TC1.2.3 | Search by phone "055" | Shows users with matching phone prefix |
| TC1.2.4 | Search empty string | Shows all users |
| TC1.2.5 | Search non-existent user | Shows "لا توجد نتائج" message |

### Scenario 1.3: Filter by Role
```
Given: User list is displayed
When: Role filter dropdown is used
Then:
  - Selecting "المدير الأعلى" shows only super admins
  - Selecting "المدير المالي" shows only financial managers
  - Selecting "كل الأدوار" shows all users
  - User count updates correctly for each filter
```

### Scenario 1.4: Add New User
**Positive Test**:
```
Given: Admin clicks "إضافة مستخدم"
When: Modal opens
And: Valid data entered:
  - Full Name: محمد أحمد الشعيل
  - Email: test@alshuail.com
  - Phone: 0551234567
  - Password: Test@12345
  - Role: عضو عادي
Then:
  - User created successfully
  - Success notification appears
  - User appears in list
  - Can login with new credentials
```

**Negative Tests**:
| Test Case | Invalid Input | Expected Error |
|-----------|--------------|----------------|
| TC1.4.1 | Duplicate email | "البريد الإلكتروني مستخدم بالفعل" |
| TC1.4.2 | Invalid phone format | "رقم الهاتف غير صحيح" |
| TC1.4.3 | Weak password | "كلمة المرور ضعيفة" |
| TC1.4.4 | Missing required fields | "الرجاء ملء جميع الحقول المطلوبة" |

### Scenario 1.5: Edit User
```
Given: User exists in system
When: Admin clicks edit icon for user
Then:
  - Edit modal opens with current data pre-filled
  - Can modify: Name, Email, Phone, Role, Status
  - Cannot modify: Join Date, User ID
  - Changes save successfully
  - Audit log records modification
```

### Scenario 1.6: Deactivate/Activate User
```
Given: Active user in list
When: Admin toggles status switch
Then:
  - Confirmation dialog appears
  - On confirm: User status changes
  - Deactivated user cannot login
  - Can reactivate user
  - Status badge updates (نشط/غير نشط)
```

## 2. Multi-Role Management Tab Tests

### Scenario 2.1: Access Multi-Role Tab
```
Given: Super admin logged in
When: Navigate to Settings → Multi-Role Management
Then:
  - Tab appears in sidebar as "إدارة الأدوار المتعددة"
  - Tab is accessible only to super_admin role
  - Other roles don't see this tab
```

### Scenario 2.2: Search Members for Role Assignment
**Test Flow**:
```
Given: On Multi-Role Management page
When: Type in search box "محمد"
Then:
  - Autocomplete shows matching members
  - Display shows: Name, Email, Phone, Current Role, Member Number
  - Minimum 2 characters required for search
  - Shows max 20 results
  - Can select member from dropdown
```

**Edge Cases**:
| Test Case | Scenario | Expected Result |
|-----------|----------|-----------------|
| TC2.2.1 | Search with 1 character | No search triggered |
| TC2.2.2 | Search special characters | Sanitized, no SQL injection |
| TC2.2.3 | Search Arabic text | Works correctly with RTL |
| TC2.2.4 | Rapid typing | Debounced API calls |

### Scenario 2.3: Assign Role with Hijri Date Period
**Positive Test - Complete Flow**:
```
Given: Member selected (محمد أحمد)
When: Assign new role
  Step 1: Select Role = "المدير المالي"
  Step 2: Set Hijri Start Date = "١ محرم ١٤٤٧"
  Step 3: Set Hijri End Date = "٣٠ ذو الحجة ١٤٤٧"
  Step 4: Add Notes = "تعيين مؤقت لفترة الحج"
  Step 5: Set Active = Yes
  Step 6: Click "حفظ"
Then:
  - Role assigned successfully
  - Shows in active assignments table
  - Gregorian dates auto-calculated
  - Member has new permissions immediately
  - Email notification sent to member
```

### Scenario 2.4: Hijri Date Validations
**Date Period Tests**:
| Test Case | Start Date | End Date | Expected Result |
|-----------|------------|----------|-----------------|
| TC2.4.1 | ١ محرم ١٤٤٧ | ٣٠ محرم ١٤٤٧ | ✅ Valid - Same month |
| TC2.4.2 | ١ محرم ١٤٤٧ | ١ صفر ١٤٤٨ | ✅ Valid - Cross year |
| TC2.4.3 | ١ محرم ١٤٤٧ | (empty) | ✅ Valid - Indefinite |
| TC2.4.4 | ٣٠ محرم ١٤٤٧ | ١ محرم ١٤٤٧ | ❌ Error: "تاريخ النهاية قبل البداية" |
| TC2.4.5 | ١ محرم ١٤٤٦ | ١ محرم ١٤٤٧ | ⚠️ Warning: "التاريخ في الماضي" |
| TC2.4.6 | ٣١ محرم ١٤٤٧ | - | ❌ Error: "يوم غير صالح - محرم ٣٠ يوم فقط" |

### Scenario 2.5: Multiple Concurrent Roles
**Test Case**: Member with Multiple Active Roles
```
Given: Member "أحمد" has role "عضو عادي"
When: Assign additional roles:
  1. "المدير المالي" (١ محرم - ٣٠ ربيع الأول ١٤٤٧)
  2. "مدير المبادرات" (١ رجب - ٣٠ رمضان ١٤٤٧)
Then:
  - Member has 3 active roles shown
  - Permissions are merged (highest privilege wins)
  - Each role shows its active period
  - Timeline view shows overlapping periods
```

### Scenario 2.6: Edit Role Assignment
**Modification Flow**:
```
Given: Existing role assignment
When: Click edit icon on assignment
Then: Modal opens with current data
When: Modify:
  - Extend End Date by 3 months
  - Update Notes
  - Change Active status
Then:
  - Changes saved successfully
  - History shows modification
  - Updated_by and updated_at recorded
```

### Scenario 2.7: Revoke Role Assignment
**Revocation Tests**:
```
Given: Active role assignment
When: Click revoke/delete button
Then:
  - Confirmation dialog: "هل تريد إلغاء هذا الدور؟"
  - On confirm: Role marked as inactive
  - Member loses associated permissions
  - Cannot delete if it's the only admin role
  - Audit log records revocation
```

### Scenario 2.8: Role Expiration Handling
**Automatic Expiration**:
```
Given: Role with end date = Today (١٧ جمادى الأولى ١٤٤٧)
When: System runs daily check at midnight
Then:
  - Role automatically expires
  - Status changes to "expired"
  - Member loses permissions
  - Notification sent to member and admin
```

## 3. System Settings Tab Tests

### Scenario 3.1: General Settings Configuration
```
Given: On System Settings tab
When: Modify settings:
  - Organization Name
  - Contact Email
  - Default Language
  - Timezone
  - Fiscal Year Start
Then:
  - All changes save correctly
  - Validation for email format
  - Changes reflect immediately
```

### Scenario 3.2: Permission Templates
```
Given: Creating new role template
When: Define permissions:
  - ✅ View Members
  - ✅ Edit Members
  - ❌ Delete Members
  - ✅ View Financial
  - ❌ Edit Financial
Then:
  - Template saved
  - Can apply to multiple users
  - Permissions inherited correctly
```

## 4. Audit Logs Tab Tests

### Scenario 4.1: View Audit Trail
```
Given: Audit logs tab selected
When: View logs
Then displays:
  - User actions with timestamp
  - IP address
  - Action type (CREATE, UPDATE, DELETE)
  - Affected entity
  - Old vs New values
  - Filterable by date range, user, action type
```

### Scenario 4.2: Export Audit Logs
```
Given: Filtered audit logs displayed
When: Click "تصدير"
Then:
  - Export options: PDF, Excel, CSV
  - Includes all filtered data
  - Proper Arabic encoding
  - Hijri and Gregorian dates included
```

## 5. Integration & Permission Tests

### Scenario 5.1: Role-Based Access Control
**Permission Matrix Testing**:
| Role | User Mgmt | Multi-Role | System Settings | Audit Logs |
|------|-----------|------------|-----------------|------------|
| super_admin | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| admin | ✅ View/Edit | ❌ No Access | ✅ View | ✅ View |
| finance_manager | ❌ No Access | ❌ No Access | ❌ No Access | ✅ Own Actions |
| member | ❌ No Access | ❌ No Access | ❌ No Access | ❌ No Access |

### Scenario 5.2: Concurrent User Modifications
```
Given: Two admins logged in
When: Both try to edit same user simultaneously
Then:
  - Optimistic locking prevents conflicts
  - Second save shows: "البيانات تم تحديثها، يرجى المحاولة مرة أخرى"
  - No data corruption
```

### Scenario 5.3: Session & Security Tests
```
Test Cases:
- Session timeout after 30 minutes inactivity
- Forced logout when role revoked
- Password change forces re-login
- Multi-device login handling
- CSRF token validation on all forms
```

## 6. Edge Cases & Error Handling

### Scenario 6.1: Network Failure During Save
```
Given: Editing user/role assignment
When: Network disconnects during save
Then:
  - Error message: "فشل الاتصال"
  - Form data preserved
  - Retry button available
  - No partial saves
```

### Scenario 6.2: Data Validation Boundaries
**Boundary Tests**:
| Field | Min | Max | Invalid Cases |
|-------|-----|-----|---------------|
| Name | 2 chars | 100 chars | Numbers only, Special chars |
| Email | - | 255 chars | Missing @, Multiple @ |
| Phone | 10 digits | 10 digits | Letters, <10 or >10 |
| Password | 8 chars | 50 chars | No uppercase, No special char |
| Notes | 0 chars | 500 chars | SQL injection attempts |

### Scenario 6.3: Hijri Calendar Edge Cases
```
Test Cases:
- Leap years (355 days)
- Month boundaries (29/30 days)
- Historical dates (before 1400 H)
- Future dates (after 1500 H)
- Invalid day/month combinations
```

## 7. Performance Tests

### Scenario 7.1: Load Testing
```
- Load 1000+ users in user list
- Search through 5000+ members
- Display 100+ role assignments
- Expected: <2 second load time
- Pagination works correctly
```

### Scenario 7.2: Concurrent Operations
```
- 10 admins modifying roles simultaneously
- 50 users being updated at once
- System remains responsive
- No deadlocks or race conditions
```

## 8. Accessibility & Localization

### Scenario 8.1: RTL Layout Tests
```
- All text aligns right
- Forms flow right-to-left
- Date pickers work RTL
- Icons mirror correctly
- Tables display RTL
```

### Scenario 8.2: Screen Reader Compatibility
```
- All buttons have aria-labels
- Form fields have proper labels
- Error messages announced
- Success notifications read
- Tab navigation logical
```

## Test Execution Checklist

### Pre-Test Setup:
- [ ] Test database with sample data
- [ ] Multiple test users with different roles
- [ ] Various role assignments with different dates
- [ ] Browser: Chrome, Firefox, Safari, Edge
- [ ] Mobile responsive testing

### Test Coverage Validation:
✅ **Member Selection**: Covered in scenarios 2.2, 2.3
✅ **Permission Granting**: Covered in scenarios 2.3, 2.5, 3.2
✅ **Saving Changes**: Covered in all modification scenarios
✅ **Modifying Settings**: Covered in scenarios 1.5, 2.6, 3.1
✅ **Role Assignment with Dates**: Covered in scenarios 2.3, 2.4
✅ **Hijri Period Assignment**: Extensively covered in 2.3, 2.4, 2.5

### Risk Areas:
1. **High Risk**: Date calculation between Hijri/Gregorian
2. **Medium Risk**: Concurrent role modifications
3. **Low Risk**: Basic CRUD operations

## Automated Test Recommendations

### Priority 1 - Critical Paths:
1. Login → Settings → Assign Role with Dates
2. Search Member → Grant Permissions → Save
3. Edit Role → Extend Date → Verify Permissions

### Priority 2 - Common Operations:
1. User CRUD operations
2. Role filtering and search
3. Audit log viewing

### Priority 3 - Edge Cases:
1. Invalid date combinations
2. Boundary value testing
3. Performance under load

---
**Total Test Scenarios**: 50+
**Estimated Execution Time**: 8-10 hours manual, 30 minutes automated
**Test Data Requirements**: 100+ test users, 200+ role assignments