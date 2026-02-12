# Tasks: Supabase to VPS PostgreSQL Migration & Codebase Cleanup

**Input**: Design documents from `/specs/003-supabase-to-vps-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.md, quickstart.md
**Branch**: `003-supabase-to-vps-migration`

**Tests**: Not explicitly requested in spec. Tests omitted. Existing Jest suite used for verification.

**Organization**: Tasks grouped by user story (8 stories: 3x P0, 4x P1, 1x P2). Each story independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story (US1-US8)
- All file paths relative to repository root (`D:\PROShael\`)

---

## Phase 1: Setup & Foundation

**Purpose**: Create the unified database service and configure environment. BLOCKS all user stories.

- [x] T001 Create unified database service with pg.Pool, query(), and getClient() in `alshuail-backend/src/services/database.js` per data-model.md (pool: max 20, min 2, idle 30s, timeout 5s, connectionString from DATABASE_URL)
- [x] T002 [P] Add DATABASE_URL to backend .env files (`alshuail-backend/.env`, `.env.production`) using format `postgresql://alshuail:PASSWORD@localhost:5432/alshuail_db`
- [x] T003 [P] Update env.js to export DATABASE_URL config and mark DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD as deprecated in `alshuail-backend/src/config/env.js`
- [x] T004 Verify new database service connects to VPS PostgreSQL: run `query('SELECT count(*) FROM members')` and confirm 347+ records returned

**Checkpoint**: Foundation ready - services/database.js exists and connects successfully

---

## Phase 2: User Story 1 - Database Migration to Self-Hosted PostgreSQL (Priority: P0) MVP

**Goal**: Replace all Supabase-style `supabase.from().select().eq()` patterns with direct `query()` parameterized SQL across 137 files (797+ call sites). Remove pgQueryBuilder abstraction layer.

**NOTE**: Skip converting files that will be deleted/merged in US6 (Phase 7). Specifically: `memberController.js` (merged into membersController.js), `notificationController.js` (merged into notificationsController.js), `membersMonitoringController.js` (merged into memberMonitoringController.js), `rbac.middleware.js` (merged into rbacMiddleware.js). Convert only the canonical version.

**Independent Test**: Run `grep -r "supabase" alshuail-backend/src/ --include="*.js" -l` and confirm ZERO files. Run all API endpoints and verify identical JSON responses.

**Conversion Pattern** (apply to every task below):
```
BEFORE: import { supabase } from '../config/database.js';
        const { data, error } = await supabase.from('table').select('*').eq('id', id);
AFTER:  import { query, getClient } from '../services/database.js';
        const { rows } = await query('SELECT * FROM table WHERE id = $1', [id]);
```
**IMPORTANT**: All imports MUST target `../services/database.js` directly (NOT `../config/database.js`). config/database.js will be deleted per constitution rule 7.

### Middleware Conversion (6 files)

- [ ] T005 [P] [US1] Convert auth middleware: replace supabase imports with query() in `alshuail-backend/src/middleware/auth.js` (4 calls), `superAdminAuth.js` (3 calls), `memberSuspensionCheck.js` (2 calls)
- [ ] T006 [P] [US1] Convert RBAC middleware: replace supabase imports with query() in `alshuail-backend/src/middleware/rbacMiddleware.js` (4 calls), `rbac.middleware.js` (2 calls), `roleExpiration.js` (6 calls)

### Utility Conversion (9 files)

- [ ] T007 [P] [US1] Convert core utilities: replace supabase imports with query() in `alshuail-backend/src/utils/accessControl.js` (10 calls), `audit-logger.js` (4 calls), `profileValidation.js` (7 calls)
- [ ] T008 [P] [US1] Convert support utilities: replace supabase imports with query() in `alshuail-backend/src/utils/memberHelpers.js` (5 calls), `errorCodes.js` (1 call), `jsonSanitizer.js` (1 call), `inputSanitizer.js` (1 call), `hijriDateUtils.js` (1 call), `initializeTestData.js` (7 calls)

