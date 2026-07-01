# Offline Support — Phase 1 Design

Status: **Draft for discussion** · Last updated: 2026-06-28

## TL;DR

Make the app usable offline for the field-work core — **Assets, Activities, Issues** — under a
**check-out / check-in** model: pull one project to the device, work fully offline, sync changes
back when connected. Ship it first as an **Electron desktop app** (Windows/Mac/Linux), with the
offline data layer built as portable Vue code so the same core later wraps in **Capacitor**
(iPad/Android) and continues to run in the existing **web app**.

The shell (Electron / Capacitor / browser) is the cheap, swappable part. The offline **data layer**
is the expensive, reusable part. We build the data layer once and package it three ways.

## Goals

- A user can **check out** a single project while online and then work with no connectivity.
- Offline create / edit / delete for **Assets (Equipment), Activities, Issues** (and Activity
  **Actions** — see decision D3), including **photo capture**.
- On reconnect, **check in**: replay local changes to the API, resolve conflicts, return the device
  to a clean state.
- The offline core is **shell-agnostic** — identical code in Electron, Capacitor, and the browser.
- No regression to the existing online web app.

## Non-goals (Phase 1)

- Multi-user concurrent offline editing / real-time merge. Checkout takes an **advisory lock**;
  the offline device is the only writer.
- Offline support for Templates, OPR Workshop, Documents (Azure Blob), Spaces, Systems, Tasks,
  billing, final report. These come in later phases.
- Offline **project creation**. Phase 1 checks out an existing project; you cannot create a brand
  new project offline.
- Capacitor/mobile packaging. Phase 1 ships Electron only; mobile is a later phase reusing this core.

## Background / current state

(From the architecture survey — see file paths for the spots we touch.)

- **Frontend**: Vue 3 + Vite + Pinia. No service worker / PWA today. No IndexedDB today.
- **Data access**: Pinia stores call `http.get/post/patch/delete` **directly** — no repository layer.
  - `src/utils/api.ts` (Axios instance, CSRF), `src/utils/http.ts` (401/402 + refresh interceptors)
  - `src/stores/activities.ts`, `src/stores/issues.ts`, `src/stores/equipment.ts`,
    `src/stores/actions.ts`, `src/stores/project.ts`
- **Auth**: JWT access token in `sessionStorage`, httpOnly refresh cookie, 15-min idle timeout,
  ~2-min keep-alive refresh. All of which require the network. (`src/stores/auth.ts`, `src/main.js`)
- **IDs**: server-side Mongo `ObjectId`. No client-generated IDs today.
- **Conflict control**: `__v` optimistic locking **already exists on the backend** but is **opt-in**
  and the frontend does not send `__v` yet. (`backend-api/utils/optimisticLock.js`)
- **Photos**: base64 strings embedded in Activity/Issue documents (250 KB cap each, multer memory).
- **Entities**: all carry `projectId`, `createdAt`, `updatedAt`, `__v`. Models in `backend-api/models/`.

## The four decisions to settle first

These are the load-bearing choices. Everything else is mechanical once these are fixed.

### D1 — Offline auth

**Problem:** a checked-out device with an expired access token and no network is dead. Token refresh
needs the network; the idle timeout would log the user out mid-job.

**Proposal:**
- At **checkout**, capture an **offline grant**: a longer-lived credential bound to the checked-out
  project + device, stored encrypted in IndexedDB (not sessionStorage).
- While a project is checked out and offline, **suspend** the idle-timeout logout and keep-alive loop;
  the app operates in an "offline session" that trusts the offline grant for read+write to **local
  data only** (no network calls are even attempted).
- On reconnect, **re-authenticate** (silent refresh if the refresh cookie is still valid; otherwise
  prompt for login) **before** check-in is allowed to push anything.
- Offline grant has a hard expiry (e.g. configurable, default ~7–14 days). Past expiry, local data is
  still readable but check-in requires fresh online login.

**Open questions:** grant lifetime; where the server validates the grant on check-in; whether to bind
to a device fingerprint. Backend work: issue + validate offline grant on checkout/check-in endpoints.

### D2 — Client-generated IDs

**Problem:** offline you create an Issue/Activity/Action/Asset before the server has assigned an
`ObjectId`, and these entities reference each other (`activity.issues[]`, `action.activityId`, …).

**Decision (recommended): client-generated IDs.** Generate a 24-hex ObjectId-compatible value
client-side at create time and let the server **accept the client-supplied `_id`** on insert.
- Pros: references are valid immediately; no remap/patch pass on sync; simplest sync logic.
- Cons: touches every create route + model to accept (and validate uniqueness of) a supplied `_id`.

**Rejected alternative:** temp local IDs remapped on sync. Fiddlier — every cross-entity reference
must be rewritten when the server returns the real ID, across the whole graph. More sync bugs.

