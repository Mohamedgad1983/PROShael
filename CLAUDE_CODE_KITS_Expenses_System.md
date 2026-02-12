# 🎯 CLAUDE CODE PROMPT - KITS SPECIFICATION
## Al-Shuail Family Fund - Expenses & Fund Balance System

---

# 📦 KIT 1: DATABASE SCHEMA UPDATES

## Kit Overview
| Property | Value |
|----------|-------|
| Kit Name | `database-fund-balance-schema` |
| Priority | 🔴 HIGH (Execute First) |
| Estimated Time | 15 minutes |
| Dependencies | None |

## Files to Create/Modify

### File 1.1: `database/migrations/001_fund_balance_schema.sql`

```sql
-- =====================================================
-- KIT 1: FUND BALANCE TRACKING SCHEMA
-- Execute in Supabase SQL Editor
-- =====================================================

-- 1. Add diya_type column to distinguish internal vs external diya
ALTER TABLE diya_cases 
ADD COLUMN IF NOT EXISTS diya_type VARCHAR(20) DEFAULT 'external'
CHECK (diya_type IN ('internal', 'external'));

COMMENT ON COLUMN diya_cases.diya_type IS 
'internal = paid from fund subscriptions, external = separate collection';

-- 2. Update your 3 existing internal diya cases
-- IMPORTANT: Replace these IDs with your actual case IDs
UPDATE diya_cases 
SET diya_type = 'internal' 
WHERE case_number IN ('DIYA-001', 'DIYA-002', 'DIYA-003');

-- 3. Add expense_number auto-generation trigger
CREATE OR REPLACE FUNCTION generate_expense_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    seq_num INTEGER;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(expense_number FROM 10) AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM expenses
    WHERE expense_number LIKE 'EXP-' || year_part || '-%';
    
    NEW.expense_number := 'EXP-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_expense_number ON expenses;
CREATE TRIGGER set_expense_number
    BEFORE INSERT ON expenses
    FOR EACH ROW
    WHEN (NEW.expense_number IS NULL)
    EXECUTE FUNCTION generate_expense_number();

-- 4. Create fund_balance_snapshots table for bank reconciliation
CREATE TABLE IF NOT EXISTS fund_balance_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    total_revenue DECIMAL(12,2) NOT NULL,
    total_expenses DECIMAL(12,2) NOT NULL,
    total_internal_diya DECIMAL(12,2) NOT NULL,
    calculated_balance DECIMAL(12,2) NOT NULL,
    bank_statement_balance DECIMAL(12,2),
    variance DECIMAL(12,2),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create real-time fund balance view
CREATE OR REPLACE VIEW vw_fund_balance AS
SELECT 
    COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0) 
        as total_revenue,
    
    COALESCE((SELECT SUM(amount) FROM expenses WHERE status IN ('approved', 'paid')), 0) 
        as total_expenses,
    
    COALESCE((SELECT SUM(amount_paid) FROM diya_cases WHERE diya_type = 'internal' AND status IN ('paid', 'partially_paid', 'completed')), 0) 
        as total_internal_diya,
    
    COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0)
    - COALESCE((SELECT SUM(amount) FROM expenses WHERE status IN ('approved', 'paid')), 0)
    - COALESCE((SELECT SUM(amount_paid) FROM diya_cases WHERE diya_type = 'internal' AND status IN ('paid', 'partially_paid', 'completed')), 0)
        as current_balance,
    
    NOW() as last_calculated;

-- 6. Create RPC function for balance (better performance)
CREATE OR REPLACE FUNCTION get_fund_balance()
RETURNS TABLE (
    total_revenue DECIMAL,
    total_expenses DECIMAL,
    total_internal_diya DECIMAL,
    current_balance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM vw_fund_balance;
END;
$$ LANGUAGE plpgsql;
```

## Verification Query
```sql
-- Run this to verify Kit 1 installation
SELECT * FROM vw_fund_balance;
-- Expected: Shows revenue, expenses, diya, and balance
```

---

# 📦 KIT 2: BACKEND API ROUTES

## Kit Overview
| Property | Value |
|----------|-------|
| Kit Name | `backend-fund-balance-api` |
| Priority | 🔴 HIGH |
| Estimated Time | 30 minutes |
| Dependencies | Kit 1 |

## Files to Create/Modify

### File 2.1: `src/routes/fundBalance.routes.js`

**Location**: `D:\PROShael\alshuail-backend\src\routes\fundBalance.routes.js`

