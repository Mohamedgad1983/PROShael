# Implementation Plan: Supabase to VPS PostgreSQL Migration & Codebase Cleanup

**Branch**: `003-supabase-to-vps-migration` | **Date**: 2026-02-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-supabase-to-vps-migration/spec.md`

## Summary

Migrate the Al-Shuail Family Fund backend from a Supabase-compatible abstraction layer
(`pgQueryBuilder.js`) to direct PostgreSQL queries via a unified `services/database.js`,
remove all `@supabase/*` dependencies, and perform comprehensive codebase cleanup
(dead code removal, duplicate consolidation, security hardening, code quality).

**Key Finding**: The database already connects to VPS PostgreSQL (213.199.62.185:5432)
via pgQueryBuilder. The migration replaces the ~1000-line Supabase-style API wrapper
with direct parameterized SQL across 137 files (797+ call sites).

## Technical Context

**Language/Version**: Node.js 18+ (ES Modules with `import/export`)
**Primary Dependencies**: Express.js 4.x, pg 8.16.3, multer 2.x, bcrypt, jsonwebtoken
**Storage**: PostgreSQL 15 on Contabo VPS (213.199.62.185), local filesystem for uploads
**Testing**: Jest (existing test suite in `__tests__/`)
**Target Platform**: Ubuntu 22.04 LTS on Contabo VPS
**Project Type**: Web (multi-app: backend API + admin dashboard + mobile PWA + Flutter)
**Performance Goals**: <2s API response time, 20 concurrent DB connections
**Constraints**: Zero downtime, backward-compatible API responses, 347+ live member records
**Scale/Scope**: 64 tables, 94 FK relationships, 137 files to convert, ~200K LOC total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Arabic-First, RTL | PASS | No UI changes; API response format preserved |
| II. Member Data Security | PASS | Parameterized SQL prevents injection; JWT auth unchanged |
| III. API-First Architecture | PASS | API responses remain identical; Winston logger enforced |
| IV. Mobile-First Design | PASS | No frontend changes required |
| V. Financial Accuracy | PASS | All financial queries converted with transactions |
| VI. Fund Balance Integrity | PASS | `vw_fund_balance` view preserved on VPS PostgreSQL |
| VII. Elderly-Friendly Accessibility | PASS | No UI changes |
| Database Migration Rules | PASS | pg.Pool in services/database.js, parameterized SQL only |
| File Organization | PASS | Duplicates eliminated, scripts organized |
| Never Break Production | PASS | Incremental conversion with fallback |

**Post-Phase 1 Re-check**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-supabase-to-vps-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output - codebase investigation findings
├── data-model.md        # Phase 1 output - database entity model
├── quickstart.md        # Phase 1 output - setup and verification guide
├── contracts/           # Phase 1 output - API contract definitions
│   └── api-contracts.md # Endpoint contracts for affected routes
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
alshuail-backend/
├── server.js                          # Entry point (remove test route imports)
├── src/
│   ├── config/
│   │   ├── database.js                # DELETE: per constitution rule 7
│   │   ├── env.js                     # UPDATE: remove SUPABASE_* refs
│   │   ├── documentStorage.js         # UPDATE: remove Supabase import
│   │   ├── pgQueryBuilder.js          # DELETE after all conversions
│   │   └── supabase.js                # DELETE (deprecated compatibility)
│   ├── services/
│   │   └── database.js                # NEW: unified pg.Pool service
│   ├── controllers/                   # CONVERT: 33 files (2 backup files deleted)
│   ├── routes/                        # CONVERT: 17 files with inline queries
│   ├── middleware/                     # CONVERT: 6 files
│   ├── utils/                         # CONVERT: 9 files
│   └── scripts/
│       └── _archived/                 # DELETE: 9 legacy Supabase scripts
├── scripts/                           # NEW: organized root scripts
│   ├── migration/                     # Database migration scripts
│   ├── testing/                       # Test scripts
│   ├── utilities/                     # Utility scripts
│   └── data/                          # Data import/export
└── package.json                       # REMOVE: @supabase/* deps

alshuail-admin-arabic/
├── src/
│   ├── components/Members/            # CONSOLIDATE: 41 files -> canonical set
│   ├── services/
│   │   ├── api.js                     # DELETE (keep api.ts)
│   │   └── api.ts                     # KEEP
│   └── ...
├── BACKUPS/                           # DELETE entirely
└── .env.backup                        # DELETE

# Root directories to DELETE:
Mobile/
Monitormember/
database/
```

**Structure Decision**: Existing multi-app structure preserved. Changes are internal
to the backend's config/services layer and cleanup of dead code across all apps.

## Complexity Tracking

No constitution violations requiring justification. All changes align with principles.
