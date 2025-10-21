-- ============================================================================
-- DELETE ENGLISH BRANCHES FROM FAMILY_BRANCHES TABLE
-- ============================================================================
-- Date: January 21, 2025
-- Purpose: Remove the 3 English-named branches that were created during
--          initial import but are not part of the 8 official Arabic branches
--
-- Branches to delete:
-- 1. Eastern Branch (0 members)
-- 2. Main Branch (0 members)
-- 3. Western Branch (0 members)
-- ============================================================================

BEGIN;

-- First, verify these branches exist and have no members assigned
SELECT
    id,
    branch_name,
    branch_name_en,
    (SELECT COUNT(*) FROM members WHERE family_branch_id = fb.id) as member_count
FROM family_branches fb
WHERE branch_name_en IN ('Eastern Branch', 'Main Branch', 'Western Branch')
ORDER BY branch_name_en;

-- Safety check: Only delete if they have 0 members
-- If any branch has members, the transaction will rollback

DO $$
DECLARE
    v_eastern_count INTEGER;
    v_main_count INTEGER;
    v_western_count INTEGER;
    v_eastern_id UUID;
    v_main_id UUID;
    v_western_id UUID;
BEGIN
    -- Get branch IDs and member counts
    SELECT id, (SELECT COUNT(*) FROM members WHERE family_branch_id = fb.id)
    INTO v_eastern_id, v_eastern_count
    FROM family_branches fb
    WHERE branch_name_en = 'Eastern Branch';

    SELECT id, (SELECT COUNT(*) FROM members WHERE family_branch_id = fb.id)
    INTO v_main_id, v_main_count
    FROM family_branches fb
    WHERE branch_name_en = 'Main Branch';

    SELECT id, (SELECT COUNT(*) FROM members WHERE family_branch_id = fb.id)
    INTO v_western_id, v_western_count
    FROM family_branches fb
    WHERE branch_name_en = 'Western Branch';

    -- Safety check: Ensure all have 0 members
    IF v_eastern_count > 0 OR v_main_count > 0 OR v_western_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete branches with members! Eastern: %, Main: %, Western: %',
            v_eastern_count, v_main_count, v_western_count;
    END IF;

    -- Log what we're deleting
    RAISE NOTICE 'Deleting Eastern Branch (ID: %, Members: %)', v_eastern_id, v_eastern_count;
    RAISE NOTICE 'Deleting Main Branch (ID: %, Members: %)', v_main_id, v_main_count;
    RAISE NOTICE 'Deleting Western Branch (ID: %, Members: %)', v_western_id, v_western_count;

    -- Delete the branches
    DELETE FROM family_branches
    WHERE branch_name_en IN ('Eastern Branch', 'Main Branch', 'Western Branch');

    RAISE NOTICE 'Successfully deleted 3 English branches';
END $$;

-- Verify deletion
SELECT
    COUNT(*) as total_branches,
    COUNT(*) FILTER (WHERE branch_name_en LIKE '%Branch') as english_branches,
    COUNT(*) FILTER (WHERE branch_name_en NOT LIKE '%Branch') as arabic_branches
FROM family_branches;

-- List remaining branches (should be only the 8 Arabic branches)
SELECT
    branch_code,
    branch_name,
    branch_name_en,
    (SELECT COUNT(*) FROM members WHERE family_branch_id = fb.id) as member_count,
    is_active
FROM family_branches fb
ORDER BY
    CASE branch_code
        WHEN 'RASH' THEN 1
        WHEN 'AID' THEN 2
        WHEN 'AQAB' THEN 3
        WHEN 'DUGH' THEN 4
        WHEN 'SHAM' THEN 5
        WHEN 'RSHD' THEN 6
        WHEN 'RSHD2' THEN 7
        WHEN 'SHUB' THEN 8
        ELSE 99
    END;

COMMIT;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- Total branches: 10 (before) → 8 (after - should be only 8)
-- English branches: 3 (before) → 0 (after)
-- Arabic branches: 8 (both before and after - these are preserved)
--
-- The 8 official Arabic branches that should remain:
-- 1. RASH  - رشود      (Rashoud)
-- 2. AID   - العيد     (Al-Eid)
-- 3. AQAB  - العقاب    (Al-Aqab)
-- 4. DUGH  - الدغيش    (Al-Dughaish)
-- 5. SHAM  - الشامخ    (Al-Shamikh)
-- 6. RSHD  - الرشيد    (Al-Rashid)
-- 7. RSHD2 - رشيد      (Rashid)
-- 8. SHUB  - الشبيعان  (Al-Shubaian)
-- ============================================================================
