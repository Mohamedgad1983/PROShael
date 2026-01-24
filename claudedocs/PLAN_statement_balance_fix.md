# Statement/Balance Update Issue - Investigation & Fix Plan

**Date**: 2026-01-24
**Priority**: High
**Affected URL**: https://alshailfund.com/admin/statement

---

## Executive Summary

Two issues reported by user:
1. **Error popup** when updating statement message/balance
2. **History records not appearing** for balance updates

---

## Root Cause Analysis

### Issue #1: Balance Update Error

**Location**: `alshuail-backend/src/controllers/balanceAdjustmentController.js:185-196`

**Bug Found**: Duplicate key in object literal when updating subscriptions table:

```javascript
// Lines 185-196 - CURRENT CODE (BUGGY)
await supabase
  .from('subscriptions')
  .update({
    current_balance: newBalance,
    current_balance: newBalance,  // DUPLICATE KEY - ERROR!
    total_balance: newBalance,    // May not exist in table
    months_paid_ahead: monthsPaidAhead,
    ...
  })
```

**Impact**:
- JavaScript silently overwrites duplicate key (not an error)
- `total_balance` column may not exist in `subscriptions` table → DB error
- Insert to `balance_adjustments` table includes columns that may not exist

### Issue #2: History Not Appearing

**Location**: `alshuail-backend/src/controllers/balanceAdjustmentController.js:200-217`

**Bug Found**: Audit record tries to insert non-existent columns:

```javascript
// Lines 200-217 - AUDIT RECORD
const auditRecord = {
  member_id,
  adjustment_type,
  amount: parseFloat(amount),
  previous_balance: previousBalance,
  new_balance: newBalance,
  current_balance: newBalance,  // MAY NOT EXIST IN TABLE
  total_balance: newBalance,    // MAY NOT EXIST IN TABLE
  ...
};
```

**Impact**:
- If `balance_adjustments` table doesn't have `current_balance` and `total_balance` columns, INSERT fails
- No audit record created → History tab shows empty

---

## Affected Files

| File | Line Numbers | Issue |
|------|--------------|-------|
| `alshuail-backend/src/controllers/balanceAdjustmentController.js` | 185-196 | Duplicate key + non-existent column |
| `alshuail-backend/src/controllers/balanceAdjustmentController.js` | 200-217 | Non-existent columns in audit insert |

---

## Implementation Plan

### Phase 1: Backend Fixes (Critical)

#### Step 1.1: Fix `balanceAdjustmentController.js`

**Action**: Remove duplicate keys and non-existent columns

```javascript
// FIX for subscription update (lines 185-196)
await supabase
  .from('subscriptions')
  .update({
    current_balance: newBalance,
    months_paid_ahead: monthsPaidAhead,
    next_payment_due: nextPaymentDue.toISOString(),
    status: newBalance >= 0 ? 'active' : 'overdue',
    updated_at: new Date().toISOString()
  })
  .eq('id', subscription.id);
```

```javascript
// FIX for audit record (lines 200-217)
const auditRecord = {
  member_id,
  adjustment_type,
  amount: parseFloat(amount),
  previous_balance: previousBalance,
  new_balance: newBalance,
  target_year: target_year || null,
  target_month: target_month || null,
  reason,
  notes: notes || null,
  adjusted_by: req.user.id,
  adjusted_by_email: req.user.email,
  adjusted_by_role: req.user.role,
  ip_address: req.ip || req.connection?.remoteAddress,
  user_agent: req.headers['user-agent']
};
```

### Phase 2: Database Verification

#### Step 2.1: Verify Table Schemas

**Action**: Check if columns exist in database tables:
- `subscriptions.current_balance` ✓ (exists per code references)
- `subscriptions.total_balance` ? (need to verify)
- `balance_adjustments.current_balance` ? (need to verify)
- `balance_adjustments.total_balance` ? (need to verify)

### Phase 3: Testing & Deployment

#### Step 3.1: Local Testing
1. Test balance adjustment API with test member
2. Verify history records are created
3. Verify frontend modal shows history

#### Step 3.2: Deploy to VPS
```bash
ssh root@213.199.62.185 "cd /var/www/PROShael/alshuail-backend && git pull && pm2 restart alshuail-backend"
```

#### Step 3.3: Production Verification
1. Test on https://alshailfund.com/admin/statement
2. Verify balance update works without error
3. Verify history tab shows records

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Database column mismatch | High | High | Verify schema before deploy |
| Existing data inconsistency | Low | Medium | Check existing audit records |
| Frontend caching stale data | Low | Low | Hard refresh after deploy |

---

## Rollback Plan

If issues persist after deployment:
1. Revert controller changes via git
2. Restart PM2 process
3. Investigate database schema directly in Supabase

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Investigation | Complete | ✅ Done |
| Backend Fixes | 15 min | ⏳ Pending |
| Testing | 10 min | ⏳ Pending |
| Deployment | 5 min | ⏳ Pending |

---

## Approval Required

Before proceeding with implementation:
- [ ] User approves the fix approach
- [ ] Confirm backend restart is acceptable
