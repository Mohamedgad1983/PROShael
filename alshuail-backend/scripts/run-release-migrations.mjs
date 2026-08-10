#!/usr/bin/env node
/* eslint-disable no-console -- This standalone CLI reports only non-sensitive migration status. */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(SCRIPT_DIR, '..');

export const RELEASE_ID = 'release-20260810';
export const DEFAULT_MANIFEST_PATH = path.join(
  BACKEND_DIR,
  'migrations',
  `${RELEASE_ID}.manifest.json`
);

export const EXPECTED_RELEASE_FILENAMES = Object.freeze([
  '20260731_family_financing_installments.sql',
  '20260801_enforce_subscription_2021_2025_caps.sql',
  '20260802_update_family_financing_fees.sql',
  '20260804_make_initiative_target_amount_optional.sql',
  '20260805_harden_initiative_contributions.sql',
  '20260809_harden_marriage_signature_workflow.sql',
  '20260810_gateway_protocol_v2.sql',
  '20260810_gateway_refund_workflow.sql',
  '20260810_harden_financing_reminders.sql',
  '20260811_financing_gateway_reversals.sql',
  '20260812_gateway_payment_reconciliation.sql',
  '20260813_harden_gateway_admin_status.sql',
  '20260814_require_bank_transfer_receipts.sql',
  '20260815_capture_after_abandonment.sql',
  '20260816_archive_bank_transfer_receipts.sql',
  '20260817_harden_initiative_contribution_evidence.sql',
  '20260818_harden_manual_payment_aliases.sql',
  '20260819_gateway_reconciliation_operational_hardening.sql',
  '20260820_gateway_reconciliation_review_queue.sql',
  '20260821_harden_initiative_donation_review.sql',
  '20260822_retire_legacy_activity_contributions.sql',
]);

export const HISTORICAL_PREREQUISITE_FILENAMES = Object.freeze(
  EXPECTED_RELEASE_FILENAMES.slice(0, 6)
);
export const FORWARD_RELEASE_FILENAMES = Object.freeze(
  EXPECTED_RELEASE_FILENAMES.slice(HISTORICAL_PREREQUISITE_FILENAMES.length)
);

export const GUARDED_RUNTIME_FLAGS = Object.freeze([
  'PAYMENT_GATEWAY_ENABLED',
  'IOS_PAYMENT_GATEWAY_ENABLED',
  'PAYMENT_GATEWAY_RECONCILIATION_ENABLED',
  'FINANCING_REPAYMENT_ENABLED',
  'FINANCING_GATEWAY_ENABLED',
  'FINANCING_REMINDERS_ENABLED',
]);

const MANIFEST_VERSION = 1;
const PRODUCTION_CONFIRMATION = 'APPLY_RELEASE_20260810';
const ADVISORY_LOCK_KEY = '7246873586202611381';
const LEDGER_REGCLASS = 'public.schema_migrations';
const RELEASE_FILE_PATTERN = /^(20260731|202608(?:0[1-9]|1[0-9]|2[0-2]))_.+\.sql$/;

export class MigrationRunnerError extends Error {
  constructor(message, code = 'MIGRATION_RUNNER_ERROR') {
    super(message);
    this.name = 'MigrationRunnerError';
    this.code = code;
  }
}

function fail(message, code) {
  throw new MigrationRunnerError(message, code);
}

