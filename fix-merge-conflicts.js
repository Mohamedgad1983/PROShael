const fs = require('fs');
const path = require('path');
const glob = require('glob').glob;

// Find all files with merge conflicts
const pattern = 'alshuail-admin-arabic/src/**/*.{js,jsx,ts,tsx,css}';

console.log('🔍 Finding files with merge conflicts...\n');

glob(pattern, (err, files) => {
  if (err) {
    console.error('Error finding files:', err);
    return;
  }

  let conflictFiles = [];
  let fixedCount = 0;

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');

    if (content.includes('<<<<<<< HEAD')) {
      conflictFiles.push(file);

      // Fix the merge conflicts by keeping the HEAD version
      let fixedContent = content;

      // Regular expression to match conflict blocks
      const conflictRegex = /<<<<<<< HEAD([\s\S]*?)=======([\s\S]*?)>>>>>>> [a-f0-9]+/g;

      // Replace each conflict with the HEAD version (first part)
      fixedContent = fixedContent.replace(conflictRegex, '$1');

      // Write the fixed content back
      fs.writeFileSync(file, fixedContent, 'utf8');
      fixedCount++;

      console.log(`✅ Fixed: ${path.basename(file)}`);
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Summary:`);
  console.log(`   Total files scanned: ${files.length}`);
  console.log(`   Files with conflicts: ${conflictFiles.length}`);
  console.log(`   Files fixed: ${fixedCount}`);
  console.log('='.repeat(50));

  if (fixedCount > 0) {
    console.log('\n✨ All merge conflicts have been resolved!');
    console.log('   The HEAD version was kept for all conflicts.');
    console.log('\n📝 Next steps:');
    console.log('   1. Review the changes');
    console.log('   2. Test the application');
    console.log('   3. Commit the fixes');
  } else {
    console.log('\n✅ No merge conflicts found!');
  }
});