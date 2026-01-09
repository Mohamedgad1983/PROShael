# 👨‍💼 Admin Document Upload Guide
**For**: Admin users uploading documents on behalf of members
**Date**: October 15, 2025
**Status**: ✅ Production Ready

---

## 🎯 Quick Instructions

As an **admin**, you must specify **which member** you're uploading the document for.

---

## 📋 Step-by-Step Guide

### Step 1: Choose a Member

Use one of these member IDs:

| Member ID | Name | Phone |
|-----------|------|-------|
| `3707d97e-7d2d-4849-8c5e-74fbc2766e40` | ابراهيم فلاح العايد | +96550010001 |
| `54c27835-898f-429c-a8bf-441ace4a6157` | ابراهيم نواش غضبان | +96550010002 |
| `510cd748-ef69-41a5-bd2e-d27cf79fe07f` | احمد حمود سعود الثابت | +96550010003 |
| `7e529906-c098-4f08-8e45-7e03993e5205` | احمد خشمان فريح العقاب | +96550010004 |
| `64faf249-1092-4a8e-ad73-e647f99a60b3` | احمد سعود سعد الرشود | +96550010005 |

---

### Step 2: Upload Document with member_id

When uploading from your admin interface, **ADD** the `member_id` field:

#### Via Web Form:
```
File: [Select file]
Title: National ID
Category: national_id
Member ID: 3707d97e-7d2d-4849-8c5e-74fbc2766e40  ⭐ REQUIRED!
Description: (optional)
```

#### Via API:
```bash
curl -X POST https://proshael.onrender.com/api/documents/upload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "document=@test.pdf" \
  -F "member_id=3707d97e-7d2d-4849-8c5e-74fbc2766e40" \
  -F "title=Test National ID" \
  -F "category=national_id"
```

#### Via JavaScript:
```javascript
const formData = new FormData();
formData.append('document', file);
formData.append('member_id', '3707d97e-7d2d-4849-8c5e-74fbc2766e40'); // ⭐
formData.append('title', 'National ID');
formData.append('category', 'national_id');

const response = await fetch('/api/documents/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

---

## ✅ Expected Result

**Success Response**:
```json
{
  "success": true,
  "message": "تم رفع المستند بنجاح",
  "message_en": "Document uploaded successfully",
  "data": {
    "id": "document-uuid",
    "member_id": "3707d97e-7d2d-4849-8c5e-74fbc2766e40",
    "title": "Test National ID",
    "category": "national_id",
    "file_path": "3707d97e-7d2d-4849-8c5e-74fbc2766e40/national_id/timestamp_file.pdf",
    "category_name": "الهوية الوطنية"
  }
}
```

---

## ❌ If You Forget member_id

**Error Response**:
```json
{
  "success": false,
  "message": "يجب تحديد معرف العضو عند الرفع كمسؤول",
  "message_en": "Member ID is required when uploading as admin",
  "hint": "Please provide member_id in the request body"
}
```

---

## 🔄 Comparison: Member vs Admin Upload

### Member Upload (Automatic):
```javascript
// Members DON'T need to provide member_id
formData.append('document', file);
formData.append('category', 'national_id');
// member_id is automatically their own ID ✅
```

### Admin Upload (Manual):
```javascript
// Admins MUST provide member_id
formData.append('document', file);
formData.append('member_id', 'target-member-uuid'); // ⭐ Required!
formData.append('category', 'national_id');
```

---

## 🎯 Test Now!

Use this member for testing:
- **Member ID**: `3707d97e-7d2d-4849-8c5e-74fbc2766e40`
- **Name**: ابراهيم فلاح العايد
- **Phone**: +96550010001

**Upload any PDF, JPG, or PNG file (max 10MB) with this member_id!**

---

## 📝 Available Categories

1. `national_id` - الهوية الوطنية
2. `marriage_certificate` - عقد الزواج
3. `property_deed` - صك الملكية
4. `birth_certificate` - شهادة الميلاد
5. `death_certificate` - شهادة الوفاة
6. `passport` - جواز السفر
7. `driver_license` - رخصة القيادة
8. `education` - الشهادات التعليمية
9. `medical` - التقارير الطبية
10. `other` - أخرى

---

## ✅ Ready to Test!

**The fix is deployed and live at**: https://proshael.onrender.com

**Try uploading now with the member_id included!** 🚀

---

**Updated**: October 15, 2025 at 10:47 AM
**Commit**: `bf66393`
**Status**: 🟢 **LIVE IN PRODUCTION**
