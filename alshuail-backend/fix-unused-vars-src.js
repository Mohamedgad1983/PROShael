import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (fullPath.endsWith('.js')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function fixUnusedVars(content) {
  // Common unused variable patterns
  const patterns = [
    // Destructured error variables: { data, error } -> { data: _data, error }
    { from: /const\s+{\s*data\s*,\s*error\s*}/g, to: 'const { data: _data, error }' },
    { from: /const\s+{\s*error\s*,\s*data\s*}/g, to: 'const { error, data: _data }' },

    // Named error variables that are unused
    { from: /const\s+{\s*data:\s*\w+\s*,\s*error:\s+membersError\s*}/g, to: (match) => match.replace('membersError', '_membersError') },
    { from: /const\s+{\s*data:\s*\w+\s*,\s*error:\s+paymentsError\s*}/g, to: (match) => match.replace('paymentsError', '_paymentsError') },
    { from: /const\s+{\s*data:\s*\w+\s*,\s*error:\s+subscriptionsError\s*}/g, to: (match) => match.replace('subscriptionsError', '_subscriptionsError') },
    { from: /const\s+{\s*data:\s*\w+\s*,\s*error:\s+eventsError\s*}/g, to: (match) => match.replace('eventsError', '_eventsError') },
    { from: /const\s+{\s*data:\s*\w+\s*,\s*error:\s+rsvpsError\s*}/g, to: (match) => match.replace('rsvpsError', '_rsvpsError') },
    { from: /const\s+{\s*data:\s*\w+\s*,\s*error:\s+activitiesError\s*}/g, to: (match) => match.replace('activitiesError', '_activitiesError') },
    { from: /const\s+{\s*data:\s*\w+\s*,\s*error:\s+contributionsError\s*}/g, to: (match) => match.replace('contributionsError', '_contributionsError') },
    { from: /const\s+{\s*data:\s*\w+\s*,\s*error:\s+diyasError\s*}/g, to: (match) => match.replace('diyasError', '_diyasError') },
    { from: /const\s+{\s*data:\s*\w+\s*,\s*error:\s+notificationsError\s*}/g, to: (match) => match.replace('notificationsError', '_notificationsError') },
    { from: /const\s+{\s*data:\s*\w+\s*,\s*error:\s+fetchError\s*}/g, to: (match) => match.replace('fetchError', '_fetchError') },

    // General pattern for any unused error variable
    { from: /error:\s+(\w+Error)(?=\s*})/g, to: (match, errorName) => `error: _${errorName}` },
  ];

  let newContent = content;
  for (const pattern of patterns) {
    newContent = newContent.replace(pattern.from, pattern.to);
  }

  return newContent;
}

async function main() {
  console.log('🔧 Fixing unused variables in src/...\n');

  const results = { fixed: [], unchanged: [], errors: [] };
  const files = getAllFiles('src/');

  console.log(`📁 Found ${files.length} files in src/\n`);

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf8');
      const newContent = fixUnusedVars(content);

      if (newContent !== content) {
        writeFileSync(file, newContent, 'utf8');
        const fileName = file.split('alshuail-backend\\').pop();
        results.fixed.push(fileName);
        console.log(`  ✅ ${fileName}`);
      } else {
        results.unchanged.push(file.split('alshuail-backend\\').pop());
      }
    } catch (error) {
      const fileName = file.split('alshuail-backend\\').pop();
      results.errors.push({ file: fileName, error: error.message });
      console.log(`  ❌ ${fileName}: ${error.message}`);
    }
  }

  console.log('\n📊 Fix Summary:');
  console.log(`  ✅ Fixed: ${results.fixed.length} files`);
  console.log(`  ⏭️  Unchanged: ${results.unchanged.length} files`);
  console.log(`  ❌ Errors: ${results.errors.length} files`);

  if (results.fixed.length > 0) {
    console.log('\n✨ Fixed files:');
    results.fixed.forEach(f => console.log(`     ${f}`));
  }
}

main();
