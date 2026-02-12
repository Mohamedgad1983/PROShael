# Implementation Plan: Al-Shuail System Cleanup + Database Migration

## Tech Stack (Target)

- **Database**: PostgreSQL 15+ SELF-HOSTED on Contabo VPS (NO Supabase)
- **DB Client**: `pg` (node-postgres) with connection pool
- **Backend**: Node.js 18+ / Express.js (ES Modules) on Contabo VPS
- **Admin Frontend**: React 18 + TypeScript + Vite + Tailwind CSS on Cloudflare Pages
- **Mobile Frontend**: React + Vite PWA on Cloudflare Pages
- **File Storage**: Local disk on VPS (`/var/www/uploads/alshuail/`)
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx with SSL

## Implementation Strategy

Execute in 7 phases. Phase 0 (database migration) is the most critical and must be done first. Each phase is independently deployable.

---

## Phase 0: Migrate from Supabase to VPS PostgreSQL (2-3 hours)

### 0A: Setup PostgreSQL on VPS

Generate a setup script (`scripts/setup-postgresql.sh`):
```bash
#!/bin/bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql -c "CREATE USER alshuail_admin WITH PASSWORD 'CHANGE_THIS_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE alshuail OWNER alshuail_admin;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE alshuail TO alshuail_admin;"

# Enable UUID extension
sudo -u postgres psql -d alshuail -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Configure for local-only access
# Edit /etc/postgresql/*/main/pg_hba.conf:
# local   alshuail    alshuail_admin    md5
# host    alshuail    alshuail_admin    127.0.0.1/32    md5

# Restart
sudo systemctl restart postgresql
```

### 0B: Export Schema from Supabase

Before any code changes, export the full schema:
```bash
# From a machine with access to Supabase
pg_dump "postgresql://postgres:PASSWORD@db.oneiggrfzagqjbkdinin.supabase.co:5432/postgres" \
  --schema-only --no-owner --no-acl \
  -f schema.sql

# Export data for tables that have data
pg_dump "postgresql://postgres:PASSWORD@db.oneiggrfzagqjbkdinin.supabase.co:5432/postgres" \
  --data-only --no-owner --no-acl \
  -t activities -t events -t event_attendees \
  -t financial_contributions -t settings -t app_settings -t system_settings \
  -t family_branches -t document_categories -t document_types \
  -t expense_categories -t user_roles -t roles -t permissions \
  -t subscription_plans -t initiatives -t main_categories -t sub_categories \
  -t temp_members -t profiles -t refresh_tokens -t members_backup_20250928_1039 \
  -f data.sql
```

Alternatively, generate CREATE TABLE statements from the known schema documentation.

### 0C: Create New Database Service

Create `alshuail-backend/services/database.js`:
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

pool.on('connect', () => {
  logger.info('New database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', err);
});

// Simple query helper
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}`);
    }
    return result;
  } catch (error) {
    logger.error(`Database query error: ${error.message}`, { query: text.substring(0, 200) });
    throw error;
  }
};

// Transaction helper
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

// Get a client for manual transaction control
export const getClient = () => pool.connect();

// Health check
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

### 0D: Convert All Supabase Calls to pg Queries

**Systematic approach:**

1. Find all files importing Supabase:
   ```bash
   grep -rn "supabase" alshuail-backend/ --include="*.js" | grep -v node_modules | grep -v ".env"
   ```

2. For each file, apply these conversion patterns:

   | Supabase | PostgreSQL (pg) |
   |----------|----------------|
   | `supabase.from('members').select('*')` | `query('SELECT * FROM members')` |
   | `.select('id, name, phone')` | `query('SELECT id, name, phone FROM members')` |
   | `.eq('id', id)` | `query('... WHERE id = $1', [id])` |
   | `.eq('a', x).eq('b', y)` | `query('... WHERE a = $1 AND b = $2', [x, y])` |
   | `.neq('status', 'deleted')` | `query('... WHERE status != $1', ['deleted'])` |
   | `.gt('amount', 100)` | `query('... WHERE amount > $1', [100])` |
   | `.gte / .lte / .lt` | `>= / <= / <` |
   | `.in('id', [1,2,3])` | `query('... WHERE id = ANY($1)', [[1,2,3]])` |
   | `.like('name', '%ahmed%')` | `query('... WHERE name LIKE $1', ['%ahmed%'])` |
   | `.ilike('name', '%ahmed%')` | `query('... WHERE name ILIKE $1', ['%ahmed%'])` |
   | `.is('deleted_at', null)` | `query('... WHERE deleted_at IS NULL')` |
   | `.not('status', 'eq', 'blocked')` | `query('... WHERE status != $1', ['blocked'])` |
   | `.order('created_at', {ascending: false})` | `query('... ORDER BY created_at DESC')` |
   | `.limit(10)` | `query('... LIMIT 10')` |
   | `.range(0, 9)` | `query('... LIMIT 10 OFFSET 0')` |
   | `.single()` | `const { rows } = ...; return rows[0]` |
   | `.insert({name: 'x', phone: 'y'})` | `query('INSERT INTO t (name, phone) VALUES ($1, $2) RETURNING *', ['x', 'y'])` |
   | `.insert([{...}, {...}])` | Multiple inserts or use `unnest` |
   | `.update({name: 'x'}).eq('id', id)` | `query('UPDATE t SET name = $1 WHERE id = $2 RETURNING *', ['x', id])` |
   | `.upsert({...})` | `query('INSERT INTO t (...) VALUES (...) ON CONFLICT (id) DO UPDATE SET ... RETURNING *')` |
   | `.delete().eq('id', id)` | `query('DELETE FROM t WHERE id = $1', [id])` |
   | `const { data, error } = await ...` | `const { rows } = await query(...)` |
   | `if (error) throw error` | Wrap in try/catch |
   | `data` (result) | `rows` (array) or `rows[0]` (single) |

3. Also convert `pgQueryBuilder` usage to the same `query()` pattern.

4. Update error handling pattern:
   ```javascript
   // BEFORE (Supabase)
   const { data, error } = await supabase.from('members').select('*');
   if (error) return res.status(500).json({ success: false, message: error.message });
   return res.json({ success: true, data });

   // AFTER (pg)
   try {
     const { rows } = await query('SELECT * FROM members');
     return res.json({ success: true, data: rows });
   } catch (error) {
     logger.error('Failed to fetch members', error);
     return res.status(500).json({ success: false, message: 'Failed to fetch members' });
   }
   ```

### 0E: Replace Supabase Storage

Create `alshuail-backend/services/fileStorage.js`:
```javascript
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_BASE = process.env.UPLOAD_DIR || '/var/www/uploads/alshuail';

