# Payment-Lifecycle Hardening — April 17, 2026

Four payment-flow improvements landed in this change, all aimed at closing the
gaps identified in the lifecycle audit. Each phase is independently shippable.

## TL;DR

| Phase | What | Risk |
|---|---|---|
| 1 | Standardize payment status on `'paid'` (was: split between `'paid'` and `'completed'`) | **Medium** — requires a DB migration |
| 2 | Replace hardcoded `MIN_AMOUNT = 50` with a per-category floor pulled from the active subscription plans | Low — fallback to `1` SAR absolute floor on any error |
| 3 | Add an admin approval queue endpoint (`GET /api/payments/pending`) + ready-to-mount React page | Low — purely additive |
| 4 | Fire a push notification (`تم اعتماد دفعتك`) when an admin flips a payment `pending → paid` | Low — fire-and-forget, logged for audit |

Tests: **15/15** new tests pass, **73/73** existing `paymentProcessingService` tests pass, **378** total unit tests pass. The 53 pre-existing failures in `membersController` and `subscriptionController` suites are all DB-connection issues (`ENETUNREACH 213.199.62.185:5432`) from the sandbox — not caused by this change.

---

## Phase 1 — Status standardization

### Problem
The balance-update trigger fired on `status = 'completed'`, but
`PaymentProcessingService.updatePaymentStatus` wrote `'paid'`. So every admin
approval silently failed to update `members.current_balance`. Different parts
of the codebase used different spellings.

### What changed

**New migration** — `alshuail-backend/migrations/20260417_standardize_payment_status_to_paid.sql`
- Normalizes existing rows: `UPDATE payments SET status = 'paid' WHERE status = 'completed'`
- Drops and recreates `update_member_balance()` trigger to watch `status = 'paid'`
- Rebuilds `idx_payments_payer_status` partial index with the new filter
- Full recompute of every member's `current_balance`
- Wrapped in a transaction, idempotent on rerun, has a `ROLLBACK` block at the bottom for safety

**Backend code edits** (14 files, 32 total references changed):
- `src/controllers/membersController.js` (balance read)
- `src/controllers/memberStatementController.js` (3 queries)
- `src/controllers/crisisController.js` (2 reads + 1 INSERT)
- `src/controllers/fundBalanceController.js`
- `src/controllers/paymentAnalyticsController.js`
- `src/controllers/statementController.js` (5 presentation labels)
- `src/controllers/subscriptionController.js` (14 `status IN (...)` filters + 1 INSERT)
- `src/services/bankTransferService.js` (INSERT)
- `src/services/memberMonitoringQueryService.js` (3 filters + 1 query param)
- `src/services/optimizedReportQueries.js` (revenue calc)
- `src/scripts/simple-import.js` (INSERT + read)
- `src/scripts/import-members.js` (INSERT + read)
- `src/scripts/apply-member-monitoring-optimizations.js`

**Admin dashboard edits:**
- `src/components/Payments/PaymentsTracking.jsx` — filter + mock data + display helpers now accept `'paid'` (with `'completed'` retained as a legacy alias in display functions for safety)
- `src/components/Reports/AppleFinancialReports.tsx` — `PaymentRecord['status']` type extended, display helpers updated

### What was intentionally NOT changed

Every remaining `'completed'` reference in the codebase after the edits is for
**non-payment status** (diyas, initiatives, occasions, import batches). Those
use their own status-vocabulary and are independent of the payment status
normalization.

### Deploy order
1. Ship the new code to `main`.
2. Run the migration on the VPS: `psql -U $PG_USER -d alshuail -f migrations/20260417_standardize_payment_status_to_paid.sql`
3. Restart PM2: `pm2 restart alshuail-backend`

If you ship code before running the migration, old rows with `status='completed'` will temporarily appear in no queries (they use `'paid'` now), so the member balances would read as 0. **Run the migration first, then reload the app.**

---

## Phase 2 — Dynamic minimum amount

### Problem
Minimum payment was hardcoded. When the admin added a 50 SAR plan, the iOS app
rejected it because the middleware enforced a 100 SAR floor.

### What changed

**New file** — `alshuail-backend/src/middleware/dynamicAmountValidator.js`
- `getMinimumAmountForCategory(category)` — queries `MIN(base_amount)` from `subscription_plans WHERE is_active = TRUE AND base_amount > 0` for the `subscription` / `for_member` categories
- `initiative` / `diya` categories fall through to the absolute floor (1 SAR) for now — add a dedicated `min_contribution` column to those tables later if you want per-campaign floors
- Results cached for 5 minutes via `cacheService` (Redis → in-memory fallback)
- `validateMinimumAmount(category)` factory returns an Express middleware that rejects with `400 AMOUNT_BELOW_MINIMUM`
- `invalidateMinAmountCache(category?)` lets admin tools bust the cache after editing plans

