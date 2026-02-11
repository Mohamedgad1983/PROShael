import { query, getClient } from './database.js';
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
      const sanitizedNotes = this.sanitizeDescription(paymentData.notes || '');
      const status = paymentData.status || 'pending';
      const now = new Date().toISOString();

      // Build columns and values from paymentData, overriding specific fields
      const insertData = {
        ...paymentData,
        reference_number: referenceNumber,
        status,
        notes: sanitizedNotes,
        created_at: now,
        updated_at: now
      };

      const columns = Object.keys(insertData);
      const values = Object.values(insertData);
      const placeholders = columns.map((_, i) => `$${i + 1}`);

      const { rows } = await query(
        `INSERT INTO payments (${columns.join(', ')})
         VALUES (${placeholders.join(', ')})
         RETURNING *`,
        values
      );

      const payment = rows[0];

      // Fetch payer details separately
      const { rows: payerRows } = await query(
        `SELECT id, full_name, phone, email FROM members WHERE id = $1`,
        [payment.payer_id]
      );

      payment.payer = payerRows[0] || null;

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
   * Process payment by updating status and handling business logic.
   * Uses a database transaction because it may modify both payments and subscriptions tables.
   * @param {string} paymentId - Payment ID
   * @param {string} method - Payment method
   * @returns {Object} Processing result
   */
  static async processPayment(paymentId, method) {
    const client = await getClient();
    try {
      // Validate payment method
      const validMethods = ['cash', 'card', 'transfer', 'online', 'check'];
      if (!validMethods.includes(method)) {
        throw new Error('طريقة دفع غير صالحة');
      }

      await client.query('BEGIN');

      // Get current payment (lock the row for update)
      const { rows: paymentRows } = await client.query(
        `SELECT * FROM payments WHERE id = $1 FOR UPDATE`,
        [paymentId]
      );

      if (!paymentRows.length) {
        throw new Error('المدفوع غير موجود');
      }

      const currentPayment = paymentRows[0];

      if (currentPayment.status === 'paid') {
        throw new Error('المدفوع مدفوع مسبقاً');
      }

      if (currentPayment.status === 'cancelled') {
        throw new Error('لا يمكن معالجة مدفوع ملغى');
      }

      const now = new Date().toISOString();

      // Update payment status and method
      const { rows: updatedRows } = await client.query(
        `UPDATE payments
         SET status = 'paid', payment_method = $1, processed_at = $2, updated_at = $2
         WHERE id = $3
         RETURNING *`,
        [method, now, paymentId]
      );

      const updatedPayment = updatedRows[0];

      // If subscription payment, update member's subscription within the same transaction
      if (currentPayment.category === 'subscription') {
        await this.updateMemberSubscription(currentPayment.payer_id, currentPayment.amount, client);
      }

      await client.query('COMMIT');

      // Fetch payer details outside the transaction
      const { rows: payerRows } = await query(
        `SELECT id, full_name, phone, email FROM members WHERE id = $1`,
        [updatedPayment.payer_id]
      );

      updatedPayment.payer = payerRows[0] || null;

      return {
        success: true,
        data: updatedPayment,
        message: 'تم معالجة المدفوع بنجاح'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: error.message || 'فشل في معالجة المدفوع'
      };
    } finally {
      client.release();
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

      const now = new Date().toISOString();
      const params = [status, now, paymentId];
      let sql;

      // Add processed timestamp for paid status
      if (status === 'paid') {
        sql = `UPDATE payments
               SET status = $1, updated_at = $2, processed_at = $2
               WHERE id = $3
               RETURNING *`;
      } else {
        sql = `UPDATE payments
               SET status = $1, updated_at = $2
               WHERE id = $3
               RETURNING *`;
      }

      const { rows } = await query(sql, params);

      if (!rows.length) {
        throw new Error('المدفوع غير موجود');
      }

      const payment = rows[0];

      // Fetch payer details
      const { rows: payerRows } = await query(
        `SELECT id, full_name, phone, email FROM members WHERE id = $1`,
        [payment.payer_id]
      );

      payment.payer = payerRows[0] || null;

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
  static validatePaymentAmount(amount, category) {
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
   * @param {Object} paymentData - Payment data to check
   * @returns {boolean} True if duplicate found
   */
  static async detectDuplicatePayment(paymentData) {
    try {
      const timeThreshold = new Date();
      timeThreshold.setHours(timeThreshold.getHours() - 1); // 1 hour window

      const { rows } = await query(
        `SELECT id FROM payments
         WHERE payer_id = $1
           AND amount = $2
           AND category = $3
           AND status = ANY($4)
           AND created_at >= $5`,
        [
          paymentData.payer_id,
          paymentData.amount,
          paymentData.category,
          ['pending', 'paid'],
          timeThreshold.toISOString()
        ]
      );

      return rows && rows.length > 0;

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
      const { rows } = await query(
        `SELECT id FROM members WHERE id = $1 AND is_active = true`,
        [memberId]
      );

      return rows.length > 0;
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
   * Update member subscription after payment.
   * Accepts an optional database client to participate in an existing transaction.
   * @param {string} memberId - Member ID
   * @param {number} amount - Payment amount
   * @param {Object} [dbClient] - Optional pg client for transaction participation
   */
  static async updateMemberSubscription(memberId, amount, dbClient) {
    // Use the provided client (transaction) or fall back to pool query
    const exec = dbClient
      ? (text, params) => dbClient.query(text, params)
      : (text, params) => query(text, params);

    try {
      // Calculate subscription duration based on amount (50 SAR = 1 month)
      const months = Math.floor(amount / 50);

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      // Check if member has active subscription
      const { rows: subRows } = await exec(
        `SELECT * FROM subscriptions WHERE member_id = $1 AND status = 'active' LIMIT 1`,
        [memberId]
      );

      const existingSubscription = subRows[0];

      if (existingSubscription) {
        // Extend existing subscription
        const newEndDate = new Date(existingSubscription.end_date);
        newEndDate.setMonth(newEndDate.getMonth() + months);

        await exec(
          `UPDATE subscriptions
           SET end_date = $1, updated_at = $2
           WHERE id = $3`,
          [
            newEndDate.toISOString().split('T')[0],
            new Date().toISOString(),
            existingSubscription.id
          ]
        );
      } else {
        // Create new subscription
        await exec(
          `INSERT INTO subscriptions (member_id, plan_name, amount, duration_months, status, start_date, end_date)
           VALUES ($1, $2, $3, $4, 'active', $5, $6)`,
          [
            memberId,
            `اشتراك ${months} شهر`,
            amount,
            months,
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          ]
        );
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
      const { rows } = await query(
        `SELECT p.*,
                json_build_object(
                  'id', m.id,
                  'full_name', m.full_name,
                  'phone', m.phone,
                  'email', m.email,
                  'membership_number', m.membership_number
                ) AS payer
         FROM payments p
         LEFT JOIN members m ON m.id = p.payer_id
         WHERE p.id = $1`,
        [paymentId]
      );

      if (!rows.length) {
        throw new Error('المدفوع غير موجود');
      }

      return {
        success: true,
        data: rows[0]
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
