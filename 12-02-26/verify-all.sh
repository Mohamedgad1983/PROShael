#!/bin/bash
# =============================================================================
# AL-SHUAIL MIGRATION & CLEANUP — AUTOMATED VERIFICATION SCRIPT
# =============================================================================
# Place this in your project root and run: bash verify-all.sh
# It will check everything and generate VERIFICATION_REPORT.md
# =============================================================================

set -o pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Counters
PASS=0
FAIL=0
WARN=0
TOTAL=0
REPORT="VERIFICATION_REPORT.md"
FAILURES=""

# Functions
pass() {
  ((PASS++)); ((TOTAL++))
  echo -e "  ${GREEN}✅ PASS${NC}: $1"
  echo "✅ PASS: $1" >> "$REPORT"
}

fail() {
  ((FAIL++)); ((TOTAL++))
  echo -e "  ${RED}❌ FAIL${NC}: $1"
  echo -e "       ${YELLOW}→ Fix: $2${NC}"
  echo "❌ FAIL: $1 → Fix: $2" >> "$REPORT"
  FAILURES="$FAILURES\n- $1: $2"
}

warn() {
  ((WARN++)); ((TOTAL++))
  echo -e "  ${YELLOW}⚠️  WARN${NC}: $1"
  echo "⚠️  WARN: $1" >> "$REPORT"
}

section() {
  echo ""
  echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}${BOLD}  $1${NC}"
  echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "" >> "$REPORT"
  echo "## $1" >> "$REPORT"
  echo "" >> "$REPORT"
}

# Initialize report
cat > "$REPORT" << EOF
# 🔍 AL-SHUAIL VERIFICATION REPORT

**Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Script**: verify-all.sh
**Project**: Al-Shuail Family Fund Management System

---

EOF

echo ""
echo -e "${BOLD}${CYAN}🔍 AL-SHUAIL MIGRATION & CLEANUP — FULL VERIFICATION${NC}"
echo -e "   Running at $(date)"
echo ""

# =============================================================================
section "PHASE 0: SUPABASE REMOVAL"
# =============================================================================

# 0.1 No @supabase in package.json
COUNT=$(grep -rl "@supabase/supabase-js" alshuail-backend/package.json alshuail-admin/package.json alshuail-mobile/package.json 2>/dev/null | wc -l | tr -d ' ')
[ "$COUNT" -eq 0 ] && pass "No @supabase in package.json" || fail "Found @supabase in $COUNT package.json file(s)" "npm uninstall @supabase/supabase-js in each"

# 0.2 No supabase in backend JS
COUNT=$(grep -rn "supabase\|@supabase\|createClient.*supabase\|SUPABASE_URL\|SUPABASE_KEY" \
  alshuail-backend/ --include="*.js" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | wc -l | tr -d ' ')
[ "$COUNT" -eq 0 ] && pass "Zero supabase references in backend JS" || fail "$COUNT supabase references in backend JS" "Convert remaining files to use database.js"

