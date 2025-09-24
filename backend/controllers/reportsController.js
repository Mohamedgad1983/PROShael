const ExcelJS = require('exceljs');
const supabase = require('../config/database');
const logger = require('../utils/logger');
const { formatHijriDate } = require('../utils/hijriDate');
const paymentService = require('../services/paymentService');

class ReportsController {

  // تقرير المعاملات المالية - Financial transactions report
  async getFinancialTransactionsReport(req, res) {
    try {
      const {
        start_date,
        end_date,
        payment_method,
        payment_status,
        payer_id,
        beneficiary_id,
        limit = 100,
        offset = 0,
        export_format // 'json' or 'excel'
      } = req.query;

      let query = supabase
        .from('payments')
        .select(`
          *,
          payer:payer_id(id, full_name, membership_number),
          beneficiary:beneficiary_id(id, full_name, membership_number),
          subscription:subscription_id(id, subscription_type, status),
          approved_by_user:approved_by(id, full_name)
        `)
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (start_date) query = query.gte('transaction_date', start_date);
      if (end_date) query = query.lte('transaction_date', end_date);
      if (payment_method) query = query.eq('payment_method', payment_method);
      if (payment_status) query = query.eq('payment_status', payment_status);
      if (payer_id) query = query.eq('payer_id', payer_id);
      if (beneficiary_id) query = query.eq('beneficiary_id', beneficiary_id);

      if (export_format !== 'excel') {
        query = query.range(offset, offset + parseInt(limit) - 1);
      }

      const { data: transactions, error } = await query;

      if (error) {
        logger.error('خطأ في استرجاع تقرير المعاملات المالية:', error);
        return res.status(500).json({
          success: false,
          message: 'خطأ في استرجاع التقرير',
          messageEn: 'Failed to retrieve report',
          error: error.message
        });
      }

      // حساب الإحصائيات
      const stats = this.calculateTransactionStats(transactions);

      // إذا كان التصدير إلى Excel
      if (export_format === 'excel') {
        return await this.exportTransactionsToExcel(res, transactions, stats, {
          start_date,
          end_date,
          payment_method,
          payment_status
        });
      }

      res.json({
        success: true,
        message: `تم العثور على ${transactions.length} معاملة مالية`,
        messageEn: `Found ${transactions.length} financial transactions`,
        data: {
          transactions: transactions,
          statistics: stats,
          filters: {
            start_date,
            end_date,
            payment_method,
            payment_status,
            payer_id,
            beneficiary_id
          },
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: transactions.length
          }
        }
      });

    } catch (error) {
      logger.error('خطأ في تقرير المعاملات المالية:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // تقرير الاشتراكات - Subscriptions report
  async getSubscriptionsReport(req, res) {
    try {
      const {
        start_date,
        end_date,
        status,
        member_id,
        subscriber_id,
        subscription_type,
        limit = 100,
        offset = 0,
        export_format
      } = req.query;

      let query = supabase
        .from('subscriptions')
        .select(`
          *,
          member:member_id(id, full_name, membership_number, phone),
          subscriber:subscriber_id(id, full_name, membership_number),
          payments(id, payment_number, amount, payment_method, payment_status, created_at)
        `)
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (start_date) query = query.gte('created_at', start_date);
      if (end_date) query = query.lte('created_at', end_date);
      if (status) query = query.eq('status', status);
      if (member_id) query = query.eq('member_id', member_id);
      if (subscriber_id) query = query.eq('subscriber_id', subscriber_id);
      if (subscription_type) query = query.eq('subscription_type', subscription_type);

      if (export_format !== 'excel') {
        query = query.range(offset, offset + parseInt(limit) - 1);
      }

      const { data: subscriptions, error } = await query;

      if (error) {
        logger.error('خطأ في استرجاع تقرير الاشتراكات:', error);
        return res.status(500).json({
          success: false,
          message: 'خطأ في استرجاع التقرير',
          messageEn: 'Failed to retrieve report',
          error: error.message
        });
      }

      // حساب الإحصائيات
      const stats = this.calculateSubscriptionStats(subscriptions);

      // إذا كان التصدير إلى Excel
      if (export_format === 'excel') {
        return await this.exportSubscriptionsToExcel(res, subscriptions, stats, {
          start_date,
          end_date,
          status,
          subscription_type
        });
      }

      res.json({
        success: true,
        message: `تم العثور على ${subscriptions.length} اشتراك`,
        messageEn: `Found ${subscriptions.length} subscriptions`,
        data: {
          subscriptions: subscriptions,
          statistics: stats,
          filters: {
            start_date,
            end_date,
            status,
            member_id,
            subscriber_id,
            subscription_type
          },
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: subscriptions.length
          }
        }
      });

    } catch (error) {
      logger.error('خطأ في تقرير الاشتراكات:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // تقرير الدفع للآخرين - Pay for others report
  async getPayForOthersReport(req, res) {
    try {
      const {
        start_date,
        end_date,
        payer_id,
        beneficiary_id,
        payment_status,
        limit = 100,
        offset = 0,
        export_format
      } = req.query;

      let query = supabase
        .from('payments')
        .select(`
          *,
          payer:payer_id(id, full_name, membership_number),
          beneficiary:beneficiary_id(id, full_name, membership_number),
          subscription:subscription_id(id, subscription_type, status)
        `)
        .neq('payer_id', supabase.raw('beneficiary_id')) // الدفع للآخرين فقط
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (start_date) query = query.gte('transaction_date', start_date);
      if (end_date) query = query.lte('transaction_date', end_date);
      if (payer_id) query = query.eq('payer_id', payer_id);
      if (beneficiary_id) query = query.eq('beneficiary_id', beneficiary_id);
      if (payment_status) query = query.eq('payment_status', payment_status);

      if (export_format !== 'excel') {
        query = query.range(offset, offset + parseInt(limit) - 1);
      }

      const { data: payForOthersTransactions, error } = await query;

      if (error) {
        logger.error('خطأ في استرجاع تقرير الدفع للآخرين:', error);
        return res.status(500).json({
          success: false,
          message: 'خطأ في استرجاع التقرير',
          messageEn: 'Failed to retrieve report',
          error: error.message
        });
      }

      // حساب الإحصائيات
      const stats = this.calculatePayForOthersStats(payForOthersTransactions);

      // إذا كان التصدير إلى Excel
      if (export_format === 'excel') {
        return await this.exportPayForOthersToExcel(res, payForOthersTransactions, stats, {
          start_date,
          end_date,
          payer_id,
          beneficiary_id,
          payment_status
        });
      }

      res.json({
        success: true,
        message: `تم العثور على ${payForOthersTransactions.length} معاملة دفع للآخرين`,
        messageEn: `Found ${payForOthersTransactions.length} pay-for-others transactions`,
        data: {
          transactions: payForOthersTransactions,
          statistics: stats,
          filters: {
            start_date,
            end_date,
            payer_id,
            beneficiary_id,
            payment_status
          },
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: payForOthersTransactions.length
          }
        }
      });

    } catch (error) {
      logger.error('خطأ في تقرير الدفع للآخرين:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // إحصائيات لوحة التحكم - Dashboard statistics
  async getDashboardStats(req, res) {
    try {
      const {
        period = 'month', // 'week', 'month', 'quarter', 'year'
        start_date,
        end_date
      } = req.query;

      // تحديد نطاق التاريخ بناء على الفترة
      let dateRange = this.getDateRangeForPeriod(period, start_date, end_date);

      // الحصول على إحصائيات الدفعات
      const paymentStats = await paymentService.getPaymentStatistics(dateRange);

      // الحصول على إحصائيات الاشتراكات
      const subscriptionStats = await this.getSubscriptionStatistics(dateRange);

      // الحصول على إحصائيات الدفع للآخرين
      const payForOthersStats = await this.getPayForOthersStatistics(dateRange);

      // الحصول على أفضل المساهمين
      const topContributors = await this.getTopContributors(dateRange);

      // الحصول على الاتجاهات الشهرية
      const monthlyTrends = await this.getMonthlyTrends();

      res.json({
        success: true,
        message: 'تم استرجاع إحصائيات لوحة التحكم بنجاح',
        messageEn: 'Dashboard statistics retrieved successfully',
        data: {
          period: period,
          date_range: dateRange,
          payment_statistics: paymentStats,
          subscription_statistics: subscriptionStats,
          pay_for_others_statistics: payForOthersStats,
          top_contributors: topContributors,
          monthly_trends: monthlyTrends,
          generated_at: formatHijriDate(new Date())
        }
      });

    } catch (error) {
      logger.error('خطأ في إحصائيات لوحة التحكم:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // تصدير إلى Excel - Export to Excel
  async exportToExcel(req, res) {
    try {
      const {
        report_type, // 'transactions', 'subscriptions', 'pay_for_others'
        ...filters
      } = req.query;

      if (!report_type) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد نوع التقرير',
          messageEn: 'Report type is required',
          error: 'REPORT_TYPE_REQUIRED'
        });
      }

      // استدعاء التقرير المناسب مع تصدير Excel
      req.query.export_format = 'excel';

      switch (report_type) {
        case 'transactions':
          return await this.getFinancialTransactionsReport(req, res);
        case 'subscriptions':
          return await this.getSubscriptionsReport(req, res);
        case 'pay_for_others':
          return await this.getPayForOthersReport(req, res);
        default:
          return res.status(400).json({
            success: false,
            message: 'نوع التقرير غير صحيح',
            messageEn: 'Invalid report type',
            error: 'INVALID_REPORT_TYPE'
          });
      }

    } catch (error) {
      logger.error('خطأ في تصدير Excel:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // حساب إحصائيات المعاملات
  calculateTransactionStats(transactions) {
    return {
      total_transactions: transactions.length,
      total_amount: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      app_payments: transactions.filter(t => t.payment_method === 'app_payment').length,
      bank_transfers: transactions.filter(t => t.payment_method === 'bank_transfer').length,
      completed_payments: transactions.filter(t => ['completed', 'approved'].includes(t.payment_status)).length,
      pending_payments: transactions.filter(t => t.payment_status === 'pending_verification').length,
      rejected_payments: transactions.filter(t => t.payment_status === 'rejected').length,
      pay_for_others_count: transactions.filter(t => t.payer_id !== t.beneficiary_id).length,
      self_payments_count: transactions.filter(t => t.payer_id === t.beneficiary_id).length,
      average_amount: transactions.length > 0 ?
        transactions.reduce((sum, t) => sum + (t.amount || 0), 0) / transactions.length : 0
    };
  }

  // حساب إحصائيات الاشتراكات
  calculateSubscriptionStats(subscriptions) {
    return {
      total_subscriptions: subscriptions.length,
      active_subscriptions: subscriptions.filter(s => s.status === 'active').length,
      pending_subscriptions: subscriptions.filter(s => s.status === 'pending_payment').length,
      expired_subscriptions: subscriptions.filter(s => s.status === 'expired').length,
      cancelled_subscriptions: subscriptions.filter(s => s.status === 'cancelled').length,
      paid_by_others: subscriptions.filter(s => s.member_id !== s.subscriber_id).length,
      self_subscriptions: subscriptions.filter(s => s.member_id === s.subscriber_id).length,
      total_revenue: subscriptions.reduce((sum, s) => {
        const payments = s.payments || [];
        return sum + payments.reduce((pSum, p) =>
          ['completed', 'approved'].includes(p.payment_status) ? pSum + (p.amount || 0) : pSum, 0
        );
      }, 0)
    };
  }

  // حساب إحصائيات الدفع للآخرين
  calculatePayForOthersStats(transactions) {
    const payerSummary = {};
    const beneficiarySummary = {};

    transactions.forEach(t => {
      // ملخص الدافعين
      if (!payerSummary[t.payer_id]) {
        payerSummary[t.payer_id] = {
          payer_name: t.payer.full_name,
          total_paid: 0,
          transaction_count: 0,
          beneficiaries: new Set()
        };
      }
      payerSummary[t.payer_id].total_paid += t.amount || 0;
      payerSummary[t.payer_id].transaction_count += 1;
      payerSummary[t.payer_id].beneficiaries.add(t.beneficiary_id);

      // ملخص المستفيدين
      if (!beneficiarySummary[t.beneficiary_id]) {
        beneficiarySummary[t.beneficiary_id] = {
          beneficiary_name: t.beneficiary.full_name,
          total_received: 0,
          transaction_count: 0,
          payers: new Set()
        };
      }
      beneficiarySummary[t.beneficiary_id].total_received += t.amount || 0;
      beneficiarySummary[t.beneficiary_id].transaction_count += 1;
      beneficiarySummary[t.beneficiary_id].payers.add(t.payer_id);
    });

    // تحويل Sets إلى أرقام
    Object.values(payerSummary).forEach(payer => {
      payer.unique_beneficiaries = payer.beneficiaries.size;
      delete payer.beneficiaries;
    });

    Object.values(beneficiarySummary).forEach(beneficiary => {
      beneficiary.unique_payers = beneficiary.payers.size;
      delete beneficiary.payers;
    });

    return {
      total_transactions: transactions.length,
      total_amount: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      unique_payers: Object.keys(payerSummary).length,
      unique_beneficiaries: Object.keys(beneficiarySummary).length,
      top_payers: Object.values(payerSummary)
        .sort((a, b) => b.total_paid - a.total_paid)
        .slice(0, 5),
      top_beneficiaries: Object.values(beneficiarySummary)
        .sort((a, b) => b.total_received - a.total_received)
        .slice(0, 5)
    };
  }

  // تصدير المعاملات إلى Excel
  async exportTransactionsToExcel(res, transactions, stats, filters) {
    const workbook = new ExcelJS.Workbook();

    // ورقة المعاملات
    const transactionsSheet = workbook.addWorksheet('المعاملات المالية');

    // إعداد العناوين
    transactionsSheet.columns = [
      { header: 'رقم الدفع', key: 'payment_number', width: 15 },
      { header: 'الدافع', key: 'payer_name', width: 20 },
      { header: 'المستفيد', key: 'beneficiary_name', width: 20 },
      { header: 'المبلغ (ريال)', key: 'amount', width: 15 },
      { header: 'طريقة الدفع', key: 'payment_method', width: 15 },
      { header: 'حالة الدفع', key: 'payment_status', width: 15 },
      { header: 'تاريخ المعاملة', key: 'transaction_date', width: 20 },
      { header: 'التاريخ الهجري', key: 'hijri_date', width: 20 },
      { header: 'نوع المعاملة', key: 'transaction_type', width: 15 },
      { header: 'الملاحظات', key: 'notes', width: 30 }
    ];

    // إضافة البيانات
    transactions.forEach(t => {
      transactionsSheet.addRow({
        payment_number: t.payment_number,
        payer_name: t.payer?.full_name || 'غير محدد',
        beneficiary_name: t.beneficiary?.full_name || 'غير محدد',
        amount: t.amount,
        payment_method: t.payment_method === 'app_payment' ? 'دفع فوري' : 'تحويل بنكي',
        payment_status: this.getStatusInArabic(t.payment_status),
        transaction_date: new Date(t.transaction_date).toLocaleDateString('ar-SA'),
        hijri_date: t.hijri_transaction_date,
        transaction_type: t.payer_id !== t.beneficiary_id ? 'دفع للآخرين' : 'دفع شخصي',
        notes: t.notes || t.admin_notes || ''
      });
    });

    // ورقة الإحصائيات
    const statsSheet = workbook.addWorksheet('الإحصائيات');
    statsSheet.addRow(['البيان', 'القيمة']);
    statsSheet.addRow(['إجمالي المعاملات', stats.total_transactions]);
    statsSheet.addRow(['إجمالي المبلغ (ريال)', stats.total_amount]);
    statsSheet.addRow(['الدفع الفوري', stats.app_payments]);
    statsSheet.addRow(['التحويل البنكي', stats.bank_transfers]);
    statsSheet.addRow(['المعاملات المكتملة', stats.completed_payments]);
    statsSheet.addRow(['المعاملات المعلقة', stats.pending_payments]);
    statsSheet.addRow(['المعاملات المرفوضة', stats.rejected_payments]);
    statsSheet.addRow(['دفع للآخرين', stats.pay_for_others_count]);
    statsSheet.addRow(['دفع شخصي', stats.self_payments_count]);
    statsSheet.addRow(['متوسط المبلغ (ريال)', Math.round(stats.average_amount)]);

    // تنسيق الجداول
    this.formatExcelWorksheet(transactionsSheet);
    this.formatExcelWorksheet(statsSheet);

    // إرسال الملف
    const filename = `تقرير_المعاملات_المالية_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  // تصدير الاشتراكات إلى Excel
  async exportSubscriptionsToExcel(res, subscriptions, stats, filters) {
    const workbook = new ExcelJS.Workbook();

    const subscriptionsSheet = workbook.addWorksheet('الاشتراكات');

    subscriptionsSheet.columns = [
      { header: 'العضو', key: 'member_name', width: 20 },
      { header: 'رقم العضوية', key: 'membership_number', width: 15 },
      { header: 'الدافع', key: 'subscriber_name', width: 20 },
      { header: 'نوع الاشتراك', key: 'subscription_type', width: 15 },
      { header: 'الحالة', key: 'status', width: 15 },
      { header: 'تاريخ البداية', key: 'start_date', width: 15 },
      { header: 'تاريخ الانتهاء', key: 'end_date', width: 15 },
      { header: 'تاريخ الإنشاء', key: 'created_at', width: 20 },
      { header: 'نوع المعاملة', key: 'payment_type', width: 15 },
      { header: 'إجمالي المبلغ', key: 'total_paid', width: 15 }
    ];

    subscriptions.forEach(s => {
      const totalPaid = (s.payments || []).reduce((sum, p) =>
        ['completed', 'approved'].includes(p.payment_status) ? sum + (p.amount || 0) : sum, 0
      );

      subscriptionsSheet.addRow({
        member_name: s.member?.full_name || 'غير محدد',
        membership_number: s.member?.membership_number || 'غير محدد',
        subscriber_name: s.subscriber?.full_name || 'غير محدد',
        subscription_type: s.subscription_type,
        status: this.getStatusInArabic(s.status),
        start_date: s.start_date ? new Date(s.start_date).toLocaleDateString('ar-SA') : '',
        end_date: s.end_date ? new Date(s.end_date).toLocaleDateString('ar-SA') : '',
        created_at: new Date(s.created_at).toLocaleDateString('ar-SA'),
        payment_type: s.member_id !== s.subscriber_id ? 'دفع للآخرين' : 'دفع شخصي',
        total_paid: totalPaid
      });
    });

    this.formatExcelWorksheet(subscriptionsSheet);

    const filename = `تقرير_الاشتراكات_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  // تصدير الدفع للآخرين إلى Excel
  async exportPayForOthersToExcel(res, transactions, stats, filters) {
    const workbook = new ExcelJS.Workbook();

    const transactionsSheet = workbook.addWorksheet('الدفع للآخرين');
    transactionsSheet.columns = [
      { header: 'رقم الدفع', key: 'payment_number', width: 15 },
      { header: 'الدافع', key: 'payer_name', width: 20 },
      { header: 'رقم عضوية الدافع', key: 'payer_membership', width: 15 },
      { header: 'المستفيد', key: 'beneficiary_name', width: 20 },
      { header: 'رقم عضوية المستفيد', key: 'beneficiary_membership', width: 15 },
      { header: 'المبلغ (ريال)', key: 'amount', width: 15 },
      { header: 'طريقة الدفع', key: 'payment_method', width: 15 },
      { header: 'حالة الدفع', key: 'payment_status', width: 15 },
      { header: 'تاريخ المعاملة', key: 'transaction_date', width: 20 }
    ];

    transactions.forEach(t => {
      transactionsSheet.addRow({
        payment_number: t.payment_number,
        payer_name: t.payer?.full_name || 'غير محدد',
        payer_membership: t.payer?.membership_number || 'غير محدد',
        beneficiary_name: t.beneficiary?.full_name || 'غير محدد',
        beneficiary_membership: t.beneficiary?.membership_number || 'غير محدد',
        amount: t.amount,
        payment_method: t.payment_method === 'app_payment' ? 'دفع فوري' : 'تحويل بنكي',
        payment_status: this.getStatusInArabic(t.payment_status),
        transaction_date: new Date(t.transaction_date).toLocaleDateString('ar-SA')
      });
    });

    this.formatExcelWorksheet(transactionsSheet);

    const filename = `تقرير_الدفع_للآخرين_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  // تنسيق ورقة العمل
  formatExcelWorksheet(worksheet) {
    // تنسيق الرأس
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // تحديد ارتفاع الرأس
    worksheet.getRow(1).height = 25;

    // إضافة حدود
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  }

  // ترجمة الحالات إلى العربية
  getStatusInArabic(status) {
    const statusMap = {
      'pending_payment': 'في انتظار الدفع',
      'pending_verification': 'في انتظار الموافقة',
      'active': 'نشط',
      'expired': 'منتهي',
      'cancelled': 'ملغي',
      'completed': 'مكتمل',
      'approved': 'معتمد',
      'rejected': 'مرفوض',
      'failed': 'فاشل'
    };
    return statusMap[status] || status;
  }

  // الحصول على نطاق التاريخ للفترة
  getDateRangeForPeriod(period, customStart, customEnd) {
    const now = new Date();
    let startDate, endDate = now.toISOString();

    if (customStart && customEnd) {
      return {
        startDate: customStart,
        endDate: customEnd
      };
    }

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString();
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString();
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    return { startDate, endDate };
  }

  // الحصول على إحصائيات الاشتراكات
  async getSubscriptionStatistics(dateRange) {
    try {
      let query = supabase
        .from('subscriptions')
        .select('status, created_at, member_id, subscriber_id');

      if (dateRange.startDate) query = query.gte('created_at', dateRange.startDate);
      if (dateRange.endDate) query = query.lte('created_at', dateRange.endDate);

      const { data: subscriptions, error } = await query;

      if (error) throw error;

      return this.calculateSubscriptionStats(subscriptions);
    } catch (error) {
      logger.error('خطأ في إحصائيات الاشتراكات:', error);
      return {};
    }
  }

  // الحصول على إحصائيات الدفع للآخرين
  async getPayForOthersStatistics(dateRange) {
    try {
      let query = supabase
        .from('payments')
        .select('payer_id, beneficiary_id, amount, payment_status, created_at')
        .neq('payer_id', supabase.raw('beneficiary_id'));

      if (dateRange.startDate) query = query.gte('created_at', dateRange.startDate);
      if (dateRange.endDate) query = query.lte('created_at', dateRange.endDate);

      const { data: transactions, error } = await query;

      if (error) throw error;

      return {
        total_count: transactions.length,
        total_amount: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
        unique_payers: [...new Set(transactions.map(t => t.payer_id))].length,
        unique_beneficiaries: [...new Set(transactions.map(t => t.beneficiary_id))].length
      };
    } catch (error) {
      logger.error('خطأ في إحصائيات الدفع للآخرين:', error);
      return {};
    }
  }

  // الحصول على أفضل المساهمين
  async getTopContributors(dateRange) {
    try {
      let query = supabase
        .from('payments')
        .select(`
          payer_id,
          amount,
          payer:payer_id(full_name, membership_number)
        `)
        .in('payment_status', ['completed', 'approved']);

      if (dateRange.startDate) query = query.gte('created_at', dateRange.startDate);
      if (dateRange.endDate) query = query.lte('created_at', dateRange.endDate);

      const { data: payments, error } = await query;

      if (error) throw error;

      const contributors = {};
      payments.forEach(p => {
        if (!contributors[p.payer_id]) {
          contributors[p.payer_id] = {
            name: p.payer?.full_name || 'غير محدد',
            membership_number: p.payer?.membership_number || 'غير محدد',
            total_amount: 0,
            transaction_count: 0
          };
        }
        contributors[p.payer_id].total_amount += p.amount || 0;
        contributors[p.payer_id].transaction_count += 1;
      });

      return Object.values(contributors)
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 10);
    } catch (error) {
      logger.error('خطأ في استرجاع أفضل المساهمين:', error);
      return [];
    }
  }

  // الحصول على الاتجاهات الشهرية
  async getMonthlyTrends() {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount, created_at, payment_status')
        .in('payment_status', ['completed', 'approved'])
        .gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString());

      if (error) throw error;

      const monthlyData = {};
      payments.forEach(p => {
        const month = new Date(p.created_at).getMonth();
        if (!monthlyData[month]) {
          monthlyData[month] = {
            month: month + 1,
            total_amount: 0,
            transaction_count: 0
          };
        }
        monthlyData[month].total_amount += p.amount || 0;
        monthlyData[month].transaction_count += 1;
      });

      return Object.values(monthlyData).sort((a, b) => a.month - b.month);
    } catch (error) {
      logger.error('خطأ في استرجاع الاتجاهات الشهرية:', error);
      return [];
    }
  }
}

module.exports = new ReportsController();