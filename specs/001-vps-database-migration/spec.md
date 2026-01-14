# Feature Specification: VPS Database Migration

**Feature Branch**: `001-vps-database-migration`
**Created**: 2026-01-14
**Status**: Draft
**Input**: User description: "Ensure all backend pages and sections connect to own VPS database server not Supabase"

---

## Executive Summary

The Al-Shuail backend currently has a hybrid database configuration:
- **Core application** (controllers, routes, middleware): Uses `pgQueryBuilder` which connects to VPS PostgreSQL ✅
- **Legacy scripts** (`src/scripts/*.js`): Still use `@supabase/supabase-js` with `createClient` ❌
- **Document storage** (`documentStorage.js`): Still uses Supabase client directly ❌
- **Environment config** (`env.js`): Still lists SUPABASE_* as "required" variables ❌

This specification ensures complete migration to VPS PostgreSQL with no Supabase dependencies.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Backend API Operations (Priority: P1)

As a system administrator, I want all backend API operations to use the VPS PostgreSQL database so that data is stored on our own infrastructure without external dependencies.

**Why this priority**: Core functionality - all member data, payments, subscriptions, and family tree data must be stored locally.

**Independent Test**: Execute any API endpoint (e.g., `GET /api/members`) and verify database queries go to VPS PostgreSQL (213.199.62.185), not Supabase.

**Acceptance Scenarios**:

1. **Given** a member login request, **When** the API processes authentication, **Then** the query executes against VPS PostgreSQL
2. **Given** a payment creation request, **When** the API saves the payment, **Then** data is stored in VPS PostgreSQL
3. **Given** any database error, **When** the error is logged, **Then** it shows VPS PostgreSQL connection details (not Supabase URLs)

---

### User Story 2 - Environment Configuration Cleanup (Priority: P2)

As a developer, I want environment variable requirements updated so that only VPS PostgreSQL credentials are marked as required, eliminating confusion about Supabase dependencies.

**Why this priority**: Developer experience - clear configuration prevents misconfiguration and reduces onboarding friction.

**Independent Test**: Start the backend with only `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` set (no SUPABASE_* variables) and verify successful startup.

**Acceptance Scenarios**:

1. **Given** a fresh environment, **When** only DB_* variables are set, **Then** the backend starts successfully
2. **Given** the `.env.example` file, **When** a developer reads it, **Then** VPS PostgreSQL is shown as the primary database
3. **Given** missing SUPABASE_* variables, **When** the backend starts, **Then** no warnings appear about Supabase

---

### User Story 3 - Legacy Script Migration (Priority: P3)

As a developer, I want legacy migration/utility scripts updated to use the pgQueryBuilder so that all database operations are consistent.

**Why this priority**: Maintenance - ensures scripts can run against VPS PostgreSQL when needed for data migrations or debugging.

**Independent Test**: Run any legacy script (e.g., `create-super-admin.js`) and verify it operates against VPS PostgreSQL.

**Acceptance Scenarios**:

1. **Given** a legacy script with `@supabase/supabase-js` import, **When** migrated, **Then** it uses `pgQueryBuilder` or direct `pg` Pool
2. **Given** the scripts directory, **When** searching for `createClient`, **Then** zero Supabase client usages are found in active scripts

---

### Edge Cases

- What happens when VPS PostgreSQL is temporarily unavailable? → Connection retry with exponential backoff, user-friendly error
- How does system handle document storage without Supabase? → Local file storage or alternative cloud storage service
- What happens to existing scripts that reference Supabase? → Archived or migrated based on usage frequency

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST connect to VPS PostgreSQL (213.199.62.185) for all database operations
- **FR-002**: System MUST NOT require any SUPABASE_* environment variables to start
- **FR-003**: System MUST use `pgQueryBuilder` or direct `pg` Pool for all database queries
- **FR-004**: System MUST remove or migrate all `@supabase/supabase-js` imports from active code
- **FR-005**: System MUST update `.env.example` to reflect VPS PostgreSQL as primary database
- **FR-006**: System MUST log database connection info showing VPS PostgreSQL host on startup
- **FR-007**: System MUST archive or delete unused legacy Supabase scripts

### Key Entities

- **Database Configuration**: Connection parameters for VPS PostgreSQL (host, port, database, user, password)
- **Query Builder**: pgQueryBuilder providing Supabase-compatible API over direct PostgreSQL
- **Legacy Scripts**: Utility scripts in `src/scripts/` that may need migration or archival

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero `@supabase/supabase-js` imports in active backend source files (`src/` excluding archived scripts)
- **SC-002**: Backend starts successfully with only `DB_*` environment variables configured
- **SC-003**: All API endpoints return data from VPS PostgreSQL database
- **SC-004**: Startup logs show "PostgreSQL direct connection" without Supabase references
- **SC-005**: `.env.example` documents VPS PostgreSQL as primary database, Supabase as deprecated/removed

---

## Files Requiring Changes

### High Priority (Active Code)
| File | Current State | Required Action |
|------|---------------|-----------------|
| `src/config/env.js` | Lists SUPABASE_* as required | Update to require DB_* only |
| `src/config/documentStorage.js` | Uses `@supabase/supabase-js` | Migrate to local storage or pg |
| `.env.example` | Shows Supabase as primary | Update to show VPS PostgreSQL |

### Medium Priority (Legacy Scripts - May Archive)
| File | Current State | Required Action |
|------|---------------|-----------------|
| `src/scripts/create-super-admin.js` | Uses Supabase client | Migrate or archive |
| `src/scripts/add-member-columns.js` | Uses Supabase client | Migrate or archive |
| `src/scripts/database-assessment.js` | Uses Supabase client | Migrate or archive |
| ~15 other scripts in `src/scripts/` | Uses Supabase client | Migrate or archive |

### Already Correct (No Changes Needed)
| File | Status |
|------|--------|
| `src/config/database.js` | ✅ Uses pgQueryBuilder |
| `src/config/supabase.js` | ✅ Re-exports pgQueryBuilder |
| `src/config/pgQueryBuilder.js` | ✅ Direct PostgreSQL connection |
| All controllers | ✅ Import from database.js |
| All routes | ✅ Import from database.js |

---

## Assumptions

1. VPS PostgreSQL server (213.199.62.185) is the authoritative database
2. Legacy scripts in `src/scripts/` are rarely used and can be archived
3. Document storage can be handled via local filesystem or alternative service
4. The `@supabase/supabase-js` package can be removed from `package.json` after migration