```javascript
import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import * as fundController from '../controllers/fundBalanceController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/fund/balance - Get current fund balance
router.get('/balance', fundController.getFundBalance);

// GET /api/fund/breakdown - Get detailed breakdown
router.get('/breakdown', fundController.getBalanceBreakdown);

// POST /api/fund/snapshot - Create reconciliation snapshot (Financial Manager only)
router.post('/snapshot', requireRole(['financial_manager', 'super_admin']), fundController.createSnapshot);

// GET /api/fund/snapshots - Get all snapshots
router.get('/snapshots', requireRole(['financial_manager', 'super_admin']), fundController.getSnapshots);

export default router;
```

### File 2.2: `src/controllers/fundBalanceController.js`

**Location**: `D:\PROShael\alshuail-backend\src\controllers\fundBalanceController.js`

```javascript
import { supabase } from '../config/supabase.js';

/**
 * GET /api/fund/balance
 * Returns current fund balance with breakdown
 */
export const getFundBalance = async (req, res) => {
  try {
    // Use the database view for accurate calculation
    const { data, error } = await supabase
      .rpc('get_fund_balance');
    
    if (error) throw error;

    const balance = data[0] || {
      total_revenue: 0,
      total_expenses: 0,
      total_internal_diya: 0,
      current_balance: 0
    };

    res.json({
      success: true,
      data: {
        total_revenue: parseFloat(balance.total_revenue) || 0,
        total_expenses: parseFloat(balance.total_expenses) || 0,
        total_internal_diya: parseFloat(balance.total_internal_diya) || 0,
        current_balance: parseFloat(balance.current_balance) || 0,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Fund balance error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      error_ar: 'خطأ في جلب رصيد الصندوق'
    });
  }
};

/**
 * GET /api/fund/breakdown
 * Returns detailed breakdown by category
 */
export const getBalanceBreakdown = async (req, res) => {
  try {
    // Get expenses grouped by category
    const { data: expensesByCategory, error: expError } = await supabase
      .from('expenses')
      .select('expense_category, amount')
      .in('status', ['approved', 'paid']);

    if (expError) throw expError;

    // Group expenses
    const expenseSummary = {};
    expensesByCategory?.forEach(exp => {
      const cat = exp.expense_category || 'other';
      expenseSummary[cat] = (expenseSummary[cat] || 0) + parseFloat(exp.amount || 0);
    });

    // Get internal diya cases
    const { data: diyaCases, error: diyaError } = await supabase
      .from('diya_cases')
      .select('id, case_number, beneficiary_name, amount_paid, status, created_at')
      .eq('diya_type', 'internal')
      .order('created_at', { ascending: false });

    if (diyaError) throw diyaError;

    // Get recent payments (subscriptions)
    const { data: recentPayments, error: payError } = await supabase
      .from('payments')
      .select('id, amount, payment_date, payer_id')
      .eq('status', 'completed')
      .order('payment_date', { ascending: false })
      .limit(10);

    res.json({
      success: true,
      data: {
        expenses_by_category: expenseSummary,
        internal_diya_cases: diyaCases || [],
        recent_subscriptions: recentPayments || []
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/fund/snapshot
 * Create a balance snapshot for bank reconciliation
 */
export const createSnapshot = async (req, res) => {
  try {
    const { bank_statement_balance, notes } = req.body;
    const userId = req.user.id;

    // Get current calculated balance
    const { data: balanceData } = await supabase.rpc('get_fund_balance');
    const balance = balanceData[0];

    const calculatedBalance = parseFloat(balance.current_balance) || 0;
    const bankBalance = parseFloat(bank_statement_balance) || 0;
    const variance = bankBalance - calculatedBalance;

    const { data: snapshot, error } = await supabase
      .from('fund_balance_snapshots')
      .insert([{
        snapshot_date: new Date().toISOString().split('T')[0],
        total_revenue: balance.total_revenue,
        total_expenses: balance.total_expenses,
        total_internal_diya: balance.total_internal_diya,
        calculated_balance: calculatedBalance,
        bank_statement_balance: bankBalance,
        variance: variance,
        notes: notes,
        created_by: userId
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: snapshot,
      reconciliation: {
        matched: variance === 0,
        variance: variance,
        message: variance === 0 
          ? '✅ الرصيد مطابق لكشف الحساب البنكي'
          : `⚠️ يوجد فرق: ${variance.toLocaleString()} ر.س`
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fund/snapshots
 * Get all reconciliation snapshots
 */
export const getSnapshots = async (req, res) => {
  try {
    const { data: snapshots, error } = await supabase
      .from('fund_balance_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({
      success: true,
      data: snapshots
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### File 2.3: `src/routes/index.js` (Update)

**Action**: Add this line to your main routes file

```javascript
// Add this import
import fundBalanceRoutes from './fundBalance.routes.js';

