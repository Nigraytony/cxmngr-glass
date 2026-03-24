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

	// Keep the session alive while the user is actively using the app.
	// This is intentionally lightweight + throttled to avoid extra load.
	let lastKeepAliveAt = 0
	let keepAliveTimer = null
	const KEEPALIVE_MIN_INTERVAL_MS = 5 * 60 * 1000
	const ACTIVITY_DEBOUNCE_MS = 750

	function scheduleKeepAlive() {
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

	if (typeof window !== 'undefined') {
		const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
		for (const ev of events) {
			window.addEventListener(ev, scheduleKeepAlive, { passive: true })
		}
	}
} catch (e) {
	// ignore
}
// Gantt plugin removed while the gantt view is disabled
app.mount('#app')
