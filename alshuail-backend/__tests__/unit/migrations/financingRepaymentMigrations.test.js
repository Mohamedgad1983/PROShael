import { describe, expect, test } from '@jest/globals';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../../../migrations/20260731_family_financing_installments.sql', import.meta.url);
const followupPath = new URL('../../../migrations/20260802_update_family_financing_fees.sql', import.meta.url);
const reminderHardeningPath = new URL('../../../migrations/20260810_harden_financing_reminders.sql', import.meta.url);
const gatewayProtocolV2Path = new URL('../../../migrations/20260810_gateway_protocol_v2.sql', import.meta.url);
const gatewayRefundWorkflowPath = new URL('../../../migrations/20260810_gateway_refund_workflow.sql', import.meta.url);
const gatewayReconciliationPath = new URL('../../../migrations/20260812_gateway_payment_reconciliation.sql', import.meta.url);
const gatewayAdminStatusHardeningPath = new URL('../../../migrations/20260813_harden_gateway_admin_status.sql', import.meta.url);
const captureAfterAbandonmentPath = new URL('../../../migrations/20260815_capture_after_abandonment.sql', import.meta.url);
const gatewayOperationalHardeningPath = new URL('../../../migrations/20260819_gateway_reconciliation_operational_hardening.sql', import.meta.url);

const migration = await readFile(migrationPath, 'utf8');
const followup = await readFile(followupPath, 'utf8');
const reminderHardening = await readFile(reminderHardeningPath, 'utf8');
const gatewayProtocolV2 = await readFile(gatewayProtocolV2Path, 'utf8');
const gatewayRefundWorkflow = await readFile(gatewayRefundWorkflowPath, 'utf8');
const gatewayReconciliation = await readFile(gatewayReconciliationPath, 'utf8');
const gatewayAdminStatusHardening = await readFile(gatewayAdminStatusHardeningPath, 'utf8');
const captureAfterAbandonment = await readFile(captureAfterAbandonmentPath, 'utf8');
const gatewayOperationalHardening = await readFile(gatewayOperationalHardeningPath, 'utf8');

