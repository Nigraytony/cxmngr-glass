// Feature flag for the offline beta. OFF by default so production is unchanged.
// Enable via build env (VITE_OFFLINE_ENABLED=true) or at runtime in devtools:
//   localStorage.setItem('offline.enabled', '1'); location.reload()
export function isOfflineEnabled(): boolean {
  try {
    if ((import.meta as any)?.env?.VITE_OFFLINE_ENABLED === 'true') return true
  } catch (_) { /* ignore */ }
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('offline.enabled') === '1') return true
  } catch (_) { /* ignore */ }
  return false
}
