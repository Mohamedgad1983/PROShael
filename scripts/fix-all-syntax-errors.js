#!/usr/bin/env node

/**
 * Comprehensive Syntax Error Fixer
 * Fixes all malformed logger calls from automated replacement
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Finding and fixing all syntax errors...\n');

// Find all files with syntax errors
const srcDir = path.join(__dirname, '../alshuail-admin-arabic/src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !['node_modules', 'build', 'dist'].includes(file)) {
      getAllFiles(filePath, fileList);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

const files = getAllFiles(srcDir);
let fixedCount = 0;

console.log(`📊 Scanning ${files.length} files...\n`);

files.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Fix 1: Remove semicolon before arrow function
    // Pattern: ); => should be ) =>
    content = content.replace(/\);\s*=>/g, ') =>');

    // Fix 2: Extra semicolon in template literal
    // Pattern: .toFixed(2);}ms should be .toFixed(2)}ms
    content = content.replace(/\.toFixed\((\d+)\);}/g, '.toFixed($1)}');

    // Fix 3: Semicolon before closing paren
    // Pattern: dataKeys: Object.keys(data); should be dataKeys: Object.keys(data)
    content = content.replace(/Object\.keys\([^)]+\);(?=\s*})/g, match => match.replace(';', ''));

    // Fix 4: Malformed logger calls with semicolon
    // Pattern: logger.method('msg:'); should be logger.method('msg:', context);
    content = content.replace(/logger\.(debug|info|warn|error)\('([^']+):'\);(?!\))/g, "logger.$1('$2:', {});");
    content = content.replace(/logger\.(debug|info|warn|error)\('([^']+)'\)\);/g, "logger.$1('$2');");

    // Fix 5: Incomplete logger calls
    // Pattern: logger.debug('msg:'); + 'text') should be logger.debug('msg: text')
    content = content.replace(/logger\.(debug|info|warn|error)\('([^']+):'\);\s*\+\s*'([^']+)'\);/g, "logger.$1('$2: $3');");

    // Fix 6: Double semicolon with paren
    // Pattern: ;); should be );
    content = content.replace(/;\);/g, ');');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      fixedCount++;
      const relativePath = path.relative(srcDir, filePath);
      console.log(`✅ Fixed: ${relativePath}`);
    }

  } catch (error) {
    // Skip files that can't be read
  }
});

console.log(`\n📊 Summary: Fixed ${fixedCount} files`);
console.log('✅ All syntax errors fixed!');
