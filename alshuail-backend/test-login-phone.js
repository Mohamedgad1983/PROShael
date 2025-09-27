import fetch from 'node-fetch';

async function testLogin() {
  const url = 'http://localhost:3001/api/auth/login';

  const credentials = {
    phone: '+96550123456',
    password: '123456',
    role: 'super_admin'
  };

  console.log('🔄 Testing login with phone-based authentication...');
  console.log('URL:', url);
  console.log('Credentials:', {
    phone: credentials.phone,
    password: '******',
    role: credentials.role
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();

    console.log('\n📡 Response Status:', response.status);
    console.log('📦 Response Data:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ LOGIN SUCCESSFUL!');
      console.log('User:', data.user);
      console.log('Token (first 20 chars):', data.token?.substring(0, 20) + '...');
    } else {
      console.log('\n❌ LOGIN FAILED');
      console.log('Error:', data.error || data.message);
    }
  } catch (error) {
    console.error('\n❌ Connection Error:', error.message);
    console.log('Make sure the backend server is running on http://localhost:3001');
  }
}

testLogin();