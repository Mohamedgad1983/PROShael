# Tasks: Al-Shuail System Cleanup + Database Migration

## Pre-Implementation

- [ ] **TASK 0.0.1**: Create backup branch: `git checkout -b pre-migration-backup && git push origin pre-migration-backup && git checkout main`
- [ ] **TASK 0.0.2**: Verify current builds work before any changes
- [ ] **TASK 0.0.3**: Document ALL files that import supabase: `grep -rln "supabase" alshuail-backend/ --include="*.js" | grep -v node_modules | sort`

---

## Phase 0: Migrate from Supabase to VPS PostgreSQL

### 0A: PostgreSQL Setup Scripts
- [ ] **TASK 0A.1**: Create `scripts/setup/install-postgresql.sh` with PostgreSQL install + user/db creation commands
- [ ] **TASK 0A.2**: Create `scripts/setup/configure-postgresql.sh` with pg_hba.conf and postgresql.conf tuning
- [ ] **TASK 0A.3**: Create `.env.example` with new DATABASE_URL format (no Supabase vars)

### 0B: Schema Migration
- [ ] **TASK 0B.1**: Generate `database/migrations/000-schema.sql` with ALL 64 table CREATE statements
- [ ] **TASK 0B.2**: Generate `database/migrations/001-foreign-keys.sql` with ALL 94 foreign key constraints
- [ ] **TASK 0B.3**: Generate `database/migrations/002-indexes.sql` with all indexes
- [ ] **TASK 0B.4**: Generate `database/migrations/003-functions-triggers.sql` with triggers and functions
- [ ] **TASK 0B.5**: Generate `database/migrations/004-seed-data.sql` with INSERT statements for reference data (roles, permissions, categories, settings, subscription_plans)
- [ ] **TASK 0B.6**: Generate `database/migrations/005-restore-members.sql` to insert member data
- [ ] **TASK 0B.7**: Generate `database/migrations/006-create-admin.sql` to create super admin user

### 0C: New Database Service
- [ ] **TASK 0C.1**: `npm install pg` in alshuail-backend
- [ ] **TASK 0C.2**: Create `alshuail-backend/services/database.js` with Pool, query(), transaction(), checkHealth()
- [ ] **TASK 0C.3**: Create `alshuail-backend/services/fileStorage.js` with multer local disk storage
- [ ] **TASK 0C.4**: Add health check endpoint: `GET /api/health` → calls checkHealth()
- [ ] **TASK 0C.5**: Git commit: `feat: add PostgreSQL database service and file storage service`

### 0D: Convert Controllers (LARGEST TASK)
- [ ] **TASK 0D.1**: List all files importing supabase and count total occurrences
- [ ] **TASK 0D.2**: Convert `controllers/membersController.js` - replace all supabase calls with pg queries
- [ ] **TASK 0D.3**: Convert `controllers/paymentsController.js`
- [ ] **TASK 0D.4**: Convert `controllers/passwordAuth.controller.js`
- [ ] **TASK 0D.5**: Convert `controllers/financialReportsController.js`
- [ ] **TASK 0D.6**: Convert ALL remaining controllers (batch - one commit per file or group)
- [ ] **TASK 0D.7**: Convert `routes/auth.js` - replace supabase auth calls
- [ ] **TASK 0D.8**: Convert `routes/profile.js`
- [ ] **TASK 0D.9**: Convert ALL remaining routes
- [ ] **TASK 0D.10**: Convert ALL services that use supabase
- [ ] **TASK 0D.11**: Convert `config/database.js` or delete if purely Supabase
- [ ] **TASK 0D.12**: Convert or delete `config/supabase.js`
- [ ] **TASK 0D.13**: Convert `config/pgQueryBuilder.js` to use new database service (or delete if redundant)
- [ ] **TASK 0D.14**: Git commit: `refactor: convert all Supabase calls to direct PostgreSQL (pg)`

### 0E: Replace Supabase Storage
- [ ] **TASK 0E.1**: Find all Supabase storage calls: `grep -rn "supabase.*storage\|\.upload\|\.download\|\.getPublicUrl" alshuail-backend/ --include="*.js" | grep -v node_modules`
- [ ] **TASK 0E.2**: Replace each storage call with fileStorage.js methods
- [ ] **TASK 0E.3**: Add static file serving in server.js: `app.use('/uploads', express.static(...))`
- [ ] **TASK 0E.4**: Update all file URL references from Supabase URLs to VPS URLs
- [ ] **TASK 0E.5**: Git commit: `refactor: replace Supabase storage with local file storage`

