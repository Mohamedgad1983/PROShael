# 🧪 Give QA/Tester:

## 📄 Files to Deliver:

1. **📄 test_subscriptions.sh** (automated API tests)
2. **📄 FILE_7_SUBSCRIPTION_API_INTEGRATION_GUIDE.md**
3. **📄 FILE_8_SUBSCRIPTION_TESTING_GUIDE.md**

---

## 🎯 Task:
**"Run automated tests + manual mobile testing + documentation"**

---

## ⏱️ Time Estimate:
**60 minutes** (1 hour)

---

## ⚠️ Wait for:
**Backend + Frontend deployment complete** (both engineers must finish first)

---

## 📋 Detailed Instructions:

### **Pre-Testing Verification (5 minutes)**

Before starting tests, verify both systems are deployed:

```bash
# 1. Check backend is running
curl https://proshael.onrender.com/health

# 2. Check frontend is deployed
curl -I https://alshuail-admin.pages.dev

# 3. Get admin JWT token (login as admin)
# Save token for testing
```

**Expected:**
- ✅ Backend returns 200 OK
- ✅ Frontend returns 200 OK  
- ✅ You have valid JWT token

If any system is down, **STOP** and notify engineers.

---

### **PHASE 1: Automated API Testing (20 minutes)**

**File already created:** `test_subscriptions.sh` (by Engineer #1)

#### **Step 1: Prepare Test Script**

```bash
# 1. Make script executable
chmod +x test_subscriptions.sh

# 2. Open script and update TOKEN variable
nano test_subscriptions.sh

# Replace this line:
TOKEN="your_jwt_token_here"

# With your actual admin token:
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Save and exit (Ctrl+X, Y, Enter)
```

#### **Step 2: Run All API Tests**

```bash
# Run the test script
./test_subscriptions.sh > test_results.txt 2>&1

# View results
cat test_results.txt
```

#### **Step 3: Verify Each Test Result**

**Test 1: Get Subscription Plans**
- ✅ Returns 200 OK
- ✅ Contains 1 plan (50 SAR monthly)
- ✅ Response format: `{ "plans": [...] }`

**Test 2: Get Member Subscription**
- ✅ Returns 200 OK
- ✅ Contains member's subscription details
- ✅ Status is 'active' or 'overdue'
- ✅ Balance and months_paid_ahead are present

**Test 3: Get Payment History**
- ✅ Returns 200 OK
- ✅ Returns array of payments (or empty if no payments)
- ✅ Pagination info present (page, limit, total)

**Test 4: Get All Subscriptions (Admin)**
- ✅ Returns 200 OK
- ✅ Returns array of 344 subscriptions (paginated to 5)
- ✅ Each subscription has required fields
- ✅ Stats object present

**Test 5: Get Dashboard Stats (Admin)**
- ✅ Returns 200 OK
- ✅ Stats match expected values:
  ```json
  {
    "total_members": 344,
    "active": 344,
    "overdue": 0,
    "monthly_revenue": 17200,
    "overdue_amount": 0,
    "avg_months_ahead": 3.2 (approximate)
  }
  ```

**Test 6: Get Overdue Members (Admin)**
- ✅ Returns 200 OK
- ✅ Returns empty array (or list of overdue members)
- ✅ Total due amount is calculated

**Test 7: Record Payment (Admin)**
- ✅ Returns 200 OK
- ✅ Response contains:
  - `success: true`
  - `new_balance` (old balance + 150)
  - `months_ahead` (updated)
  - `next_due` (updated date)
- ✅ Notification created in database

**Test 8: Send Payment Reminder (Admin)**
- ✅ Returns 200 OK
- ✅ Response contains:
  - `sent: 1` (or number of reminders sent)
  - `failed: 0`
- ✅ Notification created in notifications table

#### **Step 4: Document Results**

Create `API_TEST_RESULTS.md`:

```markdown
# API Test Results
Date: [Today's date]
Tester: [Your name]

## Summary
- Total Tests: 8
- Passed: [X]
- Failed: [Y]
- Success Rate: [X/8 * 100]%

## Detailed Results

### Test 1: Get Subscription Plans
Status: ✅ PASS / ❌ FAIL
Response Time: [X]ms
Notes: [Any observations]

[Repeat for all 8 tests]

## Issues Found
1. [Issue description if any]
2. [Issue description if any]

## Recommendations
1. [Any suggestions]
```

---

### **PHASE 2: Manual UI Testing (25 minutes)**

#### **Admin Dashboard Testing (15 minutes)**

**Test Environment:** https://alshuail-admin.pages.dev/admin/subscriptions

**Test 1: Dashboard Load**
- ✅ Page loads in < 2 seconds
- ✅ No console errors in browser DevTools (F12)
- ✅ All 4 stat cards display with correct numbers
- ✅ Stats match API test results

**Test 2: Subscriptions Table**
- ✅ Table displays with 20 members per page
- ✅ All columns present: Name, Phone, Status, Balance, Months, Next Due, Actions
- ✅ Status badges show correct colors (green=active, red=overdue)
- ✅ Arabic text displays correctly (RTL)
- ✅ Table is scrollable on mobile

**Test 3: Search Functionality**
- ✅ Type "0555555555" in search box
- ✅ Table filters to show only matching member
- ✅ Search response time < 1 second
- ✅ Clear search shows all members again

**Test 4: Status Filter**
- ✅ Select "نشط" (Active) in filter dropdown
- ✅ Table shows only active members
- ✅ Select "متأخر" (Overdue) in filter
- ✅ Table shows only overdue members (if any)
- ✅ Select "الكل" (All) shows all members

**Test 5: Pagination**
- ✅ "التالي" (Next) button works
- ✅ Page number updates correctly
- ✅ "السابق" (Previous) button works
- ✅ First page: Previous button is disabled
- ✅ Last page: Next button is disabled

**Test 6: Record Payment Modal**
- ✅ Click "تسجيل دفعة" button on any member
- ✅ Modal opens with member info displayed
- ✅ Select "3 أشهر" in months dropdown
- ✅ Amount updates to 150 SAR automatically
- ✅ Select payment method "نقدي"
- ✅ Enter receipt number "TEST-001"
- ✅ Enter notes "اختبار النظام"
- ✅ Click "تسجيل الدفعة"
- ✅ Success message appears
- ✅ Modal closes
- ✅ Stats refresh with new data
- ✅ Member's balance updated in table

**Test 7: Send Reminder** (Only if overdue members exist)
- ✅ Find overdue member in table
- ✅ Click "إرسال تذكير" button
- ✅ Confirmation appears
- ✅ Success message shows "تم إرسال التذكير بنجاح"
- ✅ Notification created (verify in notifications table)

**Test 8: Responsive Design**
- ✅ Test on desktop (1920x1080)
- ✅ Test on tablet (768x1024)
- ✅ Test on mobile (375x667)
- ✅ Layout adjusts correctly on each screen size
- ✅ All buttons are clickable on mobile
- ✅ Text is readable on all devices

#### **Member Mobile View Testing (10 minutes)**

**Test Environment:** https://alshuail-admin.pages.dev/mobile/subscription

**Login as test member:**
- Phone: 0555555555
- Password: 123456

**Test 1: Subscription Card**
- ✅ Status badge shows correct status
- ✅ Subscription amount displays: 50 ريال/شهر
- ✅ Balance shows correctly (should match database)
- ✅ Months paid ahead displays correctly
- ✅ Next payment due date is correct
- ✅ Progress bar shows correct percentage
- ✅ If overdue: warning message appears
- ✅ Refresh button works (🔄 icon)

**Test 2: Payment History**
- ✅ "سجل الدفعات" section loads
- ✅ If payments exist: all payments listed
- ✅ Each payment shows: amount, date, method, receipt
- ✅ If no payments: shows "لا توجد دفعات سابقة"
- ✅ Payment status shows "مكتمل ✓"

**Test 3: Pay Now Button**
- ✅ Click "💳 دفع الآن" button
- ✅ Modal opens with month options
- ✅ Options show: 1, 2, 3, 6, 12 months
- ✅ Total amount calculates correctly (months × 50)
- ✅ Can select any option
- ✅ "تأكيد الدفع" button works
- ✅ Alert message appears (payment intent recorded)

**Test 4: Mobile UX**
- ✅ All touch targets are large enough (min 44x44px)
- ✅ Smooth scrolling on payment history
- ✅ Modal slides in smoothly
- ✅ Buttons have haptic feedback (on devices that support it)
- ✅ Text is readable without zooming
- ✅ No horizontal scrolling

**Test 5: Real-time Updates** (Integration Test)
- ✅ Admin records payment for member (on desktop)
- ✅ Member refreshes mobile view (click 🔄)
- ✅ Balance updates immediately
- ✅ Months paid ahead updates
- ✅ Next due date updates
- ✅ Payment appears in history

---

### **PHASE 3: Create Integration Guide (10 minutes)**

**File to create:** `FILE_7_SUBSCRIPTION_API_INTEGRATION_GUIDE.md`

```markdown
# 📘 Subscription System - API Integration Guide

## Overview
Complete API documentation for integrating with the Al-Shuail subscription system.

---

## Base URL
```
Production: https://proshael.onrender.com/api/subscriptions
Development: http://localhost:3000/api/subscriptions
```

---

## Authentication

All authenticated endpoints require JWT token in header:
```
Authorization: Bearer <your_jwt_token>
```

Get token by logging in:
```bash
POST https://proshael.onrender.com/api/auth/login
Body: { "phone": "0555555555", "password": "123456" }
Response: { "token": "eyJhbGc..." }
```

---

## Endpoints

### 1. Get Subscription Plans
**GET** `/plans`  
**Auth:** Not required  
**Description:** Get all available subscription plans

**Response:**
```json
{
  "plans": [
    {
      "id": "uuid",
      "name_ar": "اشتراك شهري",
      "name_en": "Monthly Subscription",
      "amount": 50,
      "billing_cycle": "monthly",
      "is_active": true
    }
  ]
}
```

---

### 2. Get Member's Subscription
**GET** `/member/subscription`  
**Auth:** Required (Member)  
**Description:** Get authenticated member's subscription details

**Response:**
```json
{
  "subscription": {
    "member_id": "uuid",
    "status": "active",
    "current_balance": 150,
    "months_paid_ahead": 3,
    "next_payment_due": "2026-01-05",
    "last_payment_date": "2025-10-05",
    "last_payment_amount": 150
  }
}
```

---

### 3. Get Payment History
**GET** `/member/subscription/payments?page=1&limit=20`  
**Auth:** Required (Member)  
**Description:** Get member's payment history with pagination

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)

**Response:**
```json
{
  "payments": [
    {
      "id": "uuid",
      "amount": 150,
      "months_purchased": 3,
      "payment_date": "2025-10-05T10:30:00Z",
      "payment_method": "cash",
      "receipt_number": "REC-2025-001",
      "status": "completed"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

### 4. Get All Subscriptions (Admin)
**GET** `/admin/subscriptions?page=1&limit=20&status=all&search=`  
**Auth:** Required (Admin)  
**Description:** Get all member subscriptions with filters

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page (max: 50)
- `status` (optional): Filter by status ('all', 'active', 'overdue')
- `search` (optional): Search by name or phone

**Response:**
```json
{
  "subscriptions": [
    {
      "member_id": "uuid",
      "full_name": "أحمد محمد الشعيل",
      "phone": "0555555555",
      "status": "active",
      "current_balance": 150,
      "months_paid_ahead": 3,
      "next_payment_due": "2026-01-05"
    }
  ],
  "total": 344,
  "page": 1,
  "stats": {
    "total_members": 344,
    "active": 344,
    "overdue": 0
  }
}
```

---

### 5. Get Dashboard Statistics (Admin)
**GET** `/admin/subscriptions/stats`  
**Auth:** Required (Admin)  
**Description:** Get dashboard statistics

**Response:**
```json
{
  "total_members": 344,
  "active": 344,
  "overdue": 0,
  "monthly_revenue": 17200,
  "overdue_amount": 0,
  "avg_months_ahead": 3.2
}
```

---

### 6. Get Overdue Members (Admin)
**GET** `/admin/subscriptions/overdue`  
**Auth:** Required (Admin)  
**Description:** Get list of overdue members only

**Response:**
```json
{
  "overdue_members": [
    {
      "member_id": "uuid",
      "full_name": "محمد أحمد",
      "phone": "0551234567",
      "current_balance": 0,
      "next_payment_due": "2025-09-01",
      "days_overdue": 34,
      "amount_due": 50
    }
  ],
  "total_due": 50
}
```

---

### 7. Record Payment (Admin)
**POST** `/admin/subscriptions/payment`  
**Auth:** Required (Admin)  
**Description:** Record a new payment for a member

**Request Body:**
```json
{
  "member_id": "uuid",
  "amount": 150,
  "months": 3,
  "payment_method": "cash",
  "receipt_number": "REC-2025-001",
  "notes": "دفعة نقدية - 3 أشهر"
}
```

**Response:**
```json
{
  "success": true,
  "new_balance": 300,
  "months_ahead": 6,
  "next_due": "2026-04-05"
}
```

---

### 8. Send Payment Reminder (Admin)
**POST** `/admin/subscriptions/reminder`  
**Auth:** Required (Admin)  
**Description:** Send payment reminder notification to members

**Request Body (Single Member):**
```json
{
  "member_ids": ["uuid-1"]
}
```

**Request Body (Multiple Members):**
```json
{
  "member_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Request Body (All Overdue):**
```json
{
  "send_to_all": true
}
```

**Response:**
```json
{
  "sent": 3,
  "failed": 0,
  "details": [
    {
      "member_id": "uuid-1",
      "phone": "0551234567",
      "status": "sent"
    }
  ]
}
```

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "message": "رسالة الخطأ بالعربية",
  "error": "Detailed error message"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid data)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (member/subscription not found)
- `500` - Internal Server Error

---

## Integration Examples

### React/TypeScript Example

```typescript
import axios from 'axios';

const API_BASE = 'https://proshael.onrender.com/api/subscriptions';
const token = localStorage.getItem('token');

const axiosConfig = {
  headers: { Authorization: `Bearer ${token}` }
};

// Get member's subscription
const getSubscription = async () => {
  try {
    const { data } = await axios.get(
      `${API_BASE}/member/subscription`,
      axiosConfig
    );
    console.log('Subscription:', data.subscription);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Record payment (admin)
const recordPayment = async (memberId: string, amount: number, months: number) => {
  try {
    const { data } = await axios.post(
      `${API_BASE}/admin/subscriptions/payment`,
      {
        member_id: memberId,
        amount,
        months,
        payment_method: 'cash',
        receipt_number: `REC-${Date.now()}`
      },
      axiosConfig
    );
    alert(`Payment recorded! New balance: ${data.new_balance}`);
  } catch (error) {
    alert('Payment failed');
  }
};
```

---

## Testing with cURL

```bash
# Get subscription plans (public)
curl -X GET "https://proshael.onrender.com/api/subscriptions/plans"

# Get member subscription (authenticated)
curl -X GET "https://proshael.onrender.com/api/subscriptions/member/subscription" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Record payment (admin)
curl -X POST "https://proshael.onrender.com/api/subscriptions/admin/subscriptions/payment" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "uuid",
    "amount": 150,
    "months": 3,
    "payment_method": "cash",
    "receipt_number": "REC-001"
  }'
```

---

## Rate Limiting

No rate limiting currently implemented.  
Future consideration: 100 requests per minute per IP.

---

## Support

For issues or questions:
- Check Render logs: https://dashboard.render.com
- Verify database: Supabase dashboard
- Contact: [Your contact info]

---

**Last Updated:** October 5, 2025  
**API Version:** 1.0
```

---

### **PHASE 4: Create Testing Guide (10 minutes)**

**File to create:** `FILE_8_SUBSCRIPTION_TESTING_GUIDE.md`

```markdown
# 🧪 Subscription System - Complete Testing Guide

## Overview
This guide covers all testing procedures for the Al-Shuail subscription system, including automated tests, manual tests, and integration tests.

---

## Test Environment

**Backend:** https://proshael.onrender.com  
**Frontend:** https://alshuail-admin.pages.dev  
**Database:** Supabase (oneiggrfzagqjbkdinin)

**Test Accounts:**
- **Admin:** admin@alshuail.com / Admin@123
- **Member:** 0555555555 / 123456

---

## 1. Pre-Testing Setup (5 minutes)

### Install Required Tools
```bash
# Install curl (usually pre-installed)
curl --version

# Install jq for JSON parsing (optional)
sudo apt install jq

# Verify access to test accounts
# Login and save JWT tokens
```

### Verify Systems Are Running
```bash
# Check backend health
curl https://proshael.onrender.com/health

# Check frontend
curl -I https://alshuail-admin.pages.dev

# Check database connection
# Login to Supabase dashboard and verify tables exist
```

---

## 2. Automated API Testing (20 minutes)

### Run Test Script
```bash
# Make executable
chmod +x test_subscriptions.sh

# Update TOKEN in script first
nano test_subscriptions.sh

# Run tests
./test_subscriptions.sh > test_results.txt 2>&1

# View results
cat test_results.txt
```

### Expected Results

**Test 1: Get Plans**
- Status: 200 OK
- Response contains 1 monthly plan (50 SAR)

**Test 2: Get Member Subscription**
- Status: 200 OK
- Response contains subscription object with balance

**Test 3: Get Payment History**
- Status: 200 OK
- Response contains payments array (or empty)

**Test 4: Get All Subscriptions**
- Status: 200 OK
- Response contains 344 subscriptions (paginated)

**Test 5: Get Stats**
- Status: 200 OK
- Stats: 344 total, 344 active, 0 overdue, 17200 revenue

**Test 6: Get Overdue Members**
- Status: 200 OK
- Response contains overdue array (or empty)

**Test 7: Record Payment**
- Status: 200 OK
- Balance increases correctly
- Months ahead recalculates
- Next due date updates

**Test 8: Send Reminder**
- Status: 200 OK
- Notification created in database

### Document Results
Create `API_TEST_RESULTS_[DATE].md` with pass/fail status for each test.

---

## 3. Manual UI Testing (30 minutes)

### Admin Dashboard Tests

**Environment:** https://alshuail-admin.pages.dev/admin/subscriptions  
**Login as:** admin@alshuail.com

#### Test Checklist

**Dashboard Load (2 min)**
- [ ] Page loads in < 2 seconds
- [ ] No console errors (F12 DevTools)
- [ ] All 4 stat cards display correctly
- [ ] Stats match database numbers

**Subscriptions Table (3 min)**
- [ ] Table shows 20 members per page
- [ ] All columns present and visible
- [ ] Status badges colored correctly (green/red)
- [ ] Arabic text displays properly (RTL)

**Search & Filter (3 min)**
- [ ] Search by phone works (type 0555555555)
- [ ] Search response < 1 second
- [ ] Filter by status works
- [ ] Clear filters returns all members

**Pagination (2 min)**
- [ ] Next/Previous buttons work
- [ ] Page numbers update correctly
- [ ] First/Last page buttons disable correctly

**Record Payment (5 min)**
- [ ] Click "تسجيل دفعة" opens modal
- [ ] Member info displays in modal
- [ ] Select months updates amount
- [ ] Fill all fields (method, receipt, notes)
- [ ] Submit payment
- [ ] Success message appears
- [ ] Stats refresh automatically
- [ ] Member balance updates in table

**Send Reminder (2 min)** (if overdue members exist)
- [ ] Click "إرسال تذكير" on overdue member
- [ ] Confirmation/success message appears
- [ ] Notification created (check notifications table)

**Responsive Design (3 min)**
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] All elements scale correctly

**Performance (2 min)**
- [ ] Dashboard loads in < 2 seconds
- [ ] Search responds in < 1 second
- [ ] Payment records in < 500ms
- [ ] No lag when scrolling table

---

### Member Mobile View Tests

**Environment:** https://alshuail-admin.pages.dev/mobile/subscription  
**Login as:** 0555555555 / 123456

#### Test Checklist

**Subscription Card (3 min)**
- [ ] Status badge shows correct status
- [ ] Plan amount shows 50 ريال/شهر
- [ ] Balance displays correctly
- [ ] Months paid ahead correct
- [ ] Next payment due date correct
- [ ] Progress bar matches months paid
- [ ] Refresh button (🔄) works

**Payment History (2 min)**
- [ ] History section loads
- [ ] All payments listed (if any exist)
- [ ] Each shows: amount, date, method, receipt
- [ ] Shows "لا توجد دفعات" if empty

**Pay Now Modal (3 min)**
- [ ] "💳 دفع الآن" button opens modal
- [ ] Month options display (1,2,3,6,12)
- [ ] Total amount calculates correctly
- [ ] Can select any option
- [ ] "تأكيد الدفع" works
- [ ] Modal closes after confirmation

**Mobile UX (2 min)**
- [ ] All touch targets large enough (44x44px min)
- [ ] Smooth scrolling
- [ ] No horizontal scroll
- [ ] Text readable without zoom
- [ ] Buttons have visual feedback

**Real-time Update (3 min)**
- [ ] Admin records payment on desktop
- [ ] Member refreshes mobile (click 🔄)
- [ ] Balance updates immediately
- [ ] Months ahead updates
- [ ] Payment appears in history

---

## 4. Integration Testing (10 minutes)

### End-to-End Flow Tests

**Test Flow 1: Complete Payment Cycle**
1. Admin logs in desktop
2. Finds member 0555555555
3. Records payment (150 SAR, 3 months)
4. Verify success message
5. Member logs in mobile
6. Refreshes subscription view
7. Verify balance updated (+150)
8. Verify months ahead updated (+3)
9. Verify payment in history

**Expected:**
- ✅ Payment recorded successfully
- ✅ Balance updated correctly
- ✅ Months calculated correctly (balance ÷ 50)
- ✅ Next due date extended by 3 months
- ✅ Member sees update immediately
- ✅ Payment appears in history

**Test Flow 2: Overdue Member Reminder**
1. Find overdue member (or create one by setting balance to 0)
2. Admin clicks "إرسال تذكير"
3. Verify success message
4. Check notifications table in database
5. Member logs in and checks notifications
6. Verify reminder notification appears

**Expected:**
- ✅ Reminder sent successfully
- ✅ Notification created in database
- ✅ Member receives notification
- ✅ Notification is high priority
- ✅ Message is in Arabic

**Test Flow 3: Dashboard Stats Update**
1. Note current stats (total, active, overdue, revenue)
2. Record a payment (50 SAR)
3. Refresh dashboard
4. Verify stats updated
5. Monthly revenue increased by 50
6. If member was overdue: overdue count decreased

**Expected:**
- ✅ Stats refresh automatically or on page reload
- ✅ Revenue increases correctly
- ✅ Active/Overdue counts accurate
- ✅ Total members stays same (344)

---

## 5. Performance Testing (5 minutes)

### Load Time Tests

**Measure with Browser DevTools (Network tab):**

- Dashboard load: ___ ms (target: < 2000ms)
- API call (get subscriptions): ___ ms (target: < 1000ms)
- Search response: ___ ms (target: < 500ms)
- Payment recording: ___ ms (target: < 500ms)
- Mobile view load: ___ ms (target: < 1500ms)

**Document if any exceed targets**

### Concurrent Users Test (Optional)

**Simulate multiple users:**
```bash
# Open 5 browser tabs
# All logged in as different users
# Perform actions simultaneously
# Verify no conflicts or errors
```

**Expected:**
- ✅ All users can view their data
- ✅ No database lock errors
- ✅ Stats remain consistent
- ✅ Payments don't interfere with each other

---

## 6. Security Testing (5 minutes)

### Authentication Tests

**Test 1: Access Without Token**
```bash
# Try to access member subscription without token
curl -X GET "https://proshael.onrender.com/api/subscriptions/member/subscription"

# Expected: 401 Unauthorized
```

**Test 2: Member Tries Admin Endpoint**
```bash
# Login as member, get token
# Try to access admin endpoint
curl -X GET "https://proshael.onrender.com/api/subscriptions/admin/subscriptions" \
  -H "Authorization: Bearer MEMBER_TOKEN"

# Expected: 403 Forbidden
```

**Test 3: Expired Token**
```bash
# Use old/expired token
# Try any endpoint

# Expected: 401 Unauthorized with "Token expired" message
```

**Test 4: Invalid Member ID**
```bash
# Try to record payment for non-existent member
curl -X POST "https://proshael.onrender.com/api/subscriptions/admin/subscriptions/payment" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"member_id": "invalid-uuid", "amount": 50, "months": 1}'

# Expected: 404 Not Found or 400 Bad Request
```

**Expected Results:**
- ✅ All unauthorized requests rejected
- ✅ Proper error messages returned
- ✅ No sensitive data leaked
- ✅ Can't access other member's data

---

## 7. Error Handling Tests (5 minutes)

### Test Error Scenarios

**Test 1: Invalid Payment Amount**
```bash
# Try to record payment with negative amount
curl -X POST "https://proshael.onrender.com/api/subscriptions/admin/subscriptions/payment" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"member_id": "uuid", "amount": -50, "months": 1}'

# Expected: 400 Bad Request with Arabic error message
```

**Test 2: Database Connection Error**
```bash
# Temporarily disable database (if possible in staging)
# Try any endpoint

# Expected: 500 Internal Server Error with friendly message
```

**Test 3: Missing Required Fields**
```bash
# Try to record payment without member_id
curl -X POST "https://proshael.onrender.com/api/subscriptions/admin/subscriptions/payment" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"amount": 50}'

# Expected: 400 Bad Request listing missing fields
```

**Test 4: Network Timeout**
- Disable WiFi while loading page
- Verify error message appears
- Reconnect WiFi
- Verify retry works

**Expected:**
- ✅ All errors handled gracefully
- ✅ Error messages in Arabic
- ✅ No app crashes
- ✅ User can retry after error

---

## 8. Data Accuracy Tests (5 minutes)

### Verify Calculations

**Test 1: Months Paid Ahead**
```sql
-- Run in Supabase SQL Editor
SELECT 
    full_name,
    current_balance,
    months_paid_ahead,
    (current_balance / 50) as calculated_months
FROM subscriptions
WHERE member_id = 'test_member_id'
LIMIT 5;

-- Verify: months_paid_ahead = current_balance ÷ 50
```

**Test 2: Next Payment Due**
```sql
SELECT 
    full_name,
    months_paid_ahead,
    start_date,
    next_payment_due,
    start_date + INTERVAL '1 month' * months_paid_ahead as calculated_due
FROM subscriptions
WHERE member_id = 'test_member_id';

-- Verify: next_payment_due = start_date + months_paid_ahead months
```

**Test 3: Status Calculation**
```sql
SELECT 
    full_name,
    next_payment_due,
    CURRENT_DATE,
    status,
    CASE 
        WHEN next_payment_due >= CURRENT_DATE THEN 'active'
        ELSE 'overdue'
    END as calculated_status
FROM subscriptions
WHERE member_id = 'test_member_id';

-- Verify: status matches calculated_status
```

**Expected:**
- ✅ All calculations match manual verification
- ✅ No rounding errors
- ✅ Dates calculated correctly
- ✅ Status reflects actual due date

---

## 9. Regression Testing (5 minutes)

### Verify Existing Features Still Work

After adding subscription system, test that other features didn't break:

**Notifications System**
- [ ] Notifications still load
- [ ] Can mark as read
- [ ] New notifications appear

**Member Management**
- [ ] Can view member list
- [ ] Can search members
- [ ] Member profile loads

**Authentication**
- [ ] Login still works
- [ ] Logout works
- [ ] Token refresh works

**Family Tree (if implemented)**
- [ ] Tree still displays
- [ ] Relationships load
- [ ] Can navigate tree

**Expected:**
- ✅ All existing features functional
- ✅ No conflicts with subscription code
- ✅ Performance not degraded

---

## 10. Test Report Template

After completing all tests, create `SUBSCRIPTION_SYSTEM_TEST_REPORT.md`:

```markdown
# Subscription System Test Report

**Date:** [Today's date]  
**Tester:** [Your name]  
**Systems Tested:** Backend API + Frontend UI  
**Test Duration:** [Total time spent]

---

## Executive Summary

- **Total Tests:** [Number]
- **Passed:** [Number] ([Percentage]%)
- **Failed:** [Number] ([Percentage]%)
- **Blocked:** [Number]
- **Overall Status:** ✅ PASS / ⚠️ PARTIAL / ❌ FAIL

---

## Test Results by Category

### 1. Automated API Tests (8 tests)
- Passed: [X/8]
- Failed: [Y/8]
- Details: See API_TEST_RESULTS.txt

### 2. Admin Dashboard Tests (20 tests)
- Passed: [X/20]
- Failed: [Y/20]
- Critical Issues: [List any]

### 3. Member Mobile View Tests (15 tests)
- Passed: [X/15]
- Failed: [Y/15]
- Critical Issues: [List any]

### 4. Integration Tests (3 flows)
- Passed: [X/3]
- Failed: [Y/3]

### 5. Performance Tests
- All < target: ✅ / ⚠️ / ❌
- Slowest operation: [Name] ([Time]ms)

### 6. Security Tests (4 tests)
- Passed: [X/4]
- Failed: [Y/4]
- Vulnerabilities: [List any]

### 7. Error Handling Tests (4 tests)
- Passed: [X/4]
- Failed: [Y/4]

### 8. Data Accuracy Tests (3 tests)
- Passed: [X/3]
- Failed: [Y/3]

### 9. Regression Tests (5 tests)
- Passed: [X/5]
- Failed: [Y/5]

---

## Issues Found

### Critical (Blocks Release)
1. [Issue description]
   - Severity: Critical
   - Steps to reproduce: [...]
   - Expected: [...]
   - Actual: [...]

### Major (Should Fix Before Release)
1. [Issue description]

### Minor (Can Fix Post-Release)
1. [Issue description]

---

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

---

## Sign-Off

**Ready for Production:** ✅ YES / ❌ NO  
**Conditions:** [List any conditions if conditional approval]

**Tester Signature:** [Your name]  
**Date:** [Date]
```

---

## Testing Best Practices

1. **Test in order:** API → Admin UI → Member UI → Integration
2. **Document everything:** Take screenshots of issues
3. **Don't skip steps:** Even if it seems obvious
4. **Test on real devices:** Not just browser DevTools
5. **Verify data in database:** Don't trust UI alone
6. **Test with real accounts:** Use actual member data
7. **Clear cache between tests:** Avoid false positives
8. **Report clearly:** Include steps to reproduce

---

## Support Resources

- Backend Logs: https://dashboard.render.com
- Database: Supabase dashboard (oneiggrfzagqjbkdinin)
- Frontend Logs: Browser DevTools Console
- API Docs: FILE_7_SUBSCRIPTION_API_INTEGRATION_GUIDE.md

---

**Good luck testing! Be thorough.** 🧪✅
```

---

## ✅ Definition of Done:

Your testing is complete when:

1. ✅ All 8 automated API tests passed
2. ✅ All admin dashboard tests passed (or documented issues)
3. ✅ All member mobile tests passed (or documented issues)
4. ✅ Integration tests show end-to-end flows work
5. ✅ Performance meets targets (< 2s dashboard, < 1s API)
6. ✅ Security tests confirm proper authorization
7. ✅ Error handling works correctly
8. ✅ Data accuracy verified in database
9. ✅ Regression tests show no broken features
10. ✅ Complete test report created
11. ✅ API integration guide written (FILE #7)
12. ✅ Testing guide written (FILE #8)

---

## 🚀 Final Deliverables:

Submit these files:
1. `test_results.txt` (automated test output)
2. `API_TEST_RESULTS_[DATE].md` (detailed API results)
3. `SUBSCRIPTION_SYSTEM_TEST_REPORT.md` (complete report)
4. `FILE_7_SUBSCRIPTION_API_INTEGRATION_GUIDE.md`
5. `FILE_8_SUBSCRIPTION_TESTING_GUIDE.md`
6. Screenshots of any issues found

---

## 📞 Support:

If you encounter issues:
- Check if backend/frontend are actually deployed
- Verify test account credentials
- Review browser console for errors
- Check database directly in Supabase
- Contact engineers if systems are down

---

## 🎯 Success Criteria:

- System is stable and production-ready
- All critical tests pass
- Performance meets requirements
- No security vulnerabilities
- Documentation is complete and accurate

---

**TIME TO TEST: 60 minutes**

**Test thoroughly. Document clearly. Ship confidently.** 🧪✅
