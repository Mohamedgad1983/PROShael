import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease = jest.fn();
const mockGetSignedUrl = jest.fn();
const mockPersistMemberNotification = jest.fn();
const mockSendPushNotification = jest.fn();

const ROLE_IDS = {
  super_admin: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  admin: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  financial_manager: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  operational_manager: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
  occasions_initiatives_diyas_admin: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
  member: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
};

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: mockGetClient,
}));

jest.unstable_mockModule('../../../src/config/documentStorage.js', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({
  persistIdempotentMemberNotification: mockPersistMemberNotification,
  sendPushNotification: mockSendPushNotification,
}));

jest.unstable_mockModule('../../../src/middleware/auth.js', () => ({
  authenticateToken: (req, _res, next) => {
    const role = req.get('x-test-role') || 'admin';
    req.user = { id: ROLE_IDS[role], role };
    next();
  },
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const { default: initiativesEnhancedRouter } = await import(
  '../../../src/routes/initiativesEnhanced.js'
);

const app = express();
app.use(express.json());
app.use('/api/initiatives-enhanced', initiativesEnhancedRouter);

const INITIATIVE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DONATION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const MEMBER_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const RECEIPT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const ORIGINAL_REVIEWER_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

const contribution = (overrides = {}) => ({
  id: DONATION_ID,
  initiative_id: INITIATIVE_ID,
  initiative_title: 'مبادرة الاختبار',
  member_id: MEMBER_ID,
  amount: '125.00',
  payment_method: 'bank_transfer',
  status: 'pending',
  receipt_document_id: RECEIPT_ID,
  receipt_url: `${MEMBER_ID}/receipts/private-transfer.jpg`,
  receipt_file_path: `${MEMBER_ID}/receipts/private-transfer.jpg`,
  approved_by: null,
  approval_date: null,
  rejection_reason: null,
  rejected_by_id: null,
  rejected_at: null,
  updated_at: '2026-08-10T10:00:00.000Z',
  ...overrides,
});

const configureTransaction = ({
  lockedDonation = contribution(),
  updatedDonation,
  receiptExists = true,
  receiptClaimed = false,
} = {}) => {
  mockClientQuery.mockImplementation((sql) => {
    const statement = String(sql).trim();
    if (statement === 'BEGIN' || statement === 'COMMIT' || statement === 'ROLLBACK') {
      return { rows: [] };
    }
    if (statement.includes('FROM initiative_donations d')) {
      return { rows: lockedDonation ? [lockedDonation] : [] };
    }
    if (statement.includes('pg_advisory_xact_lock')) {
      return { rows: [{}] };
    }
    if (statement.includes('FROM documents_metadata')) {
      return { rows: receiptExists ? [{ id: RECEIPT_ID }] : [] };
    }
    if (statement.includes('WHERE receipt_document_id = $1')) {
      return { rows: receiptClaimed ? [{ id: 'claimed-donation' }] : [] };
    }
    if (statement.startsWith('UPDATE initiative_donations')) {
      if (updatedDonation === null) {
        return { rows: [] };
      }
      return {
        rows: [updatedDonation || {
          ...lockedDonation,
          status: statement.includes("status = 'rejected'") ? 'rejected' : 'completed',
          approved_by: statement.includes('approved_by') ? ROLE_IDS.admin : lockedDonation.approved_by,
        }],
      };
    }
    throw new Error(`Unexpected transaction SQL: ${statement}`);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetClient.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
  mockPersistMemberNotification.mockResolvedValue({ notificationId: 'notification-1', created: true });
  mockSendPushNotification.mockResolvedValue({ success: true });
  mockQuery.mockImplementation((_sql, params = []) => {
    const userId = params[0];
    const role = Object.entries(ROLE_IDS).find(([, id]) => id === userId)?.[0];
    const allowedRoles = params[1] || [];
    return {
      rows: role && allowedRoles.includes(role) ? [{ id: userId, role }] : [],
    };
  });
});

describe('enhanced initiative contribution review', () => {
  test.each(['super_admin', 'admin', 'financial_manager'])(
    'allows %s through the financial review policy',
    async (role) => {
      const response = await request(app)
        .patch('/api/initiatives-enhanced/donations/not-a-uuid/approve')
        .set('x-test-role', role);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/معرّف المساهمة/);
    }
  );

  test('accepts a financial reviewer whose privileged identity is stored in members', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: ROLE_IDS.financial_manager,
        role: 'financial_manager',
        identity_source: 'members',
      }],
    });

    const response = await request(app)
      .patch('/api/initiatives-enhanced/donations/not-a-uuid/approve')
      .set('x-test-role', 'financial_manager');

    expect(response.status).toBe(400);
    expect(mockQuery.mock.calls[0][0]).toContain("'members'::text AS identity_source");
  });

  test('denies a disabled or suspended reviewer based on authoritative account state', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/approve`)
      .set('x-test-role', 'financial_manager');

    expect(response.status).toBe(403);
    expect(mockGetClient).not.toHaveBeenCalled();
    const authorizationSql = mockQuery.mock.calls[0][0];
    expect(authorizationSql).toContain('COALESCE(is_active, true) = true');
    expect(authorizationSql).toContain('membership_status');
    expect(authorizationSql).toContain('suspended_at');
  });

  test.each(['operational_manager', 'occasions_initiatives_diyas_admin', 'member'])(
    'denies %s before a contribution transaction starts',
    async (role) => {
      const response = await request(app)
        .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/approve`)
        .set('x-test-role', role);

      expect(response.status).toBe(403);
      expect(mockGetClient).not.toHaveBeenCalled();
    }
  );

  test('approves a pending contribution with receipt advisory locking and CAS, then notifies after commit', async () => {
    const lockedDonation = contribution();
    const approvedDonation = contribution({
      status: 'completed',
      approved_by: ROLE_IDS.admin,
      approval_date: '2026-08-10T11:00:00.000Z',
    });
    configureTransaction({ lockedDonation, updatedDonation: approvedDonation });

    const response = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/approve`)
      .set('x-test-role', 'admin');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      idempotent_replay: false,
      donation: expect.objectContaining({ status: 'completed', approved_by: ROLE_IDS.admin }),
    }));
    expect(response.body.donation).not.toHaveProperty('receipt_url');
    expect(response.body.donation).not.toHaveProperty('receipt_file_path');
    expect(response.text).not.toContain('private-transfer.jpg');

    const statements = mockClientQuery.mock.calls.map(([sql]) => String(sql));
    const lockIndex = statements.findIndex((sql) => sql.includes('FOR UPDATE OF i, d'));
    const evidenceLockIndex = statements.findIndex((sql) => sql.includes('pg_advisory_xact_lock'));
    const updateIndex = statements.findIndex((sql) => sql.includes('UPDATE initiative_donations'));
    const commitIndex = statements.findIndex((sql) => sql.trim() === 'COMMIT');
    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(evidenceLockIndex).toBeGreaterThan(lockIndex);
    expect(updateIndex).toBeGreaterThan(evidenceLockIndex);
    expect(commitIndex).toBeGreaterThan(updateIndex);
    expect(statements[updateIndex]).toContain("LOWER(BTRIM(COALESCE(status, ''))) = 'pending'");
    expect(mockClientQuery.mock.calls[updateIndex][1]).toEqual([ROLE_IDS.admin, DONATION_ID]);

    expect(mockPersistMemberNotification).toHaveBeenCalledWith(
      MEMBER_ID,
      expect.objectContaining({
        title: 'تم اعتماد مساهمتك',
        relatedId: INITIATIVE_ID,
      }),
      expect.objectContaining({
        client: expect.objectContaining({ query: mockClientQuery }),
        idempotencyKey: `initiative-donation-review:${DONATION_ID}:approved`,
      })
    );
    expect(mockPersistMemberNotification.mock.invocationCallOrder[0])
      .toBeLessThan(mockClientQuery.mock.invocationCallOrder[commitIndex]);
    expect(mockClientQuery.mock.invocationCallOrder[commitIndex])
      .toBeLessThan(mockSendPushNotification.mock.invocationCallOrder[0]);
  });

  test('treats an approved replay as idempotent without overwriting the original reviewer or timestamp', async () => {
    const originalApproval = contribution({
      status: 'completed',
      approved_by: ORIGINAL_REVIEWER_ID,
      approval_date: '2026-08-09T07:30:00.000Z',
    });
    configureTransaction({ lockedDonation: originalApproval });

    const response = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/approve`)
      .set('x-test-role', 'financial_manager');

    expect(response.status).toBe(200);
    expect(response.body.idempotent_replay).toBe(true);
    expect(response.body.donation.approved_by).toBe(ORIGINAL_REVIEWER_ID);
    expect(response.body.donation.approval_date).toBe('2026-08-09T07:30:00.000Z');
    expect(response.text).not.toContain('private-transfer.jpg');
    expect(mockClientQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE initiative_donations')))
      .toBe(false);
    expect(mockPersistMemberNotification).toHaveBeenCalledWith(
      MEMBER_ID,
      expect.objectContaining({ title: 'تم اعتماد مساهمتك' }),
      expect.objectContaining({
        idempotencyKey: `initiative-donation-review:${DONATION_ID}:approved`,
      })
    );
    expect(mockSendPushNotification).toHaveBeenCalledTimes(1);
  });

  test('does not approve a contribution that was already rejected', async () => {
    configureTransaction({
      lockedDonation: contribution({
        status: 'rejected',
        rejection_reason: 'الإيصال السابق غير واضح ولا يثبت التحويل',
        rejected_by_id: ORIGINAL_REVIEWER_ID,
        rejected_at: '2026-08-09T07:30:00.000Z',
      }),
    });

    const response = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/approve`)
      .set('x-test-role', 'admin');

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('INITIATIVE_DONATION_NOT_PENDING');
    expect(mockClientQuery.mock.calls.some(([sql]) =>
      String(sql).includes('UPDATE initiative_donations')
    )).toBe(false);
    expect(mockPersistMemberNotification).not.toHaveBeenCalled();
  });

  test('does not approve two contributions with the same archived receipt', async () => {
    configureTransaction({ receiptClaimed: true });

    const response = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/approve`)
      .set('x-test-role', 'admin');

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('INITIATIVE_RECEIPT_ALREADY_CLAIMED');
    expect(mockClientQuery.mock.calls.some(([sql]) =>
      String(sql).includes('UPDATE initiative_donations')
    )).toBe(false);
    expect(mockPersistMemberNotification).not.toHaveBeenCalled();
  });

  test('does not replay an approved legacy row with missing reviewer audit', async () => {
    configureTransaction({
      lockedDonation: contribution({
        status: 'completed',
        approved_by: null,
        approval_date: null,
      }),
    });

    const response = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/approve`)
      .set('x-test-role', 'admin');

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('INITIATIVE_APPROVAL_AUDIT_INCOMPLETE');
    expect(mockPersistMemberNotification).not.toHaveBeenCalled();
    expect(mockSendPushNotification).not.toHaveBeenCalled();
  });

  test('rolls back the approval when its durable inbox notification cannot be persisted', async () => {
    const approvedDonation = contribution({
      status: 'completed',
      approved_by: ROLE_IDS.admin,
      approval_date: '2026-08-10T11:00:00.000Z',
    });
    configureTransaction({ updatedDonation: approvedDonation });
    mockPersistMemberNotification.mockRejectedValueOnce(new Error('notification insert failed'));

    const response = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/approve`)
      .set('x-test-role', 'admin');

    expect(response.status).toBe(500);
    const statements = mockClientQuery.mock.calls.map(([sql]) => String(sql).trim());
    expect(statements.some((sql) => sql.startsWith('UPDATE initiative_donations'))).toBe(true);
    expect(statements).toContain('ROLLBACK');
    expect(statements).not.toContain('COMMIT');
    expect(mockSendPushNotification).not.toHaveBeenCalled();
  });

  test('reuses one durable notification and retries push after an idempotent HTTP replay', async () => {
    const approvedDonation = contribution({
      status: 'completed',
      approved_by: ROLE_IDS.admin,
      approval_date: '2026-08-10T11:00:00.000Z',
    });
    mockPersistMemberNotification
      .mockResolvedValueOnce({ notificationId: 'notification-1', created: true })
      .mockResolvedValueOnce({ notificationId: 'notification-1', created: false });
    mockSendPushNotification
      .mockRejectedValueOnce(new Error('push provider unavailable'))
      .mockResolvedValueOnce({ success: true });

    configureTransaction({ updatedDonation: approvedDonation });
    const firstResponse = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/approve`)
      .set('x-test-role', 'admin');

    configureTransaction({ lockedDonation: approvedDonation });
    const retryResponse = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/approve`)
      .set('x-test-role', 'admin');

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body.idempotent_replay).toBe(false);
    expect(retryResponse.status).toBe(200);
    expect(retryResponse.body.idempotent_replay).toBe(true);
    expect(mockClientQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('UPDATE initiative_donations')
    )).toHaveLength(1);
    expect(mockPersistMemberNotification).toHaveBeenCalledTimes(2);
    expect(mockPersistMemberNotification.mock.calls.map(([, , options]) => options.idempotencyKey))
      .toEqual([
        `initiative-donation-review:${DONATION_ID}:approved`,
        `initiative-donation-review:${DONATION_ID}:approved`,
      ]);
    await expect(mockPersistMemberNotification.mock.results[0].value)
      .resolves.toEqual(expect.objectContaining({ notificationId: 'notification-1', created: true }));
    await expect(mockPersistMemberNotification.mock.results[1].value)
      .resolves.toEqual(expect.objectContaining({ notificationId: 'notification-1', created: false }));
    expect(mockSendPushNotification).toHaveBeenCalledTimes(2);
  });

  test('rejects only a pending contribution, stores supported audit fields, and never updates initiative totals', async () => {
    const normalizedReason = 'مبلغ الإيصال لا يطابق قيمة المساهمة المسجلة';
    const rejectedDonation = contribution({
      status: 'rejected',
      rejection_reason: normalizedReason,
      rejected_by_id: ROLE_IDS.admin,
      rejected_at: '2026-08-10T11:30:00.000Z',
    });
    configureTransaction({ updatedDonation: rejectedDonation });

    const response = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/reject`)
      .set('x-test-role', 'admin')
      .send({ reason: '  مبلغ الإيصال   لا يطابق قيمة المساهمة المسجلة  ' });

    expect(response.status).toBe(200);
    expect(response.body.donation).toEqual(expect.objectContaining({
      status: 'rejected',
      rejection_reason: normalizedReason,
    }));
    expect(response.body.donation).not.toHaveProperty('receipt_url');
    expect(response.body.donation).not.toHaveProperty('receipt_file_path');
    expect(response.text).not.toContain('private-transfer.jpg');

    const updateCall = mockClientQuery.mock.calls.find(([sql]) =>
      String(sql).includes('UPDATE initiative_donations')
    );
    expect(updateCall).toBeDefined();
    expect(updateCall[0]).toContain('rejection_reason = $1');
    expect(updateCall[0]).toContain('rejected_by_id = $2');
    expect(updateCall[0]).toContain('rejected_at = NOW()');
    expect(updateCall[0]).toContain("LOWER(BTRIM(COALESCE(status, ''))) = 'pending'");
    expect(updateCall[1]).toEqual([normalizedReason, ROLE_IDS.admin, DONATION_ID]);
    expect(mockClientQuery.mock.calls.some(([sql]) => /^\s*UPDATE initiatives\b/.test(String(sql))))
      .toBe(false);

    const commitIndex = mockClientQuery.mock.calls.findIndex(([sql]) => String(sql).trim() === 'COMMIT');
    expect(mockPersistMemberNotification).toHaveBeenCalledWith(
      MEMBER_ID,
      expect.objectContaining({ body: expect.stringContaining(normalizedReason) }),
      expect.objectContaining({
        idempotencyKey: `initiative-donation-review:${DONATION_ID}:rejected`,
      })
    );
    expect(mockPersistMemberNotification.mock.invocationCallOrder[0])
      .toBeLessThan(mockClientQuery.mock.invocationCallOrder[commitIndex]);
    expect(mockClientQuery.mock.invocationCallOrder[commitIndex])
      .toBeLessThan(mockSendPushNotification.mock.invocationCallOrder[0]);
  });

  test('does not reject a contribution that was already approved', async () => {
    configureTransaction({
      lockedDonation: contribution({
        status: 'completed',
        approved_by: ORIGINAL_REVIEWER_ID,
        approval_date: '2026-08-09T07:30:00.000Z',
      }),
    });

    const response = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/reject`)
      .set('x-test-role', 'admin')
      .send({ reason: 'الإيصال السابق غير واضح ولا يثبت التحويل' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('INITIATIVE_DONATION_NOT_PENDING');
    expect(mockClientQuery.mock.calls.some(([sql]) =>
      String(sql).includes('UPDATE initiative_donations')
    )).toBe(false);
    expect(mockPersistMemberNotification).not.toHaveBeenCalled();
  });

  test('fails closed when the canonical rejection-audit migration is not applied', async () => {
    const legacyDonation = contribution();
    delete legacyDonation.rejection_reason;
    delete legacyDonation.rejected_by_id;
    delete legacyDonation.rejected_at;
    delete legacyDonation.updated_at;
    configureTransaction({
      lockedDonation: legacyDonation,
      updatedDonation: { ...legacyDonation, status: 'rejected' },
    });

    const response = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/reject`)
      .set('x-test-role', 'admin')
      .send({ reason: 'الإيصال المرفق غير واضح ولا يمكن التحقق منه' });

    expect(response.status).toBe(503);
    expect(response.body.code).toBe('INITIATIVE_REVIEW_SCHEMA_NOT_READY');
    expect(mockClientQuery.mock.calls.some(([sql]) =>
      String(sql).includes('UPDATE initiative_donations')
    )).toBe(false);
  });

  test('requires a meaningful rejection reason before opening a transaction', async () => {
    for (const reason of ['', 'قصير', '...............', '،،،،،،،،،،،،']) {
      const response = await request(app)
        .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/reject`)
        .set('x-test-role', 'admin')
        .send({ reason });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/10 إلى 500/);
    }
    expect(mockGetClient).not.toHaveBeenCalled();
  });

  test('treats the same rejection as an idempotent replay and preserves its audit', async () => {
    const originalReason = 'الإيصال السابق غير واضح ولا يثبت التحويل';
    const originalRejection = contribution({
      status: 'rejected',
      rejection_reason: originalReason,
      rejected_by_id: ORIGINAL_REVIEWER_ID,
      rejected_at: '2026-08-09T07:30:00.000Z',
    });
    configureTransaction({ lockedDonation: originalRejection });
    mockPersistMemberNotification.mockResolvedValueOnce({
      notificationId: 'rejection-notification-1',
      created: false,
    });

    const response = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/reject`)
      .set('x-test-role', 'super_admin')
      .send({ reason: originalReason });

    expect(response.status).toBe(200);
    expect(response.body.idempotent_replay).toBe(true);
    expect(response.body.donation).toEqual(expect.objectContaining({
      rejection_reason: originalReason,
      rejected_by_id: ORIGINAL_REVIEWER_ID,
      rejected_at: '2026-08-09T07:30:00.000Z',
    }));
    expect(mockClientQuery.mock.calls.some(([sql]) =>
      String(sql).includes('UPDATE initiative_donations')
    )).toBe(false);
    expect(mockPersistMemberNotification).toHaveBeenCalledWith(
      MEMBER_ID,
      expect.objectContaining({ body: expect.stringContaining(originalReason) }),
      expect.objectContaining({
        idempotencyKey: `initiative-donation-review:${DONATION_ID}:rejected`,
      })
    );
    expect(mockSendPushNotification).toHaveBeenCalledTimes(1);
  });

  test('does not replay a rejected legacy row with missing reviewer audit', async () => {
    const originalReason = 'الإيصال السابق غير واضح ولا يثبت التحويل';
    configureTransaction({
      lockedDonation: contribution({
        status: 'rejected',
        rejection_reason: originalReason,
        rejected_by_id: null,
        rejected_at: null,
      }),
    });

    const response = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/reject`)
      .set('x-test-role', 'admin')
      .send({ reason: originalReason });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('INITIATIVE_REJECTION_AUDIT_INCOMPLETE');
    expect(mockPersistMemberNotification).not.toHaveBeenCalled();
    expect(mockSendPushNotification).not.toHaveBeenCalled();
  });

  test('keeps the first rejection audit immutable on a conflicting replay', async () => {
    configureTransaction({
      lockedDonation: contribution({
        status: 'rejected',
        rejection_reason: 'الإيصال السابق غير واضح ولا يثبت التحويل',
        rejected_by_id: ORIGINAL_REVIEWER_ID,
        rejected_at: '2026-08-09T07:30:00.000Z',
      }),
    });

    const response = await request(app)
      .patch(`/api/initiatives-enhanced/donations/${DONATION_ID}/reject`)
      .set('x-test-role', 'super_admin')
      .send({ reason: 'سبب مختلف تماماً بعد اكتمال قرار الرفض السابق' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('INITIATIVE_REJECTION_AUDIT_IMMUTABLE');
    expect(mockClientQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE initiative_donations')))
      .toBe(false);
    expect(mockPersistMemberNotification).not.toHaveBeenCalled();
    expect(mockSendPushNotification).not.toHaveBeenCalled();
  });
});
