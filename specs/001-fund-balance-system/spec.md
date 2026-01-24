# Feature Specification: Fund Balance System

**Feature Branch**: `001-fund-balance-system`
**Created**: 2026-01-24
**Status**: Draft
**Input**: User description: "Implement Fund Balance System with expense validation, internal/external diya classification, and bank reconciliation per KITS specification"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Fund Balance (Priority: P1)

A financial manager needs to see the current fund balance at a glance to make informed decisions about expenses and diya payments.

**Why this priority**: This is the foundational capability - all other features depend on knowing the current balance. Without this, expense validation and reconciliation cannot function.

**Independent Test**: Can be fully tested by accessing the admin dashboard and verifying the balance card displays accurate totals that match database calculations.

**Acceptance Scenarios**:

1. **Given** a financial manager is logged in, **When** they view the expenses page, **Then** they see a prominent fund balance card showing current balance, total revenue, total expenses, and total internal diya
2. **Given** the fund balance is below 3,600 SAR (minimum threshold), **When** the balance card loads, **Then** a low balance warning is displayed with amber/orange visual indicators
3. **Given** new payments or expenses have been recorded, **When** the user clicks refresh, **Then** the balance updates to reflect current database state within 3 seconds

---

### User Story 2 - Create Expense with Balance Validation (Priority: P1)

A financial manager needs to create new expenses while ensuring the fund has sufficient balance to cover the expenditure.

**Why this priority**: Core business logic - prevents overdrawing the fund and maintains financial integrity. Tied directly to balance visibility (Story 1).

**Independent Test**: Can be fully tested by attempting to create expenses with various amounts and verifying balance checks work correctly.

**Acceptance Scenarios**:

1. **Given** the fund balance is 50,000 SAR, **When** the user creates an expense of 10,000 SAR, **Then** the expense is created successfully and balance updates to 40,000 SAR
2. **Given** the fund balance is 5,000 SAR, **When** the user attempts to create an expense of 10,000 SAR, **Then** the system blocks the expense and displays "رصيد الصندوق غير كافي" (Insufficient fund balance) with details showing current balance and shortage
3. **Given** an expense is being created, **When** the form is displayed, **Then** the current available balance is shown to guide the user before submission
4. **Given** an expense is successfully created, **When** the confirmation appears, **Then** it shows the balance before and after the expense deduction

---

### User Story 3 - Classify Diya as Internal or External (Priority: P2)

An administrator needs to classify diya cases as either internal (paid to fund members) or external (paid to non-members) because only internal diya affects the fund balance.

**Why this priority**: Critical for accurate balance calculation but secondary to core balance viewing and expense creation. Miscategorization leads to incorrect balance reporting.

**Independent Test**: Can be fully tested by creating diya cases with each classification and verifying only internal diya deducts from balance.

**Acceptance Scenarios**:

1. **Given** a new diya case for a family member (fund participant), **When** the case is created and marked as "internal", **Then** the paid amount deducts from the fund balance
2. **Given** a new diya case for a non-member (external beneficiary), **When** the case is created and marked as "external", **Then** the fund balance remains unchanged
3. **Given** existing diya cases exist, **When** viewing the balance breakdown, **Then** internal diya cases are listed separately with individual amounts
4. **Given** a diya case was incorrectly classified, **When** an admin changes the classification, **Then** the fund balance recalculates accordingly

---

### User Story 4 - Bank Reconciliation (Priority: P3)

A financial manager needs to compare the calculated fund balance with actual bank statement balance to identify discrepancies.

**Why this priority**: Audit and compliance feature that builds on accurate balance calculation. Important but not blocking core operations.

**Independent Test**: Can be fully tested by entering a bank statement balance and verifying the system calculates and displays variance.

**Acceptance Scenarios**:

1. **Given** the calculated fund balance is 100,000 SAR, **When** the user enters bank statement balance of 100,000 SAR, **Then** the system shows "الرصيد مطابق لكشف الحساب البنكي" (Balance matches bank statement) with green indicator
2. **Given** the calculated balance is 100,000 SAR, **When** the user enters bank statement balance of 95,000 SAR, **Then** the system shows variance of -5,000 SAR with warning indicator and saves a snapshot for audit
3. **Given** multiple reconciliations have been performed, **When** the user views reconciliation history, **Then** all past snapshots display with dates, calculated balance, bank balance, and variance
4. **Given** a reconciliation is saved, **When** viewing the snapshot details, **Then** it includes total revenue, total expenses, total internal diya, and notes at time of capture

---

### User Story 5 - Expense Number Auto-Generation (Priority: P3)

