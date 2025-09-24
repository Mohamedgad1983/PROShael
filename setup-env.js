#!/usr/bin/env node

/**
 * Al-Shuail Environment Setup Script
 * Automates the creation and validation of environment configurations
 * Supports development, staging, and production environments
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

/**
 * Generate a secure random string
 */
function generateSecret(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a strong JWT secret
 */
function generateJWTSecret() {
    return crypto.randomBytes(64).toString('base64');
}

/**
 * Log with colors
 */
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Create environment file from template
 */
function createEnvironmentFile(environment = 'development') {
    const envFile = environment === 'development' ? '.env' : `.env.${environment}`;
    const envPath = path.join(__dirname, envFile);
    const examplePath = path.join(__dirname, '.env.example');

    if (fs.existsSync(envPath)) {
        log(`⚠️  ${envFile} already exists. Skipping creation.`, 'yellow');
        return false;
    }

    if (!fs.existsSync(examplePath)) {
        log(`❌ .env.example not found. Cannot create ${envFile}`, 'red');
        return false;
    }

    // Read template
    let template = fs.readFileSync(examplePath, 'utf8');

    // Replace placeholders with generated values
    const replacements = {
        'your-super-secure-jwt-secret-minimum-256-bits': generateJWTSecret(),
        'your-session-secret-key': generateSecret(32),
        'your-32-character-encryption-key': generateSecret(16),
        'your-redis-password': generateSecret(16),
        'development': environment
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
        template = template.replace(new RegExp(placeholder, 'g'), value);
    });

    // Environment-specific configurations
    if (environment === 'production') {
        template = template.replace('LOG_LEVEL=info', 'LOG_LEVEL=warn');
        template = template.replace('DEBUG=false', 'DEBUG=false');
        template = template.replace('NODE_ENV=development', 'NODE_ENV=production');
        template = template.replace('REACT_APP_ENV=development', 'REACT_APP_ENV=production');
    } else if (environment === 'staging') {
        template = template.replace('NODE_ENV=development', 'NODE_ENV=staging');
        template = template.replace('REACT_APP_ENV=development', 'REACT_APP_ENV=staging');
    }

    // Write the file
    fs.writeFileSync(envPath, template);
    log(`✅ Created ${envFile} with generated secrets`, 'green');
    return true;
}

/**
 * Validate environment configuration
 */
function validateEnvironment(environment = 'development') {
    const envFile = environment === 'development' ? '.env' : `.env.${environment}`;
    const envPath = path.join(__dirname, envFile);

    if (!fs.existsSync(envPath)) {
        log(`❌ ${envFile} not found`, 'red');
        return false;
    }

    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

    const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_KEY',
        'JWT_SECRET',
        'REACT_APP_API_URL'
    ];

    const missingVars = [];
    const placeholderVars = [];

    requiredVars.forEach(varName => {
        const line = lines.find(l => l.startsWith(`${varName}=`));
        if (!line) {
            missingVars.push(varName);
        } else {
            const value = line.split('=')[1];
            if (value.includes('your-') || value.includes('placeholder') || value === '') {
                placeholderVars.push(varName);
            }
        }
    });

    if (missingVars.length > 0) {
        log(`❌ Missing required variables: ${missingVars.join(', ')}`, 'red');
        return false;
    }

    if (placeholderVars.length > 0) {
        log(`⚠️  Variables with placeholder values: ${placeholderVars.join(', ')}`, 'yellow');
        log(`   Please update these with actual values`, 'yellow');
    }

    log(`✅ Environment validation passed for ${environment}`, 'green');
    return true;
}

/**
 * Setup frontend environment
 */
