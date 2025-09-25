import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { supabase } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Report Export Service
 * Provides comprehensive Arabic PDF and Excel report generation
 * with RTL support, Hijri/Gregorian calendars, and financial formatting
 */
export class ReportExportService {

  /**
   * Main function to generate report files
   * @param {Object} reportData - The data to include in the report
   * @param {string} format - 'pdf' or 'excel'
   * @param {string} reportType - Type of report (financial, forensic, etc.)
   * @returns {string} Download URL from Supabase storage
   */
  static async generateReportFile(reportData, format, reportType) {
    try {
      let fileName, fileBuffer;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      if (format === 'pdf') {
        fileName = `${reportType}-report-${timestamp}.pdf`;
        fileBuffer = await this.generateArabicPDFReport(reportData, reportType);
      } else if (format === 'excel') {
        fileName = `${reportType}-report-${timestamp}.xlsx`;
        fileBuffer = await this.generateArabicExcelReport(reportData, reportType);
      } else {
        throw new Error('Unsupported format. Use "pdf" or "excel"');
      }

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('reports')
        .upload(`reports/${fileName}`, fileBuffer, {
          contentType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('reports')
        .getPublicUrl(`reports/${fileName}`);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Generate Arabic PDF report with RTL support
   * @param {Object} reportData - Report data
   * @param {string} reportType - Type of report
   * @returns {Buffer} PDF buffer
   */
  static async generateArabicPDFReport(reportData, reportType) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          info: {
            Title: this.getReportTitle(reportType),
            Author: 'نظام إدارة عائلة الشعيل',
            Subject: `تقرير ${this.getReportTitle(reportType)}`,
            Keywords: 'تقرير مالي, عائلة الشعيل, إحصائيات'
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Set RTL text direction
        doc.registerFont('NotoSansArabic', this.getArabicFontPath());
        doc.font('NotoSansArabic');

        // Add header
        this.addPDFHeader(doc, reportType, reportData);

        // Add content based on report type
        switch (reportType) {
          case 'financial':
            this.addFinancialContentToPDF(doc, reportData);
            break;
          case 'forensic':
            this.addForensicContentToPDF(doc, reportData);
            break;
          case 'member':
            this.addMemberContentToPDF(doc, reportData);
            break;
          default:
            this.addGeneralContentToPDF(doc, reportData);
        }

        // Add footer
        this.addPDFFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Arabic Excel report with RTL worksheets
   * @param {Object} reportData - Report data
   * @param {string} reportType - Type of report
   * @returns {Buffer} Excel buffer
   */
  static async generateArabicExcelReport(reportData, reportType) {
    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = 'نظام إدارة عائلة الشعيل';
    workbook.lastModifiedBy = 'نظام إدارة عائلة الشعيل';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();

    // Create main worksheet
    const worksheet = workbook.addWorksheet('التقرير الرئيسي', {
      properties: { rightToLeft: true },
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'portrait',
        margins: {
          left: 0.7, right: 0.7, top: 0.75, bottom: 0.75,
          header: 0.3, footer: 0.3
        }
      }
    });

    // Add header
    this.addExcelHeader(worksheet, reportType, reportData);

    // Add content based on report type
    switch (reportType) {
      case 'financial':
        this.addFinancialContentToExcel(worksheet, reportData);
        break;
      case 'forensic':
        this.addForensicDataToWorksheet(worksheet, reportData);
        break;
      case 'member':
        this.addMemberContentToExcel(worksheet, reportData);
        break;
      default:
        this.addGeneralContentToExcel(worksheet, reportData);
    }

    // Add charts if financial data
    if (reportType === 'financial' && reportData.chartData) {
      this.addFinancialCharts(workbook, worksheet, reportData.chartData);
    }

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Get Arabic font path (fallback to system font if not available)
   */
  static getArabicFontPath() {
    // Try to find Arabic font file
    const possiblePaths = [
      path.join(__dirname, '../../assets/fonts/NotoSansArabic-Regular.ttf'),
      'C:/Windows/Fonts/arial.ttf', // Windows fallback
      '/System/Library/Fonts/Arial.ttf', // macOS fallback
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf' // Linux fallback
    ];

    for (const fontPath of possiblePaths) {
      if (fs.existsSync(fontPath)) {
        return fontPath;
      }
    }

    // Use built-in font as last resort
    return 'Helvetica';
  }

  /**
   * Add PDF header with Arabic title and dates
   */
  static addPDFHeader(doc, reportType, reportData) {
    const title = this.getReportTitle(reportType);
    const currentDate = new Date();
    const hijriDate = this.getHijriDate(currentDate);
    const gregorianDate = this.formatGregorianDate(currentDate);

    // Title
    doc.fontSize(20)
       .fillColor('#2c3e50')
       .text(title, 50, 50, { align: 'right', width: 500 });

    // Subtitle
    doc.fontSize(14)
       .fillColor('#7f8c8d')
       .text('نظام إدارة عائلة الشعيل', 50, 80, { align: 'right', width: 500 });

    // Dates
    doc.fontSize(12)
       .fillColor('#34495e')
       .text(`التاريخ الهجري: ${hijriDate}`, 50, 110, { align: 'right', width: 500 })
       .text(`التاريخ الميلادي: ${gregorianDate}`, 50, 130, { align: 'right', width: 500 });

    // Horizontal line
    doc.moveTo(50, 160)
       .lineTo(550, 160)
       .strokeColor('#bdc3c7')
       .lineWidth(1)
       .stroke();
  }

  /**
   * Add Excel header with Arabic formatting
   */
  static addExcelHeader(worksheet, reportType, reportData) {
    const title = this.getReportTitle(reportType);
    const currentDate = new Date();
    const hijriDate = this.getHijriDate(currentDate);
    const gregorianDate = this.formatGregorianDate(currentDate);

    // Title row
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF2c3e50' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFecf0f1' }
    };

    // Subtitle row
    worksheet.mergeCells('A2:H2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = 'نظام إدارة عائلة الشعيل';
    subtitleCell.font = { name: 'Arial', size: 12, color: { argb: 'FF7f8c8d' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Date rows
    worksheet.mergeCells('A3:D3');
    worksheet.mergeCells('E3:H3');
    worksheet.getCell('A3').value = `التاريخ الهجري: ${hijriDate}`;
    worksheet.getCell('E3').value = `التاريخ الميلادي: ${gregorianDate}`;

    ['A3', 'E3'].forEach(cell => {
      worksheet.getCell(cell).font = { name: 'Arial', size: 10 };
      worksheet.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Set row heights
    worksheet.getRow(1).height = 25;
    worksheet.getRow(2).height = 20;
    worksheet.getRow(3).height = 18;
  }

  /**
   * Add financial content to PDF
   */
  static addFinancialContentToPDF(doc, reportData) {
    let yPosition = 180;

    // Summary section
    doc.fontSize(16)
       .fillColor('#2c3e50')
       .text('ملخص مالي', 50, yPosition, { align: 'right', width: 500 });

    yPosition += 30;

    const summary = reportData.summary || {};
    const summaryItems = [
      { label: 'إجمالي المدفوعات', value: this.formatArabicCurrency(summary.totalAmount || 0) },
      { label: 'المدفوعات المكتملة', value: this.formatArabicCurrency(summary.paidAmount || 0) },
      { label: 'المدفوعات المعلقة', value: this.formatArabicCurrency(summary.pendingAmount || 0) },
      { label: 'عدد المعاملات', value: (summary.totalPayments || 0).toLocaleString('ar-SA') }
    ];

    summaryItems.forEach(item => {
      doc.fontSize(12)
         .fillColor('#34495e')
         .text(`${item.label}: ${item.value}`, 50, yPosition, { align: 'right', width: 500 });
      yPosition += 20;
    });

    yPosition += 20;

    // Payments table
    if (reportData.payments && reportData.payments.length > 0) {
      doc.fontSize(14)
         .fillColor('#2c3e50')
         .text('تفاصيل المدفوعات', 50, yPosition, { align: 'right', width: 500 });

      yPosition += 30;

      // Table headers
      const headers = ['المبلغ', 'الحالة', 'طريقة الدفع', 'التاريخ', 'الرقم المرجعي'];
      const columnWidths = [100, 80, 100, 100, 120];
      let xPosition = 550;

      doc.fontSize(10)
         .fillColor('#ffffff')
         .rect(50, yPosition, 500, 20)
         .fill('#34495e');

      headers.forEach((header, index) => {
        xPosition -= columnWidths[index];
        doc.text(header, xPosition, yPosition + 5, {
          width: columnWidths[index],
          align: 'center'
        });
      });

      yPosition += 25;

      // Table rows
      reportData.payments.slice(0, 20).forEach(payment => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        xPosition = 550;
        const rowData = [
          this.formatArabicCurrency(payment.amount),
          this.translateStatus(payment.status),
          payment.payment_method || 'غير محدد',
          this.formatArabicDate(payment.created_at),
          payment.reference_number || 'غير متوفر'
        ];

        doc.fontSize(9).fillColor('#2c3e50');
        rowData.forEach((data, index) => {
          xPosition -= columnWidths[index];
          doc.text(data.toString(), xPosition, yPosition + 2, {
            width: columnWidths[index],
            align: 'center'
          });
        });

        yPosition += 20;
      });
    }
  }

  /**
   * Add financial content to Excel
   */
  static addFinancialContentToExcel(worksheet, reportData) {
    let currentRow = 5;

    // Summary section
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const summaryHeaderCell = worksheet.getCell(`A${currentRow}`);
    summaryHeaderCell.value = 'الملخص المالي';
    summaryHeaderCell.font = { name: 'Arial', size: 14, bold: true };
    summaryHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFd5dbdb' }
    };

    currentRow += 2;

    const summary = reportData.summary || {};
    const summaryData = [
      ['إجمالي المدفوعات', this.formatArabicCurrency(summary.totalAmount || 0)],
      ['المدفوعات المكتملة', this.formatArabicCurrency(summary.paidAmount || 0)],
      ['المدفوعات المعلقة', this.formatArabicCurrency(summary.pendingAmount || 0)],
      ['عدد المعاملات', (summary.totalPayments || 0).toLocaleString('ar-SA')]
    ];

    summaryData.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`B${currentRow}`).value = value;
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;
    });

    currentRow += 2;

    // Payments table
    if (reportData.payments && reportData.payments.length > 0) {
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const paymentsHeaderCell = worksheet.getCell(`A${currentRow}`);
      paymentsHeaderCell.value = 'تفاصيل المدفوعات';
      paymentsHeaderCell.font = { name: 'Arial', size: 14, bold: true };
      paymentsHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      paymentsHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFd5dbdb' }
      };

      currentRow += 2;

      // Headers
      const headers = ['الرقم المرجعي', 'التاريخ', 'طريقة الدفع', 'الحالة', 'المبلغ'];
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFffffff' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF34495e' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      currentRow++;

      // Data rows
      reportData.payments.forEach(payment => {
        const rowData = [
          payment.reference_number || 'غير متوفر',
          this.formatArabicDate(payment.created_at),
          payment.payment_method || 'غير محدد',
          this.translateStatus(payment.status),
          this.formatArabicCurrency(payment.amount)
        ];

        rowData.forEach((data, index) => {
          const cell = worksheet.getCell(currentRow, index + 1);
          cell.value = data;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };

          // Alternate row colors
          if (currentRow % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFf8f9fa' }
            };
          }
        });
        currentRow++;
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 20;
      });
    }
  }

