# ⚡ QUICK CHECKLIST - 5 CRITICAL FILES TO 90%

## 🎯 TARGET FILES

| # | File | Now | Goal | Gap |
|---|------|-----|------|-----|
| 1 | membersMonitoringController.js | 78% | 90% | +12% |
| 2 | subscriptionController.js | 75% | 90% | +15% |
| 3 | dashboardController.js | 66% | 90% | +24% |
| 4 | membersController.js | 63% | 90% | +27% |
| 5 | financialReportsController.js | 60% | 90% | +30% |

---

## 📋 FILE 1: membersMonitoringController (78% → 90%)

### Tests to Add:
- [ ] Search by Arabic name
- [ ] Search by English name  
- [ ] Search by phone (+966, +965)
- [ ] Search by membership number (SH-XXXX)
- [ ] Filter by subscription status
- [ ] Filter by payment status
- [ ] Filter by family branch
- [ ] Pagination edge cases
- [ ] Empty results handling
- [ ] Export to Excel
- [ ] Export to PDF
- [ ] Authorization (admin, financial_manager, member)
- [ ] Invalid token handling

### Run & Verify:
```bash
npm test -- --testPathPattern="membersMonitoring" --coverage
```

### Status: [ ] Complete (___%)

---

## 📋 FILE 2: subscriptionController (75% → 90%)

### Tests to Add:
- [ ] Monthly fee = 50 SAR
- [ ] Yearly fee = 600 SAR
- [ ] Minimum balance = 3000 SAR
- [ ] Accept payment >= 50 SAR
- [ ] Reject payment < 50 SAR
- [ ] Reject zero/negative amounts
- [ ] Update balance after payment
- [ ] Payment on behalf (نيابة عن)
- [ ] Filter by status (active/inactive/suspended)
- [ ] Filter below minimum balance
- [ ] Overdue subscriptions
- [ ] Bulk payments
- [ ] Payment methods (cash, transfer, card)
- [ ] Subscription reports

### Run & Verify:
```bash
npm test -- --testPathPattern="subscription" --coverage
```

### Status: [ ] Complete (___%)

---

## 📋 FILE 3: dashboardController (66% → 90%)

### Tests to Add:
- [ ] Admin dashboard data
- [ ] Member dashboard data
- [ ] Total members count
- [ ] Active subscriptions count
- [ ] Revenue statistics
- [ ] Pending payments
- [ ] Recent activities
- [ ] Upcoming events
- [ ] Monthly revenue chart
- [ ] Member growth chart
- [ ] Payment distribution chart
- [ ] Branch distribution chart
- [ ] Date range filtering
- [ ] Hijri calendar support

### Run & Verify:
```bash
npm test -- --testPathPattern="dashboard" --coverage
```

### Status: [ ] Complete (___%)

---

## 📋 FILE 4: membersController (63% → 90%)

### Tests to Add:
- [ ] Create with Arabic name (required)
- [ ] Generate SH-XXXX membership number
- [ ] Auto-increment membership number
- [ ] Saudi phone (+966)
- [ ] Kuwait phone (+965)
- [ ] Reject invalid phone
- [ ] Reject duplicate phone
- [ ] Reject duplicate national_id
- [ ] Assign family branch
- [ ] Update member
- [ ] Cannot update membership_number
- [ ] Soft delete
- [ ] Pagination
- [ ] Search Arabic/English
- [ ] Filter by branch
- [ ] Sort options
- [ ] Import from Excel
- [ ] Export to Excel

### Run & Verify:
```bash
npm test -- --testPathPattern="members" --coverage
```

### Status: [ ] Complete (___%)

---

## 📋 FILE 5: financialReportsController (60% → 90%)

### Tests to Add:
- [ ] Financial summary
- [ ] Filter by Gregorian date
- [ ] Filter by Hijri date
- [ ] Revenue breakdown (subscriptions, diya, donations)
- [ ] Monthly revenue report
- [ ] Revenue by payment method
- [ ] Revenue by branch
- [ ] Expense summary
- [ ] Expense by category
- [ ] Subscription collection rate
- [ ] Members below minimum
- [ ] Overdue payments list
- [ ] Diya cases summary
- [ ] Diya contributions
- [ ] Export to Excel
- [ ] Export to PDF
- [ ] Audit log (super_admin only)

### Run & Verify:
```bash
npm test -- --testPathPattern="financial" --coverage
```

### Status: [ ] Complete (___%)

---

## 🔧 COMMANDS REFERENCE

```bash
# Full test suite
npm test

# Specific file tests
npm test -- --testPathPattern="[filename]"

# Coverage for specific file
npm run test:coverage -- --collectCoverageFrom='src/controllers/[file].js'

# All 5 files coverage
npm run test:coverage -- \
  --collectCoverageFrom='src/controllers/membersMonitoringController.js' \
  --collectCoverageFrom='src/controllers/subscriptionController.js' \
  --collectCoverageFrom='src/controllers/dashboardController.js' \
  --collectCoverageFrom='src/controllers/membersController.js' \
  --collectCoverageFrom='src/controllers/financialReportsController.js'
```

---

## 🐛 BUGS FOUND

| # | File | Description | Status |
|---|------|-------------|--------|
| 1 | | | [ ] Fixed |
| 2 | | | [ ] Fixed |
| 3 | | | [ ] Fixed |

---

## ✅ FINAL VERIFICATION

```bash
# Verify all 5 files >= 90%
npm run test:coverage -- \
  --coverageThreshold='{"src/controllers/membersMonitoringController.js":{"lines":90}}' \
  --coverageThreshold='{"src/controllers/subscriptionController.js":{"lines":90}}' \
  --coverageThreshold='{"src/controllers/dashboardController.js":{"lines":90}}' \
  --coverageThreshold='{"src/controllers/membersController.js":{"lines":90}}' \
  --coverageThreshold='{"src/controllers/financialReportsController.js":{"lines":90}}'
```

---

## 📊 FINAL RESULTS

| File | Before | After | ✓ |
|------|--------|-------|---|
| membersMonitoring | 78% | ___% | [ ] |
| subscription | 75% | ___% | [ ] |
| dashboard | 66% | ___% | [ ] |
| members | 63% | ___% | [ ] |
| financialReports | 60% | ___% | [ ] |

**Mission Status**: [ ] COMPLETE

---

*Print this checklist and track progress!*
