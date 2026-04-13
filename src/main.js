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
	let keepAliveTimer = null
	let idleTimer = null
	const KEEPALIVE_MIN_INTERVAL_MS = 5 * 60 * 1000
	const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000
	const ACTIVITY_DEBOUNCE_MS = 750

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

	const scheduleKeepAlive = () => {
		if (keepAliveTimer) return
		keepAliveTimer = setTimeout(async () => {
			keepAliveTimer = null
			try {
				const now = Date.now()
				if (now - lastKeepAliveAt < KEEPALIVE_MIN_INTERVAL_MS) return
				// Only attempt refresh if we believe there is a session to extend.
				if (!auth || !auth.accessToken) return
				lastKeepAliveAt = now
				await Promise.resolve(auth.refresh())
			} catch (e) {
				// ignore: refresh failures are handled when real API calls occur
			}
		}, ACTIVITY_DEBOUNCE_MS)
	}

	const handleActivity = () => {
		try {
			if (auth && typeof auth.markActivity === 'function') auth.markActivity()
		} catch (e) {
			// ignore
		}
		scheduleIdleLogout()
		scheduleKeepAlive()
	}

	if (typeof window !== 'undefined') {
		const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'focus']
		for (const ev of events) {
			window.addEventListener(ev, handleActivity, { passive: true })
		}
		scheduleIdleLogout()
	}
} catch (e) {
	// ignore
}
// Gantt plugin removed while the gantt view is disabled
app.mount('#app')
