# Specification: Al-Shuail System Complete Cleanup & Database Migration

## Overview

The Al-Shuail Family Fund Management System is a ~200K LOC project that needs:
1. **Database migration** from Supabase to self-hosted PostgreSQL on Contabo VPS
2. **Comprehensive code cleanup** to eliminate technical debt
3. **Security hardening** for production use with real financial data

## Current System Architecture

```
Repository Structure:
├── alshuail-backend/         # Express.js API (41 route groups, 52 route files)
├── alshuail-admin-arabic/    # React 18 + TypeScript Admin Dashboard (197 components)
├── alshuail-mobile/          # React + Vite Mobile PWA (22 pages)
├── alshuail-flutter/         # Flutter Native Mobile App (37 dart files)
├── database/                 # Screenshots only (stale)
├── docs/                     # Documentation
├── claudedocs/               # AI-generated reports
├── specs/                    # Feature specs
└── .github/                  # CI/CD workflows
```

### Current Database: Supabase PostgreSQL (TO BE REPLACED)
- 64 tables, 94 foreign key relationships
- Members table currently EMPTY (backup has 299 rows)
- Mixed access: Supabase JS client AND direct pgQueryBuilder

### Target Database: PostgreSQL on Contabo VPS (SELF-HOSTED)
- Same 64 table schema migrated to local PostgreSQL
- Single access pattern: `pg` (node-postgres) with connection pool
- No Supabase dependency whatsoever

---

## USER STORY 0: Migrate from Supabase to VPS PostgreSQL (HIGHEST PRIORITY)

### As a system owner, I need the database fully self-hosted on my VPS so I don't depend on Supabase.

**Acceptance Criteria:**

1. **Install PostgreSQL on Contabo VPS** (generate setup script):
   ```bash
   sudo apt update && sudo apt install postgresql postgresql-contrib -y
   sudo systemctl enable postgresql
   sudo -u postgres createuser alshuail_admin -P
   sudo -u postgres createdb alshuail -O alshuail_admin
   ```

2. **Export schema from Supabase** (generate migration SQL):
   - Export all 64 table CREATE statements with columns, types, defaults
   - Export all 94 foreign key constraints
   - Export all indexes
   - Export all triggers and functions
   - Export all enum types
   - Export RLS policies (if any)
   - Generate a single `schema.sql` file that recreates the entire database

3. **Export data from Supabase**:
   - Generate `pg_dump` command or INSERT statements for tables with data
   - Key tables with data: activities (9), events (3), financial_contributions (20), settings (24), app_settings (6), family_branches (3), document_categories (13), document_types (14), expense_categories (10), user_roles (7), roles (5), permissions (15), subscription_plans (3), members_backup (299)

4. **Create new database service** (`alshuail-backend/services/database.js`):
   ```javascript
   import pg from 'pg';
   const { Pool } = pg;

   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });

   pool.on('error', (err) => {
     logger.error('Unexpected pool error', err);
   });

   export const query = (text, params) => pool.query(text, params);
   export const getClient = () => pool.connect();
   export default pool;
   ```

5. **Remove ALL Supabase dependencies from backend**:
   - Delete `config/supabase.js`
   - Delete or rewrite `config/database.js` (if Supabase-based)
   - Remove `@supabase/supabase-js` from `package.json`
   - Remove `SUPABASE_URL` and `SUPABASE_ANON_KEY` from `.env`
   - Add `DATABASE_URL=postgresql://alshuail_admin:PASSWORD@localhost:5432/alshuail` to `.env`

6. **Convert ALL controllers/services from Supabase client to pg queries**:
   
   BEFORE (Supabase pattern):
   ```javascript
   const { data, error } = await supabase.from('members').select('*').eq('id', id);
   ```
   
   AFTER (pg pattern):
   ```javascript
   import { query } from '../services/database.js';
   const { rows } = await query('SELECT * FROM members WHERE id = $1', [id]);
   ```

   Conversion rules:
   - `.select('*')` → `SELECT * FROM table`
   - `.select('col1, col2')` → `SELECT col1, col2 FROM table`
   - `.eq('col', val)` → `WHERE col = $1` with params
   - `.neq('col', val)` → `WHERE col != $1`
   - `.gt('col', val)` → `WHERE col > $1`
   - `.gte('col', val)` → `WHERE col >= $1`
   - `.lt('col', val)` → `WHERE col < $1`
   - `.in('col', [arr])` → `WHERE col = ANY($1)` with array param
   - `.like('col', '%val%')` → `WHERE col LIKE $1` with `%val%` param
   - `.ilike('col', '%val%')` → `WHERE col ILIKE $1`
   - `.is('col', null)` → `WHERE col IS NULL`
   - `.order('col', { ascending: false })` → `ORDER BY col DESC`
   - `.limit(n)` → `LIMIT $n`
   - `.range(from, to)` → `LIMIT $1 OFFSET $2`
   - `.insert({...})` → `INSERT INTO table (cols) VALUES ($1, $2...) RETURNING *`
   - `.update({...}).eq('id', id)` → `UPDATE table SET col=$1 WHERE id=$2 RETURNING *`
   - `.delete().eq('id', id)` → `DELETE FROM table WHERE id = $1`
   - `.single()` → add `LIMIT 1` or just use `rows[0]`
   - `.maybeSingle()` → `rows[0] || null`
   - Error handling: check `rows.length` instead of Supabase `error`

