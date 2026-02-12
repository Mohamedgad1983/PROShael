# API Contracts: Supabase to VPS PostgreSQL Migration

**Date**: 2026-02-11
**Feature**: 003-supabase-to-vps-migration

## Contract: API Response Format Preservation

All API endpoints MUST return identical JSON structures after migration.
No frontend application changes should be required.

### Standard Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "string (Arabic + English)"
}
```

### Error Response Format

```json
{
  "success": false,
  "error": "string",
  "message": "string (Arabic)",
  "message_ar": "string (Arabic)"
}
```

---

## Contract: Database Service API

### `query(text, params)` -> `{ rows, rowCount }`

```javascript
import { query } from '../services/database.js';

// SELECT
const { rows } = await query('SELECT * FROM members WHERE id = $1', [id]);

// INSERT
const { rows } = await query(
  'INSERT INTO members (phone, full_name_ar) VALUES ($1, $2) RETURNING *',
  [phone, name]
);

// UPDATE
const { rows } = await query(
  'UPDATE members SET full_name_ar = $1 WHERE id = $2 RETURNING *',
  [name, id]
);

// DELETE
const { rowCount } = await query('DELETE FROM members WHERE id = $1', [id]);
```

### `getClient()` -> Transaction Client

```javascript
import { getClient } from '../services/database.js';

const client = await getClient();
try {
  await client.query('BEGIN');
  // ... multiple queries ...
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

---

## Contract: Affected Endpoints (Response Format Unchanged)

### Authentication (`/api/auth`)
| Method | Path | Auth | Response Change |
|--------|------|------|-----------------|
| POST | /api/auth/login | None | None |
| POST | /api/auth/verify-otp | None | None |
| POST | /api/auth/logout | Bearer | None |

### Members (`/api/members`)
| Method | Path | Auth | Response Change |
|--------|------|------|-----------------|
| GET | /api/members | Bearer + RBAC | None |
| GET | /api/members/:id | Bearer + RBAC | None |
| POST | /api/members | Bearer + RBAC | None |
| PUT | /api/members/:id | Bearer + RBAC | None |
| DELETE | /api/members/:id | Bearer + RBAC | None |

### Payments (`/api/payments`)
| Method | Path | Auth | Response Change |
|--------|------|------|-----------------|
| GET | /api/payments | Bearer | None |
| POST | /api/payments | Bearer | None |
| GET | /api/payments/:id | Bearer | None |

### Subscriptions (`/api/subscriptions`)
| Method | Path | Auth | Response Change |
|--------|------|------|-----------------|
| GET | /api/subscriptions | Bearer | None |
| POST | /api/subscriptions | Bearer | None |
| PUT | /api/subscriptions/:id | Bearer | None |

### Initiatives (`/api/initiatives`)
| Method | Path | Auth | Response Change |
|--------|------|------|-----------------|
| GET | /api/initiatives | Bearer | None (ADD auth middleware) |
| POST | /api/initiatives | Bearer | None (ADD auth middleware) |
| GET | /api/initiatives/:id | Bearer | None |

### Diyas (`/api/diyas`)
| Method | Path | Auth | Response Change |
|--------|------|------|-----------------|
| GET | /api/diyas | Bearer | None |
| POST | /api/diyas | Bearer | None |
| GET | /api/diyas/:id | Bearer | None |

### Expenses (`/api/expenses`)
| Method | Path | Auth | Response Change |
|--------|------|------|-----------------|
| GET | /api/expenses | Bearer + Financial | None |
| POST | /api/expenses | Bearer + Financial | None |
| PUT | /api/expenses/:id | Bearer + Financial | None |
| DELETE | /api/expenses/:id | Bearer + Financial | None |

### Fund Balance (`/api/fund-balance`)
| Method | Path | Auth | Response Change |
|--------|------|------|-----------------|
| GET | /api/fund-balance | Bearer | None |
| GET | /api/fund-balance/breakdown | Bearer | None |

### Settings (`/api/settings`)
| Method | Path | Auth | Response Change |
|--------|------|------|-----------------|
| GET | /api/settings | Bearer + Admin | None |
| PUT | /api/settings | Bearer + SuperAdmin | None |

---

## Contract: Endpoints to Remove

| Method | Path | Reason |
|--------|------|--------|
| * | /api/test/* | Security: test routes in production |

## Contract: Endpoints to Deduplicate

| Keep | Remove | Reason |
|------|--------|--------|
| /api/initiatives | /api/initiatives-enhanced | Duplicate |
| /api/settings | /api/settings-improved | Duplicate |
| /api/family-tree (new routes) | /api/familyTree (old routes) | Consolidate |
| /api/member-monitoring | /api/member-monitoring-optimized | Duplicate |