Backend work: allow client-supplied `_id` on create for Assets/Activities/Actions/Issues, with
collision handling (reject as conflict if `_id` already exists with different content).

### D3 — Are Actions in Phase 1?

Actions are sub-records of Activities (own collection, `src/stores/actions.ts`). An Activity without
its Actions is half a record for field use.

**Recommendation: YES, include Actions in Phase 1.** They inherit the same offline treatment as
their parent Activity. (If we cut them, an offline Activity edit can't add the action items a tech
actually performs on site — which defeats the purpose.)

### D4 — Photos

All three entities carry base64 photos, and **photo capture is probably the #1 reason** a field tech
wants offline. So photos are **in scope** for Phase 1, and they are the heaviest single chunk.

**Proposal:**
- Offline, store captured photos as **Blobs in IndexedDB** (not base64) to save ~33% size + memory.
- Convert to the existing base64 `photos[]` shape only at **check-in** upload time, so the backend
  contract is unchanged in Phase 1.
- Respect the existing 250 KB cap at capture time (downscale/compress before store).
- **Later phase:** revisit moving photos off base64-in-Mongo to blob/SAS upload (like Documents) —
  out of scope here, but flagged because base64-in-Mongo will not scale.

## Architecture

```
            ┌──────────────────────────────────────────────────────────┐
            │                  Vue 3 app (portable core)                │
            │                                                          │
   Views ─► │  Pinia stores ─► Repository layer ─► ┬─ API (online)     │
            │  (activities,                        └─ Dexie/IndexedDB  │
            │   issues, equipment,                      (offline)       │
            │   actions)            ▲                                   │
            │                       │                                   │
            │              Outbox + Sync engine (checkout / check-in)   │
            └──────────────────────────────────────────────────────────┘
                      same build, three shells ▼
        ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
        │   Electron    │   │   Capacitor   │   │   Browser     │
        │ (Phase 1 now) │   │ (later phase) │   │  (always)     │
        └───────────────┘   └───────────────┘   └───────────────┘
```

### Key components

- **Repository layer** (new) — sits between Pinia stores and the network. Each entity gets a
  repository with the same read/write API the stores use today, but it transparently routes to the
  **API** (online, project not checked out) or **Dexie/IndexedDB** (project checked out / offline)
  and appends mutations to the **outbox**. This is the central new abstraction; stores stop calling
  `http.*` directly.
- **Dexie schema** (new) — local tables for `projects`, `activities`, `actions`, `issues`,
  `equipment`, `photos` (Blobs), `outbox`, and a `checkout` meta record. Use **Dexie**, not raw
  IndexedDB. **Do not use SQLite/`better-sqlite3`** even though Electron allows it — it would not
  port to Capacitor/web and we'd build the data layer twice.
- **Outbox** (new) — ordered, append-only queue of pending operations
  (`create|update|delete`, entity, id, payload, `__v`, timestamps). Replayed in order on check-in.
- **Sync engine** (new) — `checkout(projectId)`, `checkIn()`, conflict handling. Uses `__v` on every
  mutation; on a 409 from the backend, applies the conflict policy (D5 below).

### Conflict policy (uses existing `__v`)

We **finish the frontend `__v` migration** so every mutation sends its version. On check-in:
- **No conflict** (server `__v` matches): apply, advance version.
- **Conflict** (409): Phase 1 policy = **last-write-wins with a surfaced report** — apply the local
  change, but record the overwritten server state and show the user a post-check-in summary of any
  conflicts so nothing is silently lost. (Field-level merge / interactive resolution is a later
  enhancement; the checkout lock should make conflicts rare.)

## Backend changes (Phase 1)

- **Checkout/check-in endpoints**: `POST /api/projects/:id/checkout`, `POST /api/projects/:id/checkin`
  — issue/validate the offline grant (D1), set/clear an advisory checkout lock, accept a batched
  replay of outbox operations on check-in.
- **Accept client-supplied `_id`** on create for Assets/Activities/Actions/Issues (D2).
- **Enforce `__v`** on the Phase-1 entity mutations (flip optimistic lock from opt-in to required for
  these routes once the frontend sends it). `backend-api/utils/optimisticLock.js` already exists.
- Advisory lock fields on Project (e.g. `checkedOutBy`, `checkedOutAt`, `checkoutDeviceId`).

## Work breakdown (sequenced)

Steps 1–2 ship value **in the browser with no Electron at all**, and de-risk the hard part early.

1. **Repository layer + `__v` frontend migration** — refactor `activities.ts` to read/write through a
   new repository instead of `http.*` directly; send `__v` on mutations. **Pilot deliverable.**
   No offline behavior yet — proves the abstraction online first.
2. **Offline core** — Dexie schema, outbox, `checkout()/checkIn()`, client-generated IDs, offline
   auth (D1). Roll the repository pattern out to `issues.ts`, `equipment.ts`, `actions.ts`.
   Photo capture → Blob → check-in upload (D4). Still fully testable in a plain browser.
