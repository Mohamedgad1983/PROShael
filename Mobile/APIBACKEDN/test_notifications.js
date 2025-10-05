#!/usr/bin/env node

/**
 * ===============================================
 * NOTIFICATION API - COMPREHENSIVE TEST SUITE
 * Node.js version for Windows compatibility
 * ===============================================
 */

const https = require('https');
const http = require('http');

// Configuration
const LOCAL_API = 'http://localhost:3001';
const PROD_API = 'https://proshael.onrender.com';

// Tokens (update as needed)
const LOCAL_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0N2IzMDIxLWE2YTMtNGNkNy1hZjJjLTY3YWQxMTczNGFhMCIsInBob25lIjoiMDU1NTU1NTU1NSIsInJvbGUiOiJtZW1iZXIiLCJtZW1iZXJzaGlwTnVtYmVyIjoiU0gwMDIiLCJmdWxsTmFtZSI6Itiz2KfYsdipINin2YTYtNi52YrZhCIsImlhdCI6MTc1OTY0ODQ2NCwiZXhwIjoxNzYyMjQwNDY0fQ.Aq_83X6nJ0d_P1JD2slU2wstX8jQB1_66OvzAcli0bo';
const PROD_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE0N2IzMDIxLWE2YTMtNGNkNy1hZjJjLTY3YWQxMTczNGFhMCIsInBob25lIjoiMDU1NTU1NTU1NSIsInJvbGUiOiJtZW1iZXIiLCJtZW1iZXJzaGlwTnVtYmVyIjoiU0gwMDIiLCJmdWxsTmFtZSI6Itiz2KfYsdipINin2YTYtNi52YrZhCIsImlhdCI6MTc1OTY0ODc3NSwiZXhwIjoxNzYyMjQwNzc1fQ.IO4rX-miCCuHL0Wiyihk9HCk2cf_RloRBmskN-noYv8';

// Choose environment (change this to switch between local and production)
const USE_PRODUCTION = process.env.TEST_ENV === 'production';
const API_URL = USE_PRODUCTION ? PROD_API : LOCAL_API;
const TOKEN = USE_PRODUCTION ? PROD_TOKEN : LOCAL_TOKEN;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Helper to log test results
function logTest(testName, status, message, data = null) {
  const statusSymbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const statusColor = status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow;

  console.log(`${statusSymbol} ${statusColor}${status}${colors.reset} - ${testName}`);
  if (message) {
    console.log(`   ${message}`);
  }
  if (data) {
    console.log(`   Data: ${JSON.stringify(data, null, 2).split('\n').join('\n   ')}`);
  }

  testResults.tests.push({ testName, status, message, data });
  if (status === 'PASS') testResults.passed++;
  else if (status === 'FAIL') testResults.failed++;
  else testResults.skipped++;
}

// Test 1: Get All Notifications
async function test1_getAllNotifications() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}📋 TEST 1: Get All Notifications${colors.reset}`);
  console.log('Endpoint: GET /api/member/notifications');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    const response = await makeRequest(`${API_URL}/api/member/notifications`);
    const duration = Date.now() - startTime;

    if (response.statusCode === 200) {
      const { data } = response.data;
      const totalNotifications =
        (data.notifications?.news?.length || 0) +
        (data.notifications?.initiatives?.length || 0) +
        (data.notifications?.diyas?.length || 0);

      logTest(
        'Get All Notifications',
        'PASS',
        `Status: ${response.statusCode} | Duration: ${duration}ms | Total: ${totalNotifications} | Unread: ${data.unreadCount}`,
        {
          news: data.notifications?.news?.length || 0,
          initiatives: data.notifications?.initiatives?.length || 0,
          diyas: data.notifications?.diyas?.length || 0,
          unread: data.unreadCount
        }
      );
      return data;
    } else {
      logTest('Get All Notifications', 'FAIL', `Status: ${response.statusCode}`, response.data);
      return null;
    }
  } catch (error) {
    logTest('Get All Notifications', 'FAIL', error.message);
    return null;
  }
}

// Test 2: Get Notification Summary
async function test2_getNotificationSummary() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}📊 TEST 2: Get Notification Summary${colors.reset}`);
  console.log('Endpoint: GET /api/member/notifications/summary');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    const response = await makeRequest(`${API_URL}/api/member/notifications/summary`);
    const duration = Date.now() - startTime;

    if (response.statusCode === 200) {
      const { data } = response.data;

      // Calculate total unread from summary data
      const totalUnread = Object.values(data || {}).reduce((sum, cat) => {
        return sum + (cat.unread || 0);
      }, 0);

      logTest(
        'Get Notification Summary',
        'PASS',
        `Status: ${response.statusCode} | Duration: ${duration}ms | Total Unread: ${totalUnread}`,
        {
          news: data?.news?.unread || 0,
          initiatives: data?.initiatives?.unread || 0,
          diyas: data?.diyas?.unread || 0,
          occasions: data?.occasions?.unread || 0,
          statements: data?.statements?.unread || 0,
          total: totalUnread
        }
      );
      return data;
    } else {
      logTest('Get Notification Summary', 'FAIL', `Status: ${response.statusCode}`, response.data);
      return null;
    }
  } catch (error) {
    logTest('Get Notification Summary', 'FAIL', error.message);
    return null;
  }
}

