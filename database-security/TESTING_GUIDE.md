# 🧪 RLS Migration Testing Guide

## Purpose
This guide ensures safe testing of RLS migrations BEFORE deploying to production.

---

## 🎯 Testing Strategy Overview

### Three-Tier Testing Approach

1. **Local Testing** (Optional - if you have local Supabase)
2. **Staging Environment** (Recommended - Supabase staging project)
3. **Production** (Only after successful staging tests)

---

## 📋 Pre-Migration Checklist

### ✅ Before You Start

- [ ] Have full database backup
- [ ] Know how to access Supabase SQL Editor
- [ ] Have admin and member test accounts ready
- [ ] Document current production data counts
- [ ] Team is aware of testing schedule
- [ ] Rollback scripts are reviewed and ready
- [ ] Low-traffic time window identified

### 📊 Document Baseline Metrics

Run this in Supabase SQL Editor BEFORE any changes:

```sql
-- Save these results!
SELECT
    'members' as table_name,
    COUNT(*) as record_count
FROM members
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'bank_statements', COUNT(*) FROM bank_statements
UNION ALL
SELECT 'expense_receipts', COUNT(*) FROM expense_receipts
UNION ALL
SELECT 'news_reactions', COUNT(*) FROM news_reactions;
```

**Save the output** - You'll compare after migration to ensure no data loss.

---

## 🧪 Phase 1 Testing: Low-Risk Tables

### Step 1: Run Migration

1. Open Supabase SQL Editor
2. Copy contents of `migrations/02_phase1_low_risk_tables.sql`
3. **READ the comments first** - understand what will happen
4. Execute the script
5. Check for errors

### Step 2: Immediate Verification

Run these queries in SQL Editor:

```sql
-- Should show RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('document_categories', 'expense_categories', 'family_branches')
AND schemaname = 'public';

-- Should show policies created
SELECT tablename, COUNT(*) as policy_count FROM pg_policies
WHERE tablename IN ('document_categories', 'expense_categories', 'family_branches')
GROUP BY tablename;
```

**Expected Results:**
- All tables show `rowsecurity = true`
- Each table has 2 policies

### Step 3: Application Testing

#### Test as Admin User
- [ ] Login to admin dashboard
- [ ] Navigate to Documents section
- [ ] Verify document categories load
- [ ] Navigate to Financial section
- [ ] Verify expense categories load
- [ ] Check family tree displays

#### Test as Member User
- [ ] Login to member mobile app
- [ ] Check if any features use these reference tables
- [ ] Verify no errors in browser console

### Step 4: Monitor for 24 Hours

Check Supabase logs every few hours:
- Go to Supabase Dashboard → Logs → Postgres Logs
- Filter for "policy" or "permission denied"
- Any errors? → Run rollback immediately

### 🚨 Rollback Trigger Points

Run rollback if:
- ❌ Admin cannot see reference data
- ❌ Document categories not loading
- ❌ Family tree broken
- ❌ Any "permission denied" errors

**Rollback Command:**
```bash
# Run: rollback/ROLLBACK_phase1_low_risk.sql
```

---

## 🧪 Phase 2 Testing: Medium-Risk Tables

### Step 1: Run Migration

**⚠️ ONLY proceed if Phase 1 has been stable for 24+ hours**

1. Run `migrations/03_phase2_medium_risk_tables.sql`
2. Monitor execution for errors

### Step 2: Critical Feature Tests

#### Test News Reactions (High Priority)
- [ ] **As Member**: Open member app
- [ ] Navigate to News section
- [ ] Try to like/react to a news post
- [ ] Verify reaction is saved
- [ ] Refresh page - reaction should persist
- [ ] Check reaction count displays correctly

#### Test Notifications (High Priority)
- [ ] **As Admin**: Send test notification to yourself
- [ ] **As Member**: Check notification appears
- [ ] Mark notification as read
- [ ] Verify unread count decreases

