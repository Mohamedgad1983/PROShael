/**
 * Security Testing Script - Al-Shuail Mobile PWA
 * Phase 3 Week 2 Day 3 - Security Audit
 *
 * Tests:
 * - JWT token security and expiry
 * - XSS protection in input fields
 * - Authentication and authorization
 * - Input sanitization
 * - Session timeout
 * - Logout security
 */

// Test 1: JWT Token Security
async function testJwtTokenSecurity() {
  console.log('\n=== TEST 1: JWT Token Security ===\n');

  const results = [];

  // 1.1: Check token expiry mechanism
  console.log('1.1: Testing token expiry mechanism...');
  const token = localStorage.getItem('auth_token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = new Date(payload.exp * 1000);
      const now = new Date();
      const isExpired = now >= expiry;

      results.push({
        test: 'Token expiry check',
        status: !isExpired ? 'PASS' : 'FAIL',
        details: `Expiry: ${expiry.toISOString()}, Current: ${now.toISOString()}`
      });
    } catch (error) {
      results.push({
        test: 'Token parsing',
        status: 'FAIL',
        details: error.message
      });
    }
  } else {
    results.push({
      test: 'Token existence',
      status: 'INFO',
      details: 'No token found (not logged in)'
    });
  }

  // 1.2: Test token storage security
  console.log('1.2: Testing token storage security...');
  const tokenKeys = ['auth_token', 'refresh_token', 'user_data'];
  tokenKeys.forEach(key => {
    const value = localStorage.getItem(key);
    results.push({
      test: `${key} storage`,
      status: value ? 'PASS' : 'INFO',
      details: value ? 'Stored in localStorage' : 'Not present'
    });
  });

  // 1.3: Test authorization header format
  console.log('1.3: Testing authorization header format...');
  if (token) {
    const isValidFormat = token.split('.').length === 3;
    results.push({
      test: 'JWT format validation',
      status: isValidFormat ? 'PASS' : 'FAIL',
      details: `Token has ${token.split('.').length} parts (expected 3)`
    });
  }

  return results;
}

// Test 2: XSS Protection
async function testXssProtection() {
  console.log('\n=== TEST 2: XSS Protection ===\n');

  const results = [];

  // XSS payloads to test
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg onload=alert("XSS")>',
    '"><script>alert("XSS")</script>',
    '\'><script>alert("XSS")</script>'
  ];

  // Test inputs on login page
  console.log('2.1: Testing phone input sanitization...');
  const phoneInput = document.getElementById('phoneInput');
  if (phoneInput) {
    xssPayloads.forEach((payload, index) => {
      phoneInput.value = payload;
      phoneInput.dispatchEvent(new Event('input', { bubbles: true }));

      const sanitizedValue = phoneInput.value;
      const isClean = !sanitizedValue.includes('<') && !sanitizedValue.includes('>');

      results.push({
        test: `XSS payload ${index + 1} in phone input`,
        status: isClean ? 'PASS' : 'FAIL',
        details: `Input: ${payload.substring(0, 30)}... → Output: ${sanitizedValue}`
      });
    });
  } else {
    results.push({
      test: 'Phone input availability',
      status: 'INFO',
      details: 'Phone input not found (not on login page)'
    });
  }

  // Test Arabic text input
  console.log('2.2: Testing Arabic text sanitization...');
  const arabicWithXss = 'مرحبا<script>alert("XSS")</script>بك';
  if (phoneInput) {
    phoneInput.value = arabicWithXss;
    phoneInput.dispatchEvent(new Event('input', { bubbles: true }));

    const sanitizedValue = phoneInput.value;
    const isClean = !sanitizedValue.includes('<script>');

    results.push({
      test: 'Arabic text with XSS',
      status: isClean ? 'PASS' : 'FAIL',
      details: `Arabic text properly sanitized: ${isClean}`
    });
  }

  return results;
}

// Test 3: Input Validation
async function testInputValidation() {
  console.log('\n=== TEST 3: Input Validation ===\n');

  const results = [];

  // Test phone number validation
  console.log('3.1: Testing phone number validation...');
  const testPhones = [
    { input: '0501234567', expected: true, label: 'Valid Saudi number' },
    { input: '0401234567', expected: false, label: 'Invalid prefix (04)' },
    { input: '050123456', expected: false, label: 'Too short (9 digits)' },
    { input: '05012345678', expected: false, label: 'Too long (11 digits)' },
    { input: '1234567890', expected: false, label: 'Not starting with 05' },
    { input: 'abcdefghij', expected: false, label: 'Letters instead of numbers' },
    { input: '050-123-4567', expected: false, label: 'Contains dashes' },
    { input: '+966501234567', expected: false, label: 'International format' }
  ];

  testPhones.forEach(({ input, expected, label }) => {
    const phoneInput = document.getElementById('phoneInput');
    if (phoneInput) {
      phoneInput.value = input;
      phoneInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Check if send button is enabled/disabled correctly
      const sendBtn = document.getElementById('sendOtpBtn');
      const isEnabled = !sendBtn.disabled;
      const passed = isEnabled === expected;

      results.push({
        test: `Phone validation: ${label}`,
        status: passed ? 'PASS' : 'FAIL',
        details: `Input: ${input}, Button enabled: ${isEnabled}, Expected: ${expected}`
      });
    }
  });

  return results;
}

