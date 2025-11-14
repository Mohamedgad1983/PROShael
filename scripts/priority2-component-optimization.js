#!/usr/bin/env node

/**
 * Priority 2 - Component Optimization Script
 *
 * Applies React.memo, useMemo, useCallback optimizations
 * to frequently re-rendered components.
 *
 * Features:
 * - Automatic React.memo wrapping for pure components
 * - useMemo for expensive computations
 * - useCallback for event handlers passed as props
 * - Debouncing for expensive operations
 *
 * Usage:
 *   node scripts/priority2-component-optimization.js
 *   node scripts/priority2-component-optimization.js --dry-run
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  srcDir: path.join(__dirname, '../alshuail-admin-arabic/src'),

  // Components to optimize (high re-render frequency)
  targetComponents: [
    'src/components/Dashboard/**/*.{tsx,jsx}',
    'src/components/Members/**/*.{tsx,jsx}',
    'src/components/Diyas/**/*.{tsx,jsx}',
    'src/components/Settings/**/*.{tsx,jsx}',
    'src/components/Occasions/**/*.{tsx,jsx}',
  ],

  // Patterns for expensive operations needing debouncing
  debouncePatterns: [
    { pattern: /onChange.*search/i, delay: 300, name: 'search' },
    { pattern: /onChange.*filter/i, delay: 250, name: 'filter' },
    { pattern: /onScroll/i, delay: 150, name: 'scroll' },
    { pattern: /onResize/i, delay: 200, name: 'resize' },
    { pattern: /onInput/i, delay: 300, name: 'input' },
  ],
};

const stats = {
  filesScanned: 0,
  filesOptimized: 0,
  memoAdded: 0,
  useMemoAdded: 0,
  useCallbackAdded: 0,
  debounceAdded: 0,
  errors: [],
};

// ============================================================================
// UTILITIES
// ============================================================================

