import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};
const mockGetClient = jest.fn();
const mockRecordGatewayFinancialException = jest.fn();

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  getClient: mockGetClient,
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: {
    financingRepayment: { businessTimeZone: 'Asia/Riyadh' },
  },
}));

jest.unstable_mockModule('../../../src/services/financingRepaymentService.js', () => ({
  recordGatewayFinancialException: mockRecordGatewayFinancialException,
}));

const { reverseSettledFinancingPayment } = await import(
  '../../../src/services/financingReversalService.js'
);

const IDS = Object.freeze({
  payment: '11111111-1111-4111-8111-111111111111',
  plan: '22222222-2222-4222-8222-222222222222',
  member: '33333333-3333-4333-8333-333333333333',
  installment: '44444444-4444-4444-8444-444444444444',
  allocation: '55555555-5555-4555-8555-555555555555',
  reversal: '66666666-6666-4666-8666-666666666666',
});

const providerResponse = (status = 'refunded') => ({
  id: IDS.payment,
  given_id: IDS.payment,
  status,
  amount: 10000,
  currency: 'SAR',
  refunded: status === 'refunded' ? 10000 : 0,
  refunded_at: status === 'refunded' ? '2026-08-10T01:00:00.000Z' : null,
  captured: status === 'voided' ? 10000 : 0,
  voided_at: status === 'voided' ? '2026-08-10T01:00:00.000Z' : null,
});

const paidPlan = {
  id: IDS.plan,
  member_id: IDS.member,
  total_amount: '100.00',
  outstanding_amount: '0.00',
  status: 'paid',
  paid_at: '2026-08-10T00:00:00.000Z',
};

const paidPayment = {
  id: IDS.payment,
  payer_id: IDS.member,
  amount: '100.00',
  status: 'paid',
  financing_plan_id: IDS.plan,
  financing_payment_scope: 'all',
  gateway_provider: 'moyasar',
  gateway_payment_id: IDS.payment,
  gateway_status: 'paid',
  gateway_amount_minor: 10000,
  gateway_currency: 'SAR',
  gateway_response: providerResponse('paid'),
};

function successfulQuery(sql) {
  if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
    return { rows: [], rowCount: null };
  }
  if (sql.includes('SELECT financing_plan_id') && sql.includes('FROM payments')) {
    return { rows: [{ financing_plan_id: IDS.plan }] };
  }
  if (sql.includes('FROM financing_repayment_plans') && sql.includes('FOR UPDATE')) {
    return { rows: [paidPlan] };
  }
  if (sql.includes('FROM payments') && sql.includes('financing_plan_id = $2') && sql.includes('FOR UPDATE')) {
    return { rows: [paidPayment] };
  }
  if (sql.includes('FROM financing_payment_reversals') && !sql.includes('INSERT')) {
    return { rows: [] };
  }
  if (sql.includes('FROM financing_payment_allocations a') && sql.includes('FOR UPDATE OF i')) {
    return {
      rows: [{
        original_allocation_id: IDS.allocation,
        payment_id: IDS.payment,
        plan_id: IDS.plan,
        installment_id: IDS.installment,
        allocation_amount: '100.00',
        installment_number: 1,
        due_date: '2026-09-01',
        installment_amount: '100.00',
        paid_amount: '100.00',
        installment_status: 'paid',
        paid_at: '2026-08-10T00:00:00.000Z',
      }],
    };
  }
  if (sql.includes('FROM financing_reminder_log') && sql.includes('FOR UPDATE')) {
    return { rows: [{ id: 'reminder-1' }] };
  }
  if (sql.includes('INSERT INTO financing_payment_reversals')) {
    return {
      rows: [{
        id: IDS.reversal,
        payment_id: IDS.payment,
        plan_id: IDS.plan,
        member_id: IDS.member,
        reversal_kind: 'refund',
        target_payment_status: 'refunded',
        gateway_provider: 'moyasar',
        gateway_payment_id: IDS.payment,
        provider_status: 'refunded',
        amount_minor: 10000,
        currency: 'SAR',
      }],
      rowCount: 1,
    };
  }
  if (sql.includes('INSERT INTO financing_payment_reversal_allocations')) {
    return { rows: [], rowCount: 1 };
  }
  if (sql.includes('UPDATE financing_installments')) {
    return {
      rows: [{
        id: IDS.installment,
        installment_number: 1,
        due_date: '2026-09-01',
        amount: '100.00',
        paid_amount: '0.00',
        status: 'scheduled',
        paid_at: null,
      }],
      rowCount: 1,
    };
  }
  if (sql.includes('INSERT INTO financing_reminder_generation_history')) {
    return { rows: [], rowCount: 6 };
  }
  if (sql.includes('INSERT INTO financing_reminder_log')) {
    return { rows: [], rowCount: 6 };
  }
  if (sql.includes('BOOL_OR(') && sql.includes('FROM financing_installments')) {
    return { rows: [{ paid_minor: '0', has_overdue: false }] };
  }
  if (sql.includes('UPDATE financing_repayment_plans')) {
    return {
      rows: [{ ...paidPlan, outstanding_amount: '100.00', status: 'active', paid_at: null }],
      rowCount: 1,
    };
  }
  if (sql.includes('INSERT INTO financing_balance_transactions')) {
    return { rows: [], rowCount: 1 };
  }
  if (sql.includes('UPDATE payments')) {
    return {
      rows: [{
        ...paidPayment,
        status: 'refunded',
        gateway_status: 'refunded',
        gateway_response: providerResponse(),
        gateway_failure_reason: 'FINANCING_PROVIDER_FULL_REFUND',
      }],
      rowCount: 1,
    };
  }
  throw new Error(`Unexpected SQL: ${sql}`);
}

