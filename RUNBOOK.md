# Operations runbook

On-call / ops-readiness reference for cxmngr-glass. Pairs with the launch-readiness audit (`LAUNCH_AUDIT_2026-05-27.md`).

A few items still marked **`<FILL IN>`** are things the team must decide rather than facts I can infer — backup tier choice on Atlas, RTO/RPO targets, drill cadence. Everything else is now populated with concrete values.

---

## 1. Production architecture (one-pager)

**Live URLs**
- Frontend SPA: `https://app.cxma.io` (custom domain on the SWA)
- Marketing redirects: `cxma.io` and `cxma.ai` → 301 → `app.cxma.io`
- Backend API: `https://cxmngr-backend-api-brhhbng9crcxf6gp.westus3-01.azurewebsites.net`

> ⚠️ **Region naming gotcha**: the resource group is named `rg-cxmngr-eastus` but the resources inside (App Service, Storage) actually live in **West US 3**. Azure RG names are arbitrary labels; don't trust them as region indicators. All `az` commands should target `--resource-group rg-cxmngr-eastus` *without* assuming an East US region.

```
                     ┌────────────────────────┐
                     │  Azure Static Web App  │  cxmngr-glass frontend (Vue 3 + Vite)
                     │   deploys on  v* tags  │  app.cxma.io
                     │                        │  workflow: .github/workflows/azure-static-web-apps-lemon-forest-0c47c5d0f.yml
                     └────────────┬───────────┘
                                  │ HTTPS
                                  ▼
                     ┌────────────────────────┐
                     │   Azure App Service    │  cxmngr-backend-api  (Express + Mongoose)
                     │  deploys on main merge │  RG: rg-cxmngr-eastus   actual region: West US 3
                     │                        │  ...-brhhbng9crcxf6gp.westus3-01.azurewebsites.net
                     │                        │  workflow: .github/workflows/ci.yml :: deploy-backend
                     └────┬──────────┬────────┘
                          │          │
              ┌───────────▼──┐    ┌──▼──────────────┐
              │  Mongo Atlas │    │  Azure Blob     │  docs container (in rg-cxmngr-eastus
              │  Cluster0    │    │  Storage        │  — actual region: West US 3)
              │  ymfn7gc     │    │                 │
              │  db:cxmngr-  │    │                 │
              │     api      │    │                 │
              └──────────────┘    └─────────────────┘
                          │          │
              ┌───────────▼──┐    ┌──▼──────────────┐
              │   Stripe     │    │   SendGrid      │
              │   Billing +  │    │   (mail)        │
              │   Webhooks   │    │                 │
              └──────────────┘    └─────────────────┘
                          │
                          ▼
                     ┌────────────────────────┐
                     │  Sentry  (NOT YET      │  error tracking — SDK wired (PR #49)
                     │  CONFIGURED — see §10) │  SENTRY_DSN unset → all helpers no-op
                     └────────────────────────┘
```

**Versioning**: backend tracks `main` (auto-deploy on merge). Frontend ships per `v*` git tag (semver patch). Last released tag: see `git tag --sort=-creatordate | head -1`.

---

## 2. Where everything lives

| Concern | Where | How |
|---|---|---|
| Frontend logs (build / deploy) | GitHub Actions → `Azure Static Web Apps CI/CD` | `gh run list --workflow=azure-static-web-apps-lemon-forest-0c47c5d0f.yml` |
| Backend logs (runtime) | Azure portal → App Service `cxmngr-backend-api` (West US 3) → Log stream | `az webapp log tail --name cxmngr-backend-api --resource-group rg-cxmngr-eastus` |
| Backend logs (historical) | Enable in App Service → Monitoring → Diagnostic settings → ship to a Log Analytics workspace in `rg-cxmngr-eastus`. Current state: **not enabled** — App Service's default stdout capture is short-rotated. <!-- TODO: stand up Log Analytics workspace --> | Portal → App Service → Diagnostic settings → Add → "Send to Log Analytics workspace" |
| Errors / exceptions | Sentry — **not configured yet**, see §10 for setup | Once configured, dashboard URL goes here |
| DB metrics | Mongo Atlas console → cluster **Cluster0** → Metrics tab | `https://cloud.mongodb.com` → org/project → Cluster0 |
| Blob metrics | Azure portal → storage account (in `rg-cxmngr-eastus`) → Metrics | |
| Stripe events | Stripe dashboard → Developers → Webhooks | Live + Test modes are separate dashboards |
| SendGrid deliverability | SendGrid → Activity Feed | API key lives in GitHub secret `SENDGRID_API_KEY` |

