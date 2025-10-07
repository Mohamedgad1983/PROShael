# 🎨 Give Engineer #2 (Frontend):

## 📄 Files to Deliver:

1. **📘 SUBSCRIPTION_MISSION_PROMPT.md** (read this first)
2. **📄 FILE_5_ADMIN_SUBSCRIPTION_DASHBOARD.tsx**
3. **📄 FILE_6_MEMBER_SUBSCRIPTION_VIEW.tsx**
4. **📄 test_subscriptions_ui.sh** (for testing)

---

## 🎯 Task:
**"Implement Phase 3 (Frontend Integration)"**

---

## ⏱️ Time Estimate:
**120 minutes** (2 hours)

---

## ⚠️ Wait for:
**Backend deployment complete** (Engineer #1 must finish first)

---

## 📋 Detailed Instructions:

### **What You're Building:**
Two complete UI interfaces:
1. **Admin Dashboard** - Manage 344+ subscriptions, record payments, send reminders
2. **Member Mobile View** - View subscription status, payment history, make payments

Both must integrate with the backend API that Engineer #1 deployed at:
`https://proshael.onrender.com/api/subscriptions`

---

### **PHASE 1: Verify Backend is Ready (5 minutes)**

Before writing any code, test the backend:

```bash
# Test 1: Get subscription plans (should work)
curl -X GET "https://proshael.onrender.com/api/subscriptions/plans"

# Test 2: Get stats (requires admin token)
curl -X GET "https://proshael.onrender.com/api/subscriptions/admin/subscriptions/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected:**
- ✅ Plans endpoint returns data
- ✅ Stats endpoint returns dashboard numbers

If backend is not responding, **STOP** and wait for Engineer #1.

---

### **PHASE 2: Build Admin Dashboard (60 minutes)**

**File to create:** `frontend/src/pages/admin/SubscriptionDashboard.tsx`

**Location:** Place in your React project under `src/pages/admin/`

#### **Component Structure:**

```tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SubscriptionStats {
  total_members: number;
  active: number;
  overdue: number;
  monthly_revenue: number;
  overdue_amount: number;
  avg_months_ahead: number;
}

interface Subscription {
  member_id: string;
  full_name: string;
  phone: string;
  status: 'active' | 'overdue';
  current_balance: number;
  months_paid_ahead: number;
  next_payment_due: string;
  last_payment_date?: string;
}

const SubscriptionDashboard: React.FC = () => {
  // State management
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue'>('all');
  
  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Subscription | null>(null);
  
  // API configuration
  const API_BASE = 'https://proshael.onrender.com/api/subscriptions';
  const token = localStorage.getItem('token'); // JWT token
  
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  // Fetch dashboard stats
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/admin/subscriptions/stats`, axiosConfig);
      setStats(data);
    } catch (error) {
      console.error('فشل في تحميل الإحصائيات:', error);
    }
  };

  // Fetch subscriptions with pagination and filters
  useEffect(() => {
    fetchSubscriptions();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });
      
      const { data } = await axios.get(
        `${API_BASE}/admin/subscriptions?${params}`,
        axiosConfig
      );
      
      setSubscriptions(data.subscriptions);
      setTotalPages(Math.ceil(data.total / 20));
    } catch (error) {
      console.error('فشل في تحميل الاشتراكات:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle payment recording
  const handleRecordPayment = async (paymentData: {
    amount: number;
    months: number;
    payment_method: string;
    receipt_number: string;
    notes: string;
  }) => {
    if (!selectedMember) return;
    
    try {
      const { data } = await axios.post(
        `${API_BASE}/admin/subscriptions/payment`,
        {
          member_id: selectedMember.member_id,
          ...paymentData
        },
        axiosConfig
      );
      
      // Show success message
      alert(`تم تسجيل الدفعة بنجاح!\nالرصيد الجديد: ${data.new_balance} ريال\nأشهر مدفوعة: ${data.months_ahead}`);
      
      // Refresh data
      fetchStats();
      fetchSubscriptions();
      setShowPaymentModal(false);
    } catch (error) {
      console.error('فشل في تسجيل الدفعة:', error);
      alert('حدث خطأ أثناء تسجيل الدفعة');
    }
  };

  // Handle sending reminder
  const handleSendReminder = async (memberId: string) => {
    try {
      const { data } = await axios.post(
        `${API_BASE}/admin/subscriptions/reminder`,
        { member_ids: [memberId] },
        axiosConfig
      );
      
      alert(`تم إرسال التذكير بنجاح! (${data.sent} رسالة)`);
    } catch (error) {
      console.error('فشل في إرسال التذكير:', error);
      alert('حدث خطأ أثناء إرسال التذكير');
    }
  };

  return (
    <div className="subscription-dashboard rtl" dir="rtl">
      {/* Overview Stats Cards */}
      <div className="stats-grid grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="إجمالي الأعضاء"
          value={stats?.total_members || 0}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="اشتراكات نشطة"
          value={stats?.active || 0}
          icon="✅"
          color="green"
        />
        <StatCard
          title="متأخرون"
          value={stats?.overdue || 0}
          icon="⚠️"
          color="red"
        />
        <StatCard
          title="الإيرادات الشهرية"
          value={`${stats?.monthly_revenue || 0} ريال`}
          icon="💰"
          color="teal"
        />
      </div>

      {/* Filters and Search */}
      <div className="filters-section bg-white/10 backdrop-blur-lg rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60"
          />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 rounded-lg bg-white/20 text-white"
          >
            <option value="all">الكل</option>
            <option value="active">نشط</option>
            <option value="overdue">متأخر</option>
          </select>
          
          <button
            onClick={() => fetchSubscriptions()}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg text-white"
          >
            🔄 تحديث
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="table-section bg-white/10 backdrop-blur-lg rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="p-4 text-right">الاسم</th>
              <th className="p-4 text-right">الهاتف</th>
              <th className="p-4 text-center">الحالة</th>
              <th className="p-4 text-right">الرصيد</th>
              <th className="p-4 text-right">أشهر مدفوعة</th>
              <th className="p-4 text-right">الدفعة القادمة</th>
              <th className="p-4 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-white/60">
                  جاري التحميل...
                </td>
              </tr>
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-white/60">
                  لا توجد نتائج
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => (
                <tr key={sub.member_id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="p-4">{sub.full_name}</td>
                  <td className="p-4 font-mono">{sub.phone}</td>
                  <td className="p-4 text-center">
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="p-4">{sub.current_balance} ريال</td>
                  <td className="p-4">{sub.months_paid_ahead} شهر</td>
                  <td className="p-4">{formatDate(sub.next_payment_due)}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => {
                        setSelectedMember(sub);
                        setShowPaymentModal(true);
                      }}
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded text-white text-sm mr-2"
                    >
                      تسجيل دفعة
                    </button>
                    {sub.status === 'overdue' && (
                      <button
                        onClick={() => handleSendReminder(sub.member_id)}
                        className="px-3 py-1 bg-orange-500 hover:bg-orange-600 rounded text-white text-sm"
                      >
                        إرسال تذكير
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination flex justify-center gap-2 mt-6">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded disabled:opacity-50"
        >
          السابق
        </button>
        <span className="px-4 py-2 bg-white/20 rounded">
          صفحة {currentPage} من {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded disabled:opacity-50"
        >
          التالي
        </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedMember && (
        <PaymentModal
          member={selectedMember}
          onSubmit={handleRecordPayment}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div className={`stat-card bg-gradient-to-br from-${color}-500/20 to-${color}-600/10 backdrop-blur-lg rounded-lg p-6 border border-${color}-500/30`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white/60 text-sm mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white">{value}</h3>
      </div>
      <span className="text-4xl">{icon}</span>
    </div>
  </div>
);

// Status Badge Component
const StatusBadge: React.FC<{ status: 'active' | 'overdue' }> = ({ status }) => (
  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
    status === 'active' 
      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
      : 'bg-red-500/20 text-red-400 border border-red-500/30'
  }`}>
    {status === 'active' ? 'نشط ✓' : 'متأخر ⚠️'}
  </span>
);

