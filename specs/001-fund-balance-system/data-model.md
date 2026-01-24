# Data Model: Fund Balance System

**Feature**: 001-fund-balance-system
**Date**: 2026-01-24
**Status**: Complete

## Entity Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    payments     │     │    expenses     │     │   diya_cases    │
│   (Revenue)     │     │   (Outflow)     │     │   (Outflow*)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │   status='completed'  │ status='approved'     │ diya_type='internal'
         │                       │ OR 'paid'             │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   vw_fund_balance      │
                    │   (Calculated View)    │
                    │                        │
                    │ Balance = Revenue      │
                    │        - Expenses      │
                    │        - Internal Diya │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ fund_balance_snapshots │
                    │  (Bank Reconciliation) │
                    └────────────────────────┘

* Only internal diya affects balance; external diya is excluded
```

## Schema Changes

### 1. diya_cases Table (MODIFY)

Add column to classify diya as internal or external.

```sql
-- Add diya_type column
ALTER TABLE diya_cases
ADD COLUMN IF NOT EXISTS diya_type VARCHAR(20) DEFAULT 'external'
CHECK (diya_type IN ('internal', 'external'));

COMMENT ON COLUMN diya_cases.diya_type IS
'internal = paid from fund subscriptions (deducts from balance),
 external = separate collection (does NOT affect balance)';

-- Index for balance calculations
CREATE INDEX IF NOT EXISTS idx_diya_cases_type
ON diya_cases(diya_type) WHERE diya_type = 'internal';
```

**Existing Columns** (unchanged):
- `id` UUID PRIMARY KEY
- `case_number` VARCHAR
- `beneficiary_name` VARCHAR
- `amount` DECIMAL(12,2)
- `amount_paid` DECIMAL(12,2)
- `status` VARCHAR (paid, partially_paid, pending, etc.)
- `created_at` TIMESTAMP

---

### 2. expenses Table (MODIFY)

Ensure status column exists for balance calculation.

```sql
-- Verify status column exists (likely already present)
-- If not:
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
CHECK (status IN ('pending', 'approved', 'paid', 'rejected'));

-- Add expense_number if not exists
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS expense_number VARCHAR(20);

-- Index for balance calculations
CREATE INDEX IF NOT EXISTS idx_expenses_status
ON expenses(status) WHERE status IN ('approved', 'paid');
```

**Existing Columns** (unchanged):
- `id` UUID PRIMARY KEY
- `title_ar` VARCHAR
- `title_en` VARCHAR
- `amount` DECIMAL(12,2)
- `expense_category` VARCHAR
- `expense_date` DATE
- `paid_to` VARCHAR
- `paid_by` UUID
- `created_at` TIMESTAMP

---

### 3. fund_balance_snapshots Table (CREATE)

New table for bank reconciliation audit trail.

```sql
CREATE TABLE IF NOT EXISTS fund_balance_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Snapshot date
    snapshot_date DATE NOT NULL,

    -- Balance components at snapshot time
    total_revenue DECIMAL(12,2) NOT NULL,
    total_expenses DECIMAL(12,2) NOT NULL,
    total_internal_diya DECIMAL(12,2) NOT NULL,
    calculated_balance DECIMAL(12,2) NOT NULL,

    -- Bank statement comparison
    bank_statement_balance DECIMAL(12,2),
    variance DECIMAL(12,2),

    -- Audit metadata
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_snapshots_date
ON fund_balance_snapshots(snapshot_date DESC);

