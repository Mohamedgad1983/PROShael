/**
 * AUTH FLOW TEST SCRIPT
 * Tests the complete authentication flow to identify where the logout occurs
 */

const API_URL = 'https://proshael.onrender.com';

// Test credentials
const TEST_CREDENTIALS = {
  phone: '0555555555',
  password: '123456'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const typeColors = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.cyan,
    header: colors.magenta
  };

  const color = typeColors[type] || colors.reset;
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'header');
  console.log('='.repeat(60));
}

async function testLogin() {
  logSection('TEST 1: LOGIN ENDPOINT');

  try {
    log('Sending login request...', 'info');

    const response = await fetch(`${API_URL}/api/auth/mobile-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_CREDENTIALS)
    });

    const data = await response.json();

    if (data.success) {
      log('✅ Login successful!', 'success');
      log(`User: ${data.user.name}`, 'info');
      log(`Role: ${data.user.role}`, 'info');
      log(`Token (first 50 chars): ${data.token.substring(0, 50)}...`, 'info');

      // Decode token payload
      try {
        const payload = JSON.parse(Buffer.from(data.token.split('.')[1], 'base64').toString());
        log('Token payload:', 'info');
        console.log(payload);

        // Check expiration
        const exp = new Date(payload.exp * 1000);
        const now = new Date();
        const hoursUntilExpiry = (exp - now) / (1000 * 60 * 60);

        if (hoursUntilExpiry > 0) {
          log(`Token valid for ${hoursUntilExpiry.toFixed(1)} hours`, 'success');
        } else {
          log('Token already expired!', 'error');
        }
      } catch (e) {
        log('Failed to decode token', 'error');
      }

      return data.token;
    } else {
      log(`❌ Login failed: ${data.message || data.error}`, 'error');
      return null;
    }
  } catch (error) {
    log(`❌ Network error: ${error.message}`, 'error');
    return null;
  }
}

async function testVerifyToken(token) {
  logSection('TEST 2: VERIFY TOKEN ENDPOINT');

  try {
    log('Verifying token...', 'info');

    const response = await fetch(`${API_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      log('✅ Token verification successful!', 'success');
      log(`User ID: ${data.user.id}`, 'info');
      log(`User Role: ${data.user.role}`, 'info');
      return true;
    } else {
      log(`❌ Token verification failed: ${data.error || response.status}`, 'error');
      log(`Response: ${JSON.stringify(data)}`, 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Verification error: ${error.message}`, 'error');
    return false;
  }
}

async function testMemberEndpoint(token, endpoint) {
  logSection(`TEST: ${endpoint.toUpperCase()} ENDPOINT`);

  try {
    log(`Testing ${endpoint}...`, 'info');

    const response = await fetch(`${API_URL}/api/member/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok) {
      log(`✅ ${endpoint} endpoint working!`, 'success');
      log(`Response: ${JSON.stringify(data).substring(0, 100)}...`, 'info');
      return true;
    } else {
      log(`❌ ${endpoint} endpoint failed: Status ${response.status}`, 'error');
      log(`Error: ${data.message || data.error || 'Unknown'}`, 'error');

      // Check if it's a token error
      const errorMsg = (data.message || data.error || '').toLowerCase();
      if (errorMsg.includes('token') || errorMsg.includes('expired') || errorMsg.includes('invalid')) {
        log('⚠️ This is a token authentication error!', 'warning');
      }

      return false;
    }
  } catch (error) {
    log(`❌ ${endpoint} test error: ${error.message}`, 'error');
    return false;
  }
}

async function runAllTests() {
  logSection('AL-SHUAIL AUTHENTICATION FLOW TEST');
  log('Starting comprehensive auth testing...', 'info');

  // Test 1: Login
  const token = await testLogin();
  if (!token) {
    log('Cannot continue without valid token', 'error');
    return;
  }

  // Small delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Verify token
  const tokenValid = await testVerifyToken(token);
  if (!tokenValid) {
    log('Token verification failed - this is likely the issue!', 'error');
  }

  // Small delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Member endpoints
  const endpoints = ['profile', 'balance', 'payments', 'notifications'];
  const results = {};

  for (const endpoint of endpoints) {
    await new Promise(resolve => setTimeout(resolve, 500));
    results[endpoint] = await testMemberEndpoint(token, endpoint);
  }

  // Summary
  logSection('TEST SUMMARY');

  const passed = Object.values(results).filter(r => r).length;
  const failed = Object.values(results).filter(r => !r).length;

  log(`Tests Passed: ${passed}/${endpoints.length}`, passed > 0 ? 'success' : 'error');
  log(`Tests Failed: ${failed}/${endpoints.length}`, failed > 0 ? 'error' : 'success');

  if (failed > 0) {
    log('\n⚠️ DIAGNOSIS:', 'warning');

    if (!tokenValid) {
      log('Token verification is failing - JWT secret mismatch likely', 'error');
      log('ACTION: Update JWT_SECRET on Render.com to: alshuail-universal-jwt-secret-2024-production-32chars', 'warning');
    } else if (results.profile === false) {
      log('Profile endpoint specifically failing - check member route import', 'error');
      log('ACTION: Verify /src/routes/member.js imports from correct auth middleware', 'warning');
    } else {
      log('Some endpoints failing - partial configuration issue', 'error');
      log('ACTION: Check individual endpoint implementations', 'warning');
    }
  } else {
    log('\n✅ All tests passed! Authentication is working correctly.', 'success');
  }
}

// Run the tests
runAllTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});