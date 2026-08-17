#!/usr/bin/env bash
set -Eeuo pipefail

payload_sha='65144c5a4ac6e5399354308624a5ff6cd0e56caa'
payload_root="https://raw.githubusercontent.com/Mohamedgad1983/PROShael/${payload_sha}/.github/ops-payload/financing-fees-20260817"
log_file=/tmp/codex-financing-fees.log
rm -f "$log_file"
exec > >(tee "$log_file") 2>&1

backend_pid="$(pgrep -f 'node /opt/alshuail/releases/.*/server.js' | head -1)"
if [[ -z "$backend_pid" ]]; then
  echo 'Active backend process was not found' >&2
  exit 1
fi

if [[ "${CODEX_BACKEND_ENV_IMPORTED:-false}" != 'true' ]]; then
  exec xargs -0 -a "/proc/$backend_pid/environ" env \
    CODEX_BACKEND_ENV_IMPORTED=true bash "$0"
fi

app_dir="$(readlink -f "/proc/$backend_pid/cwd")"
if [[ ! "$app_dir" =~ ^/opt/alshuail/releases/release-[A-Za-z0-9._-]+$ ]]; then
  echo "Unexpected active release directory: $app_dir" >&2
  exit 1
fi

files=(
  src/services/familyFinancingPolicy.js
  src/services/financingRepaymentService.js
  src/services/loanService.js
  src/controllers/loansController.js
  src/controllers/adminLoansController.js
  migrations/20260823_update_goods_financing_fees.sql
)

staging_dir="$(mktemp -d /tmp/goods-financing-fees-hotfix.XXXXXX)"
cleanup() {
  rm -rf "$staging_dir"
}
trap cleanup EXIT

install -d -m 700 "$staging_dir/migrations"
curl --fail --silent --show-error --location \
  "$payload_root/migrations/20260823_update_goods_financing_fees.sql" \
  --output "$staging_dir/migrations/20260823_update_goods_financing_fees.sql"
grep -Fq '"fee":1400' "$staging_dir/migrations/20260823_update_goods_financing_fees.sql"

backup_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="/var/backups/proshael/goods-financing-fees-$backup_stamp"
install -d -m 700 "$backup_dir"
for file in "${files[@]}"; do
  if [[ -f "$app_dir/$file" ]]; then
    install -d -m 700 "$backup_dir/$(dirname "$file")"
    cp --preserve=mode,timestamps "$app_dir/$file" "$backup_dir/$file"
  fi
done

install -m 644 -o alshuail -g alshuail \
  "$staging_dir/migrations/20260823_update_goods_financing_fees.sql" \
  "$app_dir/migrations/20260823_update_goods_financing_fees.sql"

ACTIVE_APP_DIR="$app_dir" node --input-type=module <<'NODE'
import fs from 'node:fs';
import path from 'node:path';

const appDir = process.env.ACTIVE_APP_DIR;

function rewrite(relativePath, replacements, { optional = false } = {}) {
  const filePath = path.join(appDir, relativePath);
  if (!fs.existsSync(filePath)) {
    if (optional) {
      console.log(JSON.stringify({ file: relativePath, status: 'absent_optional' }));
      return;
    }
    throw new Error(`Required production file is missing: ${relativePath}`);
  }
  let contents = fs.readFileSync(filePath, 'utf8');
  let changed = 0;
  for (const [before, after] of replacements) {
    if (contents.includes(after)) continue;
    const occurrences = contents.split(before).length - 1;
    if (occurrences !== 1) {
      throw new Error(`Expected exactly one hotfix target in ${relativePath}: ${before}`);
    }
    contents = contents.replace(before, after);
    changed += 1;
  }
  if (changed > 0) fs.writeFileSync(filePath, contents, 'utf8');
  console.log(JSON.stringify({ file: relativePath, status: changed > 0 ? 'patched' : 'already_patched', changes: changed }));
}