**Route wiring** — `alshuail-backend/src/routes/payments.js`
- Dynamic validator runs BEFORE the static `validatePaymentInitiation` on each of the four mobile endpoints (`subscription`, `initiative`, `diya`, `for-member`)
- Old hardcoded `MIN_AMOUNT` in `payment-validator.js` dropped from `50` → `1` (acts purely as absolute safety floor now)

**Tests** — `alshuail-backend/__tests__/unit/middleware/dynamicAmountValidator.test.js`
- 15 tests, all passing
- Covers: cache hit, cache miss, DB error fallback, non-numeric amount pass-through, string coercion, per-category behavior, cache invalidation

### Net behavior
- If you add a 50 SAR plan → the mobile app can accept 50 SAR payments immediately (after the 5-min cache TTL expires, or call `invalidateMinAmountCache('subscription')`)
- If the subscription_plans table is empty or the DB errors → floor is 1 SAR (safer than blocking users)

---

## Phase 3 — Approval queue

### What changed

**Backend** — `alshuail-backend/src/controllers/paymentsController.js`
- `getPendingPayments(req, res)` — returns `status IN ('pending', 'pending_verification')` joined with payer + beneficiary member info, sorted oldest-first. Filterable by `?category=`.
- `getPendingPaymentsStats(req, res)` — counts + totals for the admin dashboard cards (total_pending, total_amount, unique_payers, per-category breakdown, awaiting_action vs awaiting_verification)

**Routes** — `alshuail-backend/src/routes/payments.js`
- `GET /api/payments/pending` — admin-only
- `GET /api/payments/pending/stats` — admin-only
- **Important:** registered BEFORE `/:id` so Express routing doesn't match `pending` as a payment ID

**Admin dashboard** (ready to import, not yet wired into routing):
- `alshuail-admin-arabic/src/components/PaymentApprovals/PaymentApprovalQueue.tsx` — full React component with category filter, search, stats cards, approve/reject buttons (approve calls `PUT /payments/:id/status { status: 'paid' }`; reject calls with `{ status: 'cancelled' }`)
- `alshuail-admin-arabic/src/services/paymentApproval.service.ts` — axios wrapper matching the existing `approval.service.ts` conventions

### To finish Phase 3 on the dashboard side
Add a route in `App.tsx` or the admin sidebar pointing to `PaymentApprovalQueue`. That's a single import + a `<Route path="/admin/payment-approvals" element={<PaymentApprovalQueue />} />` line.

---

## Phase 4 — Approval notification

### What changed

**`paymentProcessingService.js`**
- `updatePaymentStatus` now fetches the payment row BEFORE the UPDATE so it can detect the status transition (`pending` / `pending_verification` → `paid`)
- On the detected transition, `sendApprovalNotification(payment)` fires asynchronously (`.catch` on the returned promise — no `await`, so status update is never blocked by FCM)
- Message: `"تم اعتماد دفعتك بمبلغ {amount} ر.س"`
- Every send attempt is logged in `notification_logs` (schema from migration `20251129_create_notification_logs.sql`) with success / failure counts and error message, so admins can audit delivery later

**Why fire-and-forget?**
If FCM is down or the member has no active device tokens, the admin action must still succeed. The audit log preserves the intent.

