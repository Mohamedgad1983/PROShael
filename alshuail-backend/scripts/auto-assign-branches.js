/**
 * Auto-assign family_branch_id based on tribal_section values
 *
 * This script matches members' tribal_section text values with
 * family_branches table IDs and updates the family_branch_id column.
 *
 * Run: node scripts/auto-assign-branches.js
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { query, pool } = await import('../src/services/database.js');

/**
 * Mapping of tribal_section text values to family_branches names
 * Handles variations in spelling and formatting
 */
const TRIBAL_SECTION_MAPPING = {
  'رشود': 'رشود',
  'العيد': 'العيد',
  'عقاب': 'العقاب',
  'العقاب': 'العقاب',
  'الدغيش': 'الدغيش',
  'الشامخ': 'الشامخ',
  'الرشيد': 'الرشيد',
  'رشيد': 'رشيد',
  'الشبيعان': 'الشبيعان',
  'المسعود': 'المسعود',
  // Add common variations
  'رشــود': 'رشود',
  'الـعيد': 'العيد',
  'عـقاب': 'العقاب'
};

/**
 * Get all family branches with their IDs
 */
async function getFamilyBranches() {
  console.log('\n📋 Fetching family branches...');

  const { rows: branches } = await query(
    'SELECT id, branch_name, branch_code FROM family_branches'
  );

  console.log(`✅ Found ${branches.length} family branches:`);
  branches.forEach(branch => {
    console.log(`   - ${branch.branch_name} (${branch.branch_code})`);
  });

  return branches;
}

/**
 * Get unassigned members who have tribal_section values
 */
async function getUnassignedMembersWithTribalSection() {
  console.log('\n🔍 Fetching unassigned members with tribal_section...');

  const { rows: members } = await query(
    `SELECT id, full_name, phone, tribal_section, family_branch_id
     FROM members
     WHERE family_branch_id IS NULL
       AND tribal_section IS NOT NULL
       AND tribal_section <> ''`
  );

  console.log(`✅ Found ${members.length} unassigned members with tribal_section`);

  return members;
}

/**
 * Create a map of branch_name to branch_id
 */
function createBranchMap(branches) {
  const branchMap = {};
  branches.forEach(branch => {
    branchMap[branch.branch_name.trim()] = branch.id;
    // Also map by code if available
    if (branch.branch_code) {
      branchMap[branch.branch_code.trim()] = branch.id;
    }
  });
  return branchMap;
}

/**
 * Match tribal_section to family_branch_id
 */
function matchTribalSectionToBranch(tribalSection, branchMap) {
  if (!tribalSection) return null;

  const trimmedSection = tribalSection.trim();

  // First try direct match
  if (branchMap[trimmedSection]) {
    return branchMap[trimmedSection];
  }

  // Try mapped variation
  const mappedName = TRIBAL_SECTION_MAPPING[trimmedSection];
  if (mappedName && branchMap[mappedName]) {
    return branchMap[mappedName];
  }

  // Try case-insensitive match
  const normalizedSection = trimmedSection.toLowerCase();
  for (const [branchName, branchId] of Object.entries(branchMap)) {
    if (branchName.toLowerCase() === normalizedSection) {
      return branchId;
    }
  }

  return null;
}

/**
 * Group members by their matched branch_id
 */
function groupMembersByBranch(members, branchMap) {
  const assignments = {};
  const unmatchedMembers = [];

  members.forEach(member => {
    const branchId = matchTribalSectionToBranch(member.tribal_section, branchMap);

    if (branchId) {
      if (!assignments[branchId]) {
        assignments[branchId] = [];
      }
      assignments[branchId].push(member);
    } else {
      unmatchedMembers.push(member);
    }
  });

  return { assignments, unmatchedMembers };
}

/**
 * Update members' family_branch_id
 */
