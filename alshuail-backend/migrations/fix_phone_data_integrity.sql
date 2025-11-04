-- =====================================================
-- Phone Data Integrity Fix Migration
-- =====================================================
-- Purpose: Fix 341 invalid phone numbers with wrong country prefix
-- Date: 2025-01-01
-- Issue: Phone numbers have +9655 (Kuwait) but should be +9665 (Saudi)
--
-- BEFORE: +96550010XXX (12 chars) - Kuwait prefix with Saudi number
-- AFTER:  96650010XXX (11 chars) - Saudi prefix, no + sign
--
-- =====================================================

-- Step 1: Create backup table
DROP TABLE IF EXISTS members_phone_backup;
CREATE TABLE members_phone_backup AS
SELECT
  id,
  phone,
  full_name,
  created_at,
  updated_at
FROM members
WHERE phone IS NOT NULL;

SELECT COUNT(*) as "Backup Created - Total Records" FROM members_phone_backup;

-- Step 2: Show current data distribution BEFORE fix
SELECT
  'BEFORE FIX' as status,
  COUNT(*) as total_with_phone,
  COUNT(CASE WHEN phone LIKE '+9655%' OR phone LIKE '9655%' THEN 1 END) as wrong_kuwait_prefix,
  COUNT(CASE WHEN phone LIKE '+9665%' OR phone LIKE '9665%' THEN 1 END) as saudi_with_plus,
  COUNT(CASE WHEN phone LIKE '9665%' AND phone NOT LIKE '+%' THEN 1 END) as saudi_no_plus,
  COUNT(CASE WHEN phone LIKE '+965%' AND LENGTH(phone) = 12 THEN 1 END) as valid_kuwait_with_plus,
  COUNT(CASE WHEN phone LIKE '965%' AND LENGTH(phone) = 11 AND phone NOT LIKE '+%' THEN 1 END) as valid_kuwait_no_plus,
  COUNT(CASE WHEN phone LIKE '0%' THEN 1 END) as local_format
FROM members
WHERE phone IS NOT NULL;

-- Step 3: Fix Kuwait prefix error (+9655 → 9665)
-- This fixes the 341 records with wrong country code
UPDATE members
SET phone = '9665' || SUBSTRING(phone FROM 6)  -- Extract from position 6 to skip "+9655"
WHERE phone LIKE '+9655%';

UPDATE members
SET phone = '9665' || SUBSTRING(phone FROM 5)  -- Extract from position 5 to skip "9655"
WHERE phone LIKE '9655%' AND phone NOT LIKE '+%';

SELECT COUNT(*) as "Step 3 - Fixed wrong Kuwait prefix" FROM members WHERE phone LIKE '%9655%';

-- Step 4: Remove + prefix for consistency (backend stores without +)
UPDATE members
SET phone = REPLACE(phone, '+', '')
WHERE phone LIKE '+%';

SELECT COUNT(*) as "Step 4 - Removed + prefix" FROM members WHERE phone LIKE '+%';

-- Step 5: Fix local format (0599999999 → 966599999999)
UPDATE members
SET phone = '966' || SUBSTRING(phone FROM 2)  -- Remove leading 0, add 966
WHERE phone ~ '^0[5][0-9]{8}$';

SELECT COUNT(*) as "Step 5 - Fixed local format" FROM members WHERE phone LIKE '0%';

-- Step 6: Validate all phone numbers are now in correct format
SELECT
  'AFTER FIX' as status,
  COUNT(*) as total_with_phone,
  COUNT(CASE WHEN phone ~ '^966[5][0-9]{8}$' THEN 1 END) as valid_saudi,
  COUNT(CASE WHEN phone ~ '^965[0-9]{8}$' THEN 1 END) as valid_kuwait,
  COUNT(CASE WHEN phone !~ '^(966[5][0-9]{8}|965[0-9]{8})$' THEN 1 END) as still_invalid,
  MIN(LENGTH(phone)) as min_length,
  MAX(LENGTH(phone)) as max_length
FROM members
WHERE phone IS NOT NULL;

-- Step 7: Show any remaining invalid numbers for manual review
SELECT
  id,
  full_name,
  phone,
  LENGTH(phone) as phone_length,
  CASE
    WHEN phone ~ '^966[5][0-9]{8}$' THEN 'Valid Saudi'
    WHEN phone ~ '^965[0-9]{8}$' THEN 'Valid Kuwait'
    ELSE 'INVALID - Manual Review Required'
  END as validation_status
FROM members
WHERE
  phone IS NOT NULL
  AND phone !~ '^(966[5][0-9]{8}|965[0-9]{8})$'
ORDER BY phone;

-- Step 8: Summary report
SELECT
  'MIGRATION SUMMARY' as report_type,
  (SELECT COUNT(*) FROM members_phone_backup) as original_records,
  (SELECT COUNT(*) FROM members WHERE phone ~ '^966[5][0-9]{8}$') as fixed_saudi_numbers,
  (SELECT COUNT(*) FROM members WHERE phone ~ '^965[0-9]{8}$') as fixed_kuwait_numbers,
  (SELECT COUNT(*) FROM members WHERE phone IS NOT NULL AND phone !~ '^(966[5][0-9]{8}|965[0-9]{8})$') as remaining_invalid;

-- =====================================================
-- Rollback Instructions (if needed)
-- =====================================================
-- To restore original phone numbers:
-- UPDATE members m
-- SET phone = b.phone
-- FROM members_phone_backup b
-- WHERE m.id = b.id;
-- =====================================================
