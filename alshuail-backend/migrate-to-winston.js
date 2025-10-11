import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple glob implementation
function getAllFiles(dirPath, arrayOfFiles = [], pattern = null) {
  const files = readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles, pattern);
    } else if (!pattern || fullPath.endsWith(pattern)) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const loggerImport = "import { log } from '../utils/logger.js';\n";
const loggerImportVariants = [
  "import { log } from '../utils/logger.js';",
  "import { log } from '../../utils/logger.js';",
  "import { log } from './utils/logger.js';"
];

function getLoggerImport(filePath) {
  const depth = filePath.split(path.sep).length - filePath.split('src')[0].split(path.sep).length - 1;
  const prefix = '../'.repeat(Math.max(depth - 1, 1));
  return `import { log } from '${prefix}utils/logger.js';\n`;
}

function migrateFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    let changed = false;

    // Check if logger is already imported
    const hasLoggerImport = loggerImportVariants.some(variant => content.includes(variant));

    // Perform replacements
    const replacements = [
      { from: /console\.log\(/g, to: 'log.info(' },
      { from: /console\.error\(/g, to: 'log.error(' },
      { from: /console\.warn\(/g, to: 'log.warn(' },
      { from: /console\.debug\(/g, to: 'log.debug(' },
      { from: /console\.info\(/g, to: 'log.info(' }
    ];

    let newContent = content;
    for (const { from, to } of replacements) {
      if (from.test(newContent)) {
        newContent = newContent.replace(from, to);
        changed = true;
      }
    }

    // Add logger import if changes were made and import doesn't exist
    if (changed && !hasLoggerImport) {
      // Find the first import statement or add at top
      const importRegex = /^import .+?;?\n/m;
      const match = newContent.match(importRegex);

      if (match) {
        // Add after first import
        newContent = newContent.replace(importRegex, match[0] + getLoggerImport(filePath));
      } else {
        // Add at the very top
        newContent = getLoggerImport(filePath) + newContent;
      }
    }

    if (changed) {
      writeFileSync(filePath, newContent, 'utf8');
      return { file: filePath.split('alshuail-backend\\').pop(), status: 'migrated' };
    }

    return { file: filePath.split('alshuail-backend\\').pop(), status: 'no changes' };

  } catch (error) {
    return { file: filePath.split('alshuail-backend\\').pop(), status: 'error', error: error.message };
  }
}

async function main() {
  console.log('🔄 Starting Winston migration for production files...\n');

  const results = { migrated: [], unchanged: [], errors: [] };

  const directories = [
    'src/controllers',
    'src/services',
    'src/routes',
    'src/middleware',
    'src/config'
  ];

  for (const dir of directories) {
    const fullPath = path.join(process.cwd(), dir);
    const files = getAllFiles(fullPath, [], '.js');
    console.log(`📁 Processing ${dir}: ${files.length} files`);

    for (const file of files) {
      const result = migrateFile(file);

      if (result.status === 'migrated') {
        results.migrated.push(result.file);
        console.log(`  ✅ ${result.file}`);
      } else if (result.status === 'error') {
        results.errors.push(result);
        console.log(`  ❌ ${result.file}: ${result.error}`);
      } else {
        results.unchanged.push(result.file);
      }
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`  ✅ Migrated: ${results.migrated.length} files`);
  console.log(`  ⏭️  Unchanged: ${results.unchanged.length} files`);
  console.log(`  ❌ Errors: ${results.errors.length} files`);

  if (results.migrated.length > 0) {
    console.log('\n✨ Migrated files:');
    results.migrated.forEach(f => console.log(`     ${f}`));
  }

  if (results.errors.length > 0) {
    console.log('\n⚠️  Files with errors:');
    results.errors.forEach(r => console.log(`     ${r.file}: ${r.error}`));
  }
}

main();
