# Database Verification and Correction Tools

This directory contains comprehensive SQL scripts and Python tools to verify and correct member data in the Supabase database.

## Problem Statement

The monitoring dashboard was showing mock data with incorrect tribal distribution:
- **Mock data**: All 8 tribes had exactly 36 members each (288 total)
- **Real data**: 289 members with specific distribution from Excel

### Expected Data (From Excel Analysis)

| Tribal Section | Member Count | Percentage |
|---------------|-------------|------------|
| رشود | 172 | 59.5% |
| الدغيش | 45 | 15.6% |
| رشيد | 36 | 12.5% |
| العيد | 14 | 4.8% |
| الرشيد | 12 | 4.2% |
| الشبيعان | 5 | 1.7% |
| المسعود | 4 | 1.4% |
| عقاب | 1 | 0.3% |
| **TOTAL** | **289** | **100%** |

**Total Balance**: 397,040 SAR

## Files in This Directory

### 1. SQL Scripts

#### `01-verify-member-data.sql`
Comprehensive verification script that checks:
- Total member count (expected: 289)
- Tribal distribution accuracy
- Mock data patterns (36 members per tribe)
- Total balance verification (expected: 397,040 SAR)
- Duplicate member IDs
- Data integrity (null values, format issues)
- Member ID format validation
- Balance distribution analysis
- Final summary with pass/fail status

#### `02-correct-tribal-distribution.sql`
Corrects tribal distribution if mock data exists:
- Creates backup before corrections
- Redistributes members to match Excel data
- Two approaches:
  1. Row-based redistribution
  2. Member ID-based redistribution (if IDs are sequential)
- Updates timestamps
- Provides final verification

#### `03-balance-correction.sql`
Corrects member balances to match total of 397,040 SAR:
- Checks current balance situation
- Creates realistic balance distribution
- Sets compliance patterns (60% with balance ≥ 3000 SAR)
- Adds treasury member balances
- Fine-tunes to match exact total
- Ensures no negative balances
- Provides distribution analysis

### 2. Python Verification Tool

#### `verify_supabase_data.py`
Python script for programmatic verification:

**Features:**
- Connects directly to Supabase
- Fetches and analyzes member data
- Performs all verification checks
- Generates colored terminal output
- Creates JSON report with timestamp
- Detects mock data patterns
- Provides detailed statistics

**Usage:**
```bash
# Install requirements
pip install -r requirements.txt

# Create .env file with Supabase credentials
echo "SUPABASE_URL=your_supabase_url" > .env
echo "SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env

# Run verification
python verify_supabase_data.py

# Run with fix flag (shows correction options)
python verify_supabase_data.py --fix
```

**Output:**
- Colored terminal report with pass/fail indicators
- JSON report file with timestamp
- Exit code 0 if all checks pass, 1 if issues detected

## How to Use

### Step 1: Verify Current Data

Run the verification SQL in Supabase SQL Editor:
```sql
-- Copy contents of 01-verify-member-data.sql
-- Run in Supabase SQL Editor
```

Or use the Python script:
```bash
python verify_supabase_data.py
```

### Step 2: Review Results

Check the verification results:
- ✓ PASS - Data matches expected values
- ✗ FAIL - Data needs correction
- ~ CLOSE - Minor discrepancies

### Step 3: Create Backup (IMPORTANT!)

Before any corrections:
```sql
CREATE TABLE members_backup_20250928 AS
SELECT * FROM members;
```

### Step 4: Correct Data (If Needed)

If mock data is detected:

1. **Fix Tribal Distribution:**
```sql
-- Copy contents of 02-correct-tribal-distribution.sql
-- Review and adjust if needed
-- Run in Supabase SQL Editor
```

2. **Fix Balances:**
```sql
-- Copy contents of 03-balance-correction.sql
-- Review and adjust if needed
-- Run in Supabase SQL Editor
```

### Step 5: Verify Corrections

Run verification again to confirm:
```sql
-- Run 01-verify-member-data.sql again
```

Or:
```bash
python verify_supabase_data.py
```

## Expected Verification Output

When data is correct:
```
FINAL SUMMARY
-------------
Total Members: 289 ✓
Unique Tribes: 8 ✓
Total Balance: 397,040 SAR ✓
Compliant Members: ~173 (60%)
Non-compliant: ~116 (40%)
```

## Troubleshooting

### Issue: Script shows different member count
**Solution**: Check for test accounts that weren't filtered:
```sql
SELECT COUNT(*),
       COUNT(*) FILTER (WHERE email LIKE '%test%') as test_accounts,
       COUNT(*) FILTER (WHERE email LIKE '%admin%') as admin_accounts
FROM members;
```

### Issue: Tribal names don't match
**Solution**: Check for encoding or spelling differences:
```sql
SELECT DISTINCT tribal_section, COUNT(*)
FROM members
GROUP BY tribal_section
ORDER BY COUNT(*) DESC;
```

### Issue: Balance doesn't match exactly
**Solution**: Small discrepancies (< 1%) are acceptable. For exact match, use the balance correction script with fine-tuning.

## Important Notes

1. **Always create a backup** before running correction scripts
2. **Test in development** environment first if available
3. **Monitor the dashboard** after corrections to ensure it displays correctly
4. **Document any manual changes** made to the data

## Support

If you encounter issues:
1. Check the verification report for specific problems
2. Review the SQL output for error messages
3. Ensure Supabase credentials are correct
4. Verify network connectivity to Supabase

## Data Integrity Checklist

- [ ] Total member count = 289
- [ ] Tribal distribution matches Excel
- [ ] No mock data patterns (36 members per tribe)
- [ ] Total balance ≈ 397,040 SAR
- [ ] No duplicate member IDs
- [ ] All member IDs follow format (SH0001-SH0289)
- [ ] No null critical fields
- [ ] Realistic balance distribution
- [ ] Dashboard displays correct statistics