  /**
   * Add forensic content to PDF
   */
  static addForensicContentToPDF(doc, reportData) {
    let yPosition = 180;

    doc.fontSize(16)
       .fillColor('#e74c3c')
       .text('تقرير التحليل الجنائي', 50, yPosition, { align: 'right', width: 500 });

    yPosition += 30;

    if (reportData.anomalies && reportData.anomalies.length > 0) {
      doc.fontSize(14)
         .fillColor('#c0392b')
         .text('الحالات الشاذة المكتشفة', 50, yPosition, { align: 'right', width: 500 });

      yPosition += 20;

      reportData.anomalies.forEach((anomaly, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(12)
           .fillColor('#2c3e50')
           .text(`${index + 1}. ${anomaly.description}`, 70, yPosition, { align: 'right', width: 480 });

        yPosition += 15;

        if (anomaly.details) {
          doc.fontSize(10)
             .fillColor('#7f8c8d')
             .text(`التفاصيل: ${anomaly.details}`, 90, yPosition, { align: 'right', width: 460 });
          yPosition += 15;
        }

        if (anomaly.severity) {
          const severityColor = anomaly.severity === 'high' ? '#e74c3c' :
                               anomaly.severity === 'medium' ? '#f39c12' : '#27ae60';
          doc.fontSize(10)
             .fillColor(severityColor)
             .text(`مستوى الخطورة: ${this.translateSeverity(anomaly.severity)}`, 90, yPosition, { align: 'right', width: 460 });
          yPosition += 20;
        }
      });
    }

    if (reportData.recommendations && reportData.recommendations.length > 0) {
      yPosition += 20;
      doc.fontSize(14)
         .fillColor('#27ae60')
         .text('التوصيات', 50, yPosition, { align: 'right', width: 500 });

      yPosition += 20;

      reportData.recommendations.forEach((recommendation, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(12)
           .fillColor('#2c3e50')
           .text(`${index + 1}. ${recommendation}`, 70, yPosition, { align: 'right', width: 480 });
        yPosition += 20;
      });
    }
  }

