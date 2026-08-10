import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease = jest.fn();
const mockLogAdminAction = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: mockGetClient,
}));

jest.unstable_mockModule('../../../src/utils/audit-logger.js', () => ({
  logAdminAction: mockLogAdminAction,
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const {
  actOnGatewayReconciliationReview,
  isMeaningfulArabicReconciliationReason,
  listGatewayReconciliationReviews,
} = await import('../../../src/controllers/gatewayReconciliationReviewController.js');

const PAYMENT_ID = '11111111-1111-4111-8111-111111111111';
const ACTOR_ID = '22222222-2222-4222-8222-222222222222';
const ARABIC_REASON = 'تمت مراجعة بيانات العملية وإعادة المحاولة بعد مطابقة الحساب';

const makeResponse = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

const makeRequest = (overrides = {}) => ({
  params: { paymentId: PAYMENT_ID },
  query: {},
  body: {
    payment_id: PAYMENT_ID,
    action: 'requeue',
    reason: ARABIC_REASON,
  },
  user: { id: ACTOR_ID, role: 'super_admin' },
  headers: { 'user-agent': 'Jest reconciliation reviewer' },
  ip: '127.0.0.1',
  ...overrides,
});

const queueRow = (overrides = {}) => ({
  payment_id: PAYMENT_ID,
  payment_reference: 'MOY-20260820-REVIEW',
  member_name: 'عضو اختبار',
  member_phone_masked: '+96••••00',
  category: 'subscription',
  payment_status: 'cancelled',
  amount: '100.00',
  currency: 'SAR',
  gateway_provider: 'moyasar',
  gateway_payment_id_masked: '••••111111111111',
  is_financing: false,
  last_provider_status: null,
  last_provider_http_status: 404,
  last_result: 'review_required',
  review_reason: 'provider_not_found_bounded',
  consecutive_not_found: 4,
  consecutive_failures: 4,
  check_count: 4,
  first_not_found_at: '2026-08-19T00:00:00.000Z',
  last_checked_at: '2026-08-20T00:00:00.000Z',
  evidence_hash_masked: null,
  reconciliation_started_at: '2026-08-18T00:00:00.000Z',
  updated_at: '2026-08-20T00:00:00.000Z',
  ...overrides,
});

const lockedReview = (overrides = {}) => ({
  payment_id: PAYMENT_ID,
  last_result: 'review_required',
  review_reason: 'provider_not_found_bounded',
  check_count: 4,
  consecutive_not_found: 4,
  consecutive_failures: 4,
  last_provider_http_status: 404,
  last_provider_status: null,
  last_evidence_hash: null,
  last_checked_at: '2026-08-20T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetClient.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
  mockLogAdminAction.mockResolvedValue({ success: true });
});

describe('gateway reconciliation review queue controller', () => {
  test('accepts only meaningful Arabic review reasons', () => {
    expect(isMeaningfulArabicReconciliationReason(ARABIC_REASON)).toBe(true);
    expect(isMeaningfulArabicReconciliationReason('review after provider lookup')).toBe(false);
    expect(isMeaningfulArabicReconciliationReason('سبب قصير')).toBe(false);
  });

  test('lists only review-required rows through a masked whitelist and pagination', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ identity_source: 'users', current_role: 'financial_manager' }],
      })
      .mockResolvedValueOnce({ rows: [{ ...queueRow(), total_count: '1' }] });
    const res = makeResponse();

    await listGatewayReconciliationReviews(makeRequest({
      user: { id: ACTOR_ID, role: 'financial_manager' },
      query: { status: 'review_required', page: '2', limit: '20' },
    }), res);

    const [principalSql, principalParams] = mockQuery.mock.calls[0];
    expect(principalSql).toContain('users.is_active IS TRUE');
    expect(principalSql).toContain("members.membership_status = 'active'");
    expect(principalSql).toContain('members.suspended_at IS NULL');
    expect(principalSql).toContain('members.reactivated_at >= members.suspended_at');
    expect(principalParams).toEqual([
      ACTOR_ID,
      ['super_admin', 'financial_manager'],
    ]);
    const [sql, params] = mockQuery.mock.calls[1];
    expect(sql).toContain("state.last_result = 'review_required'");
    expect(sql).toContain('gateway_payment_id_masked');
    expect(sql).toContain('member_phone_masked');
    expect(sql).not.toMatch(/SELECT\s+(state|p)\.\*/i);
    expect(sql).not.toContain('gateway_response');
    expect(params).toEqual([20, 20]);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data).toMatchObject({
      total: 1,
      page: 2,
      limit: 20,
      total_pages: 1,
      status: 'review_required',
    });
    expect(payload.data.items[0]).not.toHaveProperty('gateway_payment_id');
    expect(payload.data.items[0]).not.toHaveProperty('gateway_response');
  });

  test('rejects a disabled or no-longer-privileged reader before reading the queue', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = makeResponse();

    await listGatewayReconciliationReviews(makeRequest({
      user: { id: ACTOR_ID, role: 'financial_manager' },
    }), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'RECONCILIATION_REVIEWER_NOT_PRIVILEGED',
    }));
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('rejects non-review status and out-of-range pagination before querying', async () => {
    const invalidStatusResponse = makeResponse();
    await listGatewayReconciliationReviews(makeRequest({
      query: { status: 'all' },
    }), invalidStatusResponse);
    expect(invalidStatusResponse.status).toHaveBeenCalledWith(400);
    expect(invalidStatusResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'INVALID_RECONCILIATION_REVIEW_STATUS',
    }));

    const invalidPageResponse = makeResponse();
    await listGatewayReconciliationReviews(makeRequest({
      query: { page: '0', limit: '1000' },
    }), invalidPageResponse);
    expect(invalidPageResponse.status).toHaveBeenCalledWith(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('requeues only the reconciliation cursor under lock and writes immutable audit evidence', async () => {
    mockClientQuery.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {return { rows: [] };}
      if (sql.includes('FROM users') && sql.includes('UNION ALL')) {
        return { rows: [{ identity_source: 'users' }] };
      }
      if (sql.includes('FOR UPDATE OF state')) {return { rows: [lockedReview()] };}
      if (sql.includes('UPDATE gateway_payment_reconciliation_state')) {
        return {
          rows: [{
            payment_id: PAYMENT_ID,
            last_result: 'checked',
            next_check_at: '2026-08-20T10:00:00.000Z',
            updated_at: '2026-08-20T10:00:00.000Z',
          }],
        };
      }
      if (sql.includes('INSERT INTO gateway_reconciliation_review_actions')) {
        return { rows: [{ id: 'audit-action-1', created_at: '2026-08-20T10:00:00.000Z' }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const res = makeResponse();

    await actOnGatewayReconciliationReview(makeRequest(), res);

    const updateSql = mockClientQuery.mock.calls.find(([sql]) =>
      sql.includes('UPDATE gateway_payment_reconciliation_state'))?.[0];
    expect(updateSql).toContain("last_result = 'checked'");
    expect(updateSql).toContain('next_check_at = NOW()');
    expect(updateSql).toContain('consecutive_not_found = 0');
    const allSql = mockClientQuery.mock.calls.map(([sql]) => sql).join('\n');
    expect(allSql).not.toMatch(/UPDATE\s+payments/i);
    expect(allSql).not.toMatch(/UPDATE\s+members/i);
    expect(allSql).not.toMatch(/UPDATE\s+financing_/i);
    expect(mockLogAdminAction).toHaveBeenCalledWith(expect.objectContaining({
      action: 'gateway_reconciliation_review_requeued',
      resourceId: PAYMENT_ID,
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ action: 'requeue', state: 'checked' }),
    }));
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  test('resolves automation terminally while preserving payment and evidence rows', async () => {
    mockClientQuery.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {return { rows: [] };}
      if (sql.includes('FROM users') && sql.includes('UNION ALL')) {
        return { rows: [{ identity_source: 'users' }] };
      }
      if (sql.includes('FOR UPDATE OF state')) {
        return { rows: [lockedReview({ review_reason: 'gateway_evidence_mismatch' })] };
      }
      if (sql.includes('UPDATE gateway_payment_reconciliation_state')) {
        return {
          rows: [{
            payment_id: PAYMENT_ID,
            last_result: 'terminal',
            next_check_at: null,
            updated_at: '2026-08-20T10:00:00.000Z',
          }],
        };
      }
      if (sql.includes('INSERT INTO gateway_reconciliation_review_actions')) {
        return { rows: [{ id: 'audit-action-2', created_at: '2026-08-20T10:00:00.000Z' }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const res = makeResponse();

    await actOnGatewayReconciliationReview(makeRequest({
      body: { payment_id: PAYMENT_ID, action: 'resolve', reason: ARABIC_REASON },
    }), res);

    const updateSql = mockClientQuery.mock.calls.find(([sql]) =>
      sql.includes('UPDATE gateway_payment_reconciliation_state'))?.[0];
    expect(updateSql).toContain("last_result = 'terminal'");
    expect(updateSql).toContain('next_check_at = NULL');
    expect(updateSql).not.toContain('last_evidence_hash =');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'resolve', state: 'terminal' }),
    }));
  });

  test('requires exact body/path payment identity and super-admin role before opening a transaction', async () => {
    const mismatchedId = '33333333-3333-4333-8333-333333333333';
    const mismatchResponse = makeResponse();
    await actOnGatewayReconciliationReview(makeRequest({
      body: { payment_id: mismatchedId, action: 'resolve', reason: ARABIC_REASON },
    }), mismatchResponse);
    expect(mismatchResponse.status).toHaveBeenCalledWith(400);
    expect(mismatchResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'RECONCILIATION_PAYMENT_ID_MISMATCH',
    }));

    const financialManagerResponse = makeResponse();
    await actOnGatewayReconciliationReview(makeRequest({
      user: { id: ACTOR_ID, role: 'financial_manager' },
    }), financialManagerResponse);
    expect(financialManagerResponse.status).toHaveBeenCalledWith(403);
    expect(mockGetClient).not.toHaveBeenCalled();
  });

  test('accepts a member-backed super-admin identity and records its explicit provenance', async () => {
    mockClientQuery.mockImplementation((sql, params) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {return { rows: [] };}
      if (sql.includes('FROM users') && sql.includes('UNION ALL')) {
        expect(params).toEqual([ACTOR_ID, ['super_admin']]);
        return { rows: [{ identity_source: 'members' }] };
      }
      if (sql.includes('FOR UPDATE OF state')) {return { rows: [lockedReview()] };}
      if (sql.includes('UPDATE gateway_payment_reconciliation_state')) {
        return {
          rows: [{
            payment_id: PAYMENT_ID,
            last_result: 'checked',
            next_check_at: '2026-08-20T10:00:00.000Z',
            updated_at: '2026-08-20T10:00:00.000Z',
          }],
        };
      }
      if (sql.includes('INSERT INTO gateway_reconciliation_review_actions')) {
        expect(params[4]).toBe('members');
        return { rows: [{ id: 'audit-action-member', created_at: '2026-08-20T10:00:00.000Z' }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const res = makeResponse();

    await actOnGatewayReconciliationReview(makeRequest(), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test.each([
    ['disabled users principal'],
    ['inactive members principal'],
    ['suspended members principal'],
  ])('rejects %s before locking or changing a review cursor', async () => {
    mockClientQuery.mockImplementation((sql, params) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {return { rows: [] };}
      if (sql.includes('FROM users') && sql.includes('UNION ALL')) {
        expect(params).toEqual([ACTOR_ID, ['super_admin']]);
        return { rows: [] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const res = makeResponse();

    await actOnGatewayReconciliationReview(makeRequest(), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'RECONCILIATION_REVIEWER_NOT_PRIVILEGED',
    }));
    expect(mockClientQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('FOR UPDATE OF state'),
      expect.anything()
    );
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
  });

  test('returns conflict and rolls back when another reviewer already dispositioned the row', async () => {
    mockClientQuery.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {return { rows: [] };}
      if (sql.includes('FROM users') && sql.includes('UNION ALL')) {
        return { rows: [{ identity_source: 'users' }] };
      }
      if (sql.includes('FOR UPDATE OF state')) {
        return { rows: [lockedReview({ last_result: 'terminal', review_reason: null })] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const res = makeResponse();

    await actOnGatewayReconciliationReview(makeRequest(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'RECONCILIATION_REVIEW_ALREADY_DISPOSITIONED',
    }));
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });
});
