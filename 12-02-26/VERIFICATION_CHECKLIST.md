# ✅ AL-SHUAIL VERIFICATION CHECKLIST

> **Print this or keep it open. Check off each item as Claude Code verifies it.**
> **Every single box must be checked before the project is considered complete.**

---

## PHASE 0: SUPABASE → POSTGRESQL (10 checks)

| # | Check | Command | Expected | Status |
|---|-------|---------|----------|--------|
| 0.1 | No @supabase in package.json | `grep -rl "@supabase" */package.json` | 0 results | ☐ |
| 0.2 | No supabase imports in backend | `grep -rn "supabase" alshuail-backend/ --include="*.js" \| grep -v node_modules` | 0 results | ☐ |
| 0.3 | No supabase imports in frontend | `grep -rn "supabase" alshuail-admin/src/ alshuail-mobile/src/` | 0 results | ☐ |
| 0.4 | No SUPABASE in .env | `grep "SUPABASE" */.env` | 0 results | ☐ |
| 0.5 | No supabase config files | `find . -name "supabase*" \| grep -v node_modules` | 0 results | ☐ |
| 0.6 | @supabase not in node_modules | `ls */node_modules/@supabase` | not found | ☐ |
| 0.7 | database.js uses pg Pool | `grep "Pool" alshuail-backend/services/database.js` | found | ☐ |
| 0.8 | All controllers use database.js | manual check per controller | all imported | ☐ |
| 0.9 | All routes clean of supabase | `grep -rn "supabase" alshuail-backend/routes/` | 0 results | ☐ |
| 0.10 | Storage uses local/multer | `grep -rn "supabase.*storage" alshuail-backend/` | 0 results | ☐ |

**Phase 0 Score: ___ / 10**

---

## PHASE 1: DEAD FILE REMOVAL (6 checks)

| # | Check | Command | Expected | Status |
|---|-------|---------|----------|--------|
| 1.1 | No .backup files | `find . -name "*.backup*" \| grep -v node_modules` | 0 results | ☐ |
| 1.2 | No .bak/.old/.orig files | `find . -name "*.bak" -o -name "*.old" -o -name "*.orig"` | 0 results | ☐ |
| 1.3 | No .original files | `find . -name "*.original*" \| grep -v node_modules` | 0 results | ☐ |
| 1.4 | No .fixed suffix files | `find . -name "*.fixed*" \| grep -v node_modules` | 0 results | ☐ |
| 1.5 | No test_* in backend root | `find alshuail-backend/ -maxdepth 1 -name "test_*"` | 0 results | ☐ |
| 1.6 | No debug_*/fix_*/check_* in root | `find alshuail-backend/ -maxdepth 1 -name "debug_*" -o -name "fix_*"` | 0 results | ☐ |

**Phase 1 Score: ___ / 6**

---

## PHASE 2: SCRIPTS ORGANIZED (3 checks)

| # | Check | Command | Expected | Status |
|---|-------|---------|----------|--------|
| 2.1 | scripts/ directory exists | `ls alshuail-backend/scripts/` | exists | ☐ |
| 2.2 | Root JS files minimal (≤5) | `ls alshuail-backend/*.js \| wc -l` | ≤ 5 | ☐ |
| 2.3 | Scripts categorized in subdirs | `ls alshuail-backend/scripts/` | organized | ☐ |

**Phase 2 Score: ___ / 3**

---

## PHASE 3: DUPLICATE BACKEND ROUTES (5 checks)

| # | Check | Command | Expected | Status |
|---|-------|---------|----------|--------|
| 3.1 | One initiatives route only | `ls alshuail-backend/routes/ \| grep -i init` | 1 file | ☐ |
| 3.2 | One settings route only | `ls alshuail-backend/routes/ \| grep -i setting` | 1 file | ☐ |
| 3.3 | One members route only | `ls alshuail-backend/routes/ \| grep -i member` | 1 file | ☐ |
| 3.4 | No Enhanced/Improved routes | `ls alshuail-backend/routes/ \| grep -iE "enhanced\|improved"` | 0 results | ☐ |
| 3.5 | No duplicate app.use() paths | `grep "app.use" alshuail-backend/server.js` | no duplicates | ☐ |

**Phase 3 Score: ___ / 5**

---

## PHASE 4: DUPLICATE FRONTEND COMPONENTS (5 checks)

| # | Check | Command | Expected | Status |
|---|-------|---------|----------|--------|
| 4.1 | One Members component | `find alshuail-admin/src/ -name "*Member*" -type f` | 1-2 files | ☐ |
| 4.2 | One Diya component | `find alshuail-admin/src/ -name "*Diya*" -type f` | 1-2 files | ☐ |
| 4.3 | One Occasions component | `find alshuail-admin/src/ -name "*Occasion*" -type f` | 1-2 files | ☐ |
| 4.4 | No Enhanced/V2 components | `find alshuail-admin/src/ -name "*Enhanced*" -o -name "*V2*"` | 0 results | ☐ |
| 4.5 | StyledDashboard under 500 lines | `wc -l alshuail-admin/src/**/StyledDashboard*` | < 500 | ☐ |