// Payment Modal Component
const PaymentModal: React.FC<{
  member: Subscription;
  onSubmit: (data: any) => void;
  onClose: () => void;
}> = ({ member, onSubmit, onClose }) => {
  const [amount, setAmount] = useState(50);
  const [months, setMonths] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setAmount(months * 50);
  }, [months]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ amount, months, payment_method: paymentMethod, receipt_number: receiptNumber, notes });
  };

  return (
    <div className="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="modal-content bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-white mb-4">تسجيل دفعة جديدة</h2>
        
        <div className="member-info bg-white/10 rounded-lg p-4 mb-4">
          <p className="text-white"><strong>الاسم:</strong> {member.full_name}</p>
          <p className="text-white"><strong>الهاتف:</strong> {member.phone}</p>
          <p className="text-white"><strong>الرصيد الحالي:</strong> {member.current_balance} ريال</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white mb-2">عدد الأشهر</label>
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20"
              required
            >
              <option value={1}>1 شهر (50 ريال)</option>
              <option value={2}>2 شهر (100 ريال)</option>
              <option value={3}>3 أشهر (150 ريال)</option>
              <option value={6}>6 أشهر (300 ريال)</option>
              <option value={12}>12 شهر (600 ريال)</option>
            </select>
          </div>

          <div>
            <label className="block text-white mb-2">المبلغ (ريال)</label>
            <input
              type="number"
              value={amount}
              readOnly
              className="w-full px-4 py-2 rounded-lg bg-white/5 text-white border border-white/20"
            />
          </div>

          <div>
            <label className="block text-white mb-2">طريقة الدفع</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20"
              required
            >
              <option value="cash">نقدي</option>
              <option value="bank_transfer">تحويل بنكي</option>
              <option value="online">دفع أونلاين</option>
            </select>
          </div>

          <div>
            <label className="block text-white mb-2">رقم الإيصال</label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="REC-2025-001"
              className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20"
            />
          </div>

          <div>
            <label className="block text-white mb-2">ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="ملاحظات إضافية..."
              className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white font-medium"
            >
              تسجيل الدفعة
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper function to format dates
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA');
};

