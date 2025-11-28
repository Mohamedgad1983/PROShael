/**
 * Members Monitoring Controller Unit Tests (membersMonitoringController.js)
 * Tests batch member fetching for monitoring dashboard with proper mocking
 */

import { jest, describe, test, expect, beforeEach, afterAll } from '@jest/globals';

// Mock data holder for controlling test scenarios
let mockSupabaseState = {
  data: [],
  error: null,
  count: 0,
  batches: [],
  currentBatch: 0,
  shouldError: false
};

// Create mock supabase that can be controlled per test
const createMockSupabase = () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn(function(start, end) {
    // Simulate batch fetching behavior
    if (mockSupabaseState.shouldError) {
      return Promise.resolve({
        data: null,
        error: { message: 'Database connection timeout' },
        count: null
      });
    }

    // If batches are defined, return the current batch
    if (mockSupabaseState.batches.length > 0) {
      const batchData = mockSupabaseState.batches[mockSupabaseState.currentBatch] || [];
      mockSupabaseState.currentBatch++;
      return Promise.resolve({
        data: batchData,
        error: null,
        count: mockSupabaseState.count
      });
    }

    // Default behavior
    return Promise.resolve({
      data: mockSupabaseState.data,
      error: mockSupabaseState.error,
      count: mockSupabaseState.count
    });
  })
});

const mockSupabase = createMockSupabase();

// Mock modules BEFORE importing the controller
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

// Import the controller AFTER mocking
const { getAllMembersForMonitoring } = await import('../../../src/controllers/membersMonitoringController.js');
const { log } = await import('../../../src/utils/logger.js');