### Service Conversion (9 files)

- [ ] T009 [P] [US1] Convert and rename supabaseService.js to memberService.js with query() in `alshuail-backend/src/services/supabaseService.js` (9 calls); update all imports referencing it. Convert bankTransferService.js (14 calls)
- [ ] T010 [P] [US1] Convert financial services: replace supabase with query()/getClient() in `alshuail-backend/src/services/paymentProcessingService.js` (11 calls), `financialAnalyticsService.js` (7 calls)
- [ ] T011 [P] [US1] Convert remaining services: replace supabase with query() in `alshuail-backend/src/services/memberMonitoringQueryService.js` (10 calls), `databaseOptimizationService.js` (10 calls), `optimizedReportQueries.js` (8 calls), `reportExportService.js` (3 calls), `notificationService.js` (5 calls)

### Controller Conversion - Members Domain (2 tasks, 8 files)

- [ ] T012 [P] [US1] Convert high-call member controllers: `alshuail-backend/src/controllers/membersController.js` (26 calls), `memberController.js` (15 calls), `memberImportController.js` (14 calls), `memberRegistrationController.js` (11 calls)
- [ ] T013 [P] [US1] Convert low-call member controllers: `alshuail-backend/src/controllers/memberMonitoringController.js` (8 calls), `membersMonitoringController.js` (2 calls), `memberSuspensionController.js` (4 calls), `memberStatementController.js` (8 calls)

### Controller Conversion - Financial Domain (2 tasks, 10 files)

- [ ] T014 [P] [US1] Convert high-call financial controllers with getClient() for transactions: `alshuail-backend/src/controllers/subscriptionController.js` (20 calls), `paymentsController.js` (14 calls), `balanceAdjustmentController.js` (17 calls)
- [ ] T015 [P] [US1] Convert low-call financial controllers: `alshuail-backend/src/controllers/expensesController.js` (12 calls), `expenseCategoriesController.js` (11 calls), `fundBalanceController.js` (8 calls), `financialReportsController.js` (4 calls), `paymentAnalyticsController.js` (4 calls), `bankTransfersController.js` (3 calls), `statementController.js` (11 calls)

### Controller Conversion - Auth/Admin (2 tasks, 8 files)

- [ ] T016 [P] [US1] Convert auth/admin controllers: `alshuail-backend/src/controllers/passwordAuth.controller.js` (38 calls), `admin.controller.js` (10 calls), `audit.controller.js` (10 calls), `approval.controller.js` (6 calls)
- [ ] T017 [P] [US1] Convert notification controllers: `alshuail-backend/src/controllers/notificationsController.js` (15 calls), `notificationController.js` (6 calls), `push-notifications.controller.js` (9 calls), `deviceTokenController.js` (15 calls)

### Controller Conversion - Features (2 tasks, 7 files)

- [ ] T018 [P] [US1] Convert initiative/diya/crisis controllers: `alshuail-backend/src/controllers/initiativesController.js` (21 calls), `diyasController.js` (16 calls), `crisisController.js` (12 calls)
- [ ] T019 [P] [US1] Convert family/dashboard/occasions controllers: `alshuail-backend/src/controllers/family-tree.controller.js` (8 calls), `family-tree-extended.controller.js` (13 calls), `dashboardController.js` (7 calls), `occasionsController.js` (22 calls)

### Route Conversion (5 tasks, 13 canonical files; skip duplicate routes handled in US6)

- [ ] T020 [US1] Convert auth route (critical path): replace supabase with query() in `alshuail-backend/src/routes/auth.js` (11 calls)
- [ ] T021 [P] [US1] Convert profile routes: `alshuail-backend/src/routes/profile.js` (28 calls), `passwordManagement.js` (9 calls), `otp.routes.js` (3 calls)
- [ ] T022 [P] [US1] Convert content routes: `alshuail-backend/src/routes/news.js` (36 calls), `documents.js` (11 calls)
- [ ] T023 [P] [US1] Convert admin routes: `alshuail-backend/src/routes/settings.js` (17 calls), `rbacRoutes.js` (8 calls), `multiRoleManagement.js` (16 calls)
- [ ] T024 [P] [US1] Convert feature routes: `alshuail-backend/src/routes/familyTree.js` (21 calls), `diyaDashboard.js` (14 calls), `members.js` (5 calls), `subscriptions.js` (3 calls)

