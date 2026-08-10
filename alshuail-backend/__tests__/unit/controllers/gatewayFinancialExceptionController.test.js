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
  listGatewayFinancialExceptions,
  reviewGatewayFinancialException,
} = await import('../../../src/controllers/gatewayFinancialExceptionController.js');

const EXCEPTION_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';

const makeResponse = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

const makeRequest = (overrides = {}) => ({
  params: { id: EXCEPTION_ID },
  query: {},
  body: {
    review_status: 'resolved',
    review_notes: 'تمت مطابقة العملية مع كشف ميسر ومعالجتها مالياً',
  },
  user: { id: ADMIN_ID, role: 'super_admin' },
  headers: { 'user-agent': 'Jest' },
  ip: '127.0.0.1',
  ...overrides,
});

const projectedItem = (overrides = {}) => ({
  id: EXCEPTION_ID,
  payment_id: '33333333-3333-4333-8333-333333333333',
  reference_number: 'MOY-TEST',
  member_id: '44444444-4444-4444-8444-444444444444',
  member_name: 'عضو اختبار',
  member_phone: '+966500000000',
  gateway_provider: 'moyasar',
  gateway_payment_id: '33333333-3333-4333-8333-333333333333',
  provider_status: 'refunded',
  exception_kind: 'partial_refund',
  expected_minor: '10000',
  actual_minor: '1000',
  currency: 'SAR',
  evidence: {
    id: '33333333-3333-4333-8333-333333333333',
    status: 'refunded',
    amount: 10000,
    refunded: 1000,
    source: { type: 'applepay', number: '4242' },
  },
  occurrence_count: 1,
  review_status: 'open',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetClient.mockResolvedValue({ query: mockClientQuery, release: mockRelease });
  mockLogAdminAction.mockResolvedValue({ success: true });
});

describe('gateway financial exception review queue', () => {
  test('lists a whitelisted projection with total count and no raw provider response', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...projectedItem(), total_count: '1' }],
    });
    const res = makeResponse();

    await listGatewayFinancialExceptions(makeRequest({
      query: { review_status: 'open', limit: '25', offset: '0' },
    }), res);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('jsonb_strip_nulls(jsonb_build_object');
    expect(sql).not.toMatch(/SELECT\s+e\.\*/i);
    expect(params).toEqual(['open', 25, 0]);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ total: 1 }),
    }));
    expect(payload.data.items[0]).not.toHaveProperty('provider_response');
    expect(JSON.stringify(payload)).not.toContain('source.token');
  });

  test('rejects invalid pagination before querying the database', async () => {
    const res = makeResponse();
    await listGatewayFinancialExceptions(makeRequest({ query: { limit: '5000' } }), res);

    expect(mockQuery).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'INVALID_PAGINATION',
    }));
  });

  test('records a final review without mutating the linked payment or balance', async () => {
    mockClientQuery.mockImplementation(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {return { rows: [] };}
      if (sql.includes('FOR UPDATE')) {
        return { rows: [{ id: EXCEPTION_ID, review_status: 'open', review_notes: null }] };
      }
      if (sql.includes('UPDATE gateway_financial_exceptions')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('FROM gateway_financial_exceptions e')) {
        return { rows: [projectedItem({ review_status: 'resolved' })] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const res = makeResponse();

    await reviewGatewayFinancialException(makeRequest(), res);

    const updateSql = mockClientQuery.mock.calls.find(([sql]) =>
      sql.includes('UPDATE gateway_financial_exceptions'))?.[0];
    expect(updateSql).toBeTruthy();
    expect(mockClientQuery.mock.calls.some(([sql]) => /UPDATE\s+payments/i.test(sql))).toBe(false);
    expect(mockClientQuery.mock.calls.some(([sql]) => /current_balance/i.test(sql))).toBe(false);
    expect(mockLogAdminAction).toHaveBeenCalledWith(expect.objectContaining({
      action: 'gateway_financial_exception_reviewed',
      resourceId: EXCEPTION_ID,
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      idempotent_replay: false,
    }));
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  test('rejects a conflicting second review and rolls back', async () => {
    mockClientQuery.mockImplementation(async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {return { rows: [] };}
      if (sql.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: EXCEPTION_ID,
            review_status: 'dismissed',
            review_notes: 'سبب سابق مختلف ومكتمل للمراجعة',
          }],
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const res = makeResponse();

    await reviewGatewayFinancialException(makeRequest(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'FINANCIAL_EXCEPTION_ALREADY_REVIEWED',
    }));
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  test('requires meaningful review notes before opening a transaction', async () => {
    const res = makeResponse();
    await reviewGatewayFinancialException(makeRequest({
      body: { review_status: 'resolved', review_notes: 'قصير' },
    }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockGetClient).not.toHaveBeenCalled();
  });
});
