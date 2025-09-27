#!/usr/bin/env node
/**
 * Husky Setup Script
 * Installs and configures Husky for git hooks
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🐶 Setting up Husky for git hooks...\n');

try {
  // Install husky as dev dependency
  console.log('📦 Installing Husky...');
  execSync('npm install --save-dev husky', { stdio: 'inherit' });

  // Initialize husky
  console.log('\n🔧 Initializing Husky...');
  execSync('npx husky init', { stdio: 'inherit' });

  // Create pre-commit hook
  const preCommitPath = path.join(process.cwd(), '.husky', 'pre-commit');
  const preCommitContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run security scanner on staged files
echo "🔒 Running pre-commit security scan..."

# Determine the correct path to the scanner
if [ -f "./alshuail-backend/src/scripts/scan-secrets.js" ]; then
  node ./alshuail-backend/src/scripts/scan-secrets.js
elif [ -f "./src/scripts/scan-secrets.js" ]; then
  node ./src/scripts/scan-secrets.js
else
  echo "⚠️  Security scanner not found, skipping..."
fi

# Optional: Run tests
# npm test

# Optional: Run linter
# npm run lint-staged
`;

  fs.writeFileSync(preCommitPath, preCommitContent);

  // Make the hook executable (Unix-like systems)
  if (process.platform !== 'win32') {
    execSync(`chmod +x ${preCommitPath}`);
  }

  console.log('\n✅ Husky setup complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Test the hook: git add . && git commit -m "test"');
  console.log('2. The security scanner will run automatically');
  console.log('3. Commits will be blocked if secrets are detected\n');

} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}