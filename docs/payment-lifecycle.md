# Payment Lifecycle — Member Pays Until Balance Reflects

**Scope:** End-to-end trace of a subscription payment submitted from the iOS/mobile app, through backend processing, admin approval, database trigger, and back to the member's visible balance.

**Date verified:** April 17, 2026 against `main` branch.

---

## High-level flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 1. Member    │ -> │ 2. Backend   │ -> │ 3. Receipt   │ -> │ 4. Admin     │ -> │ 5. Balance   │
│    submits   │    │    inserts   │    │    upload    │    │    approves  │    │    updated   │
│    payment   │    │    (pending) │    │    (optional)│    │    (status)  │    │    (trigger) │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                                        │
                                                                                        v
                                                                                ┌──────────────┐
                                                                                │ 6. Member    │
                                                                                │    fetches   │
                                                                                │    balance   │
                                                                                └──────────────┘
```

---

## Step 1 — Member submits payment from iOS

**Who:** A member using the iOS app (or the mobile PWA).
**Action:** Taps "إرسال الدفعة" on the confirmation screen of the payment flow.
**HTTP call:** `POST /api/payments/mobile/subscription`
**Body:** `{ amount, notes, planId, memberId }`
**iOS code:** `AlShuailFund/Features/PaymentFlowView.swift`, `submitPayment()` around line 652.
**Route definition:** `alshuail-backend/src/routes/payments.js:117`

The route is guarded by:

1. `requireRole(['member'])` — only authenticated members can hit it.
2. `validatePaymentInitiation` — checks amount is a number, > 0, between `MIN_AMOUNT` (now 50 SAR) and `MAX_AMOUNT` (50,000 SAR), and enforces daily rate limits (max 10 payments / 100,000 SAR per member per day).

If any check fails the member sees a red error message on the confirm screen (this is the same mechanism that was showing "الحد الأدنى للمبلغ هو 100 ريال سعودي" before the fix).

---

## Step 2 — Backend writes the payment row (status = pending)

**Controller:** `paySubscription` in `alshuail-backend/src/controllers/paymentsController.js:799`.

The controller inserts a row into the `payments` table with:

| Column | Value |
|---|---|
| `payer_id` | the authenticated member's id |
| `beneficiary_id` | same as `payer_id` when paying for self; otherwise the target member |
| `amount` | what the member entered |
| `category` | `'subscription'` |
| `payment_method` | `'app_payment'` |
| `status` | `'pending'` |
| `reference_number` | auto-generated (format: `SAF-YYYYMMDD-HHMMSS-XXXX`) |
| `hijri_*` fields | populated from the Hijri converter utility |

**Important:** At this moment `members.current_balance` is NOT yet updated. The DB trigger only fires on `status = 'completed'` (see Step 5 caveat).

**Response to iOS:** `201 Created` with the new payment object including `id` and `reference_number`.

---

## Step 3 — Receipt upload (optional)

**HTTP call:** `POST /api/payments/mobile/upload-receipt/:paymentId`
**Controller:** `uploadPaymentReceipt` in `alshuail-backend/src/controllers/paymentsController.js:945`.

On the iOS side this is Step 3 of 5 ("الوصل") — the user can either attach a transfer screenshot or skip.

When a receipt is uploaded:

- The file is stored (filename, size, MIME type go in the payment row's receipt metadata).
- The payment status transitions from `'pending'` to `'pending_verification'`.
- The balance is still NOT updated.

Uploads are guarded by `validateBankTransfer` middleware which checks the image MIME type.

---

## Step 4 — Admin approves the payment

This is a manual step done by an admin (`super_admin` or `financial_manager`).

**HTTP call:** `PUT /api/payments/:id/status`
**Route:** `alshuail-backend/src/routes/payments.js:72`
**Controller:** `updatePaymentStatus` → calls `PaymentProcessingService.updatePaymentStatus` in `alshuail-backend/src/services/paymentProcessingService.js:182`.

Allowed target statuses: `['pending', 'paid', 'cancelled', 'failed', 'refunded']`.

The admin typically picks `'paid'`. The service runs:

```sql
UPDATE payments
   SET status = 'paid', payment_method = $1, processed_at = $2, updated_at = $2
 WHERE id = $3
