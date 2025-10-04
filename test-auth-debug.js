const fetch = require('node-fetch');

const API_URL = 'https://proshael.onrender.com';

async function testAuth() {
  console.log('Testing authentication endpoints...\n');

  // Test 1: Health check
  console.log('1. Health Check:');
  try {
    const healthRes = await fetch(`${API_URL}/api/health`);
    const health = await healthRes.json();
    console.log('   Status:', health.status);
    console.log('   Environment:', health.environment);
    console.log('   Uptime:', Math.floor(health.uptime / 60), 'minutes\n');
  } catch (error) {
    console.log('   Error:', error.message, '\n');
  }

  // Test 2: Member login with test credentials
  console.log('2. Member Login (0555555555 / 123456):');
  try {
    const res = await fetch(`${API_URL}/api/auth/member-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '0555555555',
        password: '123456'
      })
    });
    const data = await res.json();
    console.log('   Response:', JSON.stringify(data, null, 2), '\n');
  } catch (error) {
    console.log('   Error:', error.message, '\n');
  }

  // Test 3: Member login with TestMember password
  console.log('3. Member Login (0555555555 / TestMember123!):');
  try {
    const res = await fetch(`${API_URL}/api/auth/member-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '0555555555',
        password: 'TestMember123!'
      })
    });
    const data = await res.json();
    console.log('   Response:', JSON.stringify(data, null, 2), '\n');
  } catch (error) {
    console.log('   Error:', error.message, '\n');
  }

  // Test 4: Admin login
  console.log('4. Admin Login (admin@alshuail.com / Admin@123456):');
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@alshuail.com',
        password: 'Admin@123456'
      })
    });
    const data = await res.json();
    console.log('   Response:', JSON.stringify(data, null, 2), '\n');
  } catch (error) {
    console.log('   Error:', error.message, '\n');
  }
}

testAuth().catch(console.error);