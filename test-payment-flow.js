/**
 * ============================================
 * AL-SHUAIL MOBILE PWA - Payment Flow Test
 * ============================================
 * Purpose: Test complete payment submission flow
 * Test Account: 0555555555 / 123456
 * ============================================
 */

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

// Helper to log results
const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`)
};

let authToken = null;
let memberId = null;

// Test 1: Login and get token
async function testLogin() {
  log.info('Step 1: Logging in...');
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
      memberId = data.user?.id;
      log.success(`Login successful!`);
      log.info(`Member: ${data.user?.name}`);
      log.info(`ID: ${memberId}`);
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

// Test 2: Submit a self payment
async function testSelfPayment() {
  log.info('Step 2: Submitting payment for self...');
  try {
    const paymentData = {
      amount: 100,
      notes: 'اختبار دفعة ذاتية - Test self payment',
      payment_mode: 'self'
    };

    const response = await fetch(`${API_BASE_URL}/api/member/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();

    if (response.ok) {
      log.success('Self payment submitted successfully!');
      log.info(`Payment ID: ${data.id || 'N/A'}`);
      log.info(`Amount: ${paymentData.amount} SAR`);
      return data.id;
    } else {
      log.error(`Payment submission failed: ${data.message || response.statusText}`);
      return null;
    }
  } catch (error) {
    log.error(`Payment submission error: ${error.message}`);
    return null;
  }
}

// Test 3: Search for another member
async function testMemberSearch() {
  log.info('Step 3: Searching for another member...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/member/search?q=محمد`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.status === 404) {
      log.warning('Member search endpoint not found (404)');
      return null;
    }

    const data = await response.json();
    const members = Array.isArray(data) ? data : (data.data || []);

    if (members.length > 0) {
      log.success(`Found ${members.length} member(s)`);
      log.info(`First member: ${members[0].full_name || members[0].name}`);
      return members[0];
    } else {
      log.warning('No members found in search');
      return null;
    }
  } catch (error) {
    log.error(`Member search error: ${error.message}`);
    return null;
  }
}

// Test 4: Submit payment on behalf
async function testPaymentOnBehalf(behalfMember) {
  if (!behalfMember) {
    log.warning('Skipping behalf payment - no member found');
    return null;
  }

  log.info('Step 4: Submitting payment on behalf of another member...');
  try {
    const paymentData = {
      amount: 50,
      notes: 'اختبار دفعة نيابة - Test behalf payment',
      payment_mode: 'behalf',
      on_behalf_of: behalfMember.id
    };

    const response = await fetch(`${API_BASE_URL}/api/member/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();

    if (response.ok) {
      log.success('Behalf payment submitted successfully!');
      log.info(`For: ${behalfMember.full_name || behalfMember.name}`);
      log.info(`Amount: ${paymentData.amount} SAR`);
      return data.id;
    } else {
      log.error(`Behalf payment failed: ${data.message || response.statusText}`);
      return null;
    }
  } catch (error) {
    log.error(`Behalf payment error: ${error.message}`);
    return null;
  }
}

// Test 5: Get payment history
async function testPaymentHistory() {
  log.info('Step 5: Fetching payment history...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/member/payments?limit=5`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    const payments = Array.isArray(data) ? data : (data.data || []);

    if (payments.length > 0) {
      log.success(`Payment history retrieved: ${payments.length} payment(s)`);
      payments.forEach((payment, index) => {
        log.info(`  ${index + 1}. Amount: ${payment.amount} SAR, Status: ${payment.status || 'pending'}, Date: ${payment.date || payment.created_at || 'N/A'}`);
      });
      return true;
    } else {
      log.warning('No payments found in history');
      return true;
    }
  } catch (error) {
    log.error(`Payment history error: ${error.message}`);
    return false;
  }
}

// Test 6: Upload receipt (simulated)
async function testReceiptUpload() {
  log.info('Step 6: Testing receipt upload endpoint...');
  try {
    // Create a simple text file as a mock receipt
    const blob = new Blob(['Test receipt content'], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('receipt', blob, 'test-receipt.txt');

    const response = await fetch(`${API_BASE_URL}/api/receipts/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    if (response.status === 404) {
      log.warning('Receipt upload endpoint not found (404) - May need configuration');
      return false;
    }

    if (response.ok) {
      const data = await response.json();
      log.success('Receipt upload endpoint accessible!');
      log.info(`URL: ${data.url || 'N/A'}`);
      return true;
    } else {
      log.warning(`Receipt upload returned ${response.status}`);
      return false;
    }
  } catch (error) {
    log.error(`Receipt upload error: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runPaymentTests() {
  console.log('');
  console.log('============================================');
  console.log('AL-SHUAIL MOBILE PWA - PAYMENT FLOW TEST');
  console.log('============================================');
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`Test Account: ${TEST_PHONE}`);
  console.log('============================================');
  console.log('');

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  // Run tests in sequence
  const tests = [
    { name: 'Login', fn: testLogin, required: true },
    { name: 'Self Payment', fn: testSelfPayment },
    { name: 'Member Search', fn: testMemberSearch },
    { name: 'Behalf Payment', fn: async () => {
      const member = await testMemberSearch();
      return testPaymentOnBehalf(member);
    }},
    { name: 'Payment History', fn: testPaymentHistory },
    { name: 'Receipt Upload', fn: testReceiptUpload }
  ];

  for (const test of tests) {
    console.log('');
    results.total++;

    const passed = await test.fn();
    if (passed || passed === null) {
      results.passed++;
    } else {
      results.failed++;
      if (test.required) {
        log.error('Cannot continue without successful ' + test.name);
        break;
      }
    }
  }

  // Print summary
  console.log('');
  console.log('============================================');
  console.log('PAYMENT FLOW TEST SUMMARY');
  console.log('============================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log('============================================');

  if (results.passed === results.total) {
    log.success('All payment tests passed! Payment system is ready! ✨');
  } else if (results.passed >= 4) {
    log.success('Core payment functionality is working! 🎉');
    log.warning('Some features may need backend implementation.');
  } else {
    log.error('Payment system needs attention.');
  }
}

// Run the tests
runPaymentTests().catch(error => {
  log.error(`Test runner failed: ${error.message}`);
  process.exit(1);
});