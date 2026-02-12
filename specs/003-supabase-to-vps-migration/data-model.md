# Data Model: Supabase to VPS PostgreSQL Migration

**Date**: 2026-02-11
**Feature**: 003-supabase-to-vps-migration

## Overview

The database schema (64 tables, 94 FK relationships) is already on VPS PostgreSQL.
This data model documents the **database service layer** being created, not the
schema itself (which remains unchanged).

## Entity: Database Service (`services/database.js`)

The single database access point for all backend code.

### Interface

| Export | Type | Purpose |
|--------|------|---------|
| `query(text, params)` | Function | Execute parameterized SQL, returns `{ rows, rowCount }` |
| `getClient()` | Function | Get a client from pool for transactions |
| `pool` | pg.Pool | Direct pool access (for advanced use only) |

### Connection Pool Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `connectionString` | `process.env.DATABASE_URL` | Single env var per constitution |
| `max` | 20 | Constitution mandates max 20 |
| `min` | 2 | Constitution mandates min 2 |
| `idleTimeoutMillis` | 30000 | 30s idle before release |
| `connectionTimeoutMillis` | 5000 | 5s connection timeout |

### Error Handling

- Pool emits `error` event -> logged via Winston, no crash
- Query errors -> thrown to caller, caught in controller try/catch
- Connection failures -> logged, pool auto-reconnects

## Entity: Query Result Pattern

All controllers switch from Supabase destructuring to pg destructuring.

### Before (Supabase pattern)
```
const { data, error } = await supabase.from('table').select('*').eq('id', id);
if (error) throw error;
return data;
```

### After (pg pattern)
```
const { rows } = await query('SELECT * FROM table WHERE id = $1', [id]);
return rows;
```

### Single Record
```
const { rows } = await query('SELECT * FROM table WHERE id = $1 LIMIT 1', [id]);
const record = rows[0] || null;
```

## Entity: Transaction Pattern

For multi-table operations (financial calculations, fund balance).

```
const client = await getClient();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO ...', [...]);
  await client.query('UPDATE ...', [...]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

## Existing Database Schema (Unchanged)

### Core Tables (from Supabase export)

| Table | Description | Key Relationships |
|-------|-------------|-------------------|
| members | 347+ family member profiles | -> family_branches, payments, subscriptions |
| family_branches | 10 tribal branches (فخوذ) | <- members |
| payments | All payment transactions | -> members |
| subscriptions | Monthly/annual dues tracking | -> members |
| initiatives | Fundraising campaigns | <- financial_contributions |
| diya_cases | Blood money collections | -> members (diya_type: internal/external) |
| expenses | Fund expenditures | status: pending/approved/paid/rejected |
| crisis_cases | Emergency assistance | -> members |
| notifications | Push notification records | -> members |
| device_tokens | Firebase FCM tokens | -> members |
| audit_logs | System audit trail | -> members |
| occasions | Family events | |
| news | Announcements | |
| settings | System configuration | |
| app_settings | Application settings | |
| roles | User role definitions | <- user_roles |
| permissions | Permission definitions | <- role_permissions |
| user_roles | Member-role assignments | -> members, roles |
| role_permissions | Role-permission mapping | -> roles, permissions |
| security_audit_log | Security event tracking | -> members |
| password_reset_tokens | OTP storage (hashed) | -> members |
| fund_balance_snapshots | Balance reconciliation | |
| document_categories | Document classification | |
| document_types | Document type definitions | |
| expense_categories | Expense classification | |
| subscription_plans | Plan definitions | |
| financial_contributions | Initiative donations | -> initiatives, members |
| activities | Activity log | |
| events | Calendar events | |

### Key Views

| View | Purpose |
|------|---------|
| `vw_fund_balance` | Real-time fund balance calculation (subscriptions - expenses - internal diya) |

### Key Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| idx_members_phone | members | phone | Phone lookup for auth |
| idx_diya_cases_type | diya_cases | diya_type (WHERE internal) | Balance calculation |
| idx_expenses_status | expenses | status (WHERE approved/paid) | Balance calculation |
| idx_expenses_number | expenses | expense_number | Expense lookup |

## Environment Variables

### Current (to be replaced)
```env
DB_HOST=213.199.62.185
DB_PORT=5432
DB_NAME=alshuail_db
DB_USER=alshuail
DB_PASSWORD=***
```

### Target
```env
DATABASE_URL=postgresql://alshuail:***@localhost:5432/alshuail
```

Note: `localhost` because PostgreSQL runs on the same VPS as the backend after migration.
