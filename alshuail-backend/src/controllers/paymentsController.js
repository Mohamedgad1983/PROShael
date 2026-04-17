import { query } from '../services/database.js';
import { PaymentProcessingService } from '../services/paymentProcessingService.js';
import { FinancialAnalyticsService } from '../services/financialAnalyticsService.js';
import { ReceiptService } from '../services/receiptService.js';
import { HijriDateManager, convertToHijriString as _convertToHijriString, convertToHijriYear as _convertToHijriYear, convertToHijriMonth as _convertToHijriMonth, convertToHijriDay as _convertToHijriDay, convertToHijriMonthName as _convertToHijriMonthName } from '../utils/hijriDateUtils.js';
import jwt from 'jsonwebtoken';
import { log } from '../utils/logger.js';
import { validatePayment } from '../validators/payment-validator.js';
import { config } from '../config/env.js';
import {
  uploadToSupabase as uploadDocumentFile,
  getSignedUrl as getDocumentUrl,
  deleteFromSupabase as deleteDocumentFile
} from '../config/documentStorage.js';

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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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

// ============================================================================
// Approval queue — pending payments awaiting admin action
// ============================================================================

/**
 * GET /api/payments/pending
 * Returns all payments waiting on admin approval, joined with payer info.
 * Intended for the admin "موافقات الدفعات" screen.
 * Status values considered pending: 'pending', 'pending_verification'.
 */
export const getPendingPayments = async (req, res) => {
  try {
    const { category, limit = 100, offset = 0 } = req.query;

    const filters = [`p.status IN ('pending', 'pending_verification')`];
    const params = [];

    if (category) {
      params.push(category);
      filters.push(`p.category = $${params.length}`);
    }

    params.push(Number(limit) || 100);
    params.push(Number(offset) || 0);

    const { rows } = await query(
      `SELECT
         p.id,
         p.payer_id,
         p.beneficiary_id,
         p.amount,
         p.category,
         p.status,
         p.payment_method,
         p.reference_number,
         p.notes,
         p.created_at,
         p.updated_at,
         p.receipt_document_id,
         -- Receipt metadata comes from the joined documents_metadata row
         -- (payments table never had receipt_uploaded/filename/mimetype
         -- columns — they were referenced by old code that silently failed).
         doc.file_path       AS receipt_file_path,
         doc.original_name   AS receipt_original_name,
         doc.file_size       AS receipt_file_size,
         doc.file_type       AS receipt_mimetype,
         (p.receipt_document_id IS NOT NULL) AS receipt_uploaded,
         payer.full_name     AS payer_name,
         payer.phone         AS payer_phone,
         payer.membership_number AS payer_membership_number,
         ben.full_name       AS beneficiary_name
       FROM payments p
       LEFT JOIN members payer ON p.payer_id = payer.id
       LEFT JOIN members ben   ON p.beneficiary_id = ben.id
       LEFT JOIN documents_metadata doc
              ON p.receipt_document_id = doc.id
             AND doc.status = 'active'
      WHERE ${filters.join(' AND ')}
      ORDER BY p.created_at ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Attach a ready-to-open URL for each receipt so the admin UI doesn't
    // have to know about the storage backend.
    //
    // We must return an ABSOLUTE URL pointing at the backend host. The admin
    // dashboard runs on alshailfund.com (Cloudflare Pages) while the files
    // are served by express on api.alshailfund.com. A relative `/uploads/...`
    // URL would route to Cloudflare Pages, which doesn't serve these files
    // and falls back to /login — that's what kicks the admin out when they
    // click "عرض الوصل".
    //
    // Priority for the URL base:
    //   1. UPLOAD_URL env var if explicitly set
    //   2. Derive from the request itself (protocol + host) — works for
    //      localhost dev AND prod behind the nginx reverse proxy.
    const protocol = req.protocol;
    const host = req.get('host') || 'api.alshailfund.com';
    const uploadBaseUrl = process.env.UPLOAD_URL || `${protocol}://${host}/uploads`;
    const bucketName = 'member-documents';
    const withReceiptUrl = rows.map((r) => ({
      ...r,
      receipt_url: r.receipt_file_path
        ? `${uploadBaseUrl}/${bucketName}/${r.receipt_file_path}`
        : null
    }));

    res.json({
      success: true,
      data: withReceiptUrl,
      count: withReceiptUrl.length
    });
  } catch (error) {
    log.error('Error fetching pending payments', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الدفعات المعلقة',
      error_code: 'PENDING_FETCH_ERROR'
    });
  }
};

