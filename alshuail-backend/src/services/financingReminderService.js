import { createHash, randomUUID } from 'node:crypto';
import { config } from '../config/env.js';
import { log } from '../utils/logger.js';
import * as database from './database.js';
import * as notificationService from './notificationService.js';

const query = (...args) => database.query(...args);
const getClient = (...args) => database.getClient(...args);

export const FINANCING_REMINDER_MILESTONES = Object.freeze([
  Object.freeze({ type: 'due_7_days', offsetDays: -7 }),
  Object.freeze({ type: 'due_3_days', offsetDays: -3 }),
  Object.freeze({ type: 'due_tomorrow', offsetDays: -1 }),
  Object.freeze({ type: 'due_today', offsetDays: 0 }),
  Object.freeze({ type: 'overdue_1_day', offsetDays: 1 }),
  Object.freeze({ type: 'overdue_7_days', offsetDays: 7 }),
]);

const DEFAULT_BATCH_SIZE = 25;
const DELIVERY_LEASE_MINUTES = 10;
const MAX_PUSH_ATTEMPTS = 5;
const SCHEDULER_INTERVAL_MS = 15 * 60 * 1000;
const SCHEDULER_INITIAL_DELAY_MS = 30 * 1000;
const BUSINESS_TIME_ZONE = config.financingRepayment?.businessTimeZone || 'Asia/Riyadh';

let schedulerRunInFlight = false;

function reminderError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function safeBatchSize(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {return DEFAULT_BATCH_SIZE;}
  return Math.min(parsed, 100);
}

function dateOnly(value) {
  if (value instanceof Date) {return value.toISOString().slice(0, 10);}
  return String(value || '').slice(0, 10);
}

