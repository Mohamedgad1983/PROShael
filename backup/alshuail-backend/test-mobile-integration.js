#!/usr/bin/env node

/**
 * Mobile Backend Integration Test
 * Tests all critical mobile endpoints
 */

const API_BASE_URL = 'http://localhost:3001/api';
let memberToken = null;

// Test data
const testMember = {
  phone: '0559876543',
  password: '45448D'
};

const testPaymentData = {
  initiative: {
    initiative_id: 'test-init-123',
    amount: 100,
    notes: 'Test initiative payment'
  },
  diya: {
    diya_id: 'test-diya-123',
    amount: 500,
    notes: 'Test diya payment'
  },
  subscription: {
    amount: 200,
    subscription_period: 'monthly',
    notes: 'Test subscription payment'
  },
  forMember: {
    beneficiary_id: '8759bbc1-90cc-4943-a962-6925b7582ffb',
    amount: 150,
    payment_category: 'general',
    notes: 'Test payment for another member'
  }
};

console.log('🚀 Starting Al-Shuail Mobile Backend Integration Tests...\n');

async function makeRequest(method, endpoint, data = null, token = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...(data && { body: JSON.stringify(data) })
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    return {
      status: response.status,
      success: response.ok,
      data: result
    };
  } catch (error) {
    return {
      status: 0,
      success: false,
      error: error.message
    };
  }
}

async function testHealthCheck() {
  console.log('1️⃣  Testing Health Check...');
  const result = await makeRequest('GET', '/health');

  if (result.success) {
    console.log('✅ Health check passed');
    console.log(`   Service: ${result.data.service}`);
  } else {
    console.log('❌ Health check failed');
    console.log(`   Error: ${result.error || result.data.error}`);
  }
  console.log('');
}

async function testMemberLogin() {
  console.log('2️⃣  Testing Member Login...');
  const result = await makeRequest('POST', '/auth/member-login', testMember);

  if (result.success && result.data.token) {
    memberToken = result.data.token;
    console.log('✅ Member login successful');
    console.log(`   Member: ${result.data.member.full_name}`);
    console.log(`   Token: ${memberToken.substring(0, 20)}...`);
  } else {
    console.log('❌ Member login failed');
    console.log(`   Error: ${result.data.error}`);

    // For testing - create mock token if login fails
    console.log('📝 Note: Using mock token for testing purposes');
    memberToken = 'mock-token-for-testing';
  }
  console.log('');
}

async function testMemberProfile() {
  console.log('3️⃣  Testing Member Profile...');
  const result = await makeRequest('GET', '/members/mobile/profile', null, memberToken);

  if (result.success) {
    console.log('✅ Profile fetch successful');
    console.log(`   Member ID: ${result.data?.id || 'N/A'}`);
    console.log(`   Phone: ${result.data?.phone || 'N/A'}`);
    console.log(`   Name: ${result.data?.full_name || 'N/A'}`);
  } else {
    console.log('❌ Profile fetch failed');
    console.log(`   Error: ${result.data.error}`);
  }
  console.log('');
}

async function testMemberBalance() {
  console.log('4️⃣  Testing Member Balance...');
  const result = await makeRequest('GET', '/members/mobile/balance', null, memberToken);

  if (result.success) {
    console.log('✅ Balance fetch successful');
    console.log(`   Current Balance: ${result.data.current_balance} SAR`);
    console.log(`   Minimum Balance: ${result.data.minimum_balance} SAR`);
  } else {
    console.log('❌ Balance fetch failed');
    console.log(`   Error: ${result.data.error}`);
  }
  console.log('');
}

async function testMemberTransactions() {
  console.log('5️⃣  Testing Member Transactions...');
  const result = await makeRequest('GET', '/members/mobile/transactions', null, memberToken);

  if (result.success) {
    console.log('✅ Transactions fetch successful');
    console.log(`   Total Transactions: ${result.data.length}`);
  } else {
    console.log('❌ Transactions fetch failed');
    console.log(`   Error: ${result.data.error}`);
  }
  console.log('');
}

