// Test password change requirement is now enforced
const API_URL = 'http://localhost:3001'; // Test locally first

async function testPasswordChangeRequirement() {
  console.log('🔐 Testing Password Change Requirement');
  console.log('=' .repeat(50));

  // First ensure the member requires password change
  console.log('\n1️⃣ Checking member in database...');
  // We already set requires_password_change = true for 0555555555

  // Now test login
  console.log('\n2️⃣ Testing login with temp password (123456)...');
  const response = await fetch(`${API_URL}/api/auth/mobile-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '0555555555',
      password: '123456'
    })
  });

  const data = await response.json();

  console.log('\nLogin Response:');
  console.log('- Success:', data.success);
  console.log('- Has token:', !!data.token);
  console.log('- requires_password_change:', data.requires_password_change);
  console.log('- is_first_login:', data.is_first_login);

  console.log('\n' + '=' .repeat(50));

  if (data.requires_password_change || data.is_first_login) {
    console.log('✅ SUCCESS: Password change is REQUIRED!');
    console.log('User will be redirected to change password page');
  } else {
    console.log('❌ FAILURE: Password change is NOT required');
    console.log('This is a bug - user with temp password should be forced to change it');
  }

  return data.requires_password_change || data.is_first_login;
}

testPasswordChangeRequirement()
  .then(required => {
    process.exit(required ? 0 : 1);
  })
  .catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
  });