The system needs to automatically generate sequential expense numbers for tracking and reference.

**Why this priority**: Quality of life feature for record-keeping, not blocking core functionality.

**Independent Test**: Can be fully tested by creating multiple expenses and verifying sequential numbering.

**Acceptance Scenarios**:

1. **Given** no expenses exist for year 2026, **When** the first expense is created, **Then** it receives number "EXP-2026-0001"
2. **Given** expense "EXP-2026-0042" is the latest, **When** a new expense is created, **Then** it receives number "EXP-2026-0043"
3. **Given** the year changes from 2026 to 2027, **When** the first expense of 2027 is created, **Then** numbering restarts as "EXP-2027-0001"

---

### Edge Cases

- What happens when two users create expenses simultaneously for amounts that together exceed the balance? System MUST use database locking to prevent race conditions.
- How does the system handle partial diya payments? The amount_paid field tracks actual disbursements, which is what deducts from balance.
- What happens if a diya classification is changed from external to internal after partial payment? Balance recalculates using current amount_paid.
- What happens if an approved expense is later rejected/cancelled? Balance must be restored (expense no longer counts against balance).
- What if bank reconciliation shows large variance? System saves snapshot with notes field for investigation; no automatic adjustments to calculated balance.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST calculate fund balance using formula: Balance = Total Subscriptions - Total Expenses - Internal Diya
- **FR-002**: System MUST display fund balance prominently on admin dashboard with visual indicators for low balance (below 3,600 SAR)
- **FR-003**: System MUST validate expense amount against available balance before allowing creation
- **FR-004**: System MUST block expense creation if requested amount exceeds current fund balance
- **FR-005**: System MUST display clear Arabic error message "رصيد الصندوق غير كافي" when balance validation fails
- **FR-006**: System MUST support diya classification as either "internal" (داخلي) or "external" (خارجي)
- **FR-007**: System MUST only deduct internal diya payments from fund balance; external diya does not affect balance
- **FR-008**: System MUST allow financial managers to create bank reconciliation snapshots
- **FR-009**: System MUST calculate and display variance between calculated balance and bank statement balance
- **FR-010**: System MUST maintain reconciliation history for audit purposes
- **FR-011**: System MUST auto-generate sequential expense numbers in format "EXP-YYYY-NNNN"
- **FR-012**: System MUST log all expense creation and approval actions in audit trail with balance before/after
- **FR-013**: System MUST only count "approved" or "paid" expenses against fund balance; pending/rejected expenses do not affect balance
- **FR-014**: System MUST refresh balance display within 3 seconds of user request
- **FR-015**: System MUST show balance before and after expense in creation confirmation

### Key Entities *(include if feature involves data)*

- **Fund Balance**: Represents the current available funds. Calculated from: total completed payments (subscriptions) minus total approved expenses minus total internal diya amounts paid
- **Expense**: A fund expenditure record with amount, category, status (pending/approved/paid/rejected), expense number, and audit trail
- **Diya Case**: A blood money obligation with classification (internal/external), amount, payment status, and beneficiary details
- **Balance Snapshot**: A point-in-time record for bank reconciliation containing calculated balance, bank statement balance, variance, and notes
- **Payment**: Subscription payments from members that constitute fund revenue

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Fund balance is visible to financial managers within 2 seconds of page load
- **SC-002**: 100% of expense creations exceeding available balance are blocked with clear messaging
- **SC-003**: Balance calculation matches manual calculation (subscriptions - expenses - internal diya) to the fils (SAR subdivisions)
- **SC-004**: Financial managers can complete a bank reconciliation in under 2 minutes
- **SC-005**: Internal diya payments correctly reduce balance; external diya has zero impact on balance
- **SC-006**: All expense numbers follow sequential pattern with no gaps or duplicates within a calendar year
- **SC-007**: Balance updates reflect within 5 seconds of any transaction (payment, expense, or diya)
- **SC-008**: Reconciliation history retains at least 12 months of snapshots for audit compliance
- **SC-009**: Low balance warnings appear for all users when balance drops below 3,600 SAR minimum threshold

## Assumptions

- The existing `payments` table contains all subscription revenue with `status = 'completed'` indicating confirmed payments
- The existing `expenses` table will be extended to support the new status workflow
- The existing `diya_cases` table will be extended with `diya_type` column for internal/external classification
- Historical diya cases (3 existing internal cases) will be migrated with correct classification
- Financial managers have the `financial_manager` or `super_admin` role
- All monetary values are stored in SAR (Saudi Riyals)
- The minimum balance threshold of 3,600 SAR represents 6 years × 600 SAR/year for one member's contribution
