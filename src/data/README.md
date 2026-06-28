# `src/data` — data-access + offline core

This directory holds the **repository layer** (the seam between Pinia stores and
the network) and the **offline core** (IndexedDB + outbox + checkout engine).
Design rationale lives in [`docs/offline_phase1_design.md`](../../docs/offline_phase1_design.md).

## Repositories (live, online today)

Each Phase-1 entity has a repository that the matching Pinia store calls instead
of hitting `http.*` directly:

- `activitiesRepository.ts`, `issuesRepository.ts`, `equipmentRepository.ts`, `actionsRepository.ts`
- `optimistic.ts` — shared `__v` optimistic-concurrency helpers (`withVersion`, `staleVersionConflict`).

Repositories return raw server payloads; stores keep normalization, in-memory
state, and logging. This is the single place a local/offline path will plug in.

## Offline core (built, NOT yet wired)

- `db.ts` — Dexie schema: entity tables (`activities`, `issues`, `equipment`,
  `actions`, `projects`), `photos` (blobs), the `outbox`, and `meta` (checkout row).
- `clientId.ts` — client-generated, ObjectId-compatible `_id`s so offline creates
  have a valid id before the server sees them (design decision D2).
- `outbox.ts` — ordered queue of pending offline mutations (`enqueue`/`all`/`forProject`/`count`/`remove`/`clear`).
- `checkout.ts` — `checkoutProject()` hydrates a project's entities into IndexedDB;
  `checkInProject()` replays the outbox back through the repositories with the
  Phase-1 conflict policy (last-write-wins + surfaced report); `discardCheckout()`.
- `../stores/offline.ts` — Pinia store: online/offline status, checkout state,
  pending count, and thin wrappers over the engine. **Inert until `init()` is called.**

### Routing gate

`offlineGate.ts` is a leaf module (no internal imports) holding the routing
state, so repositories can read it without the cycle
`repository -> offline store -> checkout -> repository`. The offline store pushes
state in (`setCheckedOutProject`, `setOnline`); repositories call
`useLocal(projectId?)`, which is true only when a project is checked out AND
we're offline AND the op targets that project. Defaults make it always false, so
the live app is unchanged until offline mode is activated.

### Status: all four Phase-1 repositories wired

`activities`, `issues`, `equipment`, and `actions` repositories all route through
the gate:
- **reads** (`list`/`get`) → IndexedDB when `useLocal()`,
- **writes** (`create`/`update`/`remove`) → IndexedDB + a coalesced `outbox` op
  (`outbox.recordWrite`), using `clientId` for creates,
- **offline-only gaps**: activity photo upload + report and equipment server-side
  duplicate throw `OfflineUnsupportedError` (equipment's store then falls back to
  a local-create copy; photos are deferred to D4).

Notes per entity: offline-created **issues** have no server `number` until
check-in; **actions** carry no `__v` (optimistic locking still deferred there).

### Trying it (feature-flagged, OFF by default)

`offlineFeature.ts` gates the whole UI. Enable in devtools and reload:

```js
localStorage.setItem('offline.enabled', '1'); location.reload()
```

A small panel (bottom-left, `components/OfflinePanel.vue`) then lets you check
out the selected project, toggle a simulated-offline state, make activity edits
(which queue), and check in. With the flag off, nothing mounts or initializes —
production is untouched. Still missing for a real (non-simulated) offline
session: the backend checkout/check-in endpoints + offline auth (D1).

Backend support for **client-supplied `_id`s (D2) is done** — the four create
routes accept a validated client `_id` with idempotent replay (see
`backend-api/utils/clientId.js`).

**D1 is done, both halves.** Backend: `POST /api/projects/:id/checkout` (advisory
lock + offline grant), `POST /api/projects/:id/checkin` (release + revoke),
`POST /api/users/offline-grant/redeem` (grant → fresh access token), gated by the
`DISABLE_OFFLINE_SYNC` kill switch. Frontend:
- `deviceId.ts` — stable per-browser id (localStorage), bound to the grant.
- `checkoutClient.ts` — `acquireCheckout` / `releaseCheckout` / `redeemGrant`.
- the offline store's `checkout()` acquires the lock+grant then hydrates; the
  grant is persisted in the IndexedDB `meta` row.
- `checkIn()` redeems the grant first if the access token lapsed
  (`ensureOnlineSession`), drains the outbox, then on a clean drain releases the
  lock and clears local state.
- `discard()` releases the lock (best-effort) before wiping local state.
- `http.ts` suppresses the hard `/login` redirect while
  `isOfflineSessionActive()` (preserving queued edits), surfacing the re-auth
  modal instead.

Remaining hardening (not blockers for the beta): the grant is stored in plaintext
IndexedDB (design doc calls for encryption); photos offline (D4); offline issues
show no `number` until check-in.

## Tests

`tests/unit/{clientId,outbox,checkout}.test.ts` — the Dexie-backed tests use
`fake-indexeddb` (dev dependency) via `import 'fake-indexeddb/auto'`.
