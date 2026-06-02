/**
 * Members Controller Unit Tests
 * Current controller implementation uses direct PostgreSQL queries.
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();
const mockHash = jest.fn(async (value) => `hashed_${value}`);
const mockVerify = jest.fn(() => ({ id: 'member-1', role: 'member' }));

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery
}));

jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    hash: mockHash
  }
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    verify: mockVerify
  }
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn()
  }
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    isDevelopment: true,
    isProduction: false,
    jwt: { secret: 'test-secret' }
  }
}));

const {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getMemberStatistics,
  sendRegistrationReminders,
  getIncompleteProfiles,
  addMemberManually,
  getMemberProfile,
  getMemberBalance,
  getMemberTransactions,
  getMemberNotifications,
  updateMemberProfile,
  searchMembers
} = await import('../../../src/controllers/membersController.js');

const createMockRequest = (overrides = {}) => ({
  user: { id: 'member-1', role: 'member' },
  headers: { authorization: 'Bearer token' },
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

describe('Members Controller Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
    mockVerify.mockReturnValue({ id: 'member-1', role: 'member' });
  });

  describe('getAllMembers()', () => {
    test('returns transformed paginated members using PostgreSQL parameters', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'member-1',
          full_name: 'محمد علي',
          phone: '0500000000',
          membership_number: 'SH-001',
          tribal_section: 'ذرية فالح شعيل',
          membership_status: 'active',
          current_balance: '3000',
          total_count: '1'
        }]
      });

      const req = createMockRequest({
        query: {
          page: '2',
          limit: '25',
          status: 'active',
          profile_completed: 'true',
          search: 'محمد'
        }
      });
      const res = createMockResponse();

      await getAllMembers(req, res);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM members WHERE'),
        expect.arrayContaining([true, 'active', '%محمد%', 25, 25])
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: [expect.objectContaining({
          member_number: 'SH-001',
          full_name_arabic: 'محمد علي',
          current_balance: 3000,
          financial_status: 'compliant'
        })],
        pagination: expect.objectContaining({
          page: 2,
          limit: 25,
          total: 1
        })
      }));
    });

    test('returns a 500 response when the member query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      const res = createMockResponse();
      await getAllMembers(createMockRequest(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'query failed'
      }));
    });
  });

  describe('getMemberById()', () => {
    test('returns the member by id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'member-1', full_name: 'محمد' }] });

      const res = createMockResponse();
      await getMemberById(createMockRequest({ params: { id: 'member-1' } }), res);

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM members WHERE id = $1', ['member-1']);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 'member-1', full_name: 'محمد' }
      });
    });

    test('returns 404 when the member does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = createMockResponse();
      await getMemberById(createMockRequest({ params: { id: 'missing' } }), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  describe('createMember()', () => {
    test('validates required fields before querying', async () => {
      const res = createMockResponse();

      await createMember(createMockRequest({ body: { phone: '0500000000' } }), res);

      expect(mockQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('creates a member and stores the default password flags', async () => {
      const createdMember = { id: 'member-1', full_name: 'محمد علي', phone: '0500000000' };
      mockQuery.mockResolvedValueOnce({ rows: [createdMember] });

      const res = createMockResponse();
      await createMember(createMockRequest({
        body: {
          full_name: 'محمد علي',
          phone: '0500000000',
          country_code: '+966'
        }
      }), res);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO members'),
        expect.arrayContaining([
          'محمد علي',
          expect.any(String),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.stringMatching(/^SH-/),
          'active',
          false,
          expect.any(String),
          expect.any(String),
          true,
          true,
          false
        ])
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: createdMember
      }));
    });
  });

  describe('updateMember()', () => {
    test('updates allowed member fields and normalizes gender', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'member-1', full_name: 'أحمد', gender: 'male' }]
      });

      const res = createMockResponse();
      await updateMember(createMockRequest({
        params: { id: 'member-1' },
        body: {
          full_name: ' أحمد ',
          gender: ' MALE ',
          date_of_birth: ''
        }
      }), res);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE members SET'),
        expect.arrayContaining(['أحمد', 'male', 'member-1'])
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('returns 400 when no updateable data is provided', async () => {
      const res = createMockResponse();

      await updateMember(createMockRequest({
        params: { id: 'member-1' },
        body: {}
      }), res);

      expect(mockQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('maps duplicate key errors to 409', async () => {
      const error = new Error('duplicate');
      error.code = '23505';
      mockQuery.mockRejectedValueOnce(error);

      const res = createMockResponse();
      await updateMember(createMockRequest({
        params: { id: 'member-1' },
        body: { full_name: 'محمد' }
      }), res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  describe('deleteMember()', () => {
    test('deletes by id', async () => {
      const res = createMockResponse();

      await deleteMember(createMockRequest({ params: { id: 'member-1' } }), res);

      expect(mockQuery).toHaveBeenCalledWith('DELETE FROM members WHERE id = $1', ['member-1']);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getMemberStatistics()', () => {
    test('returns aggregated statistics and recent imports', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            total_members: '10',
            active_members: '8',
            completed_profiles: '5',
            pending_profiles: '5',
            social_security_beneficiaries: '2',
            this_month_members: '1'
          }]
        })
        .mockResolvedValueOnce({ rows: [{ id: 'import-1' }] });

      const res = createMockResponse();
      await getMemberStatistics(createMockRequest(), res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          total_members: 10,
          completion_rate: '50.0',
          recent_imports: [{ id: 'import-1' }]
        })
      }));
    });
  });

  describe('sendRegistrationReminders()', () => {
    test('rejects an empty member list', async () => {
      const res = createMockResponse();

      await sendRegistrationReminders(createMockRequest({ body: { memberIds: [] } }), res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns reminder data for members with active tokens', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'member-1',
          full_name: 'محمد',
          phone: '0500000000',
          membership_number: 'SH-001',
          token: 'TOKEN123',
          temp_password: '123456',
          expires_at: '2026-01-01',
          is_used: false
        }]
      });

      const res = createMockResponse();
      await sendRegistrationReminders(createMockRequest({ body: { memberIds: ['member-1'] } }), res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          total_reminders: 1
        })
      }));
    });
  });

  describe('getIncompleteProfiles()', () => {
    test('returns paginated incomplete profiles', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'member-1', total_count: '1', full_name: 'محمد' }]
      });

      const res = createMockResponse();
      await getIncompleteProfiles(createMockRequest({ query: { page: '1', limit: '10' } }), res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: [{ id: 'member-1', full_name: 'محمد' }],
        pagination: expect.objectContaining({ total: 1 })
      }));
    });
  });

  describe('addMemberManually()', () => {
    test('rejects duplicate phone numbers', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });

      const res = createMockResponse();
      await addMemberManually(createMockRequest({
        body: { full_name: 'محمد', phone: '0500000000' }
      }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'رقم الهاتف مسجل مسبقاً'
      }));
    });

    test('creates a member, token, and temporary password', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'member-1', full_name: 'محمد', phone: '0500000000' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = createMockResponse();
      await addMemberManually(createMockRequest({
        body: { full_name: 'محمد', phone: '0500000000', send_registration_link: true }
      }), res);

      expect(mockHash).toHaveBeenCalledWith(expect.stringMatching(/^\d{6}$/), 10);
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO members'), expect.any(Array));
      expect(mockQuery).toHaveBeenNthCalledWith(3, expect.stringContaining('INSERT INTO member_registration_tokens'), expect.any(Array));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          member: expect.objectContaining({
            registration_token: expect.any(String),
            temp_password: expect.stringMatching(/^\d{6}$/)
          })
        })
      }));
    });
  });

  describe('mobile member functions', () => {
    test('getMemberProfile strips sensitive fields', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'member-1',
          full_name: 'محمد',
          password_hash: 'secret',
          temp_password: '123456'
        }]
      });

      const res = createMockResponse();
      await getMemberProfile(createMockRequest(), res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 'member-1', full_name: 'محمد' }
      });
    });

    test('getMemberBalance uses current_balance as the source of truth', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            membership_status: 'active',
            full_name: 'محمد',
            current_balance: '1250'
          }]
        })
        .mockResolvedValueOnce({ rows: [{ amount: '50' }, { amount: '100' }] });

      const res = createMockResponse();
      await getMemberBalance(createMockRequest(), res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          current_balance: 1250,
          total_payments: 2
        })
      }));
    });

    test('getMemberTransactions returns pagination metadata', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'payment-1', amount: '50', total_count: '1' }]
      });

      const res = createMockResponse();
      await getMemberTransactions(createMockRequest({ query: { page: '1', limit: '20' } }), res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: [{ id: 'payment-1', amount: '50' }],
        pagination: expect.objectContaining({ total: 1 })
      }));
    });

    test('getMemberNotifications includes unread filter when requested', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'notification-1', total_count: '1', is_read: false }]
      });

      const res = createMockResponse();
      await getMemberNotifications(createMockRequest({ query: { unread_only: 'true' } }), res);

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('is_read'), expect.arrayContaining([false]));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: [{ id: 'notification-1', is_read: false }]
      }));
    });

    test('updateMemberProfile blocks admin-only fields from mobile updates', async () => {
      const res = createMockResponse();
      await updateMemberProfile(createMockRequest({
        body: {
          full_name: 'لا يسمح',
          current_balance: 999
        }
      }), res);

      expect(mockQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message_en: 'Name and membership fields are admin-only.'
      }));
    });

    test('updateMemberProfile updates only allowed profile fields', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'member-1',
          email: 'new@example.com',
          occupation: 'Engineer',
          password_hash: 'secret'
        }]
      });

      const res = createMockResponse();
      await updateMemberProfile(createMockRequest({
        body: {
          email: ' new@example.com ',
          occupation: ' Engineer ',
          full_name: 'ignored'
        }
      }), res);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE members SET'),
        expect.arrayContaining(['new@example.com', 'Engineer', 'member-1'])
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: { id: 'member-1', email: 'new@example.com', occupation: 'Engineer' }
      }));
    });
  });

  describe('searchMembers()', () => {
    test('requires a minimum two-character query', async () => {
      const res = createMockResponse();

      await searchMembers(createMockRequest({ query: { q: 'م' } }), res);

      expect(mockQuery).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('searches active members and maps payment status helper fields', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'member-1',
          membership_number: 'SH-001',
          full_name: 'محمد',
          phone: '0500000000',
          current_balance: '500',
          membership_status: 'active'
        }]
      });

      const res = createMockResponse();
      await searchMembers(createMockRequest({ query: { q: 'محمد', limit: '5' } }), res);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('membership_status ='),
        ['%محمد%', 10]
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{
          id: 'member-1',
          membership_number: 'SH-001',
          full_name_ar: 'محمد',
          phone: '0500000000',
          balance: 500,
          is_below_minimum: true
        }]
      });
    });
  });
});
