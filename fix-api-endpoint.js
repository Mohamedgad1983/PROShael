const fs = require('fs');

const filePath = 'D:\\PROShael\\alshuail-admin-arabic\\public\\monitoring-standalone\\index.html';

let content = fs.readFileSync(filePath, 'utf8');

// Fix the API endpoint
const oldEndpoint = "MEMBER_MONITORING: '/api/member-monitoring',  // Optimized endpoint with server-side pagination";
const newEndpoint = "MEMBER_MONITORING: '/api/members/monitoring/all',  // Returns all members for client-side pagination";

if (content.includes(oldEndpoint)) {
    content = content.replace(oldEndpoint, newEndpoint);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ API endpoint updated successfully!');
    console.log('Changed from: /api/member-monitoring');
    console.log('Changed to: /api/members/monitoring/all');
} else if (content.includes("MEMBER_MONITORING: '/api/members/monitoring/all'")) {
    console.log('✅ API endpoint already correct!');
} else {
    console.log('❌ Could not find the endpoint pattern to replace');
    // Let's find what pattern is there
    const match = content.match(/MEMBER_MONITORING: '[^']+'/);
    if (match) {
        console.log('Found pattern:', match[0]);
    }
}
