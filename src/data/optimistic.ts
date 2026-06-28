// Shared optimistic-concurrency helpers for the data-access repository layer
// (offline Phase 1 — see docs/offline_phase1_design.md).
//
// The backend (backend-api/utils/optimisticLock.js) checks a client-supplied
// `__v` and returns 409 with `{ code: 'STALE_VERSION', current, currentVersion }`
// when the version is stale. These helpers keep that wire contract in one place
// so every repository handles it identically.

export interface UpdateOptions {
  // When a finite number, sent as `__v` for optimistic concurrency control.
  // When null/undefined, no version is sent (back-compat last-write-wins).
  expectedVersion?: number | null
}

export interface UpdateResult {
  ok: boolean
  conflict?: boolean
  data?: any
  // Populated on a 409 STALE_VERSION conflict.
  current?: any
  currentVersion?: number | null
}

// Returns a copy of `payload` with `__v` set when a finite version is supplied.
export function withVersion(payload: any, expectedVersion?: number | null): any {
  const body = { ...payload }
  if (typeof expectedVersion === 'number' && Number.isFinite(expectedVersion)) {
    body.__v = expectedVersion
  }
  return body
}

// Maps a thrown Axios error to a conflict UpdateResult, or null if it isn't a
// STALE_VERSION 409 (caller should rethrow in that case).
export function staleVersionConflict(e: any): UpdateResult | null {
  if (e?.response?.status === 409 && e?.response?.data?.code === 'STALE_VERSION') {
    return {
      ok: false,
      conflict: true,
      current: e.response.data.current,
      currentVersion: e.response.data.currentVersion ?? null,
    }
  }
  return null
}
