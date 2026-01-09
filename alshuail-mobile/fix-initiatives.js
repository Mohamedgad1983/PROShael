const fs = require('fs');
const filePath = 'src/pages/Initiatives.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the buggy line
const oldPattern = /const response = await api\.get\(`\/initiatives\?status=\$\{activeTab\}`\)\s*\n\s*setInitiatives\(response\.data \|\| \[\]\)/;
const newCode = `const response = await api.get(\`/initiatives?status=\${activeTab}\`)
      const data = response.data
      // Handle various API response formats - ensure we always have an array
      const initiativesArray = Array.isArray(data) ? data : (data?.data || data?.initiatives || [])
      setInitiatives(Array.isArray(initiativesArray) ? initiativesArray : [])`;

if (oldPattern.test(content)) {
  content = content.replace(oldPattern, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fix applied successfully!');
} else {
  console.log('Pattern not found - file may already be fixed or has different formatting');
}
