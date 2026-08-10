import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();
const mockClientQuery = jest.fn();
const mockClientRelease = jest.fn();
const mockFetchMoyasarPayment = jest.fn();
const mockSettleFinancingPayment = jest.fn();
const mockReverseSettledFinancingPayment = jest.fn();
const mockDetectGatewayFinancialAmountException = jest.fn();
const mockRecordGatewayFinancialException = jest.fn();
const mockGatewayFinancialExceptionError = jest.fn();
const mockIsFinancingOnlinePaymentEnabled = jest.fn(() => true);
const mockIsMoyasarEnabledForIos = jest.fn(() => true);
const mockGetMoyasarGatewayOperationalReadiness = jest.fn();
const mockConvertToHijri = jest.fn();

const mockConfig = {
  paymentGateway: {
    enabled: true,
    iosEnabled: true,
    reconciliationEnabled: true,
    provider: 'moyasar',
    currency: 'SAR',
    moyasar: {
      publishableKey: 'pk_test',
      secretKey: 'sk_test',
      webhookSecret: 'webhook-test-secret',
    },
  },
  financingRepayment: {
    intentTtlMinutes: 30,
  },
};

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  getClient: mockGetClient,
  query: mockQuery,
}));

jest.unstable_mockModule('../../../src/services/moyasarService.js', () => ({
  fetchMoyasarPayment: mockFetchMoyasarPayment,
  getMoyasarGatewayOperationalReadiness: mockGetMoyasarGatewayOperationalReadiness,
  getMoyasarPublicCheckoutConfig: jest.fn(() => ({
    provider: 'moyasar',
    publishableKey: 'pk_test',
    currency: 'SAR',
  })),
  isMoyasarEnabledForIos: mockIsMoyasarEnabledForIos,
  sanitizeMoyasarPaymentEvidence: jest.fn((payment) => payment),
}));

jest.unstable_mockModule('../../../src/services/financingRepaymentService.js', () => ({
  detectGatewayFinancialAmountException: mockDetectGatewayFinancialAmountException,
  gatewayFinancialExceptionError: mockGatewayFinancialExceptionError,
  isFinancingOnlinePaymentEnabled: mockIsFinancingOnlinePaymentEnabled,
  recordGatewayFinancialException: mockRecordGatewayFinancialException,
  settleFinancingPayment: mockSettleFinancingPayment,
}));

jest.unstable_mockModule('../../../src/services/financingReversalService.js', () => ({
  reverseSettledFinancingPayment: mockReverseSettledFinancingPayment,
}));

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  config: mockConfig,
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../src/utils/hijriDateUtils.js', () => ({
  HijriDateManager: {
    convertToHijri: mockConvertToHijri,
  },
}));

const {
  cancelGatewaySession,
  createGatewaySession,
  handleMoyasarWebhook,
  markGatewaySubmissionStarted,
  updatePaymentFromMoyasar,
  verifyGatewaySession,
} = await import('../../../src/controllers/paymentGatewayController.js');

