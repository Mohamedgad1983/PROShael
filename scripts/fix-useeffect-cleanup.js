const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all React component files
const componentFiles = [
  ...glob.sync('alshuail-admin-arabic/src/components/**/*.jsx'),
  ...glob.sync('alshuail-admin-arabic/src/components/**/*.tsx')
];

let totalFixed = 0;
let filesModified = 0;

function fixUseEffectCleanup(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let fixCount = 0;

    // Pattern 1: setTimeout without cleanup
    const setTimeoutPattern = /useEffect\(\(\)\s*=>\s*{\s*(?:const\s+)?(\w+)\s*=\s*setTimeout\([^}]+}\s*,\s*\[[^\]]*\]\)/gs;
    content = content.replace(setTimeoutPattern, (match, timerVar) => {
      if (!match.includes('return')) {
        fixCount++;
        modified = true;
        // Add cleanup return
        const cleanupMatch = match.replace(/}\s*,\s*\[/, `\n    return () => clearTimeout(${timerVar || 'timer'});\n  }, [`);
        return cleanupMatch;
      }
      return match;
    });

    // Pattern 2: setInterval without cleanup
    const setIntervalPattern = /useEffect\(\(\)\s*=>\s*{\s*(?:const\s+)?(\w+)\s*=\s*setInterval\([^}]+}\s*,\s*\[[^\]]*\]\)/gs;
    content = content.replace(setIntervalPattern, (match, intervalVar) => {
      if (!match.includes('return')) {
        fixCount++;
        modified = true;
        const cleanupMatch = match.replace(/}\s*,\s*\[/, `\n    return () => clearInterval(${intervalVar || 'interval'});\n  }, [`);
        return cleanupMatch;
      }
      return match;
    });

    // Pattern 3: Event listeners without cleanup
    const eventListenerPattern = /useEffect\(\(\)\s*=>\s*{\s*([^}]*addEventListener[^}]+)}\s*,\s*\[[^\]]*\]\)/gs;
    content = content.replace(eventListenerPattern, (match, body) => {
      if (!match.includes('return') && !match.includes('removeEventListener')) {
        // Extract event listener details
        const listenerMatch = body.match(/(\w+)\.addEventListener\(['"](\w+)['"]/);
        if (listenerMatch) {
          fixCount++;
          modified = true;
          const [, target, eventType] = listenerMatch;
          const handlerMatch = body.match(/addEventListener\([^,]+,\s*(\w+)/);
          const handler = handlerMatch ? handlerMatch[1] : 'handler';

          return match.replace(/}\s*,\s*\[/, `\n    return () => ${target}.removeEventListener('${eventType}', ${handler});\n  }, [`);
        }
      }
      return match;
    });

    // Pattern 4: Subscription patterns without cleanup
    const subscriptionPattern = /useEffect\(\(\)\s*=>\s*{\s*(?:const\s+)?(\w+)\s*=\s*(\w+)\.subscribe\([^}]+}\s*,\s*\[[^\]]*\]\)/gs;
    content = content.replace(subscriptionPattern, (match, subVar, service) => {
      if (!match.includes('return') && !match.includes('unsubscribe')) {
        fixCount++;
        modified = true;
        const cleanupMatch = match.replace(/}\s*,\s*\[/, `\n    return () => ${subVar}.unsubscribe();\n  }, [`);
        return cleanupMatch;
      }
      return match;
    });

    // Pattern 5: Async operations that need abort controller
    const asyncPattern = /useEffect\(\(\)\s*=>\s*{\s*(?:const\s+)?fetchData\s*=\s*async[^}]+fetch\([^}]+}\s*,\s*\[[^\]]*\]\)/gs;
    content = content.replace(asyncPattern, (match) => {
      if (!match.includes('AbortController') && !match.includes('return')) {
        fixCount++;
        modified = true;
        // Add abort controller
        const withAbort = match.replace('useEffect(() => {',
          'useEffect(() => {\n    const abortController = new AbortController();')
          .replace('fetch(', 'fetch(')
          .replace(/}\s*,\s*\[/, '\n    return () => abortController.abort();\n  }, [');
        return withAbort;
      }
      return match;
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${fixCount} useEffect hooks in: ${path.basename(filePath)}`);
      totalFixed += fixCount;
      filesModified++;
      return fixCount;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    return 0;
  }
}

console.log('🔧 Fixing useEffect cleanup patterns...\n');

// Process all component files
componentFiles.forEach(file => {
  fixUseEffectCleanup(file);
});

console.log(`
========================================
useEffect Cleanup Fix Summary
========================================
✅ Total hooks fixed: ${totalFixed}
📁 Files modified: ${filesModified}
📊 Files scanned: ${componentFiles.length}
========================================

Common patterns fixed:
- setTimeout without clearTimeout
- setInterval without clearInterval
- addEventListener without removeEventListener
- Subscriptions without unsubscribe
- Async operations without abort

Next step: Test components to ensure cleanup works correctly
`);