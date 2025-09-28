#!/usr/bin/env node

/**
 * Browser-Use MCP Diagnostic Tool
 * Diagnoses issues with browser-use MCP server connection
 */

const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function checkBrowserUseMCP() {
  console.log('============================================================');
  console.log(`${colors.blue}BROWSER-USE MCP DIAGNOSTIC TOOL${colors.reset}`);
  console.log('============================================================\n');

  let fixes = [];

  // 1. Check uvx installation
  console.log(`${colors.yellow}1. Checking uvx installation...${colors.reset}`);
  try {
    const { stdout: uvxVersion } = await execPromise('uvx --version');
    console.log(`   ✅ uvx is installed: ${uvxVersion.trim()}`);
  } catch (error) {
    console.log(`   ${colors.red}❌ uvx is not installed or not in PATH${colors.reset}`);
    fixes.push('Install uv: pip install uv');
    return fixes;
  }

  // 2. Check Python version
  console.log(`\n${colors.yellow}2. Checking Python installation...${colors.reset}`);
  try {
    const { stdout: pythonVersion } = await execPromise('python --version');
    console.log(`   ✅ Python is installed: ${pythonVersion.trim()}`);
  } catch (error) {
    console.log(`   ${colors.red}❌ Python is not installed or not in PATH${colors.reset}`);
    fixes.push('Install Python 3.8 or later');
    return fixes;
  }

  // 3. Check environment encoding
  console.log(`\n${colors.yellow}3. Checking environment encoding...${colors.reset}`);
  try {
    const { stdout: encoding } = await execPromise('echo %PYTHONIOENCODING%');
    if (encoding.trim() === '%PYTHONIOENCODING%' || !encoding.trim()) {
      console.log(`   ⚠️  PYTHONIOENCODING not set`);
      fixes.push('set PYTHONIOENCODING=utf-8');
    } else {
      console.log(`   ✅ PYTHONIOENCODING is set to: ${encoding.trim()}`);
    }
  } catch (error) {
    console.log('   ⚠️  Could not check PYTHONIOENCODING');
  }

  // 4. Test browser-use package
  console.log(`\n${colors.yellow}4. Testing browser-use package...${colors.reset}`);

  return new Promise((resolve) => {
    const child = spawn('cmd', ['/c', 'uvx browser-use --version'], {
      stdio: 'pipe',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0 && output) {
        console.log(`   ✅ browser-use is accessible`);
        console.log(`      Version: ${output.trim()}`);
      } else {
        console.log(`   ${colors.red}❌ browser-use failed to run${colors.reset}`);

        if (errorOutput.includes('ModuleNotFoundError') && errorOutput.includes('textual')) {
          console.log(`   ${colors.red}Issue: Missing 'textual' module (CLI dependency)${colors.reset}`);
          fixes.push('pip install "browser-use[cli]"');
          fixes.push('pip install textual');
        } else if (errorOutput.includes('UnicodeEncodeError')) {
          console.log(`   ${colors.red}Issue: Character encoding problem${colors.reset}`);
          fixes.push('set PYTHONIOENCODING=utf-8');
        } else {
          console.log(`   Error: ${errorOutput.substring(0, 200)}`);
          fixes.push('pip install "browser-use[cli]"');
        }
      }

      // 5. Test MCP mode
      console.log(`\n${colors.yellow}5. Testing browser-use MCP mode...${colors.reset}`);
      console.log('   Starting MCP server (3 second test)...');

      const mcpChild = spawn('cmd', ['/c', 'uvx browser-use --mcp'], {
        stdio: 'pipe',
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      let mcpOutput = '';
      let mcpError = '';
      let serverStarted = false;

      mcpChild.stdout.on('data', (data) => {
        mcpOutput += data.toString();
        // Check for MCP server initialization
        if (data.toString().includes('capabilities') ||
            data.toString().includes('initialize') ||
            data.toString().includes('MCP')) {
          serverStarted = true;
        }
      });

      mcpChild.stderr.on('data', (data) => {
        mcpError += data.toString();
      });

      // Give it 3 seconds to start
      setTimeout(() => {
        mcpChild.kill();

        if (serverStarted || mcpOutput.includes('MCP')) {
          console.log(`   ✅ MCP server appears to be starting correctly`);
        } else if (mcpError.includes('ModuleNotFoundError')) {
          console.log(`   ${colors.red}❌ MCP server failed - missing modules${colors.reset}`);
          if (!fixes.includes('pip install "browser-use[cli]"')) {
            fixes.push('pip install "browser-use[cli]"');
          }
        } else if (mcpError.includes('UnicodeEncodeError')) {
          console.log(`   ${colors.red}❌ MCP server failed - encoding issue${colors.reset}`);
          if (!fixes.includes('set PYTHONIOENCODING=utf-8')) {
            fixes.push('set PYTHONIOENCODING=utf-8');
          }
        } else {
          console.log(`   ⚠️  MCP server status unclear`);
          if (mcpOutput) console.log(`      Stdout: ${mcpOutput.substring(0, 100)}`);
          if (mcpError) console.log(`      Stderr: ${mcpError.substring(0, 100)}`);
        }

        // Display recommendations
        console.log('\n' + '='.repeat(60));
        console.log(`${colors.green}DIAGNOSTIC COMPLETE${colors.reset}`);
        console.log('='.repeat(60));

        if (fixes.length > 0) {
          console.log(`\n${colors.yellow}RECOMMENDED FIXES:${colors.reset}`);
          fixes.forEach((fix, index) => {
            console.log(`${index + 1}. ${fix}`);
          });

          console.log(`\n${colors.yellow}After applying fixes:${colors.reset}`);
          console.log('1. Restart Claude: claude restart');
          console.log('2. Check MCP status: claude mcp list');
        } else {
          console.log(`\n${colors.green}✅ No issues detected!${colors.reset}`);
          console.log('\nIf browser-use still doesn\'t connect:');
          console.log('1. Try: claude restart');
          console.log('2. Check: claude mcp list');
        }

        resolve(fixes);
      }, 3000);
    });
  });
}

// Run diagnostics
checkBrowserUseMCP()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`${colors.red}Error running diagnostics:${colors.reset}`, error);
    process.exit(1);
  });