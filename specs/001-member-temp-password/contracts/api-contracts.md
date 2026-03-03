# API Contracts: Temporary Password Login for All Members

**Branch**: `001-member-temp-password` | **Date**: 2026-03-04

## Existing Endpoints (no changes needed)

### POST /api/auth/mobile-login

**Status**: Exists and ready. No modifications needed.

**Request**:
```json
{
  "phone": "+965XXXXXXXX",
  "password": "123456"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "محمد شعيل",
    "phone": "+965XXXXXXXX",
    "membershipId": "SH-001",
    "avatar": null,
    "role": "member",
    "balance": 0,
    "minimumBalance": 3000
  },
  "message": "تم تسجيل الدخول بنجاح",
  "requires_password_change": true,
  "is_first_login": true
}
```

**Response (Invalid credentials)**:
```json
{
  "success": false,
  "message": "رقم الهاتف أو كلمة المرور غير صحيحة"
}
```

**Response (Account locked)**:
```json
{
  "success": false,
  "message": "الحساب مقفل مؤقتاً. يرجى المحاولة بعد 15 دقيقة",
  "locked_until": "2026-03-04T12:30:00Z"
}
```

---

## Existing Endpoints (need hardening)

### POST /api/auth/change-password

**Status**: Exists but needs password strength validation added.

**Auth**: Required (Bearer token)

**Request**:
```json
{
  "current_password": "123456",
  "new_password": "MyNewPass1"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "تم تغيير كلمة المرور بنجاح",
  "message_en": "Password changed successfully"
}
```

**Response (Wrong current password)**:
```json
{
  "success": false,
  "message": "كلمة المرور الحالية غير صحيحة"
}
```

**Response (Weak new password)**:
```json
{
  "success": false,
  "message": "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم"
}
```

**Changes needed**:
- Add password strength validation (8+ chars, uppercase, lowercase, number)
- Reject "123456" as new password
- Add rate limiting (5 attempts per hour)
- Verify current password with bcrypt (currently skips for first login)

---

## New Endpoints

### POST /api/password-management/reset-to-default

**Status**: NEW - needs to be created.

**Auth**: Required (Bearer token, super_admin role only)

**Purpose**: Reset a member's password back to temporary "123456" and set forced change flag.

**Request**:
```json
{
  "memberId": "uuid-of-member"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "تم إعادة تعيين كلمة المرور بنجاح",
  "message_en": "Password reset to default successfully",
  "member": {
    "id": "uuid",
    "name": "محمد شعيل",
    "phone": "+965XXXXXXXX"
  }
}
```

**Response (Member not found)**:
```json
{
  "success": false,
  "message": "العضو غير موجود"
}
```

**Response (Unauthorized)**:
```json
{
  "success": false,
  "message": "غير مصرح لك بهذه العملية"
}
```

**Backend logic**:
```
1. Verify caller is super_admin
2. Find member by ID
3. Set password_hash = bcrypt("123456")
4. Set requires_password_change = true
5. Set is_first_login = true
6. Set has_password = false
7. Reset login_attempts = 0
8. Clear account_locked_until
9. Log to audit_logs
10. Return success
```

---

## Endpoint Summary

| Method | Path | Status | Changes |
|--------|------|--------|---------|
| POST | `/api/auth/mobile-login` | Existing | None |
| POST | `/api/auth/change-password` | Existing | Add password strength validation |
| POST | `/api/password-management/reset-to-default` | **New** | Create for admin reset to "123456" |
