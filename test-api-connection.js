
// Test API Connectivity
const https = require('https');
const http = require('http');

async function testAPI() {
  console.log('\n📊 Testing API Connectivity...');
  console.log('=' . repeat(60));

  const endpoints = [
    { name: 'Health Check', url: 'https://proshael.onrender.com/api/health' },
    { name: 'Members List', url: 'https://proshael.onrender.com/api/members?limit=1' },
    { name: 'Member Stats', url: 'https://proshael.onrender.com/api/members/statistics' },
    { name: 'Dashboard Stats', url: 'https://proshael.onrender.com/api/dashboard/stats' }
  ];

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint.name, endpoint.url);
  }
}

function testEndpoint(name, url) {
  return new Promise((resolve) => {
    console.log(`\n Testing: ${name}`);
    console.log(` URL: ${url}`);

    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(` ✅ SUCCESS - Status: ${res.statusCode}`);
          try {
            const json = JSON.parse(data);
            if (json.data && Array.isArray(json.data)) {
              console.log(`   Found ${json.data.length} records`);
            }
          } catch (e) {}
        } else {
          console.log(` ❌ FAILED - Status: ${res.statusCode}`);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(` ❌ ERROR: ${err.message}`);
      resolve();
    });
  });
}

testAPI();
