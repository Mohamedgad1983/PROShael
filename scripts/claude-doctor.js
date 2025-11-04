#!/usr/bin/env node

/**
 * Claude Doctor - Diagnostic Script for Member Edit Issues
 * This script performs comprehensive checks to identify the root cause
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 CLAUDE DOCTOR - Member Edit Issue Diagnostic');
console.log('================================================\n');

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function checkFile(filePath, checks) {
  console.log(`\n${colors.blue}Checking: ${filePath}${colors.reset}`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    checks.forEach(check => {
      const found = check.pattern.test(content);
      const status = found ?
        (check.shouldExist ? '✅' : '❌') :
        (check.shouldExist ? '❌' : '✅');

      console.log(`  ${status} ${check.description}`);

      if (check.extract && found) {
        const matches = content.match(check.pattern);
        if (matches && matches[1]) {
          console.log(`    └─> Found: ${matches[1].substring(0, 50)}...`);
        }
      }
    });
  } catch (error) {
    console.log(`  ${colors.red}❌ File not found or cannot be read${colors.reset}`);
  }
}

// 1. Check Frontend Select Implementation
console.log(`\n${colors.yellow}1. FRONTEND SELECT IMPLEMENTATION${colors.reset}`);
checkFile('alshuail-admin-arabic/src/components/Members/TwoSectionMembers.jsx', [
  {
    pattern: /value={editingMember\?\.gender/,
    shouldExist: true,
    description: 'Gender select has proper value binding'
  },
  {
    pattern: /value={editingMember\?\.tribal_section/,
    shouldExist: true,
    description: 'Tribal section select has proper value binding'
  },
  {
    pattern: /console\.log.*[Gg]ender.*changed/,
    shouldExist: true,
    description: 'Gender change logging exists'
  },
  {
    pattern: /handleEditChange\('gender'/,
    shouldExist: true,
    description: 'Gender change handler connected'
  },
  {
    pattern: /handleEditChange\('tribal_section'/,
    shouldExist: true,
    description: 'Tribal section change handler connected'
  }
]);

// 2. Check CSS Issues
console.log(`\n${colors.yellow}2. CSS STYLING ISSUES${colors.reset}`);
checkFile('alshuail-admin-arabic/src/components/Members/TwoSectionMembers.css', [
  {
    pattern: /text-overflow:\s*ellipsis/,
    shouldExist: false,
    description: 'No text-overflow: ellipsis (causes dots)'
  },
  {
    pattern: /white-space:\s*nowrap/,
    shouldExist: false,
    description: 'No white-space: nowrap (causes truncation)'
  },
  {
    pattern: /overflow:\s*hidden/,
    shouldExist: false,
    description: 'No overflow: hidden on select elements'
  },
  {
    pattern: /direction:\s*rtl/,
    shouldExist: true,
    description: 'RTL direction is set'
  },
  {
    pattern: /text-overflow:\s*clip/,
    shouldExist: true,
    description: 'Text-overflow: clip is set (prevents dots)'
  }
]);

// 3. Check Backend Controller
console.log(`\n${colors.yellow}3. BACKEND CONTROLLER${colors.reset}`);
checkFile('alshuail-backend/src/controllers/membersController.js', [
  {
    pattern: /JSON\.parse.*req\.body/,
    shouldExist: false,
    description: 'No double JSON parsing of req.body'
  },
  {
    pattern: /const updateData = req\.body/,
    shouldExist: true,
    description: 'Direct use of req.body'
  },
  {
    pattern: /console\.log.*[Uu]pdate.*[Rr]equest/,
    shouldExist: true,
    description: 'Update request logging exists'
  },
  {
    pattern: /prepareUpdateData/,
    shouldExist: true,
    description: 'Using prepareUpdateData utility'
  }
]);

// 4. Check JSON Sanitizer
console.log(`\n${colors.yellow}4. JSON SANITIZER${colors.reset}`);
checkFile('alshuail-backend/src/utils/jsonSanitizer.js', [
  {
    pattern: /typeof data === 'object'/,
    shouldExist: true,
    description: 'Checks if data is already an object'
  },
  {
    pattern: /return data;/,
    shouldExist: true,
    description: 'Returns object as-is if already parsed'
  },
  {
    pattern: /JSON\.parse\(data\)/,
    shouldExist: true,
    description: 'Only parses actual strings'
  }
]);

// 5. Check Package.json for potential issues
console.log(`\n${colors.yellow}5. PACKAGE DEPENDENCIES${colors.reset}`);
checkFile('alshuail-admin-arabic/package.json', [
  {
    pattern: /"react":\s*"[\^~]?18/,
    shouldExist: true,
    description: 'React 18.x is installed',
    extract: true
  },
  {
    pattern: /"@babel\/core"/,
    shouldExist: true,
    description: 'Babel is configured'
  }
]);

// 6. Database Column Check Script
console.log(`\n${colors.yellow}6. DATABASE CHECK SCRIPT${colors.reset}`);
const dbCheckScript = `
-- Run this in Supabase SQL Editor to verify columns
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'members'
AND column_name IN ('gender', 'tribal_section')
ORDER BY ordinal_position;
`;

console.log(`${colors.blue}Run this SQL in Supabase:${colors.reset}`);
console.log(dbCheckScript);

// 7. Browser Test Script
console.log(`\n${colors.yellow}7. BROWSER CONSOLE TEST${colors.reset}`);
const browserTest = `
// Run this in browser console when edit modal is open:
const genderSelect = document.querySelector('select[name="gender"]');
const tribalSelect = document.querySelector('select[name="tribal_section"]');

console.log('Gender Select:', {
  value: genderSelect?.value,
  selectedIndex: genderSelect?.selectedIndex,
  selectedText: genderSelect?.options[genderSelect?.selectedIndex]?.text,
  computedStyle: window.getComputedStyle(genderSelect)?.textOverflow
});

console.log('Tribal Select:', {
  value: tribalSelect?.value,
  selectedIndex: tribalSelect?.selectedIndex,
  selectedText: tribalSelect?.options[tribalSelect?.selectedIndex]?.text,
  computedStyle: window.getComputedStyle(tribalSelect)?.textOverflow
});
`;

console.log(`${colors.blue}Run this in Browser Console:${colors.reset}`);
console.log(browserTest);

// 8. API Test
console.log(`\n${colors.yellow}8. API DIRECT TEST${colors.reset}`);
const apiTest = `
# Test the API directly with curl:
curl -X PUT http://localhost:5001/api/members/[MEMBER_ID] \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer [YOUR_TOKEN]" \\
  -d '{"gender":"male","tribal_section":"الدغيش","full_name":"Test User"}'
`;

console.log(`${colors.blue}Run this in terminal:${colors.reset}`);
console.log(apiTest);

// 9. Potential Fixes Summary
console.log(`\n${colors.yellow}9. DIAGNOSTIC SUMMARY${colors.reset}`);
console.log(`
${colors.green}Potential Root Causes:${colors.reset}
1. CSS text-overflow causing visual truncation
2. React state not updating select elements properly
3. Character encoding issues with Arabic text
4. Express middleware conflict causing double parsing
5. Browser-specific rendering issue with RTL text

${colors.green}Immediate Actions:${colors.reset}
1. Test in incognito mode (no extensions)
2. Clear all browser cache and localStorage
3. Test with English values ("male" instead of "ذكر")
4. Check Network tab for exact request/response
5. Verify database has correct values after save attempt

${colors.green}Quick Fix to Try:${colors.reset}
Replace the select elements with this test version:
`);

const quickFix = `
<select
  value={editingMember?.gender || ''}
  onChange={(e) => {
    const newValue = e.target.value;
    console.log('Gender selected:', newValue);
    setEditingMember(prev => ({...prev, gender: newValue}));
  }}
  style={{
    direction: 'rtl',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    textOverflow: 'clip',
    whiteSpace: 'normal'
  }}
>
  <option value="">اختر</option>
  <option value="male">ذكر</option>
  <option value="female">أنثى</option>
</select>
`;

console.log(quickFix);

console.log(`\n${colors.green}═══════════════════════════════════════════${colors.reset}`);
console.log(`${colors.green}DIAGNOSIS COMPLETE${colors.reset}`);
console.log(`${colors.green}═══════════════════════════════════════════${colors.reset}\n`);