# Diyas Data Mapping Issue - October 15, 2025

## Current Status
- ✅ **Backend API working**: Returns 4 diya cases with 852 member contributions
- ✅ **Database has data**: 140,800 SAR collected across 3 main cases
- ❌ **Frontend display broken**: Shows NaN for amounts, wrong contributor counts, missing names

## Root Cause
The backend now queries `activities` table (correct), but frontend components expect the old `payments` table field structure.

## API Response Structure (activities table)
```javascript
{
  id: "uuid",
  title_ar: "دية شرهان 2",           // ← Frontend expects: title
  title_en: "Sharhan Diya Case 2",
  description_ar: "...",
  target_amount: 100000,              // ← Frontend expects: amount
  current_amount: 83400,              // ← Frontend expects: amount_paid
  contribution_count: 278,            // ← Frontend expects: contributors_count
  contributor_count: 278,
  status: "completed",                // ← Frontend expects: payment_status
  financial_contributions: [...]      // ← Array of contributor data
}
```

## Frontend Expects (old payments structure)
```javascript
{
  case_number: "DY-2024-001",
  victim_name: "...",
  total_amount: 29200,
  amount_paid: 29200,
  status: "paid",
  payer_id: "uuid"                    // ← Single payer, not array
}
```

## Files Needing Updates
1. `alshuail-admin-arabic/src/components/Diyas/AppleDiyasManagement.jsx`
2. `alshuail-admin-arabic/src/components/Diyas/DiyasManagement.jsx`

Both need to map `activities` table fields correctly.

## Required Fixes
```javascript
// Map activities structure to component expectations
const mappedDiya = {
  id: diya.id,
  case_number: diya.case_number || `DY-${diya.id.slice(0, 8)}`,
  title: diya.title_ar,                    // Use title_ar
  description: diya.description_ar,
  total_amount: diya.target_amount,        // Use target_amount
  amount_paid: diya.current_amount,        // Use current_amount
  amount_remaining: (diya.target_amount || 0) - (diya.current_amount || 0),
  contributors_count: diya.contributor_count || diya.contribution_count,
  status: diya.status,                     // Use activity status
  financial_contributions: diya.financial_contributions || []
};
```

## The 4 Diya Cases Found
1. **دية شرهان 2** - 278 contributors - 83,400 SAR collected
2. **دية شرهان 1** - 282 contributors - 28,200 SAR collected (NOTE: 100 SAR each)
3. **دية نادر** - 292 contributors - 29,200 SAR collected (NOTE: 100 SAR each)
4. **Unknown 4th case** - ID: 9db0d5ab-8a49-4e10-881d-13879f555579

## Next Steps
1. Update AppleDiyasManagement.jsx to map activities fields correctly
2. Update DiyasManagement.jsx to map activities fields correctly
3. Fix amount calculations (target_amount - current_amount)
4. Fix contributor count display
5. Consider adding member name joins in API or fetch separately in frontend
6. Deploy and test

## Test Credentials
- Email: admin@alshuail.com
- Password: Admin@123
