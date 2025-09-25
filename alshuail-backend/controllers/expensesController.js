// Expenses Controller
const { supabase } = require('../config/database');

// Mock data for expenses
const mockExpenses = [
  {
    id: '1',
    title_ar: 'مصاريف تشغيلية شهرية',
    title_en: 'Monthly Operational Expenses',
    description_ar: 'تكاليف التشغيل الأساسية للشهر الحالي',
    description_en: 'Basic operational costs for current month',
    amount: 15000,
    category: 'operations',
    status: 'pending',
    created_by: 'أحمد محمد الشعيل',
    created_at: '2024-01-15T10:30:00',
    hijri_date: '1445/07/03'
  },
  {
    id: '2',
    title_ar: 'صيانة الموقع الإلكتروني',
    title_en: 'Website Maintenance',
    description_ar: 'تحديث وصيانة النظام الإلكتروني',
    description_en: 'System update and maintenance',
    amount: 5000,
    category: 'maintenance',
    status: 'approved',
    created_by: 'فاطمة عبدالله الشعيل',
    created_at: '2024-01-10T14:20:00',
    approved_by: 'محمد سعد الشعيل',
    approved_at: '2024-01-11T09:00:00',
    hijri_date: '1445/06/28'
  },
  {
    id: '3',
    title_ar: 'مستلزمات مكتبية',
    title_en: 'Office Supplies',
    description_ar: 'شراء مستلزمات مكتبية وقرطاسية',
    description_en: 'Purchase of office supplies and stationery',
    amount: 2500,
    category: 'supplies',
    status: 'rejected',
    created_by: 'خديجة أحمد الشعيل',
    created_at: '2024-01-08T11:45:00',
    rejected_by: 'عبدالله صالح الشعيل',
    rejected_at: '2024-01-09T10:30:00',
    rejection_reason: 'المبلغ مرتفع - يحتاج إلى عروض أسعار إضافية',
    hijri_date: '1445/06/26'
  },
  {
    id: '4',
    title_ar: 'فعالية اجتماع العائلة السنوي',
    title_en: 'Annual Family Meeting Event',
    description_ar: 'تكاليف إقامة الاجتماع السنوي للعائلة',
    description_en: 'Costs for hosting annual family meeting',
    amount: 25000,
    category: 'activities',
    status: 'approved',
    created_by: 'سارة محمد الشعيل',
    created_at: '2024-01-05T09:15:00',
    approved_by: 'أحمد عبدالله الشعيل',
    approved_at: '2024-01-06T16:20:00',
    hijri_date: '1445/06/23'
  }
];

// Get all expenses
const getAllExpenses = async (req, res) => {
  try {
    // For now, return mock data
    res.json({
      status: 'success',
      message_ar: 'تم جلب المصروفات بنجاح',
      message_en: 'Expenses fetched successfully',
      data: mockExpenses
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      status: 'error',
      message_ar: 'خطأ في جلب المصروفات',
      message_en: 'Error fetching expenses',
      error: error.message
    });
  }
};

// Create new expense
const createExpense = async (req, res) => {
  try {
    const newExpense = {
      id: Date.now().toString(),
      ...req.body,
      status: 'pending',
      created_at: new Date().toISOString(),
      created_by: req.body.created_by || 'Unknown User'
    };

    mockExpenses.push(newExpense);

    res.json({
      status: 'success',
      message_ar: 'تم إنشاء المصروف بنجاح',
      message_en: 'Expense created successfully',
      data: newExpense
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({
      status: 'error',
      message_ar: 'خطأ في إنشاء المصروف',
      message_en: 'Error creating expense',
      error: error.message
    });
  }
};

// Update expense approval status
const updateExpenseApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    const expenseIndex = mockExpenses.findIndex(e => e.id === id);

    if (expenseIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message_ar: 'المصروف غير موجود',
        message_en: 'Expense not found'
      });
    }

    mockExpenses[expenseIndex] = {
      ...mockExpenses[expenseIndex],
      status: status,
      rejection_reason: rejection_reason || null,
      [`${status}_by`]: 'Current User',
      [`${status}_at`]: new Date().toISOString()
    };

    res.json({
      status: 'success',
      message_ar: `تم ${status === 'approved' ? 'اعتماد' : 'رفض'} المصروف بنجاح`,
      message_en: `Expense ${status} successfully`,
      data: mockExpenses[expenseIndex]
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({
      status: 'error',
      message_ar: 'خطأ في تحديث المصروف',
      message_en: 'Error updating expense',
      error: error.message
    });
  }
};

module.exports = {
  getAllExpenses,
  createExpense,
  updateExpenseApproval
};