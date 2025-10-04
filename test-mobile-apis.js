/**
 * ============================================
 * AL-SHUAIL MOBILE PWA - API Integration Test
 * ============================================
 * Purpose: Test all mobile API endpoints
 * Test Account: 0555555555 / 123456
 * ============================================
 */

// Using built-in fetch API instead of axios

const API_BASE_URL = 'https://proshael.onrender.com';
const TEST_PHONE = '0555555555';
const TEST_PASSWORD = '123456';

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

let authToken = null;

// Helper to log results
const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`)
};

// Test 1: Login
async function testLogin() {
  log.info('Testing Login...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/mobile-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: TEST_PHONE,
        password: TEST_PASSWORD
      })
    });

    const data = await response.json();

    if (data.success && data.token) {
      authToken = data.token;
      log.success(`Login successful! Token received`);
      log.info(`User: ${data.user?.name || 'Unknown'}`);
      log.info(`Role: ${data.user?.role || 'member'}`);
      return true;
    } else {
      log.error('Login failed: No token received');
      return false;
    }
  } catch (error) {
    log.error(`Login failed: ${error.message}`);
    return false;
  }
}

// Test 2: Get Member Profile
async function testMemberProfile() {
  log.info('Testing Member Profile Endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/member/profile`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.status === 404) {
      log.warning('Profile endpoint not found (404) - May not be implemented yet');
      return false;
    } else if (response.status === 401) {
      log.error('Unauthorized - Token might be invalid');
      return false;
    }

    const data = await response.json();
    if (data) {
      log.success('Member profile fetched successfully!');
      log.info(`Name: ${data.full_name || data.name || 'N/A'}`);
      log.info(`Phone: ${data.phone || 'N/A'}`);
      log.info(`Balance: ${data.balance || 0} SAR`);
      return true;
    }
  } catch (error) {
    log.error(`Profile fetch failed: ${error.message}`);
    return false;
  }
}

// Test 3: Get Member Balance
async function testMemberBalance() {
  log.info('Testing Member Balance Endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/member/balance`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.status === 404) {
      log.warning('Balance endpoint not found (404) - May not be implemented yet');
      return false;
    }

    const data = await response.json();
    if (data) {
      log.success('Member balance fetched successfully!');
      log.info(`Current Balance: ${data.current_balance || 0} SAR`);
      log.info(`Required Amount: ${data.required_amount || 3000} SAR`);
      log.info(`Status: ${data.status || 'Unknown'}`);
      return true;
    }
  } catch (error) {
    log.error(`Balance fetch failed: ${error.message}`);
    return false;
  }
}

// Test 4: Get Member Payments
async function testMemberPayments() {
  log.info('Testing Member Payments Endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/member/payments`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.status === 404) {
      log.warning('Payments endpoint not found (404) - May not be implemented yet');
      return false;
    }

    const data = await response.json();
    if (data) {
      log.success('Member payments fetched successfully!');
      const payments = data.data || data;
      log.info(`Total payments: ${Array.isArray(payments) ? payments.length : 0}`);
      if (Array.isArray(payments) && payments.length > 0) {
        log.info(`Latest payment: ${payments[0].amount} SAR on ${payments[0].date}`);
      }
      return true;
    }
  } catch (error) {
    log.error(`Payments fetch failed: ${error.message}`);
    return false;
  }
}

// Test 5: Get Member Notifications
async function testMemberNotifications() {
  log.info('Testing Member Notifications Endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/member/notifications`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.status === 404) {
      log.warning('Notifications endpoint not found (404) - May not be implemented yet');
      return false;
    }

    const data = await response.json();
    if (data) {
      log.success('Member notifications fetched successfully!');
      const notifications = data.data || data;
      log.info(`Total notifications: ${Array.isArray(notifications) ? notifications.length : 0}`);
      if (Array.isArray(notifications) && notifications.length > 0) {
        log.info(`Latest notification: ${notifications[0].title}`);
      }
      return true;
    }
  } catch (error) {
    log.error(`Notifications fetch failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('');
  console.log('============================================');
  console.log('AL-SHUAIL MOBILE PWA - API INTEGRATION TEST');
  console.log('============================================');
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`Test Account: ${TEST_PHONE}`);
  console.log('============================================');
  console.log('');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  };

  // Run tests
  const tests = [
    { name: 'Login', fn: testLogin },
    { name: 'Member Profile', fn: testMemberProfile },
    { name: 'Member Balance', fn: testMemberBalance },
    { name: 'Member Payments', fn: testMemberPayments },
    { name: 'Member Notifications', fn: testMemberNotifications }
  ];

  for (const test of tests) {
    console.log('');
    console.log(`--- ${test.name} ---`);
    results.total++;

    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Stop if login fails
    if (test.name === 'Login' && !passed) {
      log.error('Cannot continue without successful login');
      break;
    }
  }

  // Print summary
  console.log('');
  console.log('============================================');
  console.log('TEST SUMMARY');
  console.log('============================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log('============================================');

  if (results.passed === results.total) {
    log.success('All tests passed! ✨');
  } else if (results.passed > 0) {
    log.warning('Some tests failed. Check implementation.');
  } else {
    log.error('All tests failed. Check backend connection.');
  }
}

// Run the tests
runTests().catch(error => {
  log.error(`Test runner failed: ${error.message}`);
  process.exit(1);
});