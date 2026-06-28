// Stable per-browser device id for offline checkout (Phase 1, decision D1).
// The backend binds an offline grant to this id, so it must persist across
// reloads — localStorage, generated once.
import { newObjectId } from './clientId'

const KEY = 'offline.deviceId'

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(KEY)
    if (existing) return existing
    const id = newObjectId()
    localStorage.setItem(KEY, id)
    return id
  } catch (_) {
    // No localStorage (private mode, SSR) — fall back to an ephemeral id.
    return newObjectId()
  }
}
