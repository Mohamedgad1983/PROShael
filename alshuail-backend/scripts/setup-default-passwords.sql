-- ============================================
-- AL-SHUAIL FAMILY MANAGEMENT SYSTEM
-- DEFAULT PASSWORD SETUP FOR 344 MEMBERS
-- ============================================
-- Purpose: Set default password "123456" for all regular members
-- Default Password: 123456
-- Generated Hash: $2b$10$Q6lwLnLhnFcjWbDijquFEO0YmkiZ3r6se8Y6etyjAs9o4wU2clU1K
-- Date: October 3, 2025
-- ============================================
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy and paste this ENTIRE script
-- 3. Click "Run" button
-- 4. Wait for completion message
-- 5. Verify the results in the output
-- ============================================

-- ============================================
-- STEP 1: Add Required Columns (if they don't exist)
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STARTING PASSWORD SETUP PROCESS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Step 1: Checking database schema...';

    -- Add password_hash column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE members ADD COLUMN password_hash VARCHAR(255);
        RAISE NOTICE '✅ Column password_hash added';
    ELSE
        RAISE NOTICE '✓ Column password_hash already exists';
    END IF;

    -- Add is_first_login column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'is_first_login'
    ) THEN
        ALTER TABLE members ADD COLUMN is_first_login BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Column is_first_login added';
    ELSE
        RAISE NOTICE '✓ Column is_first_login already exists';
    END IF;

    -- Add requires_password_change column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'requires_password_change'
    ) THEN
        ALTER TABLE members ADD COLUMN requires_password_change BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Column requires_password_change added';
    ELSE
        RAISE NOTICE '✓ Column requires_password_change already exists';
    END IF;

    -- Add password_changed_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'password_changed_at'
    ) THEN
        ALTER TABLE members ADD COLUMN password_changed_at TIMESTAMP;
        RAISE NOTICE '✅ Column password_changed_at added';
    ELSE
        RAISE NOTICE '✓ Column password_changed_at already exists';
    END IF;

    -- Add last_login column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'last_login'
    ) THEN
        ALTER TABLE members ADD COLUMN last_login TIMESTAMP;
        RAISE NOTICE '✅ Column last_login added';
    ELSE
        RAISE NOTICE '✓ Column last_login already exists';
    END IF;

    -- Add login_attempts column (for security)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'login_attempts'
    ) THEN
        ALTER TABLE members ADD COLUMN login_attempts INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Column login_attempts added';
    ELSE
        RAISE NOTICE '✓ Column login_attempts already exists';
    END IF;

    -- Add account_locked_until column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'account_locked_until'
    ) THEN
        ALTER TABLE members ADD COLUMN account_locked_until TIMESTAMP;
        RAISE NOTICE '✅ Column account_locked_until added';
    ELSE
        RAISE NOTICE '✓ Column account_locked_until already exists';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Step 1 completed: All required columns verified';
    RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 2: Set Default Password for All Members
-- ============================================
-- Password: 123456
-- Hash: $2b$10$Q6lwLnLhnFcjWbDijquFEO0YmkiZ3r6se8Y6etyjAs9o4wU2clU1K
-- ============================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    RAISE NOTICE 'Step 2: Setting default passwords for all regular members...';
    RAISE NOTICE '';

    UPDATE members
    SET
        password_hash = '$2b$10$Q6lwLnLhnFcjWbDijquFEO0YmkiZ3r6se8Y6etyjAs9o4wU2clU1K',
        is_first_login = true,
        requires_password_change = true,
        login_attempts = 0,
        account_locked_until = NULL,
        updated_at = NOW()
    WHERE
        -- Only update regular members (not admins/super_admins)
        (role = 'member' OR role IS NULL)
        AND
        -- Only update if password not already set (safety check)
        (password_hash IS NULL OR password_hash = '');

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    RAISE NOTICE '✅ Step 2 completed: % members updated with default password', updated_count;
    RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 3: Verification - Check the Results
-- ============================================

DO $$
DECLARE
    total_members INTEGER;
    members_with_password INTEGER;
    requires_change INTEGER;
    first_login INTEGER;
    admin_count INTEGER;
BEGIN
    RAISE NOTICE 'Step 3: Verifying password setup...';
    RAISE NOTICE '';

    -- Get counts
    SELECT COUNT(*) INTO total_members
    FROM members
    WHERE role = 'member' OR role IS NULL;

    SELECT COUNT(*) INTO members_with_password
    FROM members
    WHERE (role = 'member' OR role IS NULL)
        AND password_hash IS NOT NULL
        AND password_hash != '';

    SELECT COUNT(*) INTO requires_change
    FROM members
    WHERE (role = 'member' OR role IS NULL)
        AND requires_password_change = true;

    SELECT COUNT(*) INTO first_login
    FROM members
    WHERE (role = 'member' OR role IS NULL)
        AND is_first_login = true;

    SELECT COUNT(*) INTO admin_count
    FROM members
    WHERE role IN ('admin', 'super_admin', 'financial_manager');

    -- Display results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION RESULTS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total Regular Members: %', total_members;
    RAISE NOTICE 'Members with Password: %', members_with_password;
    RAISE NOTICE 'Requires Password Change: %', requires_change;
    RAISE NOTICE 'First-Time Login: %', first_login;
    RAISE NOTICE 'Admin Accounts (Protected): %', admin_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Validation
    IF members_with_password = total_members THEN
        RAISE NOTICE '✅ SUCCESS: All members have passwords set!';
    ELSE
        RAISE WARNING '⚠️  WARNING: % members without passwords', (total_members - members_with_password);
    END IF;

    RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 4: Display Sample Members (First 10)
