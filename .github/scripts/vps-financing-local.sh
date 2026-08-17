#!/usr/bin/env bash
set -euo pipefail

operation="${1:-preflight}"
if [[ "$operation" != "preflight" && "$operation" != "enable" ]]; then
  echo "Unsupported operation: $operation" >&2
  exit 2
fi

app_dir=/var/www/PROShael/alshuail-backend
env_file=.env.production
cd "$app_dir"
test -f "$env_file"

echo "== Release ledger preflight =="
node --env-file="$env_file" scripts/run-release-migrations.mjs --preflight

echo "== Financing schema and request preflight =="
node --env-file="$env_file" --input-type=module <<'NODE'
import pg from 'pg';

const { Pool } = pg;
const base = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST,
      port: Number.parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
if (String(process.env.DB_SSL || '').toLowerCase() === 'true') {
  base.ssl = { rejectUnauthorized: false };
}
const pool = new Pool({ ...base, max: 1, connectionTimeoutMillis: 10000 });
const expectedMigrations = new Map([
  ['20260731_family_financing_installments.sql', '2e4514c16c75f9a0141234ea19cfd08e7452d7d59e5e318f5aaeb45f75a47158'],
  ['20260810_harden_financing_reminders.sql', '5bbd2289653f4300881fdcf350ce0065db98b283e5be3435b68db96aa29361e1'],
]);

try {
  const ledger = await pool.query(
    `SELECT filename, checksum
       FROM public.schema_migrations
      WHERE filename = ANY($1::text[])`,
    [[...expectedMigrations.keys()]]
  );
  const ledgerMap = new Map(ledger.rows.map((row) => [row.filename, row.checksum]));
  for (const [filename, checksum] of expectedMigrations) {
    if (ledgerMap.get(filename) !== checksum) {
      throw new Error(`Required migration is missing or mismatched: ${filename}`);
    }
  }

  const tables = await pool.query(`
    SELECT to_regclass('public.financing_repayment_plans') IS NOT NULL AS plans,
           to_regclass('public.financing_installments') IS NOT NULL AS installments,
           to_regclass('public.financing_balance_transactions') IS NOT NULL AS ledger,
           to_regclass('public.financing_reminder_log') IS NOT NULL AS reminders
  `);
  if (Object.values(tables.rows[0]).some((value) => value !== true)) {
    throw new Error('One or more financing tables are missing');
  }

  const reminderColumns = await pool.query(`
    SELECT column_name
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'financing_reminder_log'
       AND column_name = ANY($1::text[])
  `, [['scheduled_for', 'next_attempt_at', 'sent_at']]);
  if (reminderColumns.rowCount !== 3) {
    throw new Error('Financing reminder hardening columns are incomplete');
  }

  const requestResult = await pool.query(`
    SELECT id, sequence_number, status, requested_item_amount,
           financing_fee_amount, total_repayment_amount,
           disbursed_at, disbursed_amount,
           financing_terms_snapshot IS NOT NULL AS has_terms_snapshot
      FROM public.loan_requests
     WHERE sequence_number = '2026-0007'
     LIMIT 1
  `);
  if (requestResult.rowCount !== 1) {
    throw new Error('Request 2026-0007 was not found');
  }
  const request = requestResult.rows[0];
  const planResult = await pool.query(
    `SELECT COUNT(*)::int AS count
       FROM public.financing_repayment_plans
      WHERE program_type = 'family_financing' AND request_id = $1`,
    [request.id]
  );
  const planCount = planResult.rows[0].count;
  console.log(JSON.stringify({
    sequence_number: request.sequence_number,
    status: request.status,
    requested_item_amount: Number(request.requested_item_amount),
    financing_fee_amount: Number(request.financing_fee_amount),
    total_repayment_amount: Number(request.total_repayment_amount),
    has_terms_snapshot: request.has_terms_snapshot,
    disbursed: request.disbursed_at !== null,
    plan_count: planCount,
    required_migrations_verified: expectedMigrations.size,
  }));
  if (request.status !== 'ready_for_disbursement') {
    throw new Error(`Request is not ready for disbursement: ${request.status}`);
  }
  if (request.disbursed_at !== null || request.disbursed_amount !== null || planCount !== 0) {
    throw new Error('Request already has disbursement or repayment-plan state');
  }
  if (!request.has_terms_snapshot) {
    throw new Error('Request has no immutable financing terms snapshot');
  }
} finally {
  await pool.end();
}
NODE

current_flag="$(sed -n 's/^FINANCING_REPAYMENT_ENABLED=//p' "$env_file" | tail -1)"
if [[ -z "$current_flag" ]]; then current_flag=unset; fi
echo "FINANCING_REPAYMENT_ENABLED=$current_flag"

if [[ "$operation" == "enable" ]]; then
  ENV_FILE="$env_file" node --input-type=module <<'NODE'
  import fs from 'node:fs';

  const file = process.env.ENV_FILE;
  const stat = fs.statSync(file);
  let contents = fs.readFileSync(file, 'utf8');
  const line = 'FINANCING_REPAYMENT_ENABLED=true';
  if (/^FINANCING_REPAYMENT_ENABLED=.*$/m.test(contents)) {
    contents = contents.replace(/^FINANCING_REPAYMENT_ENABLED=.*$/m, line);
  } else {
    contents = `${contents.replace(/\s*$/, '')}\n${line}\n`;
  }
  const temporary = `${file}.codex-${process.pid}.tmp`;
  fs.writeFileSync(temporary, contents, { mode: stat.mode });
  fs.chmodSync(temporary, stat.mode);
  fs.renameSync(temporary, file);
NODE

  pm2 restart alshuail-backend --update-env
  for attempt in $(seq 1 20); do
    if curl --fail --silent --show-error https://api.alshailfund.com/api/health >/dev/null; then
      break
    fi
    if [[ "$attempt" -eq 20 ]]; then
      echo "Backend health check did not recover" >&2
      exit 1
    fi
    sleep 2
  done
  node --env-file="$env_file" --input-type=module -e \
    "console.log('FINANCING_REPAYMENT_ENABLED=' + process.env.FINANCING_REPAYMENT_ENABLED)"
  echo "Backend health check passed after restart"
fi