### Config & Dependency Cleanup (5 tasks)

- [ ] T025 [US1] Update documentStorage.js: remove supabase import, keep multer + local filesystem in `alshuail-backend/src/config/documentStorage.js`
- [ ] T025a [P] [US1] Create VPS upload directories: ensure `/var/www/uploads/alshuail/` with sub-dirs `member-photos/`, `member-documents/`, `financial-reports/`, `competition-media/` exist on VPS via SSH. Configure Express static middleware or Nginx to serve them
- [ ] T025b [US1] Audit database for stored Supabase Storage URLs: query all text/varchar columns for `supabase.co/storage` patterns and update to local VPS paths (`/uploads/alshuail/...`). Tables to check: `members` (photo_url), `documents`, `news` (image fields)
- [ ] T026 [US1] Delete legacy config files: `alshuail-backend/src/config/database.js`, `alshuail-backend/src/config/pgQueryBuilder.js`, and `alshuail-backend/src/config/supabase.js` (all three per constitution rule 7; no backward-compat re-export)
- [ ] T027 [US1] Remove @supabase/supabase-js and @supabase/storage-js from `alshuail-backend/package.json` and run npm install
- [ ] T028 [US1] Remove deprecated SUPABASE_* variable references and env logging from `alshuail-backend/src/config/env.js` and `alshuail-backend/server.js` (lines 62-68)

### Cleanup & Verification (2 tasks)

- [ ] T029 [P] [US1] Delete backup controller files: `alshuail-backend/src/controllers/diyasController.backup.js` and `diyasController.backup2.js`
- [ ] T030 [US1] Verify migration completeness: run `grep -r "supabase" alshuail-backend/src/ --include="*.js" -l` (expect ZERO), test API endpoints per contracts/api-contracts.md, confirm identical JSON responses

**Checkpoint**: US1 complete - all database access uses services/database.js with parameterized SQL. No supabase references remain. All API endpoints return identical responses. This is the MVP.

---

## Phase 3: User Story 2 - Database Setup & Production Optimization (Priority: P0)

**Goal**: Ensure VPS PostgreSQL has automated backups, connection security, and proper pool configuration.

**Independent Test**: SSH to VPS, verify backup cron exists, confirm PostgreSQL only accepts localhost connections, check pg_hba.conf.

- [ ] T032 [US2] Verify VPS PostgreSQL installation, database `alshuail_db` exists with 64 tables, and member count matches 347+ via SSH to `root@213.199.62.185`
- [ ] T033 [P] [US2] Configure PostgreSQL to accept connections from localhost only: update `pg_hba.conf` and `postgresql.conf` on VPS at `213.199.62.185`
- [ ] T034 [P] [US2] Set up automated daily PostgreSQL backups with 7-day rotation: create backup script at `/var/www/scripts/backup-db.sh` and add cron job on VPS
- [ ] T035 [US2] Verify production database setup: test backup execution, confirm localhost-only access, verify pool config (min 2, max 20) matches services/database.js

**Checkpoint**: US2 complete - database is production-hardened with backups and restricted access

---

## Phase 4: User Story 3 - Security Hardening (Priority: P0)

**Goal**: Remove all test/debug routes, hardcoded credentials, and add authentication to unprotected endpoints.

**Independent Test**: `curl https://api.alshailfund.com/api/test` returns 404. `grep -r "alshuail-debug-2024\|alshuail-dev-secret\|alshuail-csrf-secret" alshuail-backend/src/` returns ZERO.

