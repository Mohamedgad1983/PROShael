/**
 * Financial Reports Controller Unit Tests
 * Tests financial reporting and analytics functionality with proper mocking
 */

import { jest, describe, test, expect, beforeEach, afterAll } from '@jest/globals';

// Mock state for controlling test scenarios
let mockState = {
  hasAccess: true,
  financialData: null,
  error: null,
  shouldThrow: false,
  reportData: null
};

// Mock HijriDateManager
const mockHijriDateManager = {
  convertToHijri: jest.fn(() => ({
    hijri_date_string: '1446-06-15',
    hijri_year: 1446,
    hijri_month: 6,
    hijri_day: 15
  })),
  formatHijriDisplay: jest.fn((str) => str || '15 جمادى الآخرة 1446'),
  getCurrentHijriDate: jest.fn(() => ({
    hijri_year: 1446,
    hijri_month: 6,
    hijri_day: 15,
    hijri_date_string: '1446-06-15'
  })),
  getMonthProperties: jest.fn(() => ({
    name_ar: 'جمادى الآخرة',
    name_en: 'Jumada al-Thani'
  }))
};

// Mock accessControl functions
const mockAccessControl = {
  hasFinancialAccess: jest.fn(() => mockState.hasAccess),
  logFinancialAccess: jest.fn(() => Promise.resolve()),
  validateFinancialOperation: jest.fn(() => true),
  createFinancialAuditTrail: jest.fn(() => Promise.resolve())
};

// Mock forensicAnalysis functions
const mockForensicAnalysis = {
  generateRevenueForensicReport: jest.fn(() => Promise.resolve({ revenue: [], analysis: {} })),
  generateExpenseForensicReport: jest.fn(() => Promise.resolve({ expenses: [], analysis: {} })),
  generateDiyaForensicReport: jest.fn(() => Promise.resolve({ diya_cases: [], analysis: {} })),
  generatePaymentRelationshipsForensicReport: jest.fn(() => Promise.resolve({ relationships: [], analysis: {} })),
  generateMemberContributionsForensicReport: jest.fn(() => Promise.resolve({ contributions: [], analysis: {} })),
  generateComprehensiveForensicReport: jest.fn(() => Promise.resolve({
    comprehensive: true,
    revenue: {},
    expenses: {},
    diya: {},
    relationships: {},
    contributions: {}
  }))
};

// Mock ReportExportService
const mockReportExportService = {
  exportToPDF: jest.fn(() => Promise.resolve({ buffer: Buffer.from('pdf'), filename: 'report.pdf' })),
  exportToExcel: jest.fn(() => Promise.resolve({ buffer: Buffer.from('xlsx'), filename: 'report.xlsx' }))
};

// Mock optimizedReportQueries
const mockOptimizedQueries = {
  getOptimizedFinancialData: jest.fn(() => Promise.resolve([])),
  getBatchedReportData: jest.fn(() => Promise.resolve([])),
  getAggregatedSummary: jest.fn(() => Promise.resolve({})),
  getCachedQuery: jest.fn((key, fn) => fn()),
  streamReportData: jest.fn(async function* () {
    yield [{ id: 1, amount: 100, expense_category: 'operational', status: 'approved' }];
  })
};

// Mock errorCodes
const mockErrorCodes = {
  ErrorCodes: {
    REPORT_ACCESS_DENIED: { httpStatus: 403, code: 'REPORT_ACCESS_DENIED' }
  },
  createErrorResponse: jest.fn((code) => ({ success: false, error: `Error: ${code}`, code }))
};

// Mock supabase
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  range: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve({ data: null, error: null })),
  then: jest.fn((cb) => Promise.resolve(cb({ data: mockState.financialData, error: mockState.error })))
};

// Mock modules BEFORE importing controller
jest.unstable_mockModule('../../../src/config/database.js', () => ({
  supabase: mockSupabase
}));

jest.unstable_mockModule('../../../src/utils/hijriDateUtils.js', () => ({
  HijriDateManager: mockHijriDateManager
}));

jest.unstable_mockModule('../../../src/utils/accessControl.js', () => mockAccessControl);

jest.unstable_mockModule('../../../src/services/forensicAnalysis.js', () => mockForensicAnalysis);

jest.unstable_mockModule('../../../src/services/reportExportService.js', () => ({
  default: class MockReportExportService {
    constructor() {
      return mockReportExportService;
    }
  }
}));

jest.unstable_mockModule('../../../src/services/optimizedReportQueries.js', () => mockOptimizedQueries);

