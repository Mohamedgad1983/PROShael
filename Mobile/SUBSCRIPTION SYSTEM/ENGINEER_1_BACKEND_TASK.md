# 👨‍💻 Give Engineer #1 (Backend):

## 📄 Files to Deliver:

1. **📘 SUBSCRIPTION_MISSION_PROMPT.md** (read this first)
2. **📄 FILE_3_SUBSCRIPTION_API_CONTROLLER.js**
3. **📄 FILE_4_SUBSCRIPTION_API_ROUTES.js**
4. **📄 test_subscriptions.sh** (for testing)

---

## 🎯 Task: 
**"Implement Phases 1-2 (Database + Backend API)"**

---

## ⏱️ Time Estimate:
**90 minutes** (1.5 hours)

---

## 📋 Detailed Instructions:

### **What You're Building:**
A complete backend API system for managing 344+ family member subscriptions (50 SAR/month). The database structure is **already complete** (subscription_plans, subscriptions, payments tables exist with 344 members linked). Your job is to build the API layer that admins and members will use to:

- View subscription status
- Record payments
- Track payment history
- Flag overdue accounts
- Generate financial reports

---

### **PHASE 1: Verify Database (10 minutes)**

Before writing any code, verify the database is ready:

```sql
-- Connect to Supabase and run:

-- 1. Check subscription plans (should have 1 active monthly plan)
SELECT * FROM subscription_plans WHERE is_active = true;

-- 2. Check subscriptions (should have 344 rows)
SELECT COUNT(*) as total FROM subscriptions;

-- 3. Check the pre-built view works
SELECT * FROM v_subscription_overview LIMIT 5;

-- 4. Verify test account exists
SELECT * FROM members WHERE phone = '0555555555';
```

**Expected Results:**
- ✅ 1 subscription plan (50 SAR monthly)
- ✅ 344 subscriptions (all members linked)
- ✅ View returns data with calculated fields
- ✅ Test account exists

If any check fails, **STOP** and report the issue.

---

### **PHASE 2: Build API Controller (40 minutes)**

**File to create:** `backend/src/controllers/subscriptionController.js`

**Location:** Place in your existing backend project structure

#### **Functions to Implement:**

```javascript
// 1. Get all subscription plans (public)
exports.getSubscriptionPlans = async (req, res) => {
  // Query: SELECT * FROM subscription_plans WHERE is_active = true
  // Response: { plans: [...] }
}

// 2. Get member's own subscription (authenticated)
exports.getMemberSubscription = async (req, res) => {
  // Extract member_id from JWT token
  // Query: SELECT * FROM v_subscription_overview WHERE member_id = ?
  // Response: { subscription: {...}, payment_history: [...] }
}

// 3. Get member's payment history (authenticated)
exports.getPaymentHistory = async (req, res) => {
  // Extract member_id from JWT token
  // Query: SELECT * FROM payments WHERE payer_id = ? ORDER BY payment_date DESC
  // Pagination: LIMIT 20 OFFSET (page-1)*20
  // Response: { payments: [...], total, page, limit }
}

// 4. Get all subscriptions (admin only)
exports.getAllSubscriptions = async (req, res) => {
  // Query params: ?page=1&limit=20&status=overdue&search=phone
  // Query: SELECT * FROM v_subscription_overview
  // WHERE status = ? AND (full_name LIKE ? OR phone LIKE ?)
  // ORDER BY next_payment_due ASC
  // Response: { subscriptions: [...], total, page, stats: {...} }
}

// 5. Get dashboard statistics (admin only)
exports.getSubscriptionStats = async (req, res) => {
  // Query: Aggregate functions on subscriptions table
  // Calculate: total, active, overdue, monthly_revenue, avg_months_ahead
  // Response: { 
  //   total_members: 344,
  //   active: 344,
  //   overdue: 0,
  //   monthly_revenue: 17200,
  //   overdue_amount: 0,
  //   avg_months_ahead: 3.2
  // }
}

// 6. Get overdue members only (admin only)
exports.getOverdueMembers = async (req, res) => {
  // Query: SELECT * FROM v_subscription_overview 
  // WHERE status = 'overdue' ORDER BY next_payment_due ASC
  // Response: { overdue_members: [...], total_due: SUM(50) }
}

// 7. Record a payment (admin only)
exports.recordPayment = async (req, res) => {
  // Body: { member_id, amount, months, payment_method, receipt_number, notes }
  // 
  // TRANSACTION:
  // 1. INSERT INTO payments (...)
  // 2. UPDATE subscriptions SET 
  //    current_balance = current_balance + amount,
  //    months_paid_ahead = (current_balance + amount) / 50,
  //    next_payment_due = NOW() + INTERVAL months_paid_ahead MONTH,
  //    last_payment_date = NOW(),
  //    last_payment_amount = amount,
  //    status = 'active'
  //    WHERE member_id = ?
  // 3. UPDATE members SET balance = balance + amount WHERE id = ?
  // 4. INSERT INTO notifications (user_id, title, message, type)
  //    Message: "تم استلام دفعتك - {amount} ريال"
  //
  // Response: { 
  //   success: true, 
  //   new_balance: 200, 
  //   months_ahead: 4, 
  //   next_due: "2026-02-05" 
  // }
}

// 8. Send payment reminder (admin only)
exports.sendPaymentReminder = async (req, res) => {
  // Body: { member_ids: [] } or { send_to_all: true }
  // 
  // For each member:
  // 1. Get member's user_id and phone
  // 2. INSERT INTO notifications (user_id, title, message, type, priority)
  //    Title: "تنبيه دفع الاشتراك"
  //    Message: "اشتراكك الشهري (50 ريال) متأخر. الرجاء الدفع في أقرب وقت."
  //    Type: 'payment_reminder'
  //    Priority: 'high'
  // 3. Optional: Send SMS via external service
  //
  // Response: { sent: 15, failed: 0, details: [...] }
}
```