3. **Backend** — checkout/check-in endpoints, client-`_id` acceptance, advisory lock, `__v`
   enforcement on the four entities.
4. **Electron shell** — wrap the existing Vite build; app menus; **code signing + auto-update**
   (Apple notarization + Windows cert — a setup tax to budget for). Mostly packaging at this point.
5. **(Later phase, not Phase 1)** — Capacitor wrap for iPad/Android (native camera + mobile shell),
   reusing the same data layer untouched.

## Risks / watch-list

- **Offline auth (D1)** is the highest-uncertainty item — design and prototype it first.
- **Photos (D4)** are the largest single chunk; base64-in-Mongo is a known scaling debt to revisit.
- **Storage limits** — IndexedDB is generous but browser/OS can evict; in Electron this is less of a
  worry, but the portable web path must handle quota + persistence requests.
- **The repository refactor touches every Phase-1 store** — but it's healthy architecture regardless
  of offline, so the cost is justified even if offline slipped.
- **Code signing / auto-update** is a real distribution tax for Electron — plan for certs early.

## Pilot — first concrete deliverable

Refactor `src/stores/activities.ts` to go through a new repository abstraction and send `__v` on
mutations, with no behavior change online. This proves the central abstraction before any IndexedDB
or Electron work, and becomes the template every other store follows.

## Phase 2 — shipped 2026-06-30 (offline usability fix)

Beta testing surfaced that a *truly* offline device (real connectivity loss) could open the
Issues/Activities **list** pages but not the **detail** pages, and Equipment was unusable offline.

**Root cause.** Offline routing keyed entirely off `online === false`, set only from
`navigator.onLine` + the browser online/offline events. Those report whether a network *interface*
exists, not whether the server is reachable — so a device that drops internet but stays associated
with Wi-Fi keeps `online === true`, and every read hits the dead network. Lists looked fine (stale
in-memory data); fresh fetches (detail pages, equipment) failed.

**Fix (failure-based fallback).**
- `offlineGate.viaNetwork(onlineFn, localFn, projectId?)` wraps every repository op: it tries the
  network and, on a genuine connectivity failure (`isNetworkFailure` — request made, no response)
  while checked out, flips the gate offline and serves the local IndexedDB copy / queues the write.
  All four repos (issues, activities, equipment, actions) now route through it.
- `http.ts` response interceptor keeps the gate honest app-wide: success → `setOnline(true)`,
  connectivity failure → `setOnline(false)` (while checked out).
- A `replaying` guard (`setReplaying`, also short-circuits `useLocal`) ensures check-in replay always
  hits the network — a drop there aborts the sync instead of re-queuing.
- **Checkout now hydrates full detail records** (`hydrateFullRecords`, bounded concurrency) so
  equipment components, activity photos, and issue comments are present offline — the list payloads
  alone were too light.
- Edit pages that fetched detail via direct `http` (`EquipmentEdit.load/loadPhotos/loadComponents`,
  `IssuesList` comment reveal) now fall back to the offline-aware store/repo on failure.

Tests: `tests/unit/repositories.fallback.test.ts` (new) + existing offline suite (40) pass.

**Still deferred:** offline photo *capture* (write) remains `OfflineUnsupportedError` — only viewing
hydrated photos works. See D4 and the photo bullet below.
1
### Web shell — service worker (2nd pass, same day)