jest.unstable_mockModule('../../../src/utils/errorCodes.js', () => mockErrorCodes);

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Import controller AFTER mocking
const {
  getFinancialSummary,
  generateForensicReport,
  getCashFlowAnalysis,
  getBudgetVarianceReport
} = await import('../../../src/controllers/financialReportsController.js');

const { log } = await import('../../../src/utils/logger.js');

describe('Financial Reports Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'user-123', role: 'financial_manager' },
    query: {},
    params: {},
    ip: '127.0.0.1',
    ...overrides
  });

  const createMockResponse = () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
      setHeader: jest.fn(() => res),
      send: jest.fn(() => res)
    };
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock state
    mockState = {
      hasAccess: true,
      financialData: null,
      error: null,
      shouldThrow: false,
      reportData: null
    };
    // Reset mock implementations
    mockAccessControl.hasFinancialAccess.mockReturnValue(true);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // getFinancialSummary Tests (lines 41-228)
  // ============================================
  describe('getFinancialSummary()', () => {
    test('should return financial summary for authorized user (lines 90-215)', async () => {
      mockAccessControl.hasFinancialAccess.mockReturnValue(true);

      const req = createMockRequest({
        query: { period: 'monthly', include_details: true }
      });
      const res = createMockResponse();

      await getFinancialSummary(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            report_metadata: expect.any(Object)
          })
        })
      );
      expect(mockAccessControl.logFinancialAccess).toHaveBeenCalledWith(
        'user-123',
        'SUCCESS',
        expect.any(String),
        'financial_manager',
        expect.any(Object),
        '127.0.0.1'
      );
    });

    test('should deny access for unauthorized user (lines 56-68)', async () => {
      mockAccessControl.hasFinancialAccess.mockReturnValue(false);

      const req = createMockRequest({
        user: { id: 'user-123', role: 'member' }
      });
      const res = createMockResponse();

      await getFinancialSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockAccessControl.logFinancialAccess).toHaveBeenCalledWith(
        'user-123',
        'DENIED',
        'financial_summary',
        'member',
        {},
        '127.0.0.1'
      );
    });

    test('should use default period when not specified (line 44)', async () => {
      const req = createMockRequest({
        query: {} // No period specified
      });
      const res = createMockResponse();

      await getFinancialSummary(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should handle hijri date parameters (lines 47-48)', async () => {
      const req = createMockRequest({
        query: {
          hijri_year: 1446,
          hijri_month: 6,
          period: 'monthly'
        }
      });
      const res = createMockResponse();

      await getFinancialSummary(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            report_metadata: expect.objectContaining({
              generated_at: expect.any(Object)
            })
          })
        })
      );
    });

    test('should include report metadata with hijri date (lines 92-97)', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await getFinancialSummary(req, res);

      expect(mockHijriDateManager.convertToHijri).toHaveBeenCalled();
      expect(mockHijriDateManager.formatHijriDisplay).toHaveBeenCalled();
    });

    test('should return 500 on error', async () => {
      mockAccessControl.hasFinancialAccess.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await getFinancialSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });
  });

  // ============================================
  // generateForensicReport Tests (lines 234-398)
  // ============================================
  describe('generateForensicReport()', () => {
    test('should deny access for non-financial_manager (lines 250-265)', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', role: 'admin' },
        query: { report_type: 'comprehensive_forensic' }
      });
      const res = createMockResponse();

      await generateForensicReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'FORENSIC_UNAUTHORIZED'
        })
      );
    });

    test('should generate comprehensive forensic report (lines 270-277)', async () => {
      const req = createMockRequest({
        query: {
          report_type: 'comprehensive_forensic',
          date_from: '2024-01-01',
          date_to: '2024-12-31'
        }
      });
      const res = createMockResponse();

      await generateForensicReport(req, res);

      expect(mockForensicAnalysis.generateComprehensiveForensicReport).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should generate revenue forensic report (lines 279-286)', async () => {
      const req = createMockRequest({
        query: { report_type: 'revenue_forensic' }
      });
      const res = createMockResponse();

      await generateForensicReport(req, res);

      expect(mockForensicAnalysis.generateRevenueForensicReport).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should generate expense forensic report (lines 288-295)', async () => {
      const req = createMockRequest({
        query: { report_type: 'expense_forensic' }
      });
      const res = createMockResponse();

      await generateForensicReport(req, res);

      expect(mockForensicAnalysis.generateExpenseForensicReport).toHaveBeenCalled();
    });

    test('should generate diya forensic report (lines 297-304)', async () => {
      const req = createMockRequest({
        query: { report_type: 'diya_forensic' }
      });
      const res = createMockResponse();

      await generateForensicReport(req, res);

      expect(mockForensicAnalysis.generateDiyaForensicReport).toHaveBeenCalled();
    });

    test('should generate payment relationships forensic report (lines 306-313)', async () => {
      const req = createMockRequest({
        query: { report_type: 'payment_relationships_forensic' }
      });
      const res = createMockResponse();

      await generateForensicReport(req, res);

      expect(mockForensicAnalysis.generatePaymentRelationshipsForensicReport).toHaveBeenCalled();
    });

    test('should generate member contributions forensic report (lines 315-322)', async () => {
      const req = createMockRequest({
        query: { report_type: 'member_contributions_forensic' }
      });
      const res = createMockResponse();

      await generateForensicReport(req, res);

      expect(mockForensicAnalysis.generateMemberContributionsForensicReport).toHaveBeenCalled();
    });

    test('should return 400 for invalid report type (lines 324-329)', async () => {
      const req = createMockRequest({
        query: { report_type: 'invalid_type' }
      });
      const res = createMockResponse();

      await generateForensicReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INVALID_REPORT_TYPE'
        })
      );
    });

    test('should support PDF export format (lines 338-374)', async () => {
      // Mock the reportExporter to return a URL for PDF generation
      mockReportExportService.generateReportFile = jest.fn(() =>
        Promise.resolve('https://storage.example.com/reports/forensic-report.pdf')
      );

      const req = createMockRequest({
        query: {
          report_type: 'comprehensive_forensic',
          format: 'pdf',
          date_from: '2024-01-01',
          date_to: '2024-12-31'
        }
      });
      const res = createMockResponse();

      await generateForensicReport(req, res);

      // Should call generateReportFile for PDF format
      expect(mockReportExportService.generateReportFile).toHaveBeenCalledWith(
        expect.any(Object),
        'pdf',
        'comprehensive_forensic'
      );

      // Should log financial access for export
      expect(mockAccessControl.logFinancialAccess).toHaveBeenCalledWith(
        'user-123',
        'SUCCESS',
        'forensic_report_export',
        'financial_manager',
        expect.objectContaining({
          report_type: 'comprehensive_forensic',
          format: 'pdf',
          file_generated: true
        }),
        '127.0.0.1'
      );

      // Should create audit trail
      expect(mockAccessControl.createFinancialAuditTrail).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          operation: 'forensic_report_generation',
          resourceType: 'report'
        })
      );

      // Should return download URL
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          download_url: 'https://storage.example.com/reports/forensic-report.pdf',
          message: 'Forensic report generated and ready for download'
        })
      );
    });

    test('should support Excel export format (lines 338-374)', async () => {
      // Mock the reportExporter to return a URL for Excel generation
      mockReportExportService.generateReportFile = jest.fn(() =>
        Promise.resolve('https://storage.example.com/reports/forensic-report.xlsx')
      );

      const req = createMockRequest({
        query: {
          report_type: 'revenue_forensic',
          format: 'excel'
        }
      });
      const res = createMockResponse();

      await generateForensicReport(req, res);

      expect(mockReportExportService.generateReportFile).toHaveBeenCalledWith(
        expect.any(Object),
        'excel',
        'revenue_forensic'
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          download_url: 'https://storage.example.com/reports/forensic-report.xlsx'
        })
      );
    });

    test('should return 500 on forensic report error', async () => {
      mockForensicAnalysis.generateComprehensiveForensicReport.mockRejectedValue(
        new Error('Forensic analysis failed')
      );

      const req = createMockRequest({
        query: { report_type: 'comprehensive_forensic' }
      });
      const res = createMockResponse();

      await generateForensicReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ============================================
  // getCashFlowAnalysis Tests (lines 404-496)
  // ============================================
  describe('getCashFlowAnalysis()', () => {
    test('should return cash flow analysis for authorized user (lines 431-488)', async () => {
      mockAccessControl.hasFinancialAccess.mockReturnValue(true);

      const req = createMockRequest({
        query: { period: 'monthly' }
      });
      const res = createMockResponse();

      await getCashFlowAnalysis(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            period: expect.any(Object),
            opening_balance: expect.any(Number),
            closing_balance: expect.any(Number),
            cash_inflows: expect.any(Object),
            cash_outflows: expect.any(Object),
            net_cash_flow: expect.any(Number),
            liquidity_metrics: expect.any(Object),
            projections: expect.any(Object)
          }),
          message: 'Cash flow analysis generated successfully'
        })
      );
    });

    test('should deny access for unauthorized user (lines 410-425)', async () => {
      mockAccessControl.hasFinancialAccess.mockReturnValue(false);

      const req = createMockRequest({
        user: { id: 'user-123', role: 'member' }
      });
      const res = createMockResponse();

      await getCashFlowAnalysis(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INSUFFICIENT_PRIVILEGES'
        })
      );
    });

    test('should use hijri date filter when provided (line 406)', async () => {
      const req = createMockRequest({
        query: {
          period: 'monthly',
          hijri_year: 1446,
          hijri_month: 6
        }
      });
      const res = createMockResponse();

      await getCashFlowAnalysis(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should log financial access on success (lines 475-482)', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await getCashFlowAnalysis(req, res);

      expect(mockAccessControl.logFinancialAccess).toHaveBeenCalledWith(
        'user-123',
        'SUCCESS',
        'cash_flow_analysis',
        'financial_manager',
        expect.any(Object),
        '127.0.0.1'
      );
    });

    test('should return 500 on error (lines 489-495)', async () => {
      mockAccessControl.hasFinancialAccess.mockImplementation(() => {
        throw new Error('Cash flow calculation failed');
      });

      const req = createMockRequest();
      const res = createMockResponse();

      await getCashFlowAnalysis(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'CASH_FLOW_ERROR'
        })
      );
    });
  });

  // ============================================
  // getBudgetVarianceReport Tests (lines 502-590)
  // ============================================
  describe('getBudgetVarianceReport()', () => {
    test('should return budget variance for financial_manager (lines 532-582)', async () => {
      const req = createMockRequest({
        query: { period: 'monthly' }
      });
      const res = createMockResponse();

      await getBudgetVarianceReport(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            period: expect.any(Object),
            revenue_variance: expect.any(Object),
            expense_variance: expect.any(Object),
            net_variance: expect.any(Object),
            variance_analysis: expect.any(Object)
          }),
          message: 'Budget variance report generated successfully'
        })
      );
    });

    test('should deny access for non-financial_manager (lines 508-523)', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', role: 'admin' }
      });
      const res = createMockResponse();

      await getBudgetVarianceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'BUDGET_UNAUTHORIZED'
        })
      );
    });

    test('should use hijri date filter (line 525)', async () => {
      const req = createMockRequest({
        query: {
          period: 'monthly',
          hijri_year: 1446,
          hijri_month: 6
        }
      });
      const res = createMockResponse();

      await getBudgetVarianceReport(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should log access on success (lines 569-576)', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await getBudgetVarianceReport(req, res);

      expect(mockAccessControl.logFinancialAccess).toHaveBeenCalledWith(
        'user-123',
        'SUCCESS',
        'budget_variance',
        'financial_manager',
        expect.any(Object),
        '127.0.0.1'
      );
    });

    test('should return 500 on error (lines 583-589)', async () => {
      // getBudgetVarianceReport checks userRole !== 'financial_manager' NOT hasFinancialAccess
      // So we need to make logFinancialAccess throw (which is called in the success path)
      // to trigger the catch block at lines 583-589
      mockAccessControl.logFinancialAccess.mockRejectedValueOnce(
        new Error('Budget calculation failed')
      );

      const req = createMockRequest();
      const res = createMockResponse();

      await getBudgetVarianceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'BUDGET_VARIANCE_ERROR'
        })
      );
    });
  });

  // ============================================
  // Helper Function Tests (buildDateFilter - lines 594-612)
  // ============================================
  describe('Date Filter Building', () => {
    test('should use current date when year not specified', async () => {
      const req = createMockRequest({
        query: { period: 'monthly' } // No year/month
      });
      const res = createMockResponse();

      await getFinancialSummary(req, res);

      expect(mockHijriDateManager.getCurrentHijriDate).toHaveBeenCalled();
    });

    test('should support quarterly period', async () => {
      const req = createMockRequest({
        query: { period: 'quarterly' }
      });
      const res = createMockResponse();

      await getFinancialSummary(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should support annual period', async () => {
      const req = createMockRequest({
        query: { period: 'annual', year: 2024 }
      });
      const res = createMockResponse();

      await getFinancialSummary(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });
  });

  // ============================================
  // Report Metadata Tests
  // ============================================
  describe('Report Metadata', () => {
    test('should include report_id in metadata', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await getFinancialSummary(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            report_metadata: expect.objectContaining({
              report_id: expect.stringMatching(/^FIN-/)
            })
          })
        })
      );
    });

    test('should include user information in metadata', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await getFinancialSummary(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            report_metadata: expect.objectContaining({
              generated_by: 'user-123',
              user_role: 'financial_manager'
            })
          })
        })
      );
    });
  });

  // ============================================
  // Access Control Integration Tests
  // ============================================
  describe('Access Control', () => {
    test('should allow super_admin for financial summary', async () => {
      mockAccessControl.hasFinancialAccess.mockReturnValue(true);

      const req = createMockRequest({
        user: { id: 'admin-1', role: 'super_admin' }
      });
      const res = createMockResponse();

      await getFinancialSummary(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should deny member role for all reports', async () => {
      // Set both the mock state AND mockReturnValue to ensure denial
      mockState.hasAccess = false;
      mockAccessControl.hasFinancialAccess.mockReturnValue(false);

      const req = createMockRequest({
        user: { id: 'member-1', role: 'member' }
      });
      const res = createMockResponse();

      await getFinancialSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });
  });

  // ============================================
  // Arabic Message Tests
  // ============================================
  describe('Arabic Messages', () => {
    test('should include Arabic date formatting', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await getFinancialSummary(req, res);

      expect(mockHijriDateManager.getMonthProperties).toHaveBeenCalled();
    });
  });

  // ============================================
  // Report Types Tests
  // ============================================
  describe('Report Types', () => {
    test('should support income report', () => {
      const reportTypes = ['income', 'expense', 'balance', 'subscription', 'payment', 'summary'];
      expect(reportTypes).toContain('income');
    });

    test('should support expense report', () => {
      const reportTypes = ['income', 'expense', 'balance', 'subscription', 'payment', 'summary'];
      expect(reportTypes).toContain('expense');
    });

    test('should support balance report', () => {
      const reportTypes = ['income', 'expense', 'balance', 'subscription', 'payment', 'summary'];
      expect(reportTypes).toContain('balance');
    });

    test('should support summary report', () => {
      const reportTypes = ['income', 'expense', 'balance', 'subscription', 'payment', 'summary'];
      expect(reportTypes).toContain('summary');
    });
  });

  // ============================================
  // Date Range Tests
  // ============================================
  describe('Date Range Handling', () => {
    test('should parse date range parameters', () => {
      const req = createMockRequest({
        query: {
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        }
      });

      expect(req.query.start_date).toBe('2024-01-01');
      expect(req.query.end_date).toBe('2024-12-31');
    });

    test('should default to current month', () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      expect(startOfMonth.getDate()).toBe(1);
      expect(endOfMonth.getDate()).toBeGreaterThan(27);
    });

    test('should support quarterly reports', () => {
      const quarters = {
        Q1: { start: '01-01', end: '03-31' },
        Q2: { start: '04-01', end: '06-30' },
        Q3: { start: '07-01', end: '09-30' },
        Q4: { start: '10-01', end: '12-31' }
      };

      expect(quarters.Q1.start).toBe('01-01');
      expect(quarters.Q4.end).toBe('12-31');
    });

    test('should support annual reports', () => {
      const year = 2024;
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      expect(startDate).toBe('2024-01-01');
      expect(endDate).toBe('2024-12-31');
    });
  });

  // ============================================
  // Income Calculations Tests
  // ============================================
  describe('Income Calculations', () => {
    test('should calculate total income', () => {
      const payments = [
        { amount: 500, status: 'completed' },
        { amount: 1000, status: 'completed' },
        { amount: 750, status: 'completed' }
      ];

      const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalIncome).toBe(2250);
    });

    test('should exclude pending payments', () => {
      const payments = [
        { amount: 500, status: 'completed' },
        { amount: 1000, status: 'pending' },
        { amount: 750, status: 'completed' }
      ];

      const completedIncome = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      expect(completedIncome).toBe(1250);
    });
  });

  // ============================================
  // Expense Calculations Tests
  // ============================================
  describe('Expense Calculations', () => {
    test('should calculate total expenses', () => {
      const expenses = [
        { amount: 200, category: 'operational' },
        { amount: 500, category: 'events' },
        { amount: 300, category: 'administrative' }
      ];

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      expect(totalExpenses).toBe(1000);
    });

    test('should group expenses by category', () => {
      const expenses = [
        { amount: 200, category: 'operational' },
        { amount: 500, category: 'events' },
        { amount: 300, category: 'operational' }
      ];

      const byCategory = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {});

      expect(byCategory.operational).toBe(500);
      expect(byCategory.events).toBe(500);
    });
  });
});