rewrite('src/services/financingRepaymentService.js', [
  ['Object.freeze({ principal: 3000, fee: 450 })', 'Object.freeze({ principal: 3000, fee: 500 })'],
  ['Object.freeze({ principal: 6000, fee: 750 })', 'Object.freeze({ principal: 6000, fee: 800 })'],
  ['Object.freeze({ principal: 10000, fee: 1050 })', 'Object.freeze({ principal: 10000, fee: 1400 })'],
]);

rewrite('src/services/loanService.js', [
  ["title: 'جاري مراجعة طلب التمويل العائلي'", "title: 'جاري مراجعة طلب تمويل السلع'"],
  ['body: (loan) => `تم استلام طلب التمويل العائلي رقم', 'body: (loan) => `تم استلام طلب تمويل السلع رقم'],
  ['body: (loan) => `تمت الموافقة على طلب التمويل العائلي رقم', 'body: (loan) => `تمت الموافقة على طلب تمويل السلع رقم'],
  ['body: (loan) => `تم تحويل طلب التمويل العائلي رقم', 'body: (loan) => `تم تحويل طلب تمويل السلع رقم'],
  ['body: (loan) => `طلب التمويل العائلي رقم', 'body: (loan) => `طلب تمويل السلع رقم'],
  ["title: 'تم صرف التمويل العائلي'", "title: 'تم صرف تمويل السلعة'"],
  ['body: (loan) => `تم صرف التمويل العائلي رقم', 'body: (loan) => `تم صرف تمويل السلعة للطلب رقم'],
  ["title: 'تم رفض طلب التمويل العائلي'", "title: 'تم رفض طلب تمويل السلع'"],
  ['return `تم رفض طلب التمويل العائلي رقم', 'return `تم رفض طلب تمويل السلع رقم'],
  ['خدمة التمويل العائلي غير متاحة حالياً', 'خدمة تمويل السلع غير متاحة حالياً'],
  ['يمكنك التقديم على التمويل العائلي', 'يمكنك التقديم على تمويل السلع'],
  ['policy_version: 3,', 'policy_version: 4,'],
]);

rewrite('src/controllers/loansController.js', [
  ['تم استلام طلب التمويل العائلي برقم', 'تم استلام طلب تمويل السلع برقم'],
]);

rewrite('src/controllers/adminLoansController.js', [
  ['تمويل عائلي - ${loan.sequence_number}', 'تمويل سلعة - ${loan.sequence_number}'],
  ['Family financing disbursement - ${loan.sequence_number}', 'Goods financing disbursement - ${loan.sequence_number}'],
  ['صرف تمويل عائلي للعضو', 'صرف تمويل سلعة للعضو'],
  ['صرف تلقائي من نظام التمويل العائلي.', 'صرف تلقائي من نظام تمويل السلع.'],
  ['صرف تلقائي بعد إكمال إجراءات التمويل العائلي', 'صرف تلقائي بعد إكمال إجراءات تمويل السلعة'],
  ['تم صرف التمويل وتفعيل جدول الأقساط', 'تم صرف تمويل السلعة وتفعيل جدول الأقساط'],
]);

rewrite('src/services/familyFinancingPolicy.js', [
  ['Object.freeze({ principal: 3000, fee: 450 })', 'Object.freeze({ principal: 3000, fee: 500 })'],
  ['Object.freeze({ principal: 6000, fee: 750 })', 'Object.freeze({ principal: 6000, fee: 800 })'],
  ['Object.freeze({ principal: 10000, fee: 1050 })', 'Object.freeze({ principal: 10000, fee: 1400 })'],
  ['family_financing_terms_ar_v3_2026-08-09', 'family_financing_terms_ar_v4_2026-08-17'],
  ['مبلغ التمويل ورسوم البرنامج', 'مبلغ تمويل السلعة والرسوم التشغيلية'],
], { optional: true });
NODE

for file in "${files[@]}"; do
  case "$file" in
    *.js)
      if [[ -f "$app_dir/$file" ]]; then node --check "$app_dir/$file"; fi
      ;;
  esac
done

