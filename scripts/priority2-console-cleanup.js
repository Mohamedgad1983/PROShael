#!/usr/bin/env node

/**
 * Priority 2 - Comprehensive Console.log Cleanup Script
 *
 * Systematically replaces ALL console statements with logger utility
 * across the entire codebase following Priority 1 pattern.
 *
 * Features:
 * - Intelligent pattern matching for console.log/error/warn/info
 * - Automatic logger import injection
 * - Preserves context and maintains readability
 * - Skips test files and monitoring utilities
 * - Dry-run mode for safe preview
 * - Detailed statistics and reporting
 *
 * Usage:
 *   node scripts/priority2-console-cleanup.js              # Execute cleanup
 *   node scripts/priority2-console-cleanup.js --dry-run    # Preview changes
 *   node scripts/priority2-console-cleanup.js --verbose    # Detailed output
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  srcDir: path.join(__dirname, '../alshuail-admin-arabic/src'),
  extensions: ['.js', '.jsx', '.ts', '.tsx'],

  // Files/patterns to skip
  skipPatterns: [
    /\.test\.(js|ts|jsx|tsx)$/,
    /\.spec\.(js|ts|jsx|tsx)$/,
    /notificationTester\.js$/,
    /performanceMonitor\.js$/,
    /integration\.test\.js$/,
    /flexiblePaymentTest\.js$/,
    /memberServiceDemo\.js$/,
    /node_modules/,
    /build/,
    /dist/,
  ],

  // Directories to skip entirely
  skipDirs: ['node_modules', 'build', 'dist', '.git'],
};

// ============================================================================
// STATISTICS
// ============================================================================

const stats = {
  filesScanned: 0,
  filesModified: 0,
  filesSkipped: 0,

  consoleLogFound: 0,
  consoleErrorFound: 0,
  consoleWarnFound: 0,
  consoleInfoFound: 0,
  consoleDebugFound: 0,

  consoleLogReplaced: 0,
  consoleErrorReplaced: 0,
  consoleWarnReplaced: 0,
  consoleInfoReplaced: 0,
  consoleDebugReplaced: 0,

  loggerImportsAdded: 0,
  errors: [],

  get totalFound() {
    return this.consoleLogFound + this.consoleErrorFound +
           this.consoleWarnFound + this.consoleInfoFound + this.consoleDebugFound;
  },

  get totalReplaced() {
    return this.consoleLogReplaced + this.consoleErrorReplaced +
           this.consoleWarnReplaced + this.consoleInfoReplaced + this.consoleDebugReplaced;
  }
};

// ============================================================================
// UTILITIES
// ============================================================================

function shouldSkipFile(filePath) {
  return CONFIG.skipPatterns.some(pattern => pattern.test(filePath));
}

function shouldSkipDir(dirName) {
  return CONFIG.skipDirs.includes(dirName);
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!shouldSkipDir(file)) {
        getAllFiles(filePath, fileList);
      }
    } else if (CONFIG.extensions.some(ext => file.endsWith(ext))) {
      if (!shouldSkipFile(filePath)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function hasLoggerImport(content) {
  return /import\s+{\s*logger\s*}\s+from\s+['"][^'"]*logger['"]/.test(content);
}

function getRelativeLoggerPath(filePath) {
  const loggerPath = path.join(CONFIG.srcDir, 'utils', 'logger');
  const relativePath = path.relative(path.dirname(filePath), loggerPath);
  return relativePath.replace(/\\/g, '/');
}

function addLoggerImport(content, filePath) {
  const loggerImportPath = getRelativeLoggerPath(filePath);
  const importStatement = `import { logger } from '${loggerImportPath}';\n`;

  // Find last import statement
  const importRegex = /^import\s+.*from\s+['"][^'"]+['"];?\s*$/gm;
  const imports = content.match(importRegex);

  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPos = lastImportIndex + lastImport.length;

    return content.slice(0, insertPos) + '\n' + importStatement + content.slice(insertPos);
  }

  // No imports found, add at top after comments
  const headerCommentRegex = /^(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\n)*/;
  const match = content.match(headerCommentRegex);
  const insertPos = match ? match[0].length : 0;

  return content.slice(0, insertPos) + importStatement + '\n' + content.slice(insertPos);
}

// ============================================================================
// CONSOLE STATEMENT REPLACEMENT
// ============================================================================