describe('financing provider reversal core', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClient.mockResolvedValue(mockClient);
    mockClient.query.mockImplementation(successfulQuery);
    mockRecordGatewayFinancialException.mockResolvedValue({
      evidenceHash: 'a'.repeat(64),
      reviewReason: 'partial refund',
      exceptionRecord: { id: '77777777-7777-4777-8777-777777777777', review_status: 'open' },
    });
  });

  test('restores the plan and installments with append-only reversal evidence', async () => {
    const result = await reverseSettledFinancingPayment({
      paymentId: IDS.payment,
      gatewayPaymentId: IDS.payment,
      gatewayProvider: 'moyasar',
      gatewayResponse: providerResponse(),
      evidenceSource: 'webhook',
    });

    expect(result.idempotent_replay).toBe(false);
    expect(result.payment.status).toBe('refunded');
    expect(result.plan).toEqual(expect.objectContaining({
      outstanding_amount: '100.00',
      status: 'active',
      paid_at: null,
    }));
    expect(result.reopened_installment_ids).toEqual([IDS.installment]);
    expect(new Set(result.reopened_installment_ids).size).toBe(
      result.reopened_installment_ids.length
    );

    const statements = mockClient.query.mock.calls.map(([sql]) => sql);
    const planLock = statements.findIndex((sql) =>
      sql.includes('FROM financing_repayment_plans') && sql.includes('FOR UPDATE'));
    const paymentLock = statements.findIndex((sql) =>
      sql.includes('FROM payments') && sql.includes('financing_plan_id = $2') && sql.includes('FOR UPDATE'));
    const installmentLock = statements.findIndex((sql) => sql.includes('FOR UPDATE OF i'));
    const reminderLock = statements.findIndex((sql) =>
      sql.includes('FROM financing_reminder_log') && sql.includes('FOR UPDATE'));
    expect(planLock).toBeGreaterThan(-1);
    expect(planLock).toBeLessThan(paymentLock);
    expect(paymentLock).toBeLessThan(installmentLock);
    expect(installmentLock).toBeLessThan(reminderLock);

    expect(statements.some((sql) => sql.includes('INSERT INTO financing_payment_reversals'))).toBe(true);
    expect(statements.some((sql) => sql.includes('INSERT INTO financing_payment_reversal_allocations'))).toBe(true);
    expect(statements.some((sql) => sql.includes('INSERT INTO financing_reminder_generation_history'))).toBe(true);
    expect(statements.filter((sql) => sql.includes('INSERT INTO financing_reminder_generation_history'))).toHaveLength(1);
    expect(statements.filter((sql) => sql.includes('generation = financing_reminder_log.generation + 1'))).toHaveLength(1);
    expect(statements.some((sql) => sql.includes("'installment_reversal_debit'"))).toBe(true);
    expect(statements.some((sql) => /UPDATE\s+(?:public\.)?members/i.test(sql))).toBe(false);
    expect(statements.some((sql) => /current_balance/i.test(sql))).toBe(false);
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  test('returns an exact stored reversal as an idempotent replay without new mutations', async () => {
    const terminalPayment = {
      ...paidPayment,
      status: 'cancelled',
      gateway_status: 'voided',
      gateway_response: providerResponse('voided'),
    };
    const existingReversal = {
      id: IDS.reversal,
      payment_id: IDS.payment,
      plan_id: IDS.plan,
      member_id: IDS.member,
      reversal_kind: 'void',
      target_payment_status: 'cancelled',
      gateway_provider: 'moyasar',
      gateway_payment_id: IDS.payment,
      provider_status: 'voided',
      amount_minor: 10000,
      currency: 'SAR',
    };
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {return { rows: [] };}
      if (sql.includes('SELECT financing_plan_id')) {return { rows: [{ financing_plan_id: IDS.plan }] };}
      if (sql.includes('FROM financing_repayment_plans') && sql.includes('FOR UPDATE')) {
        return { rows: [paidPlan] };
      }
      if (sql.includes('FROM payments') && sql.includes('FOR UPDATE')) {
        return { rows: [terminalPayment] };
      }
      if (sql.includes('FROM financing_payment_reversals')) {
        return { rows: [existingReversal] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await reverseSettledFinancingPayment({
      paymentId: IDS.payment,
      gatewayPaymentId: IDS.payment,
      gatewayResponse: providerResponse('voided'),
      evidenceSource: 'reconciliation',
    });

    expect(result.idempotent_replay).toBe(true);
    expect(mockClient.query.mock.calls.some(([sql]) => /^INSERT|^UPDATE/.test(sql.trim()))).toBe(false);
  });

  test('rejects non-terminal evidence and durably quarantines a partial refund without reversing', async () => {
    await expect(reverseSettledFinancingPayment({
      paymentId: IDS.payment,
      gatewayPaymentId: IDS.payment,
      gatewayResponse: providerResponse('paid'),
    })).rejects.toMatchObject({ code: 'FINANCING_REVERSAL_NOT_TERMINAL' });
    expect(mockGetClient).not.toHaveBeenCalled();

    const partialEvidence = {
      ...providerResponse('refunded'),
      refunded: 1000,
      token: 'must-never-be-stored',
      source: { token: 'source-secret', name: 'Cardholder' },
    };
    await expect(reverseSettledFinancingPayment({
      paymentId: IDS.payment,
      gatewayPaymentId: IDS.payment,
      gatewayResponse: partialEvidence,
    })).rejects.toMatchObject({
      code: 'FINANCING_PARTIAL_REFUND_REQUIRES_REVIEW',
      statusCode: 409,
      reviewRequired: true,
      reviewRecorded: true,
    });

    expect(mockGetClient).toHaveBeenCalledTimes(1);
    expect(mockRecordGatewayFinancialException).toHaveBeenCalledWith(expect.objectContaining({
      localPayment: paidPayment,
      providerPayment: expect.not.objectContaining({
        token: expect.anything(),
      }),
      exception: expect.objectContaining({
        kind: 'partial_refund',
        expectedMinor: 10000,
        observedMinor: 1000,
      }),
      executeQuery: expect.any(Function),
    }));
    const statements = mockClient.query.mock.calls.map(([sql]) => sql);
    expect(statements).toContain('COMMIT');
    expect(statements).not.toContain('ROLLBACK');
    expect(statements.some((sql) => sql.includes('INSERT INTO financing_payment_reversals')))
      .toBe(false);
    expect(statements.some((sql) => sql.includes('UPDATE financing_installments')))
      .toBe(false);
  });

  test('stores only canonical sanitized provider evidence in reversal and payment rows', async () => {
    const rawEvidence = {
      ...providerResponse('refunded'),
      token: 'top-level-reusable-token',
      name: 'Sensitive Cardholder',
      full: { card: 'raw-card-payload' },
      metadata: { authorization: 'Bearer secret' },
      source: {
        type: 'applepay',
        company: 'visa',
        number: '4111111111114242',
        token: 'source-reusable-token',
        name: 'Sensitive Cardholder',
      },
    };

    await reverseSettledFinancingPayment({
      paymentId: IDS.payment,
      gatewayPaymentId: IDS.payment,
      gatewayResponse: rawEvidence,
    });

    const reversalCall = mockClient.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO financing_payment_reversals'));
    const paymentCall = mockClient.query.mock.calls.find(([sql]) =>
      sql.includes('UPDATE payments'));
    const reversalEvidence = JSON.parse(reversalCall[1][10]);
    const paymentEvidence = JSON.parse(paymentCall[1][3]);
    expect(paymentEvidence).toEqual(reversalEvidence);
    expect(reversalEvidence).toEqual(expect.objectContaining({
      id: IDS.payment,
      status: 'refunded',
      amount: 10000,
      currency: 'SAR',
      refunded: 10000,
      refunded_at: '2026-08-10T01:00:00.000Z',
      source: {
        type: 'applepay',
        company: 'visa',
        number: '4242',
      },
    }));
    expect(JSON.stringify(reversalEvidence)).not.toMatch(
      /top-level-reusable-token|source-reusable-token|Sensitive Cardholder|raw-card-payload|Bearer secret/
    );
  });

  test('accepts authoritative void evidence with the exact full captured basis', async () => {
    const exactCapturedVoid = {
      ...providerResponse('voided'),
      captured: 10000,
    };
    mockClient.query.mockImplementation((sql) => {
      const result = successfulQuery(sql);
      if (sql.includes('INSERT INTO financing_payment_reversals')) {
        return {
          ...result,
          rows: [{
            ...result.rows[0],
            reversal_kind: 'void',
            target_payment_status: 'cancelled',
            provider_status: 'voided',
          }],
        };
      }
      if (sql.includes('UPDATE payments')) {
        return {
          ...result,
          rows: [{
            ...result.rows[0],
            status: 'cancelled',
            gateway_status: 'voided',
            gateway_response: exactCapturedVoid,
            gateway_failure_reason: 'FINANCING_PROVIDER_FULL_VOID',
          }],
        };
      }
      return result;
    });

    await expect(reverseSettledFinancingPayment({
      paymentId: IDS.payment,
      gatewayPaymentId: IDS.payment,
      gatewayResponse: exactCapturedVoid,
    })).resolves.toEqual(expect.objectContaining({
      payment: expect.objectContaining({ status: 'cancelled' }),
      idempotent_replay: false,
    }));

    expect(mockGetClient).toHaveBeenCalledTimes(1);
  });

  test('rejects partial, missing, or untimestamped void evidence before a transaction', async () => {
    for (const invalidEvidence of [
      { ...providerResponse('voided'), captured: 1000 },
      { ...providerResponse('voided'), captured: null },
      { ...providerResponse('voided'), voided_at: null },
    ]) {
      await expect(reverseSettledFinancingPayment({
        paymentId: IDS.payment,
        gatewayPaymentId: IDS.payment,
        gatewayResponse: invalidEvidence,
      })).rejects.toMatchObject({ code: 'FINANCING_VOID_EVIDENCE_INVALID' });
    }
    expect(mockGetClient).not.toHaveBeenCalled();
  });

  test('rejects void evidence missing the captured field before a transaction', async () => {
    const missingCaptured = providerResponse('voided');
    delete missingCaptured.captured;
    await expect(reverseSettledFinancingPayment({
      paymentId: IDS.payment,
      gatewayPaymentId: IDS.payment,
      gatewayResponse: missingCaptured,
    })).rejects.toMatchObject({ code: 'FINANCING_VOID_EVIDENCE_INVALID' });
    expect(mockGetClient).not.toHaveBeenCalled();
  });

  test('rolls back when original allocations do not exactly equal the provider reversal', async () => {
    mockClient.query.mockImplementation((sql) => {
      const result = successfulQuery(sql);
      if (sql.includes('FROM financing_payment_allocations a') && sql.includes('FOR UPDATE OF i')) {
        return {
          rows: [{
            ...result.rows[0],
            allocation_amount: '50.00',
          }],
        };
      }
      return result;
    });

    await expect(reverseSettledFinancingPayment({
      paymentId: IDS.payment,
      gatewayPaymentId: IDS.payment,
      gatewayResponse: providerResponse(),
    })).rejects.toMatchObject({ code: 'FINANCING_REVERSAL_ALLOCATION_MISMATCH' });

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});
