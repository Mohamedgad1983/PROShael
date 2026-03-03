# Tasks: Temporary Password Login for All Members

**Input**: Design documents from `/specs/001-member-temp-password/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.md, quickstart.md

**Tests**: Not requested in feature specification. No test tasks generated.

**Organization**: Tasks grouped by user story. US1 and US2 are both P1 and form the MVP together (login flow requires password change to complete). US3 requires no additional code (handled implicitly by US1 implementation). US4 is independent.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Verify existing infrastructure and prepare database script

- [ ] T001 Review and verify `alshuail-backend/scripts/setup-default-passwords.sql` matches the bulk setup SQL in data-model.md: UPDATE members SET password_hash to bcrypt("123456"), requires_password_change=true, is_first_login=true, has_password=false WHERE password_hash IS NULL OR has_password=false

---

## Phase 2: Foundational (Backend Hardening)

**Purpose**: Harden existing backend endpoints before any mobile UI work begins

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 [P] Harden the change-password endpoint in `alshuail-backend/src/routes/auth.js` (lines 617-688): add password strength validation (min 8 chars, uppercase, lowercase, number), reject "123456" as new password, verify current password with bcrypt for non-first-login, add rate limiting (5 attempts per hour), use generic error messages to prevent phone number enumeration (e.g., "Invalid credentials" not "Phone not found"), use Winston logger for security events
- [ ] T003 [P] Create `POST /api/password-management/reset-to-default` endpoint in `alshuail-backend/src/routes/passwordManagement.js`: accept `{ memberId }` body, super_admin only, set password_hash to bcrypt hash of "123456" (`$2b$12$OJ5iRDohKqpP2Ne/6XBstO7qeikbJxltZ/vvfrCycWBPpGX5vws/O`), set requires_password_change=true, is_first_login=true, has_password=false, reset login_attempts=0, clear account_locked_until, log to audit_logs, return member name and phone in response

- [ ] T003b [P] Ensure new member creation sets default password in `alshuail-backend/src/routes/members.js`: when creating a new member via POST /api/members, set password_hash to bcrypt hash of "123456" (`$2b$12$OJ5iRDohKqpP2Ne/6XBstO7qeikbJxltZ/vvfrCycWBPpGX5vws/O`), requires_password_change=true, is_first_login=true, has_password=false (covers FR-013: new members added after bulk setup also get temporary password)

**Checkpoint**: Backend endpoints ready. Mobile UI implementation can now begin.

---

## Phase 3: User Story 1 + User Story 2 - Password Login & Forced Change (Priority: P1) MVP

**Goal**: Members can log in with phone+password (replacing WhatsApp OTP), are forced to change the temporary password on first login, and can change their password anytime from Settings.

**Independent Test**: Enter a member's phone number + "123456" on login screen, verify redirect to password change, set new password, verify dashboard access. Then go to Settings > Change Password and verify it works again.

### Implementation

- [ ] T004 [US1] Update auth context and routing in `alshuail-mobile/src/App.jsx`: (1) Add `requiresPasswordChange` field to auth state stored in localStorage alongside user data, (2) modify `ProtectedRoute` component to check `user.requiresPasswordChange` and redirect to `/change-password` if true (exclude `/change-password` route itself from redirect), (3) add new route: `<Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />`, (4) update `login()` function to store `requires_password_change` flag from login response, (5) add `clearPasswordChangeFlag()` function to auth context that sets `requiresPasswordChange=false` and updates localStorage
- [ ] T005 [US1] Replace OTP login flow with phone+password form in `alshuail-mobile/src/pages/Login.jsx`: remove the two-step OTP state machine (step=phone/otp), remove all OTP-related state (otp[], otpError, verifying, expiryTime, resendCooldown), remove OTP service calls (sendOTP, verifyOTP, resendOTP), create single-form login with phone number input and password input (with show/hide toggle), add login button calling `authService.mobileLogin(phone, password)`, on success store token via `localStorage.setItem('alshuail_token', response.token)` then call `login(response.user)`, check `response.requires_password_change`: if true navigate to `/change-password` with `state: { isFirstLogin: true }`, else navigate to `/dashboard`, show Arabic error messages for invalid credentials and account lockout, keep existing gradient background styling and Arabic labels, keep phone number validation (Kuwait +965 / Saudi +966)
- [ ] T006 [P] [US2] Create password change page at `alshuail-mobile/src/pages/ChangePassword.jsx`: form with three fields (current password, new password, confirm password) each with show/hide toggle using Eye/EyeOff icons from lucide-react, password strength indicator showing requirements (8+ chars, uppercase, lowercase, number), real-time validation (password match, strength check), detect `location.state?.isFirstLogin` to auto-fill current password as "123456" and show Arabic notice about forced change, call `authService.changePassword(currentPassword, newPassword)` on submit, on success call `clearPasswordChangeFlag()` from auth context and navigate to `/dashboard`, show Arabic error messages (wrong current password, weak new password), Arabic RTL layout matching mobile app styling (gradient-primary theme), prevent navigation away when isFirstLogin is true (block back button)
- [ ] T007 [P] [US2] Add "Change Password" menu item in `alshuail-mobile/src/pages/Settings.jsx`: import `Lock` icon from lucide-react, add new item to first settings group (الإعدادات العامة) after the language item: `{ icon: Lock, label: 'تغيير كلمة المرور', subtitle: 'تحديث بيانات الأمان', type: 'link', onClick: () => navigate('/change-password') }`, import `useNavigate` from react-router-dom if not already imported, ensure link items with onClick render correctly (add cursor-pointer and click handler to the settings item row)

**Checkpoint**: MVP complete. Members can login with "123456", are forced to change password, can login with personal password, and can change password from Settings. User Story 3 (login with personal password) is automatically handled - no additional code needed since mobile-login endpoint returns `requires_password_change: false` for members with personal passwords.

---

## Phase 4: User Story 4 - Admin Resets Member Password (Priority: P2)

**Goal**: Admins can reset a member's password back to "123456" from the member details modal, re-enabling the forced password change flow.

**Independent Test**: As admin, open member details modal, click "Reset Password", confirm, then login as that member with "123456" and verify forced password change.

### Implementation

- [ ] T008 [US4] Add "Reset Password" button to member edit modal in `alshuail-admin-arabic/src/components/Members/TwoSectionMembers.jsx`: add button in modal footer between Cancel and Save buttons, styled with warning colors (amber/yellow: bg-amber-50, text-amber-700, border-amber-300), with KeyIcon from @heroicons/react/24/outline, labeled "إعادة تعيين كلمة المرور", show only for super_admin role, on click show confirmation dialog (Arabic: "هل أنت متأكد من إعادة تعيين كلمة المرور للعضو [name]؟ سيتم تعيين كلمة المرور إلى 123456"), on confirm call `POST /api/password-management/reset-to-default` with `{ memberId: editingMember.id }` using auth token from context, show success toast (Arabic: "تم إعادة تعيين كلمة المرور بنجاح") or error toast on failure

**Checkpoint**: Admin reset flow complete. Full feature is now functional.

---

## Phase 5: Deploy & Verification

**Purpose**: Run database migration, deploy all changes, and verify end-to-end

- [ ] T009 Run bulk password setup SQL on VPS: `ssh root@213.199.62.185` then `psql -U alshuail -d alshuail_db` and execute the UPDATE from data-model.md to set temporary password for all members without personal passwords, verify affected row count matches expected (should be ~347 members)
- [ ] T010 Deploy backend to VPS: push code to git, `ssh root@213.199.62.185 "cd /var/www/PROShael && git pull && systemctl restart alshuail-backend.service"`, verify with `curl https://api.alshailfund.com/api/health`
- [ ] T011 Build and deploy mobile PWA: run `npm run build` in `alshuail-mobile/`, deploy built files to VPS: `scp -r dist/* root@213.199.62.185:/var/www/mobile/`
- [ ] T012 End-to-end verification per quickstart.md checklist: (1) member login with phone+"123456" works, (2) forced password change redirect works, (3) strong password can be set, (4) login with new password goes to dashboard, (5) Settings > Change Password works, (6) admin can reset member password, (7) account locks after 5 failed attempts, (8) all screens display Arabic RTL correctly, (9) no WhatsApp OTP visible anywhere, (10) verify bilingual support - Arabic error messages display correctly with English message_en fields in API responses

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories
- **US1+US2 (Phase 3)**: Depends on Phase 2 backend completion
- **US4 (Phase 4)**: Depends on Phase 2 (needs reset-to-default endpoint from T003) - can run in parallel with Phase 3
- **Deploy (Phase 5)**: Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: Depends on T002 (hardened change-password endpoint)
- **US2 (P1)**: Tightly coupled with US1 - forced password change flow requires both. T006 and T007 can run in parallel with T004/T005 (different files)
- **US3 (P2)**: No additional code needed. Implicitly handled by US1 implementation - mobile-login returns `requires_password_change: false` for members with personal passwords, ProtectedRoute allows access
- **US4 (P2)**: Independent of US1-US3. Only depends on T003 (reset-to-default endpoint). Can be developed in parallel with Phase 3

