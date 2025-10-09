// Comprehensive API Testing Script for Al-Shuail Backend
const https = require('https');
const http = require('http');

const API_BASE_URL = 'https://proshael.onrender.com';
const LOCAL_API_URL = 'http://localhost:3001';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to make HTTP/HTTPS requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const protocol = isHttps ? https : http;

    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Test endpoints
async function testEndpoint(name, url, options = {}) {
  console.log(`${colors.cyan}Testing: ${colors.bright}${name}${colors.reset}`);
  console.log(`${colors.dim}URL: ${url}${colors.reset}`);

  try {
    const startTime = Date.now();
    const response = await makeRequest(url, options);
    const duration = Date.now() - startTime;

    if (response.status >= 200 && response.status < 300) {
      console.log(`${colors.green}✓ SUCCESS${colors.reset} - Status: ${response.status} - Time: ${duration}ms`);

      // Display relevant data based on endpoint
      if (name.includes('Members')) {
        const data = response.data.data;
        if (Array.isArray(data)) {
          console.log(`  ${colors.yellow}Total Members: ${data.length}${colors.reset}`);

          // Count tribal sections
          const tribalSections = {};
          data.forEach(member => {
            const section = member.tribal_section || 'غير محدد';
            tribalSections[section] = (tribalSections[section] || 0) + 1;
          });

          console.log(`  ${colors.yellow}Tribal Distribution:${colors.reset}`);
          Object.entries(tribalSections)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([section, count]) => {
              console.log(`    - ${section}: ${count} members`);
            });

          // Count balance compliance
          const compliant = data.filter(m => (m.balance || 0) >= 3000).length;
          const nonCompliant = data.length - compliant;
          console.log(`  ${colors.yellow}Balance Status:${colors.reset}`);
          console.log(`    - Compliant (≥3000 SAR): ${compliant} members`);
          console.log(`    - Non-compliant (<3000 SAR): ${nonCompliant} members`);
        }
      } else if (name === 'Health Check') {
        console.log(`  ${colors.yellow}Service: ${response.data.service}${colors.reset}`);
        console.log(`  ${colors.yellow}Status: ${response.data.status}${colors.reset}`);
      } else if (name.includes('Statistics')) {
        const stats = response.data.data;
        if (stats) {
          console.log(`  ${colors.yellow}Statistics:${colors.reset}`);
          console.log(`    - Total Members: ${stats.total_members || 0}`);
          console.log(`    - Active Members: ${stats.active_members || 0}`);
          console.log(`    - Completed Profiles: ${stats.completed_profiles || 0}`);
          console.log(`    - Pending Profiles: ${stats.pending_profiles || 0}`);
        }
      }
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset} - Status: ${response.status}`);
      console.log(`  Error: ${JSON.stringify(response.data, null, 2)}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ ERROR${colors.reset} - ${error.message}`);
  }
  console.log('');
}

// Main test function
async function runTests() {
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}Al-Shuail Backend API Comprehensive Test${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  const isProduction = process.argv[2] === 'production';
  const baseUrl = isProduction ? API_BASE_URL : LOCAL_API_URL;

  console.log(`${colors.magenta}Testing ${isProduction ? 'PRODUCTION' : 'LOCAL'} API${colors.reset}`);
  console.log(`${colors.magenta}Base URL: ${baseUrl}${colors.reset}\n`);

  // Test 1: Health Check
  await testEndpoint(
    'Health Check',
    `${baseUrl}/api/health`
  );

  // Test 2: Get All Members (with limit for monitoring dashboard)
  await testEndpoint(
    'Get All Members (limit=500)',
    `${baseUrl}/api/members?limit=500`
  );

  // Test 3: Get Member Statistics
  await testEndpoint(
    'Member Statistics',
    `${baseUrl}/api/members/statistics`
  );

  // Test 4: Get Single Member (test with a specific ID if available)
  // Note: This will likely fail without a valid ID, but tests the endpoint availability
  await testEndpoint(
    'Get Single Member',
    `${baseUrl}/api/members/test-id-123`
  );

  // Test 5: Member Monitoring Endpoint
  await testEndpoint(
    'Member Monitoring Data',
    `${baseUrl}/api/member-monitoring/members`
  );

  // Test 6: Dashboard Stats
  await testEndpoint(
    'Dashboard Statistics',
    `${baseUrl}/api/dashboard/stats`
  );

  // Test 7: Crisis Dashboard
  await testEndpoint(
    'Crisis Dashboard',
    `${baseUrl}/api/crisis/members`
  );

  // Summary
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}Test Complete${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}`);
}

// Run tests
runTests().catch(console.error);