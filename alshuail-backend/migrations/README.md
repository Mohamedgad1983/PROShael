# Database Migrations

This directory contains SQL migration scripts for the Al-Shuail backend database.

## Running Migrations

### Option 1: Direct SQL Execution (Supabase Dashboard)
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of the migration file
3. Execute the SQL script
4. Verify tables were created in Table Editor

### Option 2: psql Command Line
```bash
# If you have direct database access
psql -U postgres -d alshuail -f migrations/20250112_add_crisis_tables.sql
```

### Option 3: Node.js Script (Recommended for Production)
```javascript
// migrations/run-migration.js
import { supabase } from '../src/config/database.js';
import fs from 'fs';

async function runMigration(filename) {
  const sql = fs.readFileSync(`migrations/${filename}`, 'utf8');
  const { error } = await supabase.rpc('execute_sql', { sql });

  if (error) {
    console.error('Migration failed:', error);
  } else {
    console.log('Migration successful!');
  }
}

runMigration('20250112_add_crisis_tables.sql');
```

## Available Migrations

### 20250112_add_crisis_tables.sql
**Purpose**: Add crisis management tables for mobile PWA

**Tables Created**:
- `crisis_alerts` - Emergency crisis alerts
- `crisis_responses` - Member safe check-ins

**Dependencies**:
- Requires `members` table to exist (foreign key)
- Requires `notifications` table to exist (for admin notifications)

**Rollback** (if needed):
```sql
DROP TABLE IF EXISTS crisis_responses CASCADE;
DROP TABLE IF EXISTS crisis_alerts CASCADE;
```

## Migration Naming Convention

Format: `YYYYMMDD_description.sql`

Examples:
- `20250112_add_crisis_tables.sql`
- `20250115_add_payment_gateway_fields.sql`
- `20250120_update_member_roles.sql`

## Best Practices

1. **Always test migrations on staging first**
2. **Create rollback scripts for all migrations**
3. **Include comments explaining changes**
4. **Use IF NOT EXISTS for idempotency**
5. **Add indexes for foreign keys**
6. **Document dependencies**

## Verification

After running a migration, verify:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('crisis_alerts', 'crisis_responses');

-- Check indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('crisis_alerts', 'crisis_responses');

-- Test insert
INSERT INTO crisis_alerts (title, message, status, severity, created_by)
VALUES ('Test Alert', 'Testing migration', 'active', 'low', 1)
RETURNING id;
```

## Troubleshooting

### Error: relation "members" does not exist
**Solution**: Ensure members table exists before running migration

### Error: duplicate key value violates unique constraint
**Solution**: Migration already run. Check if tables exist with `\dt` in psql

### Error: permission denied
**Solution**: Ensure database user has CREATE TABLE permissions