function setupFrontendEnvironment(environment = 'development') {
    const frontendDir = path.join(__dirname, 'alshuail-admin-arabic');
    const envFile = environment === 'development' ? '.env' : `.env.${environment}`;
    const envPath = path.join(frontendDir, envFile);

    if (fs.existsSync(envPath)) {
        log(`⚠️  Frontend ${envFile} already exists`, 'yellow');
        return;
    }

    const apiUrl = environment === 'production'
        ? 'https://api.alshuail.com'
        : environment === 'staging'
        ? 'https://staging-api.alshuail.com'
        : 'http://localhost:3001';

    const frontendEnv = `# Al-Shuail Frontend Environment (${environment})
REACT_APP_API_URL=${apiUrl}
REACT_APP_ENV=${environment}
REACT_APP_VERSION=1.0.0
PORT=3002

# Development settings
GENERATE_SOURCEMAP=${environment !== 'production'}
INLINE_RUNTIME_CHUNK=${environment !== 'production'}
FAST_REFRESH=true
`;

    fs.writeFileSync(envPath, frontendEnv);
    log(`✅ Created frontend ${envFile}`, 'green');
}

/**
 * Setup backend environment
 */
function setupBackendEnvironment(environment = 'development') {
    const backendDir = path.join(__dirname, 'alshuail-backend');
    const envFile = environment === 'development' ? '.env' : `.env.${environment}`;
    const envPath = path.join(backendDir, envFile);

    if (fs.existsSync(envPath)) {
        log(`⚠️  Backend ${envFile} already exists`, 'yellow');
        return;
    }

    const backendEnv = `# Al-Shuail Backend Environment (${environment})
NODE_ENV=${environment}
PORT=3001

# Database (Update with your Supabase credentials)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
JWT_SECRET=${generateJWTSecret()}
SESSION_SECRET=${generateSecret(32)}

# CORS
FRONTEND_URL=${environment === 'production' ? 'https://alshuail.com' : 'http://localhost:3002'}

# Logging
LOG_LEVEL=${environment === 'production' ? 'warn' : 'info'}

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;

    fs.writeFileSync(envPath, backendEnv);
    log(`✅ Created backend ${envFile}`, 'green');
}

/**
 * Main setup function
 */
function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const environment = args[1] || 'development';

    log(`${colors.bright}🚀 Al-Shuail Environment Setup${colors.reset}`, 'cyan');
    log(`Environment: ${environment}`, 'blue');
    log('', 'reset');

    switch (command) {
        case 'create':
            log('Creating environment files...', 'cyan');
            createEnvironmentFile(environment);
            setupFrontendEnvironment(environment);
            setupBackendEnvironment(environment);
            break;

        case 'validate':
            log('Validating environment configuration...', 'cyan');
            validateEnvironment(environment);
            break;

        case 'secrets':
            log('Generating new secrets...', 'cyan');
            log(`JWT Secret: ${generateJWTSecret()}`, 'green');
            log(`Session Secret: ${generateSecret(32)}`, 'green');
            log(`Encryption Key: ${generateSecret(16)}`, 'green');
            break;

        case 'help':
        default:
            log('Usage:', 'cyan');
            log('  node setup-env.js create [environment]    # Create environment files', 'white');
            log('  node setup-env.js validate [environment]  # Validate configuration', 'white');
            log('  node setup-env.js secrets                 # Generate new secrets', 'white');
            log('', 'reset');
            log('Environments: development (default), staging, production', 'yellow');
            log('', 'reset');
            log('Examples:', 'cyan');
            log('  node setup-env.js create development', 'white');
            log('  node setup-env.js create production', 'white');
            log('  node setup-env.js validate staging', 'white');
            break;
    }

    log('', 'reset');
    log('📝 Next steps:', 'cyan');
    log('1. Update .env files with your actual Supabase credentials', 'white');
    log('2. Run: npm run test:config (if available)', 'white');
    log('3. Start development: npm run dev', 'white');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export {
    createEnvironmentFile,
    validateEnvironment,
    setupFrontendEnvironment,
    setupBackendEnvironment,
    generateSecret,
    generateJWTSecret
};