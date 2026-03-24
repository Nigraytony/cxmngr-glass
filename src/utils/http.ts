import { api } from './api'
import { useUiStore } from '../stores/ui'
import { useAuthStore } from '../stores/auth'

export const http = api

// Single-flight refresh to avoid multiple concurrent refresh calls.
let refreshInFlight: Promise<boolean> | null = null
async function refreshOnce(auth: any): Promise<boolean> {
  if (!auth || typeof auth.refresh !== 'function') return false
  if (!refreshInFlight) {
    refreshInFlight = Promise.resolve()
      .then(() => auth.refresh())
      .then((ok: any) => Boolean(ok))
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

let lastPlanLimitToastAt = 0
function maybeShowPlanLimitToast(payload?: any) {
  const now = Date.now()
  if (now - lastPlanLimitToastAt < 10_000) return
  lastPlanLimitToastAt = now

  const code = payload?.code || payload?.errorCode
  const resource = payload?.resource ? String(payload.resource) : ''
  const msg =
    code === 'PLAN_LIMIT_REACHED'
      ? `Plan limit reached${resource ? ` for ${resource}` : ''}. Upgrade your project subscription to continue.`
      : 'Subscription required or payment needed. Update your project subscription to continue.'

  try {
    const ui = useUiStore()
    ui.showWarning(msg, { duration: 10_000 })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(msg)
  }
}

let lastSessionExpiredToastAt = 0
function markSessionExpired() {
  const now = Date.now()
  if (now - lastSessionExpiredToastAt < 10_000) return
  lastSessionExpiredToastAt = now
  try { sessionStorage.setItem('auth.sessionExpired', '1') } catch (e) { /* ignore */ }
}

function isAuthEndpoint(url: string) {
  const u = String(url || '')
  return (
    u.includes('/api/users/login') ||
    u.includes('/api/users/register') ||
    u.includes('/api/users/refresh') ||
    u.includes('/api/users/logout') ||
    u.includes('/api/users/forgot') ||
    u.includes('/api/users/reset')
  )
}

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    try {
      const status = err?.response?.status
      const payload = err?.response?.data
      const url = String(err?.config?.url || '')
      const originalRequest = err?.config || {}

      // If the API says we're not authorized and we currently have a token,
      // attempt a refresh and retry once before treating it as session expiry.
      if (status === 401 && !isAuthEndpoint(url)) {
        const auth = (() => {
          try { return useAuthStore() } catch (e) { return null }
        })()

        const alreadyRetried = Boolean((originalRequest as any)._retry)
        const hasToken = Boolean(auth && (auth.accessToken || auth.isAuthenticated))

        if (auth && hasToken && !alreadyRetried) {
          ;(originalRequest as any)._retry = true

          const ok = await refreshOnce(auth)
          if (ok) {
            try {
              // Ensure the retried request uses the latest token.
              const token = auth.accessToken
              if (token) {
                originalRequest.headers = { ...(originalRequest.headers || {}), Authorization: `Bearer ${token}` }
              }
            } catch (e) {
              // ignore
            }
            return http.request(originalRequest)
          }
        }

        // Refresh failed (or we couldn't refresh): treat it as a real session expiry.
        if (auth && hasToken) {
          markSessionExpired()
          try { auth.clearSession() } catch (e) { /* ignore */ }
          try {
            if (typeof window !== 'undefined' && window.location && window.location.pathname !== '/login') {
              window.location.assign('/login')
            }
          } catch (e) {
            // ignore
          }
        }
      }

      if (status === 402 || payload?.code === 'PLAN_LIMIT_REACHED') {
        maybeShowPlanLimitToast(payload)
      }
    } catch (e) {
      // ignore
    }
    return Promise.reject(err)
  }
)

export default http
