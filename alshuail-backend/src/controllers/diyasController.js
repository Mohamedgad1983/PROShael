import { supabase } from '../config/database.js';
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
      payer_id,
      payment_method,
      limit = 50,
      offset = 0,
      start_date,
      end_date,
      min_amount,
      max_amount
    } = req.query;

    let query = supabase
      .from('payments')
      .select('*')
      .eq('category', 'diya')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (payer_id) {
      query = query.eq('payer_id', payer_id);
    }

    if (payment_method) {
      query = query.eq('payment_method', payment_method);
    }

    // Date range filter
    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    // Amount range filter
    if (min_amount) {
      query = query.gte('amount', min_amount);
    }

    if (max_amount) {
      query = query.lte('amount', max_amount);
    }

    const { data: diyas, error, count } = await query;

    if (error) {throw error;}

    // Calculate summary statistics
    const totalAmount = diyas?.reduce((sum, diya) => sum + Number(diya.amount), 0) || 0;
    const paidAmount = diyas?.filter(d => d.status === 'paid').reduce((sum, d) => sum + Number(d.amount), 0) || 0;
    const pendingAmount = diyas?.filter(d => d.status === 'pending').reduce((sum, d) => sum + Number(d.amount), 0) || 0;

    res.json({
      success: true,
      data: diyas || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count || diyas?.length || 0
      },
      summary: {
        total_cases: diyas?.length || 0,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        pending_amount: pendingAmount,
        paid_cases: diyas?.filter(d => d.status === 'paid').length || 0,
        pending_cases: diyas?.filter(d => d.status === 'pending').length || 0
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

    const { data: diya, error } = await supabase
      .from('payments')
      .select(`
        *,
        *
      `)
      .eq('id', id)
      .eq('category', 'diya')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'قضية الدية غير موجودة'
        });
      }
      throw error;
    }

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
    const { data: payer, error: _payerError } = await supabase
      .from('members')
      .select('id, full_name')
      .eq('id', payer_id)
      .single();

    if (_payerError || !payer) {
      return res.status(400).json({
        success: false,
        error: 'الدافع المحدد غير موجود'
      });
    }

    // Generate reference number
    const referenceNumber = generateDiyaReference();

    const diyaData = {
      payer_id,
      amount: diyaAmount,
      category: 'diya',
      title,
      description,
      payment_method,
      status,
      reference_number: referenceNumber,
      notes
    };

    const { data: newDiya, error } = await supabase
      .from('payments')
      .insert([diyaData])
      .select(`
        *,
        *
      `)
      .single();

    if (error) {throw error;}

    res.status(201).json({
      success: true,
      data: newDiya,
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
    const { data: existingDiya, error: _checkError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .eq('category', 'diya')
      .single();

    if (_checkError || !existingDiya) {
      return res.status(404).json({
        success: false,
        error: 'قضية الدية غير موجودة'
      });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (payment_method) {updateData.payment_method = payment_method;}
    if (notes !== undefined) {updateData.notes = notes;}

    const { data: updatedDiya, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        *
      `)
      .single();

    if (error) {throw error;}

    res.json({
      success: true,
      data: updatedDiya,
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
    const { data: existingDiya, error: _checkError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .eq('category', 'diya')
      .single();

    if (_checkError || !existingDiya) {
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

    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Only update provided fields
    if (amount !== undefined) {updateData.amount = Number(amount);}
    if (title !== undefined) {updateData.title = title;}
    if (description !== undefined) {updateData.description = description;}
    if (payment_method !== undefined) {updateData.payment_method = payment_method;}
    if (notes !== undefined) {updateData.notes = notes;}

    const { data: updatedDiya, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        *
      `)
      .single();

    if (error) {throw error;}

    res.json({
      success: true,
      data: updatedDiya,
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
    const { data: existingDiya, error: _checkError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .eq('category', 'diya')
      .single();

    if (_checkError || !existingDiya) {
      return res.status(404).json({
        success: false,
        error: 'قضية الدية غير موجودة'
      });
    }

    // Don't allow deletion of paid diyas
    if (existingDiya.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن حذف قضية دية مدفوعة'
      });
    }

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) {throw error;}

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

    let query = supabase
      .from('payments')
      .select('*')
      .eq('category', 'diya');

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
        query = query.gte('created_at', startDate.toISOString());
      }
    }

    const { data: diyas, error } = await query;

    if (error) {throw error;}

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
    const { data: member, error: _memberError } = await supabase
      .from('members')
      .select('id, full_name')
      .eq('id', memberId)
      .single();

    if (_memberError || !member) {
      return res.status(404).json({
        success: false,
        error: 'العضو غير موجود'
      });
    }

    const { data: diyas, error, count } = await supabase
      .from('payments')
      .select('*')
      .eq('category', 'diya')
      .eq('payer_id', memberId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {throw error;}

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
        total: count || diyas?.length || 0
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