export default SubscriptionDashboard;
```

---

### **PHASE 3: Build Member Mobile View (50 minutes)**

**File to create:** `frontend/src/pages/mobile/MemberSubscriptionView.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface MemberSubscription {
  status: 'active' | 'overdue';
  current_balance: number;
  months_paid_ahead: number;
  next_payment_due: string;
  last_payment_date?: string;
  last_payment_amount?: number;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  receipt_number?: string;
  months_purchased: number;
}

const MemberSubscriptionView: React.FC = () => {
  const [subscription, setSubscription] = useState<MemberSubscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);

  const API_BASE = 'https://proshael.onrender.com/api/subscriptions';
  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  useEffect(() => {
    fetchSubscription();
    fetchPaymentHistory();
  }, []);

  const fetchSubscription = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/member/subscription`, axiosConfig);
      setSubscription(data.subscription);
    } catch (error) {
      console.error('فشل في تحميل الاشتراك:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/member/subscription/payments?limit=10`, axiosConfig);
      setPayments(data.payments);
    } catch (error) {
      console.error('فشل في تحميل السجل:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-xl">جاري التحميل...</div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-xl">لم يتم العثور على اشتراك</div>
      </div>
    );
  }

  const isOverdue = subscription.status === 'overdue';
  const daysUntilDue = Math.ceil(
    (new Date(subscription.next_payment_due).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="member-subscription-view rtl min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-6">
        {/* Subscription Status Card */}
        <div className={`subscription-card backdrop-blur-lg rounded-2xl p-6 border-2 ${
          isOverdue 
            ? 'bg-red-500/10 border-red-500/30' 
            : 'bg-green-500/10 border-green-500/30'
        }`}>
          {/* Status Badge */}
          <div className="flex justify-between items-center mb-4">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              isOverdue
                ? 'bg-red-500/20 text-red-400'
                : 'bg-green-500/20 text-green-400'
            }`}>
              {isOverdue ? '⚠️ متأخر' : '✅ نشط'}
            </span>
            <button
              onClick={() => fetchSubscription()}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
            >
              🔄
            </button>
          </div>

          {/* Plan Info */}
          <div className="text-center mb-6">
            <h2 className="text-white/60 text-sm mb-2">اشتراك شهري</h2>
            <h1 className="text-5xl font-bold text-white mb-2">50 ريال</h1>
            <p className="text-white/40 text-sm">لكل شهر</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-white/60 text-sm mb-2">
              <span>أشهر مدفوعة مسبقاً</span>
              <span>{subscription.months_paid_ahead} شهر</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverdue ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (subscription.months_paid_ahead / 12) * 100)}%` }}
              />
            </div>
          </div>

          {/* Info Grid */}
          <div className="space-y-3">
            <InfoRow
              label="الرصيد الحالي"
              value={`${subscription.current_balance} ريال`}
              highlight
            />
            <InfoRow
              label="تاريخ الدفعة القادمة"
              value={formatDate(subscription.next_payment_due)}
              subtext={isOverdue ? `متأخر بـ ${Math.abs(daysUntilDue)} يوم` : `بعد ${daysUntilDue} يوم`}
            />
            {subscription.last_payment_date && (
              <InfoRow
                label="آخر دفعة"
                value={`${subscription.last_payment_amount} ريال`}
                subtext={formatDate(subscription.last_payment_date)}
              />
            )}
          </div>

          {/* Warning if overdue */}
          {isOverdue && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              ⚠️ اشتراكك متأخر. يرجى الدفع في أقرب وقت للحفاظ على الخدمات.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => setShowPayModal(true)}
            className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 rounded-xl text-white font-medium text-lg shadow-lg"
          >
            💳 دفع الآن
          </button>
          
          <button
            onClick={() => setShowPayModal(true)}
            className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium"
          >
            📅 دفع عدة أشهر
          </button>
        </div>

        {/* Payment History */}
        <div className="payment-history bg-white/5 backdrop-blur-lg rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <span className="mr-2">📋</span>
            سجل الدفعات
          </h3>

          {payments.length === 0 ? (
            <p className="text-white/40 text-center py-8">لا توجد دفعات سابقة</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <PaymentHistoryItem key={payment.id} payment={payment} />
              ))}
            </div>
          )}

          {payments.length > 0 && (
            <button className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">
              عرض المزيد
            </button>
          )}
        </div>
      </div>

      {/* Pay Multiple Months Modal */}
      {showPayModal && (
        <PayMultipleModal
          onClose={() => setShowPayModal(false)}
          onConfirm={(months) => {
            alert(`سيتم توجيهك لدفع ${months} شهر (${months * 50} ريال)`);
            setShowPayModal(false);
          }}
        />
      )}
    </div>
  );
};

