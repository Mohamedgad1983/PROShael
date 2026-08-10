import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();
const mockCreateMemberNotification = jest.fn();
const mockPersistIdempotentMemberNotification = jest.fn();
const mockSendPushNotification = jest.fn();
const mockFetchMoyasarPayment = jest.fn();
const mockIsMoyasarEnabledForIos = jest.fn();
const mockGetMoyasarGatewayOperationalReadiness = jest.fn();

const mockConfig = {
  financingRepayment: {
    enabled: true,
    gatewayEnabled: true,
    remindersEnabled: true,
    businessTimeZone: 'Asia/Riyadh',
    intentTtlMinutes: 30,
  },
  paymentGateway: {
    enabled: true,
    iosEnabled: true,
    reconciliationEnabled: true,
    provider: 'moyasar',
    currency: 'SAR',
    moyasar: {
      secretKey: 'sk_test_financing',
      publishableKey: 'pk_test_financing',
      webhookSecret: 'whsec_test_financing',
    },
  },
};

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: mockGetClient,
}));

jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({
  createMemberNotification: mockCreateMemberNotification,
  persistIdempotentMemberNotification: mockPersistIdempotentMemberNotification,
  sendPushNotification: mockSendPushNotification,
}));

jest.unstable_mockModule('../../../src/services/moyasarService.js', () => ({
  fetchMoyasarPayment: mockFetchMoyasarPayment,
  getMoyasarGatewayOperationalReadiness: mockGetMoyasarGatewayOperationalReadiness,
  isMoyasarEnabledForIos: mockIsMoyasarEnabledForIos,
  sanitizeMoyasarPaymentEvidence: jest.fn((payment) => ({
    id: String(payment?.id || '').trim() || null,
    given_id: payment?.given_id ?? null,
    status: String(payment?.status || '').trim().toLowerCase() || null,
    amount: Number.isSafeInteger(Number(payment?.amount)) ? Number(payment.amount) : null,
    fee: Number.isSafeInteger(Number(payment?.fee)) ? Number(payment.fee) : null,
    currency: String(payment?.currency || '').trim().toUpperCase() || null,
    captured: payment?.captured === undefined || payment?.captured === null
      ? null
      : Number(payment.captured),
    refunded: payment?.refunded === undefined || payment?.refunded === null
      ? null
      : Number(payment.refunded),
  })),
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({ config: mockConfig }));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const {
  DEFAULT_FINANCING_TIERS,
  FINANCING_PROGRAM,
  buildInstallmentSchedule,
  createFinancingPaymentIntent,
  createRepaymentPlanInTransaction,
  defaultFirstDueDate,
  detectGatewayFinancialAmountException,
  financingBusinessDate,
  normalizeFinancingTiers,
  processFinancingReminders,
  reconcilePendingFinancingPayments,
  resolveFinancingTier,
  resolveLoanDisbursementTerms,
  settleFinancingPayment,
  validateFirstDueDate,
  validateInstallmentCount,
} = await import('../../../src/services/financingRepaymentService.js');

const IDS = {
  plan: '11111111-1111-4111-8111-111111111111',
  request: '22222222-2222-4222-8222-222222222222',
  member: '33333333-3333-4333-8333-333333333333',
  payment: '44444444-4444-4444-8444-444444444444',
  installment1: '55555555-5555-4555-8555-555555555555',
  installment2: '66666666-6666-4666-8666-666666666666',
};

const emptyResult = () => ({ rows: [], rowCount: 0 });

function providerEvidence(amount = 675, overrides = {}) {
  return {
    id: IDS.payment,
    status: 'paid',
    amount: Math.round(amount * 100),
    currency: 'SAR',
    ...overrides,
  };
}

function makeClient(handler = async () => emptyResult()) {
  return {
    query: jest.fn(handler),
    release: jest.fn(),
  };
}

function resetFlags() {
  Object.assign(mockConfig.financingRepayment, {
    enabled: true,
    gatewayEnabled: true,
    remindersEnabled: true,
    businessTimeZone: 'Asia/Riyadh',
    intentTtlMinutes: 30,
  });
  Object.assign(mockConfig.paymentGateway, {
    enabled: true,
    iosEnabled: true,
    reconciliationEnabled: true,
    provider: 'moyasar',
    currency: 'SAR',
  });
  mockConfig.paymentGateway.moyasar.secretKey = 'sk_test_financing';
  mockConfig.paymentGateway.moyasar.webhookSecret = 'whsec_test_financing';
}

beforeEach(() => {
  jest.clearAllMocks();
  resetFlags();
  mockIsMoyasarEnabledForIos.mockReturnValue(true);
  mockGetMoyasarGatewayOperationalReadiness.mockResolvedValue({ ready: true });
  mockQuery.mockResolvedValue(emptyResult());
  mockCreateMemberNotification.mockResolvedValue({ success: true, deliveredVia: 'push' });
  mockPersistIdempotentMemberNotification.mockResolvedValue({
    notificationId: '77777777-7777-4777-8777-777777777777',
    created: true,
  });
  mockSendPushNotification.mockResolvedValue({ success: true, deliveredVia: 'push' });
});

describe('provider financial evidence classification', () => {
  const localPayment = (status) => ({
    id: IDS.payment,
    status,
    amount: '100.00',
    gateway_amount_minor: 10_000,
  });

  test('allows an ordinary pre-capture void without quarantine', () => {
    expect(detectGatewayFinancialAmountException(
      localPayment('pending_verification'),
      { status: 'voided', captured: 0 }
    )).toBeNull();
  });

  test.each(['paid', 'pending_refund'])(
    'quarantines contradictory void evidence for a locally %s payment',
    (status) => {
      expect(detectGatewayFinancialAmountException(
        localPayment(status),
        { status: 'voided', captured: 1_000, voided_at: '2026-08-10T12:00:00.000Z' }
      )).toMatchObject({
        code: 'GATEWAY_VOID_EVIDENCE_INVALID_REVIEW_REQUIRED',
        kind: 'invalid_void_evidence',
        providerStatus: 'voided',
        expectedMinor: 10_000,
        observedMinor: 1_000,
        evidenceIssue: 'amount_mismatch',
      });
    }
  );

  test('requires voided_at even when a settled void repeats the exact captured amount', () => {
    expect(detectGatewayFinancialAmountException(
      localPayment('paid'),
      { status: 'voided', captured: 10_000 }
    )).toMatchObject({
      kind: 'invalid_void_evidence',
      evidenceIssue: 'voided_at_missing',
    });
  });

  test('accepts exact full captured amount plus voided_at for downstream reversal review', () => {
    expect(detectGatewayFinancialAmountException(
      localPayment('paid'),
      {
        status: 'voided',
        captured: 10_000,
        voided_at: '2026-08-10T12:00:00.000Z',
      }
    )).toBeNull();
  });
});

describe('fixed financing policy and schedule math', () => {
  test.each([
    [3000, 450, 3450],
    [6000, 750, 6750],
    [10000, 1050, 11050],
  ])('maps principal %i to the exact fixed fee and total', (principal, fee, total) => {
    expect(resolveFinancingTier(principal)).toEqual({ principal, fee, total });
  });

  test('rejects a principal outside the approved packages', () => {
    expect(() => resolveFinancingTier(4500)).toThrow('إحدى باقات التمويل المعتمدة');
  });

  test('canonicalises malformed and legacy stored settings for future requests', () => {
    expect(normalizeFinancingTiers('not-json')).toEqual(DEFAULT_FINANCING_TIERS);
    expect(normalizeFinancingTiers([
      { principal: 3000, fee: 500 },
      { principal: 6000, fee: 800 },
      { principal: 10000, fee: 1400 },
    ])).toEqual([
      { principal: 3000, fee: 450 },
      { principal: 6000, fee: 750 },
      { principal: 10000, fee: 1050 },
    ]);
  });

  test('builds cent-exact month-end/leap schedules for 1 through 12 months', () => {
    for (let count = 1; count <= 12; count += 1) {
      const schedule = buildInstallmentSchedule({
        totalAmount: 11050,
        installmentCount: count,
        firstDueDate: '2028-01-31',
      });
      expect(schedule).toHaveLength(count);
      expect(Math.round(schedule.reduce((sum, item) => sum + item.amount, 0) * 100))
        .toBe(1_105_000);
    }
    const leapSchedule = buildInstallmentSchedule({
      totalAmount: 3450,
      installmentCount: 3,
      firstDueDate: '2028-01-31',
    });
    expect(leapSchedule.map((item) => item.dueDate)).toEqual([
      '2028-01-31',
      '2028-02-29',
      '2028-03-31',
    ]);
  });

  test('enforces 1-12 installments and rejects explicit empty/zero values', () => {
    expect(validateInstallmentCount(undefined)).toBe(10);
    expect(validateInstallmentCount(12)).toBe(12);
    expect(() => validateInstallmentCount(0)).toThrow('عدد الأقساط');
    expect(() => validateInstallmentCount('')).toThrow('عدد الأقساط');
    expect(() => validateInstallmentCount(13)).toThrow('عدد الأقساط');
  });

  test('uses the configured Riyadh business date and rejects a past first date', () => {
    expect(financingBusinessDate(new Date('2026-08-09T21:30:00.000Z'))).toBe('2026-08-10');
    expect(validateFirstDueDate('2026-08-10', { today: '2026-08-10' })).toBe('2026-08-10');
    expect(() => validateFirstDueDate('2026-08-09', { today: '2026-08-10' }))
      .toThrow(expect.objectContaining({ code: 'FIRST_DUE_DATE_IN_PAST' }));
    expect(defaultFirstDueDate(new Date('2028-01-31T08:00:00Z'))).toBe('2028-02-29');
  });
});

describe('legacy request terms are immutable', () => {
  test('grandfathers the production-style v2 snapshot at 3,000 + 500', () => {
    expect(resolveLoanDisbursementTerms({
      requested_item_amount: '3000',
      loan_amount: '3000',
      financing_fee_amount: '500',
      total_repayment_amount: '3500',
      financing_terms_snapshot: { principal: 3000, fee: 500, total: 3500 },
    })).toEqual({ principal: 3000, feeAmount: 500, totalAmount: 3500, isLegacy: true });
  });

  test('preserves a NULL-snapshot historical 5,000 request and generated fee', () => {
    expect(resolveLoanDisbursementTerms({
      requested_item_amount: null,
      loan_amount: '5000',
      admin_fee_amount: '500',
      financing_terms_snapshot: null,
    })).toEqual({ principal: 5000, feeAmount: 500, totalAmount: 5500, isLegacy: true });
  });

  test('recognises a canonical v3 snapshot without repricing it', () => {
    expect(resolveLoanDisbursementTerms({
      requested_item_amount: 6000,
      loan_amount: 6000,
      financing_fee_amount: 750,
      total_repayment_amount: 6750,
      financing_terms_snapshot: {
        policy_version: 3,
        principal: 6000,
        fee: 750,
        total: 6750,
      },
    })).toEqual({ principal: 6000, feeAmount: 750, totalAmount: 6750, isLegacy: false });
  });

  test('fails closed on an inconsistent immutable snapshot', () => {
    expect(() => resolveLoanDisbursementTerms({
      requested_item_amount: 3000,
      loan_amount: 3000,
      financing_fee_amount: 450,
      total_repayment_amount: 3450,
      financing_terms_snapshot: { principal: 3000, fee: 500, total: 3500 },
    })).toThrow(expect.objectContaining({ code: 'FINANCING_TERMS_SNAPSHOT_INVALID' }));
  });
});

describe('atomic plan activation', () => {
  test('creates installments and financing ledger without changing the subscription balance', async () => {
    const plan = {
      id: IDS.plan,
      member_id: IDS.member,
      principal_amount: '3000',
      fee_amount: '450',
      total_amount: '3450',
      installment_count: 10,
      first_due_date: '2026-09-10',
    };
    let installmentSequence = 0;
    const client = makeClient(async (sql, params) => {
      if (sql.includes('FROM financing_repayment_plans') && sql.includes('program_type')) {
        return emptyResult();
      }
      if (sql.includes('FROM members') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: IDS.member, current_balance: '3000' }] };
      }
      if (sql.includes('INSERT INTO financing_repayment_plans')) return { rows: [plan] };
      if (sql.includes('INSERT INTO financing_installments')) {
        installmentSequence += 1;
        return {
          rows: [{
            id: `55555555-5555-4555-8555-${String(installmentSequence).padStart(12, '0')}`,
            due_date: params[2],
          }],
        };
      }
      if (sql.includes('INSERT INTO financing_reminder_log')) return emptyResult();
      if (sql.includes('INSERT INTO financing_balance_transactions')) {
        expect(params).toEqual([
          IDS.plan,
          IDS.member,
          3450,
          0,
          3450,
          `financing-plan:${IDS.plan}:activation`,
        ]);
        return emptyResult();
      }
      throw new Error(`Unexpected plan SQL: ${sql}`);
    });

    const result = await createRepaymentPlanInTransaction({
      client,
      programType: FINANCING_PROGRAM.FAMILY,
      requestId: IDS.request,
      memberId: IDS.member,
      principalAmount: 3000,
      feeAmount: 450,
      installmentCount: 10,
      firstDueDate: '2026-09-10',
      createdById: IDS.member,
    });

    expect(result).toBe(plan);
    expect(client.query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO financing_installments'))).toHaveLength(10);
    expect(client.query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO financing_reminder_log'))).toHaveLength(10);
    expect(client.query.mock.calls.filter(([sql]) =>
      sql.includes('UPDATE members'))).toHaveLength(0);
  });

  test('reuses an identical locked plan without a second balance debit', async () => {
    const existing = {
      id: IDS.plan,
      member_id: IDS.member,
      principal_amount: '3000',
      fee_amount: '450',
      installment_count: 10,
      first_due_date: new Date('2026-09-10T00:00:00Z'),
    };
    const client = makeClient(async (sql) => {
      if (sql.includes('FROM financing_repayment_plans')) return { rows: [existing] };
      throw new Error(`Unexpected idempotent SQL: ${sql}`);
    });

    await expect(createRepaymentPlanInTransaction({
      client,
      programType: FINANCING_PROGRAM.FAMILY,
      requestId: IDS.request,
      memberId: IDS.member,
      principalAmount: 3000,
      feeAmount: 450,
      installmentCount: 10,
      firstDueDate: '2026-09-10',
    })).resolves.toEqual(expect.objectContaining({ idempotent_replay: true }));
    expect(client.query.mock.calls.some(([sql]) => sql.includes('UPDATE members'))).toBe(false);
  });

  test('kill switch prevents plan mutation before the client is used', async () => {
    mockConfig.financingRepayment.enabled = false;
    const client = makeClient();
    await expect(createRepaymentPlanInTransaction({
      client,
      programType: FINANCING_PROGRAM.FAMILY,
      requestId: IDS.request,
      memberId: IDS.member,
      principalAmount: 3000,
      feeAmount: 450,
      firstDueDate: '2026-09-10',
    })).rejects.toMatchObject({ code: 'FINANCING_REPAYMENT_DISABLED' });
    expect(client.query).not.toHaveBeenCalled();
  });
});

describe('locked payment intent creation', () => {
  function intentClient({ installmentId = IDS.installment1, openPayment = null, insertError = null } = {}) {
    return makeClient(async (sql, params) => {
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return emptyResult();
      if (sql.includes('FROM financing_repayment_plans')) {
        return { rows: [{
          id: IDS.plan,
          member_id: IDS.member,
          status: 'active',
          outstanding_amount: '3450',
        }] };
      }
      if (sql.includes('FROM financing_installments')) {
        return { rows: [{ id: installmentId, amount: '345', paid_amount: '0' }] };
      }
      if (sql.includes('FROM payments') && sql.includes('status = ANY')) {
        return { rows: openPayment ? [openPayment] : [] };
      }
      if (sql.includes('INSERT INTO payments')) {
        if (insertError) throw insertError;
        // One UUID is also persisted as Moyasar's text given_id. Keep both
        // casts explicit so a real PostgreSQL parser does not infer conflicting
        // uuid/text types for the same bind parameter.
        expect(sql).toContain('$1::text::uuid');
        expect(sql).toContain('$10, $1::text, $15');
        const metadata = JSON.parse(params[12]);
        expect(params[0]).toBe(metadata.gateway_payment_id);
        expect(metadata.protocol_version).toBe(2);
        expect(params[8]).toBe('next');
        expect(params[10]).toBe(34_500);
        expect(params[14]).toBe('prepared_v2');
        expect(params[15]).toBe(2);
        return { rows: [{
          id: params[0],
          amount: params[2],
          financing_plan_id: IDS.plan,
          financing_payment_scope: params[8],
          gateway_provider: params[9],
          gateway_payment_id: params[0],
          gateway_amount_minor: params[10],
          gateway_currency: params[11],
          gateway_status: params[14],
          gateway_protocol_version: params[15],
          status: 'pending',
        }] };
      }
      throw new Error(`Unexpected intent SQL: ${sql}`);
    });
  }

  test('derives the amount from only the earliest unpaid installment', async () => {
    const client = intentClient();
    mockGetClient.mockResolvedValueOnce(client);
    const result = await createFinancingPaymentIntent({
      planId: IDS.plan,
      memberId: IDS.member,
      installmentId: IDS.installment1,
      protocolVersion: 2,
    });
    expect(result.reused).toBe(false);
    expect(result.payment.amount).toBe(345);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('rejects selecting a later installment and rolls back', async () => {
    const client = intentClient();
    mockGetClient.mockResolvedValueOnce(client);
    await expect(createFinancingPaymentIntent({
      planId: IDS.plan,
      memberId: IDS.member,
      installmentId: IDS.installment2,
      protocolVersion: 2,
    })).rejects.toMatchObject({ code: 'INSTALLMENT_NOT_NEXT' });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('reuses the same open intent instead of creating another provider charge', async () => {
    const openPayment = {
      id: IDS.payment,
      amount: '345',
      financing_payment_scope: 'next',
      gateway_provider: 'moyasar',
      gateway_payment_id: IDS.payment,
      gateway_protocol_version: 2,
    };
    const client = intentClient({ openPayment });
    mockGetClient.mockResolvedValueOnce(client);
    await expect(createFinancingPaymentIntent({
      planId: IDS.plan,
      memberId: IDS.member,
      installmentId: IDS.installment1,
      protocolVersion: 2,
    })).resolves.toEqual(expect.objectContaining({ payment: openPayment, reused: true }));
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO payments'))).toBe(false);
  });

  test('maps a concurrent partial-unique-index race to an active-intent conflict', async () => {
    const insertError = Object.assign(new Error('duplicate'), {
      code: '23505',
      constraint: 'uq_financing_one_open_intent_per_plan',
    });
    const client = intentClient({ insertError });
    mockGetClient.mockResolvedValueOnce(client);
    await expect(createFinancingPaymentIntent({
      planId: IDS.plan,
      memberId: IDS.member,
      installmentId: IDS.installment1,
      protocolVersion: 2,
    })).rejects.toMatchObject({ code: 'PAYMENT_INTENT_IN_PROGRESS' });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('gateway kill switch prevents intent creation', async () => {
    mockConfig.financingRepayment.gatewayEnabled = false;
    await expect(createFinancingPaymentIntent({
      planId: IDS.plan,
      memberId: IDS.member,
    })).rejects.toMatchObject({ code: 'FINANCING_GATEWAY_DISABLED' });
    expect(mockGetClient).not.toHaveBeenCalled();
  });

  test('protocol v2 is required before any database client is acquired', async () => {
    await expect(createFinancingPaymentIntent({
      planId: IDS.plan,
      memberId: IDS.member,
    })).rejects.toMatchObject({ code: 'PAYMENT_PROTOCOL_UPGRADE_REQUIRED' });
    expect(mockGetClient).not.toHaveBeenCalled();
  });

  test('online readiness fails closed without webhook recovery or exact SAR currency', async () => {
    mockConfig.paymentGateway.moyasar.webhookSecret = '';
    await expect(createFinancingPaymentIntent({ planId: IDS.plan, memberId: IDS.member }))
      .rejects.toMatchObject({ code: 'FINANCING_GATEWAY_DISABLED' });
    mockConfig.paymentGateway.moyasar.webhookSecret = 'whsec_test_financing';
    mockConfig.paymentGateway.currency = 'KWD';
    await expect(createFinancingPaymentIntent({ planId: IDS.plan, memberId: IDS.member }))
      .rejects.toMatchObject({ code: 'FINANCING_GATEWAY_DISABLED' });
    mockConfig.paymentGateway.currency = 'SAR';
    mockConfig.paymentGateway.reconciliationEnabled = false;
    await expect(createFinancingPaymentIntent({ planId: IDS.plan, memberId: IDS.member }))
      .rejects.toMatchObject({ code: 'FINANCING_GATEWAY_DISABLED' });
    expect(mockGetClient).not.toHaveBeenCalled();
  });

  test('financing intent creation fails closed when reconciliation schema is not ready', async () => {
    mockGetMoyasarGatewayOperationalReadiness.mockResolvedValueOnce({ ready: false });

    await expect(createFinancingPaymentIntent({
      planId: IDS.plan,
      memberId: IDS.member,
      protocolVersion: 2,
    })).rejects.toMatchObject({
      code: 'PAYMENT_GATEWAY_RECONCILIATION_SCHEMA_NOT_READY',
    });
    expect(mockGetClient).not.toHaveBeenCalled();
  });
});

describe('verified and idempotent settlement', () => {
  function installSettlement({
    scope = 'all',
    amount = 675,
    outstanding = 675,
    installments = [
      { id: IDS.installment1, installment_number: 1, amount: '300', paid_amount: '0' },
      { id: IDS.installment2, installment_number: 2, amount: '375', paid_amount: '0' },
    ],
  } = {}) {
    const payment = {
      id: IDS.payment,
      payer_id: IDS.member,
      amount: String(amount),
      status: 'pending',
      financing_plan_id: IDS.plan,
      financing_payment_scope: scope,
      gateway_provider: 'moyasar',
      gateway_payment_id: IDS.payment,
      gateway_amount_minor: Math.round(amount * 100),
      gateway_currency: 'SAR',
    };
    const plan = {
      id: IDS.plan,
      member_id: IDS.member,
      status: 'active',
      outstanding_amount: String(outstanding),
      program_type: FINANCING_PROGRAM.FAMILY,
    };
    const client = makeClient(async (sql, params) => {
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return emptyResult();
      if (sql.includes('FROM payments') && sql.includes('financing_plan_id IS NOT NULL')) {
        return { rows: [payment] };
      }
      if (sql.includes('FROM payments') && sql.includes('financing_plan_id = $2')) {
        return { rows: [payment] };
      }
      if (sql.includes('FROM financing_payment_allocations')) return emptyResult();
      if (sql.includes('FROM payments') && sql.includes('id <>')) return emptyResult();
      if (sql.includes('FROM financing_repayment_plans') && sql.includes('FOR UPDATE')) {
        return { rows: [plan] };
      }
      if (sql.includes('FROM financing_installments') && sql.includes('FOR UPDATE')) {
        return { rows: installments };
      }
      if (sql.includes('INSERT INTO gateway_financial_exceptions')) {
        return { rows: [{ id: 'exception-1', review_status: 'open', occurrence_count: 1 }] };
      }
      if (sql.includes('UPDATE financing_installments')) return emptyResult();
      if (sql.includes('UPDATE financing_reminder_log')) return emptyResult();
      if (sql.includes('INSERT INTO financing_payment_allocations')) return emptyResult();
      if (sql.includes('SELECT EXISTS')) return { rows: [{ has_overdue: false }] };
      if (sql.includes('UPDATE financing_repayment_plans')) {
        return { rows: [{
          ...plan,
          outstanding_amount: String(params[0]),
          status: params[1],
        }] };
      }
      if (sql.includes('UPDATE payments')) {
        return { rows: [{ ...payment, status: 'paid', gateway_status: 'paid' }] };
      }
      if (sql.includes('INSERT INTO financing_balance_transactions')) return emptyResult();
      throw new Error(`Unexpected settlement SQL: ${sql}`);
    });
    mockGetClient.mockResolvedValueOnce(client);
    mockQuery.mockImplementation(async (sql) => {
      if (sql.includes('FROM financing_repayment_plans')) {
        return { rows: [{ ...plan, outstanding_amount: '0', status: 'paid' }] };
      }
      if (sql.includes('FROM financing_installments')) return { rows: [] };
      throw new Error(`Unexpected settlement global SQL: ${sql}`);
    });
    return { client, payment, plan };
  }

  test('allocates pay-all oldest first, marks paid, and leaves subscription balance untouched', async () => {
    const { client } = installSettlement();
    await settleFinancingPayment({
      paymentId: IDS.payment,
      gatewayPaymentId: IDS.payment,
      gatewayProvider: 'moyasar',
      gatewayResponse: providerEvidence(),
    });

    const allocationCalls = client.query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO financing_payment_allocations'));
    expect(allocationCalls.map(([, params]) => params[3])).toEqual([300, 375]);
    const paidUpdateIndex = client.query.mock.calls.findIndex(([sql]) => sql.includes('UPDATE payments'));
    const lastAllocationIndex = client.query.mock.calls.reduce((last, [sql], index) =>
      sql.includes('INSERT INTO financing_payment_allocations') ? index : last, -1);
    expect(lastAllocationIndex).toBeLessThan(paidUpdateIndex);
    const planLockIndex = client.query.mock.calls.findIndex(([sql]) =>
      sql.includes('FROM financing_repayment_plans') && sql.includes('FOR UPDATE'));
    const paymentLockIndex = client.query.mock.calls.findIndex(([sql]) =>
      sql.includes('FROM payments') && sql.includes('financing_plan_id = $2'));
    expect(planLockIndex).toBeLessThan(paymentLockIndex);
    expect(client.query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO financing_balance_transactions'))).toHaveLength(1);
    expect(client.query.mock.calls.filter(([sql]) =>
      sql.includes('UPDATE financing_reminder_log'))).toHaveLength(2);
    expect(client.query.mock.calls.some(([sql]) => sql.includes('members'))).toBe(false);
    expect(mockCreateMemberNotification).toHaveBeenCalledTimes(1);
  });

  test('accepts captured settlement only when captured minor equals the full local amount', async () => {
    const { client } = installSettlement();
    await settleFinancingPayment({
      paymentId: IDS.payment,
      gatewayPaymentId: IDS.payment,
      gatewayProvider: 'moyasar',
      gatewayResponse: providerEvidence(675, { status: 'captured', captured: 67500 }),
    });

    expect(client.query.mock.calls.some(([sql]) =>
      sql.includes('INSERT INTO financing_payment_allocations'))).toBe(true);
    expect(client.query.mock.calls.some(([sql]) =>
      sql.includes('INSERT INTO gateway_financial_exceptions'))).toBe(false);
  });

  test('commits one partial-capture exception and performs no financing mutation', async () => {
    const { client } = installSettlement();

    await expect(settleFinancingPayment({
      paymentId: IDS.payment,
      gatewayPaymentId: IDS.payment,
      gatewayProvider: 'moyasar',
      gatewayResponse: providerEvidence(675, { status: 'captured', captured: 1000 }),
    })).rejects.toMatchObject({
      code: 'GATEWAY_CAPTURE_AMOUNT_MISMATCH_REVIEW_REQUIRED',
      reviewRequired: true,
      reviewRecorded: true,
    });

    const exceptionCalls = client.query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO gateway_financial_exceptions'));
    expect(exceptionCalls).toHaveLength(1);
    expect(exceptionCalls[0][1].slice(3, 8)).toEqual([
      'captured',
      'partial_capture',
      67500,
      1000,
      'SAR',
    ]);
    expect(exceptionCalls[0][1][8]).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.parse(exceptionCalls[0][1][9])).toEqual({
      id: IDS.payment,
      given_id: null,
      status: 'captured',
      amount: 67500,
      fee: null,
      currency: 'SAR',
      captured: 1000,
      refunded: null,
    });
    expect(client.query.mock.calls.filter(([sql]) => sql === 'COMMIT')).toHaveLength(1);
    expect(client.query.mock.calls.some(([sql]) => sql === 'ROLLBACK')).toBe(false);
    expect(client.query.mock.calls.some(([sql]) =>
      sql.includes('INSERT INTO financing_payment_allocations'))).toBe(false);
    expect(client.query.mock.calls.some(([sql]) =>
      sql.includes('UPDATE financing_installments'))).toBe(false);
    expect(client.query.mock.calls.some(([sql]) =>
      sql.includes('UPDATE financing_repayment_plans'))).toBe(false);
    expect(client.query.mock.calls.some(([sql]) =>
      sql.includes('UPDATE payments'))).toBe(false);
    expect(mockCreateMemberNotification).not.toHaveBeenCalled();
  });

  test('rejects settlement without exact provider evidence', async () => {
    const { client } = installSettlement();
    await expect(settleFinancingPayment({
      paymentId: IDS.payment,
      gatewayPaymentId: IDS.payment,
      gatewayProvider: 'moyasar',
      gatewayResponse: providerEvidence(675, { id: IDS.installment1 }),
    })).rejects.toMatchObject({ code: 'GATEWAY_PAYMENT_MISMATCH' });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]) =>
      sql.includes('INSERT INTO financing_payment_allocations'))).toBe(false);
  });

  test('records financing outstanding 675 to 0 rather than member current_balance', async () => {
    const { client } = installSettlement();
    await settleFinancingPayment({
      paymentId: IDS.payment,
      gatewayPaymentId: IDS.payment,
      gatewayResponse: providerEvidence(),
    });
    expect(client.query.mock.calls.some(([sql]) => sql.includes('members'))).toBe(false);
    const ledger = client.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO financing_balance_transactions'));
    expect(ledger[1].slice(4, 6)).toEqual([675, 0]);
  });

  test('same settled payment/provider replay is read-only and sends no duplicate notification', async () => {
    const paidPayment = {
      id: IDS.payment,
      payer_id: IDS.member,
      amount: '345',
      status: 'paid',
      financing_plan_id: IDS.plan,
      gateway_provider: 'moyasar',
      gateway_payment_id: IDS.payment,
    };
    const paidPlan = {
      id: IDS.plan,
      member_id: IDS.member,
      status: 'active',
      outstanding_amount: '3105',
    };
    const client = makeClient(async (sql) => {
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return emptyResult();
      if (sql.includes('FROM payments')) return { rows: [paidPayment] };
      if (sql.includes('FROM financing_payment_allocations')) return { rows: [{ id: 'allocation' }] };
      if (sql.includes('FROM financing_repayment_plans')) return { rows: [paidPlan] };
      throw new Error(`Unexpected replay SQL: ${sql}`);
    });
    mockGetClient.mockResolvedValueOnce(client);
    mockQuery.mockImplementation(async (sql) => {
      if (sql.includes('FROM financing_repayment_plans')) return { rows: [paidPlan] };
      if (sql.includes('FROM financing_installments')) return { rows: [] };
      throw new Error(`Unexpected replay global SQL: ${sql}`);
    });

    await settleFinancingPayment({
      paymentId: IDS.payment,
      gatewayPaymentId: IDS.payment,
      gatewayProvider: 'moyasar',
    });
    expect(client.query.mock.calls.some(([sql]) => sql.includes('UPDATE payments'))).toBe(false);
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO financing_balance_transactions')))
      .toBe(false);
    expect(mockCreateMemberNotification).not.toHaveBeenCalled();
  });
});

describe('reconciliation and reminder recovery', () => {
  test('reconciler rejects a mismatched provider identity without settling it', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{
      id: IDS.payment,
      payer_id: IDS.member,
      amount: '345',
      financing_plan_id: IDS.plan,
      status: 'pending',
      gateway_provider: 'moyasar',
      gateway_payment_id: IDS.payment,
      gateway_amount_minor: 34_500,
      gateway_currency: 'SAR',
    }] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(providerEvidence(345, { id: IDS.installment1 }));

    await expect(reconcilePendingFinancingPayments()).resolves.toEqual({
      examined: 1,
      settled: 0,
      failed: 0,
      still_pending: 0,
      errors: [{ payment_id: IDS.payment, code: 'GATEWAY_PAYMENT_MISMATCH' }],
    });
    expect(mockGetClient).not.toHaveBeenCalled();
  });

  test.each([
    {
      providerStatus: 'captured',
      amountField: 'captured',
      code: 'GATEWAY_CAPTURE_AMOUNT_MISMATCH_REVIEW_REQUIRED',
      kind: 'partial_capture',
    },
    {
      providerStatus: 'refunded',
      amountField: 'refunded',
      code: 'GATEWAY_REFUND_AMOUNT_MISMATCH_REVIEW_REQUIRED',
      kind: 'partial_refund',
    },
  ])('reconciler quarantines partial $providerStatus without payment/plan mutation', async ({
    providerStatus,
    amountField,
    code,
    kind,
  }) => {
    const candidate = {
      id: IDS.payment,
      payer_id: IDS.member,
      amount: '345',
      financing_plan_id: IDS.plan,
      status: 'pending_verification',
      gateway_provider: 'moyasar',
      gateway_payment_id: IDS.payment,
      gateway_amount_minor: 34500,
      gateway_currency: 'SAR',
    };
    mockQuery
      .mockResolvedValueOnce({ rows: [candidate] })
      .mockResolvedValueOnce({
        rows: [{ id: 'exception-1', review_status: 'open', occurrence_count: 1 }],
      });
    mockFetchMoyasarPayment.mockResolvedValueOnce(providerEvidence(345, {
      status: providerStatus,
      [amountField]: 1000,
    }));

    await expect(reconcilePendingFinancingPayments()).resolves.toEqual({
      examined: 1,
      settled: 0,
      failed: 0,
      still_pending: 0,
      errors: [{ payment_id: IDS.payment, code }],
    });

    expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO gateway_financial_exceptions');
    expect(mockQuery.mock.calls[1][1].slice(3, 7)).toEqual([
      providerStatus,
      kind,
      34500,
      1000,
    ]);
    expect(mockQuery.mock.calls.some(([sql]) => sql.includes('UPDATE payments'))).toBe(false);
    expect(mockGetClient).not.toHaveBeenCalled();
  });

  test('reconciler terminalizes a refund only with exact full refunded minor evidence', async () => {
    const candidate = {
      id: IDS.payment,
      payer_id: IDS.member,
      amount: '345',
      financing_plan_id: IDS.plan,
      status: 'pending_verification',
      gateway_provider: 'moyasar',
      gateway_payment_id: IDS.payment,
      gateway_amount_minor: 34500,
      gateway_currency: 'SAR',
    };
    mockQuery
      .mockResolvedValueOnce({ rows: [candidate] })
      .mockResolvedValueOnce({ rows: [{ ...candidate, status: 'refunded' }] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(providerEvidence(345, {
      status: 'refunded',
      refunded: 34500,
    }));

    await expect(reconcilePendingFinancingPayments()).resolves.toEqual({
      examined: 1,
      settled: 0,
      failed: 1,
      still_pending: 0,
      errors: [],
    });

    expect(mockQuery.mock.calls[1][0]).toContain('UPDATE payments');
    expect(mockQuery.mock.calls[1][1][0]).toBe('refunded');
    expect(mockQuery.mock.calls.some(([sql]) =>
      sql.includes('INSERT INTO gateway_financial_exceptions'))).toBe(false);
  });

  test('reconciles an official voided result after checkout flags are disabled', async () => {
    mockConfig.financingRepayment.gatewayEnabled = false;
    mockConfig.paymentGateway.enabled = false;
    const candidate = {
      id: IDS.payment,
      payer_id: IDS.member,
      amount: '345',
      financing_plan_id: IDS.plan,
      status: 'pending_verification',
      gateway_provider: 'moyasar',
      gateway_payment_id: IDS.payment,
      gateway_amount_minor: 34_500,
      gateway_currency: 'SAR',
      gateway_protocol_version: 2,
      gateway_submission_started_at: '2026-08-10T12:00:00.000Z',
    };
    mockQuery
      .mockResolvedValueOnce({ rows: [candidate] })
      .mockResolvedValueOnce({ rows: [{ ...candidate, status: 'cancelled', gateway_status: 'voided' }] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(providerEvidence(345, {
      given_id: IDS.payment,
      status: 'voided',
    }));

    await expect(reconcilePendingFinancingPayments()).resolves.toEqual({
      examined: 1,
      settled: 0,
      failed: 1,
      still_pending: 0,
      errors: [],
    });

    expect(mockQuery.mock.calls[0][0]).toContain('gateway_submission_started_at IS NOT NULL');
    expect(mockQuery.mock.calls[1][1][0]).toBe('cancelled');
    expect(mockQuery.mock.calls[1][1][3]).toBe('voided');
  });

  test('reconciliation selection excludes prepared and not-submitted identities', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(reconcilePendingFinancingPayments()).resolves.toEqual(expect.objectContaining({
      examined: 0,
    }));

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('gateway_protocol_version = 2');
    expect(sql).toContain('gateway_submission_started_at IS NOT NULL');
    expect(sql).toContain("gateway_status <> 'not_submitted'");
    expect(mockFetchMoyasarPayment).not.toHaveBeenCalled();
  });

  test('reminder kill switch prevents every database write', async () => {
    mockConfig.financingRepayment.remindersEnabled = false;
    await expect(processFinancingReminders())
      .rejects.toMatchObject({ code: 'FINANCING_REMINDERS_DISABLED' });
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
