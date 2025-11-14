#!/usr/bin/env node

/**
 * Fix Syntax Errors from Console Cleanup
 * Fixes common syntax errors introduced during automated replacement
 */

const fs = require('fs');
const path = require('path');

const files = [
  'alshuail-admin-arabic/src/components/Diyas/HijriDiyasManagement.tsx',
  'alshuail-admin-arabic/src/components/Members/TwoSectionMembers.jsx',
  'alshuail-admin-arabic/src/components/Settings/shared/PerformanceProfiler.tsx',
  'alshuail-admin-arabic/src/services/api.js',
  'alshuail-admin-arabic/src/utils/performance.ts'
];

console.log('🔧 Fixing syntax errors from console cleanup...\n');

files.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const original = content;

    // Fix: Remove semicolon before arrow function in reduce/map/etc
    // Pattern: ); => should be ) =>
    content = content.replace(/\);\s*=>/g, ') =>');

    // Fix: logger.method(something);); - double semicolon with paren
    // Pattern: ;); should be );
    content = content.replace(/;\);/g, ');');

    // Fix: Extra closing paren from malformed replacements
    // This is trickier and needs context-aware fixing

    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
    } else {
      console.log(`⏭️  No changes: ${filePath}`);
    }

  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

console.log('\n✅ Syntax error fixes complete!');
