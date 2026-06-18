# Launch Readiness Audit — cxmngr-glass

**Date:** 2026-05-27
**Audience:** Engineering leadership / founder
**Scope:** Security, Reliability & Data Integrity, Operational Readiness, UX & Onboarding
**Method:** 4 parallel automated investigations across `/home/ngray/Code/cxmngr-glass`; findings collected from static analysis of routes, models, frontend pages, config, and CI/CD. `npm audit` and `npm run test:integration` were not executed in the audit sandbox — re-run locally to verify dep findings.

---

## Verdict

> **Do not launch in current state.** The product is feature-complete and the codebase is above-average for a pre-launch SaaS, but there are **3 security blockers that are launch-stoppers** (one is a cross-tenant invitation hijack), **6 reliability blockers** where silent data corruption is possible, and **5 UX blockers** that would visibly break or embarrass at a customer demo. Recommended path: **1–2 week hardening sprint** focused on the top 10 cross-cutting blockers below, then re-audit before opening to marketing.

**Totals across all 4 audits:**

| Severity      | Count |
|---------------|-------|
| BLOCKER       | 20    |
| SHOULD-FIX    | 45    |
| NICE-TO-HAVE  | 28    |

---

## Top 10 cross-cutting blockers (do first)

Ranked by launch-day risk × likelihood:

| # | Area        | Issue | File:line | Why it matters at launch |
|---|-------------|-------|-----------|--------------------------|
| 1 | Security    | **Invitation hijack** — `/accept-invite` doesn't check `invite.email === req.user.email`; any authenticated user with a leaked token joins the project | `backend-api/routes/projects.js:1139-1278` | One leaked URL = full cross-tenant breach. The sibling route `/invitations/:id/accept` already does this check; copy it. |
| 2 | Reliability | **Project delete leaves every child collection orphaned** (activities, issues, tasks, equipment, spaces, systems, templates, invitations, final reports, OPR*, docs) | `backend-api/routes/projects.js:1747` | Silent and irrecoverable. Customer deletes a "test" project → ghost records pollute reports and queries forever. |
| 3 | Security    | **Password reset doesn't revoke other sessions or access tokens** (unlike `/change-password` which does) | `backend-api/routes/users.js:686-694` | Defeats the entire purpose of password reset; attacker retains access for full 30-day refresh window. |
| 4 | UX          | **Login fails silently** — `submit()` ignores `authStore.error`; bad password → spinner stops, no toast, no message | `src/pages/auth/Login.vue:119-141` | Trivially reproducible at every demo. Looks broken. |
| 5 | UX          | **Brand-new users see blank Dashboard + blank Projects list with no CTA** | `src/pages/dashboard/DashboardHome.vue`, `src/pages/projects/ProjectsList.vue:62-397` | The marketing campaign drives signups; the first thing they see is "0 / 0 / 0" with no instructions. |
| 6 | Reliability | **Schema drift: routes filter on `Issue.priority`, `Issue.responsible_person`, `Equipment.name` that the schemas never declare** → Mongoose strict mode silently drops on write; filters return zero results | `backend-api/routes/issues.js:267-484`, `backend-api/utils/agentTools.js:840-893` | Same class as the Final Report milestones bug we just fixed. Looks like data is missing. |
| 7 | Operational | **No error tracking SDK** (Sentry, Datadog, App Insights — none) | repo-wide | When something breaks in prod, the only signal is a customer email. |
| 8 | Operational | **No SIGTERM / graceful shutdown** — Azure restarts (deploys, autoscale) sever in-flight Stripe webhooks, Mongo writes, PDF renders | `backend-api/index.js:296` | First production incident waiting to happen. |
| 9 | Operational | **No startup env validation** — `MONGODB_URI`, `JWT_SECRET`, `STRIPE_WEBHOOK_SECRET`, `AI_ENCRYPTION_KEY`, `MAIL_FROM` all `console.warn` and continue; `MONGODB_URI` falls back to **localhost** | `backend-api/index.js:53-56`, `routes/users.js:2-7`, `utils/mailer.js:39` | Misconfigured deploy boots happily, then fails per-request in unpredictable ways. |
| 10 | UX         | **~132 toasts leak raw exception messages** via `ui.showError(e?.response?.data?.error || e?.message || 'Failed to X')` — exact same class as the `"require is not defined"` toast we just fixed | `src/pages/activities/`, `src/pages/equipment/`, `src/pages/issues/`, `src/pages/opr/*`, `src/components/photos/AzurePhotosPanel.vue`, etc. | Continuous source of "leaks dev jargon to customers" surprises. |

