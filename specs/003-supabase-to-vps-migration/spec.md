# Feature Specification: Supabase to VPS PostgreSQL Migration & Codebase Cleanup

**Feature Branch**: `003-supabase-to-vps-migration`
**Created**: 2026-02-11
**Status**: Draft
**Input**: Complete system migration from cloud-hosted database to self-hosted PostgreSQL on Contabo VPS, combined with comprehensive codebase cleanup and security hardening.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Database Migration to Self-Hosted PostgreSQL (Priority: P0)

As a system owner, I need the database fully self-hosted on my VPS so I eliminate the Supabase dependency, reduce costs, and maintain full control over family financial data for 347+ members.

**Why this priority**: The entire system depends on the database. All other cleanup work builds on top of a stable, self-hosted database. Without this, the system remains dependent on an external service for sensitive family financial data.

**Independent Test**: Can be fully tested by deploying the new database service on VPS, running all existing API endpoints against it, and verifying all 347+ member records are accessible with identical response formats. Delivers full data sovereignty.

**Acceptance Scenarios**:

1. **Given** the current system uses a cloud-hosted database, **When** the migration is complete, **Then** all backend services connect exclusively to the self-hosted database on the VPS with zero cloud database dependencies remaining.
2. **Given** the cloud database contains 64 tables with existing data (members, settings, branches, etc.), **When** schema and data are migrated, **Then** all tables, relationships, indexes, triggers, and data are faithfully reproduced on the self-hosted instance.
3. **Given** the backend uses mixed database access patterns (JS client library + query builder), **When** controllers are converted, **Then** all database access uses a single unified service with parameterized queries exclusively.
4. **Given** the system stores files in cloud storage buckets, **When** storage is migrated, **Then** all file uploads use local disk storage on the VPS and all file URLs resolve correctly.
5. **Given** the backend API returns specific JSON response formats, **When** the database layer changes, **Then** all API responses remain identical in structure so frontend applications require zero changes.

---

### User Story 2 - Database Setup & Production Optimization (Priority: P0)

As a system administrator, I need a properly configured production database on the VPS with automated backups, connection security, and performance tuning so the system is reliable and recoverable.

**Why this priority**: The database must be correctly set up before the migration can proceed. Misconfiguration risks data loss for real financial records.

**Independent Test**: Can be tested by running the setup scripts on the VPS and verifying database creation, user permissions, connection restrictions, and backup job execution.

**Acceptance Scenarios**:

1. **Given** the VPS already has PostgreSQL installed with the existing database (`alshuail_db`, 64 tables, 347+ members), **When** the setup verification runs, **Then** the database server is confirmed running, enabled at boot, and the dedicated database user has correct permissions.
2. **Given** the database is accessible, **When** security configuration is applied, **Then** connections are restricted to localhost only and the database user has a strong, unique password stored exclusively in environment configuration.
3. **Given** the database contains live data, **When** the backup cron job executes, **Then** a compressed database dump is created and stored with rotation (keeping the last 7 daily backups).
4. **Given** the production environment, **When** performance settings are applied, **Then** connection pooling is configured with appropriate limits (min 2, max 20 connections).

---

### User Story 3 - Security Hardening (Priority: P0)

As a system owner handling real financial data for 347+ family members, I need all security vulnerabilities eliminated so the system is safe for production use.

**Why this priority**: The system manages real money (50 SAR monthly subscriptions, diya collections, initiative funds). Security failures could expose financial data or enable unauthorized access.

**Independent Test**: Can be tested by auditing all API endpoints for authentication, scanning for hardcoded secrets, and verifying no test/debug routes are accessible in production.

**Acceptance Scenarios**:

1. **Given** the production server exposes test endpoints, **When** security hardening is applied, **Then** all test and debug routes are removed from the production server entry point.
2. **Given** some scripts contain hardcoded credentials, **When** security audit is complete, **Then** zero hardcoded passwords, API keys, or secrets exist in source code; all sensitive values come from environment configuration.
3. **Given** some API routes may lack authentication, **When** the auth audit is complete, **Then** every non-public endpoint requires valid authentication and appropriate role-based authorization.
4. **Given** the new database uses password authentication, **When** connection security is configured, **Then** the database only accepts connections from localhost with a strong password.

---

### User Story 4 - Remove Dead Code & Backup Files (Priority: P1)

As a developer, I need all backup files, dead code, and legacy directories removed so the codebase is clean, navigable, and free of confusion.

**Why this priority**: Dead code creates confusion, increases onboarding time, and risks accidental use of stale implementations. This is a prerequisite for reliable consolidation work.

**Independent Test**: Can be tested by running a file pattern scan confirming zero backup/legacy files exist, and verifying all builds still pass after removal.

