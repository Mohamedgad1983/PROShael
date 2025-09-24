/**
 * Mobile Payment Service
 * Handles payment processing, validation, and receipt uploads
 * Supports pay-on-behalf functionality and minimum balance requirements
 */

import { apiService } from '../../services/api.js';

class PaymentService {
  constructor() {
    this.MIN_PAYMENT_AMOUNT = 50; // SAR
    this.MIN_BALANCE_REQUIREMENT = 3000; // SAR
    this.SUPPORTED_PAYMENT_TYPES = ['initiative', 'diya', 'subscription'];
    this.SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    this.MAX_RECEIPT_SIZE = 5 * 1024 * 1024; // 5MB
  }

  /**
   * Get member balance and check minimum requirement
   */
  async getMemberBalance(memberId) {
    try {
      const response = await apiService.request(`/members/${memberId}/balance`);
      return {
        balance: response.balance || 0,
        hasMinimumBalance: (response.balance || 0) >= this.MIN_BALANCE_REQUIREMENT,
        currency: 'SAR'
      };
    } catch (error) {
      console.error('Error fetching member balance:', error);
      throw new Error('فشل في جلب رصيد العضو');
    }
  }

  /**
   * Validate payment data
   */
  validatePayment(paymentData) {
    const errors = {};

    // Amount validation
    if (!paymentData.amount || paymentData.amount < this.MIN_PAYMENT_AMOUNT) {
      errors.amount = `الحد الأدنى للدفع هو ${this.MIN_PAYMENT_AMOUNT} ريال`;
    }

    // Payment type validation
    if (!paymentData.type || !this.SUPPORTED_PAYMENT_TYPES.includes(paymentData.type)) {
      errors.type = 'نوع الدفعة غير صالح';
    }

    // Member ID validation for pay-on-behalf
    if (paymentData.payOnBehalf && !paymentData.onBehalfMemberId) {
      errors.onBehalfMemberId = 'يجب اختيار العضو للدفع نيابة عنه';
    }

    // Description for initiatives and diyas
    if ((paymentData.type === 'initiative' || paymentData.type === 'diya') && !paymentData.description?.trim()) {
      errors.description = 'يجب إدخال وصف للمبادرة أو الدية';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validate receipt image
   */
  validateReceiptImage(file) {
    const errors = [];

    if (!file) {
      errors.push('يجب رفع صورة الإيصال');
      return { isValid: false, errors };
    }

    // File type validation
    if (!this.SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      errors.push('نوع الملف غير مدعوم. يرجى رفع صورة بصيغة JPG، PNG، أو WebP');
    }

    // File size validation
    if (file.size > this.MAX_RECEIPT_SIZE) {
      errors.push('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Upload receipt image
   */
  async uploadReceipt(file, paymentId) {
    try {
      const validation = this.validateReceiptImage(file);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const formData = new FormData();
      formData.append('receipt', file);
      formData.append('paymentId', paymentId);

      const response = await fetch(`${apiService.baseURL}/payments/upload-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل في رفع الإيصال');
      }

      const data = await response.json();
      return {
        success: true,
        receiptUrl: data.receiptUrl,
        receiptId: data.receiptId
      };
    } catch (error) {
      console.error('Receipt upload error:', error);
      throw error;
    }
  }

  /**
   * Create mobile payment
   */
  async createPayment(paymentData) {
    try {
      // Validate payment data
      const validation = this.validatePayment(paymentData);
      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      // Check member balance for pay-on-behalf
      if (paymentData.payOnBehalf) {
        const balance = await this.getMemberBalance(paymentData.onBehalfMemberId);
        if (!balance.hasMinimumBalance) {
          throw new Error(`العضو لا يملك الحد الأدنى من الرصيد (${this.MIN_BALANCE_REQUIREMENT} ريال)`);
        }
      }

      // Prepare payment payload
      const payload = {
        amount: paymentData.amount,
        type: paymentData.type,
        category: this.mapTypeToCategory(paymentData.type),
        method: 'app_payment',
        description: paymentData.description,
        payOnBehalf: paymentData.payOnBehalf || false,
        onBehalfMemberId: paymentData.onBehalfMemberId,
        memberId: paymentData.payOnBehalf ? paymentData.onBehalfMemberId : paymentData.memberId,
        initiatedBy: paymentData.memberId, // Who initiated the payment
        metadata: {
          isMobilePayment: true,
          paymentDate: new Date().toISOString(),
          deviceInfo: this.getDeviceInfo()
        }
      };

      const response = await apiService.createPayment(payload);

      return {
        success: true,
        payment: response.payment,
        paymentId: response.payment.id,
        referenceNumber: response.payment.referenceNumber
      };
    } catch (error) {
      console.error('Payment creation error:', error);
      throw error;
    }
  }

  /**
   * Complete payment with receipt
   */
  async completePayment(paymentId, receiptFile) {
    try {
      // Upload receipt first
      const uploadResult = await this.uploadReceipt(receiptFile, paymentId);

      // Update payment status
      const response = await apiService.updatePaymentStatus(paymentId, 'pending');

      return {
        success: true,
        payment: response.payment,
        receiptUrl: uploadResult.receiptUrl
      };
    } catch (error) {
      console.error('Payment completion error:', error);
      throw error;
    }
  }

  /**
   * Get payment history for member
   */
  async getPaymentHistory(memberId, filters = {}) {
    try {
      const params = {
        memberId,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        startDate: filters.startDate,
        endDate: filters.endDate,
        type: filters.type,
        status: filters.status
      };

      const response = await apiService.getPayments(params);

      return {
        payments: response.payments || [],
        total: response.total || 0,
        hasMore: response.hasMore || false
      };
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw new Error('فشل في جلب سجل المدفوعات');
    }
  }

  /**
   * Search members for pay-on-behalf
   */
  async searchMembers(query, excludeMemberId = null) {
    try {
      const response = await apiService.request(`/members/search?q=${encodeURIComponent(query)}&exclude=${excludeMemberId || ''}`);

      return response.members.map(member => ({
        id: member.id,
        name: member.full_name || `${member.first_name} ${member.last_name}`,
        membershipNumber: member.membership_number,
        phone: member.phone,
        balance: member.current_balance || 0,
        hasMinimumBalance: (member.current_balance || 0) >= this.MIN_BALANCE_REQUIREMENT,
        avatar: member.avatar_url
      }));
    } catch (error) {
      console.error('Member search error:', error);
      throw new Error('فشل في البحث عن الأعضاء');
    }
  }

  /**
   * Get payment categories for each type
   */
  getPaymentCategories(type) {
    const categories = {
      initiative: {
        ar: 'مبادرة',
        en: 'Initiative',
        icon: '🎯',
        description: 'مساهمة في مبادرات العائلة'
      },
      diya: {
        ar: 'دية',
        en: 'Diya',
        icon: '⚖️',
        description: 'دفع دية أو تعويض'
      },
      subscription: {
        ar: 'اشتراك',
        en: 'Subscription',
        icon: '💳',
        description: 'رسوم اشتراك شهرية أو سنوية'
      }
    };

    return categories[type] || categories.subscription;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount, locale = 'ar-SA') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Generate payment summary
   */
  generatePaymentSummary(paymentData, member = null) {
    const category = this.getPaymentCategories(paymentData.type);

    return {
      amount: this.formatCurrency(paymentData.amount),
      type: category.ar,
      icon: category.icon,
      description: paymentData.description || category.description,
      payOnBehalf: paymentData.payOnBehalf,
      beneficiary: member ? member.name : null,
      timestamp: new Date().toLocaleString('ar-SA'),
      minimumBalanceCheck: paymentData.payOnBehalf ?
        `الحد الأدنى للرصيد: ${this.formatCurrency(this.MIN_BALANCE_REQUIREMENT)}` : null
    };
  }

  // Helper methods
  mapTypeToCategory(type) {
    const mapping = {
      initiative: 'donation',
      diya: 'penalty',
      subscription: 'subscription'
    };
    return mapping[type] || 'subscription';
  }

  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export payment history to PDF
   */
  async exportPaymentHistory(memberId, filters = {}) {
    try {
      const response = await apiService.request(`/payments/export/${memberId}`, {
        method: 'POST',
        body: JSON.stringify(filters)
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment-history-${memberId}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Export error:', error);
      throw new Error('فشل في تصدير سجل المدفوعات');
    }
  }
}

export const paymentService = new PaymentService();
export default PaymentService;