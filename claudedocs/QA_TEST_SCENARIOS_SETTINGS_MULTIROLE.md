# QA Test Scenarios - Settings & Multi-Role Management
**Test Environment**: https://alshuail-admin.pages.dev
**Focus Areas**: Settings Interface, Multi-Role Management, Hijri Date Periods

---

## 🧪 Test Suite 1: Basic Navigation & Access

### Scenario 1.1: Access Settings Page
**Pre-condition**: User logged in as super_admin
**Test Data**:
- Email: admin@alshuail.com
- Password: Admin@12345

**Steps**:
1. Login to dashboard
2. Click "الإعدادات" (Settings) from sidebar
3. Verify Settings page loads

**Expected Result**:
- Settings page displays with 4 tabs visible
- User role badge shows "المدير الأعلى"
- All tabs are clickable

### Scenario 1.2: Navigate Between Settings Tabs
**Steps**:
1. Click "إدارة المستخدمين" (User Management)
2. Click "إدارة الأدوار المتعددة" (Multi-Role Management)
3. Click "إعدادات النظام" (System Settings)
4. Click "سجلات التدقيق" (Audit Logs)

**Expected Result**:
- Each tab loads its respective content
- Active tab has gradient background
- Tab description updates accordingly

---

## 🧪 Test Suite 2: Member Search & Selection

### Scenario 2.1: Search Member by Name
**Test Data**: Search term "أحمد"

**Steps**:
1. Navigate to Multi-Role Management tab
2. Type "أحمد" in search box
3. Wait for search results
4. Click on first result

**Expected Result**:
- Dropdown shows matching members
- Member card displays: أحمد محمد الشعيل
- Email and phone visible: ahmad@alshuail.com • 96550999988

### Scenario 2.2: Search Member by Email
**Test Data**: Search term "ahmad@alshuail.com"

**Steps**:
1. Clear search box
2. Type "ahmad@alshuail.com"
3. Select member from results

**Expected Result**:
- Exact email match appears first
- Member selection successful

### Scenario 2.3: Search Member by Phone
**Test Data**: Search term "96550999988"

**Steps**:
1. Clear search box
2. Type "96550999988"
3. Select member from results

**Expected Result**:
- Member with matching phone appears
- Full member details displayed

### Scenario 2.4: Search Non-Existent Member
**Test Data**: Search term "xyz123"

**Steps**:
1. Type "xyz123" in search box
2. Wait for results

**Expected Result**:
- "لا توجد نتائج" (No results) message
- Search box remains active

---

## 🧪 Test Suite 3: Role Assignment with Hijri Dates

### Scenario 3.1: Assign Single Role with Date Range
**Test Data**:
- Member: أحمد محمد الشعيل
- Role: مدير مالي (Finance Manager)
- From Date: 1 محرم 1447 (1/1/1447)
- To Date: 30 ذو الحجة 1447 (30/12/1447)

**Steps**:
1. Select member "أحمد محمد الشعيل"
2. Click "تعيين دور جديد" (Assign New Role)
3. Select "مدير مالي" from dropdown
4. Click calendar icon for "من تاريخ" (From Date)
5. Select 1 محرم 1447
6. Click calendar icon for "إلى تاريخ" (To Date)
7. Select 30 ذو الحجة 1447
8. Add notes: "تعيين مؤقت للسنة الهجرية"
9. Click "حفظ" (Save)

**Expected Result**:
- Success message: "تم تعيين الدور بنجاح"
- Role card shows with Hijri dates
- Duration badge shows "سنة كاملة"

### Scenario 3.2: Assign Multiple Concurrent Roles
**Test Data**:
- Member: محمد المالي
- Role 1: مدير مالي (1/1/1447 - 30/6/1447)
- Role 2: مدير شجرة العائلة (1/4/1447 - 30/9/1447)

**Steps**:
1. Select member "محمد المالي"
2. Assign first role with dates
3. Click "تعيين دور جديد" again
4. Assign second role with overlapping dates
5. Save changes

