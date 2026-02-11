import { query } from '../services/database.js';
import { PaymentProcessingService } from '../services/paymentProcessingService.js';
import { FinancialAnalyticsService } from '../services/financialAnalyticsService.js';
import { ReceiptService } from '../services/receiptService.js';
import { HijriDateManager, convertToHijriString as _convertToHijriString, convertToHijriYear as _convertToHijriYear, convertToHijriMonth as _convertToHijriMonth, convertToHijriDay as _convertToHijriDay, convertToHijriMonthName as _convertToHijriMonthName } from '../utils/hijriDateUtils.js';
import jwt from 'jsonwebtoken';
import { log } from '../utils/logger.js';
import { validatePayment } from '../validators/payment-validator.js';
import { config } from '../config/env.js';

export const getAllPayments = async (req, res) => {
  try {
    const {
      status,
      member_id,
      category,
      hijri_month,
      hijri_year,
      is_on_behalf,
      sort_by = 'hijri',
      limit = 50,
      offset = 0
    } = req.query;

    // Build dynamic query with JOINs replacing Supabase relation syntax
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (hijri_month) {
      conditions.push(`p.hijri_month = $${paramIndex++}`);
      params.push(parseInt(hijri_month));
    }
    if (hijri_year) {
      conditions.push(`p.hijri_year = $${paramIndex++}`);
      params.push(parseInt(hijri_year));
    }
    if (status) {
      conditions.push(`p.status = $${paramIndex++}`);
      params.push(status);
    }
    if (member_id) {
      conditions.push(`p.payer_id = $${paramIndex++}`);
      params.push(member_id);
    }
    if (category) {
      conditions.push(`p.category = $${paramIndex++}`);
      params.push(category);
    }
    if (is_on_behalf === 'true') {
      conditions.push(`p.is_on_behalf = true`);
    } else if (is_on_behalf === 'false') {
      conditions.push(`(p.is_on_behalf IS NULL OR p.is_on_behalf = false)`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Determine sort order
    let orderClause;
    if (sort_by === 'hijri') {
      orderClause = 'ORDER BY p.hijri_year DESC, p.hijri_month DESC, p.hijri_day DESC';
    } else {
      orderClause = 'ORDER BY p.created_at DESC';
    }

    const { rows: payments } = await query(
      `SELECT p.*,
        json_build_object('full_name', pm.full_name, 'phone', pm.phone) AS payer,
        json_build_object('full_name', bm.full_name, 'phone', bm.phone) AS beneficiary
      FROM payments p
      LEFT JOIN members pm ON p.payer_id = pm.id
      LEFT JOIN members bm ON p.beneficiary_id = bm.id
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Add formatted dates for frontend
    const paymentsWithFormattedDates = (payments || []).map(payment => ({
      ...payment,
      hijri_formatted: HijriDateManager.formatHijriDisplay(payment.hijri_date_string),
      gregorian_formatted: HijriDateManager.formatGregorianSecondary(payment.created_at)
    }));

    res.json({
      success: true,
      data: paymentsWithFormattedDates,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: payments?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب المدفوعات'
    });
  }
};

export const createPayment = async (req, res) => {
  try {
    // Extract user ID from JWT token
    let userId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, config.jwt.secret);
        userId = decoded.id;
      } catch (err) {
        log.warn('Could not extract user ID from token for rate limiting');
      }
    }

    // Validate payment data
    const validation = validatePayment({
      amount: req.body.amount,
      currency: req.body.currency || 'SAR',
      method: req.body.payment_method || req.body.method,
      description: req.body.description
    }, userId);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
        error: validation.errors[0].errorAr || validation.errors[0].error
      });
    }

    const currentDate = new Date();
    const hijriData = HijriDateManager.convertToHijri(currentDate);

    // Auto-generate Hijri dates for new payments
    const paymentDataWithHijri = {
      ...req.body,
      hijri_date_string: hijriData.hijri_date_string,
      hijri_year: hijriData.hijri_year,
      hijri_month: hijriData.hijri_month,
      hijri_day: hijriData.hijri_day,
      hijri_month_name: hijriData.hijri_month_name
    };

    const result = await PaymentProcessingService.createPayment(paymentDataWithHijri);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إنشاء المدفوع'
    });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await PaymentProcessingService.updatePaymentStatus(id, status);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في تحديث حالة المدفوع'
    });
  }
};

export const getPaymentStats = async (req, res) => {
  try {
    const { period: _period = 'month' } = req.query;
    const result = await FinancialAnalyticsService.getPaymentStatistics();

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب إحصائيات المدفوعات'
    });
  }
};

// Enhanced Payment Controller Functions

/**
 * Get comprehensive payment statistics
 */
export const getPaymentStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = {};

    if (startDate) {dateRange.startDate = startDate;}
    if (endDate) {dateRange.endDate = endDate;}

    const result = await FinancialAnalyticsService.getPaymentStatistics(dateRange);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب الإحصائيات المفصلة'
    });
  }
};

/**
 * Get payments for a specific member
 */
export const getMemberPayments = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { status, category, limit = 50, offset = 0 } = req.query;

    // Build dynamic query
    const conditions = ['p.payer_id = $1'];
    const params = [memberId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`p.status = $${paramIndex++}`);
      params.push(status);
    }
    if (category) {
      conditions.push(`p.category = $${paramIndex++}`);
      params.push(category);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const { rows: payments } = await query(
      `SELECT p.*,
        json_build_object('id', m.id, 'full_name', m.full_name, 'phone', m.phone, 'email', m.email, 'membership_number', m.membership_number) AS payer
      FROM payments p
      LEFT JOIN members m ON p.payer_id = m.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Get member's payment summary
    const { rows: summaryData } = await query(
      'SELECT amount, status, category FROM payments WHERE payer_id = $1',
      [memberId]
    );

    const summary = {
      totalPayments: summaryData?.length || 0,
      totalAmount: summaryData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
      paidAmount: summaryData?.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0) || 0,
      pendingAmount: summaryData?.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0) || 0
    };

    res.json({
      success: true,
      data: payments || [],
      summary,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: payments?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب مدفوعات العضو'
    });
  }
};

/**
 * Bulk update payments
 */
export const bulkUpdatePayments = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'قائمة التحديثات مطلوبة'
      });
    }

    const result = await PaymentProcessingService.bulkUpdatePayments(updates);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في التحديث المجمع'
    });
  }
};

