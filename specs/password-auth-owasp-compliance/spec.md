# Feature Specification: Password Authentication OWASP Compliance

**Feature Branch**: `password-auth-owasp-compliance`
**Created**: 2026-01-09
**Status**: Ready for Implementation
**Input**: User request for OWASP-compliant password authentication with feature flags

---

## Executive Summary

### What Already Exists (Analysis Complete)

The Al-Shuail system **already has** a comprehensive password authentication implementation in:
- `/alshuail-backend/src/controllers/passwordAuth.controller.js` (963 lines)
- `/alshuail-backend/src/routes/passwordAuth.routes.js` (140 lines)
- `/alshuail-backend/src/routes/otp.routes.js` (477 lines)

**Existing Features:**
- Password login with bcryptjs (12 salt rounds)
- OTP via WhatsApp (Ultramsg service)
- OTP stored with bcrypt hash (10 rounds)
- Rate limiting (60 second cooldown)
- Max OTP attempts (3)
- Max login attempts (5)
- Account lockout (30 minutes after 5 failed attempts)
- Security audit logging with IP address
- Face ID / Touch ID authentication
- Admin routes for managing member security
- JWT tokens (30 days for members)

### Critical OWASP Compliance Gaps

| Gap | Severity | Location | Issue |
|-----|----------|----------|-------|
| Phone Enumeration | **CRITICAL** | `passwordAuth.controller.js:251-256` | Returns "رقم الجوال غير مسجل في النظام" - reveals if phone exists |
| Phone Enumeration | **CRITICAL** | `otp.routes.js:198-203` | Same issue in OTP send endpoint |
| No Feature Flag | **HIGH** | Missing | Cannot safely toggle password auth on/off |
| Plain Text OTP | **MEDIUM** | `passwordAuth.controller.js:297` | OTP stored in plain text alongside hash |
| Weak OTP Generation | **MEDIUM** | `passwordAuth.controller.js:26` | Uses Math.random() instead of crypto |
| Missing Metrics | **LOW** | N/A | No instrumentation for monitoring |

---

## User Scenarios & Testing

### User Story 1 - OWASP-Compliant Forgot Password (Priority: P1)

A member who forgot their password should be able to reset it via WhatsApp OTP without revealing whether their phone number exists in the system.

**Why this priority**: Security vulnerability - phone enumeration enables targeted attacks and privacy breach.

**Independent Test**: Can be tested by attempting forgot-password with registered and unregistered phones - both should receive identical responses.

**Acceptance Scenarios**:

1. **Given** a registered phone number, **When** user requests OTP for password reset, **Then** system returns "تم إرسال رمز التحقق" with 200 OK (OTP sent via WhatsApp)
2. **Given** an unregistered phone number, **When** user requests OTP for password reset, **Then** system returns "تم إرسال رمز التحقق" with 200 OK (no OTP sent, but response identical)
3. **Given** a rate-limited phone, **When** user requests OTP again within 60 seconds, **Then** system returns 429 with wait time (applies to both registered and unregistered)

---

### User Story 2 - Feature Flag Control (Priority: P1)

Administrators should be able to enable/disable password authentication via environment variable without code deployment.

**Why this priority**: Safe production rollout - allows instant rollback if issues discovered.

**Independent Test**: Set `PASSWORD_AUTH_ENABLED=false` and verify all password endpoints return 503.

**Acceptance Scenarios**:

1. **Given** `PASSWORD_AUTH_ENABLED=true`, **When** user attempts password login, **Then** login proceeds normally
2. **Given** `PASSWORD_AUTH_ENABLED=false`, **When** user attempts password login, **Then** system returns 503 "هذه الميزة غير متاحة حالياً"
3. **Given** `PASSWORD_AUTH_ENABLED=false`, **When** user attempts OTP login, **Then** OTP flow works normally (fallback)

---

### User Story 3 - Secure OTP Storage (Priority: P2)

OTP codes should only be stored as cryptographic hashes, never in plain text.

**Why this priority**: Defense in depth - if database is compromised, OTPs remain protected.

**Independent Test**: Verify `password_reset_tokens.otp_code` column is removed/unused, only `otp_hash` is stored.

**Acceptance Scenarios**:

1. **Given** OTP is generated, **When** stored in database, **Then** only bcrypt hash is stored, no plain text
2. **Given** OTP verification request, **When** comparing, **Then** bcrypt.compare() is used against stored hash

---

### User Story 4 - Cryptographic OTP Generation (Priority: P2)

OTP codes should be generated using cryptographically secure random numbers.

**Why this priority**: Math.random() is predictable - crypto.randomBytes() is secure.

**Independent Test**: Code review - verify `crypto.randomBytes()` is used instead of `Math.random()`.

**Acceptance Scenarios**:

1. **Given** OTP generation is needed, **When** generateOTP() is called, **Then** crypto.randomBytes() is used for randomness

---

### User Story 5 - Security Metrics & Monitoring (Priority: P3)

System should emit metrics/logs for monitoring authentication events for incident detection.

**Why this priority**: Enables security monitoring and alerting for anomalous behavior.

**Independent Test**: Verify logs contain structured events for all auth operations.

**Acceptance Scenarios**:

1. **Given** successful login, **When** event completes, **Then** structured log emitted with memberId, method, IP
2. **Given** failed login, **When** event completes, **Then** structured log emitted with phone (masked), reason, IP
3. **Given** account lockout, **When** triggered, **Then** alert-level log emitted

---

### Edge Cases

- What happens when WhatsApp service is down? → Return generic message, log error, don't reveal phone status
- What happens when database is unavailable? → Return 500 error without revealing internal state
- What happens during feature flag transition? → Active sessions remain valid, new logins respect flag

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST return identical responses for registered and unregistered phone numbers on forgot-password requests (OWASP ASVS 2.5.2)
- **FR-002**: System MUST support `PASSWORD_AUTH_ENABLED` environment variable for feature flag control
- **FR-003**: System MUST NOT store OTP codes in plain text - only cryptographic hashes
- **FR-004**: System MUST use `crypto.randomBytes()` for OTP generation, not `Math.random()`
- **FR-005**: System MUST emit structured logs for all authentication events
- **FR-006**: System MUST continue supporting OTP-only login as fallback when password auth is disabled

### Key Entities (Existing - No Changes)

- **Member**: User with phone, password_hash, has_password, locked_until, failed_login_attempts
- **password_reset_tokens**: OTP storage with member_id, phone, otp_hash, expires_at, is_used, attempts

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Phone enumeration test passes - identical responses for registered/unregistered phones
- **SC-002**: Feature flag toggle takes effect within 1 second without restart
- **SC-003**: No plain text OTPs exist in database after migration
- **SC-004**: All auth events appear in structured logs within 100ms of occurrence
- **SC-005**: Zero security regressions in existing functionality

---

## Technical Constraints

- **TC-001**: Must maintain backward compatibility with existing mobile app
- **TC-002**: Must not break existing OTP login flow
- **TC-003**: Must work with current PostgreSQL schema (raw SQL, not Prisma/Knex)
- **TC-004**: Must support bcryptjs (not switching to Argon2id in this iteration)
