# 🔍 AL-SHUAIL POST-MIGRATION VERIFICATION — MASTER PROMPT FOR CLAUDE CODE

> **WHEN**: Paste this into Claude Code AFTER all migration/cleanup phases are complete.
> **PURPOSE**: Systematically audit every change, catch anything missed, and produce a final health report.
> **TIME**: ~45-60 minutes

---

## YOUR ROLE

You are a **QA auditor** for the Al-Shuail Family Fund Management System. A migration from Supabase to self-hosted PostgreSQL and a full codebase cleanup was just completed. Your job is to verify that EVERY requirement was met, find anything that was missed, and fix it.

**You must not skip any check. Run every command. Report every result.**

---

## PROJECT STRUCTURE

```
alshuail-backend/          # Node.js/Express API server
alshuail-admin/            # React 18 admin dashboard (Cloudflare Pages)
alshuail-mobile/           # React PWA mobile app
alshuail-flutter/          # Flutter native app (DO NOT TOUCH)
```

**Server**: Contabo VPS at api.alshailfund.com
**Database**: PostgreSQL on VPS (was Supabase — must be ZERO Supabase now)

---

## VERIFICATION PROCEDURE

Execute ALL sections below in order. For each check:
- Run the command shown
- Record the result as ✅ PASS or ❌ FAIL
- If FAIL → fix it immediately, then re-verify
- Write results to `VERIFICATION_REPORT.md` as you go

### Create the report file first:

```bash
cat > VERIFICATION_REPORT.md << 'EOF'
# AL-SHUAIL VERIFICATION REPORT
**Date**: $(date)
**Auditor**: Claude Code
**Status**: IN PROGRESS

---

EOF
```

---

## SECTION 1: SUPABASE REMOVAL (Zero Tolerance)

**Goal**: Absolutely ZERO Supabase references anywhere in production code.

### Check 1.1: No Supabase in package.json
```bash
echo "=== Check 1.1: package.json ===" 
grep -rl "@supabase" alshuail-backend/package.json alshuail-admin/package.json alshuail-mobile/package.json 2>/dev/null | wc -l
# EXPECTED: 0
```

### Check 1.2: No Supabase imports in backend JS
```bash
echo "=== Check 1.2: Backend JS imports ==="
grep -rn "supabase\|@supabase\|createClient.*supabase\|SUPABASE_URL\|SUPABASE_KEY\|SUPABASE_ANON" \
  alshuail-backend/ --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.git \
  | grep -v "// REMOVED\|// OLD\|// TODO.*remove" | wc -l
# EXPECTED: 0
```

### Check 1.3: No Supabase imports in frontend
```bash
echo "=== Check 1.3: Frontend imports ==="
grep -rn "supabase\|@supabase\|SUPABASE_URL\|SUPABASE_KEY" \
  alshuail-admin/src/ alshuail-mobile/src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
  2>/dev/null | wc -l
# EXPECTED: 0
```

### Check 1.4: No Supabase in .env files
```bash
echo "=== Check 1.4: .env files ==="
grep -rn "SUPABASE" alshuail-backend/.env alshuail-admin/.env alshuail-mobile/.env 2>/dev/null | wc -l
# EXPECTED: 0
```

### Check 1.5: No supabase.js config files exist
```bash
echo "=== Check 1.5: Supabase config files ==="
find . -name "supabase*" -o -name "*supabaseClient*" | grep -v node_modules | grep -v .git | wc -l
# EXPECTED: 0
```

### Check 1.6: No Supabase in node_modules (installed)
```bash
echo "=== Check 1.6: node_modules ==="
ls alshuail-backend/node_modules/@supabase 2>/dev/null && echo "FAIL: still installed" || echo "PASS"
ls alshuail-admin/node_modules/@supabase 2>/dev/null && echo "FAIL: still installed" || echo "PASS"
ls alshuail-mobile/node_modules/@supabase 2>/dev/null && echo "FAIL: still installed" || echo "PASS"
```

### Check 1.7: database.js service exists and uses pg
```bash
echo "=== Check 1.7: database.js service ==="
cat alshuail-backend/services/database.js | head -30
# MUST show: const { Pool } = require('pg') or import { Pool } from 'pg'
# MUST export: query, transaction/getClient, pool
```

