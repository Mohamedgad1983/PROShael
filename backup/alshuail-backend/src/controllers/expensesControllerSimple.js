/**
 * Simplified Expenses Controller for Testing
 * Returns mock data to test the frontend functionality
 */

/**
 * Get all expenses with mock data
 * @route GET /api/expenses
 */
export const getExpenses = async (req, res) => {
  try {
    // Return mock expenses for testing
    const mockExpenses = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title_ar: 'شراء أدوات مكتبية',
        title_en: 'Office Supplies Purchase',
        description_ar: 'شراء أدوات مكتبية للمكتب الرئيسي',
        description_en: 'Purchase of office supplies for main office',
        amount: 1500,
        category: 'supplies',
        date: '2024-01-15',
        hijri_date: '1445/07/03',
        hijri_month: 7,
        hijri_year: 1445,
        status: 'approved',
        payment_method: 'cash',
        vendor: 'مكتبة الشعيل',
        invoice_number: 'INV-2024-001',
        created_at: '2024-01-15T10:00:00Z',
        approved_at: '2024-01-16T14:00:00Z',
        created_by_name: 'محمد أحمد',
        approved_by_name: 'خالد سعود',
        notes: 'تم الشراء بعد موافقة الإدارة'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        title_ar: 'صيانة المكيفات',
        title_en: 'AC Maintenance',
        description_ar: 'صيانة دورية للمكيفات في المبنى الرئيسي',
        description_en: 'Periodic maintenance for AC units in main building',
        amount: 3200,
        category: 'maintenance',
        date: '2024-01-20',
        hijri_date: '1445/07/08',
        hijri_month: 7,
        hijri_year: 1445,
        status: 'pending',
        payment_method: 'bank_transfer',
        vendor: 'شركة الصيانة المتقدمة',
        invoice_number: 'INV-2024-002',
        created_at: '2024-01-20T09:00:00Z',
        created_by_name: 'أحمد محمد',
        notes: 'في انتظار الموافقة'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        title_ar: 'فاتورة الكهرباء',
        title_en: 'Electricity Bill',
        description_ar: 'فاتورة الكهرباء الشهرية للمبنى',
        description_en: 'Monthly electricity bill for the building',
        amount: 850,
        category: 'utilities',
        date: '2024-01-25',
        hijri_date: '1445/07/13',
        hijri_month: 7,
        hijri_year: 1445,
        status: 'approved',
        payment_method: 'online',
        vendor: 'شركة الكهرباء',
        invoice_number: 'ELEC-2024-001',
        created_at: '2024-01-25T11:00:00Z',
        approved_at: '2024-01-25T15:00:00Z',
        created_by_name: 'سعد الأحمد',
        approved_by_name: 'خالد سعود',
        notes: 'دفعت عبر البوابة الإلكترونية'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        title_ar: 'نشاط رمضاني',
        title_en: 'Ramadan Activity',
        description_ar: 'تنظيم إفطار جماعي للأعضاء في رمضان',
        description_en: 'Organizing group iftar for members in Ramadan',
        amount: 5000,
        category: 'activities',
        date: '2024-03-15',
        hijri_date: '1445/09/05',
        hijri_month: 9,
        hijri_year: 1445,
        status: 'rejected',
        payment_method: 'cash',
        vendor: 'مطعم الضيافة',
        invoice_number: 'RAM-2024-001',
        created_at: '2024-03-10T10:00:00Z',
        created_by_name: 'فهد العتيبي',
        rejection_reason: 'تجاوز الميزانية المخصصة للأنشطة الشهرية',
        notes: 'مرفوض - يحتاج إعادة تقديم بميزانية أقل'
      }
    ];

    return res.json({
      success: true,
      data: {
        expenses: mockExpenses,
        total_count: 4,
        total_amount: 10550,
        metadata: {
          page: 1,
          limit: 50,
          total_pages: 1
        }
      },
      message_ar: 'تم جلب المصروفات بنجاح'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'خطأ في جلب المصروفات',
      message_ar: 'خطأ في جلب المصروفات'
    });
  }
};

/**
 * Create new expense with mock response
 * @route POST /api/expenses
 */
export const createExpense = async (req, res) => {
  try {
    const { amount, category, description, payment_method, vendor, invoice_number } = req.body;

    // Create mock expense
    const newExpense = {
      id: Date.now(),
      amount: amount || 0,
      category: category || 'general',
      description: description || 'مصروف جديد',
      date: new Date().toISOString().split('T')[0],
      hijri_date: '1445/07/15',
      hijri_month: 7,
      hijri_year: 1445,
      status: 'pending',
      payment_method: payment_method || 'cash',
      vendor: vendor || 'غير محدد',
      invoice_number: invoice_number || `INV-${Date.now()}`,
      created_at: new Date().toISOString(),
      created_by: req.user?.id || 1
    };

    return res.status(201).json({
      success: true,
      data: newExpense,
      message_ar: 'تم إضافة المصروف بنجاح'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'خطأ في إضافة المصروف',
      message_ar: 'خطأ في إضافة المصروف'
    });
  }
};

