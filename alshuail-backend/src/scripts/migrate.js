/**
 * Dependency-light SQL migration runner for the Al-Shuail backend.
 *
 * Migrations live in alshuail-backend/migrations/*.sql and are applied in
 * ascending filename order (the YYYYMMDD_ prefix makes this deterministic).
 * Applied files are recorded in a `schema_migrations` ledger so each runs
 * exactly once. Files ending in `_rollback.sql` are treated as manual
 * down-scripts and are NEVER auto-applied by `up`.
 *
 * Commands:
 *   node src/scripts/migrate.js status     Show applied vs pending
 *   node src/scripts/migrate.js up         Apply all pending migrations
 *   node src/scripts/migrate.js baseline   Mark all current migrations as
 *                                          applied WITHOUT running them — use
 *                                          this once to adopt the runner on the
 *                                          existing (already-migrated) database.
 *
 * Connection: DATABASE_URL, else DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD
 * (identical to src/services/database.js). Honors DB_SSL=true.
 *
 * Each migration runs inside its own transaction, except files containing
 * CREATE INDEX CONCURRENTLY (which Postgres forbids inside a transaction) —
 * those run unwrapped.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

function buildConfig() {
  const base = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        database: process.env.DB_NAME || 'alshuail_db',
        user: process.env.DB_USER || 'alshuail',
        password: process.env.DB_PASSWORD,
      };
  if (String(process.env.DB_SSL).toLowerCase() === 'true') {
    base.ssl = { rejectUnauthorized: false };
  }
  return base;
}

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('_rollback.sql'))
    .sort();
}

function checksum(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function ensureLedger(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      checksum   TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function appliedSet(client) {
  try {
    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    return new Set(rows.map((r) => r.filename));
  } catch (err) {
    if (err.code === '42P01') return new Set(); // undefined_table: ledger not created yet
    throw err;
  }
}

async function cmdStatus(client) {
  const files = listMigrationFiles();
  const applied = await appliedSet(client);
  const pending = files.filter((f) => !applied.has(f));
  console.log(`Migrations dir: ${MIGRATIONS_DIR}`);
  console.log(`Applied: ${files.length - pending.length}/${files.length}`);
  if (pending.length) {
    console.log('\nPending:');
    pending.forEach((f) => console.log(`  - ${f}`));
  } else {
    console.log('\nUp to date.');
  }
}

async function cmdBaseline(client) {
  const files = listMigrationFiles();
  const applied = await appliedSet(client);
  let marked = 0;
  for (const f of files) {
    if (applied.has(f)) continue;
    await client.query(
      'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING',
      [f, checksum(path.join(MIGRATIONS_DIR, f))]
    );
    marked += 1;
  }
  console.log(`Baseline complete: marked ${marked} migration(s) as already applied (no SQL executed).`);
}

async function cmdUp(client) {
  const files = listMigrationFiles();
  const applied = await appliedSet(client);
  const pending = files.filter((f) => !applied.has(f));
  if (!pending.length) {
    console.log('No pending migrations. Up to date.');
    return;
  }
  for (const f of pending) {
    const full = path.join(MIGRATIONS_DIR, f);
    const sql = fs.readFileSync(full, 'utf8');
    const concurrent = /create\s+index\s+concurrently/i.test(sql);
    process.stdout.write(`Applying ${f}${concurrent ? ' (no txn: CONCURRENTLY)' : ''} ... `);
    try {
      if (!concurrent) await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
        [f, checksum(full)]
      );
      if (!concurrent) await client.query('COMMIT');
      console.log('ok');
    } catch (err) {
      if (!concurrent) await client.query('ROLLBACK').catch(() => {});
      console.log('FAILED');
      throw new Error(`Migration ${f} failed: ${err.message}`);
    }
  }
  console.log(`\nApplied ${pending.length} migration(s).`);
}

async function main() {
  const cmd = process.argv[2] || 'status';
  if (!['status', 'up', 'baseline'].includes(cmd)) {
    console.error(`Unknown command: ${cmd}\nUsage: migrate.js [status|up|baseline]`);
    process.exitCode = 2;
    return;
  }
  const client = new Client(buildConfig());
  await client.connect();
  try {
    // `status` is read-only; only up/baseline create the ledger.
    if (cmd !== 'status') await ensureLedger(client);
    if (cmd === 'status') await cmdStatus(client);
    else if (cmd === 'up') await cmdUp(client);
    else if (cmd === 'baseline') await cmdBaseline(client);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`\nMigration runner error: ${err.message}`);
  process.exitCode = 1;
});
