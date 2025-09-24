# 🚀 Senior Backend Developer - Day 5 API Implementation Prompt
## Al-Shuail Family App - Subscription & Payment System

---

## 📋 **PROJECT CONTEXT**

**Project:** تطبيق الشعيل (Al-Shuail Family App) - Kuwait Family Organization Platform  
**Current Phase:** Day 5 - Financial Subscription & Payment System  
**Database Status:** ✅ **COMPLETE** - All tables created and ready  
**Authentication:** ✅ **WORKING** - JWT system with 7 roles implemented  
**Member Management:** ✅ **WORKING** - Progressive registration system functional  

**Admin Credentials:** admin@alshuail.com / Admin123!  
**Database:** Supabase PostgreSQL - Production Ready  

---

## 🎯 **IMPLEMENTATION REQUIREMENTS**

### **Core Business Logic:**
- **Subscription Cost:** 50 Saudi Riyals (SAR) and unlimited multiples only
- **Pay for Others:** Members can pay subscriptions for other members
- **Dual Payment Methods:**
  1. **App Payment** - Direct/instant approval
  2. **Bank Transfer** - Requires admin approval with receipt upload

### **Workflow Requirements:**
1. **Bank Transfer Process:**
   - Member uploads bank receipt (image/PDF)
   - System notifies admins & financial managers via SMS/notifications
   - Admins approve/reject with reason
   - Member gets notified of decision

2. **Financial Reporting:**
   - All transactions tracked in detailed reports
   - Pay-for-others transactions clearly identified
   - Excel export functionality required

---

## 🗄️ **DATABASE SCHEMA (Already Created)**

### **Tables Available:**
- `subscription_plans` - Single plan: 50 SAR base with multiples
- `subscriptions` - Member subscriptions with payer tracking
- `payments` - Payment transactions with auto-generated numbers (SH2025001...)
- `payment_notifications` - Multi-language notification system

### **Key Relationships:**
```sql
subscriptions.member_id → members.id (beneficiary)
subscriptions.subscriber_id → members.id (payer)
payments.payer_id → members.id
payments.beneficiary_id → members.id
```

---

## 🔧 **IMPLEMENTATION TASKS**

### **1. Subscription Management Controller**
**File:** `controllers/subscriptionController.js`

**Required Methods:**
```javascript
// Core subscription operations
async createSubscription(req, res)        // Create new subscription
async getMemberSubscriptions(req, res)    // Get member's subscriptions
async getAllSubscriptions(req, res)       // Admin: get all subscriptions
async renewSubscription(req, res)         // Renew existing subscription
async cancelSubscription(req, res)        // Cancel subscription

// Payment operations
async processPayment(req, res)            // Process app payment
async submitBankTransfer(req, res)        // Submit bank transfer with receipt
async approveBankTransfer(req, res)       // Admin: approve bank transfer
async rejectBankTransfer(req, res)        // Admin: reject bank transfer

// Special features
async payForAnotherMember(req, res)       // Pay subscription for another member
async getPaymentStatus(req, res)          // Check payment status
```

**Key Validation Requirements:**
- Amount must be ≥ 50 SAR and multiple of 50
- Verify member exists before creating subscription
- Check admin/financial_manager roles for approvals
- Validate file uploads (images/PDF, max 5MB)

### **2. Payment Processing Service**
**File:** `services/paymentService.js`

**Required Functions:**
```javascript
class PaymentService {
    async generatePaymentNumber()          // Auto: SH2025001, SH2025002...
    async validateSubscriptionAmount(amount) // Check 50 SAR multiples
    async calculateExpiryDate(startDate, months)
    async processInstantPayment(paymentData)
    async processBankTransfer(paymentData, receiptFile)
    async updatePaymentStatus(paymentId, status, notes)
    async getPaymentHistory(memberId, filters)
}
```

### **3. Notification System**
**File:** `services/notificationService.js`

**Required SMS Integration:**
- Kuwait SMS provider integration
- Admin/financial manager notifications for bank transfers
- Member notifications for payment approval/rejection
- Multi-language support (Arabic/English)

**Notification Templates:**
```javascript
const notificationTemplates = {
    bankTransferSubmitted: {
        admin: {
            ar: 'طلب موافقة: تحويل بنكي بمبلغ {amount} من {memberName}',
            en: 'Approval Request: Bank transfer of {amount} from {memberName}'
        }
    },
    paymentApproved: {
        member: {
            ar: 'تم قبول دفعتك بمبلغ {amount} وتفعيل اشتراكك',
            en: 'Your payment of {amount} approved and subscription activated'
        }
    }
}
```

### **4. File Upload Middleware**
**File:** `middleware/uploadMiddleware.js`

**Requirements:**
- Support: JPG, PNG, GIF, PDF
- Max size: 5MB
- Secure file naming with timestamp
- Store in `/uploads/receipts/`
- Validate file integrity

### **5. Financial Reports Controller**
**File:** `controllers/reportsController.js`

**Required Reports:**
```javascript
async getFinancialTransactionsReport(req, res) // All payment transactions
async getSubscriptionsReport(req, res)         // All subscriptions
async getPayForOthersReport(req, res)          // Pay-for-others analysis
async exportToExcel(req, res)                  // Excel export functionality
async getDashboardStats(req, res)             // Financial dashboard data
```

**Excel Export Requirements:**
- Arabic headers support
- Formatted SAR amounts
- Multiple sheets (transactions, subscriptions, statistics)
- Date range filtering

---

## 🛣️ **API ROUTES STRUCTURE**

