# Operations runbook

This is the on-call / ops-readiness reference for cxmngr-glass. It pairs with the launch-readiness audit (`LAUNCH_AUDIT_2026-05-27.md`). Sections marked **`<FILL IN>`** are the items the team needs to populate with environment-specific values before launch — they're left as placeholders here so the structure is committed, the gaps are visible in PR review, and operators have one place to look.

---

## 1. Production architecture (one-pager)

```
                     ┌────────────────────────┐
                     │  Azure Static Web App  │  cxmngr-glass frontend (Vue 3 + Vite)
                     │   deploys on  v* tags  │  workflow: .github/workflows/azure-static-web-apps-*.yml
                     └────────────┬───────────┘
                                  │ HTTPS
                                  ▼
                     ┌────────────────────────┐
                     │   Azure App Service    │  backend-api (Express + Mongoose)
                     │  deploys on main merge │  workflow: .github/workflows/ci.yml :: deploy-backend
                     └────┬──────────┬────────┘
                          │          │
                          │          │
              ┌───────────▼──┐    ┌──▼──────────────┐
              │ Mongo Atlas  │    │ Azure Blob      │  docs container
              │ (Cosmos)     │    │ Storage         │
              │  <FILL IN>   │    │  <FILL IN>      │
              └──────────────┘    └─────────────────┘
                          │          │
                          │          │
              ┌───────────▼──┐    ┌──▼──────────────┐
              │  Stripe      │    │  SendGrid /     │
              │  Billing +   │    │  SMTP           │
              │  Webhooks    │    │                 │
              └──────────────┘    └─────────────────┘
                          │
                          ▼
                     ┌────────────────────────┐
                     │  Sentry (or App        │  error tracking
                     │  Insights — pick one)  │  SENTRY_DSN env var
                     └────────────────────────┘
```

**Versioning**: backend tracks `main`. Frontend ships per `v*` git tag (semver patch by default). Last released tag: see `git tag --sort=-creatordate | head -1`.

---

## 2. Where everything lives

| Concern | Where | How |
|---|---|---|
| Frontend logs (build / deploy) | GitHub Actions → `Azure Static Web Apps CI/CD` | `gh run list --workflow=azure-static-web-apps-*.yml` |
| Backend logs (runtime) | Azure App Service → Log stream | `az webapp log tail` or portal Log stream |
| Backend logs (historical) | **`<FILL IN>`** — likely App Service "Application Logging (Filesystem/Blob)" + Log Analytics workspace | Configure under App Service → Monitoring → Diagnostic settings |
| Errors / exceptions | Sentry dashboard at `<FILL IN sentry project URL>` | Set `SENTRY_DSN` in App Service Configuration |
| DB metrics | Mongo Atlas (or Cosmos) console at `<FILL IN cluster URL>` | Atlas → Metrics tab |
| Blob metrics | Azure portal → storage account → Metrics | |
| Stripe events | Stripe dashboard → Developers → Webhooks | Live + Test modes are separate dashboards |
| SendGrid deliverability | SendGrid → Activity Feed | |

---

## 3. Backups & restore

### MongoDB
- **Provider**: `<FILL IN — Mongo Atlas / Cosmos DB for MongoDB / self-hosted>`
- **Snapshot cadence**: `<FILL IN>` (Atlas default: continuous backup + daily snapshot at midnight UTC).
- **Snapshot retention**: `<FILL IN>` (Atlas default: 7 daily / 4 weekly / 12 monthly).
- **Point-in-time restore window**: `<FILL IN>` (Atlas: last 72h on M10+).
- **Restore SOP**: see § 7 below.
- **Recovery time objective (RTO)**: `<FILL IN>`.
- **Recovery point objective (RPO)**: `<FILL IN>`.
- **Drill cadence**: practice a restore into a scratch cluster every **`<FILL IN — e.g. quarterly>`**.

### Azure Blob Storage (docs container)
- **Container**: value of `DOCS_BLOB_CONTAINER` env var.
- **Soft delete for blobs**: **ENABLE this in the portal** — Storage account → Data protection → Enable soft delete for blobs, retention `<FILL IN — e.g. 30 days>`. Without it, an accidental DELETE on a doc is permanent.
- **Soft delete for containers**: also enable, retention `<FILL IN>`.
- **Versioning**: `<FILL IN — recommend ON for the docs container>`.
- **Geo-redundancy**: `<FILL IN — GRS/RA-GRS recommended>`.

### Frontend SWA
- Static assets are rebuilt from `v*` tags; no backup needed beyond the git tags themselves.

---

## 4. Required environment variables (production)

Validated at startup by `backend-api/utils/validateEnv.js`. The server **refuses to start** if any REQUIRED var is missing in `NODE_ENV=production`.

| REQUIRED | What | Where to set |
|---|---|---|
| `MONGODB_URI` | Mongo connection string | App Service → Configuration |
| `JWT_SECRET` | Session JWT secret. Rotate on suspected compromise (see § 8). | App Service → Configuration |
| `AI_ENCRYPTION_KEY` | AES-256 key (base64 or hex) used to encrypt per-project AI keys at rest | App Service → Configuration |
| `MAIL_FROM` | Sender address (must be a verified domain on the email provider) | App Service → Configuration |