/**
 * Generate financial report
 */
export const generateFinancialReport = async (req, res) => {
  try {
    const { period = 'month', includeCharts = true, includeMemberStats = true, includeOverdue = true } = req.query;

    const options = {
      period,
      includeCharts: includeCharts === 'true',
      includeMemberStats: includeMemberStats === 'true',
      includeOverdue: includeOverdue === 'true'
    };

    const result = await FinancialAnalyticsService.generateFinancialReport(options);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إنشاء التقرير المالي'
    });
  }
};

/**
 * Generate payment receipt
 */
export const generateReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { format = 'pdf' } = req.query;

    const result = await ReceiptService.generateReceipt(paymentId, { format });

    if (result.success) {
      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${paymentId}.pdf`);
        res.send(result.data);
      } else {
        res.json(result);
      }
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إنشاء الإيصال'
    });
  }
};

/**
 * Process payment (update to paid status with method)
 */
export const processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { method, amount } = req.body;

    // Extract user ID for rate limiting
    let userId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, config.jwt.secret);
        userId = decoded.id;
      } catch (err) {
        log.warn('Could not extract user ID from token for rate limiting');
      }
    }

    // Validate payment if amount is provided
    if (amount !== undefined) {
      const validation = validatePayment({
        amount: amount,
        currency: 'SAR',
        method: method,
        description: req.body.description
      }, userId);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          errors: validation.errors,
          error: validation.errors[0].errorAr || validation.errors[0].error
        });
      }
    }

    const result = await PaymentProcessingService.processPayment(id, method);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في معالجة المدفوع'
    });
  }
};

/**
 * Get overdue payments
 */
export const getOverduePayments = async (req, res) => {
  try {
    const result = await FinancialAnalyticsService.getOverduePayments();

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب المدفوعات المتأخرة'
    });
  }
};

/**
 * Get payment by ID with full details
 */
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await PaymentProcessingService.getPaymentById(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب بيانات المدفوع'
    });
  }
};

/**
 * Get revenue statistics
 */
export const getRevenueStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const result = await FinancialAnalyticsService.calculateTotalRevenue(period);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب إحصائيات الإيرادات'
    });
  }
};

/**
 * Get payments by category
 */
export const getPaymentsByCategory = async (req, res) => {
  try {
    const result = await FinancialAnalyticsService.getPaymentsByCategory();

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب تصنيف المدفوعات'
    });
  }
};

/**
 * Get member contributions
 */
export const getMemberContributions = async (req, res) => {
  try {
    const result = await FinancialAnalyticsService.getMemberContributions();

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب مساهمات الأعضاء'
    });
  }
};

/**
 * Get Hijri calendar data
 * @route GET /api/hijri-calendar
 */
/* eslint-disable require-await */
export const getHijriCalendarData = async (req, res) => {
  try {
    const months = HijriDateManager.getHijriMonths();
    const currentHijri = HijriDateManager.getCurrentHijriDate();
    const years = HijriDateManager.getHijriYearRange(3);

    res.json({
      success: true,
      data: {
        months: months,
        current_date: currentHijri,
        formatted_date: currentHijri.hijri_date_string,
        years: years
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب بيانات التقويم الهجري'
    });
  }
};

/**
 * Get payments grouped by Hijri month
 * @route GET /api/payments/grouped-hijri
 */
export const getPaymentsGroupedByHijri = async (req, res) => {
  try {
    const { hijri_year, status } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (hijri_year) {
      conditions.push(`p.hijri_year = $${paramIndex++}`);
      params.push(parseInt(hijri_year));
    }
    if (status) {
      conditions.push(`p.status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const { rows: payments } = await query(
      `SELECT p.*,
        json_build_object('full_name', pm.full_name, 'phone', pm.phone) AS payer,
        json_build_object('full_name', bm.full_name, 'phone', bm.phone) AS beneficiary
      FROM payments p
      LEFT JOIN members pm ON p.payer_id = pm.id
      LEFT JOIN members bm ON p.beneficiary_id = bm.id
      ${whereClause}
      ORDER BY p.hijri_year DESC, p.hijri_month DESC, p.hijri_day DESC`,
      params
    );

    // Group payments by Hijri month
    const grouped = HijriDateManager.groupByHijriMonth(payments || []);

    res.json({
      success: true,
      data: grouped,
      total_payments: payments?.length || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب المدفوعات المجمعة'
    });
  }
};

