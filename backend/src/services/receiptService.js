import { supabase } from '../config/database.js';
import { PaymentProcessingService } from './paymentProcessingService.js';

/**
 * Receipt Generation Service
 * Handles receipt generation for payments in multiple formats
 */
export class ReceiptService {

  /**
   * Generate receipt for a payment
   * @param {string} paymentId - Payment ID
   * @param {Object} options - Receipt options
   * @returns {Object} Receipt data or PDF buffer
   */
  static async generateReceipt(paymentId, options = {}) {
    try {
      const { format = 'json', language = 'ar' } = options;

      // Get payment details
      const paymentResult = await PaymentProcessingService.getPaymentById(paymentId);
      if (!paymentResult.success) {
        throw new Error('المدفوع غير موجود');
      }

      const payment = paymentResult.data;

      // Ensure payment is paid before generating receipt
      if (payment.status !== 'paid') {
        throw new Error('لا يمكن إنشاء إيصال لمدفوع غير مدفوع');
      }

      // Generate receipt data
      const receiptData = await this.generateReceiptData(payment, language);

      // Return based on format
      if (format === 'pdf') {
        const pdfBuffer = await this.generatePDFReceipt(receiptData, language);
        return {
          success: true,
          data: pdfBuffer,
          contentType: 'application/pdf',
          filename: `receipt-${payment.reference_number}.pdf`
        };
      } else {
        return {
          success: true,
          data: receiptData,
          message: 'تم إنشاء الإيصال بنجاح'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error.message || 'فشل في إنشاء الإيصال'
      };
    }
  }

  /**
   * Generate receipt data structure
   * @param {Object} payment - Payment data
   * @param {string} language - Language (ar/en)
   * @returns {Object} Receipt data
   */
  static async generateReceiptData(payment, language = 'ar') {
    const now = new Date();
    const isArabic = language === 'ar';

    // Get organization details
    const orgDetails = this.getOrganizationDetails(isArabic);

    const receiptData = {
      // Receipt Header
      header: {
        organizationName: orgDetails.name,
        organizationAddress: orgDetails.address,
        organizationPhone: orgDetails.phone,
        organizationEmail: orgDetails.email,
        receiptTitle: isArabic ? 'إيصال استلام' : 'Payment Receipt',
        receiptNumber: payment.reference_number,
        issueDate: now.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US'),
        issueTime: now.toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US')
      },

      // Payer Information
      payer: {
        name: payment.payer?.full_name || (isArabic ? 'غير محدد' : 'Not specified'),
        membershipNumber: payment.payer?.membership_number || (isArabic ? 'غير محدد' : 'Not specified'),
        phone: payment.payer?.phone || (isArabic ? 'غير محدد' : 'Not specified'),
        email: payment.payer?.email || (isArabic ? 'غير محدد' : 'Not specified')
      },

      // Payment Details
      payment: {
        amount: parseFloat(payment.amount),
        amountInWords: this.numberToWords(parseFloat(payment.amount), isArabic),
        category: this.translateCategory(payment.category, isArabic),
        paymentMethod: this.translatePaymentMethod(payment.payment_method, isArabic),
        referenceNumber: payment.reference_number,
        paymentDate: new Date(payment.processed_at || payment.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US'),
        status: this.translateStatus(payment.status, isArabic),
        notes: payment.notes || ''
      },

      // Additional Information
      details: {
        currency: isArabic ? 'ريال سعودي' : 'SAR',
        vatNumber: orgDetails.vatNumber,
        commercialRegister: orgDetails.commercialRegister
      },

      // Footer
      footer: {
        thankYouMessage: isArabic ?
          'شكراً لكم على دعمكم المستمر لجمعية الشعيل الخيرية' :
          'Thank you for your continued support of Al-Shuail Charitable Association',
        contactInfo: isArabic ?
          'للاستفسارات يرجى الاتصال على الرقم أعلاه أو زيارة موقعنا الإلكتروني' :
          'For inquiries, please contact the number above or visit our website',
        generatedAt: now.toISOString(),
        signature: isArabic ? 'إدارة الجمعية' : 'Association Management'
      }
    };

    return receiptData;
  }

  /**
   * Generate PDF receipt (placeholder for PDF generation)
   * @param {Object} receiptData - Receipt data
   * @param {string} language - Language
   * @returns {Buffer} PDF buffer
   */
  static async generatePDFReceipt(receiptData, language = 'ar') {
    // This is a placeholder implementation
    // In a real implementation, you would use a library like puppeteer, jsPDF, or pdfkit

    const htmlContent = this.generateHTMLReceipt(receiptData, language);

    // For now, return HTML as a "PDF" (in production, convert this to actual PDF)
    return Buffer.from(htmlContent, 'utf8');
  }

  /**
   * Generate HTML receipt
   * @param {Object} receiptData - Receipt data
   * @param {string} language - Language
   * @returns {string} HTML content
   */
  static generateHTMLReceipt(receiptData, language = 'ar') {
    const isRTL = language === 'ar';
    const { header, payer, payment, details, footer } = receiptData;

    return `<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${header.receiptTitle} - ${header.receiptNumber}</title>
    <style>
        body {
            font-family: ${isRTL ? 'Arial, Tahoma' : 'Arial, sans-serif'};
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
            ${isRTL ? 'direction: rtl;' : 'direction: ltr;'}
        }
        .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2c5aa0;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .org-name {
            font-size: 28px;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 10px;
        }
        .amount-highlight {
            background-color: #e8f4f8;
            border: 2px solid #2c5aa0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 25px 0;
        }
        .amount-number {
            font-size: 36px;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="header">
            <div class="org-name">${header.organizationName}</div>
            <div>${header.receiptTitle}</div>
            <div>${header.receiptNumber}</div>
        </div>
        <div class="amount-highlight">
            <div class="amount-number">${payment.amount.toFixed(2)} ${details.currency}</div>
        </div>
        <p>Payer: ${payer.name}</p>
        <p>Date: ${payment.paymentDate}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Get organization details
   * @param {boolean} isArabic - Whether to return Arabic details
   * @returns {Object} Organization details
   */
  static getOrganizationDetails(isArabic = true) {
    return {
      name: isArabic ? 'جمعية الشعيل الخيرية' : 'Al-Shuail Charitable Association',
      address: isArabic ? 'الكويت - منطقة الشعيل' : 'Kuwait - Al-Shuail Area',
      phone: '+965 1234 5678',
      email: 'info@alshuail.org',
      vatNumber: 'VAT-123456789',
      commercialRegister: 'CR-987654321'
    };
  }

  /**
   * Convert number to words (simplified)
   * @param {number} amount - Amount to convert
   * @param {boolean} isArabic - Whether to return Arabic words
   * @returns {string} Amount in words
   */
  static numberToWords(amount, isArabic = true) {
    if (isArabic) {
      const integerPart = Math.floor(amount);
      const decimalPart = Math.round((amount - integerPart) * 100);
      return `${integerPart} ريال سعودي${decimalPart > 0 ? ` و ${decimalPart} هللة` : ''}`;
    } else {
      const integerPart = Math.floor(amount);
      const decimalPart = Math.round((amount - integerPart) * 100);
      return `${integerPart} Saudi Riyal${decimalPart > 0 ? ` and ${decimalPart} Halalas` : 's'}`;
    }
  }

  /**
   * Translate category
   * @param {string} category - Category to translate
   * @param {boolean} isArabic - Whether to return Arabic translation
   * @returns {string} Translated category
   */
  static translateCategory(category, isArabic = true) {
    const translations = {
      subscription: isArabic ? 'اشتراك' : 'Subscription',
      donation: isArabic ? 'تبرع' : 'Donation',
      event: isArabic ? 'فعالية' : 'Event',
      membership: isArabic ? 'عضوية' : 'Membership',
      diya: isArabic ? 'دية' : 'Diya',
      other: isArabic ? 'أخرى' : 'Other'
    };

    return translations[category] || category;
  }

  /**
   * Translate payment method
   * @param {string} method - Payment method to translate
   * @param {boolean} isArabic - Whether to return Arabic translation
   * @returns {string} Translated method
   */
  static translatePaymentMethod(method, isArabic = true) {
    const translations = {
      cash: isArabic ? 'نقداً' : 'Cash',
      card: isArabic ? 'بطاقة ائتمان' : 'Credit Card',
      transfer: isArabic ? 'تحويل بنكي' : 'Bank Transfer',
      online: isArabic ? 'دفع إلكتروني' : 'Online Payment',
      check: isArabic ? 'شيك' : 'Check'
    };

    return translations[method] || method;
  }

  /**
   * Translate status
   * @param {string} status - Status to translate
   * @param {boolean} isArabic - Whether to return Arabic translation
   * @returns {string} Translated status
   */
  static translateStatus(status, isArabic = true) {
    const translations = {
      paid: isArabic ? 'مدفوع' : 'Paid',
      pending: isArabic ? 'معلق' : 'Pending',
      cancelled: isArabic ? 'ملغي' : 'Cancelled',
      failed: isArabic ? 'فشل' : 'Failed',
      refunded: isArabic ? 'مسترد' : 'Refunded'
    };

    return translations[status] || status;
  }
}