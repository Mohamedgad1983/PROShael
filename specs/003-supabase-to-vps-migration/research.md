# Research: Supabase to VPS PostgreSQL Migration

**Date**: 2026-02-11
**Feature**: 003-supabase-to-vps-migration

## Critical Discovery: Migration Already Partially Complete

The database connection already points to VPS PostgreSQL (213.199.62.185:5432).
A compatibility layer (`pgQueryBuilder.js`, ~1000 lines) mimics the Supabase API
while using `pg.Pool` underneath. The migration task is therefore:

1. Replace the Supabase-compatible abstraction with direct `query()` calls
2. Remove `@supabase/supabase-js` and `@supabase/storage-js` from dependencies
3. Remove legacy config files and re-exports
4. Clean up environment variables

---

## Decision 1: Database Access Pattern

**Decision**: Replace `pgQueryBuilder.js` with a simple `services/database.js` exporting `query()` and `getClient()`.

**Rationale**: pgQueryBuilder adds ~1000 lines of abstraction to mimic an API we no longer need.
Direct parameterized SQL is simpler, more transparent, and aligned with the constitution.

**Alternatives considered**:
- Keep pgQueryBuilder as-is: Rejected because it violates the constitution (Supabase patterns prohibited)
  and adds unnecessary complexity.
- Use an ORM (Knex, Prisma): Rejected because the system already works with raw SQL via pgQueryBuilder,
  adding an ORM is scope creep and not requested.

---

## Decision 2: Migration Strategy (Incremental vs Big-Bang)

**Decision**: Incremental file-by-file conversion with pgQueryBuilder kept temporarily as fallback.

**Rationale**: With 137 files using the Supabase-style API (797+ call sites), a big-bang rewrite
risks breaking the production system serving 347+ members. Incremental conversion allows testing
each controller individually.

