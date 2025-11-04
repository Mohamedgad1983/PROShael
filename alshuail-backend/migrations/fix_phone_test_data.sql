-- =====================================================
-- Fix Test Phone Numbers (11 → 12 characters)
-- =====================================================
-- Issue: Test phone numbers are 11 chars, need 12 for Saudi format
-- Pattern: 96650010XXX → 966500010XXX
-- =====================================================

-- Step 1: Show current state
SELECT
  'BEFORE FIX' as status,
  COUNT(*) as total,
  MIN(LENGTH(phone)) as min_length,
  MAX(LENGTH(phone)) as max_length,
  COUNT(CASE WHEN LENGTH(phone) = 11 THEN 1 END) as length_11_chars,
  COUNT(CASE WHEN LENGTH(phone) = 12 THEN 1 END) as length_12_chars
FROM members
WHERE phone IS NOT NULL;

-- Step 2: Create backup
DROP TABLE IF EXISTS members_phone_backup;
CREATE TABLE members_phone_backup AS
SELECT id, phone, full_name FROM members WHERE phone IS NOT NULL;

-- Step 3: Fix 11-character phone numbers by inserting '0' after '9665'
-- Transforms: 96650010003 → 966500010003 (adds one digit to make 12 chars)
UPDATE members
SET phone = '9665' || '0' || SUBSTRING(phone FROM 5)
WHERE phone LIKE '9665%'
  AND LENGTH(phone) = 11;

-- Step 4: Verify results
SELECT
  'AFTER FIX' as status,
  COUNT(*) as total,
  MIN(LENGTH(phone)) as min_length,
  MAX(LENGTH(phone)) as max_length,
  COUNT(CASE WHEN LENGTH(phone) = 11 THEN 1 END) as still_11_chars,
  COUNT(CASE WHEN LENGTH(phone) = 12 THEN 1 END) as now_12_chars,
  COUNT(CASE WHEN phone ~ '^966[5][0-9]{8}$' THEN 1 END) as valid_saudi_format
FROM members
WHERE phone IS NOT NULL;

-- Step 5: Show sample of fixed numbers
SELECT
  id,
  full_name,
  phone,
  LENGTH(phone) as len,
  'VALID' as status
FROM members
WHERE phone IS NOT NULL
ORDER BY phone
LIMIT 10;

-- Step 6: Check for any remaining invalid numbers
SELECT
  COUNT(*) as remaining_invalid,
  ARRAY_AGG(DISTINCT LENGTH(phone)) as invalid_lengths
FROM members
WHERE phone IS NOT NULL
  AND phone !~ '^(966[5][0-9]{8}|965[0-9]{8})$';