export function sha256(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

export function isEnabledFlag(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function isExplicitlyDisabledFlag(value) {
  return ['0', 'false', 'no', 'off'].includes(String(value ?? '').trim().toLowerCase());
}

export function assertRuntimeFlagsDisabled(env = process.env) {
  const enabled = GUARDED_RUNTIME_FLAGS.filter((name) => isEnabledFlag(env[name]));
  if (enabled.length > 0) {
    fail(
      `Refusing migration while runtime financial feature flags are enabled: ${enabled.join(', ')}`,
      'RUNTIME_FLAGS_ENABLED'
    );
  }
}

function normalizeTarget(value) {
  const target = String(value ?? '').trim().toLowerCase();
  if (!['local', 'staging', 'production'].includes(target)) {
    fail(
      'Applying migrations requires --target=local, --target=staging, or --target=production.',
      'TARGET_REQUIRED'
    );
  }
  return target;
}

function databaseUrlHostname(env) {
  if (!env.DATABASE_URL) {
    return String(env.DB_HOST ?? '').trim().toLowerCase();
  }

  try {
    return new URL(env.DATABASE_URL).hostname.toLowerCase();
  } catch {
    fail('DATABASE_URL is not a valid PostgreSQL URL.', 'INVALID_DATABASE_URL');
  }
}

export function assertTargetSafety(options, env = process.env) {
  if (options.mode !== 'apply') {
    return;
  }

  const target = normalizeTarget(options.target ?? env.MIGRATION_TARGET);
  const hostname = databaseUrlHostname(env);
  const knownProductionHost = String(env.PRODUCTION_DB_HOST ?? '213.199.62.185')
    .trim()
    .toLowerCase();
  const environmentSaysProduction = String(env.NODE_ENV ?? '').toLowerCase() === 'production';
  const hostSaysProduction = Boolean(hostname) && hostname === knownProductionHost;

  if ((environmentSaysProduction || hostSaysProduction) && target !== 'production') {
    fail(
      'The database/environment appears to be production, but --target=production was not supplied.',
      'PRODUCTION_TARGET_MISMATCH'
    );
  }

  if (target === 'production') {
    if (path.resolve(options.manifestPath || DEFAULT_MANIFEST_PATH) !== path.resolve(DEFAULT_MANIFEST_PATH)) {
      fail(
        'Production must use the checked-in default release manifest path.',
        'PRODUCTION_MANIFEST_OVERRIDE_FORBIDDEN'
      );
    }
    const unknownFlagState = GUARDED_RUNTIME_FLAGS.filter(
      (name) => !(name in env) || !isExplicitlyDisabledFlag(env[name])
    );
    if (unknownFlagState.length > 0) {
      fail(
        `Production flag state is unknown; explicitly set these flags to false: ${unknownFlagState.join(', ')}`,
        'PRODUCTION_FLAG_STATE_UNKNOWN'
      );
    }
    if (!options.confirmProduction || env.RELEASE_MIGRATION_CONFIRM !== PRODUCTION_CONFIRMATION) {
      fail(
        `Production requires both --confirm-production and RELEASE_MIGRATION_CONFIRM=${PRODUCTION_CONFIRMATION}.`,
        'PRODUCTION_CONFIRMATION_REQUIRED'
      );
    }
  }

}

export function parseArgs(argv) {
  const options = {
    mode: 'preflight',
    manifestPath: DEFAULT_MANIFEST_PATH,
    target: undefined,
    confirmProduction: false,
    generateManifest: false,
    envFile: undefined,
    help: false,
  };
  let selectedMode = null;

  for (const argument of argv) {
    if (argument === '--apply' || argument === '--preflight' || argument === '--dry-run') {
      const mode = argument.slice(2);
      if (selectedMode && selectedMode !== mode) {
        fail('Choose exactly one of --apply, --preflight, or --dry-run.', 'CONFLICTING_MODES');
      }
      selectedMode = mode;
      options.mode = mode;
    } else if (argument.startsWith('--target=')) {
      options.target = argument.slice('--target='.length);
    } else if (argument.startsWith('--manifest=')) {
      options.manifestPath = path.resolve(argument.slice('--manifest='.length));
    } else if (argument.startsWith('--env-file=')) {
      options.envFile = path.resolve(argument.slice('--env-file='.length));
    } else if (argument === '--confirm-production') {
      options.confirmProduction = true;
    } else if (argument === '--generate-manifest') {
      options.generateManifest = true;
    } else if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else {
      fail(`Unknown argument: ${argument}`, 'UNKNOWN_ARGUMENT');
    }
  }

  if (options.generateManifest && selectedMode) {
    fail('--generate-manifest cannot be combined with a database mode.', 'INVALID_GENERATE_MODE');
  }

  return options;
}

function validateSafeFilename(filename) {
  return typeof filename === 'string'
    && filename === path.basename(filename)
    && filename.endsWith('.sql')
    && !filename.includes('..');
}

export function validateManifestStructure(manifest) {
  if (!manifest || manifest.version !== MANIFEST_VERSION || manifest.release !== RELEASE_ID) {
    fail(
      `Manifest must declare version ${MANIFEST_VERSION} and release ${RELEASE_ID}.`,
      'INVALID_MANIFEST_HEADER'
    );
  }
  if (!Array.isArray(manifest.migrations)) {
    fail('Manifest migrations must be an array.', 'INVALID_MANIFEST_MIGRATIONS');
  }

  const filenames = manifest.migrations.map((entry) => entry?.filename);
  if (
    filenames.length !== EXPECTED_RELEASE_FILENAMES.length
    || filenames.some((filename, index) => filename !== EXPECTED_RELEASE_FILENAMES[index])
  ) {
    fail(
      'Manifest migration order does not exactly match the compiled forward-only release order.',
      'MANIFEST_ORDER_MISMATCH'
    );
  }

  for (const entry of manifest.migrations) {
    if (!validateSafeFilename(entry.filename)) {
      fail(`Unsafe migration filename in manifest: ${String(entry.filename)}`, 'UNSAFE_FILENAME');
    }
    if (!/^[0-9a-f]{64}$/.test(String(entry.sha256 ?? ''))) {
      fail(
        `Manifest checksum is not finalized for ${entry.filename}. Run --generate-manifest after every release SQL file exists.`,
        'MANIFEST_CHECKSUM_MISSING'
      );
    }
    const expectedAction = HISTORICAL_PREREQUISITE_FILENAMES.includes(entry.filename)
      ? 'prerequisite'
      : 'apply';
    if (entry.action !== expectedAction) {
      fail(
        `${entry.filename} must have manifest action=${expectedAction}.`,
        'MANIFEST_ACTION_MISMATCH'
      );
    }
  }

  return manifest;
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      fail(`Release manifest not found: ${filePath}`, 'MANIFEST_NOT_FOUND');
    }
    if (error instanceof SyntaxError) {
      fail(`Release manifest is not valid JSON: ${filePath}`, 'INVALID_MANIFEST_JSON');
    }
    throw error;
  }
}

