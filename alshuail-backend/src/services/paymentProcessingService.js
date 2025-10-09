import { supabase } from '../config/database.js';
import { log } from '../utils/logger.js';

/**
 * Payment Processing Service
 * Handles all payment-related operations including validation, processing, and status updates
 */
export class PaymentProcessingService {

  /**
   * Create a new payment with validation
   * @param {Object} paymentData - Payment data
   * @returns {Object} Created payment or error
   */
  static async createPayment(paymentData) {
    try {
      // Validate required fields
      if (!paymentData.payer_id || !paymentData.amount || !paymentData.category) {
        throw new Error('البيانات المطلوبة مفقودة: معرف الدافع، المبلغ، والفئة');
      }

      // Validate member exists
      const memberExists = await this.validateMemberExists(paymentData.payer_id);
      if (!memberExists) {
        throw new Error('العضو غير موجود في النظام');
      }

      // Validate payment amount
      const amountValidation = await this.validatePaymentAmount(paymentData.amount, paymentData.category);
      if (!amountValidation.isValid) {
        throw new Error(amountValidation.message);
      }

      // Check for duplicate payments
      const isDuplicate = await this.detectDuplicatePayment(paymentData);
      if (isDuplicate) {
        throw new Error('يوجد دفع مماثل مسبقاً لهذا العضو');
      }

      // Generate reference number
      const referenceNumber = this.generateReferenceNumber();

      // Sanitize description/notes
      const sanitizedData = {
        ...paymentData,
        reference_number: referenceNumber,
        status: paymentData.status || 'pending',
        notes: this.sanitizeDescription(paymentData.notes || ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert payment
      const { data: payment, error } = await supabase
        .from('payments')
        .insert([sanitizedData])
        .select(`
          *,
          payer:members(id, full_name, phone, email)
        `)
        .single();

      if (error) {throw error;}

      return {
        success: true,
        data: payment,
        message: 'تم إنشاء المدفوع بنجاح'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في إنشاء المدفوع'
      };
    }
  }

  /**
   * Process payment by updating status and handling business logic
   * @param {string} paymentId - Payment ID
   * @param {string} method - Payment method
   * @returns {Object} Processing result
   */
  static async processPayment(paymentId, method) {
    try {
      // Validate payment method
      const validMethods = ['cash', 'card', 'transfer', 'online', 'check'];
      if (!validMethods.includes(method)) {
        throw new Error('طريقة دفع غير صالحة');
      }

      // Get current payment
      const { data: currentPayment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchError) {throw new Error('المدفوع غير موجود');}

      if (currentPayment.status === 'paid') {
        throw new Error('المدفوع مدفوع مسبقاً');
      }

      if (currentPayment.status === 'cancelled') {
        throw new Error('لا يمكن معالجة مدفوع ملغى');
      }

      // Update payment status and method
      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          payment_method: method,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select(`
          *,
          payer:members(id, full_name, phone, email)
        `)
        .single();

      if (updateError) {throw updateError;}

      // If subscription payment, update member's subscription
      if (currentPayment.category === 'subscription') {
        await this.updateMemberSubscription(currentPayment.payer_id, currentPayment.amount);
      }

      return {
        success: true,
        data: updatedPayment,
        message: 'تم معالجة المدفوع بنجاح'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في معالجة المدفوع'
      };
    }
  }

  /**
   * Update payment status
   * @param {string} paymentId - Payment ID
   * @param {string} status - New status
   * @returns {Object} Update result
   */
  static async updatePaymentStatus(paymentId, status) {
    try {
      const validStatuses = ['pending', 'paid', 'cancelled', 'failed', 'refunded'];
      if (!validStatuses.includes(status)) {
        throw new Error('حالة غير صالحة');
      }

      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };

      // Add processed timestamp for paid status
      if (status === 'paid') {
        updateData.processed_at = new Date().toISOString();
      }

      const { data: payment, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId)
        .select(`
          *,
          payer:members(id, full_name, phone, email)
        `)
        .single();

      if (error) {throw error;}

      return {
        success: true,
        data: payment,
        message: 'تم تحديث حالة المدفوع بنجاح'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في تحديث حالة المدفوع'
      };
    }
  }

  /**
   * Generate unique reference number in format: SH-XXXXXXXX-XXXX
   * @returns {string} Reference number
   */
  static generateReferenceNumber() {
    const prefix = 'SH';
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
    const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 random chars
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Validate payment amount based on category
   * @param {number} amount - Amount to validate
   * @param {string} category - Payment category
   * @returns {Object} Validation result
   */
  static async validatePaymentAmount(amount, category) {
    try {
      const numAmount = parseFloat(amount);

      // Basic amount validation
      if (isNaN(numAmount) || numAmount <= 0) {
        return {
          isValid: false,
          message: 'المبلغ يجب أن يكون رقماً موجباً'
        };
      }

      // Maximum amount validation (100,000 SAR)
      if (numAmount > 100000) {
        return {
          isValid: false,
          message: 'المبلغ يتجاوز الحد الأقصى المسموح (100,000 ريال)'
        };
      }

      // Category-specific validation
      if (category === 'subscription') {
        // Minimum 50 SAR for subscriptions
        if (numAmount < 50) {
          return {
            isValid: false,
            message: 'الحد الأدنى للاشتراك 50 ريال سعودي'
          };
        }

        // Must be multiple of 50 for subscriptions
        if (numAmount % 50 !== 0) {
          return {
            isValid: false,
            message: 'مبلغ الاشتراك يجب أن يكون من مضاعفات الـ 50 ريال'
          };
        }
      }

      // Event fees validation
      if (category === 'event') {
        if (numAmount < 10) {
          return {
            isValid: false,
            message: 'الحد الأدنى لرسوم الفعاليات 10 ريال سعودي'
          };
        }
      }

      return {
        isValid: true,
        message: 'المبلغ صالح'
      };

    } catch (error) {
      return {
        isValid: false,
        message: 'خطأ في التحقق من صحة المبلغ'
      };
    }
  }

  /**
   * Detect duplicate payment
   * @param {Object} memberData - Payment data to check
   * @returns {boolean} True if duplicate found
   */
  static async detectDuplicatePayment(paymentData) {
    try {
      const timeThreshold = new Date();
      timeThreshold.setHours(timeThreshold.getHours() - 1); // 1 hour window

      const { data: existingPayments, error } = await supabase
        .from('payments')
        .select('id')
        .eq('payer_id', paymentData.payer_id)
        .eq('amount', paymentData.amount)
        .eq('category', paymentData.category)
        .in('status', ['pending', 'paid'])
        .gte('created_at', timeThreshold.toISOString());

      if (error) {throw error;}

      return existingPayments && existingPayments.length > 0;

    } catch (error) {
      log.error('Error detecting duplicate payment:', { error: error.message });
      return false; // Don't block payment creation on error
    }
  }

  /**
   * Validate if member exists
   * @param {string} memberId - Member ID
   * @returns {boolean} True if member exists
   */
  static async validateMemberExists(memberId) {
    try {
      const { data: member, error } = await supabase
        .from('members')
        .select('id')
        .eq('id', memberId)
        .eq('is_active', true)
        .single();

      return !error && member;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sanitize description/notes field
   * @param {string} description - Raw description
   * @returns {string} Sanitized description
   */
  static sanitizeDescription(description) {
    if (!description) {return '';}

    // Remove HTML tags and script content
    let sanitized = description.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<[^>]+>/g, '');

    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>'"&]/g, '');

    // Trim and limit length
    sanitized = sanitized.trim().substring(0, 500);

    return sanitized;
  }

  /**
   * Update member subscription after payment
   * @param {string} memberId - Member ID
   * @param {number} amount - Payment amount
   */
  static async updateMemberSubscription(memberId, amount) {
    try {
      // Calculate subscription duration based on amount (50 SAR = 1 month)
      const months = Math.floor(amount / 50);

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      // Check if member has active subscription
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('member_id', memberId)
        .eq('status', 'active')
        .single();

      if (existingSubscription) {
        // Extend existing subscription
        const newEndDate = new Date(existingSubscription.end_date);
        newEndDate.setMonth(newEndDate.getMonth() + months);

        await supabase
          .from('subscriptions')
          .update({
            end_date: newEndDate.toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id);
      } else {
        // Create new subscription
        await supabase
          .from('subscriptions')
          .insert([{
            member_id: memberId,
            plan_name: `اشتراك ${months} شهر`,
            amount: amount,
            duration_months: months,
            status: 'active',
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
          }]);
      }
    } catch (error) {
      log.error('Error updating member subscription:', { error: error.message });
      // Don't throw error as payment is already processed
    }
  }

  /**
   * Get payment by ID with member details
   * @param {string} paymentId - Payment ID
   * @returns {Object} Payment data or error
   */
  static async getPaymentById(paymentId) {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select(`
          *,
          payer:members(id, full_name, phone, email, membership_number)
        `)
        .eq('id', paymentId)
        .single();

      if (error) {throw error;}

      return {
        success: true,
        data: payment
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في جلب بيانات المدفوع'
      };
    }
  }

  /**
   * Bulk update payments
   * @param {Array} updates - Array of payment updates
   * @returns {Object} Bulk update result
   */
  static async bulkUpdatePayments(updates) {
    try {
      const results = [];
      const errors = [];

      for (const update of updates) {
        const result = await this.updatePaymentStatus(update.id, update.status);
        if (result.success) {
          results.push(result.data);
        } else {
          errors.push({ id: update.id, error: result.error });
        }
      }

      return {
        success: errors.length === 0,
        data: {
          updated: results,
          failed: errors,
          summary: {
            total: updates.length,
            successful: results.length,
            failed: errors.length
          }
        },
        message: `تم تحديث ${results.length} من ${updates.length} مدفوع`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في التحديث المجمع للمدفوعات'
      };
    }
  }
}