// Add this route
app.use('/api/fund', fundBalanceRoutes);
```

---

# 📦 KIT 3: EXPENSES CONTROLLER UPDATE

## Kit Overview
| Property | Value |
|----------|-------|
| Kit Name | `backend-expenses-with-balance-check` |
| Priority | 🔴 HIGH |
| Estimated Time | 20 minutes |
| Dependencies | Kit 1, Kit 2 |

## Files to Modify

### File 3.1: `src/controllers/expensesController.js`

**Location**: `D:\PROShael\alshuail-backend\src\controllers\expensesController.js`

**Action**: Replace or update the `createExpense` function

```javascript
import { supabase } from '../config/supabase.js';

/**
 * Helper: Get current fund balance
 */
const getCurrentBalance = async () => {
  const { data } = await supabase.rpc('get_fund_balance');
  return parseFloat(data?.[0]?.current_balance) || 0;
};

/**
 * POST /api/expenses
 * Create new expense with balance validation
 */
export const createExpense = async (req, res) => {
  try {
    const {
      title_ar,
      title_en,
      description_ar,
      amount,
      expense_category,
      expense_date,
      paid_to,
      payment_method,
      receipt_number,
      notes
    } = req.body;

    const userId = req.user.id;
    const expenseAmount = parseFloat(amount);

    // ═══════════════════════════════════════════════
    // STEP 1: VALIDATE FUND BALANCE
    // ═══════════════════════════════════════════════
    const currentBalance = await getCurrentBalance();
    
    if (expenseAmount > currentBalance) {
      return res.status(400).json({
        success: false,
        error_ar: 'رصيد الصندوق غير كافي',
        error_en: 'Insufficient fund balance',
        details: {
          current_balance: currentBalance,
          requested_amount: expenseAmount,
          shortage: expenseAmount - currentBalance
        }
      });
    }

    // ═══════════════════════════════════════════════
    // STEP 2: CREATE EXPENSE RECORD
    // ═══════════════════════════════════════════════
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert([{
        title_ar,
        title_en,
        description_ar,
        amount: expenseAmount,
        expense_category,
        expense_date: expense_date || new Date().toISOString().split('T')[0],
        paid_to,
        paid_by: userId,
        payment_method: payment_method || 'bank_transfer',
        receipt_number,
        notes,
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // ═══════════════════════════════════════════════
    // STEP 3: LOG AUDIT TRAIL
    // ═══════════════════════════════════════════════
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      action_type: 'expense_created',
      details: {
        expense_id: expense.id,
        expense_number: expense.expense_number,
        amount: expenseAmount,
        category: expense_category,
        balance_before: currentBalance,
        balance_after: currentBalance - expenseAmount
      }
    }]);

    // ═══════════════════════════════════════════════
    // STEP 4: RETURN SUCCESS WITH BALANCE INFO
    // ═══════════════════════════════════════════════
    const newBalance = currentBalance - expenseAmount;

    res.status(201).json({
      success: true,
      data: expense,
      fund_balance: {
        before: currentBalance,
        deducted: expenseAmount,
        after: newBalance
      },
      message_ar: `تم إنشاء المصروف بنجاح. الرصيد المتبقي: ${newBalance.toLocaleString()} ر.س`,
      message_en: `Expense created. Remaining balance: ${newBalance.toLocaleString()} SAR`
    });

  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      error_ar: 'خطأ في إنشاء المصروف'
    });
  }
};

/**
 * GET /api/expenses
 * Get all expenses with fund balance
 */
