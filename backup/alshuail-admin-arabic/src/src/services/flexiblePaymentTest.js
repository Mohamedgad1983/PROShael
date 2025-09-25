/**
 * Comprehensive Test Suite for Flexible Payment System
 * Al-Shuail Family Admin Dashboard
 * Tests all aspects of the flexible payment validation and subscription system
 */

import PaymentValidationService from './paymentValidationService.js';
import subscriptionService from './subscriptionService.js';
import apiHandlers from './apiHandlers.js';

// ====================
// TEST UTILITIES
// ====================

const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

const assert = (condition, testName, expected, actual) => {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    testResults.details.push({
      test: testName,
      status: 'PASSED',
      expected,
      actual
    });
    console.log(`✅ PASSED: ${testName}`);
  } else {
    testResults.failed++;
    testResults.details.push({
      test: testName,
      status: 'FAILED',
      expected,
      actual,
      error: `Expected: ${expected}, Actual: ${actual}`
    });
    console.log(`❌ FAILED: ${testName} - Expected: ${expected}, Actual: ${actual}`);
  }
};

const logTestSection = (sectionName) => {
  console.log(`\n🔷 ${sectionName}`);
  console.log('='.repeat(50));
};

// ====================
// PAYMENT VALIDATION TESTS
// ====================

const testPaymentValidation = () => {
  logTestSection('Payment Validation Service Tests');

  // Test 1: Valid amounts (multiples of 50)
  const validAmounts = [50, 100, 150, 250, 500, 1000, 2500, 5000];
  validAmounts.forEach(amount => {
    const result = PaymentValidationService.validateSubscriptionAmount(amount);
    assert(result.isValid, `Valid amount ${amount}`, true, result.isValid);
  });

  // Test 2: Invalid amounts (below minimum)
  const belowMinimum = [0, 25, 49];
  belowMinimum.forEach(amount => {
    const result = PaymentValidationService.validateSubscriptionAmount(amount);
    assert(!result.isValid && result.error === 'BELOW_MINIMUM',
           `Below minimum ${amount}`, 'BELOW_MINIMUM', result.error);
  });

  // Test 3: Invalid amounts (not multiples of 50)
  const nonMultiples = [51, 75, 125, 175, 999];
  nonMultiples.forEach(amount => {
    const result = PaymentValidationService.validateSubscriptionAmount(amount);
    assert(!result.isValid && result.error === 'INVALID_MULTIPLE',
           `Non-multiple ${amount}`, 'INVALID_MULTIPLE', result.error);
  });

  // Test 4: Invalid input types
  const invalidInputs = [null, undefined, 'abc', {}, [], NaN];
  invalidInputs.forEach(input => {
    const result = PaymentValidationService.validateSubscriptionAmount(input);
    assert(!result.isValid, `Invalid input ${input}`, false, result.isValid);
  });

  // Test 5: String numbers (should be converted)
  const stringNumbers = ['50', '100', '200'];
  stringNumbers.forEach(amount => {
    const result = PaymentValidationService.validateSubscriptionAmount(amount);
    assert(result.isValid, `String number ${amount}`, true, result.isValid);
  });
};

// ====================
// SUBSCRIPTION CALCULATION TESTS
// ====================

const testSubscriptionCalculation = () => {
  logTestSection('Subscription Calculation Tests');

  // Test 1: Monthly subscription
  const monthlyCalc = PaymentValidationService.calculateSubscriptionDetails(100, 'monthly');
  assert(monthlyCalc.duration_months === 1, 'Monthly duration', 1, monthlyCalc.duration_months);
  assert(monthlyCalc.amount === 100, 'Monthly amount', 100, monthlyCalc.amount);
  assert(monthlyCalc.end_date !== null, 'Monthly has end date', 'not null', monthlyCalc.end_date ? 'not null' : 'null');

  // Test 2: Yearly subscription
  const yearlyCalc = PaymentValidationService.calculateSubscriptionDetails(1200, 'yearly');
  assert(yearlyCalc.duration_months === 12, 'Yearly duration', 12, yearlyCalc.duration_months);
  assert(yearlyCalc.monthly_equivalent === 100, 'Yearly monthly equivalent', 100, yearlyCalc.monthly_equivalent);

  // Test 3: Lifetime subscription
  const lifetimeCalc = PaymentValidationService.calculateSubscriptionDetails(5000, 'lifetime');
  assert(lifetimeCalc.duration_months === -1, 'Lifetime duration', -1, lifetimeCalc.duration_months);
  assert(lifetimeCalc.end_date === null, 'Lifetime has no end date', null, lifetimeCalc.end_date);
  assert(lifetimeCalc.is_lifetime === true, 'Lifetime flag', true, lifetimeCalc.is_lifetime);
};

