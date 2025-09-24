import { supabase } from '../config/database.js';
import { PaymentProcessingService } from '../services/paymentProcessingService.js';
import { FinancialAnalyticsService } from '../services/financialAnalyticsService.js';
import { ReceiptService } from '../services/receiptService.js';
import { HijriDateManager, convertToHijriString, convertToHijriYear, convertToHijriMonth, convertToHijriDay, convertToHijriMonthName } from '../utils/hijriDateUtils.js';
import jwt from 'jsonwebtoken';

export const getAllPayments = async (req, res) => {
  try {
    const {
      status,
      member_id,
      category,
      hijri_month,
      hijri_year,
      sort_by = 'hijri',
      limit = 50,
      offset = 0
    } = req.query;

    let query = supabase
      .from('payments')
      .select(`
        *,
        payer:members!payer_id(full_name, phone),
        beneficiary:members!beneficiary_id(full_name, phone)
      `)
      .range(offset, offset + limit - 1);

    // Apply Hijri filtering
    if (hijri_month) query = query.eq('hijri_month', parseInt(hijri_month));
    if (hijri_year) query = query.eq('hijri_year', parseInt(hijri_year));

    // Apply other filters
    if (status) query = query.eq('status', status);
    if (member_id) query = query.eq('payer_id', member_id);
    if (category) query = query.eq('category', category);

    // Apply Hijri-primary sorting
    if (sort_by === 'hijri') {
      query = query
        .order('hijri_year', { ascending: false })
        .order('hijri_month', { ascending: false })
        .order('hijri_day', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: payments, error } = await query;

    if (error) throw error;

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
    const { period = 'month' } = req.query;
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

    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

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

    let query = supabase
      .from('payments')
      .select(`
        *,
        payer:members(id, full_name, phone, email, membership_number)
      `)
      .eq('payer_id', memberId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);

    const { data: payments, error } = await query;

    if (error) throw error;

    // Get member's payment summary
    const { data: summaryData } = await supabase
      .from('payments')
      .select('amount, status, category')
      .eq('payer_id', memberId);

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
    const { method } = req.body;

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

    let query = supabase
      .from('payments')
      .select(`
        *,
        payer:members!payer_id(full_name, phone),
        beneficiary:members!beneficiary_id(full_name, phone)
      `)
      .order('hijri_year', { ascending: false })
      .order('hijri_month', { ascending: false })
      .order('hijri_day', { ascending: false });

    if (hijri_year) query = query.eq('hijri_year', parseInt(hijri_year));
    if (status) query = query.eq('status', status);

    const { data: payments, error } = await query;

    if (error) throw error;

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

    let query = supabase
      .from('payments')
      .select('amount, status, hijri_month, hijri_year, hijri_month_name');

    // Filter by Hijri date if provided, otherwise use current
    const filterMonth = hijri_month || currentHijri.hijri_month;
    const filterYear = hijri_year || currentHijri.hijri_year;

    query = query
      .eq('hijri_month', parseInt(filterMonth))
      .eq('hijri_year', parseInt(filterYear));

    const { data: payments, error } = await query;

    if (error) throw error;

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-2024');
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

    // First, let's check if there's an existing subscription we can reference
    const { data: existingSubscriptions } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .limit(1);

    const subscriptionId = existingSubscriptions?.[0]?.id || null;

    const paymentData = {
      payer_id: memberId,
      beneficiary_id: memberId, // Required field - paying for self
      amount: parseFloat(amount),
      payment_date: currentDate.toISOString().split('T')[0], // Required field - date format
      payment_method: 'app_payment', // Required field - must match check constraint
      category: 'initiative',
      status: 'pending',
      reference_number: generateReferenceNumber(),
      notes: `Initiative Payment: ${initiative_id}. ${notes || ''}`.trim(),
      hijri_date_string: hijriData.hijri_date_string,
      hijri_year: hijriData.hijri_year,
      hijri_month: hijriData.hijri_month,
      hijri_day: hijriData.hijri_day,
      hijri_month_name: hijriData.hijri_month_name,
      created_at: currentDate.toISOString()
    };

    // Only add subscription_id if we have one (to avoid NOT NULL constraint)
    if (subscriptionId) {
      paymentData.subscription_id = subscriptionId;
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) throw error;

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-2024');
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

    const paymentData = {
      payer_id: memberId,
      beneficiary_id: memberId, // Required field - paying for self
      subscription_id: '00000000-0000-0000-0000-000000000000', // Required field - use null UUID for non-subscription payments
      amount: parseFloat(amount),
      payment_date: currentDate.toISOString().split('T')[0], // Required field - date format
      payment_method: 'app_payment', // Required field - must match check constraint
      category: 'diya',
      status: 'pending',
      reference_number: generateReferenceNumber(),
      notes: `Diya Payment: ${diya_id}. ${notes || ''}`.trim(),
      hijri_date_string: hijriData.hijri_date_string,
      hijri_year: hijriData.hijri_year,
      hijri_month: hijriData.hijri_month,
      hijri_day: hijriData.hijri_day,
      hijri_month_name: hijriData.hijri_month_name,
      created_at: currentDate.toISOString()
    };

    const { data: payment, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) throw error;

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-2024');
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

    const paymentData = {
      payer_id: memberId,
      beneficiary_id: memberId, // Required field - paying for self
      subscription_id: '00000000-0000-0000-0000-000000000001', // Required field - use different UUID for subscription payments
      amount: parseFloat(amount),
      payment_date: currentDate.toISOString().split('T')[0], // Required field - date format
      payment_method: 'app_payment', // Required field - must match check constraint
      category: 'subscription',
      status: 'pending',
      reference_number: generateReferenceNumber(),
      notes: `Subscription Payment (${subscription_period || 'monthly'}). ${notes || ''}`.trim(),
      hijri_date_string: hijriData.hijri_date_string,
      hijri_year: hijriData.hijri_year,
      hijri_month: hijriData.hijri_month,
      hijri_day: hijriData.hijri_day,
      hijri_month_name: hijriData.hijri_month_name,
      created_at: currentDate.toISOString()
    };

    const { data: payment, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) throw error;

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-2024');
    const payerId = decoded.id;

    const { beneficiary_id, amount, payment_category, notes } = req.body;

    if (!beneficiary_id || !amount || !payment_category) {
      return res.status(400).json({
        success: false,
        error: 'معرف المستفيد والمبلغ وفئة الدفع مطلوبان'
      });
    }

    // Verify beneficiary exists
    const { data: beneficiary, error: beneficiaryError } = await supabase
      .from('members')
      .select('id, full_name, membership_status')
      .eq('id', beneficiary_id)
      .single();

    if (beneficiaryError || !beneficiary) {
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

    const paymentData = {
      payer_id: payerId,
      beneficiary_id,
      subscription_id: '00000000-0000-0000-0000-000000000000', // Required field - use null UUID for non-subscription payments
      amount: parseFloat(amount),
      payment_date: currentDate.toISOString().split('T')[0], // Required field - date format
      payment_method: 'app_payment', // Required field - must match check constraint
      category: payment_category,
      status: 'pending',
      reference_number: generateReferenceNumber(),
      notes: `Payment on behalf of ${beneficiary.full_name}. ${notes || ''}`.trim(),
      hijri_date_string: hijriData.hijri_date_string,
      hijri_year: hijriData.hijri_year,
      hijri_month: hijriData.hijri_month,
      hijri_day: hijriData.hijri_day,
      hijri_month_name: hijriData.hijri_month_name,
      created_at: currentDate.toISOString()
    };

    const { data: payment, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) throw error;

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-2024');
    const memberId = decoded.id;
    const { paymentId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'ملف الإيصال مطلوب'
      });
    }

    // Verify payment belongs to this member
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('payer_id', memberId)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({
        success: false,
        error: 'الدفعة غير موجودة أو غير مخولة'
      });
    }

    // In a real implementation, you would upload to cloud storage
    // For now, we'll just update the payment with receipt info
    const receiptData = {
      receipt_uploaded: true,
      receipt_filename: req.file.originalname,
      receipt_size: req.file.size,
      receipt_mimetype: req.file.mimetype,
      status: 'pending_verification',
      updated_at: new Date().toISOString()
    };

    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update(receiptData)
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError) throw updateError;

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