const http = require('http');

const postData = JSON.stringify({
  full_name: 'Super Admin',
  email: 'superadmin@alshuail.org',
  password: 'Admin@2024',
  phone: '0501234567',
  role: 'super_admin'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.success || res.statusCode === 200) {
        console.log('✅ Admin account created successfully');
        console.log('Email: superadmin@alshuail.org');
        console.log('Password: Admin@2024');
      } else if (res.statusCode === 409 || (response.error && response.error.includes('already exists'))) {
        console.log('ℹ️ Admin account already exists');
      } else {
        console.log('❌ Failed to create admin:', response.error || data);
      }
    } catch (error) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error creating admin account:', error.message);
});

req.write(postData);
req.end();