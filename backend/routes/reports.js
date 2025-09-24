const express = require('express');
const { query } = require('express-validator');
const reportsController = require('../controllers/reportsController');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');

const router = express.Router();

// تطبيق المصادقة على جميع المسارات
router.use(authenticateToken);

// تطبيق صلاحيات التقارير المالية على جميع المسارات
router.use(requireRole([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.FINANCIAL_MANAGER,
  ROLES.ACCOUNTANT
]));

// تقرير المعاملات المالية - Financial transactions report
router.get('/financial-transactions', [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('تاريخ البداية غير صحيح'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('تاريخ النهاية غير صحيح'),
  query('payment_method')
    .optional()
    .isIn(['app_payment', 'bank_transfer'])
    .withMessage('طريقة الدفع غير صحيحة'),
  query('payment_status')
    .optional()
    .isIn(['pending_verification', 'approved', 'rejected', 'completed', 'failed'])
    .withMessage('حالة الدفع غير صحيحة'),
  query('payer_id')
    .optional()
    .isUUID()
    .withMessage('معرف الدافع غير صحيح'),
  query('beneficiary_id')
    .optional()
    .isUUID()
    .withMessage('معرف المستفيد غير صحيح'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('عدد العناصر يجب أن يكون بين 1 و 1000'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('الإزاحة يجب أن تكون رقماً موجباً'),
  query('export_format')
    .optional()
    .isIn(['json', 'excel'])
    .withMessage('صيغة التصدير غير صحيحة'),
  validateRequest
], reportsController.getFinancialTransactionsReport);

// تقرير الاشتراكات - Subscriptions report
router.get('/subscriptions', [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('تاريخ البداية غير صحيح'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('تاريخ النهاية غير صحيح'),
  query('status')
    .optional()
    .isIn(['pending_payment', 'active', 'expired', 'cancelled'])
    .withMessage('حالة الاشتراك غير صحيحة'),
  query('member_id')
    .optional()
    .isUUID()
    .withMessage('معرف العضو غير صحيح'),
  query('subscriber_id')
    .optional()
    .isUUID()
    .withMessage('معرف المشترك غير صحيح'),
  query('subscription_type')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('نوع الاشتراك غير صحيح'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('عدد العناصر يجب أن يكون بين 1 و 1000'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('الإزاحة يجب أن تكون رقماً موجباً'),
  query('export_format')
    .optional()
    .isIn(['json', 'excel'])
    .withMessage('صيغة التصدير غير صحيحة'),
  validateRequest
], reportsController.getSubscriptionsReport);

// تقرير الدفع للآخرين - Pay for others report
router.get('/pay-for-others', [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('تاريخ البداية غير صحيح'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('تاريخ النهاية غير صحيح'),
  query('payer_id')
    .optional()
    .isUUID()
    .withMessage('معرف الدافع غير صحيح'),
  query('beneficiary_id')
    .optional()
    .isUUID()
    .withMessage('معرف المستفيد غير صحيح'),
  query('payment_status')
    .optional()
    .isIn(['pending_verification', 'approved', 'rejected', 'completed', 'failed'])
    .withMessage('حالة الدفع غير صحيحة'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('عدد العناصر يجب أن يكون بين 1 و 1000'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('الإزاحة يجب أن تكون رقماً موجباً'),
  query('export_format')
    .optional()
    .isIn(['json', 'excel'])
    .withMessage('صيغة التصدير غير صحيحة'),
  validateRequest
], reportsController.getPayForOthersReport);

// إحصائيات لوحة التحكم - Dashboard statistics
router.get('/dashboard-stats', [
  query('period')
    .optional()
    .isIn(['week', 'month', 'quarter', 'year'])
    .withMessage('الفترة غير صحيحة'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('تاريخ البداية غير صحيح'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('تاريخ النهاية غير صحيح'),
  validateRequest
], reportsController.getDashboardStats);

// تصدير إلى Excel - Export to Excel
router.get('/export-excel', [
  query('report_type')
    .notEmpty()
    .withMessage('نوع التقرير مطلوب')
    .isIn(['transactions', 'subscriptions', 'pay_for_others'])
    .withMessage('نوع التقرير غير صحيح'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('تاريخ البداية غير صحيح'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('تاريخ النهاية غير صحيح'),
  query('payment_method')
    .optional()
    .isIn(['app_payment', 'bank_transfer'])
    .withMessage('طريقة الدفع غير صحيحة'),
  query('payment_status')
    .optional()
    .isIn(['pending_verification', 'approved', 'rejected', 'completed', 'failed'])
    .withMessage('حالة الدفع غير صحيحة'),
  query('status')
    .optional()
    .isIn(['pending_payment', 'active', 'expired', 'cancelled'])
    .withMessage('حالة الاشتراك غير صحيحة'),
  query('payer_id')
    .optional()
    .isUUID()
    .withMessage('معرف الدافع غير صحيح'),
  query('beneficiary_id')
    .optional()
    .isUUID()
    .withMessage('معرف المستفيد غير صحيح'),
  validateRequest
], reportsController.exportToExcel);

// مسارات إضافية للتقارير المتقدمة

// تقرير الإيرادات الشهرية
router.get('/monthly-revenue', [
  query('year')
    .optional()
    .isInt({ min: 2020, max: 2030 })
    .withMessage('السنة غير صحيحة'),
  validateRequest
], async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const startDate = new Date(year, 0, 1).toISOString();
    const endDate = new Date(year + 1, 0, 1).toISOString();

    const { data: payments, error } = await supabase
      .from('payments')
      .select('amount, created_at, payment_status')
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .in('payment_status', ['completed', 'approved']);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في استرجاع بيانات الإيرادات',
        error: error.message
      });
    }

    // تجميع البيانات حسب الشهر
    const monthlyRevenue = Array(12).fill(0);
    payments.forEach(payment => {
      const month = new Date(payment.created_at).getMonth();
      monthlyRevenue[month] += payment.amount || 0;
    });

    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const result = monthlyRevenue.map((revenue, index) => ({
      month: index + 1,
      month_name: monthNames[index],
      revenue: revenue,
      transactions_count: payments.filter(p =>
        new Date(p.created_at).getMonth() === index
      ).length
    }));

    res.json({
      success: true,
      message: `تم استرجاع إيرادات عام ${year} بنجاح`,
      messageEn: `Revenue data for ${year} retrieved successfully`,
      data: {
        year: parseInt(year),
        total_revenue: monthlyRevenue.reduce((sum, revenue) => sum + revenue, 0),
        monthly_breakdown: result
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم',
      messageEn: 'Internal server error',
      error: error.message
    });
  }
});

// تقرير أفضل المساهمين
router.get('/top-contributors', [
  query('period')
    .optional()
    .isIn(['week', 'month', 'quarter', 'year'])
    .withMessage('الفترة غير صحيحة'),
  query('limit')
    .optional()
    .isInt({ min: 5, max: 50 })
    .withMessage('عدد المساهمين يجب أن يكون بين 5 و 50'),
  validateRequest
], async (req, res) => {
  try {
    const { period = 'month', limit = 10 } = req.query;

    // حساب نطاق التاريخ
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        payer_id,
        amount,
        beneficiary_id,
        payer:payer_id(full_name, membership_number)
      `)
      .gte('created_at', startDate.toISOString())
      .in('payment_status', ['completed', 'approved']);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في استرجاع بيانات المساهمين',
        error: error.message
      });
    }

    // تجميع المساهمات حسب الدافع
    const contributors = {};
    payments.forEach(payment => {
      if (!contributors[payment.payer_id]) {
        contributors[payment.payer_id] = {
          name: payment.payer?.full_name || 'غير محدد',
          membership_number: payment.payer?.membership_number || 'غير محدد',
          total_paid: 0,
          self_payments: 0,
          pay_for_others: 0,
          transactions_count: 0
        };
      }

      contributors[payment.payer_id].total_paid += payment.amount || 0;
      contributors[payment.payer_id].transactions_count += 1;

      if (payment.payer_id === payment.beneficiary_id) {
        contributors[payment.payer_id].self_payments += payment.amount || 0;
      } else {
        contributors[payment.payer_id].pay_for_others += payment.amount || 0;
      }
    });

    const topContributors = Object.values(contributors)
      .sort((a, b) => b.total_paid - a.total_paid)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      message: `أفضل ${limit} مساهمين خلال ${period}`,
      messageEn: `Top ${limit} contributors for ${period}`,
      data: {
        period: period,
        date_range: {
          start: startDate.toISOString(),
          end: now.toISOString()
        },
        contributors: topContributors,
        total_contributors: Object.keys(contributors).length,
        total_amount: Object.values(contributors)
          .reduce((sum, c) => sum + c.total_paid, 0)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم',
      messageEn: 'Internal server error',
      error: error.message
    });
  }
});

// تقرير حالات الدفع
router.get('/payment-status-summary', [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('تاريخ البداية غير صحيح'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('تاريخ النهاية غير صحيح'),
  validateRequest
], async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = supabase
      .from('payments')
      .select('payment_status, payment_method, amount, created_at');

    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    const { data: payments, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في استرجاع بيانات الدفعات',
        error: error.message
      });
    }

    // تجميع البيانات حسب الحالة وطريقة الدفع
    const summary = {
      by_status: {},
      by_method: {},
      by_status_and_method: {},
      totals: {
        count: payments.length,
        amount: payments.reduce((sum, p) => sum + (p.amount || 0), 0)
      }
    };

    payments.forEach(payment => {
      const status = payment.payment_status;
      const method = payment.payment_method;
      const amount = payment.amount || 0;

      // تجميع حسب الحالة
      if (!summary.by_status[status]) {
        summary.by_status[status] = { count: 0, amount: 0 };
      }
      summary.by_status[status].count += 1;
      summary.by_status[status].amount += amount;

      // تجميع حسب طريقة الدفع
      if (!summary.by_method[method]) {
        summary.by_method[method] = { count: 0, amount: 0 };
      }
      summary.by_method[method].count += 1;
      summary.by_method[method].amount += amount;

      // تجميع حسب الحالة وطريقة الدفع
      const key = `${status}_${method}`;
      if (!summary.by_status_and_method[key]) {
        summary.by_status_and_method[key] = {
          status: status,
          method: method,
          count: 0,
          amount: 0
        };
      }
      summary.by_status_and_method[key].count += 1;
      summary.by_status_and_method[key].amount += amount;
    });

    res.json({
      success: true,
      message: 'تم استرجاع ملخص حالات الدفع بنجاح',
      messageEn: 'Payment status summary retrieved successfully',
      data: {
        filters: { start_date, end_date },
        summary: summary
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم',
      messageEn: 'Internal server error',
      error: error.message
    });
  }
});

// إضافة المتطلب لقاعدة البيانات
const supabase = require('../config/database');

module.exports = router;