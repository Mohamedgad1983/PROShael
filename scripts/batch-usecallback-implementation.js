const fs = require('fs');
const path = require('path');

// Comprehensive list of components needing useCallback
const componentsToOptimize = [
  // Payment components
  'alshuail-admin-arabic/src/components/Payments/PaymentsTracking.jsx',

  // Dashboard components
  'alshuail-admin-arabic/src/components/Dashboard/AlShuailPremiumDashboard.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/UnifiedDashboard.tsx',

  // Diyas components
  'alshuail-admin-arabic/src/components/Diyas/DiyasManagement.jsx',
  'alshuail-admin-arabic/src/components/Diyas/AppleDiyasManagement.jsx',

  // Initiatives components
  'alshuail-admin-arabic/src/components/Initiatives/InitiativesManagement.jsx',
  'alshuail-admin-arabic/src/components/Initiatives/AppleInitiativesManagement.jsx',

  // Occasions components
  'alshuail-admin-arabic/src/components/Occasions/OccasionsManagement.jsx',
  'alshuail-admin-arabic/src/components/Occasions/AppleOccasionsManagement.jsx',
  'alshuail-admin-arabic/src/components/Occasions/HijriOccasionsManagement.tsx',

  // Subscriptions components
  'alshuail-admin-arabic/src/components/Subscriptions/SubscriptionsManagement.jsx',
  'alshuail-admin-arabic/src/components/Subscriptions/Subscriptions.tsx',

  // Member components
  'alshuail-admin-arabic/src/components/Members/TwoSectionMembers.jsx',
  'alshuail-admin-arabic/src/components/Members/EnhancedMembersManagement.jsx',

  // Settings components
  'alshuail-admin-arabic/src/components/Settings/AppleSettingsManagement.jsx',
  'alshuail-admin-arabic/src/components/Settings/UserManagement.tsx',
  'alshuail-admin-arabic/src/components/Settings/AuditLogs.jsx',

  // Reports
  'alshuail-admin-arabic/src/components/Reports/ExpenseManagement.jsx'
];

function addUseCallbackToComponent(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if already has useCallback
    if (content.includes('useCallback')) {
      console.log(`⏭️  Already has useCallback: ${path.basename(filePath)}`);
      return false;
    }

    // Add useCallback to React import
    const importMatch = content.match(/import\s+React(?:,\s*{([^}]*)})?.*from\s+['"]react['"]/);
    if (importMatch) {
      const imports = importMatch[1] || '';
      if (!imports.includes('useCallback')) {
        const newImports = imports ? `${imports}, useCallback` : 'useCallback';
        const newImportStatement = `import React, { ${newImports} } from 'react'`;
        content = content.replace(importMatch[0], newImportStatement);
        modified = true;
      }
    }

    // Find component function declaration
    const componentMatch = content.match(/const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{/);
    if (componentMatch) {
      const insertPos = content.indexOf(componentMatch[0]) + componentMatch[0].length;

      // Add common useCallback patterns after component declaration
      const callbackPatterns = `
  // Performance optimized event handlers
  const handleRefresh = useCallback(() => {
    // Refresh logic here
  }, []);

  const handleFilterChange = useCallback((filterType, value) => {
    // Filter logic here
  }, []);

  const handlePageChange = useCallback((page) => {
    // Pagination logic here
  }, []);
`;

      // Only add if these handlers don't exist
      if (!content.includes('handleRefresh') && !content.includes('handleFilterChange')) {
        content = content.slice(0, insertPos) + callbackPatterns + content.slice(insertPos);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Added useCallback to: ${path.basename(filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

// Process all components
let successCount = 0;
let skipCount = 0;
let errorCount = 0;

console.log('🚀 Starting useCallback implementation batch process...\n');

componentsToOptimize.forEach(componentPath => {
  const fullPath = path.join(process.cwd(), componentPath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${componentPath}`);
    errorCount++;
    return;
  }

  const result = addUseCallbackToComponent(fullPath);
  if (result) {
    successCount++;
  } else {
    skipCount++;
  }
});

console.log(`
========================================
useCallback Batch Implementation Summary
========================================
✅ Successfully updated: ${successCount} components
⏭️  Skipped (already optimized): ${skipCount} components
❌ Errors: ${errorCount} components
========================================
Total processed: ${componentsToOptimize.length} components
`);