**Expected Result**:
- Both roles display in timeline view
- Overlap period highlighted
- Warning: "يوجد تداخل في الفترات الزمنية"

### Scenario 3.3: Assign Role with Past Start Date
**Test Data**:
- From Date: 1 رمضان 1446 (past date)
- To Date: 1 رمضان 1447 (future date)

**Steps**:
1. Select any member
2. Assign role with past start date
3. Confirm warning dialog
4. Save changes

**Expected Result**:
- Warning: "تاريخ البداية في الماضي"
- Option to confirm or cancel
- If confirmed, role saved with past date

### Scenario 3.4: Assign Role with Invalid Date Range
**Test Data**:
- From Date: 1 محرم 1448
- To Date: 1 محرم 1447 (earlier than start)

**Steps**:
1. Select member
2. Enter invalid date range
3. Try to save

**Expected Result**:
- Error: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية"
- Save button disabled
- Red border on date fields

---

## 🧪 Test Suite 4: Permission Management

### Scenario 4.1: Grant Specific Permissions
**Test Data**:
- Member: سارة العائلة
- Permissions:
  - ✓ إدارة شجرة العائلة
  - ✓ عرض التقارير
  - ✗ إدارة المالية

**Steps**:
1. Select member "سارة العائلة"
2. Click "تعديل الصلاحيات" (Edit Permissions)
3. Check "إدارة شجرة العائلة"
4. Check "عرض التقارير"
5. Uncheck "إدارة المالية"
6. Save permissions

**Expected Result**:
- Permissions updated successfully
- Checkmarks reflect selections
- Audit log entry created

### Scenario 4.2: Revoke All Permissions
**Test Data**:
- Member with existing permissions

**Steps**:
1. Select member with permissions
2. Click "إلغاء جميع الصلاحيات"
3. Confirm action
4. Save changes

**Expected Result**:
- All permissions removed
- Member status: "عضو عادي"
- Confirmation message displayed

---

## 🧪 Test Suite 5: Modification & Updates

### Scenario 5.1: Extend Role Period
**Test Data**:
- Existing role ending 30/6/1447
- New end date: 30/12/1447

**Steps**:
1. Select member with active role
2. Click edit icon on role card
3. Change "إلى تاريخ" to 30/12/1447
4. Add note: "تمديد الفترة"
5. Save changes

**Expected Result**:
- Role period extended
- History shows modification
- Note attached to change

### Scenario 5.2: Change Role Type
**Test Data**:
- Current: مدير مالي
- New: مدير شجرة العائلة

**Steps**:
1. Select member with role
2. Click "تغيير الدور"
3. Select new role
4. Keep same date range
5. Save changes

**Expected Result**:
- Role type updated
- Permissions adjusted automatically
- Previous role in history

### Scenario 5.3: Terminate Role Early
**Test Data**:
- Active role with future end date

**Steps**:
1. Select member with active role
2. Click "إنهاء الدور"
3. Select termination date (today)
4. Add reason: "تغيير في المسؤوليات"
5. Confirm termination

**Expected Result**:
- Role marked as terminated
- End date updated to today
- Reason logged in history

---

## 🧪 Test Suite 6: Edge Cases & Validation

### Scenario 6.1: Maximum Roles Assignment
**Test Data**:
- Assign 5+ roles to single member

**Steps**:
1. Select member
2. Assign 5 different roles
3. Try to add 6th role

**Expected Result**:
- Warning after 3 roles: "عدد كبير من الأدوار"
- System allows up to 5 roles
- Performance remains stable

### Scenario 6.2: Hijri Calendar Month Boundaries
**Test Data**:
- Dates crossing month boundaries
- 29 شعبان - 2 رمضان

**Steps**:
1. Assign role from 29 شعبان
2. To 2 رمضان
3. Verify calculation

**Expected Result**:
- Correct day count (4 days)
- Month transition handled
- Display shows both months

### Scenario 6.3: Concurrent Session Conflict
**Test Data**:
- Two admin users editing same member