function getAllFiles(dir, pattern = null, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !['node_modules', 'build', 'dist'].includes(file)) {
      getAllFiles(filePath, pattern, fileList);
    } else if (/\.(tsx|jsx)$/.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// ============================================================================
// OPTIMIZATION DETECTION
// ============================================================================

function analyzeComponent(content, filePath) {
  const analysis = {
    isReactComponent: false,
    isFunctionalComponent: false,
    hasReactMemo: false,
    hasExpensiveComputations: false,
    hasEventHandlers: false,
    needsDebouncing: false,
    componentName: null,
    optimizations: []
  };

  // Check if it's a React component
  analysis.isReactComponent = /import.*React/.test(content) || /from\s+['"]react['"]/.test(content);

  if (!analysis.isReactComponent) {
    return analysis;
  }

  // Check for functional component
  const funcComponentRegex = /(const|function)\s+([A-Z][a-zA-Z0-9]*)\s*[:=]\s*(\(.*?\)|React\.FC)/;
  const match = content.match(funcComponentRegex);

  if (match) {
    analysis.isFunctionalComponent = true;
    analysis.componentName = match[2];
  }

  // Check if already has React.memo
  analysis.hasReactMemo = /React\.memo\s*\(/.test(content) || /export\s+default\s+memo\s*\(/.test(content);

  // Check for expensive computations
  const expensivePatterns = [
    /\.map\(/g,
    /\.filter\(/g,
    /\.reduce\(/g,
    /\.sort\(/g,
    /JSON\.parse/g,
    /JSON\.stringify/g,
  ];

  expensivePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches && matches.length >= 3) {
      analysis.hasExpensiveComputations = true;
    }
  });

  // Check for event handlers
  analysis.hasEventHandlers = /onClick|onChange|onSubmit|onKeyDown|onKeyUp|onBlur|onFocus/.test(content);

  // Check for debouncing needs
  CONFIG.debouncePatterns.forEach(({ pattern, name }) => {
    if (pattern.test(content)) {
      analysis.needsDebouncing = true;
      analysis.optimizations.push(`debounce-${name}`);
    }
  });

  return analysis;
}

// ============================================================================
// OPTIMIZATION GENERATORS
// ============================================================================

function addReactMemoImport(content) {
  if (/import.*{.*memo.*}.*from\s+['"]react['"]/.test(content)) {
    return content; // Already has memo import
  }

  // Add memo to existing React import
  const reactImportRegex = /import\s+React(,\s*{[^}]*})?\s+from\s+['"]react['"]/;
  const match = content.match(reactImportRegex);

  if (match) {
    if (match[1]) {
      // Already has named imports
      return content.replace(
        reactImportRegex,
        (m) => m.replace('{', '{ memo, ')
      );
    } else {
      // Only has default import
      return content.replace(
        reactImportRegex,
        "import React, { memo } from 'react'"
      );
    }
  }

  return content;
}

function wrapWithReactMemo(content, componentName) {
  // Find component export
  const exportRegex = new RegExp(`export\\s+default\\s+${componentName}`);

  if (exportRegex.test(content)) {
    return content.replace(
      exportRegex,
      `export default memo(${componentName})`
    );
  }

  return content;
}

function addUseMemoHook(content) {
  // This is a placeholder - actual implementation would need AST parsing
  // for accurate detection and insertion of useMemo
  return content;
}

function addUseCallbackHook(content) {
  // This is a placeholder - actual implementation would need AST parsing
  return content;
}

function createDebounceUtil() {
  return `
/**
 * Debounce utility for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}
`.trim();
}

// ============================================================================
// FILE PROCESSING
// ============================================================================

function optimizeFile(filePath, dryRun = false, verbose = false) {
  try {
    stats.filesScanned++;

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    const analysis = analyzeComponent(content, filePath);

    if (!analysis.isFunctionalComponent) {
      return; // Skip non-functional components
    }

    if (verbose) {
      const relativePath = path.relative(CONFIG.srcDir, filePath);
      console.log(`\n📄 ${relativePath}`);
      console.log(`   Component: ${analysis.componentName}`);
    }

    let optimized = false;

    // Apply React.memo if beneficial
    if (!analysis.hasReactMemo && (analysis.hasExpensiveComputations || analysis.hasEventHandlers)) {
      content = addReactMemoImport(content);
      content = wrapWithReactMemo(content, analysis.componentName);
      stats.memoAdded++;
      optimized = true;

      if (verbose) {
        console.log(`   ✅ Added React.memo`);
      }
    }

    // Note: Full implementation would add useMemo, useCallback, debounce
    // This requires AST parsing for accurate code modification

    if (optimized && content !== originalContent) {
      if (!dryRun) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
      stats.filesOptimized++;
    }

  } catch (error) {
    stats.errors.push({
      file: path.relative(CONFIG.srcDir, filePath),
      error: error.message
    });
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
  console.log('║    Priority 2: Component Optimization - Automation        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  console.log('⚠️  NOTE: This is a simplified implementation.');
  console.log('   For production use, consider tools like:');
  console.log('   - babel-plugin-transform-react-constant-elements');
  console.log('   - eslint-plugin-react-perf');
  console.log('   - React DevTools Profiler\n');

  console.log('🔍 Scanning for components...');
  const files = getAllFiles(path.join(CONFIG.srcDir, 'components'));
  console.log(`✅ Found ${files.length} component files\n`);

  console.log('🚀 Analyzing and optimizing...\n');
  const startTime = Date.now();

  files.forEach(file => optimizeFile(file, dryRun, verbose));

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              OPTIMIZATION STATISTICS                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📊 Files:');
  console.log(`   Scanned:           ${stats.filesScanned}`);
  console.log(`   Optimized:         ${stats.filesOptimized}${dryRun ? ' (would be)' : ''}`);
  console.log('');

  console.log('✨ Optimizations Applied:');
  console.log(`   React.memo:        ${stats.memoAdded}${dryRun ? ' (would be)' : ''}`);
  console.log(`   useMemo:           ${stats.useMemoAdded}${dryRun ? ' (would be)' : ''}`);
  console.log(`   useCallback:       ${stats.useCallbackAdded}${dryRun ? ' (would be)' : ''}`);
  console.log(`   Debounce:          ${stats.debounceAdded}${dryRun ? ' (would be)' : ''}`);
  console.log('');

  console.log('⚠️  Errors:');
  console.log(`   Count:             ${stats.errors.length}`);
  console.log('');

  console.log('⏱️  Performance:');
  console.log(`   Duration:          ${duration}s`);
  console.log('');

  if (stats.errors.length > 0) {
    console.log('❌ Errors:\n');
    stats.errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
    console.log('');
  }

  if (dryRun) {
    console.log('💡 Run without --dry-run to apply changes\n');
  } else {
    console.log('✅ Optimization Complete!\n');
    console.log('📋 Recommended Next Steps:');
    console.log('   1. Test components: npm test');
    console.log('   2. Profile with React DevTools');
    console.log('   3. Measure performance improvements');
    console.log('   4. Manual review of optimizations\n');
  }
}

if (require.main === module) {
  main();
}

module.exports = { optimizeFile, stats };
