#!/usr/bin/env node
/**
 * Environment Variable Validator
 * Ensures all required environment variables are set before application startup
 * Can be used as a pre-start script or imported as a module
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { log } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variable configurations
const ENV_CONFIG = {
  // Critical - Application won't work without these
  critical: {
    // Supabase Configuration
    SUPABASE_URL: {
      description: 'Supabase project URL',
      example: 'https://xxxxx.supabase.co',
      validator: (value) => value.startsWith('https://') && value.includes('.supabase.co')
    },
    SUPABASE_SERVICE_KEY: {
      description: 'Supabase service role key',
      example: 'eyJhbGci...',
      validator: (value) => value.startsWith('eyJ') && value.length > 100
    },
    SUPABASE_ANON_KEY: {
      description: 'Supabase anonymous/public key',
      example: 'eyJhbGci...',
      validator: (value) => value.startsWith('eyJ') && value.length > 100
    },

    // Authentication
    JWT_SECRET: {
      description: 'Secret key for JWT token signing',
      example: 'your-secret-key-min-32-chars',
      validator: (value) => value.length >= 32,
      generateDefault: () => {
        const crypto = require('crypto');
        return crypto.randomBytes(48).toString('base64');
      }
    },

    // Server Configuration
    PORT: {
      description: 'Server port number',
      example: '5001',
      validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0,
      default: '5001'
    },
    NODE_ENV: {
      description: 'Node environment',
      example: 'production',
      validator: (value) => ['development', 'production', 'test', 'staging'].includes(value),
      default: 'development'
    }
  },

  // Important - Should be set but app can work with defaults
  important: {
    CORS_ORIGIN: {
      description: 'Allowed CORS origins',
      example: 'https://alshuail-admin.pages.dev',
      validator: (value) => value.startsWith('http'),
      default: 'http://localhost:3002'
    },
    SESSION_SECRET: {
      description: 'Express session secret',
      example: 'your-session-secret',
      validator: (value) => value.length >= 16,
      generateDefault: () => {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('base64');
      }
    },
    RATE_LIMIT_WINDOW_MS: {
      description: 'Rate limiting window in milliseconds',
      example: '900000',
      validator: (value) => !isNaN(parseInt(value)),
      default: '900000'
    },
    RATE_LIMIT_MAX_REQUESTS: {
      description: 'Maximum requests per rate limit window',
      example: '100',
      validator: (value) => !isNaN(parseInt(value)),
      default: '100'
    }
  },

  // Optional - Nice to have but not required
  optional: {
    LOG_LEVEL: {
      description: 'Logging level',
      example: 'info',
      validator: (value) => ['error', 'warn', 'info', 'debug', 'verbose'].includes(value),
      default: 'info'
    },
    LOG_FILE: {
      description: 'Log file path',
      example: './logs/app.log',
      default: './logs/app.log'
    },
    MAX_FILE_SIZE: {
      description: 'Maximum file upload size in bytes',
      example: '10485760',
      validator: (value) => !isNaN(parseInt(value)),
      default: '10485760'
    },
    ENABLE_SWAGGER: {
      description: 'Enable Swagger API documentation',
      example: 'true',
      validator: (value) => ['true', 'false'].includes(value),
      default: 'false'
    },
    SMTP_HOST: {
      description: 'SMTP server host for email',
      example: 'smtp.gmail.com'
    },
    SMTP_PORT: {
      description: 'SMTP server port',
      example: '587',
      validator: (value) => !isNaN(parseInt(value))
    },
    SMTP_USER: {
      description: 'SMTP username',
      example: 'your-email@gmail.com'
    },
    SMTP_PASS: {
      description: 'SMTP password',
      example: 'your-app-password'
    }
  }
};

class EnvValidator {
  constructor(options = {}) {
    this.envPath = options.envPath || path.resolve(process.cwd(), '.env');
    this.createIfMissing = options.createIfMissing || false;
    this.silent = options.silent || false;
    this.autoFix = options.autoFix || false;
    this.results = {
      critical: { missing: [], invalid: [] },
      important: { missing: [], invalid: [] },
      optional: { missing: [], invalid: [] }
    };
  }

  validate() {
    if (!this.silent) {
      log.info(chalk.blue.bold('\n🔐 Environment Variable Validation\n'));
    }

    // Load .env file if it exists
    if (fs.existsSync(this.envPath)) {
      dotenv.config({ path: this.envPath });
      if (!this.silent) {
        log.info(chalk.gray(`Loaded: ${this.envPath}\n`));
      }
    } else {
      if (!this.silent) {
        log.info(chalk.yellow(`⚠️  No .env file found at: ${this.envPath}\n`));
      }
    }

    // Validate each category
    let hasErrors = false;

    for (const [category, vars] of Object.entries(ENV_CONFIG)) {
      if (!this.silent) {
        const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
        log.info(chalk.blue.bold(`${categoryLabel} Variables:`));
      }

      for (const [varName, config] of Object.entries(vars)) {
        const value = process.env[varName];
        const result = this.validateVar(varName, value, config, category);

        if (!result.valid) {
          if (category === 'critical') {
            hasErrors = true;
          }

          if (result.type === 'missing') {
            this.results[category].missing.push({ name: varName, config });
          } else {
            this.results[category].invalid.push({ name: varName, config, value });
          }
        }

        if (!this.silent) {
          this.printVarStatus(varName, result, config);
        }
      }

      if (!this.silent) {
        log.info('');
      }
    }

    // Handle auto-fix if enabled
    if (this.autoFix) {
      this.applyAutoFixes();
    }

    // Print summary
    if (!this.silent) {
      this.printSummary();
    }

    return !hasErrors;
  }

  validateVar(name, value, config, category) {
    if (!value) {
      // Check if we can use a default
      if (config.default && category !== 'critical') {
        process.env[name] = config.default;
        return { valid: true, type: 'default', value: config.default };
      }

      // Check if we can generate a default
      if (config.generateDefault && this.autoFix) {
        const generated = config.generateDefault();
        process.env[name] = generated;
        return { valid: true, type: 'generated', value: generated };
      }

      return { valid: false, type: 'missing' };
    }

    // Validate the value
    if (config.validator) {
      try {
        if (!config.validator(value)) {
          return { valid: false, type: 'invalid', value };
        }
      } catch (error) {
        return { valid: false, type: 'invalid', value, error: error.message };
      }
    }

    return { valid: true, type: 'set', value };
  }

  printVarStatus(name, result, config) {
    const icons = {
      set: '✅',
      default: '📝',
      generated: '🔧',
      missing: '❌',
      invalid: '⚠️'
    };

    const colors = {
      set: chalk.green,
      default: chalk.blue,
      generated: chalk.cyan,
      missing: chalk.red,
      invalid: chalk.yellow
    };

    const icon = icons[result.type];
    const color = colors[result.type];

    let status = `  ${icon} ${name}`;

    if (result.type === 'missing') {
      status = color(`${status} - Missing`);
      if (config.description) {
        status += chalk.gray(` (${config.description})`);
      }
    } else if (result.type === 'invalid') {
      status = color(`${status} - Invalid value`);
      if (result.error) {
        status += chalk.gray(` (${result.error})`);
      }
    } else if (result.type === 'default') {
      status = color(`${status} - Using default`);
      status += chalk.gray(` (${result.value})`);
    } else if (result.type === 'generated') {
      status = color(`${status} - Generated`);
    } else {
      status = color(`${status} - Set`);
    }

    log.info(status);
  }

  applyAutoFixes() {
    const envContent = [];
    const existingEnv = {};

    // Read existing .env file
    if (fs.existsSync(this.envPath)) {
      const content = fs.readFileSync(this.envPath, 'utf-8');
      content.split('\n').forEach(line => {
        const match = line.match(/^([A-Z_]+)=(.*)$/);
        if (match) {
          existingEnv[match[1]] = match[2];
        }
      });
    }

    // Build new env content
    envContent.push('# Auto-generated environment variables');
    envContent.push(`# Generated at: ${new Date().toISOString()}`);
    envContent.push('');

    for (const [category, vars] of Object.entries(ENV_CONFIG)) {
      envContent.push(`# ${category.toUpperCase()} Variables`);

      for (const [varName, config] of Object.entries(vars)) {
        let value = process.env[varName] || existingEnv[varName];

        if (!value && config.default) {
          value = config.default;
        }

        if (!value && config.generateDefault) {
          value = config.generateDefault();
        }

        if (value) {
          envContent.push(`${varName}=${value}`);
        } else {
          envContent.push(`# ${varName}=${config.example || 'your-value-here'} # ${config.description || ''}`);
        }
      }

      envContent.push('');
    }

    // Write the .env file
    const backupPath = `${this.envPath}.backup-${Date.now()}`;
    if (fs.existsSync(this.envPath)) {
      fs.copyFileSync(this.envPath, backupPath);
      log.info(chalk.gray(`Backup created: ${backupPath}`));
    }

    fs.writeFileSync(this.envPath, envContent.join('\n'));
    log.info(chalk.green(`✅ Environment file updated: ${this.envPath}\n`));
  }

  printSummary() {
    log.info(chalk.blue.bold('📊 Validation Summary:\n'));

    const criticalMissing = this.results.critical.missing.length;
    const criticalInvalid = this.results.critical.invalid.length;
    const importantMissing = this.results.important.missing.length;
    const importantInvalid = this.results.important.invalid.length;

    if (criticalMissing > 0 || criticalInvalid > 0) {
      log.info(chalk.red.bold('❌ CRITICAL ISSUES FOUND!\n'));

      if (criticalMissing > 0) {
        log.info(chalk.red(`Missing critical variables (${criticalMissing}):`));
        for (const item of this.results.critical.missing) {
          log.info(chalk.red(`  - ${item.name}: ${item.config.description}`));
          if (item.config.example) {
            log.info(chalk.gray(`    Example: ${item.config.example}`));
          }
        }
        log.info('');
      }

      if (criticalInvalid > 0) {
        log.info(chalk.red(`Invalid critical variables (${criticalInvalid}):`));
        for (const item of this.results.critical.invalid) {
          log.info(chalk.red(`  - ${item.name}: ${item.config.description}`));
        }
        log.info('');
      }

      log.info(chalk.cyan('To fix:'));
      log.info(chalk.cyan('1. Create a .env file in your project root'));
      log.info(chalk.cyan('2. Add the missing variables with valid values'));
      log.info(chalk.cyan('3. Run this validator again to verify\n'));

      if (!this.autoFix) {
        log.info(chalk.yellow('💡 Run with --auto-fix to generate a template .env file\n'));
      }
    } else if (importantMissing > 0 || importantInvalid > 0) {
      log.info(chalk.yellow('⚠️  Some important variables are missing or invalid.\n'));
      log.info(chalk.yellow('The application will run but may have limited functionality.\n'));
    } else {
      log.info(chalk.green.bold('✅ All required environment variables are properly configured!\n'));
    }

    // Show .env template command
    if ((criticalMissing > 0 || importantMissing > 0) && !this.autoFix) {
      log.info(chalk.gray('Generate .env template:'));
      log.info(chalk.gray('  node validate-env.js --generate-template\n'));
    }
  }

  generateTemplate() {
    const template = [];

    template.push('# Al-Shuail Backend Environment Variables');
    template.push('# Copy this file to .env and fill in your values');
    template.push(`# Generated: ${new Date().toISOString()}`);
    template.push('');

    for (const [category, vars] of Object.entries(ENV_CONFIG)) {
      template.push(`# ${'='.repeat(50)}`);
      template.push(`# ${category.toUpperCase()} VARIABLES`);
      template.push(`# ${'='.repeat(50)}`);
      template.push('');

      for (const [varName, config] of Object.entries(vars)) {
        if (config.description) {
          template.push(`# ${config.description}`);
        }
        if (config.example) {
          template.push(`# Example: ${config.example}`);
        }

        const value = config.default || config.example || 'your-value-here';
        template.push(`${varName}=${value}`);
        template.push('');
      }
    }

    const templatePath = '.env.example';
    fs.writeFileSync(templatePath, template.join('\n'));
    log.info(chalk.green(`✅ Template generated: ${templatePath}\n`));
    log.info(chalk.cyan('Next steps:'));
    log.info(chalk.cyan('1. Copy .env.example to .env'));
    log.info(chalk.cyan('2. Fill in your actual values'));
    log.info(chalk.cyan('3. Never commit the .env file to version control\n'));
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    log.info(`
${chalk.blue.bold('Environment Variable Validator')}

Usage: node validate-env.js [options]

Options:
  --auto-fix              Generate missing variables with defaults
  --generate-template     Create .env.example template file
  --silent               Suppress output (for programmatic use)
  --env-path PATH        Specify custom .env file path
  --help, -h            Show this help message

Examples:
  node validate-env.js                    # Validate current environment
  node validate-env.js --auto-fix         # Fix missing variables
  node validate-env.js --generate-template # Create .env.example

Integration:
  Add to package.json scripts:
  "prestart": "node src/scripts/validate-env.js"
    `);
    process.exit(0);
  }

  const options = {
    autoFix: args.includes('--auto-fix'),
    silent: args.includes('--silent'),
    envPath: args.find(arg => arg.startsWith('--env-path='))?.split('=')[1]
  };

  const validator = new EnvValidator(options);

  if (args.includes('--generate-template')) {
    validator.generateTemplate();
    process.exit(0);
  }

  const isValid = validator.validate();

  if (!isValid && !options.autoFix) {
    process.exit(1);
  }

  process.exit(0);
}

// Export for use as a module
export function validateEnvironment(options = {}) {
  const validator = new EnvValidator({ ...options, silent: true });
  return validator.validate();
}

// Run if called directly
if (import.meta.url === `file://${__filename}`) {
  main();
}

export default EnvValidator;