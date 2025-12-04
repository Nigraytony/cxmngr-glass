import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/base.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
// Gantt plugin removed while the gantt view is disabled
app.mount('#app')
