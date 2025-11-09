# QA Test Execution Example - Multi-Role Management
**Live Testing on Frontend**: Step-by-step execution guide

---

## 🎯 Real Test Scenario: Assign Finance Manager Role with Hijri Date Period

### Test Environment
- URL: https://alshuail-admin.pages.dev
- Browser: Chrome (Latest)
- User: Super Admin
- Date: 18/5/1447 هـ (Current Hijri Date)

---

## Step-by-Step Execution

### Step 1: Login
```
1. Navigate to https://alshuail-admin.pages.dev
2. Enter credentials:
   - Email: admin@alshuail.com
   - Password: Admin@12345
3. Click "تسجيل الدخول"
✓ Dashboard loads successfully
```

### Step 2: Navigate to Settings
```
1. From sidebar, click "الإعدادات" (Settings icon)
✓ Settings page opens
✓ 4 tabs visible: User Management, Multi-Role, System, Audit
```

### Step 3: Open Multi-Role Management
```
1. Click "إدارة الأدوار المتعددة" tab
✓ Tab content loads
✓ Search box appears: "ابحث عن عضو بالاسم، البريد الإلكتروني، أو رقم الجوال..."
```

### Step 4: Search for Member
```
1. Type "أحمد" in search box
2. Wait 1-2 seconds for results
✓ Dropdown shows: أحمد محمد الشعيل
✓ Member details: ahmad@alshuail.com • 96550999988 • SH001
```

### Step 5: Select Member
```
1. Click on "أحمد محمد الشعيل" from dropdown
✓ Member card displays with name and contact
✓ "تعيين دور جديد" button appears
✓ Message shows: "لا توجد أدوار مُعينة لهذا العضو"
```

### Step 6: Start Role Assignment
```
1. Click "تعيين دور جديد" button
✓ Role assignment form opens
✓ Fields visible:
   - Role dropdown
   - From date (Hijri calendar)
   - To date (Hijri calendar)
   - Notes field
```

### Step 7: Fill Role Details
```
1. Select role: "مدير مالي" from dropdown
2. Click "من تاريخ" calendar icon
3. Select: 1 رجب 1447
4. Click "إلى تاريخ" calendar icon
5. Select: 30 ذو الحجة 1447
6. Add note: "تعيين مؤقت لإدارة الميزانية السنوية"
```

### Step 8: Save Role Assignment
```
1. Review entered data:
   - Role: مدير مالي
   - Period: 1/7/1447 - 30/12/1447
   - Duration: 6 months
2. Click "حفظ" button
✓ Success message: "تم تعيين الدور بنجاح"
✓ Role card appears with:
   - Role name and icon
   - Hijri date range
   - Duration badge: "٦ أشهر"
   - Edit/Delete buttons
```

### Step 9: Verify Assignment
```
1. Check role card displays correctly
2. Verify dates in Hijri format
3. Check permissions granted:
   ✓ إدارة المالية
   ✓ عرض التقارير المالية
   ✓ الموافقة على المدفوعات
```

### Step 10: Test Edit Functionality
```
1. Click edit icon on role card
2. Change end date to: 30 محرم 1448
3. Add note: "تمديد الفترة لشهر إضافي"
4. Save changes
✓ Success message appears
✓ Role card updates with new date
✓ Duration updates to "٧ أشهر"
```

---

## 📝 Test Data Variations

### Variation 1: Multiple Roles
```
Member: محمد المالي
Roles:
1. مدير مالي (1/1/1447 - 30/6/1447)
2. مدير المناسبات (1/4/1447 - 30/9/1447)
Expected: Overlap warning for months 4-6
```

### Variation 2: Past Date Warning
```
From Date: 1/1/1446 (last year)
To Date: 30/12/1447
Expected: Warning dialog "التاريخ في الماضي، هل تريد المتابعة؟"
```

### Variation 3: Invalid Date Range
```
From Date: 30/12/1447
To Date: 1/1/1447
Expected: Error "تاريخ النهاية يجب أن يكون بعد تاريخ البداية"
```

---

## ✅ Validation Points

### Visual Validation
- ✓ Arabic text displays correctly (RTL)
- ✓ Hijri calendar opens with Arabic months
- ✓ Icons and colors match design system
- ✓ Success/error messages clear and visible

### Functional Validation
- ✓ Search returns correct results
- ✓ Date picker allows only valid dates
- ✓ Save button disabled for invalid data
- ✓ Changes persist after page refresh

### Data Validation
- ✓ Hijri dates save correctly
- ✓ Role permissions applied properly
- ✓ Audit log entry created
- ✓ Member can login with new role

### Performance Validation
- ✓ Search results appear < 2 seconds
- ✓ Save operation completes < 3 seconds
- ✓ No console errors
- ✓ Page remains responsive

---

## 🐛 Common Issues to Check

1. **Date Format Issues**
   - Hijri months have 29-30 days
   - Check month boundaries
   - Verify year transitions

2. **Permission Conflicts**
   - Multiple roles with conflicting permissions
   - Check permission hierarchy
   - Verify override rules

3. **UI State Management**
   - Form resets after save
   - Search results clear properly
   - Loading states display correctly

4. **Network Handling**
   - Timeout handling for slow connections
   - Error recovery options
   - Offline message display

---

## 📊 Test Results Template

```markdown
Test Case: TC001 - Assign Finance Manager Role
Date: [Today's Date]
Tester: [Name]
Environment: Production

Steps Executed: 10/10 ✅
Expected Results Met: Yes ✅
Defects Found: 0

Notes:
- All functions working as expected
- Hijri calendar integration successful
- Role assignment completed without errors

Status: PASSED ✅
```

---

## 🎬 Next Test Scenarios

1. Test role removal/termination
2. Test bulk role assignment
3. Test role expiry notifications
4. Test permission inheritance
5. Test concurrent user edits
6. Test mobile responsive view
7. Test keyboard navigation
8. Test screen reader compatibility