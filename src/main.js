import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/base.css'
import { useAuthStore } from './stores/auth'

// Ensure history.state isn't accidentally nulled by external scripts/extensions
// If state is missing, initialize it by preserving current values
if (typeof window !== 'undefined') {
	const { history, location, document } = window
	if (history && history.state == null) {
		try {
			history.replaceState(history.state ?? {}, document.title, location.pathname + location.search + location.hash)
		} catch (e) {
			// no-op: best effort to preserve state
		}
	}
}

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
// Auth bootstrap: refresh cookie -> access token -> /me
try {
	const auth = useAuthStore(pinia)
	// Never allow bootstrap failures (e.g., 401 on refresh when logged out)
	// to surface as unhandled promise rejections.
	Promise.resolve(auth.bootstrap()).catch(() => {})

	// Keep the session alive while the user is actively using the app,
	// and require re-login only after 15 minutes of inactivity.
	let lastKeepAliveAt = 0
	let keepAliveInFlight = false
	let keepAliveInterval = null
	let idleTimer = null
	let sessionWarningTimer = null
	const KEEPALIVE_CHECK_INTERVAL_MS = 30 * 1000
	const KEEPALIVE_FALLBACK_INTERVAL_MS = 2 * 60 * 1000
	const KEEPALIVE_EXPIRY_BUFFER_MS = 90 * 1000
	const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000
	const SESSION_WARNING_LEAD_MS = 60 * 1000

	const scheduleIdleLogout = () => {
		if (idleTimer) clearTimeout(idleTimer)
		idleTimer = setTimeout(async () => {
			try {
				if (!auth || !auth.isAuthenticated) return
				if (typeof auth.isInactiveExceeded === 'function' && !auth.isInactiveExceeded()) return
				if (typeof auth.expireSession === 'function') await auth.expireSession('inactive')
				if (window.location && window.location.pathname !== '/login') {
					window.location.assign('/login')
				}
			} catch (e) {
				// ignore
			}
		}, INACTIVITY_TIMEOUT_MS)
	}

	const scheduleSessionWarning = () => {
		if (sessionWarningTimer) clearTimeout(sessionWarningTimer)
		try {
			if (!auth || !auth.isAuthenticated) {
				if (typeof auth.hideSessionWarning === 'function') auth.hideSessionWarning()
				return
			}
			const last = Number(auth.lastActivityAt || 0)
			if (!last) return
			const deadlineAt = last + INACTIVITY_TIMEOUT_MS
			const warnAt = deadlineAt - SESSION_WARNING_LEAD_MS
			const delay = Math.max(0, warnAt - Date.now())
			sessionWarningTimer = setTimeout(() => {
				try {
					if (!auth || !auth.isAuthenticated) return
					const latestLast = Number(auth.lastActivityAt || 0)
					const latestDeadline = latestLast + INACTIVITY_TIMEOUT_MS
					const remaining = latestDeadline - Date.now()
					if (remaining <= 0) return
					if (typeof auth.showSessionWarning === 'function') auth.showSessionWarning(latestDeadline)
				} catch (e) {
					// ignore
				}
			}, delay)
		} catch (e) {
			// ignore
		}
	}

	const isDocumentVisible = () => {
		try {
			return typeof document === 'undefined' || document.visibilityState !== 'hidden'
		} catch (e) {
			return true
		}
	}

	const shouldRefreshSession = (now = Date.now()) => {
		try {
			if (!auth || !auth.isAuthenticated || !auth.accessToken) return false
			if (!isDocumentVisible()) return false
			if (typeof auth.isInactiveExceeded === 'function' && auth.isInactiveExceeded(now)) return false
			if (typeof auth.willAccessTokenExpireSoon === 'function' && auth.willAccessTokenExpireSoon(KEEPALIVE_EXPIRY_BUFFER_MS, now)) return true
			return now - lastKeepAliveAt >= KEEPALIVE_FALLBACK_INTERVAL_MS
		} catch (e) {
			return false
		}
	}

	const runKeepAlive = async () => {
		if (keepAliveInFlight) return
		const now = Date.now()
		if (!shouldRefreshSession(now)) return
		keepAliveInFlight = true
		try {
			lastKeepAliveAt = now
			const ok = await Promise.resolve(auth.refresh())
			if (!ok) lastKeepAliveAt = 0
		} catch (e) {
			lastKeepAliveAt = 0
			// ignore: refresh failures are handled by the 401 interceptor on real API calls
		} finally {
			keepAliveInFlight = false
		}
	}

	const ensureKeepAliveLoop = () => {
		if (keepAliveInterval) return
		keepAliveInterval = setInterval(() => {
			runKeepAlive().catch(() => {})
		}, KEEPALIVE_CHECK_INTERVAL_MS)
	}

	const handleActivity = () => {
		try {
			if (auth && typeof auth.markActivity === 'function') auth.markActivity()
			if (auth && typeof auth.hideSessionWarning === 'function') auth.hideSessionWarning()
		} catch (e) {
			// ignore
		}
		scheduleIdleLogout()
		scheduleSessionWarning()
		runKeepAlive().catch(() => {})
	}

	if (typeof window !== 'undefined') {
		const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'focus', 'pointerdown', 'input', 'change']
		for (const ev of events) {
			window.addEventListener(ev, handleActivity, { passive: true })
		}
		document.addEventListener('visibilitychange', () => {
			if (isDocumentVisible()) {
				scheduleIdleLogout()
				scheduleSessionWarning()
				runKeepAlive().catch(() => {})
			}
		})
		scheduleIdleLogout()
		scheduleSessionWarning()
		ensureKeepAliveLoop()
	}
} catch (e) {
	// ignore
}
// Gantt plugin removed while the gantt view is disabled
app.mount('#app')
