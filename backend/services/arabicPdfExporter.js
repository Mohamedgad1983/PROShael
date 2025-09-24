/**
 * Arabic PDF Export Service
 * Handles RTL text and proper Arabic formatting for PDF exports
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ArabicPDFExporter {
  constructor() {
    // Arabic font configuration
    this.fonts = {
      arabic: {
        regular: 'Amiri-Regular.ttf',
        bold: 'Amiri-Bold.ttf'
      },
      english: {
        regular: 'Helvetica',
        bold: 'Helvetica-Bold'
      }
    };

    this.pageConfig = {
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      },
      direction: 'rtl'
    };
  }

  /**
   * Create a new PDF document with Arabic support
   */
  createDocument(options = {}) {
    const doc = new PDFDocument({
      ...this.pageConfig,
      ...options,
      autoFirstPage: false
    });

    // Add first page with RTL support
    doc.addPage({
      size: this.pageConfig.size,
      margins: this.pageConfig.margins
    });

    return doc;
  }

  /**
   * Format Arabic text for proper display
   */
  formatArabicText(text) {
    if (!text) return '';

    // Handle mixed Arabic and English text
    const segments = this.segmentText(text);
    return segments.map(segment => {
      if (segment.isArabic) {
        return this.reshapeArabic(segment.text);
      }
      return segment.text;
    }).join(' ');
  }

  /**
   * Segment text into Arabic and English parts
   */
  segmentText(text) {
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g;
    const segments = [];
    let lastIndex = 0;

    const matches = [...text.matchAll(arabicRegex)];

    for (const match of matches) {
      // Add English text before Arabic
      if (match.index > lastIndex) {
        segments.push({
          text: text.substring(lastIndex, match.index),
          isArabic: false
        });
      }

      // Add Arabic text
      segments.push({
        text: match[0],
        isArabic: true
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining English text
    if (lastIndex < text.length) {
      segments.push({
        text: text.substring(lastIndex),
        isArabic: false
      });
    }

    return segments;
  }

  /**
   * Basic Arabic text reshaping (simplified)
   */
  reshapeArabic(text) {
    // This is a simplified reshaping - for production, use a library like arabic-reshaper
    // Reverse the text for RTL display
    return text.split('').reverse().join('');
  }

  /**
   * Generate financial report PDF with Arabic support
   */
  async generateFinancialReportPDF(reportData, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = this.createDocument();
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Add header with logo and title
        this.addReportHeader(doc, reportData);

        // Add report metadata
        this.addReportMetadata(doc, reportData);

        // Add financial summary section
        if (reportData.revenue_analysis) {
          this.addRevenueSection(doc, reportData.revenue_analysis);
        }

        // Add expense analysis section
        if (reportData.expense_analysis) {
          this.addExpenseSection(doc, reportData.expense_analysis);
        }

        // Add charts if available
        if (reportData.charts) {
          this.addChartsSection(doc, reportData.charts);
        }

        // Add footer with page numbers
        this.addFooter(doc);

        doc.end();

        stream.on('finish', () => {
          resolve(outputPath);
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add report header with Arabic title
   */
  addReportHeader(doc, reportData) {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Add logo placeholder
    doc.rect(doc.page.width - 100 - doc.page.margins.right, 50, 80, 80)
       .stroke();

    // Add Arabic title (aligned right for RTL)
    const title = this.formatArabicText(reportData.title || 'تقرير مالي شامل');
    doc.fontSize(24)
       .text(title, doc.page.margins.left, 50, {
         width: pageWidth - 100,
         align: 'right'
       });

    // Add English subtitle
    doc.fontSize(14)
       .fillColor('#666')
       .text('Al-Shuail Family Financial Report', doc.page.margins.left, 85, {
         width: pageWidth - 100,
         align: 'right'
       });

    // Add separator line
    doc.moveTo(doc.page.margins.left, 130)
       .lineTo(doc.page.width - doc.page.margins.right, 130)
       .stroke();

    doc.fillColor('#000');
    doc.moveDown(2);
  }

  /**
   * Add report metadata section
   */
  addReportMetadata(doc, reportData) {
    const metadata = reportData.report_metadata || {};

    doc.fontSize(12);

    // Report ID
    this.addMetadataRow(doc, 'رقم التقرير', metadata.report_id || 'غير محدد');

    // Generated date
    this.addMetadataRow(doc, 'تاريخ الإنشاء', metadata.generated_at?.formatted_hijri || new Date().toLocaleDateString('ar-SA'));

    // Period
    if (metadata.period) {
      this.addMetadataRow(doc, 'الفترة', `${metadata.period.hijri?.month_name} ${metadata.period.hijri?.year}`);
    }

    doc.moveDown();
  }

  /**
   * Add metadata row with RTL support
   */
  addMetadataRow(doc, label, value) {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const labelWidth = 150;
    const valueX = doc.page.width - doc.page.margins.right - labelWidth;

    // Label (right-aligned)
    doc.font(this.fonts.english.bold)
       .text(this.formatArabicText(label + ':'), valueX, doc.y, {
         width: labelWidth,
         align: 'right'
       });

    // Value (right-aligned)
    doc.font(this.fonts.english.regular)
       .text(this.formatArabicText(value), doc.page.margins.left, doc.y - doc.currentLineHeight(), {
         width: pageWidth - labelWidth - 20,
         align: 'right'
       });
  }

  /**
   * Add revenue analysis section
   */
  addRevenueSection(doc, revenueData) {
    // Section title
    doc.fontSize(16)
       .font(this.fonts.english.bold)
       .text(this.formatArabicText('تحليل الإيرادات'), doc.page.margins.left, doc.y, {
         align: 'right'
       })
       .moveDown(0.5);

    doc.fontSize(12)
       .font(this.fonts.english.regular);

    // Revenue details
    this.addFinancialRow(doc, 'إجمالي الإيرادات', revenueData.total_revenue);

    if (revenueData.revenue_sources) {
      doc.moveDown(0.5);
      doc.fontSize(14)
         .font(this.fonts.english.bold)
         .text(this.formatArabicText('مصادر الإيرادات:'), {
           align: 'right'
         })
         .moveDown(0.3);

      doc.fontSize(12)
         .font(this.fonts.english.regular);

      Object.entries(revenueData.revenue_sources).forEach(([source, amount]) => {
        this.addFinancialRow(doc, this.translateSource(source), amount, true);
      });
    }

    doc.moveDown();
  }

  /**
   * Add expense analysis section
   */
  addExpenseSection(doc, expenseData) {
    // Check for page break
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }

    // Section title
    doc.fontSize(16)
       .font(this.fonts.english.bold)
       .text(this.formatArabicText('تحليل المصروفات'), doc.page.margins.left, doc.y, {
         align: 'right'
       })
       .moveDown(0.5);

    doc.fontSize(12)
       .font(this.fonts.english.regular);

    // Expense details
    this.addFinancialRow(doc, 'إجمالي المصروفات', expenseData.total_expenses);

    if (expenseData.expense_categories) {
      doc.moveDown(0.5);
      doc.fontSize(14)
         .font(this.fonts.english.bold)
         .text(this.formatArabicText('فئات المصروفات:'), {
           align: 'right'
         })
         .moveDown(0.3);

      doc.fontSize(12)
         .font(this.fonts.english.regular);

      Object.entries(expenseData.expense_categories).forEach(([category, amount]) => {
        this.addFinancialRow(doc, this.translateCategory(category), amount, true);
      });
    }

    doc.moveDown();
  }

  /**
   * Add financial row with amount formatting
   */
  addFinancialRow(doc, label, amount, indent = false) {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const amountWidth = 120;
    const labelX = indent ? doc.page.margins.left + 20 : doc.page.margins.left;
    const labelWidth = pageWidth - amountWidth - (indent ? 20 : 0);

    // Format amount with Arabic numerals
    const formattedAmount = this.formatCurrency(amount);

    // Label (right-aligned)
    doc.text(this.formatArabicText(label), labelX, doc.y, {
      width: labelWidth,
      align: 'right'
    });

    // Amount (left-aligned for numbers)
    doc.text(formattedAmount, doc.page.width - doc.page.margins.right - amountWidth, doc.y - doc.currentLineHeight(), {
      width: amountWidth,
      align: 'left'
    });
  }

  /**
   * Format currency with Arabic formatting
   */
  formatCurrency(amount) {
    if (!amount && amount !== 0) return 'غير محدد';

    const formatted = new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(amount);

    return formatted;
  }

  /**
   * Translate source names to Arabic
   */
  translateSource(source) {
    const translations = {
      subscriptions: 'الاشتراكات',
      initiatives: 'المبادرات',
      diyas: 'الديات',
      other: 'أخرى'
    };
    return translations[source] || source;
  }

  /**
   * Translate category names to Arabic
   */
  translateCategory(category) {
    const translations = {
      operational: 'التشغيلية',
      events: 'الفعاليات',
      initiatives: 'المبادرات',
      administrative: 'الإدارية',
      maintenance: 'الصيانة',
      emergency: 'الطوارئ'
    };
    return translations[category] || category;
  }

  /**
   * Add footer with page numbers
   */
  addFooter(doc) {
    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      // Add page number at bottom center
      const pageNumber = `صفحة ${i + 1} من ${pages.count}`;
      doc.fontSize(10)
         .fillColor('#666')
         .text(this.formatArabicText(pageNumber), doc.page.margins.left, doc.page.height - 40, {
           width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
           align: 'center'
         });

      // Add timestamp
      const timestamp = new Date().toLocaleString('ar-SA');
      doc.fontSize(8)
         .text(timestamp, doc.page.margins.left, doc.page.height - 25, {
           width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
           align: 'center'
         });
    }
  }

  /**
   * Add charts section (placeholder for chart images)
   */
  addChartsSection(doc, charts) {
    if (doc.y > doc.page.height - 300) {
      doc.addPage();
    }

    doc.fontSize(16)
       .font(this.fonts.english.bold)
       .fillColor('#000')
       .text(this.formatArabicText('الرسوم البيانية'), doc.page.margins.left, doc.y, {
         align: 'right'
       })
       .moveDown();

    // Add placeholder for charts
    doc.rect(doc.page.margins.left, doc.y,
             doc.page.width - doc.page.margins.left - doc.page.margins.right, 200)
       .stroke();

    doc.fontSize(12)
       .fillColor('#666')
       .text(this.formatArabicText('مخطط الإيرادات والمصروفات'),
             doc.page.margins.left + 10, doc.y + 90, {
         width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 20,
         align: 'center'
       });
  }
}

// Export singleton instance
export default new ArabicPDFExporter();