#!/usr/bin/env node

// Emergency build script - force environment variables
process.env.BUILD_MODE = 'emergency';
process.env.NODE_OPTIONS = '--max-old-space-size=8192';
process.env.GENERATE_SOURCEMAP = 'false';

console.log('🚨 Starting EMERGENCY BUILD with ZERO optimizations');
console.log('   BUILD_MODE:', process.env.BUILD_MODE);
console.log('   NODE_ENV:', process.env.NODE_ENV);

// Run craco build
const { spawn } = require('child_process');
const build = spawn('npx', ['craco', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

build.on('exit', (code) => {
  process.exit(code);
});