async function testPaymentEndpoints() {
  console.log('6️⃣  Testing Payment Endpoints...');

  // Test Initiative Payment
  console.log('   📋 Testing Initiative Payment...');
  const initiativeResult = await makeRequest('POST', '/payments/mobile/initiative', testPaymentData.initiative, memberToken);

  if (initiativeResult.success) {
    console.log('   ✅ Initiative payment created');
    console.log(`      Reference: ${initiativeResult.data.reference_number}`);
  } else {
    console.log('   ❌ Initiative payment failed');
    console.log(`      Error: ${initiativeResult.data.error}`);
  }

  // Test Diya Payment
  console.log('   📋 Testing Diya Payment...');
  const diyaResult = await makeRequest('POST', '/payments/mobile/diya', testPaymentData.diya, memberToken);

  if (diyaResult.success) {
    console.log('   ✅ Diya payment created');
    console.log(`      Reference: ${diyaResult.data.reference_number}`);
  } else {
    console.log('   ❌ Diya payment failed');
    console.log(`      Error: ${diyaResult.data.error}`);
  }

  // Test Subscription Payment
  console.log('   📋 Testing Subscription Payment...');
  const subscriptionResult = await makeRequest('POST', '/payments/mobile/subscription', testPaymentData.subscription, memberToken);

  if (subscriptionResult.success) {
    console.log('   ✅ Subscription payment created');
    console.log(`      Reference: ${subscriptionResult.data.reference_number}`);
  } else {
    console.log('   ❌ Subscription payment failed');
    console.log(`      Error: ${subscriptionResult.data.error}`);
  }

  // Test Payment for Another Member
  console.log('   📋 Testing Payment for Another Member...');
  const forMemberResult = await makeRequest('POST', '/payments/mobile/for-member', testPaymentData.forMember, memberToken);

  if (forMemberResult.success) {
    console.log('   ✅ Payment for member created');
    console.log(`      Reference: ${forMemberResult.data.reference_number}`);
    console.log(`      Beneficiary: ${forMemberResult.data.beneficiary_name}`);
  } else {
    console.log('   ❌ Payment for member failed');
    console.log(`      Error: ${forMemberResult.data.error}`);
  }
  console.log('');
}

async function testMemberNotifications() {
  console.log('7️⃣  Testing Member Notifications...');
  const result = await makeRequest('GET', '/members/mobile/notifications', null, memberToken);

  if (result.success) {
    console.log('✅ Notifications fetch successful');
    console.log(`   Total Notifications: ${result.data.length}`);
  } else {
    console.log('❌ Notifications fetch failed');
    console.log(`   Error: ${result.data.error}`);
  }
  console.log('');
}

async function runAllTests() {
  try {
    await testHealthCheck();
    await testMemberLogin();
    await testMemberProfile();
    await testMemberBalance();
    await testMemberTransactions();
    await testPaymentEndpoints();
    await testMemberNotifications();

    console.log('🎉 Mobile Backend Integration Tests Completed!');
    console.log('');
    console.log('📱 Mobile App Endpoints Available:');
    console.log('   POST /api/auth/member-login');
    console.log('   GET  /api/members/mobile/profile');
    console.log('   GET  /api/members/mobile/balance');
    console.log('   GET  /api/members/mobile/transactions');
    console.log('   GET  /api/members/mobile/notifications');
    console.log('   PUT  /api/members/mobile/profile');
    console.log('   POST /api/payments/mobile/initiative');
    console.log('   POST /api/payments/mobile/diya');
    console.log('   POST /api/payments/mobile/subscription');
    console.log('   POST /api/payments/mobile/for-member');
    console.log('   POST /api/payments/mobile/upload-receipt/:paymentId');

  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ fetch API not available. Please use Node.js 18+ or install node-fetch');
  console.log('   To install node-fetch: npm install node-fetch');
  process.exit(1);
}

runAllTests();