// Test 4: Session Timeout
async function testSessionTimeout() {
  console.log('\n=== TEST 4: Session Timeout ===\n');

  const results = [];

  // Check if token has expiry
  console.log('4.1: Testing token expiry configuration...');
  const token = localStorage.getItem('auth_token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const hasExpiry = payload.exp !== undefined;
      const expiryTime = payload.exp * 1000 - Date.now();
      const expiryMinutes = Math.floor(expiryTime / 60000);

      results.push({
        test: 'Token expiry configured',
        status: hasExpiry ? 'PASS' : 'FAIL',
        details: `Token expires in ${expiryMinutes} minutes`
      });

      // Check if expiry is reasonable (between 5 minutes and 30 days)
      const is Reasonable = expiryMinutes >= 5 && expiryMinutes <= 43200; // 5 min to 30 days
      results.push({
        test: 'Token expiry duration',
        status: isReasonable ? 'PASS' : 'WARN',
        details: `Expiry duration: ${expiryMinutes} minutes (${Math.floor(expiryMinutes / 1440)} days)`
      });
    } catch (error) {
      results.push({
        test: 'Token expiry parsing',
        status: 'FAIL',
        details: error.message
      });
    }
  }

  return results;
}

// Test 5: Logout Security
async function testLogoutSecurity() {
  console.log('\n=== TEST 5: Logout Security ===\n');

  const results = [];

  // Test if logout button exists and is accessible
  console.log('5.1: Testing logout functionality...');
  const logoutBtn = document.getElementById('logoutBtn') ||
                    document.querySelector('[data-action="logout"]') ||
                    document.querySelector('.logout-btn');

  results.push({
    test: 'Logout button availability',
    status: logoutBtn ? 'PASS' : 'INFO',
    details: logoutBtn ? 'Logout button found' : 'Not on dashboard page or logged out'
  });

  // Check if session data exists
  console.log('5.2: Testing session data persistence...');
  const sessionKeys = ['auth_token', 'refresh_token', 'user_data'];
  const existingKeys = sessionKeys.filter(key => localStorage.getItem(key));

  results.push({
    test: 'Session data persistence',
    status: existingKeys.length > 0 ? 'INFO' : 'PASS',
    details: `${existingKeys.length} session keys found: ${existingKeys.join(', ')}`
  });

  return results;
}

// Test 6: Content Security Policy
async function testContentSecurityPolicy() {
  console.log('\n=== TEST 6: Content Security Policy ===\n');

  const results = [];

  // Check CSP headers
  console.log('6.1: Testing CSP headers...');
  const metaTag = document.querySelector('meta[http-equiv="Content-Security-Policy"]');

  results.push({
    test: 'CSP meta tag presence',
    status: metaTag ? 'PASS' : 'WARN',
    details: metaTag ? `CSP found: ${metaTag.content.substring(0, 100)}...` : 'No CSP meta tag found'
  });

  // Check for inline scripts
  console.log('6.2: Testing for inline scripts...');
  const inlineScripts = document.querySelectorAll('script:not([src])');

  results.push({
    test: 'Inline scripts check',
    status: inlineScripts.length === 0 ? 'PASS' : 'WARN',
    details: `Found ${inlineScripts.length} inline script tags`
  });

  return results;
}

// Run all tests
async function runAllSecurityTests() {
  console.log('🔒 AL-SHUAIL MOBILE PWA - SECURITY AUDIT');
  console.log('Phase 3 Week 2 Day 3 - OWASP Top 10 Testing');
  console.log('==========================================\n');

  const allResults = [];

  try {
    // Run all tests
    const test1 = await testJwtTokenSecurity();
    const test2 = await testXssProtection();
    const test3 = await testInputValidation();
    const test4 = await testSessionTimeout();
    const test5 = await testLogoutSecurity();
    const test6 = await testContentSecurityPolicy();

    allResults.push(...test1, ...test2, ...test3, ...test4, ...test5, ...test6);

    // Summary
    console.log('\n=== SECURITY AUDIT SUMMARY ===\n');
    const passCount = allResults.filter(r => r.status === 'PASS').length;
    const failCount = allResults.filter(r => r.status === 'FAIL').length;
    const warnCount = allResults.filter(r => r.status === 'WARN').length;
    const infoCount = allResults.filter(r => r.status === 'INFO').length;

    console.log(`✅ PASS: ${passCount}`);
    console.log(`❌ FAIL: ${failCount}`);
    console.log(`⚠️  WARN: ${warnCount}`);
    console.log(`ℹ️  INFO: ${infoCount}`);
    console.log(`📊 TOTAL: ${allResults.length} tests\n`);

    // Print failed tests
    if (failCount > 0) {
      console.log('=== FAILED TESTS ===\n');
      allResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`❌ ${r.test}`);
          console.log(`   ${r.details}\n`);
        });
    }

    // Print warnings
    if (warnCount > 0) {
      console.log('=== WARNINGS ===\n');
      allResults
        .filter(r => r.status === 'WARN')
        .forEach(r => {
          console.log(`⚠️  ${r.test}`);
          console.log(`   ${r.details}\n`);
        });
    }

    // Overall status
    console.log('\n=== OVERALL SECURITY STATUS ===\n');
    if (failCount === 0 && warnCount === 0) {
      console.log('🎉 EXCELLENT: All security tests passed!');
    } else if (failCount === 0) {
      console.log('✅ GOOD: No failures, but some warnings to address');
    } else if (failCount <= 2) {
      console.log('⚠️  FAIR: Minor security issues found');
    } else {
      console.log('❌ POOR: Critical security issues require immediate attention');
    }

    return allResults;

  } catch (error) {
    console.error('Error running security tests:', error);
    return [];
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllSecurityTests,
    testJwtTokenSecurity,
    testXssProtection,
    testInputValidation,
    testSessionTimeout,
    testLogoutSecurity,
    testContentSecurityPolicy
  };
}

// Auto-run if loaded in browser console
if (typeof window !== 'undefined') {
  window.runSecurityTests = runAllSecurityTests;
  console.log('✅ Security tests loaded. Run: runSecurityTests()');
}