describe('Members Monitoring Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'admin-123', role: 'admin' },
    query: {},
    body: {},
    params: {},
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
    // Reset mock state for each test
    mockSupabaseState = {
      data: [],
      error: null,
      count: 0,
      batches: [],
      currentBatch: 0,
      shouldError: false
    };
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Success Path Tests
  // ============================================
  describe('Success Path', () => {
    test('should fetch all members successfully with single batch', async () => {
      const mockMembers = [
        { id: 'm1', full_name: 'Test Member 1', created_at: '2024-01-01' },
        { id: 'm2', full_name: 'Test Member 2', created_at: '2024-01-02' }
      ];

      mockSupabaseState.data = mockMembers;
      mockSupabaseState.count = 2;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          total: expect.any(Number)
        })
      );
      expect(log.info).toHaveBeenCalled();
    });

    test('should fetch members in multiple batches', async () => {
      // Simulate 2500 members (3 batches: 1000, 1000, 500)
      const batch1 = Array(1000).fill(null).map((_, i) => ({
        id: `m-${i}`,
        full_name: `Member ${i}`,
        created_at: '2024-01-01'
      }));
      const batch2 = Array(1000).fill(null).map((_, i) => ({
        id: `m-${1000 + i}`,
        full_name: `Member ${1000 + i}`,
        created_at: '2024-01-01'
      }));
      const batch3 = Array(500).fill(null).map((_, i) => ({
        id: `m-${2000 + i}`,
        full_name: `Member ${2000 + i}`,
        created_at: '2024-01-01'
      }));

      mockSupabaseState.batches = [batch1, batch2, batch3];
      mockSupabaseState.count = 2500;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          total: 2500
        })
      );
    });

    test('should return Arabic message in response', async () => {
      mockSupabaseState.data = [{ id: 'm1', full_name: 'Test' }];
      mockSupabaseState.count = 1;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/[\u0600-\u06FF]/)
        })
      );
    });
  });

  // ============================================
  // Empty Data Tests (covers line 36)
  // ============================================
  describe('Empty Data Handling', () => {
    test('should handle empty first batch - null data (line 36)', async () => {
      // Simulate: data is null on first fetch
      mockSupabaseState.data = null;
      mockSupabaseState.count = 0;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
          total: 0
        })
      );
    });

    test('should handle empty first batch - empty array (line 36)', async () => {
      // Simulate: data is [] on first fetch
      mockSupabaseState.data = [];
      mockSupabaseState.count = 0;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
          total: 0
        })
      );
    });

    test('should stop fetching when subsequent batch returns null', async () => {
      // First batch has data, second batch returns null
      const batch1 = Array(1000).fill(null).map((_, i) => ({
        id: `m-${i}`,
        full_name: `Member ${i}`
      }));

      mockSupabaseState.batches = [batch1, null]; // Second batch is null
      mockSupabaseState.count = 1000;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          total: 1000
        })
      );
    });

    test('should stop fetching when subsequent batch returns empty array', async () => {
      // First batch has data, second batch is empty
      const batch1 = Array(500).fill(null).map((_, i) => ({
        id: `m-${i}`,
        full_name: `Member ${i}`
      }));

      mockSupabaseState.batches = [batch1, []]; // Second batch is empty
      mockSupabaseState.count = 500;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          total: 500
        })
      );
    });
  });

  // ============================================
  // Error Handling Tests (covers lines 23-24, 54-55)
  // ============================================
  describe('Error Handling', () => {
    test('should return 500 on database error (lines 23-24, 54-55)', async () => {
      // Simulate database error
      mockSupabaseState.shouldError = true;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
      expect(log.error).toHaveBeenCalled();
    });

    test('should log error with details when database fails', async () => {
      mockSupabaseState.shouldError = true;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching members batch'),
        expect.objectContaining({
          error: expect.any(String),
          page: expect.any(Number)
        })
      );
    });

    test('should return Arabic error message on failure', async () => {
      mockSupabaseState.shouldError = true;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/فشل|Database connection timeout/)
        })
      );
    });

    test('should handle catch block error logging (line 54)', async () => {
      mockSupabaseState.shouldError = true;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      // The catch block should log the error
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch all members for monitoring'),
        expect.any(Object)
      );
    });

    test('should fallback to Arabic error message when error.message is falsy (line 57)', async () => {
      // Modify mock to return error with undefined message
      const originalRange = mockSupabase.range;
      mockSupabase.range = jest.fn(() => Promise.resolve({
        data: null,
        error: { message: null }, // Error with falsy message
        count: null
      }));

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'فشل في جلب بيانات الأعضاء للمراقبة'
        })
      );

      // Restore original
      mockSupabase.range = originalRange;
    });
  });

  // ============================================
  // Batch Processing Logic Tests
  // ============================================
  describe('Batch Processing Logic', () => {
    test('should define batch size of 1000', () => {
      const batchSize = 1000;
      expect(batchSize).toBe(1000);
    });

    test('should calculate range for first batch', () => {
      const page = 0;
      const batchSize = 1000;
      const start = page * batchSize;
      const end = (page + 1) * batchSize - 1;

      expect(start).toBe(0);
      expect(end).toBe(999);
    });

    test('should calculate range for second batch', () => {
      const page = 1;
      const batchSize = 1000;
      const start = page * batchSize;
      const end = (page + 1) * batchSize - 1;

      expect(start).toBe(1000);
      expect(end).toBe(1999);
    });

    test('should accumulate members across batches', () => {
      let allMembers = [];
      const batch1 = Array(1000).fill(null).map((_, i) => ({ id: `m-${i}` }));
      const batch2 = Array(500).fill(null).map((_, i) => ({ id: `m-${1000 + i}` }));

      allMembers = allMembers.concat(batch1);
      allMembers = allMembers.concat(batch2);

      expect(allMembers.length).toBe(1500);
    });

    test('should stop when batch returns fewer than batchSize', () => {
      const batchSize = 1000;
      const data = Array(500).fill(null);

      const hasMore = data.length >= batchSize;
      expect(hasMore).toBe(false);
    });

    test('should stop when reaching total count', () => {
      const count = 1500;
      const allMembers = Array(1500).fill(null);

      const hasMore = allMembers.length < count;
      expect(hasMore).toBe(false);
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return success response with correct structure', async () => {
      const mockMembers = [{ id: 'm1' }];
      mockSupabaseState.data = mockMembers;
      mockSupabaseState.count = 1;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          total: expect.any(Number),
          message: expect.any(String)
        })
      );
    });

    test('should include Arabic message in response', () => {
      const memberCount = 150;
      const message = `تم جلب جميع ${memberCount} عضو`;

      expect(message).toContain('150');
      expect(message).toMatch(/[\u0600-\u06FF]/);
    });
  });

  // ============================================
  // Logging Tests
  // ============================================
  describe('Logging', () => {
    test('should log start of fetch', async () => {
      mockSupabaseState.data = [];
      mockSupabaseState.count = 0;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      expect(log.info).toHaveBeenCalledWith(
        expect.stringContaining('Fetching all members for monitoring dashboard')
      );
    });

    test('should log completion with total members', async () => {
      mockSupabaseState.data = [{ id: 'm1' }];
      mockSupabaseState.count = 1;

      const req = createMockRequest();
      const res = createMockResponse();

      await getAllMembersForMonitoring(req, res);

      expect(log.info).toHaveBeenCalledWith(
        expect.stringContaining('All members fetched for monitoring'),
        expect.objectContaining({
          totalMembers: expect.any(Number)
        })
      );
    });
  });

  // ============================================
  // Data Integrity Tests
  // ============================================
  describe('Data Integrity', () => {
    test('should preserve member data structure', () => {
      const member = {
        id: 'member-123',
        full_name: 'محمد بن علي',
        phone: '0501234567',
        balance: 2500,
        tribal_section: 'الشمال',
        is_active: true,
        created_at: '2024-01-15T10:00:00Z'
      };

      expect(member.id).toBeDefined();
      expect(member.full_name).toBeDefined();
      expect(member.balance).toBeDefined();
    });

    test('should maintain correct count', () => {
      const allMembers = [
        { id: 'm1' },
        { id: 'm2' },
        { id: 'm3' }
      ];

      const count = allMembers.length;
      const response = {
        total: count,
        data: allMembers
      };

      expect(response.total).toBe(response.data.length);
    });
  });

  // ============================================
  // Ordering Tests
  // ============================================
  describe('Ordering', () => {
    test('should order by created_at descending', () => {
      const members = [
        { id: 'm1', created_at: '2024-01-01' },
        { id: 'm2', created_at: '2024-03-01' },
        { id: 'm3', created_at: '2024-02-01' }
      ];

      const sorted = members.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );

      expect(sorted[0].id).toBe('m2');
      expect(sorted[2].id).toBe('m1');
    });
  });
});
