import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockFetchPayment = jest.fn();
const mockApplyProviderState = jest.fn();
const mockGetMoyasarGatewayOperationalReadiness = jest.fn();

const mockConfig = {
  paymentGateway: {
    reconciliationEnabled: true,
    provider: 'moyasar',
    currency: 'SAR',
    moyasar: { secretKey: 'sk_test_reconciliation' },
  },
};

jest.unstable_mockModule('../../../src/config/env.js', () => ({ config: mockConfig }));
jest.unstable_mockModule('../../../src/services/database.js', () => ({ query: mockQuery }));
jest.unstable_mockModule('../../../src/controllers/paymentGatewayController.js', () => ({
  updatePaymentFromMoyasar: mockApplyProviderState,
}));
jest.unstable_mockModule('../../../src/services/moyasarService.js', () => ({
  fetchMoyasarPayment: mockFetchPayment,
  getMoyasarGatewayOperationalReadiness: mockGetMoyasarGatewayOperationalReadiness,
  sanitizeMoyasarPaymentEvidence: jest.fn((payment) => ({
    id: payment?.id || null,
    status: String(payment?.status || '').toLowerCase() || null,
    amount: payment?.amount ?? null,
    currency: String(payment?.currency || '').toUpperCase() || null,
  })),
}));
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const {
  drainGatewayReconciliationQueue,
  reconcileGatewayPayments,
  startGatewayReconciliationScheduler,
} = await import(
  '../../../src/services/gatewayReconciliationService.js'
);

const PAYMENT_ID = '11111111-1111-4111-8111-111111111111';
const CLAIM_TOKEN = '22222222-2222-4222-8222-222222222222';

function payment(overrides = {}) {
  return {
    id: PAYMENT_ID,
    payer_id: '33333333-3333-4333-8333-333333333333',
    beneficiary_id: '33333333-3333-4333-8333-333333333333',
    category: 'subscription',
    status: 'paid',
    amount: '100.00',
    gateway_provider: 'moyasar',
    gateway_payment_id: PAYMENT_ID,
    gateway_amount_minor: 10000,
    gateway_currency: 'SAR',
    gateway_verified_at: '2026-08-10T10:00:00.000Z',
    created_at: '2026-08-10T09:00:00.000Z',
    claim_token: CLAIM_TOKEN,
    consecutive_failures: 0,
    ...overrides,
  };
}

function providerEvidence(status = 'paid', overrides = {}) {
  return {
    id: PAYMENT_ID,
    status,
    amount: 10000,
    currency: 'SAR',
    ...overrides,
  };
}

function installClaim(candidate = payment()) {
  mockQuery
    .mockResolvedValueOnce({ rows: [candidate], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ payment_id: candidate.id }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ payment_id: candidate.id }], rowCount: 1 });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConfig.paymentGateway.reconciliationEnabled = true;
  mockConfig.paymentGateway.provider = 'moyasar';
  mockConfig.paymentGateway.moyasar.secretKey = 'sk_test_reconciliation';
  mockFetchPayment.mockResolvedValue(providerEvidence());
  mockApplyProviderState.mockResolvedValue(payment());
  mockGetMoyasarGatewayOperationalReadiness.mockResolvedValue({ ready: true });
});