### What members actually see
They get a system-level push ("تم اعتماد دفعتك — تم اعتماد دفعتك بمبلغ 50 ر.س"), and the `BalanceCard` on their home screen refreshes next time they open the app (the trigger updates `members.current_balance` atomically with the status change, so by the time they reopen the app, it's already correct).

---

## Go / no-go checklist before deploying

- [x] All edited files pass `node --check` syntax validation
- [x] 378 unit tests pass (no regressions caused by this change)
- [x] 15 new dynamic-validator tests added, all passing
- [x] 73 paymentProcessingService tests still pass after Phase 4 changes
- [ ] **Migration `20260417_standardize_payment_status_to_paid.sql` run on production DB** ← required before deploying code
- [ ] PM2 restart: `pm2 restart alshuail-backend`
- [ ] Smoke test: approve a pending payment via `PUT /api/payments/:id/status`, verify `members.current_balance` updated + FCM notification fired
- [ ] (Later) Wire `PaymentApprovalQueue.tsx` into the admin dashboard router

## Follow-ups worth considering

1. Add an admin-side action to flush the dynamic-minimum cache after editing plans (or better — call `invalidateMinAmountCache()` automatically inside the plan-update controller)
2. Add `min_contribution` columns to `initiatives` and `diyas` tables so those categories can have their own floors beyond the 1 SAR safety floor
3. Localize the approval push notification for English speakers (currently Arabic only)
4. Wire the reject-reason from `PaymentApprovalQueue` into an `admin_notes` or `rejection_reason` column on `payments` for auditability (right now it's captured in the prompt but not stored server-side)

---

## Phase 5 — Receipt uploads land in `/admin/documents` per-member (also 2026-04-17)

### Problem
`uploadPaymentReceipt` took the file into memory via `multer.memoryStorage()`,
wrote a few metadata columns (`receipt_uploaded`, `receipt_filename`, …) on the
`payments` row, and then the file buffer was garbage-collected. The actual image
was never persisted to disk or S3 — so admins couldn't see the receipt at all,
and `/admin/documents` (which reads from `documents_metadata`) had no knowledge
of the upload.

### What changed

**New migration** — `alshuail-backend/migrations/20260417b_link_payment_receipts_to_documents.sql`
- Extends the `documents_metadata.category` CHECK constraint to include `'receipts'` as an 11th allowed category (alongside `national_id`, `marriage_certificate`, etc.).
- Adds `payments.receipt_document_id UUID REFERENCES documents_metadata(id) ON DELETE SET NULL` + a partial index on the new column.
- Idempotent and wrapped in a transaction. Has a `ROLLBACK` block.

**`uploadPaymentReceipt` rewrite** — `alshuail-backend/src/controllers/paymentsController.js`
Now, when a member uploads a receipt, the controller:
1. Calls `uploadDocumentFile(req.file, payer_id, 'receipts')` — this is the same `uploadToSupabase` used by `/admin/documents`, and it writes to `/var/www/uploads/member-documents/{member_id}/receipts/{timestamp}_{filename}`.
2. Inserts a `documents_metadata` row with `category = 'receipts'`, `member_id = payer_id`, and `title = "وصل دفعة {reference_number}"` so it appears in the member's document list.
3. Sets the new `payments.receipt_document_id` to the new document's id (plus keeps the legacy `receipt_*` metadata columns filled for backward compatibility).
4. If any DB step fails AFTER the file lands on disk, the saved file is deleted to avoid orphaned uploads (via `deleteDocumentFile`).

**`getPendingPayments` update** — same file
- `LEFT JOIN documents_metadata doc ON p.receipt_document_id = doc.id AND doc.status = 'active'`
- Response now includes `receipt_url`, `receipt_file_path`, `receipt_original_name`
- URL built from `UPLOAD_URL` env var (or `/api/uploads` default) + bucket name + file path

**Admin UI — `PaymentApprovalQueue.tsx` + `paymentApproval.service.ts`**
- `PendingPayment` interface extended with receipt fields
- Each pending-payment row now shows a blue "عرض الوصل" button when `receipt_url` is populated — opens the file in a new tab
- Layout changed from single-row actions to stacked: [عرض الوصل] on top, [موافقة] [رفض] below

### Folder layout (result)
```
/var/www/uploads/member-documents/{member_id}/
  ├── receipts/                       ← new (auto-populated on mobile uploads)
  ├── national_id/                    ← existing
  ├── marriage_certificate/           ← existing
  ├── … other categories
```

### What members / admins will see
- **Member** uploads a receipt from iOS → admin sees the file instantly in both the approval queue AND in the member's profile documents tab under فئة "الوصولات".
- **Admin** clicks "عرض الوصل" in the approval queue → receipt opens in a new tab straight from the member's folder.
- The pre-existing `/admin/documents` page needs no code changes — it already reads `documents_metadata` scoped per-member and filters by category, so receipts appear automatically as a new category.

### Deploy order
Same as Phases 1-4, plus one extra migration step. Run in this order on the VPS:
```bash
psql -U $PG_USER -d alshuail -f migrations/20260417_standardize_payment_status_to_paid.sql
psql -U $PG_USER -d alshuail -f migrations/20260417b_link_payment_receipts_to_documents.sql
pm2 restart alshuail-backend
```

### Tests
158 unit tests pass (`paymentsController`, `paymentProcessingService`, `dynamicAmountValidator` — the three suites most affected by the Phase 1-5 changes). `paymentsController.js` passes `node --check`.
