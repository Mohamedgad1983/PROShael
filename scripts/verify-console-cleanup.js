#!/usr/bin/env node

/**
 * Verification Script for Console.log Cleanup
 *
 * Scans the codebase to verify all console statements have been replaced
 * with logger utility calls. Generates a detailed report.
 *
 * Usage: node scripts/verify-console-cleanup.js
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  srcDir: path.join(__dirname, '../alshuail-admin-arabic/src'),
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  skipPatterns: [
    /\.test\.(js|ts|jsx|tsx)$/,
    /\.spec\.(js|ts|jsx|tsx)$/,
    /notificationTester\.js$/,
    /performanceMonitor\.js$/,
    /integration\.test\.js$/,
    /flexiblePaymentTest\.js$/,
    /memberServiceDemo\.js$/,
  ],
  skipDirs: ['node_modules', 'build', 'dist', '.git'],
};

const results = {
  filesScanned: 0,
  filesWithConsole: [],
  filesWithLogger: [],
  totalConsoleStatements: 0,
  totalLoggerStatements: 0,
};

function shouldSkip(filePath) {
  return CONFIG.skipPatterns.some(pattern => pattern.test(filePath));
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!CONFIG.skipDirs.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else if (CONFIG.extensions.some(ext => file.endsWith(ext))) {
      if (!shouldSkip(filePath)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(CONFIG.srcDir, filePath);

  results.filesScanned++;

  // Count console statements
  const consoleMatches = content.match(/console\.(log|error|warn|info|debug)\s*\(/g) || [];
  const loggerMatches = content.match(/logger\.(debug|error|warn|info)\s*\(/g) || [];

  if (consoleMatches.length > 0) {
    results.filesWithConsole.push({
      file: relativePath,
      count: consoleMatches.length,
      statements: consoleMatches
    });
    results.totalConsoleStatements += consoleMatches.length;
  }

  if (loggerMatches.length > 0) {
    results.filesWithLogger.push({
      file: relativePath,
      count: loggerMatches.length
    });
    results.totalLoggerStatements += loggerMatches.length;
  }
}

function generateReport() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║        Console.log Cleanup Verification Report           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`📊 Files Scanned: ${results.filesScanned}\n`);

  // Console statements remaining
  console.log('🔍 Console Statements Remaining:');
  console.log(`   Total: ${results.totalConsoleStatements}`);
  console.log(`   Files: ${results.filesWithConsole.length}\n`);

  if (results.filesWithConsole.length > 0) {
    console.log('   Files with console statements:\n');
    results.filesWithConsole
      .sort((a, b) => b.count - a.count)
      .forEach(({ file, count, statements }) => {
        console.log(`   📄 ${file} (${count} statements)`);
        statements.slice(0, 3).forEach(stmt => {
          console.log(`      - ${stmt}`);
        });
        if (statements.length > 3) {
          console.log(`      ... and ${statements.length - 3} more`);
        }
      });
    console.log('');
  }

  // Logger usage
  console.log('✅ Logger Statements:');
  console.log(`   Total: ${results.totalLoggerStatements}`);
  console.log(`   Files: ${results.filesWithLogger.length}\n`);

  // Summary
  const cleanupPercentage = results.totalConsoleStatements + results.totalLoggerStatements > 0
    ? ((results.totalLoggerStatements / (results.totalConsoleStatements + results.totalLoggerStatements)) * 100).toFixed(1)
    : 100;

  console.log('📈 Cleanup Progress:');
  console.log(`   Completion: ${cleanupPercentage}%`);
  console.log(`   Logger calls: ${results.totalLoggerStatements}`);
  console.log(`   Console calls: ${results.totalConsoleStatements}`);
  console.log('');

  if (results.totalConsoleStatements === 0) {
    console.log('✅ SUCCESS: All console statements have been replaced with logger!\n');
    return true;
  } else {
    console.log(`⚠️  INCOMPLETE: ${results.totalConsoleStatements} console statements remain\n`);
    console.log('💡 Next Steps:');
    console.log('   Run: node scripts/priority2-console-cleanup.js');
    console.log('');
    return false;
  }
}

function main() {
  const files = getAllFiles(CONFIG.srcDir);
  files.forEach(scanFile);
  const success = generateReport();
  process.exit(success ? 0 : 1);
}

main();
