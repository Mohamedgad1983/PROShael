# 🚀 MASTER PROMPT FOR CLAUDE CODE
# Copy EVERYTHING below this line into Claude Code

---

You are tasked with a comprehensive cleanup AND database migration of the Al-Shuail Family Fund Management System. This is a ~200K LOC production project for a Saudi/Kuwaiti family (347+ members). The TWO biggest changes are:

1. **REMOVE SUPABASE ENTIRELY** — migrate to self-hosted PostgreSQL on the VPS
2. **Clean up all technical debt** — duplicates, dead code, security issues

## PROJECT CONTEXT

**Tech stack (CURRENT)**:
- Backend: Node.js/Express.js (ES Modules) in `alshuail-backend/` on Contabo VPS
- Admin: React 18 + TypeScript + Tailwind in `alshuail-admin-arabic/` on Cloudflare Pages
- Mobile PWA: React + Vite in `alshuail-mobile/` on Cloudflare Pages
- Flutter: `alshuail-flutter/` (don't touch)
- Database: Supabase PostgreSQL ← **REMOVING THIS**
- Backend uses BOTH Supabase JS client AND pgQueryBuilder ← **REPLACING BOTH**

**Tech stack (TARGET)**:
- Database: PostgreSQL self-hosted on Contabo VPS (same server as backend)
- DB access: `pg` (node-postgres) with connection pool — single pattern everywhere
- File storage: Local disk `/var/www/uploads/alshuail/` (replacing Supabase Storage)
- Everything else stays the same

## CONSTITUTION (NON-NEGOTIABLE RULES)

1. NEVER break production — backward compatible changes only
2. NO Supabase dependencies after migration — zero imports, zero config, zero package references
3. ALL database queries use parameterized SQL via `pg` Pool — NEVER concatenate user input
4. One version of each component/route/controller — NO duplicates
5. No console.log in production — use Winston logger
6. No hardcoded credentials in source code
7. No test/debug endpoints in production
8. Arabic RTL layout must not be affected
9. Git commit after each phase with descriptive messages
10. Verify builds pass after each phase

---

## PHASE 0: MIGRATE FROM SUPABASE TO VPS POSTGRESQL (DO THIS FIRST)

### Step 0.1: Install pg and create database service

```bash
cd alshuail-backend
npm install pg
```

Create `services/database.js`:
```javascript
import pg from 'pg';
import logger from './logger.js';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => logger.error('Database pool error', err));

export const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (error) {
    logger.error(`Query error: ${error.message}`, { sql: text.substring(0, 200) });
    throw error;
  }
};

export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const checkHealth = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    return { healthy: true, timestamp: result.rows[0].now };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
};

export default pool;
```

### Step 0.2: Find ALL Supabase usage

Run these commands and list every file:
```bash
grep -rln "supabase\|@supabase" alshuail-backend/ --include="*.js" | grep -v node_modules | sort
grep -rln "supabase\|@supabase" alshuail-admin-arabic/ --include="*.ts" --include="*.tsx" --include="*.js" | grep -v node_modules | sort
grep -rln "supabase\|@supabase" alshuail-mobile/ --include="*.ts" --include="*.tsx" --include="*.js" | grep -v node_modules | sort
```

### Step 0.3: Convert ALL backend files from Supabase to pg

For EVERY file found in Step 0.2, convert using these patterns:

**Supabase → PostgreSQL conversion:**
```javascript
// BEFORE (Supabase):
import supabase from '../config/supabase.js';
const { data, error } = await supabase.from('members').select('*').eq('id', id).single();
if (error) return res.status(500).json({ success: false, message: error.message });
return res.json({ success: true, data });

// AFTER (pg):
import { query } from '../services/database.js';
try {
  const { rows } = await query('SELECT * FROM members WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
  return res.json({ success: true, data: rows[0] });
} catch (error) {
  logger.error('Failed to fetch member', error);
  return res.status(500).json({ success: false, message: 'Internal server error' });
}
```

**Key conversion patterns:**
- `.select('*')` → `SELECT * FROM table`
- `.eq('col', val)` → `WHERE col = $1` with params array
- `.neq / .gt / .gte / .lt / .lte` → `!= / > / >= / < / <=`
- `.in('col', arr)` → `WHERE col = ANY($1)` with array param
- `.ilike('col', '%x%')` → `WHERE col ILIKE $1` with `'%x%'`
- `.is('col', null)` → `WHERE col IS NULL`
- `.order('col', {ascending: false})` → `ORDER BY col DESC`
- `.limit(n)` → `LIMIT n`
- `.range(from, to)` → `LIMIT (to-from+1) OFFSET from`
- `.insert({...})` → `INSERT INTO t (...) VALUES ($1,$2) RETURNING *`
- `.update({...}).eq('id', id)` → `UPDATE t SET col=$1 WHERE id=$2 RETURNING *`
- `.delete().eq('id', id)` → `DELETE FROM t WHERE id=$1`
- `.single()` → use `rows[0]`
- `{ data, error }` → `{ rows }` in try/catch

### Step 0.4: Replace Supabase Storage with local files

Create `services/fileStorage.js` with multer + local disk storage.
Add to server.js: `app.use('/uploads', express.static('/var/www/uploads/alshuail'))`
Replace all `supabase.storage` calls with local file operations.

### Step 0.5: Also convert pgQueryBuilder

Find all pgQueryBuilder usage and convert to the same `query()` function from database.js. Then delete `config/pgQueryBuilder.js`.

### Step 0.6: Remove Supabase completely

```bash
cd alshuail-backend && npm uninstall @supabase/supabase-js
```
Delete: `config/supabase.js` and any other Supabase config files.
Remove SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY from `.env`.
Add: `DATABASE_URL=postgresql://alshuail_admin:PASSWORD@localhost:5432/alshuail`

### Step 0.7: Check frontends

Verify admin and mobile don't directly use Supabase. If they do, remove it.
The frontends should ONLY call the backend API — never the database directly.

### Step 0.8: Generate database setup scripts

Create `database/migrations/` with:
- `000-setup-postgresql.sh` — install PostgreSQL, create user/db
- `001-schema.sql` — all 64 CREATE TABLE statements
- `002-foreign-keys.sql` — all 94 FK constraints
- `003-indexes.sql` — performance indexes
- `004-seed-data.sql` — reference data (roles, permissions, categories, plans)
- `005-restore-members.sql` — restore 299 members from backup
- `006-create-admin.sql` — super admin user

Git commit: `feat: migrate from Supabase to self-hosted PostgreSQL`

**CHECKPOINT**: Server starts, no Supabase references remain, endpoints respond correctly.

---

## PHASE 1: Delete Dead Code (~27 files, 30 min)

Delete ALL: `*.backup*`, `*.fixed`, `*.original*`, `temp_part*` files.
Delete: `BACKUPS/`, `Mobile/`, `Monitormember/` directories.
Delete: `memberServiceDemo.js`, `flexiblePaymentTest.js`, `FLEXIBLE_PAYMENT_DOCUMENTATION.md`.
Verify no broken imports. Commit: `chore: remove backup and dead files`

## PHASE 2: Organize Root Scripts (55 files, 20 min)

Move all .js from `alshuail-backend/` root (except server.js, configs) to `scripts/{testing,admin,debug,fixes}/`.
Delete `crisis-server.js`. Commit: `chore: organize root scripts`

## PHASE 3: Consolidate Duplicate Backend (45 min)

Read server.js. For each duplicate route/controller/middleware pair, keep the better version, delete the other, update imports:
- Routes: initiatives/Enhanced, settings/Improved, familyTree/family-tree.routes, memberMonitoring/Optimized, notifications/notificationRoutes
- Middleware: rbac.middleware/rbacMiddleware, auth/authMiddleware
- Controllers: memberController/membersController, notificationController/notificationsController

Commit: `refactor: consolidate duplicate backend code`

## PHASE 4: Consolidate Duplicate Frontend (45 min)

Check App.tsx router. Delete all non-imported component versions:
- Members (4→1), Diyas (3→1), Occasions (3→1), Initiatives (2→1), Settings (2→1)
- api.js vs api.ts → keep .ts
- Delete MemberMonitoringDashboard.original.jsx

Commit: `refactor: consolidate duplicate frontend components`

## PHASE 5: Security Fixes (30 min)

1. Remove `/api/test` from server.js
2. Fix hardcoded credentials
3. Audit auth middleware on all routes
4. PostgreSQL: localhost-only access

Commit: `security: fix endpoints, credentials, auth`

## PHASE 6: Code Quality (60 min)

1. Replace ALL console.log with Winston logger
2. Fix 20+ TODO stubs in financialReportsController.js
3. Create database backup cron script

Commit: `fix: logger, stubs, backup script`

---

## FINAL VERIFICATION

```bash
# Zero Supabase references
grep -rn "supabase" alshuail-backend/ --include="*.js" --include="*.json" | grep -v node_modules | wc -l
# Expected: 0

# Zero backup files
find . -name "*.backup*" -o -name "*.fixed" -o -name "*.original*" | grep -v node_modules | wc -l
# Expected: 0

# Zero console.log in production
grep -rn "console\.log" alshuail-backend/routes/ alshuail-backend/controllers/ alshuail-backend/services/ --include="*.js" | wc -l
# Expected: 0

# Builds pass
cd alshuail-backend && npm start
cd alshuail-admin-arabic && npm run build
cd alshuail-mobile && npm run build
```

## IMPORTANT NOTES

- Create backup branch FIRST: `git checkout -b pre-migration-backup && git push && git checkout main`
- Don't touch `alshuail-flutter/` (relatively clean)
- Database SQL files are for manual execution on VPS — do NOT auto-run them
- Keep Supabase running until VPS PostgreSQL is fully verified
- Frontends should NOT need changes if API responses stay the same format

Start with Phase 0 now. Show me what Supabase files you find and your plan to convert them, then proceed file by file.
