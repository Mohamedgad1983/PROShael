#!/usr/bin/env node

/**
 * Systematic Console.log Cleanup Script
 *
 * Replaces all console statements with logger utility calls
 * across the entire codebase following the Priority 1 pattern.
 *
 * Usage: node scripts/cleanup-console-logs.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '../alshuail-admin-arabic/src');
const LOGGER_PATH = '../../utils/logger';
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Files/directories to skip
const SKIP_PATTERNS = [
  /\.test\.(js|ts|jsx|tsx)$/,           // Test files
  /\.spec\.(js|ts|jsx|tsx)$/,           // Spec files
  /notificationTester\.js$/,             // Test utilities
  /performanceMonitor\.js$/,             // Performance monitoring (needs console)
  /integration\.test\.js$/,              // Integration tests
  /node_modules/,                        // Dependencies
  /build/,                               // Build output
  /dist/,                                // Distribution
];

// Statistics
let stats = {
  filesProcessed: 0,
  filesModified: 0,
  consoleLogReplaced: 0,
  consoleErrorReplaced: 0,
  consoleWarnReplaced: 0,
  consoleInfoReplaced: 0,
  loggerImportsAdded: 0,
  errors: []
};

/**
 * Check if file should be skipped
 */
function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Get all JavaScript/TypeScript files recursively
 */
function getSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'build') {
        getSourceFiles(filePath, fileList);
      }
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      if (!shouldSkip(filePath)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Check if file already has logger import
 */
function hasLoggerImport(content) {
  return /import\s+{\s*logger\s*}\s+from\s+['"].*logger['"]/.test(content);
}

/**
 * Get relative path for logger import
 */
function getLoggerImportPath(filePath) {
  const relativePath = path.relative(path.dirname(filePath), path.join(SRC_DIR, 'utils/logger'));
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

/**
 * Add logger import to file
 */
function addLoggerImport(content, filePath) {
  const importPath = getLoggerImportPath(filePath);

  // Find the last import statement
  const importRegex = /import\s+.*\s+from\s+['"][^'"]+['"];?\s*$/gm;
  const imports = content.match(importRegex);

  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const importIndex = content.lastIndexOf(lastImport);
    const insertPosition = importIndex + lastImport.length;

    return content.slice(0, insertPosition) +
           `\nimport { logger } from '${importPath.replace(/\\/g, '/')}';` +
           content.slice(insertPosition);
  }

  // If no imports found, add at the beginning after any comments
  const firstLineRegex = /^(\/\/.*\n|\/\*[\s\S]*?\*\/\n)*/;
  const match = content.match(firstLineRegex);
  const insertPosition = match ? match[0].length : 0;

  return content.slice(0, insertPosition) +
         `import { logger } from '${importPath.replace(/\\/g, '/')}';\n\n` +
         content.slice(insertPosition);
}

/**
 * Extract context from console statement arguments
 */
function extractContext(args) {
  if (!args || args.trim() === '') return null;

  // Try to extract object literals or identifiers
  const objectMatch = args.match(/({[^}]+})/);
  if (objectMatch) {
    return objectMatch[1];
  }

  // Extract identifiers after first argument
  const parts = args.split(',').map(p => p.trim());
  if (parts.length > 1) {
    const contextVars = parts.slice(1)
      .filter(p => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(p))
      .join(', ');

    if (contextVars) {
      return `{ ${contextVars} }`;
    }
  }

  return null;
}

/**
 * Convert console statement to logger call
 */
function convertConsoleToLogger(match, type, args) {
  // Map console type to logger type
  const loggerTypeMap = {
    'log': 'debug',
    'info': 'info',
    'warn': 'warn',
    'error': 'error'
  };

  const loggerType = loggerTypeMap[type] || 'debug';

  // Extract message and context
  const argsParts = args.split(',').map(p => p.trim());
  const message = argsParts[0];
  const context = extractContext(argsParts.slice(1).join(', '));

  if (context) {
    return `logger.${loggerType}(${message}, ${context})`;
  } else {
    return `logger.${loggerType}(${message})`;
  }
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    stats.filesProcessed++;

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Count console statements
    const consoleMatches = content.match(/console\.(log|error|warn|info)\s*\(/g);
    if (!consoleMatches || consoleMatches.length === 0) {
      return; // No console statements
    }

    if (VERBOSE) {
      console.log(`\n📄 Processing: ${path.relative(SRC_DIR, filePath)}`);
      console.log(`   Found ${consoleMatches.length} console statements`);
    }

    // Add logger import if not present
    if (!hasLoggerImport(content)) {
      content = addLoggerImport(content, filePath);
      stats.loggerImportsAdded++;
    }

    // Replace console.log with logger.debug
    const logCount = (content.match(/console\.log\s*\(/g) || []).length;
    content = content.replace(
      /console\.log\s*\(([^;]+?)\);?/g,
      (match, args) => convertConsoleToLogger(match, 'log', args) + ';'
    );
    stats.consoleLogReplaced += logCount;

    // Replace console.error with logger.error
    const errorCount = (content.match(/console\.error\s*\(/g) || []).length;
    content = content.replace(
      /console\.error\s*\(([^;]+?)\);?/g,
      (match, args) => convertConsoleToLogger(match, 'error', args) + ';'
    );
    stats.consoleErrorReplaced += errorCount;

    // Replace console.warn with logger.warn
    const warnCount = (content.match(/console\.warn\s*\(/g) || []).length;
    content = content.replace(
      /console\.warn\s*\(([^;]+?)\);?/g,
      (match, args) => convertConsoleToLogger(match, 'warn', args) + ';'
    );
    stats.consoleWarnReplaced += warnCount;

    // Replace console.info with logger.info
    const infoCount = (content.match(/console\.info\s*\(/g) || []).length;
    content = content.replace(
      /console\.info\s*\(([^;]+?)\);?/g,
      (match, args) => convertConsoleToLogger(match, 'info', args) + ';'
    );
    stats.consoleInfoReplaced += infoCount;

    // Only write if content changed
    if (content !== originalContent) {
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
      stats.filesModified++;

      if (VERBOSE) {
        console.log(`   ✅ Modified (${logCount + errorCount + warnCount + infoCount} replacements)`);
      }
    }

  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting Console.log Cleanup');
  console.log('================================\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  // Get all source files
  const files = getSourceFiles(SRC_DIR);
  console.log(`📁 Found ${files.length} source files\n`);

  // Process each file
  const startTime = Date.now();
  files.forEach(processFile);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print statistics
  console.log('\n================================');
  console.log('📊 Cleanup Statistics');
  console.log('================================');
  console.log(`Files Processed:        ${stats.filesProcessed}`);
  console.log(`Files Modified:         ${stats.filesModified}`);
  console.log(`Logger Imports Added:   ${stats.loggerImportsAdded}`);
  console.log(`console.log Replaced:   ${stats.consoleLogReplaced}`);
  console.log(`console.error Replaced: ${stats.consoleErrorReplaced}`);
  console.log(`console.warn Replaced:  ${stats.consoleWarnReplaced}`);
  console.log(`console.info Replaced:  ${stats.consoleInfoReplaced}`);
  console.log(`Total Replacements:     ${stats.consoleLogReplaced + stats.consoleErrorReplaced + stats.consoleWarnReplaced + stats.consoleInfoReplaced}`);
  console.log(`Errors:                 ${stats.errors.length}`);
  console.log(`Duration:               ${duration}s`);

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`  - ${path.relative(SRC_DIR, file)}: ${error}`);
    });
  }

  console.log('\n✅ Cleanup Complete!');

  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else {
    console.log('\n💡 Run "npm run build:production" to verify changes');
  }
}

// Run the script
main();
