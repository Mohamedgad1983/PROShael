# Preserved VPS-only backend files

These files existed ONLY on the production VPS (added in VPS-local commit
`59e0538 "backup: preserve VPS local state before Moyasar deploy"`) and were
never on `origin/main`. They are preserved here before the VPS git history was
reconciled to `origin/main`.

**They were NOT wired into the running server** — `server.js` does not import
any of them; `storage.js` -> `storageService.js` and `pgNotifyService.js` ->
`socketService.js` only reference each other. Treat as an unfinished
storage / websocket (socket.io) / swagger feature branch.

- `check.js` — ad-hoc script
- `src/config/swagger.js` — Swagger/OpenAPI config
- `src/routes/storage.js` — storage upload route (imports storageService)
- `src/services/storageService.js` — file storage service
- `src/services/socketService.js` — socket.io emit helper
- `src/services/pgNotifyService.js` — Postgres LISTEN/NOTIFY -> socket bridge
- `server.js.backup.20251219` — a stale server.js backup (safe to delete)

To integrate the storage/websocket feature, wire these into `server.js`, add the
required deps (socket.io, swagger packages) to `package.json`, and test.
