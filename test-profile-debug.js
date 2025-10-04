/**
 * Debug test for Profile endpoint issue
 */

const API_BASE_URL = 'https://proshael.onrender.com';

async function debugProfileEndpoint() {
  console.log('=== DEBUGGING PROFILE ENDPOINT ===\n');

  // Step 1: Login
  console.log('1. Logging in...');
  const loginResponse = await fetch(`${API_BASE_URL}/api/auth/mobile-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '0555555555', password: '123456' })
  });

  const loginData = await loginResponse.json();
  const token = loginData.token;
  console.log('   ✓ Token received:', token ? 'Yes' : 'No');
  console.log('   User ID:', loginData.user?.id);
  console.log('   User Role:', loginData.user?.role);

  // Step 2: Test Profile with different approaches
  console.log('\n2. Testing Profile endpoint...');

  // Test A: Direct profile call
  console.log('   A. Testing /api/member/profile');
  const profileResponse = await fetch(`${API_BASE_URL}/api/member/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('      Status:', profileResponse.status);
  console.log('      Status Text:', profileResponse.statusText);

  if (profileResponse.status !== 200) {
    const errorText = await profileResponse.text();
    console.log('      Error:', errorText);
  } else {
    const profileData = await profileResponse.json();
    console.log('      Success! Data:', JSON.stringify(profileData, null, 2));
  }

  // Test B: Try members endpoint (plural)
  console.log('\n   B. Testing /api/members/:id endpoint');
  const membersResponse = await fetch(`${API_BASE_URL}/api/members/${loginData.user?.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('      Status:', membersResponse.status);

  if (membersResponse.status === 200) {
    const data = await membersResponse.json();
    console.log('      Success! Found member data via /api/members/:id');
  }

  // Test C: Balance endpoint (for comparison)
  console.log('\n   C. Testing /api/member/balance (for comparison)');
  const balanceResponse = await fetch(`${API_BASE_URL}/api/member/balance`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('      Status:', balanceResponse.status);

  // Step 3: Diagnosis
  console.log('\n=== DIAGNOSIS ===');
  if (profileResponse.status === 401) {
    console.log('❌ Profile endpoint returns 401 Unauthorized');
    console.log('   Possible causes:');
    console.log('   - The authenticate middleware is not reading the user ID correctly');
    console.log('   - The member record might not exist in the database');
    console.log('   - There might be a mismatch between user.id and members.id');
  } else if (profileResponse.status === 404) {
    console.log('⚠ Profile endpoint returns 404 Not Found');
    console.log('   The member record doesn\'t exist in the database');
  } else if (profileResponse.status === 200) {
    console.log('✅ Profile endpoint is working correctly!');
  }

  console.log('\n=== RECOMMENDATION ===');
  if (profileResponse.status !== 200 && balanceResponse.status === 200) {
    console.log('The issue is specific to the profile endpoint.');
    console.log('Quick fix: Check if req.user.id matches the members table ID');
  }
}

debugProfileEndpoint().catch(console.error);