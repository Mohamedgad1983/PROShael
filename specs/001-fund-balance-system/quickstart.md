# Quickstart: Fund Balance System

**Feature**: 001-fund-balance-system
**Date**: 2026-01-24

## Prerequisites

- Node.js 18+
- PostgreSQL 15 access (via Supabase)
- Access to VPS (213.199.62.185) for database migrations

## 1. Database Setup

Execute the migration script on the production database:

```bash
# SSH to VPS
ssh root@213.199.62.185

# Connect to database and run migration
psql -U postgres -d alshuail_db -f /path/to/001_fund_balance_schema.sql
```

Or via Supabase SQL Editor:
1. Go to Supabase Dashboard > SQL Editor
2. Copy contents of `database/migrations/001_fund_balance_schema.sql`
3. Execute

### Verify Installation

```sql
-- Check balance view works
SELECT * FROM vw_fund_balance;

-- Check diya_type column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'diya_cases' AND column_name = 'diya_type';

-- Check expense number trigger
SELECT tgname FROM pg_trigger WHERE tgname = 'set_expense_number';
```

## 2. Backend Setup

### Install Dependencies

```bash
cd D:/PROShael/alshuail-backend
npm install  # No new dependencies required
```

### Create New Files

```bash
# Controller
touch src/controllers/fundBalanceController.js

# Routes
touch src/routes/fundBalance.routes.js
```

### Register Routes

In `server.js`, add:

```javascript
import fundBalanceRoutes from './src/routes/fundBalance.routes.js';
app.use('/api/fund', fundBalanceRoutes);
```

### Start Development Server

```bash
npm run dev
# Server runs on http://localhost:5001
```

### Test Endpoints

```bash
# Get fund balance
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/fund/balance

# Expected response:
# {
#   "success": true,
#   "data": {
#     "total_revenue": 150000,
#     "total_expenses": 45000,
#     "total_internal_diya": 30000,
#     "current_balance": 75000
#   }
# }
```

## 3. Frontend Setup

### Install Dependencies

```bash
cd D:/PROShael/alshuail-admin-arabic
npm install  # No new dependencies required
```

### Create Components

```bash
# Fund Balance Card
touch src/components/FundBalanceCard.tsx

# Bank Reconciliation Modal
touch src/components/BankReconciliationModal.tsx
```

### Start Development Server

```bash
npm start
# Dashboard runs on http://localhost:3002
```

## 4. Testing

### Run Backend Tests

```bash
cd D:/PROShael/alshuail-backend

# Unit tests
npm run test:unit -- fundBalance

# Integration tests
npm run test:integration -- fundBalance
```

### Manual Testing Checklist

1. **View Balance**
   - [ ] Login as financial_manager
   - [ ] Navigate to Expenses page
   - [ ] Verify FundBalanceCard shows balance
   - [ ] Click refresh, verify update < 3 seconds

2. **Expense Validation**
   - [ ] Try creating expense > current balance
   - [ ] Verify error message appears
   - [ ] Create expense < current balance
   - [ ] Verify balance updates

3. **Bank Reconciliation**
   - [ ] Open reconciliation modal
   - [ ] Enter bank statement balance
   - [ ] Verify variance calculation
   - [ ] Check snapshot saved in history

## 5. Deployment

### Backend

```bash
ssh root@213.199.62.185
cd /var/www/PROShael/alshuail-backend
git pull origin 001-fund-balance-system
pm2 restart alshuail-backend
pm2 logs alshuail-backend --lines 20
```

### Frontend

```bash
cd D:/PROShael/alshuail-admin-arabic
npm run build:fast
npx wrangler pages deploy build --project-name=alshuail-admin
```

## Common Issues

### Balance Shows 0

**Cause**: No completed payments in database
**Fix**: Verify `payments` table has records with `status = 'completed'`

### Expense Number Not Generated

**Cause**: Trigger not installed
**Fix**: Run the `CREATE TRIGGER set_expense_number` SQL statement

### RPC Function Not Found

**Cause**: `get_fund_balance()` not created
**Fix**: Run the `CREATE FUNCTION get_fund_balance()` SQL statement

### Permission Denied on Reconciliation

**Cause**: User lacks financial_manager role
**Fix**: Verify user has `financial_manager` or `super_admin` role

## API Reference

See [contracts/fund-balance-api.yaml](./contracts/fund-balance-api.yaml) for complete API specification.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fund/balance` | GET | Current fund balance |
| `/api/fund/breakdown` | GET | Detailed breakdown |
| `/api/fund/snapshot` | POST | Create reconciliation |
| `/api/fund/snapshots` | GET | Reconciliation history |
| `/api/expenses` | POST | Create expense (with validation) |

## Next Steps

After setup, run `/speckit.tasks` to generate implementation tasks.
