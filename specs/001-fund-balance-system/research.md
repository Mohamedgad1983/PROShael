# Research: Fund Balance System

**Feature**: 001-fund-balance-system
**Date**: 2026-01-24
**Status**: Complete

## Research Tasks

### 1. Balance Calculation Strategy

**Question**: How to calculate fund balance efficiently while ensuring accuracy?

**Decision**: PostgreSQL VIEW + RPC function

**Rationale**:
- VIEW (`vw_fund_balance`) provides real-time calculated values from source tables
- RPC function (`get_fund_balance()`) wraps the view for better performance via Supabase client
- Avoids storing balance as a field (which could become stale/inconsistent)
- Database-level calculation ensures all clients see consistent data

**Alternatives Considered**:
| Alternative | Why Rejected |
|------------|--------------|
| Store balance as column | Risk of inconsistency; requires triggers on 3 tables |
| Calculate in application | Network overhead; multiple queries; potential race conditions |
| Materialized view | Stale data between refreshes; complexity for real-time needs |

**Implementation**:
```sql
CREATE VIEW vw_fund_balance AS
SELECT
    COALESCE(SUM(payments.amount), 0) as total_revenue,
    COALESCE(SUM(expenses.amount), 0) as total_expenses,
    COALESCE(SUM(diya_cases.amount_paid), 0) as total_internal_diya,
    (revenue - expenses - internal_diya) as current_balance
FROM ...
```

---

### 2. Concurrent Expense Validation

**Question**: How to prevent race conditions when multiple users create expenses simultaneously?

**Decision**: Database-level row locking with `SELECT FOR UPDATE`

**Rationale**:
- PostgreSQL's `FOR UPDATE` clause prevents concurrent modifications
- Transaction isolation ensures atomic balance check + expense creation
- Aligns with Constitution VI.2: "Concurrent expense creation MUST be handled with proper locking"

**Alternatives Considered**:
| Alternative | Why Rejected |
|------------|--------------|
| Optimistic locking | Requires retry logic; worse UX on conflicts |
| Application-level mutex | Single point of failure; doesn't work across server instances |
| Queue-based processing | Overengineered for ~10 concurrent users |

**Implementation Pattern**:
```javascript
// In expensesController.js createExpense
const { data: balance } = await supabase.rpc('get_fund_balance');
if (amount > balance.current_balance) {
  return res.status(400).json({
    success: false,
    error_ar: 'رصيد الصندوق غير كافي'
  });
}
// Proceed with insert (Supabase handles transaction)
```

---

### 3. Diya Classification Schema

**Question**: How to classify diya cases as internal vs external?

**Decision**: VARCHAR column `diya_type` with CHECK constraint

**Rationale**:
- Explicit values ('internal', 'external') are self-documenting
- CHECK constraint enforces valid values at database level
- Default to 'external' for safety (doesn't affect balance until explicitly marked internal)
- Aligns with Constitution VI.3: "Diya classification MUST be explicit at creation time"

**Alternatives Considered**:
| Alternative | Why Rejected |
|------------|--------------|
| Boolean `is_internal` | Less readable; ambiguity with NULL |
| Enum type | Requires migration for new values; VARCHAR is simpler |
| Separate tables | Overengineered; complicates queries |

**Schema Change**:
```sql
ALTER TABLE diya_cases
ADD COLUMN diya_type VARCHAR(20) DEFAULT 'external'
CHECK (diya_type IN ('internal', 'external'));
```

---

### 4. Expense Number Generation

**Question**: How to auto-generate sequential expense numbers (EXP-YYYY-NNNN)?

**Decision**: PostgreSQL trigger function

**Rationale**:
- Database-level generation ensures uniqueness even with concurrent inserts
- Trigger fires on INSERT, populating expense_number automatically
- Year-based sequence resets naturally each year
- No application logic needed; works for any client

**Alternatives Considered**:
| Alternative | Why Rejected |
|------------|--------------|
| Application-level generation | Race condition risk; requires MAX query |
| UUID only | Not human-readable; poor for audit trail |
| Sequence object | Doesn't reset per year; complex maintenance |

**Implementation**:
```sql
CREATE FUNCTION generate_expense_number() RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    seq_num INTEGER;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    SELECT COALESCE(MAX(CAST(SUBSTRING(expense_number FROM 10) AS INTEGER)), 0) + 1
    INTO seq_num
    FROM expenses
    WHERE expense_number LIKE 'EXP-' || year_part || '-%';
    NEW.expense_number := 'EXP-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 5. Bank Reconciliation Storage

**Question**: How to store reconciliation snapshots for audit?

**Decision**: Dedicated `fund_balance_snapshots` table

**Rationale**:
- Point-in-time snapshots capture all balance components
- Variance calculation stored for quick audit review
- Notes field for investigation documentation
- Created_by tracks who performed reconciliation
- Aligns with Constitution VI.4: "Balance snapshots SHOULD be maintained for audit purposes"

**Schema**:
```sql
CREATE TABLE fund_balance_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    total_revenue DECIMAL(12,2) NOT NULL,
    total_expenses DECIMAL(12,2) NOT NULL,
    total_internal_diya DECIMAL(12,2) NOT NULL,
    calculated_balance DECIMAL(12,2) NOT NULL,
    bank_statement_balance DECIMAL(12,2),
    variance DECIMAL(12,2),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 6. Existing Codebase Integration

**Question**: How does this integrate with existing Al-Shuail architecture?

**Findings**:

| Component | Current State | Integration Approach |
|-----------|---------------|---------------------|
| `expensesController.js` | 26KB, full CRUD | Add `getCurrentBalance()` helper; modify `createExpense` |
| `diyasController.js` | 19KB, manages cases | No changes; schema only adds `diya_type` column |
| Supabase client | Configured in `config/supabase.js` | Use existing client for RPC calls |
| ExpenseManagement.jsx | Exists in admin | Import new FundBalanceCard component |
| API routes | RESTful pattern | Add `/api/fund/*` routes following pattern |

**No Breaking Changes**: All modifications are additive or backward-compatible.

---

## Summary

All technical decisions align with:
- **Constitution v1.1.0** principles (especially V and VI)
- **KITS specification** from CLAUDE_CODE_KITS_Expenses_System.md
- **Existing codebase** patterns and architecture

**Ready for Phase 1**: Data model and API contract generation.
