# Live Demo — Setup Runbook

The self-serve live demo is a single shared account + project ("Cxma Live Demo —
Riverside Medical Center") that prospects can explore without signing up. Visitors
hit `/demo`, which auto-signs-in via `POST /api/users/demo-login` and drops them
into a fully populated project. Data is wiped and re-seeded nightly.

**Code (shipped in PR #69):**
- Seed + reset logic — `backend-api/utils/demoProject.js`
- Reset endpoint — `backend-api/routes/demo.js` (`POST /api/demo/reset`)
- Auto-login — `backend-api/routes/users.js` (`POST /api/users/demo-login`)
- Frontend route — `/demo` → `src/pages/Demo.vue`; CTA on `src/pages/home/HomePage.vue`
- Nightly reset cron — `.github/workflows/demo-reset.yml` (07:00 UTC)

This runbook covers the **one-time manual configuration** the code depends on.

---

## 1. Generate a shared secret

```bash
openssl rand -hex 32
```

Use this single value for **both** the backend env var (step 2) and the GitHub
repo secret (step 3) — they must match exactly.

## 2. Set the backend env var (Azure App Service)

App: `cxmngr-backend-api` (resource group `rg-cxmngr-eastus`).

Portal → App Service → **Settings → Environment variables** → add:

| Name             | Value                              | Required |
|------------------|------------------------------------|----------|
| `DEMO_RESET_KEY` | the secret from step 1             | Yes — `/api/demo/reset` returns 503 without it |
| `DEMO_USER_EMAIL`| `demo@cxma.io` (or your own)       | No — defaults to `demo@cxma.io` |

Or via CLI:

```bash
az webapp config appsettings set \
  --name cxmngr-backend-api \
  --resource-group rg-cxmngr-eastus \
  --settings DEMO_RESET_KEY='<secret-from-step-1>'
```

Save and let the app restart.

For **local testing**, add the same `DEMO_RESET_KEY` line to `backend-api/.env`.

## 3. Set the GitHub repo secrets (nightly cron)

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret           | Value                                                                 |
|------------------|-----------------------------------------------------------------------|
| `DEMO_RESET_URL` | `https://api.cxma.io/api/demo/reset`                                  |
| `DEMO_RESET_KEY` | the **same** secret from step 1                                       |

> The backend is served at the custom domain **`api.cxma.io`**. Use that host —
> the default `cxmngr-backend-api.azurewebsites.net` hostname does not resolve.

## 4. Trigger the first seed

The demo user/project don't exist until the first reset or `/demo-login` call.
Kick it off either way:

- **Actions tab** → "Reset Demo Project" → **Run workflow** (manual dispatch), or
- just visit `https://app.cxma.io/demo` once (first login auto-seeds), or
- direct curl:

  ```bash
  curl -X POST https://api.cxma.io/api/demo/reset \
    -H "x-demo-reset-key: <secret-from-step-1>"
  ```

A success returns `{ "ok": true, "projectId": "...", "wiped": {...}, "seeded": {...} }`.

## 5. Verify

1. Open `/demo` in a clean/incognito browser — it should auto-load the demo project.
2. Confirm the marketing **"Try the live demo"** CTA on the home page lands on `/demo`.
3. Confirm the nightly workflow run is green (Actions tab, after 07:00 UTC).

---

## Notes

- The reset endpoint is intentionally CSRF-exempt (see `backend-api/middleware/csrf.js`)
  so the scheduler can call it without a browser cookie. It is protected only by the
  `DEMO_RESET_KEY` header — keep the secret out of logs and client code.
- The demo project is forced `isActive=true` / `subscriptionTier=premium` so it
  bypasses billing gating and shows every feature.
- To change the seeded dataset, edit `seedChildren()` in `backend-api/utils/demoProject.js`.