### Check 1.8: Every controller uses database.js (not Supabase)
```bash
echo "=== Check 1.8: Controller imports ==="
for f in alshuail-backend/controllers/*.js; do
  HAS_DB=$(grep -c "database\|require.*database\|import.*database" "$f" 2>/dev/null || echo 0)
  HAS_SUPA=$(grep -c "supabase" "$f" 2>/dev/null || echo 0)
  if [ "$HAS_SUPA" -gt 0 ]; then
    echo "❌ FAIL: $f still uses Supabase"
  elif [ "$HAS_DB" -eq 0 ]; then
    echo "⚠️  WARN: $f has no database import (may be ok if no DB calls)"
  else
    echo "✅ $f"
  fi
done
```

### Check 1.9: Every route file is clean
```bash
echo "=== Check 1.9: Route imports ==="
for f in alshuail-backend/routes/*.js; do
  HAS_SUPA=$(grep -c "supabase" "$f" 2>/dev/null || echo 0)
  if [ "$HAS_SUPA" -gt 0 ]; then
    echo "❌ FAIL: $f still uses Supabase"
  else
    echo "✅ $f"
  fi
done
```

### Check 1.10: Supabase Storage replaced with local file storage
```bash
echo "=== Check 1.10: Storage ==="
grep -rn "supabase.*storage\|\.storage\.\|from.*bucket\|upload.*bucket" \
  alshuail-backend/ --include="*.js" --exclude-dir=node_modules | wc -l
# EXPECTED: 0
# Check multer or local storage exists:
ls alshuail-backend/services/fileStorage.js 2>/dev/null || \
ls alshuail-backend/middleware/upload*.js 2>/dev/null || \
echo "⚠️ No file storage service found"
```

**IF ANY CHECK FAILS**: Fix it now. Then re-run the failed check.

---

## SECTION 2: DEAD FILE REMOVAL

**Goal**: Zero backup files, zero dead code, zero duplicate files.

### Check 2.1: No backup files
```bash
echo "=== Check 2.1: Backup files ==="
find . -name "*.backup*" -o -name "*.bak" -o -name "*.old" -o -name "*.orig" \
  -o -name "*.fixed" -o -name "*_BACKUP_*" -o -name "*_backup_*" \
  | grep -v node_modules | grep -v .git
# EXPECTED: no output (0 files)
```

### Check 2.2: No .original suffix files
```bash
echo "=== Check 2.2: .original files ==="
find . -name "*.original*" | grep -v node_modules | grep -v .git
# EXPECTED: no output
```

### Check 2.3: No temp/test scripts in backend root
```bash
echo "=== Check 2.3: Root test scripts ==="
find alshuail-backend/ -maxdepth 1 -name "test_*" -o -name "test-*" \
  -o -name "check_*" -o -name "debug_*" -o -name "fix_*" \
  -o -name "run_*" -o -name "setup_*" -o -name "migrate_*" \
  -o -name "verify_*" -o -name "create_*" \
  | grep -v node_modules
# EXPECTED: 0 files (all should be in scripts/ subdirectory or deleted)
```

### Check 2.4: No duplicate controller versions
```bash
echo "=== Check 2.4: Duplicate controllers ==="
ls alshuail-backend/controllers/ | sort | grep -iE "enhanced|improved|new|old|v2|copy|backup" 
# EXPECTED: no output
```

### Check 2.5: No duplicate route versions
```bash
echo "=== Check 2.5: Duplicate routes ==="
ls alshuail-backend/routes/ | sort | grep -iE "enhanced|improved|new|old|v2|copy|backup"
# EXPECTED: no output
```

### Check 2.6: No duplicate frontend components
```bash
echo "=== Check 2.6: Duplicate components ==="
find alshuail-admin/src/ alshuail-mobile/src/ \
  -name "*Enhanced*" -o -name "*Improved*" -o -name "*New*" -o -name "*V2*" \
  -o -name "*Old*" -o -name "*Copy*" -o -name "*Backup*" \
  2>/dev/null | grep -v node_modules
# EXPECTED: no output
```

---

## SECTION 3: CODE QUALITY

### Check 3.1: Zero console.log in production code
```bash
echo "=== Check 3.1: console.log count ==="
grep -rn "console\.log\|console\.error\|console\.warn" \
  alshuail-backend/routes/ alshuail-backend/controllers/ alshuail-backend/services/ \
  alshuail-backend/middleware/ --include="*.js" \
  --exclude-dir=node_modules 2>/dev/null | wc -l
# EXPECTED: 0 (all should use Winston logger)
```