/**
 * Get Hijri-based financial statistics
 * @route GET /api/payments/hijri-stats
 */
export const getHijriFinancialStats = async (req, res) => {
  try {
    const { hijri_month, hijri_year } = req.query;
    const currentHijri = HijriDateManager.getCurrentHijriDate();

    // Filter by Hijri date if provided, otherwise use current
    const filterMonth = hijri_month || currentHijri.hijri_month;
    const filterYear = hijri_year || currentHijri.hijri_year;

    const { rows: payments } = await query(
      'SELECT amount, status, hijri_month, hijri_year, hijri_month_name FROM payments WHERE hijri_month = $1 AND hijri_year = $2',
      [parseInt(filterMonth), parseInt(filterYear)]
    );

    // Calculate statistics
    const stats = {
      hijri_month: filterMonth,
      hijri_year: filterYear,
      hijri_month_name: HijriDateManager.getMonthProperties(filterMonth).name_ar,
      total_amount: payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
      paid_amount: payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0) || 0,
      pending_amount: payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0) || 0,
      total_payments: payments?.length || 0,
      paid_count: payments?.filter(p => p.status === 'paid').length || 0,
      pending_count: payments?.filter(p => p.status === 'pending').length || 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب الإحصائيات الهجرية'
    });
  }
};

