# Release migration runner

`scripts/run-release-migrations.mjs` is the only supported runner for the
2026-08-10 financing/payment release. It replaces the old `db:migrate` command,
which referenced the missing `runSQL.js` file.

## Safety contract

- The ordered allow-list is compiled into the runner and duplicated in
  `release-20260810.manifest.json`.
- Every SQL file is verified with SHA-256 before a database connection is used.
- A PostgreSQL advisory lock permits only one release runner at a time.
- Each migration body and its `public.schema_migrations` insert run in one
  transaction. A SQL error, ledger error, connection loss, or process exit
  before commit leaves neither change committed.
- Existing ledger checksums are immutable. A missing predecessor, changed
  checksum, unlisted release SQL file, or unknown manifest entry aborts.
- The six migrations from 20260731 through 20260809 are historical
  prerequisites. They must already exist in the ledger at their exact manifest
  checksums and are never executed by this runner. Forward execution begins at
  `20260810_gateway_protocol_v2.sql`.
- Gateway, iOS gateway, reconciliation, financing repayment, financing gateway,
  and financing reminder flags must all be off.
- The default command is read-only preflight. Mutation always requires
  `--apply` and an explicit target.
- Production additionally requires every guarded flag to be explicitly present
  as `false`, plus two independent confirmation values.

The runner is forward-only. It does not execute rollback files and never edits
an already-applied ledger row. Restore/recovery decisions require a database
backup and a new forward migration.

## Ledger prerequisite

Production and staging must already contain this reviewed ledger shape:

```sql
CREATE TABLE public.schema_migrations (
  filename TEXT PRIMARY KEY,
  checksum TEXT NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The runner never creates this table, inserts historical prerequisite rows, or
adopts a schema with an empty ledger. Missing history is an ambiguity that must
be resolved before the release, not guessed by automation.

## Freeze the manifest

Run this only after all release SQL files are frozen:

```bash
npm run db:migrate -- --generate-manifest
git diff -- migrations/release-20260810.manifest.json
```

Review and commit the checksum diff together with the SQL. A later SQL edit must
produce and review a new checksum. Never repair a production checksum mismatch
by rewriting `schema_migrations`.

## Local disposable rehearsal

Point the standard PostgreSQL environment variables or `DATABASE_URL` at a
database clone whose name and lifecycle have already been verified as
disposable. The clone must include `schema_migrations` and the exact six
historical prerequisite rows from the manifest. A blank database or empty
ledger is intentionally rejected. The runner never drops a database.

```bash
npm run db:migrate -- --preflight
npm run db:migrate -- --apply --target=local
npm run db:migrate -- --apply --target=local
```

The second apply must report zero pending migrations. Drop the disposable
database separately only after resolving its exact name with a read-only check.

## Production runbook

Before running: take and verify a database backup, stop financial workers,
confirm the six guarded flags are explicitly `false` in `.env.production`, and
confirm no other deploy or migration is active. The first preflight must report
exactly six verified historical prerequisites (20260731, 20260801, 20260802,
20260804, 20260805, and 20260809) at the manifest checksums. Any missing row or
checksum mismatch is a release blocker; do not insert or rewrite ledger history
during the production run.

```bash
node --env-file=.env.production scripts/run-release-migrations.mjs --preflight

RELEASE_MIGRATION_CONFIRM=APPLY_RELEASE_20260810 \
  node --env-file=.env.production scripts/run-release-migrations.mjs \
  --apply --target=production --confirm-production

node --env-file=.env.production scripts/run-release-migrations.mjs --preflight
```

`--env-file=.env.production` is a Node option and therefore appears before the
script path. The runner also accepts `--env-file=.env.production` after the
script path when invoked through `npm run db:migrate -- ...`.

Do not enable any guarded runtime flag until application health checks, schema
preflight, reconciliation readiness, and the release canary all pass.
