-- ============================================================================
-- Fund Balance System Database Migration
-- Feature: 001-fund-balance-system
-- Date: 2026-01-24
-- Database: PostgreSQL 15 on VPS (213.199.62.185)
-- ============================================================================

-- T002: Add diya_type column to diya_cases table
-- Classification: internal = paid from fund (deducts from balance)
--                 external = separate collection (does NOT affect balance)
ALTER TABLE diya_cases
ADD COLUMN IF NOT EXISTS diya_type VARCHAR(20) DEFAULT 'external';

-- Add CHECK constraint for diya_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'diya_cases' AND constraint_name = 'diya_cases_diya_type_check'
    ) THEN
        ALTER TABLE diya_cases
        ADD CONSTRAINT diya_cases_diya_type_check
        CHECK (diya_type IN ('internal', 'external'));
    END IF;
END $$;

COMMENT ON COLUMN diya_cases.diya_type IS
'internal = paid from fund subscriptions (deducts from balance),
 external = separate collection (does NOT affect balance)';

-- T003: Index for balance calculation performance on diya_type
CREATE INDEX IF NOT EXISTS idx_diya_cases_type
ON diya_cases(diya_type) WHERE diya_type = 'internal';

-- T004: Verify/Add status column to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Add CHECK constraint for expense status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'expenses' AND constraint_name = 'expenses_status_check'
    ) THEN
        ALTER TABLE expenses
        ADD CONSTRAINT expenses_status_check
        CHECK (status IN ('pending', 'approved', 'paid', 'rejected'));
    END IF;
END $$;

-- T005: Add expense_number column to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS expense_number VARCHAR(20);

-- T006: Index for balance calculation performance on expense status
CREATE INDEX IF NOT EXISTS idx_expenses_status
ON expenses(status) WHERE status IN ('approved', 'paid');

-- Index for expense_number searches
CREATE INDEX IF NOT EXISTS idx_expenses_number
ON expenses(expense_number) WHERE expense_number IS NOT NULL;

-- T007: Create fund_balance_snapshots table for bank reconciliation
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
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraint for created_by if users table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fund_balance_snapshots_created_by_fkey'
        ) THEN
            ALTER TABLE fund_balance_snapshots
            ADD CONSTRAINT fund_balance_snapshots_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES users(id);
        END IF;
    END IF;
END $$;

-- Index for date-based queries on snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_date
ON fund_balance_snapshots(snapshot_date DESC);

COMMENT ON TABLE fund_balance_snapshots IS
'Point-in-time snapshots for bank reconciliation and audit compliance';

-- T008: Create vw_fund_balance PostgreSQL view for real-time balance calculation
-- Revenue is calculated from members.current_balance (sum of positive balances = subscriptions collected)
CREATE OR REPLACE VIEW vw_fund_balance AS
SELECT
    -- Total Revenue from member subscriptions (sum of positive balances = money collected)
    COALESCE(
        (SELECT SUM(current_balance) FROM members WHERE current_balance > 0),
        0
    )::DECIMAL(12,2) as total_revenue,

    -- Total Expenses (approved or paid)
    COALESCE(
        (SELECT SUM(amount) FROM expenses WHERE status IN ('approved', 'paid')),
        0
    )::DECIMAL(12,2) as total_expenses,

    -- Total Internal Diya (only internal type, collected amounts)
    COALESCE(
        (SELECT SUM(collected_amount) FROM diya_cases
         WHERE diya_type = 'internal'
         AND status IN ('paid', 'partially_paid', 'completed')),
        0
    )::DECIMAL(12,2) as total_internal_diya,

    -- Calculated Balance: Revenue - Expenses - Internal Diya
    (
        COALESCE(
            (SELECT SUM(current_balance) FROM members WHERE current_balance > 0), 0
        )
        - COALESCE(
            (SELECT SUM(amount) FROM expenses WHERE status IN ('approved', 'paid')), 0
        )
        - COALESCE(
            (SELECT SUM(collected_amount) FROM diya_cases
             WHERE diya_type = 'internal'
             AND status IN ('paid', 'partially_paid', 'completed')), 0
        )
    )::DECIMAL(12,2) as current_balance,

    -- Timestamp
    NOW() as last_calculated;

COMMENT ON VIEW vw_fund_balance IS
'Real-time fund balance calculation: Revenue (from member subscriptions) - Expenses - Internal Diya';

-- T009: Create generate_expense_number() PostgreSQL trigger function
CREATE OR REPLACE FUNCTION generate_expense_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    seq_num INTEGER;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(expense_number FROM 10) AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM expenses
    WHERE expense_number LIKE 'EXP-' || year_part || '-%';

    -- Generate expense number in format EXP-YYYY-NNNN
    NEW.expense_number := 'EXP-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- T010: Attach set_expense_number trigger to expenses table
DROP TRIGGER IF EXISTS set_expense_number ON expenses;
CREATE TRIGGER set_expense_number
    BEFORE INSERT ON expenses
    FOR EACH ROW
    WHEN (NEW.expense_number IS NULL)
    EXECUTE FUNCTION generate_expense_number();

-- ============================================================================
-- DATA MIGRATION (T011-T012)
-- ============================================================================

-- T011: Update existing internal diya cases
-- NOTE: Replace the case_numbers below with actual internal diya case identifiers
-- These are known internal cases that should deduct from fund balance
UPDATE diya_cases
SET diya_type = 'internal'
WHERE diya_type IS NULL OR diya_type = 'external'
AND case_number IN (
    -- Add actual internal diya case numbers here
    -- Example: 'DIYA-2024-001', 'DIYA-2024-002'
    'PLACEHOLDER_REPLACE_WITH_ACTUAL'
);

-- Set all NULL diya_type to 'external' (safe default)
UPDATE diya_cases
SET diya_type = 'external'
WHERE diya_type IS NULL;

-- T012: Generate expense_number for existing expenses without one
-- Uses a subquery with row numbers to generate sequential numbers per year
WITH numbered_expenses AS (
    SELECT
        id,
        TO_CHAR(created_at, 'YYYY') as year_part,
        ROW_NUMBER() OVER (
            PARTITION BY TO_CHAR(created_at, 'YYYY')
            ORDER BY created_at
        ) as seq_num
    FROM expenses
    WHERE expense_number IS NULL
)
UPDATE expenses e
SET expense_number = 'EXP-' || ne.year_part || '-' || LPAD(ne.seq_num::TEXT, 4, '0')
FROM numbered_expenses ne
WHERE e.id = ne.id;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify balance view works
-- SELECT * FROM vw_fund_balance;

-- Verify diya_type column exists
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'diya_cases' AND column_name = 'diya_type';

-- Verify expense number trigger
-- SELECT tgname FROM pg_trigger WHERE tgname = 'set_expense_number';

-- Verify diya classification counts
-- SELECT diya_type, COUNT(*), SUM(amount_paid)
-- FROM diya_cases
-- GROUP BY diya_type;

-- Verify expense statuses
-- SELECT status, COUNT(*), SUM(amount)
-- FROM expenses
-- GROUP BY status;

-- Verify expense numbering
-- SELECT expense_number, title_ar, amount
-- FROM expenses
-- ORDER BY expense_number DESC
-- LIMIT 10;
