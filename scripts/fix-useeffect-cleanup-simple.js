const fs = require('fs');
const path = require('path');

// List of key components to fix
const componentsToFix = [
  'alshuail-admin-arabic/src/components/Members/AppleMembersManagement.jsx',
  'alshuail-admin-arabic/src/components/Dashboard/AlShuailPremiumDashboard.tsx',
  'alshuail-admin-arabic/src/components/Dashboard/UnifiedDashboard.tsx',
  'alshuail-admin-arabic/src/components/MemberMonitoring/MemberMonitoringDashboard.jsx',
  'alshuail-admin-arabic/src/components/Payments/PaymentsTracking.jsx',
  'alshuail-admin-arabic/src/components/Diyas/DiyasManagement.jsx',
  'alshuail-admin-arabic/src/components/Diyas/AppleDiyasManagement.jsx',
  'alshuail-admin-arabic/src/components/Initiatives/InitiativesManagement.jsx',
  'alshuail-admin-arabic/src/components/Initiatives/AppleInitiativesManagement.jsx',
  'alshuail-admin-arabic/src/components/Occasions/OccasionsManagement.jsx',
  'alshuail-admin-arabic/src/components/Occasions/AppleOccasionsManagement.jsx',
  'alshuail-admin-arabic/src/components/Subscriptions/SubscriptionsManagement.jsx',
  'alshuail-admin-arabic/src/components/Members/TwoSectionMembers.jsx',
  'alshuail-admin-arabic/src/components/Members/EnhancedMembersManagement.jsx',
  'alshuail-admin-arabic/src/components/Members/AppleRegistrationForm.tsx',
  'alshuail-admin-arabic/src/components/Registration/PremiumRegistration.tsx',
  'alshuail-admin-arabic/src/components/Settings/AppleSettingsManagement.jsx',
  'alshuail-admin-arabic/src/components/Settings/UserManagement.tsx',
  'alshuail-admin-arabic/src/components/Reports/ExpenseManagement.jsx',
  'alshuail-admin-arabic/src/components/Dashboard/OverviewCharts.tsx'
];

let totalFixed = 0;
let filesModified = 0;

function addUseEffectCleanup(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let fixCount = 0;

    // Find all useEffect hooks and check for cleanup
    const useEffectRegex = /useEffect\(\(\)\s*=>\s*{([^}]+)}\s*,\s*\[[^\]]*\]\)/g;

    content = content.replace(useEffectRegex, (match, body) => {
      // Check if already has return cleanup
      if (body.includes('return')) {
        return match;
      }

      // Check for common patterns needing cleanup
      if (body.includes('setTimeout')) {
        const timerMatch = body.match(/(?:const|let)\s+(\w+)\s*=\s*setTimeout/);
        if (timerMatch) {
          fixCount++;
          modified = true;
          const timerName = timerMatch[1];
          return match.replace(/}\s*,\s*\[/, `\n    return () => clearTimeout(${timerName});\n  }, [`);
        }
      }

      if (body.includes('setInterval')) {
        const intervalMatch = body.match(/(?:const|let)\s+(\w+)\s*=\s*setInterval/);
        if (intervalMatch) {
          fixCount++;
          modified = true;
          const intervalName = intervalMatch[1];
          return match.replace(/}\s*,\s*\[/, `\n    return () => clearInterval(${intervalName});\n  }, [`);
        }
      }

      if (body.includes('addEventListener')) {
        const listenerMatch = body.match(/(\w+)\.addEventListener\(['"](\w+)['"],\s*(\w+)/);
        if (listenerMatch) {
          fixCount++;
          modified = true;
          const [, target, event, handler] = listenerMatch;
          return match.replace(/}\s*,\s*\[/, `\n    return () => ${target}.removeEventListener('${event}', ${handler});\n  }, [`);
        }
      }

      if (body.includes('subscribe')) {
        const subMatch = body.match(/(?:const|let)\s+(\w+)\s*=\s*\w+\.subscribe/);
        if (subMatch) {
          fixCount++;
          modified = true;
          const subName = subMatch[1];
          return match.replace(/}\s*,\s*\[/, `\n    return () => ${subName}.unsubscribe();\n  }, [`);
        }
      }

      return match;
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${fixCount} useEffect hooks in: ${path.basename(filePath)}`);
      totalFixed += fixCount;
      filesModified++;
      return fixCount;
    } else {
      console.log(`⏭️  No cleanup needed in: ${path.basename(filePath)}`);
    }

    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    return 0;
  }
}

console.log('🔧 Fixing useEffect cleanup patterns...\n');

// Process all component files
componentsToFix.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    addUseEffectCleanup(fullPath);
  } else {
    console.log(`❌ File not found: ${file}`);
  }
});

console.log(`
========================================
useEffect Cleanup Fix Summary
========================================
✅ Total hooks fixed: ${totalFixed}
📁 Files modified: ${filesModified}
📊 Files processed: ${componentsToFix.length}
========================================

Cleanup patterns added for:
- setTimeout → clearTimeout
- setInterval → clearInterval
- addEventListener → removeEventListener
- subscribe → unsubscribe
`);