export const getExpenses = async (req, res) => {
  try {
    const { category, status, from_date, to_date, page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (category) query = query.eq('expense_category', category);
    if (status) query = query.eq('status', status);
    if (from_date) query = query.gte('expense_date', from_date);
    if (to_date) query = query.lte('expense_date', to_date);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: expenses, count, error } = await query;
    if (error) throw error;

    // Get current fund balance
    const currentBalance = await getCurrentBalance();

    res.json({
      success: true,
      data: expenses,
      fund_balance: currentBalance,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

---

# 📦 KIT 4: FRONTEND - FUND BALANCE CARD COMPONENT

## Kit Overview
| Property | Value |
|----------|-------|
| Kit Name | `frontend-fund-balance-card` |
| Priority | 🟡 MEDIUM |
| Estimated Time | 25 minutes |
| Dependencies | Kit 2 |

## Files to Create

### File 4.1: `src/components/FundBalanceCard.tsx`

**Location**: `D:\PROShael\alshuail-admin-arabic\src\components\FundBalanceCard.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  RefreshCw,
  Droplets 
} from 'lucide-react';
import { apiService } from '../services/api';

interface FundBalanceData {
  total_revenue: number;
  total_expenses: number;
  total_internal_diya: number;
  current_balance: number;
  last_updated: string;
}

interface FundBalanceCardProps {
  onBalanceLoad?: (balance: number) => void;
  refreshTrigger?: number;
  compact?: boolean;
}

const FundBalanceCard: React.FC<FundBalanceCardProps> = ({ 
  onBalanceLoad, 
  refreshTrigger,
  compact = false 
}) => {
  const [data, setData] = useState<FundBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get('/fund/balance');
      if (response.success) {
        setData(response.data);
        onBalanceLoad?.(response.data.current_balance);
      }
    } catch (err: any) {
      setError(err.message || 'خطأ في تحميل الرصيد');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [refreshTrigger]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Loading State
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 
                      backdrop-blur-xl rounded-2xl p-6 border border-white/20
                      animate-pulse">
        <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-white/20 rounded w-2/3"></div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-red-500/20 backdrop-blur-xl rounded-2xl p-6 border border-red-500/30">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={fetchBalance} className="mr-auto text-white/60 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const isLowBalance = (data?.current_balance || 0) < 10000;
  const totalExpensesWithDiya = (data?.total_expenses || 0) + (data?.total_internal_diya || 0);

  // Compact Version
  if (compact) {
    return (
      <div className={`
        flex items-center justify-between p-4 rounded-xl border
        ${isLowBalance 
          ? 'bg-amber-500/20 border-amber-500/30' 
          : 'bg-emerald-500/20 border-emerald-500/30'}
      `}>
        <div className="flex items-center gap-3">
          <Wallet className={`w-5 h-5 ${isLowBalance ? 'text-amber-400' : 'text-emerald-400'}`} />
          <span className="text-white/60 text-sm">رصيد الصندوق:</span>
        </div>
        <span className={`font-bold text-lg ${isLowBalance ? 'text-amber-400' : 'text-emerald-400'}`}>
          {formatCurrency(data?.current_balance || 0)} ر.س
        </span>
      </div>
    );
  }

  // Full Version
  return (
    <div className={`
      bg-gradient-to-br backdrop-blur-xl rounded-2xl p-6 
      border transition-all duration-300 hover:shadow-xl
      ${isLowBalance 
        ? 'from-amber-500/20 to-orange-500/20 border-amber-500/30' 
        : 'from-emerald-500/20 to-teal-500/20 border-white/20'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isLowBalance ? 'bg-amber-500/30' : 'bg-emerald-500/30'}`}>
            <Wallet className={`w-6 h-6 ${isLowBalance ? 'text-amber-400' : 'text-emerald-400'}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">رصيد الصندوق</h3>
            <p className="text-white/60 text-sm">Fund Balance</p>
          </div>
        </div>
        <button 
          onClick={fetchBalance}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="تحديث"
        >
          <RefreshCw className="w-5 h-5 text-white/60 hover:text-white" />
        </button>
      </div>

      {/* Main Balance */}
      <div className="text-center mb-6">
        <p className="text-white/60 text-sm mb-1">الرصيد الحالي</p>
        <p className={`text-4xl font-bold ${isLowBalance ? 'text-amber-400' : 'text-emerald-400'}`}>
          {formatCurrency(data?.current_balance || 0)}
          <span className="text-lg mr-2">ر.س</span>
        </p>
        {isLowBalance && (
          <div className="flex items-center justify-center gap-2 mt-2 text-amber-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>الرصيد منخفض!</span>
          </div>
        )}
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
        {/* Total Revenue */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-white/60 text-xs">إجمالي الإيرادات</span>
          </div>
          <p className="text-green-400 font-bold">
            {formatCurrency(data?.total_revenue || 0)}
          </p>
        </div>

        {/* Total Expenses */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-white/60 text-xs">إجمالي المصروفات</span>
          </div>
          <p className="text-red-400 font-bold">
            {formatCurrency(totalExpensesWithDiya)}
          </p>
        </div>
      </div>

      {/* Internal Diya Breakdown (if exists) */}
      {(data?.total_internal_diya || 0) > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-orange-400" />
              <span className="text-white/60">الديات الداخلية (3 حالات)</span>
            </div>
            <span className="text-orange-400 font-medium">
              {formatCurrency(data?.total_internal_diya || 0)} ر.س
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60 mr-6">مصروفات أخرى</span>
            <span className="text-red-400 font-medium">
              {formatCurrency(data?.total_expenses || 0)} ر.س
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundBalanceCard;
```

---

# 📦 KIT 5: FRONTEND - EXPENSES PAGE UPDATE

## Kit Overview
| Property | Value |
|----------|-------|
| Kit Name | `frontend-expenses-page` |
| Priority | 🟡 MEDIUM |
| Estimated Time | 30 minutes |
| Dependencies | Kit 4 |

## Files to Modify

### File 5.1: `src/pages/admin/ExpensesPage.tsx`

**Location**: `D:\PROShael\alshuail-admin-arabic\src\pages\admin\ExpensesPage.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Download, Filter, Search, 
  Receipt, Edit, Trash2, Eye,
  Building2, Calculator
} from 'lucide-react';
import FundBalanceCard from '../../components/FundBalanceCard';
import CreateExpenseModal from '../../components/CreateExpenseModal';
import BankReconciliationModal from '../../components/BankReconciliationModal';
import { apiService } from '../../services/api';

// Expense Categories
const EXPENSE_CATEGORIES = [
  { id: 'diya_internal', name_ar: 'ديات داخلية', name_en: 'Internal Diya', color: 'orange' },
  { id: 'operational', name_ar: 'تشغيلي', name_en: 'Operational', color: 'blue' },
  { id: 'events', name_ar: 'مناسبات', name_en: 'Events', color: 'purple' },
  { id: 'administrative', name_ar: 'إداري', name_en: 'Administrative', color: 'gray' },
  { id: 'maintenance', name_ar: 'صيانة', name_en: 'Maintenance', color: 'yellow' },
  { id: 'charity', name_ar: 'خيري', name_en: 'Charity', color: 'green' },
  { id: 'emergency', name_ar: 'طوارئ', name_en: 'Emergency', color: 'red' },
  { id: 'other', name_ar: 'أخرى', name_en: 'Other', color: 'slate' }
];

interface Expense {
  id: string;
  expense_number: string;
  title_ar: string;
  title_en?: string;
  amount: number;
  expense_category: string;
  expense_date: string;
  status: string;
  paid_to?: string;
  created_at: string;
}

const ExpensesPage: React.FC = () => {
  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    search: ''
  });

  // Fetch Expenses
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);

      const response = await apiService.get(`/expenses?${params}`);
      if (response.success) {
        setExpenses(response.data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [filters]);

  // Handlers
  const handleExpenseCreated = () => {
    setShowCreateModal(false);
    setRefreshTrigger(prev => prev + 1);
    fetchExpenses();
  };

  const handleReconcileComplete = () => {
    setShowReconcileModal(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const getCategoryInfo = (categoryId: string) => {
    return EXPENSE_CATEGORIES.find(c => c.id === categoryId) || EXPENSE_CATEGORIES[7];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA').format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-green-500/20 text-green-400',
      approved: 'bg-blue-500/20 text-blue-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      rejected: 'bg-red-500/20 text-red-400'
    };
    const labels: Record<string, string> = {
      paid: 'مدفوع',
      approved: 'معتمد',
      pending: 'قيد الانتظار',
      rejected: 'مرفوض'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6" dir="rtl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">المصروفات</h1>
        <p className="text-white/60">إدارة مصروفات الصندوق ومطابقة الحسابات</p>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FUND BALANCE CARD - PROMINENT POSITION                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <FundBalanceCard 
            onBalanceLoad={setCurrentBalance}
            refreshTrigger={refreshTrigger}
          />
        </div>
        
        {/* Bank Reconciliation Quick Access */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/30 rounded-xl">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">مطابقة البنك</h3>
              <p className="text-white/60 text-sm">Bank Reconciliation</p>
            </div>
          </div>
          <p className="text-white/60 text-sm mb-4">
            قارن رصيد الصندوق مع كشف حساب البنك للتأكد من التطابق
          </p>
          <button
            onClick={() => setShowReconcileModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 
                       bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
          >
            <Calculator className="w-5 h-5" />
            تنفيذ المطابقة
          </button>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 
                     text-white rounded-xl transition-colors font-medium shadow-lg"
        >
          <Plus className="w-5 h-5" />
          إضافة مصروف جديد
        </button>

        {/* Category Filter */}
        <select
          value={filters.category}
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
          className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
                     text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">جميع الفئات</option>
          {EXPENSE_CATEGORIES.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name_ar}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
                     text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">جميع الحالات</option>
          <option value="pending">قيد الانتظار</option>
          <option value="approved">معتمد</option>
          <option value="paid">مدفوع</option>
          <option value="rejected">مرفوض</option>
        </select>

        {/* Export Button */}
        <button className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 
                          text-white rounded-xl transition-colors mr-auto">
          <Download className="w-5 h-5" />
          تصدير Excel
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-right text-white/60 font-medium text-sm">رقم المصروف</th>
                <th className="px-6 py-4 text-right text-white/60 font-medium text-sm">الوصف</th>
                <th className="px-6 py-4 text-right text-white/60 font-medium text-sm">الفئة</th>
                <th className="px-6 py-4 text-right text-white/60 font-medium text-sm">المبلغ</th>
                <th className="px-6 py-4 text-right text-white/60 font-medium text-sm">التاريخ</th>
                <th className="px-6 py-4 text-right text-white/60 font-medium text-sm">الحالة</th>
                <th className="px-6 py-4 text-right text-white/60 font-medium text-sm">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3 text-white/60">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-emerald-500 rounded-full animate-spin"></div>
                      جاري التحميل...
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-white/60">
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد مصروفات مسجلة</p>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => {
                  const category = getCategoryInfo(expense.expense_category);
                  return (
                    <tr 
                      key={expense.id} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="text-white font-mono text-sm bg-white/10 px-2 py-1 rounded">
                          {expense.expense_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{expense.title_ar}</p>
                        {expense.paid_to && (
                          <p className="text-white/50 text-xs mt-1">إلى: {expense.paid_to}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium
                          bg-${category.color}-500/20 text-${category.color}-400`}>
                          {category.name_ar}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-red-400 font-bold">
                          -{formatCurrency(expense.amount)} ر.س
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white/60 text-sm">
                        {new Date(expense.expense_date).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(expense.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer - Summary */}
        {expenses.length > 0 && (
          <div className="px-6 py-4 border-t border-white/10 bg-white/5">
            <div className="flex items-center justify-between">
              <span className="text-white/60">
                إجمالي المصروفات المعروضة: {expenses.length}
              </span>
              <span className="text-red-400 font-bold">
                المجموع: -{formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))} ر.س
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateExpenseModal
          currentBalance={currentBalance}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleExpenseCreated}
        />
      )}

      {showReconcileModal && (
        <BankReconciliationModal
          currentBalance={currentBalance}
          onClose={() => setShowReconcileModal(false)}
          onSuccess={handleReconcileComplete}
        />
      )}
    </div>
  );
};

export default ExpensesPage;
```

---

# 📦 KIT 6: FRONTEND - CREATE EXPENSE MODAL

## Kit Overview
| Property | Value |
|----------|-------|
| Kit Name | `frontend-create-expense-modal` |
| Priority | 🟡 MEDIUM |
| Estimated Time | 20 minutes |
| Dependencies | Kit 4 |

## Files to Create

### File 6.1: `src/components/CreateExpenseModal.tsx`

**Location**: `D:\PROShael\alshuail-admin-arabic\src\components\CreateExpenseModal.tsx`

```tsx
import React, { useState } from 'react';
import { X, AlertTriangle, Loader2, Receipt, Wallet } from 'lucide-react';
import { apiService } from '../services/api';

interface CreateExpenseModalProps {
  currentBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES = [
  { id: 'diya_internal', name_ar: 'ديات داخلية' },
  { id: 'operational', name_ar: 'تشغيلي' },
  { id: 'events', name_ar: 'مناسبات' },
  { id: 'administrative', name_ar: 'إداري' },
  { id: 'maintenance', name_ar: 'صيانة' },
  { id: 'charity', name_ar: 'خيري' },
  { id: 'emergency', name_ar: 'طوارئ' },
  { id: 'other', name_ar: 'أخرى' }
];

const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  currentBalance,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title_ar: '',
    description_ar: '',
    amount: '',
    expense_category: '',
    expense_date: new Date().toISOString().split('T')[0],
    paid_to: '',
    payment_method: 'bank_transfer',
    receipt_number: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(formData.amount);
    
    // Client-side validation
    if (amount > currentBalance) {
      setError(`المبلغ المطلوب (${amount.toLocaleString()} ر.س) يتجاوز الرصيد المتاح (${currentBalance.toLocaleString()} ر.س)`);
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/expenses', formData);
      
      if (response.success) {
        onSuccess();
      } else {
        setError(response.error_ar || response.error || 'حدث خطأ');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const enteredAmount = parseFloat(formData.amount) || 0;
  const remainingBalance = currentBalance - enteredAmount;
  const isOverBudget = remainingBalance < 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Receipt className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white">إضافة مصروف جديد</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Info Banner */}
        <div className={`mx-6 mt-6 p-4 rounded-xl transition-colors ${
          isOverBudget ? 'bg-red-500/20 border border-red-500/30' : 'bg-emerald-500/20 border border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className={`w-5 h-5 ${isOverBudget ? 'text-red-400' : 'text-emerald-400'}`} />
              <div>
                <p className="text-white/60 text-xs">الرصيد الحالي</p>
                <p className="text-emerald-400 font-bold">{currentBalance.toLocaleString()} ر.س</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-white/60 text-xs">الرصيد بعد الخصم</p>
              <p className={`font-bold ${isOverBudget ? 'text-red-400' : 'text-white'}`}>
                {remainingBalance.toLocaleString()} ر.س
              </p>
            </div>
          </div>
          {isOverBudget && (
            <div className="flex items-center gap-2 mt-3 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>المبلغ يتجاوز الرصيد المتاح!</span>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Alert */}
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-white/70 text-sm mb-2 font-medium">
              عنوان المصروف <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="title_ar"
              value={formData.title_ar}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                         text-white placeholder-white/30 focus:outline-none focus:ring-2 
                         focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="مثال: صيانة مكيفات القاعة"
            />
          </div>

          {/* Amount & Category Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-2 font-medium">
                المبلغ (ر.س) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className={`w-full px-4 py-3 bg-white/5 border rounded-xl 
                           text-white placeholder-white/30 focus:outline-none focus:ring-2 transition-all
                           ${isOverBudget 
                             ? 'border-red-500 focus:ring-red-500' 
                             : 'border-white/10 focus:ring-emerald-500'}`}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2 font-medium">
                الفئة <span className="text-red-400">*</span>
              </label>
              <select
                name="expense_category"
                value={formData.expense_category}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                           text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                <option value="" className="bg-slate-800">اختر الفئة</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-slate-800">
                    {cat.name_ar}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Paid To Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-2 font-medium">
                تاريخ الصرف <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                name="expense_date"
                value={formData.expense_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                           text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2 font-medium">المستفيد / الجهة</label>
              <input
                type="text"
                name="paid_to"
                value={formData.paid_to}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                           text-white placeholder-white/30 focus:outline-none focus:ring-2 
                           focus:ring-emerald-500 transition-all"
                placeholder="اسم المستفيد أو الشركة"
              />
            </div>
          </div>

          {/* Payment Method & Receipt Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-2 font-medium">طريقة الدفع</label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                           text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                <option value="bank_transfer" className="bg-slate-800">تحويل بنكي</option>
                <option value="cash" className="bg-slate-800">نقدي</option>
                <option value="check" className="bg-slate-800">شيك</option>
                <option value="card" className="bg-slate-800">بطاقة</option>
              </select>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2 font-medium">رقم الإيصال / الفاتورة</label>
              <input
                type="text"
                name="receipt_number"
                value={formData.receipt_number}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                           text-white placeholder-white/30 focus:outline-none focus:ring-2 
                           focus:ring-emerald-500 transition-all"
                placeholder="INV-001"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-white/70 text-sm mb-2 font-medium">الوصف / التفاصيل</label>
            <textarea
              name="description_ar"
              value={formData.description_ar}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                         text-white placeholder-white/30 focus:outline-none focus:ring-2 
                         focus:ring-emerald-500 resize-none transition-all"
              placeholder="تفاصيل إضافية عن المصروف..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={loading || isOverBudget || !formData.title_ar || !formData.amount || !formData.expense_category}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 
                         bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed
                         text-white rounded-xl transition-all font-medium shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Receipt className="w-5 h-5" />
                  حفظ المصروف
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateExpenseModal;
```

---

# 📦 KIT 7: BANK RECONCILIATION MODAL

## Kit Overview
| Property | Value |
|----------|-------|
| Kit Name | `frontend-bank-reconciliation` |
| Priority | 🟢 LOW |
| Estimated Time | 15 minutes |
| Dependencies | Kit 2 |

## Files to Create

### File 7.1: `src/components/BankReconciliationModal.tsx`

**Location**: `D:\PROShael\alshuail-admin-arabic\src\components\BankReconciliationModal.tsx`

```tsx
import React, { useState } from 'react';
import { X, Building2, CheckCircle, AlertTriangle, Calculator, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';

interface BankReconciliationModalProps {
  currentBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

const BankReconciliationModal: React.FC<BankReconciliationModalProps> = ({
  currentBalance,
  onClose,
  onSuccess
}) => {
  const [bankBalance, setBankBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    matched: boolean;
    variance: number;
    snapshot_id?: string;
  } | null>(null);

  const handleReconcile = async () => {
    setLoading(true);
    try {
      const response = await apiService.post('/fund/snapshot', {
        bank_statement_balance: parseFloat(bankBalance),
        notes: notes
      });

      if (response.success) {
        setResult({
          matched: response.reconciliation.matched,
          variance: response.reconciliation.variance,
          snapshot_id: response.data.id
        });
      }
    } catch (error) {
      console.error('Reconciliation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const bankAmount = parseFloat(bankBalance) || 0;
  const variance = bankAmount - currentBalance;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white">مطابقة كشف البنك</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* System Balance Display */}
          <div className="p-4 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
            <p className="text-white/60 text-sm mb-1">رصيد النظام (المحسوب)</p>
            <p className="text-3xl font-bold text-emerald-400">
              {currentBalance.toLocaleString()} <span className="text-lg">ر.س</span>
            </p>
          </div>

          {/* Bank Balance Input */}
          <div>
            <label className="block text-white/70 text-sm mb-2 font-medium">
              رصيد كشف الحساب البنكي <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={bankBalance}
              onChange={(e) => setBankBalance(e.target.value)}
              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl 
                         text-white text-2xl font-bold text-center focus:outline-none 
                         focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="أدخل الرصيد من كشف البنك"
            />
          </div>

          {/* Live Variance Display */}
          {bankBalance && (
            <div className={`p-4 rounded-xl ${
              variance === 0 
                ? 'bg-green-500/20 border border-green-500/30' 
                : 'bg-amber-500/20 border border-amber-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-white/60">الفرق:</span>
                <span className={`font-bold text-lg ${
                  variance === 0 ? 'text-green-400' : 'text-amber-400'
                }`}>
                  {variance === 0 ? '✅ مطابق' : `${variance.toLocaleString()} ر.س`}
                </span>
              </div>
              {variance !== 0 && (
                <p className="text-white/50 text-sm mt-2">
                  {variance > 0 ? 'رصيد البنك أعلى من النظام' : 'رصيد النظام أعلى من البنك'}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-white/70 text-sm mb-2 font-medium">ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                         text-white placeholder-white/30 focus:outline-none focus:ring-2 
                         focus:ring-blue-500 resize-none transition-all"
              placeholder="أضف ملاحظات حول المطابقة..."
            />
          </div>

          {/* Result Display */}
          {result && (
            <div className={`p-4 rounded-xl ${
              result.matched 
                ? 'bg-green-500/20 border border-green-500/30' 
                : 'bg-amber-500/20 border border-amber-500/30'
            }`}>
              <div className="flex items-center gap-3">
                {result.matched ? (
                  <CheckCircle className="w-8 h-8 text-green-400" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                )}
                <div>
                  {result.matched ? (
                    <p className="text-green-400 font-bold text-lg">✅ الرصيد مطابق!</p>
                  ) : (
                    <>
                      <p className="text-amber-400 font-bold">⚠️ يوجد فرق في الرصيد</p>
                      <p className="text-white/60 text-sm">
                        الفرق: {result.variance.toLocaleString()} ر.س
                      </p>
                    </>
                  )}
                  <p className="text-white/50 text-xs mt-1">تم حفظ سجل المطابقة</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-white/10">
            {!result ? (
              <button
                onClick={handleReconcile}
                disabled={!bankBalance || loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 
                           bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 
                           text-white rounded-xl transition-all font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري المطابقة...
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5" />
                    تنفيذ المطابقة
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 
                           text-white rounded-xl transition-all font-medium"
              >
                تم ✓
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankReconciliationModal;
```

---

# 📋 EXECUTION CHECKLIST

## Order of Execution

| Step | Kit | Command/Action | Verification |
|------|-----|----------------|--------------|
| 1 | Kit 1 | Run SQL in Supabase | `SELECT * FROM vw_fund_balance;` |
| 2 | Kit 2 | Create backend files | Test `/api/fund/balance` endpoint |
| 3 | Kit 3 | Update expenses controller | Test expense creation with balance check |
| 4 | Kit 4 | Create FundBalanceCard | Import in ExpensesPage |
| 5 | Kit 5 | Update ExpensesPage | Visual verification |
| 6 | Kit 6 | Create CreateExpenseModal | Test expense creation |
| 7 | Kit 7 | Create BankReconciliationModal | Test reconciliation |

## Final Verification Query

```sql
-- Run this to verify everything works
SELECT 
  'Revenue' as type, 
  COUNT(*) as count, 
  COALESCE(SUM(amount), 0) as total 
FROM payments WHERE status = 'completed'

UNION ALL

SELECT 
  'Expenses' as type, 
  COUNT(*) as count, 
  COALESCE(SUM(amount), 0) as total 
FROM expenses WHERE status IN ('approved', 'paid')

UNION ALL

SELECT 
  'Internal Diya' as type, 
  COUNT(*) as count, 
  COALESCE(SUM(amount_paid), 0) as total 
FROM diya_cases WHERE diya_type = 'internal';
```

---

# 🎯 SUCCESS CRITERIA

The implementation is **COMPLETE** when:

- [ ] Fund Balance Card shows correct balance on Expenses page
- [ ] Balance = Subscriptions - Expenses - Internal Diya
- [ ] Cannot create expense exceeding available balance
- [ ] Internal Diya (3 cases) shows separately
- [ ] Bank reconciliation shows variance or match
- [ ] All transactions logged in audit_logs

---

**KITS SPECIFICATION VERSION**: 1.0  
**TOTAL KITS**: 7  
**ESTIMATED TOTAL TIME**: 2-3 hours  
**PROJECT**: Al-Shuail Family Fund Management System
