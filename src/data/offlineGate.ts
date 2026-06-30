// Routing gate shared between the repositories and the offline store.
//
// Kept as a plain leaf module (NOT the Pinia store) to avoid an import cycle:
//   repository -> offline store -> checkout -> repository.
// The offline store pushes state in via the setters; repositories read
// useLocal() to decide whether an operation goes to IndexedDB + outbox or the
// network.
//
// Defaults — no checkout, online — make useLocal() always false, so the live
// app is unchanged until offline mode is explicitly activated by the store.

let checkedOutProjectId: string | null = null
let online: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true

export function setCheckedOutProject(id: string | null): void { checkedOutProjectId = id }
export function setOnline(value: boolean): void { online = value }
export function getCheckedOutProjectId(): string | null { return checkedOutProjectId }
export function isOnline(): boolean { return online }

// Route to the local (IndexedDB + outbox) path when a project is checked out,
// we're offline, and the operation targets that project (or is project-agnostic,
// e.g. a by-id read where only one project can be checked out at a time).
export function useLocal(projectId?: string): boolean {
  // During check-in replay every op must hit the network, regardless of the
  // connectivity flag — otherwise we'd re-write queued changes back to local.
  if (replaying) return false
  if (!checkedOutProjectId) return false
  if (online) return false
  if (projectId != null && String(projectId) !== String(checkedOutProjectId)) return false
  return true
}

// True while a project is checked out AND we're offline — used to suspend the
// idle-logout / hard redirect to /login so an offline session isn't torn down
// (and its queued edits lost). See http.ts.
export function isOfflineSessionActive(): boolean {
  return !!checkedOutProjectId && !online
}

// --- Failure-based offline fallback ---------------------------------------
//
// `navigator.onLine` / the browser online/offline events only report whether a
// network *interface* exists, not whether the server is actually reachable. A
// checked-out device that loses real connectivity but still reports "online"
// would otherwise keep hammering the dead network on every read/write. To stay
// robust we treat an actual request failure (no HTTP response) while checked
// out as the offline signal: flip the gate to offline and serve the local copy.
//
// `replaying` suppresses this during check-in. Replay runs while still checked
// out and (newly) online; a transient network error there must abort the sync
// so the op stays queued — NOT get silently re-written back into the local
// store. checkInProject toggles this around its replay loop.
let replaying = false
export function setReplaying(value: boolean): void { replaying = value }
export function isReplaying(): boolean { return replaying }

// A connectivity failure (request made, no response) vs. a server-side error
// (4xx/5xx, which DID answer and must not be masked by stale local data).
export function isNetworkFailure(e: any): boolean {
  if (!e) return false
  if (e.response) return false
  return Boolean(e.request) || e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED' || e.message === 'Network Error'
}

// Should a failed request transparently fall back to local data? Only when a
// project is checked out, we're not mid-check-in, and the failure was a genuine
// connectivity problem.
export function shouldFallBackToLocal(e: any): boolean {
  return !!checkedOutProjectId && !replaying && isNetworkFailure(e)
}

// Run a repository op against the network, transparently falling back to the
// local (IndexedDB + outbox) path when the project is checked out and the
// network is unreachable — even if `navigator.onLine` wrongly says we're up.
// `projectId` scopes the useLocal() short-circuit (a foreign project still goes
// to the network when we believe we're online).
export async function viaNetwork<T>(
  onlineFn: () => Promise<T>,
  localFn: () => Promise<T>,
  projectId?: string,
): Promise<T> {
  if (useLocal(projectId)) return localFn()
  try {
    return await onlineFn()
  } catch (e) {
    if (shouldFallBackToLocal(e)) {
      setOnline(false)
      return localFn()
    }
    throw e
  }
}

// Thrown for operations that genuinely cannot run offline (server-rendered
// reports, photo blob uploads — the latter pending design decision D4).
export class OfflineUnsupportedError extends Error {
  code = 'OFFLINE_UNSUPPORTED'
  constructor(message = 'This action is not available offline') {
    super(message)
    this.name = 'OfflineUnsupportedError'
  }
}
