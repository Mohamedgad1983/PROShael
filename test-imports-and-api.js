// Test script to verify imports and API endpoints
import chalk from 'chalk';
import fetch from 'node-fetch';

console.log(chalk.blue.bold('\n🔍 Family Tree API Test Suite\n'));
console.log(chalk.gray('━'.repeat(50)));

// Configuration
const LOCAL_API = 'http://localhost:3001';
const PROD_API = 'https://proshael.onrender.com';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgxNTJiYmFjLTc5MDYtNGQ2NC04ZDI3LTRhNWNkYWU4N2QzZCIsImVtYWlsIjoiYWRtaW5AYWxzaHVhaWwuY29tIiwicGhvbmUiOiIwNTAwMDAwMDAwIiwicm9sZSI6InN1cGVyX2FkbWluIiwicGVybWlzc2lvbnMiOnsiYWxsX2FjY2VzcyI6dHJ1ZSwibWFuYWdlX3VzZXJzIjp0cnVlLCJtYW5hZ2VfbWVtYmVycyI6dHJ1ZSwibWFuYWdlX2ZpbmFuY2VzIjp0cnVlLCJtYW5hZ2VfZmFtaWx5X3RyZWUiOnRydWUsIm1hbmFnZV9vY2Nhc2lvbnMiOnRydWUsIm1hbmFnZV9pbml0aWF0aXZlcyI6dHJ1ZSwibWFuYWdlX2RpeWFzIjp0cnVlLCJ2aWV3X3JlcG9ydHMiOnRydWUsInN5c3RlbV9zZXR0aW5ncyI6dHJ1ZX0sImlhdCI6MTc1OTEzMTEyNCwiZXhwIjoxNzU5NzM1OTI0fQ.vywShBezKYKShydt33crdRwmK4fhVdJMkF_v-Zv--z4';

// Test endpoints
const endpoints = [
  { name: 'Health Check', path: '/api/health', needsAuth: false },
  { name: 'Search Members', path: '/api/family-tree/search?query=محمد', needsAuth: true },
  { name: 'Member Tree', path: '/api/family-tree/member/e1613c27-9f24-42b9-834e-cad9f5a563c5', needsAuth: true },
  { name: 'Visualization', path: '/api/family-tree/visualization/e1613c27-9f24-42b9-834e-cad9f5a563c5?depth=2', needsAuth: true }
];

// Test function
async function testEndpoint(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint.path}`;
  const headers = endpoint.needsAuth ? { 'Authorization': `Bearer ${TOKEN}` } : {};

  try {
    const response = await fetch(url, { headers });
    const statusIcon = response.ok ? '✅' : '❌';
    const status = response.status;

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      endpoint: endpoint.name,
      status: `${statusIcon} ${status}`,
      success: response.ok,
      dataPreview: typeof data === 'object' ?
        (data.success ? '✓ Success response' : data.error || data.message) :
        data.substring(0, 50)
    };
  } catch (error) {
    return {
      endpoint: endpoint.name,
      status: '❌ Error',
      success: false,
      dataPreview: error.message
    };
  }
}

// Run tests
async function runTests() {
  // Test Local API
  console.log(chalk.yellow.bold('\n📍 Testing LOCAL API:'), chalk.cyan(LOCAL_API));
  console.log(chalk.gray('─'.repeat(50)));

  const localResults = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(LOCAL_API, endpoint);
    localResults.push(result);

    if (result.success) {
      console.log(chalk.green(`  ${result.endpoint}: ${result.status}`));
    } else {
      console.log(chalk.red(`  ${result.endpoint}: ${result.status}`));
      console.log(chalk.gray(`    └─ ${result.dataPreview}`));
    }
  }

  // Test Production API
  console.log(chalk.yellow.bold('\n🌍 Testing PRODUCTION API:'), chalk.cyan(PROD_API));
  console.log(chalk.gray('─'.repeat(50)));

  const prodResults = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(PROD_API, endpoint);
    prodResults.push(result);

    if (result.success) {
      console.log(chalk.green(`  ${result.endpoint}: ${result.status}`));
    } else {
      console.log(chalk.red(`  ${result.endpoint}: ${result.status}`));
      console.log(chalk.gray(`    └─ ${result.dataPreview}`));
    }
  }

  // Summary
  console.log(chalk.blue.bold('\n📊 Test Summary'));
  console.log(chalk.gray('━'.repeat(50)));

  const localSuccess = localResults.filter(r => r.success).length;
  const prodSuccess = prodResults.filter(r => r.success).length;

  console.log(chalk.yellow('Local API:'),
    localSuccess === endpoints.length ?
      chalk.green(`${localSuccess}/${endpoints.length} endpoints working ✅`) :
      chalk.red(`${localSuccess}/${endpoints.length} endpoints working ⚠️`)
  );

  console.log(chalk.yellow('Production API:'),
    prodSuccess === endpoints.length ?
      chalk.green(`${prodSuccess}/${endpoints.length} endpoints working ✅`) :
      chalk.red(`${prodSuccess}/${endpoints.length} endpoints working ⚠️`)
  );

  // Import check
  console.log(chalk.blue.bold('\n📦 Import Extension Check'));
  console.log(chalk.gray('━'.repeat(50)));

  try {
    const fs = await import('fs/promises');
    const serverContent = await fs.readFile('./alshuail-backend/server.js', 'utf-8');
    const imports = serverContent.match(/import.*from\s+['"](\.\/[^'"]+)['"]/g);

    let allHaveExtension = true;
    imports?.forEach(imp => {
      const hasJs = imp.endsWith('.js\'') || imp.endsWith('.js"');
      if (hasJs) {
        console.log(chalk.green(`  ✅ ${imp.substring(0, 60)}...`));
      } else {
        console.log(chalk.red(`  ❌ ${imp} - Missing .js extension!`));
        allHaveExtension = false;
      }
    });

    if (allHaveExtension) {
      console.log(chalk.green.bold('\n✅ All imports have .js extension!'));
    } else {
      console.log(chalk.red.bold('\n❌ Some imports missing .js extension!'));
    }
  } catch (error) {
    console.log(chalk.red('Could not check imports:', error.message));
  }

  // Deployment status
  console.log(chalk.blue.bold('\n🚀 Deployment Status'));
  console.log(chalk.gray('━'.repeat(50)));

  if (prodSuccess === endpoints.length) {
    console.log(chalk.green.bold('✅ Production API is fully deployed and working!'));
  } else if (prodResults[0].success) {
    console.log(chalk.yellow('⏳ Production server is up but family-tree routes not deployed yet.'));
    console.log(chalk.gray('   Deployment usually takes 2-3 minutes after git push.'));
    console.log(chalk.cyan('   Check: https://dashboard.render.com/'));
  } else {
    console.log(chalk.red('❌ Production API is not responding.'));
  }

  console.log(chalk.gray('\n' + '━'.repeat(50)));
  console.log(chalk.blue('Test completed at:'), new Date().toLocaleString());
}

// Run the tests
runTests().catch(console.error);