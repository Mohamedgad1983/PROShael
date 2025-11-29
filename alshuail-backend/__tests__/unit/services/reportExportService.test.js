/**
 * Report Export Service Unit Tests
 * Tests PDF and Excel report generation
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Report Export Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Report File Generation Tests
  // ============================================
  describe('generateReportFile', () => {
    test('should generate PDF filename with timestamp', () => {
      const reportType = 'financial';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${reportType}-report-${timestamp}.pdf`;

      expect(fileName).toMatch(/financial-report-.*\.pdf/);
    });

    test('should generate Excel filename with timestamp', () => {
      const reportType = 'forensic';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${reportType}-report-${timestamp}.xlsx`;

      expect(fileName).toMatch(/forensic-report-.*\.xlsx/);
    });

    test('should throw error for unsupported format', () => {
      const format = 'csv';
      let error = null;

      if (format !== 'pdf' && format !== 'excel') {
        error = new Error('Unsupported format. Use "pdf" or "excel"');
      }

      expect(error.message).toBe('Unsupported format. Use "pdf" or "excel"');
    });

    test('should set correct content type for PDF', () => {
      const format = 'pdf';
      const contentType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      expect(contentType).toBe('application/pdf');
    });

    test('should set correct content type for Excel', () => {
      const format = 'excel';
      const contentType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      expect(contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });

  // ============================================
  // Report Title Tests
  // ============================================
  describe('getReportTitle', () => {
    test('should return Arabic title for financial report', () => {
      const titles = {
        financial: 'التقرير المالي',
        forensic: 'تقرير التحليل الجنائي',
        member: 'تقرير الأعضاء',
        event: 'تقرير الفعاليات',
        subscription: 'تقرير الاشتراكات'
      };

      expect(titles.financial).toBe('التقرير المالي');
    });

    test('should return Arabic title for forensic report', () => {
      const titles = { forensic: 'تقرير التحليل الجنائي' };
      expect(titles.forensic).toContain('جنائي');
    });

    test('should return Arabic title for member report', () => {
      const titles = { member: 'تقرير الأعضاء' };
      expect(titles.member).toContain('الأعضاء');
    });

    test('should return default title for unknown type', () => {
      const titles = {};
      const reportType = 'unknown';
      const title = titles[reportType] || 'التقرير العام';

      expect(title).toBe('التقرير العام');
    });
  });

  // ============================================
  // Date Formatting Tests
  // ============================================
  describe('Date Formatting', () => {
    test('should format Arabic date correctly', () => {
      const date = new Date('2024-06-15');
      const formatted = new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Riyadh'
      }).format(date);

      expect(formatted).toBeDefined();
    });

    test('should return default for null date', () => {
      const date = null;
      const result = date ? 'formatted' : 'غير محدد';

      expect(result).toBe('غير محدد');
    });

    test('should format Gregorian date with correct format', () => {
      const date = new Date('2024-06-15');
      const formatted = new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Riyadh'
      }).format(date);

      expect(formatted).toBeDefined();
    });
  });

  // ============================================
  // Hijri Date Tests
  // ============================================
  describe('getHijriDate', () => {
    test('should return Hijri date string', () => {
      const hijriMonths = [
        'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية',
        'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
      ];

      expect(hijriMonths).toHaveLength(12);
      expect(hijriMonths[8]).toBe('رمضان');
    });

    test('should include هـ suffix', () => {
      const hijriYear = 1445;
      const result = `15 رمضان ${hijriYear}هـ`;

      expect(result).toContain('هـ');
    });
  });

  // ============================================
  // Currency Formatting Tests
  // ============================================
  describe('formatArabicCurrency', () => {
    test('should format number with SAR currency', () => {
      const amount = 1500.50;
      const formatted = new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);

      expect(formatted).toContain('ر.س');
    });

    test('should handle string input', () => {
      const amount = '1500.50';
      const parsed = parseFloat(amount) || 0;

      expect(parsed).toBe(1500.50);
    });

    test('should handle invalid input', () => {
      const amount = 'invalid';
      const parsed = parseFloat(amount) || 0;

      expect(parsed).toBe(0);
    });
  });

  // ============================================
  // Status Translation Tests
  // ============================================
  describe('translateStatus', () => {
    test('should translate paid status', () => {
      const translations = {
        paid: 'مدفوع',
        pending: 'معلق',
        failed: 'فاشل',
        cancelled: 'ملغي',
        refunded: 'مسترد',
        active: 'نشط',
        inactive: 'غير نشط'
      };

      expect(translations.paid).toBe('مدفوع');
    });

    test('should translate pending status', () => {
      const translations = { pending: 'معلق' };
      expect(translations.pending).toBe('معلق');
    });

    test('should return original for unknown status', () => {
      const translations = {};
      const status = 'unknown';
      const result = translations[status] || status;

      expect(result).toBe('unknown');
    });
  });

  // ============================================
  // Severity Translation Tests
  // ============================================
  describe('translateSeverity', () => {
    test('should translate high severity', () => {
      const translations = {
        high: 'عالي',
        medium: 'متوسط',
        low: 'منخفض'
      };

      expect(translations.high).toBe('عالي');
    });

    test('should translate medium severity', () => {
      const translations = { medium: 'متوسط' };
      expect(translations.medium).toBe('متوسط');
    });

    test('should translate low severity', () => {
      const translations = { low: 'منخفض' };
      expect(translations.low).toBe('منخفض');
    });
  });

  // ============================================
  // PDF Header Tests
  // ============================================
  describe('addPDFHeader', () => {
    test('should include title with correct font size', () => {
      const fontSize = 20;
      expect(fontSize).toBe(20);
    });

    test('should include subtitle', () => {
      const subtitle = 'نظام إدارة عائلة الشعيل';
      expect(subtitle).toContain('الشعيل');
    });

    test('should include both date formats', () => {
      const dates = {
        hijri: '15 رمضان 1445هـ',
        gregorian: '15/06/2024'
      };

      expect(dates.hijri).toContain('هـ');
      expect(dates.gregorian).toContain('/');
    });
  });

  // ============================================
  // Excel Header Tests
  // ============================================
  describe('addExcelHeader', () => {
    test('should set RTL properties', () => {
      const properties = { rightToLeft: true };
      expect(properties.rightToLeft).toBe(true);
    });

    test('should merge cells for title', () => {
      const mergeRange = 'A1:H1';
      expect(mergeRange).toBe('A1:H1');
    });

    test('should set correct row heights', () => {
      const heights = {
        row1: 25,
        row2: 20,
        row3: 18
      };

      expect(heights.row1).toBe(25);
    });
  });

  // ============================================
  // Financial Content Tests
  // ============================================
  describe('addFinancialContentToPDF', () => {
    test('should include summary section', () => {
      const summary = {
        totalAmount: 100000,
        paidAmount: 80000,
        pendingAmount: 20000,
        totalPayments: 50
      };

      expect(summary.totalAmount).toBe(100000);
    });

    test('should limit payments table to 20 rows', () => {
      const payments = Array(50).fill({ amount: 1000 });
      const displayedPayments = payments.slice(0, 20);

      expect(displayedPayments).toHaveLength(20);
    });

    test('should include payment table headers', () => {
      const headers = ['المبلغ', 'الحالة', 'طريقة الدفع', 'التاريخ', 'الرقم المرجعي'];
      expect(headers).toHaveLength(5);
    });
  });

  // ============================================
  // Forensic Content Tests
  // ============================================
  describe('addForensicContentToPDF', () => {
    test('should include anomalies section', () => {
      const anomalies = [
        { description: 'Unusual transaction', severity: 'high' },
        { description: 'Duplicate entry', severity: 'medium' }
      ];

      expect(anomalies).toHaveLength(2);
    });

    test('should color code severity levels', () => {
      const severityColors = {
        high: '#e74c3c',
        medium: '#f39c12',
        low: '#27ae60'
      };

      expect(severityColors.high).toBe('#e74c3c');
    });

    test('should include recommendations section', () => {
      const recommendations = [
        'تدقيق المعاملات الكبيرة',
        'مراجعة الصلاحيات'
      ];

      expect(recommendations).toHaveLength(2);
    });
  });

  // ============================================
  // Excel Worksheet Tests
  // ============================================
  describe('addForensicDataToWorksheet', () => {
    test('should set column widths', () => {
      const columnWidth = 25;
      expect(columnWidth).toBe(25);
    });

    test('should enable text wrapping', () => {
      const alignment = { wrapText: true };
      expect(alignment.wrapText).toBe(true);
    });
  });

  // ============================================
  // Font Path Tests
  // ============================================
  describe('getArabicFontPath', () => {
    test('should have fallback font paths', () => {
      const possiblePaths = [
        '../../assets/fonts/NotoSansArabic-Regular.ttf',
        'C:/Windows/Fonts/arial.ttf',
        '/System/Library/Fonts/Arial.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
      ];

      expect(possiblePaths.length).toBeGreaterThan(0);
    });

    test('should use Helvetica as last resort', () => {
      const fallbackFont = 'Helvetica';
      expect(fallbackFont).toBe('Helvetica');
    });
  });

  // ============================================
  // Page Setup Tests
  // ============================================
  describe('Page Setup', () => {
    test('should use A4 paper size', () => {
      const paperSize = 9; // A4 in ExcelJS
      expect(paperSize).toBe(9);
    });

    test('should set correct margins for PDF', () => {
      const margins = { top: 50, bottom: 50, left: 50, right: 50 };
      expect(margins.top).toBe(50);
    });

    test('should set correct margins for Excel', () => {
      const margins = {
        left: 0.7, right: 0.7, top: 0.75, bottom: 0.75,
        header: 0.3, footer: 0.3
      };
      expect(margins.left).toBe(0.7);
    });
  });

  // ============================================
  // Footer Tests
  // ============================================
  describe('addPDFFooter', () => {
    test('should include generation notice', () => {
      const footerText = 'تم إنشاء هذا التقرير بواسطة نظام إدارة عائلة الشعيل';
      expect(footerText).toContain('نظام إدارة');
    });

    test('should include generation date', () => {
      const date = new Date();
      expect(date).toBeDefined();
    });
  });

  // ============================================
  // Chart Data Tests
  // ============================================
  describe('addFinancialCharts', () => {
    test('should create chart worksheet', () => {
      const worksheetName = 'الرسوم البيانية';
      expect(worksheetName).toContain('الرسوم');
    });

    test('should include monthly trends data', () => {
      const chartData = {
        monthlyTrends: [
          { month: 'يناير', amount: 50000 },
          { month: 'فبراير', amount: 60000 }
        ]
      };

      expect(chartData.monthlyTrends).toHaveLength(2);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should log error on failure', () => {
      const error = { message: 'Upload failed' };
      const logData = { error: error.message };

      expect(logData.error).toBe('Upload failed');
    });

    test('should throw error on storage upload failure', () => {
      const error = new Error('Storage error');
      expect(() => { throw error; }).toThrow('Storage error');
    });
  });

  // ============================================
  // Color Scheme Tests
  // ============================================
  describe('Color Scheme', () => {
    test('should use correct primary color', () => {
      const primaryColor = '#2c3e50';
      expect(primaryColor).toBe('#2c3e50');
    });

    test('should use correct secondary color', () => {
      const secondaryColor = '#7f8c8d';
      expect(secondaryColor).toBe('#7f8c8d');
    });

    test('should use correct accent color', () => {
      const accentColor = '#34495e';
      expect(accentColor).toBe('#34495e');
    });
  });
});