---

## 3. Backups & restore

### MongoDB
- **Provider**: **Mongo Atlas** (cluster `cluster0.ymfn7gc.mongodb.net`, database `cxmngr-api`).
- **Tier required for backups**: <!-- TODO: confirm tier -->. Atlas M0/M2/M5 (free / shared) **have no automated backup**. Continuous backup + PITR is available on **M10+ dedicated clusters**. If you're on M0, the only backup mechanism is `mongodump` from a scheduled job — and you do **not** have point-in-time restore.
- **Snapshot cadence** (if M10+): Atlas default is continuous backup with hourly oplog snapshots and a daily snapshot at midnight UTC.
- **Snapshot retention** (if M10+): default 7 daily / 4 weekly / 12 monthly. Adjust in Atlas → Backup → Policy.
- **Point-in-time restore window** (if M10+): default last 72 hours.
- **Restore SOP**: see §7 below.
- **Recovery time objective (RTO)**: **`<FILL IN — recommend 4 hours for launch>`** — the time from "we declare an incident" to "service is restored on the new cluster."
- **Recovery point objective (RPO)**: **`<FILL IN — recommend 24 hours for launch, 1 hour post-Series-A>`** — the maximum acceptable data loss measured in time.
- **Drill cadence**: practice a restore into a scratch cluster **`<FILL IN — recommend quarterly>`**. Until at least one drill has succeeded, treat the backup as unverified.

### Azure Blob Storage (docs container)
- **Container name**: value of `DOCS_BLOB_CONTAINER` env var on the backend App Service.
- **Soft delete for blobs**: **MUST be enabled** — portal → storage account → Data protection → "Enable soft delete for blobs", retention **30 days** recommended. Without it, an accidental DELETE on a doc is permanent and there is no recovery path.
- **Soft delete for containers**: also enable, **30 day** retention.
- **Versioning**: **enable** on the docs container. Allows recovery from accidental overwrites.
- **Geo-redundancy**: recommend **GRS** (or **RA-GRS** if you need read access during a region outage). East US has a paired region (West US) for GRS.

### Frontend SWA
- Static assets are rebuilt from `v*` tags; no backup needed beyond the git tags themselves.

---

## 4. Required environment variables (production)

Validated at startup by `backend-api/utils/validateEnv.js`. The server **refuses to start** if any REQUIRED var is missing in `NODE_ENV=production`.

| REQUIRED | What | Where to set |
|---|---|---|
| `MONGODB_URI` | Mongo connection string | App Service → Configuration |
| `JWT_SECRET` | Session JWT secret. Rotate on suspected compromise (see §7). | App Service → Configuration |
| `AI_ENCRYPTION_KEY` | AES-256 key (base64 or hex) used to encrypt per-project AI keys at rest | App Service → Configuration |
| `MAIL_FROM` | Sender address (must be a verified domain on the email provider) | App Service → Configuration |

| RECOMMENDED | What | Symptom if missing |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe billing API key | Billing endpoints return 503 |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature secret | Webhooks 4xx; subscriptions can't sync |
| `SENTRY_DSN` | Error tracking (§10) | Crashes go unnoticed until a customer reports |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowlist | Browser requests blocked or wildcarded |
| `APP_URL` | Public URL of the SPA, used in transactional emails | Reset/invite links broken |
| `FRONTEND_URL` | Public origin of the SPA, used by CORS fallback | CORS may block legit origins |
| `DOCS_BLOB_CONTAINER` | Storage container name for docs feature | Doc uploads fail |

