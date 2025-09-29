import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyOGJkODU1LTJjYzQtNDJhYy1hMmM2LWEzOTJkNzNhYTJlOCIsInVzZXJfaWQiOiI2MjhiZDg1NS0yY2M0LTQyYWMtYTJjNi1hMzkyZDczYWEyZTgiLCJlbWFpbCI6ImFkbWluQGFsc2h1YWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1OTEzMjU0MiwiZXhwIjoxNzU5NzM3MzQyfQ.d_sgUVqbqjoPgeOYu0Ofz0V8rFCAoD11iA9oZN1DPpw';

async function testDashboardAPI() {
  console.log('🧪 Testing Dashboard API Endpoint...\n');
  console.log('═══════════════════════════════════════');

  try {
    // Test 1: Health check
    console.log('\n📍 Test 1: Health Check');
    const healthRes = await fetch(`${API_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log('   Status:', healthRes.status);
    console.log('   Response:', JSON.stringify(healthData, null, 2));

    // Test 2: Dashboard stats without token
    console.log('\n📍 Test 2: Dashboard Stats (No Token)');
    const noTokenRes = await fetch(`${API_URL}/api/dashboard/stats`);
    const noTokenData = await noTokenRes.json();
    console.log('   Status:', noTokenRes.status);
    console.log('   Expected: 401 Unauthorized');
    console.log('   Response:', JSON.stringify(noTokenData, null, 2));

    // Test 3: Dashboard stats with token
    console.log('\n📍 Test 3: Dashboard Stats (With Token)');
    const dashboardRes = await fetch(`${API_URL}/api/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    const dashboardData = await dashboardRes.json();
    console.log('   Status:', dashboardRes.status);
    console.log('   Success:', dashboardData.success);

    if (dashboardData.success && dashboardData.data) {
      console.log('\n   ✅ Data Structure:');
      console.log('   - Members:', dashboardData.data.members ? '✓' : '✗');
      console.log('   - Payments:', dashboardData.data.payments ? '✓' : '✗');
      console.log('   - Subscriptions:', dashboardData.data.subscriptions ? '✓' : '✗');
      console.log('   - Activities:', dashboardData.data.activities ? '✓' : '✗');

      if (dashboardData.data.members) {
        console.log('\n   📊 Members Stats:');
        console.log('     Total:', dashboardData.data.members.total);
        console.log('     Active:', dashboardData.data.members.active);
        console.log('     Inactive:', dashboardData.data.members.inactive);
      }
    } else {
      console.log('\n   ❌ Error:', dashboardData.error || 'Unknown error');
    }

    // Test 4: Test endpoint
    console.log('\n📍 Test 4: Test Endpoint');
    const testRes = await fetch(`${API_URL}/api/test`);
    const testData = await testRes.json();
    console.log('   Status:', testRes.status);
    console.log('   Response:', JSON.stringify(testData, null, 2));

    console.log('\n═══════════════════════════════════════');
    console.log('✅ Dashboard API Test Complete!');

    if (dashboardRes.status === 200 && dashboardData.success) {
      console.log('\n🎉 SUCCESS: Dashboard API is working properly!');
    } else {
      console.log('\n⚠️  WARNING: Dashboard API returned unexpected response');
    }

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error('   Details:', error);
  }
}

// Run the test
testDashboardAPI();