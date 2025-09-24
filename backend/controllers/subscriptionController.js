const supabase = require('../config/database');
const logger = require('../utils/logger');
const { formatHijriDate } = require('../utils/hijriDate');
const paymentService = require('../services/paymentService');
const notificationService = require('../services/notificationService');
const { deleteUploadedFile } = require('../middleware/uploadMiddleware');

class SubscriptionController {

  // إنشاء اشتراك جديد - Create new subscription
  async createSubscription(req, res) {
    try {
      const {
        member_id, // إذا لم يتم تحديد، سيكون المستخدم الحالي
        subscription_type = 'monthly',
        amount,
        notes = ''
      } = req.body;

      const subscriber_id = req.user.userId; // الشخص الذي يدفع
      const beneficiary_id = member_id || subscriber_id; // المستفيد (افتراضياً نفس الشخص)

      // التحقق من صحة المبلغ
      const validation = await paymentService.validateSubscriptionAmount(amount);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
          messageEn: validation.messageEn,
          error: 'INVALID_AMOUNT'
        });
      }

      // التحقق من وجود المستفيد
      const { data: beneficiaryMember, error: beneficiaryError } = await supabase
        .from('members')
        .select('id, full_name, membership_number')
        .eq('id', beneficiary_id)
        .single();

      if (beneficiaryError || !beneficiaryMember) {
        return res.status(404).json({
          success: false,
          message: 'العضو المحدد غير موجود',
          messageEn: 'Member not found',
          error: 'MEMBER_NOT_FOUND'
        });
      }

      // التحقق من وجود اشتراك نشط للمستفيد
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id, status, end_date')
        .eq('member_id', beneficiary_id)
        .eq('status', 'active')
        .single();

      if (existingSubscription) {
        return res.status(409).json({
          success: false,
          message: 'يوجد اشتراك نشط بالفعل لهذا العضو',
          messageEn: 'Active subscription already exists for this member',
          error: 'ACTIVE_SUBSCRIPTION_EXISTS',
          data: {
            existing_subscription: existingSubscription
          }
        });
      }

      // إنشاء الاشتراك
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert([{
          member_id: beneficiary_id,
          subscriber_id: subscriber_id,
          subscription_type: subscription_type,
          status: 'pending_payment',
          created_at: new Date().toISOString(),
          hijri_created_at: formatHijriDate(new Date()),
          notes: notes
        }])
        .select('*')
        .single();

      if (subscriptionError) {
        logger.error('خطأ في إنشاء الاشتراك:', subscriptionError);
        return res.status(500).json({
          success: false,
          message: 'خطأ في إنشاء الاشتراك',
          messageEn: 'Failed to create subscription',
          error: subscriptionError.message
        });
      }

      logger.info(`تم إنشاء اشتراك جديد: ${subscription.id} للعضو ${beneficiaryMember.full_name}`);

      res.status(201).json({
        success: true,
        message: `تم إنشاء اشتراك بنجاح لـ ${beneficiaryMember.full_name}`,
        messageEn: `Subscription created successfully for ${beneficiaryMember.full_name}`,
        data: {
          subscription: subscription,
          beneficiary: beneficiaryMember,
          payment_required: {
            amount: amount,
            months: validation.months
          },
          next_step: 'Choose payment method: app payment or bank transfer'
        }
      });

    } catch (error) {
      logger.error('خطأ في إنشاء الاشتراك:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // الحصول على اشتراكات عضو معين - Get member subscriptions
  async getMemberSubscriptions(req, res) {
    try {
      const { member_id } = req.params;
      const {
        status,
        limit = 10,
        offset = 0
      } = req.query;

      // التحقق من الصلاحية - العضو يمكنه رؤية اشتراكاته فقط أو المديرون
      if (req.user.userId !== member_id &&
          !['super_admin', 'admin', 'financial_manager', 'accountant'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بعرض هذه البيانات',
          messageEn: 'Not authorized to view this data',
          error: 'UNAUTHORIZED_ACCESS'
        });
      }

      let query = supabase
        .from('subscriptions')
        .select(`
          *,
          member:member_id(id, full_name, membership_number),
          subscriber:subscriber_id(id, full_name, membership_number),
          payments(id, payment_number, amount, payment_method, payment_status, created_at)
        `)
        .eq('member_id', member_id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      query = query.range(offset, offset + parseInt(limit) - 1);

      const { data: subscriptions, error } = await query;

      if (error) {
        logger.error('خطأ في استرجاع الاشتراكات:', error);
        return res.status(500).json({
          success: false,
          message: 'خطأ في استرجاع الاشتراكات',
          messageEn: 'Failed to retrieve subscriptions',
          error: error.message
        });
      }

      res.json({
        success: true,
        message: `تم العثور على ${subscriptions.length} اشتراك`,
        messageEn: `Found ${subscriptions.length} subscriptions`,
        data: {
          subscriptions: subscriptions,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: subscriptions.length
          }
        }
      });

    } catch (error) {
      logger.error('خطأ في استرجاع اشتراكات العضو:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // الحصول على جميع الاشتراكات (للمديرين فقط) - Get all subscriptions
  async getAllSubscriptions(req, res) {
    try {
      const {
        status,
        member_id,
        subscriber_id,
        start_date,
        end_date,
        limit = 20,
        offset = 0
      } = req.query;

      let query = supabase
        .from('subscriptions')
        .select(`
          *,
          member:member_id(id, full_name, membership_number),
          subscriber:subscriber_id(id, full_name, membership_number),
          payments(id, payment_number, amount, payment_method, payment_status, created_at)
        `)
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (status) query = query.eq('status', status);
      if (member_id) query = query.eq('member_id', member_id);
      if (subscriber_id) query = query.eq('subscriber_id', subscriber_id);
      if (start_date) query = query.gte('created_at', start_date);
      if (end_date) query = query.lte('created_at', end_date);

      query = query.range(offset, offset + parseInt(limit) - 1);

      const { data: subscriptions, error } = await query;

      if (error) {
        logger.error('خطأ في استرجاع جميع الاشتراكات:', error);
        return res.status(500).json({
          success: false,
          message: 'خطأ في استرجاع الاشتراكات',
          messageEn: 'Failed to retrieve subscriptions',
          error: error.message
        });
      }

      // حساب الإحصائيات
      const stats = {
        total_subscriptions: subscriptions.length,
        active_subscriptions: subscriptions.filter(s => s.status === 'active').length,
        pending_subscriptions: subscriptions.filter(s => s.status === 'pending_payment').length,
        expired_subscriptions: subscriptions.filter(s => s.status === 'expired').length
      };

      res.json({
        success: true,
        message: `تم العثور على ${subscriptions.length} اشتراك`,
        messageEn: `Found ${subscriptions.length} subscriptions`,
        data: {
          subscriptions: subscriptions,
          statistics: stats,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: subscriptions.length
          }
        }
      });

    } catch (error) {
      logger.error('خطأ في استرجاع جميع الاشتراكات:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // تجديد الاشتراك - Renew subscription
  async renewSubscription(req, res) {
    try {
      const { subscription_id } = req.params;
      const { amount, notes = '' } = req.body;

      // التحقق من صحة المبلغ
      const validation = await paymentService.validateSubscriptionAmount(amount);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
          messageEn: validation.messageEn,
          error: 'INVALID_AMOUNT'
        });
      }

      // الحصول على الاشتراك الحالي
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          member:member_id(id, full_name, membership_number)
        `)
        .eq('id', subscription_id)
        .single();

      if (subscriptionError || !subscription) {
        return res.status(404).json({
          success: false,
          message: 'الاشتراك غير موجود',
          messageEn: 'Subscription not found',
          error: 'SUBSCRIPTION_NOT_FOUND'
        });
      }

      // التحقق من الصلاحية
      if (subscription.subscriber_id !== req.user.userId &&
          !['super_admin', 'admin', 'financial_manager'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بتجديد هذا الاشتراك',
          messageEn: 'Not authorized to renew this subscription',
          error: 'UNAUTHORIZED_ACCESS'
        });
      }

      // تحديث الاشتراك للتجديد
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'pending_payment',
          updated_at: new Date().toISOString(),
          notes: notes
        })
        .eq('id', subscription_id)
        .select('*')
        .single();

      if (updateError) {
        logger.error('خطأ في تجديد الاشتراك:', updateError);
        return res.status(500).json({
          success: false,
          message: 'خطأ في تجديد الاشتراك',
          messageEn: 'Failed to renew subscription',
          error: updateError.message
        });
      }

      logger.info(`تم تجديد الاشتراك: ${subscription_id} للعضو ${subscription.member.full_name}`);

      res.json({
        success: true,
        message: `تم تجديد الاشتراك بنجاح لـ ${subscription.member.full_name}`,
        messageEn: `Subscription renewed successfully for ${subscription.member.full_name}`,
        data: {
          subscription: updatedSubscription,
          member: subscription.member,
          payment_required: {
            amount: amount,
            months: validation.months
          },
          next_step: 'Choose payment method: app payment or bank transfer'
        }
      });

    } catch (error) {
      logger.error('خطأ في تجديد الاشتراك:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // إلغاء الاشتراك - Cancel subscription
  async cancelSubscription(req, res) {
    try {
      const { subscription_id } = req.params;
      const { reason = '' } = req.body;

      // الحصول على الاشتراك
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          member:member_id(id, full_name, membership_number)
        `)
        .eq('id', subscription_id)
        .single();

      if (subscriptionError || !subscription) {
        return res.status(404).json({
          success: false,
          message: 'الاشتراك غير موجود',
          messageEn: 'Subscription not found',
          error: 'SUBSCRIPTION_NOT_FOUND'
        });
      }

      // التحقق من الصلاحية
      if (subscription.subscriber_id !== req.user.userId &&
          !['super_admin', 'admin', 'financial_manager'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بإلغاء هذا الاشتراك',
          messageEn: 'Not authorized to cancel this subscription',
          error: 'UNAUTHORIZED_ACCESS'
        });
      }

      // إلغاء الاشتراك
      const { data: cancelledSubscription, error: cancelError } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          hijri_cancelled_at: formatHijriDate(new Date()),
          notes: reason || 'تم الإلغاء بطلب من المستخدم',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription_id)
        .select('*')
        .single();

      if (cancelError) {
        logger.error('خطأ في إلغاء الاشتراك:', cancelError);
        return res.status(500).json({
          success: false,
          message: 'خطأ في إلغاء الاشتراك',
          messageEn: 'Failed to cancel subscription',
          error: cancelError.message
        });
      }

      logger.info(`تم إلغاء الاشتراك: ${subscription_id} للعضو ${subscription.member.full_name}`);

      res.json({
        success: true,
        message: `تم إلغاء الاشتراك بنجاح لـ ${subscription.member.full_name}`,
        messageEn: `Subscription cancelled successfully for ${subscription.member.full_name}`,
        data: {
          subscription: cancelledSubscription,
          member: subscription.member,
          cancelled_at: cancelledSubscription.hijri_cancelled_at
        }
      });

    } catch (error) {
      logger.error('خطأ في إلغاء الاشتراك:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // معالجة الدفع الفوري عبر التطبيق - Process app payment
  async processPayment(req, res) {
    try {
      const {
        subscription_id,
        amount,
        payment_method = 'app_payment'
      } = req.body;

      // الحصول على الاشتراك
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          member:member_id(id, full_name, membership_number, phone),
          subscriber:subscriber_id(id, full_name, membership_number, phone)
        `)
        .eq('id', subscription_id)
        .single();

      if (subscriptionError || !subscription) {
        return res.status(404).json({
          success: false,
          message: 'الاشتراك غير موجود',
          messageEn: 'Subscription not found',
          error: 'SUBSCRIPTION_NOT_FOUND'
        });
      }

      // التحقق من الصلاحية
      if (subscription.subscriber_id !== req.user.userId &&
          !['super_admin', 'admin', 'financial_manager'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بدفع هذا الاشتراك',
          messageEn: 'Not authorized to pay for this subscription',
          error: 'UNAUTHORIZED_ACCESS'
        });
      }

      // معالجة الدفع الفوري
      const paymentResult = await paymentService.processInstantPayment({
        payer_id: req.user.userId,
        beneficiary_id: subscription.member_id,
        amount: amount,
        subscription_id: subscription_id
      });

      if (!paymentResult.success) {
        return res.status(400).json({
          success: false,
          message: paymentResult.message,
          messageEn: paymentResult.messageEn,
          error: 'PAYMENT_FAILED'
        });
      }

      // إرسال إشعار للعضو
      if (subscription.member_id !== subscription.subscriber_id) {
        // دفع للآخرين
        await notificationService.notifyPaymentForOthers(
          paymentResult.payment,
          subscription.subscriber,
          subscription.member
        );
      }

      logger.info(`تم دفع الاشتراك بنجاح: ${subscription_id} بمبلغ ${amount} ريال`);

      res.json({
        success: true,
        message: paymentResult.message,
        messageEn: paymentResult.messageEn,
        data: {
          payment: paymentResult.payment,
          subscription: subscription,
          payment_type: subscription.member_id !== subscription.subscriber_id ? 'payment_for_others' : 'self_payment'
        }
      });

    } catch (error) {
      logger.error('خطأ في معالجة الدفع:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // رفع إيصال التحويل البنكي - Submit bank transfer
  async submitBankTransfer(req, res) {
    try {
      const {
        subscription_id,
        amount,
        notes = ''
      } = req.body;

      // التحقق من وجود ملف مرفوع
      if (!req.uploadedFile) {
        return res.status(400).json({
          success: false,
          message: 'لم يتم رفع إيصال التحويل البنكي',
          messageEn: 'Bank transfer receipt not uploaded',
          error: 'NO_RECEIPT_UPLOADED'
        });
      }

      // الحصول على الاشتراك
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          member:member_id(id, full_name, membership_number, phone),
          subscriber:subscriber_id(id, full_name, membership_number, phone)
        `)
        .eq('id', subscription_id)
        .single();

      if (subscriptionError || !subscription) {
        // حذف الملف المرفوع إذا فشل العثور على الاشتراك
        deleteUploadedFile(req.uploadedFile.path);

        return res.status(404).json({
          success: false,
          message: 'الاشتراك غير موجود',
          messageEn: 'Subscription not found',
          error: 'SUBSCRIPTION_NOT_FOUND'
        });
      }

      // التحقق من الصلاحية
      if (subscription.subscriber_id !== req.user.userId &&
          !['super_admin', 'admin', 'financial_manager'].includes(req.user.role)) {
        deleteUploadedFile(req.uploadedFile.path);

        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بدفع هذا الاشتراك',
          messageEn: 'Not authorized to pay for this subscription',
          error: 'UNAUTHORIZED_ACCESS'
        });
      }

      // معالجة التحويل البنكي
      const paymentResult = await paymentService.processBankTransfer({
        payer_id: req.user.userId,
        beneficiary_id: subscription.member_id,
        amount: amount,
        subscription_id: subscription_id,
        notes: notes
      }, req.uploadedFile);

      if (!paymentResult.success) {
        deleteUploadedFile(req.uploadedFile.path);

        return res.status(400).json({
          success: false,
          message: paymentResult.message,
          messageEn: paymentResult.messageEn,
          error: 'PAYMENT_FAILED'
        });
      }

      // إرسال إشعار للمديرين
      await notificationService.notifyAdminsOfBankTransfer(
        paymentResult.payment,
        subscription.subscriber
      );

      logger.info(`تم رفع إيصال تحويل بنكي: ${paymentResult.payment.payment_number} بمبلغ ${amount} ريال`);

      res.json({
        success: true,
        message: paymentResult.message,
        messageEn: paymentResult.messageEn,
        data: {
          payment: paymentResult.payment,
          subscription: subscription,
          receipt_uploaded: {
            filename: req.uploadedFile.filename,
            size: req.uploadedFile.size,
            upload_time: req.uploadedFile.uploadedAt
          },
          next_step: 'Waiting for admin approval',
          payment_type: subscription.member_id !== subscription.subscriber_id ? 'payment_for_others' : 'self_payment'
        }
      });

    } catch (error) {
      // حذف الملف المرفوع في حالة الخطأ
      if (req.uploadedFile) {
        deleteUploadedFile(req.uploadedFile.path);
      }

      logger.error('خطأ في رفع التحويل البنكي:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // موافقة على التحويل البنكي (للمديرين فقط) - Approve bank transfer
  async approveBankTransfer(req, res) {
    try {
      const { payment_id } = req.params;
      const { admin_notes = '' } = req.body;

      // الحصول على بيانات الدفع
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          payer:payer_id(id, full_name, membership_number, phone),
          beneficiary:beneficiary_id(id, full_name, membership_number, phone),
          subscription:subscription_id(id, member_id, subscriber_id)
        `)
        .eq('id', payment_id)
        .single();

      if (paymentError || !payment) {
        return res.status(404).json({
          success: false,
          message: 'الدفع غير موجود',
          messageEn: 'Payment not found',
          error: 'PAYMENT_NOT_FOUND'
        });
      }

      if (payment.payment_status !== 'pending_verification') {
        return res.status(400).json({
          success: false,
          message: 'هذا الدفع ليس في انتظار الموافقة',
          messageEn: 'This payment is not pending verification',
          error: 'PAYMENT_NOT_PENDING'
        });
      }

      // تحديث حالة الدفع للموافقة
      const approvedPayment = await paymentService.updatePaymentStatus(
        payment_id,
        'approved',
        admin_notes,
        req.user.userId
      );

      // إرسال إشعار للعضو
      await notificationService.notifyMemberPaymentApproved(
        approvedPayment,
        payment.payer
      );

      // إذا كان دفع للآخرين، إرسال إشعار للمستفيد أيضاً
      if (payment.payer_id !== payment.beneficiary_id) {
        await notificationService.notifyPaymentForOthers(
          approvedPayment,
          payment.payer,
          payment.beneficiary
        );
      }

      logger.info(`تم قبول التحويل البنكي: ${payment.payment_number} بواسطة ${req.user.full_name}`);

      res.json({
        success: true,
        message: 'تم قبول التحويل البنكي وتفعيل الاشتراك',
        messageEn: 'Bank transfer approved and subscription activated',
        data: {
          payment: approvedPayment,
          payer: payment.payer,
          beneficiary: payment.beneficiary,
          approved_by: req.user.full_name,
          approved_at: approvedPayment.hijri_approved_at
        }
      });

    } catch (error) {
      logger.error('خطأ في موافقة التحويل البنكي:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // رفض التحويل البنكي (للمديرين فقط) - Reject bank transfer
  async rejectBankTransfer(req, res) {
    try {
      const { payment_id } = req.params;
      const { rejection_reason = '', admin_notes = '' } = req.body;

      if (!rejection_reason) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد سبب الرفض',
          messageEn: 'Rejection reason is required',
          error: 'REJECTION_REASON_REQUIRED'
        });
      }

      // الحصول على بيانات الدفع
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          payer:payer_id(id, full_name, membership_number, phone),
          beneficiary:beneficiary_id(id, full_name, membership_number, phone)
        `)
        .eq('id', payment_id)
        .single();

      if (paymentError || !payment) {
        return res.status(404).json({
          success: false,
          message: 'الدفع غير موجود',
          messageEn: 'Payment not found',
          error: 'PAYMENT_NOT_FOUND'
        });
      }

      if (payment.payment_status !== 'pending_verification') {
        return res.status(400).json({
          success: false,
          message: 'هذا الدفع ليس في انتظار الموافقة',
          messageEn: 'This payment is not pending verification',
          error: 'PAYMENT_NOT_PENDING'
        });
      }

      // تحديث حالة الدفع للرفض
      const rejectedPayment = await paymentService.updatePaymentStatus(
        payment_id,
        'rejected',
        `رفض: ${rejection_reason}. ${admin_notes}`,
        req.user.userId
      );

      // حذف ملف الإيصال إذا كان موجوداً
      if (payment.receipt_image_url) {
        deleteUploadedFile(payment.receipt_image_url);
      }

      // إرسال إشعار للعضو برفض الدفع
      await notificationService.notifyMemberPaymentRejected(
        rejectedPayment,
        payment.payer,
        rejection_reason
      );

      logger.info(`تم رفض التحويل البنكي: ${payment.payment_number} بواسطة ${req.user.full_name}`);

      res.json({
        success: true,
        message: 'تم رفض التحويل البنكي وإشعار العضو',
        messageEn: 'Bank transfer rejected and member notified',
        data: {
          payment: rejectedPayment,
          payer: payment.payer,
          rejection_reason: rejection_reason,
          rejected_by: req.user.full_name,
          rejected_at: rejectedPayment.hijri_approved_at
        }
      });

    } catch (error) {
      logger.error('خطأ في رفض التحويل البنكي:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // الدفع لعضو آخر - Pay for another member
  async payForAnotherMember(req, res) {
    try {
      const {
        member_id, // العضو المستفيد
        amount,
        payment_method = 'app_payment',
        notes = ''
      } = req.body;

      if (!member_id) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد العضو المستفيد',
          messageEn: 'Beneficiary member ID is required',
          error: 'MEMBER_ID_REQUIRED'
        });
      }

      if (member_id === req.user.userId) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكنك الدفع لنفسك، استخدم إنشاء اشتراك عادي',
          messageEn: 'Cannot pay for yourself, use regular subscription creation',
          error: 'SELF_PAYMENT_NOT_ALLOWED'
        });
      }

      // التحقق من وجود العضو المستفيد
      const { data: beneficiaryMember, error: beneficiaryError } = await supabase
        .from('members')
        .select('id, full_name, membership_number, phone')
        .eq('id', member_id)
        .single();

      if (beneficiaryError || !beneficiaryMember) {
        return res.status(404).json({
          success: false,
          message: 'العضو المستفيد غير موجود',
          messageEn: 'Beneficiary member not found',
          error: 'BENEFICIARY_NOT_FOUND'
        });
      }

      // إنشاء اشتراك للعضو المستفيد
      const subscriptionResult = await this.createSubscriptionForMember(
        member_id,
        req.user.userId,
        amount,
        notes
      );

      if (!subscriptionResult.success) {
        return res.status(400).json(subscriptionResult);
      }

      // معالجة الدفع حسب الطريقة المختارة
      if (payment_method === 'app_payment') {
        const paymentResult = await paymentService.processInstantPayment({
          payer_id: req.user.userId,
          beneficiary_id: member_id,
          amount: amount,
          subscription_id: subscriptionResult.subscription.id
        });

        if (!paymentResult.success) {
          return res.status(400).json({
            success: false,
            message: paymentResult.message,
            messageEn: paymentResult.messageEn,
            error: 'PAYMENT_FAILED'
          });
        }

        // إرسال إشعارات الدفع للآخرين
        await notificationService.notifyPaymentForOthers(
          paymentResult.payment,
          { id: req.user.userId, full_name: req.user.full_name, phone: req.user.phone },
          beneficiaryMember
        );

        res.json({
          success: true,
          message: `تم دفع الاشتراك بنجاح لـ ${beneficiaryMember.full_name}`,
          messageEn: `Payment successful for ${beneficiaryMember.full_name}`,
          data: {
            payment: paymentResult.payment,
            subscription: subscriptionResult.subscription,
            beneficiary: beneficiaryMember,
            payment_type: 'payment_for_others'
          }
        });

      } else {
        // للتحويل البنكي، نحتاج إلى طلب منفصل لرفع الإيصال
        res.json({
          success: true,
          message: `تم إنشاء اشتراك لـ ${beneficiaryMember.full_name}، يُرجى رفع إيصال التحويل البنكي`,
          messageEn: `Subscription created for ${beneficiaryMember.full_name}, please upload bank transfer receipt`,
          data: {
            subscription: subscriptionResult.subscription,
            beneficiary: beneficiaryMember,
            payment_required: {
              amount: amount,
              subscription_id: subscriptionResult.subscription.id
            },
            next_step: 'Upload bank transfer receipt using /api/subscriptions/payments/bank-transfer'
          }
        });
      }

    } catch (error) {
      logger.error('خطأ في الدفع للآخرين:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // وظيفة مساعدة لإنشاء اشتراك لعضو آخر
  async createSubscriptionForMember(member_id, subscriber_id, amount, notes) {
    try {
      // التحقق من صحة المبلغ
      const validation = await paymentService.validateSubscriptionAmount(amount);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message,
          messageEn: validation.messageEn,
          error: 'INVALID_AMOUNT'
        };
      }

      // التحقق من عدم وجود اشتراك نشط
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id, status, end_date')
        .eq('member_id', member_id)
        .eq('status', 'active')
        .single();

      if (existingSubscription) {
        return {
          success: false,
          message: 'يوجد اشتراك نشط بالفعل لهذا العضو',
          messageEn: 'Active subscription already exists for this member',
          error: 'ACTIVE_SUBSCRIPTION_EXISTS'
        };
      }

      // إنشاء الاشتراك
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert([{
          member_id: member_id,
          subscriber_id: subscriber_id,
          subscription_type: 'monthly',
          status: 'pending_payment',
          created_at: new Date().toISOString(),
          hijri_created_at: formatHijriDate(new Date()),
          notes: notes || 'دفع لعضو آخر'
        }])
        .select('*')
        .single();

      if (subscriptionError) {
        return {
          success: false,
          message: 'خطأ في إنشاء الاشتراك',
          messageEn: 'Failed to create subscription',
          error: subscriptionError.message
        };
      }

      return {
        success: true,
        subscription: subscription,
        validation: validation
      };

    } catch (error) {
      return {
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      };
    }
  }

  // فحص حالة الدفع - Check payment status
  async getPaymentStatus(req, res) {
    try {
      const { payment_id } = req.params;

      const { data: payment, error } = await supabase
        .from('payments')
        .select(`
          *,
          payer:payer_id(id, full_name, membership_number),
          beneficiary:beneficiary_id(id, full_name, membership_number),
          subscription:subscription_id(id, member_id, subscriber_id, status)
        `)
        .eq('id', payment_id)
        .single();

      if (error || !payment) {
        return res.status(404).json({
          success: false,
          message: 'الدفع غير موجود',
          messageEn: 'Payment not found',
          error: 'PAYMENT_NOT_FOUND'
        });
      }

      // التحقق من الصلاحية
      if (payment.payer_id !== req.user.userId &&
          payment.beneficiary_id !== req.user.userId &&
          !['super_admin', 'admin', 'financial_manager', 'accountant'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بعرض هذا الدفع',
          messageEn: 'Not authorized to view this payment',
          error: 'UNAUTHORIZED_ACCESS'
        });
      }

      res.json({
        success: true,
        message: 'تم استرجاع بيانات الدفع بنجاح',
        messageEn: 'Payment data retrieved successfully',
        data: {
          payment: payment,
          status_description: this.getPaymentStatusDescription(payment.payment_status),
          is_pay_for_others: payment.payer_id !== payment.beneficiary_id
        }
      });

    } catch (error) {
      logger.error('خطأ في فحص حالة الدفع:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
        messageEn: 'Internal server error',
        error: error.message
      });
    }
  }

  // وصف حالة الدفع
  getPaymentStatusDescription(status) {
    const descriptions = {
      pending_verification: {
        ar: 'في انتظار موافقة الإدارة',
        en: 'Pending admin approval'
      },
      approved: {
        ar: 'تم الموافقة وتفعيل الاشتراك',
        en: 'Approved and subscription activated'
      },
      rejected: {
        ar: 'تم رفض الدفع',
        en: 'Payment rejected'
      },
      completed: {
        ar: 'تم الدفع بنجاح',
        en: 'Payment completed successfully'
      },
      failed: {
        ar: 'فشل الدفع',
        en: 'Payment failed'
      }
    };

    return descriptions[status] || {
      ar: 'حالة غير محددة',
      en: 'Unknown status'
    };
  }
}

module.exports = new SubscriptionController();