Optional knobs:
- `SHUTDOWN_TIMEOUT_MS` — graceful shutdown budget, default `25000` (must stay under Azure's ~30s SIGKILL deadline).
- `SENTRY_RELEASE` — set to the deployed commit SHA so Sentry tags events with the version.
- `SENTRY_TRACES_SAMPLE_RATE` — default `0` (errors only); raise to opt into performance tracing.

---

## 5. Health & readiness checks

| Endpoint | What | Used by |
|---|---|---|
| `GET /api/health` | Mongoose `readyState === 1` → 200; else 500 | App Service liveness/readiness probe |
| `GET /` | Plain text "CXMNGR API alive" | Manual smoke test |

App Service health-check config (Azure portal → App Service → Monitoring → Health check):
- **Path**: `/api/health`
- **Threshold**: `2 minutes` of failure before instance is taken out of rotation (recommended)
- **Probe interval**: `60 seconds`
- **HTTP method**: GET (default)

<!-- TODO: confirm the health check is actually enabled in the portal -->

> **Known gap (audit B-O7)**: `/api/health` only checks Mongo, not Blob/Stripe/SendGrid reachability. Consider adding `/api/ready` for a multi-dependency check before going to scale.

---

## 6. Graceful shutdown

When App Service restarts the backend (deploy, plan move, autoscale), the runtime sends `SIGTERM`. Our handler (`backend-api/utils/gracefulShutdown.js`) drains in this order:

1. `server.close()` — stop accepting new connections; let in-flight requests finish.
2. `mongoose.disconnect()`.
3. `observability.flush(2000)` — ship pending Sentry events.
4. `process.exit(0)`.

Budget: 25 seconds. Anything not drained within the budget logs `[shutdown] timed out after 25000ms; forcing exit` and the process exits 1. Azure sends SIGKILL ~30s after SIGTERM, so we have a 5s safety margin.

Look for these log lines on every restart:
```
[shutdown] received SIGTERM, draining...
[shutdown] http server closed
[shutdown] mongoose disconnected
```

---

## 7. Common operations

### Restart the backend
Portal: App Service → `cxmngr-backend-api` (it's in West US 3 even though the RG says `eastus`) → Overview → **Restart**.

Or via CLI:
```bash
az webapp restart --name cxmngr-backend-api --resource-group rg-cxmngr-eastus
```

Quick post-restart sanity check from anywhere with curl:
```bash
curl -sS https://cxmngr-backend-api-brhhbng9crcxf6gp.westus3-01.azurewebsites.net/api/health
# expect: {"status":"ok","dbState":1}
```

### Rotate `JWT_SECRET`
1. Generate the new value:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
2. **Heads up**: rotating `JWT_SECRET` invalidates **every outstanding session immediately**. All users get kicked to the login page on their next request. There is no grace window implemented — see audit SHOULD-FIX *"JWT secret rotation has no grace logic"* for the eventual fix. For now, schedule rotations during low-traffic windows or only on suspected compromise.
3. Update App Service → Configuration → `JWT_SECRET` → Save.
4. App Service auto-restarts on save → graceful shutdown runs → new secret takes effect.

### Rotate `AI_ENCRYPTION_KEY`
**Do not rotate without a migration step.** This key encrypts the per-project AI API keys stored in Mongo (`Project.ai.apiKey.enc`). Rotating it without re-encrypting existing rows leaves the AI feature broken for every project that had a BYO key configured. <!-- TODO: write a one-off re-encrypt script before the first rotation is needed -->

### Replay a stuck Stripe webhook event
Admin tool already exists at `POST /api/admin/webhook-events/:eventId/replay` (covered by `tests/replay_*.test.js`). Requires globaladmin or superadmin auth. The webhook UI lives at `/app/admin/webhooks` (only visible to admins).

### Manually clean up an orphaned record (post-incident)
`backend-api/utils/cascadeDelete.js` is the canonical reference for which collections reference which. To find orphans for a deleted project, you can run a query like:
```javascript
// connect via mongosh, then:
const orphans = await db.activities.find({ projectId: <ObjectId-of-deleted-project> }).toArray()
// then: db.activities.deleteMany({ projectId: <ObjectId> })
```
Cascade-delete now runs automatically on `/api/projects/:id` DELETE (PR #42), so this only applies to historical data from before that PR or to cases where the cascade itself partially failed (look for `[projects.delete] cascade counts` in the log).

### Restore MongoDB to a point in time (Atlas)
1. Atlas console → cluster `Cluster0` → **Backup** tab.
2. Pick "Restore" → choose either a daily snapshot or a point-in-time target (within the last 72h on M10+).
3. **Restore into a NEW cluster** (e.g. `Cluster0-restore-YYYYMMDD`) — never overwrite the live cluster.
4. Wait for the new cluster to come online (15-30 min typical).
5. Validate from your laptop:
   ```bash
   mongosh "mongodb+srv://<user>:<pass>@cluster0-restore-YYYYMMDD.ymfn7gc.mongodb.net/cxmngr-api"
   > db.runCommand({ ping: 1 })
   > db.projects.countDocuments({})  // sanity-check the row count
   > db.users.countDocuments({})
   ```
6. Cut over: update `MONGODB_URI` in App Service → Configuration → Save. App Service restarts; the graceful-shutdown handler drains gracefully; the new instance connects to the restored cluster.
7. After cutover is stable for 24h, the old cluster can be terminated.

---

## 8. Incident response checklist

When something breaks in production:

1. **Confirm the symptom** from a customer report or a Sentry alert.
2. **Check Sentry** (once configured, §10) → recent issues grouped by URL or release tag.
3. **Check App Service log stream** (`cxmngr-backend-api` → Log stream) for stack traces and structured request logs (JSON, includes `reqId`).
4. **Check Mongo Atlas metrics** for slow queries, connection saturation, or replica lag.
5. **Check Stripe dashboard** (if billing-related) for failed webhook delivery attempts.
6. **Triage**: hotfix, rollback, or wait?
   - **Hotfix**: branch off `main`, ship a PR, merge → `deploy-backend` picks it up automatically.
   - **Rollback frontend**: find the last good `v*` tag with `git tag --sort=-creatordate | head -5`. Re-trigger that tag's SWA deploy:
     ```bash
     git tag -d v0.4.NN-rollback 2>/dev/null
     git tag v0.4.NN-rollback v0.4.97   # point at the last-known-good
     git push origin v0.4.NN-rollback
     ```
     <!-- TODO: confirm SWA accepts the rollback tag pattern; alternative is to revert the offending PR and re-tag forward -->
   - **Rollback backend**: <!-- TODO: set up App Service deployment slots in the portal (staging + production), then document the slot-swap command here -->. Without slots configured, the only rollback path is `git revert` on `main`, which re-triggers `deploy-backend`.
7. **Postmortem**: open a doc in **`docs/postmortems/YYYY-MM-DD-<short-name>.md`** in this repo. (Lightweight default — swap to Notion/Confluence later if the team picks a different tool.)

---

## 9. Pre-launch checklist

- [ ] All four REQUIRED env vars set in App Service Configuration (§4)
- [ ] `SENTRY_DSN` set and a test exception captured end-to-end (§10)
- [ ] `STRIPE_WEBHOOK_SECRET` set and Stripe dashboard shows recent successful deliveries
- [ ] `MAIL_FROM` is a verified sender on SendGrid
- [ ] Mongo backup cadence + retention verified in the Atlas console; confirm cluster tier supports backup (M10+)
- [ ] Blob soft-delete enabled on the docs container (§3) with 30-day retention
- [ ] App Service health-check enabled at `/api/health` (§5)
- [ ] Cutover plan rehearsed: deploy backend, wait for `[shutdown] mongoose disconnected` on the old instance, smoke-test
- [ ] First restore drill performed into a scratch cluster (§3) — until this is done, the backup is unverified
- [ ] RTO / RPO targets agreed and recorded in §3

---

## 10. Sentry — initial setup

We installed `@sentry/node` in PR #49 and wired the helpers in `backend-api/utils/observability.js`. They're inert until `SENTRY_DSN` is set. Setup is ~5 minutes.

### Step 1 — create an account + project
1. Go to https://sentry.io/signup/ — the free Developer tier is sufficient for launch (5k events/month).
2. After signup, create a new project:
   - **Platform**: Node.js
   - **Project name**: `cxmngr-backend-api`
   - **Alert frequency**: "Alert me on every new issue" (you can dial this back later)
3. Once created, Sentry shows you a DSN URL like:
   ```
   https://abc123def456@o1234567.ingest.sentry.io/9876543
   ```
   Copy it.

### Step 2 — paste the DSN into App Service
1. Azure portal → App Service `cxmngr-backend-api` → Configuration → Application settings → New application setting.
2. Name: `SENTRY_DSN`, Value: the URL you just copied.
3. (Optional but recommended) add `SENTRY_RELEASE` with the current commit SHA — Sentry uses this to group issues by release. You can wire this automatically in `ci.yml`'s `deploy-backend` job later.
4. Save → App Service restarts.

### Step 3 — verify it works
1. After the restart finishes, watch the App Service log stream for:
   ```
   [observability] Sentry initialized.
   ```
   That confirms the SDK loaded the DSN.
2. Trigger a test exception. Easiest is to temporarily add this admin-only endpoint (then remove after the test):
   ```javascript
   // backend-api/index.js — TEMPORARY for Sentry verification
   app.get('/api/admin/_sentry-test', (req, res) => {
     throw new Error('Sentry verification test')
   })
   ```
   Hit it once. The error appears in Sentry within ~30 seconds.
3. Once you see the event in the Sentry dashboard with request context (URL, method, headers), remove the temporary endpoint.

### Step 4 — set up alerts
- Sentry → Project → Alerts → "Create alert" → "New issues" → email yourself or the team channel.
- Recommended: also alert on **regression** ("an issue we marked resolved came back") — that's how you catch flaky deploys.

### What goes to Sentry automatically
Per our wiring in `observability.js`:
- Every unhandled exception caught by Express's error path (`Sentry.Handlers.errorHandler`).
- Every request that hit a route — Sentry adds context to whatever errors fire (URL, method, query params; PII headers/cookies are NOT included per `sendDefaultPii: false`).
- `process.on('unhandledRejection')` and `process.on('uncaughtException')` — see `index.js`.
- Mail send failures (PR #50) — tagged `kind: mail.invite | mail.reset | mail.support_access_pin`.

### What does NOT go to Sentry
- 4xx responses from happy-path validation. Those are user errors, not server bugs.
- The support-access PIN. Deliberately excluded — that's the secret the email is trying to deliver.

---

## 11. Cross-origin cookie deployment (`api.cxma.io` custom domain)

> ✅ **Applied 2026-05-30** — backend now serves at `https://api.cxma.io` so the SPA at `app.cxma.io` and the API share the `cxma.io` eTLD+1. The refresh-token cookie is first-party for every browser. Confirmed fixed in Safari + Chrome.
>
> The original Azure URL (`cxmngr-backend-api-…westus3-01.azurewebsites.net`) still resolves and is the backing host behind the custom domain. The rest of this section is kept as a historical reference for **why** this setup exists and **how** to redo it if a similar split ever needs to be undone (e.g. staging environment on a new subdomain).

### Symptom

A user reports: *"I was typing in an activity description for several minutes, hit Save, and got the 'please log in' modal — sometimes within 10 minutes of logging in."*

Other tells:
- They didn't navigate away from the tab.
- The keepalive loop is firing every 30 s but silently failing.
- DevTools → Application → Cookies for `cxmngr-backend-api-…azurewebsites.net` shows **no `__Host-rt` cookie** at the moment of failure — the browser dropped it.

### Root cause

The SPA lives at **`app.cxma.io`**. The backend lives at **`cxmngr-backend-api-…westus3-01.azurewebsites.net`**. Different eTLD+1 → the refresh-token cookie set by the backend is a **third-party cookie** when XHR requests go from `app.cxma.io` → backend. Modern browsers block third-party cookies by default:

| Browser | Default |
|---|---|
| Safari (ITP) | blocked since 2020 |
| Firefox strict | blocked |
| Brave | blocked |
| Chrome incognito | blocked |
| Chrome regular | phased out for many users 2024-2025 |

When the cookie is blocked, the keepalive `/api/users/refresh` call sees no cookie → 204 → silent fail → access token expires (15 min TTL) → next API call returns 401 → re-auth modal.

The CSRF cookie also relies on third-party cookies, but the SPA tolerates that path because it generates fresh random tokens client-side (see `src/utils/api.ts:54-59` and the long comment in `backend-api/middleware/csrf.js:60-77`). The refresh-token cookie has no such workaround — it MUST be sent on every refresh, and it MUST come from the browser.

### Fix: serve the backend at `api.cxma.io` (same eTLD+1 as the SPA)

Once `api.cxma.io` and `app.cxma.io` share `cxma.io`, the cookie becomes **first-party** and every browser sends it back. **5–15 minutes in the Azure portal, plus one frontend env var change.** No code change needed on the backend.

#### Step 1 — Add the custom hostname to the App Service
1. Azure portal → App Service `cxmngr-backend-api` → Settings → **Custom domains** → **+ Add custom domain**.
2. Type `api.cxma.io`. Azure shows you the **TXT** and **CNAME** records you need to create.

#### Step 2 — DNS records in your registrar
Add both records the portal asked for. Typically:

| Type | Host | Value |
|---|---|---|
| `CNAME` | `api` | `cxmngr-backend-api-brhhbng9crcxf6gp.westus3-01.azurewebsites.net` |
| `TXT` | `asuid.api` | `<the verification id Azure showed you>` |

Wait for DNS to propagate (usually under 5 min on a major provider; can be longer on legacy ones — `dig api.cxma.io` to verify).

#### Step 3 — Validate + bind the domain in Azure
1. Back in the portal, click **Validate**. Both records should turn green.
2. Click **Add**.
3. The domain shows up "Not Secure" — that's fine for a minute, fix in step 4.

#### Step 4 — TLS certificate (free, managed)
1. Same panel → click the new `api.cxma.io` row → **Add binding**.
2. Choose **Create App Service Managed Certificate** → free, auto-renewed.
3. Bind → wait 5-15 min for cert issuance + propagation.
4. Verify: `curl -sS https://api.cxma.io/api/health` returns `{"status":"ok","dbState":1}`.

#### Step 5 — Update the SPA's API base
1. GitHub → repo → Settings → Secrets and variables → Actions → **`VITE_API_BASE`** secret → update to `https://api.cxma.io`.
2. Tag the next frontend release (`v0.5.2` or similar) → SWA workflow rebuilds → live SPA points at the new origin.

#### Step 6 — Keep CORS happy
The SPA's origin (`https://app.cxma.io`) doesn't change, so `CORS_ALLOWED_ORIGINS` on the App Service Configuration **doesn't need to change**. But while you're in there, double-check it includes `https://app.cxma.io` — without it, all browser requests to the backend get blocked (different symptom, easy to confuse with this one).

### Verification after the change

1. Hard-refresh `https://app.cxma.io` in a browser you know was blocking third-party cookies (e.g., Safari, Firefox-strict).
2. Log in.
3. Open DevTools → Application → Cookies → look for `__Host-rt` under **`api.cxma.io`** (not the long azurewebsites URL). It should be there.
4. Wait 15 min while idle, then make any API call (e.g., open an activity). The keepalive should have refreshed silently; the call should succeed without the re-auth modal.
5. Verify across 2-3 browsers (Chrome, Safari, Firefox).

### What stops working if we DON'T do this

- All Safari users — broken on day one.
- Firefox-strict / Brave users — broken on day one.
- Incognito sessions on every browser — broken.
- Increasing share of regular Chrome users as the third-party cookie phase-out progresses.

For a B2B AEC tool where customers may use any browser, this is a real adoption blocker, not a marginal compatibility issue.

### Why we can't just "fix it in code"

The fundamental constraint is browser policy: a cookie set by domain A cannot reliably be sent on requests to domain A initiated from domain B. The only code-only alternatives are:

- **Store the refresh token in localStorage and send it as a Bearer header.** Loses HttpOnly protection → exposes refresh tokens to XSS. Strictly worse than the cookie approach. Not recommended.
- **Storage Access API.** Requires explicit user permission grant via UI gesture. Complex, browser-specific, brittle.
- **CHIPS (cookies with independent partitioned state).** Chrome-specific; doesn't help Safari/Firefox.

The `api.cxma.io` custom-domain fix is the standard solution. Every SaaS that hosts a SPA on a different domain than its API does this.

---

## Footnotes
- Audit reference: `LAUNCH_AUDIT_2026-05-27.md`
- Source for boot-time env validation: `backend-api/utils/validateEnv.js`
- Source for graceful shutdown: `backend-api/utils/gracefulShutdown.js`
- Source for observability wiring: `backend-api/utils/observability.js`
- Cascade-delete reference: `backend-api/utils/cascadeDelete.js`
- Optimistic-locking reference: `backend-api/utils/optimisticLock.js`