async function assertNoUnlistedReleaseFiles(migrationsDirectory) {
  // These migrations are already part of the origin/main baseline that this
  // release overlays. They are intentionally outside the finalized 21-entry
  // forward release manifest and must not be mistaken for newly smuggled SQL.
  const baselineMainMigrations = new Set([
    '20260802_family_financing_fee_policy.sql',
    '20260805_member_request_notifications.sql',
    '20260805_moyasar_auto_reconciliation.sql',
  ]);
  const filenames = await fs.readdir(migrationsDirectory);
  const unexpected = filenames
    .filter((filename) => RELEASE_FILE_PATTERN.test(filename))
    .filter((filename) => !EXPECTED_RELEASE_FILENAMES.includes(filename))
    .filter((filename) => !baselineMainMigrations.has(filename))
    .sort();

  if (unexpected.length > 0) {
    fail(
      `Refusing unlisted release migration file(s): ${unexpected.join(', ')}`,
      'UNLISTED_RELEASE_MIGRATION'
    );
  }
}

export async function loadVerifiedRelease(manifestPath = DEFAULT_MANIFEST_PATH) {
  const manifest = validateManifestStructure(await readJson(manifestPath));
  const migrationsDirectory = path.dirname(manifestPath);
  await assertNoUnlistedReleaseFiles(migrationsDirectory);

  const migrations = [];
  for (const entry of manifest.migrations) {
    const filePath = path.join(migrationsDirectory, entry.filename);
    let contents;
    try {
      contents = await fs.readFile(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        fail(
          `Required release migration is missing: ${entry.filename}`,
          'MIGRATION_FILE_MISSING'
        );
      }
      throw error;
    }

    const actualChecksum = sha256(contents);
    if (actualChecksum !== entry.sha256) {
      fail(
        `Checksum mismatch for ${entry.filename}; the SQL differs from the approved manifest.`,
        'MIGRATION_CHECKSUM_MISMATCH'
      );
    }

    const sql = contents.toString('utf8');
    stripManagedOuterTransaction(sql, entry.filename);

    migrations.push({
      filename: entry.filename,
      checksum: entry.sha256,
      action: entry.action,
      sql,
    });
  }

  return { manifest, migrations, migrationsDirectory };
}

