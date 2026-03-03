# Quickstart: Temporary Password Login for All Members

**Branch**: `001-member-temp-password` | **Date**: 2026-03-04

## Prerequisites

- Node.js 18+
- Access to VPS (213.199.62.185) for database operations
- Local dev environment for alshuail-mobile and alshuail-backend

## Implementation Order

### Phase 1: Backend Changes (30 min)

1. **Harden `/api/auth/change-password`** in `alshuail-backend/src/routes/auth.js`:
   - Add password strength validation (8+ chars, uppercase, lowercase, number)
   - Reject "123456" as new password
   - Add rate limiting

2. **Create `/api/password-management/reset-to-default`** in `alshuail-backend/src/routes/passwordManagement.js`:
   - Accept `{ memberId }` body
   - Reset to bcrypt hash of "123456"
   - Set `requires_password_change = true`, `is_first_login = true`
   - Super_admin only
   - Audit log

### Phase 2: Mobile App - Login Screen (45 min)

3. **Replace OTP flow in `Login.jsx`** with phone+password form:
   - Remove two-step OTP flow (phone → OTP code)
   - Single form: phone number + password + login button
   - Call `authService.mobileLogin(phone, password)`
   - On success: check `requires_password_change` flag
   - If true → navigate to `/change-password`
   - If false → navigate to `/dashboard`

### Phase 3: Mobile App - Password Change (45 min)

4. **Create `ChangePassword.jsx`** at `alshuail-mobile/src/pages/`:
   - Fields: current password, new password, confirm password
   - Password strength indicator
   - Show/hide password toggles
   - Call `authService.changePassword(current, new)`
   - On success: update auth context, navigate to dashboard

5. **Modify `App.jsx`**:
   - Add route `/change-password` → `<ChangePassword />`
   - Modify `ProtectedRoute` to redirect to `/change-password` when `requiresPasswordChange` is true

6. **Update `Settings.jsx`**:
   - Add "Change Password" (تغيير كلمة المرور) menu item with Lock icon
   - Navigate to `/change-password` on tap

### Phase 4: Admin Dashboard (30 min)

7. **Add "Reset Password" button** in `TwoSectionMembers.jsx`:
   - Add button in modal footer (between Cancel and Save)
   - Confirmation dialog before reset
   - Call `/api/password-management/reset-to-default`
   - Super_admin only

### Phase 5: Database & Deploy (15 min)

8. **Run bulk password setup** on VPS:
   ```bash
   ssh root@213.199.62.185
   psql -U alshuail -d alshuail_db -f /var/www/PROShael/alshuail-backend/scripts/setup-default-passwords.sql
   ```

9. **Deploy backend** to VPS:
   ```bash
   ssh root@213.199.62.185 "cd /var/www/PROShael && git pull && systemctl restart alshuail-backend.service"
   ```

10. **Deploy mobile PWA**:
    ```bash
    cd alshuail-mobile && npm run build
    scp -r dist/* root@213.199.62.185:/var/www/mobile/
    ```

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `alshuail-backend/src/routes/auth.js` | Modify | Harden change-password endpoint |
| `alshuail-backend/src/routes/passwordManagement.js` | Modify | Add reset-to-default endpoint |
| `alshuail-mobile/src/pages/Login.jsx` | Modify | Replace OTP with phone+password |
| `alshuail-mobile/src/pages/ChangePassword.jsx` | **Create** | New password change page |
| `alshuail-mobile/src/App.jsx` | Modify | Add route + ProtectedRoute check |
| `alshuail-mobile/src/pages/Settings.jsx` | Modify | Add change password menu item |
| `alshuail-admin-arabic/src/components/Members/TwoSectionMembers.jsx` | Modify | Add reset password button |

## Verification Checklist

- [ ] Member can login with phone + "123456"
- [ ] Member is forced to change password on first login
- [ ] Member can set a strong personal password
- [ ] Member can login with new personal password (no forced change)
- [ ] Member can change password from Settings
- [ ] Admin can reset member password to default
- [ ] Account locks after 5 failed attempts
- [ ] All screens display correctly in Arabic RTL
- [ ] No WhatsApp OTP option visible in mobile app
