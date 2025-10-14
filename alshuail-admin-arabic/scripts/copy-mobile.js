/**
 * Copy Mobile PWA to React build directory
 * This allows serving both React admin and Mobile PWA from same deployment
 */

const fs = require('fs-extra');
const path = require('path');

const sourcePath = path.join(__dirname, '../../Mobile');
const targetPath = path.join(__dirname, '../build/Mobile');

async function copyMobile() {
  try {
    console.log('📱 Copying Mobile PWA to build directory...');
    console.log(`   Source: ${sourcePath}`);
    console.log(`   Target: ${targetPath}`);

    // Copy entire Mobile directory to build/Mobile
    await fs.copy(sourcePath, targetPath, {
      overwrite: true,
      errorOnExist: false,
      filter: (src) => {
        // Exclude documentation and unnecessary files
        const exclude = [
          '.md',
          'PHASE_',
          'COMPLETE_TEST',
          'COMPREHENSIVE_',
          'SECURITY_AUDIT',
          'claudedocs',
          'generate-icons.js',
          'generate-pwa-icons.html',
          'update-api-client-csrf.js',
          'logo (2).pdf'
        ];

        return !exclude.some(pattern => src.includes(pattern));
      }
    });

    console.log('✅ Mobile PWA copied successfully!');
    console.log(`📦 Mobile PWA will be available at: /Mobile/login.html`);
  } catch (error) {
    console.error('❌ Error copying Mobile PWA:', error);
    process.exit(1);
  }
}

copyMobile();
