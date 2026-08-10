import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    paymentGateway: {
      provider: 'moyasar',
      currency: 'SAR',
      moyasar: {},
    },
  },
}));

const {
  getMoyasarGatewayOperationalReadiness,
  resetMoyasarGatewayOperationalReadinessCache,
} = await import('../../../src/services/moyasarService.js');

const readyRow = {
  state_table_ready: true,
  state_columns_ready: true,
  required_triggers_ready: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  resetMoyasarGatewayOperationalReadinessCache();
  mockQuery.mockResolvedValue({ rows: [readyRow] });
});

describe('Moyasar reconciliation operational readiness cache', () => {
  test('requires the final state columns and enabled triggers, then serves a bounded cache', async () => {
    const first = await getMoyasarGatewayOperationalReadiness({ now: 1_000 });
    const cached = await getMoyasarGatewayOperationalReadiness({ now: 30_000 });

    expect(first).toMatchObject({ ready: true, code: null });
    expect(cached).toEqual(first);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('gateway_payment_reconciliation_state');
    expect(sql).toContain("t.tgenabled <> 'D'");
    expect(params[1]).toEqual(expect.arrayContaining([
      'consecutive_not_found',
      'first_not_found_at',
      'last_provider_http_status',
      'review_reason',
    ]));
    expect(params[2]).toEqual(expect.arrayContaining([
      'gateway_payment_reconciliation_state',
      'payments',
    ]));
    expect(params[3]).toEqual(expect.arrayContaining([
      'trg_enforce_gateway_reconciliation_operational_state',
      'trg_prevent_gateway_reconciliation_review_delete',
      'trg_enforce_gateway_protocol_v2_state',
      'trg_enforce_gateway_capture_after_abandonment',
      'trg_prevent_gateway_managed_payment_delete',
    ]));
  });

  test('refreshes after TTL or explicit startup refresh and fails closed on an incomplete schema', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [readyRow] })
      .mockResolvedValueOnce({
        rows: [{ ...readyRow, required_triggers_ready: false }],
      })
      .mockRejectedValueOnce(new Error('database unavailable'));

    await expect(getMoyasarGatewayOperationalReadiness({ now: 1_000 }))
      .resolves.toMatchObject({ ready: true });
    await expect(getMoyasarGatewayOperationalReadiness({ now: 61_001 }))
      .resolves.toMatchObject({
        ready: false,
        code: 'PAYMENT_GATEWAY_RECONCILIATION_SCHEMA_NOT_READY',
      });
    await expect(getMoyasarGatewayOperationalReadiness({
      forceRefresh: true,
      now: 62_000,
    })).resolves.toMatchObject({
      ready: false,
      code: 'PAYMENT_GATEWAY_RECONCILIATION_SCHEMA_NOT_READY',
    });
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });

  test('coalesces concurrent startup and request probes into one database query', async () => {
    let resolveProbe;
    mockQuery.mockReturnValue(new Promise((resolve) => {
      resolveProbe = resolve;
    }));

    const first = getMoyasarGatewayOperationalReadiness({ forceRefresh: true, now: 1_000 });
    const second = getMoyasarGatewayOperationalReadiness({ now: 1_000 });
    resolveProbe({ rows: [readyRow] });

    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ ready: true }),
      expect.objectContaining({ ready: true }),
    ]);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
