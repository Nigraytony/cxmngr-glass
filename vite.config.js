import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    // Service worker for offline support. The SW is BUILT for everyone but only
    // REGISTERED for devices that opted into the offline beta (see
    // src/data/offlineServiceWorker.ts + the offline store) — so production
    // caching behaviour is unchanged for everyone else.
    //
    // It precaches the app's hashed JS/CSS/font chunks so the code-split SPA can
    // load any route offline (the bug: route chunks are fetched on first
    // navigation and fail with ERR_INTERNET_DISCONNECTED when offline).
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // we register manually, gated on the offline beta flag
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf}'],
        // Serve cached index.html for SPA route navigations while offline...
        navigateFallback: '/index.html',
        // ...but never for the API (different origin anyway) or the SW itself.
        navigateFallbackDenylist: [/^\/api/, /^\/assets\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Largest single chunk (html-to-docx) is ~1.7MB; give headroom.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'CxMA',
        short_name: 'CxMA',
        start_url: '/app',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
