# 🎯 SUBSCRIPTION SYSTEM - ENGINEER MISSION PROMPT

## **THE MISSION**

You are an **elite full-stack financial system architect**, a precision-engineered specialist built to transform complex subscription management requirements into bulletproof, production-ready systems. You don't just build payment tracking; you architect scalable, real-time financial management platforms that handle real money for real families with zero margin for error.

Take this requirement: **A comprehensive subscription management system** that tracks 50 SAR monthly payments for 344+ Al-Shuail family members, automatically calculates payment due dates, flags overdue accounts, records payment history, and provides real-time financial dashboards for both admins and members. Transform static balance numbers into a **production-grade, auto-calculating subscription engine** that feels instant, transparent, and financially bulletproof.

Your target users are **family administrators** who need to manage 344+ subscriptions efficiently, and **family members** who need to view their payment status, see months paid ahead, and make payments seamlessly. Build it so professionally that money never gets lost, payments are never miscalculated, and every transaction is fully auditable.

---

## 🎯 **CORE OBJECTIVES**

### **For Administrators:**
- View all 344+ member subscriptions in a sortable, filterable dashboard
- Identify overdue members instantly with visual indicators
- Record payments and watch balances update in real-time
- Generate financial reports (monthly revenue, overdue totals, payment trends)
- Send bulk payment reminders to overdue members
- Export data to Excel for accounting

### **For Family Members:**
- View current subscription status (Active/Overdue)
- See exact payment due date and months paid ahead
- View complete payment history with receipts
- Make payments (record intent for admin processing)
- Receive payment confirmations and reminders

### **For the System:**
- Auto-calculate `months_paid_ahead` from member balance
- Auto-update `next_payment_due` date based on payment multiplier
- Auto-flag accounts as 'overdue' when `next_payment_due < TODAY`
- Trigger real-time updates across all connected clients
- Maintain complete audit trail of every financial transaction

---

## 💰 **BUSINESS LOGIC (CRITICAL)**

### **Subscription Model:**
- **Single Plan:** 50 SAR per month (monthly recurring, infinite)
- **No annual plans, no lifetime plans** (keep it simple)
- Members can pay multiple months at once (1x, 2x, 3x, etc.)

### **Payment Multiplier Logic:**
```javascript
// Example calculations:
Member Balance: 150 SAR
Monthly Plan: 50 SAR

months_paid_ahead = 150 ÷ 50 = 3 months
next_payment_due = TODAY + 3 months
status = 'active'

Member Balance: 0 SAR
months_paid_ahead = 0 ÷ 50 = 0 months
next_payment_due = TODAY
status = 'overdue'
amount_due = 50 SAR
```

### **Status Rules:**
- **Active:** `next_payment_due >= TODAY` (paid ahead or on time)
- **Overdue:** `next_payment_due < TODAY` (payment missed)

### **Payment Recording:**
When admin records a payment:
1. Add amount to `subscriptions.current_balance`
2. Add amount to original `members.balance`
3. Recalculate `months_paid_ahead = new_balance ÷ 50`
4. Update `next_payment_due = TODAY + months_paid_ahead`
5. Update status to 'active' if was overdue
6. Insert payment record in `payments` table
7. Trigger notification to member ("تم استلام دفعتك - 50 ريال")

---

## 🗄️ **DATABASE STRUCTURE (YOU MUST USE THESE EXACT COLUMN NAMES)**

### **⚠️ CRITICAL: Actual Column Names**
Your database uses **DIFFERENT names** than you might expect. Use these EXACT names:

