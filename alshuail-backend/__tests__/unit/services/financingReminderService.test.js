import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();
const mockPersistNotification = jest.fn();
const mockSendPush = jest.fn();

const mockConfig = {
  financingRepayment: {
    remindersEnabled: true,
    businessTimeZone: 'Asia/Riyadh',
  },
};

jest.unstable_mockModule('../../../src/services/database.js', () => ({
  query: mockQuery,
  getClient: mockGetClient,
}));

jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({
  persistIdempotentMemberNotification: mockPersistNotification,
  sendPushNotification: mockSendPush,
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
  cancelFinancingReminderJobsForInstallmentInTransaction,
  financingReminderCollapseKey,
  financingReminderIdempotencyKey,
  processFinancingReminders,
  seedFinancingReminderJobsForInstallmentInTransaction,
} = await import('../../../src/services/financingReminderService.js');

const IDS = {
  reminder: '11111111-1111-4111-8111-111111111111',
  installment: '22222222-2222-4222-8222-222222222222',
  plan: '33333333-3333-4333-8333-333333333333',
  member: '44444444-4444-4444-8444-444444444444',
  notification: '55555555-5555-4555-8555-555555555555',
};

const emptyResult = () => ({ rows: [], rowCount: 0 });

function makeClient(handler) {
  return {
    query: jest.fn(handler),
    release: jest.fn(),
  };
}

function inboxJob() {
  return {
    id: IDS.reminder,
    claim_token: '66666666-6666-4666-8666-666666666666',
    attempt_count: 1,
  };
}

function pushJob({ generation = 1, reminderType = 'due_3_days' } = {}) {
  return {
    id: IDS.reminder,
    claim_token: '77777777-7777-4777-8777-777777777777',
    external_attempt_count: 1,
    installment_id: IDS.installment,
    plan_id: IDS.plan,
    member_id: IDS.member,
    program_type: 'family_financing',
    title: 'تذكير بقسط التمويل',
    body: 'موعد القسط 12 أغسطس 2026.',
    generation,
    collapse_key: financingReminderCollapseKey(IDS.installment, reminderType, generation),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConfig.financingRepayment.remindersEnabled = true;
  mockQuery.mockResolvedValue(emptyResult());
  mockPersistNotification.mockResolvedValue({
    notificationId: IDS.notification,
    created: true,
  });
  mockSendPush.mockResolvedValue({ success: true, messageId: 'fcm-message-1' });
});

describe('durable financing reminder policy', () => {
  test('uses deterministic inbox and provider-collapse identities', () => {
    expect(financingReminderIdempotencyKey(IDS.installment, 'due_today'))
      .toBe(`financing-reminder:${IDS.installment}:due_today`);
    const first = financingReminderCollapseKey(IDS.installment, 'due_today');
    const replay = financingReminderCollapseKey(IDS.installment, 'due_today');
    const other = financingReminderCollapseKey(IDS.installment, 'overdue_1_day');
    const generationTwoKey = financingReminderIdempotencyKey(
      IDS.installment,
      'due_today',
      2
    );
    const generationTwoCollapse = financingReminderCollapseKey(
      IDS.installment,
      'due_today',
      2
    );
    expect(first).toBe(replay);
    expect(first).toMatch(/^[a-f0-9]{32}$/);
    expect(other).not.toBe(first);
    expect(generationTwoKey)
      .toBe(`financing-reminder:${IDS.installment}:due_today:g2`);
    expect(generationTwoCollapse).toMatch(/^[a-f0-9]{32}$/);
    expect(generationTwoCollapse).not.toBe(first);
  });

  test('seeds all six milestones idempotently inside plan activation', async () => {
    const client = makeClient(() => Promise.resolve({ rows: [], rowCount: 6 }));
    await seedFinancingReminderJobsForInstallmentInTransaction({
      client,
      installmentId: IDS.installment,
      dueDate: '2026-08-15',
    });
    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("('due_7_days'::varchar, -7)");
    expect(sql).toContain("('overdue_7_days'::varchar, 7)");
    expect(sql).toContain('ON CONFLICT (installment_id, reminder_type) DO NOTHING');
    expect(params).toEqual([IDS.installment, '2026-08-15']);
  });

  test('settlement cancellation terminally skips unsent external work', async () => {
    const client = makeClient(() => Promise.resolve(emptyResult()));
    await cancelFinancingReminderJobsForInstallmentInTransaction({
      client,
      installmentId: IDS.installment,
    });
    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("ELSE 'cancelled'");
    expect(sql).toContain("ELSE 'skipped'");
    expect(params).toEqual([IDS.installment, 'installment_paid']);
  });

  test('kill switch exits before every database or notification write', async () => {
    mockConfig.financingRepayment.remindersEnabled = false;
    await expect(processFinancingReminders())
      .rejects.toMatchObject({ code: 'FINANCING_REMINDERS_DISABLED' });
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockGetClient).not.toHaveBeenCalled();
    expect(mockPersistNotification).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
  });
});