function generateReferenceNumber() {
  const prefix = 'SH';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Mobile Payment Controller Functions

export const payForInitiative = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, config.jwt.secret);
    const memberId = decoded.id;

    const { initiative_id, amount, notes } = req.body;

    if (!initiative_id || !amount) {
      return res.status(400).json({
        success: false,
        error: 'معرف المبادرة والمبلغ مطلوبان'
      });
    }

    const currentDate = new Date();
    const hijriData = HijriDateManager.convertToHijri(currentDate);

    // Check if there is an existing active subscription we can reference
    const { rows: existingSubscriptions } = await query(
      'SELECT id FROM subscriptions WHERE member_id = $1 AND status = $2 LIMIT 1',
      [memberId, 'active']
    );

    const subscriptionId = existingSubscriptions?.[0]?.id || null;

    // Build column list and values dynamically based on subscriptionId
    const columns = [
      'payer_id', 'beneficiary_id', 'amount', 'payment_date', 'payment_method',
      'category', 'status', 'reference_number', 'notes',
      'hijri_date_string', 'hijri_year', 'hijri_month', 'hijri_day', 'hijri_month_name',
      'created_at'
    ];
    const values = [
      memberId, memberId, parseFloat(amount),
      currentDate.toISOString().split('T')[0], 'app_payment',
      'initiative', 'pending', generateReferenceNumber(),
      `Initiative Payment: ${initiative_id}. ${notes || ''}`.trim(),
      hijriData.hijri_date_string, hijriData.hijri_year, hijriData.hijri_month,
      hijriData.hijri_day, hijriData.hijri_month_name,
      currentDate.toISOString()
    ];

    if (subscriptionId) {
      columns.push('subscription_id');
      values.push(subscriptionId);
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const { rows: paymentRows } = await query(
      `INSERT INTO payments (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    const payment = paymentRows[0];

    res.status(201).json({
      success: true,
      data: payment,
      message: 'تم إنشاء دفعة المبادرة بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إنشاء دفعة المبادرة'
    });
  }
};

export const payForDiya = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, config.jwt.secret);
    const memberId = decoded.id;

    const { diya_id, amount, notes } = req.body;

    if (!diya_id || !amount) {
      return res.status(400).json({
        success: false,
        error: 'معرف الدية والمبلغ مطلوبان'
      });
    }

    const currentDate = new Date();
    const hijriData = HijriDateManager.convertToHijri(currentDate);

    const { rows: paymentRows } = await query(
      `INSERT INTO payments (
        payer_id, beneficiary_id, subscription_id, amount, payment_date,
        payment_method, category, status, reference_number, notes,
        hijri_date_string, hijri_year, hijri_month, hijri_day, hijri_month_name,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        memberId,
        memberId,
        '00000000-0000-0000-0000-000000000000',
        parseFloat(amount),
        currentDate.toISOString().split('T')[0],
        'app_payment',
        'diya',
        'pending',
        generateReferenceNumber(),
        `Diya Payment: ${diya_id}. ${notes || ''}`.trim(),
        hijriData.hijri_date_string,
        hijriData.hijri_year,
        hijriData.hijri_month,
        hijriData.hijri_day,
        hijriData.hijri_month_name,
        currentDate.toISOString()
      ]
    );

    const payment = paymentRows[0];

    res.status(201).json({
      success: true,
      data: payment,
      message: 'تم إنشاء دفعة الدية بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إنشاء دفعة الدية'
    });
  }
};