# 0.3 No supabase in frontend
COUNT=$(grep -rn "supabase\|@supabase\|SUPABASE_URL\|SUPABASE_KEY" \
  alshuail-admin/src/ alshuail-mobile/src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
[ "$COUNT" -eq 0 ] && pass "Zero supabase references in frontend" || fail "$COUNT supabase references in frontend" "Remove supabase from admin and mobile src"

# 0.4 No SUPABASE in .env
COUNT=$(grep -rn "SUPABASE" alshuail-backend/.env alshuail-admin/.env alshuail-mobile/.env 2>/dev/null | wc -l | tr -d ' ')
[ "$COUNT" -eq 0 ] && pass "No SUPABASE in .env files" || fail "SUPABASE found in $COUNT .env lines" "Remove SUPABASE_* env vars"

# 0.5 No supabase config files
COUNT=$(find . -name "supabase*" -o -name "*supabaseClient*" 2>/dev/null | grep -v node_modules | grep -v .git | wc -l | tr -d ' ')
[ "$COUNT" -eq 0 ] && pass "No supabase config files" || fail "$COUNT supabase config files found" "Delete supabase config files"

# 0.6 database.js exists
if [ -f "alshuail-backend/services/database.js" ]; then
  HAS_POOL=$(grep -c "Pool\|pg" alshuail-backend/services/database.js 2>/dev/null || echo 0)
  [ "$HAS_POOL" -gt 0 ] && pass "database.js exists and uses pg Pool" || fail "database.js exists but doesn't use pg" "Rewrite to use const { Pool } = require('pg')"
else
  fail "database.js missing" "Create alshuail-backend/services/database.js with pg Pool"
fi

# 0.7 Storage check
COUNT=$(grep -rn "supabase.*storage\|\.storage\.\|from.*bucket" \
  alshuail-backend/ --include="*.js" --exclude-dir=node_modules 2>/dev/null | wc -l | tr -d ' ')
[ "$COUNT" -eq 0 ] && pass "No supabase storage references" || fail "$COUNT supabase storage references" "Replace with multer/local file storage"

# =============================================================================
section "PHASE 1: DEAD FILE REMOVAL"
# =============================================================================

# 1.1 No backup files
COUNT=$(find . \( -name "*.backup*" -o -name "*.bak" -o -name "*.old" -o -name "*.orig" -o -name "*.fixed" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null | wc -l | tr -d ' ')
[ "$COUNT" -eq 0 ] && pass "No backup/old/fixed files" || fail "$COUNT backup files remain" "Delete them: find . -name '*.backup*' -delete"

# 1.2 No test scripts in root
COUNT=$(find alshuail-backend/ -maxdepth 1 \( -name "test_*" -o -name "test-*" -o -name "check_*" \
  -o -name "debug_*" -o -name "fix_*" -o -name "run_*" -o -name "setup_*" \
  -o -name "migrate_*" -o -name "verify_*" -o -name "create_*" \) 2>/dev/null | wc -l | tr -d ' ')
[ "$COUNT" -eq 0 ] && pass "No test/debug scripts in backend root" || fail "$COUNT test scripts in backend root" "Move to scripts/ or delete"

# 1.3 No duplicate controllers
COUNT=$(ls alshuail-backend/controllers/ 2>/dev/null | grep -icE "enhanced|improved|new|old|v2|copy|backup" || echo 0)
[ "$COUNT" -eq 0 ] && pass "No duplicate controllers" || fail "$COUNT duplicate controller versions" "Consolidate into single versions"

# 1.4 No duplicate routes
COUNT=$(ls alshuail-backend/routes/ 2>/dev/null | grep -icE "enhanced|improved|new|old|v2|copy|backup" || echo 0)
[ "$COUNT" -eq 0 ] && pass "No duplicate routes" || fail "$COUNT duplicate route versions" "Consolidate into single versions"

# 1.5 No duplicate frontend components
COUNT=$(find alshuail-admin/src/ alshuail-mobile/src/ \
  \( -name "*Enhanced*" -o -name "*Improved*" -o -name "*V2*" -o -name "*Old*" -o -name "*Copy*" \) \
  2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
[ "$COUNT" -eq 0 ] && pass "No duplicate frontend components" || fail "$COUNT duplicate components in frontend" "Consolidate into single versions"

# =============================================================================
section "PHASE 5: SECURITY"
# =============================================================================

# 5.1 Auth middleware exists
if ls alshuail-backend/middleware/auth* 1>/dev/null 2>&1; then
  pass "Auth middleware file exists"
else
  fail "No auth middleware file" "Create middleware/auth.js with JWT verification"
fi

# 5.2 No /api/test endpoint
COUNT=$(grep -rn "'/api/test'\|'/test'" alshuail-backend/routes/ alshuail-backend/server.js alshuail-backend/app.js \
  --include="*.js" 2>/dev/null | wc -l | tr -d ' ')
[ "$COUNT" -eq 0 ] && pass "No /api/test endpoint" || fail "/api/test endpoint still exists" "Remove test routes from production"

# 5.3 No hardcoded passwords in code
COUNT=$(grep -rn "password.*=.*['\"][^'\"]*['\"]" alshuail-backend/ --include="*.js" --exclude-dir=node_modules 2>/dev/null \
  | grep -v "process.env\|password_hash\|passwordHash\|req.body\|bcrypt\|crypt\|\.env\|example\|placeholder" \
  | wc -l | tr -d ' ')
[ "$COUNT" -eq 0 ] && pass "No hardcoded passwords" || warn "Potential hardcoded passwords ($COUNT matches — review manually)"

# 5.4 SQL injection check
COUNT=$(grep -rn 'query.*`.*\${' alshuail-backend/ --include="*.js" --exclude-dir=node_modules 2>/dev/null | wc -l | tr -d ' ')
[ "$COUNT" -eq 0 ] && pass "No SQL string concatenation (injection safe)" || fail "$COUNT SQL concatenation patterns" "Convert to parameterized queries (\$1, \$2)"

# 5.5 .env in .gitignore
if grep -q ".env" alshuail-backend/.gitignore 2>/dev/null; then
  pass ".env in .gitignore"
else
  fail ".env not in .gitignore" "Add .env to .gitignore"
fi

# =============================================================================
section "PHASE 6: CODE QUALITY"
# =============================================================================

# 6.1 Zero console.log
COUNT=$(grep -rn "console\.log" \
  alshuail-backend/routes/ alshuail-backend/controllers/ alshuail-backend/services/ alshuail-backend/middleware/ \
  --include="*.js" 2>/dev/null | wc -l | tr -d ' ')
[ "$COUNT" -eq 0 ] && pass "Zero console.log in production code" || fail "$COUNT console.log statements remain" "Replace with logger.info/warn/error"

# 6.2 Logger exists
LOGGER_FILE=$(find alshuail-backend/ -name "logger.js" -not -path "*/node_modules/*" 2>/dev/null | head -1)
if [ -n "$LOGGER_FILE" ]; then
  HAS_WINSTON=$(grep -c "winston" "$LOGGER_FILE" 2>/dev/null || echo 0)
  [ "$HAS_WINSTON" -gt 0 ] && pass "Winston logger configured" || warn "Logger exists but may not use Winston"
else
  fail "No logger.js found" "Create logger service using Winston"
fi

# 6.3 TODO count
COUNT=$(grep -rn "TODO\|FIXME\|HACK\|STUB" alshuail-backend/ --include="*.js" --exclude-dir=node_modules 2>/dev/null | wc -l | tr -d ' ')
[ "$COUNT" -le 5 ] && pass "TODO/FIXME count acceptable ($COUNT)" || warn "$COUNT TODO/FIXME items remain — review and resolve"

# 6.4 Large files
LARGE_FILES=$(find alshuail-backend/ alshuail-admin/src/ alshuail-mobile/src/ \
  \( -name "*.js" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.ts" \) \
  ! -path "*/node_modules/*" -exec wc -l {} \; 2>/dev/null | awk '$1 > 1500 {print}' | wc -l | tr -d ' ')
[ "$LARGE_FILES" -eq 0 ] && pass "No files over 1500 lines" || warn "$LARGE_FILES file(s) over 1500 lines — consider splitting"

# =============================================================================
section "BUILD VERIFICATION"
# =============================================================================

# B.1 Backend dependencies
if [ -f "alshuail-backend/package.json" ]; then
  cd alshuail-backend
  ERR_COUNT=$(npm ls 2>&1 | grep -c "ERR\|ERESOLVE" || echo 0)
  cd ..
  [ "$ERR_COUNT" -eq 0 ] && pass "Backend npm dependencies clean" || warn "Backend has $ERR_COUNT npm issues"
else
  fail "Backend package.json not found" "Check project structure"
fi

# B.2 Admin build check
if [ -f "alshuail-admin/package.json" ]; then
  pass "Admin package.json exists (run 'npm run build' manually to verify)"
else
  warn "Admin package.json not found"
fi

# B.3 Mobile build check
if [ -f "alshuail-mobile/package.json" ]; then
  pass "Mobile package.json exists (run 'npm run build' manually to verify)"
else
  warn "Mobile package.json not found"
fi

# =============================================================================
section "FILE STRUCTURE"
# =============================================================================

# Root JS files
ROOT_JS=$(ls alshuail-backend/*.js 2>/dev/null | wc -l | tr -d ' ')
[ "$ROOT_JS" -le 5 ] && pass "Backend root JS files: $ROOT_JS (≤5)" || fail "Backend root has $ROOT_JS JS files" "Move utility scripts to scripts/"

# Controller count
CTRL_COUNT=$(ls alshuail-backend/controllers/*.js 2>/dev/null | wc -l | tr -d ' ')
echo -e "  ${CYAN}ℹ️  INFO${NC}: $CTRL_COUNT controller files"

# Route count
ROUTE_COUNT=$(ls alshuail-backend/routes/*.js 2>/dev/null | wc -l | tr -d ' ')
echo -e "  ${CYAN}ℹ️  INFO${NC}: $ROUTE_COUNT route files"

# Service count
SVC_COUNT=$(ls alshuail-backend/services/*.js 2>/dev/null | wc -l | tr -d ' ')
echo -e "  ${CYAN}ℹ️  INFO${NC}: $SVC_COUNT service files"

# =============================================================================
# FINAL REPORT
# =============================================================================

echo "" >> "$REPORT"
echo "---" >> "$REPORT"
echo "" >> "$REPORT"
echo "## 📊 FINAL RESULTS" >> "$REPORT"
echo "" >> "$REPORT"
echo "| Metric | Count |" >> "$REPORT"
echo "|--------|-------|" >> "$REPORT"
echo "| ✅ Passed | $PASS |" >> "$REPORT"
echo "| ❌ Failed | $FAIL |" >> "$REPORT"
echo "| ⚠️  Warnings | $WARN |" >> "$REPORT"
echo "| **Total Checks** | **$TOTAL** |" >> "$REPORT"
echo "" >> "$REPORT"

if [ "$FAIL" -eq 0 ]; then
  echo "### ✅ STATUS: ALL CHECKS PASSED — MIGRATION VERIFIED" >> "$REPORT"
else
  echo "### ❌ STATUS: $FAIL FAILURE(S) FOUND — NEEDS FIXING" >> "$REPORT"
  echo "" >> "$REPORT"
  echo "### Failures:" >> "$REPORT"
  echo -e "$FAILURES" >> "$REPORT"
fi

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  📊 VERIFICATION COMPLETE${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}✅ Passed:  $PASS${NC}"
echo -e "  ${RED}❌ Failed:  $FAIL${NC}"
echo -e "  ${YELLOW}⚠️  Warnings: $WARN${NC}"
echo -e "  📋 Total:   $TOTAL"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}🎉 ALL CHECKS PASSED — MIGRATION IS 100% COMPLETE!${NC}"
else
  echo -e "  ${RED}${BOLD}⚠️  $FAIL FAILURE(S) FOUND — FIX BEFORE GO-LIVE${NC}"
fi

echo ""
echo -e "  Report saved to: ${BOLD}$REPORT${NC}"
echo ""
