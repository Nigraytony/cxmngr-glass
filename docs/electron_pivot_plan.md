# Offline via Electron — Pivot Plan

**Status:** Phase 0 POC validated (2026-07-01) — login + offline checkout/edit/save/check-in work under Electron.
**Date:** 2026-07-01
**Decision:** Ship offline as an **Electron desktop app**, superseding the browser/service-worker path.

> **Phase 0 result:** `electron/main.cjs` serves the built `dist/` over an `app://` protocol; the
> full offline loop was confirmed on macOS. POC shortcuts still in place (to replace in Phase 1+):
> `webSecurity:false`, an `Origin` header rewrite to `https://app.cxma.io` for API/CORS, and a
> hardcoded `VITE_API_BASE` in the `electron:build` script. Local `.env.production` also holds a
> stale/dead `VITE_API_BASE` (prod overrides it via CI secret) — worth cleaning up separately.

## 1. Why

Every offline bug hit during the browser/PWA attempt (2026-06-30 → 07-01) was **browser/
service-worker-specific**: route chunks not loading offline, `navigator.onLine` lying, service-
worker version skew across deploys, boot-time init timing. The one shell-agnostic bug (Vue reactive
→ `DataCloneError`) is fixed and stays fixed everywhere.

Electron bundles the app's code **locally**, which eliminates that entire class of problems:
no service worker, no hashed-chunk skew, no CDN dependency to load the UI. This is what the original
`offline_phase1_design.md` recommended shipping **first**, for exactly these reasons.

## 2. What we reuse (unchanged)

The expensive part is already built and is shell-agnostic:

- Repository layer + failure-based routing (`src/data/*Repository.ts`, `offlineGate.ts`)
- Dexie schema, outbox, checkout/check-in engine (`src/data/db.ts`, `outbox.ts`, `checkout.ts`)
- Client IDs, `__v` optimistic locking, `toPlain` reactive sanitizer
- The entire Vue UI + the checkout/check-in sidebar
- Backend checkout/check-in endpoints + offline grant

Electron is **wrap + package**, not a rewrite.

## 3. Key technical decisions

1. **Asset base path (the #1 POC blocker).** The Vite build emits absolute asset URLs
   (`/assets/…`), which break under Electron `file://`. Options:
   - **`base: './'`** in the Electron build → relative asset URLs, load via `file://`. Simplest.
     Must confirm the SPA router (`createWebHistory`) works under `file://` — may need
     `createWebHashHistory` for the Electron build, OR:
   - **Load from a local HTTP server** (a tiny in-process static server or a custom `app://`
     protocol) → keeps absolute paths + history routing. More robust for a complex SPA.
   - **Lean:** custom `app://` protocol serving `dist/` — keeps `createWebHistory`, avoids `file://`
     quirks. Decide during the POC.
2. **Main process module format.** Root `package.json` is `type: module`. Electron main can be ESM
   (modern Electron) or an isolated `.cjs`. **Lean:** keep Electron files in a separate folder
   (`electron/`) as `.cjs` (or its own `package.json`) to avoid fighting the app's ESM config.
3. **Do NOT register the service worker in Electron.** Code is local; the SW is a web-only concern.
   Gate `registerOfflineServiceWorker()` to the browser shell. (See §6 — decommission web offline.)
4. **API stays remote.** `VITE_API_BASE` → `api.cxma.io`. Online uses the network; offline uses the
   existing Dexie/outbox path. No backend change needed for Phase 0–2.
5. **Packaging tool: `electron-builder`** (mature, handles mac/win/linux, code-signing,
   auto-update) over electron-forge. 
6. **Auto-update: `electron-updater` + GitHub Releases** (or Azure Blob). Requires code signing.
7. **Code signing / notarization is a real tax with lead time:** Apple Developer cert +
   notarization, Windows OV/EV cert. Budget for it before public distribution; unsigned local
   builds are fine for internal testing.

## 4. Phased plan (de-risk first)

| Phase | Scope | Ships? |
|---|---|---|
| **0 — POC (local, no packaging)** | Minimal `electron/main.cjs` + loader that serves the built `dist/`; solve the base-path/routing issue; launch the app, verify **online works** and **offline checkout → edit → save → check-in** works. No signing, no installer. | Local only |
| **1 — Dev workflow** | Load the Vite dev server in dev (hot reload), built `dist` in prod; window/menu basics; `npm run electron`, `electron:dev`. | Local |
| **2 — Packaging** | `electron-builder` config; produce unsigned mac `.dmg` / win `.exe` for internal testers; CI job to build artifacts. | Internal |
| **3 — Signing + auto-update** | Apple notarization + Windows cert; `electron-updater` against a release feed. | Public |
| **4 — Polish** | Native camera/photo capture, deep links, offline-only affordances, app icon/branding. | — |

Phase 0 is small and **carries zero production risk** (runs locally), yet proves the whole approach.
Recommended immediate next step.

## 5. Open decisions

1. **OS targets** — macOS + Windows (field laptops)? Linux? Affects signing + CI.
2. **Distribution channel** — direct download, MDM, or an internal portal? Affects auto-update host.
3. **Signing certs** — who procures Apple Developer + Windows certs (lead time/cost)?
4. **Router mode under Electron** — resolve in Phase 0 (`app://` protocol vs hash history).

## 6. Decommission / freeze the web offline path

The browser PWA is live (v0.6.36) for offline-beta devices and has the known service-worker skew
issue. Since Electron becomes the offline shell, we should **stop investing in the web SW**. Options:
- **Freeze:** leave it as-is (beta, tiny usage), stop changing it. Lowest effort.
- **Disable:** stop registering the SW / hide the offline beta toggle on web, so web users don't hit
  the skew bug; keep offline for Electron only. Cleaner; one small PR.
- **Lean:** disable web offline once the Electron POC (Phase 0) proves out, so there's exactly one
  offline shell to maintain.

## 7. Non-goals (for this pivot)

- Capacitor/mobile (iPad/Android) — later phase, reuses the same core.
- Any change to the checkout/check-in data model or backend (already done).