- [ ] T036 [US3] Remove test route mount and debug endpoint from `alshuail-backend/server.js`: delete `app.use('/api/test', testRoutes)` (line 271) and `/api/debug/env` handler (lines 381-406), remove testEndpoints import
- [ ] T037 [P] [US3] Delete test endpoints file: `alshuail-backend/src/routes/testEndpoints.js`
- [ ] T038 [P] [US3] Add authenticateToken middleware to initiative routes in `alshuail-backend/src/routes/initiatives.js`: protect POST, PUT, and contribute endpoints (lines 27-33)
- [ ] T039 [P] [US3] Add authenticateToken middleware to crisis balance update route in `alshuail-backend/src/routes/crisis.js`: protect POST `/update-balance` (line 17)
- [ ] T040 [US3] Remove hardcoded credentials: remove debug token `alshuail-debug-2024` from server.js, production CSRF fallback from env.js (line 177), ensure all secrets come from environment variables only in `alshuail-backend/src/config/env.js`

**Checkpoint**: US3 complete - no test/debug routes accessible, all endpoints authenticated, zero hardcoded secrets

---

## Phase 5: User Story 4 - Remove Dead Code & Backup Files (Priority: P1)

**Goal**: Delete all backup files, legacy directories, and archived scripts. Target: 27+ files removed.

**Independent Test**: `find . -name "*.backup" -o -name "*.fixed" -o -name "*.backup2" -o -name "temp_part*"` returns ZERO. Builds pass.

- [ ] T041 [P] [US4] Delete backend backup/temp files: `alshuail-backend/src/services/databaseOptimizationService.js.fixed`, `receiptService.js.backup`, `src/services/temp_part1.txt`, `server.js.backup`, `.env.example.backup`
- [ ] T042 [P] [US4] Delete backend route backups: `alshuail-backend/src/routes/initiatives.js.backup`, `dashboard.js.backup`, `memberMonitoring.js.backup`, `subscriptions.js.backup`, `payments.js.backup`
- [ ] T043 [P] [US4] Delete admin frontend backups: entire `alshuail-admin-arabic/BACKUPS/` directory (7 files), `.env.backup`, `src/components/Members/UnifiedMembersManagement.tsx.backup`, `src/components/MemberMonitoring/MemberMonitoringDashboard.css.backup`, `craco.config.js.backup`, `postcss.config.js.backup`, `src/App.tsx.backup`, `src/index.css.backup`, `tailwind.config.v3.backup`, `src/utils/biometricAuth.jsx.backup`
- [ ] T044 [P] [US4] Delete legacy root directories: `Mobile/` (1 orphaned file), `Monitormember/` (8 screenshots), `database/` (screenshots only)
- [ ] T045 [US4] Delete archived Supabase scripts: entire `alshuail-backend/src/scripts/_archived/` directory (9 legacy scripts). Verify no remaining imports reference deleted files; run `npm run build` in admin frontend

**Checkpoint**: US4 complete - zero backup/legacy files, all builds pass

---

## Phase 6: User Story 5 - Organize Backend Root Scripts (Priority: P1)

**Goal**: Move 55+ loose scripts from backend root into categorized `scripts/` subdirectories. Only `server.js` and config files remain at root.

**Independent Test**: `ls alshuail-backend/*.js` returns only `server.js` and `jest.config.js`.

- [ ] T046 [US5] Create organized script directories: `alshuail-backend/scripts/migration/`, `scripts/testing/`, `scripts/utilities/`, `scripts/data/`
- [ ] T047 [US5] Move root scripts to categorized subdirectories: migration scripts (updateMembersSchema.js, createMissingTables.js, add-password-column.js, run-phase4-migration.js, fixImportBatchesTable.js) to `scripts/migration/`; test scripts (test-*.js, create-test-*.js, setup-test-*.js) to `scripts/testing/`; utility scripts (debugStats.js, check-*.js, fix-*.js, analyze-*.js, verify-*.js) to `scripts/utilities/`; data scripts (initData.js, read-diya-excel.js, runSQL.js) to `scripts/data/`
- [ ] T048 [US5] Delete unused root scripts: `alshuail-backend/simple-server.js`, `crisis-server.js`, `healthcheck.js` (redundant with /api/health endpoint), `test-supabase-connection.js` (obsolete). Verify only server.js and jest.config.js remain at root