### **Subscription Routes** - `/api/subscriptions`
```javascript
// Core subscription management
POST   /                           // Create subscription
GET    /member/:member_id         // Get member subscriptions
GET    /                          // Admin: get all subscriptions
PUT    /:subscription_id/cancel   // Cancel subscription
POST   /:subscription_id/renew    // Renew subscription

// Payment processing
POST   /payments/app              // Process app payment
POST   /payments/bank-transfer    // Submit bank transfer (with file upload)
PUT    /payments/:payment_id/approve // Admin: approve bank transfer
PUT    /payments/:payment_id/reject  // Admin: reject bank transfer

// Special features
POST   /pay-for-member            // Pay for another member
GET    /payments/:payment_id/status // Check payment status
```

### **Reports Routes** - `/api/reports`
```javascript
GET    /financial-transactions    // Financial transactions report
GET    /subscriptions            // Subscriptions report  
GET    /pay-for-others           // Pay-for-others report
GET    /dashboard-stats          // Dashboard statistics
GET    /export-excel             // Excel export
```

---

## 🔐 **AUTHENTICATION & AUTHORIZATION**

### **Role-Based Access Control:**
- **super_admin, admin:** Full access to all endpoints
- **financial_manager:** Payment approvals, financial reports
- **accountant:** Read-only access to financial reports
- **member:** Own subscriptions only, can pay for others
- **guest:** No access to financial features

### **Middleware Requirements:**
```javascript
// Apply to all routes
app.use('/api/subscriptions', authenticateToken);
app.use('/api/reports', authenticateToken);

// Admin-only routes
app.use('/api/subscriptions/payments/:id/approve', requireRole(['admin', 'super_admin', 'financial_manager']));
app.use('/api/reports', requireRole(['admin', 'super_admin', 'financial_manager', 'accountant']));
```

---

## 📱 **SMS INTEGRATION SPECIFICATIONS**

### **Kuwait SMS Provider Setup:**
```javascript
// Environment variables required
SMS_API_KEY=your_sms_api_key
SMS_SENDER_NAME=Al-Shuail
SMS_API_URL=https://sms-provider-api.com/send

// SMS sending function
async function sendSMS(phoneNumber, message) {
    // Implementation with Kuwait SMS provider
    // Support Arabic text encoding
    // Return success/failure status
}
```

### **Notification Scenarios:**
1. **Bank transfer submitted** → Notify all admins/financial managers
2. **Payment approved** → Notify member
3. **Payment rejected** → Notify member with reason
4. **Subscription expiring** → Notify member (future enhancement)

---

## 🧪 **TESTING REQUIREMENTS**

### **Test Scenarios to Implement:**

**1. Basic Subscription Flow:**
```javascript
// Test creating 50 SAR subscription
// Test creating 150 SAR subscription (3x50)
// Verify rejection of 45 SAR or 75 SAR amounts
```

**2. Pay for Others:**
```javascript
// Member A pays 100 SAR subscription for Member B
// Verify transactions show correct payer/beneficiary
// Test reporting shows pay-for-others transactions
```

**3. Bank Transfer Workflow:**
```javascript
// Submit bank transfer with receipt upload
// Verify admin notifications sent
// Test approval process
// Test rejection with reason
// Verify member notifications
```

**4. Financial Reporting:**
```javascript
// Generate transaction reports with date filters
// Export Excel with Arabic support
// Test pay-for-others identification in reports
```

---

## 📊 **SUCCESS CRITERIA**

### **Functional Requirements:**
- ✅ Create subscriptions with 50 SAR multiples validation
- ✅ Process instant app payments
- ✅ Handle bank transfers with admin approval workflow
- ✅ Support pay-for-others with clear tracking
- ✅ Send SMS notifications to admins and members
- ✅ Generate comprehensive financial reports
- ✅ Export data to Excel with Arabic support

### **Technical Requirements:**
- ✅ Proper error handling with Arabic/English messages
- ✅ Input validation for all endpoints
- ✅ Secure file upload handling
- ✅ Role-based authorization throughout
- ✅ Database transactions for payment processing
- ✅ Audit logging for financial operations

### **Performance Requirements:**
- ✅ API responses under 2 seconds
- ✅ File uploads under 30 seconds for 5MB files
- ✅ Excel exports under 10 seconds for 1000+ records
- ✅ SMS notifications sent within 30 seconds

---

## 🔗 **INTEGRATION POINTS**

### **Existing Systems:**
- **Authentication System:** Use existing JWT tokens and role validation
- **Member Management:** Integrate with member lookup and validation
- **Database:** Utilize existing Supabase connection and members table

### **File Storage:**
- Store receipt files in organized folder structure
- Implement file cleanup for rejected payments
- Secure file access with proper permissions

---

## 🎯 **IMMEDIATE DELIVERABLES**

**Priority 1 (Core Features):**
1. Subscription creation with amount validation
2. Payment processing for both methods
3. Bank transfer approval workflow
4. Basic financial reporting

**Priority 2 (Advanced Features):**
5. SMS notification integration
6. Excel export functionality  
7. Pay-for-others special handling
8. Comprehensive error handling

**Priority 3 (Enhancements):**
9. Advanced reporting and analytics
10. Performance optimizations
11. Audit logging
12. API documentation

---

## 🚀 **GET STARTED**

**Current Project Status:**
- Database: ✅ Ready with all tables created
- Authentication: ✅ Working JWT system
- Environment: ✅ Supabase connection established

**Your Starting Point:**
```bash
# Project structure already exists
# Add your new files to:
/controllers/subscriptionController.js
/services/paymentService.js
/services/notificationService.js
/middleware/uploadMiddleware.js
/routes/subscriptions.js
/routes/reports.js
```

**Test Credentials:**
- Admin: admin@alshuail.com / Admin123!
- Database: Already connected and operational

**Ready to implement the complete subscription and payment system!** 🎯

---

*This implementation will complete Day 5 of the Al-Shuail Family App development timeline and provide a fully functional financial management system for the Kuwait family organization.*