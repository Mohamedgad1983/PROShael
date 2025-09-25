# 📱 Member & Subscription System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Member Mobile Application](#member-mobile-application)
3. [Subscription System](#subscription-system)
4. [Payment Processing](#payment-processing)
5. [Member Management (Admin Side)](#member-management-admin-side)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [UI Components](#ui-components)
9. [Business Rules](#business-rules)
10. [Testing Guide](#testing-guide)

---

## Overview

The Al-Shuail Family Management System includes a comprehensive member and subscription management platform with two main interfaces:

### 1. Member Mobile App (`/member` route)
- **Purpose**: Mobile-first interface for family members
- **Access**: Phone number + password authentication
- **Features**: Balance management, payments, notifications, subscriptions
- **Design**: Premium glassmorphic UI with Arabic RTL support

### 2. Admin Dashboard Member Section
- **Purpose**: Administrative control over members
- **Access**: Admin login required
- **Features**: Member CRUD, import/export, subscription management
- **Design**: Apple-inspired premium interface

---

## Member Mobile Application

### Access Points
```
URL: https://alshuail-admin.pages.dev/member
Local: http://localhost:3002/member
```

### Key Features

#### 1. Balance Management System
```javascript
// Minimum Balance Requirement
const MINIMUM_BALANCE = 3000; // SAR

// Balance Status Colors
if (balance >= 3000) {
  color = 'green';  // Sufficient funds
  status = 'جيد';
} else {
  color = 'red';    // Needs top-up
  status = 'رصيد منخفض';
  showWarning = true;
}
```

#### 2. Member Data Structure
```javascript
const memberProfile = {
  // Personal Information
  memberId: 'MEM001',
  name: 'أحمد محمد الشعيل',
  phone: '0501234567',
  nationalId: '1234567890', // Encrypted

  // Financial Information
  balance: 2500,
  minimumBalance: 3000,
  totalContributions: 45000,
  yearlyContribution: 12000,
  monthlyAverage: 1000,

  // Subscription Details
  currentSubscription: {
    id: 'SUB001',
    type: 'monthly',
    amount: 150,
    quantity: 3,
    status: 'active',
    nextDueDate: '2024-01-01',
    hijriNextDue: '1445-06-18'
  },

  // Family Information
  familyBranch: 'الفرع الأول',
  generation: 3,
  memberSince: '2020-01-01',
  contributionRank: 12
};
```

### Navigation Structure
```
Bottom Navigation:
├── 🏠 Home (Notifications Center)
├── 📊 Dashboard (Statistics)
├── 🎉 Events (Occasions & Meetings)
├── 💳 Payments (Transactions)
└── ⚙️ Settings (Profile & Preferences)
```

### Notification System

#### Three Notification Categories:

##### 1. Occasions (المناسبات)
```javascript
{
  type: 'occasion_invitation',
  category: 'wedding',
  title: 'دعوة زواج',
  member: 'محمد أحمد الشعيل',
  date: '2024-01-15',
  location: 'قاعة الملكية',
  rsvpRequired: true,
  color: 'purple'
}
```

##### 2. Initiatives (المبادرات)
```javascript
{
  type: 'initiative',
  title: 'مبادرة بناء مسجد',
  target: 500000,
  collected: 350000,
  percentage: 70,
  deadline: '2024-02-01',
  minimumContribution: 50,
  color: 'green'
}
```

##### 3. Diyas (الديات)
```javascript
{
  type: 'diya',
  caseNumber: 'D2024-001',
  totalAmount: 1000000,
  collected: 600000,
  urgency: 'high',
  deadline: '2024-01-20',
  beneficiary: 'عائلة المتضرر',
  color: 'amber'
}
```

---

## Subscription System

### Subscription Types

#### 1. Monthly Subscription (الاشتراك الشهري)
```javascript
const monthlySubscription = {
  type: 'monthly',
  baseAmount: 50,        // Per unit
  minimumQuantity: 1,
  maximumQuantity: 10,
  billingCycle: 30,      // Days
  autoRenew: true,
  gracePeriod: 7         // Days
};
```

#### 2. Annual Subscription (الاشتراك السنوي)
```javascript
const annualSubscription = {
  type: 'annual',
  baseAmount: 500,       // Per unit
  minimumQuantity: 1,
  maximumQuantity: 5,
  billingCycle: 365,     // Days
  autoRenew: true,
  discount: 0.17,        // 17% discount vs monthly
  gracePeriod: 30        // Days
};
```

### Subscription Management Features

#### Quantity Selection
```javascript
// UI Component for quantity selection
<div className="subscription-selector">
  <button onClick={() => decreaseQuantity()}>-</button>
  <span>{quantity} وحدات</span>
  <button onClick={() => increaseQuantity()}>+</button>

  <div className="total-amount">
    المجموع: {quantity * baseAmount} ريال
  </div>
</div>
```

#### Auto-Renewal Logic
```javascript
async function processAutoRenewal(subscription) {
  if (subscription.autoRenew && subscription.status === 'active') {
    const today = new Date();
    const dueDate = new Date(subscription.nextDueDate);

    if (today >= dueDate) {
      const amount = subscription.quantity * subscription.amount;

      if (member.balance >= amount) {
        // Process renewal
        await deductBalance(member.id, amount);
        await updateSubscription(subscription.id, {
          nextDueDate: addDays(dueDate, subscription.billingCycle),
          lastPaymentDate: today
        });

        // Send notification
        await sendNotification(member.id, 'subscription_renewed');
      } else {
        // Insufficient balance
        await updateSubscription(subscription.id, {
          status: 'pending_payment'
        });
        await sendNotification(member.id, 'subscription_payment_failed');
      }
    }
  }
}
```

---

## Payment Processing

### Payment Types

#### 1. Subscription Payments
```javascript
const subscriptionPayment = {
  type: 'subscription',
  subscriptionId: 'SUB001',
  amount: 450,  // 3 units × 150
  frequency: 'monthly',
  autoDeduct: true,
  nextDue: '2024-02-01'
};
```

#### 2. Initiative Contributions
```javascript
const initiativePayment = {
  type: 'initiative',
  initiativeId: 'INIT001',
  amount: 500,
  minimumAmount: 50,
  anonymous: false,
  dedicatedTo: 'والدي رحمه الله'
};
```

#### 3. Diya Contributions
```javascript
const diyaPayment = {
  type: 'diya',
  caseId: 'D2024-001',
  amount: 1000,
  urgent: true,
  shareWithFamily: true
};
```

#### 4. Member-to-Member Transfer
```javascript
const memberTransfer = {
  type: 'transfer',
  fromMember: 'MEM001',
  toMember: 'MEM002',
  amount: 200,
  reason: 'مساعدة',
  note: 'دعم شهري'
};
```

### Payment Flow

#### Multi-Step Payment Modal
```javascript
const PaymentModal = () => {
  const [step, setStep] = useState(1);

  return (
    <Modal>
      {step === 1 && <SelectPaymentType />}
      {step === 2 && <SelectRecipient />}
      {step === 3 && <EnterAmount />}
      {step === 4 && <AddNote />}
      {step === 5 && <AttachReceipt />}
      {step === 6 && <ReviewPayment />}
      {step === 7 && <PaymentSuccess />}
    </Modal>
  );
};
```

### Pay-on-Behalf Feature
```javascript
// Member search and selection
const searchMembers = async (query) => {
  const results = await api.searchMembers(query);
  return results.filter(member =>
    member.name.includes(query) ||
    member.phone.includes(query) ||
    member.memberId.includes(query)
  );
};

// Auto-fill selected member details
const selectMemberForPayment = (member) => {
  setPaymentData({
    onBehalfOf: member.memberId,
    memberName: member.name,
    memberPhone: member.phone,
    memberBalance: member.balance,
    memberStatus: member.subscriptionStatus
  });
};
```

---

## Member Management (Admin Side)

### Component Structure
```
src/components/Members/
├── EnhancedMembersManagement.jsx    # Main container
├── PremiumRegistration.tsx          # 5-step registration
├── PremiumImportMembers.jsx         # Excel/CSV import
├── PremiumExportMembers.jsx         # Data export
└── MemberDetailsModal.jsx           # View/Edit member
```

### Registration Process

#### 5-Step Registration Wizard
```javascript
const registrationSteps = [
  {
    step: 1,
    title: 'المعلومات الشخصية',
    fields: ['fullName', 'nationalId', 'dateOfBirth', 'gender']
  },
  {
    step: 2,
    title: 'معلومات الاتصال',
    fields: ['phoneNumber', 'whatsappNumber', 'email', 'address']
  },
  {
    step: 3,
    title: 'معلومات العائلة',
    fields: ['familyBranch', 'generation', 'maritalStatus', 'children']
  },
  {
    step: 4,
    title: 'المعلومات المهنية',
    fields: ['occupation', 'employer', 'income', 'education']
  },
  {
    step: 5,
    title: 'معلومات الاشتراك',
    fields: ['subscriptionType', 'quantity', 'paymentMethod', 'startDate']
  }
];
```

### Import/Export Features

#### Excel Import Columns
```
Required Columns:
- الاسم الكامل (Full Name)
- رقم الهاتف (Phone Number)
- رقم العضوية (Member ID)

Optional Columns:
- رقم الواتساب (WhatsApp)
- البريد الإلكتروني (Email)
- العنوان (Address)
- نوع الاشتراك (Subscription Type)
- كمية الاشتراك (Subscription Quantity)
```

#### Export Formats
- **Excel (.xlsx)**: Full data with formatting
- **CSV**: Plain text, comma-separated
- **JSON**: Structured data for APIs
- **PDF**: Formatted reports with Arabic support

---

## Database Schema

### Members Table
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  national_id VARCHAR(20) ENCRYPTED,
  phone_number VARCHAR(20) NOT NULL,
  whatsapp_number VARCHAR(20),
  email VARCHAR(255),

  -- Financial
  balance DECIMAL(10,2) DEFAULT 0,
  total_contributions DECIMAL(12,2) DEFAULT 0,

  -- Family Info
  family_branch VARCHAR(100),
  generation INTEGER,

  -- Dates
  date_of_birth DATE,
  hijri_birth_date VARCHAR(20),
  member_since DATE DEFAULT CURRENT_DATE,

  -- Status
  status VARCHAR(20) DEFAULT 'active',
  subscription_status VARCHAR(20) DEFAULT 'pending',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  subscription_type VARCHAR(20) NOT NULL, -- monthly, annual
  quantity INTEGER DEFAULT 1,
  amount DECIMAL(10,2) NOT NULL,

  -- Billing
  start_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  last_payment_date DATE,

  -- Status
  status VARCHAR(20) DEFAULT 'active',
  auto_renew BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),

  -- Transaction Details
  type VARCHAR(30) NOT NULL, -- subscription, initiative, diya, transfer
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2),

  -- References
  subscription_id UUID REFERENCES subscriptions(id),
  initiative_id UUID,
  diya_id UUID,
  transfer_to_member UUID REFERENCES members(id),

  -- Receipt
  receipt_url TEXT,
  receipt_uploaded_at TIMESTAMP,

  -- Metadata
  description TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### Authentication
```javascript
// Member Login
POST /api/auth/member-login
{
  phone: "0501234567",
  password: "password123"
}

// Response
{
  token: "jwt_token",
  member: { ... },
  subscription: { ... }
}
```

### Member Operations
```javascript
// Get Member Profile
GET /api/members/profile
Headers: { Authorization: "Bearer token" }

// Update Profile
PUT /api/members/profile
{
  email: "new@email.com",
  address: "New Address"
}

// Get Balance
GET /api/members/balance

// Get Transactions
GET /api/members/transactions?limit=50&offset=0
```

### Subscription Management
```javascript
// Get Current Subscription
GET /api/subscriptions/current

// Update Subscription
PUT /api/subscriptions/current
{
  quantity: 5,
  autoRenew: true
}

// Cancel Subscription
DELETE /api/subscriptions/current

// Renew Subscription
POST /api/subscriptions/renew
{
  subscriptionId: "SUB001",
  periods: 1
}
```

### Payment Processing
```javascript
// Process Payment
POST /api/payments/process
{
  type: "subscription",
  amount: 450,
  subscriptionId: "SUB001"
}

// Upload Receipt
POST /api/payments/{paymentId}/receipt
FormData: { receipt: File }

// Get Payment History
GET /api/payments/history
```

### Admin Endpoints
```javascript
// List All Members
GET /api/admin/members?page=1&limit=50

// Create Member
POST /api/admin/members
{
  fullName: "أحمد محمد",
  phone: "0501234567",
  subscriptionType: "monthly",
  quantity: 3
}

// Update Member
PUT /api/admin/members/{memberId}

// Delete Member
DELETE /api/admin/members/{memberId}

// Bulk Import
POST /api/admin/members/import
FormData: { file: Excel/CSV }

// Export Members
GET /api/admin/members/export?format=excel
```

---

## UI Components

### Member Mobile Components

#### 1. Enhanced Balance Card
```jsx
const EnhancedBalanceCard = ({ balance, minimum }) => {
  const isLow = balance < minimum;

  return (
    <div className={`balance-card ${isLow ? 'low-balance' : 'good-balance'}`}>
      <div className="balance-header">
        <span className="label">رصيدك الحالي</span>
        {isLow && <span className="warning-badge">رصيد منخفض</span>}
      </div>

      <div className="balance-amount">
        <span className="currency">ريال</span>
        <span className="amount">{balance.toLocaleString()}</span>
      </div>

      <div className="minimum-indicator">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(balance/minimum)*100}%` }}
          />
        </div>
        <span className="minimum-label">
          الحد الأدنى: {minimum.toLocaleString()} ريال
        </span>
      </div>

      <div className="action-buttons">
        <button className="pay-button">دفع</button>
        <button className="statement-button">كشف حساب</button>
      </div>
    </div>
  );
};
```

#### 2. Subscription Card
```jsx
const SubscriptionCard = ({ subscription }) => {
  return (
    <div className="subscription-card glass-card">
      <div className="subscription-header">
        <h3>اشتراكك الحالي</h3>
        <span className={`status ${subscription.status}`}>
          {subscription.status === 'active' ? 'نشط' : 'معلق'}
        </span>
      </div>

      <div className="subscription-details">
        <div className="detail-row">
          <span className="label">النوع:</span>
          <span className="value">
            {subscription.type === 'monthly' ? 'شهري' : 'سنوي'}
          </span>
        </div>

        <div className="detail-row">
          <span className="label">الكمية:</span>
          <div className="quantity-selector">
            <button onClick={decrease}>-</button>
            <span>{subscription.quantity}</span>
            <button onClick={increase}>+</button>
          </div>
        </div>

        <div className="detail-row">
          <span className="label">المبلغ الشهري:</span>
          <span className="value">
            {subscription.quantity * subscription.amount} ريال
          </span>
        </div>

        <div className="detail-row">
          <span className="label">الاستحقاق القادم:</span>
          <span className="value">{formatDate(subscription.nextDueDate)}</span>
        </div>
      </div>

      <div className="subscription-actions">
        <button className="renew-button">تجديد</button>
        <button className="cancel-button">إلغاء</button>
      </div>
    </div>
  );
};
```

#### 3. Payment Modal Steps
```jsx
const PaymentSteps = {
  // Step 1: Payment Type Selection
  PaymentTypeStep: () => (
    <div className="payment-types">
      <button className="type-card" onClick={() => selectType('subscription')}>
        <Icon name="subscription" />
        <span>اشتراك</span>
      </button>
      <button className="type-card" onClick={() => selectType('initiative')}>
        <Icon name="charity" />
        <span>مبادرة</span>
      </button>
      <button className="type-card" onClick={() => selectType('diya')}>
        <Icon name="justice" />
        <span>دية</span>
      </button>
      <button className="type-card" onClick={() => selectType('transfer')}>
        <Icon name="transfer" />
        <span>تحويل</span>
      </button>
    </div>
  ),

  // Step 2: Amount Entry
  AmountStep: () => (
    <div className="amount-entry">
      <input
        type="number"
        placeholder="المبلغ بالريال"
        min={minimumAmount}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <span className="minimum-note">
        الحد الأدنى: {minimumAmount} ريال
      </span>
    </div>
  ),

  // Step 3: Success Animation
  SuccessStep: () => (
    <div className="success-animation">
      <div className="checkmark-circle">
        <svg className="checkmark" viewBox="0 0 52 52">
          <circle className="checkmark-circle" cx="26" cy="26" r="25" />
          <path className="checkmark-check" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
        </svg>
      </div>
      <h3>تم الدفع بنجاح</h3>
      <p>المبلغ: {amount} ريال</p>
      <p>الرقم المرجعي: {referenceNumber}</p>
    </div>
  )
};
```

---

## Business Rules

### Subscription Rules
1. **Minimum Balance**: Members must maintain 3000 SAR
2. **Grace Period**: 7 days for monthly, 30 days for annual
3. **Auto-renewal**: Enabled by default, can be disabled
4. **Quantity Limits**: 1-10 units for monthly, 1-5 for annual
5. **Payment Methods**: Direct deduction from balance only

### Payment Rules
1. **Initiative Minimum**: 50 SAR
2. **Diya Contributions**: No maximum limit
3. **Transfer Limits**: Cannot transfer if balance < 3000 SAR after transfer
4. **Receipt Required**: For amounts > 1000 SAR

### Member Status Rules
```javascript
const memberStatusRules = {
  active: {
    conditions: [
      'subscription.status === "active"',
      'balance >= 0',
      'lastPayment < 90 days'
    ]
  },
  suspended: {
    conditions: [
      'subscription.status === "expired"',
      'gracePeriod exceeded'
    ],
    actions: ['sendReminder', 'restrictAccess']
  },
  inactive: {
    conditions: [
      'lastLogin > 180 days',
      'no transactions in 6 months'
    ]
  }
};
```

---

## Testing Guide

### Test Scenarios

#### 1. Member Registration Flow
```javascript
describe('Member Registration', () => {
  it('should complete 5-step registration', () => {
    // Step 1: Personal Info
    fillPersonalInfo();
    clickNext();

    // Step 2: Contact Info
    fillContactInfo();
    validatePhoneFormat();
    clickNext();

    // Step 3: Family Info
    selectFamilyBranch();
    clickNext();

    // Step 4: Professional Info
    fillProfessionalInfo();
    clickNext();

    // Step 5: Subscription
    selectSubscriptionType('monthly');
    setQuantity(3);
    clickSubmit();

    expect(successMessage).toBeVisible();
  });
});
```

#### 2. Payment Processing
```javascript
describe('Payment Processing', () => {
  it('should process subscription payment', () => {
    login();
    navigateToPayments();

    selectPaymentType('subscription');
    verifyAmount(450); // 3 × 150

    attachReceipt('receipt.jpg');
    confirmPayment();

    expect(balance).toBeLessThan(previousBalance);
    expect(transaction).toBeInHistory();
  });
});
```

#### 3. Balance Management
```javascript
describe('Balance Management', () => {
  it('should show warning when balance < 3000', () => {
    setMemberBalance(2500);

    expect(balanceCard).toHaveClass('low-balance');
    expect(warningBadge).toBeVisible();
    expect(warningText).toBe('رصيد منخفض');
  });
});
```

### Test Data

#### Sample Members
```javascript
const testMembers = [
  {
    memberId: 'TEST001',
    name: 'أحمد التجريبي',
    phone: '0501234567',
    balance: 5000,
    subscriptionType: 'monthly',
    quantity: 3
  },
  {
    memberId: 'TEST002',
    name: 'محمد التجريبي',
    phone: '0507654321',
    balance: 2000, // Below minimum
    subscriptionType: 'annual',
    quantity: 1
  }
];
```

### API Testing
```bash
# Test member login
curl -X POST http://localhost:5001/api/auth/member-login \
  -H "Content-Type: application/json" \
  -d '{"phone":"0501234567","password":"test123"}'

