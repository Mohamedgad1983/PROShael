#!/usr/bin/env node

/**
 * Fix API Connections Script
 * Updates all frontend components to use the correct API URLs
 * Ensures proper connection between frontend and backend
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing API Connections for Al-Shuail Admin System');
console.log('=' . repeat(60));

// Configuration
const PRODUCTION_API_URL = 'https://proshael.onrender.com';
const LOCAL_API_URL = 'http://localhost:3001';

// Files to update
const filesToFix = [
  {
    path: 'alshuail-admin-arabic/src/services/api.js',
    replacements: [
      {
        from: /this\.baseURL = process\.env\.REACT_APP_API_URL \|\| '[^']+'/g,
        to: `this.baseURL = process.env.REACT_APP_API_URL || '${LOCAL_API_URL}'`
      },
      {
        from: /return this\.request\('\/members'\)/g,
        to: "return this.request('/api/members')"
      },
      {
        from: /return this\.request\(`\/members\/\$\{id\}`\)/g,
        to: "return this.request(`/api/members/${id}`)"
      },
      {
        from: /return this\.request\('\/members',/g,
        to: "return this.request('/api/members',"
      },
      {
        from: /return this\.request\(`\/members\/\$\{id\}`,/g,
        to: "return this.request(`/api/members/${id}`,"
      },
      {
        from: /return this\.request\('\/payments/g,
        to: "return this.request('/api/payments"
      },
      {
        from: /return this\.request\('\/subscriptions/g,
        to: "return this.request('/api/subscriptions"
      },
      {
        from: /return this\.request\('\/occasions/g,
        to: "return this.request('/api/occasions"
      }
    ]
  },
  {
    path: 'alshuail-admin-arabic/src/services/memberService.js',
    replacements: [
      {
        from: /this\.baseURL = process\.env\.REACT_APP_API_URL \|\| '[^']+'/g,
        to: `this.baseURL = process.env.REACT_APP_API_URL || '${LOCAL_API_URL}'`
      }
    ]
  },
  {
    path: 'alshuail-admin-arabic/src/components/Crisis/CrisisDashboard.jsx',
    replacements: [
      {
        from: /const API_URL = '[^']+'/g,
        to: `const API_URL = process.env.REACT_APP_API_URL || '${LOCAL_API_URL}'`
      }
    ]
  },
  {
    path: 'alshuail-admin-arabic/src/components/MemberMonitoring/MemberMonitoringDashboard.jsx',
    replacements: [
      {
        from: /const API_URL = process\.env\.REACT_APP_API_URL \|\| '[^']+'/g,
        to: `const API_URL = process.env.REACT_APP_API_URL || '${LOCAL_API_URL}'`
      }
    ]
  },
  {
    path: 'alshuail-admin-arabic/.env',
    replacements: [
      {
        from: /REACT_APP_API_URL=.*/g,
        to: `REACT_APP_API_URL=${LOCAL_API_URL}`
      }
    ]
  },
  {
    path: 'alshuail-admin-arabic/.env.production',
    replacements: [
      {
        from: /REACT_APP_API_URL=.*/g,
        to: `REACT_APP_API_URL=${PRODUCTION_API_URL}`
      }
    ]
  }
];

// Process each file
filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file.path);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${file.path}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  file.replacements.forEach(replacement => {
    const originalContent = content;
    content = content.replace(replacement.from, replacement.to);
    if (originalContent !== content) {
      modified = true;
      console.log(`✅ Updated pattern in ${file.path}`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`💾 Saved changes to ${file.path}`);
  } else {
    console.log(`⚪ No changes needed in ${file.path}`);
  }
});

// Create test script
const testScript = `
// Test API Connectivity
const https = require('https');
const http = require('http');

async function testAPI() {
  console.log('\\n📊 Testing API Connectivity...');
  console.log('=' . repeat(60));

  const endpoints = [
    { name: 'Health Check', url: '${PRODUCTION_API_URL}/api/health' },
    { name: 'Members List', url: '${PRODUCTION_API_URL}/api/members?limit=1' },
    { name: 'Member Stats', url: '${PRODUCTION_API_URL}/api/members/statistics' },
    { name: 'Dashboard Stats', url: '${PRODUCTION_API_URL}/api/dashboard/stats' }
  ];

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint.name, endpoint.url);
  }
}

function testEndpoint(name, url) {
  return new Promise((resolve) => {
    console.log(\`\\n Testing: \${name}\`);
    console.log(\` URL: \${url}\`);

    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(\` ✅ SUCCESS - Status: \${res.statusCode}\`);
          try {
            const json = JSON.parse(data);
            if (json.data && Array.isArray(json.data)) {
              console.log(\`   Found \${json.data.length} records\`);
            }
          } catch (e) {}
        } else {
          console.log(\` ❌ FAILED - Status: \${res.statusCode}\`);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(\` ❌ ERROR: \${err.message}\`);
      resolve();
    });
  });
}

testAPI();
`;

fs.writeFileSync(path.join(__dirname, 'test-api-connection.js'), testScript);

console.log('\n=' . repeat(60));
console.log('✅ API Connection fixes completed!');
console.log('\n📝 Summary:');
console.log('  - Updated API service files');
console.log('  - Fixed member service configuration');
console.log('  - Updated component API URLs');
console.log('  - Configured environment files');
console.log('\n🧪 To test the API connection:');
console.log('  node test-api-connection.js');
console.log('\n🚀 Next steps:');
console.log('  1. Restart the frontend: cd alshuail-admin-arabic && npm start');
console.log('  2. Build for production: cd alshuail-admin-arabic && npm run build');
console.log('  3. Deploy to Cloudflare: git add . && git commit -m "Fix API connections" && git push');