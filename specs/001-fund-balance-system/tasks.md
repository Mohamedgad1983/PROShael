# Tasks: Fund Balance System

**Input**: Design documents from `/specs/001-fund-balance-system/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/fund-balance-api.yaml

**Tests**: Not explicitly requested in specification. Test tasks excluded.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

```
alshuail-backend/          # Express.js API (ES Modules)
├── src/
│   ├── controllers/       # Request handlers
│   ├── routes/            # API route definitions
│   └── config/            # Database configuration
└── server.js              # Main entry point

alshuail-admin-arabic/     # React 18 + TypeScript Admin Dashboard
├── src/
│   ├── components/        # Reusable UI components
│   └── pages/admin/       # Admin page components

database/
└── migrations/            # SQL migration files
```

---

## Phase 1: Setup (Database Schema)

**Purpose**: Database schema changes required for all user stories

- [ ] T001 Create database migration file at database/migrations/001_fund_balance_schema.sql
- [ ] T002 Add `diya_type` column to diya_cases table with CHECK constraint ('internal'|'external')
- [ ] T003 Add index on diya_cases(diya_type) for balance calculation performance
- [ ] T004 Verify `status` column exists on expenses table with correct CHECK constraint
- [ ] T005 Add `expense_number` column to expenses table (VARCHAR 20)
- [ ] T006 Add index on expenses(status) for balance calculation performance
- [ ] T007 Create `fund_balance_snapshots` table for bank reconciliation
- [ ] T008 Create `vw_fund_balance` PostgreSQL view for real-time balance calculation
- [ ] T009 Create `generate_expense_number()` PostgreSQL trigger function
- [ ] T010 Attach `set_expense_number` trigger to expenses table

**Data Migration** (run after schema):
- [ ] T011 Update existing internal diya cases to set diya_type='internal'
- [ ] T012 Generate expense_number for existing expenses without one

**Checkpoint**: Database schema ready - Execute migration on VPS PostgreSQL (213.199.62.185)

---

## Phase 2: Foundational (Backend Infrastructure)

**Purpose**: Core backend infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T013 Create fundBalanceController.js at alshuail-backend/src/controllers/fundBalanceController.js
- [ ] T014 Create fundBalance.routes.js at alshuail-backend/src/routes/fundBalance.routes.js
- [ ] T015 Register fund balance routes in alshuail-backend/server.js

**Checkpoint**: Backend routes registered - API endpoints callable (return 501 until implemented)

---

## Phase 3: User Story 1 - View Fund Balance (Priority: P1) - MVP

**Goal**: Financial manager can see current fund balance at a glance with breakdown

**Independent Test**: Access /api/fund/balance and verify balance card displays accurate totals

**API Endpoints**: `GET /fund/balance`, `GET /fund/breakdown`

### Implementation for User Story 1

- [ ] T016 [US1] Implement getFundBalance() in alshuail-backend/src/controllers/fundBalanceController.js
- [ ] T017 [US1] Implement getBalanceBreakdown() in alshuail-backend/src/controllers/fundBalanceController.js
- [ ] T018 [US1] Add GET /fund/balance route in alshuail-backend/src/routes/fundBalance.routes.js
- [ ] T019 [US1] Add GET /fund/breakdown route in alshuail-backend/src/routes/fundBalance.routes.js
- [ ] T020 [P] [US1] Create FundBalanceCard.tsx component at alshuail-admin-arabic/src/components/FundBalanceCard.tsx
- [ ] T021 [US1] Add low balance warning (< 3,600 SAR) styling to FundBalanceCard.tsx
- [ ] T022 [US1] Add refresh button with 3-second update to FundBalanceCard.tsx
- [ ] T023 [US1] Integrate FundBalanceCard into Expenses page at alshuail-admin-arabic/src/pages/admin/Expenses/

**Checkpoint**: User Story 1 complete - Balance visible on expenses page with refresh capability

---

## Phase 4: User Story 2 - Create Expense with Balance Validation (Priority: P1)

**Goal**: Expense creation is blocked when fund has insufficient balance

**Independent Test**: Try creating expense exceeding balance, verify Arabic error message appears

**API Endpoint**: `POST /expenses` (modify existing)

**Depends on**: User Story 1 (needs balance query helper)

### Implementation for User Story 2

- [ ] T024 [US2] Create getCurrentBalance() helper function in alshuail-backend/src/controllers/fundBalanceController.js
- [ ] T025 [US2] Import getCurrentBalance in alshuail-backend/src/controllers/expensesController.js
- [ ] T026 [US2] Add balance validation check in createExpense() function (query vw_fund_balance)
- [ ] T026b [US2] Wrap balance check and expense insert in database transaction with row locking in createExpense() at alshuail-backend/src/controllers/expensesController.js
- [ ] T027 [US2] Return Arabic error "رصيد الصندوق غير كافي" with balance details when insufficient
- [ ] T028 [US2] Return balance before/after in successful expense creation response
- [ ] T029 [P] [US2] Show current balance in expense creation form in admin frontend
- [ ] T030 [US2] Display balance before/after in expense creation confirmation dialog

**Checkpoint**: User Story 2 complete - Expenses exceeding balance are blocked with Arabic error

---

## Phase 5: User Story 3 - Classify Diya as Internal/External (Priority: P2)

**Goal**: Admin can classify diya cases, only internal diya affects fund balance

**Independent Test**: Create internal and external diya cases, verify only internal deducts from balance

**Dependencies**: None (schema already created in Phase 1)

### Implementation for User Story 3

- [ ] T031 [P] [US3] Add diya_type field to diya form in admin frontend (radio: داخلي/خارجي)
- [ ] T032 [US3] Update diyasController.js to accept diya_type parameter in createDiya()
- [ ] T033 [US3] Update diyasController.js to allow diya_type modification in updateDiya()
- [ ] T034 [US3] Add diya_type column to diya cases list view in admin frontend
- [ ] T035 [US3] Update balance breakdown to list internal diya cases separately in getBalanceBreakdown()

**Checkpoint**: User Story 3 complete - Diya classification affects balance correctly

---

## Phase 6: User Story 4 - Bank Reconciliation (Priority: P3)

**Goal**: Financial manager can compare calculated balance with bank statement and save snapshots

**Independent Test**: Enter bank balance, verify variance calculation and snapshot saved

**API Endpoints**: `POST /fund/snapshot`, `GET /fund/snapshots`

### Implementation for User Story 4

- [ ] T036 [US4] Implement createSnapshot() in alshuail-backend/src/controllers/fundBalanceController.js
- [ ] T037 [US4] Implement getSnapshots() in alshuail-backend/src/controllers/fundBalanceController.js
- [ ] T038 [US4] Add POST /fund/snapshot route in alshuail-backend/src/routes/fundBalance.routes.js
- [ ] T039 [US4] Add GET /fund/snapshots route in alshuail-backend/src/routes/fundBalance.routes.js
- [ ] T040 [P] [US4] Create BankReconciliationModal.tsx at alshuail-admin-arabic/src/components/BankReconciliationModal.tsx
- [ ] T041 [US4] Add bank balance input with variance calculation display in BankReconciliationModal
- [ ] T042 [US4] Add notes textarea for audit documentation in BankReconciliationModal
- [ ] T043 [US4] Add reconciliation history table in BankReconciliationModal
- [ ] T044 [US4] Add "مطابقة بنكية" (Bank Reconciliation) button to FundBalanceCard triggering modal
- [ ] T045 [US4] Display Arabic success message "الرصيد مطابق" or variance warning

**Checkpoint**: User Story 4 complete - Bank reconciliation with snapshot history working

---

## Phase 7: User Story 5 - Expense Number Auto-Generation (Priority: P3)

**Goal**: Expenses automatically receive sequential numbers (EXP-YYYY-NNNN)

**Independent Test**: Create multiple expenses, verify sequential numbering

**Dependencies**: Database trigger already created in Phase 1 (T009, T010)

### Implementation for User Story 5

- [ ] T046 [US5] Verify expense_number is returned in expense creation response
- [ ] T047 [US5] Display expense_number in expense list view in admin frontend
- [ ] T048 [US5] Add expense_number to expense detail view in admin frontend
- [ ] T049 [US5] Add expense_number search/filter capability in expenses list

**Checkpoint**: User Story 5 complete - Expenses have auto-generated sequential numbers

---

## Phase 8: Mobile PWA Integration (Constitution IV Compliance)

**Purpose**: Ensure mobile PWA has fund balance visibility per Constitution IV (Mobile-First Design)

**Note**: Admin-only features (bank reconciliation, expense creation) are appropriately excluded from mobile.

- [ ] T050 [P] Create FundBalanceCard component at alshuail-mobile/src/components/FundBalanceCard.jsx
- [ ] T051 Add fund balance display to mobile dashboard at alshuail-mobile/src/pages/Dashboard.jsx
- [ ] T052 Add low balance warning styling (< 3,600 SAR) to mobile FundBalanceCard

**Checkpoint**: Mobile users can view fund balance on their dashboard

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T053 [P] Add audit logging for balance-related operations in expensesController.js
- [ ] T054 [P] Add audit logging for snapshot creation in fundBalanceController.js
- [ ] T055 Verify RTL styling across all new components (FundBalanceCard, BankReconciliationModal)
- [ ] T056 Add loading states and error handling to frontend components
- [ ] T057 Run quickstart.md verification queries on production database
- [ ] T058 Performance test: Verify balance calculation < 500ms, UI refresh < 3 seconds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - Execute database migration first
- **Foundational (Phase 2)**: Depends on Setup - Create backend structure
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority but US2 depends on US1's balance query
  - US3, US4, US5 can proceed independently after foundational
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1 (Database) ──► Phase 2 (Backend Foundation)
                              │
                              ├──► US1 (View Balance) ──► US2 (Expense Validation)
                              │
                              ├──► US3 (Diya Classification) [Independent]
                              │
                              ├──► US4 (Bank Reconciliation) [Independent]
                              │
                              └──► US5 (Expense Numbers) [Independent - trigger already exists]
```