**Strategy**:
1. Create `services/database.js` with `query()` and `getClient()`
2. Convert controllers one at a time, starting with simplest (fewest queries)
3. After all controllers converted, remove pgQueryBuilder.js
4. Remove config/supabase.js and config/database.js re-exports
5. Remove @supabase/* from package.json

**Alternatives considered**:
- Big-bang rewrite: Rejected because 137 files at once is too risky for a live system.
- Automated regex conversion: Partially useful for simple patterns but complex joins/upserts
  in pgQueryBuilder need manual attention.

---

## Decision 3: File Storage Replacement

**Decision**: Keep current local filesystem approach in `documentStorage.js` (already using local VPS).

**Rationale**: documentStorage.js already uses multer + local filesystem at `/var/www/uploads`.
The Supabase Storage dependency is vestigial. Only need to remove `@supabase/storage-js` from
package.json and verify no remaining Supabase storage calls exist.

**Alternatives considered**:
- MinIO S3-compatible storage: Over-engineering for current scale (347 members).
- Cloud storage (AWS S3): Against constitution requirement for self-hosted.

---

## Decision 4: Environment Variable Cleanup

**Decision**: Replace `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` with single `DATABASE_URL`.

**Rationale**: Constitution mandates `DATABASE_URL=postgresql://user:pass@localhost:5432/alshuail`.
The current 5-variable pattern in pgQueryBuilder will be replaced with a single connection string
in `services/database.js`.

**Current state**:
```
DB_HOST=213.199.62.185
DB_PORT=5432
DB_NAME=alshuail_db
DB_USER=alshuail
DB_PASSWORD=***
```

**Target state**:
```
DATABASE_URL=postgresql://alshuail:***@localhost:5432/alshuail
```

Note: Connection uses `localhost` because PostgreSQL will run on the same VPS as the backend.

---

## Decision 5: Cleanup Ordering

**Decision**: Phase execution order: DB migration (P0) > Security (P0) > Dead code (P1) > Organize scripts (P1) > Consolidate backend (P1) > Consolidate frontend (P1) > Code quality (P2).

**Rationale**: DB migration must come first because all other work depends on a stable database
layer. Security fixes are P0 because they protect live financial data. Cleanup phases are P1
because they improve developer experience but don't affect functionality.

---

## Inventory: Files Requiring Conversion

### Config Files (4 files - DELETE or REWRITE)

| File | Action | Reason |
|------|--------|--------|
| `src/config/pgQueryBuilder.js` | DELETE | ~1000-line abstraction being replaced |
| `src/config/supabase.js` | DELETE | 152-line deprecated compatibility layer |
| `src/config/database.js` | REWRITE | Currently re-exports pgQueryBuilder, needs to export pg.Pool |
| `src/config/documentStorage.js` | UPDATE | Remove Supabase import, keep multer + local filesystem |

### Controllers (35 files - CONVERT)

| File | Supabase Calls | Complexity |
|------|---------------|------------|
| membersController.js | 26 | High |
| passwordAuth.controller.js | 38 | High |
| subscriptionController.js | 20 | Medium |
| diyasController.js | 16 | Medium |
| paymentsController.js | 14 | Medium |
| initiativesController.js | 21 | Medium |
| notificationsController.js | 15 | Medium |
| memberImportController.js | 14 | Medium |
| family-tree-extended.controller.js | 13 | Medium |
| expensesController.js | 12 | Medium |
| crisisController.js | 12 | Medium |
| occasionsController.js | 22 | Medium |
| balanceAdjustmentController.js | 17 | Medium |
| admin.controller.js | 10 | Low |
| audit.controller.js | 10 | Low |
| statementController.js | 11 | Low |
| push-notifications.controller.js | 9 | Low |
| expenseCategoriesController.js | 11 | Low |
| deviceTokenController.js | 15 | Low |
| bankTransfersController.js | 3 | Low |
| approval.controller.js | 6 | Low |
| financialReportsController.js | 4 | Low |
| family-tree.controller.js | 8 | Low |
| fundBalanceController.js | 8 | Low |
| dashboardController.js | 7 | Low |
| memberController.js | 15 | Low |
| memberMonitoringController.js | 8 | Low |
| membersMonitoringController.js | 2 | Low |
| memberRegistrationController.js | 11 | Low |
| memberSuspensionController.js | 4 | Low |
| notificationController.js | 6 | Low |
| paymentAnalyticsController.js | 4 | Low |
| memberStatementController.js | 8 | Low |
| diyasController.backup.js | 14 | DELETE (backup) |
| diyasController.backup2.js | 14 | DELETE (backup) |

### Routes with Inline DB Queries (17 files - CONVERT)

| File | Supabase Calls | Notes |
|------|---------------|-------|
| auth.js | 11 | Authentication - critical |
| initiativesEnhanced.js | 26 | DUPLICATE - may be deleted |
| familyTree.js | 21 | Has inline DB queries |
| settings.js | 17 | Has inline DB queries |
| news.js | 36 | Most inline queries |
| settingsImproved.js | 18 | DUPLICATE - may be deleted |
| multiRoleManagement.js | 16 | |
| diyaDashboard.js | 14 | |
| profile.js | 28 | 1805 lines - needs splitting |
| passwordManagement.js | 9 | |
| rbacRoutes.js | 8 | |
| documents.js | 11 | |
| otp.routes.js | 3 | |
| members.js | 5 | |
| subscriptions.js | 3 | |
| memberMonitoringOptimized.js | 2 | DUPLICATE - may be deleted |
| testEndpoints.js | 6 | DELETE (test route) |

### Services (9 files - CONVERT)

| File | Supabase Calls |
|------|---------------|
| supabaseService.js | 9 (RENAME to memberService.js) |
| paymentProcessingService.js | 11 |
| bankTransferService.js | 14 |
| memberMonitoringQueryService.js | 10 |
| databaseOptimizationService.js | 10 |
| financialAnalyticsService.js | 7 |
| optimizedReportQueries.js | 8 |
| reportExportService.js | 3 |
| notificationService.js | 5 |

### Middleware (6 files - CONVERT)

| File | Supabase Calls |
|------|---------------|
| auth.js | 4 |
| rbacMiddleware.js | 4 |
| roleExpiration.js | 6 |
| rbac.middleware.js | 2 (DUPLICATE) |
| superAdminAuth.js | 3 |
| memberSuspensionCheck.js | 2 |

### Utilities (9 files - CONVERT)

| File | Supabase Calls |
|------|---------------|
| audit-logger.js | 4 |
| accessControl.js | 10 |
| memberHelpers.js | 5 |
| profileValidation.js | 7 |
| initializeTestData.js | 7 |
| errorCodes.js | 1 |
| jsonSanitizer.js | 1 |
| inputSanitizer.js | 1 |
| hijriDateUtils.js | 1 |

---

## Inventory: Security Issues

| Issue | Location | Severity |
|-------|----------|----------|
| Test routes in production | server.js:24 imports testEndpoints.js | HIGH |
| console.log in controllers | passwordAuth.controller.js, many others | MEDIUM |
| No auth on initiatives routes | src/routes/initiatives.js | HIGH |
| Inconsistent auth middleware | Some use `protect`, others `authenticateToken` | MEDIUM |
| Hardcoded OTP in test mode | USE_TEST_OTP=false (env, but '123456' in code) | LOW |
| SUPABASE_* env vars logged at startup | server.js:62-68 | LOW |

---

## Inventory: Dead Code & Duplicates

### Backup Files to Delete
- `alshuail-backend/src/controllers/diyasController.backup.js`
- `alshuail-backend/src/controllers/diyasController.backup2.js`
- `alshuail-backend/src/services/databaseOptimizationService.js.fixed`
- `alshuail-backend/src/services/receiptService.js.backup`
- `alshuail-admin-arabic/BACKUPS/` (7 files)
- `alshuail-admin-arabic/src/components/Members/UnifiedMembersManagement.tsx.backup`
- `alshuail-admin-arabic/.env.backup`
- `alshuail-backend/.env.example.backup`

### Legacy Directories to Delete
- `Mobile/` (1 file: APIBACKEDN/nul)
- `Monitormember/` (8 PNG screenshots)
- `database/` (screenshots only)

### Duplicate Route Pairs (keep first, delete second)
- initiatives.js / initiativesEnhanced.js
- settings.js / settingsImproved.js
- familyTree.js / family-tree.routes.js
- memberMonitoring.js / memberMonitoringOptimized.js
- notifications.js / notificationRoutes.js (if exists)

### Duplicate Controller Pairs
- memberController.js / membersController.js
- notificationController.js / notificationsController.js
- membersMonitoringController.js / memberMonitoringController.js

### Duplicate Middleware
- rbac.middleware.js / rbacMiddleware.js

### Duplicate Frontend Components (Members - 41 files in directory!)
- AppleMembersManagement.jsx + .tsx (2 versions)
- MembersManagement.jsx
- EnhancedMembersManagement.jsx
- TwoSectionMembers.jsx
- HijriMembersManagement.tsx
- UnifiedMembersManagement.tsx (active)
- PremiumMembersManagementWrapper.tsx
- AppleMembersManagementWithNav.tsx

### Admin api.js vs api.ts
- Keep api.ts, delete api.js

---

## Inventory: Root Scripts to Organize

55+ JavaScript files at `alshuail-backend/` root level (excluding server.js).
Should be moved to `scripts/` subdirectories:
- `scripts/migration/` - Database migration scripts
- `scripts/testing/` - Test and validation scripts
- `scripts/utilities/` - One-time utility scripts
- `scripts/data/` - Data import/export scripts

Plus 9 archived scripts in `src/scripts/_archived/` (legacy Supabase-era).

---

## Package.json Dependencies

### To Remove
```json
"@supabase/storage-js": "^2.12.2",
"@supabase/supabase-js": "^2.57.4"
```

### To Keep
```json
"pg": "^8.16.3"
```

### To Add (if not present)
None - `pg` is already installed.

---

## Query Conversion Patterns

| Supabase Pattern | PostgreSQL Pattern |
|-----------------|-------------------|
| `supabase.from('t').select('*')` | `query('SELECT * FROM t')` |
| `.select('a, b')` | `query('SELECT a, b FROM t')` |
| `.eq('col', val)` | `WHERE col = $1` with `[val]` |
| `.neq('col', val)` | `WHERE col != $1` |
| `.gt('col', val)` | `WHERE col > $1` |
| `.gte('col', val)` | `WHERE col >= $1` |
| `.lt('col', val)` | `WHERE col < $1` |
| `.in('col', arr)` | `WHERE col = ANY($1)` with `[arr]` |
| `.like('col', '%v%')` | `WHERE col LIKE $1` with `['%v%']` |
| `.ilike('col', '%v%')` | `WHERE col ILIKE $1` |
| `.is('col', null)` | `WHERE col IS NULL` |
| `.order('col', { ascending: false })` | `ORDER BY col DESC` |
| `.limit(n)` | `LIMIT n` |
| `.range(from, to)` | `LIMIT $1 OFFSET $2` |
| `.insert({...})` | `INSERT INTO t (cols) VALUES ($1...) RETURNING *` |
| `.update({...}).eq('id', id)` | `UPDATE t SET col=$1 WHERE id=$2 RETURNING *` |
| `.delete().eq('id', id)` | `DELETE FROM t WHERE id = $1` |
| `.single()` | `rows[0]` (+ LIMIT 1) |
| `.maybeSingle()` | `rows[0] \|\| null` |
| `{ data, error }` | `{ rows }` (try/catch for errors) |
| `.upsert(data, { onConflict })` | `INSERT ... ON CONFLICT (col) DO UPDATE SET ...` |
