// Test if change-password endpoint exists
const API_URL = 'https://proshael.onrender.com';

async function testChangePasswordEndpoint() {
  console.log('🔐 Testing Change Password Endpoint');
  console.log('=' .repeat(50));

  // First login to get token
  const loginResponse = await fetch(`${API_URL}/api/auth/mobile-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '0555555555',
      password: '123456'
    })
  });

  const loginData = await loginResponse.json();
  const token = loginData.token;

  console.log('✅ Login successful, got token');

  // Now test change password endpoint
  console.log('\nTesting /api/auth/change-password endpoint...');

  const changeResponse = await fetch(`${API_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      current_password: '123456',
      new_password: 'moh303030'
    })
  });

  console.log('Response status:', changeResponse.status);
  console.log('Response type:', changeResponse.headers.get('content-type'));

  const responseText = await changeResponse.text();

  if (responseText.startsWith('<!DOCTYPE') || responseText.includes('<html>')) {
    console.log('❌ ERROR: Endpoint returning HTML instead of JSON');
    console.log('This usually means the endpoint doesn\'t exist (404)');
    console.log('First 200 chars:', responseText.substring(0, 200));
  } else {
    try {
      const data = JSON.parse(responseText);
      console.log('✅ Response is valid JSON:', data);
    } catch (e) {
      console.log('❌ Invalid response:', responseText);
    }
  }
}

testChangePasswordEndpoint().catch(console.error);