COMMENT ON TABLE fund_balance_snapshots IS
'Point-in-time snapshots for bank reconciliation and audit compliance';
```

---

### 4. vw_fund_balance View (CREATE)

Real-time calculated balance view.

```sql
CREATE OR REPLACE VIEW vw_fund_balance AS
SELECT
    -- Total Revenue (completed subscription payments)
    COALESCE(
        (SELECT SUM(amount) FROM payments WHERE status = 'completed'),
        0
    ) as total_revenue,

    -- Total Expenses (approved or paid)
    COALESCE(
        (SELECT SUM(amount) FROM expenses WHERE status IN ('approved', 'paid')),
        0
    ) as total_expenses,

    -- Total Internal Diya (only internal type, only paid amounts)
    COALESCE(
        (SELECT SUM(amount_paid) FROM diya_cases
         WHERE diya_type = 'internal'
         AND status IN ('paid', 'partially_paid', 'completed')),
        0
    ) as total_internal_diya,

    -- Calculated Balance
    COALESCE(
        (SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0
    )
    - COALESCE(
        (SELECT SUM(amount) FROM expenses WHERE status IN ('approved', 'paid')), 0
    )
    - COALESCE(
        (SELECT SUM(amount_paid) FROM diya_cases
         WHERE diya_type = 'internal'
         AND status IN ('paid', 'partially_paid', 'completed')), 0
    ) as current_balance,

    -- Timestamp
    NOW() as last_calculated;

COMMENT ON VIEW vw_fund_balance IS
'Real-time fund balance calculation: Revenue - Expenses - Internal Diya';
```

---

### 5. get_fund_balance() RPC Function (CREATE)

Supabase RPC function for efficient balance retrieval.

```sql
CREATE OR REPLACE FUNCTION get_fund_balance()
RETURNS TABLE (
    total_revenue DECIMAL,
    total_expenses DECIMAL,
    total_internal_diya DECIMAL,
    current_balance DECIMAL
) AS $$
BEGIN
    RETURN QUERY SELECT * FROM vw_fund_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_fund_balance IS
'Returns current fund balance breakdown for API consumption';
```

---

### 6. generate_expense_number() Trigger (CREATE)

Auto-generate expense numbers on insert.

```sql
CREATE OR REPLACE FUNCTION generate_expense_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    seq_num INTEGER;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(expense_number FROM 10) AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM expenses
    WHERE expense_number LIKE 'EXP-' || year_part || '-%';

    NEW.expense_number := 'EXP-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS set_expense_number ON expenses;
CREATE TRIGGER set_expense_number
    BEFORE INSERT ON expenses
    FOR EACH ROW
    WHEN (NEW.expense_number IS NULL)
    EXECUTE FUNCTION generate_expense_number();
```

---

## Entity Relationships

### payments (Revenue Source)
- **Used in balance**: `SUM(amount) WHERE status = 'completed'`
- **No changes required**: Existing structure sufficient

### expenses (Outflow)
- **Used in balance**: `SUM(amount) WHERE status IN ('approved', 'paid')`
- **Changes**: Add `expense_number` column, ensure `status` column exists
- **Relationship**: `paid_by` → `users.id`

### diya_cases (Conditional Outflow)
- **Used in balance**: `SUM(amount_paid) WHERE diya_type = 'internal'`
- **Changes**: Add `diya_type` column
- **Note**: Only `amount_paid` (not `amount`) is deducted

### fund_balance_snapshots (Audit Trail)
- **New table**: Stores point-in-time balance records
- **Relationship**: `created_by` → `users.id`

---

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| diya_cases | diya_type | Must be 'internal' or 'external' |
| expenses | status | Must be 'pending', 'approved', 'paid', or 'rejected' |
| expenses | amount | Must be ≤ current_balance when status = 'approved' |
| fund_balance_snapshots | snapshot_date | Required, not null |
| fund_balance_snapshots | calculated_balance | Required, not null |

---

## Data Migration

```sql
-- Migrate existing internal diya cases (3 known cases)
-- IMPORTANT: Replace case_numbers with actual values from production
UPDATE diya_cases
SET diya_type = 'internal'
WHERE case_number IN ('DIYA-001', 'DIYA-002', 'DIYA-003');

-- All other diya cases remain as 'external' (default)

-- Generate expense numbers for existing expenses without one
UPDATE expenses
SET expense_number = 'EXP-' || TO_CHAR(created_at, 'YYYY') || '-' ||
    LPAD(ROW_NUMBER() OVER (PARTITION BY TO_CHAR(created_at, 'YYYY') ORDER BY created_at)::TEXT, 4, '0')
WHERE expense_number IS NULL;
```

---

## Verification Queries

```sql
-- Verify balance calculation
SELECT * FROM vw_fund_balance;

-- Verify diya classification
SELECT diya_type, COUNT(*), SUM(amount_paid)
FROM diya_cases
GROUP BY diya_type;

-- Verify expense statuses
SELECT status, COUNT(*), SUM(amount)
FROM expenses
GROUP BY status;

-- Verify expense numbering
SELECT expense_number, title_ar, amount
FROM expenses
ORDER BY expense_number DESC
LIMIT 10;
```
