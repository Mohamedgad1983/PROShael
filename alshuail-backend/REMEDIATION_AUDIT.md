# Remediation Audit Report

**Date**: 2026-02-13
**Branch**: `fix/critical-remediation`
**Spec**: `.specify/CLAUDE_CODE_FIX_SPEC.md`

---

## 1. Dead Directories (3 directories)

| Directory | Location | Contents | Action |
|-----------|----------|----------|--------|
| `Mobile/` | Project root | 1 file (nul) | DELETE |
| `Monitormember/` | Project root | 8 PNG screenshots | DELETE |
| `databaseFrom SupbaseTovps/` | Project root | 6 MD migration docs | DELETE |

### Additional: Duplicate Root-Level Directories
| Directory | Location | Contents | Action |
|-----------|----------|----------|--------|
| `routes/` | Backend root | 8 old route files (duplicates of src/routes/) | DELETE |
| `middleware/` | Backend root | 5 old middleware files (duplicates of src/middleware/) | DELETE |

---

## 2. Backup Files (27 files)

### Backend (9 files)
- `.env.example.backup`
- `server.js.backup`
- `src/services/receiptService.js.backup`
- `src/routes/initiatives.js.backup`
- `src/routes/dashboard.js.backup`
- `src/routes/memberMonitoring.js.backup`
- `src/routes/subscriptions.js.backup`
- `src/routes/payments.js.backup`
- `config/storage.js.supabase-backup`

### Admin Frontend (16 files)
- `.env.backup`
- `craco.config.js.backup`
- `postcss.config.js.backup`
- `src/App.tsx.backup`
- `src/index.css.backup`
- `tailwind.config.v3.backup`
- `src/utils/biometricAuth.jsx.backup`
- `src/components/MemberMonitoring/MemberMonitoringDashboard.css.backup`
- `build/monitoring-standalone/index.html.backup`
- `public/monitoring-standalone/index.html.backup`
- `src/components/Members/UnifiedMembersManagement.tsx.backup`
- `BACKUPS/dropdown-enhancement-2025-01-21/*.backup` (7 files)

### Other Extensions
- `alshuail-admin-arabic/src/components/StyledDashboard.tsx.bak`
- `alshuail-backend/config/_archived/database.js.old`

---

## 3. Duplicate Route Pairs (7 pairs)

| # | Active File | Duplicate File | Mount Path | Resolution |
|---|-------------|----------------|------------|------------|
| 1 | `family-tree.routes.js` (82L, controller) | `familyTree.js` (796L, inline) | `/api/tree` vs `/api/family-tree` | Merge into canonical |
| 2 | `initiatives.js` (34L, controller) | `initiativesEnhanced.js` (681L, inline) | `/api/initiatives` vs `/api/initiatives-enhanced` | Merge features |
| 3 | `settings.js` (570L, active) | `settingsImproved.js` (797L, NOT mounted) | `/api/settings` | Replace with improved |
| 4 | `memberMonitoring.js` (36L, active) | `memberMonitoringOptimized.js` (178L, NOT mounted) | `/api/member-monitoring` | Replace with optimized |
| 5 | `notifications.js` (58L, admin) | `notificationRoutes.js` (36L, member) | `/api/notifications` | Merge into one |
| 6 | `subscriptionRoutes.js` (129L, active) | `subscriptions.js` (103L, NOT mounted) | `/api/subscriptions` | Keep subscriptionRoutes |
| 7 | `src/routes/` (47 files) | `routes/` root (8 old files) | N/A | Delete root routes/ |

### Auth Route Files (3 files - need consolidation)
- `src/routes/auth.js` - Main auth (login, OTP, admin auth)
- `src/routes/authRoutes.js` - Additional auth routes
- `src/routes/password-auth.routes.js` - Password-based auth

---

## 4. Console Statements in Source Code (109 total)

### By Type
| Type | Count | Percentage |
|------|-------|------------|
| console.error | 72 | 66.1% |
| console.log | 24 | 22.0% |
| console.warn | 13 | 11.9% |
| **TOTAL** | **109** | 100% |