export function stripManagedOuterTransaction(sql, filename = 'migration.sql') {
  const controls = [...sql.matchAll(
    /^[\t ]*(BEGIN|COMMIT|ROLLBACK)[\t ]*;[\t ]*(?:--[^\r\n]*)?$/gim
  )];

  if (
    controls.length !== 2
    || controls[0][1].toUpperCase() !== 'BEGIN'
    || controls[1][1].toUpperCase() !== 'COMMIT'
  ) {
    fail(
      `${filename} must contain exactly one outer BEGIN and one final COMMIT; the runner owns the atomic transaction.`,
      'UNSAFE_TRANSACTION_WRAPPER'
    );
  }

  const beforeBegin = sql.slice(0, controls[0].index);
  const between = sql.slice(
    controls[0].index + controls[0][0].length,
    controls[1].index
  );
  const afterCommit = sql.slice(controls[1].index + controls[1][0].length);

  const contentAfterComments = afterCommit
    .replace(/--[^\r\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
  if (contentAfterComments.length > 0) {
    fail(
      `${filename} contains executable content after its outer COMMIT.`,
      'CONTENT_AFTER_COMMIT'
    );
  }

  return `${beforeBegin}\n-- Outer transaction is managed by run-release-migrations.mjs.\n${between}\n${afterCommit}`;
}

export function buildMigrationPlan(migrations, ledgerRows) {
  const releaseNames = new Set(migrations.map((migration) => migration.filename));
  const unexpectedReleaseRows = ledgerRows
    .map((row) => row.filename)
    .filter((filename) => RELEASE_FILE_PATTERN.test(filename) && !releaseNames.has(filename));
  if (unexpectedReleaseRows.length > 0) {
    fail(
      `Migration ledger contains unlisted release history: ${unexpectedReleaseRows.sort().join(', ')}`,
      'UNLISTED_RELEASE_LEDGER_ROW'
    );
  }
  const relevantRows = ledgerRows.filter((row) => releaseNames.has(row.filename));
  const ledgerByFilename = new Map(relevantRows.map((row) => [row.filename, row]));
  let foundPending = false;
  const plan = [];

  for (const migration of migrations) {
    const applied = ledgerByFilename.get(migration.filename);
    if (migration.action === 'prerequisite') {
      if (!applied) {
        fail(
          `Historical prerequisite is missing from the migration ledger: ${migration.filename}. It will not be auto-applied.`,
          'HISTORICAL_PREREQUISITE_MISSING'
        );
      }
      if (applied.checksum !== migration.checksum) {
        fail(
          `Historical prerequisite checksum mismatch for ${migration.filename}.`,
          'LEDGER_CHECKSUM_MISMATCH'
        );
      }
      plan.push({ ...migration, status: 'prerequisite' });
      continue;
    }
    if (!applied) {
      foundPending = true;
      plan.push({ ...migration, status: 'pending' });
      continue;
    }
    if (foundPending) {
      fail(
        `Migration ledger is out of order: ${migration.filename} is recorded after a missing predecessor.`,
        'LEDGER_ORDER_GAP'
      );
    }
    if (applied.checksum !== migration.checksum) {
      fail(
        `Applied checksum mismatch for ${migration.filename}. Refusing to rewrite migration history.`,
        'LEDGER_CHECKSUM_MISMATCH'
      );
    }
    plan.push({ ...migration, status: 'applied' });
  }

  return plan;
}

function poolConfiguration(env = process.env) {
  const base = env.DATABASE_URL
    ? { connectionString: env.DATABASE_URL }
    : {
        host: env.DB_HOST || 'localhost',
        port: Number.parseInt(env.DB_PORT || '5432', 10),
        database: env.DB_NAME || 'alshuail_db',
        user: env.DB_USER || 'alshuail',
        password: env.DB_PASSWORD,
      };

  return {
    ...base,
    max: 1,
    connectionTimeoutMillis: Number.parseInt(env.MIGRATION_CONNECT_TIMEOUT_MS || '10000', 10),
    application_name: `alshuail-${RELEASE_ID}-migration-runner`,
  };
}

async function acquireRunnerLock(client) {
  const result = await client.query(
    'SELECT pg_try_advisory_lock($1::bigint) AS locked',
    [ADVISORY_LOCK_KEY]
  );
  if (!result.rows[0]?.locked) {
    fail(
      'Another release migration runner currently holds the database advisory lock.',
      'MIGRATION_LOCK_BUSY'
    );
  }
}

async function releaseRunnerLock(client) {
  try {
    await client.query('SELECT pg_advisory_unlock($1::bigint)', [ADVISORY_LOCK_KEY]);
  } catch {
    // Closing the session also releases a PostgreSQL session advisory lock.
  }
}

async function ledgerExists(client) {
  const result = await client.query(
    'SELECT to_regclass($1) IS NOT NULL AS ledger_exists',
    [LEDGER_REGCLASS]
  );
  return result.rows[0]?.ledger_exists === true;
}

async function assertLedgerShape(client) {
  const result = await client.query(`
    SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'schema_migrations'
       AND column_name IN ('filename', 'checksum', 'applied_at')
  `);
  const columns = new Map(result.rows.map((row) => [row.column_name, row]));
  const valid = columns.get('filename')?.data_type === 'text'
    && columns.get('filename')?.is_nullable === 'NO'
    && columns.get('checksum')?.data_type === 'text'
    && columns.get('checksum')?.is_nullable === 'NO'
    && columns.get('applied_at')?.data_type === 'timestamp with time zone'
    && columns.get('applied_at')?.is_nullable === 'NO';
  if (!valid) {
    fail(
      'public.schema_migrations columns must be filename TEXT, checksum TEXT, and applied_at TIMESTAMPTZ, all NOT NULL.',
      'INVALID_LEDGER_SCHEMA'
    );
  }

  const uniqueness = await client.query(`
    SELECT EXISTS (
      SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public'
         AND t.relname = 'schema_migrations'
         AND c.contype IN ('p', 'u')
         AND c.conkey = ARRAY[
           (
             SELECT a.attnum
               FROM pg_attribute a
              WHERE a.attrelid = t.oid
                AND a.attname = 'filename'
                AND NOT a.attisdropped
           )
         ]::smallint[]
    ) AS filename_unique
  `);
  if (uniqueness.rows[0]?.filename_unique !== true) {
    fail(
      'public.schema_migrations.filename must be protected by a single-column PRIMARY KEY or UNIQUE constraint.',
      'INVALID_LEDGER_UNIQUENESS'
    );
  }
}

async function readLedger(client) {
  const result = await client.query(
    'SELECT filename, checksum, applied_at FROM public.schema_migrations ORDER BY applied_at, filename'
  );
  return result.rows;
}

export async function applyOneMigration(client, migration, env = process.env) {
  if (migration.action === 'prerequisite') {
    fail(
      `Historical prerequisite cannot be executed by this release runner: ${migration.filename}`,
      'HISTORICAL_PREREQUISITE_EXECUTION_FORBIDDEN'
    );
  }
  const executableSql = stripManagedOuterTransaction(migration.sql, migration.filename);
  await client.query('BEGIN');
  try {
    await client.query(
      `SET LOCAL lock_timeout = '${Number.parseInt(env.MIGRATION_LOCK_TIMEOUT_MS || '10000', 10)}ms'`
    );
    await client.query(
      `SET LOCAL statement_timeout = '${Number.parseInt(env.MIGRATION_STATEMENT_TIMEOUT_MS || '900000', 10)}ms'`
    );
    const existing = await client.query(
      'SELECT checksum FROM public.schema_migrations WHERE filename = $1 FOR UPDATE',
      [migration.filename]
    );
    if (existing.rowCount > 0) {
      if (existing.rows[0].checksum !== migration.checksum) {
        fail(
          `Applied checksum mismatch for ${migration.filename}.`,
          'LEDGER_CHECKSUM_MISMATCH'
        );
      }
      await client.query('COMMIT');
      return 'skipped';
    }

    await client.query(executableSql);
    await client.query(
      `INSERT INTO public.schema_migrations (filename, checksum, applied_at)
       VALUES ($1, $2, NOW())`,
      [migration.filename, migration.checksum]
    );
    await client.query('COMMIT');
    return 'applied';
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original failure. Closing the client cleans up an open transaction.
    }
    throw error;
  }
}

function printPlan(plan, mode, output = console.log) {
  output(`Release: ${RELEASE_ID}`);
  output(`Mode: ${mode}`);
  output(`Historical prerequisites verified: ${plan.filter((item) => item.status === 'prerequisite').length}`);
  output(`Forward migrations already applied: ${plan.filter((item) => item.status === 'applied').length}`);
  output(`Pending: ${plan.filter((item) => item.status === 'pending').length}`);
  for (const item of plan) {
    output(`- ${item.status.toUpperCase()} ${item.filename} sha256:${item.checksum.slice(0, 12)}`);
  }
}

export async function runReleaseMigrations(options, dependencies = {}) {
  const env = dependencies.env || process.env;
  const output = dependencies.output || console.log;
  const createPool = dependencies.createPool || (() => new Pool(poolConfiguration(env)));

  assertRuntimeFlagsDisabled(env);
  assertTargetSafety(options, env);

  const release = await loadVerifiedRelease(options.manifestPath);
  const pool = createPool();
  let client;
  let lockHeld = false;

  try {
    client = await pool.connect();
    await acquireRunnerLock(client);
    lockHeld = true;

    const exists = await ledgerExists(client);
    if (!exists) {
      fail(
        'public.schema_migrations is missing. The release runner never creates or backfills migration history.',
        'LEDGER_MISSING'
      );
    }

    await assertLedgerShape(client);
    const plan = buildMigrationPlan(release.migrations, await readLedger(client));
    printPlan(plan, options.mode, output);

    if (options.mode !== 'apply') {
      output('No database changes were made.');
      return { plan, applied: 0, skipped: 0 };
    }

    let applied = 0;
    let skipped = 0;
    for (const migration of plan.filter((item) => item.status === 'pending')) {
      const result = await applyOneMigration(client, migration, env);
      if (result === 'applied') {
        applied += 1;
        output(`APPLIED ${migration.filename}`);
      } else {
        skipped += 1;
        output(`SKIPPED ${migration.filename}`);
      }
    }

    output(`Release migration complete: ${applied} applied, ${skipped} concurrently skipped.`);
    return { plan, applied, skipped };
  } finally {
    if (client && lockHeld) {
      await releaseRunnerLock(client);
    }
    client?.release?.();
    await pool.end?.();
  }
}

export async function generateManifest(manifestPath = DEFAULT_MANIFEST_PATH) {
  const migrationsDirectory = path.dirname(manifestPath);
  await assertNoUnlistedReleaseFiles(migrationsDirectory);
  const migrations = [];

  for (const filename of EXPECTED_RELEASE_FILENAMES) {
    const filePath = path.join(migrationsDirectory, filename);
    let contents;
    try {
      contents = await fs.readFile(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        fail(
          `Cannot finalize manifest; required migration is missing: ${filename}`,
          'MIGRATION_FILE_MISSING'
        );
      }
      throw error;
    }
    stripManagedOuterTransaction(contents.toString('utf8'), filename);
    migrations.push({
      filename,
      sha256: sha256(contents),
      action: HISTORICAL_PREREQUISITE_FILENAMES.includes(filename) ? 'prerequisite' : 'apply',
    });
  }

  const manifest = {
    version: MANIFEST_VERSION,
    release: RELEASE_ID,
    generatedAt: new Date().toISOString(),
    migrations,
  };
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'w' });
  return manifest;
}

