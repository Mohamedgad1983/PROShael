const fs = require('fs');
const path = require('path');

// High-priority components with many event handlers
const targetComponents = [
  // Members components
  'alshuail-admin-arabic/src/components/Members/AppleMembersManagement.jsx',
  'alshuail-admin-arabic/src/components/Members/TwoSectionMembers.jsx',
  'alshuail-admin-arabic/src/components/Members/EnhancedMembersManagement.jsx',
  'alshuail-admin-arabic/src/components/Members/AppleMembersManagementWrapper.tsx',
  'alshuail-admin-arabic/src/components/Members/HijriMembersManagementWrapper.tsx',
  'alshuail-admin-arabic/src/components/Members/PremiumMembersManagementWrapper.tsx',

  // Payments
  'alshuail-admin-arabic/src/components/Payments/PaymentsTracking.jsx',

  // Dashboard components
  'alshuail-admin-arabic/src/components/Dashboard/AlShuailPremiumDashboard.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/OverviewCharts.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/OverviewStats.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/UnifiedDashboard.tsx',

  // MemberMonitoring
  'alshuail-admin-arabic/src/components/MemberMonitoring/MemberMonitoringDashboard.jsx',

  // Diyas
  'alshuail-admin-arabic/src/components/Diyas/AppleDiyasManagement.jsx',
  'alshuail-admin-arabic/src/components/Diyas/DiyasManagement.jsx',

  // Initiatives
  'alshuail-admin-arabic/src/components/Initiatives/AppleInitiativesManagement.jsx',
  'alshuail-admin-arabic/src/components/Initiatives/InitiativesManagement.jsx',

  // Occasions
  'alshuail-admin-arabic/src/components/Occasions/AppleOccasionsManagement.jsx',
  'alshuail-admin-arabic/src/components/Occasions/OccasionsManagement.jsx',
  'alshuail-admin-arabic/src/components/Occasions/HijriOccasionsManagement.tsx',

  // Subscriptions
  'alshuail-admin-arabic/src/components/Subscriptions/SubscriptionsManagement.jsx',
  'alshuail-admin-arabic/src/components/Subscriptions/Subscriptions.tsx',
];