  /**
   * Add forensic data to Excel worksheet
   */
  static addForensicDataToWorksheet(worksheet, reportData) {
    let currentRow = 5;

    // Anomalies section
    if (reportData.anomalies && reportData.anomalies.length > 0) {
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const anomaliesHeaderCell = worksheet.getCell(`A${currentRow}`);
      anomaliesHeaderCell.value = 'الحالات الشاذة المكتشفة';
      anomaliesHeaderCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFe74c3c' } };
      anomaliesHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      anomaliesHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFffeaa7' }
      };

      currentRow += 2;

      // Headers
      const headers = ['الوصف', 'التفاصيل', 'مستوى الخطورة', 'التاريخ'];
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFffffff' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFe74c3c' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      currentRow++;

      // Data rows
      reportData.anomalies.forEach(anomaly => {
        const rowData = [
          anomaly.description,
          anomaly.details || 'غير متوفر',
          this.translateSeverity(anomaly.severity),
          anomaly.date ? this.formatArabicDate(anomaly.date) : 'غير محدد'
        ];

        rowData.forEach((data, index) => {
          const cell = worksheet.getCell(currentRow, index + 1);
          cell.value = data;
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

          // Color code by severity
          if (index === 2) { // Severity column
            const severity = anomaly.severity;
            const color = severity === 'high' ? 'FFe74c3c' :
                         severity === 'medium' ? 'FFf39c12' : 'FF27ae60';
            cell.font = { color: { argb: color }, bold: true };
          }
        });
        currentRow++;
      });

      currentRow += 2;
    }