### Within Phase 3

- T004 (App.jsx) MUST complete before T005 (Login.jsx) - Login needs auth context changes
- T006 (ChangePassword.jsx) is [P] - new file, no conflicts
- T007 (Settings.jsx) is [P] - different file, no conflicts

### Parallel Opportunities

```
Phase 2 (parallel):
  T002: Harden auth.js change-password  ─┐
  T003: Create reset-to-default endpoint ─┘ Both run simultaneously

Phase 3 + Phase 4 (parallel after Phase 2):
  Phase 3 (sequential within):
    T004: App.jsx ──> T005: Login.jsx
                  ──> T006: ChangePassword.jsx [P]
                  ──> T007: Settings.jsx [P]
  Phase 4 (parallel with Phase 3):
    T008: TwoSectionMembers.jsx
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational - T002 and T003 in parallel
3. Complete Phase 3: US1+US2 - T004 → T005, then T006+T007 in parallel
4. **STOP and VALIDATE**: Test complete login → forced change → login with new password flow
5. Deploy mobile app if ready (T009-T011)

### Full Delivery

1. Setup + Foundational → Backend ready
2. US1+US2 (Phase 3) + US4 (Phase 4) → Run in parallel
3. Deploy (Phase 5) → All changes live
4. Verify (T012) → Feature complete

### Summary

| Phase | Tasks | Parallel | Estimated |
|-------|-------|----------|-----------|
| Setup | 1 | - | 10 min |
| Foundational | 2 | T002 ∥ T003 | 30 min |
| US1+US2 MVP | 4 | T006 ∥ T007 | 60 min |
| US4 | 1 | ∥ Phase 3 | 30 min |
| Deploy | 4 | Sequential | 20 min |
| **Total** | **12** | | **~2.5 hrs** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US3 (login with personal password) has NO tasks - it's implicitly handled by US1 code
- T002 and T003 are parallelizable (different files in backend)
- T006 and T007 are parallelizable (different files in mobile)
- Phase 3 and Phase 4 are parallelizable (different codebases: mobile vs admin)
- Backend has NO schema changes - all database columns already exist
- `authService.mobileLogin()` and `authService.changePassword()` already exist in mobile app - no service file changes needed
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
