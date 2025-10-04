// Test Password Change Flow in Production
const API_URL = 'https://proshael.onrender.com';

async function testPasswordChangeFlow() {
  console.log('🔐 Testing Password Change Flow in Production');
  console.log('=' .repeat(50));

  // Test credentials
  const phone = '0555555555';
  const tempPassword = '123456';
  const newPassword = 'password123'; // Simple 8+ char password

  try {
    // Step 1: Login with temp password
    console.log('\n📱 Step 1: Login with temporary password...');
    const loginResponse = await fetch(`${API_URL}/api/auth/mobile-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password: tempPassword })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', {
      success: loginResponse.ok,
      requires_password_change: loginData.requires_password_change,
      is_first_login: loginData.is_first_login,
      token: loginData.token ? '✅ Token received' : '❌ No token'
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginData.message}`);
    }

    const token = loginData.token;

    // Check if password change is required
    if (loginData.requires_password_change || loginData.is_first_login) {
      console.log('\n🔄 Password change required - proceeding...');

      // Step 2: Change password
      console.log('\n🔑 Step 2: Changing password...');
      const changeResponse = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: tempPassword,
          new_password: newPassword
        })
      });

      const changeData = await changeResponse.json();
      console.log('Change password response:', {
        success: changeResponse.ok,
        status: changeResponse.status,
        message: changeData.message || changeData.message_ar
      });

      if (!changeResponse.ok) {
        throw new Error(`Password change failed: ${changeData.message}`);
      }

      // Step 3: Login with new password
      console.log('\n🔓 Step 3: Login with new password...');
      const newLoginResponse = await fetch(`${API_URL}/api/auth/mobile-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password: newPassword })
      });

      const newLoginData = await newLoginResponse.json();
      console.log('New login response:', {
        success: newLoginResponse.ok,
        requires_password_change: newLoginData.requires_password_change,
        is_first_login: newLoginData.is_first_login,
        can_access_dashboard: !newLoginData.requires_password_change && !newLoginData.is_first_login
      });

      if (!newLoginResponse.ok) {
        throw new Error(`Login with new password failed: ${newLoginData.message}`);
      }

      if (newLoginData.requires_password_change || newLoginData.is_first_login) {
        console.log('⚠️ Password change still required - something went wrong');
        return false;
      }

      console.log('\n✅ Password change flow completed successfully!');
      console.log('User can now access the dashboard without password change requirement');
      return true;

    } else {
      console.log('\n✅ User can directly access dashboard (no password change required)');
      return true;
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
console.log('Starting test at:', new Date().toISOString());
testPasswordChangeFlow().then(success => {
  console.log('\n' + '=' .repeat(50));
  console.log('Test Result:', success ? '✅ PASSED' : '❌ FAILED');
  process.exit(success ? 0 : 1);
});