async function updateMemberBranches(assignments, dryRun = false) {
  console.log('\n🔄 Updating member assignments...');

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No actual updates will be made\n');
  }

  let totalUpdated = 0;
  let totalErrors = 0;

  for (const [branchId, members] of Object.entries(assignments)) {
    console.log(`\n📌 Branch ID: ${branchId}`);
    console.log(`   Members to assign: ${members.length}`);

    if (dryRun) {
      console.log('   Sample members:');
      members.slice(0, 3).forEach(m => {
        console.log(`   - ${m.full_name} (${m.tribal_section})`);
      });
      totalUpdated += members.length;
      continue;
    }

    // Update in batches to avoid timeout
    const batchSize = 50;
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);
      const memberIds = batch.map(m => m.id);

      try {
        const { rows: data } = await query(
          'UPDATE members SET family_branch_id = $1, updated_at = $2 WHERE id = ANY($3) RETURNING id',
          [branchId, new Date().toISOString(), memberIds]
        );

        const updated = data?.length || 0;
        totalUpdated += updated;
        console.log(`   ✅ Updated ${updated} members (batch ${i / batchSize + 1})`);
      } catch (error) {
        console.error(`   ❌ Error updating batch ${i / batchSize + 1}:`, error.message);
        totalErrors += batch.length;
      }
    }
  }

  return { totalUpdated, totalErrors };
}

/**
 * Main execution
 */
async function main() {
  console.log('========================================');
  console.log('🚀 Auto-Assign Family Branches Script');
  console.log('========================================');

  try {
    // Step 1: Get family branches
    const branches = await getFamilyBranches();
    const branchMap = createBranchMap(branches);

    // Step 2: Get unassigned members with tribal_section
    const members = await getUnassignedMembersWithTribalSection();

    if (members.length === 0) {
      console.log('\n✨ No unassigned members with tribal_section found!');
      console.log('All members are already assigned or have no tribal_section value.');
      return;
    }

    // Step 3: Match members to branches
    const { assignments, unmatchedMembers } = groupMembersByBranch(members, branchMap);

    // Step 4: Show summary
    console.log('\n📊 ASSIGNMENT SUMMARY');
    console.log('=====================================');

    let totalMatched = 0;
    for (const [branchId, memberList] of Object.entries(assignments)) {
      const branch = branches.find(b => b.id === branchId);
      console.log(`${branch?.branch_name || branchId}: ${memberList.length} members`);
      totalMatched += memberList.length;
    }

    console.log(`\n✅ Matched: ${totalMatched} members`);
    console.log(`❌ Unmatched: ${unmatchedMembers.length} members`);

    if (unmatchedMembers.length > 0) {
      console.log('\n⚠️  Unmatched tribal_section values:');
      const uniqueUnmatched = [...new Set(unmatchedMembers.map(m => m.tribal_section))];
      uniqueUnmatched.forEach(section => {
        const count = unmatchedMembers.filter(m => m.tribal_section === section).length;
        console.log(`   - "${section}": ${count} members`);
      });
    }

    // Step 5: Ask for confirmation
    if (totalMatched === 0) {
      console.log('\n⚠️  No members to assign. Exiting...');
      return;
    }

    console.log('\n=====================================');
    console.log('🔍 DRY RUN - Showing what would be updated:');
    console.log('=====================================');

    await updateMemberBranches(assignments, true);

    console.log('\n=====================================');
    console.log('⚡ READY TO UPDATE');
    console.log('=====================================');
    console.log(`This will update ${totalMatched} members.`);
    console.log('\nTo proceed with actual updates, set DRY_RUN=false');
    console.log('and run: node scripts/auto-assign-branches.js --execute\n');

    // Check for --execute flag
    const executeMode = process.argv.includes('--execute');

    if (executeMode) {
      console.log('🚀 EXECUTING UPDATES...\n');
      const { totalUpdated, totalErrors } = await updateMemberBranches(assignments, false);

      console.log('\n=====================================');
      console.log('✅ UPDATE COMPLETE');
      console.log('=====================================');
      console.log(`Successfully updated: ${totalUpdated} members`);
      console.log(`Errors: ${totalErrors}`);

      // Verify results
      const { rows: remainingUnassigned } = await query(
        `SELECT id
         FROM members
         WHERE family_branch_id IS NULL
           AND membership_status = $1`,
        ['active']
      );

      console.log(`\n📊 Remaining unassigned members: ${remainingUnassigned?.length || 0}`);
    } else {
      console.log('ℹ️  This was a DRY RUN. No changes were made.');
      console.log('To execute updates, run: node scripts/auto-assign-branches.js --execute');
    }

  } catch (error) {
    console.error('\n❌ SCRIPT FAILED:', error.message);
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

// Run the script
main();
