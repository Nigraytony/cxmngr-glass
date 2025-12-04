# Stripe Billing Upgrade Plan

Scope: per-project subscriptions (basic/standard/premium), project billing page (transactions, plan changes, billing admin), coupons/discounts via admin, and reliability hardening.

## Goals
- Let project users manage subscription (upgrade/downgrade, cancel/resume, change billing admin, update payment method).
- Show transactions history per project with filters/exports.
- Enable admins to issue coupons/credits/discounts and monitor billing health.
- Harden Stripe integration (webhooks, replay, backfill, trials, proration, RBAC).

## Assumptions
- Stripe products/prices exist for the three tiers; environment vars for live/test are available.
- Billing is per project, paid by a “billing admin” (project member/user).
- Proration should be on by default; downgrades can schedule for period end.

## Backend Tasks
- Data model
  - Add `billingAdminUserId` on Project; persist `stripeDefaultPaymentMethod` summary (brand/last4/exp_month/exp_year) and `cancelAtPeriodEnd`/`canceledAt`.
  - Ensure User has `stripeCustomerId`; capture who set billing admin + timestamps in an audit log.
- Plan config
  - Expand `backend-api/config/plans.js` with metadata (product ids, feature flags, currency, interval).
  - Add coupon/promo settings defaults (allow promotion codes, trial defaults).
- Billing summary endpoint
  - New `GET /api/stripe/project/:id/summary` returning project billing state (plan, status, next bill date, trial window, payment method summary, proration preview for selected price, outstanding invoices, dunning state).
- Subscription management endpoints
  - Change plan with proration preview + confirm; support immediate change or schedule at period end.
  - Cancel at period end, undo cancel, resume.
  - Change billing admin: transfer customer to another user (create customer if needed), update subscription’s `customer` and metadata, record audit.
  - Update default payment method on the customer (using setup intent flow).
- Transactions & history
  - Extend invoice/charge listing to support filters (status/date), pagination, and CSV export; include discounts/coupons applied.
  - Add fallback fetch from Stripe when DB misses items; cache results.
- Coupons/discounts (admin)
  - Admin endpoints to create/list promotion codes/coupons (scoped to product/price/customer), set expiration/max redemptions, and create one-time customer credits.
  - Admin audit entries for coupon issuance and credit grants.
- Webhooks & reliability
  - Ensure idempotency, log failures, and enrich saved webhook events with subscription/customer references.
  - Handle subscription lifecycle events (created/updated/deleted, trial ending, invoice payment succeeded/failed) updating Project billing fields and dunning flags.
  - Add webhook replay/backfill helpers for invoices/charges and subscription metadata.
- Tests
  - Integration tests with Stripe stubs for plan change, cancel/resume, coupon application, and webhook replay.
  - Seed fixtures for plans and promotion codes in tests.

## Frontend Tasks
- Project Billing page/tab
  - Surface billing summary: plan, status, renewal date, trial end/countdown, cancel-at-period-end flag, payment method card summary.
  - Plan selector with proration preview, upgrade/downgrade flows, confirm modals; show scheduled changes.
  - Actions: update payment method, cancel/resume, change billing admin (pick team member or invite), open Stripe portal fallback.
  - Transactions table: paginated invoices/charges with status/date filters, invoice links, amount/discount display, CSV export.
  - Dunning UX: highlight failed payments/past_due, show retry guidance.
- Admin Billing tools
  - UI to issue coupons/promotion codes, set limits/expiry, scope to price/product/customer/project.
  - UI to grant one-time credits and view coupon usage.
- Auth/RBAC
  - Only billing admin + project admins can change plans/payment method; view-only for others.
  - Admin-only for coupon/credit issuance.

## Ops & Config
- Configure STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (test/live), APP_URL/FRONTEND_URL, price IDs per env.
- Document required Stripe resources (products/prices, webhook endpoint, billing portal, promotion codes).
- Set monitoring for webhook age/failures and Stripe API error rates.

## Migration Steps
- Backfill User.stripeCustomerId where missing (create customers).
- Backfill Project.billingAdminUserId (default to project owner/admin) and attach metadata to existing subscriptions.
- Backfill invoices/charges for active subscriptions using `scripts/backfill_invoices.js`; verify projectId mapping.
- Validate trial windows on existing projects (prevent re-granting trials).

### Migration/backfill checklist (operational)
- Confirm Stripe webhook endpoint is configured for the deployed backend URL and using the configured `STRIPE_WEBHOOK_SECRET`.
- For each active project subscription, set `billingAdminUserId` to a project admin and persist `projectId` + `userId` metadata on the Stripe subscription.
- Create Stripe customers for users missing `stripeCustomerId`; attach to subscriptions where the customer is null/mismatched.
- Run invoice/charge backfill scripts, then spot-check invoice.projectId mappings and hosted invoice URLs.
- For subscriptions with cancel-at-period-end set in Stripe, ensure `stripeCancelAtPeriodEnd`/`stripeCanceledAt` are reflected on Project.
- Smoke-test webhook replay flow (`/api/admin/webhook-events/:eventId/replay`) on a recent invoice event.

## Milestones
1) Backend foundations: schema updates, summary endpoint, hardened webhooks.  
2) Subscription management APIs: plan change, cancel/resume, billing admin transfer, payment method update.  
3) Project Billing UI: summary, plan changes, transactions, dunning.  
4) Admin coupons/credits UI + endpoints.  
5) Migration/backfill + test hardening + monitoring hooks.

## Progress log
- Added Project fields for billing admin, payment method snapshot, cancellation timestamps, and indexes.
- Added billing summary endpoint (`GET /api/stripe/project/:id/summary`) with access control (billing admin, project admin, or global/super admin) and Stripe enrichment of payment method/cancel flags.
- Added billing management endpoints: plan preview/change (`POST /api/stripe/project/:id/plan/preview`, `/change-plan`), cancel/resume (`/cancel`, `/resume`), billing admin transfer (`/billing-admin`), and payment method flows (`/setup-intent`, `/payment-method`) gated by billing/admin RBAC.
- Added dunning fields on Project (past due flag, last payment/invoice status), surfaced via billing summary, and set/cleared in webhook handling for invoice payment succeeded/failed.
- Wired Project Billing UI to new endpoints and added Stripe Elements card capture (setup intent + confirm) with fallback manual PM ID entry.
- Added payment method management endpoints: list (`GET /api/stripe/project/:id/payment-methods`) and detach (`DELETE /api/stripe/project/:id/payment-methods/:pmId`) scoped to billing/admin RBAC.
- Billing UI now consumes payment-method list/detach/default actions with a saved-cards list, default toggle, detach, and refresh controls.
- Added a BillingCardForm unit test with mocked Stripe to cover card save/cancel flows.
- Added admin billing endpoints: list promotion codes (`GET /api/admin/billing/promotion-codes`), create promotion codes/coupons (`POST /api/admin/billing/promotion-codes`), and issue credits (`POST /api/admin/billing/credits`), with audit logging hooks.
- Added promotion application support: Checkout accepts promotionCode, and subscriptions can apply codes via `POST /api/stripe/project/:id/promotion`. Billing UI includes a promo code field/button.
