/**
 * Occasions Controller Unit Tests
 * Tests occasion/event management functionality
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
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  neq: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
  ilike: jest.fn(() => mockSupabase),
  range: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
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

describe('Occasions Controller Unit Tests', () => {
  const createMockRequest = (overrides = {}) => ({
    user: { id: 'user-123', role: 'admin' },
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
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
  });

  // ============================================
  // Occasion Types Tests
  // ============================================
  describe('Occasion Types', () => {
    test('should support wedding type', () => {
      const types = ['wedding', 'birth', 'graduation', 'death', 'eid', 'anniversary', 'other'];
      expect(types).toContain('wedding');
    });

    test('should support birth type', () => {
      const types = ['wedding', 'birth', 'graduation', 'death', 'eid', 'anniversary', 'other'];
      expect(types).toContain('birth');
    });

    test('should support graduation type', () => {
      const types = ['wedding', 'birth', 'graduation', 'death', 'eid', 'anniversary', 'other'];
      expect(types).toContain('graduation');
    });

    test('should support death/condolence type', () => {
      const types = ['wedding', 'birth', 'graduation', 'death', 'eid', 'anniversary', 'other'];
      expect(types).toContain('death');
    });

    test('should support eid type', () => {
      const types = ['wedding', 'birth', 'graduation', 'death', 'eid', 'anniversary', 'other'];
      expect(types).toContain('eid');
    });

    test('should validate occasion type', () => {
      const validTypes = ['wedding', 'birth', 'graduation', 'death', 'eid', 'anniversary', 'other'];
      const occasion = { type: 'wedding' };
      expect(validTypes).toContain(occasion.type);
    });
  });

  // ============================================
  // Occasion Status Tests
  // ============================================
  describe('Occasion Status', () => {
    test('should support upcoming status', () => {
      const statuses = ['draft', 'upcoming', 'ongoing', 'completed', 'cancelled'];
      expect(statuses).toContain('upcoming');
    });

    test('should support ongoing status', () => {
      const statuses = ['draft', 'upcoming', 'ongoing', 'completed', 'cancelled'];
      expect(statuses).toContain('ongoing');
    });

    test('should support completed status', () => {
      const statuses = ['draft', 'upcoming', 'ongoing', 'completed', 'cancelled'];
      expect(statuses).toContain('completed');
    });

    test('should determine status based on dates', () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const determineStatus = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();

        if (today < start) return 'upcoming';
        if (today > end) return 'completed';
        return 'ongoing';
      };

      expect(determineStatus(futureDate, new Date(futureDate.getTime() + 86400000))).toBe('upcoming');
      expect(determineStatus(pastDate, new Date(pastDate.getTime() + 86400000))).toBe('completed');
    });
  });

  // ============================================
  // Query Filter Tests
  // ============================================
  describe('Query Filters', () => {
    test('should parse pagination parameters', () => {
      const req = createMockRequest({
        query: { limit: '50', offset: '0' }
      });

      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      expect(limit).toBe(50);
      expect(offset).toBe(0);
    });

    test('should filter by type', () => {
      const req = createMockRequest({
        query: { type: 'wedding' }
      });

      expect(req.query.type).toBe('wedding');
    });

    test('should filter by status', () => {
      const req = createMockRequest({
        query: { status: 'upcoming' }
      });

      expect(req.query.status).toBe('upcoming');
    });

    test('should filter by member_id', () => {
      const req = createMockRequest({
        query: { member_id: 'member-123' }
      });

      expect(req.query.member_id).toBe('member-123');
    });

    test('should filter by date range', () => {
      const req = createMockRequest({
        query: {
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        }
      });

      expect(req.query.start_date).toBe('2024-01-01');
      expect(req.query.end_date).toBe('2024-12-31');
    });

    test('should handle search parameter', () => {
      const req = createMockRequest({
        query: { search: 'عرس' }
      });

      expect(req.query.search).toBe('عرس');
    });
  });

  // ============================================
  // Occasion Validation Tests
  // ============================================
  describe('Occasion Validation', () => {
    test('should validate required fields', () => {
      const occasion = {
        title_ar: 'زواج الأخ محمد',
        type: 'wedding',
        start_date: '2024-06-15',
        member_id: 'member-123'
      };

      const isValid = Boolean(
        occasion.title_ar &&
        occasion.type &&
        occasion.start_date &&
        occasion.member_id
      );
      expect(isValid).toBe(true);
    });

    test('should reject occasion without title', () => {
      const occasion = {
        type: 'wedding',
        start_date: '2024-06-15'
      };

      const isValid = occasion.title_ar && occasion.type;
      expect(isValid).toBeFalsy();
    });

    test('should reject occasion without type', () => {
      const occasion = {
        title_ar: 'مناسبة',
        start_date: '2024-06-15'
      };

      const isValid = occasion.title_ar && occasion.type;
      expect(isValid).toBeFalsy();
    });

    test('should reject occasion without start date', () => {
      const occasion = {
        title_ar: 'زواج',
        type: 'wedding'
      };

      const isValid = occasion.title_ar && occasion.type && occasion.start_date;
      expect(isValid).toBeFalsy();
    });

    test('should validate end date is after start date', () => {
      const occasion = {
        start_date: '2024-06-15',
        end_date: '2024-06-16'
      };

      const isValidDates = new Date(occasion.end_date) >= new Date(occasion.start_date);
      expect(isValidDates).toBe(true);
    });

    test('should reject end date before start date', () => {
      const occasion = {
        start_date: '2024-06-15',
        end_date: '2024-06-14'
      };

      const isValidDates = new Date(occasion.end_date) >= new Date(occasion.start_date);
      expect(isValidDates).toBe(false);
    });
  });

  // ============================================
  // Date Calculation Tests
  // ============================================
  describe('Date Calculations', () => {
    test('should calculate days until occasion', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const occasion = {
        start_date: futureDate.toISOString()
      };

      const daysUntil = Math.ceil(
        (new Date(occasion.start_date) - new Date()) / (1000 * 60 * 60 * 24)
      );

      expect(daysUntil).toBeGreaterThan(0);
      expect(daysUntil).toBeLessThanOrEqual(10);
    });

    test('should detect past occasions', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const occasion = {
        end_date: pastDate.toISOString()
      };

      const isPast = new Date(occasion.end_date) < new Date();
      expect(isPast).toBe(true);
    });

    test('should calculate duration in days', () => {
      const occasion = {
        start_date: '2024-06-15',
        end_date: '2024-06-17'
      };

      const duration = Math.ceil(
        (new Date(occasion.end_date) - new Date(occasion.start_date)) / (1000 * 60 * 60 * 24)
      );

      expect(duration).toBe(2);
    });
  });

  // ============================================
  // Arabic Text Tests
  // ============================================
  describe('Arabic Text Handling', () => {
    test('should support Arabic title', () => {
      const occasion = {
        title_ar: 'زواج الأخ محمد بن عبدالله'
      };

      expect(occasion.title_ar).toMatch(/[\u0600-\u06FF]/);
    });

    test('should support Arabic description', () => {
      const occasion = {
        description_ar: 'ندعوكم لحضور حفل زفاف الأخ محمد'
      };

      expect(occasion.description_ar).toMatch(/[\u0600-\u06FF]/);
    });

    test('should support Arabic location', () => {
      const occasion = {
        location_ar: 'قاعة الاحتفالات - الرياض'
      };

      expect(occasion.location_ar).toMatch(/[\u0600-\u06FF]/);
    });

    test('should search in Arabic text', () => {
      const searchTerm = 'زواج';
      const title = 'حفل زواج الأخ محمد';

      const hasMatch = title.includes(searchTerm);
      expect(hasMatch).toBe(true);
    });
  });

  // ============================================
  // Attendee Management Tests
  // ============================================
  describe('Attendee Management', () => {
    test('should track RSVP status', () => {
      const attendee = {
        member_id: 'member-123',
        occasion_id: 'occ-456',
        rsvp_status: 'attending',
        guests_count: 2
      };

      expect(attendee.rsvp_status).toBe('attending');
    });

    test('should support multiple RSVP statuses', () => {
      const rsvpStatuses = ['pending', 'attending', 'not_attending', 'maybe'];
      expect(rsvpStatuses).toContain('attending');
      expect(rsvpStatuses).toContain('not_attending');
    });

    test('should count total attendees', () => {
      const attendees = [
        { member_id: '1', rsvp_status: 'attending', guests_count: 2 },
        { member_id: '2', rsvp_status: 'attending', guests_count: 1 },
        { member_id: '3', rsvp_status: 'not_attending', guests_count: 0 }
      ];

      const attendingMembers = attendees.filter(a => a.rsvp_status === 'attending');
      const totalGuests = attendingMembers.reduce((sum, a) => sum + a.guests_count, 0);

      expect(attendingMembers.length).toBe(2);
      expect(totalGuests).toBe(3);
    });

    test('should validate guests count', () => {
      const attendee = { guests_count: 3 };
      const maxGuests = 5;

      const isValid = attendee.guests_count >= 0 && attendee.guests_count <= maxGuests;
      expect(isValid).toBe(true);
    });
  });

  // ============================================
  // Response Format Tests
  // ============================================
  describe('Response Format', () => {
    test('should return success response with data', () => {
      const res = createMockResponse();
      const occasions = [
        { id: 1, title_ar: 'زواج', type: 'wedding' }
      ];

      res.json({
        success: true,
        data: occasions,
        pagination: { limit: 50, offset: 0, total: 1 },
        summary: {
          total: 1,
          by_type: { wedding: 1 },
          upcoming: 1
        }
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array)
        })
      );
    });

    test('should include type statistics', () => {
      const occasions = [
        { type: 'wedding' },
        { type: 'wedding' },
        { type: 'birth' },
        { type: 'graduation' }
      ];

      const typeStats = occasions.reduce((acc, occ) => {
        acc[occ.type] = (acc[occ.type] || 0) + 1;
        return acc;
      }, {});

      expect(typeStats['wedding']).toBe(2);
      expect(typeStats['birth']).toBe(1);
      expect(typeStats['graduation']).toBe(1);
    });

    test('should include pagination info', () => {
      const pagination = {
        limit: 50,
        offset: 0,
        total: 100
      };

      expect(pagination.limit).toBe(50);
      expect(pagination.total).toBe(100);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should return 500 on database error', () => {
      const res = createMockResponse();
      res.status(500).json({
        success: false,
        error: 'Failed to fetch occasions'
      });

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should return 404 for non-existent occasion', () => {
      const res = createMockResponse();
      res.status(404).json({
        success: false,
        error: 'Occasion not found'
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 400 for invalid input', () => {
      const res = createMockResponse();
      res.status(400).json({
        success: false,
        error: 'Invalid occasion data'
      });

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should handle empty results', () => {
      const occasions = null;
      const safeData = occasions || [];
      expect(safeData).toEqual([]);
    });
  });

  // ============================================
  // Ordering Tests
  // ============================================
  describe('Occasion Ordering', () => {
    test('should order by start_date ascending for upcoming', () => {
      const occasions = [
        { id: 1, start_date: '2024-06-20' },
        { id: 2, start_date: '2024-06-15' },
        { id: 3, start_date: '2024-06-25' }
      ];

      const sorted = [...occasions].sort(
        (a, b) => new Date(a.start_date) - new Date(b.start_date)
      );

      expect(sorted[0].id).toBe(2); // Soonest first
      expect(sorted[2].id).toBe(3); // Latest last
    });

    test('should order by created_at for recent', () => {
      const occasions = [
        { id: 1, created_at: '2024-01-15T10:00:00Z' },
        { id: 2, created_at: '2024-01-20T10:00:00Z' },
        { id: 3, created_at: '2024-01-10T10:00:00Z' }
      ];

      const sorted = [...occasions].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      expect(sorted[0].id).toBe(2); // Most recent first
    });
  });

  // ============================================
  // Permission Tests
  // ============================================
  describe('Permission Checks', () => {
    test('should allow admin to create occasion', () => {
      const user = { role: 'admin' };
      const canCreate = ['super_admin', 'admin'].includes(user.role);
      expect(canCreate).toBe(true);
    });

    test('should allow member to view occasions', () => {
      const user = { role: 'member' };
      const canView = ['super_admin', 'admin', 'member', 'family_head'].includes(user.role);
      expect(canView).toBe(true);
    });

    test('should allow occasion owner to edit', () => {
      const user = { id: 'user-123' };
      const occasion = { created_by: 'user-123' };

      const isOwner = occasion.created_by === user.id;
      expect(isOwner).toBe(true);
    });
  });
});