#### Test Push Notifications (High Priority)
- [ ] **As Member**: Login to mobile app
- [ ] Check if device token is registered
- [ ] **As Admin**: Send push notification
- [ ] Verify member receives it

#### Test Family Tree
- [ ] **As Member**: View family tree
- [ ] Verify relationships display
- [ ] Check positions render correctly

### Step 3: Load Testing

Simulate normal user activity:
```
- 10 members viewing news
- 5 members reacting to posts
- 3 admin operations
- All happening simultaneously
```

**Monitor for:**
- Slow queries
- Permission errors
- Failed reactions
- Missing notifications

### Step 4: Data Integrity Check

```sql
-- Verify record counts unchanged
SELECT
    'news_reactions' as table_name,
    COUNT(*) as current_count
FROM news_reactions
UNION ALL
SELECT 'news_views', COUNT(*) FROM news_views
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'push_notification_tokens', COUNT(*) FROM push_notification_tokens;
```

**Compare with baseline** - counts should match or be higher (new data), never lower.

### 🚨 Rollback Trigger Points

Run rollback if:
- ❌ Members cannot react to news
- ❌ Notifications not displaying
- ❌ Push notifications failing
- ❌ Family tree errors
- ❌ Record counts decreased

**Rollback Command:**
```bash
# Run: rollback/ROLLBACK_phase2_medium_risk.sql
```

---

## 🧪 Phase 3 Testing: HIGH-RISK Financial Tables

### ⚠️ CRITICAL: Execute During Low-Traffic Hours

**Best Time:**
- Sunday 2-4 AM (Saudi time)
- Or during scheduled maintenance window

### Pre-Execution Requirements

- [ ] Phases 1 & 2 stable for 48+ hours each
- [ ] Full database backup completed in last hour
- [ ] Admin team on standby
- [ ] Rollback script tested in staging
- [ ] Backup admin credentials ready

### Step 1: Run Migration

**🔴 STOP and double-check:**
- Is it really low-traffic time?
- Do you have the rollback script open?
- Can you execute rollback in <30 seconds?

If yes to all:
1. Run `migrations/04_phase3_high_risk_financial.sql`
2. **Watch for errors carefully**

### Step 2: IMMEDIATE Testing (Within 5 Minutes)

#### Critical Financial Tests

**Test 1: Admin Access to Bank Statements**
- [ ] Login as admin
- [ ] Navigate to Financial → Bank Statements
- [ ] **MUST LOAD** within 3 seconds
- [ ] Click on a statement
- [ ] Verify details display

**Test 2: Upload Bank Statement**
- [ ] Click "Upload Statement"
- [ ] Select a test file
- [ ] Upload
- [ ] **MUST SUCCEED**
- [ ] Verify file appears in list

**Test 3: Expense Receipts**
- [ ] Navigate to Expenses → Receipts
- [ ] **MUST LOAD** all receipts
- [ ] Try uploading a test receipt
- [ ] **MUST SUCCEED**

**Test 4: Financial Reports**
- [ ] Navigate to Reports
- [ ] Generate monthly financial report
- [ ] **MUST GENERATE** successfully
- [ ] Verify data is correct

### Step 3: Member Access Test

**Critical: Members should NOT see financial data**

- [ ] Login as test member
- [ ] Try to access bank_statements via API
- [ ] Should get permission denied or 0 results
- [ ] Try to access expense_receipts
- [ ] Should get permission denied or 0 results

**Test Command (in Supabase SQL Editor as member):**
```sql
-- Should return 0 or error
SELECT COUNT(*) FROM bank_statements;
SELECT COUNT(*) FROM expense_receipts;
```

### Step 4: Data Integrity Verification

```sql
-- Record counts MUST match baseline
SELECT
    'bank_statements' as table_name,
    COUNT(*) as current_count
FROM bank_statements
UNION ALL
SELECT 'expense_receipts', COUNT(*) FROM expense_receipts;
```