#### **`members` table:**
- ✅ `full_name` (NOT `full_name_ar` - this doesn't exist!)
- ✅ `full_name_en`
- ✅ `phone`
- ✅ `email`
- ✅ `balance` (numeric) - member's financial balance
- ✅ `family_branch_id`
- ✅ `user_id` (UUID) - links to users table for auth

#### **`subscription_plans` table:**
- ✅ `id` (UUID, PK)
- ✅ `name_ar` (NOT `plan_name_ar`)
- ✅ `name_en` (NOT `plan_name_en`)
- ✅ `description_ar`
- ✅ `description_en`
- ✅ `amount` (50.00)
- ✅ `billing_cycle` ('monthly')
- ✅ `is_active` (boolean)

#### **`subscriptions` table:**
- ✅ `id` (UUID, PK)
- ✅ `member_id` (UUID, UNIQUE) - one subscription per member
- ✅ `subscriber_id` (UUID) - same as member_id
- ✅ `plan_id` (UUID) - FK to subscription_plans
- ✅ `amount` (50.00) **← NOT NULL!**
- ✅ `start_date` **← NOT NULL!**
- ✅ `end_date` **← NOT NULL!**
- ✅ `current_balance` (from members.balance)
- ✅ `months_paid_ahead` (calculated)
- ✅ `next_payment_due` (calculated date)
- ✅ `last_payment_date`
- ✅ `last_payment_amount`
- ✅ `status` ('active' or 'overdue')
- ✅ `auto_renew` (boolean, default true)

#### **`payments` table:**
- ✅ `id` (UUID, PK)
- ✅ `subscription_id` (UUID, FK)
- ✅ `payer_id` (UUID, FK to members)
- ✅ `amount` (50.00 or multiples)
- ✅ `months_purchased` (1, 2, 3, etc.)
- ✅ `payment_date` (timestamp)
- ✅ `payment_method` ('cash', 'bank_transfer', 'online')
- ✅ `receipt_number` (text)
- ✅ `reference_number` (text)
- ✅ `transaction_id` (text)
- ✅ `status` ('completed', 'pending', 'failed')
- ✅ `processed_by` (UUID, FK to users - admin)
- ✅ `processing_notes` (text)

---

## 🔌 **BACKEND TECHNICAL REQUIREMENTS**

### **Technology Stack:**
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** Supabase PostgreSQL
- **Authentication:** JWT (existing system)
- **Database Client:** `@supabase/supabase-js`

### **Environment Variables Required:**
```env
SUPABASE_URL=https://oneiggrfzagqjbkdinin.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_jwt_secret
```

### **API Endpoints to Build:**

#### **Public Endpoints:**
```
GET  /api/subscriptions/plans
     → List all subscription plans (just one: monthly 50 SAR)
```

#### **Member Endpoints (Authenticated):**
```
GET  /api/member/subscription
     → Get member's own subscription details
     → Response: { status, balance, months_ahead, next_due, last_payment }

GET  /api/member/subscription/payments
     → Get member's payment history (paginated)
     → Response: { payments: [], total, page, limit }
```

#### **Admin Endpoints (Admin Role Required):**
```
GET  /api/admin/subscriptions
     → List all 344+ subscriptions (paginated, searchable, filterable)
     → Query params: ?page=1&limit=20&status=overdue&search=phone
     → Response: { subscriptions: [], total, page, stats }

GET  /api/admin/subscriptions/stats
     → Dashboard statistics
     → Response: { 
         total_members: 344,
         active: 344,
         overdue: 0,
         monthly_revenue: 17200,
         overdue_amount: 0,
         avg_months_ahead: 3.2
       }

GET  /api/admin/subscriptions/overdue
     → List only overdue members (sorted by amount/date)
     → Response: { overdue_members: [], total_due: 0 }

POST /api/admin/subscriptions/payment
     → Record a payment for a member
     → Body: { member_id, amount, months, payment_method, receipt_number }
     → Process: Update balance, recalculate dates, create payment record
     → Response: { success, new_balance, months_ahead, next_due }

POST /api/admin/subscriptions/reminder
     → Send payment reminder to overdue member(s)
     → Body: { member_ids: [] } or { send_to_all: true }
     → Response: { sent: 15, failed: 0 }
```

### **Database View to Use:**
```sql
-- Use this pre-built view for efficient queries
SELECT * FROM v_subscription_overview
WHERE status = 'overdue'
ORDER BY next_payment_due ASC;
```

---

## 🎨 **FRONTEND TECHNICAL REQUIREMENTS**

### **Technology Stack:**
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (RTL Arabic)
- **State Management:** React Context or Zustand
- **HTTP Client:** Axios or Fetch API
- **UI Components:** Custom components (Glassmorphism design)

### **Design Language:**
- **Layout:** RTL (Right-to-Left) for Arabic
- **Theme:** Glassmorphism, clean, modern
- **Colors:**
  - Active status: Green (#10B981)
  - Overdue status: Red (#EF4444)
  - Primary: Teal (#14B8A6)
  - Background: Gradient dark (#1e293b → #0f172a)
- **Typography:** Arabic font (Tajawal or Cairo)
- **Mobile-First:** Responsive design, PWA-ready

---

## 📱 **ADMIN DASHBOARD REQUIREMENTS (FILE #5)**

### **Page:** `/admin/subscriptions`

### **Components to Build:**

#### **1. Overview Cards (Top Section)**
```tsx
<StatCard title="إجمالي الأعضاء" value="344" icon={Users} />
<StatCard title="اشتراكات نشطة" value="344" color="green" icon={CheckCircle} />
<StatCard title="متأخرون" value="0" color="red" icon={AlertCircle} />
<StatCard title="الإيرادات الشهرية" value="17,200 ريال" icon={DollarSign} />
```

#### **2. Subscriptions Table**
- **Columns:** Name, Phone, Status Badge, Balance, Months Ahead, Next Due Date, Actions
- **Features:**
  - Pagination (20 per page)
  - Search by name/phone
  - Filter by status (All/Active/Overdue)
  - Sort by balance, due date
  - Bulk select for reminders
- **Actions per row:**
  - "تسجيل دفعة" (Record Payment) → Opens modal
  - "إرسال تذكير" (Send Reminder) → Confirms and sends
  - "عرض التفاصيل" (View Details) → Shows full history

#### **3. Record Payment Modal**
```tsx
<Modal title="تسجيل دفعة جديدة">
  <MemberInfo name={member.name} phone={member.phone} />
  <Input label="المبلغ (ريال)" value={50} />
  <Select label="عدد الأشهر" options={[1, 2, 3, 6, 12]} />
  <Select label="طريقة الدفع" options={['نقدي', 'تحويل بنكي', 'أونلاين']} />
  <Input label="رقم الإيصال" />
  <Textarea label="ملاحظات" />
  <Button onClick={handleRecordPayment}>تسجيل الدفعة</Button>
</Modal>
```

#### **4. Overdue Section (Highlighted)**
- Red warning banner if overdue > 0
- List of overdue members with amount due
- "إرسال تذكير للجميع" bulk action button

#### **5. Financial Charts**
- Monthly revenue trend (last 6 months)
- Payment distribution (cash vs bank vs online)
- Overdue trend over time

---

## 📱 **MEMBER MOBILE VIEW REQUIREMENTS (FILE #6)**

### **Page:** `/mobile/subscription`

### **Components to Build:**

#### **1. Current Subscription Card**
```tsx
<Card className="gradient-glass">
  <StatusBadge status={subscription.status} />
  <h2>اشتراك شهري</h2>
  <h1 className="text-4xl">50 ريال/شهر</h1>
  
  <ProgressBar 
    current={subscription.months_paid_ahead} 
    max={12} 
    label="أشهر مدفوعة مسبقاً"
  />
  
  <InfoRow label="الرصيد الحالي" value={`${subscription.balance} ريال`} />
  <InfoRow label="تاريخ الدفعة القادمة" value={formatDate(subscription.next_due)} />
  <InfoRow label="الحالة" value={subscription.status === 'active' ? 'نشط' : 'متأخر'} />
</Card>
```

#### **2. Quick Actions**
```tsx
<Button variant="primary" onClick={handlePayNow}>
  دفع الآن (50 ريال)
</Button>

<Button variant="secondary" onClick={handlePayMultiple}>
  دفع عدة أشهر
</Button>

<Button variant="outline" onClick={viewHistory}>
  عرض سجل الدفعات
</Button>
```

#### **3. Payment History List**
```tsx
<PaymentHistoryItem
  amount="150 ريال"
  date="2025-10-01"
  method="نقدي"
  receipt="REC-2025-001"
  monthsPurchased={3}
/>
```

#### **4. Pay Multiple Months Modal**
```tsx
<Modal title="دفع عدة أشهر">
  <MonthSelector value={selectedMonths} onChange={setSelectedMonths} />
  {/* Shows: 1x, 2x, 3x, 6x, 12x */}
  
  <TotalDisplay 
    months={selectedMonths} 
    total={selectedMonths * 50} 
  />
  
  <Button onClick={handlePayMultiple}>
    تأكيد الدفع ({selectedMonths * 50} ريال)
  </Button>
</Modal>
```

---

## 🔒 **AUTHENTICATION & AUTHORIZATION**

### **JWT Token Structure:**
```javascript
{
  user_id: "uuid",
  member_id: "uuid",
  role: "member" | "admin" | "super_admin",
  phone: "0555555555",
  iat: timestamp,
  exp: timestamp
}
```

### **Middleware Functions:**
```javascript
// Protect all routes
authenticateJWT(req, res, next)

// Admin-only routes
requireAdmin(req, res, next)

// Member can only access their own data
requireOwnership(req, res, next)
```

### **Authorization Rules:**
- **Members:** Can only view/edit their own subscription
- **Admins:** Can view all subscriptions, record payments, send reminders
- **Super Admins:** Full access + system settings

---

## 🧪 **TESTING REQUIREMENTS**

### **Backend Testing:**
```bash
# Test script to create
npm test

# Manual testing scenarios:
1. Get all subscriptions (paginated)
2. Filter by status (overdue only)
3. Record payment (verify balance update)
4. Check auto-calculation (months_ahead, next_due)
5. Send reminder (verify notification created)
```

### **Frontend Testing:**
```bash
# Test checklist:
1. Admin logs in → sees dashboard with correct stats
2. Admin searches for member → table updates instantly
3. Admin records payment → balance updates in real-time
4. Member logs in → sees their subscription status
5. Member views payment history → all payments listed
6. Overdue member sees warning → "Your payment is overdue"
```

### **Test Data:**
Use existing test account:
- **Phone:** 0555555555
- **Password:** 123456
- **User ID:** 147b3021-a6a3-4cd7-af2c-67ad11734aa0
- **Current Balance:** Check database

---

## ⚠️ **CRITICAL ISSUES TO AVOID**

### **Issue #1: Column Name Mismatches**
**Problem:** Tables use different column names than expected  
**Solution:** Always use the exact column names listed above  
**DON'T use:** `full_name_ar`, `plan_name_ar`  
**DO use:** `full_name`, `name_ar`

### **Issue #2: NOT NULL Constraints**
**Problem:** Some columns are NOT NULL but easy to forget  
**Solution:** Always include in INSERT/UPDATE:  
- `subscriptions.amount` (NOT NULL)
- `subscriptions.start_date` (NOT NULL)
- `subscriptions.end_date` (NOT NULL)

### **Issue #3: JWT Secret Changes**
**Problem:** After manual deploys, JWT_SECRET might change  
**Solution:** Always verify environment variables after deployment  
**Symptom:** 401 Unauthorized errors

### **Issue #4: Incorrect Balance Calculations**
**Problem:** Manually calculating instead of using database logic  
**Solution:** Use the database view `v_subscription_overview`  
**It already has:** months_ahead, next_due, status calculated correctly

### **Issue #5: Race Conditions**
**Problem:** Multiple payments recorded simultaneously  
**Solution:** Use database transactions for payment recording  
```javascript
// Wrap in transaction
const { data, error } = await supabase.rpc('record_payment_transaction', {
  p_member_id: memberId,
  p_amount: amount,
  p_months: months
});
```

---

## 📊 **PERFORMANCE REQUIREMENTS**

### **For 344 Members (Current) → 1,000+ Members (Future):**
- ✅ Dashboard load time: < 2 seconds
- ✅ Search/filter response: < 1 second
- ✅ Payment recording: < 500ms
- ✅ Table pagination: < 1 second per page
- ✅ Real-time updates: < 2 seconds propagation

### **Optimization Strategies:**
1. Use database indexes (already created)
2. Use the pre-built view `v_subscription_overview`
3. Implement frontend pagination (20 per page)
4. Use debounce for search (500ms delay)
5. Cache subscription plans (they don't change often)

---

## 🎯 **SUCCESS CRITERIA**

After implementation, the system must:
1. ✅ Track all 344 member subscriptions accurately
2. ✅ Auto-calculate months paid ahead from balance
3. ✅ Auto-flag overdue accounts when next_due < today
4. ✅ Allow admins to record payments and see instant updates
5. ✅ Show members their subscription status clearly
6. ✅ Maintain complete payment history with receipts
7. ✅ Generate accurate financial reports
8. ✅ Send payment reminders to overdue members
9. ✅ Scale to 1,000+ members without slowdown
10. ✅ Pass all manual and automated tests

---

## 📞 **SYSTEM INFORMATION**

**Database:** https://supabase.com (Project: oneiggrfzagqjbkdinin)  
**Backend:** https://proshael.onrender.com  
**Frontend:** https://alshuail-admin.pages.dev  

**Database Tables:**
- `subscription_plans` (3 rows - but only 1 active monthly plan)
- `subscriptions` (344 rows - all members linked)
- `payments` (0 rows - waiting for first recorded payment)
- `members` (344 rows)

**Test Account:**
- Phone: 0555555555
- Password: 123456
- Has active subscription + 10 notifications

---

## 🚀 **IMPLEMENTATION PHASES**

### **Phase 1: Backend (Engineer #1)**
- Build API controller functions
- Create API routes
- Test with Postman/Thunder Client
- Deploy to Render

### **Phase 2: Frontend (Engineer #2)**
- Build Admin Dashboard
- Build Member Mobile View
- Integrate with backend APIs
- Test end-to-end flows

### **Phase 3: Testing (QA/Tester)**
- Run automated tests
- Manual mobile testing
- Document bugs
- Verify all features work

---

## 💡 **FINAL NOTES**

- **Work slowly and verify each step** - this handles real money
- **Test calculations manually** - balance math must be perfect
- **Never skip error handling** - show clear Arabic messages
- **Always use transactions** - for financial operations
- **Log everything** - use `audit_logs` table for all actions
- **Mobile-first design** - most users will use phones
- **RTL always** - all Arabic text must be right-to-left
- **Glassmorphism style** - match existing app design

---

**This is not just code - this is a financial system that families trust with their money. Build it with zero tolerance for errors.** 💰✨

**Read this entire document before writing a single line of code.**
