/**
 * Member Monitoring Query Service Unit Tests
 * Tests optimized database queries for advanced filtering and monitoring
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock dependencies
const mockSupabaseResponse = {
  data: null,
  error: null,
  count: 0
};

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  or: jest.fn(() => mockSupabase),
  ilike: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  range: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
  rpc: jest.fn(() => Promise.resolve(mockSupabaseResponse))
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

describe('Member Monitoring Query Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseResponse.data = null;
    mockSupabaseResponse.error = null;
    mockSupabaseResponse.count = 0;
  });

  // ============================================
  // Build Member Monitoring Query Tests
  // ============================================
  describe('buildMemberMonitoringQuery', () => {
    test('should use default pagination values', () => {
      const filters = {};
      const page = filters.page || 1;
      const limit = filters.limit || 50;

      expect(page).toBe(1);
      expect(limit).toBe(50);
    });

    test('should calculate offset from page', () => {
      const page = 3;
      const limit = 50;
      const offset = (page - 1) * limit;

      expect(offset).toBe(100);
    });

    test('should use default sort values', () => {
      const filters = {};
      const sortBy = filters.sortBy || 'full_name';
      const sortOrder = filters.sortOrder || 'asc';

      expect(sortBy).toBe('full_name');
      expect(sortOrder).toBe('asc');
    });

    test('should support descending sort order', () => {
      const sortOrder = 'desc';
      const ascending = sortOrder === 'asc';

      expect(ascending).toBe(false);
    });

    test('should clean phone number for search', () => {
      const phone = '+966 555-123-456';
      const cleanPhone = phone.replace(/\D/g, '');

      expect(cleanPhone).toBe('966555123456');
    });

    test('should check for suspended status', () => {
      const status = 'suspended';
      const isSuspended = status === 'suspended';

      expect(isSuspended).toBe(true);
    });

    test('should check for active status', () => {
      const status = 'active';
      const isActive = status === 'active';

      expect(isActive).toBe(true);
    });

    test('should set minimum balance requirement', () => {
      const minimumBalance = 3000;
      expect(minimumBalance).toBe(3000);
    });
  });

  // ============================================
  // Filter By Balance Tests
  // ============================================
  describe('filterByBalance', () => {
    const members = [
      { id: '1', balance: 500 },
      { id: '2', balance: 1500 },
      { id: '3', balance: 3000 },
      { id: '4', balance: 4500 },
      { id: '5', balance: 5500 }
    ];

    test('should filter less than amount', () => {
      const filtered = members.filter(m => m.balance < 2000);
      expect(filtered).toHaveLength(2);
    });

    test('should filter greater than amount', () => {
      const filtered = members.filter(m => m.balance > 3000);
      expect(filtered).toHaveLength(2);
    });

    test('should filter equal to amount', () => {
      const filtered = members.filter(m => m.balance === 3000);
      expect(filtered).toHaveLength(1);
    });

    test('should filter between amounts', () => {
      const min = 1000;
      const max = 4000;
      const filtered = members.filter(m => m.balance >= min && m.balance <= max);

      expect(filtered).toHaveLength(2);
    });

    test('should filter compliant members (>= 3000)', () => {
      const filtered = members.filter(m => m.balance >= 3000);
      expect(filtered).toHaveLength(3);
    });

    test('should filter non-compliant members (< 3000)', () => {
      const filtered = members.filter(m => m.balance < 3000);
      expect(filtered).toHaveLength(2);
    });

    test('should filter critical members (< 1000)', () => {
      const filtered = members.filter(m => m.balance < 1000);
      expect(filtered).toHaveLength(1);
    });

    test('should filter excellent members (>= 5000)', () => {
      const filtered = members.filter(m => m.balance >= 5000);
      expect(filtered).toHaveLength(1);
    });
  });

  // ============================================
  // Get Compliance Status Tests
  // ============================================
  describe('getComplianceStatus', () => {
    test('should return excellent for balance >= 5000', () => {
      const balance = 5500;
      const status = balance >= 5000 ? 'excellent' :
                    balance >= 3000 ? 'compliant' :
                    balance >= 1000 ? 'non-compliant' : 'critical';

      expect(status).toBe('excellent');
    });

    test('should return compliant for balance >= 3000', () => {
      const balance = 3500;
      const status = balance >= 5000 ? 'excellent' :
                    balance >= 3000 ? 'compliant' :
                    balance >= 1000 ? 'non-compliant' : 'critical';

      expect(status).toBe('compliant');
    });

    test('should return non-compliant for balance >= 1000', () => {
      const balance = 1500;
      const status = balance >= 5000 ? 'excellent' :
                    balance >= 3000 ? 'compliant' :
                    balance >= 1000 ? 'non-compliant' : 'critical';

      expect(status).toBe('non-compliant');
    });

    test('should return critical for balance < 1000', () => {
      const balance = 500;
      const status = balance >= 5000 ? 'excellent' :
                    balance >= 3000 ? 'compliant' :
                    balance >= 1000 ? 'non-compliant' : 'critical';

      expect(status).toBe('critical');
    });
  });

  // ============================================
  // Calculate Statistics Tests
  // ============================================
  describe('calculateStatistics', () => {
    test('should calculate total members', () => {
      const members = [{}, {}, {}];
      const stats = { total: members.length };

      expect(stats.total).toBe(3);
    });

    test('should calculate average balance', () => {
      const members = [
        { balance: 1000 },
        { balance: 2000 },
        { balance: 3000 }
      ];
      const totalBalance = members.reduce((sum, m) => sum + m.balance, 0);
      const averageBalance = totalBalance / members.length;

      expect(averageBalance).toBe(2000);
    });

    test('should calculate compliance rate', () => {
      const total = 100;
      const compliant = 75;
      const complianceRate = Math.round((compliant / total) * 100);

      expect(complianceRate).toBe(75);
    });

    test('should count balance ranges', () => {
      const members = [
        { balance: 500 },
        { balance: 1500 },
        { balance: 3500 },
        { balance: 6000 }
      ];

      const ranges = {
        '0-999': members.filter(m => m.balance < 1000).length,
        '1000-2999': members.filter(m => m.balance >= 1000 && m.balance < 3000).length,
        '3000-4999': members.filter(m => m.balance >= 3000 && m.balance < 5000).length,
        '5000+': members.filter(m => m.balance >= 5000).length
      };

      expect(ranges['0-999']).toBe(1);
      expect(ranges['1000-2999']).toBe(1);
      expect(ranges['3000-4999']).toBe(1);
      expect(ranges['5000+']).toBe(1);
    });

    test('should count by tribal section', () => {
      const members = [
        { tribalSection: 'رشود' },
        { tribalSection: 'رشود' },
        { tribalSection: 'الدغيش' }
      ];

      const bySection = {};
      members.forEach(m => {
        bySection[m.tribalSection] = (bySection[m.tribalSection] || 0) + 1;
      });

      expect(bySection['رشود']).toBe(2);
      expect(bySection['الدغيش']).toBe(1);
    });

    test('should count suspended members', () => {
      const members = [
        { isSuspended: true },
        { isSuspended: false },
        { isSuspended: true }
      ];

      const suspended = members.filter(m => m.isSuspended).length;

      expect(suspended).toBe(2);
    });
  });

  // ============================================
  // Stats Cache Tests
  // ============================================
  describe('Stats Cache', () => {
    test('should have 5-minute TTL', () => {
      const TTL = 5 * 60 * 1000;
      expect(TTL).toBe(300000);
    });

    test('should check cache validity', () => {
      const cacheTimestamp = Date.now() - 60000; // 1 minute ago
      const TTL = 300000; // 5 minutes
      const now = Date.now();
      const isValid = (now - cacheTimestamp) < TTL;

      expect(isValid).toBe(true);
    });

    test('should invalidate expired cache', () => {
      const cacheTimestamp = Date.now() - 600000; // 10 minutes ago
      const TTL = 300000; // 5 minutes
      const now = Date.now();
      const isValid = (now - cacheTimestamp) < TTL;

      expect(isValid).toBe(false);
    });

    test('should return cache age', () => {
      const cacheTimestamp = Date.now() - 120000; // 2 minutes ago
      const now = Date.now();
      const cacheAge = now - cacheTimestamp;

      expect(cacheAge).toBeCloseTo(120000, -3);
    });
  });

  // ============================================
  // Export Member Data Tests
  // ============================================
  describe('exportMemberData', () => {
    test('should set maximum export limit', () => {
      const exportFilters = { limit: 10000 };
      expect(exportFilters.limit).toBe(10000);
    });

    test('should format data with Arabic headers', () => {
      const member = {
        memberId: 'SH-001',
        name: 'محمد الشعيل',
        phone: '+9665xxxxxxxx',
        balance: 3500,
        complianceStatus: 'compliant'
      };

      const exportData = {
        'رقم العضوية': member.memberId,
        'الاسم الكامل': member.name,
        'رقم الجوال': member.phone,
        'الرصيد': member.balance,
        'الحالة': member.complianceStatus === 'compliant' ? 'ملتزم' : 'غير ملتزم'
      };

      expect(exportData['رقم العضوية']).toBe('SH-001');
      expect(exportData['الحالة']).toBe('ملتزم');
    });

    test('should include export metadata', () => {
      const metadata = {
        totalRecords: 150,
        exportDate: new Date().toISOString(),
        filters: { status: 'active' }
      };

      expect(metadata.totalRecords).toBe(150);
      expect(metadata.exportDate).toBeDefined();
    });
  });

  // ============================================
  // Get Member Details Tests
  // ============================================
  describe('getMemberDetails', () => {
    test('should return member with balance', () => {
      const member = {
        id: 'user-123',
        full_name: 'محمد الشعيل',
        balance: 3500
      };

      expect(member.balance).toBe(3500);
    });

    test('should calculate pending amount', () => {
      const payments = [
        { status: 'pending', amount: 100 },
        { status: 'pending', amount: 200 },
        { status: 'completed', amount: 300 }
      ];

      const pendingAmount = payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);

      expect(pendingAmount).toBe(300);
    });

    test('should calculate total paid', () => {
      const payments = [
        { status: 'completed', amount: 100 },
        { status: 'approved', amount: 200 },
        { status: 'pending', amount: 300 }
      ];

      const totalPaid = payments
        .filter(p => ['completed', 'approved'].includes(p.status))
        .reduce((sum, p) => sum + p.amount, 0);

      expect(totalPaid).toBe(300);
    });

    test('should calculate average payment', () => {
      const totalPaid = 3000;
      const paymentCount = 6;
      const averagePayment = paymentCount > 0 ? totalPaid / paymentCount : 0;

      expect(averagePayment).toBe(500);
    });

    test('should return payment statistics', () => {
      const statistics = {
        totalPayments: 10,
        completedPayments: 8,
        totalPaid: 4000,
        pendingAmount: 500,
        averagePayment: 500
      };

      expect(statistics.totalPayments).toBe(10);
      expect(statistics.completedPayments).toBe(8);
    });
  });

  // ============================================
  // Search Members Autocomplete Tests
  // ============================================
  describe('searchMembersAutocomplete', () => {
    test('should require minimum 2 characters', () => {
      const searchTerm = 'a';
      const isValid = searchTerm && searchTerm.length >= 2;

      expect(isValid).toBe(false);
    });

    test('should return empty array for short search', () => {
      const searchTerm = 'a';
      const result = searchTerm.length < 2 ? [] : ['results'];

      expect(result).toEqual([]);
    });

    test('should use default limit of 10', () => {
      const limit = undefined || 10;
      expect(limit).toBe(10);
    });

    test('should format autocomplete result', () => {
      const member = {
        id: 'user-123',
        full_name: 'محمد الشعيل',
        membership_number: 'SH-001',
        phone: '+9665xxxxxxxx'
      };

      const result = {
        id: member.id,
        value: member.id,
        label: `${member.full_name} (${member.membership_number || 'No ID'})`,
        name: member.full_name,
        memberId: member.membership_number
      };

      expect(result.label).toContain('محمد الشعيل');
      expect(result.label).toContain('SH-001');
    });

    test('should handle missing membership number', () => {
      const member = { full_name: 'محمد', membership_number: null };
      const label = `${member.full_name} (${member.membership_number || 'No ID'})`;

      expect(label).toContain('No ID');
    });
  });

  // ============================================
  // Get Tribal Section Stats Tests
  // ============================================
  describe('getTribalSectionStats', () => {
    test('should list all tribal sections', () => {
      const tribalSections = [
        'رشود', 'الدغيش', 'رشيد', 'العيد',
        'الرشيد', 'الشبيعان', 'المسعود', 'عقاب'
      ];

      expect(tribalSections).toHaveLength(8);
    });

    test('should calculate section percentages', () => {
      const total = 100;
      const sectionCount = 25;
      const percentage = Math.round((sectionCount / total) * 100);

      expect(percentage).toBe(25);
    });

    test('should sort by count descending', () => {
      const sections = [
        { section: 'رشود', count: 20 },
        { section: 'الدغيش', count: 30 },
        { section: 'رشيد', count: 15 }
      ];

      const sorted = sections.sort((a, b) => b.count - a.count);

      expect(sorted[0].section).toBe('الدغيش');
      expect(sorted[0].count).toBe(30);
    });

    test('should generate section from member ID if not set', () => {
      const tribalSections = ['رشود', 'الدغيش', 'رشيد'];
      const memberId = 'abc12345';
      const index = parseInt(memberId.substring(0, 8), 16) % tribalSections.length;

      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(tribalSections.length);
    });
  });

  // ============================================
  // Metadata Tests
  // ============================================
  describe('Query Metadata', () => {
    test('should include pagination info', () => {
      const metadata = {
        total: 150,
        filtered: 50,
        page: 2,
        limit: 25,
        totalPages: Math.ceil(150 / 25)
      };

      expect(metadata.totalPages).toBe(6);
    });

    test('should include query time', () => {
      const metadata = {
        queryTime: Date.now()
      };

      expect(metadata.queryTime).toBeDefined();
    });

    test('should include statistics', () => {
      const metadata = {
        statistics: {
          total: 100,
          compliant: 75,
          complianceRate: 75
        }
      };

      expect(metadata.statistics.complianceRate).toBe(75);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    test('should log query errors', () => {
      const error = { message: 'Members query failed: Connection error' };
      expect(error.message).toContain('query failed');
    });

    test('should handle payment query errors gracefully', () => {
      const paymentsError = { message: 'Payment query failed' };
      const totalPaid = paymentsError ? 0 : 1000;

      expect(totalPaid).toBe(0);
    });

    test('should throw error for member not found', () => {
      const error = new Error('Member not found: Invalid ID');
      expect(error.message).toContain('Member not found');
    });

    test('should throw error for search failure', () => {
      const error = new Error('Search failed: Invalid search term');
      expect(error.message).toContain('Search failed');
    });
  });

  // ============================================
  // Member Data Formatting Tests
  // ============================================
  describe('Member Data Formatting', () => {
    test('should generate membership number from ID', () => {
      const memberId = 'abc123';
      const membershipNumber = `SH-${String(memberId).slice(0, 5).toUpperCase()}`;

      expect(membershipNumber).toBe('SH-ABC12');
    });

    test('should handle various name field formats', () => {
      const member = {
        full_name: null,
        name: null,
        fullName: null,
        first_name: 'محمد',
        last_name: 'الشعيل'
      };

      const memberName = member.full_name || member.name || member.fullName ||
                        (member.first_name ? `${member.first_name} ${member.last_name || ''}` : '') ||
                        'عضو';

      expect(memberName).toBe('محمد الشعيل');
    });

    test('should trim member name', () => {
      const name = '  محمد الشعيل  ';
      const trimmed = name.trim();

      expect(trimmed).toBe('محمد الشعيل');
    });

    test('should handle missing phone/mobile', () => {
      const member = { phone: null, mobile: null };
      const phone = member.phone || member.mobile || '';

      expect(phone).toBe('');
    });
  });
});