### Within Each User Story

- Backend implementation before frontend integration
- API endpoints before UI components
- Core functionality before refinements (styling, error handling)

### Parallel Opportunities

**Phase 1 Parallel Tasks**:
```
T002-T006 (schema alterations) can run in parallel
T007-T010 (new objects) can run in parallel after schema
```

**Phase 3 (US1) Parallel Tasks**:
```
T016-T019 (backend) → then T020-T023 (frontend)
T020 (component) can run parallel to T021-T022 (enhancements)
```

**Across User Stories** (after US1 complete):
```
US3, US4, US5 can all be worked on in parallel by different developers
```

---

## Parallel Example: User Story 1

```bash
# Backend tasks (sequential within):
Task T016: "Implement getFundBalance() in fundBalanceController.js"
Task T017: "Implement getBalanceBreakdown() in fundBalanceController.js"
Task T018: "Add GET /fund/balance route"
Task T019: "Add GET /fund/breakdown route"

# Then frontend tasks (T020 parallel with T21-T22):
Task T020: "Create FundBalanceCard.tsx component"
Task T021: "Add low balance warning styling" [P]
Task T022: "Add refresh button" [P]

# Finally integration:
Task T023: "Integrate FundBalanceCard into Expenses page"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Database migration on VPS
2. Complete Phase 2: Backend foundation
3. Complete Phase 3: User Story 1 (View Balance)
4. Complete Phase 4: User Story 2 (Expense Validation)
5. **STOP and VALIDATE**: Test balance display and expense blocking
6. Deploy to production

### Incremental Delivery

1. Database + Backend Foundation → Ready for feature work
2. Add US1 (View Balance) → Test → Deploy (MVP!)
3. Add US2 (Expense Validation) → Test → Deploy
4. Add US3 (Diya Classification) → Test → Deploy
5. Add US4 (Bank Reconciliation) → Test → Deploy
6. Add US5 (Expense Numbers) → Test → Deploy

### Database Migration Checklist

Before any code deployment:

```bash
# SSH to VPS
ssh root@213.199.62.185

# Connect to database
psql -U postgres -d alshuail_db

# Execute migration
\i /path/to/database/migrations/001_fund_balance_schema.sql

# Verify
SELECT * FROM vw_fund_balance;
SELECT column_name FROM information_schema.columns WHERE table_name = 'diya_cases' AND column_name = 'diya_type';
```

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All monetary values in SAR (Saudi Riyals)
- Error messages must be in Arabic per Constitution Principle I
- JWT authentication required for all /fund/* endpoints