/**
 * GET /api/payments/pending/stats
 * Summary counters for the admin dashboard card.
 */
export const getPendingPaymentsStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         COUNT(*)::int                                              AS total_pending,
         COALESCE(SUM(amount), 0)                                   AS total_amount,
         COUNT(DISTINCT payer_id)::int                              AS unique_payers,
         COUNT(*) FILTER (WHERE category = 'subscription')::int     AS subscription_count,
         COUNT(*) FILTER (WHERE category = 'initiative')::int       AS initiative_count,
         COUNT(*) FILTER (WHERE category = 'diya')::int             AS diya_count,
         COUNT(*) FILTER (WHERE status = 'pending')::int            AS awaiting_action,
         COUNT(*) FILTER (WHERE status = 'pending_verification')::int AS awaiting_verification
       FROM payments
      WHERE status IN ('pending', 'pending_verification')`
    );

    res.json({
      success: true,
      data: rows[0] || {}
    });
  } catch (error) {
    log.error('Error fetching pending payment stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إحصائيات الدفعات المعلقة',
      error_code: 'PENDING_STATS_ERROR'
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

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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

    // Look up the member's subscription row — payments.subscription_id is an
    // FK to subscriptions.id, so we must use a real one or leave it NULL.
    // The old code hardcoded '00000000-0000-0000-0000-000000000001' which
    // violated the FK for every member that didn't happen to have that id.
    let subscriptionId = null;
    try {
      const { rows: subRows } = await query(
        'SELECT id FROM subscriptions WHERE member_id = $1 ORDER BY created_at DESC LIMIT 1',
        [memberId]
      );
      if (subRows.length) subscriptionId = subRows[0].id;
    } catch (lookupErr) {
      log.warn('paySubscription: subscription lookup failed — proceeding with NULL subscription_id', {
        memberId,
        error: lookupErr.message
      });
    }

    // Build INSERT dynamically so we only include subscription_id when we have one.
    const cols = [
      'payer_id', 'beneficiary_id', 'amount', 'payment_date',
      'payment_method', 'category', 'status', 'reference_number', 'notes',
      'hijri_date_string', 'hijri_year', 'hijri_month', 'hijri_day',
      'hijri_month_name', 'created_at'
    ];
    const vals = [
      memberId,
      memberId,
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
    ];

    if (subscriptionId) {
      cols.push('subscription_id');
      vals.push(subscriptionId);
    }

    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    const { rows: paymentRows } = await query(
      `INSERT INTO payments (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      vals
    );

    const payment = paymentRows[0];

    res.status(201).json({
      success: true,
      data: payment,
      message: 'تم إنشاء دفعة الاشتراك بنجاح'
    });
  } catch (error) {
    log.error('paySubscription failed', { error: error.message });
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
  let savedFilePath = null; // track for rollback on DB failure

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, config.jwt.secret);
    const memberId = decoded.id;

    // Resolve the uploaded file — support both upload.single('receipt')
    // (req.file) and upload.any() (req.files[0]) since mobile clients vary
    // on the multipart field name.
    const uploadedFile = req.file || (Array.isArray(req.files) && req.files[0]) || null;
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'ملف الإيصال مطلوب'
      });
    }

    // Resolve paymentId from several possible sources:
    //   1. URL param  /mobile/upload-receipt/:paymentId
    //   2. body       { paymentId: '...' }
    //   3. fallback   the member's most recent pending* payment
    let paymentId = req.params.paymentId || req.body?.paymentId;

    if (!paymentId) {
      const { rows: latest } = await query(
        `SELECT id FROM payments
          WHERE payer_id = $1
            AND status IN ('pending', 'pending_verification')
            AND receipt_document_id IS NULL
          ORDER BY created_at DESC
          LIMIT 1`,
        [memberId]
      );
      paymentId = latest[0]?.id;
    }

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم تحديد الدفعة. أرسل paymentId أو ارفع الوصل فور إنشاء الدفعة.'
      });
    }

    // Verify payment belongs to this member — also pull the payer's name so
    // the generated document title is human-readable in /admin/documents.
    const { rows: paymentRows } = await query(
      `SELECT p.*, m.full_name AS payer_full_name
         FROM payments p
         LEFT JOIN members m ON p.payer_id = m.id
        WHERE p.id = $1 AND p.payer_id = $2
        LIMIT 1`,
      [paymentId, memberId]
    );
    const payment = paymentRows[0];

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'الدفعة غير موجودة أو غير مخولة'
      });
    }

    // 1. Persist the file under the member's receipts folder so it shows up
    //    in /admin/documents → {member_id}/receipts/{timestamp}_{filename}
    const uploaded = await uploadDocumentFile(uploadedFile, payment.payer_id, 'receipts');
    savedFilePath = uploaded.path;

    // 2. Insert a documents_metadata row so the admin dashboard can list it
    //    alongside the member's other documents. Title includes the member's
    //    name (primary) and the payment reference (secondary) for easy scan.
    const payerName = payment.payer_full_name?.trim();
    const ref = payment.reference_number || paymentId;
    const receiptTitle = payerName
      ? `وصل دفعة - ${payerName}`
      : `وصل دفعة ${ref}`;
    const { rows: docRows } = await query(
      `INSERT INTO documents_metadata (
         member_id, uploaded_by, title, description, category,
         file_path, file_size, file_type, original_name, status
       ) VALUES ($1, $2, $3, $4, 'receipts', $5, $6, $7, $8, 'active')
       RETURNING id, file_path`,
      [
        payment.payer_id,
        memberId, // same as payer_id for self-upload; different for admin uploads later
        receiptTitle,
        payment.notes || '',
        uploaded.path,
        uploaded.size,
        uploaded.type,
        uploadedFile.originalname
      ]
    );
    const documentRow = docRows[0];

    // 3. Update the payment: link to the new document row and move status
    //    to pending_verification. All file metadata (filename, size, mimetype,
    //    path) lives in documents_metadata — join on receipt_document_id to
    //    read it. The receipt_uploaded / receipt_filename / receipt_size /
    //    receipt_mimetype columns that the old code referenced never actually
    //    existed on the payments table, so every historical upload silently
    //    failed at this step.
    const { rows: updatedRows } = await query(
      `UPDATE payments SET
         receipt_document_id  = $1,
         status               = $2,
         updated_at           = $3
       WHERE id = $4
       RETURNING *`,
      [
        documentRow.id,
        'pending_verification',
        new Date().toISOString(),
        paymentId
      ]
    );

    const updatedPayment = updatedRows[0];
    updatedPayment.receipt_url = getDocumentUrl(uploaded.path);

    log.info('Payment receipt uploaded and linked to documents', {
      paymentId,
      memberId: payment.payer_id,
      documentId: documentRow.id,
      filePath: uploaded.path
    });

    res.json({
      success: true,
      data: updatedPayment,
      message: 'تم رفع الإيصال بنجاح وهو قيد المراجعة'
    });
  } catch (error) {
    // If the file was saved to disk but a subsequent DB step failed, roll the
    // file back so we don't leave orphaned files in the upload directory.
    if (savedFilePath) {
      try {
        await deleteDocumentFile(savedFilePath);
      } catch (cleanupErr) {
        log.warn('Failed to clean up orphaned receipt file after error', {
          filePath: savedFilePath,
          error: cleanupErr.message
        });
      }
    }

    log.error('uploadPaymentReceipt failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في رفع الإيصال'
    });
  }
};