const makeResponse = () => {
  const res = {
    json: jest.fn(),
    status: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

const makeLocalPayment = (overrides = {}) => ({
  id: 'payment-local-1',
  payer_id: 'member-1',
  beneficiary_id: 'member-1',
  financing_plan_id: 'plan-1',
  amount: 125,
  status: 'pending_verification',
  gateway_provider: 'moyasar',
  gateway_payment_id: 'provider-payment-1',
  gateway_protocol_version: 2,
  gateway_status: 'submission_started',
  gateway_submission_started_at: '2026-08-09T09:59:59.000Z',
  gateway_amount_minor: 12500,
  gateway_currency: 'SAR',
  ...overrides,
});

const makeProviderPayment = (overrides = {}) => ({
  id: 'provider-payment-1',
  given_id: 'provider-payment-1',
  amount: 12500,
  currency: 'SAR',
  status: 'paid',
  created_at: '2026-08-09T10:00:00.000Z',
  ...overrides,
});

const makeAmountException = ({ kind, expectedMinor, observedMinor }) => ({
  code: kind === 'refund'
    ? 'GATEWAY_REFUND_AMOUNT_MISMATCH_REVIEW_REQUIRED'
    : kind === 'void'
      ? 'GATEWAY_VOID_EVIDENCE_INVALID_REVIEW_REQUIRED'
      : 'GATEWAY_CAPTURE_AMOUNT_MISMATCH_REVIEW_REQUIRED',
  kind: kind === 'refund'
    ? 'partial_refund'
    : kind === 'void'
      ? 'invalid_void_evidence'
      : 'partial_capture',
  message: kind === 'refund'
    ? 'مبلغ الاسترداد المؤكد من بوابة الدفع غير كامل؛ لم يتغير الرصيد'
    : kind === 'void'
      ? 'إثبات إلغاء بوابة الدفع لا يطابق مبلغاً سبق تحصيله؛ لم يتغير الرصيد'
      : 'مبلغ التحصيل المؤكد من بوابة الدفع لا يطابق المبلغ المطلوب؛ لم يتغير الرصيد',
  providerStatus: kind === 'refund' ? 'refunded' : kind === 'void' ? 'voided' : 'captured',
  expectedMinor,
  observedMinor,
});

const makeVerifyRequest = (overrides = {}) => ({
  body: {},
  params: { paymentId: 'payment-local-1' },
  user: { id: 'member-1', role: 'member' },
  ...overrides,
});

describe('canonical Moyasar gateway financing settlement boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockGetClient.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
    mockConvertToHijri.mockReset();
    mockConvertToHijri.mockReturnValue({
      hijri_date_string: '1448-02-25',
      hijri_year: 1448,
      hijri_month: 2,
      hijri_day: 25,
      hijri_month_name: 'صفر',
    });
    mockGetClient.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
    });
    mockFetchMoyasarPayment.mockReset();
    mockSettleFinancingPayment.mockReset();
    mockReverseSettledFinancingPayment.mockReset();
    mockDetectGatewayFinancialAmountException.mockReset();
    mockDetectGatewayFinancialAmountException.mockReturnValue(null);
    mockRecordGatewayFinancialException.mockReset();
    mockRecordGatewayFinancialException.mockResolvedValue({ exceptionRecord: { id: 'exception-1' } });
    mockGatewayFinancialExceptionError.mockReset();
    mockGatewayFinancialExceptionError.mockImplementation((exception, reviewRecorded) => {
      const error = new Error(exception.message);
      error.code = exception.code;
      error.statusCode = 409;
      error.reviewRequired = true;
      error.reviewRecorded = reviewRecorded;
      return error;
    });
    mockIsFinancingOnlinePaymentEnabled.mockReturnValue(true);
    mockIsMoyasarEnabledForIos.mockReturnValue(true);
    mockGetMoyasarGatewayOperationalReadiness.mockResolvedValue({ ready: true });
    mockConfig.paymentGateway.enabled = true;
    mockConfig.paymentGateway.iosEnabled = true;
    mockConfig.paymentGateway.reconciliationEnabled = true;
    mockConfig.paymentGateway.provider = 'moyasar';
    mockConfig.paymentGateway.currency = 'SAR';
    mockConfig.paymentGateway.moyasar.publishableKey = 'pk_test';
    mockConfig.paymentGateway.moyasar.secretKey = 'sk_test';
    mockConfig.paymentGateway.moyasar.webhookSecret = 'webhook-test-secret';
  });

  test.each(['paid', 'captured'])(
    'delegates financing status %s to the atomic repayment settlement service',
    async (providerStatus) => {
      const localPayment = makeLocalPayment();
      const settledPayment = { ...localPayment, status: 'paid', gateway_status: providerStatus };
      const providerPayment = makeProviderPayment({
        status: providerStatus,
        ...(providerStatus === 'captured' ? { captured: 12500 } : {}),
      });
      mockQuery
        .mockResolvedValueOnce({ rows: [localPayment] })
        .mockResolvedValueOnce({ rows: [settledPayment] });
      mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment);
      mockSettleFinancingPayment.mockResolvedValueOnce({ payment: settledPayment });

      const res = makeResponse();
      await verifyGatewaySession(makeVerifyRequest(), res);

      expect(mockSettleFinancingPayment).toHaveBeenCalledTimes(1);
      expect(mockSettleFinancingPayment).toHaveBeenCalledWith({
        paymentId: localPayment.id,
        gatewayPaymentId: localPayment.gateway_payment_id,
        gatewayProvider: 'moyasar',
        gatewayResponse: providerPayment,
      });
      expect(mockQuery.mock.calls[1]).toEqual([
        'SELECT * FROM payments WHERE id = $1 LIMIT 1',
        [localPayment.id],
      ]);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          payment_id: localPayment.id,
          status: 'paid',
        }),
      }));
    }
  );

  test.each([
    {
      label: 'provider payment id',
      providerOverrides: { id: 'different-provider-id', given_id: null },
      error: 'Gateway payment identity mismatch',
    },
    {
      label: 'provider given id',
      providerOverrides: { given_id: 'different-given-id' },
      error: 'Gateway payment identity mismatch',
    },
    {
      label: 'minor-unit amount',
      providerOverrides: { amount: 12499 },
      error: 'Gateway amount mismatch',
    },
    {
      label: 'currency',
      providerOverrides: { currency: 'KWD' },
      error: 'Gateway currency mismatch',
    },
  ])('rejects a $label mismatch before settlement', async ({ providerOverrides, error }) => {
    const localPayment = makeLocalPayment();
    mockQuery.mockResolvedValueOnce({ rows: [localPayment] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(makeProviderPayment(providerOverrides));

    const res = makeResponse();
    await verifyGatewaySession(makeVerifyRequest(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error }));
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test.each([
    {
      label: 'provider identity',
      localOverrides: {},
      providerOverrides: { id: 'different-provider-id', given_id: null },
      code: 'GATEWAY_PAYMENT_ID_MISMATCH',
    },
    {
      label: 'provider amount',
      localOverrides: {},
      providerOverrides: { amount: 12_400 },
      code: 'GATEWAY_AMOUNT_MISMATCH',
    },
    {
      label: 'provider currency',
      localOverrides: {},
      providerOverrides: { currency: 'KWD' },
      code: 'GATEWAY_CURRENCY_MISMATCH',
    },
    {
      label: 'stored local currency',
      localOverrides: { gateway_currency: 'KWD' },
      providerOverrides: {},
      code: 'GATEWAY_EXPECTED_CURRENCY_INVALID',
    },
    {
      label: 'stored local minor amount',
      localOverrides: { gateway_amount_minor: 12_400 },
      providerOverrides: {},
      code: 'GATEWAY_STORED_AMOUNT_MISMATCH',
    },
  ])('marks $label mismatch for durable reconciliation review', async ({
    localOverrides,
    providerOverrides,
    code,
  }) => {
    await expect(updatePaymentFromMoyasar({
      localPayment: makeLocalPayment(localOverrides),
      moyasarPayment: makeProviderPayment(providerOverrides),
      evidenceSource: 'reconciliation',
    })).rejects.toMatchObject({
      code,
      reviewRequired: true,
      reviewReason: 'gateway_evidence_mismatch',
    });
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
  });

  test('derives exact SAR minor-unit evidence for a verified legacy gateway row', async () => {
    const legacyPayment = makeLocalPayment({
      amount: '50.00',
      category: 'subscription',
      financing_plan_id: null,
      status: 'pending_verification',
      gateway_amount_minor: null,
      gateway_currency: null,
    });
    const providerPayment = makeProviderPayment({
      amount: 5000,
      currency: 'SAR',
      status: 'voided',
    });
    const cancelled = {
      ...legacyPayment,
      status: 'cancelled',
      gateway_status: 'voided',
    };
    mockQuery.mockResolvedValueOnce({ rows: [cancelled] });

    const result = await updatePaymentFromMoyasar({
      localPayment: legacyPayment,
      moyasarPayment: providerPayment,
    });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][1]).toEqual([
      'cancelled',
      'voided',
      JSON.stringify(providerPayment),
      providerPayment.created_at,
      legacyPayment.id,
      legacyPayment.status,
    ]);
    expect(result).toEqual(cancelled);
  });

  test.each([
    ['missing legacy amount', { gateway_amount_minor: null, amount: null }],
    ['zero legacy amount', { gateway_amount_minor: null, amount: 0 }],
    ['negative stored amount', { gateway_amount_minor: -1, amount: 50 }],
  ])('rejects an invalid expected amount from a %s row', async (_label, overrides) => {
    const localPayment = makeLocalPayment(overrides);

    await expect(updatePaymentFromMoyasar({
      localPayment,
      moyasarPayment: makeProviderPayment(),
    })).rejects.toMatchObject({
      message: 'Gateway expected amount is invalid',
      code: 'GATEWAY_EXPECTED_AMOUNT_INVALID',
      statusCode: 409,
    });

    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
  });

  test('rejects a corrupt stored minor amount before any paid-row terminal mutation', async () => {
    const corruptPayment = makeLocalPayment({
      amount: 100,
      category: 'subscription',
      financing_plan_id: null,
      status: 'paid',
      gateway_status: 'paid',
      gateway_amount_minor: 9999,
    });
    const providerPayment = makeProviderPayment({
      amount: 9999,
      status: 'refunded',
      refunded: 9999,
      refunded_at: '2026-08-10T12:00:00.000Z',
    });

    await expect(updatePaymentFromMoyasar({
      localPayment: corruptPayment,
      moyasarPayment: providerPayment,
    })).rejects.toMatchObject({
      message: 'Gateway stored amount mismatch',
      code: 'GATEWAY_STORED_AMOUNT_MISMATCH',
      statusCode: 409,
    });

    expect(mockDetectGatewayFinancialAmountException).not.toHaveBeenCalled();
    expect(mockRecordGatewayFinancialException).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockGetClient).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(mockReverseSettledFinancingPayment).not.toHaveBeenCalled();
  });

  test('rejects a legacy row without stored currency unless the configured currency is SAR', async () => {
    const legacyPayment = makeLocalPayment({
      amount: 125,
      gateway_amount_minor: null,
      gateway_currency: null,
    });
    mockConfig.paymentGateway.currency = 'KWD';

    await expect(updatePaymentFromMoyasar({
      localPayment: legacyPayment,
      moyasarPayment: makeProviderPayment(),
    })).rejects.toMatchObject({
      message: 'Gateway currency mismatch',
      statusCode: 409,
    });

    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
  });

  test('fails closed when the webhook secret is not configured', async () => {
    mockConfig.paymentGateway.moyasar.webhookSecret = '';
    const res = makeResponse();

    await handleMoyasarWebhook({ body: { secret_token: '', data: makeProviderPayment() } }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Webhook is not configured',
    });
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
  });

  test('rejects a webhook with a mismatched shared secret before database access', async () => {
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: { secret_token: 'wrong-secret', data: makeProviderPayment() },
    }, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid webhook secret',
    });
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
  });

  test('returns retryable 503 without mutation when authoritative provider lookup fails', async () => {
    const localPayment = makeLocalPayment({
      category: 'subscription',
      financing_plan_id: null,
    });
    mockQuery.mockResolvedValueOnce({ rows: [localPayment] });
    mockFetchMoyasarPayment.mockRejectedValueOnce(
      Object.assign(new Error('temporary provider outage'), { statusCode: 502 })
    );
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: makeProviderPayment({ status: 'paid' }),
      },
    }, res);

    expect(mockFetchMoyasarPayment).toHaveBeenCalledWith(localPayment.gateway_payment_id);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockClientQuery).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      retryable: true,
      error: 'Provider verification unavailable',
    });
  });

  test('uses webhook data only for identity and persists authoritative provider voided state', async () => {
    const localPayment = makeLocalPayment({
      amount: 50,
      category: 'subscription',
      financing_plan_id: null,
      gateway_amount_minor: 5000,
    });
    const authoritativeVoided = makeProviderPayment({ amount: 5000, status: 'voided' });
    const cancelled = {
      ...localPayment,
      status: 'cancelled',
      gateway_status: 'voided',
      gateway_verified_at: '2026-08-10T12:00:00.000Z',
    };
    mockQuery
      .mockResolvedValueOnce({ rows: [localPayment] })
      .mockResolvedValueOnce({ rows: [cancelled] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(authoritativeVoided);
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: makeProviderPayment({
          amount: 999999,
          currency: 'KWD',
          status: 'paid',
        }),
      },
    }, res);

    expect(mockFetchMoyasarPayment).toHaveBeenCalledWith(localPayment.gateway_payment_id);
    expect(mockQuery.mock.calls[1][1]).toEqual([
      'cancelled',
      'voided',
      JSON.stringify(authoritativeVoided),
      authoritativeVoided.created_at,
      localPayment.id,
      localPayment.status,
    ]);
    expect(mockClientQuery).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  test('resolves pending_refund to cancelled only from exact full captured void evidence', async () => {
    const pendingRefund = makeLocalPayment({
      amount: 50,
      category: 'subscription',
      financing_plan_id: null,
      status: 'pending_refund',
      gateway_status: 'captured',
      gateway_amount_minor: 5000,
      gateway_failure_reason: 'SUBSCRIPTION_LIMIT_EXCEEDED_AFTER_CAPTURE',
    });
    const authoritativeVoided = makeProviderPayment({
      amount: 5000,
      status: 'voided',
      captured: 5000,
      voided_at: '2026-08-10T12:00:00.000Z',
    });
    const cancelled = {
      ...pendingRefund,
      status: 'cancelled',
      gateway_status: 'voided',
      gateway_verified_at: '2026-08-10T12:00:01.000Z',
    };
    mockQuery
      .mockResolvedValueOnce({ rows: [pendingRefund] })
      .mockResolvedValueOnce({ rows: [cancelled] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(authoritativeVoided);
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: makeProviderPayment({ amount: 5000, status: 'paid' }),
      },
    }, res);

    expect(mockDetectGatewayFinancialAmountException).toHaveBeenCalledWith(
      pendingRefund,
      authoritativeVoided
    );
    expect(mockQuery.mock.calls[1][1]).toEqual([
      'cancelled',
      'voided',
      JSON.stringify(authoritativeVoided),
      authoritativeVoided.created_at,
      pendingRefund.id,
      pendingRefund.status,
    ]);
    expect(mockClientQuery).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  test('quarantines a 10/100 provider refund without debiting the subscription balance', async () => {
    const localPayment = makeLocalPayment({
      amount: 100,
      category: 'subscription',
      financing_plan_id: null,
      status: 'paid',
      gateway_status: 'paid',
      gateway_amount_minor: 10000,
    });
    const partialRefund = makeProviderPayment({
      amount: 10000,
      status: 'refunded',
      refunded: 1000,
    });
    const exception = makeAmountException({
      kind: 'refund',
      expectedMinor: 10000,
      observedMinor: 1000,
    });
    mockQuery.mockResolvedValueOnce({ rows: [localPayment] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(partialRefund);
    mockDetectGatewayFinancialAmountException.mockReturnValueOnce(exception);
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: makeProviderPayment({ amount: 10000, status: 'refunded' }),
      },
    }, res);

    expect(mockRecordGatewayFinancialException).toHaveBeenCalledWith({
      localPayment,
      providerPayment: partialRefund,
      exception,
    });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockClientQuery).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'GATEWAY_REFUND_AMOUNT_MISMATCH_REVIEW_REQUIRED',
      review_required: true,
      review_recorded: true,
    }));
  });

  test('quarantines a partial refund for a paid legacy subscription without stored minor units', async () => {
    const localPayment = makeLocalPayment({
      amount: 100,
      category: 'subscription',
      financing_plan_id: null,
      status: 'paid',
      gateway_status: 'paid',
      gateway_amount_minor: null,
      gateway_currency: null,
    });
    const partialRefund = makeProviderPayment({
      amount: 10000,
      status: 'refunded',
      refunded: 1000,
      refunded_at: '2026-08-10T12:00:00.000Z',
    });
    const exception = makeAmountException({
      kind: 'refund',
      expectedMinor: 10000,
      observedMinor: 1000,
    });
    mockQuery.mockResolvedValueOnce({ rows: [localPayment] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(partialRefund);
    mockDetectGatewayFinancialAmountException.mockReturnValueOnce(exception);
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: { id: partialRefund.id },
      },
    }, res);

    expect(mockRecordGatewayFinancialException).toHaveBeenCalledWith({
      localPayment,
      providerPayment: partialRefund,
      exception,
    });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockGetClient).not.toHaveBeenCalled();
    expect(mockReverseSettledFinancingPayment).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'GATEWAY_REFUND_AMOUNT_MISMATCH_REVIEW_REQUIRED',
      review_required: true,
      review_recorded: true,
    }));
  });

  test('records contradictory settled void evidence before any financing reversal or mutation', async () => {
    const localPayment = makeLocalPayment({
      amount: 100,
      status: 'paid',
      gateway_status: 'paid',
      gateway_amount_minor: 10000,
    });
    const invalidVoid = makeProviderPayment({
      amount: 10000,
      status: 'voided',
      captured: 1000,
      voided_at: '2026-08-10T12:00:00.000Z',
    });
    const exception = makeAmountException({
      kind: 'void',
      expectedMinor: 10000,
      observedMinor: 1000,
    });
    mockQuery.mockResolvedValueOnce({ rows: [localPayment] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(invalidVoid);
    mockDetectGatewayFinancialAmountException.mockReturnValueOnce(exception);
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: makeProviderPayment({ amount: 10000, status: 'voided' }),
      },
    }, res);

    expect(mockRecordGatewayFinancialException).toHaveBeenCalledWith({
      localPayment,
      providerPayment: invalidVoid,
      exception,
    });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockClientQuery).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'GATEWAY_VOID_EVIDENCE_INVALID_REVIEW_REQUIRED',
      review_required: true,
      review_recorded: true,
    }));
  });

  test.each([
    {
      label: 'subscription',
      localOverrides: { category: 'subscription', financing_plan_id: null },
    },
    {
      label: 'financing',
      localOverrides: { category: 'financing_installment', financing_plan_id: 'plan-1' },
    },
  ])('quarantines a partial captured amount before any $label credit', async ({ localOverrides }) => {
    const localPayment = makeLocalPayment({
      ...localOverrides,
      amount: 100,
      gateway_amount_minor: 10000,
    });
    const partialCapture = makeProviderPayment({
      amount: 10000,
      status: 'captured',
      captured: 1000,
    });
    const exception = makeAmountException({
      kind: 'capture',
      expectedMinor: 10000,
      observedMinor: 1000,
    });
    mockQuery.mockResolvedValueOnce({ rows: [localPayment] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(partialCapture);
    mockDetectGatewayFinancialAmountException.mockReturnValueOnce(exception);
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: makeProviderPayment({ amount: 10000, status: 'captured' }),
      },
    }, res);

    expect(mockRecordGatewayFinancialException).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockClientQuery).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'GATEWAY_CAPTURE_AMOUNT_MISMATCH_REVIEW_REQUIRED',
      review_required: true,
      review_recorded: true,
    }));
  });

  test('routes an authenticated paid financing webhook through atomic settlement', async () => {
    const localPayment = makeLocalPayment();
    const providerPayment = makeProviderPayment();
    mockQuery
      .mockResolvedValueOnce({ rows: [localPayment] })
      .mockResolvedValueOnce({ rows: [{ ...localPayment, status: 'paid' }] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment);
    mockGetMoyasarGatewayOperationalReadiness.mockResolvedValue({ ready: false });
    mockSettleFinancingPayment.mockResolvedValueOnce({ payment: { ...localPayment, status: 'paid' } });
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: providerPayment,
      },
    }, res);

    expect(mockQuery.mock.calls[0][1]).toEqual([providerPayment.id]);
    expect(mockSettleFinancingPayment).toHaveBeenCalledWith({
      paymentId: localPayment.id,
      gatewayPaymentId: localPayment.gateway_payment_id,
      gatewayProvider: 'moyasar',
      gatewayResponse: providerPayment,
    });
    expect(mockGetMoyasarGatewayOperationalReadiness).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  test.each([
    ['refunded', { refunded: 12500, refunded_at: '2026-08-10T12:00:00.000Z' }],
    ['voided', { captured: 12500, voided_at: '2026-08-10T12:00:00.000Z' }],
  ])(
    'routes an authoritative %s webhook for a paid financing row through atomic reversal',
    async (providerStatus, providerEvidence) => {
      const localPayment = makeLocalPayment({ status: 'paid', gateway_status: 'paid' });
      const providerPayment = makeProviderPayment({
        status: providerStatus,
        ...providerEvidence,
      });
      const reversedPayment = {
        ...localPayment,
        status: providerStatus === 'refunded' ? 'refunded' : 'cancelled',
        gateway_status: providerStatus,
      };
      mockQuery.mockResolvedValueOnce({ rows: [localPayment] });
      mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment);
      mockReverseSettledFinancingPayment.mockResolvedValueOnce({
        payment: reversedPayment,
        idempotent_replay: false,
      });
      const res = makeResponse();

      await handleMoyasarWebhook({
        body: {
          secret_token: 'webhook-test-secret',
          data: { id: providerPayment.id, status: 'stale-body-status' },
        },
      }, res);

      expect(mockReverseSettledFinancingPayment).toHaveBeenCalledWith({
        paymentId: localPayment.id,
        gatewayPaymentId: localPayment.gateway_payment_id,
        gatewayProvider: 'moyasar',
        gatewayResponse: providerPayment,
        evidenceSource: 'webhook',
        reversedById: null,
      });
      expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true });
    }
  );

  test.each([
    'authorized',
    'verified',
    'unknown',
    'initiated',
    'failed',
    'canceled',
    'cancelled',
    'paid',
    'captured',
  ])(
    'keeps a paid subscription untouched for authoritative provider status %s',
    async (providerStatus) => {
      const localPayment = makeLocalPayment({
        amount: 100,
        category: 'subscription',
        financing_plan_id: null,
        status: 'paid',
        gateway_status: 'paid',
        gateway_amount_minor: 10000,
      });
      const providerPayment = makeProviderPayment({
        amount: 10000,
        status: providerStatus,
        ...(providerStatus === 'captured' ? { captured: 10000 } : {}),
      });
      mockQuery.mockResolvedValueOnce({ rows: [localPayment] });
      mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment);
      const res = makeResponse();

      await handleMoyasarWebhook({
        body: {
          secret_token: 'webhook-test-secret',
          data: { id: providerPayment.id, status: 'stale-body-status' },
        },
      }, res);

      expect(mockFetchMoyasarPayment).toHaveBeenCalledWith(localPayment.gateway_payment_id);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockGetClient).not.toHaveBeenCalled();
      expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
      expect(mockReverseSettledFinancingPayment).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true });
    }
  );

  test.each([
    ['refunded', { refunded: 10000 }],
    ['voided', { captured: 10000 }],
  ])(
    'keeps a paid subscription untouched for %s evidence without its provider timestamp',
    async (providerStatus, providerEvidence) => {
      const localPayment = makeLocalPayment({
        amount: 100,
        category: 'subscription',
        financing_plan_id: null,
        status: 'paid',
        gateway_status: 'paid',
        gateway_amount_minor: 10000,
      });
      const providerPayment = makeProviderPayment({
        amount: 10000,
        status: providerStatus,
        ...providerEvidence,
      });
      mockQuery.mockResolvedValueOnce({ rows: [localPayment] });
      mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment);
      const res = makeResponse();

      await handleMoyasarWebhook({
        body: {
          secret_token: 'webhook-test-secret',
          data: { id: providerPayment.id },
        },
      }, res);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockGetClient).not.toHaveBeenCalled();
      expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
      expect(mockReverseSettledFinancingPayment).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true });
    }
  );

  test.each([
    [
      'refunded',
      { refunded: 10000, refunded_at: '2026-08-10T12:00:00.000Z' },
      'refunded',
    ],
    [
      'voided',
      { captured: 10000, voided_at: '2026-08-10T12:00:00.000Z' },
      'cancelled',
    ],
  ])(
    'allows a paid subscription to transition only on exact full %s evidence',
    async (providerStatus, providerEvidence, expectedLocalStatus) => {
      const localPayment = makeLocalPayment({
        amount: 100,
        category: 'subscription',
        financing_plan_id: null,
        status: 'paid',
        gateway_status: 'paid',
        gateway_amount_minor: 10000,
      });
      const providerPayment = makeProviderPayment({
        amount: 10000,
        status: providerStatus,
        ...providerEvidence,
      });
      mockQuery
        .mockResolvedValueOnce({ rows: [localPayment] })
        .mockResolvedValueOnce({
          rows: [{
            ...localPayment,
            status: expectedLocalStatus,
            gateway_status: providerStatus,
          }],
        });
      mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment);
      const res = makeResponse();

      await handleMoyasarWebhook({
        body: {
          secret_token: 'webhook-test-secret',
          data: { id: providerPayment.id },
        },
      }, res);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[1][0]).toContain('UPDATE payments');
      expect(mockQuery.mock.calls[1][1]).toEqual([
        expectedLocalStatus,
        providerStatus,
        JSON.stringify(providerPayment),
        providerPayment.created_at,
        localPayment.id,
        localPayment.status,
      ]);
      expect(mockGetClient).not.toHaveBeenCalled();
      expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
      expect(mockReverseSettledFinancingPayment).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true });
    }
  );

  test.each([
    [
      'refunded',
      { refunded: 10000, refunded_at: '2026-08-10T12:00:00.000Z' },
      'refunded',
    ],
    [
      'voided',
      { captured: 10000, voided_at: '2026-08-10T12:00:00.000Z' },
      'cancelled',
    ],
  ])(
    'accepts exact full %s evidence for a paid legacy subscription without stored minor units',
    async (providerStatus, providerEvidence, expectedLocalStatus) => {
      const localPayment = makeLocalPayment({
        amount: 100,
        category: 'subscription',
        financing_plan_id: null,
        status: 'paid',
        gateway_status: 'paid',
        gateway_amount_minor: null,
        gateway_currency: null,
      });
      const providerPayment = makeProviderPayment({
        amount: 10000,
        currency: 'SAR',
        status: providerStatus,
        ...providerEvidence,
      });
      const updatedPayment = {
        ...localPayment,
        status: expectedLocalStatus,
        gateway_status: providerStatus,
      };
      mockQuery
        .mockResolvedValueOnce({ rows: [localPayment] })
        .mockResolvedValueOnce({ rows: [updatedPayment] });
      mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment);
      const res = makeResponse();

      await handleMoyasarWebhook({
        body: {
          secret_token: 'webhook-test-secret',
          data: { id: providerPayment.id },
        },
      }, res);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[1][1]).toEqual([
        expectedLocalStatus,
        providerStatus,
        JSON.stringify(providerPayment),
        providerPayment.created_at,
        localPayment.id,
        localPayment.status,
      ]);
      expect(mockGetClient).not.toHaveBeenCalled();
      expect(mockReverseSettledFinancingPayment).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true });
    }
  );

  test('returns the concurrent winner when a stale generic transition loses its status CAS', async () => {
    const stalePayment = makeLocalPayment({
      amount: 100,
      category: 'subscription',
      financing_plan_id: null,
      status: 'pending_verification',
      gateway_status: 'submission_started',
      gateway_amount_minor: 10000,
    });
    const currentPaidPayment = {
      ...stalePayment,
      status: 'paid',
      gateway_status: 'paid',
      gateway_verified_at: '2026-08-10T12:00:00.000Z',
    };
    const authoritativeFailure = makeProviderPayment({
      amount: 10000,
      status: 'failed',
    });
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [currentPaidPayment] });

    const result = await updatePaymentFromMoyasar({
      localPayment: stalePayment,
      moyasarPayment: authoritativeFailure,
    });

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[0][0]).toContain(
      'AND status IS NOT DISTINCT FROM $6::varchar'
    );
    expect(mockQuery.mock.calls[0][1][5]).toBe('pending_verification');
    expect(mockQuery.mock.calls[1]).toEqual([
      'SELECT * FROM payments WHERE id = $1 LIMIT 1',
      [stalePayment.id],
    ]);
    expect(result).toEqual(currentPaidPayment);
    expect(result.status).toBe('paid');
    expect(mockGetClient).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(mockReverseSettledFinancingPayment).not.toHaveBeenCalled();
  });

  test('never resurrects a concurrently verified void while persisting a stale subscription capture', async () => {
    const stalePendingPayment = makeLocalPayment({
      amount: 50,
      category: 'subscription',
      financing_plan_id: null,
      status: 'pending_verification',
      gateway_status: 'submission_started',
      gateway_amount_minor: 5000,
    });
    const verifiedVoidedPayment = {
      ...stalePendingPayment,
      status: 'cancelled',
      gateway_status: 'voided',
      gateway_verified_at: '2026-08-10T12:00:00.000Z',
    };
    const staleProviderCapture = makeProviderPayment({
      amount: 5000,
      status: 'paid',
    });
    mockQuery.mockResolvedValueOnce({ rows: [stalePendingPayment] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(staleProviderCapture);
    mockClientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: 'member-1', current_balance: '2500.00' }] })
      .mockResolvedValueOnce({ rows: [verifiedVoidedPayment] })
      .mockResolvedValueOnce({});
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: { id: staleProviderCapture.id },
      },
    }, res);

    expect(mockClientQuery).toHaveBeenCalledTimes(4);
    expect(mockClientQuery.mock.calls[0]).toEqual(['BEGIN']);
    expect(mockClientQuery.mock.calls[1][0]).toContain(
      'FROM members'
    );
    expect(mockClientQuery.mock.calls[1][1]).toEqual(['member-1']);
    expect(mockClientQuery.mock.calls[2][0]).toContain(
      'SELECT * FROM payments WHERE id = $1 FOR UPDATE'
    );
    expect(mockClientQuery.mock.calls[3]).toEqual(['COMMIT']);
    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes('UPDATE payments'))).toBe(false);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(mockReverseSettledFinancingPayment).not.toHaveBeenCalled();
    expect(mockClientRelease).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  test.each([
    ['paid', 'subscription', null, {}],
    ['captured', 'subscription', null, { captured: 5000 }],
    ['paid', 'financing', 'plan-1', {}],
    ['captured', 'financing', 'plan-1', { captured: 5000 }],
  ])(
    'routes an exact %s capture after local abandonment for %s to refund review only',
    async (providerStatus, label, financingPlanId, providerOverrides) => {
      const abandonedPayment = makeLocalPayment({
        amount: 50,
        category: financingPlanId ? 'financing_installment' : 'subscription',
        financing_plan_id: financingPlanId,
        status: 'cancelled',
        gateway_status: 'not_submitted',
        gateway_amount_minor: 5000,
        gateway_submission_started_at: null,
        gateway_abandoned_at: '2026-08-10T12:00:00.000Z',
        gateway_failure_reason: 'CLIENT_CANCELLED_BEFORE_PROVIDER_SUBMISSION',
      });
      const providerPayment = makeProviderPayment({
        amount: 5000,
        status: providerStatus,
        ...providerOverrides,
      });
      const reviewPayment = {
        ...abandonedPayment,
        status: 'pending_refund',
        gateway_status: providerStatus,
        gateway_verified_at: '2026-08-10T12:01:00.000Z',
        gateway_failure_reason: 'CAPTURE_AFTER_LOCAL_ABANDONMENT',
      };
      mockQuery
        .mockResolvedValueOnce({ rows: [abandonedPayment] })
        .mockResolvedValueOnce({ rows: [reviewPayment] });
      mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment);
      const res = makeResponse();

      await handleMoyasarWebhook({
        body: {
          secret_token: 'webhook-test-secret',
          data: { id: providerPayment.id },
        },
      }, res);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[1][0]).toContain("AND status = 'cancelled'");
      expect(mockQuery.mock.calls[1][0]).toContain("AND gateway_status = 'not_submitted'");
      expect(mockQuery.mock.calls[1][1]).toEqual([
        'pending_refund',
        providerStatus,
        JSON.stringify(providerPayment),
        'CAPTURE_AFTER_LOCAL_ABANDONMENT',
        abandonedPayment.id,
      ]);
      expect(mockGetClient).not.toHaveBeenCalled();
      expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
      expect(mockReverseSettledFinancingPayment).not.toHaveBeenCalled();
      expect(mockQuery.mock.calls.some(([sql]) =>
        sql.includes('financing_payment_allocations')
        || sql.includes('financing_repayment_plans')
        || sql.includes('financing_installments'))).toBe(false);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    }
  );

  test('quarantines a partial capture after financing abandonment without settlement or plan mutation', async () => {
    const abandonedPayment = makeLocalPayment({
      amount: 50,
      category: 'financing_installment',
      financing_plan_id: 'plan-1',
      status: 'cancelled',
      gateway_status: 'not_submitted',
      gateway_amount_minor: 5000,
      gateway_submission_started_at: null,
      gateway_abandoned_at: '2026-08-10T12:00:00.000Z',
      gateway_failure_reason: 'CLIENT_CANCELLED_BEFORE_PROVIDER_SUBMISSION',
    });
    const partialCapture = makeProviderPayment({
      amount: 5000,
      status: 'captured',
      captured: 1000,
    });
    const exception = makeAmountException({
      kind: 'capture',
      expectedMinor: 5000,
      observedMinor: 1000,
    });
    mockQuery.mockResolvedValueOnce({ rows: [abandonedPayment] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(partialCapture);
    mockDetectGatewayFinancialAmountException.mockReturnValueOnce(exception);
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: { id: partialCapture.id },
      },
    }, res);

    expect(mockRecordGatewayFinancialException).toHaveBeenCalledWith({
      localPayment: abandonedPayment,
      providerPayment: partialCapture,
      exception,
    });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockGetClient).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(mockReverseSettledFinancingPayment).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test.each([
    ['subscription', null],
    ['financing', 'plan-1'],
  ])('terminalizes an exact provider refund after abandoned %s checkout', async (_label, planId) => {
    const abandonedPayment = makeLocalPayment({
      amount: 50,
      category: planId ? 'financing_installment' : 'subscription',
      financing_plan_id: planId,
      status: 'cancelled',
      gateway_status: 'not_submitted',
      gateway_amount_minor: 5000,
      gateway_submission_started_at: null,
      gateway_abandoned_at: '2026-08-10T12:00:00.000Z',
      gateway_failure_reason: 'CLIENT_CANCELLED_BEFORE_PROVIDER_SUBMISSION',
    });
    const refundedProviderPayment = makeProviderPayment({
      amount: 5000,
      status: 'refunded',
      refunded: 5000,
      refunded_at: '2026-08-10T12:02:00.000Z',
    });
    const refundedPayment = {
      ...abandonedPayment,
      status: 'refunded',
      gateway_status: 'refunded',
      gateway_verified_at: '2026-08-10T12:03:00.000Z',
      gateway_failure_reason: null,
    };
    mockQuery
      .mockResolvedValueOnce({ rows: [abandonedPayment] })
      .mockResolvedValueOnce({ rows: [refundedPayment] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(refundedProviderPayment);
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: { id: refundedProviderPayment.id },
      },
    }, res);

    expect(mockQuery.mock.calls[1][1]).toEqual([
      'refunded',
      'refunded',
      JSON.stringify(refundedProviderPayment),
      null,
      abandonedPayment.id,
    ]);
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(mockReverseSettledFinancingPayment).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  test('keeps an abandoned identity under observation for nonterminal provider progress', async () => {
    const abandonedPayment = makeLocalPayment({
      amount: 50,
      category: 'subscription',
      financing_plan_id: null,
      status: 'cancelled',
      gateway_status: 'not_submitted',
      gateway_amount_minor: 5000,
      gateway_submission_started_at: null,
      gateway_abandoned_at: '2026-08-10T12:00:00.000Z',
    });
    const authorized = makeProviderPayment({ amount: 5000, status: 'authorized' });
    mockQuery.mockResolvedValueOnce({ rows: [abandonedPayment] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(authorized);
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: { secret_token: 'webhook-test-secret', data: { id: authorized.id } },
    }, res);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockGetClient).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  test('acknowledges a verified subscription capture as pending_refund when the cap is full', async () => {
    const localPayment = makeLocalPayment({
      amount: 50,
      category: 'subscription',
      financing_plan_id: null,
      gateway_amount_minor: 5000,
      gateway_status: 'paid',
    });
    const providerPayment = makeProviderPayment({ amount: 5000 });
    const reviewPayment = {
      ...localPayment,
      status: 'pending_refund',
      gateway_failure_reason: 'SUBSCRIPTION_LIMIT_EXCEEDED_AFTER_CAPTURE',
    };
    mockQuery.mockResolvedValueOnce({ rows: [localPayment] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment);
    mockClientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: 'member-1', current_balance: '3000.00' }] })
      .mockResolvedValueOnce({ rows: [localPayment] })
      .mockResolvedValueOnce({ rows: [reviewPayment] })
      .mockResolvedValueOnce({});
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: providerPayment,
      },
    }, res);

    expect(mockClientQuery.mock.calls.map(([sql]) => sql.trim().split(/\s+/).slice(0, 3).join(' ')))
      .toEqual([
        'BEGIN',
        'SELECT id, current_balance',
        'SELECT * FROM',
        'UPDATE payments SET',
        'COMMIT',
      ]);
    expect(mockClientQuery.mock.calls[3][1][0]).toBe('pending_refund');
    expect(mockClientQuery.mock.calls[3][0]).toContain(
      'SUBSCRIPTION_LIMIT_EXCEEDED_AFTER_CAPTURE'
    );
    expect(mockClientRelease).toHaveBeenCalledTimes(1);
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(res.status).not.toHaveBeenCalledWith(500);
  });

  test('credits a verified subscription capture normally when it remains within the cap', async () => {
    const localPayment = makeLocalPayment({
      amount: 50,
      category: 'subscription',
      financing_plan_id: null,
      gateway_amount_minor: 5000,
    });
    const providerPayment = makeProviderPayment({ amount: 5000 });
    mockQuery.mockResolvedValueOnce({ rows: [localPayment] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment);
    mockClientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: 'member-1', current_balance: '2950.00' }] })
      .mockResolvedValueOnce({ rows: [localPayment] })
      .mockResolvedValueOnce({ rows: [{ ...localPayment, status: 'paid' }] })
      .mockResolvedValueOnce({});
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: providerPayment,
      },
    }, res);

    expect(mockClientQuery.mock.calls[3][1][0]).toBe('paid');
    expect(mockClientQuery.mock.calls[3][1][1]).toBe('paid');
    expect(mockClientQuery).toHaveBeenLastCalledWith('COMMIT');
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  test('serializes subscription availability and session insertion on the beneficiary row', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    mockClientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: 'member-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ current_balance: '2950.00', reserved_gateway_amount: '0.00' }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'new-payment',
          payer_id: 'member-1',
          beneficiary_id: 'member-1',
          status: 'pending',
          gateway_provider: 'moyasar',
          gateway_payment_id: 'new-gateway-payment',
          gateway_amount_minor: 5000,
          gateway_currency: 'SAR',
          gateway_response: { description: 'stable description' },
          reference_number: 'MOY-STABLE',
        }],
      })
      .mockResolvedValueOnce({});
    const res = makeResponse();

    await createGatewaySession({
      user: { id: 'member-1', role: 'member' },
      body: { amount: 50, protocol_version: 2 },
    }, res);

    expect(mockClientQuery.mock.calls[0]).toEqual(['BEGIN']);
    expect(mockClientQuery.mock.calls[1]).toEqual([
      'SELECT id FROM members WHERE id = $1 FOR UPDATE',
      ['member-1'],
    ]);
    expect(mockClientQuery.mock.calls[2][0]).toContain('COALESCE(beneficiary_id, payer_id)');
    expect(mockClientQuery.mock.calls[3][0]).toContain("p.status = 'pending_refund'");
    expect(mockClientQuery.mock.calls[3][0]).toContain('p.financing_plan_id IS NULL');
    expect(mockClientQuery.mock.calls[3][0]).toContain("p.category = 'subscription'");
    expect(mockClientQuery.mock.calls[4][0]).toContain('INSERT INTO payments');
    expect(mockClientQuery.mock.calls[5]).toEqual(['COMMIT']);
    expect(mockClientRelease).toHaveBeenCalledTimes(1);
    expect(mockFetchMoyasarPayment).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('reuses retained submitted subscription intent after an ambiguous provider timeout', async () => {
    const retained = makeLocalPayment({
      id: 'subscription-payment-a',
      amount: '50',
      category: 'subscription',
      financing_plan_id: null,
      status: 'pending_verification',
      gateway_payment_id: 'subscription-given-id-a',
      gateway_amount_minor: 5000,
      gateway_protocol_version: 2,
      gateway_status: 'submission_started',
      gateway_submission_started_at: '2026-08-10T12:00:00.000Z',
      gateway_response: {
        protocol_version: 2,
        description: 'Al-Shuail subscription payment MOY-STABLE-A',
      },
      reference_number: 'MOY-STABLE-A',
    });
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    mockClientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: 'member-1' }] })
      .mockResolvedValueOnce({ rows: [retained] })
      .mockResolvedValueOnce({});
    const res = makeResponse();

    await createGatewaySession({
      user: { id: 'member-1', role: 'member' },
      body: { amount: 50, protocol_version: 2 },
    }, res);

    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes('INSERT INTO payments')))
      .toBe(false);
    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes('reserved_gateway_amount')))
      .toBe(false);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        payment_id: retained.id,
        gateway_session_id: retained.gateway_payment_id,
        description: retained.gateway_response.description,
        reused: true,
      }),
    }));
  });

  test('conflicts instead of creating payment B when an incompatible subscription intent A is open', async () => {
    const retained = makeLocalPayment({
      id: 'subscription-payment-a',
      payer_id: 'member-2',
      beneficiary_id: 'member-1',
      amount: '100',
      category: 'subscription',
      financing_plan_id: null,
      status: 'pending_verification',
      gateway_protocol_version: 2,
    });
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    mockClientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: 'member-1' }] })
      .mockResolvedValueOnce({ rows: [retained] })
      .mockResolvedValueOnce({});
    const res = makeResponse();

    await createGatewaySession({
      user: { id: 'member-1', role: 'member' },
      body: { amount: 50, memberId: 'member-1', protocol_version: 2 },
    }, res);

    expect(mockClientQuery).toHaveBeenLastCalledWith('ROLLBACK');
    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes('INSERT INTO payments')))
      .toBe(false);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'PAYMENT_INTENT_IN_PROGRESS',
    }));
  });

  test('requires protocol v2 before creating any checkout row', async () => {
    const res = makeResponse();

    await createGatewaySession({
      user: { id: 'member-1', role: 'member' },
      body: { amount: 50 },
    }, res);

    expect(res.status).toHaveBeenCalledWith(426);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'PAYMENT_PROTOCOL_UPGRADE_REQUIRED',
      required_protocol_version: 2,
    }));
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockGetClient).not.toHaveBeenCalled();
  });

  test.each([
    {
      label: 'the webhook secret is missing',
      configure: () => { mockConfig.paymentGateway.moyasar.webhookSecret = ''; },
      code: 'PAYMENT_GATEWAY_WEBHOOK_NOT_CONFIGURED',
    },
    {
      label: 'the configured currency is not SAR',
      configure: () => { mockConfig.paymentGateway.currency = 'KWD'; },
      code: 'PAYMENT_GATEWAY_CURRENCY_UNSUPPORTED',
    },
    {
      label: 'durable reconciliation is disabled',
      configure: () => { mockConfig.paymentGateway.reconciliationEnabled = false; },
      code: 'PAYMENT_GATEWAY_RECONCILIATION_DISABLED',
    },
  ])('fails closed before subscription session creation when $label', async ({ configure, code }) => {
    configure();
    const res = makeResponse();

    await createGatewaySession({
      user: { id: 'member-1', role: 'member' },
      body: { amount: 50, protocol_version: 2 },
    }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code }));
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockGetClient).not.toHaveBeenCalled();
  });

  test('fails closed before subscription creation when reconciliation schema is stale', async () => {
    mockGetMoyasarGatewayOperationalReadiness.mockResolvedValue({ ready: false });
    const res = makeResponse();

    await createGatewaySession({
      user: { id: 'member-1', role: 'member' },
      body: { amount: 50, protocol_version: 2 },
    }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'PAYMENT_GATEWAY_RECONCILIATION_SCHEMA_NOT_READY',
    }));
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockGetClient).not.toHaveBeenCalled();
  });

  test('atomically marks a prepared v2 session before provider submission', async () => {
    const prepared = makeLocalPayment({
      status: 'pending',
      gateway_status: 'prepared_v2',
      gateway_submission_started_at: null,
    });
    const submitted = {
      ...prepared,
      status: 'pending_verification',
      gateway_status: 'submission_started',
      gateway_submission_started_at: '2026-08-10T12:00:00.000Z',
    };
    mockQuery
      .mockResolvedValueOnce({ rows: [prepared] })
      .mockResolvedValueOnce({ rows: [submitted] });
    const res = makeResponse();

    await markGatewaySubmissionStarted({
      user: { id: 'member-1', role: 'member' },
      params: { paymentId: prepared.id },
      body: {
        protocol_version: 2,
        gateway_payment_id: prepared.gateway_payment_id,
      },
    }, res);

    expect(mockQuery.mock.calls[1][0]).toContain("gateway_status = $1");
    expect(mockQuery.mock.calls[1][0]).toContain("AND gateway_status = $5");
    expect(mockQuery.mock.calls[1][1]).toEqual([
      'submission_started',
      prepared.id,
      prepared.gateway_payment_id,
      2,
      'prepared_v2',
    ]);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ gateway_status: 'submission_started' }),
    }));
  });

  test('fails closed if checkout is disabled after preparation but before the marker', async () => {
    const prepared = makeLocalPayment({
      status: 'pending',
      gateway_status: 'prepared_v2',
      gateway_submission_started_at: null,
    });
    mockQuery.mockResolvedValueOnce({ rows: [prepared] });
    mockIsMoyasarEnabledForIos.mockReturnValue(false);
    const res = makeResponse();

    await markGatewaySubmissionStarted({
      user: { id: 'member-1', role: 'member' },
      params: { paymentId: prepared.id },
      body: { protocol_version: 2, gateway_payment_id: prepared.gateway_payment_id },
    }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'PAYMENT_GATEWAY_DISABLED',
    }));
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockFetchMoyasarPayment).not.toHaveBeenCalled();
  });

  test.each([
    {
      label: 'the webhook secret was removed',
      configure: () => { mockConfig.paymentGateway.moyasar.webhookSecret = ''; },
      code: 'PAYMENT_GATEWAY_WEBHOOK_NOT_CONFIGURED',
    },
    {
      label: 'the configured currency changed away from SAR',
      configure: () => { mockConfig.paymentGateway.currency = 'KWD'; },
      code: 'PAYMENT_GATEWAY_CURRENCY_UNSUPPORTED',
    },
    {
      label: 'durable reconciliation was disabled',
      configure: () => { mockConfig.paymentGateway.reconciliationEnabled = false; },
      code: 'PAYMENT_GATEWAY_RECONCILIATION_DISABLED',
    },
  ])('fails closed before the subscription submission marker when $label', async ({
    configure,
    code,
  }) => {
    const prepared = makeLocalPayment({
      category: 'subscription',
      financing_plan_id: null,
      status: 'pending',
      gateway_status: 'prepared_v2',
      gateway_submission_started_at: null,
    });
    mockQuery.mockResolvedValueOnce({ rows: [prepared] });
    configure();
    const res = makeResponse();

    await markGatewaySubmissionStarted({
      user: { id: 'member-1', role: 'member' },
      params: { paymentId: prepared.id },
      body: { protocol_version: 2, gateway_payment_id: prepared.gateway_payment_id },
    }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code }));
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockFetchMoyasarPayment).not.toHaveBeenCalled();
  });

  test('fails closed before submission marker when reconciliation schema is unavailable', async () => {
    const prepared = makeLocalPayment({
      status: 'pending',
      gateway_status: 'prepared_v2',
      gateway_submission_started_at: null,
    });
    mockQuery.mockResolvedValueOnce({ rows: [prepared] });
    mockGetMoyasarGatewayOperationalReadiness.mockResolvedValueOnce({ ready: false });
    const res = makeResponse();

    await markGatewaySubmissionStarted({
      user: { id: 'member-1', role: 'member' },
      params: { paymentId: prepared.id },
      body: { protocol_version: 2, gateway_payment_id: prepared.gateway_payment_id },
    }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'PAYMENT_GATEWAY_RECONCILIATION_SCHEMA_NOT_READY',
    }));
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('also re-checks the financing-specific kill switch at the marker boundary', async () => {
    const prepared = makeLocalPayment({
      status: 'pending',
      gateway_status: 'prepared_v2',
      gateway_submission_started_at: null,
    });
    mockQuery.mockResolvedValueOnce({ rows: [prepared] });
    mockIsFinancingOnlinePaymentEnabled.mockReturnValue(false);
    const res = makeResponse();

    await markGatewaySubmissionStarted({
      user: { id: 'member-1', role: 'member' },
      params: { paymentId: prepared.id },
      body: { protocol_version: 2, gateway_payment_id: prepared.gateway_payment_id },
    }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'FINANCING_GATEWAY_DISABLED',
    }));
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('still verifies a submitted capture after new checkout is disabled', async () => {
    const submitted = makeLocalPayment();
    const providerPayment = makeProviderPayment();
    mockIsMoyasarEnabledForIos.mockReturnValue(false);
    mockIsFinancingOnlinePaymentEnabled.mockReturnValue(false);
    mockConfig.paymentGateway.currency = 'KWD';
    mockConfig.paymentGateway.moyasar.webhookSecret = '';
    mockGetMoyasarGatewayOperationalReadiness.mockResolvedValue({ ready: false });
    mockQuery
      .mockResolvedValueOnce({ rows: [submitted] })
      .mockResolvedValueOnce({ rows: [{ ...submitted, status: 'paid', gateway_status: 'paid' }] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(providerPayment);
    mockSettleFinancingPayment.mockResolvedValueOnce({});
    const res = makeResponse();

    await verifyGatewaySession(makeVerifyRequest(), res);

    expect(mockFetchMoyasarPayment).toHaveBeenCalledWith(submitted.gateway_payment_id);
    expect(mockSettleFinancingPayment).toHaveBeenCalledTimes(1);
    expect(mockGetMoyasarGatewayOperationalReadiness).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'paid' }),
    }));
    expect(res.status).not.toHaveBeenCalledWith(503);
  });

  test('never verifies a prepared row before the submission marker', async () => {
    const prepared = makeLocalPayment({
      status: 'pending',
      gateway_status: 'prepared_v2',
      gateway_submission_started_at: null,
    });
    mockQuery.mockResolvedValueOnce({ rows: [prepared] });
    const res = makeResponse();

    await verifyGatewaySession(makeVerifyRequest(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'GATEWAY_SUBMISSION_NOT_STARTED',
    }));
    expect(mockFetchMoyasarPayment).not.toHaveBeenCalled();
  });

  test('acknowledges a delayed paid webhook without resurrecting a refunded subscription', async () => {
    const refunded = makeLocalPayment({
      amount: 50,
      category: 'subscription',
      financing_plan_id: null,
      status: 'refunded',
      gateway_status: 'refunded',
      gateway_amount_minor: 5000,
      gateway_verified_at: '2026-08-10T12:00:00.000Z',
    });
    mockQuery.mockResolvedValueOnce({ rows: [refunded] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(
      makeProviderPayment({ amount: 5000, status: 'refunded', refunded: 5000 })
    );
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: makeProviderPayment({ amount: 5000, status: 'paid' }),
      },
    }, res);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockFetchMoyasarPayment).toHaveBeenCalledWith(refunded.gateway_payment_id);
    expect(mockClientQuery).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  test('never resurrects a verified provider-voided subscription from a later paid event', async () => {
    const voided = makeLocalPayment({
      amount: 50,
      category: 'subscription',
      financing_plan_id: null,
      status: 'cancelled',
      gateway_status: 'voided',
      gateway_amount_minor: 5000,
      gateway_verified_at: '2026-08-10T12:00:00.000Z',
    });
    mockQuery.mockResolvedValueOnce({ rows: [voided] });
    mockFetchMoyasarPayment.mockResolvedValueOnce(
      makeProviderPayment({ amount: 5000, status: 'paid' })
    );
    const res = makeResponse();

    await handleMoyasarWebhook({
      body: {
        secret_token: 'webhook-test-secret',
        data: makeProviderPayment({ amount: 5000, status: 'paid' }),
      },
    }, res);

    expect(mockFetchMoyasarPayment).toHaveBeenCalledWith(voided.gateway_payment_id);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockClientQuery).not.toHaveBeenCalled();
    expect(mockSettleFinancingPayment).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  test('rejects a second serialized session after the first amount is reserved', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    mockClientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: 'member-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ current_balance: '2950.00', reserved_gateway_amount: '50.00' }],
      })
      .mockResolvedValueOnce({});
    const res = makeResponse();

    await createGatewaySession({
      user: { id: 'member-1', role: 'member' },
      body: { amount: 50, protocol_version: 2 },
    }, res);

    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes('INSERT INTO payments')))
      .toBe(false);
    expect(mockClientQuery).toHaveBeenLastCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'رصيد الاشتراك مكتمل ولا يمكن دفع مبلغ إضافي',
      code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
      available_amount: 0,
    });
  });

  test('retains a cancelled-sheet intent for delayed webhook reconciliation', async () => {
    const localPayment = makeLocalPayment({
      financing_plan_id: null,
      gateway_protocol_version: null,
      gateway_status: 'created',
      gateway_submission_started_at: null,
      status: 'pending',
    });
    mockQuery.mockResolvedValueOnce({ rows: [localPayment] });
    const res = makeResponse();

    await cancelGatewaySession(makeVerifyRequest(), res);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        payment_id: localPayment.id,
        status: 'pending',
        retained_for_reconciliation: true,
      }),
    }));
  });

  test('releases only a prepared v2 session as terminal not_submitted', async () => {
    const prepared = makeLocalPayment({
      financing_plan_id: null,
      status: 'pending',
      gateway_status: 'prepared_v2',
      gateway_submission_started_at: null,
    });
    const cancelled = {
      ...prepared,
      status: 'cancelled',
      gateway_status: 'not_submitted',
      gateway_abandoned_at: '2026-08-10T12:01:00.000Z',
    };
    mockQuery
      .mockResolvedValueOnce({ rows: [prepared] })
      .mockResolvedValueOnce({ rows: [cancelled] });
    const res = makeResponse();

    await cancelGatewaySession(makeVerifyRequest(), res);

    expect(mockQuery.mock.calls[1][0]).toContain("AND gateway_status = $5");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'cancelled',
        gateway_status: 'not_submitted',
        released: true,
      }),
    }));
    expect(mockFetchMoyasarPayment).not.toHaveBeenCalled();
  });

  test('a marker winning the cancel race retains the identity even when Moyasar returns 404', async () => {
    const prepared = makeLocalPayment({
      status: 'pending',
      gateway_status: 'prepared_v2',
      gateway_submission_started_at: null,
    });
    const submitted = makeLocalPayment();
    mockQuery
      .mockResolvedValueOnce({ rows: [prepared] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [submitted] });
    mockFetchMoyasarPayment.mockRejectedValueOnce(
      Object.assign(new Error('not found'), { statusCode: 404 })
    );
    const res = makeResponse();

    await cancelGatewaySession(makeVerifyRequest(), res);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        retained_for_reconciliation: true,
        released: false,
      }),
    }));
  });
});