| RECOMMENDED | What | Symptom if missing |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe billing API key | Billing endpoints return 503 |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature secret | Webhooks 4xx; subscriptions can't sync |
| `SENTRY_DSN` | Error tracking | Crashes go unnoticed until a customer reports |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowlist | Browser requests blocked or wildcarded |
| `APP_URL` | Public URL of the SPA, used in transactional emails | Reset/invite links broken |
| `FRONTEND_URL` | Public origin of the SPA, used by CORS fallback | CORS may block legit origins |
| `DOCS_BLOB_CONTAINER` | Storage container name for docs feature | Doc uploads fail with `EMAIL_NOT_CONFIGURED`-style errors |

Optional knobs:
- `SHUTDOWN_TIMEOUT_MS` — graceful shutdown budget, default `25000` (must stay under Azure's ~30s SIGKILL deadline).
- `SENTRY_RELEASE` — recommend setting to the deployed commit SHA so Sentry tags events with the version.
- `SENTRY_TRACES_SAMPLE_RATE` — default `0` (errors only); raise to opt into performance tracing.

---

## 5. Health & readiness checks

| Endpoint | What | Used by |
|---|---|---|
| `GET /api/health` | Mongoose `readyState === 1` → 200; else 500 | App Service liveness/readiness probe |
| `GET /` | Plain text "CXMNGR API alive" | Manual smoke test |

App Service probe config: `<FILL IN — path, port, threshold, period>`.

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
`<FILL IN — Azure portal: App Service → Overview → Restart, or:>`
```bash
az webapp restart --name <app-name> --resource-group <rg>
```

### Rotate a secret (e.g. JWT_SECRET)
1. Generate the new value (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
2. **`<FILL IN — decide rotation strategy>`**: today rotating `JWT_SECRET` invalidates every outstanding session. No grace window is implemented (see audit B-Sec SHOULD-FIX "JWT secret rotation has no grace logic").
3. Update App Service → Configuration → `JWT_SECRET`.
4. Save → App Service restarts → graceful shutdown runs → new secret takes effect.

### Replay a stuck Stripe webhook event
Admin tool already exists at `/api/admin/webhook-events/:eventId/replay` (used in `tests/replay_*.test.js`). Requires globaladmin or superadmin auth.

### Manually clean up an orphaned record (post-incident)
`<FILL IN — script reference or query>`. The cascade-delete helpers in `backend-api/utils/cascadeDelete.js` are the canonical reference for which collections reference which.

### Restore MongoDB to a point in time
`<FILL IN — Atlas/Cosmos-specific steps>`. The general pattern:
1. From the provider's restore UI, pick the snapshot or PITR target.
2. Restore into a **new** cluster name, not the live one.
3. Validate by connecting with `mongosh` and running:
   ```
   db.runCommand({ ping: 1 })
   db.projects.countDocuments({})  // sanity check
   ```
4. Cut over by updating `MONGODB_URI` in App Service → Configuration → restart.

---

## 8. Incident response checklist

When something breaks in production:

1. **Confirm the symptom** from a customer report or a Sentry alert.
2. **Check Sentry** → recent issues grouped by URL or release tag.
3. **Check App Service log stream** for stack traces and structured request logs (JSON, includes `reqId`).
4. **Check Mongo Atlas metrics** for slow queries, connection saturation, or replica lag.
5. **Check Stripe dashboard** (if billing-related) for failed webhook delivery attempts.
6. **Triage**: hotfix, rollback, or wait?
   - Hotfix: branch off `main`, ship a PR, merge, the `deploy-backend` job picks it up.
   - Rollback frontend: re-push the previous good `v*` tag (e.g. `git tag -f v0.4.97-rollback && git push --tags`). The SWA workflow re-deploys that build.
   - Rollback backend: `<FILL IN — Azure App Service has deployment slot swap; document the slot names>`.
7. **Postmortem**: open a doc in `<FILL IN — Notion / GDocs / repo `docs/postmortems/`>`.

---

## 9. Pre-launch checklist

- [ ] All four REQUIRED env vars set in App Service Configuration (§4)
- [ ] `SENTRY_DSN` set and a test exception captured end-to-end
- [ ] `STRIPE_WEBHOOK_SECRET` set and Stripe dashboard shows recent successful deliveries
- [ ] `MAIL_FROM` is a verified sender on SendGrid
- [ ] Mongo backup cadence + retention verified in the Atlas/Cosmos console (§3)
- [ ] Blob soft-delete enabled on the docs container (§3)
- [ ] App Service liveness probe pointed at `/api/health`
- [ ] Cutover plan rehearsed: deploy backend, wait for `[shutdown] mongoose disconnected` on the old instance, smoke-test
- [ ] `RUNBOOK.md` § 7 placeholders filled in for on-call handoff

---

## Footnotes
- Audit reference: `LAUNCH_AUDIT_2026-05-27.md`
- Source for boot-time env validation: `backend-api/utils/validateEnv.js`
- Source for graceful shutdown: `backend-api/utils/gracefulShutdown.js`
- Source for observability wiring: `backend-api/utils/observability.js`