function extractMessageAndContext(argsString) {
  // Remove surrounding whitespace
  argsString = argsString.trim();

  // Handle empty args
  if (!argsString) {
    return { message: '""', context: null };
  }

  // Split by commas not inside brackets/parens
  const args = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = null;

  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];
    const prevChar = i > 0 ? argsString[i - 1] : '';

    // Track string state
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
    }

    // Track bracket/paren depth
    if (!inString) {
      if (char === '(' || char === '{' || char === '[') depth++;
      if (char === ')' || char === '}' || char === ']') depth--;

      // Split on comma at depth 0
      if (char === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  // First arg is always the message
  const message = args[0] || '""';

  // Remaining args become context
  if (args.length === 1) {
    return { message, context: null };
  }

  // Try to build context object
  const contextVars = args.slice(1);

  // Check if we already have an object literal
  if (contextVars.length === 1 && contextVars[0].trim().startsWith('{')) {
    return { message, context: contextVars[0].trim() };
  }

  // Build context from variable names
  const simpleVars = contextVars.filter(v => /^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(v.trim()));

  if (simpleVars.length > 0) {
    const contextObj = '{ ' + simpleVars.map(v => {
      const varName = v.trim();
      // Handle property access like user.id
      if (varName.includes('.')) {
        const parts = varName.split('.');
        return `${parts[parts.length - 1]}: ${varName}`;
      }
      return varName;
    }).join(', ') + ' }';

    return { message, context: contextObj };
  }

  return { message, context: null };
}

function replaceConsoleStatement(content, consoleType) {
  const loggerTypeMap = {
    'log': 'debug',
    'debug': 'debug',
    'info': 'info',
    'warn': 'warn',
    'error': 'error'
  };

  const loggerMethod = loggerTypeMap[consoleType];

  // Regex to match console.TYPE(...);
  const regex = new RegExp(`console\\.${consoleType}\\s*\\(([^;]*?)\\);?`, 'g');

  let replacementCount = 0;

  const result = content.replace(regex, (match, argsString) => {
    replacementCount++;

    const { message, context } = extractMessageAndContext(argsString);

    if (context) {
      return `logger.${loggerMethod}(${message}, ${context});`;
    } else {
      return `logger.${loggerMethod}(${message});`;
    }
  });

  return { content: result, count: replacementCount };
}

// ============================================================================
// FILE PROCESSING
// ============================================================================

function processFile(filePath, dryRun = false, verbose = false) {
  try {
    stats.filesScanned++;

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Count console statements
    const logMatches = (content.match(/console\.log\s*\(/g) || []).length;
    const errorMatches = (content.match(/console\.error\s*\(/g) || []).length;
    const warnMatches = (content.match(/console\.warn\s*\(/g) || []).length;
    const infoMatches = (content.match(/console\.info\s*\(/g) || []).length;
    const debugMatches = (content.match(/console\.debug\s*\(/g) || []).length;

    stats.consoleLogFound += logMatches;
    stats.consoleErrorFound += errorMatches;
    stats.consoleWarnFound += warnMatches;
    stats.consoleInfoFound += infoMatches;
    stats.consoleDebugFound += debugMatches;

    const totalConsole = logMatches + errorMatches + warnMatches + infoMatches + debugMatches;

    if (totalConsole === 0) {
      return; // No console statements
    }

    if (verbose) {
      const relativePath = path.relative(CONFIG.srcDir, filePath);
      console.log(`\n📄 ${relativePath}`);
      console.log(`   Found: ${totalConsole} console statements`);
      if (logMatches) console.log(`   - console.log: ${logMatches}`);
      if (errorMatches) console.log(`   - console.error: ${errorMatches}`);
      if (warnMatches) console.log(`   - console.warn: ${warnMatches}`);
      if (infoMatches) console.log(`   - console.info: ${infoMatches}`);
      if (debugMatches) console.log(`   - console.debug: ${debugMatches}`);
    }

    // Add logger import if needed
    if (!hasLoggerImport(content)) {
      content = addLoggerImport(content, filePath);
      stats.loggerImportsAdded++;
    }

    // Replace console statements
    let result;

    result = replaceConsoleStatement(content, 'log');
    content = result.content;
    stats.consoleLogReplaced += result.count;

    result = replaceConsoleStatement(content, 'error');
    content = result.content;
    stats.consoleErrorReplaced += result.count;

    result = replaceConsoleStatement(content, 'warn');
    content = result.content;
    stats.consoleWarnReplaced += result.count;

    result = replaceConsoleStatement(content, 'info');
    content = result.content;
    stats.consoleInfoReplaced += result.count;

    result = replaceConsoleStatement(content, 'debug');
    content = result.content;
    stats.consoleDebugReplaced += result.count;

    // Write file if content changed
    if (content !== originalContent) {
      if (!dryRun) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
      stats.filesModified++;

      if (verbose) {
        console.log(`   ✅ ${dryRun ? 'Would modify' : 'Modified'} (${stats.consoleLogReplaced + stats.consoleErrorReplaced + stats.consoleWarnReplaced + stats.consoleInfoReplaced + stats.consoleDebugReplaced} replacements)`);
      }
    }

  } catch (error) {
    stats.errors.push({
      file: path.relative(CONFIG.srcDir, filePath),
      error: error.message
    });
    console.error(`❌ Error processing ${path.relative(CONFIG.srcDir, filePath)}:`, error.message);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Priority 2: Console.log Cleanup - 100% Automation       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  console.log('📋 Configuration:');
  console.log(`   Source Directory: ${CONFIG.srcDir}`);
  console.log(`   Extensions: ${CONFIG.extensions.join(', ')}`);
  console.log(`   Skip Patterns: ${CONFIG.skipPatterns.length} patterns`);
  console.log('');

  // Get all files
  console.log('🔍 Scanning for source files...');
  const files = getAllFiles(CONFIG.srcDir);
  console.log(`✅ Found ${files.length} eligible source files\n`);

  // Process files
  console.log('🚀 Processing files...\n');
  const startTime = Date.now();

  files.forEach(file => processFile(file, dryRun, verbose));

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print statistics
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    CLEANUP STATISTICS                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📊 Files:');
  console.log(`   Scanned:         ${stats.filesScanned}`);
  console.log(`   Modified:        ${stats.filesModified}${dryRun ? ' (would be)' : ''}`);
  console.log(`   Skipped:         ${stats.filesSkipped}`);
  console.log('');

  console.log('📝 Console Statements Found:');
  console.log(`   console.log:     ${stats.consoleLogFound}`);
  console.log(`   console.error:   ${stats.consoleErrorFound}`);
  console.log(`   console.warn:    ${stats.consoleWarnFound}`);
  console.log(`   console.info:    ${stats.consoleInfoFound}`);
  console.log(`   console.debug:   ${stats.consoleDebugFound}`);
  console.log(`   TOTAL:           ${stats.totalFound}`);
  console.log('');

  console.log('✨ Replacements Made:');
  console.log(`   logger.debug():  ${stats.consoleLogReplaced}${dryRun ? ' (would be)' : ''}`);
  console.log(`   logger.error():  ${stats.consoleErrorReplaced}${dryRun ? ' (would be)' : ''}`);
  console.log(`   logger.warn():   ${stats.consoleWarnReplaced}${dryRun ? ' (would be)' : ''}`);
  console.log(`   logger.info():   ${stats.consoleInfoReplaced}${dryRun ? ' (would be)' : ''}`);
  console.log(`   TOTAL:           ${stats.totalReplaced}${dryRun ? ' (would be)' : ''}`);
  console.log('');

  console.log('🔧 Other Changes:');
  console.log(`   Logger Imports:  ${stats.loggerImportsAdded}${dryRun ? ' (would be added)' : ''}`);
  console.log('');

  console.log('⚠️  Errors:');
  console.log(`   Count:           ${stats.errors.length}`);
  console.log('');

  console.log('⏱️  Performance:');
  console.log(`   Duration:        ${duration}s`);
  console.log(`   Files/second:    ${(stats.filesScanned / parseFloat(duration)).toFixed(2)}`);
  console.log('');

  if (stats.errors.length > 0) {
    console.log('❌ Errors Encountered:\n');
    stats.errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
    console.log('');
  }

  // Completion percentage
  const completionRate = stats.totalFound > 0 ? ((stats.totalReplaced / stats.totalFound) * 100).toFixed(1) : 0;
  console.log(`📈 Completion: ${completionRate}% (${stats.totalReplaced}/${stats.totalFound})\n`);

  if (dryRun) {
    console.log('💡 Run without --dry-run to apply changes');
  } else {
    console.log('✅ Cleanup Complete!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Review changes: git diff');
    console.log('   2. Run tests: npm test');
    console.log('   3. Build: npm run build:production');
    console.log('   4. Verify: node scripts/verify-console-cleanup.js');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { processFile, stats };