### Check 3.2: Winston logger exists and is configured
```bash
echo "=== Check 3.2: Winston logger ==="
ls alshuail-backend/services/logger.js 2>/dev/null || \
ls alshuail-backend/utils/logger.js 2>/dev/null || \
ls alshuail-backend/config/logger.js 2>/dev/null || \
echo "❌ FAIL: No logger file found"

# Verify it uses Winston
grep -l "winston" alshuail-backend/services/logger.js alshuail-backend/utils/logger.js alshuail-backend/config/logger.js 2>/dev/null
```

### Check 3.3: Logger imported in controllers
```bash
echo "=== Check 3.3: Logger usage ==="
TOTAL=$(ls alshuail-backend/controllers/*.js 2>/dev/null | wc -l)
USING_LOGGER=$(grep -rl "logger\|require.*logger\|import.*logger" alshuail-backend/controllers/*.js 2>/dev/null | wc -l)
echo "Controllers using logger: $USING_LOGGER / $TOTAL"
```

### Check 3.4: No hardcoded credentials
```bash
echo "=== Check 3.4: Hardcoded credentials ==="
grep -rn "password.*=.*['\"]" alshuail-backend/ --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.git \
  | grep -v "process.env\|password_hash\|passwordHash\|req.body\|bcrypt\|crypt\|\.env" \
  | grep -v "test\|example\|sample\|placeholder\|TODO"
# EXPECTED: no output (all passwords from env vars)
```

### Check 3.5: No hardcoded API keys
```bash
echo "=== Check 3.5: Hardcoded API keys ==="
grep -rn "api_key\|apiKey\|API_KEY\|secret.*=.*['\"]" \
  alshuail-backend/ --include="*.js" --exclude-dir=node_modules --exclude-dir=.git \
  | grep -v "process.env\|req.body\|req.header\|\.env\|config\." \
  | head -20
# EXPECTED: no output
```

### Check 3.6: No /api/test endpoint in production
```bash
echo "=== Check 3.6: Test endpoints ==="
grep -rn "'/api/test'\|'/test'\|app\.get.*test\|router\.get.*test" \
  alshuail-backend/routes/ alshuail-backend/server.js alshuail-backend/app.js \
  --include="*.js" 2>/dev/null
# EXPECTED: no output (or explicitly disabled)
```

### Check 3.7: TODO stubs addressed in financialReportsController
```bash
echo "=== Check 3.7: TODO stubs ==="
grep -c "TODO\|FIXME\|HACK\|STUB\|placeholder" \
  alshuail-backend/controllers/financialReportsController.js 2>/dev/null || echo "File not found"
# EXPECTED: 0 or minimal
```

---

## SECTION 4: SECURITY

### Check 4.1: JWT auth middleware exists
```bash
echo "=== Check 4.1: Auth middleware ==="
ls alshuail-backend/middleware/auth*.js 2>/dev/null
# Should exist and export authenticateToken or similar
grep -l "jwt\|jsonwebtoken\|verify" alshuail-backend/middleware/auth*.js 2>/dev/null
```

### Check 4.2: Protected routes use auth middleware
```bash
echo "=== Check 4.2: Route protection ==="
for f in alshuail-backend/routes/*.js; do
  ROUTE_NAME=$(basename "$f")
  HAS_AUTH=$(grep -c "auth\|authenticate\|protect\|verifyToken\|requireAuth" "$f" 2>/dev/null || echo 0)
  if [ "$ROUTE_NAME" = "auth.js" ] || [ "$ROUTE_NAME" = "health.js" ] || [ "$ROUTE_NAME" = "index.js" ]; then
    echo "⏭️  $ROUTE_NAME (exempt)"
  elif [ "$HAS_AUTH" -eq 0 ]; then
    echo "❌ FAIL: $ROUTE_NAME has NO auth middleware"
  else
    echo "✅ $ROUTE_NAME ($HAS_AUTH auth references)"
  fi
done
```

### Check 4.3: Rate limiting configured
```bash
echo "=== Check 4.3: Rate limiting ==="
grep -rn "rate.*limit\|rateLimit\|express-rate-limit" \
  alshuail-backend/server.js alshuail-backend/app.js alshuail-backend/middleware/ \
  --include="*.js" 2>/dev/null | head -5
```

### Check 4.4: CORS properly configured
```bash
echo "=== Check 4.4: CORS ==="
grep -rn "cors\|Access-Control" \
  alshuail-backend/server.js alshuail-backend/app.js \
  --include="*.js" 2>/dev/null | head -5
```

