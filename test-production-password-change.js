// Test if production now enforces password change
const API_URL = 'https://proshael.onrender.com';

async function testProductionPasswordChange() {
  console.log('🔐 Testing Production Password Change Requirement');
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

  console.log('\nProduction Login Response:');
  console.log('- Success:', data.success);
  console.log('- requires_password_change:', data.requires_password_change);
  console.log('- is_first_login:', data.is_first_login);

  console.log('\n' + '=' .repeat(50));

  if (data.requires_password_change || data.is_first_login) {
    console.log('✅ PRODUCTION FIXED: Password change is now REQUIRED!');
    console.log('Users will be redirected to /mobile/change-password');
    return true;
  } else {
    console.log('⏳ PRODUCTION PENDING: Still waiting for deployment...');
    console.log('Render deployment typically takes 5-10 minutes');
    return false;
  }
}

testProductionPasswordChange()
  .then(fixed => {
    if (!fixed) {
      console.log('\nPlease wait a few more minutes and test again.');
    }
    process.exit(fixed ? 0 : 1);
  })
  .catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
  });