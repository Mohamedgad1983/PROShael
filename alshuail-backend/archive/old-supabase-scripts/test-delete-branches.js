/**
 * Safe Test Script: Delete English Branches
 * This script will:
 * 1. Connect to Supabase
 * 2. Check current branches
 * 3. Verify which branches have 0 members
 * 4. Safely delete only the 3 English branches
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkBranches() {
  console.log('========================================');
  console.log('STEP 1: Checking all current branches');
  console.log('========================================\n');

  const { data: branches, error } = await supabase
    .from('family_branches')
    .select('*')
    .order('branch_name_en');

  if (error) {
    console.error('Error fetching branches:', error);
    return null;
  }

  console.log(`Total branches found: ${branches.length}\n`);

  for (const branch of branches) {
    // Count members for each branch
    const { count } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('family_branch_id', branch.id);

    console.log(`${branch.branch_code || 'N/A'} | ${branch.branch_name} | ${branch.branch_name_en}`);
    console.log(`   ID: ${branch.id}`);
    console.log(`   Members: ${count}`);
    console.log(`   Active: ${branch.is_active}`);
    console.log('');
  }

  return branches;
}

async function findEnglishBranches(branches) {
  console.log('========================================');
  console.log('STEP 2: Identifying English branches');
  console.log('========================================\n');

  const englishBranches = branches.filter(b =>
    b.branch_name === 'Eastern Branch' ||
    b.branch_name === 'Main Branch' ||
    b.branch_name === 'Western Branch'
  );

  console.log(`Found ${englishBranches.length} English branches:\n`);

  for (const branch of englishBranches) {
    const { count } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('family_branch_id', branch.id);

    console.log(`- ${branch.branch_name_en}`);
    console.log(`  ID: ${branch.id}`);
    console.log(`  Member Count: ${count}`);
    console.log(`  Safe to delete: ${count === 0 ? '✅ YES' : '❌ NO - HAS MEMBERS!'}`);
    console.log('');
  }

  return englishBranches;
}

async function deleteEnglishBranches(branches) {
  console.log('========================================');
  console.log('STEP 3: Deleting English branches');
  console.log('========================================\n');

  // Safety check: Verify all have 0 members
  for (const branch of branches) {
    const { count } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('family_branch_id', branch.id);

    if (count > 0) {
      console.error(`❌ SAFETY CHECK FAILED!`);
      console.error(`   Branch "${branch.branch_name_en}" has ${count} members!`);
      console.error(`   ABORTING deletion to prevent data loss.`);
      return false;
    }
  }

  console.log('✅ Safety check passed: All branches have 0 members\n');

  // Delete each branch
  for (const branch of branches) {
    console.log(`Deleting: ${branch.branch_name_en}...`);

    const { error } = await supabase
      .from('family_branches')
      .delete()
      .eq('id', branch.id);

    if (error) {
      console.error(`❌ Error deleting ${branch.branch_name_en}:`, error);
      return false;
    }

    console.log(`✅ Successfully deleted ${branch.branch_name_en}`);
  }

  console.log('\n✅ All English branches deleted successfully!\n');
  return true;
}

async function verifyDeletion() {
  console.log('========================================');
  console.log('STEP 4: Verifying final state');
  console.log('========================================\n');

  const { data: branches, error } = await supabase
    .from('family_branches')
    .select('*')
    .order('branch_code');

  if (error) {
    console.error('Error fetching branches:', error);
    return;
  }

  console.log(`Total branches remaining: ${branches.length}`);
  console.log(`Expected: 8 Arabic branches\n`);

  if (branches.length !== 8) {
    console.warn(`⚠️  WARNING: Expected 8 branches, found ${branches.length}`);
  } else {
    console.log('✅ Correct number of branches!');
  }

  console.log('\nRemaining branches:');
  for (const branch of branches) {
    const { count } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('family_branch_id', branch.id);

    console.log(`${branch.branch_code} | ${branch.branch_name} | ${count} members`);
  }

  // Count total members
  const { count: totalMembers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal members in database: ${totalMembers}`);
  console.log('Expected: 347');

  if (totalMembers === 347) {
    console.log('✅ All members preserved!');
  }
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════╗');
  console.log('║  DELETE ENGLISH BRANCHES - TEST SCRIPT ║');
  console.log('╔════════════════════════════════════════╗');
  console.log('\n');

  try {
    // Step 1: Check all branches
    const allBranches = await checkBranches();
    if (!allBranches) return;

    // Step 2: Find English branches
    const englishBranches = await findEnglishBranches(allBranches);

    if (englishBranches.length === 0) {
      console.log('✅ No English branches found. Nothing to delete.');
      return;
    }

    // Prompt for confirmation (simulated - will auto-proceed in 3 seconds)
    console.log('========================================');
    console.log('⚠️  CONFIRMATION REQUIRED');
    console.log('========================================\n');
    console.log(`About to delete ${englishBranches.length} branches:`);
    englishBranches.forEach(b => console.log(`  - ${b.branch_name_en}`));
    console.log('\nWaiting 3 seconds before proceeding...');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Delete
    const success = await deleteEnglishBranches(englishBranches);

    if (!success) {
      console.error('\n❌ Deletion failed or aborted.');
      return;
    }

    // Step 4: Verify
    await verifyDeletion();

    console.log('\n');
    console.log('╔════════════════════════════════════════╗');
    console.log('║         OPERATION COMPLETED!           ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run the script
main();