pm2_home=/var/lib/alshuail/.pm2
process_name="$(runuser -u alshuail -- env PM2_HOME="$pm2_home" pm2 jlist | BACKEND_PID="$backend_pid" \
  node --input-type=module -e \
  "let d='';for await(const c of process.stdin)d+=c;const p=JSON.parse(d).find(x=>x.pid===Number(process.env.BACKEND_PID));if(!p)process.exit(1);console.log(p.name)")"

restart_backend() {
  runuser -u alshuail -- env PM2_HOME="$pm2_home" pm2 restart "$process_name"
}

wait_for_health() {
  for attempt in $(seq 1 20); do
    if curl --fail --silent --show-error https://api.alshailfund.com/api/health >/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

if ! restart_backend || ! wait_for_health; then
  echo 'New backend files failed the health gate; restoring the previous files' >&2
  for file in "${files[@]}"; do
    if [[ -f "$backup_dir/$file" ]]; then
      cp --preserve=mode,timestamps "$backup_dir/$file" "$app_dir/$file"
      chown alshuail:alshuail "$app_dir/$file"
    else
      rm -f "$app_dir/$file"
    fi
  done
  restart_backend || true
  wait_for_health || true
  exit 1
fi

db_name="${DB_NAME:-alshuail_db}"
db_runner=(
  runuser -u postgres -- env
  -u DATABASE_URL
  -u DB_SSL
  DB_HOST=/var/run/postgresql
  DB_NAME="$db_name"
  DB_USER=postgres
  DB_PASSWORD=
)

"${db_runner[@]}" pg_dump --data-only --no-owner --no-privileges \
  --table=public.loan_settings \
  --file="$backup_dir/loan-settings-before.sql" "$db_name"
"${db_runner[@]}" psql --csv --dbname="$db_name" --command="
  SELECT id, sequence_number, status, requested_item_amount, loan_amount,
         financing_fee_amount, total_repayment_amount,
         financing_terms_snapshot, disbursed_at, disbursed_amount, updated_at
    FROM public.loan_requests
   WHERE sequence_number = '2026-0007';
" > "$backup_dir/loan-2026-0007-before.csv"
chmod 600 "$backup_dir/loan-settings-before.sql" "$backup_dir/loan-2026-0007-before.csv"

MIGRATION_PATH="$app_dir/migrations/20260823_update_goods_financing_fees.sql" \
  "${db_runner[@]}" node --input-type=module <<'NODE'
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import pg from 'pg';

const { Pool } = pg;
const filename = '20260823_update_goods_financing_fees.sql';
const rawSql = await fs.readFile(process.env.MIGRATION_PATH, 'utf8');
const checksum = crypto.createHash('sha256').update(rawSql).digest('hex');
const executableSql = rawSql
  .replace(/^\s*BEGIN;\s*/i, '')
  .replace(/\s*COMMIT;\s*$/i, '');
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 1,
});
const client = await pool.connect();