# Test balance check
curl http://localhost:5001/api/members/balance \
  -H "Authorization: Bearer {token}"

# Test payment processing
curl -X POST http://localhost:5001/api/payments/process \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"type":"subscription","amount":450}'
```

---

## Security Considerations

### Data Protection
- **National IDs**: Encrypted at rest
- **Passwords**: Bcrypt hashed with salt rounds
- **Tokens**: JWT with 24-hour expiry
- **Sessions**: Secure HTTP-only cookies

### Payment Security
- **Receipt Validation**: File type and size checks
- **Amount Validation**: Server-side verification
- **Double-payment Prevention**: Transaction idempotency keys
- **Audit Trail**: All transactions logged

### Access Control
```javascript
const permissions = {
  member: [
    'view:own-profile',
    'edit:own-profile',
    'view:own-balance',
    'create:payment',
    'view:own-transactions'
  ],
  admin: [
    'view:all-members',
    'edit:all-members',
    'create:member',
    'delete:member',
    'export:members',
    'manage:subscriptions'
  ]
};
```

---

## Troubleshooting

### Common Issues

#### 1. Balance Not Updating
```javascript
// Check transaction status
const checkTransaction = async (transactionId) => {
  const tx = await getTransaction(transactionId);

  if (tx.status === 'pending') {
    console.log('Transaction still processing');
  } else if (tx.status === 'failed') {
    console.log('Transaction failed:', tx.error);
  }
};
```

#### 2. Subscription Auto-renewal Failed
```javascript
// Manual renewal process
const manualRenew = async (subscriptionId) => {
  try {
    await api.post(`/subscriptions/${subscriptionId}/renew`);
  } catch (error) {
    if (error.code === 'INSUFFICIENT_BALANCE') {
      alert('الرصيد غير كافي');
    }
  }
};
```

#### 3. Import Validation Errors
```
Common Excel Import Issues:
- Phone format: Must be 10 digits starting with 05
- Names: No special characters except spaces
- Member IDs: Must be unique
- Date formats: Use YYYY-MM-DD
```

---

## Future Enhancements

### Planned Features
1. **SMS Integration**: OTP verification and notifications
2. **Payment Gateway**: External payment methods (Apple Pay, Mada)
3. **Family Tree Visualization**: Interactive family connections
4. **Document Management**: Upload and store member documents
5. **Advanced Analytics**: Contribution patterns and predictions
6. **Mobile Apps**: Native iOS/Android applications
7. **Recurring Payments**: Automated subscription billing
8. **Member Portal**: Web-based member self-service

### API Improvements
1. GraphQL endpoint for flexible queries
2. WebSocket for real-time notifications
3. Batch operations for bulk updates
4. Webhook system for external integrations

---

## Contact & Support

### Development Team
- **Frontend**: React + TypeScript
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Supabase)
- **Deployment**: Cloudflare Pages + Render

### Resources
- **Live App**: https://alshuail-admin.pages.dev
- **GitHub**: https://github.com/Mohamedgad1983/PROShael
- **API Docs**: Available at `/api/docs`

### Getting Help
For issues or questions:
1. Check this documentation
2. Review the CLAUDE.md file
3. Check GitHub Issues
4. Contact development team

---

*Last Updated: December 25, 2024*
*Version: 1.0.0*