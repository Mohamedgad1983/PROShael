import { query } from '../services/database.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';
import { HijriDateManager } from '../utils/hijriDateUtils.js';

/**
 * Generate reference number for diya case
 */
const generateDiyaReference = () => {
  const prefix = 'DY';
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}-${timestamp}${random}`;
};

/**
 * Get all diya cases
 * GET /api/diyas
 */
export const getAllDiyas = async (req, res) => {
  try {
    const {
      status,
      payment_status,
      limit = 50,
      offset = 0,
      start_date,
      end_date,
      min_amount,
      max_amount
    } = req.query;

    // Build dynamic query for activities filtered for diya-related activities
    // DB has both name_ar/name_en AND title_ar/title_en columns
    const conditions = ["(COALESCE(name_ar,'') ILIKE '%دية%' OR COALESCE(name_en,'') ILIKE '%diya%' OR COALESCE(title_ar,'') ILIKE '%دية%' OR COALESCE(title_en,'') ILIKE '%diya%' OR activity_type = 'diya' OR category = 'diya' OR beneficiary_type = 'diya')"];
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (payment_status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(payment_status);
    }

    // Date range filter
    if (start_date) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(end_date);
    }

    // Amount range filter
    if (min_amount) {
      conditions.push(`target_amount >= $${paramIndex++}`);
      params.push(min_amount);
    }

    if (max_amount) {
      conditions.push(`target_amount <= $${paramIndex++}`);
      params.push(max_amount);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(parseInt(limit));
    const limitParam = paramIndex++;
    params.push(parseInt(offset));
    const offsetParam = paramIndex++;

    const sql = `SELECT * FROM activities ${whereClause} ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`;

    const { rows: activities } = await query(sql, params);

    // Step 2: Get contributions separately using ANY() query
    const activityIds = (activities || []).map(a => a.id);
    let contributions = [];

    if (activityIds.length > 0) {
      const { rows: contribData } = await query(
        'SELECT id, activity_id, contributor_id, contribution_amount, status, contribution_date FROM financial_contributions WHERE activity_id = ANY($1)',
        [activityIds]
      );
      contributions = contribData || [];
    }

    // Step 3: Map contributions to their activities + map columns for iOS
    const diyas = (activities || []).map(activity => ({
      ...activity,
      id: String(activity.id),
      // Map DB columns (name_ar/name_en) to iOS DiyaCase model keys (title_ar/title_en)
      title_ar: activity.name_ar || activity.title_ar || null,
      title_en: activity.name_en || activity.title_en || null,
      payment_status: activity.status || null,
      financial_contributions: contributions.filter(c => c.activity_id === activity.id)
    }));

    // Calculate summary statistics from financial_contributions
    const totalAmount = diyas?.reduce((sum, diya) => {
      const collected = diya.financial_contributions?.reduce((s, c) => s + Number(c.contribution_amount), 0) || 0;
      return sum + collected;
    }, 0) || 0;

    const paidAmount = diyas?.reduce((sum, diya) => {
      const paid = diya.financial_contributions?.filter(c => c.status === 'approved').reduce((s, c) => s + Number(c.contribution_amount), 0) || 0;
      return sum + paid;
    }, 0) || 0;

    const pendingAmount = diyas?.reduce((sum, diya) => {
      const pending = diya.financial_contributions?.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.contribution_amount), 0) || 0;
      return sum + pending;
    }, 0) || 0;

    res.json({
      success: true,
      data: diyas || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: diyas?.length || 0
      },
      summary: {
        total_cases: diyas?.length || 0,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        pending_amount: pendingAmount,
        paid_cases: diyas?.filter(d => d.status === 'completed').length || 0,
        pending_cases: diyas?.filter(d => d.status === 'active').length || 0
      },
      message: 'تم جلب قضايا الديات بنجاح'
    });
  } catch (error) {
    log.error('Error fetching diyas', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب قضايا الديات',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Get diya case by ID
 * GET /api/diyas/:id
 */
export const getDiyaById = async (req, res) => {
  try {
    const { id } = req.params;

    // Step 1: Get the activity
    const { rows: activityRows } = await query(
      'SELECT * FROM activities WHERE id = $1',
      [id]
    );

    const activity = activityRows[0];
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'قضية الدية غير موجودة'
      });
    }

    // Step 2: Get contributions separately
    let contributions = [];
    try {
      const { rows: contribRows } = await query(
        'SELECT * FROM financial_contributions WHERE activity_id = $1',
        [id]
      );
      contributions = contribRows || [];
    } catch (contribErr) {
      log.error('Error fetching contributions for diya', { error: contribErr.message });
    }

    // Step 3: Combine data
    const diya = {
      ...activity,
      financial_contributions: contributions
    };

    res.json({
      success: true,
      data: diya,
      message: 'تم جلب بيانات قضية الدية بنجاح'
    });
  } catch (error) {
    log.error('Error fetching diya', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب بيانات قضية الدية',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Create new diya case
 * POST /api/diyas
 */
export const createDiya = async (req, res) => {
  try {
    const {
      payer_id,
      amount,
      title,
      description,
      payment_method = 'cash',
      status = 'pending',
      notes
    } = req.body;

    // Validation
    if (!payer_id || !amount || !title) {
      return res.status(400).json({
        success: false,
        error: 'معرف الدافع والمبلغ والعنوان مطلوبة'
      });
    }

    const diyaAmount = Number(amount);
    if (diyaAmount < 50) {
      return res.status(400).json({
        success: false,
        error: 'الحد الأدنى لمبلغ الدية هو 50 ريال'
      });
    }

    // Check if payer exists
    const { rows: payerRows } = await query(
      'SELECT id, full_name FROM members WHERE id = $1',
      [payer_id]
    );

    if (payerRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'الدافع المحدد غير موجود'
      });
    }

    // Generate reference number
    const referenceNumber = generateDiyaReference();

    const { rows } = await query(
      `INSERT INTO payments (payer_id, amount, category, title, description, payment_method, status, reference_number, notes)
       VALUES ($1, $2, 'diya', $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [payer_id, diyaAmount, title, description, payment_method, status, referenceNumber, notes]
    );

    res.status(201).json({
      success: true,
      data: rows[0],
      message: 'تم إنشاء قضية الدية بنجاح'
    });
  } catch (error) {
    log.error('Error creating diya', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في إنشاء قضية الدية',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Update diya case status
 * PUT /api/diyas/:id/status
 */
export const updateDiyaStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_method, notes } = req.body;

    if (!status || !['pending', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'حالة الدفع غير صحيحة'
      });
    }

    // Check if diya exists
    const { rows: existingRows } = await query(
      "SELECT * FROM payments WHERE id = $1 AND category = 'diya'",
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'قضية الدية غير موجودة'
      });
    }

    const setClauses = ['status = $1', 'updated_at = $2'];
    const params = [status, new Date().toISOString()];
    let pIdx = 3;

    if (payment_method) { setClauses.push(`payment_method = $${pIdx++}`); params.push(payment_method); }
    if (notes !== undefined) { setClauses.push(`notes = $${pIdx++}`); params.push(notes); }

    params.push(id);

    const { rows } = await query(
      `UPDATE payments SET ${setClauses.join(', ')} WHERE id = $${pIdx} RETURNING *`,
      params
    );

    res.json({
      success: true,
      data: rows[0],
      message: status === 'paid' ? 'تم تأكيد دفع الدية' :
               status === 'cancelled' ? 'تم إلغاء قضية الدية' : 'تم تحديث حالة الدية'
    });
  } catch (error) {
    log.error('Error updating diya status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في تحديث حالة الدية',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Update diya case details
 * PUT /api/diyas/:id
 */
export const updateDiya = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      title,
      description,
      payment_method,
      notes
    } = req.body;

    // Check if diya exists
    const { rows: existingRows } = await query(
      "SELECT * FROM payments WHERE id = $1 AND category = 'diya'",
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'قضية الدية غير موجودة'
      });
    }

    // Validate amount if provided
    if (amount && Number(amount) < 50) {
      return res.status(400).json({
        success: false,
        error: 'الحد الأدنى لمبلغ الدية هو 50 ريال'
      });
    }

    const setClauses = ['updated_at = $1'];
    const params = [new Date().toISOString()];
    let pIdx = 2;

    // Only update provided fields
    if (amount !== undefined) { setClauses.push(`amount = $${pIdx++}`); params.push(Number(amount)); }
    if (title !== undefined) { setClauses.push(`title = $${pIdx++}`); params.push(title); }
    if (description !== undefined) { setClauses.push(`description = $${pIdx++}`); params.push(description); }
    if (payment_method !== undefined) { setClauses.push(`payment_method = $${pIdx++}`); params.push(payment_method); }
    if (notes !== undefined) { setClauses.push(`notes = $${pIdx++}`); params.push(notes); }

    params.push(id);

    const { rows } = await query(
      `UPDATE payments SET ${setClauses.join(', ')} WHERE id = $${pIdx} RETURNING *`,
      params
    );

    res.json({
      success: true,
      data: rows[0],
      message: 'تم تحديث قضية الدية بنجاح'
    });
  } catch (error) {
    log.error('Error updating diya', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في تحديث قضية الدية',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Delete diya case
 * DELETE /api/diyas/:id
 */
export const deleteDiya = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if diya exists
    const { rows: existingRows } = await query(
      "SELECT * FROM payments WHERE id = $1 AND category = 'diya'",
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'قضية الدية غير موجودة'
      });
    }

    // Don't allow deletion of paid diyas
    if (existingRows[0].status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن حذف قضية دية مدفوعة'
      });
    }

    await query('DELETE FROM payments WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'تم حذف قضية الدية بنجاح'
    });
  } catch (error) {
    log.error('Error deleting diya', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في حذف قضية الدية',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Get diya statistics
 * GET /api/diyas/stats
 */
export const getDiyaStats = async (req, res) => {
  try {
    const { period = 'all' } = req.query;

    const conditions = ["category = 'diya'"];
    const params = [];
    let paramIndex = 1;

    // Apply period filter
    if (period !== 'all') {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter': {
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        }
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(startDate.toISOString());
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const { rows: diyas } = await query(
      `SELECT * FROM payments ${whereClause}`,
      params
    );

    // Calculate statistics
    const totalCases = diyas?.length || 0;
    const totalAmount = diyas?.reduce((sum, diya) => sum + Number(diya.amount), 0) || 0;
    const paidCases = diyas?.filter(d => d.status === 'paid') || [];
    const pendingCases = diyas?.filter(d => d.status === 'pending') || [];
    const cancelledCases = diyas?.filter(d => d.status === 'cancelled') || [];

    const paidAmount = paidCases.reduce((sum, d) => sum + Number(d.amount), 0);
    const pendingAmount = pendingCases.reduce((sum, d) => sum + Number(d.amount), 0);

    // Payment method breakdown
    const paymentMethodStats = diyas?.reduce((acc, diya) => {
      const method = diya.payment_method || 'unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {}) || {};

    // Average amounts
    const averageAmount = totalCases > 0 ? Math.round(totalAmount / totalCases) : 0;
    const averagePaidAmount = paidCases.length > 0 ? Math.round(paidAmount / paidCases.length) : 0;

    // Monthly trend (last 12 months)
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthCases = diyas?.filter(d => {
        const caseDate = new Date(d.created_at);
        return caseDate >= monthStart && caseDate <= monthEnd;
      }) || [];

      monthlyData.push({
        month: date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' }),
        cases: monthCases.length,
        amount: monthCases.reduce((sum, d) => sum + Number(d.amount), 0),
        paid_cases: monthCases.filter(d => d.status === 'paid').length,
        paid_amount: monthCases.filter(d => d.status === 'paid').reduce((sum, d) => sum + Number(d.amount), 0)
      });
    }

    res.json({
      success: true,
      data: {
        overview: {
          total_cases: totalCases,
          total_amount: totalAmount,
          paid_cases: paidCases.length,
          paid_amount: paidAmount,
          pending_cases: pendingCases.length,
          pending_amount: pendingAmount,
          cancelled_cases: cancelledCases.length,
          average_amount: averageAmount,
          average_paid_amount: averagePaidAmount,
          payment_rate: totalCases > 0 ? Math.round((paidCases.length / totalCases) * 100) : 0
        },
        payment_methods: paymentMethodStats,
        monthly_trend: monthlyData,
        status_breakdown: {
          paid: paidCases.length,
          pending: pendingCases.length,
          cancelled: cancelledCases.length
        }
      },
      message: 'تم جلب إحصائيات الديات بنجاح'
    });
  } catch (error) {
    log.error('Error fetching diya stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب إحصائيات الديات',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Get member diya history
 * GET /api/diyas/member/:memberId
 */
export const getMemberDiyas = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Check if member exists
    const { rows: memberRows } = await query(
      'SELECT id, full_name FROM members WHERE id = $1',
      [memberId]
    );

    if (memberRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود'
      });
    }

    const member = memberRows[0];

    const { rows: diyas } = await query(
      "SELECT * FROM payments WHERE category = 'diya' AND payer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [memberId, parseInt(limit), parseInt(offset)]
    );

    // Calculate member summary
    const totalAmount = diyas?.reduce((sum, diya) => sum + Number(diya.amount), 0) || 0;
    const paidAmount = diyas?.filter(d => d.status === 'paid').reduce((sum, d) => sum + Number(d.amount), 0) || 0;
    const pendingAmount = diyas?.filter(d => d.status === 'pending').reduce((sum, d) => sum + Number(d.amount), 0) || 0;

    res.json({
      success: true,
      data: diyas || [],
      member: member,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: diyas?.length || 0
      },
      summary: {
        total_cases: diyas?.length || 0,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        pending_amount: pendingAmount,
        paid_cases: diyas?.filter(d => d.status === 'paid').length || 0,
        pending_cases: diyas?.filter(d => d.status === 'pending').length || 0
      },
      message: 'تم جلب تاريخ ديات العضو بنجاح'
    });
  } catch (error) {
    log.error('Error fetching member diyas', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في جلب تاريخ ديات العضو',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Transfer internal diya to expenses system
 * POST /api/diyas/:id/transfer-to-expense
 * 
 * Internal diyas are paid from the fund (cashier) money,
 * so they should be recorded as expenses to deduct from fund balance.
 * External diyas stay in the diya section.
 */
export const transferDiyaToExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { notes } = req.body;

    // Step 1: Get the diya activity
    const { rows: activityRows } = await query(
      'SELECT * FROM activities WHERE id = $1',
      [id]
    );

    if (!activityRows || activityRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'قضية الدية غير موجودة'
      });
    }

    const diya = activityRows[0];

    // Step 2: Check if already transferred
    if (diya.status === 'transferred_to_expense') {
      return res.status(400).json({
        success: false,
        error: 'هذه الدية تم نقلها بالفعل إلى المصروفات'
      });
    }

    // Step 3: Calculate the total collected amount from contributions
    let totalCollected = Number(diya.current_amount) || 0;
    try {
      const { rows: contribs } = await query(
        "SELECT COALESCE(SUM(contribution_amount), 0) as total FROM financial_contributions WHERE activity_id = $1 AND status = 'approved'",
        [id]
      );
      if (contribs && contribs[0]) {
        totalCollected = Number(contribs[0].total) || totalCollected;
      }
    } catch (err) {
      log.warn('Could not fetch contributions sum, using current_amount', { error: err.message });
    }

    // Use target_amount as the expense amount (the diya amount)
    const expenseAmount = Number(diya.target_amount) || totalCollected;

    if (expenseAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'مبلغ الدية يجب أن يكون أكبر من صفر'
      });
    }

    // Step 4: Convert date to Hijri
    const expenseDate = diya.created_at ? new Date(diya.created_at) : new Date();
    let hijriData = {};
    try {
      hijriData = HijriDateManager.convertToHijri(expenseDate);
    } catch (err) {
      log.warn('Hijri conversion failed, using defaults', { error: err.message });
      hijriData = {
        hijri_date_string: '',
        hijri_year: null,
        hijri_month: null,
        hijri_day: null,
        hijri_month_name: ''
      };
    }

    // Step 5: Create expense record
    const transferNotes = `دية داخلية منقولة من قسم الديات - ${diya.title_ar || diya.title_en || 'بدون عنوان'}${notes ? ' | ' + notes : ''}`;

    const { rows: expenseRows } = await query(
      `INSERT INTO expenses (
        expense_category, title_ar, title_en, description_ar, amount, currency,
        expense_date, paid_to, payment_method, notes,
        approval_required, status, created_by,
        hijri_date_string, hijri_year, hijri_month, hijri_day, hijri_month_name,
        approved_by, approved_at, approval_notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21
      ) RETURNING *`,
      [
        'diya',                                                    // expense_category
        diya.title_ar || 'دية داخلية',                             // title_ar
        diya.title_en || 'Internal Diya',                          // title_en
        diya.description_ar || transferNotes,                       // description_ar
        expenseAmount,                                              // amount
        'SAR',                                                      // currency
        expenseDate.toISOString().split('T')[0],                   // expense_date
        diya.beneficiary_name_ar || diya.beneficiary_name_en || '', // paid_to
        'cash',                                                     // payment_method
        transferNotes,                                              // notes
        false,                                                      // approval_required
        'approved',                                                 // status (auto-approve transferred diyas)
        userId,                                                     // created_by
        hijriData.hijri_date_string || '',                          // hijri_date_string
        hijriData.hijri_year || null,                               // hijri_year
        hijriData.hijri_month || null,                              // hijri_month
        hijriData.hijri_day || null,                                // hijri_day
        hijriData.hijri_month_name || '',                           // hijri_month_name
        userId,                                                     // approved_by
        new Date().toISOString(),                                   // approved_at
        'تم النقل تلقائياً من قسم الديات الداخلية'                  // approval_notes
      ]
    );

    // Step 6: Mark the original diya activity as transferred
    await query(
      "UPDATE activities SET status = 'transferred_to_expense', notes = COALESCE(notes, '') || $1 WHERE id = $2",
      [`\n[تم نقلها إلى المصروفات بتاريخ ${new Date().toLocaleDateString('ar-SA')} - رقم المصروف: ${expenseRows[0]?.id}]`, id]
    );

    log.info('Diya transferred to expense', {
      diyaId: id,
      expenseId: expenseRows[0]?.id,
      amount: expenseAmount,
      userId
    });

    res.json({
      success: true,
      data: {
        expense: expenseRows[0],
        original_diya_id: id,
        transfer_amount: expenseAmount
      },
      message: `تم نقل الدية بنجاح إلى المصروفات بمبلغ ${expenseAmount} ريال سعودي`,
      message_en: `Diya transferred to expenses successfully. Amount: ${expenseAmount} SAR`
    });
  } catch (error) {
    log.error('Error transferring diya to expense', { error: error.message, diyaId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'فشل في نقل الدية إلى المصروفات',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};

/**
 * Bulk transfer multiple diyas to expenses
 * POST /api/diyas/bulk-transfer-to-expenses
 */
export const bulkTransferDiyasToExpenses = async (req, res) => {
  try {
    const { diya_ids, notes } = req.body;
    const userId = req.user?.id;

    if (!diya_ids || !Array.isArray(diya_ids) || diya_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد قضايا الديات المراد نقلها'
      });
    }

    const results = [];
    const errors = [];

    for (const diyaId of diya_ids) {
      try {
        // Simulate the request for each diya
        const mockReq = {
          params: { id: diyaId },
          user: { id: userId },
          body: { notes }
        };

        // Get the diya
        const { rows: activityRows } = await query(
          'SELECT * FROM activities WHERE id = $1',
          [diyaId]
        );

        if (!activityRows || activityRows.length === 0) {
          errors.push({ id: diyaId, error: 'غير موجودة' });
          continue;
        }

        const diya = activityRows[0];

        if (diya.status === 'transferred_to_expense') {
          errors.push({ id: diyaId, error: 'تم نقلها مسبقاً' });
          continue;
        }

        const expenseAmount = Number(diya.target_amount) || Number(diya.current_amount) || 0;
        if (expenseAmount <= 0) {
          errors.push({ id: diyaId, error: 'المبلغ صفر' });
          continue;
        }

        const expenseDate = diya.created_at ? new Date(diya.created_at) : new Date();
        let hijriData = {};
        try {
          hijriData = HijriDateManager.convertToHijri(expenseDate);
        } catch (err) {
          hijriData = { hijri_date_string: '', hijri_year: null, hijri_month: null, hijri_day: null, hijri_month_name: '' };
        }

        const transferNotes = `دية داخلية منقولة - ${diya.title_ar || ''}${notes ? ' | ' + notes : ''}`;

        const { rows: expenseRows } = await query(
          `INSERT INTO expenses (
            expense_category, title_ar, title_en, description_ar, amount, currency,
            expense_date, paid_to, payment_method, notes,
            approval_required, status, created_by,
            hijri_date_string, hijri_year, hijri_month, hijri_day, hijri_month_name,
            approved_by, approved_at, approval_notes
          ) VALUES (
            'diya', $1, $2, $3, $4, 'SAR', $5, $6, 'cash', $7,
            false, 'approved', $8,
            $9, $10, $11, $12, $13,
            $8, $14, 'تم النقل تلقائياً من الديات الداخلية'
          ) RETURNING *`,
          [
            diya.title_ar || 'دية داخلية',
            diya.title_en || 'Internal Diya',
            diya.description_ar || transferNotes,
            expenseAmount,
            expenseDate.toISOString().split('T')[0],
            diya.beneficiary_name_ar || diya.beneficiary_name_en || '',
            transferNotes,
            userId,
            hijriData.hijri_date_string || '',
            hijriData.hijri_year || null,
            hijriData.hijri_month || null,
            hijriData.hijri_day || null,
            hijriData.hijri_month_name || '',
            new Date().toISOString()
          ]
        );

        await query(
          "UPDATE activities SET status = 'transferred_to_expense' WHERE id = $1",
          [diyaId]
        );

        results.push({
          diya_id: diyaId,
          expense_id: expenseRows[0]?.id,
          amount: expenseAmount,
          title: diya.title_ar
        });
      } catch (err) {
        errors.push({ id: diyaId, error: err.message });
      }
    }

    const totalTransferred = results.reduce((sum, r) => sum + r.amount, 0);

    res.json({
      success: true,
      data: {
        transferred: results,
        errors: errors,
        total_transferred_amount: totalTransferred,
        count: results.length
      },
      message: `تم نقل ${results.length} من ${diya_ids.length} ديات بنجاح بمبلغ إجمالي ${totalTransferred} ريال`
    });
  } catch (error) {
    log.error('Error bulk transferring diyas', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'فشل في نقل الديات',
      message: config.isDevelopment ? error.message : undefined
    });
  }
};
