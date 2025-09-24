const https = require('http');

async function testAPIEndpoints() {
  console.log('🔄 Testing Al-Shuail API Endpoints...\n');

  // Test backend server health
  console.log('1. Testing backend server health...');
  try {
    const healthResponse = await makeRequest('GET', 'http://localhost:5001/health');
    console.log('✅ Backend server is running:', healthResponse.status);
  } catch (error) {
    console.log('❌ Backend server error:', error.message);
  }

  // Test mobile login endpoint with test credentials
  console.log('\n2. Testing mobile login endpoint...');
  try {
    const loginData = {
      phone: '0501234567',
      password: 'password123'
    };

    const loginResponse = await makeRequest('POST', 'http://localhost:5001/api/auth/mobile-login', loginData);
    console.log('✅ Mobile login response:', loginResponse.status);
    console.log('   Response body:', loginResponse.body);
  } catch (error) {
    console.log('❌ Mobile login error:', error.message);
    console.log('   This is expected if backend doesn\'t have mobile-login endpoint');
  }

  // Test regular login endpoint
  console.log('\n3. Testing regular login endpoint...');
  try {
    const loginData = {
      email: 'admin@alshuail.com',
      password: 'password123'
    };

    const loginResponse = await makeRequest('POST', 'http://localhost:5001/api/auth/login', loginData);
    console.log('✅ Regular login response:', loginResponse.status);
  } catch (error) {
    console.log('❌ Regular login error:', error.message);
  }

  // Test frontend server
  console.log('\n4. Testing frontend server...');
  try {
    const frontendResponse = await makeRequest('GET', 'http://localhost:3002/');
    console.log('✅ Frontend server is running:', frontendResponse.status);
  } catch (error) {
    console.log('❌ Frontend server error:', error.message);
  }

  // Test PWA routes
  console.log('\n5. Testing PWA route...');
  try {
    const pwaResponse = await makeRequest('GET', 'http://localhost:3002/pwa/login');
    console.log('✅ PWA login route is accessible:', pwaResponse.status);
  } catch (error) {
    console.log('❌ PWA route error:', error.message);
  }

  console.log('\n🎉 API endpoint testing complete!\n');
}

function makeRequest(method, url, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PWA-Test-Client/1.0'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.setTimeout(5000);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

testAPIEndpoints().catch(console.error);