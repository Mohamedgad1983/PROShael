const fs = require('fs');
const path = require('path');

// List of components that need React.memo()
const componentsToUpdate = [
  // Dashboard components
  'alshuail-admin-arabic/src/components/Dashboard/OverviewCharts.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/OverviewStats.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/DashboardNavigation.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/RecentActivities.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/UnifiedDashboard.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/SimpleDashboard.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/AppleDashboard.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/CompleteDashboard.tsx',

  // Common components
  'alshuail-admin-arabic/src/components/Common/ErrorBoundary.jsx',
  'alshuail-admin-arabic/src/components/Common/LoadingSpinner.jsx',

  // Notifications
  'alshuail-admin-arabic/src/components/Notifications/NotificationBadge.tsx',

  // Other components needing memo
  'alshuail-admin-arabic/src/components/Dashboard/IslamicPremiumDashboard.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/UltraPremiumDashboard.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/AlShuailCorrectedDashboard.tsx',

  // Wrapper components (these typically need memo too)
  'alshuail-admin-arabic/src/components/Dashboard/AppleDashboardWrapper.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/CompleteDashboardWrapper.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/PremiumDashboardWrapper.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/SimpleDashboardWrapper.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/IslamicPremiumDashboardWrapper.tsx',

  // Member components without memo
  'alshuail-admin-arabic/src/components/Members/AppleMembersManagementWrapper.tsx',
  'alshuail-admin-arabic/src/components/Members/HijriMembersManagementWrapper.tsx',
  'alshuail-admin-arabic/src/components/Members/PremiumMembersManagementWrapper.tsx',
];

let updatedCount = 0;
let skippedCount = 0;
let errorCount = 0;

componentsToUpdate.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    errorCount++;
    return;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');

    // Check if already has React.memo
    if (content.includes('React.memo(') || content.includes('memo(')) {
      console.log(`⏭️  Already has memo: ${path.basename(filePath)}`);
      skippedCount++;
      return;
    }

    // Find the default export pattern
    const exportRegex = /export\s+default\s+(\w+);?$/m;
    const match = content.match(exportRegex);

    if (match) {
      const componentName = match[1];
      const newExport = `export default React.memo(${componentName});`;

      // Replace the export statement
      content = content.replace(exportRegex, newExport);

      // Make sure React is imported (if not already)
      if (!content.includes('import React') && !content.includes('import * as React')) {
        // Add React import if missing
        const firstImportMatch = content.match(/^import\s+/m);
        if (firstImportMatch) {
          const insertPosition = content.indexOf(firstImportMatch[0]);
          content = content.slice(0, insertPosition) +
                   `import React from 'react';\n` +
                   content.slice(insertPosition);
        }
      }

      // Write the updated content
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Updated: ${path.basename(filePath)}`);
      updatedCount++;
    } else {
      console.log(`⚠️  No default export found: ${path.basename(filePath)}`);
      skippedCount++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    errorCount++;
  }
});

console.log(`
========================================
React.memo() Application Summary:
========================================
✅ Updated: ${updatedCount} components
⏭️  Skipped: ${skippedCount} components
❌ Errors: ${errorCount} components
========================================
Total processed: ${componentsToUpdate.length} components
`);