describe('financing repayment migration safety contract', () => {
  test('installs exact fixed future fees and contains no legacy request backfill', () => {
    const tiers = '[{"principal":3000,"fee":450},{"principal":6000,"fee":750},{"principal":10000,"fee":1050}]';
    expect(migration).toContain(tiers);
    expect(followup).toContain(tiers);
    expect(migration).not.toMatch(/UPDATE\s+public\.loan_requests\s+SET\s+financing_terms_snapshot/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.financing_repayment_plans\s+SELECT/i);
  });

  test('enforces one open intent, one provider identity, and exact same-plan allocation', () => {
    expect(migration).toContain('uq_financing_one_open_intent_per_plan');
    expect(migration).toContain('uq_payments_gateway_identity');
    expect(migration).toContain('allocated_amount IS DISTINCT FROM NEW.amount');
    expect(migration).toContain('i.plan_id IS DISTINCT FROM NEW.financing_plan_id');
    expect(migration).toContain("p.status IN ('pending', 'pending_verification')");
    expect(migration).toContain('BEFORE INSERT OR UPDATE OR DELETE ON public.financing_payment_allocations');
  });

  test('blocks generic financing payment deletion/status tampering and requires verified gateway evidence', () => {
    expect(migration).toContain('Financing payment rows cannot be deleted');
    expect(migration).toContain('Financing payment status may change only from verified provider evidence');
    expect(migration).toContain('NEW.gateway_verified_at IS NULL');
    expect(migration).toContain("COALESCE(UPPER(BTRIM(NEW.gateway_currency)), '') <> 'SAR'");
  });

  test('keeps member current_balance subscription-only after 20260801', () => {
    expect(followup).toContain(
      "new_affects := NEW.status = 'paid' AND NEW.category = 'subscription' AND NOT new_financing"
    );
    expect(followup).toContain('Subscription/member balance cannot exceed SAR 3,000');
    expect(followup).not.toContain("NEW.category = 'subscription' OR new_financing");
    expect(migration).toContain('never members.current_balance');
  });

  test('preserves verified over-cap captures as immutable pending-refund evidence', () => {
    expect(migration).toContain('enforce_gateway_pending_refund_state');
    expect(migration).toContain('SUBSCRIPTION_LIMIT_EXCEEDED_AFTER_CAPTURE');
    expect(migration).toContain('Pending-refund gateway charge identity is immutable');
    expect(migration).toContain('verified provider refund resolution');
    expect(migration).toContain("WHERE status = 'pending_refund'");
    expect(migration).not.toContain('ADD CONSTRAINT check_valid_status');
  });

  test('adds durable idempotent reminder jobs without rewriting the deployed migration', () => {
    expect(reminderHardening).toContain('uq_notifications_idempotency_key');
    expect(reminderHardening).toContain('scheduled_for DATE');
    expect(reminderHardening).toContain('lease_expires_at TIMESTAMPTZ');
    expect(reminderHardening).toContain('external_status VARCHAR(30)');
    expect(reminderHardening).toContain('idx_financing_reminders_due_jobs');
    expect(reminderHardening).toContain('idx_financing_reminders_external_jobs');
    expect(reminderHardening).toContain("('due_7_days'::varchar, -7)");
    expect(reminderHardening).toContain("('overdue_7_days'::varchar, 7)");
    expect(reminderHardening).toContain('ON CONFLICT (installment_id, reminder_type) DO NOTHING');
    expect(reminderHardening).not.toMatch(/UPDATE\s+public\.members/i);
    expect(reminderHardening).not.toMatch(/INSERT\s+INTO\s+public\.payments/i);
  });

  test('installs an atomic prepared-v2 submission/cancellation state machine', () => {
    expect(gatewayProtocolV2).toContain('ADD COLUMN IF NOT EXISTS gateway_protocol_version');
    expect(gatewayProtocolV2).toContain('ADD COLUMN IF NOT EXISTS gateway_submission_started_at');
    expect(gatewayProtocolV2).toContain('ADD COLUMN IF NOT EXISTS gateway_abandoned_at');
    expect(gatewayProtocolV2).toContain('enforce_gateway_protocol_v2_state');
    expect(gatewayProtocolV2).toContain("OLD.gateway_status = 'prepared_v2'");
    expect(gatewayProtocolV2).toContain("NEW.gateway_status = 'submission_started'");
    expect(gatewayProtocolV2).toContain("NEW.gateway_status = 'not_submitted'");
    expect(gatewayProtocolV2).toContain('Submitted gateway identity must remain reserved for reconciliation');
    expect(gatewayProtocolV2).toContain('uq_subscription_one_open_gateway_intent_per_beneficiary');
    expect(gatewayProtocolV2).toContain('COALESCE(beneficiary_id, payer_id)');
    expect(gatewayProtocolV2).toContain('CREATE TABLE IF NOT EXISTS public.gateway_financial_exceptions');
    expect(gatewayProtocolV2).toContain('uq_gateway_financial_exception_evidence');
    expect(gatewayProtocolV2).toContain(
      "provider_status IN ('captured', 'refunded', 'voided')"
    );
    expect(gatewayProtocolV2).toContain(
      "exception_kind IN ('partial_capture', 'partial_refund', 'invalid_void_evidence')"
    );
    expect(gatewayProtocolV2).toContain('occurrence_count INTEGER NOT NULL DEFAULT 1');
    expect(gatewayProtocolV2).toContain('enforce_gateway_financial_exception_evidence');
    expect(gatewayProtocolV2).toContain(
      'Gateway financial exception identity and evidence are immutable'
    );
    expect(gatewayProtocolV2).toContain(
      'Gateway financial exception occurrence count cannot decrease'
    );
    expect(gatewayProtocolV2).toContain('enforce_gateway_pending_refund_state');
    expect(gatewayProtocolV2).toContain(
      'response_refunded IS NOT DISTINCT FROM NEW.gateway_amount_minor'
    );
    expect(gatewayProtocolV2).toContain('response_refunded_at IS NOT NULL');
    expect(gatewayProtocolV2).toContain(
      'response_captured IS NOT DISTINCT FROM NEW.gateway_amount_minor'
    );
    expect(gatewayProtocolV2).toContain("NOT (NEW.gateway_response ? 'captured_at')");
    expect(gatewayProtocolV2).toContain(
      'Pending-refund payment requires exact full paid/captured provider evidence and review reason'
    );
    expect(gatewayProtocolV2).toContain('response_voided_at IS NOT NULL');
    expect(gatewayProtocolV2).toContain(
      'Pending-refund resolution requires exact full refund or captured-void evidence with provider timestamp'
    );
    expect(gatewayProtocolV2).toContain("NEW.status = 'refunded'");
    expect(gatewayProtocolV2).toContain('enforce_gateway_refunded_terminal_state');
    expect(gatewayProtocolV2).toContain('A refunded gateway payment is terminal financial evidence');
    expect(gatewayProtocolV2).toContain('old_is_verified_provider_cancellation');
    expect(gatewayProtocolV2).toContain("IN ('voided', 'canceled', 'cancelled')");
    expect(gatewayProtocolV2).toContain('OLD.gateway_verified_at IS NOT NULL');
    expect(gatewayProtocolV2).toContain(
      'A verified provider cancellation is terminal financial evidence'
    );
    expect(gatewayProtocolV2).toContain(
      '`cancelled/not_submitted` is deliberately excluded'
    );
    expect(gatewayProtocolV2).not.toMatch(/UPDATE\s+public\.payments\s+SET\s+gateway_protocol_version/i);
  });

  test('installs reconciliation as a later independent repeat-safe migration', () => {
    expect(gatewayReconciliation.trim()).toMatch(/^--[\s\S]*\nBEGIN;/);
    expect(gatewayReconciliation.trim()).toMatch(/COMMIT;$/);
    expect(gatewayReconciliation).toContain(
      'CREATE TABLE IF NOT EXISTS public.gateway_payment_reconciliation_state'
    );
    expect(gatewayReconciliation).toContain('idx_gateway_reconciliation_due');
    expect(gatewayReconciliation).toContain('claim_token UUID');
    expect(gatewayReconciliation).toContain('lease_expires_at TIMESTAMPTZ');
    expect(gatewayProtocolV2).not.toContain('gateway_payment_reconciliation_state');
  });

  test('requires fresh exact provider evidence for gateway subscription status changes', () => {
    expect(gatewayAdminStatusHardening.trim()).toMatch(/^--[\s\S]*\nBEGIN;/);
    expect(gatewayAdminStatusHardening.trim()).toMatch(/COMMIT;$/);
    expect(gatewayAdminStatusHardening).toContain('enforce_gateway_subscription_evidence');
    expect(gatewayAdminStatusHardening).toContain(
      'Gateway-managed payment status requires fresh provider evidence'
    );
    expect(gatewayAdminStatusHardening).toContain(
      'Gateway paid state requires exact full capture evidence'
    );
    expect(gatewayAdminStatusHardening).toContain(
      'Gateway refund state requires exact full timestamped refund evidence'
    );
    expect(gatewayAdminStatusHardening).toContain(
      'A paid gateway subscription may exit only through exact refund or void evidence'
    );
    expect(gatewayAdminStatusHardening).toContain(
      'A verified provider cancellation cannot be resurrected'
    );
    expect(gatewayAdminStatusHardening).toContain(
      'Gateway capture may settle only an open submitted payment'
    );
    expect(gatewayAdminStatusHardening).toContain(
      'Gateway-managed payment charge identity is immutable'
    );
    expect(gatewayAdminStatusHardening).toContain('old_gateway_managed');
    expect(gatewayAdminStatusHardening).toContain(
      "LOWER(BTRIM(COALESCE(OLD.payment_method, ''))) IN ('app_payment', 'apple_pay')"
    );
    expect(gatewayAdminStatusHardening).toContain(
      'Gateway subscription rows may be inserted only as canonical prepared-v2 sessions'
    );
    expect(gatewayAdminStatusHardening).toContain('BEFORE INSERT OR UPDATE ON public.payments');
    expect(gatewayAdminStatusHardening).toContain(
      'NEW.gateway_amount_minor IS DISTINCT FROM expected_minor'
    );
    expect(gatewayAdminStatusHardening).toContain("NEW.gateway_status = 'not_submitted'");
  });

  test('installs the controlled refund operation table atomically and repeat-safely', () => {
    expect(gatewayRefundWorkflow.trim()).toMatch(/^--[\s\S]*\nBEGIN;/);
    expect(gatewayRefundWorkflow.trim()).toMatch(/COMMIT;$/);
    expect(gatewayRefundWorkflow).toContain(
      'CREATE TABLE IF NOT EXISTS public.gateway_refund_operations'
    );
    expect(gatewayRefundWorkflow).toContain('ADD COLUMN IF NOT EXISTS request_ip');
  });

  test('routes exact late captures into a guarded refund queue without reopening money state', () => {
    expect(captureAfterAbandonment.trim()).toMatch(/^--[\s\S]*\nBEGIN;/);
    expect(captureAfterAbandonment.trim()).toMatch(/COMMIT;$/);
    expect(captureAfterAbandonment).toContain('CAPTURE_AFTER_LOCAL_ABANDONMENT');
    expect(captureAfterAbandonment).toContain('enforce_gateway_capture_after_abandonment');
    expect(captureAfterAbandonment).toContain("NEW.status = 'pending_refund'");
    expect(captureAfterAbandonment).toContain("response_status NOT IN ('paid', 'captured')");
    expect(captureAfterAbandonment).toContain(
      'response_captured IS DISTINCT FROM expected_minor'
    );
    expect(captureAfterAbandonment).toContain(
      'Abandoned financing capture cannot have installment allocations'
    );
    expect(captureAfterAbandonment).toContain('idx_payments_recent_gateway_abandonment');
    expect(captureAfterAbandonment).toContain(
      'Gateway-managed payments cannot be hard-deleted'
    );
    expect(captureAfterAbandonment).toContain(
      'Gateway refund operation identity is immutable'
    );
    expect(captureAfterAbandonment).toContain(
      'is_gateway_abandonment_exception_transition'
    );
  });

  test('bounds provider 404 reconciliation and stops durable review automation', () => {
    expect(gatewayOperationalHardening.trim()).toMatch(/^--[\s\S]*\nBEGIN;/);
    expect(gatewayOperationalHardening.trim()).toMatch(/COMMIT;$/);
    expect(gatewayOperationalHardening).toContain(
      'ADD COLUMN IF NOT EXISTS consecutive_not_found'
    );
    expect(gatewayOperationalHardening).toContain(
      'ADD COLUMN IF NOT EXISTS first_not_found_at'
    );
    expect(gatewayOperationalHardening).toContain(
      'ADD COLUMN IF NOT EXISTS last_provider_http_status'
    );
    expect(gatewayOperationalHardening).toContain(
      'trg_enforce_gateway_reconciliation_operational_state'
    );
    expect(gatewayOperationalHardening).toContain(
      'Only consecutive provider 404 responses may increment not-found count'
    );
    expect(gatewayOperationalHardening).toContain(
      "NEW.review_reason = 'provider_not_found_bounded'"
    );
    expect(gatewayOperationalHardening).toContain("INTERVAL '24 hours'");
    expect(gatewayOperationalHardening).toContain('NEW.consecutive_not_found < 4');
    expect(gatewayOperationalHardening).toContain(
      'Gateway evidence review requires a sanitized evidence hash'
    );
    expect(gatewayOperationalHardening).toContain(
      'Gateway reconciliation review evidence cannot be deleted'
    );
    expect(gatewayOperationalHardening).toContain('next_check_at = NULL');
  });
});
