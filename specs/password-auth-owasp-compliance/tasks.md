# Tasks: Password Authentication OWASP Compliance

**Input**: Design documents from `/specs/password-auth-owasp-compliance/`
**Prerequisites**: spec.md, plan.md

---

## Phase 1: Setup - Feature Flag Infrastructure

**Purpose**: Enable safe rollout with instant rollback capability

- [ ] T001 [US2] Create feature flag middleware in `alshuail-backend/src/middleware/featureFlags.js`
- [ ] T002 [US2] Add `PASSWORD_AUTH_ENABLED` to `alshuail-backend/src/config/env.js`
- [ ] T003 [P] [US2] Update `alshuail-backend/.env.example` with PASSWORD_AUTH_ENABLED=true
- [ ] T004 [P] [US2] Update `alshuail-backend/.env.production` with PASSWORD_AUTH_ENABLED=true

**Checkpoint**: Feature flag infrastructure ready - can toggle password auth on/off

---

## Phase 2: Apply Feature Flag to Routes

**Purpose**: Wire feature flag to password authentication endpoints

- [ ] T005 [US2] Apply feature flag middleware to password routes in `alshuail-backend/src/routes/passwordAuth.routes.js`
- [ ] T006 [US2] Test: Verify `/auth/password/*` returns 503 when flag is false
- [ ] T007 [US2] Test: Verify `/otp/*` still works when password flag is false

**Checkpoint**: Feature flag controls password auth - OTP login works regardless

---

## Phase 3: Fix Phone Enumeration Vulnerability (CRITICAL)

**Purpose**: OWASP compliance - prevent phone number enumeration attacks

- [ ] T008 [US1] Modify `requestOTP()` in `passwordAuth.controller.js:233-334`:
  - Return identical success response for all phone numbers
  - Only send actual OTP if phone is registered
  - Log actual outcome internally for debugging

- [ ] T009 [US1] Modify `/otp/send` in `otp.routes.js:182-275`:
  - Same pattern: consistent response, conditional OTP send
  - Maintain rate limiting for all requests

- [ ] T010 [US1] Modify `loginWithPassword()` in `passwordAuth.controller.js:116-228`:
  - Change "رقم الجوال غير مسجل" to generic "بيانات الدخول غير صحيحة"

- [ ] T011 [US1] Test: Verify identical responses for registered/unregistered phones
- [ ] T012 [US1] Test: Verify rate limiting applies to all requests equally

**Checkpoint**: Phone enumeration vulnerability fixed - identical responses for all phones

---

## Phase 4: Secure OTP Generation

**Purpose**: Replace predictable Math.random() with cryptographically secure randomness

- [ ] T013 [US4] Create `alshuail-backend/src/utils/secureOtp.js`:
  ```javascript
  import crypto from 'crypto';

  export const generateSecureOTP = (length = 6) => {
    const buffer = crypto.randomBytes(4);
    const num = buffer.readUInt32BE(0);
    return (num % 900000 + 100000).toString();
  };
  ```

- [ ] T014 [US4] Replace `generateOTP()` in `passwordAuth.controller.js:25-27` with import from secureOtp.js

- [ ] T015 [US4] Test: Verify OTP generation produces valid 6-digit codes

**Checkpoint**: OTP generation uses crypto.randomBytes()

---

## Phase 5: Secure OTP Storage

**Purpose**: Remove plain text OTP from database, store only hash

- [ ] T016 [US3] Modify database insert in `requestOTP()` at `passwordAuth.controller.js:294-300`:
  - Remove `otp_code: otp` line
  - Keep only `otp_hash: otpHash`

- [ ] T017 [US3] Verify no other code reads `otp_code` column (search codebase)

- [ ] T018 [US3] Test: Verify OTP verification still works with hash-only storage

**Checkpoint**: No plain text OTPs in database

---

## Phase 6: Security Metrics & Logging

**Purpose**: Enable security monitoring and incident detection

- [ ] T019 [US5] Enhance `logSecurityAction()` in `passwordAuth.controller.js:73-111`:
  - Add structured JSON format for log entries
  - Include action_type, member_id, ip_address, timestamp
  - Add log level (info, warn, error) based on action type

- [ ] T020 [US5] Add warning-level log for:
  - Failed login attempts
  - OTP verification failures
  - Account lockouts

- [ ] T021 [US5] Add info-level log for:
  - Successful logins
  - Password changes
  - OTP requests (without revealing if phone exists)

- [ ] T022 [US5] Test: Verify structured logs appear in console/log files

**Checkpoint**: All auth events logged with proper structure

---

## Phase 7: Flutter App Verification

**Purpose**: Ensure mobile app handles new responses gracefully

- [ ] T023 [US2] Review `alshuail-flutter/lib/services/auth_service.dart`:
  - Verify 503 response handling exists
  - Add user-friendly message if missing

- [ ] T024 [US1] Review error handling for generic login error messages:
  - Verify app displays "بيانات الدخول غير صحيحة" appropriately

- [ ] T025 Test: Run Flutter app against modified backend
  - Test password login with flag enabled
  - Test password login with flag disabled
  - Test OTP login (should always work)

**Checkpoint**: Flutter app works correctly with all changes

---

## Phase 8: Documentation & Rollout

**Purpose**: Document changes and prepare for production deployment

- [ ] T026 [P] Update `CLAUDE.md` with new feature flag documentation
- [ ] T027 [P] Update `api_config.dart` endpoints documentation (if needed)
- [ ] T028 Create rollout checklist for production deployment
- [ ] T029 Document rollback procedure

**Checkpoint**: Ready for production deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Apply Flag)**: Depends on Phase 1
- **Phase 3 (Enumeration Fix)**: Depends on Phase 1 (needs flag for safety)
- **Phase 4 (Secure OTP Gen)**: No dependencies - can parallel with Phase 3
- **Phase 5 (Secure OTP Storage)**: Depends on Phase 4
- **Phase 6 (Metrics)**: No dependencies - can parallel with Phase 3-5
- **Phase 7 (Flutter)**: Depends on Phase 2, 3
- **Phase 8 (Documentation)**: Depends on all previous phases

### Parallel Opportunities

```text
Phase 1 ──► Phase 2 ──► Phase 7 ──► Phase 8
    │           │
    └───► Phase 3 ───────────────┘
    │
    └───► Phase 4 ──► Phase 5 ───┘
    │
    └───► Phase 6 ───────────────┘
```

---

## Files Modified Summary

| File | Change Type | Phase |
|------|-------------|-------|
| `src/middleware/featureFlags.js` | CREATE | 1 |
| `src/config/env.js` | MODIFY | 1 |
| `.env.example` | MODIFY | 1 |
| `.env.production` | MODIFY | 1 |
| `src/routes/passwordAuth.routes.js` | MODIFY | 2 |
| `src/controllers/passwordAuth.controller.js` | MODIFY | 3, 4, 5, 6 |
| `src/routes/otp.routes.js` | MODIFY | 3 |
| `src/utils/secureOtp.js` | CREATE | 4 |
| `Flutter: auth_service.dart` | VERIFY | 7 |

---

## Testing Checklist

Before production deployment:

- [ ] Password login works with flag enabled
- [ ] Password login returns 503 with flag disabled
- [ ] OTP login works regardless of flag setting
- [ ] Identical responses for registered/unregistered phones on forgot-password
- [ ] Rate limiting applies to all requests
- [ ] OTP verification works with hash-only storage
- [ ] Structured logs appear for all auth events
- [ ] Flutter app handles 503 gracefully
- [ ] No regressions in existing functionality
