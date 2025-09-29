// Test script to debug dashboard authentication issue
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5001/api';

async function testDashboardAuth() {
  try {
    console.log('=== Testing Dashboard Authentication ===\n');

    // Step 1: Login
    console.log('1. Testing login...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@alshuail.com',
        password: 'Admin123!'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', {
      status: loginResponse.status,
      success: loginData.success,
      hasToken: !!loginData.token,
      user: loginData.user,
      error: loginData.error
    });

    if (!loginData.token) {
      console.error('❌ Login failed - no token received');
      return;
    }

    const token = loginData.token;

    // Decode token to see payload (without verification)
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('\nToken payload:', payload);
    }

    // Step 2: Test dashboard stats endpoint
    console.log('\n2. Testing dashboard/stats endpoint...');
    const dashboardResponse = await fetch(`${API_URL}/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const dashboardData = await dashboardResponse.json();
    console.log('Dashboard response:', {
      status: dashboardResponse.status,
      success: dashboardData.success,
      error: dashboardData.error,
      message: dashboardData.message,
      debug: dashboardData.debug
    });

    if (dashboardResponse.status === 200) {
      console.log('✅ Dashboard authentication working!');
      console.log('Data received:', {
        hasMembers: !!dashboardData.data?.members,
        hasPayments: !!dashboardData.data?.payments,
        hasSubscriptions: !!dashboardData.data?.subscriptions,
        hasActivities: !!dashboardData.data?.activities
      });
    } else {
      console.error('❌ Dashboard authentication failed');
      console.error('Error details:', dashboardData);
    }

    // Step 3: Test member monitoring endpoint
    console.log('\n3. Testing member-monitoring endpoint...');
    const monitoringResponse = await fetch(`${API_URL}/member-monitoring`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const monitoringData = await monitoringResponse.json();
    console.log('Member monitoring response:', {
      status: monitoringResponse.status,
      success: monitoringData.success,
      error: monitoringData.error,
      message: monitoringData.message
    });

  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testDashboardAuth();