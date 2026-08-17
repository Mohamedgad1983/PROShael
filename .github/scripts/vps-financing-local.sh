#!/usr/bin/env bash
set -euo pipefail

operation="${1:-preflight}"
if [[ "$operation" != "preflight" && "$operation" != "enable" ]]; then
  echo "Unsupported operation: $operation" >&2
  exit 2
fi

backend_pid="$(pgrep -f 'node /opt/alshuail/releases/.*/server.js' | head -1)"
if [[ -z "$backend_pid" ]]; then
  echo "Active backend process was not found" >&2
  exit 1
fi

if [[ "${CODEX_BACKEND_ENV_IMPORTED:-false}" != "true" ]]; then
  exec xargs -0 -a "/proc/$backend_pid/environ" env \
    CODEX_BACKEND_ENV_IMPORTED=true bash "$0" "$operation"
fi

app_dir="/proc/$backend_pid/cwd"
cd "$app_dir"
if [[ -z "${DATABASE_URL:-}" ]]; then
  export DB_HOST=127.0.0.1
fi

echo "== Release ledger preflight =="
node scripts/run-release-migrations.mjs --preflight

echo "== Financing schema and request preflight =="
node --input-type=module <<'NODE'
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

current_flag="${FINANCING_REPAYMENT_ENABLED:-unset}"
echo "FINANCING_REPAYMENT_ENABLED=$current_flag"

if [[ "$operation" == "enable" ]]; then
  pm2_home=/var/lib/alshuail/.pm2
  process_name="$(PM2_HOME="$pm2_home" pm2 jlist | BACKEND_PID="$backend_pid" \
    node --input-type=module -e \
    "let d='';for await(const c of process.stdin)d+=c;const p=JSON.parse(d).find(x=>x.pid===Number(process.env.BACKEND_PID));if(!p)process.exit(1);console.log(p.name)")"
  PM2_HOME="$pm2_home" FINANCING_REPAYMENT_ENABLED=true \
    pm2 restart "$process_name" --update-env
  PM2_HOME="$pm2_home" pm2 save --force
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
  new_backend_pid="$(PM2_HOME="$pm2_home" pm2 pid "$process_name")"
  BACKEND_PID="$new_backend_pid" node --input-type=module -e \
    "import fs from 'node:fs';const env=fs.readFileSync('/proc/'+process.env.BACKEND_PID+'/environ','utf8').split('\0');console.log(env.find(x=>x.startsWith('FINANCING_REPAYMENT_ENABLED='))||'FINANCING_REPAYMENT_ENABLED=unset')"
  echo "Backend health check passed after restart"
fi
