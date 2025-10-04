// Test member endpoints with authentication
const API_URL = 'https://proshael.onrender.com';

async function testMemberEndpoints() {
  console.log('🔐 Testing Member Endpoints');
  console.log('=' .repeat(50));

  // Step 1: Login to get token
  console.log('\n1️⃣ Logging in...');
  const loginResponse = await fetch(`${API_URL}/api/auth/mobile-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '0555555555',
      password: '123456'
    })
  });

  const loginData = await loginResponse.json();
  console.log('Login response:', {
    success: loginResponse.ok,
    hasToken: !!loginData.token,
    user: loginData.user
  });

  if (!loginData.token) {
    console.error('❌ No token received');
    return;
  }

  const token = loginData.token;

  // Step 2: Test member profile endpoint
  console.log('\n2️⃣ Testing /api/member/profile...');
  const profileResponse = await fetch(`${API_URL}/api/member/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Profile response:', {
    status: profileResponse.status,
    ok: profileResponse.ok
  });

  if (profileResponse.ok) {
    const profileData = await profileResponse.json();
    console.log('Profile data:', profileData);
  } else {
    const errorData = await profileResponse.text();
    console.error('Profile error:', errorData);
  }

  // Step 3: Test member balance endpoint
  console.log('\n3️⃣ Testing /api/member/balance...');
  const balanceResponse = await fetch(`${API_URL}/api/member/balance`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Balance response:', {
    status: balanceResponse.status,
    ok: balanceResponse.ok
  });

  if (balanceResponse.ok) {
    const balanceData = await balanceResponse.json();
    console.log('Balance data:', balanceData);
  } else {
    const errorData = await balanceResponse.text();
    console.error('Balance error:', errorData);
  }

  // Step 4: Test payment submission
  console.log('\n4️⃣ Testing payment submission...');
  const paymentResponse = await fetch(`${API_URL}/api/member/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: 500,
      notes: 'دفعة اختبارية',
      receipt_url: null,
      on_behalf_of: null
    })
  });

  console.log('Payment response:', {
    status: paymentResponse.status,
    ok: paymentResponse.ok
  });

  if (paymentResponse.ok) {
    const paymentData = await paymentResponse.json();
    console.log('Payment created:', paymentData);
  } else {
    const errorData = await paymentResponse.text();
    console.error('Payment error:', errorData);
  }
}

console.log('Starting test at:', new Date().toISOString());
testMemberEndpoints().then(() => {
  console.log('\n' + '=' .repeat(50));
  console.log('Test completed');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});