### Check 4.5: Helmet or security headers
```bash
echo "=== Check 4.5: Security headers ==="
grep -rn "helmet\|X-Frame-Options\|Content-Security-Policy" \
  alshuail-backend/server.js alshuail-backend/app.js \
  --include="*.js" 2>/dev/null | head -5
```

### Check 4.6: SQL injection protection (parameterized queries)
```bash
echo "=== Check 4.6: SQL injection check ==="
# Look for string concatenation in SQL queries (BAD)
grep -rn "query.*\`.*\${" alshuail-backend/ --include="*.js" \
  --exclude-dir=node_modules 2>/dev/null | head -20
# EXPECTED: 0 (all should use $1, $2 parameterized queries)
```

### Check 4.7: .env not committed to git
```bash
echo "=== Check 4.7: .env in gitignore ==="
grep ".env" alshuail-backend/.gitignore 2>/dev/null || echo "⚠️ .env not in .gitignore"
grep ".env" alshuail-admin/.gitignore 2>/dev/null || echo "⚠️ .env not in .gitignore"
```

---

## SECTION 5: DATABASE HEALTH

### Check 5.1: PostgreSQL connection works
```bash
echo "=== Check 5.1: PG Connection ==="
# Try connecting (adjust credentials as needed)
PGPASSWORD=$DB_PASSWORD psql -h localhost -U alshuail_admin -d alshuail_db -c "SELECT 1 AS ok;" 2>/dev/null \
  || echo "⚠️ Cannot connect to local PostgreSQL — verify credentials"
```

### Check 5.2: All 64 tables exist
```bash
echo "=== Check 5.2: Table count ==="
PGPASSWORD=$DB_PASSWORD psql -h localhost -U alshuail_admin -d alshuail_db -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null
# EXPECTED: 64 (or close)
```

### Check 5.3: Members table has data
```bash
echo "=== Check 5.3: Members data ==="
PGPASSWORD=$DB_PASSWORD psql -h localhost -U alshuail_admin -d alshuail_db -c \
  "SELECT COUNT(*) FROM members;" 2>/dev/null
# EXPECTED: 299+ (restored from backup)
```

### Check 5.4: Foreign key constraints intact
```bash
echo "=== Check 5.4: Foreign keys ==="
PGPASSWORD=$DB_PASSWORD psql -h localhost -U alshuail_admin -d alshuail_db -c \
  "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY';" 2>/dev/null
# EXPECTED: ~94
```

### Check 5.5: Database only accessible from localhost
```bash
echo "=== Check 5.5: PG listen address ==="
grep "listen_addresses" /etc/postgresql/*/main/postgresql.conf 2>/dev/null || \
  echo "Check manually: should be 'localhost' not '*'"
```

---

## SECTION 6: BUILD & STARTUP VERIFICATION

### Check 6.1: Backend starts without errors
```bash
echo "=== Check 6.1: Backend startup ==="
cd alshuail-backend
timeout 15 node server.js 2>&1 | head -20
# Should show "Server running on port XXXX" with no errors
# Press Ctrl+C after confirming
cd ..
```

### Check 6.2: Backend npm install clean
```bash
echo "=== Check 6.2: Backend dependencies ==="
cd alshuail-backend
npm ls 2>&1 | grep "WARN\|ERR" | head -10
cd ..
```

### Check 6.3: Admin dashboard builds
```bash
echo "=== Check 6.3: Admin build ==="
cd alshuail-admin
npm run build 2>&1 | tail -5
# Should complete with no errors
cd ..
```

### Check 6.4: Mobile app builds
```bash
echo "=== Check 6.4: Mobile build ==="
cd alshuail-mobile
npm run build 2>&1 | tail -5
# Should complete with no errors
cd ..
```

### Check 6.5: No TypeScript errors (if TS used)
```bash
echo "=== Check 6.5: TypeScript ==="
cd alshuail-admin
npx tsc --noEmit 2>&1 | tail -10
cd ..
```

---

## SECTION 7: API ENDPOINT VERIFICATION

### Check 7.1: Health endpoint
```bash
echo "=== Check 7.1: Health ==="
curl -s http://localhost:3000/api/health | head -5
# Should return 200 OK with status info
```

### Check 7.2: Auth endpoints exist
```bash
echo "=== Check 7.2: Auth routes ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/login
# Should return 400 or 401 (not 404)
```

### Check 7.3: Members endpoint (auth required)
```bash
echo "=== Check 7.3: Members route ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/members
# Should return 401 (unauthorized, not 404)
```

