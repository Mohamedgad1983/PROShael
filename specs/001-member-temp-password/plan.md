# Implementation Plan: Temporary Password Login for All Members

**Branch**: `001-member-temp-password` | **Date**: 2026-03-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-member-temp-password/spec.md`

## Summary

Replace WhatsApp OTP login in the mobile app with phone+password authentication (per Apple review team requirement). Set temporary password "123456" for all 347+ existing members, force password change on first login, add password change UI in Settings, and provide admin password reset capability. The backend infrastructure (endpoints, database columns, auth logic) already exists - implementation is primarily mobile UI changes, OTP removal, and backend hardening.

## Technical Context

**Language/Version**: Node.js 18+ (ES Modules) backend, React 18 + Vite 5 mobile PWA, React 18 + TypeScript admin
**Primary Dependencies**: Express.js, pg (node-postgres), bcrypt, jsonwebtoken, axios, react-router-dom, lucide-react
**Storage**: PostgreSQL 16 on VPS (localhost), `members` table already has all password columns
**Testing**: Jest (backend), manual verification (frontend)
**Target Platform**: Mobile PWA (all browsers), Admin dashboard (Cloudflare Pages)
**Project Type**: Web application (backend + mobile PWA + admin dashboard)
**Performance Goals**: Login response < 2s, password change < 1s
**Constraints**: Arabic RTL layout, elderly-friendly accessibility (16px+ fonts), 347+ members
**Scale/Scope**: 347 members, 3 files modified (mobile), 1 file created (mobile), 2 files modified (backend), 1 file modified (admin)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Arabic-First, RTL Excellence | PASS | All new UI screens in Arabic, RTL layout |
| II. Member Data Security | PASS | bcrypt hashing, JWT auth, account lockout, audit logging |
| III. API-First Architecture | PASS | All operations through REST API endpoints |
| IV. Mobile-First Design | **VIOLATION** | Constitution says "WhatsApp OTP MUST be the primary authentication method for members" - we are removing it |
| V. Financial Accuracy | N/A | No financial operations in this feature |
| VI. Fund Balance Integrity | N/A | No balance operations in this feature |
| VII. Elderly-Friendly Accessibility | PASS | 16px+ fonts, clear contrast, simple forms |

**Post-Phase 1 Re-check**: Same results. The Principle IV violation is documented in Complexity Tracking below.

## Project Structure

### Documentation (this feature)

```text
specs/001-member-temp-password/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research findings
├── data-model.md        # Phase 1: entity model and state transitions
├── quickstart.md        # Phase 1: implementation quickstart guide
├── contracts/           # Phase 1: API contracts
│   └── api-contracts.md
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
alshuail-backend/
├── src/
│   ├── routes/
│   │   ├── auth.js                    # MODIFY: harden change-password endpoint
│   │   └── passwordManagement.js      # MODIFY: add reset-to-default endpoint
│   └── middleware/
│       └── auth.js                    # existing JWT middleware (no changes)
├── scripts/
│   └── setup-default-passwords.sql    # existing SQL script (run on VPS)
└── server.js                          # existing route mounting (no changes)

alshuail-mobile/
├── src/
│   ├── pages/
│   │   ├── Login.jsx                  # MODIFY: replace OTP with phone+password
│   │   ├── ChangePassword.jsx         # CREATE: new password change page
│   │   └── Settings.jsx               # MODIFY: add change password menu item
│   ├── services/
│   │   └── authService.js             # existing (mobileLogin + changePassword already exist)
│   ├── utils/
│   │   └── api.js                     # existing axios config (no changes)
│   └── App.jsx                        # MODIFY: add route + ProtectedRoute password check

alshuail-admin-arabic/
├── src/
│   └── components/
│       └── Members/
│           └── TwoSectionMembers.jsx  # MODIFY: add reset password button in modal
```

**Structure Decision**: Existing multi-project web application structure. No new directories needed. One new file (`ChangePassword.jsx`), rest are modifications to existing files.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle IV: Removing WhatsApp OTP as primary auth | Apple review team explicitly rejected WhatsApp OTP login method. App cannot be published on App Store without this change. | Keeping OTP would prevent App Store publication. Password auth is the standard alternative Apple expects. Constitution Principle IV should be amended to reflect "Password-based authentication" as the primary method for members. |
| Bcrypt salt rounds | Using 12 rounds (constitution minimum) for all password hashing. Pre-existing hash regenerated from 10 to 12 rounds. | N/A - compliance fix, no alternative needed. |