// ====================
// AMOUNT FORMATTING TESTS
// ====================

const testAmountFormatting = () => {
  logTestSection('Amount Formatting Tests');

  const formatted = PaymentValidationService.formatAmount(1500);

  assert(formatted.currency === 'SAR', 'Currency format', 'SAR', formatted.currency);
  assert(formatted.raw === 1500, 'Raw amount', 1500, formatted.raw);
  assert(formatted.arabic.includes('ريال'), 'Arabic formatting', 'contains ريال', formatted.arabic.includes('ريال') ? 'contains ريال' : 'missing ريال');
  assert(formatted.english.includes('SAR'), 'English formatting', 'contains SAR', formatted.english.includes('SAR') ? 'contains SAR' : 'missing SAR');
};

// ====================
// UPGRADE VALIDATION TESTS
// ====================

const testUpgradeValidation = () => {
  logTestSection('Upgrade Validation Tests');

  // Test 1: Valid upgrade
  const validUpgrade = PaymentValidationService.validateSubscriptionUpgrade(100, 200);
  assert(validUpgrade.isValid, 'Valid upgrade 100 to 200', true, validUpgrade.isValid);
  assert(validUpgrade.upgrade_difference === 100, 'Upgrade difference', 100, validUpgrade.upgrade_difference);

  // Test 2: Invalid upgrade (downgrade)
  const invalidDowngrade = PaymentValidationService.validateSubscriptionUpgrade(200, 100);
  assert(!invalidDowngrade.isValid, 'Invalid downgrade', false, invalidDowngrade.isValid);
  assert(invalidDowngrade.error === 'NOT_AN_UPGRADE', 'Downgrade error', 'NOT_AN_UPGRADE', invalidDowngrade.error);

  // Test 3: Same amount
  const sameAmount = PaymentValidationService.validateSubscriptionUpgrade(150, 150);
  assert(!sameAmount.isValid, 'Same amount not upgrade', false, sameAmount.isValid);
};

// ====================
// PRORATION CALCULATION TESTS
// ====================

const testProrationCalculation = () => {
  logTestSection('Proration Calculation Tests');

  const startDate = new Date('2024-09-01');
  const endDate = new Date('2024-09-30'); // 30 days
  const changeDate = new Date('2024-09-15'); // 15 days in

  const proration = PaymentValidationService.calculateProratedAmount(200, startDate, endDate, changeDate);

  assert(proration.remaining_days === 15, 'Remaining days', 15, proration.remaining_days);
  assert(proration.total_days === 29, 'Total days', 29, proration.total_days); // Approximately 29-30 days
  assert(proration.full_amount === 200, 'Full amount', 200, proration.full_amount);
  assert(proration.prorated_amount > 0, 'Prorated amount calculated', '> 0', proration.prorated_amount > 0 ? '> 0' : '<= 0');
};

// ====================
// BULK VALIDATION TESTS
// ====================

const testBulkValidation = () => {
  logTestSection('Bulk Validation Tests');

  const amounts = [50, 100, 75, 200, 'invalid', 999];
  const results = PaymentValidationService.validateBulkAmounts(amounts);

  assert(results.length === amounts.length, 'All amounts processed', amounts.length, results.length);

  const validCount = results.filter(r => r.result.isValid).length;
  assert(validCount === 3, 'Valid amounts count', 3, validCount); // 50, 100, 200

  const invalidCount = results.filter(r => !r.result.isValid).length;
  assert(invalidCount === 3, 'Invalid amounts count', 3, invalidCount); // 75, 'invalid', 999
};

// ====================
// SERVICE INTEGRATION TESTS
// ====================