    // Recommendations section
    if (reportData.recommendations && reportData.recommendations.length > 0) {
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const recommendationsHeaderCell = worksheet.getCell(`A${currentRow}`);
      recommendationsHeaderCell.value = 'التوصيات';
      recommendationsHeaderCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF27ae60' } };
      recommendationsHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      recommendationsHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFd4edda' }
      };

      currentRow += 2;

      reportData.recommendations.forEach((recommendation, index) => {
        worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
        const cell = worksheet.getCell(`A${currentRow}`);
        cell.value = `${index + 1}. ${recommendation}`;
        cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
        worksheet.getRow(currentRow).height = 25;
        currentRow++;
      });
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 25;
    });
  }

  /**
   * Add member content to PDF and Excel (placeholder)
   */
  static addMemberContentToPDF(doc, reportData) {
    // Implementation for member reports
    let yPosition = 180;
    doc.fontSize(16)
       .fillColor('#3498db')
       .text('تقرير الأعضاء', 50, yPosition, { align: 'right', width: 500 });
  }

  static addMemberContentToExcel(worksheet, reportData) {
    // Implementation for member reports in Excel
    let currentRow = 5;
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const headerCell = worksheet.getCell(`A${currentRow}`);
    headerCell.value = 'تقرير الأعضاء';
    headerCell.font = { name: 'Arial', size: 14, bold: true };
  }

  /**
   * Add general content (fallback)
   */
  static addGeneralContentToPDF(doc, reportData) {
    let yPosition = 180;
    doc.fontSize(16)
       .fillColor('#9b59b6')
       .text('تقرير عام', 50, yPosition, { align: 'right', width: 500 });
  }

  static addGeneralContentToExcel(worksheet, reportData) {
    let currentRow = 5;
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const headerCell = worksheet.getCell(`A${currentRow}`);
    headerCell.value = 'تقرير عام';
    headerCell.font = { name: 'Arial', size: 14, bold: true };
  }

  /**
   * Add financial charts to Excel workbook
   */
  static addFinancialCharts(workbook, worksheet, chartData) {
    // Create a new worksheet for charts
    const chartWorksheet = workbook.addWorksheet('الرسوم البيانية', {
      properties: { rightToLeft: true }
    });

    // Add chart data
    if (chartData.monthlyTrends) {
      const chartData1 = [
        ['الشهر', 'المبلغ'],
        ...chartData.monthlyTrends.map(item => [item.month, item.amount])
      ];

      chartData1.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          chartWorksheet.getCell(rowIndex + 1, colIndex + 1).value = cell;
        });
      });
    }

    // Note: ExcelJS doesn't support Arabic in charts natively
    // Consider using Chart.js with canvas for more advanced charting
  }

  /**
   * Add PDF footer
   */
  static addPDFFooter(doc) {
    const bottomMargin = 50;
    const pageHeight = doc.page.height;

    doc.fontSize(8)
       .fillColor('#95a5a6')
       .text('تم إنشاء هذا التقرير بواسطة نظام إدارة عائلة الشعيل',
             50, pageHeight - bottomMargin,
             { align: 'center', width: 500 });

    doc.text(`تاريخ الإنشاء: ${this.formatArabicDate(new Date())}`,
             50, pageHeight - bottomMargin + 12,
             { align: 'center', width: 500 });
  }

  /**
   * Format currency in Arabic style with SAR
   */
  static formatArabicCurrency(amount) {
    if (typeof amount !== 'number') {
      amount = parseFloat(amount) || 0;
    }

    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format dates in Arabic
   */
  static formatArabicDate(date) {
    if (!date) return 'غير محدد';

    const dateObj = new Date(date);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Riyadh'
    }).format(dateObj);
  }

  /**
   * Format Gregorian date
   */
  static formatGregorianDate(date) {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Riyadh'
    }).format(date);
  }

  /**
   * Get Hijri date (approximation)
   */
  static getHijriDate(date) {
    // Simple Hijri date calculation (for more accuracy, use a proper Hijri calendar library)
    const gregorianDate = new Date(date);
    const hijriYear = Math.floor((gregorianDate.getFullYear() - 622) * 1.030684) + 1;
    const hijriMonth = Math.floor(gregorianDate.getMonth() * 1.030684) + 1;
    const hijriDay = Math.floor(gregorianDate.getDate() * 1.030684);

    const hijriMonths = [
      'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية',
      'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
    ];

    return `${hijriDay} ${hijriMonths[hijriMonth - 1] || hijriMonths[0]} ${hijriYear}هـ`;
  }

  /**
   * Get report title in Arabic
   */
  static getReportTitle(reportType) {
    const titles = {
      financial: 'التقرير المالي',
      forensic: 'تقرير التحليل الجنائي',
      member: 'تقرير الأعضاء',
      event: 'تقرير الفعاليات',
      subscription: 'تقرير الاشتراكات'
    };

    return titles[reportType] || 'التقرير العام';
  }

  /**
   * Translate status to Arabic
   */
  static translateStatus(status) {
    const translations = {
      paid: 'مدفوع',
      pending: 'معلق',
      failed: 'فاشل',
      cancelled: 'ملغي',
      refunded: 'مسترد',
      active: 'نشط',
      inactive: 'غير نشط'
    };

    return translations[status] || status;
  }

  /**
   * Translate severity levels to Arabic
   */
  static translateSeverity(severity) {
    const translations = {
      high: 'عالي',
      medium: 'متوسط',
      low: 'منخفض'
    };

    return translations[severity] || severity;
  }
}

export default ReportExportService;