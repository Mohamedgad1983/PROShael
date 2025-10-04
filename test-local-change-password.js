// Test if change-password endpoint exists locally
const API_URL = 'http://localhost:3001';

async function testLocalChangePassword() {
  console.log('🔐 Testing LOCAL Change Password Endpoint');
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
  console.log('\nTesting LOCAL /api/auth/change-password endpoint...');

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
  const data = await changeResponse.json();
  console.log('Response:', data);

  if (changeResponse.ok && data.success) {
    console.log('✅ LOCAL endpoint works! Password changed successfully');
  } else {
    console.log('❌ Error:', data.message || data.error);
  }
}

testLocalChangePassword().catch(console.error);