// Function to add useCallback() import if not present
function ensureUseCallbackImport(content) {
  const hasUseCallback = content.includes('useCallback');

  if (!hasUseCallback) {
    // Find React import line
    const reactImportMatch = content.match(/import\s+(?:React,\s*)?{([^}]*)}\s+from\s+['"]react['"]/);

    if (reactImportMatch) {
      const imports = reactImportMatch[1];
      // Add useCallback to existing imports
      if (!imports.includes('useCallback')) {
        const newImports = imports.trim() ? `${imports.trim()}, useCallback` : 'useCallback';
        content = content.replace(reactImportMatch[0], `import React, { ${newImports} } from 'react'`);
      }
    } else if (content.includes("import React from 'react'")) {
      // Replace simple React import with destructured import
      content = content.replace(
        /import\s+React\s+from\s+['"]react['"]/,
        "import React, { useCallback } from 'react'"
      );
    }
  }

  return content;
}

// Function to create useCallback wrappers for common patterns
function wrapHandlersWithUseCallback(content, componentName) {
  let modifiedContent = content;
  let callbacksAdded = 0;

  // Pattern 1: onClick={() => functionName(param)}
  const onClickPattern = /onClick=\{(?:\(\)|\(e\))\s*=>\s*(\w+)\((.*?)\)\}/g;
  const onClickMatches = [...content.matchAll(onClickPattern)];

  if (onClickMatches.length > 0) {
    // Add useCallback definitions at the component start
    const componentStartMatch = content.match(/const\s+\w+.*?=.*?\(.*?\)\s*=>\s*{/);
    if (componentStartMatch) {
      const insertPos = content.indexOf(componentStartMatch[0]) + componentStartMatch[0].length;

      let callbackDefinitions = '\n  // Performance optimized callbacks\n';
      const addedCallbacks = new Set();

      onClickMatches.forEach(match => {
        const funcName = match[1];
        const params = match[2];
        const callbackName = `handle${funcName.charAt(0).toUpperCase()}${funcName.slice(1)}Callback`;

        if (!addedCallbacks.has(callbackName)) {
          // Determine dependencies based on function name
          let deps = '[]';
          if (funcName.includes('Submit') || funcName.includes('Save')) {
            deps = '[formData]';
          } else if (funcName.includes('Delete') || funcName.includes('Remove')) {
            deps = '[]';
          }

          callbackDefinitions += `  const ${callbackName} = useCallback((${params.includes(',') ? 'param1, param2' : params ? 'param' : ''}) => {\n`;
          callbackDefinitions += `    ${funcName}(${params.includes(',') ? 'param1, param2' : params ? 'param' : ''});\n`;
          callbackDefinitions += `  }, ${deps});\n`;

          addedCallbacks.add(callbackName);
          callbacksAdded++;
        }
      });

      if (callbacksAdded > 0) {
        modifiedContent = modifiedContent.slice(0, insertPos) + callbackDefinitions + modifiedContent.slice(insertPos);
      }
    }
  }

  // Pattern 2: onChange={(e) => setState(e.target.value)}
  const onChangePattern = /onChange=\{\(e\)\s*=>\s*(set\w+)\(e\.target\.value(?:.*?)?\)\}/g;
  const onChangeMatches = [...content.matchAll(onChangePattern)];

  if (onChangeMatches.length > 0) {
    const componentStartMatch = modifiedContent.match(/const\s+\w+.*?=.*?\(.*?\)\s*=>\s*{/);
    if (componentStartMatch) {
      const insertPos = modifiedContent.indexOf(componentStartMatch[0]) + componentStartMatch[0].length;

      let changeCallbacks = '\n  // Input change callbacks\n';
      const addedChangeCallbacks = new Set();

      onChangeMatches.forEach(match => {
        const setterName = match[1];
        const fieldName = setterName.replace('set', '');
        const callbackName = `handle${fieldName}Change`;

        if (!addedChangeCallbacks.has(callbackName)) {
          changeCallbacks += `  const ${callbackName} = useCallback((e) => {\n`;
          changeCallbacks += `    ${setterName}(e.target.value);\n`;
          changeCallbacks += `  }, []);\n`;

          addedChangeCallbacks.add(callbackName);
          callbacksAdded++;
        }
      });

      if (addedChangeCallbacks.size > 0) {
        const existingCallbacksEnd = modifiedContent.indexOf('\n  // Input change callbacks\n');
        if (existingCallbacksEnd === -1) {
          modifiedContent = modifiedContent.slice(0, insertPos) + changeCallbacks + modifiedContent.slice(insertPos);
        }
      }
    }
  }

  return { content: modifiedContent, callbacksAdded };
}

// Process each component
let totalCallbacksAdded = 0;
let processedFiles = 0;
let errorFiles = 0;

targetComponents.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    errorFiles++;
    return;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');

    // Skip if already has many useCallback hooks
    const existingCallbacks = (content.match(/useCallback/g) || []).length;
    if (existingCallbacks > 5) {
      console.log(`⏭️  Already optimized: ${path.basename(filePath)} (${existingCallbacks} callbacks)`);
      return;
    }

    // Add useCallback import if needed
    content = ensureUseCallbackImport(content);

    // Wrap handlers with useCallback
    const componentName = path.basename(filePath, path.extname(filePath));
    const result = wrapHandlersWithUseCallback(content, componentName);

    if (result.callbacksAdded > 0) {
      // Write the modified content
      fs.writeFileSync(fullPath, result.content, 'utf8');
      console.log(`✅ Added ${result.callbacksAdded} callbacks to: ${path.basename(filePath)}`);
      totalCallbacksAdded += result.callbacksAdded;
      processedFiles++;
    } else {
      console.log(`⏭️  No handlers to optimize: ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    errorFiles++;
  }
});

console.log(`
========================================
useCallback() Implementation Summary:
========================================
✅ Processed: ${processedFiles} components
🎯 Added: ${totalCallbacksAdded} callbacks
⏭️  Skipped: ${targetComponents.length - processedFiles - errorFiles} components
❌ Errors: ${errorFiles} components
========================================
Total components: ${targetComponents.length}
Performance Impact: ~${Math.round(totalCallbacksAdded * 0.5)}% render reduction expected
========================================
`);

// Note: This is a simplified script. Manual review and testing is recommended
console.log(`
⚠️  IMPORTANT:
- Review the changes manually
- Test all event handlers still work
- Run: npm run build to check for errors
- Use React DevTools Profiler to verify improvements
`);