import { afterEach, describe, expect, jest, test } from '@jest/globals';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_MANIFEST_PATH,
  EXPECTED_RELEASE_FILENAMES,
  applyOneMigration,
  assertRuntimeFlagsDisabled,
  assertTargetSafety,
  buildMigrationPlan,
  loadVerifiedRelease,
  parseArgs,
  runReleaseMigrations,
  sha256,
  stripManagedOuterTransaction,
} from '../../../scripts/run-release-migrations.mjs';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true })
    )
  );
});

async function makeReleaseFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'alshuail-release-runner-'));
  temporaryDirectories.push(directory);
  const migrations = [];

  for (const [index, filename] of EXPECTED_RELEASE_FILENAMES.entries()) {
    const contents = `-- fixture ${index}\nBEGIN;\nSELECT ${index};\nCOMMIT;\n`;
    await fs.writeFile(path.join(directory, filename), contents);
    migrations.push({
      filename,
      sha256: sha256(contents),
      action: index < 6 ? 'prerequisite' : 'apply',
    });
  }

  const manifestPath = path.join(directory, 'release-20260810.manifest.json');
  await fs.writeFile(
    manifestPath,
    JSON.stringify({
      version: 1,
      release: 'release-20260810',
      generatedAt: '2026-08-10T00:00:00.000Z',
      migrations,
    })
  );

  return { directory, manifestPath, migrations };
}

describe('release migration manifest contract', () => {
  test('verifies every checked-in release SQL checksum in exact forward order', async () => {
    const release = await loadVerifiedRelease(DEFAULT_MANIFEST_PATH);

    expect(release.migrations.map((migration) => migration.filename)).toEqual(
      EXPECTED_RELEASE_FILENAMES
    );
    expect(release.migrations).toHaveLength(21);
    expect(release.migrations.slice(0, 6).every((migration) => (
      migration.action === 'prerequisite'
    ))).toBe(true);
    expect(release.migrations.slice(6).every((migration) => (
      migration.action === 'apply'
    ))).toBe(true);
  });

  test('refuses a SQL file changed after manifest approval', async () => {
    const fixture = await makeReleaseFixture();
    await fs.appendFile(
      path.join(fixture.directory, EXPECTED_RELEASE_FILENAMES[0]),
      '-- unauthorized change\n'
    );

    await expect(loadVerifiedRelease(fixture.manifestPath)).rejects.toMatchObject({
      code: 'MIGRATION_CHECKSUM_MISMATCH',
    });
  });

  test('refuses an unlisted migration in the release date window', async () => {
    const fixture = await makeReleaseFixture();
    await fs.writeFile(
      path.join(fixture.directory, '20260819_unlisted_release_change.sql'),
      'BEGIN;\nSELECT 1;\nCOMMIT;\n'
    );

    await expect(loadVerifiedRelease(fixture.manifestPath)).rejects.toMatchObject({
      code: 'UNLISTED_RELEASE_MIGRATION',
    });
  });
});

describe('release migration ledger planning', () => {
  const migrations = [
    { filename: 'a.sql', checksum: 'a'.repeat(64), sql: 'BEGIN;\nSELECT 1;\nCOMMIT;' },
    { filename: 'b.sql', checksum: 'b'.repeat(64), sql: 'BEGIN;\nSELECT 2;\nCOMMIT;' },
    { filename: 'c.sql', checksum: 'c'.repeat(64), sql: 'BEGIN;\nSELECT 3;\nCOMMIT;' },
  ];

  test('skips an already-applied prefix idempotently', () => {
    const plan = buildMigrationPlan(migrations, [
      { filename: 'a.sql', checksum: 'a'.repeat(64) },
      { filename: 'b.sql', checksum: 'b'.repeat(64) },
    ]);

    expect(plan.map((migration) => migration.status)).toEqual([
      'applied',
      'applied',
      'pending',
    ]);
  });

  test('refuses a gap instead of running older migrations out of order', () => {
    expect(() => buildMigrationPlan(migrations, [
      { filename: 'a.sql', checksum: 'a'.repeat(64) },
      { filename: 'c.sql', checksum: 'c'.repeat(64) },
    ])).toThrow(expect.objectContaining({ code: 'LEDGER_ORDER_GAP' }));
  });

  test('refuses a checksum mismatch in immutable applied history', () => {
    expect(() => buildMigrationPlan(migrations, [
      { filename: 'a.sql', checksum: '0'.repeat(64) },
    ])).toThrow(expect.objectContaining({ code: 'LEDGER_CHECKSUM_MISMATCH' }));
  });

  test('refuses an unlisted release row already present in the ledger', () => {
    expect(() => buildMigrationPlan(migrations, [
      { filename: '20260819_unlisted_history.sql', checksum: '0'.repeat(64) },
    ])).toThrow(expect.objectContaining({ code: 'UNLISTED_RELEASE_LEDGER_ROW' }));
  });
});