function formatDueDate(value) {
  const canonical = dateOnly(value);
  const parsed = new Date(`${canonical}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {return canonical;}
  return new Intl.DateTimeFormat('ar-SA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function reminderTitle(daysUntil) {
  if (daysUntil < 0) {return 'تنبيه قسط تمويل متأخر';}
  if (daysUntil === 0) {return 'قسط التمويل مستحق اليوم';}
  return 'تذكير بقسط التمويل';
}

function reminderBody({ dueDate, dueAmount, installmentNumber, daysUntil }) {
  const statusText = daysUntil < 0
    ? 'القسط متأخر'
    : (daysUntil === 0 ? 'القسط مستحق اليوم' : 'موعد القسط قريب');
  return `${statusText}. موعد القسط ${formatDueDate(dueDate)}، والمتبقي ${Number(dueAmount).toLocaleString('ar-SA')} ر.س (القسط ${installmentNumber}).`;
}

function retryDelayMinutes(attemptCount) {
  const schedule = [1, 5, 30, 120, 360];
  const index = Math.max(0, Math.min(Number(attemptCount || 1) - 1, schedule.length - 1));
  return schedule[index];
}

function errorMessage(error) {
  const raw = error?.message || error?.error?.message || error?.error || 'notification_delivery_failed';
  return String(raw).slice(0, 2000);
}

export function isFinancingRemindersEnabled() {
  return config.financingRepayment?.remindersEnabled === true;
}

function financingReminderGeneration(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function financingReminderIdempotencyKey(
  installmentId,
  reminderType,
  generation = 1
) {
  const canonical = `financing-reminder:${String(installmentId)}:${String(reminderType)}`;
  const normalizedGeneration = financingReminderGeneration(generation);
  return normalizedGeneration === 1
    ? canonical
    : `${canonical}:g${normalizedGeneration}`;
}

export function financingReminderCollapseKey(
  installmentId,
  reminderType,
  generation = 1
) {
  return createHash('sha256')
    .update(financingReminderIdempotencyKey(installmentId, reminderType, generation))
    .digest('hex')
    .slice(0, 32);
}

export function seedFinancingReminderJobsForInstallmentInTransaction({
  client,
  installmentId,
  dueDate,
}) {
  if (!client?.query) {throw new TypeError('A transaction client is required');}
  return client.query(
    `INSERT INTO financing_reminder_log (
       installment_id, reminder_type, scheduled_for, delivery_status,
       attempt_count, next_attempt_at, sent_at, updated_at
     )
     SELECT $1, milestone.reminder_type, $2::date + milestone.offset_days,
            'pending', 0, NOW(), NULL, NOW()
       FROM (
         VALUES
           ('due_7_days'::varchar, -7),
           ('due_3_days'::varchar, -3),
           ('due_tomorrow'::varchar, -1),
           ('due_today'::varchar, 0),
           ('overdue_1_day'::varchar, 1),
           ('overdue_7_days'::varchar, 7)
       ) AS milestone(reminder_type, offset_days)
     ON CONFLICT (installment_id, reminder_type) DO NOTHING`,
    [installmentId, dateOnly(dueDate)]
  );
}

export function cancelFinancingReminderJobsForInstallmentInTransaction({
  client,
  installmentId,
  reason = 'installment_paid',
}) {
  if (!client?.query) {throw new TypeError('A transaction client is required');}
  return client.query(
    `UPDATE financing_reminder_log
        SET delivery_status = CASE
              WHEN delivery_status = 'sent' THEN delivery_status
              ELSE 'cancelled'
            END,
            external_status = CASE
              WHEN external_status = 'sent' THEN external_status
              ELSE 'skipped'
            END,
            cancelled_at = COALESCE(cancelled_at, NOW()),
            cancellation_reason = $2,
            claim_token = NULL,
            claimed_at = NULL,
            lease_expires_at = NULL,
            updated_at = NOW()
      WHERE installment_id = $1
        AND (
          delivery_status IN ('pending', 'processing', 'failed')
          OR external_status IN ('pending', 'sending', 'failed')
        )`,
    [installmentId, reason]
  );
}

function seedMissingReminderJobs() {
  return query(
    `INSERT INTO financing_reminder_log (
       installment_id, reminder_type, scheduled_for, delivery_status,
       attempt_count, next_attempt_at, sent_at, updated_at
     )
     SELECT i.id, milestone.reminder_type, i.due_date + milestone.offset_days,
            'pending', 0, NOW(), NULL, NOW()
       FROM financing_installments i
       JOIN financing_repayment_plans p ON p.id = i.plan_id
       CROSS JOIN (
         VALUES
           ('due_7_days'::varchar, -7),
           ('due_3_days'::varchar, -3),
           ('due_tomorrow'::varchar, -1),
           ('due_today'::varchar, 0),
           ('overdue_1_day'::varchar, 1),
           ('overdue_7_days'::varchar, 7)
       ) AS milestone(reminder_type, offset_days)
      WHERE p.status IN ('active', 'overdue')
        AND i.paid_amount < i.amount
     ON CONFLICT (installment_id, reminder_type) DO NOTHING`
  );
}

async function markOverdueInstallmentsAndPlans() {
  const installments = await query(
    `UPDATE financing_installments
        SET status = 'overdue',
            updated_at = NOW()
      WHERE status IN ('scheduled', 'due', 'partially_paid')
        AND paid_amount < amount
        AND due_date < (NOW() AT TIME ZONE $1)::date`,
    [BUSINESS_TIME_ZONE]
  );
  const plans = await query(
    `UPDATE financing_repayment_plans p
        SET status = 'overdue',
            updated_at = NOW()
      WHERE p.status = 'active'
        AND EXISTS (
          SELECT 1
            FROM financing_installments i
           WHERE i.plan_id = p.id
             AND i.status = 'overdue'
        )`
  );
  return {
    installments: installments.rowCount || 0,
    plans: plans.rowCount || 0,
  };
}

function cancelIneligibleReminderJobs() {
  return query(
    `UPDATE financing_reminder_log l
        SET delivery_status = CASE
              WHEN l.delivery_status = 'sent' THEN l.delivery_status
              ELSE 'cancelled'
            END,
            external_status = CASE
              WHEN l.external_status = 'sent' THEN l.external_status
              ELSE 'skipped'
            END,
            cancelled_at = COALESCE(l.cancelled_at, NOW()),
            cancellation_reason = CASE
              WHEN i.paid_amount >= i.amount THEN 'installment_paid'
              ELSE 'plan_not_active'
            END,
            claim_token = NULL,
            claimed_at = NULL,
            lease_expires_at = NULL,
            updated_at = NOW()
       FROM financing_installments i
       JOIN financing_repayment_plans p ON p.id = i.plan_id
      WHERE l.installment_id = i.id
        AND (i.paid_amount >= i.amount OR p.status NOT IN ('active', 'overdue'))
        AND (
          l.delivery_status IN ('pending', 'processing', 'failed')
          OR l.external_status IN ('pending', 'sending', 'failed')
        )`
  );
}

function supersedeStaleMilestones() {
  return query(
    `UPDATE financing_reminder_log older
        SET delivery_status = 'superseded',
            external_status = 'skipped',
            cancelled_at = COALESCE(older.cancelled_at, NOW()),
            cancellation_reason = 'newer_milestone_due',
            claim_token = NULL,
            claimed_at = NULL,
            lease_expires_at = NULL,
            updated_at = NOW()
      WHERE older.scheduled_for <= (NOW() AT TIME ZONE $1)::date
        AND (
          older.delivery_status IN ('pending', 'failed')
          OR (
            older.delivery_status = 'processing'
            AND older.lease_expires_at < NOW()
          )
        )
        AND EXISTS (
          SELECT 1
            FROM financing_reminder_log newer
           WHERE newer.installment_id = older.installment_id
             AND newer.scheduled_for > older.scheduled_for
             AND newer.scheduled_for <= (NOW() AT TIME ZONE $1)::date
             AND newer.delivery_status NOT IN ('cancelled', 'superseded')
        )`,
    [BUSINESS_TIME_ZONE]
  );
}

function skipExhaustedPushJobs() {
  return query(
    `UPDATE financing_reminder_log
        SET external_status = 'skipped',
            external_last_error = COALESCE(
              external_last_error,
              'push_retry_limit_exhausted_after_unknown_or_failed_delivery'
            ),
            claim_token = NULL,
            claimed_at = NULL,
            lease_expires_at = NULL,
            updated_at = NOW()
      WHERE delivery_status = 'sent'
        AND external_attempt_count >= $1
        AND (
          external_status IN ('pending', 'failed')
          OR (
            external_status = 'sending'
            AND lease_expires_at < NOW()
          )
        )`,
    [MAX_PUSH_ATTEMPTS]
  );
}

function claimDueInboxJobs(limit) {
  const claimToken = randomUUID();
  return query(
    `WITH candidates AS (
       SELECT l.id
         FROM financing_reminder_log l
         JOIN financing_installments i ON i.id = l.installment_id
         JOIN financing_repayment_plans p ON p.id = i.plan_id
        WHERE l.scheduled_for <= (NOW() AT TIME ZONE $1)::date
          AND (
            (
              l.delivery_status IN ('pending', 'failed')
              AND l.next_attempt_at <= NOW()
            )
            OR (
              l.delivery_status = 'processing'
              AND l.lease_expires_at < NOW()
            )
          )
          AND i.paid_amount < i.amount
          AND p.status IN ('active', 'overdue')
        ORDER BY l.scheduled_for ASC, l.id ASC
        FOR UPDATE OF l SKIP LOCKED
        LIMIT $2
     )
     UPDATE financing_reminder_log l
        SET delivery_status = 'processing',
            claim_token = $3,
            claimed_at = NOW(),
            lease_expires_at = NOW() + ($4::int * INTERVAL '1 minute'),
            attempt_count = l.attempt_count + 1,
            last_error = NULL,
            updated_at = NOW()
       FROM candidates c
      WHERE l.id = c.id
     RETURNING l.id, l.claim_token, l.attempt_count`,
    [BUSINESS_TIME_ZONE, safeBatchSize(limit), claimToken, DELIVERY_LEASE_MINUTES]
  );
}

async function markInboxFailure(job, error) {
  const delayMinutes = retryDelayMinutes(job.attempt_count);
  await query(
    `UPDATE financing_reminder_log
        SET delivery_status = 'failed',
            last_error = $1,
            next_attempt_at = NOW() + ($2::int * INTERVAL '1 minute'),
            claim_token = NULL,
            claimed_at = NULL,
            lease_expires_at = NULL,
            updated_at = NOW()
      WHERE id = $3
        AND claim_token = $4
        AND delivery_status = 'processing'`,
    [errorMessage(error), delayMinutes, job.id, job.claim_token]
  );
}

async function prepareClaimedInboxReminder(job) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows: referenceRows } = await client.query(
      'SELECT installment_id FROM financing_reminder_log WHERE id = $1',
      [job.id]
    );
    if (!referenceRows.length) {
      await client.query('ROLLBACK');
      return { status: 'missing' };
    }

    const { rows: installmentPointerRows } = await client.query(
      'SELECT plan_id FROM financing_installments WHERE id = $1',
      [referenceRows[0].installment_id]
    );
    const planId = installmentPointerRows[0]?.plan_id;
    const { rows: planRows } = planId
      ? await client.query(
        `SELECT id, member_id, program_type, status
           FROM financing_repayment_plans
          WHERE id = $1
          FOR UPDATE`,
        [planId]
      )
      : { rows: [] };
    const plan = planRows[0];

    // Match settlement's plan -> installment -> reminder lock order. Do not
    // combine these row locks in a JOIN: PostgreSQL does not promise join row
    // lock acquisition order, which could reintroduce an AB/BA deadlock.
    const { rows: installmentRows } = plan
      ? await client.query(
        `SELECT id, plan_id, installment_number, due_date, amount, paid_amount,
                (due_date - (NOW() AT TIME ZONE $2)::date)::int AS days_until
           FROM financing_installments
          WHERE id = $1
          FOR UPDATE`,
        [referenceRows[0].installment_id, BUSINESS_TIME_ZONE]
      )
      : { rows: [] };
    const installment = installmentRows[0]
      ? {
        ...installmentRows[0],
        member_id: plan.member_id,
        program_type: plan.program_type,
        plan_status: plan.status,
      }
      : null;

    const { rows: logRows } = await client.query(
      `SELECT id, installment_id, reminder_type, scheduled_for, generation,
              delivery_status, claim_token
         FROM financing_reminder_log
        WHERE id = $1
        FOR UPDATE`,
      [job.id]
    );
    const reminder = logRows[0];
    if (
      !reminder
      || reminder.delivery_status !== 'processing'
      || String(reminder.claim_token) !== String(job.claim_token)
    ) {
      await client.query('ROLLBACK');
      return { status: 'lost_claim' };
    }

    if (
      !installment
      || String(installment.plan_id) !== String(plan?.id)
      || !['active', 'overdue'].includes(installment.plan_status)
      || Number(installment.paid_amount) >= Number(installment.amount)
    ) {
      await client.query(
        `UPDATE financing_reminder_log
            SET delivery_status = 'cancelled',
                external_status = 'skipped',
                cancelled_at = NOW(),
                cancellation_reason = 'installment_paid_or_plan_inactive',
                claim_token = NULL,
                claimed_at = NULL,
                lease_expires_at = NULL,
                updated_at = NOW()
          WHERE id = $1 AND claim_token = $2`,
        [job.id, job.claim_token]
      );
      await client.query('COMMIT');
      return { status: 'cancelled' };
    }

    const { rows: newerRows } = await client.query(
      `SELECT id
         FROM financing_reminder_log
        WHERE installment_id = $1
          AND scheduled_for > $2
          AND scheduled_for <= (NOW() AT TIME ZONE $3)::date
          AND delivery_status NOT IN ('cancelled', 'superseded')
        LIMIT 1`,
      [installment.id, reminder.scheduled_for, BUSINESS_TIME_ZONE]
    );
    if (newerRows.length) {
      await client.query(
        `UPDATE financing_reminder_log
            SET delivery_status = 'superseded',
                external_status = 'skipped',
                cancelled_at = NOW(),
                cancellation_reason = 'newer_milestone_due',
                claim_token = NULL,
                claimed_at = NULL,
                lease_expires_at = NULL,
                updated_at = NOW()
          WHERE id = $1 AND claim_token = $2`,
        [job.id, job.claim_token]
      );
      await client.query('COMMIT');
      return { status: 'superseded' };
    }

    const dueAmount = Math.round(
      (Number(installment.amount) - Number(installment.paid_amount)) * 100
    ) / 100;
    const title = reminderTitle(Number(installment.days_until));
    const body = reminderBody({
      dueDate: installment.due_date,
      dueAmount,
      installmentNumber: installment.installment_number,
      daysUntil: Number(installment.days_until),
    });
    const idempotencyKey = financingReminderIdempotencyKey(
      installment.id,
      reminder.reminder_type,
      reminder.generation
    );
    const collapseKey = financingReminderCollapseKey(
      installment.id,
      reminder.reminder_type,
      reminder.generation
    );
    const persisted = await notificationService.persistIdempotentMemberNotification(
      installment.member_id,
      {
        title,
        body,
        type: 'financing_installment_reminder',
        priority: 'high',
        relatedId: installment.plan_id,
        relatedType: installment.program_type,
        actionUrl: '/requests',
        data: {
          financing_plan_id: String(installment.plan_id),
          installment_id: String(installment.id),
          reminder_type: String(reminder.reminder_type),
          reminder_generation: String(financingReminderGeneration(reminder.generation)),
        },
      },
      { client, idempotencyKey }
    );

    await client.query(
      `UPDATE financing_reminder_log
          SET delivery_status = 'sent',
              channel = 'in_app',
              notification_id = $1,
              collapse_key = $2,
              delivered_at = NOW(),
              sent_at = NOW(),
              external_status = CASE
                WHEN external_status = 'sent' THEN 'sent'
                ELSE 'pending'
              END,
              next_attempt_at = NOW(),
              last_error = NULL,
              claim_token = NULL,
              claimed_at = NULL,
              lease_expires_at = NULL,
              updated_at = NOW()
        WHERE id = $3
          AND claim_token = $4
          AND delivery_status = 'processing'`,
      [persisted.notificationId, collapseKey, job.id, job.claim_token]
    );
    await client.query('COMMIT');
    return {
      status: 'sent',
      notificationCreated: persisted.created,
      notificationId: persisted.notificationId,
    };
  } catch (error) {
    try {await client.query('ROLLBACK');} catch (_rollbackError) { /* noop */ }
    throw error;
  } finally {
    client.release();
  }
}

function claimPushJobs(limit) {
  const claimToken = randomUUID();
  return query(
    `WITH candidates AS (
       SELECT l.id, i.id AS installment_id, p.id AS plan_id,
              p.member_id, p.program_type,
              n.title, n.message AS body, l.collapse_key, l.generation
         FROM financing_reminder_log l
         JOIN financing_installments i ON i.id = l.installment_id
         JOIN financing_repayment_plans p ON p.id = i.plan_id
         JOIN notifications n ON n.id = l.notification_id
        WHERE l.delivery_status = 'sent'
          AND (
            (
              l.external_status IN ('pending', 'failed')
              AND l.next_attempt_at <= NOW()
            )
            OR (
              l.external_status = 'sending'
              AND l.lease_expires_at < NOW()
            )
          )
          AND l.external_attempt_count < $1
          AND i.paid_amount < i.amount
          AND p.status IN ('active', 'overdue')
        ORDER BY l.scheduled_for ASC, l.id ASC
        FOR UPDATE OF l SKIP LOCKED
        LIMIT $2
     )
     UPDATE financing_reminder_log l
        SET external_status = 'sending',
            claim_token = $3,
            claimed_at = NOW(),
            lease_expires_at = NOW() + ($4::int * INTERVAL '1 minute'),
            external_attempt_count = l.external_attempt_count + 1,
            external_last_error = NULL,
            updated_at = NOW()
       FROM candidates c
      WHERE l.id = c.id
     RETURNING l.id, l.claim_token, l.external_attempt_count,
               c.installment_id, c.plan_id, c.member_id, c.program_type,
               c.title, c.body, c.collapse_key, c.generation`,
    [MAX_PUSH_ATTEMPTS, safeBatchSize(limit), claimToken, DELIVERY_LEASE_MINUTES]
  );
}

async function pushStillEligible(job) {
  const { rows } = await query(
    `SELECT EXISTS (
       SELECT 1
         FROM financing_reminder_log l
         JOIN financing_installments i ON i.id = l.installment_id
         JOIN financing_repayment_plans p ON p.id = i.plan_id
        WHERE l.id = $1
          AND l.claim_token = $2
          AND l.external_status = 'sending'
          AND i.paid_amount < i.amount
          AND p.status IN ('active', 'overdue')
     ) AS eligible`,
    [job.id, job.claim_token]
  );
  return rows[0]?.eligible === true;
}

async function markPushSkipped(job, reason) {
  await query(
    `UPDATE financing_reminder_log
        SET external_status = 'skipped',
            external_last_error = $1,
            claim_token = NULL,
            claimed_at = NULL,
            lease_expires_at = NULL,
            updated_at = NOW()
      WHERE id = $2
        AND claim_token = $3
        AND external_status = 'sending'`,
    [reason, job.id, job.claim_token]
  );
}

async function deliverClaimedPush(job) {
  if (!await pushStillEligible(job)) {
    await markPushSkipped(job, 'installment_paid_or_plan_inactive');
    return { status: 'skipped' };
  }

  const collapseKey = job.collapse_key || financingReminderCollapseKey(
    job.installment_id,
    'installment',
    job.generation
  );
  const result = await notificationService.sendPushNotification(
    job.member_id,
    { title: job.title, body: job.body },
    {
      type: 'financing_installment_reminder',
      financing_plan_id: String(job.plan_id),
      installment_id: String(job.installment_id),
      related_type: String(job.program_type),
      collapse_key: collapseKey,
    },
    {
      android: { collapseKey },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-collapse-id': collapseKey,
        },
      },
    }
  );

  if (result.success) {
    await query(
      `UPDATE financing_reminder_log
          SET external_status = 'sent',
              channel = 'push',
              external_delivered_at = NOW(),
              external_last_error = NULL,
              claim_token = NULL,
              claimed_at = NULL,
              lease_expires_at = NULL,
              updated_at = NOW()
        WHERE id = $1
          AND claim_token = $2
          AND external_status = 'sending'`,
      [job.id, job.claim_token]
    );
    return { status: 'sent' };
  }

  const noDevice = String(result.error || '').includes('No active devices registered');
  const exhausted = Number(job.external_attempt_count) >= MAX_PUSH_ATTEMPTS;
  if (noDevice || exhausted) {
    await markPushSkipped(job, errorMessage(result));
    return { status: 'skipped' };
  }

  const delayMinutes = retryDelayMinutes(job.external_attempt_count);
  await query(
    `UPDATE financing_reminder_log
        SET external_status = 'failed',
            external_last_error = $1,
            next_attempt_at = NOW() + ($2::int * INTERVAL '1 minute'),
            claim_token = NULL,
            claimed_at = NULL,
            lease_expires_at = NULL,
            updated_at = NOW()
      WHERE id = $3
        AND claim_token = $4
        AND external_status = 'sending'`,
    [errorMessage(result), delayMinutes, job.id, job.claim_token]
  );
  return { status: 'failed' };
}

export async function processFinancingReminders({ batchSize = DEFAULT_BATCH_SIZE } = {}) {
  if (!isFinancingRemindersEnabled()) {
    throw reminderError(
      'تذكيرات أقساط التمويل غير مفعلة حالياً',
      'FINANCING_REMINDERS_DISABLED'
    );
  }

  const limit = safeBatchSize(batchSize);
  const overdue = await markOverdueInstallmentsAndPlans();
  const seeded = await seedMissingReminderJobs();
  const cancelled = await cancelIneligibleReminderJobs();
  const superseded = await supersedeStaleMilestones();
  const pushExhausted = await skipExhaustedPushJobs();
  const { rows: inboxJobs } = await claimDueInboxJobs(limit);

  const summary = {
    seeded: seeded.rowCount || 0,
    installments_marked_overdue: overdue.installments,
    plans_marked_overdue: overdue.plans,
    candidates: inboxJobs.length,
    attempted: 0,
    sent: 0,
    cancelled: cancelled.rowCount || 0,
    superseded: superseded.rowCount || 0,
    failed: 0,
    push_attempted: 0,
    push_sent: 0,
    push_failed: 0,
    push_skipped: 0,
    push_exhausted: pushExhausted.rowCount || 0,
  };

  for (const job of inboxJobs) {
    summary.attempted += 1;
    try {
      const result = await prepareClaimedInboxReminder(job);
      if (result.status === 'sent') {summary.sent += 1;}
      if (result.status === 'cancelled') {summary.cancelled += 1;}
      if (result.status === 'superseded') {summary.superseded += 1;}
    } catch (error) {
      summary.failed += 1;
      await markInboxFailure(job, error);
      log.warn('[financing-reminders] in-app delivery failed', {
        reminderId: job.id,
        error: error.message,
      });
    }
  }

  const { rows: pushJobs } = await claimPushJobs(limit);
  for (const job of pushJobs) {
    summary.push_attempted += 1;
    try {
      const result = await deliverClaimedPush(job);
      if (result.status === 'sent') {summary.push_sent += 1;}
      if (result.status === 'failed') {summary.push_failed += 1;}
      if (result.status === 'skipped') {summary.push_skipped += 1;}
    } catch (error) {
      summary.push_failed += 1;
      const delayMinutes = retryDelayMinutes(job.external_attempt_count);
      await query(
        `UPDATE financing_reminder_log
            SET external_status = 'failed',
                external_last_error = $1,
                next_attempt_at = NOW() + ($2::int * INTERVAL '1 minute'),
                claim_token = NULL,
                claimed_at = NULL,
                lease_expires_at = NULL,
                updated_at = NOW()
          WHERE id = $3
            AND claim_token = $4
            AND external_status = 'sending'`,
        [errorMessage(error), delayMinutes, job.id, job.claim_token]
      );
      log.warn('[financing-reminders] push delivery failed', {
        reminderId: job.id,
        error: error.message,
      });
    }
  }

  return summary;
}

export function startFinancingReminderScheduler() {
  if (!isFinancingRemindersEnabled()) {
    log.info('[financing-reminders] scheduler disabled by FINANCING_REMINDERS_ENABLED');
    return { enabled: false, initial: null, interval: null };
  }

  const run = async () => {
    if (schedulerRunInFlight) {
      log.warn('[financing-reminders] overlapping local scheduler run skipped');
      return;
    }
    schedulerRunInFlight = true;
    try {
      await processFinancingReminders();
    } catch (error) {
      log.warn('[financing-reminders] scheduler run failed', { error: error.message });
    } finally {
      schedulerRunInFlight = false;
    }
  };

  const initial = setTimeout(run, SCHEDULER_INITIAL_DELAY_MS);
  initial.unref?.();
  const interval = setInterval(run, SCHEDULER_INTERVAL_MS);
  interval.unref?.();
  return { enabled: true, initial, interval };
}

export default {
  FINANCING_REMINDER_MILESTONES,
  financingReminderCollapseKey,
  financingReminderIdempotencyKey,
  isFinancingRemindersEnabled,
  seedFinancingReminderJobsForInstallmentInTransaction,
  cancelFinancingReminderJobsForInstallmentInTransaction,
  processFinancingReminders,
  startFinancingReminderScheduler,
};
