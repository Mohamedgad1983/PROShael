#!/usr/bin/env node
// API Testing Script for File 04 & File 05 Implementation
// Tests Admin APIs, Approval APIs, and Family Tree APIs
// Usage: node scripts/test-new-apis.js

import axios from 'axios';
import { config } from '../src/config/env.js';

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Helper function to log colored output
function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// Test runner function
async function runTest(name, testFn, requiresAuth = true) {
  try {
    log(`\n🧪 Testing: ${name}`, 'blue');

    if (requiresAuth && !process.env.TEST_AUTH_TOKEN) {
      log(`⏭️  SKIPPED: ${name} (no auth token)`, 'yellow');
      results.skipped++;
      results.tests.push({ name, status: 'skipped', reason: 'No auth token' });
      return;
    }

    await testFn();
    log(`✅ PASSED: ${name}`, 'green');
    results.passed++;
    results.tests.push({ name, status: 'passed' });
  } catch (error) {
    log(`❌ FAILED: ${name}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

// Get auth headers
function getAuthHeaders() {
  const token = process.env.TEST_AUTH_TOKEN;
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// ==========================================
// FILE 04: ADMIN APIs TESTS
// ==========================================

async function testAdminGetSubdivisions() {
  const response = await axios.get(`${BASE_URL}/admin/subdivisions`, {
    headers: getAuthHeaders()
  });

  if (!response.data.success) throw new Error('Response not successful');
  if (!Array.isArray(response.data.data)) throw new Error('Expected array of subdivisions');

  log(`   Found ${response.data.count} subdivisions`);
}

async function testAdminGetDashboardStats() {
  const response = await axios.get(`${BASE_URL}/admin/dashboard/stats`, {
    headers: getAuthHeaders()
  });

  if (!response.data.success) throw new Error('Response not successful');
  if (!response.data.data.totalMembers !== undefined) throw new Error('Missing totalMembers');

  log(`   Stats: ${JSON.stringify(response.data.data)}`);
}

async function testAdminAddMember() {
  const newMember = {
    full_name_ar: 'اختبار عضو جديد',
    full_name_en: 'Test New Member',
    phone: '+966500000001',
    family_branch_id: '00000000-0000-0000-0000-000000000001' // Use valid UUID
  };

  const response = await axios.post(`${BASE_URL}/admin/members`, newMember, {
    headers: getAuthHeaders()
  });

  if (!response.data.success) throw new Error('Response not successful');
  if (!response.data.data.member_id) throw new Error('Missing member_id');

  log(`   Created member: ${response.data.data.member_id}`);
  return response.data.data.id;
}

async function testAdminAssignSubdivision(memberId) {
  const response = await axios.put(
    `${BASE_URL}/admin/members/${memberId}/subdivision`,
    { family_branch_id: '00000000-0000-0000-0000-000000000001' },
    { headers: getAuthHeaders() }
  );

  if (!response.data.success) throw new Error('Response not successful');
  log(`   Assigned subdivision to member ${memberId}`);
}

// ==========================================
// FILE 04: APPROVAL APIs TESTS
// ==========================================

async function testApprovalGetPending() {
  const response = await axios.get(`${BASE_URL}/approvals/pending`, {
    headers: getAuthHeaders()
  });

  if (!response.data.success) throw new Error('Response not successful');
  if (!Array.isArray(response.data.data)) throw new Error('Expected array of pending members');

  log(`   Found ${response.data.count} pending approvals`);
  return response.data.data.length > 0 ? response.data.data[0].id : null;
}

async function testApprovalGetMember(memberId) {
  const response = await axios.get(`${BASE_URL}/approvals/${memberId}`, {
    headers: getAuthHeaders()
  });

  if (!response.data.success) throw new Error('Response not successful');
  if (!response.data.data) throw new Error('Expected member data');

  log(`   Retrieved member: ${response.data.data.full_name_ar}`);
}

async function testApprovalApproveMember(memberId) {
  const response = await axios.post(
    `${BASE_URL}/approvals/${memberId}/approve`,
    { notes: 'Test approval' },
    { headers: getAuthHeaders() }
  );

  if (!response.data.success) throw new Error('Response not successful');
  log(`   Approved member ${memberId}`);
}

async function testApprovalRejectMember(memberId) {
  const response = await axios.post(
    `${BASE_URL}/approvals/${memberId}/reject`,
    { reason: 'Test rejection' },
    { headers: getAuthHeaders() }
  );

  if (!response.data.success) throw new Error('Response not successful');
  log(`   Rejected member ${memberId}`);
}

async function testApprovalGetStats() {
  const response = await axios.get(`${BASE_URL}/approvals/stats`, {
    headers: getAuthHeaders()
  });

  if (!response.data.success) throw new Error('Response not successful');
  log(`   Approval stats: ${JSON.stringify(response.data.data)}`);
}

// ==========================================
// FILE 05: FAMILY TREE APIs TESTS
// ==========================================

async function testFamilyTreeGetFull() {
  const response = await axios.get(`${BASE_URL}/tree`, {
    headers: getAuthHeaders()
  });

  if (!response.data.success) throw new Error('Response not successful');
  if (!response.data.data.tree) throw new Error('Expected tree data');

  log(`   Tree has ${response.data.data.total_members} members`);
  log(`   Generations: ${response.data.data.generations.length}`);
}

async function testFamilyTreeGetFullWithFilter() {
  const subdivisionId = '00000000-0000-0000-0000-000000000001';
  const response = await axios.get(`${BASE_URL}/tree?subdivision_id=${subdivisionId}`, {
    headers: getAuthHeaders()
  });

  if (!response.data.success) throw new Error('Response not successful');
  log(`   Filtered tree has ${response.data.data.total_members} members`);
}

async function testFamilyTreeSearch() {
  const response = await axios.get(`${BASE_URL}/tree/search?query=الشعيل`, {
    headers: getAuthHeaders()
  });

  if (!response.data.success) throw new Error('Response not successful');
  log(`   Found ${response.data.count} members matching search`);
}

async function testFamilyTreeGetStats() {
  const response = await axios.get(`${BASE_URL}/tree/stats`, {
    headers: getAuthHeaders()
  });

  if (!response.data.success) throw new Error('Response not successful');
  log(`   Total members: ${response.data.data.total_members}`);
  log(`   Generations: ${response.data.data.generations.length}`);
}

async function testFamilyTreeGetRelationships(memberId) {
  const response = await axios.get(`${BASE_URL}/tree/${memberId}/relationships`, {
    headers: getAuthHeaders()
  });

  if (!response.data.success) throw new Error('Response not successful');

  const relationships = response.data.data;
  log(`   Parents: ${relationships.parents.length}`);
  log(`   Children: ${relationships.children.length}`);
  log(`   Siblings: ${relationships.siblings.length}`);
  log(`   Ancestors: ${relationships.ancestors.length}`);
  log(`   Descendants: ${relationships.descendants.length}`);
}

// ==========================================
// MAIN TEST SUITE
// ==========================================

async function runAllTests() {
  log('\n🚀 Starting API Testing Suite', 'blue');
  log(`📍 Base URL: ${BASE_URL}`, 'blue');
  log(`🔑 Auth Token: ${process.env.TEST_AUTH_TOKEN ? 'Provided' : 'Missing'}`, 'yellow');

  let createdMemberId = null;
  let pendingMemberId = null;

  // File 04: Admin APIs
  log('\n═══════════════════════════════════════', 'blue');
  log('FILE 04: ADMIN APIs', 'blue');
  log('═══════════════════════════════════════', 'blue');

  await runTest('Admin - Get Subdivisions', testAdminGetSubdivisions);
  await runTest('Admin - Get Dashboard Stats', testAdminGetDashboardStats);
  await runTest('Admin - Add Member', async () => {
    createdMemberId = await testAdminAddMember();
  });

  if (createdMemberId) {
    await runTest('Admin - Assign Subdivision', () => testAdminAssignSubdivision(createdMemberId));
  }

  // File 04: Approval APIs
  log('\n═══════════════════════════════════════', 'blue');
  log('FILE 04: APPROVAL APIs', 'blue');
  log('═══════════════════════════════════════', 'blue');

  await runTest('Approval - Get Pending', async () => {
    pendingMemberId = await testApprovalGetPending();
  });

  if (pendingMemberId) {
    await runTest('Approval - Get Member Details', () => testApprovalGetMember(pendingMemberId));
    // Uncomment to test approval (will modify data)
    // await runTest('Approval - Approve Member', () => testApprovalApproveMember(pendingMemberId));
  }

  await runTest('Approval - Get Stats', testApprovalGetStats);

  // File 05: Family Tree APIs
  log('\n═══════════════════════════════════════', 'blue');
  log('FILE 05: FAMILY TREE APIs', 'blue');
  log('═══════════════════════════════════════', 'blue');

  await runTest('Family Tree - Get Full Tree', testFamilyTreeGetFull);
  await runTest('Family Tree - Get Full Tree (with filter)', testFamilyTreeGetFullWithFilter);
  await runTest('Family Tree - Search Members', testFamilyTreeSearch);
  await runTest('Family Tree - Get Stats', testFamilyTreeGetStats);

  if (pendingMemberId) {
    await runTest('Family Tree - Get Member Relationships', () => testFamilyTreeGetRelationships(pendingMemberId));
  }

  // Summary
  log('\n═══════════════════════════════════════', 'blue');
  log('TEST SUMMARY', 'blue');
  log('═══════════════════════════════════════', 'blue');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`⏭️  Skipped: ${results.skipped}`, 'yellow');
  log(`📊 Total: ${results.passed + results.failed + results.skipped}`, 'blue');

  if (results.failed > 0) {
    log('\n❌ SOME TESTS FAILED', 'red');
    process.exit(1);
  } else {
    log('\n✅ ALL TESTS PASSED', 'green');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(error => {
  log(`\n💥 Test suite crashed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
