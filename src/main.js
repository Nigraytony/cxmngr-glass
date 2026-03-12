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
	auth.bootstrap()
} catch (e) {
	// ignore
}
// Gantt plugin removed while the gantt view is disabled
app.mount('#app')