export const paySubscription = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, config.jwt.secret);
    const memberId = decoded.id;

    const { amount, subscription_period, notes } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'المبلغ مطلوب'
      });
    }

    const currentDate = new Date();
    const hijriData = HijriDateManager.convertToHijri(currentDate);

    const { rows: paymentRows } = await query(
      `INSERT INTO payments (
        payer_id, beneficiary_id, subscription_id, amount, payment_date,
        payment_method, category, status, reference_number, notes,
        hijri_date_string, hijri_year, hijri_month, hijri_day, hijri_month_name,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        memberId,
        memberId,
        '00000000-0000-0000-0000-000000000001',
        parseFloat(amount),
        currentDate.toISOString().split('T')[0],
        'app_payment',
        'subscription',
        'pending',
        generateReferenceNumber(),
        `Subscription Payment (${subscription_period || 'monthly'}). ${notes || ''}`.trim(),
        hijriData.hijri_date_string,
        hijriData.hijri_year,
        hijriData.hijri_month,
        hijriData.hijri_day,
        hijriData.hijri_month_name,
        currentDate.toISOString()
      ]
    );

    const payment = paymentRows[0];

    res.status(201).json({
      success: true,
      data: payment,
      message: 'تم إنشاء دفعة الاشتراك بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إنشاء دفعة الاشتراك'
    });
  }
};

export const payForMember = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, config.jwt.secret);
    const payerId = decoded.id;

    const { beneficiary_id, amount, payment_category, notes } = req.body;

    if (!beneficiary_id || !amount || !payment_category) {
      return res.status(400).json({
        success: false,
        error: 'معرف المستفيد والمبلغ وفئة الدفع مطلوبان'
      });
    }

    // Verify beneficiary exists
    const { rows: beneficiaryRows } = await query(
      'SELECT id, full_name, membership_status FROM members WHERE id = $1 LIMIT 1',
      [beneficiary_id]
    );
    const beneficiary = beneficiaryRows[0];

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        error: 'المستفيد غير موجود'
      });
    }

    if (beneficiary.membership_status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'المستفيد غير نشط'
      });
    }

    const currentDate = new Date();
    const hijriData = HijriDateManager.convertToHijri(currentDate);

    const { rows: paymentRows } = await query(
      `INSERT INTO payments (
        payer_id, beneficiary_id, subscription_id, amount, payment_date,
        payment_method, category, status, reference_number, notes,
        hijri_date_string, hijri_year, hijri_month, hijri_day, hijri_month_name,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        payerId,
        beneficiary_id,
        '00000000-0000-0000-0000-000000000000',
        parseFloat(amount),
        currentDate.toISOString().split('T')[0],
        'app_payment',
        payment_category,
        'pending',
        generateReferenceNumber(),
        `Payment on behalf of ${beneficiary.full_name}. ${notes || ''}`.trim(),
        hijriData.hijri_date_string,
        hijriData.hijri_year,
        hijriData.hijri_month,
        hijriData.hijri_day,
        hijriData.hijri_month_name,
        currentDate.toISOString()
      ]
    );

    const payment = paymentRows[0];

    res.status(201).json({
      success: true,
      data: {
        ...payment,
        beneficiary_name: beneficiary.full_name
      },
      message: `تم إنشاء الدفعة لصالح ${beneficiary.full_name} بنجاح`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في إنشاء الدفعة'
    });
  }
};

export const uploadPaymentReceipt = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, config.jwt.secret);
    const memberId = decoded.id;
    const { paymentId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'ملف الإيصال مطلوب'
      });
    }

    // Verify payment belongs to this member
    const { rows: paymentRows } = await query(
      'SELECT * FROM payments WHERE id = $1 AND payer_id = $2 LIMIT 1',
      [paymentId, memberId]
    );
    const payment = paymentRows[0];

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'الدفعة غير موجودة أو غير مخولة'
      });
    }

    // Update the payment with receipt info
    const { rows: updatedRows } = await query(
      `UPDATE payments SET
        receipt_uploaded = $1, receipt_filename = $2, receipt_size = $3,
        receipt_mimetype = $4, status = $5, updated_at = $6
      WHERE id = $7
      RETURNING *`,
      [
        true,
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        'pending_verification',
        new Date().toISOString(),
        paymentId
      ]
    );

    const updatedPayment = updatedRows[0];

    res.json({
      success: true,
      data: updatedPayment,
      message: 'تم رفع الإيصال بنجاح وهو قيد المراجعة'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في رفع الإيصال'
    });
  }
};