**Acceptance Scenarios**:

1. **Given** the backend contains files with `.backup`, `.fixed`, `.original`, `temp_part` suffixes, **When** cleanup is complete, **Then** zero files with these patterns exist in the repository.
2. **Given** the admin frontend has a `BACKUPS/` directory and demo/test files, **When** cleanup is complete, **Then** these directories and files are deleted.
3. **Given** legacy directories (`Mobile/`, `Monitormember/`, `database/`) exist at repository root, **When** cleanup is complete, **Then** these directories are removed.
4. **Given** files have been deleted, **When** the codebase is verified, **Then** no remaining import statements reference deleted files and all application builds succeed.

---

### User Story 5 - Organize Backend Root Scripts (Priority: P1)

As a developer, I need the 55+ loose scripts at the backend root organized into categorized subdirectories so only the main entry point remains at root level.

**Why this priority**: A cluttered root directory makes it hard to find the actual application entry point and understand the project structure.

**Independent Test**: Can be tested by verifying only the server entry point and configuration files remain at the backend root, and all moved scripts still function from their new locations.

**Acceptance Scenarios**:

1. **Given** the backend root has 55+ JavaScript files, **When** organization is complete, **Then** only `server.js` and essential configuration files remain at the root level.
2. **Given** scripts serve different purposes (migration, testing, utilities, one-time fixes), **When** organization is complete, **Then** scripts are sorted into categorized subdirectories under `scripts/`.
3. **Given** the standalone `crisis-server.js` exists, **When** cleanup is assessed, **Then** it is deleted if unused or integrated if needed.

---

### User Story 6 - Consolidate Duplicate Backend Routes & Controllers (Priority: P1)

As a developer, I need duplicate route/controller pairs resolved to a single canonical version so the codebase has one clear path for each feature.

**Why this priority**: Duplicate routes cause confusion about which version is active, risk inconsistent behavior, and double the maintenance burden.

**Independent Test**: Can be tested by verifying each API feature has exactly one route file and one controller, the server entry point mounts only canonical versions, and all API endpoints respond correctly.

**Acceptance Scenarios**:

1. **Given** duplicate route pairs exist (initiatives/initiativesEnhanced, settings/settingsImproved, etc.), **When** consolidation is complete, **Then** each feature has exactly one route file and one controller.
2. **Given** duplicate middleware files exist (rbac.middleware/rbacMiddleware), **When** consolidation is complete, **Then** a single middleware file exists with all imports updated.
3. **Given** the server entry point mounts routes, **When** consolidation is complete, **Then** the server entry point references only canonical route files with no commented-out or duplicate mounts.

---

### User Story 7 - Consolidate Duplicate Frontend Components (Priority: P1)

As a developer, I need duplicate frontend components resolved to a single active version so the admin dashboard has one clear implementation per feature.

**Why this priority**: Multiple versions of the same component (up to 4 for Members) waste bundle size, confuse developers, and risk showing different UIs depending on which version is rendered.

**Independent Test**: Can be tested by checking the router configuration to confirm each route maps to exactly one component, and verifying no orphaned component files remain.

**Acceptance Scenarios**:

1. **Given** multiple versions exist for Members (4), Diyas (3), Occasions (3), Initiatives (2), Settings (2), **When** consolidation is complete, **Then** each feature has exactly one component file.
2. **Given** both `api.js` and `api.ts` exist in the admin frontend, **When** consolidation is complete, **Then** only the TypeScript version remains.
3. **Given** components are deleted, **When** verification is complete, **Then** the router references only existing components and the application builds without errors.

---

### User Story 8 - Backend Code Quality Improvements (Priority: P2)

As a developer, I need code quality issues fixed so the codebase follows consistent patterns and is maintainable long-term.

**Why this priority**: Code quality issues (console.log in production, TODO stubs, oversized files) accumulate technical debt but don't block functionality. These should be addressed after critical migration and consolidation work.

**Independent Test**: Can be tested by running a lint check confirming zero `console.log` statements, verifying the reports controller has functioning implementations, and confirming no single file exceeds a reasonable length.

**Acceptance Scenarios**:

1. **Given** the backend uses `console.log` for logging, **When** quality improvements are complete, **Then** all logging uses the structured logger utility.
2. **Given** the financial reports controller has 20+ TODO stub functions, **When** quality improvements are complete, **Then** stubs are either implemented or removed with clear documentation of what remains.
3. **Given** some files exceed 500 lines (profile.js: 1805, StyledDashboard.tsx: 4344), **When** quality improvements are complete, **Then** no single source file exceeds 500 lines; oversized files are split into focused modules.
4. **Given** API responses use inconsistent formats, **When** quality improvements are complete, **Then** all endpoints follow the standard response format: `{ success: boolean, data: any, message: string }`.

