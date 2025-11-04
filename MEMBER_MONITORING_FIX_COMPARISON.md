# Member Monitoring Dashboard - Field Name Issue

## Problem Summary
The standalone monitoring dashboard (`/monitoring-standalone/index.html`) displays "member not defined" errors because it uses **WRONG field names** that don't match the API response.

---

## Side-by-Side Comparison

### ❌ WRONG CODE (monitoring-standalone/index.html - Line 2382-2389)

```javascript
function createMemberRow(member) {
    // Map member data
    const memberId = member.member_number || member.id || 'N/A';              // ❌ WRONG
    const name = member.full_name_arabic || member.name || 'غير محدد';       // ❌ WRONG
    const phone = member.phone_number || member.phone || 'غير محدد';         // ❌ WRONG
    const branch = member.branch_arabic || member.branch || 'غير محدد';      // ❌ WRONG
    const membershipStatus = member.membership_status || 'unknown';
    const financialStatus = member.financial_status || 'unknown';
    const balance = member.current_balance || 0;                             // ❌ WRONG (loses 0 values)
    const due = member.amount_due || 0;                                      // ❌ WRONG (field doesn't exist)
```

### ✅ CORRECT CODE (MemberMonitoringDashboard.jsx - Line 63, 91-94)

```javascript
// From the WORKING React dashboard
const balance = member.current_balance !== undefined ? member.current_balance : 0;  // ✅ CORRECT

return {
    memberId: member.membership_number || member.member_id,     // ✅ CORRECT
    fullName: member.full_name,                                // ✅ CORRECT
    phone: member.phone,                                       // ✅ CORRECT
    tribalSection: member.tribal_section || 'غير محدد',       // ✅ CORRECT
    currentBalance: balance,
    requiredPayment: Math.max(0, 3000 - balance),             // ✅ CORRECT (calculated)
```

---

## Field Mapping Table

| Purpose | ❌ HTML Uses (WRONG) | ✅ API Returns (CORRECT) |
|---------|---------------------|-------------------------|
| Member ID | `member.member_number` | `member.membership_number` |
| Full Name | `member.full_name_arabic` | `member.full_name` |
| Phone | `member.phone_number` | `member.phone` |
| Branch/Tribal Section | `member.branch_arabic` | `member.tribal_section` |
| Balance | `member.current_balance \|\| 0` | Needs explicit check: `!== undefined` |
| Amount Due | `member.amount_due` | Must calculate: `Math.max(0, 3000 - balance)` |

---

## The Fix Needed

**File:** `alshuail-admin-arabic/public/monitoring-standalone/index.html`
**Lines:** 2378-2389

Replace this section:

```javascript
        function createMemberRow(member) {
            const row = document.createElement('tr');

            // Map member data
            const memberId = member.member_number || member.id || 'N/A';
            const name = member.full_name_arabic || member.name || 'غير محدد';
            const phone = member.phone_number || member.phone || 'غير محدد';
            const branch = member.branch_arabic || member.branch || 'غير محدد';
            const membershipStatus = member.membership_status || 'unknown';
            const financialStatus = member.financial_status || 'unknown';
            const balance = member.current_balance || 0;
            const due = member.amount_due || 0;
```

With this:

```javascript
        function createMemberRow(member) {
            const row = document.createElement('tr');

            // Map member data - using correct API field names from members table
            const memberId = member.membership_number || member.id || 'N/A';
            const name = member.full_name || 'غير محدد';
            const phone = member.phone || 'غير محدد';
            const branch = member.tribal_section || 'غير محدد';
            const membershipStatus = member.membership_status || 'active';
            const financialStatus = member.financial_status || 'paid';
            // Fix: Use explicit undefined check to preserve 0 values (same fix as statement search)
            const balance = member.current_balance !== undefined ? member.current_balance : 0;
            // Required amount: 3000 SAR for each member until 2025
            const requiredAmount = 3000;
            const due = Math.max(0, requiredAmount - balance);
```

---

## Why This Matters

1. **member_number** doesn't exist → members show as "N/A"
2. **full_name_arabic** doesn't exist → names show as "undefined"
3. **phone_number** doesn't exist → phones show as "undefined"
4. **branch_arabic** doesn't exist → branches show as "undefined"
5. **current_balance || 0** loses zero values → members with 0 balance show incorrectly
6. **amount_due** doesn't exist → calculations fail

This is why you're seeing "member not defined" errors on Render!

---

## Next Steps

1. ✅ Identified the root cause
2. 🔄 Apply the fix manually or via script
3. ⏳ Test locally
4. 📦 Deploy to Cloudflare Pages