#### **Key Implementation Requirements:**

1. **Use Supabase Client:**
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
```

2. **Extract Member ID from JWT:**
```javascript
const member_id = req.user.member_id; // From JWT middleware
const role = req.user.role; // Check if admin
```

3. **Use Database View for Efficiency:**
```javascript
// DON'T manually calculate months_paid_ahead
// The view already has it calculated correctly
const { data } = await supabase
  .from('v_subscription_overview')
  .select('*')
  .eq('member_id', member_id)
  .single();
```

4. **Use Transactions for Payments:**
```javascript
// Wrap payment recording in a transaction
const { data, error } = await supabase.rpc('record_payment_transaction', {
  p_member_id: member_id,
  p_amount: amount,
  p_months: months,
  p_payment_method: payment_method,
  p_receipt_number: receipt_number,
  p_processed_by: req.user.user_id,
  p_notes: notes
});
```

5. **Error Handling (Arabic Messages):**
```javascript
try {
  // ... operation
} catch (error) {
  console.error('Payment Error:', error);
  return res.status(500).json({
    success: false,
    message: 'حدث خطأ أثناء تسجيل الدفعة',
    error: error.message
  });
}
```

---

### **PHASE 3: Build API Routes (30 minutes)**

**File to create:** `backend/src/routes/subscriptionRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');

// Public routes
router.get('/plans', subscriptionController.getSubscriptionPlans);

// Member routes (authenticated)
router.get('/member/subscription', 
  authenticateJWT, 
  subscriptionController.getMemberSubscription
);

router.get('/member/subscription/payments', 
  authenticateJWT, 
  subscriptionController.getPaymentHistory
);

// Admin routes (admin only)
router.get('/admin/subscriptions', 
  authenticateJWT, 
  requireAdmin, 
  subscriptionController.getAllSubscriptions
);

router.get('/admin/subscriptions/stats', 
  authenticateJWT, 
  requireAdmin, 
  subscriptionController.getSubscriptionStats
);

router.get('/admin/subscriptions/overdue', 
  authenticateJWT, 
  requireAdmin, 
  subscriptionController.getOverdueMembers
);

router.post('/admin/subscriptions/payment', 
  authenticateJWT, 
  requireAdmin, 
  subscriptionController.recordPayment
);

router.post('/admin/subscriptions/reminder', 
  authenticateJWT, 
  requireAdmin, 
  subscriptionController.sendPaymentReminder
);

