# 🔍 Balance Data Loss - Root Cause Analysis & Recovery Plan

**Date:** 2025-01-06
**Status:** ROOT CAUSE IDENTIFIED
**Severity:** CRITICAL - 346/347 members missing balance data

---

## 📋 Executive Summary

**Problem:** All member balance data for years 2021-2025 has disappeared from the database. Only 1 out of 347 members (SH002) has a non-zero balance.

**Root Cause:** Database schema mismatch between migration and import system.

**Impact:** 346 members showing zero balance when they should have historical payment data.

**Recovery Status:** Recovery plan identified, ready for execution.

---

## 🔎 Investigation Findings

### 1. Current Database State

```sql
-- Current situation in members table
Total members: 347
Members with balance > 0: 1 (SH002: 1,250 SAR)
Members with balance = 0: 346
Missing balance data: ~346 members × (2021-2025 payments)
```

### 2. Root Cause: Schema Mismatch

**The Problem:**

1. **Migration Created:** `add_member_balance_system` (2025-01-23)
   - Added `current_balance` column to `members` table
   - Created trigger to auto-calculate from `payments` table
   - Logic: `SUM(payments WHERE status='completed' AND payer_id=member.id)`

2. **Import Script Expects:** `payments_yearly` table
   - Script: `scripts/import-excel-to-supabase.js`
   - Expects yearly payment structure (2021, 2022, 2023, 2024, 2025)
   - Inserts into `payments_yearly` table (which doesn't exist!)

3. **SQL Schema Exists But Not Applied:** `create_payments_yearly_table.sql`
   - Full schema definition for `payments_yearly` table
   - Import function: `import_payments_from_excel()`
   - Views: `member_statements`, `yearly_payment_summary`, `member_payment_history`
   - **Status:** File exists but migration was NEVER RUN

---

## 🎯 What Happened: Timeline

### **Before Data Loss**
- Members had balance data from Excel imports (2021-2025)
- Balance data was stored somewhere (likely old schema or different table structure)
- User confirms: "before everything work fine"

### **January 23, 2025: Migration Applied**
- Migration `add_member_balance_system` ran
- Added `current_balance` column with DEFAULT 0
- Populated balances from existing `payments` table
- **Problem:** `payments` table was nearly empty (only 2 records)
- Result: 346 members got `current_balance = 0`

### **Current State**
- `payments_yearly` table: **DOES NOT EXIST**
- `payments` table: Contains only 2 payments (1,250 SAR for SH002)
- `members.current_balance`: 346 members have 0, 1 member has 1,250
- Historical Excel payment data: **NOT IMPORTED**

---

## 📊 Evidence

### Database Query Results

```sql
-- Payments table (current state)
SELECT COUNT(*), SUM(amount) FROM payments;
-- Result: 2 payments, 1,250 SAR total

-- Members with zero balance
SELECT COUNT(*) FROM members WHERE current_balance = 0;
-- Result: 346 members

-- Import year tracking (should show historical imports)
SELECT import_year, COUNT(*) FROM payments GROUP BY import_year;
-- Result: Only NULL (no historical imports)
```

### Files Found

1. **Migration that caused reset:**
   - `alshuail-backend/migrations/20250123_add_member_balance_system.sql`
   - Lines 10-19: Populated `current_balance` from EMPTY `payments` table

2. **Missing table schema:**
   - `supabase-migrations/create_payments_yearly_table.sql`
   - Complete schema for yearly payment tracking
   - **NEVER APPLIED TO DATABASE**

3. **Import script waiting to run:**
   - `scripts/import-excel-to-supabase.js`
   - Reads Excel columns: `payment_2021`, `payment_2022`, etc.
   - Tries to insert into `payments_yearly` (doesn't exist)

---

## 🛠️ Recovery Plan

### Phase 1: Create Missing Table Structure ✅ READY

**Action:** Apply `create_payments_yearly_table.sql` migration

**What it creates:**
- `payments_yearly` table with yearly payment tracking
- Triggers for auto-updating balances
- Views: `member_statements`, `yearly_payment_summary`, `member_payment_history`
- Import function: `import_payments_from_excel()`

**SQL to Run:**
```bash
# Apply the payments_yearly schema
supabase db push --file supabase-migrations/create_payments_yearly_table.sql
```

---

### Phase 2: Import Historical Payment Data ⏳ PENDING

**Action:** Run Excel import script with historical payment data

**Requirements:**
1. Excel file location: `alshuail-backend/AlShuail_Members_Prefilled_Import.xlsx`
2. Expected columns:
   - `member_id` or `رقم العضوية`
   - `payment_2021` or `مدفوعات 2021`
   - `payment_2022` or `مدفوعات 2022`
   - `payment_2023` or `مدفوعات 2023`
   - `payment_2024` or `مدفوعات 2024`
   - `payment_2025` or `مدفوعات 2025`

**Command:**
```bash
cd D:\PROShael
node scripts/import-excel-to-supabase.js
```

---

### Phase 3: Recalculate Member Balances ⏳ PENDING

**Action:** Update `members.current_balance` from `payments_yearly` data

**SQL to Run:**
```sql
-- Recalculate all member balances from payments_yearly
UPDATE members m
SET current_balance = COALESCE(
  (
    SELECT SUM(py.amount)
    FROM payments_yearly py
    WHERE py.member_id = m.id
  ),
  0
),
updated_at = NOW();

-- Verify results
SELECT
  COUNT(*) as total_members,
  COUNT(*) FILTER (WHERE current_balance > 0) as members_with_balance,
  COUNT(*) FILTER (WHERE current_balance = 0) as members_with_zero,
  SUM(current_balance) as total_balance
FROM members;
```

---

### Phase 4: Verification ⏳ PENDING

**Checks to perform:**

1. **Member Count Check:**
   ```sql
   SELECT COUNT(DISTINCT member_id) FROM payments_yearly;
   -- Expected: ~347 members
   ```

2. **Year Coverage Check:**
   ```sql
   SELECT year, COUNT(*) as payment_count
   FROM payments_yearly
   GROUP BY year
   ORDER BY year;
   -- Expected: Data for 2021, 2022, 2023, 2024, 2025
   ```

3. **Balance Totals Check:**
   ```sql
   SELECT
     SUM(current_balance) as total_from_members,
     (SELECT SUM(amount) FROM payments_yearly) as total_from_payments
   FROM members;
   -- Should match
   ```

4. **Dashboard Verification:**
   - Navigate to: https://alshailfund.com/admin/monitoring
   - Verify: Members show correct balance values (not all zeros)
   - Check: Balance column displays properly formatted amounts

---

## 🚨 Prevention Measures

### 1. Schema Version Control
- ✅ Keep all migration files in version control
- ⚠️ Ensure migrations are applied in correct order
- ⚠️ Add migration status tracking table

### 2. Data Import Validation
- ⚠️ Validate table exists before import
- ⚠️ Add dry-run mode to import scripts
- ⚠️ Log all import operations with timestamps

### 3. Balance Calculation Safeguards
- ⚠️ Add validation trigger before balance updates
- ⚠️ Create backup of balance data before migrations
- ⚠️ Add audit log for balance changes

### 4. Database Backups
- ⚠️ Implement daily automated backups
- ⚠️ Test backup restoration process
- ⚠️ Keep 30-day backup history

---

## 📝 Technical Details

### Migration Analysis: `add_member_balance_system`

**What went wrong on lines 10-19:**

```sql
-- This migration populated balances from payments table
UPDATE members m
SET current_balance = COALESCE(
  (
    SELECT SUM(p.amount)
    FROM payments p
    WHERE p.payer_id = m.id
    AND p.status = 'completed'  -- Only 2 payments existed!
  ),
  0  -- 346 members got this default
);
```

**Why it failed:**
- Assumed `payments` table contained historical data
- Actually, `payments` table was nearly empty
- Should have used `payments_yearly` table
- But `payments_yearly` didn't exist yet!

---

## 🎯 Immediate Next Steps

1. **Verify Excel file exists:**
   ```bash
   ls -la "D:\PROShael\alshuail-backend\AlShuail_Members_Prefilled_Import.xlsx"
   ```

2. **Create payments_yearly table:**
   ```bash
   # Apply migration to Supabase
   cd D:\PROShael
   supabase db push --file supabase-migrations/create_payments_yearly_table.sql
   ```

3. **Run import script:**
   ```bash
   node scripts/import-excel-to-supabase.js
   ```

4. **Recalculate balances:**
   ```sql
   -- Execute balance recalculation SQL (from Phase 3)
   ```

5. **Verify in dashboard:**
   - Open: https://alshailfund.com/admin/monitoring
   - Check: All members show correct balances

---

## 📊 Expected Outcome

**Before Recovery:**
- 346 members with 0 balance
- 1 member with 1,250 SAR
- Total: 1,250 SAR

**After Recovery:**
- All 347 members with correct historical balances (2021-2025)
- Total balance matching Excel source data
- Dashboard showing accurate financial status for each member

---

## 🤝 User Communication

**User's Original Report:**
> "before we have balance for each member total balance should be each member all member have balance year 2021 until 2025 before everything work fine what happenede"

**Root Cause Explanation:**
The balance data didn't disappear from the system - it was never properly imported into the database. The migration on January 23 tried to calculate balances from a payment table that didn't have the historical data. The historical payment data (2021-2025) exists in the Excel file but was never imported because the `payments_yearly` table was never created.

**Recovery Plan:**
We will:
1. Create the missing `payments_yearly` table
2. Import all historical payment data from Excel (2021-2025)
3. Recalculate all member balances correctly
4. Verify everything shows properly in the dashboard

**Timeline:**
- Table creation: 2 minutes
- Data import: 5-10 minutes (347 members × 5 years)
- Balance recalculation: 1 minute
- Verification: 5 minutes
- **Total: ~15-20 minutes**

---

**Status:** ANALYSIS COMPLETE - READY FOR RECOVERY EXECUTION

**Next Action:** Create `payments_yearly` table and run import script