// Test 3: Mark Notification as Read
async function test3_markNotificationRead(notificationData) {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}✓ TEST 3: Mark Notification as Read${colors.reset}`);
  console.log('Endpoint: PUT /api/member/notifications/:id/read');
  console.log('='.repeat(60));

  if (!notificationData) {
    logTest('Mark Notification as Read', 'SKIP', 'No notification data from previous test');
    return null;
  }

  // Get first unread notification from any category
  let notifId = null;
  let notifType = null;

  const { notifications } = notificationData;

  if (notifications?.news?.length > 0) {
    const unread = notifications.news.find(n => !n.isRead);
    if (unread) {
      notifId = unread.id;
      notifType = 'news';
    }
  }

  if (!notifId && notifications?.initiatives?.length > 0) {
    const unread = notifications.initiatives.find(n => !n.isRead);
    if (unread) {
      notifId = unread.id;
      notifType = 'initiatives';
    }
  }

  if (!notifId && notifications?.diyas?.length > 0) {
    const unread = notifications.diyas.find(n => !n.isRead);
    if (unread) {
      notifId = unread.id;
      notifType = 'diyas';
    }
  }

  if (!notifId) {
    logTest('Mark Notification as Read', 'SKIP', 'No unread notifications found');
    return null;
  }

  const startTime = Date.now();

  try {
    console.log(`   Marking notification as read: ${notifId} (${notifType})`);
    const response = await makeRequest(`${API_URL}/api/member/notifications/${notifId}/read`, {
      method: 'PUT'
    });
    const duration = Date.now() - startTime;

    if (response.statusCode === 200) {
      logTest(
        'Mark Notification as Read',
        'PASS',
        `Status: ${response.statusCode} | Duration: ${duration}ms | ID: ${notifId}`,
        response.data
      );
      return notifId;
    } else {
      logTest('Mark Notification as Read', 'FAIL', `Status: ${response.statusCode}`, response.data);
      return null;
    }
  } catch (error) {
    logTest('Mark Notification as Read', 'FAIL', error.message);
    return null;
  }
}

// Test 4: Mark All as Read
async function test4_markAllRead() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}✓✓ TEST 4: Mark All Notifications as Read${colors.reset}`);
  console.log('Endpoint: PUT /api/member/notifications/read-all');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    const response = await makeRequest(`${API_URL}/api/member/notifications/read-all`, {
      method: 'PUT'
    });
    const duration = Date.now() - startTime;

    if (response.statusCode === 200) {
      const count = response.data.count !== undefined ? response.data.count : 0;
      logTest(
        'Mark All Notifications as Read',
        'PASS',
        `Status: ${response.statusCode} | Duration: ${duration}ms | Updated: ${count} notifications`,
        response.data
      );
      return response.data;
    } else {
      logTest('Mark All Notifications as Read', 'FAIL', `Status: ${response.statusCode}`, response.data);
      return null;
    }
  } catch (error) {
    logTest('Mark All Notifications as Read', 'FAIL', error.message);
    return null;
  }
}

// Test 5: Verify All Marked as Read
async function test5_verifyAllRead() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}🔍 TEST 5: Verify All Marked as Read${colors.reset}`);
  console.log('Endpoint: GET /api/member/notifications');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    const response = await makeRequest(`${API_URL}/api/member/notifications`);
    const duration = Date.now() - startTime;

    if (response.statusCode === 200) {
      const { data } = response.data;
      const unreadCount = data.unreadCount;

      if (unreadCount === 0) {
        logTest(
          'Verify All Marked as Read',
          'PASS',
          `Status: ${response.statusCode} | Duration: ${duration}ms | Unread Count: ${unreadCount}`,
          { unreadCount, expected: 0 }
        );
      } else {
        logTest(
          'Verify All Marked as Read',
          'FAIL',
          `Still have ${unreadCount} unread notifications`,
          { unreadCount, expected: 0 }
        );
      }
      return unreadCount;
    } else {
      logTest('Verify All Marked as Read', 'FAIL', `Status: ${response.statusCode}`, response.data);
      return null;
    }
  } catch (error) {
    logTest('Verify All Marked as Read', 'FAIL', error.message);
    return null;
  }
}

// Print test summary
function printSummary() {
  console.log('\n\n' + '='.repeat(60));
  console.log(`${colors.magenta}📈 TEST SUMMARY${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`${colors.green}✅ Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${testResults.failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Skipped: ${testResults.skipped}${colors.reset}`);
  console.log(`${colors.blue}📊 Total: ${testResults.tests.length}${colors.reset}`);
  console.log('='.repeat(60));

  const successRate = ((testResults.passed / testResults.tests.length) * 100).toFixed(1);
  console.log(`\n${colors.cyan}Success Rate: ${successRate}%${colors.reset}`);

  if (testResults.failed === 0) {
    console.log(`\n${colors.green}🎉 ALL TESTS PASSED! Ready for production.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}⚠️  Some tests failed. Review above for details.${colors.reset}`);
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// Main test execution
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.magenta}🧪 NOTIFICATION API TEST SUITE${colors.reset}`);
  console.log(`${colors.blue}Testing: ${API_URL}${colors.reset}`);
  console.log('='.repeat(60));

  try {
    // Run tests sequentially
    const notificationData = await test1_getAllNotifications();
    await test2_getNotificationSummary();
    await test3_markNotificationRead(notificationData);
    await test4_markAllRead();
    await test5_verifyAllRead();

    // Print summary
    printSummary();

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(`\n${colors.red}Fatal Error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
