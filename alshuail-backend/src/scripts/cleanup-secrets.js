#!/usr/bin/env node
/**
 * Security Scanner & Cleanup Tool
 * Scans codebase for hardcoded secrets and sensitive information
 * Can run in report-only mode or auto-fix mode
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security patterns to detect
const SECURITY_PATTERNS = {
  // JWT tokens (starts with eyJ which is base64 for {"alg")
  jwtToken: {
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    name: 'JWT Token',
    severity: 'critical'
  },

  // Supabase anon/service keys
  supabaseKey: {
    pattern: /eyJhbGci[A-Za-z0-9_-]{100,}/g,
    name: 'Supabase API Key',
    severity: 'critical'
  },

  // Hardcoded fallback values in process.env
  envFallback: {
    pattern: /process\.env\.[A-Z_]+\s*\|\|\s*['"](?!undefined|null|''|""|\$\{)[^'"]+['"]/g,
    name: 'Hardcoded Environment Fallback',
    severity: 'high'
  },

  // Direct Supabase URLs not using env vars
  supabaseUrl: {
    pattern: /['"]https:\/\/[a-z0-9]+\.supabase\.co['"]/g,
    name: 'Hardcoded Supabase URL',
    severity: 'medium'
  },

  // AWS keys
  awsKey: {
    pattern: /AKIA[0-9A-Z]{16}/g,
    name: 'AWS Access Key',
    severity: 'critical'
  },

  // Private keys
  privateKey: {
    pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
    name: 'Private Key',
    severity: 'critical'
  },

  // API keys in various formats
  apiKey: {
    pattern: /(?:api[_-]?key|apikey|api_secret)['"]?\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi,
    name: 'API Key',
    severity: 'high'
  },

  // Database connection strings
  dbConnection: {
    pattern: /(?:mongodb|postgresql|mysql|redis):\/\/[^'"\s]+/gi,
    name: 'Database Connection String',
    severity: 'critical'
  },

  // Bearer tokens
  bearerToken: {
    pattern: /Bearer\s+[a-zA-Z0-9_-]{20,}/g,
    name: 'Bearer Token',
    severity: 'high'
  },

  // Base64 encoded secrets (min 40 chars, likely keys)
  base64Secret: {
    pattern: /['"]\s*[A-Za-z0-9+/]{40,}={0,2}\s*['"]/g,
    name: 'Potential Base64 Secret',
    severity: 'medium',
    requiresManualReview: true
  },

  // Passwords in config
  password: {
    pattern: /(?:password|passwd|pwd)['"]?\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    name: 'Hardcoded Password',
    severity: 'critical'
  },

  // Secret keys
  secretKey: {
    pattern: /(?:secret[_-]?key|secret)['"]?\s*[:=]\s*['"][a-zA-Z0-9_-]{16,}['"]/gi,
    name: 'Secret Key',
    severity: 'critical'
  }
};

// File extensions to scan
const SCAN_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.json', '.env.example'];

// Directories to skip
const SKIP_DIRS = ['node_modules', '.git', 'build', 'dist', 'coverage', '.next', '.cache', 'public'];

// Files to skip
const SKIP_FILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store'];

class SecretScanner {
  constructor(options = {}) {
    this.rootDir = options.rootDir || path.resolve(__dirname, '../../../');
    this.autoFix = options.autoFix || false;
    this.verbose = options.verbose || false;
    this.findings = [];
    this.filesScanned = 0;
    this.filesFixed = 0;
  }

  async scan() {
    log.info(chalk.blue.bold('\n🔍 Starting Security Scan...\n'));
    log.info(chalk.gray(`Root directory: ${this.rootDir}`));
    log.info(chalk.gray(`Mode: ${this.autoFix ? 'Auto-fix' : 'Report only'}\n`));

    await this.scanDirectory(this.rootDir);

    this.printReport();

    return this.findings.length === 0;
  }

  async scanDirectory(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.rootDir, fullPath);

        if (entry.isDirectory()) {
          if (!SKIP_DIRS.includes(entry.name)) {
            await this.scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          if (!SKIP_FILES.includes(entry.name) &&
              SCAN_EXTENSIONS.includes(path.extname(entry.name))) {
            await this.scanFile(fullPath, relativePath);
          }
        }
      }
    } catch (error) {
      log.error(chalk.red(`Error scanning directory ${dir}: ${error.message}`));
    }
  }

  async scanFile(fullPath, relativePath) {
    try {
      this.filesScanned++;

      if (this.verbose) {
        log.info(chalk.gray(`Scanning: ${relativePath}`));
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');
      let fileModified = false;
      let modifiedContent = content;

      for (const [key, config] of Object.entries(SECURITY_PATTERNS)) {
        const matches = [...content.matchAll(config.pattern)];

        if (matches.length > 0) {
          for (const match of matches) {
            const lineNumber = this.getLineNumber(content, match.index);
            const line = lines[lineNumber - 1];

            // Skip if it's a comment
            if (this.isComment(line)) {
              continue;
            }

            // Skip if it's in a test file and looks like a mock
            if (relativePath.includes('test') && this.isMockSecret(match[0])) {
              continue;
            }

            const finding = {
              file: relativePath,
              line: lineNumber,
              type: config.name,
              severity: config.severity,
              match: this.truncateSecret(match[0]),
              requiresManualReview: config.requiresManualReview || false
            };

            this.findings.push(finding);

            if (this.autoFix && !config.requiresManualReview) {
              const replacement = this.generateReplacement(key, match[0]);
              if (replacement) {
                modifiedContent = modifiedContent.replace(match[0], replacement);
                fileModified = true;
                finding.fixed = true;
              }
            }
          }
        }
      }

      if (fileModified) {
        await fs.writeFile(fullPath, modifiedContent);
        this.filesFixed++;
        log.info(chalk.green(`✅ Fixed: ${relativePath}`));
      }
    } catch (error) {
      log.error(chalk.red(`Error scanning file ${relativePath}: ${error.message}`));
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
    if (secret.length <= 20) {
      return secret;
    }
    return secret.substring(0, 10) + '...' + secret.substring(secret.length - 10);
  }

  generateReplacement(type, original) {
    const replacements = {
      envFallback: () => {
        // Extract the env variable name
        const match = original.match(/process\.env\.([A-Z_]+)/);
        if (match) {
          return `process.env.${match[1]}`;
        }
        return null;
      },
      supabaseUrl: () => 'process.env.SUPABASE_URL',
      supabaseKey: () => 'process.env.SUPABASE_SERVICE_KEY',
      jwtToken: () => 'process.env.JWT_SECRET',
      apiKey: () => 'process.env.API_KEY',
      secretKey: () => 'process.env.SECRET_KEY',
      password: () => 'process.env.PASSWORD',
      dbConnection: () => 'process.env.DATABASE_URL'
    };

    const replacer = replacements[type];
    return replacer ? replacer() : null;
  }

  printReport() {
    log.info(chalk.blue.bold('\n📊 Security Scan Report\n'));
    log.info(chalk.gray(`Files scanned: ${this.filesScanned}`));
    log.info(chalk.gray(`Findings: ${this.findings.length}`));

    if (this.autoFix) {
      log.info(chalk.gray(`Files fixed: ${this.filesFixed}\n`));
    } else {
      log.info('');
    }

    if (this.findings.length === 0) {
      log.info(chalk.green.bold('✅ No security issues found!\n'));
      return;
    }

    // Group findings by severity
    const bySeverity = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    for (const finding of this.findings) {
      bySeverity[finding.severity].push(finding);
    }

    // Print findings by severity
    for (const [severity, findings] of Object.entries(bySeverity)) {
      if (findings.length === 0) continue;

      const colorMap = {
        critical: chalk.red,
        high: chalk.yellow,
        medium: chalk.blue,
        low: chalk.gray
      };

      const color = colorMap[severity];
      log.info(color.bold(`\n${severity.toUpperCase()} (${findings.length}):`));

      for (const finding of findings) {
        log.info(color(`  📁 ${finding.file}:${finding.line}`));
        log.info(color(`     Type: ${finding.type}`));
        log.info(color(`     Match: ${finding.match}`));

        if (finding.fixed) {
          log.info(chalk.green(`     ✅ Fixed automatically`));
        } else if (finding.requiresManualReview) {
          log.info(chalk.yellow(`     ⚠️ Requires manual review`));
        }
      }
    }

    log.info(chalk.blue.bold('\n📝 Summary:'));
    if (bySeverity.critical.length > 0) {
      log.info(chalk.red(`  ❌ Critical issues: ${bySeverity.critical.length}`));
    }
    if (bySeverity.high.length > 0) {
      log.info(chalk.yellow(`  ⚠️  High issues: ${bySeverity.high.length}`));
    }
    if (bySeverity.medium.length > 0) {
      log.info(chalk.blue(`  ℹ️  Medium issues: ${bySeverity.medium.length}`));
    }

    if (!this.autoFix && this.findings.some(f => !f.requiresManualReview)) {
      log.info(chalk.cyan('\n💡 Run with --fix flag to automatically fix some issues'));
    }

    log.info('');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    autoFix: args.includes('--fix'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    rootDir: args.find(arg => arg.startsWith('--dir='))?.split('=')[1]
  };

  if (args.includes('--help') || args.includes('-h')) {
    log.info(`
${chalk.blue.bold('Secret Scanner & Cleanup Tool')}

Usage: node cleanup-secrets.js [options]

Options:
  --fix          Automatically fix issues where possible
  --verbose, -v  Show detailed scanning progress
  --dir=PATH     Specify root directory to scan (default: project root)
  --help, -h     Show this help message

Examples:
  node cleanup-secrets.js                    # Scan and report only
  node cleanup-secrets.js --fix              # Scan and auto-fix
  node cleanup-secrets.js --fix --verbose    # Auto-fix with detailed output
  node cleanup-secrets.js --dir=./src        # Scan specific directory
    `);
    process.exit(0);
  }

  const scanner = new SecretScanner(options);
  const clean = await scanner.scan();

  process.exit(clean ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${__filename}`) {
  main().catch(error => {
    log.error(chalk.red(`Fatal error: ${error.message}`));
    process.exit(1);
  });
}

export default SecretScanner;