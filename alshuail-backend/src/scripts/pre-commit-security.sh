#!/bin/sh
#
# Pre-commit hook for security scanning
# Place this file in .git/hooks/pre-commit or use with Husky
#

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔒 Running security pre-commit checks..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "${RED}❌ Node.js is not installed. Cannot run security checks.${NC}"
    exit 1
fi

# Determine the script path based on project structure
SCRIPT_PATH=""

# Try different possible locations
if [ -f "./alshuail-backend/src/scripts/scan-secrets.js" ]; then
    SCRIPT_PATH="./alshuail-backend/src/scripts/scan-secrets.js"
elif [ -f "./src/scripts/scan-secrets.js" ]; then
    SCRIPT_PATH="./src/scripts/scan-secrets.js"
elif [ -f "./scripts/scan-secrets.js" ]; then
    SCRIPT_PATH="./scripts/scan-secrets.js"
else
    echo "${YELLOW}⚠️  Security scanner not found. Skipping security checks.${NC}"
    echo "Expected locations:"
    echo "  - ./alshuail-backend/src/scripts/scan-secrets.js"
    echo "  - ./src/scripts/scan-secrets.js"
    echo "  - ./scripts/scan-secrets.js"
    exit 0
fi

# Run the security scanner
node "$SCRIPT_PATH"
SCAN_EXIT_CODE=$?

if [ $SCAN_EXIT_CODE -ne 0 ]; then
    echo ""
    echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${RED}❌ COMMIT BLOCKED: Security issues detected!${NC}"
    echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Your commit contains hardcoded secrets or sensitive data."
    echo "Please fix the issues above and try again."
    echo ""
    echo "To bypass (NOT RECOMMENDED):"
    echo "  git commit --no-verify"
    echo ""
    exit 1
fi

echo "${GREEN}✅ Security checks passed!${NC}"
echo ""

# Optional: Run additional checks
# You can add more security tools here, such as:
# - npm audit
# - eslint security rules
# - dependency vulnerability scanning

exit 0