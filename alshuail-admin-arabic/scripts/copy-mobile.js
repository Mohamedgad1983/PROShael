/**
 * Copy Mobile PWA to React build directory
 * This allows serving both React admin and Mobile PWA from same deployment
 */

const fs = require('fs-extra');
const path = require('path');

const sourcePath = path.join(__dirname, '../../Mobile/dist');
const targetPath = path.join(__dirname, '../build/Mobile');

async function copyMobile() {
  try {
    console.log('📱 Copying Mobile PWA (Vite build) to React build directory...');
    console.log(`   Source: ${sourcePath}`);
    console.log(`   Target: ${targetPath}`);

    // Check if Vite dist folder exists
    if (!await fs.pathExists(sourcePath)) {
      console.log('⚠️  Mobile/dist not found. Building Mobile PWA first...');

      // Build Mobile PWA with Vite
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      try {
        await execPromise('npm run build', { cwd: path.join(__dirname, '../../Mobile') });
        console.log('✅ Mobile PWA built successfully!');
      } catch (buildError) {
        console.error('❌ Failed to build Mobile PWA:', buildError.message);
        process.exit(1);
      }
    }

    // Copy Vite dist to build/Mobile
    await fs.copy(sourcePath, targetPath, {
      overwrite: true,
      errorOnExist: false
    });

    console.log('✅ Mobile PWA copied successfully!');
    console.log(`📦 Mobile PWA will be available at: /Mobile/login.html`);
    console.log(`📊 Build contains: Bundled, minified, optimized JavaScript`);
  } catch (error) {
    console.error('❌ Error copying Mobile PWA:', error);
    process.exit(1);
  }
}

copyMobile();