---

## Security findings (3 BLOCKER · 14 SHOULD-FIX · 7 NICE-TO-HAVE)

### BLOCKER
- **B-S1**: Invitation hijack — see top-10 #1 above.
- **B-S2**: Password reset doesn't revoke sessions — see top-10 #3.
- **B-S3**: `tokenVersion` JWT-revocation hook is signed into every token (`models/user.js:59`, `routes/users.js:224,267,379`, `middleware/auth.js:25-31`) but **never incremented anywhere** in code. "Logout everywhere" is wired but inert. Combine with B-S2 = 15-minute residual API access after password change.

### SHOULD-FIX (selected highlights)
- **CSRF middleware silently re-seeds on mismatch** — real protection collapses to "custom header presence," i.e. relies entirely on CORS allowlist. (`backend-api/middleware/csrf.js:74-76`)
- **Login rate-limit is per-IP only**, not per-account → IP rotation enables single-account brute force. (`backend-api/routes/users.js:22`)
- **bcrypt cost factor 8** — 2026 baseline is 12.
- **Invitations never expire** (`models/invitation.js`) — even after B-S1 fix, eternal tokens are poor hygiene. Add 14-day TTL.
- **forgot-password is per-IP only**, not per-target-email → email bomb / enumeration vector.
- **Both `bcrypt` and `bcryptjs` installed**; the slower JS one is what's actually used. Pick one.
- **No HSTS on API responses** (front-end has it via SWA config); no CSP anywhere.
- **Vulnerable deps actually reachable:** `xlsx@0.18.5` (prototype-pollution, no upstream fix — migrate to `exceljs`); `multer@1.4.5-lts.1` (DoS via malformed multipart — upgrade to 2.x); `puppeteer@21.4.1` (bundled Chromium CVEs); `moment@2.29.4` (ReDoS, deprecated, **not actually imported anywhere** per the UX audit — drop the dep).
- **Refresh token rotation disabled by design** for multi-tab reasons — valid trade-off, but means a stolen refresh cookie is usable for the full 30 days.
- **AI agent has no per-tenant spending cap** — premium tenants on server-fallback API key can burn unbounded $ over time. (`backend-api/routes/agent.js:534,562`)
- **`requireProjectMember` references `mongoose.Types.ObjectId` but mongoose is only `require`d late in the file** (`routes/projects.js:120` declared, mongoose required at `:806`). Currently masked by `router.param('id')`; brittle.
- **`/api/users/update/:_id` uses a denylist** (blocks `role`, `stripeCustomerId`) rather than an allowlist — brittle as fields are added.

### NICE-TO-HAVE
- No structured audit trail for security-relevant events (password change, role grant, invite create/accept). `AdminAudit` exists but only used in `/api/admin`.
- `/api/stripe/ping` is unauthenticated and unlimited.
- `Permissions-Policy` omits common sinks (`payment`, `usb`, `interest-cohort`).

---

## Reliability & Data Integrity (6 BLOCKER · 11 SHOULD-FIX · 7 NICE-TO-HAVE)

