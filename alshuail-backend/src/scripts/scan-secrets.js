#!/usr/bin/env node
/**
 * Pre-commit Security Scanner
 * Scans staged files for hardcoded secrets before allowing commits
 * Blocks commits if secrets are detected
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security patterns to detect (same as cleanup script)
const SECURITY_PATTERNS = {
  jwtToken: {
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    name: 'JWT Token',
    severity: 'BLOCKING'
  },
  supabaseKey: {
    pattern: /eyJhbGci[A-Za-z0-9_-]{100,}/g,
    name: 'Supabase API Key',
    severity: 'BLOCKING'
  },
  envFallback: {
    pattern: /process\.env\.[A-Z_]+\s*\|\|\s*['"](?!undefined|null|''|""|\$\{)[^'"]+['"]/g,
    name: 'Hardcoded Environment Fallback',
    severity: 'WARNING'
  },
  supabaseUrl: {
    pattern: /['"]https:\/\/[a-z0-9]+\.supabase\.co['"]/g,
    name: 'Hardcoded Supabase URL',
    severity: 'WARNING'
  },
  awsKey: {
    pattern: /AKIA[0-9A-Z]{16}/g,
    name: 'AWS Access Key',
    severity: 'BLOCKING'
  },
  privateKey: {
    pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
    name: 'Private Key',
    severity: 'BLOCKING'
  },
  apiKey: {
    pattern: /(?:api[_-]?key|apikey|api_secret)['"]?\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi,
    name: 'API Key',
    severity: 'WARNING'
  },
  dbConnection: {
    pattern: /(?:mongodb|postgresql|mysql|redis):\/\/[^'"\s]+/gi,
    name: 'Database Connection String',
    severity: 'BLOCKING'
  },
  bearerToken: {
    pattern: /Bearer\s+[a-zA-Z0-9_-]{20,}/g,
    name: 'Bearer Token',
    severity: 'WARNING'
  },
  password: {
    pattern: /(?:password|passwd|pwd)['"]?\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    name: 'Hardcoded Password',
    severity: 'BLOCKING'
  },
  secretKey: {
    pattern: /(?:secret[_-]?key|secret)['"]?\s*[:=]\s*['"][a-zA-Z0-9_-]{16,}['"]/gi,
    name: 'Secret Key',
    severity: 'BLOCKING'
  }
};

// File extensions to scan
const SCAN_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.json'];

// Files to skip
const SKIP_FILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

class PreCommitScanner {
  constructor() {
    this.findings = {
      blocking: [],
      warnings: []
    };
    this.filesScanned = 0;
  }

  async scan() {
    console.log(chalk.blue.bold('\n🔒 Pre-commit Security Check\n'));

    const stagedFiles = this.getStagedFiles();

    if (stagedFiles.length === 0) {
      console.log(chalk.gray('No staged files to scan.'));
      return true;
    }

    console.log(chalk.gray(`Scanning ${stagedFiles.length} staged files...\n`));

    for (const file of stagedFiles) {
      if (this.shouldScanFile(file)) {
        await this.scanFile(file);
      }
    }

    return this.reportAndDecide();
  }

  getStagedFiles() {
    try {
      const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
        encoding: 'utf-8'
      });

      return output.trim().split('\n').filter(Boolean);
    } catch (error) {
      console.error(chalk.red('Failed to get staged files. Are you in a git repository?'));
      process.exit(1);
    }
  }

  shouldScanFile(filePath) {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);

    // Skip if in SKIP_FILES
    if (SKIP_FILES.includes(fileName)) {
      return false;
    }

    // Skip if not in SCAN_EXTENSIONS
    if (!SCAN_EXTENSIONS.includes(ext)) {
      return false;
    }

    // Skip node_modules and build directories
    if (filePath.includes('node_modules/') ||
        filePath.includes('build/') ||
        filePath.includes('dist/')) {
      return false;
    }

    return true;
  }

  async scanFile(filePath) {
    try {
      this.filesScanned++;

      // Get the staged content (not the working directory content)
      const stagedContent = this.getStagedContent(filePath);
      const lines = stagedContent.split('\n');

      for (const [key, config] of Object.entries(SECURITY_PATTERNS)) {
        const matches = [...stagedContent.matchAll(config.pattern)];

        if (matches.length > 0) {
          for (const match of matches) {
            const lineNumber = this.getLineNumber(stagedContent, match.index);
            const line = lines[lineNumber - 1];

            // Skip if it's a comment
            if (this.isComment(line)) {
              continue;
            }

            // Skip if it's in a test file and looks like a mock
            if (filePath.includes('test') && this.isMockSecret(match[0])) {
              continue;
            }

            const finding = {
              file: filePath,
              line: lineNumber,
              type: config.name,
              match: this.truncateSecret(match[0]),
              content: line.trim()
            };

            if (config.severity === 'BLOCKING') {
              this.findings.blocking.push(finding);
            } else {
              this.findings.warnings.push(finding);
            }
          }
        }
      }
    } catch (error) {
      console.error(chalk.red(`Error scanning ${filePath}: ${error.message}`));
    }
  }

  getStagedContent(filePath) {
    try {
      return execSync(`git show :${filePath}`, { encoding: 'utf-8' });
    } catch (error) {
      // File might be newly added, read from filesystem
      return fs.readFileSync(filePath, 'utf-8');
    }
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  isComment(line) {
    const trimmed = line.trim();
    return trimmed.startsWith('//') ||
           trimmed.startsWith('/*') ||
           trimmed.startsWith('*') ||
           trimmed.startsWith('#');
  }

  isMockSecret(secret) {
    const mockPatterns = [
      'XXXXXXX',
      'test-key',
      'mock-secret',
      'example-token',
      'dummy-',
      'fake-',
      '123456',
      'abcdef'
    ];

    const lowerSecret = secret.toLowerCase();
    return mockPatterns.some(pattern => lowerSecret.includes(pattern));
  }

  truncateSecret(secret) {
    if (secret.length <= 30) {
      return secret;
    }
    return secret.substring(0, 15) + '...' + secret.substring(secret.length - 15);
  }

  reportAndDecide() {
    console.log(chalk.blue.bold('📊 Scan Results:\n'));
    console.log(chalk.gray(`Files scanned: ${this.filesScanned}`));

    const hasBlockingIssues = this.findings.blocking.length > 0;
    const hasWarnings = this.findings.warnings.length > 0;

    if (!hasBlockingIssues && !hasWarnings) {
      console.log(chalk.green.bold('\n✅ All clear! No secrets detected.\n'));
      return true;
    }

    // Show blocking issues
    if (hasBlockingIssues) {
      console.log(chalk.red.bold(`\n❌ BLOCKING ISSUES (${this.findings.blocking.length}):`));
      console.log(chalk.red('These must be fixed before committing:\n'));

      for (const finding of this.findings.blocking) {
        console.log(chalk.red(`  🚫 ${finding.file}:${finding.line}`));
        console.log(chalk.red(`     Type: ${finding.type}`));
        console.log(chalk.red(`     Found: ${finding.match}`));
        console.log(chalk.gray(`     Line: ${finding.content.substring(0, 80)}...`));
        console.log('');
      }
    }

    // Show warnings
    if (hasWarnings) {
      console.log(chalk.yellow.bold(`\n⚠️  WARNINGS (${this.findings.warnings.length}):`));
      console.log(chalk.yellow('Consider fixing these issues:\n'));

      for (const finding of this.findings.warnings) {
        console.log(chalk.yellow(`  ⚠️  ${finding.file}:${finding.line}`));
        console.log(chalk.yellow(`     Type: ${finding.type}`));
        console.log(chalk.yellow(`     Found: ${finding.match}`));
        console.log('');
      }
    }

    if (hasBlockingIssues) {
      console.log(chalk.red.bold('\n❌ COMMIT BLOCKED!'));
      console.log(chalk.red('Found hardcoded secrets that must be removed.\n'));
      console.log(chalk.cyan('To fix:'));
      console.log(chalk.cyan('1. Remove the hardcoded secrets from your files'));
      console.log(chalk.cyan('2. Use environment variables instead'));
      console.log(chalk.cyan('3. Run "npm run cleanup-secrets --fix" for automatic fixes'));
      console.log(chalk.cyan('4. Stage your changes and try committing again\n'));

      return false;
    }

    if (hasWarnings) {
      console.log(chalk.yellow.bold('\n⚠️  Commit allowed with warnings.'));
      console.log(chalk.yellow('Please review and fix the warnings in your next commit.\n'));
    }

    return true;
  }
}

// Main execution
async function main() {
  const scanner = new PreCommitScanner();
  const isClean = await scanner.scan();

  if (!isClean) {
    console.log(chalk.red('Use --no-verify to bypass this check (NOT RECOMMENDED)\n'));
    process.exit(1);
  }

  process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${__filename}`) {
  main().catch(error => {
    console.error(chalk.red(`Fatal error: ${error.message}`));
    process.exit(1);
  });
}

export default PreCommitScanner;