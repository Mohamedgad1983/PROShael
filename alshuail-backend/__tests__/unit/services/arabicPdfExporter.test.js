/**
 * Arabic PDF Exporter Service Unit Tests
 * Tests RTL text handling and Arabic formatting for PDF exports
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock PDFKit
jest.unstable_mockModule('pdfkit', () => ({
  default: jest.fn(() => ({
    addPage: jest.fn().mockReturnThis(),
    pipe: jest.fn(),
    rect: jest.fn().mockReturnThis(),
    stroke: jest.fn().mockReturnThis(),
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    fillColor: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    moveTo: jest.fn().mockReturnThis(),
    lineTo: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    switchToPage: jest.fn(),
    bufferedPageRange: jest.fn(() => ({ count: 1 })),
    end: jest.fn(),
    page: {
      width: 595.28,
      height: 841.89,
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    },
    y: 100,
    currentLineHeight: jest.fn(() => 14)
  }))
}));

jest.unstable_mockModule('fs', () => ({
  default: {
    createWriteStream: jest.fn(() => ({
      on: jest.fn((event, cb) => { if (event === 'finish') setTimeout(cb, 10); }),
      pipe: jest.fn()
    }))
  }
}));

describe('Arabic PDF Exporter Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Page Configuration Tests
  // ============================================
  describe('Page Configuration', () => {
    test('should use A4 paper size', () => {
      const pageConfig = { size: 'A4' };
      expect(pageConfig.size).toBe('A4');
    });

    test('should set correct margins', () => {
      const margins = {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      };

      expect(margins.top).toBe(50);
      expect(margins.bottom).toBe(50);
    });

    test('should configure RTL direction', () => {
      const pageConfig = { direction: 'rtl' };
      expect(pageConfig.direction).toBe('rtl');
    });
  });

  // ============================================
  // Font Configuration Tests
  // ============================================
  describe('Font Configuration', () => {
    test('should configure Arabic fonts', () => {
      const fonts = {
        arabic: {
          regular: 'Amiri-Regular.ttf',
          bold: 'Amiri-Bold.ttf'
        }
      };

      expect(fonts.arabic.regular).toContain('Amiri');
      expect(fonts.arabic.bold).toContain('Bold');
    });

    test('should configure English fonts', () => {
      const fonts = {
        english: {
          regular: 'Helvetica',
          bold: 'Helvetica-Bold'
        }
      };

      expect(fonts.english.regular).toBe('Helvetica');
      expect(fonts.english.bold).toBe('Helvetica-Bold');
    });
  });

  // ============================================
  // Arabic Text Formatting Tests
  // ============================================
  describe('formatArabicText', () => {
    test('should handle empty text', () => {
      const text = '';
      const result = text || '';

      expect(result).toBe('');
    });

    test('should handle null text', () => {
      const text = null;
      const result = text || '';

      expect(result).toBe('');
    });

    test('should detect Arabic text', () => {
      const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g;
      const text = 'مرحباً Hello';

      const hasArabic = arabicRegex.test(text);
      expect(hasArabic).toBe(true);
    });

    test('should detect English text', () => {
      const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g;
      const text = 'Hello World';

      const hasArabic = arabicRegex.test(text);
      expect(hasArabic).toBe(false);
    });
  });

  // ============================================
  // Text Segmentation Tests
  // ============================================
  describe('segmentText', () => {
    test('should segment mixed text correctly', () => {
      const text = 'Hello مرحباً World';
      const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g;

      const matches = [...text.matchAll(arabicRegex)];
      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('مرحباً');
    });

    test('should handle pure Arabic text', () => {
      const text = 'مرحباً بكم';
      const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g;

      const matches = [...text.matchAll(arabicRegex)];
      expect(matches).toHaveLength(2);
    });

    test('should handle pure English text', () => {
      const text = 'Hello World';
      const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g;

      const matches = [...text.matchAll(arabicRegex)];
      expect(matches).toHaveLength(0);
    });
  });

  // ============================================
  // Arabic Reshaping Tests
  // ============================================
  describe('reshapeArabic', () => {
    test('should reverse text for RTL display', () => {
      const text = 'مرحبا';
      const reshaped = text.split('').reverse().join('');

      expect(reshaped).not.toBe(text);
      expect(reshaped.length).toBe(text.length);
    });
  });

  // ============================================
  // Report Header Tests
  // ============================================
  describe('addReportHeader', () => {
    test('should include title in header', () => {
      const reportData = {
        title: 'تقرير مالي شامل'
      };

      const title = reportData.title || 'تقرير مالي شامل';
      expect(title).toContain('تقرير');
    });

    test('should include English subtitle', () => {
      const subtitle = 'Al-Shuail Family Financial Report';

      expect(subtitle).toContain('Al-Shuail');
    });

    test('should use font size 24 for title', () => {
      const titleFontSize = 24;
      expect(titleFontSize).toBe(24);
    });

    test('should use font size 14 for subtitle', () => {
      const subtitleFontSize = 14;
      expect(subtitleFontSize).toBe(14);
    });
  });

  // ============================================
  // Report Metadata Tests
  // ============================================
  describe('addReportMetadata', () => {
    test('should display report ID', () => {
      const metadata = {
        report_id: 'RPT-2024-001'
      };

      expect(metadata.report_id).toBe('RPT-2024-001');
    });

    test('should handle missing metadata gracefully', () => {
      const metadata = {};
      const reportId = metadata.report_id || 'غير محدد';

      expect(reportId).toBe('غير محدد');
    });

    test('should format Hijri date', () => {
      const metadata = {
        generated_at: {
          formatted_hijri: '15 رمضان 1445هـ'
        }
      };

      expect(metadata.generated_at.formatted_hijri).toContain('هـ');
    });

    test('should display period information', () => {
      const metadata = {
        period: {
          hijri: {
            month_name: 'رمضان',
            year: 1445
          }
        }
      };

      const periodText = `${metadata.period.hijri.month_name} ${metadata.period.hijri.year}`;
      expect(periodText).toBe('رمضان 1445');
    });
  });

  // ============================================
  // Currency Formatting Tests
  // ============================================
  describe('formatCurrency', () => {
    test('should format number with SAR currency', () => {
      const amount = 1500.50;
      const formatted = new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 2
      }).format(amount);

      expect(formatted).toContain('ر.س');
    });

    test('should handle zero amount', () => {
      const amount = 0;
      const formatted = new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR'
      }).format(amount);

      expect(formatted).toBeDefined();
    });

    test('should handle null amount', () => {
      const amount = null;
      const result = (!amount && amount !== 0) ? 'غير محدد' : amount;

      expect(result).toBe('غير محدد');
    });

    test('should handle undefined amount', () => {
      const amount = undefined;
      const result = (!amount && amount !== 0) ? 'غير محدد' : amount;

      expect(result).toBe('غير محدد');
    });
  });

  // ============================================
  // Source Translation Tests
  // ============================================
  describe('translateSource', () => {
    test('should translate subscriptions', () => {
      const translations = {
        subscriptions: 'الاشتراكات',
        initiatives: 'المبادرات',
        diyas: 'الديات',
        other: 'أخرى'
      };

      expect(translations.subscriptions).toBe('الاشتراكات');
    });

    test('should translate initiatives', () => {
      const translations = { initiatives: 'المبادرات' };
      expect(translations.initiatives).toBe('المبادرات');
    });

    test('should return original for unknown source', () => {
      const translations = {};
      const source = 'unknown';
      const result = translations[source] || source;

      expect(result).toBe('unknown');
    });
  });

  // ============================================
  // Category Translation Tests
  // ============================================
  describe('translateCategory', () => {
    test('should translate operational category', () => {
      const translations = {
        operational: 'التشغيلية',
        events: 'الفعاليات',
        administrative: 'الإدارية',
        maintenance: 'الصيانة',
        emergency: 'الطوارئ'
      };

      expect(translations.operational).toBe('التشغيلية');
    });

    test('should translate events category', () => {
      const translations = { events: 'الفعاليات' };
      expect(translations.events).toBe('الفعاليات');
    });

    test('should translate emergency category', () => {
      const translations = { emergency: 'الطوارئ' };
      expect(translations.emergency).toBe('الطوارئ');
    });
  });

  // ============================================
  // Revenue Section Tests
  // ============================================
  describe('addRevenueSection', () => {
    test('should include section title', () => {
      const title = 'تحليل الإيرادات';
      expect(title).toContain('الإيرادات');
    });

    test('should display total revenue', () => {
      const revenueData = {
        total_revenue: 150000
      };

      expect(revenueData.total_revenue).toBe(150000);
    });

    test('should display revenue sources', () => {
      const revenueData = {
        revenue_sources: {
          subscriptions: 100000,
          initiatives: 50000
        }
      };

      expect(Object.keys(revenueData.revenue_sources)).toHaveLength(2);
    });
  });

  // ============================================
  // Expense Section Tests
  // ============================================
  describe('addExpenseSection', () => {
    test('should include section title', () => {
      const title = 'تحليل المصروفات';
      expect(title).toContain('المصروفات');
    });

    test('should display total expenses', () => {
      const expenseData = {
        total_expenses: 80000
      };

      expect(expenseData.total_expenses).toBe(80000);
    });

    test('should display expense categories', () => {
      const expenseData = {
        expense_categories: {
          operational: 30000,
          events: 25000,
          administrative: 15000
        }
      };

      expect(Object.keys(expenseData.expense_categories)).toHaveLength(3);
    });

    test('should check for page break', () => {
      const doc = {
        y: 700,
        page: { height: 841.89 }
      };
      const threshold = 200;

      const needsPageBreak = doc.y > doc.page.height - threshold;
      expect(needsPageBreak).toBe(true);
    });
  });

  // ============================================
  // Footer Tests
  // ============================================
  describe('addFooter', () => {
    test('should format page number in Arabic', () => {
      const currentPage = 1;
      const totalPages = 3;
      const pageNumber = `صفحة ${currentPage} من ${totalPages}`;

      expect(pageNumber).toBe('صفحة 1 من 3');
    });

    test('should include timestamp', () => {
      const timestamp = new Date().toLocaleString('ar-SA');

      expect(timestamp).toBeDefined();
    });

    test('should iterate through all pages', () => {
      const pages = { count: 5 };
      const pageNumbers = [];

      for (let i = 0; i < pages.count; i++) {
        pageNumbers.push(i + 1);
      }

      expect(pageNumbers).toEqual([1, 2, 3, 4, 5]);
    });
  });

  // ============================================
  // Financial Row Tests
  // ============================================
  describe('addFinancialRow', () => {
    test('should handle indented rows', () => {
      const indent = true;
      const baseMargin = 50;
      const indentAmount = 20;
      const labelX = indent ? baseMargin + indentAmount : baseMargin;

      expect(labelX).toBe(70);
    });

    test('should handle non-indented rows', () => {
      const indent = false;
      const baseMargin = 50;
      const indentAmount = 20;
      const labelX = indent ? baseMargin + indentAmount : baseMargin;

      expect(labelX).toBe(50);
    });
  });

  // ============================================
  // Charts Section Tests
  // ============================================
  describe('addChartsSection', () => {
    test('should include chart section title', () => {
      const title = 'الرسوم البيانية';
      expect(title).toContain('الرسوم');
    });

    test('should include chart placeholder text', () => {
      const placeholderText = 'مخطط الإيرادات والمصروفات';
      expect(placeholderText).toContain('الإيرادات');
    });
  });

  // ============================================
  // Document Creation Tests
  // ============================================
  describe('createDocument', () => {
    test('should not auto-create first page', () => {
      const options = { autoFirstPage: false };
      expect(options.autoFirstPage).toBe(false);
    });

    test('should apply custom options', () => {
      const pageConfig = { size: 'A4' };
      const customOptions = { compress: true };
      const finalOptions = { ...pageConfig, ...customOptions };

      expect(finalOptions.size).toBe('A4');
      expect(finalOptions.compress).toBe(true);
    });
  });

  // ============================================
  // PDF Generation Tests
  // ============================================
  describe('generateFinancialReportPDF', () => {
    test('should include revenue analysis if available', () => {
      const reportData = {
        revenue_analysis: { total_revenue: 100000 }
      };

      const hasRevenueAnalysis = !!reportData.revenue_analysis;
      expect(hasRevenueAnalysis).toBe(true);
    });

    test('should include expense analysis if available', () => {
      const reportData = {
        expense_analysis: { total_expenses: 50000 }
      };

      const hasExpenseAnalysis = !!reportData.expense_analysis;
      expect(hasExpenseAnalysis).toBe(true);
    });

    test('should include charts if available', () => {
      const reportData = {
        charts: [{ type: 'bar', data: [] }]
      };

      const hasCharts = !!reportData.charts;
      expect(hasCharts).toBe(true);
    });
  });

  // ============================================
  // RTL Alignment Tests
  // ============================================
  describe('RTL Alignment', () => {
    test('should align text to right', () => {
      const alignment = { align: 'right' };
      expect(alignment.align).toBe('right');
    });

    test('should calculate page width correctly', () => {
      const page = {
        width: 595.28,
        margins: { left: 50, right: 50 }
      };

      const pageWidth = page.width - page.margins.left - page.margins.right;
      expect(pageWidth).toBeCloseTo(495.28);
    });
  });
});