describe('atomic migration application', () => {
  const migration = {
    filename: 'atomic.sql',
    checksum: 'f'.repeat(64),
    sql: '-- test\nBEGIN;\nCREATE TABLE atomic_fixture(id integer);\nCOMMIT;\n',
  };

  test('removes only the file wrapper so SQL and ledger insert share the runner transaction', () => {
    const executable = stripManagedOuterTransaction(migration.sql, migration.filename);

    expect(executable).toContain('CREATE TABLE atomic_fixture');
    expect(executable).not.toMatch(/^\s*BEGIN\s*;/m);
    expect(executable).not.toMatch(/^\s*COMMIT\s*;/m);
  });

  test('defensively refuses direct execution of a historical prerequisite', async () => {
    const client = { query: jest.fn() };

    await expect(applyOneMigration(client, {
      ...migration,
      action: 'prerequisite',
    })).rejects.toMatchObject({ code: 'HISTORICAL_PREREQUISITE_EXECUTION_FORBIDDEN' });
    expect(client.query).not.toHaveBeenCalled();
  });

  test('rolls back when the ledger insert fails after executing SQL', async () => {
    const calls = [];
    const client = {
      query: jest.fn((sql) => {
        calls.push(sql);
        if (String(sql).startsWith('SELECT checksum')) {
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        if (String(sql).startsWith('INSERT INTO public.schema_migrations')) {
          return Promise.reject(new Error('simulated crash-window failure'));
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      }),
    };

    await expect(applyOneMigration(client, migration, {})).rejects.toThrow(
      'simulated crash-window failure'
    );
    expect(calls[0]).toBe('BEGIN');
    expect(calls).toContain('ROLLBACK');
    expect(calls).not.toContain('COMMIT');
    expect(calls.some((sql) => String(sql).includes('CREATE TABLE atomic_fixture'))).toBe(true);
  });

  test('concurrent/repeated application skips the same recorded checksum', async () => {
    const calls = [];
    const client = {
      query: jest.fn((sql) => {
        calls.push(sql);
        if (String(sql).startsWith('SELECT checksum')) {
          return Promise.resolve({ rowCount: 1, rows: [{ checksum: migration.checksum }] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      }),
    };

    await expect(applyOneMigration(client, migration, {})).resolves.toBe('skipped');
    expect(calls).toContain('COMMIT');
    expect(calls.some((sql) => String(sql).includes('CREATE TABLE atomic_fixture'))).toBe(false);
    expect(calls.some((sql) => String(sql).startsWith('INSERT INTO public.schema_migrations'))).toBe(false);
  });
});

describe('release runner safety gates', () => {
  test('empty ledger aborts before any release migration SQL is executed', async () => {
    const queries = [];
    const client = {
      query: jest.fn((sql) => {
        const text = String(sql);
        queries.push(text);
        if (text.includes('pg_try_advisory_lock')) {
          return Promise.resolve({ rows: [{ locked: true }] });
        }
        if (text.includes('to_regclass')) {
          return Promise.resolve({ rows: [{ ledger_exists: true }] });
        }
        if (text.includes('information_schema.columns')) {
          return Promise.resolve({
            rows: [
              { column_name: 'filename', data_type: 'text', is_nullable: 'NO' },
              { column_name: 'checksum', data_type: 'text', is_nullable: 'NO' },
              {
                column_name: 'applied_at',
                data_type: 'timestamp with time zone',
                is_nullable: 'NO',
              },
            ],
          });
        }
        if (text.includes('FROM pg_constraint')) {
          return Promise.resolve({ rows: [{ filename_unique: true }] });
        }
        if (text.startsWith('SELECT filename, checksum, applied_at')) {
          return Promise.resolve({ rows: [] });
        }
        if (text.includes('pg_advisory_unlock')) {
          return Promise.resolve({ rows: [{ pg_advisory_unlock: true }] });
        }
        return Promise.reject(new Error(`Unexpected query: ${text.slice(0, 80)}`));
      }),
      release: jest.fn(),
    };
    const pool = {
      connect: jest.fn(() => Promise.resolve(client)),
      end: jest.fn(() => Promise.resolve()),
    };

    await expect(runReleaseMigrations(
      {
        mode: 'apply',
        target: 'local',
        manifestPath: DEFAULT_MANIFEST_PATH,
      },
      { createPool: () => pool, env: {}, output: jest.fn() }
    )).rejects.toMatchObject({ code: 'HISTORICAL_PREREQUISITE_MISSING' });

    expect(queries).not.toContain('BEGIN');
    expect(queries.some((sql) => sql.startsWith('INSERT INTO public.schema_migrations'))).toBe(false);
    expect(queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS public.financing'))).toBe(false);
  });

  test('defaults to non-mutating preflight and requires explicit apply target', () => {
    expect(parseArgs([]).mode).toBe('preflight');
    expect(() => assertTargetSafety({ mode: 'apply' }, {})).toThrow(
      expect.objectContaining({ code: 'TARGET_REQUIRED' })
    );
  });

  test('aborts while any guarded financial feature is enabled', () => {
    expect(() => assertRuntimeFlagsDisabled({ PAYMENT_GATEWAY_ENABLED: 'true' })).toThrow(
      expect.objectContaining({ code: 'RUNTIME_FLAGS_ENABLED' })
    );
  });

  test('requires explicit known-off flags and two-factor production confirmation', () => {
    const flagsOff = Object.fromEntries([
      'PAYMENT_GATEWAY_ENABLED',
      'IOS_PAYMENT_GATEWAY_ENABLED',
      'PAYMENT_GATEWAY_RECONCILIATION_ENABLED',
      'FINANCING_REPAYMENT_ENABLED',
      'FINANCING_GATEWAY_ENABLED',
      'FINANCING_REMINDERS_ENABLED',
    ].map((name) => [name, 'false']));

    expect(() => assertTargetSafety(
      { mode: 'apply', target: 'production', confirmProduction: true },
      { ...flagsOff, NODE_ENV: 'production' }
    )).toThrow(expect.objectContaining({ code: 'PRODUCTION_CONFIRMATION_REQUIRED' }));

    expect(() => assertTargetSafety(
      { mode: 'apply', target: 'production', confirmProduction: true },
      {
        ...flagsOff,
        FINANCING_GATEWAY_ENABLED: 'fasle',
        NODE_ENV: 'production',
        RELEASE_MIGRATION_CONFIRM: 'APPLY_RELEASE_20260810',
      }
    )).toThrow(expect.objectContaining({ code: 'PRODUCTION_FLAG_STATE_UNKNOWN' }));

    expect(() => assertTargetSafety(
      {
        mode: 'apply',
        target: 'production',
        confirmProduction: true,
        manifestPath: '/tmp/unreviewed-manifest.json',
      },
      {
        ...flagsOff,
        NODE_ENV: 'production',
        RELEASE_MIGRATION_CONFIRM: 'APPLY_RELEASE_20260810',
      }
    )).toThrow(expect.objectContaining({ code: 'PRODUCTION_MANIFEST_OVERRIDE_FORBIDDEN' }));

    expect(() => assertTargetSafety(
      {
        mode: 'apply',
        target: 'production',
        confirmProduction: true,
        manifestPath: DEFAULT_MANIFEST_PATH,
      },
      {
        ...flagsOff,
        NODE_ENV: 'production',
        RELEASE_MIGRATION_CONFIRM: 'APPLY_RELEASE_20260810',
      }
    )).not.toThrow();
  });
});