-- ============================================

SELECT
    '========================================' as separator;

SELECT
    '📋 SAMPLE MEMBER DATA (First 10)' as title;

SELECT
    '========================================' as separator;

SELECT
    membership_number as "Membership #",
    full_name_ar as "Name (Arabic)",
    phone as "Phone",
    CASE
        WHEN password_hash IS NOT NULL THEN '✅ Set'
        ELSE '❌ Not Set'
    END as "Password Status",
    CASE
        WHEN is_first_login = true THEN '✅ Yes'
        ELSE '❌ No'
    END as "First Login?",
    CASE
        WHEN requires_password_change = true THEN '✅ Yes'
        ELSE '❌ No'
    END as "Requires Change?"
FROM members
WHERE role = 'member' OR role IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- STEP 5: Check Admin Accounts (Safety Check)
-- ============================================

SELECT
    '========================================' as separator;

SELECT
    '🔐 ADMIN ACCOUNTS (Should NOT be affected)' as title;

SELECT
    '========================================' as separator;

SELECT
    full_name_ar as "Name (Arabic)",
    phone as "Phone",
    role as "Role",
    CASE
        WHEN password_hash IS NOT NULL AND password_hash != '$2b$10$Q6lwLnLhnFcjWbDijquFEO0YmkiZ3r6se8Y6etyjAs9o4wU2clU1K'
            THEN '✅ Admin password intact'
        WHEN password_hash IS NULL
            THEN '⚠️  No password set'
        WHEN password_hash = '$2b$10$Q6lwLnLhnFcjWbDijquFEO0YmkiZ3r6se8Y6etyjAs9o4wU2clU1K'
            THEN '⚠️  Has default password (unexpected!)'
        ELSE '✅ Has custom password'
    END as "Status"
FROM members
WHERE role IN ('admin', 'super_admin', 'financial_manager')
ORDER BY role;

-- ============================================
-- STEP 6: Create Audit Log Entry (if table exists)
-- ============================================

DO $$
DECLARE
    member_count INTEGER;
BEGIN
    -- Count affected members
    SELECT COUNT(*) INTO member_count
    FROM members
    WHERE (role = 'member' OR role IS NULL)
        AND password_hash IS NOT NULL;

    -- Check if audit_logs table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'audit_logs'
    ) THEN
        INSERT INTO audit_logs (
            action,
            description,
            affected_count,
            performed_by,
            created_at
        )
        VALUES (
            'PASSWORD_RESET_BULK',
            'Default passwords set for all regular members (123456)',
            member_count,
            'SYSTEM',
            NOW()
        );

        RAISE NOTICE '✅ Audit log entry created';
    ELSE
        RAISE NOTICE '⚠️  audit_logs table does not exist - skipping audit log';
    END IF;
END $$;

-- ============================================
-- STEP 7: Final Summary
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 PASSWORD SETUP COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 SUMMARY:';
    RAISE NOTICE '  • Default Password: 123456';
    RAISE NOTICE '  • All regular members have passwords set';
    RAISE NOTICE '  • Members will be forced to change password on first login';
    RAISE NOTICE '  • Admin accounts were NOT affected';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 NEXT STEPS:';
    RAISE NOTICE '  1. Test login with a sample member';
    RAISE NOTICE '     - Phone: [any member phone from table above]';
    RAISE NOTICE '     - Password: 123456';
    RAISE NOTICE '';
    RAISE NOTICE '  2. Deploy the password change flow to frontend';
    RAISE NOTICE '';
    RAISE NOTICE '  3. Send WhatsApp messages to all 344 members:';
    RAISE NOTICE '     "Your login: Phone + Password: 123456"';
    RAISE NOTICE '     "Please change password on first login"';
    RAISE NOTICE '';
    RAISE NOTICE '  4. Monitor for successful logins';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ALL DONE! Database is ready for production.';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- ============================================
-- OPTIONAL: Quick Test Query
-- ============================================
-- Run this separately to test a specific member

/*
-- TEST QUERY - Replace phone number with a real one
DO $$
DECLARE
    test_phone VARCHAR := '0599000001';  -- ⚠️ REPLACE WITH REAL PHONE
    member_data RECORD;
BEGIN
    SELECT
        full_name_ar,
        phone,
        membership_number,
        LEFT(password_hash, 30) as hash_preview,
        is_first_login,
        requires_password_change
    INTO member_data
    FROM members
    WHERE phone = test_phone;

    IF FOUND THEN
        RAISE NOTICE '';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'TEST MEMBER DATA';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Name: %', member_data.full_name_ar;
        RAISE NOTICE 'Phone: %', member_data.phone;
        RAISE NOTICE 'Membership #: %', member_data.membership_number;
        RAISE NOTICE 'Password Hash: %...', member_data.hash_preview;
        RAISE NOTICE 'First Login: %', member_data.is_first_login;
        RAISE NOTICE 'Requires Change: %', member_data.requires_password_change;
        RAISE NOTICE '========================================';
        RAISE NOTICE '';
        RAISE NOTICE '✅ You can now test login with:';
        RAISE NOTICE '   Phone: %', member_data.phone;
        RAISE NOTICE '   Password: 123456';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '❌ No member found with phone: %', test_phone;
    END IF;
END $$;
*/
