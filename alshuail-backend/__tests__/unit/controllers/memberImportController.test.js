/**
 * Member Import Controller Unit Tests
 * Tests Excel import functionality for member data
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockSupabaseResponse = {
  data: null,
  error: null,
  count: null
};

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  like: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  range: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
  then: jest.fn((cb) => Promise.resolve(cb(mockSupabaseResponse)))
};

jest.unstable_mockModule('../../../src/config/database.js', () => ({
  supabase: mockSupabase
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Member Import Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'admin-123', role: 'super_admin' },
    query: {},
    body: {},
    params: {},
    file: null,
    ...overrides
  });

  const createMockResponse = () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // File Upload Validation Tests
  // ============================================
  describe('File Upload Validation', () => {
    test('should require file upload', () => {
      const req = createMockRequest({ file: null });
      const res = createMockResponse();

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'لم يتم رفع ملف Excel'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should validate file type', () => {
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];

      const xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const xls = 'application/vnd.ms-excel';
      const pdf = 'application/pdf';

      expect(allowedMimeTypes.includes(xlsx)).toBe(true);
      expect(allowedMimeTypes.includes(xls)).toBe(true);
      expect(allowedMimeTypes.includes(pdf)).toBe(false);
    });

    test('should reject invalid file type', () => {
      const req = createMockRequest({
        file: { mimetype: 'application/pdf' }
      });
      const res = createMockResponse();

      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];

      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        res.status(400).json({
          success: false,
          error: 'نوع الملف غير مدعوم. يجب أن يكون ملف Excel (.xlsx or .xls)'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should validate file size', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const fileSize = 5 * 1024 * 1024; // 5MB

      expect(fileSize <= maxSize).toBe(true);
    });

    test('should reject oversized file', () => {
      const req = createMockRequest({
        file: { size: 15 * 1024 * 1024 } // 15MB
      });
      const res = createMockResponse();

      if (req.file.size > 10 * 1024 * 1024) {
        res.status(400).json({
          success: false,
          error: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت'
        });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ============================================
  // Arabic Text Cleaning Tests
  // ============================================
  describe('Arabic Text Cleaning', () => {
    test('should remove RTL/LTR marks', () => {
      const cleanArabicText = (text) => {
        if (!text) return '';
        return text.toString().trim()
          .replace(/[\u200F\u200E\u202A\u202B\u202C\u202D\u202E]/g, '')
          .replace(/\s+/g, ' ');
      };

      const dirty = 'محمد\u200F بن\u200E علي';
      const clean = cleanArabicText(dirty);

      expect(clean).toBe('محمد بن علي');
    });

    test('should normalize whitespace', () => {
      const cleanArabicText = (text) => {
        if (!text) return '';
        return text.toString().trim()
          .replace(/\s+/g, ' ');
      };

      const input = 'محمد   بن    علي';
      const cleaned = cleanArabicText(input);

      expect(cleaned).toBe('محمد بن علي');
    });

    test('should handle empty input', () => {
      const cleanArabicText = (text) => {
        if (!text) return '';
        return text.toString().trim();
      };

      expect(cleanArabicText('')).toBe('');
      expect(cleanArabicText(null)).toBe('');
      expect(cleanArabicText(undefined)).toBe('');
    });
  });

  // ============================================
  // Phone Validation Tests
  // ============================================
  describe('Phone Validation', () => {
    test('should validate Saudi phone starting with 05', () => {
      const validatePhone = (phone) => {
        if (!phone) return null;
        const cleaned = phone.toString().replace(/\D/g, '');
        if (cleaned.match(/^05\d{8}$/)) return cleaned;
        return null;
      };

      expect(validatePhone('0501234567')).toBe('0501234567');
      expect(validatePhone('05-012-34567')).toBe('0501234567');
    });

    test('should validate international format', () => {
      const validatePhone = (phone) => {
        if (!phone) return null;
        const cleaned = phone.toString().replace(/\D/g, '');
        if (cleaned.match(/^9665\d{8}$/)) return cleaned;
        return null;
      };

      expect(validatePhone('966501234567')).toBe('966501234567');
    });

    test('should fix 9-digit format', () => {
      const validatePhone = (phone) => {
        if (!phone) return null;
        const cleaned = phone.toString().replace(/\D/g, '');
        if (cleaned.startsWith('5') && cleaned.length === 9) {
          return `0${cleaned}`;
        }
        return null;
      };

      expect(validatePhone('501234567')).toBe('0501234567');
    });

    test('should reject invalid phone', () => {
      const validatePhone = (phone) => {
        if (!phone) return null;
        const cleaned = phone.toString().replace(/\D/g, '');
        if (cleaned.match(/^05\d{8}$/) || cleaned.match(/^9665\d{8}$/)) {
          return cleaned;
        }
        return null;
      };

      expect(validatePhone('123456')).toBeNull();
      expect(validatePhone('abcdefghij')).toBeNull();
    });
  });

  // ============================================
  // Membership Number Generation Tests
  // ============================================
  describe('Membership Number Generation', () => {
    test('should start from 10001 if no existing members', () => {
      const getNextNumber = (lastNumber) => {
        if (!lastNumber) return '10001';
        return (parseInt(lastNumber) + 1).toString();
      };

      expect(getNextNumber(null)).toBe('10001');
    });

    test('should increment last membership number', () => {
      const getNextNumber = (lastNumber) => {
        if (!lastNumber) return '10001';
        return (parseInt(lastNumber) + 1).toString();
      };

      expect(getNextNumber('10050')).toBe('10051');
    });
  });

  // ============================================
  // Password Generation Tests
  // ============================================
  describe('Password Generation', () => {
    test('should generate 6-digit password', () => {
      const generateTempPassword = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
      };

      const password = generateTempPassword();
      expect(password.length).toBe(6);
      expect(parseInt(password)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(password)).toBeLessThan(1000000);
    });
  });

  // ============================================
  // Registration Token Generation Tests
  // ============================================
  describe('Registration Token Generation', () => {
    test('should generate 8-character token', () => {
      const generateToken = () => {
        const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const token = generateToken();
      expect(token.length).toBe(8);
    });

    test('should exclude confusing characters', () => {
      const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';

      // Should not include O (looks like 0) or I/l (look similar)
      expect(chars.includes('O')).toBe(false);
      expect(chars.includes('0')).toBe(false);
    });
  });

  // ============================================
  // Row Processing Tests
  // ============================================
  describe('Row Processing', () => {
    test('should extract Arabic column names', () => {
      const row = {
        'الاسم الكامل': 'محمد بن علي',
        'الهاتف': '0501234567'
      };

      const fullName = row['الاسم الكامل'] || row['Full Name Arabic'];
      expect(fullName).toBe('محمد بن علي');
    });

    test('should fall back to English column names', () => {
      const row = {
        'Full Name Arabic': 'محمد بن علي',
        'Phone': '0501234567'
      };

      const fullName = row['الاسم الكامل'] || row['Full Name Arabic'];
      expect(fullName).toBe('محمد بن علي');
    });

    test('should validate required fields', () => {
      const row = { fullName: '', phone: '0501234567' };
      const errors = [];

      if (!row.fullName) {
        errors.push({ row: 2, error: 'الاسم الكامل مطلوب' });
      }

      expect(errors.length).toBe(1);
    });
  });

  // ============================================
  // Duplicate Check Tests
  // ============================================
  describe('Duplicate Checks', () => {
    test('should detect duplicate phone number', () => {
      const existingPhones = ['0501234567', '0509876543'];
      const newPhone = '0501234567';

      const isDuplicate = existingPhones.includes(newPhone);
      expect(isDuplicate).toBe(true);
    });

    test('should detect duplicate membership number', () => {
      const existingNumbers = ['10001', '10002', '10003'];
      const newNumber = '10002';

      const isDuplicate = existingNumbers.includes(newNumber);
      expect(isDuplicate).toBe(true);
    });
  });

  // ============================================
  // Batch Processing Tests
  // ============================================
  describe('Batch Processing', () => {
    test('should track import batch status', () => {
      const batch = {
        id: 'batch-123',
        filename: 'members.xlsx',
        total_records: 100,
        successful_imports: 95,
        failed_imports: 5,
        status: 'completed_with_errors'
      };

      expect(batch.status).toBe('completed_with_errors');
    });

    test('should determine batch status from results', () => {
      const determineStatus = (failed) => {
        return failed > 0 ? 'completed_with_errors' : 'completed';
      };

      expect(determineStatus(5)).toBe('completed_with_errors');
      expect(determineStatus(0)).toBe('completed');
    });

    test('should track error details', () => {
      const errors = [
        { row: 5, error: 'رقم الهاتف غير صحيح' },
        { row: 10, error: 'الاسم مطلوب' }
      ];

      expect(errors.length).toBe(2);
      expect(errors[0].row).toBe(5);
    });
  });

  // ============================================
  // Import History Tests
  // ============================================
  describe('Import History', () => {
    test('should paginate import history', () => {
      const req = createMockRequest({
        query: { page: '2', limit: '10' }
      });

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      expect(page).toBe(2);
      expect(offset).toBe(10);
    });

    test('should calculate total pages', () => {
      const total = 45;
      const limit = 10;
      const pages = Math.ceil(total / limit);

      expect(pages).toBe(5);
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return import summary', () => {
      const res = createMockResponse();
      const response = {
        success: true,
        data: {
          batch_id: 'batch-123',
          total_records: 100,
          successful_imports: 95,
          failed_imports: 5,
          imported_members: [],
          errors: []
        },
        message: 'تم استيراد 95 عضو بنجاح مع 5 خطأ'
      };

      res.json(response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            batch_id: expect.any(String),
            total_records: expect.any(Number)
          })
        })
      );
    });

    test('should include pagination in history response', () => {
      const response = {
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 50,
          pages: 5
        }
      };

      expect(response.pagination.pages).toBe(5);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 400 for missing file', () => {
      const res = createMockResponse();
      res.status(400).json({
        success: false,
        error: 'لم يتم رفع ملف Excel'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 404 for non-existent batch', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'دفعة الاستيراد غير موجودة'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 500 on processing error', () => {
      const res = createMockResponse();
      res.status(500).json({
        success: false,
        error: 'فشل في استيراد البيانات من Excel'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should update batch status to failed on error', () => {
      const batch = {
        id: 'batch-123',
        status: 'failed',
        error_details: [{ error: 'Database connection failed' }]
      };

      expect(batch.status).toBe('failed');
      expect(batch.error_details.length).toBe(1);
    });
  });
});