### Check 7.4: No duplicate routes registered
```bash
echo "=== Check 7.4: Route registration ==="
grep -n "app.use\|router.use" alshuail-backend/server.js alshuail-backend/app.js 2>/dev/null
# Look for duplicates like:
#   app.use('/api/initiatives', ...)  -- should only appear ONCE per path
#   app.use('/api/settings', ...)     -- should only appear ONCE per path
```

---

## SECTION 8: FILE STRUCTURE AUDIT

### Check 8.1: Backend organized properly
```bash
echo "=== Check 8.1: Backend structure ==="
echo "Root JS files (should be minimal):"
ls alshuail-backend/*.js 2>/dev/null | wc -l
echo "Controllers:"
ls alshuail-backend/controllers/*.js 2>/dev/null | wc -l
echo "Routes:"
ls alshuail-backend/routes/*.js 2>/dev/null | wc -l
echo "Services:"
ls alshuail-backend/services/*.js 2>/dev/null | wc -l
echo "Middleware:"
ls alshuail-backend/middleware/*.js 2>/dev/null | wc -l
```

### Check 8.2: No oversized files
```bash
echo "=== Check 8.2: Large files ==="
find alshuail-backend/ alshuail-admin/src/ alshuail-mobile/src/ \
  -name "*.js" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.ts" \
  | xargs wc -l 2>/dev/null | sort -rn | head -10
# Flag anything over 1000 lines for potential splitting
```

### Check 8.3: Upload directory exists
```bash
echo "=== Check 8.3: Upload directory ==="
ls -la /var/www/uploads/alshuail/ 2>/dev/null || echo "⚠️ Upload directory missing"
```

---

## SECTION 9: FINAL STATISTICS

### Generate final summary
```bash
echo "=== FINAL COUNTS ==="
echo "Backend controllers: $(ls alshuail-backend/controllers/*.js 2>/dev/null | wc -l)"
echo "Backend routes: $(ls alshuail-backend/routes/*.js 2>/dev/null | wc -l)"  
echo "Backend services: $(ls alshuail-backend/services/*.js 2>/dev/null | wc -l)"
echo "Backend middleware: $(ls alshuail-backend/middleware/*.js 2>/dev/null | wc -l)"
echo ""
echo "Supabase references: $(grep -rn 'supabase' --include='*.js' --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | wc -l)"
echo "console.log count: $(grep -rn 'console\.log' alshuail-backend/routes/ alshuail-backend/controllers/ alshuail-backend/services/ --include='*.js' 2>/dev/null | wc -l)"
echo "Backup files: $(find . -name '*.backup*' -o -name '*.bak' -o -name '*.old' | grep -v node_modules | grep -v .git | wc -l)"
echo "TODO/FIXME count: $(grep -rn 'TODO\|FIXME' alshuail-backend/ --include='*.js' --exclude-dir=node_modules 2>/dev/null | wc -l)"
```

---

## AFTER ALL CHECKS COMPLETE

### Write the final report:
Append the summary to VERIFICATION_REPORT.md:

```markdown
## FINAL RESULTS

| Section | Checks | Passed | Failed | Warnings |
|---------|--------|--------|--------|----------|
| 1. Supabase Removal | 10 | ? | ? | ? |
| 2. Dead File Removal | 6 | ? | ? | ? |
| 3. Code Quality | 7 | ? | ? | ? |
| 4. Security | 7 | ? | ? | ? |
| 5. Database Health | 5 | ? | ? | ? |
| 6. Build & Startup | 5 | ? | ? | ? |
| 7. API Endpoints | 4 | ? | ? | ? |
| 8. File Structure | 3 | ? | ? | ? |
| **TOTAL** | **47** | **?** | **?** | **?** |

### Status: ✅ ALL PASSED / ❌ X FAILURES REMAIN

### Failures Fixed During Audit:
1. (list what you fixed)
2. ...

### Remaining Issues (if any):
1. (list what could not be fixed)
2. ...
```

### If ALL 47 checks pass:
```
🎉 MIGRATION & CLEANUP VERIFIED — 100% COMPLETE
```

### If ANY checks fail:
Fix them now, re-run the failed checks, update the report.

---

## CRITICAL RULES FOR THE AUDITOR

1. **Run EVERY command** — do not skip any check
2. **Fix failures immediately** — don't just report, fix
3. **Re-verify after fixes** — ensure the fix actually works
4. **Be thorough** — check edge cases the commands might miss
5. **Write the report** — the user needs proof everything is clean
6. **Do NOT modify Flutter** — alshuail-flutter/ is off-limits
7. **Count everything** — exact numbers, not estimates