**Phase 4 Score: ___ / 5**

---

## PHASE 5: SECURITY (7 checks)

| # | Check | Command | Expected | Status |
|---|-------|---------|----------|--------|
| 5.1 | Auth middleware exists | `ls alshuail-backend/middleware/auth*` | exists | ☐ |
| 5.2 | Auth uses JWT | `grep "jwt\|jsonwebtoken" alshuail-backend/middleware/auth*` | found | ☐ |
| 5.3 | Routes use auth middleware | check each route file | most protected | ☐ |
| 5.4 | No /api/test endpoint | `grep "api/test" alshuail-backend/routes/*` | 0 results | ☐ |
| 5.5 | No hardcoded passwords | `grep "password.*=" --include="*.js" \| grep -v env` | 0 results | ☐ |
| 5.6 | .env in .gitignore | `grep ".env" alshuail-backend/.gitignore` | found | ☐ |
| 5.7 | SQL parameterized (no concat) | `grep "query.*\\\`.*\\\${" alshuail-backend/ --include="*.js"` | 0 results | ☐ |

**Phase 5 Score: ___ / 7**

---

## PHASE 6: CODE QUALITY (6 checks)

| # | Check | Command | Expected | Status |
|---|-------|---------|----------|--------|
| 6.1 | Zero console.log in prod code | `grep -rn "console.log" alshuail-backend/controllers/ routes/ services/` | 0 results | ☐ |
| 6.2 | Winston logger exists | `ls alshuail-backend/*/logger.js` | exists | ☐ |
| 6.3 | Logger imported in controllers | `grep -rl "logger" alshuail-backend/controllers/` | all files | ☐ |
| 6.4 | TODO stubs < 5 remaining | `grep -rn "TODO\|FIXME" alshuail-backend/ --include="*.js"` | < 5 | ☐ |
| 6.5 | No files > 1500 lines | `find . -name "*.js" \| xargs wc -l \| sort -rn \| head -5` | all < 1500 | ☐ |
| 6.6 | Error handling in controllers | check try/catch patterns | present | ☐ |

**Phase 6 Score: ___ / 6**

---

## BUILD & DEPLOY (5 checks)

| # | Check | Command | Expected | Status |
|---|-------|---------|----------|--------|
| B.1 | Backend starts without errors | `node alshuail-backend/server.js` | starts OK | ☐ |
| B.2 | npm install clean (backend) | `cd alshuail-backend && npm install` | no errors | ☐ |
| B.3 | Admin dashboard builds | `cd alshuail-admin && npm run build` | builds OK | ☐ |
| B.4 | Mobile app builds | `cd alshuail-mobile && npm run build` | builds OK | ☐ |
| B.5 | API health endpoint works | `curl localhost:3000/api/health` | 200 OK | ☐ |

**Build Score: ___ / 5**

---

## DATABASE (5 checks)

| # | Check | Command | Expected | Status |
|---|-------|---------|----------|--------|
| D.1 | PostgreSQL running on VPS | `systemctl status postgresql` | active | ☐ |
| D.2 | ~64 tables exist | `SELECT COUNT(*) FROM information_schema.tables` | ~64 | ☐ |
| D.3 | Members table has data | `SELECT COUNT(*) FROM members` | 299+ | ☐ |
| D.4 | Foreign keys intact | `SELECT COUNT(*) ... constraint_type='FOREIGN KEY'` | ~94 | ☐ |
| D.5 | DB only on localhost | check postgresql.conf listen_addresses | localhost | ☐ |

**Database Score: ___ / 5**

---

## 📊 GRAND TOTAL

| Section | Total Checks | Passed |
|---------|-------------|--------|
| Phase 0: Supabase Removal | 10 | ___ |
| Phase 1: Dead Files | 6 | ___ |
| Phase 2: Scripts | 3 | ___ |
| Phase 3: Backend Duplicates | 5 | ___ |
| Phase 4: Frontend Duplicates | 5 | ___ |
| Phase 5: Security | 7 | ___ |
| Phase 6: Code Quality | 6 | ___ |
| Build & Deploy | 5 | ___ |
| Database | 5 | ___ |
| **GRAND TOTAL** | **52** | **___** |

---

### ✅ 52/52 = PROJECT 100% COMPLETE
### ⚠️ 48-51/52 = Minor issues, fix before go-live
### ❌ < 48/52 = Significant gaps, needs more work

---

**Signed off by**: _______________  
**Date**: _______________  
**Status**: ☐ APPROVED FOR PRODUCTION / ☐ NEEDS REWORK
