/**
 * Database Reset Script - Node.js Version
 * Cleans all data tables before import
 */

import { supabaseAdmin, TABLES } from '../alshuail-backend/src/config/supabase.js';

const resetTables = [
  // Core member-related tables
  'member_subscriptions',
  'member_photos',
  'member_documents',
  'member_registration_tokens',

  // Family tree and relationships
  'family_relationships',
  'family_tree',
  'family_tree_positions',
  'family_assets',
  'inheritance_plans',

  // Financial tables
  'payments',
  'subscriptions',
  'financial_contributions',
  'financial_transactions',
  'contributions',
  'expenses',
  'expense_receipts',
  'bank_statements',
  'payment_notifications',

  // Events and activities
  'event_attendees',
  'event_registrations',
  'occasion_registrations',
  'occasion_rsvp',
  'initiative_donations',
  'initiative_volunteers',

  // Document management
  'document_access_logs',
  'document_processing_queue',
  'documents_metadata',

  // Diya system
  'diya_case_updates',
  'diya_cases',

  // Competitions
  'competition_participants',
  'competitions',

  // System tables
  'audit_logs',
  'notifications',
  'news_announcements',
  'verification_codes',
  'excel_import_batches',

  // Main tables (delete last due to foreign keys)
  'profiles',
  'temp_members',
  'members'
];

async function resetDatabase() {
  console.log('\n============================================================================');
  console.log('AL-SHUAIL DATABASE RESET');
  console.log('============================================================================\n');

  console.log('⚠️  WARNING: This will delete all data from the database!');
  console.log('✓ Keeping: family_branches, users, settings, subscription_plans\n');

  let totalDeleted = 0;

  for (const table of resetTables) {
    try {
      const { error, count } = await supabaseAdmin
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) {
        // Table might not exist or already empty
        console.log(`⚠️  ${table}: ${error.message}`);
      } else {
        console.log(`✓ ${table}: cleared`);
        totalDeleted++;
      }
    } catch (err) {
      console.log(`✗ ${table}: ${err.message}`);
    }
  }

  console.log('\n============================================================================');
  console.log(`RESET COMPLETE: ${totalDeleted}/${resetTables.length} tables cleared`);
  console.log('============================================================================\n');

  // Verify key tables
  console.log('Verifying key tables:');
  const verifyTables = ['members', 'payments', 'subscriptions', 'family_branches', 'users'];

  for (const table of verifyTables) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('id', { count: 'exact', head: true });

    if (!error) {
      const count = data?.length || 0;
      console.log(`  ${table}: ${count} rows`);
    }
  }

  console.log('\n✓ Database is ready for fresh import!\n');
}

resetDatabase().catch(console.error);