// Info Row Component
const InfoRow: React.FC<{
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
}> = ({ label, value, subtext, highlight }) => (
  <div className={`flex justify-between items-center py-2 ${highlight ? 'bg-white/5 px-3 rounded-lg' : ''}`}>
    <span className="text-white/60 text-sm">{label}</span>
    <div className="text-right">
      <div className="text-white font-medium">{value}</div>
      {subtext && <div className="text-white/40 text-xs">{subtext}</div>}
    </div>
  </div>
);

// Payment History Item Component
const PaymentHistoryItem: React.FC<{ payment: Payment }> = ({ payment }) => (
  <div className="payment-item bg-white/5 rounded-lg p-4 border border-white/10">
    <div className="flex justify-between items-start mb-2">
      <div>
        <div className="text-white font-medium text-lg">{payment.amount} ريال</div>
        <div className="text-white/40 text-sm">{payment.months_purchased} شهر</div>
      </div>
      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
        مكتمل ✓
      </span>
    </div>
    <div className="flex justify-between text-white/60 text-sm">
      <span>{formatDate(payment.payment_date)}</span>
      <span>{getPaymentMethodLabel(payment.payment_method)}</span>
    </div>
    {payment.receipt_number && (
      <div className="text-white/40 text-xs mt-2">إيصال: {payment.receipt_number}</div>
    )}
  </div>
);

// Pay Multiple Modal Component
const PayMultipleModal: React.FC<{
  onClose: () => void;
  onConfirm: (months: number) => void;
}> = ({ onClose, onConfirm }) => {
  const [selectedMonths, setSelectedMonths] = useState(1);

  const monthOptions = [
    { months: 1, label: '1 شهر', amount: 50 },
    { months: 2, label: '2 شهر', amount: 100 },
    { months: 3, label: '3 أشهر', amount: 150 },
    { months: 6, label: '6 أشهر', amount: 300 },
    { months: 12, label: '12 شهر', amount: 600 },
  ];

  return (
    <div className="modal-overlay fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="modal-content bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">دفع عدة أشهر</h2>

        <div className="space-y-3 mb-6">
          {monthOptions.map((option) => (
            <button
              key={option.months}
              onClick={() => setSelectedMonths(option.months)}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                selectedMonths === option.months
                  ? 'bg-teal-500/20 border-teal-500 text-white'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{option.label}</span>
                <span className="text-xl font-bold">{option.amount} ريال</span>
              </div>
            </button>
          ))}
        </div>

        <div className="bg-white/10 rounded-lg p-4 mb-6">
          <div className="flex justify-between text-white text-lg font-medium">
            <span>المجموع:</span>
            <span>{selectedMonths * 50} ريال</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(selectedMonths)}
            className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 rounded-xl text-white font-medium"
          >
            تأكيد الدفع
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl text-white font-medium"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper Functions
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
};

const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    cash: 'نقدي',
    bank_transfer: 'تحويل بنكي',
    online: 'أونلاين'
  };
  return labels[method] || method;
};

export default MemberSubscriptionView;
```

---

### **PHASE 4: Create Test Script (5 minutes)**

**File to create:** `test_subscriptions_ui.sh`

```bash
#!/bin/bash

