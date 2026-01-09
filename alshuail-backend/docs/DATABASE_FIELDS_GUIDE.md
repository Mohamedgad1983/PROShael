# Database Fields Guide - Al Shuail Fund

## Critical: Balance Fields in `members` Table

### ⚠️ IMPORTANT: Two Balance Fields Exist - Use ONLY `current_balance`

| Field | Status | Description | Typical Values |
|-------|--------|-------------|----------------|
| `current_balance` | ✅ **USE THIS** | Actual paid balance (what member has paid) | 0 - 3000 SAR |
| `balance` | ❌ **DO NOT USE** | LEGACY field with incorrect/inflated values | 12,000 - 15,000 SAR |

### Business Rule
- **MINIMUM_BALANCE = 3000 SAR** (compliance threshold)
- No member should have a balance exceeding 3000 SAR
- If you see values >3000, you're reading the WRONG field

### Correct Code Pattern
```javascript
// ✅ CORRECT - Use nullish coalescing with current_balance ONLY
const balance = m.current_balance ?? 0;

// ❌ WRONG - This falls back to the legacy 'balance' field
const balance = m.current_balance || m.balance || 0;

// ❌ WRONG - Direct use of legacy field
const balance = m.balance;
```

### Why Two Fields Exist
The `balance` field was created during initial development with calculated/projected values.
The `current_balance` field contains the actual payment data from the subscription system.

**The `balance` field should be considered deprecated and eventually removed.**

---

## Members Table Fields Reference

### Identity Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `membership_number` | String | Display ID (e.g., "SH001", "10344") |
| `full_name` | String | Member's full name (English) |
| `full_name_ar` | String | Member's full name (Arabic) |
| `phone` | String | Contact phone number |
| `email` | String | Email address |

### Balance Fields
| Field | Type | Use? | Description |
|-------|------|------|-------------|
| `current_balance` | Decimal | ✅ YES | Actual paid amount (0-3000 SAR) |
| `balance` | Decimal | ❌ NO | LEGACY - do not use |

### Status Fields
| Field | Type | Description |
|-------|------|-------------|
| `status` | String | Member status (active/inactive) |
| `member_since` | Date | Date of joining |
| `is_active` | Boolean | Whether member is active |

---

## Statement Display Logic

### Alert Levels Based on `current_balance`
| Level | Condition | Color | Message |
|-------|-----------|-------|---------|
| `ZERO_BALANCE` | balance = 0 | Red | Critical - no balance |
| `CRITICAL` | balance < 1000 | Orange | Very low balance |
| `WARNING` | balance < 3000 | Yellow | Below minimum |
| `SUFFICIENT` | balance >= 3000 | Green | Meets requirement |

### Shortfall Calculation
```javascript
const MINIMUM_BALANCE = 3000;
const shortfall = Math.max(0, MINIMUM_BALANCE - current_balance);
const percentageComplete = Math.min(100, (current_balance / MINIMUM_BALANCE) * 100);
```

---

## API Endpoints for Statements

| Endpoint | Purpose | Returns |
|----------|---------|---------|
| `GET /api/statements/search/phone?phone=X` | Search by phone | Single member statement |
| `GET /api/statements/search/name?name=X` | Search by name | List of matching members |
| `GET /api/statements/search/id?memberId=X` | Search by ID | Single member statement |
| `GET /api/statements/dashboard` | Dashboard stats | Aggregated statistics |
| `GET /api/statements/critical` | Critical members | Members with low balance |
| `GET /api/statements/all` | All members | Paginated member list |

---

## Verification Script

Run this to verify balances are correct:
```bash
node D:/PROShael/test-balance-verify.js
```

Expected output: All balances should be ≤ 3000 SAR.

---

## History

- **2025-11-30**: Fixed balance display bug in admin frontend. Changed from `current_balance || balance || 0` to `current_balance ?? 0` to prevent fallback to legacy field.
- **Issue**: Members were showing 12,000-15,000 SAR balances instead of actual 0-3000 SAR values.
- **Root Cause**: Logical OR (`||`) was treating 0 as falsy and falling back to the wrong `balance` field.

---

## Contact

For questions about database schema, contact the development team.