try {
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout = '10s'");
  await client.query("SET LOCAL statement_timeout = '120s'");
  await client.query("SELECT pg_advisory_xact_lock(7246873586202611381)");

  const ledger = await client.query(
    'SELECT checksum FROM public.schema_migrations WHERE filename = $1 FOR UPDATE',
    [filename]
  );
  let migrationStatus = 'skipped';
  if (ledger.rowCount > 0) {
    if (ledger.rows[0].checksum !== checksum) {
      throw new Error('Applied goods-financing migration checksum mismatch');
    }
  } else {
    await client.query(executableSql);
    await client.query(
      `INSERT INTO public.schema_migrations (filename, checksum, applied_at)
       VALUES ($1, $2, NOW())`,
      [filename, checksum]
    );
    migrationStatus = 'applied';
  }

  const requestResult = await client.query(
    `SELECT id, sequence_number, status, requested_item_amount,
            financing_fee_amount, total_repayment_amount,
            financing_terms_snapshot, disbursed_at, disbursed_amount
       FROM public.loan_requests
      WHERE sequence_number = '2026-0007'
      FOR UPDATE`,
  );
  if (requestResult.rowCount !== 1) {
    throw new Error('Request 2026-0007 was not found exactly once');
  }
  const request = requestResult.rows[0];
  const planResult = await client.query(
    `SELECT COUNT(*)::int AS count
       FROM public.financing_repayment_plans
      WHERE program_type = 'family_financing' AND request_id = $1`,
    [request.id]
  );
  const planCount = planResult.rows[0].count;
  const snapshot = request.financing_terms_snapshot;
  const alreadyCorrect = Number(request.financing_fee_amount) === 500
    && Number(request.total_repayment_amount) === 3500
    && Number(snapshot?.principal) === 3000
    && Number(snapshot?.fee) === 500
    && Number(snapshot?.total) === 3500
    && Number(snapshot?.policy_version) === 4;

  if (request.status !== 'ready_for_disbursement') {
    throw new Error(`Request has unexpected status: ${request.status}`);
  }
  if (request.disbursed_at !== null || request.disbursed_amount !== null || planCount !== 0) {
    throw new Error('Request already has disbursement or repayment-plan state');
  }
  if (Number(request.requested_item_amount) !== 3000) {
    throw new Error('Request principal is not SAR 3,000');
  }

  let correctionStatus = 'already_correct';
  if (!alreadyCorrect) {
    if (
      Number(request.financing_fee_amount) !== 450
      || Number(request.total_repayment_amount) !== 3450
      || Number(snapshot?.principal) !== 3000
      || Number(snapshot?.fee) !== 450
      || Number(snapshot?.total) !== 3450
    ) {
      throw new Error('Request fee snapshot does not match the reviewed pre-correction state');
    }
    await client.query(
      `UPDATE public.loan_requests
          SET financing_fee_amount = 500,
              total_repayment_amount = 3500,
              financing_terms_snapshot = financing_terms_snapshot ||
                '{"policy_version":4,"principal":3000,"fee":500,"total":3500}'::jsonb,
              updated_at = NOW()
        WHERE id = $1`,
      [request.id]
    );
    await client.query(
      `INSERT INTO public.loan_request_status_history
         (loan_request_id, from_status, to_status, changed_by_id, note)
       VALUES ($1, $2, $2, NULL,
         'تحديث الرسوم التشغيلية قبل الصرف وفق السياسة المعتمدة: 500 ر.س، والإجمالي 3,500 ر.س')`,
      [request.id, request.status]
    );
    correctionStatus = 'corrected';
  }

  const verified = await client.query(
    `SELECT sequence_number, status, requested_item_amount,
            financing_fee_amount, total_repayment_amount,
            financing_terms_snapshot->>'policy_version' AS policy_version,
            financing_terms_snapshot->>'fee' AS snapshot_fee,
            financing_terms_snapshot->>'total' AS snapshot_total,
            disbursed_at, disbursed_amount
       FROM public.loan_requests
      WHERE id = $1`,
    [request.id]
  );
  const settings = await client.query(
    `SELECT financing_tiers FROM public.loan_settings WHERE id = 1`
  );
  await client.query('COMMIT');
  console.log(JSON.stringify({
    migration: migrationStatus,
    request_correction: correctionStatus,
    request: verified.rows[0],
    financing_tiers: settings.rows[0]?.financing_tiers,
    plan_count: planCount,
  }));
} catch (error) {
  await client.query('ROLLBACK');
  console.error(JSON.stringify({ code: error.code || null, message: error.message }));
  throw error;
} finally {
  client.release();
  await pool.end();
}
NODE

wait_for_health
grep -Fq 'Object.freeze({ principal: 3000, fee: 500 })' \
  "$app_dir/src/services/financingRepaymentService.js"
grep -Fq 'تمويل السلع' "$app_dir/src/services/loanService.js"

echo "BACKUP_DIR=$backup_dir"
echo "PAYLOAD_SHA=$payload_sha"
echo 'DEPLOYMENT=ok'