echo "=========================================="
echo "SUBSCRIPTION UI TESTING CHECKLIST"
echo "=========================================="

echo "
✅ ADMIN DASHBOARD TESTS:

1. Dashboard loads with correct stats (344 members, 0 overdue, revenue)
2. Subscriptions table shows all 344 members (paginated)
3. Search by name works (type '0555555555' in search)
4. Filter by status works (select 'overdue')
5. Record payment modal opens when clicking 'تسجيل دفعة'
6. Payment recording works and balance updates
7. Send reminder button works (for overdue members)
8. Pagination works (next/previous buttons)
9. Stats cards refresh after payment
10. Table refreshes automatically after payment

✅ MEMBER MOBILE VIEW TESTS:

1. Subscription card shows correct status (active/overdue)
2. Balance displays correctly
3. Months paid ahead shows correct number
4. Next payment due date is correct
5. Progress bar matches months paid
6. Payment history loads (if any payments exist)
7. 'دفع الآن' button opens modal
8. Multiple months modal shows options (1-12 months)
9. Total amount calculates correctly (months × 50)
10. UI is responsive on mobile (test on phone)

✅ INTEGRATION TESTS:

1. Admin records payment → Member sees updated balance instantly
2. Member goes overdue → Admin sees in overdue list
3. Admin sends reminder → Member receives notification
4. Payment history matches in both admin and member views
5. All Arabic text displays correctly (RTL)

✅ PERFORMANCE TESTS:

1. Dashboard loads in < 2 seconds
2. Search responds in < 1 second
3. Payment recording completes in < 500ms
4. Table pagination is smooth
5. No console errors in browser

✅ ERROR HANDLING TESTS:

1. Invalid token shows proper error message
2. Network error shows retry option
3. Payment failure shows clear Arabic message
4. Missing data handled gracefully
"

echo "
=========================================="
echo "MANUAL TESTING STEPS:"
echo "=========================================="

echo "
1. Open Admin Dashboard:
   https://alshuail-admin.pages.dev/admin/subscriptions

2. Login as admin (if required)

3. Verify dashboard loads correctly

4. Test recording a payment for test account:
   - Phone: 0555555555
   - Amount: 150 SAR (3 months)
   - Method: Cash

5. Open Member View on mobile device:
   https://alshuail-admin.pages.dev/mobile/subscription

6. Login as member (0555555555 / 123456)

7. Verify subscription status updated

8. Check payment appears in history

9. Test multiple months modal

10. Take screenshots of both views
"

echo "
=========================================="
echo "READY TO TEST!"
echo "=========================================="
```

**Make executable:**
```bash
chmod +x test_subscriptions_ui.sh
```

---

## ✅ Definition of Done:

Your frontend is complete when:

1. ✅ Admin dashboard loads and displays all 344 members
2. ✅ Dashboard stats show correct numbers
3. ✅ Search and filter functionality works
4. ✅ Payment modal opens and records payments successfully
5. ✅ Balances update in real-time after payment
6. ✅ Member mobile view displays subscription status
7. ✅ Payment history loads correctly
8. ✅ All UI is RTL (right-to-left) Arabic
9. ✅ Glassmorphism design matches existing app style
10. ✅ Responsive on desktop and mobile devices
11. ✅ No console errors in browser
12. ✅ All API calls complete successfully

---

## 🚀 Deployment Steps:

1. **Build React app:**
```bash
npm run build
```

2. **Deploy to Cloudflare Pages:**
```bash
# Push to GitHub
git add .
git commit -m "Add subscription system frontend"
git push

# Auto-deploy via Cloudflare Pages
# URL: https://alshuail-admin.pages.dev
```

3. **Test production URLs:**
   - Admin: https://alshuail-admin.pages.dev/admin/subscriptions
   - Member: https://alshuail-admin.pages.dev/mobile/subscription

4. **Verify API calls work in production** (check Network tab in browser DevTools)

---

## 📞 Support:

If you encounter issues:
- Check browser console for JavaScript errors
- Verify API responses in Network tab
- Test backend endpoints directly with test script
- Ensure JWT token is valid (re-login if needed)
- Check CORS settings if API calls fail

---

## 🎯 Success Criteria:

- UI is beautiful and professional
- All interactions feel instant and smooth
- Arabic text is clear and readable
- Mobile experience is excellent
- Admin can manage all 344 members efficiently
- Members can see their status clearly

---

**TIME TO BUILD: 120 minutes**

**Make it beautiful. Make it work perfectly.** ðŸŽ¨âœ¨
