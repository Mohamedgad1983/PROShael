import { query } from '../services/database.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

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
    const conditions = ["(title_ar ILIKE '%دية%' OR title_en ILIKE '%diya%')"];
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (payment_status) {
      conditions.push(`payment_status = $${paramIndex++}`);
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

    // Step 3: Map contributions to their activities
    const diyas = (activities || []).map(activity => ({
      ...activity,
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
