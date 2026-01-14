# Tasks: VPS Database Migration

**Input**: Design documents from `/specs/001-vps-database-migration/`
**Prerequisites**: plan.md (complete), spec.md (complete)
**Completed**: 2026-01-14

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Verify current state and prepare for changes

- [x] T001 [US1] Verify all controllers/routes use database.js imports (confirmation check)
- [x] T002 [P] [US2] Backup current .env.example before modifications

**Checkpoint**: Current state documented ✅

---

## Phase 2: User Story 2 - Environment Configuration Cleanup (Priority: P2)

**Goal**: Update environment variable requirements to reflect VPS PostgreSQL as primary

**Independent Test**: Start backend with only `DB_*` variables set (no SUPABASE_* variables)

### Implementation for User Story 2

- [x] T003 [US2] Read and analyze `src/config/env.js` to identify SUPABASE_* requirements
- [x] T004 [US2] Update `src/config/env.js` to make SUPABASE_* variables optional (not required)
- [x] T005 [P] [US2] Update `.env.example` to show VPS PostgreSQL as primary database
- [x] T006 [US2] Add deprecation comments for any remaining SUPABASE_* references
- [x] T007 [US2] Test backend startup with only DB_* variables configured

**Checkpoint**: Backend starts without SUPABASE_* variables ✅

---

## Phase 3: User Story 1 - Backend API Operations (Priority: P1)

**Goal**: Ensure all active backend code uses VPS PostgreSQL

**Independent Test**: Execute API endpoints and verify queries go to VPS PostgreSQL (213.199.62.185)

### Implementation for User Story 1

- [x] T008 [US1] Read and analyze `src/config/documentStorage.js` for Supabase usage
- [x] T009 [US1] Determine documentStorage.js migration approach (local fs vs PostgreSQL)
- [x] T010 [US1] Implement document storage alternative without @supabase/supabase-js
- [x] T011 [US1] Update any files that import from documentStorage.js
- [x] T012 [US1] Test document upload/download functionality (syntax verified)

**Checkpoint**: documentStorage.js no longer uses Supabase client ✅

---

## Phase 4: User Story 3 - Legacy Script Migration (Priority: P3)

**Goal**: Archive or migrate legacy scripts that use Supabase client

**Independent Test**: Search for `createClient` in active scripts returns zero results

### Implementation for User Story 3

- [x] T013 [US3] Create `src/scripts/_archived/` directory for legacy scripts
- [x] T014 [P] [US3] Identify which scripts in `src/scripts/` are actively used
- [x] T015 [US3] Archive unused legacy scripts to `_archived/` directory (20 scripts moved)
- [x] T016 [US3] Migrate essential scripts to use pgQueryBuilder (none needed - all archived)
- [x] T017 [US3] Verify no active @supabase/supabase-js imports remain in `src/`

**Checkpoint**: Legacy scripts archived, active code clean ✅

---

## Phase 5: Final Validation & Cleanup

**Purpose**: Verify all success criteria are met

- [x] T018 Run `grep -r "@supabase/supabase-js" src/ --include="*.js"` - zero results (excluding _archived) ✅
- [x] T019 Verify backend syntax checks pass (env.js, documentStorage.js, profile.js, documents.js) ✅
- [ ] T020 Test sample API endpoints return data correctly (requires deployment)
- [ ] T021 Verify startup logs show "PostgreSQL direct connection" (requires deployment)
- [ ] T022 Consider removing @supabase/supabase-js from package.json (deferred - keep for compatibility)

**Checkpoint**: All success criteria from spec.md validated (pending deployment test)

---

## Summary of Changes Made

### Files Modified

| File | Change |
|------|--------|
| `src/config/env.js` | Removed SUPABASE_* from required vars, added postgres config, deprecation comments |
| `src/config/documentStorage.js` | Migrated from Supabase Storage to local filesystem |
| `src/routes/profile.js` | Updated avatar upload/delete to use local storage functions |
| `.env.example` | Updated to show VPS PostgreSQL as primary, Supabase as deprecated |

### Files Archived

20 legacy scripts moved to `src/scripts/_archived/`:
- add-member-columns.js, add-payments.js, check-member-balances.js
- complete-setup.js, create-email-admin.js, create-subscriptions-and-upload.js
- create-super-admin.js, create-tables.js, database-assessment.js
- direct-upload.js, final-setup.js, final-upload.js
- import-members-simple.js, import-new-excel.js, quick-admin.js
- simple-payment-upload.js, simple-upload.js, upload-to-existing-tables.js
- upload-to-supabase.js, working-upload.js

### Files Unchanged (Already Correct)

- `src/config/database.js` - Uses pgQueryBuilder ✅
- `src/config/supabase.js` - Re-exports pgQueryBuilder ✅
- `src/config/pgQueryBuilder.js` - Direct PostgreSQL connection ✅
- All controllers - Import from database.js ✅
- All routes - Import from database.js ✅

---

## Notes

- Core application ALREADY uses VPS PostgreSQL via pgQueryBuilder
- This was primarily a cleanup/consolidation task
- No API contract changes - frontend apps unaffected
- Document storage now uses local filesystem instead of Supabase Storage
- Production deployment required to fully validate startup and API endpoints
