-- ============================================================================
-- AL-SHUAIL DATABASE RESET SCRIPT
-- ============================================================================
-- This script cleans all existing data to prepare for fresh import
-- Run this in Supabase SQL Editor BEFORE running the Python import script
-- 
-- Date: October 2, 2025
-- ============================================================================

-- WARNING: This will delete ALL data from these tables!
-- Make sure you have a backup if needed!

BEGIN;

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- ============================================================================
-- DELETE DATA FROM ALL TABLES (keeps structure intact)
-- ============================================================================

-- Core member-related tables
DELETE FROM member_subscriptions;
DELETE FROM member_photos;
DELETE FROM member_documents;
DELETE FROM member_registration_tokens;

-- Family tree and relationships
DELETE FROM family_relationships;
DELETE FROM family_tree;
DELETE FROM family_tree_positions;
DELETE FROM family_assets;
DELETE FROM inheritance_plans;

-- Financial tables
DELETE FROM payments;
DELETE FROM subscriptions;
DELETE FROM financial_contributions;
DELETE FROM financial_transactions;
DELETE FROM contributions;
DELETE FROM expenses;
DELETE FROM expense_receipts;
DELETE FROM bank_statements;
DELETE FROM payment_notifications;

-- Events and activities
DELETE FROM event_attendees;
DELETE FROM event_registrations;
DELETE FROM occasion_registrations;
DELETE FROM occasion_rsvp;
DELETE FROM initiative_donations;
DELETE FROM initiative_volunteers;

-- Document management
DELETE FROM document_access_logs;
DELETE FROM document_processing_queue;
DELETE FROM documents_metadata;

-- Diya system
DELETE FROM diya_case_updates;
DELETE FROM diya_cases;

-- Competitions
DELETE FROM competition_participants;
DELETE FROM competitions;

-- System tables
DELETE FROM audit_logs;
DELETE FROM notifications;
DELETE FROM news_announcements;
DELETE FROM verification_codes;
DELETE FROM excel_import_batches;

-- Main tables (delete last due to foreign keys)
DELETE FROM profiles;
DELETE FROM temp_members;
DELETE FROM members;

-- DON'T delete these - keep configuration:
-- DELETE FROM family_branches;  -- Keep existing branches
-- DELETE FROM users;  -- Keep admin users
-- DELETE FROM settings;  -- Keep settings
-- DELETE FROM subscription_plans;  -- Keep plans

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if tables are empty
SELECT 'members' as table_name, COUNT(*) as row_count FROM members
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'financial_contributions', COUNT(*) FROM financial_contributions
UNION ALL
SELECT 'family_branches', COUNT(*) FROM family_branches
UNION ALL
SELECT 'users', COUNT(*) FROM users;

-- ============================================================================
-- EXPECTED RESULTS AFTER RESET:
-- ============================================================================
-- members:                  0 rows
-- payments:                 0 rows
-- subscriptions:            0 rows
-- financial_contributions:  0 rows
-- family_branches:          3-10 rows (existing branches kept)
-- users:                    1+ rows (admin accounts kept)
-- ============================================================================

-- You can now run the Python import script!