/**
 * Get expense statistics with mock data
 * @route GET /api/expenses/statistics
 */
export const getExpenseStatistics = async (req, res) => {
  try {
    const mockStatistics = {
      total_expenses: 25500,
      total_approved: 18000,
      total_pending: 7500,
      total_rejected: 0,
      monthly_average: 8500,
      category_breakdown: [
        { category: 'office_supplies', amount: 5000, count: 10 },
        { category: 'maintenance', amount: 8000, count: 5 },
        { category: 'utilities', amount: 12500, count: 8 }
      ],
      payment_method_breakdown: [
        { method: 'cash', amount: 10000, count: 12 },
        { method: 'bank_transfer', amount: 12000, count: 8 },
        { method: 'online', amount: 3500, count: 3 }
      ],
      monthly_trend: [
        { month: 'محرم', amount: 8500 },
        { month: 'صفر', amount: 9200 },
        { month: 'ربيع الأول', amount: 7800 }
      ]
    };

    return res.json({
      success: true,
      data: mockStatistics,
      message_ar: 'تم جلب إحصائيات المصروفات بنجاح'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'خطأ في جلب الإحصائيات',
      message_ar: 'خطأ في جلب الإحصائيات'
    });
  }
};

/**
 * Get expense by ID with mock data
 * @route GET /api/expenses/:expenseId
 */
export const getExpenseById = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const mockExpense = {
      id: expenseId,
      amount: 2500,
      category: 'office_supplies',
      description: 'شراء أجهزة كمبيوتر',
      date: '2024-01-15',
      hijri_date: '1445/07/03',
      hijri_month: 7,
      hijri_year: 1445,
      status: 'approved',
      payment_method: 'bank_transfer',
      vendor: 'شركة التقنية المتقدمة',
      invoice_number: `INV-2024-${expenseId}`,
      receipt_url: null,
      notes: 'تم الشراء بناء على موافقة الإدارة',
      created_at: '2024-01-15T10:00:00Z',
      approved_at: '2024-01-16T14:00:00Z',
      created_by: {
        id: 1,
        name: 'محمد الشعيل',
        role: 'financial_manager'
      },
      approved_by: {
        id: 2,
        name: 'أحمد الشعيل',
        role: 'super_admin'
      }
    };

    return res.json({
      success: true,
      data: mockExpense,
      message_ar: 'تم جلب تفاصيل المصروف بنجاح'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'خطأ في جلب تفاصيل المصروف',
      message_ar: 'خطأ في جلب تفاصيل المصروف'
    });
  }
};

/**
 * Update expense with mock response
 * @route PUT /api/expenses/:expenseId
 */
export const updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const updateData = req.body;

    const updatedExpense = {
      id: expenseId,
      ...updateData,
      updated_at: new Date().toISOString(),
      updated_by: req.user?.id || 1
    };

    return res.json({
      success: true,
      data: updatedExpense,
      message_ar: 'تم تحديث المصروف بنجاح'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'خطأ في تحديث المصروف',
      message_ar: 'خطأ في تحديث المصروف'
    });
  }
};

/**
 * Approve/reject expense with mock response
 * @route PUT /api/expenses/:expenseId/approval
 */
export const approveExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { status, notes } = req.body;

    const approvalResponse = {
      id: expenseId,
      status: status || 'approved',
      notes: notes || 'تمت الموافقة',
      approved_at: new Date().toISOString(),
      approved_by: req.user?.id || 1
    };

    return res.json({
      success: true,
      data: approvalResponse,
      message_ar: status === 'approved' ? 'تمت الموافقة على المصروف' : 'تم رفض المصروف'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'خطأ في معالجة الموافقة',
      message_ar: 'خطأ في معالجة الموافقة'
    });
  }
};

/**
 * Delete expense with mock response
 * @route DELETE /api/expenses/:expenseId
 */
export const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    return res.json({
      success: true,
      data: {
        id: expenseId,
        deleted_at: new Date().toISOString(),
        deleted_by: req.user?.id || 1
      },
      message_ar: 'تم حذف المصروف بنجاح'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'خطأ في حذف المصروف',
      message_ar: 'خطأ في حذف المصروف'
    });
  }
};