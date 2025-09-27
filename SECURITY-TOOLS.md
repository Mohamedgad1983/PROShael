# Security Tools Documentation

## Overview

This document describes the automated security tools implemented to prevent hardcoded secrets and sensitive data from entering the codebase. These tools provide multiple layers of protection through scanning, validation, and automated fixes.

## Tools Overview

### 1. **Secret Scanner & Cleanup Tool** (`cleanup-secrets.js`)
- **Purpose**: Scans entire codebase for hardcoded secrets and sensitive information
- **Features**: Report-only mode, auto-fix capability, comprehensive pattern detection
- **Location**: `alshuail-backend/src/scripts/cleanup-secrets.js`

### 2. **Pre-commit Security Hook** (`scan-secrets.js`)
- **Purpose**: Prevents commits containing secrets from being pushed
- **Features**: Scans staged files, blocks dangerous commits, provides warnings
- **Location**: `alshuail-backend/src/scripts/scan-secrets.js`

### 3. **Environment Validator** (`validate-env.js`)
- **Purpose**: Ensures all required environment variables are properly configured
- **Features**: Auto-generates .env templates, validates values, suggests fixes
- **Location**: `alshuail-backend/src/scripts/validate-env.js`

## Quick Start

### Initial Setup

1. **Install dependencies** (from backend directory):
```bash
cd alshuail-backend
npm install
```

2. **Set up git hooks** (automatic with npm install):
```bash
# This runs automatically via the "prepare" script
npm run prepare
```

3. **Generate environment template**:
```bash
npm run env:generate
```

4. **Validate environment**:
```bash
npm run env:validate
```

## Usage Guide

### Secret Scanning

#### Basic Scan (Report Only)
```bash
npm run security:scan
```
This will:
- Scan all JS/TS files in the project
- Report any hardcoded secrets found
- Exit with non-zero code if issues found

#### Auto-Fix Mode
```bash
npm run security:scan-fix
```
This will:
- Automatically replace hardcoded values with environment variables
- Create backup of modified files
- Show detailed report of changes

#### Verbose Mode
```bash
node src/scripts/cleanup-secrets.js --verbose
```
Shows detailed progress during scanning

### Pre-commit Protection

The pre-commit hook runs automatically when you commit. To test manually:

```bash
npm run security:check
```

If secrets are detected:
1. The commit will be **blocked**
2. You'll see detailed information about what was found
3. Fix the issues and try again

To bypass (NOT RECOMMENDED):
```bash
git commit --no-verify -m "your message"
```

### Environment Validation

#### Check Current Environment
```bash
npm run env:validate
```

#### Generate .env Template
```bash
npm run env:generate
```
Creates `.env.example` with all required variables

#### Auto-Fix Missing Variables
```bash
npm run env:fix
```
Generates default values for missing non-critical variables

## What Gets Detected

The security tools scan for these patterns:

### Critical (Blocks Commits)
- **JWT Tokens**: `eyJ...` patterns
- **API Keys**: Supabase, AWS, etc.
- **Private Keys**: RSA, EC private keys
- **Passwords**: Hardcoded passwords in config
- **Database URLs**: Connection strings with credentials

### Warnings (Allowed but Flagged)
- **Environment Fallbacks**: `process.env.X || 'hardcoded'`
- **Hardcoded URLs**: Direct Supabase URLs
- **Bearer Tokens**: Authentication tokens
- **Base64 Secrets**: Potential encoded secrets

### Smart Detection
The scanner includes intelligent filtering:
- Ignores comments
- Skips test mocks (e.g., `test-key`, `dummy-secret`)
- Recognizes common placeholder patterns

## Environment Variables

### Required Variables

These must be set for the application to start:

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key | `eyJhbGci...` |
| `SUPABASE_ANON_KEY` | Anonymous key | `eyJhbGci...` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Auto-generated |
| `PORT` | Server port | `5001` |
| `NODE_ENV` | Environment | `production` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGIN` | CORS allowed origins | `http://localhost:3002` |
| `SESSION_SECRET` | Express session secret | Auto-generated |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## Integration with CI/CD

### GitHub Actions

Add to `.github/workflows/security.yml`:

```yaml
name: Security Checks

on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd alshuail-backend
          npm ci

      - name: Run security scan
        run: |
          cd alshuail-backend
          npm run security:scan

      - name: Validate environment
        run: |
          cd alshuail-backend
          npm run env:validate
```

### Docker Integration

Add to `Dockerfile`:

```dockerfile
# Run security checks during build
RUN npm run security:scan
RUN npm run env:validate
```

## Troubleshooting

### Common Issues

#### 1. Pre-commit hook not running
```bash
# Reinstall Husky
cd alshuail-backend
npm run prepare
```

#### 2. False positives in scanning
- Add file to skip list in scanner
- Use comments to mark intentional test data
- Contact DevOps team for pattern adjustments

#### 3. Environment validation fails on deployment
- Check that all required variables are set in deployment platform
- Use `npm run env:generate` to create template
- Verify variable names match exactly (case-sensitive)

### Manual Hook Installation

If automatic setup fails:

```bash
# Create pre-commit hook manually
cp alshuail-backend/src/scripts/pre-commit-security.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Best Practices

### Do's
✅ Always use environment variables for sensitive data
✅ Run `npm run security:scan` before major commits
✅ Keep `.env.example` updated with new variables
✅ Use the auto-fix feature for quick remediation
✅ Review warnings even if commit is allowed

### Don'ts
❌ Never commit `.env` files
❌ Don't use `--no-verify` unless absolutely necessary
❌ Avoid hardcoding even "temporary" secrets
❌ Don't ignore security warnings
❌ Never share production environment variables

## Security Patterns Reference

### Correct Patterns

```javascript
// ✅ Good: Using environment variables
const apiKey = process.env.API_KEY;
const dbUrl = process.env.DATABASE_URL;

// ✅ Good: Throwing error if missing
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

// ✅ Good: Using defaults for non-sensitive values
const port = process.env.PORT || 3000;
```

### Incorrect Patterns

```javascript
// ❌ Bad: Hardcoded secret
const apiKey = 'sk_live_abcd1234...';

// ❌ Bad: Fallback to hardcoded value
const jwt = process.env.JWT_SECRET || 'my-secret-key';

// ❌ Bad: Direct URL with credentials
const db = 'postgresql://user:pass@host/db';

// ❌ Bad: Base64 encoded secret
const secret = 'ZXlKaGJHY2lPaUpJVXpJMU5pSX...';
```

## Advanced Configuration

### Custom Patterns

To add custom detection patterns, edit `cleanup-secrets.js`:

```javascript
const SECURITY_PATTERNS = {
  customPattern: {
    pattern: /your-regex-here/g,
    name: 'Custom Secret Type',
    severity: 'critical' // or 'high', 'medium'
  }
};
```

### Exclusions

To exclude specific directories or files:

```javascript
// In cleanup-secrets.js
const SKIP_DIRS = ['node_modules', 'build', 'your-dir'];
const SKIP_FILES = ['package-lock.json', 'your-file.js'];
```

## Support

For issues or questions:
1. Check this documentation
2. Run tools with `--help` flag
3. Contact the DevSecOps team
4. File an issue in the repository

## Version History

- **v1.0.0** (2024-01-27): Initial implementation
  - Secret scanner with auto-fix
  - Pre-commit hooks
  - Environment validation
  - Husky integration

---

**Remember**: Security is everyone's responsibility. These tools help, but vigilance is key!