function usage() {
  return `Usage:
  npm run db:migrate -- --preflight
  npm run db:migrate -- --dry-run
  npm run db:migrate -- --apply --target=local
  RELEASE_MIGRATION_CONFIRM=${PRODUCTION_CONFIRMATION} npm run db:migrate -- \\
    --apply --target=production --confirm-production --env-file=.env.production
  npm run db:migrate -- --generate-manifest

Safety:
  - Default mode is preflight; mutation requires the explicit --apply mode and target.
  - Financial gateway, reconciliation, repayment, and reminder flags must all be off.
  - Production requires both a flag and a confirmation environment value.
  - Production requires every guarded runtime flag to be explicitly present and false.
  - Each SQL file and its ledger insert commit atomically; failures roll back.
  - Historical migrations through 20260809 are exact-checksum prerequisites and are never auto-applied.
  - The ledger and six exact historical prerequisite rows must already exist.
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.generateManifest) {
    const manifest = await generateManifest(options.manifestPath);
    console.log(`Finalized ${manifest.migrations.length} checksums in ${options.manifestPath}.`);
    return;
  }
  if (options.envFile) {
    const result = dotenv.config({ path: options.envFile, override: false, quiet: true });
    if (result.error) {
      fail(`Unable to load environment file: ${options.envFile}`, 'ENV_FILE_LOAD_FAILED');
    }
  }
  await runReleaseMigrations(options);
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  main().catch((error) => {
    const code = error instanceof MigrationRunnerError ? error.code : 'UNEXPECTED_ERROR';
    console.error(`[${code}] ${error.message}`);
    process.exitCode = 1;
  });
}