**⚠️ If counts are LOWER than baseline → ROLLBACK IMMEDIATELY**

### 🚨 EMERGENCY Rollback Triggers

Run rollback **IMMEDIATELY** if:
- ❌ Admin cannot access bank statements
- ❌ Cannot upload bank statement
- ❌ Financial reports fail
- ❌ Record counts decreased
- ❌ Any data appears corrupted
- ❌ Any "permission denied" for admin

**EMERGENCY Rollback:**
```bash
# Run: rollback/ROLLBACK_phase3_high_risk_financial.sql
# Execute within 30 seconds of detecting issue
```

### Step 5: Extended Monitoring (48 Hours)

**Hour 1:** Test every 15 minutes
**Hour 6:** Test every hour
**Hour 24:** Full feature test
**Hour 48:** Final verification

Monitor:
- Admin financial operations
- Upload success rates
- Report generation
- Query performance
- Error logs

---

## 🧪 Phase 4 Testing: Security Definer Views

### Prerequisites
- All previous phases stable
- Backend code update prepared
- Can deploy backend quickly if needed

### Step 1: Create New Views

1. Run `migrations/05_phase4_security_definer_views.sql`
2. This creates NEW views (doesn't break old ones)

### Step 2: Verify New Views Work

```sql
-- Test new views
SELECT COUNT(*) FROM member_payment_analytics_v2;
SELECT COUNT(*) FROM member_financial_summary_v2;
SELECT COUNT(*) FROM v_subscription_overview_v2;

-- Compare with old views
SELECT COUNT(*) FROM member_payment_analytics;
SELECT COUNT(*) FROM member_financial_summary;
SELECT COUNT(*) FROM v_subscription_overview;
```

**Counts should match** (or be very close).

### Step 3: Update Backend Code

**Files to check:**
```bash
# Search for old view names
grep -r "member_payment_analytics" alshuail-backend/
grep -r "member_financial_summary" alshuail-backend/
grep -r "v_subscription_overview" alshuail-backend/
```

**Replace with:**
- `member_payment_analytics` → `member_payment_analytics_v2`
- `member_financial_summary` → `member_financial_summary_v2`
- `v_subscription_overview` → `v_subscription_overview_v2`

### Step 4: Deploy Backend

1. Deploy updated backend code
2. Test analytics features immediately
3. Verify reports still generate

### Step 5: Monitor for 1 Week

Before dropping old views:
- [ ] Analytics dashboard works
- [ ] Member reports load
- [ ] Financial summaries display
- [ ] No references to old views in logs
- [ ] All exports work

### Step 6: Drop Old Views (After 1 Week)

**Only if everything is stable:**
```sql
DROP VIEW IF EXISTS public.member_payment_analytics;
DROP VIEW IF EXISTS public.member_financial_summary;
DROP VIEW IF EXISTS public.v_subscription_overview;
```

---

## 📊 Success Metrics

### Phase 1 Success
- ✅ Reference tables accessible
- ✅ No permission errors
- ✅ Admin dashboard works
- ✅ 24 hours stable

### Phase 2 Success
- ✅ News reactions work
- ✅ Notifications deliver
- ✅ Push notifications send
- ✅ Family tree displays
- ✅ 48 hours stable

### Phase 3 Success
- ✅ Admin financial access works
- ✅ Members CANNOT access financial data
- ✅ No data loss
- ✅ All uploads work
- ✅ Reports generate
- ✅ 48 hours stable

### Phase 4 Success
- ✅ New views return data
- ✅ Analytics dashboard works
- ✅ Backend updated
- ✅ 1 week stable
- ✅ Old views dropped

---

## 🔍 Troubleshooting Guide

### Problem: "permission denied for table X"

**Diagnosis:**
```sql
-- Check RLS status
SELECT rowsecurity FROM pg_tables
WHERE tablename = 'X' AND schemaname = 'public';

-- Check policies
SELECT * FROM pg_policies
WHERE tablename = 'X';
```

**Solution:**
- If RLS enabled but no policies → Add policies
- If wrong policy → Fix policy conditions
- If too restrictive → Rollback and revise

### Problem: Record counts decreased

**This is CRITICAL - Data loss**

1. Stop all operations immediately
2. Run rollback script
3. Check database backup
4. Investigate root cause
5. Do NOT retry without fixing

### Problem: Slow queries after RLS

**Diagnosis:**
```sql
EXPLAIN ANALYZE
SELECT * FROM table_name WHERE ...;
```

**Solution:**
- Add indexes on columns used in RLS policies
- Optimize policy conditions
- Consider materialized views for analytics

### Problem: Admin cannot access financial data

**EMERGENCY - Run rollback immediately**

```bash
# Don't investigate - rollback first
# Run: rollback/ROLLBACK_phase3_high_risk_financial.sql
```

---

## 📝 Test Report Template

After each phase, document:

```markdown
## Phase X Test Report

**Date:** YYYY-MM-DD
**Duration:** X hours
**Tester:** Name

### Pre-Migration
- Baseline records: X
- Feature tests: PASS/FAIL
- Performance: X ms

### Post-Migration
- Final records: X (should match or exceed baseline)
- Feature tests: PASS/FAIL
- Performance: X ms
- Errors: None / [List errors]

### Decision
- [ ] Proceed to next phase
- [ ] Rollback (reason: ...)
- [ ] Monitor longer (reason: ...)

### Notes
[Any observations, issues, recommendations]
```

---

## 🎓 Training: What Each Team Member Should Know

### Admins
- How to access Supabase SQL Editor
- How to run rollback scripts
- What "permission denied" means
- When to escalate to dev team

### Developers
- All of the above, plus:
- How to read RLS policies
- How to debug RLS issues
- How to write EXPLAIN ANALYZE queries
- Backend code update procedures

### QA Team
- All test procedures
- Success criteria for each phase
- How to document test results
- Rollback trigger conditions

---

## ⏰ Recommended Timeline

### Conservative Approach (Recommended for Production)

**Week 1:**
- Monday: Run Phase 1 (morning)
- Mon-Fri: Monitor Phase 1
- Friday: Review Phase 1 results

**Week 2:**
- Monday: Run Phase 2 (morning)
- Mon-Fri: Monitor Phase 2 (closely!)
- Friday: Review Phase 2 results

**Week 3:**
- Sunday 2 AM: Run Phase 3 (low traffic!)
- Mon-Wed: HEAVY monitoring
- Thu-Fri: Normal monitoring

**Week 4:**
- Monday: Run Phase 4 (create new views)
- Tuesday: Deploy backend update
- Wed-Fri: Monitor analytics

**Week 5:**
- Monday: Drop old views if stable
- Run final security audit

### Total Time: 5 weeks
### Risk: Minimal (phased, tested, monitored)

---

## 🎯 Final Pre-Deployment Checklist

Before touching production:

- [ ] All scripts reviewed and understood
- [ ] Tested in staging environment
- [ ] Rollback scripts tested
- [ ] Baseline metrics documented
- [ ] Backup completed
- [ ] Team trained and ready
- [ ] Low-traffic window scheduled
- [ ] Emergency contacts available
- [ ] Monitoring dashboard open
- [ ] Coffee ready ☕

---

## 📞 Emergency Contacts

**If something goes wrong:**

1. **First 5 minutes:** Try to rollback
2. **If rollback fails:** Contact senior dev
3. **If data loss suspected:** Contact DBA + backup specialist
4. **Document everything** for post-mortem

---

## ✅ You're Ready When...

- [ ] You've read this entire guide
- [ ] You understand what RLS does
- [ ] You know how to run rollback
- [ ] You have tested in staging
- [ ] You have backup plan
- [ ] You feel confident (not nervous)

**If you're still nervous → TEST MORE IN STAGING**

Good luck! 🚀