describe('durable gateway reconciliation', () => {
  test('scheduler startup forces one refresh of the final schema readiness cache', async () => {
    const stop = startGatewayReconciliationScheduler();
    await Promise.resolve();

    expect(mockGetMoyasarGatewayOperationalReadiness).toHaveBeenCalledWith({
      forceRefresh: true,
    });
    expect(typeof stop).toBe('function');
    stop();
  });

  test('disabled kill switch exits before any database or provider call', async () => {
    mockConfig.paymentGateway.reconciliationEnabled = false;

    await expect(reconcileGatewayPayments()).resolves.toMatchObject({
      skipped: true,
      examined: 0,
    });
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockFetchPayment).not.toHaveBeenCalled();
    expect(mockApplyProviderState).not.toHaveBeenCalled();
  });

  test('claims both submitted-v2 open rows and verified legacy settled rows without starvation', async () => {
    installClaim();

    const result = await reconcileGatewayPayments({ limit: 12 });

    const [claimSql, claimParams] = mockQuery.mock.calls[0];
    expect(claimSql).toContain("LOWER(BTRIM(p.gateway_provider)) = 'moyasar'");
    expect(claimSql).toContain("p.status IN ('pending', 'pending_verification')");
    expect(claimSql).toContain('p.gateway_protocol_version = 2');
    expect(claimSql).toContain('COALESCE(p.gateway_protocol_version, 0) <> 2');
    expect(claimSql).toContain("p.status IN ('paid', 'pending_refund')");
    expect(claimSql).toContain("p.status = 'cancelled'");
    expect(claimSql).toContain("p.gateway_status = 'not_submitted'");
    expect(claimSql).toContain('p.gateway_abandoned_at');
    expect(claimSql).toContain('FOR UPDATE OF p SKIP LOCKED');
    expect(claimSql).toContain('p.gateway_verified_at IS NOT NULL');
    expect(claimSql).toContain('state.next_check_at <= NOW()');
    expect(claimSql).toContain('ON CONFLICT (payment_id) DO UPDATE');
    expect(claimParams[3]).toBe(12);
    expect(claimParams[4]).toBe(30);
    expect(result).toMatchObject({ examined: 1, reconciled: 1, failed: 0 });
    expect(mockApplyProviderState).toHaveBeenCalledWith(expect.objectContaining({
      evidenceSource: 'reconciliation',
    }));
  });

  test('renews and fences the DB lease after provider IO before mutating money state', async () => {
    installClaim();

    await reconcileGatewayPayments();

    const renewCall = mockQuery.mock.calls[1];
    expect(renewCall[0]).toContain('lease_expires_at > NOW()');
    expect(renewCall[0]).toContain('RETURNING payment_id');
    expect(mockApplyProviderState).toHaveBeenCalledTimes(1);
  });

  test('a worker that lost its lease never applies stale provider evidence', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [payment()], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const result = await reconcileGatewayPayments();

    expect(result).toMatchObject({ lost_lease: 1, reconciled: 0 });
    expect(mockApplyProviderState).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  test('does not report success when ownership is lost before cursor completion', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [payment()], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ payment_id: PAYMENT_ID }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const result = await reconcileGatewayPayments();

    expect(mockApplyProviderState).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ lost_lease: 1, reconciled: 0 });
  });

  test('terminal provider state stops future checks', async () => {
    installClaim();
    mockFetchPayment.mockResolvedValue(providerEvidence('refunded', {
      refunded: 10000,
      refunded_at: '2026-08-10T12:00:00.000Z',
    }));
    mockApplyProviderState.mockResolvedValue(payment({ status: 'refunded' }));

    const result = await reconcileGatewayPayments();

    expect(result).toMatchObject({ terminal: 1, reconciled: 1 });
    const completionParams = mockQuery.mock.calls[2][1];
    expect(completionParams[2]).toBeNull();
    expect(completionParams[4]).toBe('terminal');
  });

  test('keeps a recent locally abandoned identity scheduled while provider state is nonterminal', async () => {
    const abandoned = payment({
      status: 'cancelled',
      gateway_status: 'not_submitted',
      gateway_protocol_version: 2,
      gateway_submission_started_at: null,
      gateway_abandoned_at: new Date().toISOString(),
      gateway_verified_at: null,
    });
    installClaim(abandoned);
    mockFetchPayment.mockResolvedValue(providerEvidence('authorized'));
    mockApplyProviderState.mockResolvedValue(abandoned);

    const result = await reconcileGatewayPayments();

    expect(result).toMatchObject({ reconciled: 1, terminal: 0, failed: 0 });
    const completionParams = mockQuery.mock.calls[2][1];
    expect(completionParams[2]).toEqual(expect.any(String));
    expect(completionParams[4]).toBe('checked');
  });

  test('stops reconciling an abandoned identity only after verified provider terminal state', async () => {
    const abandoned = payment({
      status: 'cancelled',
      gateway_status: 'not_submitted',
      gateway_protocol_version: 2,
      gateway_submission_started_at: null,
      gateway_abandoned_at: new Date().toISOString(),
      gateway_verified_at: null,
    });
    const verifiedVoided = payment({
      status: 'cancelled',
      gateway_status: 'voided',
      gateway_verified_at: new Date().toISOString(),
    });
    installClaim(abandoned);
    mockFetchPayment.mockResolvedValue(providerEvidence('voided'));
    mockApplyProviderState.mockResolvedValue(verifiedVoided);

    const result = await reconcileGatewayPayments();

    expect(result).toMatchObject({ reconciled: 1, terminal: 1, failed: 0 });
    const completionParams = mockQuery.mock.calls[2][1];
    expect(completionParams[2]).toBeNull();
    expect(completionParams[4]).toBe('terminal');
  });

  test('partial or contradictory provider evidence remains in the review queue', async () => {
    installClaim();
    const error = new Error('partial refund requires review');
    error.reviewRequired = true;
    mockApplyProviderState.mockRejectedValue(error);

    const result = await reconcileGatewayPayments();

    expect(result).toMatchObject({ review_required: 1, failed: 0 });
    const completionParams = mockQuery.mock.calls[2][1];
    expect(completionParams[4]).toBe('review_required');
    expect(completionParams[2]).toBeNull();
    expect(completionParams[11]).toBe('gateway_financial_exception');
  });

  test('counts only an authoritative 404 and keeps the identity scheduled below threshold', async () => {
    const notFound = Object.assign(new Error('not found'), { statusCode: 404 });
    mockQuery
      .mockResolvedValueOnce({ rows: [payment()], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ payment_id: PAYMENT_ID }], rowCount: 1 });
    mockFetchPayment.mockRejectedValue(notFound);

    const result = await reconcileGatewayPayments();

    expect(result).toMatchObject({ failed: 1, review_required: 0 });
    const completionParams = mockQuery.mock.calls[1][1];
    expect(completionParams[2]).toEqual(expect.any(String));
    expect(completionParams[4]).toBe('provider_error');
    expect(completionParams[8]).toBe(1);
    expect(completionParams[9]).toEqual(expect.any(String));
    expect(completionParams[10]).toBe(404);
    expect(completionParams[11]).toBeNull();
  });

  test('stops automated polling after four consecutive 404s spanning 24 hours', async () => {
    const firstNotFoundAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const candidate = payment({
      consecutive_not_found: 3,
      first_not_found_at: firstNotFoundAt,
      consecutive_failures: 3,
    });
    mockQuery
      .mockResolvedValueOnce({ rows: [candidate], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ payment_id: PAYMENT_ID }], rowCount: 1 });
    mockFetchPayment.mockRejectedValue(Object.assign(new Error('not found'), { statusCode: 404 }));

    const result = await reconcileGatewayPayments();

    expect(result).toMatchObject({ failed: 0, review_required: 1 });
    const completionParams = mockQuery.mock.calls[1][1];
    expect(completionParams[2]).toBeNull();
    expect(completionParams[4]).toBe('review_required');
    expect(completionParams[8]).toBe(4);
    expect(completionParams[9]).toBe(firstNotFoundAt);
    expect(completionParams[10]).toBe(404);
    expect(completionParams[11]).toBe('provider_not_found_bounded');
    expect(mockApplyProviderState).not.toHaveBeenCalled();
  });

  test('a provider 500 resets the consecutive-404 counter', async () => {
    const candidate = payment({
      consecutive_not_found: 3,
      first_not_found_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    });
    mockQuery
      .mockResolvedValueOnce({ rows: [candidate], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ payment_id: PAYMENT_ID }], rowCount: 1 });
    mockFetchPayment.mockRejectedValue(Object.assign(new Error('provider down'), {
      statusCode: 500,
    }));

    const result = await reconcileGatewayPayments();

    expect(result).toMatchObject({ failed: 1, review_required: 0 });
    const completionParams = mockQuery.mock.calls[1][1];
    expect(completionParams[8]).toBe(0);
    expect(completionParams[9]).toBeNull();
    expect(completionParams[10]).toBe(500);
  });

  test('a 2xx late capture before the 404 boundary still enters refund review', async () => {
    const abandoned = payment({
      status: 'cancelled',
      gateway_status: 'not_submitted',
      gateway_protocol_version: 2,
      gateway_submission_started_at: null,
      gateway_abandoned_at: new Date().toISOString(),
      gateway_verified_at: null,
      consecutive_not_found: 3,
      first_not_found_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    });
    installClaim(abandoned);
    mockFetchPayment.mockResolvedValue(providerEvidence('paid'));
    mockApplyProviderState.mockResolvedValue(payment({
      status: 'pending_refund',
      gateway_status: 'paid',
    }));

    const result = await reconcileGatewayPayments();

    expect(result).toMatchObject({ reconciled: 1, failed: 0, review_required: 0 });
    expect(mockApplyProviderState).toHaveBeenCalledTimes(1);
    const completionParams = mockQuery.mock.calls[2][1];
    expect(completionParams[8]).toBe(0);
    expect(completionParams[9]).toBeNull();
    expect(completionParams[10]).toBeNull();
  });

  test('identity or money evidence mismatch becomes a durable stopped review', async () => {
    installClaim();
    const mismatch = Object.assign(new Error('Gateway payment identity mismatch'), {
      code: 'GATEWAY_PAYMENT_ID_MISMATCH',
      reviewRequired: true,
      reviewReason: 'gateway_evidence_mismatch',
    });
    mockApplyProviderState.mockRejectedValue(mismatch);

    const result = await reconcileGatewayPayments();

    expect(result).toMatchObject({ review_required: 1, failed: 0 });
    const completionParams = mockQuery.mock.calls[2][1];
    expect(completionParams[2]).toBeNull();
    expect(completionParams[4]).toBe('review_required');
    expect(completionParams[6]).toContain('GATEWAY_PAYMENT_ID_MISMATCH');
    expect(completionParams[11]).toBe('gateway_evidence_mismatch');
    expect(completionParams[5]).toMatch(/^[0-9a-f]{64}$/);
  });

  test('provider failure releases the lease with durable bounded backoff', async () => {
    installClaim(payment({ consecutive_failures: 2 }));
    mockFetchPayment.mockRejectedValue(new Error('provider unavailable'));

    const result = await reconcileGatewayPayments();

    expect(result).toMatchObject({ failed: 1, reconciled: 0 });
    const completionParams = mockQuery.mock.calls[1][1];
    expect(completionParams[4]).toBe('provider_error');
    expect(completionParams[7]).toBe(3);
    expect(completionParams[2]).toEqual(expect.any(String));
  });

  test('bounded drain processes more than two full batches until the queue is empty', async () => {
    const reconcileBatch = jest.fn()
      .mockResolvedValueOnce({ examined: 2, reconciled: 2 })
      .mockResolvedValueOnce({ examined: 2, reconciled: 1, failed: 1 })
      .mockResolvedValueOnce({ examined: 1, reconciled: 1 });

    const result = await drainGatewayReconciliationQueue({
      batchSize: 2,
      maxBatches: 5,
      maxDurationMs: 5_000,
      reconcileBatch,
      clock: () => 0,
    });

    expect(reconcileBatch).toHaveBeenCalledTimes(3);
    expect(reconcileBatch).toHaveBeenNthCalledWith(1, { limit: 2 });
    expect(result).toMatchObject({
      examined: 5,
      reconciled: 4,
      failed: 1,
      batches: 3,
      drained: true,
      stopped_reason: 'queue_drained',
    });
  });

  test('bounded drain obeys both batch and elapsed-time caps', async () => {
    const fullBatch = () => ({ examined: 2, reconciled: 2 });
    const byBatch = jest.fn().mockImplementation(fullBatch);
    const batchLimited = await drainGatewayReconciliationQueue({
      batchSize: 2,
      maxBatches: 2,
      maxDurationMs: 5_000,
      reconcileBatch: byBatch,
      clock: () => 0,
    });
    expect(byBatch).toHaveBeenCalledTimes(2);
    expect(batchLimited.stopped_reason).toBe('batch_cap');

    const byTime = jest.fn().mockImplementation(fullBatch);
    const ticks = [0, 20, 20];
    const timeLimited = await drainGatewayReconciliationQueue({
      batchSize: 2,
      maxBatches: 5,
      maxDurationMs: 10,
      reconcileBatch: byTime,
      clock: () => ticks.shift() ?? 20,
    });
    expect(byTime).toHaveBeenCalledTimes(1);
    expect(timeLimited.stopped_reason).toBe('time_cap');
  });
});
