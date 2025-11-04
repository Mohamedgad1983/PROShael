-- =====================================================
-- Phone Data Fix Migration (Simplified)
-- =====================================================
-- Fixes 341 invalid phone numbers
-- =====================================================

-- Step 1: Create backup
DROP TABLE IF EXISTS members_phone_backup;
CREATE TABLE members_phone_backup AS
SELECT id, phone, full_name FROM members WHERE phone IS NOT NULL;

-- Step 2: Fix wrong Kuwait prefix (+9655 → 9665)
UPDATE members
SET phone = '9665' || SUBSTRING(phone FROM 6)
WHERE phone LIKE '+9655%';

UPDATE members
SET phone = '9665' || SUBSTRING(phone FROM 5)
WHERE phone LIKE '9655%' AND phone NOT LIKE '+%';

-- Step 3: Remove + prefix
UPDATE members
SET phone = REPLACE(phone, '+', '')
WHERE phone LIKE '+%';

-- Step 4: Fix local format (05XXXXXXXX → 9665XXXXXXXX)
UPDATE members
SET phone = '966' || SUBSTRING(phone FROM 2)
WHERE phone ~ '^0[5][0-9]{8}$';

-- Step 5: Verify results
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN phone ~ '^966[5][0-9]{8}$' THEN 1 END) as valid_saudi,
  COUNT(CASE WHEN phone ~ '^965[0-9]{8}$' THEN 1 END) as valid_kuwait,
  COUNT(CASE WHEN phone !~ '^(966[5][0-9]{8}|965[0-9]{8})$' THEN 1 END) as invalid
FROM members
WHERE phone IS NOT NULL;

-- Show any remaining invalid
SELECT id, full_name, phone, LENGTH(phone) as len
FROM members
WHERE phone IS NOT NULL
  AND phone !~ '^(966[5][0-9]{8}|965[0-9]{8})$';
