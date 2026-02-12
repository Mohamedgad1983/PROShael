# Quickstart: Supabase to VPS PostgreSQL Migration

**Date**: 2026-02-11
**Feature**: 003-supabase-to-vps-migration

## Prerequisites

- SSH access to VPS (213.199.62.185)
- Git access to PROShael repository
- Node.js 18+ installed locally
- PostgreSQL client tools (`psql`)

## Phase 0: Database Setup Verification

### 1. Verify PostgreSQL is running on VPS

```bash
ssh root@213.199.62.185 "systemctl status postgresql"
```

### 2. Verify database exists

```bash
ssh root@213.199.62.185 "sudo -u postgres psql -c '\l' | grep alshuail"
```

### 3. Verify table count (should be 64)

```bash
ssh root@213.199.62.185 "sudo -u postgres psql -d alshuail_db -c \"SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'\""
```

### 4. Verify member data

```bash
ssh root@213.199.62.185 "sudo -u postgres psql -d alshuail_db -c 'SELECT count(*) FROM members'"
```

## Phase 1: Create Database Service

### 1. Create `services/database.js`

```bash
# After creating the file:
node -e "import('./src/services/database.js').then(db => db.query('SELECT 1').then(r => console.log('OK:', r.rows)))"
```

### 2. Update `.env`

```bash
# Add to .env:
DATABASE_URL=postgresql://alshuail:PASSWORD@localhost:5432/alshuail
```

### 3. Test connection

```bash
cd alshuail-backend
node -e "
  import pg from 'pg';
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query('SELECT count(*) FROM members');
  console.log('Members:', rows[0].count);
  await pool.end();
"
```

## Phase 2: Convert Controllers (Incremental)

### Conversion Workflow per File

1. Open controller file
2. Replace `import { supabase } from '../config/database.js'` with `import { query, getClient } from '../services/database.js'`
3. Convert each `supabase.from()...` call to `query()` with parameterized SQL
4. Test the specific API endpoints
5. Commit

### Quick Verification per Controller

```bash
# Test specific endpoint after conversion
curl -H "Authorization: Bearer TOKEN" https://api.alshailfund.com/api/ENDPOINT
```

## Phase 3: Cleanup Verification

### Verify no Supabase references remain

```bash
grep -r "supabase" alshuail-backend/src/ --include="*.js" -l
# Should return ZERO files after conversion
```

### Verify no @supabase in package.json

```bash
grep "supabase" alshuail-backend/package.json
# Should return ZERO matches
```

### Verify builds pass

```bash
cd alshuail-admin-arabic && npm run build
cd alshuail-mobile && npm run build
```

### Run tests

```bash
cd alshuail-backend && npm test
```

## Phase 4: Deployment

### Deploy backend

```bash
ssh root@213.199.62.185 "cd /var/www/PROShael/alshuail-backend && git pull && npm install && pm2 restart alshuail-backend"
```

### Verify production

```bash
curl https://api.alshailfund.com/api/health
```

### Monitor logs

```bash
ssh root@213.199.62.185 "pm2 logs alshuail-backend --lines 50"
```

## Rollback Plan

If issues arise after deployment:

```bash
# Revert to previous commit
ssh root@213.199.62.185 "cd /var/www/PROShael/alshuail-backend && git checkout HEAD~1 && npm install && pm2 restart alshuail-backend"
```

pgQueryBuilder will continue to work since the database connection hasn't changed,
only the access pattern. The rollback simply restores the Supabase-compatible layer.
