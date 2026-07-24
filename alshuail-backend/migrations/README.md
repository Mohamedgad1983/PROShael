# Database migrations

SQL migrations, applied in ascending filename order (the `YYYYMMDD_` prefix keeps
ordering deterministic). Applied files are tracked in a `schema_migrations` ledger
so each runs exactly once. Files ending in `_rollback.sql` are manual down-scripts
and are never auto-applied.

> The database is self-hosted PostgreSQL on the VPS (migrated off Supabase).
> Ignore any older instructions referencing the Supabase SQL Editor or
> `supabase.rpc('execute_sql')` — use the runner below.

## Commands (run from `alshuail-backend/`)

```bash
npm run db:migrate:status     # show applied vs pending (read-only, safe anywhere)
npm run db:migrate            # apply all pending migrations
npm run db:migrate:baseline   # mark all current migrations as applied WITHOUT
                              # running them
```

Connection comes from `DATABASE_URL`, or `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`
(loaded from `.env`), honoring `DB_SSL=true` — identical to `src/services/database.js`.

## Adopting the runner on the existing production database (one time)

The production schema was built by applying these files **by hand**, so the ledger
starts empty. Run **baseline once** to record every current migration as already
applied (this executes no SQL), then use `up` for everything new:

```bash
npm run db:migrate:status     # sanity check: shows all files as "pending"
npm run db:migrate:baseline   # record them as applied (no SQL runs)
npm run db:migrate:status     # now shows "Up to date"
```

After baselining, add new migrations as `YYYYMMDD_description.sql` and run
`npm run db:migrate`. Each migration runs in its own transaction (except files
using `CREATE INDEX CONCURRENTLY`, which Postgres forbids inside a transaction —
those run unwrapped).

## Migration authoring conventions

- Name files `YYYYMMDD_description.sql`; optional `YYYYMMDD_description_rollback.sql`
  for a manual down-script.
- Use `IF NOT EXISTS` / `IF EXISTS` for idempotency where practical.
- Add indexes for foreign keys; document non-obvious dependencies in a header comment.
