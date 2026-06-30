// Offline state store (Phase 1 — see docs/offline_phase1_design.md).
//
// Exposes connectivity, checkout status, and the pending-edit count, plus thin
// wrappers over the checkout engine. This store is INERT until init() is
// called — nothing in app boot wires it yet, so importing it has no effect on
// the online app.
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { outbox } from '../data/outbox'
import { setCheckedOutProject, setOnline } from '../data/offlineGate'
import { isOfflineEnabled, setOfflineEnabled } from '../data/offlineFeature'
import { registerOfflineServiceWorker, unregisterOfflineServiceWorker } from '../data/offlineServiceWorker'
import { getDeviceId } from '../data/deviceId'
import { acquireCheckout, releaseCheckout, redeemGrant } from '../data/checkoutClient'
import { useAuthStore } from './auth'
import {
  checkoutProject,
  checkInProject,
  discardCheckout,
  getCheckoutMeta,
  type CheckInReport,
  type CheckoutSummary,
} from '../data/checkout'

export const useOfflineStore = defineStore('offline', () => {
  // Per-device beta opt-in (the `offline.enabled` flag), reactive so the
  // settings toggle shows/hides the sidebar control without a reload.
  const featureEnabled = ref(isOfflineEnabled())
  function setFeatureEnabled(on: boolean) {
    setOfflineEnabled(on)
    featureEnabled.value = on
    // Install/tear down the asset-precaching service worker alongside the flag,
    // so the SW only ever runs for opt-in beta devices.
    if (on) registerOfflineServiceWorker().catch(() => {})
    else unregisterOfflineServiceWorker().catch(() => {})
  }

  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const checkedOutProjectId = ref<string | null>(null)
  const checkedOutAt = ref<number | null>(null)
  const pendingCount = ref(0)
  const syncing = ref(false)

  const isCheckedOut = computed(() => !!checkedOutProjectId.value)

  function handleOnline() { isOnline.value = true; setOnline(true) }
  function handleOffline() { isOnline.value = false; setOnline(false) }

  // Manually force connectivity state (beta UI affordance for testing offline
  // mode without dropping the real network).
  function setSimulatedOffline(off: boolean) {
    isOnline.value = !off
    setOnline(!off)
  }

  let listening = false
  function startListening() {
    if (listening || typeof window === 'undefined') return
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    listening = true
  }
  function stopListening() {
    if (!listening || typeof window === 'undefined') return
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    listening = false
  }

  // Re-read checkout meta + pending count from IndexedDB, keeping the routing
  // gate in sync so repositories pick the right backend.
  async function refresh() {
    const meta = await getCheckoutMeta()
    checkedOutProjectId.value = meta?.projectId ?? null
    checkedOutAt.value = meta?.checkedOutAt ?? null
    pendingCount.value = await outbox.count()
    setCheckedOutProject(checkedOutProjectId.value)
  }

  async function init() {
    setOnline(isOnline.value)
    startListening()
    // Precache the app shell so route chunks load offline. init() only runs
    // when the offline beta is enabled, so this stays scoped to opt-in devices.
    registerOfflineServiceWorker().catch(() => {})
    await refresh()
  }

  // Acquire the server-side lock + offline grant, then hydrate local data.
  // Requires the network and a valid session (it's the online entry point).
  async function checkout(projectId: string): Promise<CheckoutSummary> {
    const deviceId = getDeviceId()
    const grant = await acquireCheckout(projectId, deviceId)
    const summary = await checkoutProject(projectId, {
      grant: { deviceId, grant: grant.grant, grantExpiresAt: new Date(grant.expiresAt).getTime() },
    })
    await refresh()
    return summary
  }

  // If our access token lapsed during the offline session, redeem the stored
  // grant for a fresh one before any networked check-in work.
  async function ensureOnlineSession(): Promise<void> {
    const auth = useAuthStore()
    const tokenLive = auth.isAuthenticated && !auth.willAccessTokenExpireSoon(0)
    if (tokenLive) return
    const meta = await getCheckoutMeta()
    if (!meta?.grant) return
    try {
      const data = await redeemGrant(meta.grant)
      auth.applyRedeemedSession(data)
    } catch (_) {
      // Fall through — the normal refresh-cookie path may still authenticate.
    }
  }

  // Drain the outbox to the server. On a clean drain (nothing left), release the
  // server lock and clear the local copy, ending the offline session.
  async function checkIn(): Promise<CheckInReport> {
    syncing.value = true
    try {
      await ensureOnlineSession()
      const report = await checkInProject()
      if (report.remaining === 0 && !report.aborted) {
        const pid = checkedOutProjectId.value
        if (pid) {
          try { await releaseCheckout(pid) } catch (_) { /* lock will expire if release fails */ }
        }
        await discardCheckout()
      }
      await refresh()
      return report
    } finally {
      syncing.value = false
    }
  }

  // Abandon offline changes: release the server lock (best-effort) and wipe the
  // local copy + queue.
  async function discard(): Promise<void> {
    const pid = checkedOutProjectId.value
    if (pid) {
      try { await releaseCheckout(pid) } catch (_) { /* best-effort */ }
    }
    await discardCheckout()
    await refresh()
  }

  return {
    featureEnabled,
    setFeatureEnabled,
    isOnline,
    checkedOutProjectId,
    checkedOutAt,
    pendingCount,
    syncing,
    isCheckedOut,
    init,
    refresh,
    startListening,
    stopListening,
    setSimulatedOffline,
    checkout,
    checkIn,
    discard,
  }
})
