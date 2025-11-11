#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Access Control Component in Bundle...\n');

const buildDir = path.join(__dirname, 'alshuail-admin-arabic', 'build', 'static', 'js');

if (!fs.existsSync(buildDir)) {
  console.error('❌ Build directory not found. Run npm run build first.');
  process.exit(1);
}

const files = fs.readdirSync(buildDir).filter(f => f.endsWith('.js'));

let found = {
  accessControl: false,
  passwordManagement: false,
  forceInclude: false,
  keepSymbol: false
};

let counts = {
  accessControl: 0,
  passwordManagement: 0,
  arabicLabel: 0
};

for (const file of files) {
  const content = fs.readFileSync(path.join(buildDir, file), 'utf8');

  if (content.includes('AccessControl')) {
    found.accessControl = true;
    counts.accessControl += (content.match(/AccessControl/g) || []).length;
  }

  if (content.includes('password-management')) {
    found.passwordManagement = true;
    counts.passwordManagement += (content.match(/password-management/g) || []).length;
  }

  if (content.includes('إدارة كلمات المرور')) {
    counts.arabicLabel += (content.match(/إدارة كلمات المرور/g) || []).length;
  }

  if (content.includes('__ACCESS_CONTROL_LOADED__')) {
    found.forceInclude = true;
  }

  if (content.includes('__KEEP_ACCESS_CONTROL__')) {
    found.keepSymbol = true;
  }
}

console.log('📊 Results:');
console.log('──────────────────────────────────────');
console.log(`✓ AccessControl component: ${found.accessControl ? '✅ FOUND' : '❌ MISSING'} (${counts.accessControl} occurrences)`);
console.log(`✓ password-management ID: ${found.passwordManagement ? '✅ FOUND' : '❌ MISSING'} (${counts.passwordManagement} occurrences)`);
console.log(`✓ Arabic label: ${counts.arabicLabel > 0 ? '✅ FOUND' : '❌ MISSING'} (${counts.arabicLabel} occurrences)`);
console.log(`✓ Force-include marker: ${found.forceInclude ? '✅ FOUND' : '❌ MISSING'}`);
console.log(`✓ Keep symbol: ${found.keepSymbol ? '✅ FOUND' : '❌ MISSING'}`);
console.log('──────────────────────────────────────\n');

const allFound = found.accessControl && found.passwordManagement && found.forceInclude && counts.arabicLabel > 0;

if (allFound) {
  console.log('✅ SUCCESS: Access Control component is properly included in bundle!');
  process.exit(0);
} else {
  console.log('❌ FAILURE: Access Control component is still missing from bundle.');
  console.log('\n🔧 Troubleshooting:');
  console.log('   1. Ensure all files were created correctly');
  console.log('   2. Clear node_modules/.cache and rebuild');
  console.log('   3. Check browser console for "[Force-Include]" log messages');
  process.exit(1);
}