describe('crash-safe reminder processing', () => {
  function installGlobalRun({
    withInbox = true,
    withPush = true,
    exhaustedPushJobs = 0,
    generation = 1,
  } = {}) {
    const events = [];
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('UPDATE financing_installments')) {return Promise.resolve(emptyResult());}
      if (sql.includes('UPDATE financing_repayment_plans')) {return Promise.resolve(emptyResult());}
      if (sql.includes('INSERT INTO financing_reminder_log')) {return Promise.resolve(emptyResult());}
      if (sql.includes('UPDATE financing_reminder_log l') && sql.includes('cancellation_reason = CASE')) {
        return Promise.resolve(emptyResult());
      }
      if (sql.includes('UPDATE financing_reminder_log older')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      if (sql.includes('push_retry_limit_exhausted_after_unknown_or_failed_delivery')) {
        expect(sql).toContain('external_attempt_count >= $1');
        expect(sql).toContain("external_status = 'sending'");
        expect(sql).toContain('lease_expires_at < NOW()');
        return Promise.resolve({ rows: [], rowCount: exhaustedPushJobs });
      }
      if (sql.includes("SET delivery_status = 'processing'")) {
        expect(sql).toContain('scheduled_for <=');
        expect(sql).toContain('next_attempt_at <= NOW()');
        expect(sql).toContain('FOR UPDATE OF l SKIP LOCKED');
        expect(sql).not.toContain('days_until IN');
        return Promise.resolve({ rows: withInbox ? [inboxJob()] : [], rowCount: withInbox ? 1 : 0 });
      }
      if (sql.includes("SET external_status = 'sending'")) {
        events.push('push_claim');
        expect(sql).toContain('FOR UPDATE OF l SKIP LOCKED');
        return Promise.resolve({
          rows: withPush ? [pushJob({ generation })] : [],
          rowCount: withPush ? 1 : 0,
        });
      }
      if (sql.includes('SELECT EXISTS (') && sql.includes("external_status = 'sending'")) {
        return Promise.resolve({ rows: [{ eligible: true }], rowCount: 1 });
      }
      if (sql.includes("SET external_status = 'sent'")) {return Promise.resolve(emptyResult());}
      if (sql.includes("SET external_status = 'failed'")) {return Promise.resolve(emptyResult());}
      if (sql.includes("SET external_status = 'skipped'")) {return Promise.resolve(emptyResult());}
      throw new Error(`Unexpected global SQL: ${sql}`);
    });
    return events;
  }

  function eligibleClient({ paid = false, events = [], generation = 1 } = {}) {
    return makeClient((sql) => {
      if (sql === 'BEGIN') {
        events.push('begin');
        return Promise.resolve(emptyResult());
      }
      if (sql === 'COMMIT') {
        events.push('commit');
        return Promise.resolve(emptyResult());
      }
      if (sql === 'ROLLBACK') {return Promise.resolve(emptyResult());}
      if (sql.includes('SELECT installment_id FROM financing_reminder_log')) {
        return Promise.resolve({ rows: [{ installment_id: IDS.installment }], rowCount: 1 });
      }
      if (sql.includes('SELECT plan_id FROM financing_installments')) {
        return Promise.resolve({ rows: [{ plan_id: IDS.plan }], rowCount: 1 });
      }
      if (sql.includes('FROM financing_repayment_plans') && sql.includes('FOR UPDATE')) {
        events.push('plan_lock');
        return Promise.resolve({ rows: [{
          id: IDS.plan,
          member_id: IDS.member,
          program_type: 'family_financing',
          status: 'active',
        }], rowCount: 1 });
      }
      if (sql.includes('FROM financing_installments') && sql.includes('FOR UPDATE')) {
        events.push('installment_lock');
        return Promise.resolve({ rows: [{
          id: IDS.installment,
          plan_id: IDS.plan,
          installment_number: 1,
          due_date: '2026-08-15',
          amount: '345',
          paid_amount: paid ? '345' : '100',
          days_until: 2,
        }], rowCount: 1 });
      }
      if (sql.includes('FROM financing_reminder_log') && sql.includes('FOR UPDATE')) {
        events.push('reminder_lock');
        return Promise.resolve({ rows: [{
          id: IDS.reminder,
          installment_id: IDS.installment,
          reminder_type: 'due_3_days',
          scheduled_for: '2026-08-12',
          generation,
          delivery_status: 'processing',
          claim_token: inboxJob().claim_token,
        }], rowCount: 1 });
      }
      if (sql.includes('scheduled_for > $2')) {return Promise.resolve(emptyResult());}
      if (sql.includes('UPDATE financing_reminder_log')) {
        events.push(paid ? 'cancelled' : 'inbox_terminal');
        return Promise.resolve(emptyResult());
      }
      throw new Error(`Unexpected client SQL: ${sql}`);
    });
  }

  test('catches up a missed milestone, commits one inbox row, then sends push', async () => {
    const events = installGlobalRun();
    const clientEvents = [];
    const client = eligibleClient({ events: clientEvents });
    mockGetClient.mockResolvedValueOnce(client);
    mockPersistNotification.mockImplementationOnce((_memberId, payload, options) => {
      clientEvents.push('persist');
      expect(payload.body).toContain('موعد القسط');
      expect(payload.body).not.toContain('متبقي 3 أيام');
      expect(options.client).toBe(client);
      expect(options.idempotencyKey)
        .toBe(financingReminderIdempotencyKey(IDS.installment, 'due_3_days'));
      return Promise.resolve({ notificationId: IDS.notification, created: true });
    });
    mockSendPush.mockImplementationOnce((_memberId, _notification, data, options) => {
      events.push('push_send');
      const collapse = financingReminderCollapseKey(IDS.installment, 'due_3_days');
      expect(data.collapse_key).toBe(collapse);
      expect(options.android.collapseKey).toBe(collapse);
      expect(options.apns.headers['apns-collapse-id']).toBe(collapse);
      return Promise.resolve({ success: true, messageId: 'fcm-message-1' });
    });

    await expect(processFinancingReminders()).resolves.toEqual(expect.objectContaining({
      candidates: 1,
      attempted: 1,
      sent: 1,
      superseded: 1,
      push_attempted: 1,
      push_sent: 1,
    }));
    expect(clientEvents).toEqual([
      'begin',
      'plan_lock',
      'installment_lock',
      'reminder_lock',
      'persist',
      'inbox_terminal',
      'commit',
    ]);
    expect(events.indexOf('push_claim')).toBeLessThan(events.indexOf('push_send'));
    expect(mockPersistNotification).toHaveBeenCalledTimes(1);
    expect(mockSendPush).toHaveBeenCalledTimes(1);
  });

  test('cancels a paid-after-selection job during the JIT locked recheck', async () => {
    installGlobalRun({ withPush: false });
    const client = eligibleClient({ paid: true });
    mockGetClient.mockResolvedValueOnce(client);

    await expect(processFinancingReminders()).resolves.toEqual(expect.objectContaining({
      candidates: 1,
      attempted: 1,
      sent: 0,
      cancelled: 1,
      push_attempted: 0,
    }));
    expect(mockPersistNotification).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  test('an idempotent inbox replay is linked without creating a second row', async () => {
    installGlobalRun({ withPush: false });
    const client = eligibleClient();
    mockGetClient.mockResolvedValueOnce(client);
    mockPersistNotification.mockResolvedValueOnce({
      notificationId: IDS.notification,
      created: false,
    });

    await expect(processFinancingReminders()).resolves.toEqual(expect.objectContaining({
      sent: 1,
      push_attempted: 0,
    }));
    expect(mockPersistNotification).toHaveBeenCalledTimes(1);
  });

  test('reopened generation creates one fresh inbox and push identity without changing generation one', async () => {
    const generationOneInboxKey = financingReminderIdempotencyKey(
      IDS.installment,
      'due_3_days'
    );
    const generationOneCollapseKey = financingReminderCollapseKey(
      IDS.installment,
      'due_3_days'
    );
    const generationTwoInboxKey = financingReminderIdempotencyKey(
      IDS.installment,
      'due_3_days',
      2
    );
    const generationTwoCollapseKey = financingReminderCollapseKey(
      IDS.installment,
      'due_3_days',
      2
    );
    const events = installGlobalRun({ generation: 2 });
    const client = eligibleClient({ generation: 2 });
    mockGetClient.mockResolvedValueOnce(client);

    mockPersistNotification.mockImplementationOnce((_memberId, payload, options) => {
      expect(options.idempotencyKey).toBe(generationTwoInboxKey);
      expect(payload.data.reminder_generation).toBe('2');
      return Promise.resolve({ notificationId: IDS.notification, created: true });
    });
    mockSendPush.mockImplementationOnce((_memberId, _notification, data, options) => {
      events.push('push_send');
      expect(data.collapse_key).toBe(generationTwoCollapseKey);
      expect(options.android.collapseKey).toBe(generationTwoCollapseKey);
      expect(options.apns.headers['apns-collapse-id']).toBe(generationTwoCollapseKey);
      return Promise.resolve({ success: true, messageId: 'fcm-message-generation-2' });
    });

    await expect(processFinancingReminders()).resolves.toEqual(expect.objectContaining({
      sent: 1,
      push_sent: 1,
    }));
    expect(mockPersistNotification).toHaveBeenCalledTimes(1);
    expect(mockSendPush).toHaveBeenCalledTimes(1);
    expect(generationOneInboxKey)
      .toBe(`financing-reminder:${IDS.installment}:due_3_days`);
    expect(generationOneCollapseKey).not.toBe(generationTwoCollapseKey);
  });

  test('generation-two inbox retry resolves the same application-level key', async () => {
    installGlobalRun({ withPush: false, generation: 2 });
    const client = eligibleClient({ generation: 2 });
    mockGetClient.mockResolvedValueOnce(client);
    mockPersistNotification.mockResolvedValueOnce({
      notificationId: IDS.notification,
      created: false,
    });

    await expect(processFinancingReminders()).resolves.toEqual(expect.objectContaining({
      sent: 1,
      push_attempted: 0,
    }));
    expect(mockPersistNotification).toHaveBeenCalledWith(
      IDS.member,
      expect.objectContaining({
        data: expect.objectContaining({ reminder_generation: '2' }),
      }),
      expect.objectContaining({
        client,
        idempotencyKey: `financing-reminder:${IDS.installment}:due_3_days:g2`,
      })
    );
  });

  test('expires a crashed fifth push attempt instead of leaving it sending forever', async () => {
    installGlobalRun({
      withInbox: false,
      withPush: false,
      exhaustedPushJobs: 1,
    });

    await expect(processFinancingReminders()).resolves.toEqual(expect.objectContaining({
      candidates: 0,
      push_attempted: 0,
      push_exhausted: 1,
    }));
    expect(mockGetClient).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
  });
});