const testServiceIntegration = async () => {
  logTestSection('Service Integration Tests');

  try {
    // Test 1: Create flexible subscription
    const subscriptionData = {
      member_id: 30, // Use a member without active subscription
      amount: 150,
      duration: 'monthly',
      payment_method: 'credit_card'
    };

    const createResult = await subscriptionService.createFlexibleSubscription(subscriptionData);

    // Debug output if creation failed
    if (!createResult.success) {
      console.log('Creation failed:', createResult.error);
      console.log('Validation details:', createResult.validation_details);
    }

    assert(createResult.success, 'Create flexible subscription', true, createResult.success);

    if (createResult.success) {
      assert(createResult.data.is_flexible === true, 'Subscription marked as flexible', true, createResult.data.is_flexible);
      assert(createResult.data.amount === 150, 'Correct amount saved', 150, createResult.data.amount);
    }

    // Test 2: Get member subscription status
    const statusResult = await subscriptionService.getMemberSubscriptionStatus(30);
    assert(statusResult.success, 'Get member status', true, statusResult.success);

    if (statusResult.success && createResult.success) {
      assert(statusResult.data.subscription_status.flexible_subscriptions >= 1,
             'Has flexible subscriptions', '>= 1', statusResult.data.subscription_status.flexible_subscriptions);
    }

  } catch (error) {
    console.error('Service integration test error:', error);
    assert(false, 'Service integration', 'no errors', error.message);
  }
};

// ====================
// API HANDLER TESTS
// ====================

const testApiHandlers = async () => {
  logTestSection('API Handler Tests');

  try {
    // Test 1: Validate payment amount API
    const validationRequest = { amount: 200 };
    const validationResult = await apiHandlers.validatePaymentAmount({ body: validationRequest });

    assert(validationResult.success, 'API amount validation', true, validationResult.success);
    assert(validationResult.data.validation.isValid, 'API validation result', true, validationResult.data.validation.isValid);

    // Test 2: Get payment options API
    const optionsRequest = { member_id: 1 };
    const optionsResult = await apiHandlers.getPaymentOptions({ params: optionsRequest });

    assert(optionsResult.success, 'API payment options', true, optionsResult.success);
    assert(optionsResult.data.minimum_amount === 50, 'API minimum amount', 50, optionsResult.data.minimum_amount);

    // Test 3: Validate bulk amounts API
    const bulkRequest = { amounts: [50, 100, 75, 200] };
    const bulkResult = await apiHandlers.validateBulkAmounts({ body: bulkRequest });

    assert(bulkResult.success, 'API bulk validation', true, bulkResult.success);
    assert(bulkResult.data.total_amounts === 4, 'API bulk total', 4, bulkResult.data.total_amounts);

  } catch (error) {
    console.error('API handler test error:', error);
    assert(false, 'API handlers', 'no errors', error.message);
  }
};

// ====================
// BUSINESS RULES TESTS
// ====================

const testBusinessRules = () => {
  logTestSection('Business Rules Tests');

  // Test 1: Minimum amount rule
  assert(PaymentValidationService.MIN_AMOUNT === 50, 'Minimum amount is 50 SAR', 50, PaymentValidationService.MIN_AMOUNT);

  // Test 2: Multiple rule
  assert(PaymentValidationService.AMOUNT_MULTIPLE === 50, 'Amount multiple is 50', 50, PaymentValidationService.AMOUNT_MULTIPLE);

  // Test 3: Currency rule
  assert(PaymentValidationService.CURRENCY === 'SAR', 'Currency is SAR', 'SAR', PaymentValidationService.CURRENCY);

  // Test 4: Duration types
  const durations = PaymentValidationService.DURATION_TYPES;
  assert(durations.monthly.months === 1, 'Monthly duration', 1, durations.monthly.months);
  assert(durations.yearly.months === 12, 'Yearly duration', 12, durations.yearly.months);
  assert(durations.lifetime.months === -1, 'Lifetime duration', -1, durations.lifetime.months);

  // Test 5: Payment method rules
  const paymentMethods = PaymentValidationService.getPaymentMethodRules();
  assert(paymentMethods.supported_methods.length >= 3, 'Minimum payment methods', '>=3', paymentMethods.supported_methods.length);
  assert(paymentMethods.default_method === 'credit_card', 'Default payment method', 'credit_card', paymentMethods.default_method);
};