**Checkpoint**: US5 complete - clean root directory with only essential files

---

## Phase 7: User Story 6 - Consolidate Duplicate Backend Routes & Controllers (Priority: P1)

**Goal**: Resolve all duplicate route/controller/middleware pairs to single canonical versions. Target: eliminate 8+ duplicate pairs.

**Independent Test**: Each API feature has exactly one route file and one controller. `grep -c "app.use" alshuail-backend/server.js` shows no duplicate mounts.

- [ ] T049 [US6] Consolidate duplicate route files: delete `alshuail-backend/src/routes/initiativesEnhanced.js` (keep initiatives.js), delete `settingsImproved.js` (keep settings.js), delete `memberMonitoringOptimized.js` (keep memberMonitoring.js). Merge any unique features from enhanced versions into canonical files before deletion
- [ ] T050 [P] [US6] Consolidate family tree routes: merge `alshuail-backend/src/routes/familyTree.js` into `family-tree.routes.js` (or vice versa), delete the duplicate. Update server.js mount
- [ ] T051 [P] [US6] Consolidate duplicate controllers: merge `alshuail-backend/src/controllers/memberController.js` into `membersController.js`, merge `notificationController.js` into `notificationsController.js`, merge `membersMonitoringController.js` into `memberMonitoringController.js`. Delete duplicates, update all imports
- [ ] T052 [P] [US6] Consolidate duplicate middleware: merge `alshuail-backend/src/middleware/rbac.middleware.js` into `rbacMiddleware.js`. Delete duplicate, update all imports
- [ ] T053 [US6] Update server.js route imports: remove all duplicate route mounts, ensure each feature mounted exactly once. Verify all API endpoints respond correctly via curl

**Checkpoint**: US6 complete - one route, one controller, one middleware per feature

---

## Phase 8: User Story 7 - Consolidate Duplicate Frontend Components (Priority: P1)

**Goal**: Resolve duplicate frontend components to single canonical versions. Target: eliminate 10+ duplicate components.

**Independent Test**: Admin dashboard builds successfully (`npm run build` in alshuail-admin-arabic). Each route maps to exactly one component.

- [ ] T054 [P] [US7] Delete admin api.js duplicate: remove `alshuail-admin-arabic/src/services/api.js`, keep only `api.ts`. Update any remaining .js imports to .ts
- [ ] T055 [US7] Consolidate Members components: keep `alshuail-admin-arabic/src/components/Members/UnifiedMembersManagement.tsx` as canonical. Delete: `MembersManagement.jsx`, `AppleMembersManagement.jsx`, `AppleMembersManagement.tsx`, `AppleMembersManagementWithNav.tsx`, `EnhancedMembersManagement.jsx`, `TwoSectionMembers.jsx`, `HijriMembersManagement.tsx`, `MembersManager.js`. Update router to use UnifiedMembersManagement only
- [ ] T056 [P] [US7] Consolidate other duplicate components: in `alshuail-admin-arabic/src/components/` - keep canonical versions for Diyas, Occasions, Initiatives, Settings. Delete variant/overview files that are not referenced in the router. Delete `MemberMonitoringDashboard.original.jsx`
- [ ] T057 [US7] Verify admin frontend build: run `cd alshuail-admin-arabic && npm run build`. Fix any broken imports from deleted components. Confirm router references only existing components

**Checkpoint**: US7 complete - one component per feature, admin build passes

---

## Phase 9: User Story 8 - Backend Code Quality Improvements (Priority: P2)

**Goal**: Replace console.log with Winston, split oversized files, standardize response format.