### 0F: Remove Supabase Dependencies
- [ ] **TASK 0F.1**: `npm uninstall @supabase/supabase-js` in backend
- [ ] **TASK 0F.2**: Check and remove from admin if present: `grep -rn "supabase" alshuail-admin-arabic/package.json`
- [ ] **TASK 0F.3**: Check and remove from mobile if present: `grep -rn "supabase" alshuail-mobile/package.json`
- [ ] **TASK 0F.4**: Delete all Supabase config files
- [ ] **TASK 0F.5**: Update `.env` - remove SUPABASE_* vars, add DATABASE_URL
- [ ] **TASK 0F.6**: Update `.env.example` accordingly
- [ ] **TASK 0F.7**: Verify ZERO supabase references remain: `grep -rn "supabase" alshuail-backend/ --include="*.js" --include="*.json" | grep -v node_modules | wc -l` must be 0
- [ ] **TASK 0F.8**: Git commit: `chore: remove all Supabase dependencies`

### 0G: Phase 0 Checkpoint
- [ ] **TASK 0G.1**: `npm start` in backend - server starts without errors
- [ ] **TASK 0G.2**: Test key endpoints with curl (auth, members, payments)
- [ ] **TASK 0G.3**: `npm run build` in admin - no build errors
- [ ] **TASK 0G.4**: `npm run build` in mobile - no build errors

---

## Phase 1: Delete Dead Code & Backup Files

- [ ] **TASK 1.1**: Find all backup files: `find . -name "*.backup*" -o -name "*.fixed" -o -name "*.original*" -o -name "temp_part*" | grep -v node_modules | sort`
- [ ] **TASK 1.2**: Delete all found backup files
- [ ] **TASK 1.3**: Delete `BACKUPS/` directory, `memberServiceDemo.js`, `flexiblePaymentTest.js`, `FLEXIBLE_PAYMENT_DOCUMENTATION.md`
- [ ] **TASK 1.4**: Delete `Mobile/`, `Monitormember/` directories
- [ ] **TASK 1.5**: Verify no broken imports
- [ ] **TASK 1.6**: Git commit: `chore: remove all backup, dead, and legacy files`
- [ ] **TASK 1.7** [CHECKPOINT]: Builds pass

---

## Phase 2: Organize Backend Root Scripts

- [ ] **TASK 2.1**: Create `scripts/{testing,admin,debug,fixes,migration}` directories
- [ ] **TASK 2.2**: Move test, admin, debug, fix scripts to appropriate subdirs
- [ ] **TASK 2.3**: Delete `crisis-server.js`
- [ ] **TASK 2.4**: Git commit: `chore: organize root scripts`
- [ ] **TASK 2.5** [CHECKPOINT]: Backend starts

---

## Phase 3: Consolidate Duplicate Backend Code

- [ ] **TASK 3.1**: Read server.js, list all route mounts
- [ ] **TASK 3.2**: Identify and keep better version of each duplicate pair
- [ ] **TASK 3.3**: Update server.js, delete inferior versions
- [ ] **TASK 3.4**: Consolidate middleware (rbac, auth)
- [ ] **TASK 3.5**: Consolidate controllers
- [ ] **TASK 3.6**: Git commit: `refactor: consolidate duplicate backend code`
- [ ] **TASK 3.7** [CHECKPOINT]: Server starts, key endpoints respond

---

## Phase 4: Consolidate Duplicate Frontend

- [ ] **TASK 4.1**: Read App.tsx/router, find active component versions
- [ ] **TASK 4.2**: Delete all non-imported component duplicates
- [ ] **TASK 4.3**: Consolidate api.js/api.ts
- [ ] **TASK 4.4**: Git commit: `refactor: consolidate duplicate frontend components`
- [ ] **TASK 4.5** [CHECKPOINT]: Admin builds

---

## Phase 5: Security Fixes

- [ ] **TASK 5.1**: Remove /api/test from server.js
- [ ] **TASK 5.2**: Scan and fix hardcoded credentials
- [ ] **TASK 5.3**: Audit auth middleware on all routes
- [ ] **TASK 5.4**: Git commit: `security: fix endpoints, credentials, auth`
- [ ] **TASK 5.5** [CHECKPOINT]: Server starts, /api/test returns 404

---

## Phase 6: Code Quality

- [ ] **TASK 6.1**: Ensure Winston logger exists
- [ ] **TASK 6.2**: Replace all console.log in routes/controllers/services
- [ ] **TASK 6.3**: Fix financialReportsController.js TODO stubs
- [ ] **TASK 6.4**: Generate backup cron script: `scripts/setup/backup-database.sh`
- [ ] **TASK 6.5**: Git commit: `fix: logger, stubs, backup script`
- [ ] **TASK 6.6** [CHECKPOINT]: All builds pass, zero console.log in production

---

## Post-Implementation

- [ ] **TASK 7.1**: Full verification suite (all checks from plan)
- [ ] **TASK 7.2**: Git push all changes
- [ ] **TASK 7.3**: Generate summary of all changes
- [ ] **TASK 7.4**: Document new DATABASE_URL env var in README
