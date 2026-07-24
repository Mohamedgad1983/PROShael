# Deferred cleanup / refactors (Phase 3)

These items were identified in the hardening audit but are **not safe to apply
blindly** — each is either live-mounted, routed, or needs a runtime check that a
static build can't give. Do them as reviewed PRs with the verification noted.

## 1. Duplicate backend controllers (live — merge, don't delete)
These pairs are BOTH mounted on different route trees, so they are duplicated,
not dead. Deleting one breaks its routes.

| Pair | Mounted at |
|------|-----------|
| `memberController.js` vs `membersController.js` | `member.js`/`receipts.js` vs `members.js` |
| `notificationController.js` vs `notificationsController.js` | `member.js` vs `notifications.js` |
| `memberMonitoringController.js` vs `membersMonitoringController.js` | `memberMonitoring.js` vs `members.js` |

**How to do it safely:** pick the canonical controller per pair, point both
routes at it, delete the other, and run the integration suite
(`npm run test:integration`) plus a manual smoke of each affected endpoint.
`memberController.js` is also the last consumer of the deprecated Supabase compat
shim (`src/config/database.js`) — migrate it to `src/services/database.js` as part
of the merge, then the shim can be dropped.

## 2. Admin tree-shaking is disabled (fix root cause, then re-enable)
`alshuail-admin-arabic/craco.config.js` disables `usedExports`/tree-shaking in
production as a workaround for the access-control feature being shaken away, plus
a `force-include-access-control.ts` shim and a `sideEffects` allowlist in
`package.json`. This bloats the deployed bundle.

**How to do it safely:**
1. Give the access-control package proper named exports and a correct
   `"sideEffects"` declaration so webpack keeps it.
2. Remove the `force-include-access-control` shim.
3. Re-enable `usedExports` / drop the Terser `dead_code:false` overrides.
4. `npm run build` AND **runtime-verify on a Cloudflare preview** that the
   Settings → Access Control feature still loads (a passing build is not enough —
   tree-shaking failures show up at runtime as a missing feature).

## 3. Triple mobile-web copy (verify routes before removing)
The member mobile UI exists three times:
- the standalone PWA (`alshuail-mobile/`, deploys to app.alshailfund.com),
- a copy inside admin (`alshuail-admin-arabic/src/pages/mobile/*` + `mobileApi.js`),
  which is **routed** in admin (`/mobile/*`) with a different token key and endpoints,
- a build step (`scripts/copy-mobile.js`) that copies the Vite `dist/` into admin.

**How to do it safely:** decide the single source of truth (the standalone PWA is
the real one). If the admin `/mobile/*` routes are unused, remove the routes,
`src/pages/mobile/*`, `mobileApi.js`, `components/mobile/*` and the copy step —
after confirming nothing links to `/mobile/*` in the admin and standardizing the
token key (`token` vs `alshuail_token`).

## 4. Dead admin components (safe deletions — done separately)
The genuinely unreferenced dashboard variants / demo services are handled in the
build-gated deletion pass (verified 0 references + admin build passes).