**Independent Test**: `grep -rn "console.log\|console.error\|console.warn" alshuail-backend/src/ --include="*.js"` returns ZERO (excluding node_modules).

- [ ] T058 [P] [US8] Replace all console.log/error/warn with Winston logger across backend: `alshuail-backend/src/controllers/passwordAuth.controller.js` (3 calls), `src/services/firebaseService.js` (6 calls), `src/services/twilioService.js` (8 calls), `src/services/whatsappOtpService.js` (1 critical OTP log), `src/middleware/connectionPool.js` (4 calls), `src/config/env.js` (1 call)
- [ ] T059 [P] [US8] Split oversized profile route file: refactor `alshuail-backend/src/routes/profile.js` (1805 lines) into focused modules (profile-info.js, profile-settings.js, profile-documents.js) under routes/profile/. Target: no module exceeds 500 lines
- [ ] T059a [P] [US8] Split oversized StyledDashboard: refactor `alshuail-admin-arabic/src/components/Dashboard/StyledDashboard.tsx` (4344 lines) into focused sub-components (DashboardStats, DashboardCharts, DashboardActivity, etc.). Target: no module exceeds 500 lines
- [ ] T060 [P] [US8] Review financialReportsController.js TODO stubs: implement or remove 20+ placeholder functions in `alshuail-backend/src/controllers/financialReportsController.js`. Document which reports are active vs planned
- [ ] T061 [US8] Standardize API response format: audit all endpoints for consistent `{ success: boolean, data: any, message: string }` per contracts/api-contracts.md. Fix any non-conforming responses

**Checkpoint**: US8 complete - zero console.log, no oversized files, consistent API responses

---

## Phase 10: Polish & Deployment

**Purpose**: Final verification, deployment, and production monitoring.

- [ ] T062 Run quickstart.md verification steps: verify PostgreSQL status, table count (64), member count (347+), test database service connection from VPS
- [ ] T063 Deploy to VPS: `ssh root@213.199.62.185 "cd /var/www/PROShael/alshuail-backend && git pull && npm install && pm2 restart alshuail-backend"`
- [ ] T064 Verify production: `curl https://api.alshailfund.com/api/health`, test critical endpoints (login, members list, payments), monitor `pm2 logs alshuail-backend --lines 50` for errors
- [ ] T065 Run existing Jest test suite: `cd alshuail-backend && npm test` and confirm 100% pass rate

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──────────► Phase 2 (US1: Migration) ──► Phase 10 (Polish)
                                    │
Phase 3 (US2: DB Setup) ◄──────────┤ (can start after Phase 1)
Phase 4 (US3: Security) ◄──────────┤ (can start after Phase 1)
                                    │
                              ┌─────┴─────┐
                              │ Phase 2    │
                              │ complete   │
                              └─────┬─────┘
                                    │
                    ┌───────┬───────┼───────┬───────┐
                    ▼       ▼       ▼       ▼       ▼
                Phase 5  Phase 6  Phase 7  Phase 8  Phase 9
                (US4)    (US5)    (US6)    (US7)    (US8)
                    │       │       │       │       │
                    └───────┴───────┴───────┴───────┘
                                    │
                                    ▼
                              Phase 10 (Polish)
```

### User Story Dependencies

- **US1 (P0)**: BLOCKS most other stories. Must complete before US4-US8
- **US2 (P0)**: Independent of US1 - can start after Phase 1 setup
- **US3 (P0)**: Independent of US1 - can start after Phase 1 setup
- **US4 (P1)**: Should start after US1 to avoid deleting files mid-conversion
- **US5 (P1)**: Independent of US4 - can run in parallel
- **US6 (P1)**: Should start after US1 (files already converted to new pattern)
- **US7 (P1)**: Independent - no backend dependency
- **US8 (P2)**: Should start after US1 and US6 (work on canonical files only)

### Within User Story 1 (Migration)

- T001-T004 (setup) must complete first
- T005-T025b, T029 can ALL run in parallel (each file is independently convertible)
- T026 (delete config files) must wait for ALL conversions to complete
- T027 (remove npm deps) must wait for ALL conversions to complete
- T028 (remove SUPABASE_* env refs) after T027
- T030 (verification) must be last

### Parallel Opportunities

**Maximum parallelism within US1**: 22+ tasks can run simultaneously (T005-T025b, T029)

**Cross-story parallelism**: US2 + US3 can run in parallel with US1. US4-US7 can run in parallel after US1.

---

## Parallel Example: User Story 1 (Migration)

```bash
# After Phase 1 setup completes, launch ALL conversion tasks in parallel:

