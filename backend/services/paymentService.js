const supabase = require('../config/database');
const logger = require('../utils/logger');
const { formatHijriDate } = require('../utils/hijriDate');

class PaymentService {

  // توليد رقم الدفع التلقائي - Auto-generate payment number
  async generatePaymentNumber() {
    try {
      // الحصول على آخر رقم دفع لهذا العام
      const currentYear = new Date().getFullYear();
      const { data: lastPayment, error } = await supabase
        .from('payments')
        .select('payment_number')
        .like('payment_number', `SH${currentYear}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        logger.error('خطأ في استرجاع آخر رقم دفع:', error);
        throw error;
      }

      let nextNumber = 1;
      if (lastPayment && lastPayment.length > 0) {
        // استخراج الرقم من آخر دفع
        const lastNumber = parseInt(lastPayment[0].payment_number.substring(6));
        nextNumber = lastNumber + 1;
      }

      // تنسيق الرقم: SH2025001
      return `SH${currentYear}${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      logger.error('خطأ في توليد رقم الدفع:', error);
      throw new Error('فشل في توليد رقم الدفع');
    }
  }

  // التحقق من مبلغ الاشتراك - Validate subscription amount
  async validateSubscriptionAmount(amount) {
    const baseAmount = 50; // 50 ريال سعودي

    if (!amount || amount < baseAmount) {
      return {
        valid: false,
        message: `المبلغ يجب أن يكون ${baseAmount} ريال سعودي كحد أدنى`,
        messageEn: `Amount must be at least ${baseAmount} SAR`
      };
    }

    if (amount % baseAmount !== 0) {
      return {
        valid: false,
        message: `المبلغ يجب أن يكون مضاعفات ${baseAmount} ريال سعودي`,
        messageEn: `Amount must be multiples of ${baseAmount} SAR`
      };
    }

    const months = amount / baseAmount;
    return {
      valid: true,
      amount: amount,
      months: months,
      message: `مبلغ صحيح: ${amount} ريال لمدة ${months} شهر`,
      messageEn: `Valid amount: ${amount} SAR for ${months} months`
    };
  }

  // حساب تاريخ انتهاء الاشتراك - Calculate expiry date
  async calculateExpiryDate(startDate, months) {
    const start = new Date(startDate);
    const expiry = new Date(start);
    expiry.setMonth(expiry.getMonth() + months);

    return {
      expiry_date: expiry.toISOString(),
      hijri_expiry_date: formatHijriDate(expiry),
      months: months
    };
  }

  // معالجة الدفع الفوري - Process instant payment
  async processInstantPayment(paymentData) {
    const { payer_id, beneficiary_id, amount, subscription_id } = paymentData;

    try {
      // التحقق من صحة المبلغ
      const validation = await this.validateSubscriptionAmount(amount);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // إنشاء رقم الدفع
      const paymentNumber = await this.generatePaymentNumber();

      // إنشاء معاملة الدفع
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          payment_number: paymentNumber,
          payer_id: payer_id,
          beneficiary_id: beneficiary_id,
          subscription_id: subscription_id,
          amount: amount,
          currency: 'SAR',
          payment_method: 'app_payment',
          payment_status: 'completed',
          transaction_date: new Date().toISOString(),
          hijri_transaction_date: formatHijriDate(new Date()),
          notes: 'دفع فوري عبر التطبيق',
          created_at: new Date().toISOString()
        }])
        .select('*')
        .single();

      if (paymentError) {
        logger.error('خطأ في إنشاء الدفع:', paymentError);
        throw paymentError;
      }

      // تحديث حالة الاشتراك
      await this.updateSubscriptionAfterPayment(subscription_id, amount, 'active');

      logger.info(`تم إنشاء دفع فوري: ${paymentNumber} بمبلغ ${amount} ريال`);

      return {
        success: true,
        payment: payment,
        message: 'تم الدفع بنجاح وتفعيل الاشتراك',
        messageEn: 'Payment successful and subscription activated'
      };

    } catch (error) {
      logger.error('خطأ في الدفع الفوري:', error);
      throw error;
    }
  }

  // معالجة التحويل البنكي - Process bank transfer
  async processBankTransfer(paymentData, receiptFile) {
    const { payer_id, beneficiary_id, amount, subscription_id, notes } = paymentData;

    try {
      // التحقق من صحة المبلغ
      const validation = await this.validateSubscriptionAmount(amount);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // إنشاء رقم الدفع
      const paymentNumber = await this.generatePaymentNumber();

      // إنشاء معاملة التحويل البنكي
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          payment_number: paymentNumber,
          payer_id: payer_id,
          beneficiary_id: beneficiary_id,
          subscription_id: subscription_id,
          amount: amount,
          currency: 'SAR',
          payment_method: 'bank_transfer',
          payment_status: 'pending_verification',
          receipt_image_url: receiptFile ? receiptFile.path : null,
          notes: notes || 'تحويل بنكي - في انتظار الموافقة',
          created_at: new Date().toISOString(),
          hijri_transaction_date: formatHijriDate(new Date())
        }])
        .select('*')
        .single();

      if (paymentError) {
        logger.error('خطأ في إنشاء التحويل البنكي:', paymentError);
        throw paymentError;
      }

      logger.info(`تم إنشاء تحويل بنكي: ${paymentNumber} بمبلغ ${amount} ريال`);

      return {
        success: true,
        payment: payment,
        message: 'تم رفع إيصال التحويل البنكي، في انتظار موافقة الإدارة',
        messageEn: 'Bank transfer receipt uploaded, waiting for admin approval'
      };

    } catch (error) {
      logger.error('خطأ في التحويل البنكي:', error);
      throw error;
    }
  }

  // تحديث حالة الدفع - Update payment status
  async updatePaymentStatus(paymentId, status, notes = '', adminUserId = null) {
    try {
      const updateData = {
        payment_status: status,
        updated_at: new Date().toISOString()
      };

      if (notes) {
        updateData.admin_notes = notes;
      }

      if (adminUserId) {
        updateData.approved_by = adminUserId;
        updateData.approved_at = new Date().toISOString();
        updateData.hijri_approved_at = formatHijriDate(new Date());
      }

      const { data: payment, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId)
        .select('*')
        .single();

      if (error) {
        logger.error('خطأ في تحديث حالة الدفع:', error);
        throw error;
      }

      // إذا تم قبول الدفع، تفعيل الاشتراك
      if (status === 'approved') {
        await this.updateSubscriptionAfterPayment(
          payment.subscription_id,
          payment.amount,
          'active'
        );
      }

      // إذا تم رفض الدفع، تحديث الاشتراك
      if (status === 'rejected') {
        await this.updateSubscriptionAfterPayment(
          payment.subscription_id,
          payment.amount,
          'payment_failed'
        );
      }

      return payment;
    } catch (error) {
      logger.error('خطأ في تحديث حالة الدفع:', error);
      throw error;
    }
  }

  // تحديث الاشتراك بعد الدفع - Update subscription after payment
  async updateSubscriptionAfterPayment(subscriptionId, amount, status) {
    try {
      // حساب مدة الاشتراك
      const validation = await this.validateSubscriptionAmount(amount);
      if (!validation.valid) {
        throw new Error('مبلغ غير صحيح');
      }

      // حساب تاريخ انتهاء الاشتراك
      const currentDate = new Date();
      const expiryInfo = await this.calculateExpiryDate(currentDate, validation.months);

      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .update({
          status: status,
          start_date: currentDate.toISOString(),
          end_date: expiryInfo.expiry_date,
          hijri_start_date: formatHijriDate(currentDate),
          hijri_end_date: expiryInfo.hijri_expiry_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .select('*')
        .single();

      if (error) {
        logger.error('خطأ في تحديث الاشتراك:', error);
        throw error;
      }

      return subscription;
    } catch (error) {
      logger.error('خطأ في تحديث الاشتراك بعد الدفع:', error);
      throw error;
    }
  }

  // استرجاع تاريخ الدفعات - Get payment history
  async getPaymentHistory(memberId, filters = {}) {
    try {
      const {
        startDate,
        endDate,
        paymentMethod,
        status,
        limit = 50,
        offset = 0
      } = filters;

      let query = supabase
        .from('payments')
        .select(`
          *,
          payer:payer_id(id, full_name, membership_number),
          beneficiary:beneficiary_id(id, full_name, membership_number),
          subscription:subscription_id(id, subscription_type)
        `)
        .or(`payer_id.eq.${memberId},beneficiary_id.eq.${memberId}`)
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }
      if (paymentMethod) {
        query = query.eq('payment_method', paymentMethod);
      }
      if (status) {
        query = query.eq('payment_status', status);
      }

      query = query.range(offset, offset + limit - 1);

      const { data: payments, error } = await query;

      if (error) {
        logger.error('خطأ في استرجاع تاريخ الدفعات:', error);
        throw error;
      }

      return payments;
    } catch (error) {
      logger.error('خطأ في استرجاع تاريخ الدفعات:', error);
      throw error;
    }
  }

  // إحصائيات الدفع - Payment statistics
  async getPaymentStatistics(filters = {}) {
    try {
      const { startDate, endDate } = filters;

      let query = supabase
        .from('payments')
        .select('amount, payment_method, payment_status, created_at');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data: payments, error } = await query;

      if (error) {
        logger.error('خطأ في استرجاع إحصائيات الدفع:', error);
        throw error;
      }

      // حساب الإحصائيات
      const stats = {
        total_payments: payments.length,
        total_amount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
        app_payments: payments.filter(p => p.payment_method === 'app_payment').length,
        bank_transfers: payments.filter(p => p.payment_method === 'bank_transfer').length,
        completed_payments: payments.filter(p => p.payment_status === 'completed' || p.payment_status === 'approved').length,
        pending_payments: payments.filter(p => p.payment_status === 'pending_verification').length,
        rejected_payments: payments.filter(p => p.payment_status === 'rejected').length,
        average_amount: payments.length > 0 ?
          payments.reduce((sum, p) => sum + (p.amount || 0), 0) / payments.length : 0
      };

      return stats;
    } catch (error) {
      logger.error('خطأ في حساب إحصائيات الدفع:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();