// Ensure directories exist
const dirs = ['member-photos', 'member-documents', 'financial-reports', 'competition-media'];
dirs.forEach(dir => {
  const fullPath = path.join(UPLOAD_BASE, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucket = req.params.bucket || 'member-documents';
    cb(null, path.join(UPLOAD_BASE, bucket));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.xlsx', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});

export const deleteFile = (filePath) => {
  const fullPath = path.join(UPLOAD_BASE, filePath);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
};

export const getFileUrl = (filePath) => {
  return `${process.env.API_BASE_URL}/uploads/${filePath}`;
};
```

In `server.js`, add static file serving:
```javascript
import express from 'express';
app.use('/uploads', express.static(process.env.UPLOAD_DIR || '/var/www/uploads/alshuail'));
```

### 0F: Remove Supabase Dependencies

```bash
cd alshuail-backend
npm uninstall @supabase/supabase-js
# Also check and remove from admin/mobile if present
cd ../alshuail-admin-arabic && npm uninstall @supabase/supabase-js 2>/dev/null
cd ../alshuail-mobile && npm uninstall @supabase/supabase-js 2>/dev/null
```

Delete Supabase config files:
- `config/supabase.js`
- Any file importing from `@supabase/supabase-js`

Update `.env`:
```
# REMOVE these:
# SUPABASE_URL=https://oneiggrfzagqjbkdinin.supabase.co
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_KEY=...

# ADD this:
DATABASE_URL=postgresql://alshuail_admin:YOUR_PASSWORD@localhost:5432/alshuail
UPLOAD_DIR=/var/www/uploads/alshuail
API_BASE_URL=https://api.alshailfund.com
```

### 0G: Install pg dependency

```bash
cd alshuail-backend
npm install pg
```

---

## Phase 1-6: Same as before (cleanup phases)

See previous plan. Phases 1-6 remain the same:
- Phase 1: Delete dead code & backup files (30 min)
- Phase 2: Organize root scripts (20 min)
- Phase 3: Consolidate duplicate backend (45 min)
- Phase 4: Consolidate duplicate frontend (45 min)
- Phase 5: Security fixes (30 min)
- Phase 6: Code quality + DB migration scripts (60 min)

---

## Dependency Order

```
Phase 0 (Supabase → PostgreSQL migration)  ← DO THIS FIRST
    ↓
Phase 1 (Delete dead code)
    ↓
Phase 2 (Organize scripts)
    ↓
Phase 3 (Consolidate backend)
    ↓
Phase 4 (Consolidate frontend)
    ↓
Phase 5 (Security fixes)
    ↓
Phase 6 (Code quality)
```

## Verification Checklist

After ALL phases:
- [ ] No `@supabase/supabase-js` in any package.json
- [ ] No `supabase` imports in any .js file: `grep -rn "from.*supabase\|require.*supabase" --include="*.js" | grep -v node_modules | wc -l` = 0
- [ ] `services/database.js` exists with pg Pool
- [ ] All controllers use `query()` from database service
- [ ] `.env` has `DATABASE_URL`, no `SUPABASE_*` keys
- [ ] Backend starts: `cd alshuail-backend && npm start`
- [ ] Admin builds: `cd alshuail-admin-arabic && npm run build`
- [ ] Mobile builds: `cd alshuail-mobile && npm run build`
- [ ] No backup files: `find . -name "*.backup*" | grep -v node_modules | wc -l` = 0
- [ ] No console.log: `grep -rn "console.log" alshuail-backend/routes/ --include="*.js" | wc -l` = 0
- [ ] API endpoints respond correctly with PostgreSQL data

## Risk Mitigation

1. **Backup branch BEFORE starting**: `git checkout -b pre-migration-backup && git push`
2. **Keep Supabase running** until VPS PostgreSQL is fully tested
3. **Test each converted controller** individually
4. **Run both databases in parallel** during transition
5. **Commit after each sub-phase** of Phase 0