---

### Edge Cases

- What happens if the VPS loses network connectivity during data migration? Migrations MUST use transactions so partial imports are rolled back.
- What happens if a controller uses both Supabase client AND query builder patterns in the same file? Both patterns MUST be converted to the unified database service.
- What happens if a deleted backup file is the only version that contains a working implementation? Before deletion, verify the canonical version has equivalent or superior functionality.
- What happens if the cloud database schema has evolved since the last known export? Always export a fresh schema immediately before migration.
- What happens if frontend code directly imports the cloud database client? Frontend MUST be audited; any direct database client imports must be removed and replaced with API calls.
- What happens if file uploads reference cloud storage URLs stored in database records? All stored URLs MUST be updated to point to the new VPS file storage location.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST operate with a self-hosted database as the sole data store, with zero cloud database client dependencies in the codebase.
- **FR-002**: System MUST use a single, unified database access service with connection pooling (min 2, max 20) for all backend database operations.
- **FR-003**: System MUST use parameterized queries exclusively for all database operations to prevent injection attacks.
- **FR-004**: System MUST reproduce all 64 tables, 94 foreign key relationships, indexes, triggers, and enum types from the source database.
- **FR-005**: System MUST verify all existing data on VPS PostgreSQL (members, settings, branches, activities, events, categories, roles, permissions, subscription plans) matches expected counts and integrity constraints. Note: Data already resides on VPS; this is a verification requirement, not a data migration.
- **FR-006**: System MUST store uploaded files on local VPS disk storage organized by category (member-photos, member-documents, financial-reports, competition-media).
- **FR-007**: System MUST maintain identical API response formats after migration so no frontend application changes are required.
- **FR-008**: System MUST have zero hardcoded credentials, API keys, or secrets in source code.
- **FR-009**: System MUST require authentication on all non-public API endpoints with role-based authorization.
- **FR-010**: System MUST remove all test and debug routes from the production server entry point.
- **FR-011**: System MUST have zero backup, dead, or legacy files (`.backup`, `.fixed`, `.original`, `temp_part` patterns).
- **FR-012**: System MUST have exactly one route file, one controller, and one component per feature (no duplicates).
- **FR-013**: System MUST use structured logging exclusively (no `console.log` in production code).
- **FR-014**: System MUST have automated daily database backups with 7-day rotation.

### Key Entities

- **Database Connection Pool**: Manages concurrent database connections with configurable limits, idle timeout, and error recovery.
- **Database Migration Artifacts**: Schema SQL, data SQL, index SQL, and setup scripts that transform the source database into the self-hosted target.
- **File Storage**: Local disk-based file storage replacing cloud storage, organized by file category with size limits and type restrictions.
- **Audit Trail**: Record of all migration steps, data verification results, and rollback points.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All API endpoints return identical response structures before and after migration, verified by running the existing test suite with 100% pass rate.
- **SC-002**: Zero files in the repository import or reference the cloud database client library after migration.
- **SC-003**: All 347+ member records are accessible and accurate after migration with zero data discrepancies.
- **SC-004**: Database backup automation produces successful daily dumps, verified over 3 consecutive days post-migration.
- **SC-005**: Zero hardcoded secrets detected by scanning the entire codebase after security hardening.
- **SC-006**: Repository file count reduced by removing all backup/dead/legacy files (target: 27+ files removed).
- **SC-007**: Each backend feature has exactly one route file and one controller (target: eliminate 8+ duplicate pairs).
- **SC-008**: Each admin frontend feature has exactly one component (target: eliminate 10+ duplicate components).
- **SC-009**: The backend root directory contains only the server entry point and configuration files (target: relocate 55+ scripts).
- **SC-010**: All API endpoints respond within 2 seconds under normal load after migration (no performance regression).

## Assumptions

- The VPS (Contabo, 213.199.62.185) has sufficient disk space and memory to run both the application server and database server.
- The current cloud database schema is stable and will not change during the migration window.
- All frontend applications (admin dashboard, mobile PWA, Flutter app) communicate with the backend exclusively via HTTP API calls and do not directly access the database.
- The existing JWT-based authentication system is fully functional and does not depend on the cloud database provider's auth service.
- File uploads currently in cloud storage can be downloaded and re-uploaded to VPS local storage.
- The 7-phase approach (DB migration first, then cleanup) ensures the system remains operational throughout the process.

## Out of Scope

- New feature development
- Flutter app modifications
- Payment gateway integration (K-Net)
- Firebase push notification changes
- UI/UX redesign of any frontend application
- Mobile PWA structural changes
- Database schema redesign (tables stay as-is)
