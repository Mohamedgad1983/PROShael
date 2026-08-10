import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();
const mockRecordStatusChange = jest.fn();
const mockCreateMemberNotification = jest.fn();
const mockAllocateSequence = jest.fn();

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: mockGetClient,
}));

jest.unstable_mockModule('../../../src/services/statusHistoryService.js', () => ({
  recordStatusChange: mockRecordStatusChange,
}));

jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({
  createMemberNotification: mockCreateMemberNotification,
}));

jest.unstable_mockModule('../../../src/services/sequenceGenerator.js', () => ({
  allocateSequence: mockAllocateSequence,
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  log: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const {
  MARRIAGE_STATUS,
  SIGNER_ROLE,
  calculateAndSnapshot,
  createRequest,
  decorateRequestForParticipant,
  generatePdfAndStamp,
  generateRequestHash,
  notifyNextSigner,
  recordSignature,
  validateWitnessAssignments,
} = await import('../../../src/services/marriageSupportService.js');

const IDS = {
  request: '11111111-1111-4111-8111-111111111111',
  beneficiary: '22222222-2222-4222-8222-222222222222',
  witness1: '33333333-3333-4333-8333-333333333333',
  witness2: '44444444-4444-4444-8444-444444444444',
  chair: '55555555-5555-4555-8555-555555555555',
};

function requestFixture(overrides = {}) {
  const request = {
    id: IDS.request,
    sequence_number: '2026-0001',
    member_id: IDS.beneficiary,
    applicant_name: 'المستفيد',
    national_id: '1234567890',
    spouse_name_ar: 'الزوجة',
    spouse_national_id: '0987654321',
    marriage_date: '2026-08-01',
    contributions_sum: '10000.00',
    previous_ananiyat_count_auto: 0,
    additional_support_balance: '0.00',
    special_ananiya_value: '0.00',
    final_amount: '10000.00',
    witness_1_id: IDS.witness1,
    witness_2_id: IDS.witness2,
    witness_1_name: 'الشاهد الأول',
    witness_2_name: 'الشاهد الثاني',
    committee_chair_id: IDS.chair,
    status: MARRIAGE_STATUS.AWAITING_SIGNATURES,
    ...overrides,
  };
  if (request.pdf_data_hash === undefined) {
    request.pdf_data_hash = generateRequestHash(request);
  }
  return request;
}

function emptyResult() {
  return { rows: [] };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetClient.mockResolvedValue(mockClient);
  mockRecordStatusChange.mockResolvedValue(undefined);
  mockCreateMemberNotification.mockResolvedValue({
    success: true,
    deliveredVia: 'push',
    inAppStored: true,
  });
  mockClient.query.mockResolvedValue(emptyResult());
  mockQuery.mockResolvedValue(emptyResult());
});

describe('marriage support participant metadata', () => {
  test('marks an assigned witness as the current signer', () => {
    const request = requestFixture();
    const decorated = decorateRequestForParticipant(
      request,
      IDS.witness1,
      [{ signer_role: SIGNER_ROLE.BENEFICIARY }]
    );

    expect(decorated).toEqual(expect.objectContaining({
      participant_role: SIGNER_ROLE.WITNESS_1,
      next_signer_role: SIGNER_ROLE.WITNESS_1,
      can_current_user_sign: true,
    }));
    expect(decorated.signature_summary).toEqual(expect.objectContaining({
      signed_count: 1,
      total_count: 4,
      next_signer_name: 'الشاهد الأول',
    }));
  });

  test('never grants an unrelated authenticated member signing permission', () => {
    const decorated = decorateRequestForParticipant(
      requestFixture(),
      '66666666-6666-4666-8666-666666666666',
      []
    );
    expect(decorated.participant_role).toBeNull();
    expect(decorated.can_current_user_sign).toBe(false);
  });
});

describe('recordSignature authorization, order, and idempotency', () => {
  test('derives witness_1 from the authenticated member and notifies witness_2', async () => {
    const request = requestFixture();
    mockClient.query.mockImplementation((sql, params) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {return emptyResult();}
      if (sql.includes('FROM marriage_support_requests') && sql.includes('FOR UPDATE')) {
        return { rows: [request] };
      }
      if (sql.includes('FROM marriage_support_signatures')) {
        return { rows: [{ signer_role: SIGNER_ROLE.BENEFICIARY, signer_member_id: IDS.beneficiary }] };
      }
      if (sql.includes('INSERT INTO marriage_support_signatures')) {
        expect(params[1]).toBe(SIGNER_ROLE.WITNESS_1);
        expect(params[2]).toBe(IDS.witness1);
        return emptyResult();
      }
      throw new Error(`Unexpected client SQL: ${sql}`);
    });
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('FROM marriage_support_requests')) {return { rows: [request] };}
      if (sql.includes('FROM marriage_support_signatures')) {
        return {
          rows: [
            { signer_role: SIGNER_ROLE.BENEFICIARY },
            { signer_role: SIGNER_ROLE.WITNESS_1 },
          ],
        };
      }
      if (sql.includes('FROM notifications')) {return emptyResult();}
      throw new Error(`Unexpected global SQL: ${sql}`);
    });

    const result = await recordSignature({
      requestId: IDS.request,
      signerMemberId: IDS.witness1,
      signerRole: null,
      signerName: 'اسم لا يؤخذ من العميل',
    });

    expect(result.signer_role).toBe(SIGNER_ROLE.WITNESS_1);
    expect(result.next_signer_role).toBe(SIGNER_ROLE.WITNESS_2);
    expect(mockCreateMemberNotification).toHaveBeenCalledWith(
      IDS.witness2,
      expect.objectContaining({
        type: 'marriage_support_signature_reminder',
        data: expect.objectContaining({ signer_role: SIGNER_ROLE.WITNESS_2 }),
      })
    );
  });

  test('rejects an out-of-order assigned witness without inserting a signature', async () => {
    const request = requestFixture();
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {return emptyResult();}
      if (sql.includes('FROM marriage_support_requests')) {return { rows: [request] };}
      if (sql.includes('FROM marriage_support_signatures')) {
        return { rows: [{ signer_role: SIGNER_ROLE.BENEFICIARY, signer_member_id: IDS.beneficiary }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(recordSignature({
      requestId: IDS.request,
      signerMemberId: IDS.witness2,
    })).rejects.toMatchObject({ code: 'OUT_OF_ORDER' });
    expect(mockClient.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO marriage_support_signatures'))).toBe(false);
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('rejects an explicit proxy role even when the user is another participant', async () => {
    const request = requestFixture();
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {return emptyResult();}
      if (sql.includes('FROM marriage_support_requests')) {return { rows: [request] };}
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(recordSignature({
      requestId: IDS.request,
      signerRole: SIGNER_ROLE.BENEFICIARY,
      signerMemberId: IDS.witness1,
    })).rejects.toMatchObject({ code: 'SIGNER_MISMATCH' });
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('treats a stale duplicate from the same witness as idempotent', async () => {
    const request = requestFixture();
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {return emptyResult();}
      if (sql.includes('FROM marriage_support_requests')) {return { rows: [request] };}
      if (sql.includes('FROM marriage_support_signatures')) {
        return {
          rows: [
            { signer_role: SIGNER_ROLE.BENEFICIARY, signer_member_id: IDS.beneficiary },
            { signer_role: SIGNER_ROLE.WITNESS_1, signer_member_id: IDS.witness1 },
          ],
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await recordSignature({
      requestId: IDS.request,
      signerMemberId: IDS.witness1,
    });

    expect(result).toEqual(expect.objectContaining({
      ok: true,
      alreadySigned: true,
      signer_role: SIGNER_ROLE.WITNESS_1,
    }));
    expect(mockClient.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO marriage_support_signatures'))).toBe(false);
    expect(mockCreateMemberNotification).not.toHaveBeenCalled();
  });
});

describe('fourth signature transactionality', () => {
  test('rolls back the signature and status update when history insertion fails', async () => {
    const request = requestFixture();
    const existing = [
      { signer_role: SIGNER_ROLE.BENEFICIARY, signer_member_id: IDS.beneficiary },
      { signer_role: SIGNER_ROLE.WITNESS_1, signer_member_id: IDS.witness1 },
      { signer_role: SIGNER_ROLE.WITNESS_2, signer_member_id: IDS.witness2 },
    ];
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {return emptyResult();}
      if (sql.includes('FROM marriage_support_requests')) {return { rows: [request] };}
      if (sql.includes('FROM marriage_support_signatures')) {return { rows: existing };}
      if (sql.includes('INSERT INTO marriage_support_signatures')) {return emptyResult();}
      if (sql.includes('UPDATE marriage_support_requests')) {
        return { rows: [{ ...request, status: MARRIAGE_STATUS.SIGNATURES_COMPLETE }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    mockRecordStatusChange.mockRejectedValueOnce(new Error('history insert failed'));

    await expect(recordSignature({
      requestId: IDS.request,
      signerMemberId: IDS.chair,
      signerRole: SIGNER_ROLE.COMMITTEE_CHAIR,
    })).rejects.toThrow('history insert failed');

    expect(mockRecordStatusChange).toHaveBeenCalledWith(expect.objectContaining({
      fromStatus: MARRIAGE_STATUS.AWAITING_SIGNATURES,
      toStatus: MARRIAGE_STATUS.SIGNATURES_COMPLETE,
      client: mockClient,
    }));
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
    expect(mockCreateMemberNotification).not.toHaveBeenCalled();
  });

  test('commits signature, completed status, and history before notifying', async () => {
    const request = requestFixture();
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {return emptyResult();}
      if (sql.includes('FROM marriage_support_requests')) {return { rows: [request] };}
      if (sql.includes('FROM marriage_support_signatures')) {
        return {
          rows: [
            { signer_role: SIGNER_ROLE.BENEFICIARY, signer_member_id: IDS.beneficiary },
            { signer_role: SIGNER_ROLE.WITNESS_1, signer_member_id: IDS.witness1 },
            { signer_role: SIGNER_ROLE.WITNESS_2, signer_member_id: IDS.witness2 },
          ],
        };
      }
      if (sql.includes('INSERT INTO marriage_support_signatures')) {return emptyResult();}
      if (sql.includes('UPDATE marriage_support_requests')) {
        return { rows: [{ ...request, status: MARRIAGE_STATUS.SIGNATURES_COMPLETE }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await recordSignature({
      requestId: IDS.request,
      signerMemberId: IDS.chair,
      signerRole: SIGNER_ROLE.COMMITTEE_CHAIR,
    });

    expect(result.allDone).toBe(true);
    const commitCall = mockClient.query.mock.calls.findIndex(([sql]) => sql === 'COMMIT');
    const updateCall = mockClient.query.mock.calls.findIndex(([sql]) => sql.includes('UPDATE marriage_support_requests'));
    expect(updateCall).toBeGreaterThan(-1);
    expect(commitCall).toBeGreaterThan(updateCall);
    expect(mockCreateMemberNotification).toHaveBeenCalledWith(
      IDS.beneficiary,
      expect.objectContaining({ type: 'marriage_support_status_update' })
    );
  });
});

describe('witness and signing-data validation', () => {
  test('rejects duplicate witnesses before opening signatures', async () => {
    const invalid = requestFixture({
      status: MARRIAGE_STATUS.DATA_ENTERED,
      witness_2_id: IDS.witness1,
      pdf_data_hash: null,
    });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {return emptyResult();}
      if (sql.includes('FROM marriage_support_requests')) {return { rows: [invalid] };}
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(generatePdfAndStamp({
      requestId: IDS.request,
      changedById: IDS.chair,
      actorRole: 'marriage_committee_chair',
    })).rejects.toMatchObject({ code: 'WITNESSES_MUST_BE_DISTINCT' });
    expect(mockClient.query.mock.calls.some(([sql]) => sql.includes('UPDATE marriage_support_requests'))).toBe(false);
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('requires both witnesses to exist as members', async () => {
    const request = requestFixture();
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: IDS.witness1, full_name_ar: 'الشاهد الأول' }],
    });
    await expect(validateWitnessAssignments(request)).rejects.toMatchObject({ code: 'WITNESS_NOT_FOUND' });
  });

  test('does not calculate after committee review has ended', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('marriage_support_settings')) {return { rows: [] };}
      if (sql.includes('SELECT member_id, status')) {
        return { rows: [{ member_id: IDS.beneficiary, status: MARRIAGE_STATUS.DATA_ENTERED }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(calculateAndSnapshot({
      requestId: IDS.request,
      contributionsSum: 1000,
    })).rejects.toMatchObject({ code: 'INVALID_STATE' });
    expect(mockQuery.mock.calls.some(([sql]) => sql.includes('UPDATE marriage_support_requests'))).toBe(false);
  });
});

describe('next-signer reminders and production notification delivery', () => {
  test('deduplicates reminders during the cooldown window', async () => {
    const requestId = '77777777-7777-4777-8777-777777777777';
    const request = requestFixture({ id: requestId });
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('FROM marriage_support_requests')) {return { rows: [request] };}
      if (sql.includes('FROM marriage_support_signatures')) {
        return { rows: [{ signer_role: SIGNER_ROLE.BENEFICIARY }] };
      }
      if (sql.includes('FROM notifications')) {return emptyResult();}
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const first = await notifyNextSigner({ requestId, requestedById: IDS.chair });
    const second = await notifyNextSigner({ requestId, requestedById: IDS.chair });

    expect(first).toEqual(expect.objectContaining({
      notified: true,
      next_signer_role: SIGNER_ROLE.WITNESS_1,
    }));
    expect(second).toEqual(expect.objectContaining({
      notified: false,
      cooldown_active: true,
      next_signer_role: SIGNER_ROLE.WITNESS_1,
    }));
    expect(mockCreateMemberNotification).toHaveBeenCalledTimes(1);
  });

  test('returns SUBMITTED notification delivery with a newly created request', async () => {
    const created = requestFixture({
      status: MARRIAGE_STATUS.SUBMITTED,
      pdf_data_hash: null,
    });
    mockAllocateSequence.mockResolvedValue({
      formatted: created.sequence_number,
      year: 2026,
      sequenceInYear: 1,
    });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') {return emptyResult();}
      if (sql.includes('FROM members')) {
        return {
          rows: [{
            full_name_ar: created.applicant_name,
            national_id: created.national_id,
            date_of_birth: null,
          }],
        };
      }
      if (sql.includes('INSERT INTO marriage_support_requests')) {return { rows: [created] };}
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await createRequest({
      memberId: IDS.beneficiary,
      payload: {
        national_id: created.national_id,
        spouse_name_ar: created.spouse_name_ar,
        marriage_date: created.marriage_date,
      },
    });

    expect(result.notification_delivery).toEqual(expect.objectContaining({ success: true }));
    expect(mockCreateMemberNotification).toHaveBeenCalledWith(
      IDS.beneficiary,
      expect.objectContaining({
        title: 'تم استلام طلب دعم الزواج',
        type: 'marriage_support_status_update',
      })
    );
  });
});