Live testing in a **browser** showed the data-layer fix wasn't enough: navigating offline to a
route the session hadn't visited yet failed with `ERR_INTERNET_DISCONNECTED` /
`Failed to fetch dynamically imported module` — the **code-split route chunks** (`IssuesList-*.js`,
`EquipmentList-*.js`, …) are fetched from the network on first navigation, so the page component
never loaded and no app code ran. Phase 1 targeted Electron first precisely because a local bundle
sidesteps this; the browser path needs a service worker (the doc's "no service worker / PWA today").

Added **`vite-plugin-pwa`** (Workbox `generateSW`): precaches all hashed JS/CSS/font chunks
(~150 entries) so any route loads offline, with `navigateFallback: /index.html` (denylist `/api`,
`/assets`) and `autoUpdate` + `skipWaiting`/`clientsClaim` so deploys don't strand users on a stale
bundle. `cleanupOutdatedCaches` prunes old precaches.

**Scoped to the beta:** `injectRegister: null` — the SW is built but only *registered* by
`src/data/offlineServiceWorker.ts`, called from the offline store's `init()`/`setFeatureEnabled`,
i.e. only for devices that enabled the offline flag. Opting out unregisters it and clears its caches.
Non-beta production users get no service worker.

Also: `main.js` now (a) reloads once on a `vite:preloadError` to recover from a post-deploy stale
manifest (guarded; skipped when offline), and (b) suspends the auth keep-alive / idle-refresh while
an offline session is active (the repeated `POST /api/users/refresh` failures seen in testing).

`vite-plugin-pwa`'s SW generation can't load `workbox-build` on Node 18, which CI still built on.
Since Node 18 is EOL (Apr 2025) and the frontend ships on Node 20 (the SWA workflow), the Node-18
frontend CI build was dropped (`ci.yml` → Node 20 only). This also lines up with the planned move to
Node 22 (Node upgrade plan).

Follow-up: the precache is ~12 MiB because it includes export-only chunks (`xlsx`,
`html-to-docx`, `reportTypography`) that are offline-unsupported anyway — could be excluded to slim
the install.

### Boot-time offline init (3rd pass)

Live testing showed offline **saves** failing (the PATCH hit the dead network instead of the outbox).
Root cause: `offlineGate.checkedOutProjectId` was only ever populated by `offlineStore.init()`, which
was wired *solely* through `SidebarOfflineControl` — and that component is gated `v-if="currentProjectId"`.
Offline, the project fetch (`GET /api/projects/:id`) fails and `currentProjectId` can reset to `null`
(`stores/project.ts`), so the control unmounts, `init()` never runs, the gate stays empty, and every
repo op's `useLocal()` **and** failure-fallback no-op (both require a checked-out project) — so writes
hit the network and throw. `online` also never flips, since the `http.ts` interceptor is gated on the
same checkout state.

Fix: call `useOfflineStore().init()` at app boot in `main.js` (for offline-beta devices), so the gate
is hydrated from IndexedDB before any user action, independent of project/sidebar state.

### Reactive-payload DataCloneError (4th pass)

With writes now routed to IndexedDB, offline saves threw
`DataCloneError: … [object Array] could not be cloned`. The repos put the component's edit state
(a Vue `reactive` Proxy, with nested arrays like comments/photos/labels) straight into Dexie, and the
structured-clone algorithm can't serialize proxies. Fix: `src/data/plain.ts` `toPlain()`
(JSON round-trip → plain, cloneable object; also strips `undefined`, matching the wire format),
applied to every `db.*.put` in the four repos and to the outbox writes (`outbox.enqueue` /
`recordWrite`). Regression test: `tests/unit/reactiveWrite.test.ts`.

## Phase 2 follow-ups

Phase 1 shipped (feature-flagged): repository seam + `__v`, offline core (Dexie + outbox + check-in
engine), D2 client ids, D1 advisory lock + offline grant, all four entity repos wired, and a sidebar
UI. The items below are deliberately deferred.

### Concurrency / conflict handling (the big one)

The checkout lock is **advisory only** — it blocks a *second offline checkout* (`409
PROJECT_CHECKED_OUT`) but does **not** freeze online editing. So while one person is offline, the rest
of the team keeps editing the live project normally. On check-in the Phase-1 policy is **field-level
last-write-wins favoring the offline device**, with the overwrites recorded in the check-in report.
That's acceptable for a small team working on mostly-disjoint equipment/issues, but the "single
writer" guarantee the design assumed isn't actually enforced. Options to strengthen it:

- **Warn online editors** that the project (or a specific record) is checked out for offline work —
  a passive banner, not a hard block, so the team can self-coordinate.
- **Interactive conflict resolution** instead of silent last-write-wins: on a check-in conflict,
  show the user both versions (theirs vs. the server's) and let them choose/merge per field, rather
  than auto-overwriting and only reporting it afterward.
- **Optional exclusive mode** — let checkout *also* soft-lock online edits (read-only for others)
  for teams that prefer a hard guarantee; heavier and more disruptive, so opt-in per project.
- **Deletion edge case** — an offline update to a record another user *deleted* online comes back
  404 on replay and currently stays queued/flagged; define explicit handling (drop, or resurrect).

### Other deferred items (from Phase-1 implementation + shakeout)

- **Grant at rest** — the offline grant is stored in plaintext IndexedDB; the design called for
  encryption. Consider scoping the redeemed token to the project rather than full user scope.
- **Photos offline (D4)** — activity/issue photo capture is unsupported offline
  (`OfflineUnsupportedError`); still tied to base64-in-Mongo, which needs the blob/SAS rework.
- **Offline-created issues have no `number`** until check-in (the server assigns it); UI shows a
  blank number in the meantime.
- **`Simulate offline` affordance** — a testing toggle currently visible in the sidebar control;
  hide it from non-testers (sub-flag) before a wider rollout.
- **Expired-token reconnect** (`ensureOnlineSession` → grant redeem) is wired and API-tested but was
  never exercised through a genuinely expired in-browser session end-to-end.
- **Actions optimistic locking** — actions still carry no `__v` (backend PATCH uses load-modify-save);
  finish the `__v` migration there.
