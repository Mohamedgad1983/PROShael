// Test what login endpoint returns
const API_URL = 'https://proshael.onrender.com';

async function testLoginResponse() {
  console.log('🔐 Testing Login Response');
  console.log('=' .repeat(50));

  const response = await fetch(`${API_URL}/api/auth/mobile-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '0555555555',
      password: '123456'
    })
  });

  const data = await response.json();
  console.log('\nFull Login Response:');
  console.log(JSON.stringify(data, null, 2));

  console.log('\n' + '=' .repeat(50));
  console.log('Key Fields:');
  console.log('- requires_password_change:', data.requires_password_change);
  console.log('- is_first_login:', data.is_first_login);
  console.log('- Should redirect to password change?', data.requires_password_change || data.is_first_login);
}

testLoginResponse().catch(console.error);