module.exports = router;
```

**Then add to your main app.js:**
```javascript
const subscriptionRoutes = require('./routes/subscriptionRoutes');
app.use('/api/subscriptions', subscriptionRoutes);
```

---

### **PHASE 4: Create Test Script (10 minutes)**

**File to create:** `test_subscriptions.sh`

```bash
#!/bin/bash

# Subscription API Test Script
BASE_URL="https://proshael.onrender.com/api/subscriptions"
TOKEN="your_jwt_token_here"

echo "=========================================="
echo "SUBSCRIPTION API TESTS"
echo "=========================================="

# Test 1: Get subscription plans (public)
echo "
Test 1: Get Subscription Plans"
curl -X GET "$BASE_URL/plans"

# Test 2: Get member's subscription (authenticated)
echo "

Test 2: Get Member Subscription"
curl -X GET "$BASE_URL/member/subscription" \
  -H "Authorization: Bearer $TOKEN"

# Test 3: Get payment history (authenticated)
echo "

Test 3: Get Payment History"
curl -X GET "$BASE_URL/member/subscription/payments?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Test 4: Get all subscriptions (admin)
echo "

Test 4: Get All Subscriptions (Admin)"
curl -X GET "$BASE_URL/admin/subscriptions?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Test 5: Get statistics (admin)
echo "

Test 5: Get Dashboard Stats (Admin)"
curl -X GET "$BASE_URL/admin/subscriptions/stats" \
  -H "Authorization: Bearer $TOKEN"

# Test 6: Get overdue members (admin)
echo "

Test 6: Get Overdue Members (Admin)"
curl -X GET "$BASE_URL/admin/subscriptions/overdue" \
  -H "Authorization: Bearer $TOKEN"

# Test 7: Record payment (admin)
echo "

Test 7: Record Payment (Admin)"
curl -X POST "$BASE_URL/admin/subscriptions/payment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "147b3021-a6a3-4cd7-af2c-67ad11734aa0",
    "amount": 150,
    "months": 3,
    "payment_method": "cash",
    "receipt_number": "REC-2025-001",
    "notes": "دفعة نقدية - 3 أشهر"
  }'

# Test 8: Send reminder (admin)
echo "

Test 8: Send Payment Reminder (Admin)"
curl -X POST "$BASE_URL/admin/subscriptions/reminder" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "member_ids": ["147b3021-a6a3-4cd7-af2c-67ad11734aa0"]
  }'

echo "

=========================================="
echo "TESTS COMPLETE"
echo "=========================================="
```

**Make it executable:**
```bash
chmod +x test_subscriptions.sh
```

**Update TOKEN before running:**
```bash
# Login first to get token
# Then replace "your_jwt_token_here" in script
./test_subscriptions.sh
```

---

## ✅ Definition of Done:

Your backend is complete when:

1. ✅ All 8 controller functions implemented and working
2. ✅ All 8 API routes defined and tested
3. ✅ Test script runs without errors
4. ✅ Can get subscription plans (public endpoint)
5. ✅ Can get member's own subscription (authenticated)
6. ✅ Can get all 344 subscriptions (admin)
7. ✅ Can record a payment and balance updates correctly
8. ✅ Can send payment reminder and notification is created
9. ✅ All responses are in JSON format
10. ✅ All error messages are in Arabic

---

## 🚀 Deployment Steps:

1. **Push code to GitHub**
2. **Deploy to Render** (auto-deploy from GitHub)
3. **Verify environment variables are set:**
   - SUPABASE_URL
   - SUPABASE_SERVICE_KEY
   - JWT_SECRET
4. **Test production API with test script**
5. **Report backend URL to frontend team:**
   - `https://proshael.onrender.com/api/subscriptions`

---

## 📞 Support:

If you encounter issues:
- Check Render logs for backend errors
- Verify database connection works
- Test each endpoint one by one
- Use Postman/Thunder Client for debugging
- Check exact column names in database match your queries

---

## 🎯 Success Criteria:

- Backend handles 344+ members without slowdown
- Payments are recorded accurately (balance math is correct)
- All database operations use transactions
- Arabic error messages are clear
- API responses are fast (< 1 second)

---

**TIME TO BUILD: 90 minutes**

**You have everything you need. Build it perfectly.** 🚀
