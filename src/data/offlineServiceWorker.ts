// Registers the PWA service worker that precaches the app's built JS/CSS/font
// chunks so the code-split SPA can load any route offline. WITHOUT this, a
// checked-out browser that goes offline fails to fetch the route chunk
// (ERR_INTERNET_DISCONNECTED) before any app code — including the offline data
// layer — can run.
//
// Gated on purpose: only called for devices that opted into the offline beta
// (see the offline store), so production caching behaviour is unchanged for
// everyone else. The SW file itself is built for all (vite.config.js) but does
// nothing until registered here.

let registered = false

export async function registerOfflineServiceWorker(): Promise<void> {
  if (registered) return
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  registered = true
  try {
    // Virtual module provided by vite-plugin-pwa. Dynamic import keeps it out of
    // the main bundle for users who never enable offline.
    const { registerSW } = await import('virtual:pwa-register')
    // immediate: start precaching as soon as offline is enabled (while online),
    // so the assets are cached before the user actually goes offline.
    // autoUpdate (vite.config) + skipWaiting/clientsClaim means new deploys
    // refresh the cache without the user getting stuck on a stale bundle.
    registerSW({ immediate: true })
  } catch (e) {
    registered = false
    // eslint-disable-next-line no-console
    console.warn('[offline] service worker registration failed', e)
  }
}

// Tear down the SW + its caches when a device opts back OUT of the offline beta,
// so it doesn't keep intercepting that user's requests.
export async function unregisterOfflineServiceWorker(): Promise<void> {
  registered = false
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => /workbox|precache|cxma/i.test(k)).map((k) => caches.delete(k)))
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[offline] service worker unregister failed', e)
  }
}
