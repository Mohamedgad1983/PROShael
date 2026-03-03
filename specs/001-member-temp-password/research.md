# Research: Temporary Password Login for All Members

**Branch**: `001-member-temp-password` | **Date**: 2026-03-04

## Research Summary

The existing backend is **almost fully ready**. All database columns, authentication endpoints, and password management logic already exist. The implementation is primarily **mobile UI work** + **removing OTP** + **admin reset button**.

## Decision 1: Authentication Endpoint for Mobile Login

**Decision**: Use existing `POST /api/auth/mobile-login` endpoint.

**Rationale**: This endpoint already:
- Accepts `{ phone, password }` request body
- Validates against `members` table `password_hash` column using bcrypt
- Returns JWT token with 30-day TTL
- Returns `requires_password_change` and `is_first_login` flags in response
- Handles account lockout (`login_attempts`, `account_locked_until`)

**Alternatives considered**:
- Creating a new endpoint: Rejected - existing endpoint is feature-complete
- Modifying OTP verify endpoint: Rejected - cleaner to replace OTP flow entirely

**Location**: `alshuail-backend/src/routes/auth.js` lines 455-517

## Decision 2: Password Change Endpoint for Members

**Decision**: Use existing `POST /api/auth/change-password` endpoint (operates on `members` table).

**Rationale**: This endpoint:
- Operates on the `members` table (correct for mobile app users)
- Accepts `{ current_password, new_password }` body
- Updates `password_hash`, clears `requires_password_change` and `is_first_login` flags
- Already wired in `authService.changePassword()` in mobile app

**Alternatives considered**:
- `POST /api/user/profile/change-password`: Rejected - operates on `users` table (admin users), not `members` table
- Creating new endpoint: Rejected - existing one works correctly

**Gap identified**: The `/auth/change-password` endpoint (lines 617-688) has simplified validation. Need to add:
- Password strength enforcement (8+ chars, uppercase, lowercase, numbers)
- Current password verification for non-first-login scenarios
- Rate limiting

**Location**: `alshuail-backend/src/routes/auth.js` lines 617-688

## Decision 3: Admin Password Reset Flow

**Decision**: Create a simplified "Reset to Default" action using existing `POST /api/password-management/reset` endpoint pattern, but with a dedicated route for resetting to "123456".

**Rationale**: The existing `/api/password-management/reset` endpoint requires the new password to meet strength requirements (8+ chars, uppercase, lowercase, number, special character). The default "123456" would fail this validation. A dedicated endpoint can:
- Reset to bcrypt hash of "123456" directly
- Set `requires_password_change = true`
- Set `is_first_login = true`
- Create audit log entry
- Skip password strength validation (since it's temporary)

**Alternatives considered**:
- Bypassing validation in existing endpoint: Rejected - weakens security for general resets
- Having admin enter a strong temporary password: Rejected - user specifically wants "123456" as the default
- Direct DB update from admin frontend: Rejected - violates API-first architecture

**Location**: New route handler in `alshuail-backend/src/routes/passwordManagement.js`

## Decision 4: Bulk Password Setup for Existing Members

**Decision**: Use SQL script executed directly on VPS PostgreSQL.

**Rationale**:
- `setup-default-passwords.sql` already exists with the correct bcrypt hash for "123456"
- Running on 347+ members is a one-time operation best done at DB level
- Sets `password_hash`, `requires_password_change = true`, `is_first_login = true`
- Only affects members where `has_password = false` or `password_hash IS NULL`

**Pre-existing hash**: `$2b$12$OJ5iRDohKqpP2Ne/6XBstO7qeikbJxltZ/vvfrCycWBPpGX5vws/O` (12-round bcrypt)

**Location**: `alshuail-backend/scripts/setup-default-passwords.sql`

## Decision 5: OTP Removal Scope

**Decision**: Remove OTP from mobile app login UI only. Keep backend OTP endpoints intact for now.

**Rationale**:
- Mobile login screen replaces OTP flow with phone+password form
- Backend OTP routes (`/api/otp/*`) can remain mounted - no mobile app calls them
- Removing backend routes is a separate cleanup task to avoid breaking anything
- Admin dashboard doesn't use OTP for login (uses email+password)

**Alternatives considered**:
- Remove OTP backend routes entirely: Rejected - unnecessary risk, not required by Apple
- Keep OTP as hidden option: Rejected - Apple specifically rejected OTP approach

## Decision 6: Mobile Login UI Approach

**Decision**: Replace the two-step OTP flow (phone → OTP code) with a single-step phone+password form.

**Rationale**:
- Simpler UX - one screen instead of two
- Login.jsx currently has `step === 'phone'` and `step === 'otp'` states
- Replace both with a single form: phone number + password + "Login" button
- Keep the same visual styling (gradient background, Arabic labels)

## Decision 7: Forced Password Change Implementation

**Decision**: Modify `ProtectedRoute` in App.jsx to check `requiresPasswordChange` flag and redirect.

**Rationale**:
- `ProtectedRoute` already wraps all authenticated routes
- Adding a check there ensures no page can be accessed until password is changed
- The `/change-password` route itself must be excluded from this redirect
- Auth state stored in localStorage includes the flag from login response

## Existing Infrastructure Inventory

| Component | Status | Location |
|-----------|--------|----------|
| `password_hash` column | Exists | members table |
| `requires_password_change` column | Exists | members table |
| `is_first_login` column | Exists | members table |
| `failed_login_attempts` column | Exists | members table (as `login_attempts`) |
| `account_locked_until` column | Exists | members table |
| Mobile login endpoint | Exists | `/api/auth/mobile-login` |
| Change password endpoint | Exists (needs hardening) | `/api/auth/change-password` |
| Admin reset endpoint | Exists (needs "reset to default" variant) | `/api/password-management/reset` |
| `authService.mobileLogin()` | Exists | `alshuail-mobile/src/services/authService.js` |
| `authService.changePassword()` | Exists | `alshuail-mobile/src/services/authService.js` |
| Setup SQL script | Exists | `alshuail-backend/scripts/setup-default-passwords.sql` |
| Admin security component | Exists | `MemberSecuritySection.jsx` (unused) |