// ====================
// EDGE CASES TESTS
// ====================

const testEdgeCases = () => {
  logTestSection('Edge Cases Tests');

  // Test 1: Very large amounts
  const largeAmount = PaymentValidationService.validateSubscriptionAmount(100000);
  assert(largeAmount.isValid, 'Large valid amount', true, largeAmount.isValid);

  // Test 2: Floating point precision
  const preciseAmount = PaymentValidationService.validateSubscriptionAmount(150.00);
  assert(preciseAmount.isValid, 'Precise decimal amount', true, preciseAmount.isValid);

  // Test 3: Negative amounts
  const negativeAmount = PaymentValidationService.validateSubscriptionAmount(-100);
  assert(!negativeAmount.isValid, 'Negative amount invalid', false, negativeAmount.isValid);

  // Test 4: Zero amount
  const zeroAmount = PaymentValidationService.validateSubscriptionAmount(0);
  assert(!zeroAmount.isValid, 'Zero amount invalid', false, zeroAmount.isValid);

  // Test 5: Empty suggestions
  const suggestions = PaymentValidationService.getQuickAmountSuggestions();
  assert(suggestions.length > 0, 'Has amount suggestions', '>0', suggestions.length > 0 ? '>0' : '0');
  assert(suggestions[0].amount === 50, 'First suggestion is minimum', 50, suggestions[0].amount);
};

// ====================
// MAIN TEST RUNNER
// ====================

export const runAllTests = async () => {
  console.log('🚀 Starting Flexible Payment System Tests');
  console.log('='.repeat(60));

  const startTime = Date.now();

  // Run all test suites
  testPaymentValidation();
  testSubscriptionCalculation();
  testAmountFormatting();
  testUpgradeValidation();
  testProrationCalculation();
  testBulkValidation();
  testBusinessRules();
  testEdgeCases();

  // Async tests
  await testServiceIntegration();
  await testApiHandlers();

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Generate test summary
  console.log('\n📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);

  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.details
      .filter(test => test.status === 'FAILED')
      .forEach(test => {
        console.log(`  - ${test.test}: ${test.error}`);
      });
  }

  // Overall result
  const success = testResults.failed === 0;
  console.log(`\n${success ? '🎉' : '💥'} Overall Result: ${success ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  return {
    success,
    results: testResults,
    duration
  };
};

// ====================
// MANUAL TEST DATA
// ====================

export const getTestData = () => {
  return {
    validAmounts: [50, 100, 150, 200, 250, 500, 1000, 2500, 5000],
    invalidAmounts: [25, 49, 51, 75, 99, 125, 175, 999],
    testSubscriptions: [
      {
        member_id: 1,
        amount: 50,
        duration: 'monthly',
        payment_method: 'credit_card',
        expected: 'should create basic flexible subscription'
      },
      {
        member_id: 2,
        amount: 200,
        duration: 'monthly',
        payment_method: 'bank_transfer',
        expected: 'should create premium flexible subscription'
      },
      {
        member_id: 3,
        amount: 1000,
        duration: 'yearly',
        payment_method: 'credit_card',
        expected: 'should create yearly flexible subscription'
      },
      {
        member_id: 4,
        amount: 5000,
        duration: 'lifetime',
        payment_method: 'bank_transfer',
        expected: 'should create lifetime flexible subscription'
      }
    ],
    apiEndpoints: [
      'POST /api/subscriptions/flexible/validate-amount',
      'POST /api/subscriptions/flexible/create',
      'PUT /api/subscriptions/flexible/:id/amount',
      'GET /api/subscriptions/flexible/payment-options/:memberId',
      'POST /api/subscriptions/flexible/validate-upgrade',
      'POST /api/subscriptions/flexible/calculate-proration',
      'POST /api/subscriptions/flexible/validate-bulk',
      'GET /api/subscriptions/flexible/member/:id/status'
    ]
  };
};

export default {
  runAllTests,
  getTestData,
  testResults
};