```

(paymentProcessingService.js line 136)

**Note:** There is no separate `approvals` table row for payments. The `/api/approvals` routes in this codebase handle **member registration approvals only**, not payments. Payment "approval" is just a status column update on the `payments` row itself.

---

## Step 5 — Balance updates via database trigger

**Trigger:** `trg_update_member_balance` on the `payments` table.
**Function:** `update_member_balance()` defined in `alshuail-backend/migrations/20250123_add_member_balance_system.sql:22-84`.

On any INSERT, UPDATE, or DELETE of a payment row, the trigger re-computes:

```sql
UPDATE members
   SET current_balance = COALESCE(
         (SELECT SUM(amount) FROM payments
           WHERE payer_id = NEW.payer_id AND status = 'completed'),
         0),
       updated_at = NOW()
 WHERE id = NEW.payer_id;
```

So after the update the member's `current_balance` equals the sum of every `'completed'` payment they've ever made.

### ⚠️ Caveat — status-name mismatch (potential bug)

The trigger fires only when `status = 'completed'`, but `PaymentProcessingService.updatePaymentStatus` sets the status to `'paid'`. Different parts of the backend use different spellings:

| Status value | Used in |
|---|---|
| `'completed'` | `membersController.js:791`, `memberStatementController.js:48/124/195`, `fundBalanceController.js:137`, `crisisController.js:25/100`, the balance trigger, and the initial member-balance seed |
| `'paid'` | `paymentProcessingService.js:136`, `financialAnalyticsService.js:151/193/309`, `databaseOptimizationService.js:115/137/139/157-161` |

This means: **if an admin marks a payment as `'paid'`, the `current_balance` trigger does NOT fire** and the member's stored balance is out of sync with the payment. This is consistent with what we observed earlier this week — some members (e.g. phone 96551447806) have `current_balance = 3000` with zero rows in `payments`, suggesting balances are being managed out-of-band (likely through `balance-adjustments`, manual SQL, or legacy imports).

**What to fix:** Pick one canonical "done" status — either `'paid'` or `'completed'` — and make the trigger, the service, the analytics queries, and the statement/balance fetchers all use it. Add a migration to normalise existing rows. I can draft this as a separate task if you want to tackle it.

---

## Step 6 — Member sees the updated balance

**HTTP call:** `GET /api/members/mobile/balance` (iOS home screen / subscription screen).
**Controller:** `membersController.js:783`.

Two possible sources for what the member sees:

1. **`members.current_balance`** — the column maintained by the trigger. Fast, but stale if the trigger didn't fire (see caveat above).
2. **Re-computed from `payments`** — some endpoints query `SELECT SUM(amount) FROM payments WHERE payer_id = ? AND status = 'completed'` directly.

The iOS `BalanceCard` logic we hardened previously reads the `members.current_balance` as the source of truth, with a fallback to the computed sum if the column is null or stale.

**No FCM / WhatsApp push notification is sent on payment status change** — we confirmed there's no notification-insertion or `firebaseService.send*` call in `paymentsController.js` or `paymentProcessingService.js`. If you want the member to be notified when an admin approves their payment, that's a feature to add.

---

## Mobile vs. admin-initiated comparison

| Aspect | Mobile subscription | Admin-created payment |
|---|---|---|
| Endpoint | `POST /api/payments/mobile/subscription` | `POST /api/payments` |
| Auth | `requireRole(['member'])` | `requireRole(['super_admin', 'financial_manager'])` |
| Initial status | `'pending'` | controlled by admin |
| Balance update | on admin approval → trigger → `current_balance` | same trigger |
| Approval queue | none (inline status update) | none (inline status update) |

Both flows converge on the same trigger in Step 5.

---

## Key files

- `alshuail-backend/src/routes/payments.js:117` — mobile subscription route
- `alshuail-backend/src/controllers/paymentsController.js:799` — `paySubscription`
- `alshuail-backend/src/controllers/paymentsController.js:945` — `uploadPaymentReceipt`
- `alshuail-backend/src/services/paymentProcessingService.js:182` — status update
- `alshuail-backend/src/middleware/payment-validator.js` — amount and rate limits
- `alshuail-backend/migrations/20250123_add_member_balance_system.sql` — balance trigger
- `alshuail-backend/src/controllers/membersController.js:783` — balance fetch for mobile
- `AlShuailFund/Features/PaymentFlowView.swift:652` — iOS `submitPayment`

---

## Recommended follow-ups

1. **Fix the status-name mismatch** between `'paid'` and `'completed'` — single source of truth.
2. **Add a push notification** ("تم اعتماد دفعتك") when admin approves, to close the loop for the member.
3. **Add an approval queue** for subscription payments (currently admins must find the pending payment manually).
4. **Make `MIN_AMOUNT` dynamic** instead of hardcoded 50 — tie it to the smallest active plan so the floor auto-adjusts as plans change.
