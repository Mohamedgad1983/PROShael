# Diyas Frontend Data Mapping Fix - October 16, 2025

## Issue
Backend API queries the `activities` table (correct) but frontend components were not mapping the fields correctly, causing:
- NaN for amounts
- Wrong contributor counts
- Missing names

## Root Cause
- Backend returns: `title_ar`, `target_amount`, `current_amount`, `contributor_count`
- Frontend expected: `title`, `amount`, `paidAmount`, `contributors`

## Solution Applied

### 1. AppleDiyasManagement.jsx (lines 142-179)
Updated data transformation to correctly map:
```javascript
id: d.id,
title: d.title_ar || d.title_en || 'دية',
amount: d.target_amount || 0,
paidAmount: d.current_amount || 0,
remainingAmount: (d.target_amount || 0) - (d.current_amount || 0),
contributors: d.contributor_count || d.contribution_count || 0,
status: d.status === 'completed' ? 'completed' : 'in_progress'
```

### 2. DiyasManagement.jsx (lines 285-351)
Added API URL configuration and updated `loadDiyasData()` to fetch from API with proper field mapping:
```javascript
diya_amount: d.target_amount || 0,
paid_amount: d.current_amount || 0,
remaining_amount: (d.target_amount || 0) - (d.current_amount || 0),
contributors_count: d.contributor_count || d.contribution_count || 0
```

### 3. HijriDiyasManagement.tsx (line 132)
Fixed TypeScript error by adding type annotations:
```typescript
.reduce((sum: number, d: Diya) => sum + d.contributorsCount, 0)
```

## Build Status
✅ Frontend built successfully
✅ All three diyas components updated
✅ Type errors fixed
✅ Ready for testing

## Expected Results
- Correct amounts display (no more NaN)
- Correct contributor counts
- Proper case names (title_ar)
- All 4 diya cases should display with data

## Test with
- Login: admin@alshuail.com / Admin@123
- Navigate to Diyas Management section
- Check that amounts, contributors, and names display correctly
