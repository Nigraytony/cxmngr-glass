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

// Thrown for operations that genuinely cannot run offline (server-rendered
// reports, photo blob uploads — the latter pending design decision D4).
export class OfflineUnsupportedError extends Error {
  code = 'OFFLINE_UNSUPPORTED'
  constructor(message = 'This action is not available offline') {
    super(message)
    this.name = 'OfflineUnsupportedError'
  }
}
