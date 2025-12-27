import axios from 'axios'
import { getApiBase } from './api'
import { getAuthHeaders } from './auth'
import { useUiStore } from '../stores/ui'

export const http = axios.create({
  baseURL: getApiBase(),
})

// Attach auth header automatically to every request when available
http.interceptors.request.use((config) => {
  try {
    config.headers = { ...(config.headers || {}), ...getAuthHeaders() }
  } catch (e) {
    // ignore
  }
  return config
}, (err) => Promise.reject(err))

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

http.interceptors.response.use(
  (res) => res,
  (err) => {
    try {
      const status = err?.response?.status
      const payload = err?.response?.data
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