# Middleware (2 parallel tasks):
Task T005: "Convert auth middleware in src/middleware/auth.js, superAdminAuth.js, memberSuspensionCheck.js"
Task T006: "Convert RBAC middleware in src/middleware/rbacMiddleware.js, rbac.middleware.js, roleExpiration.js"

# Utilities (2 parallel tasks):
Task T007: "Convert core utilities in src/utils/accessControl.js, audit-logger.js, profileValidation.js"
Task T008: "Convert support utilities in src/utils/memberHelpers.js, errorCodes.js, etc."

# Services (3 parallel tasks):
Task T009: "Convert supabaseService.js and bankTransferService.js"
Task T010: "Convert paymentProcessingService.js, financialAnalyticsService.js"
Task T011: "Convert remaining 5 services"

# Controllers (8 parallel tasks):
Task T012-T019: All 8 controller batches simultaneously

# Routes (5 parallel tasks):
Task T020-T024: All 5 route batches simultaneously

# Total: 22 parallel conversion tasks -> then cleanup -> then verify
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup & Foundation (T001-T004)
2. Complete Phase 2: US1 - Database Migration (T005-T031)
3. **STOP and VALIDATE**: Run `grep -r "supabase"`, test all API endpoints
4. Deploy MVP to VPS - system fully self-hosted

### Incremental Delivery

1. **Foundation** (Phase 1) -> database service ready
2. **US1: Migration** (Phase 2) -> all Supabase removed -> Deploy (MVP!)
3. **US2 + US3: Production + Security** (Phases 3-4) -> hardened -> Deploy
4. **US4-US7: Cleanup** (Phases 5-8) -> clean codebase -> Deploy
5. **US8: Quality** (Phase 9) -> polished -> Deploy
6. **Polish** (Phase 10) -> final verification

### Effort Distribution

| Phase | Tasks | Files Affected | Effort |
|-------|-------|---------------|--------|
| Setup | 4 | 3 | Small |
| US1: Migration | 28 | 137+ | **Large** (core work) |
| US2: DB Setup | 4 | VPS config | Small |
| US3: Security | 5 | 5 | Medium |
| US4: Dead Code | 5 | 27+ deletions | Small |
| US5: Scripts | 3 | 55+ moves | Medium |
| US6: Backend Dupes | 5 | 8+ pairs | Medium |
| US7: Frontend Dupes | 4 | 10+ deletions | Medium |
| US8: Quality | 5 | 8+ | Medium |
| Polish | 4 | deployment | Small |
| **Total** | **67** | **200+** | |

---

## Notes

- [P] tasks = different files, no dependencies on each other
- [US*] label maps task to specific user story for traceability
- Commit after each task or logical group
- Each user story is independently completable and testable
- Stop at any checkpoint to validate the story independently
- The conversion pattern is mechanical: replace import, convert .from().select().eq() to query() with parameterized SQL
- Use research.md "Query Conversion Patterns" table as reference for all Supabase->SQL conversions
- Financial controllers (T014) MUST use getClient() with BEGIN/COMMIT/ROLLBACK for multi-table operations
- Keep pgQueryBuilder.js and config/database.js until ALL conversions verified (T026 is last cleanup)
- config/database.js is DELETED per constitution rule 7 (no backward-compat re-export)
