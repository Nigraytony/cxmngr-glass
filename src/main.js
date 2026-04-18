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
				// Always try to extend the session. If the refresh token is still valid
				// (up to 30 days), silently renew and reschedule. Only a genuine network
				// or server error should land here — in that case, reschedule anyway and
				// let the 401 interceptor handle actual session expiry on the next API call.
				// We intentionally never call expireSession() from this timer: forced logout
				// is only triggered by a real 401 from the server, not by a client-side clock.
				if (typeof auth.staySignedIn === 'function') {
					try { await auth.staySignedIn() } catch (e) { /* ignore */ }
				}
				scheduleIdleLogout()
				scheduleSessionWarning()
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
				// Fall back to now when lastActivityAt hasn't been set yet (e.g. fresh
			// browser session where sessionStorage was cleared). Without this, the
			// warning would silently never schedule while the idle-logout timer still runs.
			const last = Number(auth.lastActivityAt || 0) || Date.now()
			const deadlineAt = last + INACTIVITY_TIMEOUT_MS
			const warnAt = deadlineAt - SESSION_WARNING_LEAD_MS
			const delay = Math.max(0, warnAt - Date.now())
			sessionWarningTimer = setTimeout(() => {
				try {
					if (!auth || !auth.isAuthenticated) return
					// Use the latest recorded activity time if available, but fall back to
					// the `last` value captured at schedule time (which itself falls back to
					// Date.now()). Without this fallback, a fresh session where
					// lastActivityAt is still 0 would compute a 1970-era deadline, making
					// `remaining` hugely negative and silently suppressing the warning.
					const latestLast = Number(auth.lastActivityAt || 0) || last
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
			// Do NOT gate on isInactiveExceeded() — when lastActivityAt is 0 (fresh session or
			// sessionStorage cleared), isInactiveExceeded() returns true and blocks the keepalive
			// from ever running, causing the access token to expire and the user to be logged out.
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
			// While the session-expiring-soon modal is open, require an explicit
			// click on "Stay signed in" or "Log out" to dismiss it. Any passive
			// activity (a stray mousemove / keydown / focus change) must NOT
			// silently reset the inactivity clock or hide the modal — otherwise
			// the user never gets a chance to make the decision.
			if (auth && auth.sessionWarningOpen) return
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
				// Treat returning to the tab as activity so the inactivity clock
				// resets from now, not from whenever the user last interacted
				// before backgrounding the tab — unless the session warning is
				// already open, in which case keep it visible until they click.
				try {
					if (auth && auth.sessionWarningOpen) return
					if (auth && typeof auth.markActivity === 'function') auth.markActivity()
					if (auth && typeof auth.hideSessionWarning === 'function') auth.hideSessionWarning()
				} catch (e) { /* ignore */ }
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