### BLOCKER
- **B-R1**: Project delete orphans every child collection — see top-10 #2.
- **B-R2**: Schema drift on Issue/Equipment routes — see top-10 #6.
- **B-R3**: **Cascade deletes missing for Space, Equipment, Template, System** — stale refs left in `Equipment.spaceId`, `Activity.spaceId`, `Issue.spaceId/systemId/assetId`, `Equipment.template`, `Project.equipment/spaces/templates[]`. Exact pattern that fix #24 already had to address project-wide. (`routes/spaces.js:538`, `routes/equipment.js:1738`, `routes/templates.js:712`, `routes/systems.js:443`)
- **B-R4**: **Issue model stores dates as strings**, Activity stores as Date — silent date-comparison breakage if non-ISO data sneaks in (the AI agent slices to 30 chars but doesn't validate format). (`models/issue.js:12-41`)
- **B-R5**: **No optimistic locking** on any of Activity/Issue/Equipment/Task updates — two-tab users last-write-wins their own edits silently. No `__v` check, no `If-Match`.
- **B-R6**: **Issue-number counter increments before save** — failed save leaves `Project.lastIssueNumber` permanently advanced → numbering gaps. (`routes/issues.js:206-224`)

### SHOULD-FIX (selected)
- **Webhook idempotency** only skips when `status === 'processed'`; concurrent Stripe retries can both execute during processing window. (`routes/webhooks.js:78`)
- **OpenAI/Anthropic agent loop swallows tool-arg JSON parse errors** → loop until iteration cap with no signal. (`routes/agent.js:373`)
- **Agent doesn't surface `max_tokens` stop reason or iteration-cap exit** — user gets 200 OK with truncated/unfinished work (inverse of fix #22).
- **Mongoose duplicate-index warnings** at startup come from `models/assistantChatMessage.js:9,22,28`, `models/docFile.js:5-19,28`, `models/docFolder.js` — `projectId` declared as `index:true` AND as part of a compound. Trivial fix.
- **`Project.status` field declared twice** (`models/project.js:13` loose String, `:83` enum) — second wins, first dead. Schema-drift smell.
- **Create routes spread `req.body` directly into Mongoose constructors** (`routes/issues.js:221`, `routes/equipment.js:372`) — client can set `_id`, `createdAt`, `logs[]`, `comments[]`, etc.
- **`activity.systems` typed as `[String]`** but treated like ObjectId refs by agent/UI — rename-a-System leaves dead strings. (`models/activity.js:66`)
- **Final Report auto-PDF failure** is swallowed; report marked `final` with `pdfBlobUrl: null` forever, no retry. (`routes/finalReports.js:367-381`)
- **`runClaudeLoop` keeps entire conversation in memory across iterations** including base64-PDF attachments → token spend + 502 risk multiplied per turn. (`routes/agent.js:234-316`)

### NICE-TO-HAVE
- **Test gaps:** zero tests for the AI agent, billing checkout (only webhook replay), file upload, password reset, Cx Plan flow, RBAC edges, PDF gen. 14 test files total — the highest-risk surfaces are unguarded.
- `moment` and `dayjs` both in `package.json` but neither is actually imported under `src/` — pure dead deps.
- `activities-by-phase` hard-codes a type→phase map; newly added types (like the `Cx Plan` type added in #28) default to `'construction'` — silently misclassified.

---

## Operational Readiness (6 BLOCKER · 9 SHOULD-FIX · 7 NICE-TO-HAVE)

### BLOCKER
- **B-O1**: No error tracking — see top-10 #7.
- **B-O2**: No SIGTERM / graceful shutdown — see top-10 #8.
- **B-O3**: No startup env validation — see top-10 #9.
- **B-O4**: **No DB backup, blob backup, or DR plan documented.** Only reference is an unchecked checklist item. (`CXMA_IMPLEMENTATION_CHECKLIST.md:179`)
- **B-O5**: **Stripe webhook endpoint has no rate limit** and signature-failed requests still hit DB via `markEventStatus` — a tiny burst floods Mongo. (`routes/webhooks.js:42`)
- **B-O6**: **`MAIL_FROM` defaults to `no-reply@example.com`** — if env is missing in prod, SendGrid rejects (unverified sender) and password resets/invites silently fail; failure log goes to local disk that disappears on App Service restart. (`utils/mailer.js:39,53,165-176`)

### SHOULD-FIX
- **No /readyz**, only `/api/health` which checks Mongoose state only — degraded instances stay in rotation. (`backend-api/index.js:214`)
- **No log shipping / retention** beyond Azure App Service's default stdout capture.
- **No background-job / cron infrastructure** — `passwordReset` tokens, soft-deleted projects, expired invitations, `webhookEvent` retention (env var declared but never read) — nothing reaps any of them.
- **Node engines: package.json says `>=18`** but new transitive deps (`jsdom@27`, `lru-cache@11`) require `>=20`. CI uses 20; verify production App Service does too.
- **JWT secret rotation has no grace period** (`utils/jwt.js:7,17`) — rotating invalidates every outstanding token instantly. `tokenVersion` exists for per-user but not key-rollover.
- **`/uploads` served from App Service local disk** (`index.js:207`) — ephemeral on restart/scale. If any code path still writes locally instead of Blob, those files vanish.
- **CORS prod-allowlist isn't authoritative** (`index.js:73-99`) — fail-open if `CORS_ALLOWED_ORIGINS` unset.
- **`forgot-password` failures swallowed**, returns 200 — SendGrid outage = silent password-reset blackhole. (`routes/users.js:660-666`)
- **No bundle splitting / performance budget** in `vite.config.js` — easily 3-5 MB main chunk given echarts/ag-grid/xlsx/pdf-lib/jspdf/tiptap/frappe-gantt.

### NICE-TO-HAVE
- Rate limiter is in-memory only — multi-instance scale-out multiplies the per-IP limit by replica count.
- **CI's unit tests are disabled** (`.github/workflows/ci.yml:40` has `if: false`); only backend integration tests gate deploys.
- Entra ID referenced in `.env.example:69-75` but **zero code uses any `ENTRA_*` var** — dead docs.
- `WEBHOOK_RETENTION_DAYS` env declared, never read.
- No `RUNBOOK.md` / `ONCALL.md` / ops docs.
- `backend-api/.env.backup-livecluster` (created during this session's DB clone) — verify `.gitignore` covers `.env*` patterns.

---

## UX, Onboarding, Marketing Surfaces (5 BLOCKER · 11 SHOULD-FIX · 7 NICE-TO-HAVE)

### BLOCKER
- **B-U1**: Login fails silently — see top-10 #4.
- **B-U2**: Dashboard has no first-run state — see top-10 #5.
- **B-U3**: Projects list is also blank for new users — see top-10 #5.
- **B-U4**: ~132 toasts leak raw exception messages — see top-10 #10.
- **B-U5**: **Sidebar is broken on mobile** — `fixed md:sticky` with no `hidden` state, no backdrop, no swipe-to-close; eats 16–64px of a 360px phone screen. Critical because the brief is engineers-on-tablets. (`src/components/Sidebar.vue:8-13`)

### SHOULD-FIX
- **`Register.vue` shows no password rules**; the Reset page enforces `minlength="8"` but Register doesn't (`src/pages/auth/Register.vue:71-80`).
- **404 silently redirects to `/`** — broken/stale links land users on marketing home with no "not found" explanation. (`src/router/index.js:98`)
- **Dashboard cards say "Loading…" forever if the API 500s** — no error state, no retry. (`DashboardHome.vue:38-84`, same in `ProjectsList.vue:402`)
- **5 native `confirm()` dialogs** remain (`SystemEdit.vue:2053`, `Roles.vue:162`, `TaskTemplateEdit.vue:870,895`, `ProjectEdit.vue:2825,3266`, `FinalReport.vue:569`, `AssistantArticles.vue:441`) — looks unprofessional vs. the glass `InlineConfirm` used elsewhere.
- **2 native `alert()` calls** in `TasksList.vue:3761,3962`.
- **`BillingReturn.vue` doesn't match the app's glass UI** — jarring landing after Stripe redirect.
- **Sidebar uses emoji icons** (`🏠 👷‍♀️ 🗳️…`) — inconsistent across OSes; looks unfinished next to the SVG Tasks icon.
- **Color contrast risk** on glass UI — pervasive `text-white/50…70` on `bg-white/5..10` — sub-WCAG-AA on sunlit tablets (critical for on-site).
- **No in-app help, KB link, or support contact** — no `?` icon anywhere; coachmarks exist but used in only 3 pages.
- **Date formatting is inconsistent** — 14+ inline `formatDate` definitions across pages produce different strings.
- **Empty states inconsistent** — most lists have a message but none link to a "Create your first X" action; `IssuesList.vue` has no empty state at all.

### NICE-TO-HAVE
- **8 stray `console.log` / `console.debug` in production code**, including ones that log Stripe `priceId` + URLs to the browser console: `WebhookEvents.vue:310`, `ProjectEdit.vue:4558,4587`, `ActivityEdit.vue:3297-3303`, `EquipmentEdit.vue:3653`, `TasksList.vue:3579`.
- **No dirty-state warning** on most long-form editors (only FinalReport has `beforeunload`).
- **HomePage hero copy is weak** — "A Cx-process management app" reads like internal description, not customer value prop. (`HomePage.vue:34`)
- Forgot-password link is present but visually de-emphasized.

---

## Suggested phasing

### Pre-launch (must-do, ~1–2 weeks)
1. Fix all 3 security blockers (B-S1, B-S2, B-S3) — high-leverage, mostly contained to 2–3 files.
2. Fix project-delete cascade + the 4 other missing cascades (B-R1, B-R3). Either soft-delete uniformly or one transactional cascade.
3. Wire up an error-tracking SDK (Sentry is 5 lines) — without this you'll fly blind through launch (B-O1).
4. Add SIGTERM handler + `/readyz` — protects against Azure restart data loss (B-O2).
5. Add startup env validation that throws on missing required vars in `NODE_ENV=production` (B-O3).
6. Fix the schema drift bugs (B-R2) — these directly cause "looks broken" symptoms.
7. Fix login silent-fail + dashboard/projects empty states (B-U1, B-U2, B-U3) — first impressions matter.
8. Centralize `ui.showError(err, fallback)` with regex-strip of dev jargon (B-U4) — kills a recurring class of leak.
9. Fix mobile sidebar (B-U5) — engineers-on-tablets is your stated use case.

### Week 1 post-launch (SHOULD-FIX rollups)
- Vulnerable dep upgrades (xlsx → exceljs, multer 2.x, puppeteer current).
- CSRF middleware: reject on mismatch instead of re-seed.
- Per-account login rate-limit + per-email forgot-password throttle.
- Cron / background-job runner for token + retention cleanup.
- 404 page, dirty-state warnings, swap native confirm/alert for glass dialogs.
- Centralize date formatting; drop unused `moment` and `dayjs`.

### Pre-scale (beyond first 100 customers)
- Per-tenant AI spending caps.
- Redis-backed rate limiter (currently in-memory; multi-replica breaks the limit math).
- Refresh-token rotation with reuse-after-grace family detection.
- Test coverage for AI agent, billing, file upload, password reset, RBAC edges.
- HSTS on API; full CSP everywhere.
- Bundle splitting; performance budget.

---

## Confidence & caveats

- Findings come from static reads of code and config; nothing was executed end-to-end against a live system.
- `npm audit` was sandbox-blocked; the dep-vuln findings draw from package versions + known CVE patterns, not from a fresh audit run. Confirm locally with `npm audit --omit=dev` in both `package.json`s.
- Integration tests were not executed by the audit; the 16-passing run earlier in this session covered only `final_report.test.js`.
- The AI agent (`backend-api/routes/agent.js`) is a high-risk surface that deserves a focused review on its own; the audit flagged structural issues but didn't replay tool-call sequences against a live LLM.
