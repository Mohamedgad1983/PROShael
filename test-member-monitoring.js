#!/usr/bin/env node
/**
 * Comprehensive Test Suite for Member Monitoring Dashboard
 * Tests all backend endpoints and functionality
 */

const API_BASE = 'https://proshael.onrender.com';
let token = '';
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Test utility functions
function logTest(name, passed, details = '') {
  const status = passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
  console.log(`${status} ${name} ${details ? '- ' + details : ''}`);
  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

async function makeRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers
      }
    });

    const data = await response.json();
    return { response, data };
  } catch (error) {
    return { error: error.message };
  }
}

// Test suites
async function testAuthentication() {
  console.log(`\n${colors.blue}=== AUTHENTICATION TESTS ===${colors.reset}`);

  // Test 1: Login with valid credentials
  const { response, data } = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'test123'
    })
  });

  if (response && response.status === 200 && data.token) {
    token = data.token;
    logTest('Authentication - Valid Login', true, `Token received, User: ${data.user?.email}`);
  } else {
    logTest('Authentication - Valid Login', false, 'Failed to get token');
  }

  // Test 2: Login with invalid credentials
  const { response: failResponse } = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'invalid@example.com',
      password: 'wrong'
    })
  });

  logTest('Authentication - Invalid Login Rejection', failResponse?.status === 401 || failResponse?.status === 400);
}

async function testMemberEndpoints() {
  console.log(`\n${colors.blue}=== MEMBER API TESTS ===${colors.reset}`);

  // Test 1: Get members list
  const { response, data } = await makeRequest('/api/members?page=1&limit=5');
  logTest('Members API - Fetch List', response?.status === 200 && data?.data?.length > 0,
    `Retrieved ${data?.data?.length || 0} members`);

  // Test 2: Check for Arabic data
  if (data?.data?.[0]) {
    const hasArabic = /[\u0600-\u06FF]/.test(data.data[0].full_name || '');
    logTest('Members API - Arabic Data', hasArabic,
      hasArabic ? 'Arabic names present' : 'No Arabic data found');
  }

  // Test 3: Check tribal sections
  if (data?.data) {
    const tribalSections = [...new Set(data.data.map(m => m.tribal_section).filter(Boolean))];
    logTest('Members API - Tribal Sections', tribalSections.length > 0,
      `Found sections: ${tribalSections.join(', ')}`);
  }

  // Test 4: Check balance data
  if (data?.data?.[0]) {
    const hasBalance = data.data[0].hasOwnProperty('total_balance');
    logTest('Members API - Balance Data', hasBalance,
      hasBalance ? `Sample balance: ${data.data[0].total_balance} SAR` : 'No balance data');
  }
}

async function testMemberMonitoring() {
  console.log(`\n${colors.blue}=== MEMBER MONITORING TESTS ===${colors.reset}`);

  // Test 1: Basic monitoring endpoint
  const { response, data, error } = await makeRequest('/api/member-monitoring?page=1&limit=10');

  if (response?.status === 404) {
    logTest('Member Monitoring - Endpoint Available', false, 'Endpoint not deployed (404)');
    console.log(`${colors.yellow}⚠️  Member Monitoring endpoint not yet deployed on production${colors.reset}`);
    return;
  }

  logTest('Member Monitoring - Basic Query', response?.status === 200,
    error || `Status: ${response?.status}`);

  // Test 2: Filter by member ID
  const { response: idResponse } = await makeRequest('/api/member-monitoring?memberId=SH-10001');
  logTest('Member Monitoring - ID Filter', idResponse?.status === 200 || idResponse?.status === 404);

  // Test 3: Filter by tribal section
  const { response: tribalResponse } = await makeRequest('/api/member-monitoring?tribalSection=رشود');
  logTest('Member Monitoring - Tribal Filter', tribalResponse?.status === 200 || tribalResponse?.status === 404);

  // Test 4: Balance filters
  const { response: balanceResponse } = await makeRequest('/api/member-monitoring?balanceOperator=lt&balanceAmount=3000');
  logTest('Member Monitoring - Balance Filter', balanceResponse?.status === 200 || balanceResponse?.status === 404);

  // Test 5: Export endpoint
  const { response: exportResponse } = await makeRequest('/api/member-monitoring/export');
  logTest('Member Monitoring - Export', exportResponse?.status === 200 || exportResponse?.status === 404);
}

