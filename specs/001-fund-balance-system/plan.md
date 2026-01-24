# Implementation Plan: Fund Balance System

**Branch**: `001-fund-balance-system` | **Date**: 2026-01-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fund-balance-system/spec.md`

## Summary

Implement a comprehensive fund balance tracking system that calculates available funds using the formula `Balance = Subscriptions - Expenses - Internal Diya`. The system will prevent expense creation when insufficient funds exist, classify diya payments as internal (fund members) or external (non-members), and support bank reconciliation with audit snapshots.

**Technical Approach**:
- Database: PostgreSQL view and RPC function for real-time balance calculation
- Backend: New fundBalance routes and controller; update expensesController with balance validation
- Frontend: FundBalanceCard component on expenses page; bank reconciliation modal
- All changes follow existing architecture patterns

## Technical Context

**Language/Version**: Node.js 18+ (ES Modules), React 18 (TypeScript), PostgreSQL 15
**Primary Dependencies**: Express.js 4.x, @supabase/supabase-js, React 18, Tailwind CSS, DaisyUI
**Storage**: PostgreSQL on VPS (213.199.62.185), accessed via Supabase client
**Testing**: Jest with experimental ESM support (`cross-env NODE_OPTIONS=--experimental-vm-modules`)
**Target Platform**: Web (Admin Dashboard - Cloudflare Pages), Mobile PWA (VPS)
**Project Type**: Web application (backend + admin frontend + mobile PWA)
**Performance Goals**: Balance calculation < 500ms, UI refresh < 3 seconds (per spec SC-001, SC-007)
**Constraints**: RTL Arabic-first UI, JWT authentication required, atomic transactions for balance
**Scale/Scope**: 347+ members, ~10 concurrent admin users, real-time balance accuracy

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Compliance Notes |
|-----------|--------|------------------|
| I. Arabic-First, RTL Excellence | ✅ PASS | All error messages in Arabic (FR-005), RTL UI components |
| II. Member Data Security | ✅ PASS | JWT auth required, audit logging (FR-012), RBAC enforced |
| III. API-First Architecture | ✅ PASS | Backend API first, then frontend consumption |
| IV. Mobile-First Design | ✅ PASS | Fund balance viewable on mobile; admin-only features appropriate |
| V. Financial Accuracy | ✅ PASS | Balance validation (FR-003), atomic transactions, audit trail |
| VI. Fund Balance Integrity | ✅ PASS | Direct implementation of this principle |

**Gate Status**: ✅ PASSED - All constitution principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/001-fund-balance-system/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI specs)
│   └── fund-balance-api.yaml
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Existing Al-Shuail architecture (Web application)
alshuail-backend/
├── src/
│   ├── controllers/
│   │   ├── expensesController.js      # MODIFY: Add balance validation
│   │   └── fundBalanceController.js   # CREATE: New controller
│   ├── routes/
│   │   ├── expenses.js                # EXISTING: No changes needed
│   │   └── fundBalance.routes.js      # CREATE: New routes
│   └── config/
│       └── supabase.js                # EXISTING: Database client
└── __tests__/
    ├── unit/
    │   └── fundBalance.test.js        # CREATE: Unit tests
    └── integration/
        └── fundBalance.integration.test.js  # CREATE: Integration tests

alshuail-admin-arabic/
├── src/
│   ├── components/
│   │   ├── FundBalanceCard.tsx        # CREATE: Balance display component
│   │   └── BankReconciliationModal.tsx # CREATE: Reconciliation UI
│   └── pages/
│       └── admin/
│           └── Expenses/               # MODIFY: Add balance card
└── tests/
    └── components/
        └── FundBalanceCard.test.tsx    # CREATE: Component tests

database/
└── migrations/
    └── 001_fund_balance_schema.sql    # CREATE: Schema updates
```

**Structure Decision**: Following existing web application architecture with Express.js backend and React admin frontend. No new projects added; extending existing controllers/components.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

---

## Phase 0: Research Complete

See [research.md](./research.md) for detailed findings.

**Key Decisions**:
1. Use PostgreSQL VIEW + RPC function for balance calculation (performance + accuracy)
2. Use database-level locking for concurrent expense validation (race condition prevention)
3. Store diya_type as VARCHAR('internal'|'external') for explicit classification
4. Auto-generate expense numbers via database trigger (EXP-YYYY-NNNN format)

## Phase 1: Design Complete

See:
- [data-model.md](./data-model.md) - Entity definitions and schema changes
- [contracts/fund-balance-api.yaml](./contracts/fund-balance-api.yaml) - API specifications
- [quickstart.md](./quickstart.md) - Developer setup guide

**Ready for**: `/speckit.tasks` to generate implementation tasks