7. **Convert pgQueryBuilder usage** to the same pg pattern (standardize):
   - Find all files using pgQueryBuilder
   - Rewrite to use the new `services/database.js`

8. **Replace Supabase Storage with local file storage**:
   - Create upload directory: `/var/www/uploads/alshuail/`
   - Create sub-dirs: `member-photos/`, `member-documents/`, `financial-reports/`, `competition-media/`
   - Replace Supabase storage calls with `multer` + local disk storage
   - Serve files via Express static: `app.use('/uploads', express.static('/var/www/uploads/alshuail'))`
   - Update all file URL references from Supabase URLs to VPS URLs

9. **Replace Supabase Auth (if still used)** with custom JWT:
   - Ensure all auth is handled by the custom `auth.js` route
   - WhatsApp OTP → verify → issue JWT
   - No Supabase auth calls remaining

10. **Frontend changes** - update API service:
    - The admin and mobile frontends should NOT need changes if the backend API responses stay the same
    - BUT: Check if any frontend code directly calls Supabase (it shouldn't, but verify)
    - Remove any `@supabase/supabase-js` from frontend `package.json` if present

**Files affected**: ALL backend files that import supabase, database config, 30+ controllers/services

---

## USER STORY 1: Delete Dead Code & Backup Files

### As a developer, I need all backup/dead files removed so the codebase is clean.

**Acceptance Criteria:**

1. Delete ALL files with patterns: `*.backup*`, `*.fixed`, `*.original*`, `temp_part*`
2. Delete specific dead files:
   - Backend: `diyasController.backup.js`, `diyasController.backup2.js`, `databaseOptimizationService.js.fixed`, `receiptService.js.backup`, `temp_part1.txt`
   - Admin: `BACKUPS/` directory, `memberServiceDemo.js`, `flexiblePaymentTest.js`, `FLEXIBLE_PAYMENT_DOCUMENTATION.md`, `biometricAuth.jsx.backup`
3. Delete legacy directories: `Mobile/`, `Monitormember/`, `database/` (screenshots only)
4. Verify no imports reference deleted files
5. Builds still pass

---

## USER STORY 2: Organize Backend Root Scripts

Move 55 root .js files in `alshuail-backend/` to `scripts/` subdirectories. Keep only `server.js` and config at root. Delete `crisis-server.js`.

---

## USER STORY 3: Consolidate Duplicate Backend Routes

For each duplicate pair, keep the better/mounted version, delete the other, update server.js:
- initiatives vs initiativesEnhanced
- settings vs settingsImproved
- familyTree vs family-tree.routes
- memberMonitoring vs memberMonitoringOptimized
- notifications vs notificationRoutes
- rbac.middleware vs rbacMiddleware
- memberController vs membersController
- notificationController vs notificationsController

---

## USER STORY 4: Consolidate Duplicate Frontend Components

Check router to find active versions. Delete all non-imported duplicates:
- Members (4 versions → 1), Diyas (3→1), Occasions (3→1), Initiatives (2→1)
- Settings (2→1), MultiRole (2→1), api.js vs api.ts (keep .ts)
- Delete MemberMonitoringDashboard.original.jsx

---

## USER STORY 5: Fix Security Issues

1. Remove `/api/test` from production server.js
2. Remove hardcoded credentials from scripts
3. Audit auth middleware on all routes
4. PostgreSQL: use strong password, limit connections to localhost only

---

## USER STORY 6: Fix Backend Code Quality

1. Replace all console.log with Winston logger
2. Fix 20+ TODO stubs in financialReportsController.js
3. Split oversized files (profile.js 1805 lines, etc.)
4. Standardize API response format

---

## USER STORY 7: Database Setup & Optimization

1. Generate PostgreSQL setup script for Contabo VPS
2. Generate complete schema migration SQL (all 64 tables)
3. Generate data migration SQL (tables with existing data)
4. Generate index creation SQL
5. Generate admin user creation SQL
6. Configure PostgreSQL for production (pg_hba.conf, postgresql.conf)
7. Set up automated backups with pg_dump cron job

---

## Functional Requirements Summary

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-0 | Migrate from Supabase to VPS PostgreSQL | P0 - CRITICAL |
| FR-1 | Remove ALL Supabase dependencies | P0 |
| FR-2 | Create unified pg database service | P0 |
| FR-3 | Convert all Supabase queries to pg queries | P0 |
| FR-4 | Replace Supabase Storage with local storage | P0 |
| FR-5 | Delete backup/dead files | P1 |
| FR-6 | Organize root scripts | P1 |
| FR-7 | Consolidate duplicate routes/components | P1 |
| FR-8 | Security fixes | P0 |
| FR-9 | Code quality improvements | P2 |
| FR-10 | Database setup & optimization | P0 |

## Out of Scope

- New feature development
- Flutter app improvements
- Payment gateway integration (K-Net)
- Firebase push notifications
- UI/UX redesign
