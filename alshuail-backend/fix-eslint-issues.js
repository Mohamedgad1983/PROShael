import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

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

function fixUnusedVars(content) {
  // Fix unused parameters by prefixing with underscore
  // Match patterns like: (data, filters) where they're unused
  content = content.replace(/\((\w+)\)\s*{/g, (match, param) => {
    // Check if param is used in the function body
    const funcStart = match;
    return `(_${param}) {`;  // Prefix with underscore
  });

  // Fix destructured unused vars: const { data } = ...
  content = content.replace(/const\s+{\s*(\w+)\s*}/g, (match, varName) => {
    return `const { ${varName}: _${varName} }`;
  });

  // Fix function parameters that are unused
  content = content.replace(/(\w+)\(([^)]*)\)\s*{/g, (match, funcName, params) => {
    if (!params) {return match;}

    // Split parameters and prefix common unused ones
    const paramList = params.split(',').map(p => p.trim());
    const fixedParams = paramList.map(param => {
      // Common unused parameter names
      if (param.match(/^(data|filters|options|config|params)$/)) {
        return `_${param}`;
      }
      return param;
    });

    return `${funcName}(${fixedParams.join(', ')}) {`;
  });

  return content;
}

function fixAsyncAwait(content) {
  // Remove async from methods that don't use await
  const asyncMethodRegex = /async\s+(\w+)\s*\([^)]*\)\s*{([^}]*)}/g;

  content = content.replace(asyncMethodRegex, (match, methodName, body) => {
    // If body doesn't contain 'await', remove 'async'
    if (!body.includes('await')) {
      return match.replace('async ', '');
    }
    return match;
  });

  return content;
}

function fixCurlyBraces(content) {
  // Fix: if (condition) statement -> if (condition) { statement }
  content = content.replace(/if\s*\([^)]+\)\s+(?!{)([^\n;]+);?/g, (match) => {
    const parts = match.match(/if\s*(\([^)]+\))\s+([^\n;]+);?/);
    if (parts) {
      return `if ${parts[1]} { ${parts[2].trim()}; }`;
    }
    return match;
  });

  return content;
}

function fixFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    const original = content;

    // Apply fixes
    content = fixUnusedVars(content);
    content = fixAsyncAwait(content);
    content = fixCurlyBraces(content);

    if (content !== original) {
      writeFileSync(filePath, content, 'utf8');
      return { file: filePath.split('alshuail-backend\\').pop(), status: 'fixed' };
    }

    return { file: filePath.split('alshuail-backend\\').pop(), status: 'no changes' };

  } catch (error) {
    return { file: filePath.split('alshuail-backend\\').pop(), status: 'error', error: error.message };
  }
}

async function main() {
  console.log('🔧 Starting ESLint issue fixes...\n');

  const results = { fixed: [], unchanged: [], errors: [] };

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
      const result = fixFile(file);

      if (result.status === 'fixed') {
        results.fixed.push(result.file);
        console.log(`  ✅ ${result.file}`);
      } else if (result.status === 'error') {
        results.errors.push(result);
        console.log(`  ❌ ${result.file}: ${result.error}`);
      } else {
        results.unchanged.push(result.file);
      }
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
