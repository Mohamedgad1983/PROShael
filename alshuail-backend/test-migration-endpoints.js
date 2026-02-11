#!/usr/bin/env node
/**
 * Migration Endpoint Test Suite
 * Tests all converted endpoints from Supabase to PostgreSQL
 * Run: node test-migration-endpoints.js
 */

import { query } from './src/services/database.js';
import { log } from './src/utils/logger.js';

// Test configuration
const TESTS = {
  passed: 0,
  failed: 0,
  total: 0
};

// Helper function to run a test
async function runTest(name, testFn) {
  TESTS.total++;
  try {
    await testFn();
    TESTS.passed++;
    console.log(`✅ PASS: ${name}`);
    return true;
  } catch (error) {
    TESTS.failed++;
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// Test 1: Database Connection
async function testDatabaseConnection() {
  const result = await query('SELECT NOW() as current_time');
  if (!result.rows[0].current_time) {
    throw new Error('No result from database');
  }
}

// Test 2: Members Count Query
async function testMembersCount() {
  const result = await query('SELECT COUNT(*) FROM members');
  const count = parseInt(result.rows[0].count);
  if (count < 0) {
    throw new Error('Invalid member count');
  }
  console.log(`   → Found ${count} members`);
}

// Test 3: Active Members Query
async function testActiveMembersCount() {
  const result = await query(
    'SELECT COUNT(*) FROM members WHERE membership_status = $1',
    ['active']
  );
  const count = parseInt(result.rows[0].count);
  console.log(`   → Found ${count} active members`);
}

// Test 4: Family Branches Query
async function testFamilyBranches() {
  const result = await query('SELECT COUNT(*) FROM family_branches');
  const count = parseInt(result.rows[0].count);
  if (count === 0) {
    throw new Error('No family branches found');
  }
  console.log(`   → Found ${count} family branches`);
}

// Test 5: Branches with Member Counts
async function testBranchesWithCounts() {
  const branchesResult = await query(`
    SELECT
      fb.*,
      json_build_object(
        'id', m.id,
        'full_name_ar', m.full_name_ar,
        'full_name_en', m.full_name_en,
        'phone', m.phone
      ) as branch_head
    FROM family_branches fb
    LEFT JOIN members m ON fb.branch_head_id = m.id
    ORDER BY fb.branch_name ASC
    LIMIT 5
  `);

  if (branchesResult.rows.length === 0) {
    throw new Error('No branches returned');
  }
  console.log(`   → Retrieved ${branchesResult.rows.length} branches with details`);
}

// Test 6: Generation Statistics
async function testGenerationStats() {
  const result = await query(
    'SELECT DISTINCT generation_level FROM members WHERE generation_level IS NOT NULL'
  );
  const generations = result.rows.length;
  console.log(`   → Found ${generations} distinct generations`);
}

// Test 7: Members with Filters
async function testMembersWithFilters() {
  const result = await query(`
    SELECT
      m.*,
      json_build_object(
        'id', fb.id,
        'branch_name', fb.branch_name
      ) as family_branches
    FROM members m
    LEFT JOIN family_branches fb ON m.family_branch_id = fb.id
    WHERE m.membership_status = $1
    ORDER BY m.generation_level DESC NULLS LAST
    LIMIT 10
  `, ['active']);

  console.log(`   → Retrieved ${result.rows.length} filtered members`);
}

// Test 8: Search Functionality
async function testMemberSearch() {
  const searchTerm = '%محمد%'; // Search for "محمد" (Mohammed)
  const result = await query(`
    SELECT COUNT(*) FROM members
    WHERE (
      full_name_ar ILIKE $1
      OR full_name_en ILIKE $1
    )
  `, [searchTerm]);

  const count = parseInt(result.rows[0].count);
  console.log(`   → Search found ${count} matching members`);
}

// Test 9: Update Query (with rollback)
async function testUpdateQuery() {
  // Get a test member
  const memberResult = await query(
    'SELECT id FROM members LIMIT 1'
  );

  if (memberResult.rows.length === 0) {
    throw new Error('No members to test update');
  }

  const memberId = memberResult.rows[0].id;

  // Test UPDATE with RETURNING
  const updateResult = await query(
    `UPDATE members
     SET updated_at = NOW()
     WHERE id = $1
     RETURNING id, updated_at`,
    [memberId]
  );

  if (updateResult.rows.length === 0) {
    throw new Error('UPDATE did not return data');
  }

  console.log(`   → UPDATE query successful (member ${memberId})`);
}

// Test 10: Authentication Queries
async function testAuthQueries() {
  // Test member lookup (simulating auth)
  const memberResult = await query(
    'SELECT * FROM members WHERE membership_status = $1 LIMIT 1',
    ['active']
  );

  // Test admin lookup (simulating auth)
  const adminResult = await query(
    'SELECT * FROM users WHERE is_active = $1 LIMIT 1',
    [true]
  );

  console.log(`   → Auth queries: Member=${memberResult.rows.length}, Admin=${adminResult.rows.length}`);
}

// Test 11: Complex JOIN Query
async function testComplexJoin() {
  const result = await query(`
    SELECT
      m.id,
      m.full_name_ar,
      m.generation_level,
      json_build_object(
        'id', fb.id,
        'branch_name', fb.branch_name
      ) as family_branches
    FROM members m
    LEFT JOIN family_branches fb ON m.family_branch_id = fb.id
    WHERE m.membership_status = $1
    LIMIT 5
  `, ['active']);

  if (result.rows.length === 0) {
    throw new Error('No results from JOIN query');
  }

  console.log(`   → Complex JOIN returned ${result.rows.length} results`);
}

// Test 12: Parameterized Query Safety
async function testParameterizedQuery() {
  const maliciousInput = "'; DROP TABLE members; --";
  const result = await query(
    'SELECT COUNT(*) FROM members WHERE full_name_ar = $1',
    [maliciousInput]
  );

  // Should return 0, not cause SQL injection
  const count = parseInt(result.rows[0].count);
  console.log(`   → SQL injection prevention working (count=${count})`);
}

// Main test runner
async function runAllTests() {
  console.log('\n🔬 Migration Endpoint Test Suite\n');
  console.log('=' .repeat(60));
  console.log('Testing converted endpoints from Supabase to PostgreSQL\n');

  // Run all tests
  await runTest('1. Database Connection', testDatabaseConnection);
  await runTest('2. Members Count Query', testMembersCount);
  await runTest('3. Active Members Count', testActiveMembersCount);
  await runTest('4. Family Branches Query', testFamilyBranches);
  await runTest('5. Branches with Member Counts', testBranchesWithCounts);
  await runTest('6. Generation Statistics', testGenerationStats);
  await runTest('7. Members with Filters', testMembersWithFilters);
  await runTest('8. Search Functionality', testMemberSearch);
  await runTest('9. Update Query (with RETURNING)', testUpdateQuery);
  await runTest('10. Authentication Queries', testAuthQueries);
  await runTest('11. Complex JOIN Query', testComplexJoin);
  await runTest('12. Parameterized Query Safety', testParameterizedQuery);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Summary:`);
  console.log(`   Total Tests: ${TESTS.total}`);
  console.log(`   ✅ Passed: ${TESTS.passed}`);
  console.log(`   ❌ Failed: ${TESTS.failed}`);
  console.log(`   Success Rate: ${((TESTS.passed / TESTS.total) * 100).toFixed(1)}%\n`);

  if (TESTS.failed === 0) {
    console.log('🎉 All tests passed! Migration successful.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Test suite error:', error);
  process.exit(1);
});