### Top Files
| # | File | Count |
|---|------|-------|
| 1 | `src/controllers/passwordAuth.controller.js` | 20 |
| 2 | `src/services/twilioService.js` | 16 |
| 3 | `src/services/firebaseService.js` | 14 |
| 4 | `src/config/env.js` | 11 |
| 5 | `src/controllers/family-tree-extended.controller.js` | 10 |
| 6 | `src/controllers/approval.controller.js` | 7 |
| 7 | `src/controllers/admin.controller.js` | 6 |
| 8 | `src/services/whatsappOtpService.js` | 5 |
| 9 | `src/middleware/connectionPool.js` | 5 |
| 10 | `src/controllers/family-tree.controller.js` | 5 |
| 11 | `src/utils/hijriConverter.js` | 2 |
| 12 | `src/utils/audit-logger.js` | 2 |
| 13 | `src/middleware/rbac.middleware.js` | 2 |
| 14 | `src/middleware/csrf.js` | 2 |
| 15 | `src/utils/logger.js` | 1 |
| 16 | `src/routes/csrf.js` | 1 |

---

## 5. TODO Comments (39 total)

### By File
| File | Count | Category |
|------|-------|----------|
| `src/controllers/financialReportsController.js` | 33 | IMPLEMENT (stub functions) |
| `src/controllers/approval.controller.js` | 2 | IMPLEMENT (WhatsApp notify) |
| `src/controllers/admin.controller.js` | 1 | IMPLEMENT (WhatsApp invite) |
| `src/controllers/memberController.js` | 1 | IMPLEMENT (file storage) |
| `src/routes/news.js` | 1 | IMPLEMENT (FCM integration) |
| `src/services/bankTransferService.js` | 1 | IMPLEMENT (storage impl) |

### Priority Classification
**HIGH** - Production impact:
- File storage migration (memberController, bankTransferService) - 2 TODOs
- WhatsApp notifications for payment approval/rejection - 2 TODOs
- FCM push notifications for news - 1 TODO

**MEDIUM** - Feature completion:
- Financial report helper functions - 33 TODOs (bulk stub implementations)
- Admin invitation flow - 1 TODO

---

## 6. Credential Exposure

### CRITICAL: .env.production Tracked in Git
| Credential | Exposed | Status |
|-----------|---------|--------|
| Database password (`AlShuail@2025SecureDB!`) | YES | ROTATE REQUIRED |
| JWT secret | YES | ROTATE REQUIRED |
| Ultramsg API token | YES | ROTATE REQUIRED |
| Ultramsg Instance ID | YES | CHECK |
| Supabase Service Key | YES | ROTATE (if still used) |
| Supabase Anon Key | YES | ROTATE (if still used) |

### .gitignore Status
- `.env.*` rule exists BUT `.env.production` was committed before the rule
- `.env` also appears to be tracked
- Need `git rm --cached` to stop tracking

### Source Code: CLEAN
- All config files use `process.env` correctly
- No hardcoded credentials in source code

---

## 7. Orphaned Files in Backend Root (~71 files)

### Categories
| Category | Count | Action |
|----------|-------|--------|
| Legacy test scripts | 14 | DELETE |
| Fix/utility scripts | 11 | DELETE |
| One-off scripts | 8 | DELETE |
| SQL schema files | 5 | MOVE to migrations/ or DELETE |
| Log files | 6 | DELETE + .gitignore |
| Test result files | 2 | DELETE |
| Binary test files | 2 | DELETE |
| Old documentation | 13 | DELETE (info in CLAUDE.md) |
| ZIP archives (root) | 4 | DELETE |
| System junk (nul) | 1 | DELETE |

---

## Summary Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Health Score | 6.5/10 | 8.5/10 |
| Exposed Credentials | 6+ secrets | Zero |
| Dead Directories | 5 | Zero |
| Backup Files | 27 | Zero |
| Duplicate Route Pairs | 7 | Zero |
| Console.log in src/ | 109 | Zero |
| TODO Comments | 39 | <10 tracked |
| Orphaned Root Files | ~71 | Zero |
| Auth Route Files | 3 | 1 |
