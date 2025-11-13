#!/usr/bin/env node

// Emergency build script with cache disabled
process.env.BUILD_MODE = 'emergency';
process.env.REACT_APP_ENV = 'production';
process.env.GENERATE_SOURCEMAP = 'false';

console.log('🚨 EMERGENCY BUILD MODE ACTIVATED');
console.log('   - Webpack caching: DISABLED');
console.log('   - Tree shaking: DISABLED');
console.log('   - Minification: DISABLED');
console.log('');

const { execSync } = require('child_process');

try {
  execSync('npx craco build', {
    stdio: 'inherit',
    env: process.env
  });
  console.log('\n✅ Emergency build completed successfully!');
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