**Steps**:
1. Admin A opens member profile
2. Admin B opens same profile
3. Admin A assigns role
4. Admin B tries to assign role

**Expected Result**:
- Conflict warning for Admin B
- Option to refresh and retry
- Changes not lost

### Scenario 6.4: Network Interruption During Save
**Steps**:
1. Fill role assignment form
2. Disconnect network
3. Click Save
4. Reconnect network

**Expected Result**:
- Error message displayed
- Form data preserved
- Retry option available

---

## 🧪 Test Suite 7: Integration Testing

### Scenario 7.1: Role Effect on Dashboard Access
**Test Data**:
- Member with مدير مالي role

**Steps**:
1. Assign financial manager role
2. Logout admin
3. Login as assigned member
4. Check dashboard access

**Expected Result**:
- Financial sections accessible
- Other sections restricted
- Role badge displayed

### Scenario 7.2: Audit Trail Verification
**Steps**:
1. Perform role assignment
2. Navigate to Audit Logs tab
3. Find recent entry
4. Verify details

**Expected Result**:
- Entry shows: who, what, when
- Hijri dates recorded
- Changes trackable

### Scenario 7.3: Email Notification Check
**Test Data**:
- Member with valid email

**Steps**:
1. Assign role to member
2. Check email notifications
3. Verify content

**Expected Result**:
- Email sent to member
- Contains role details
- Hijri dates included

---

## 🧪 Test Suite 8: UI/UX Validation

### Scenario 8.1: RTL Layout Consistency
**Steps**:
1. Navigate all settings tabs
2. Check text alignment
3. Verify calendar direction
4. Check form layouts

**Expected Result**:
- All text right-aligned
- Calendar opens right-to-left
- Forms properly mirrored

### Scenario 8.2: Responsive Design
**Devices**: Desktop, Tablet, Mobile

**Steps**:
1. Open settings on each device
2. Test all interactions
3. Check touch targets

**Expected Result**:
- Layout adapts properly
- All functions accessible
- Touch targets ≥ 44px

### Scenario 8.3: Loading States
**Steps**:
1. Search for member (observe spinner)
2. Save role (observe button state)
3. Load audit logs (observe skeleton)

**Expected Result**:
- Loading indicators visible
- Buttons disabled during action
- Skeleton screens for content

---

## 🧪 Test Suite 9: Security & Permissions

### Scenario 9.1: Non-Admin Access Attempt
**Test Data**:
- Regular member credentials

**Steps**:
1. Login as regular member
2. Try to access /admin/settings
3. Check response

**Expected Result**:
- Access denied message
- Redirect to dashboard
- No settings visible

### Scenario 9.2: CSRF Token Validation
**Steps**:
1. Inspect network requests
2. Check for CSRF tokens
3. Try replay attack

**Expected Result**:
- Tokens present in requests
- Replay rejected
- Session remains secure

---

## 📊 Test Execution Summary

| Test Suite | Scenarios | Priority | Automation |
|------------|-----------|----------|------------|
| Navigation | 2 | High | Yes |
| Member Search | 4 | High | Yes |
| Role Assignment | 4 | Critical | Yes |
| Permissions | 2 | High | Partial |
| Modifications | 3 | High | Yes |
| Edge Cases | 4 | Medium | Partial |
| Integration | 3 | High | No |
| UI/UX | 3 | Medium | Partial |
| Security | 2 | Critical | Yes |

**Total Scenarios**: 27
**Estimated Execution Time**: 4-6 hours manual, 30 minutes automated

---

## ✅ Validation Confirmation

Each scenario has been designed with:
- **Specific test data** including Arabic names and Hijri dates
- **Clear steps** that can be executed in the actual frontend
- **Expected results** that can be verified visually
- **Edge cases** covering date boundaries and conflicts
- **Integration points** with other system components
- **Security considerations** for role-based access

These scenarios provide complete A-Z coverage for the multi-role management system with Hijri date periods.