async function testPerformance() {
  console.log(`\n${colors.blue}=== PERFORMANCE TESTS ===${colors.reset}`);

  // Test API response times
  const endpoints = [
    { name: 'Health Check', path: '/api/health' },
    { name: 'Members List', path: '/api/members?limit=10' },
    { name: 'Dashboard Stats', path: '/api/dashboard' }
  ];

  for (const endpoint of endpoints) {
    const startTime = Date.now();
    const { response } = await makeRequest(endpoint.path);
    const responseTime = Date.now() - startTime;

    const acceptable = responseTime < 2000; // 2 seconds threshold
    logTest(`Performance - ${endpoint.name}`, acceptable,
      `${responseTime}ms ${acceptable ? '✓' : '(slow)'}`);
  }
}

async function testArabicSupport() {
  console.log(`\n${colors.blue}=== ARABIC LANGUAGE TESTS ===${colors.reset}`);

  // Test Arabic search
  const { response, data } = await makeRequest('/api/members?fullName=محمد&limit=5');
  logTest('Arabic - Name Search', response?.status === 200,
    `Found ${data?.data?.length || 0} results`);

  // Test Arabic content in responses
  const { data: memberData } = await makeRequest('/api/members?limit=1');
  if (memberData?.data?.[0]) {
    const member = memberData.data[0];
    const hasArabicName = /[\u0600-\u06FF]/.test(member.full_name || '');
    const hasArabicSection = /[\u0600-\u06FF]/.test(member.tribal_section || '');
    logTest('Arabic - Content Validation', hasArabicName && hasArabicSection,
      'Arabic content in names and sections');
  }
}

async function testErrorHandling() {
  console.log(`\n${colors.blue}=== ERROR HANDLING TESTS ===${colors.reset}`);

  // Test invalid endpoints
  const { response: notFound } = await makeRequest('/api/invalid-endpoint');
  logTest('Error Handling - 404 Response', notFound?.status === 404);

  // Test unauthorized access
  const tempToken = token;
  token = 'invalid-token';
  const { response: unauthorized } = await makeRequest('/api/members');
  logTest('Error Handling - Unauthorized', unauthorized?.status === 401 || unauthorized?.status === 403);
  token = tempToken;

  // Test malformed request
  const { response: badRequest } = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ invalid: 'data' })
  });
  logTest('Error Handling - Bad Request', badRequest?.status === 400 || badRequest?.status === 422);
}

// Main test runner
async function runAllTests() {
  console.log(`${colors.blue}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  Member Monitoring Dashboard Test Suite     ║${colors.reset}`);
  console.log(`${colors.blue}║  Testing: ${API_BASE.padEnd(33)}║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════╝${colors.reset}`);

  const startTime = Date.now();

  await testAuthentication();
  await testMemberEndpoints();
  await testMemberMonitoring();
  await testPerformance();
  await testArabicSupport();
  await testErrorHandling();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  console.log(`\n${colors.blue}════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}TEST SUMMARY${colors.reset}`);
  console.log(`${colors.blue}════════════════════════════════════════════${colors.reset}`);
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`Time: ${totalTime}s`);
  console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  // Critical issues
  const criticalIssues = [];
  if (!token) criticalIssues.push('Authentication not working');
  if (testResults.tests.find(t => t.name.includes('Member Monitoring - Endpoint') && !t.passed)) {
    criticalIssues.push('Member Monitoring API not deployed');
  }

  if (criticalIssues.length > 0) {
    console.log(`\n${colors.red}CRITICAL ISSUES:${colors.reset}`);
    criticalIssues.forEach(issue => console.log(`  - ${issue}`));
  }

  // Recommendations
  console.log(`\n${colors.yellow}RECOMMENDATIONS:${colors.reset}`);
  if (testResults.tests.find(t => t.name.includes('Member Monitoring') && !t.passed)) {
    console.log('  1. Deploy member-monitoring routes to production');
    console.log('  2. Ensure memberMonitoringController.js is included in deployment');
  }
  console.log('  3. Monitor response times for optimization opportunities');
  console.log('  4. Consider implementing caching for frequently accessed data');

  // Exit code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(console.error);