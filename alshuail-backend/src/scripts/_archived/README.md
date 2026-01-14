# Archived Scripts

**Archived Date**: 2026-01-14
**Reason**: VPS Database Migration (spec #001)

## Why These Scripts Were Archived

These scripts use `@supabase/supabase-js` with `createClient` directly, which connects to Supabase cloud services. The Al-Shuail backend has migrated to use VPS PostgreSQL directly via `pgQueryBuilder`.

## Scripts in This Directory

| Script | Original Purpose |
|--------|-----------------|
| add-member-columns.js | Add columns to members table |
| add-payments.js | Bulk payment data upload |
| check-member-balances.js | Balance verification |
| complete-setup.js | Initial database setup |
| create-email-admin.js | Create admin with email |
| create-subscriptions-and-upload.js | Subscription data import |
| create-super-admin.js | Create super admin user |
| create-tables.js | Create database tables |
| database-assessment.js | Database structure analysis |
| direct-upload.js | Direct data upload |
| final-setup.js | Final setup configuration |
| final-upload.js | Final data upload |
| import-members-simple.js | Simple member import |
| import-new-excel.js | Excel data import |
| quick-admin.js | Quick admin creation |
| simple-payment-upload.js | Simple payment upload |
| simple-upload.js | Simple data upload |
| upload-to-existing-tables.js | Upload to existing tables |
| upload-to-supabase.js | Upload to Supabase |
| working-upload.js | Working upload script |

## If You Need to Use These Scripts

To use these scripts with VPS PostgreSQL:

1. Replace `@supabase/supabase-js` import with:
   ```javascript
   import { supabase } from '../config/database.js';
   ```

2. Remove `createClient` calls - the database connection is already configured

3. The `supabase` export from `database.js` provides a Supabase-compatible API via `pgQueryBuilder`

## Active Scripts (Not Archived)

The following scripts remain active in `src/scripts/`:
- cleanup-secrets.js
- validate-env.js
- scan-secrets.js
- apply-member-monitoring-optimizations.js
- initializeDatabase.js
- import-members.js
- simple-import.js

These scripts either:
- Don't use Supabase at all
- Already use the correct `database.js` import
