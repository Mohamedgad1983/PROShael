# Implementation Plan: VPS Database Migration

**Branch**: `001-vps-database-migration` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-vps-database-migration/spec.md`

---

## Summary

The Al-Shuail backend has a hybrid database configuration where the core application already uses VPS PostgreSQL via `pgQueryBuilder`, but legacy scripts and configuration files still reference Supabase. This migration ensures complete transition to VPS PostgreSQL (213.199.62.185) with no Supabase dependencies remaining.

**Primary Actions**:
1. Update `env.js` to require only `DB_*` variables
2. Migrate `documentStorage.js` from Supabase client to local/pg storage
3. Archive or migrate ~18 legacy scripts in `src/scripts/`
4. Update `.env.example` to reflect VPS PostgreSQL as primary

---

## Technical Context

**Language/Version**: Node.js 18+ (ES Modules)
**Primary Dependencies**: Express.js 4.x, pg (node-postgres), bcrypt
**Storage**: PostgreSQL 15 on VPS (213.199.62.185)
**Testing**: Jest (integration tests in `__tests__/`)
**Target Platform**: Linux VPS server
**Project Type**: Web application (backend API)
**Performance Goals**: Handle 347+ members, <200ms API response time
**Constraints**: Must maintain backward compatibility with existing frontend apps
**Scale/Scope**: ~15 API routes, ~20 config files, ~18 legacy scripts

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status |
|-----------|-------------|--------|
| I. Arabic-First | N/A - Backend infrastructure change | PASS |
| II. Member Data Security | Database must maintain security standards | PASS - VPS PostgreSQL uses same security patterns |
| III. API-First Architecture | No API contract changes | PASS - Only infrastructure change |
| IV. Mobile-First Design | N/A - Backend only | PASS |
| V. Financial Accuracy | Database transactions must remain ACID | PASS - PostgreSQL provides ACID compliance |
| Database Standard | PostgreSQL on VPS (213.199.62.185) | PASS - This migration enforces the standard |

**All gates passed** - Ready for implementation.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-vps-database-migration/
├── plan.md              # This file
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Quality checklist (validated)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (existing backend structure)

```text
alshuail-backend/
├── src/
│   ├── config/
│   │   ├── database.js         # ✅ Already uses pgQueryBuilder
│   │   ├── pgQueryBuilder.js   # ✅ Direct PostgreSQL connection
│   │   ├── supabase.js         # ✅ Re-exports pgQueryBuilder
│   │   ├── env.js              # ❌ CHANGE: Remove SUPABASE_* requirements
│   │   └── documentStorage.js  # ❌ CHANGE: Migrate from Supabase client
│   ├── controllers/            # ✅ All use database.js (no changes)
│   ├── routes/                 # ✅ All use database.js (no changes)
│   ├── middleware/             # ✅ All use database.js (no changes)
│   ├── services/               # ✅ All use database.js (no changes)
│   └── scripts/                # ❌ ARCHIVE: Legacy Supabase scripts
├── __tests__/                  # Test directory
└── .env.example                # ❌ CHANGE: Update to show VPS PostgreSQL
```

**Structure Decision**: Existing backend structure is maintained. Changes are limited to configuration files and legacy script archival.

---

## Files Requiring Changes

### High Priority (P1/P2 - Active Code)

| File | Current State | Action |
|------|---------------|--------|
| `src/config/env.js` | Lists SUPABASE_* as required | Update to require DB_* only |
| `src/config/documentStorage.js` | Uses @supabase/supabase-js | Migrate to local fs or pg storage |
| `.env.example` | Shows Supabase as primary | Update to show VPS PostgreSQL |

### Medium Priority (P3 - Legacy Scripts)

| File | Action |
|------|--------|
| `src/scripts/create-super-admin.js` | Archive or migrate |
| `src/scripts/add-member-columns.js` | Archive or migrate |
| `src/scripts/database-assessment.js` | Archive or migrate |
| ~15 other scripts | Archive or migrate |

### Already Correct (No Changes)

| File | Status |
|------|--------|
| `src/config/database.js` | ✅ Uses pgQueryBuilder |
| `src/config/supabase.js` | ✅ Re-exports pgQueryBuilder |
| `src/config/pgQueryBuilder.js` | ✅ Direct PostgreSQL |
| All controllers | ✅ Import from database.js |
| All routes | ✅ Import from database.js |

---

## Implementation Strategy

### Phase 1: Environment Configuration (P2)
1. Update `env.js` to mark SUPABASE_* as optional/deprecated
2. Update `.env.example` to document VPS PostgreSQL as primary
3. Verify backend starts with only DB_* variables

### Phase 2: Document Storage Migration (P1)
1. Assess current documentStorage.js usage patterns
2. Implement alternative storage (local filesystem or PostgreSQL bytea)
3. Update all document storage calls
4. Test document upload/download functionality

### Phase 3: Legacy Script Cleanup (P3)
1. Identify which scripts are actively used
2. Archive unused scripts to `src/scripts/_archived/`
3. Migrate essential scripts to use pgQueryBuilder
4. Remove @supabase/supabase-js from package.json (if safe)

---

## Complexity Tracking

> No constitution violations identified. Implementation follows existing patterns.

| Item | Notes |
|------|-------|
| No new patterns | Uses existing pgQueryBuilder |
| No architectural changes | Configuration updates only |
| Backward compatible | Frontend apps unaffected |

---

## Success Validation

After implementation, verify:

1. **SC-001**: `grep -r "@supabase/supabase-js" src/ --include="*.js"` returns zero results (excluding archived)
2. **SC-002**: Backend starts with only `DB_*` environment variables
3. **SC-003**: All API endpoints return data correctly
4. **SC-004**: Startup logs show "PostgreSQL direct connection"
5. **SC-005**: `.env.example` documents VPS PostgreSQL as primary
