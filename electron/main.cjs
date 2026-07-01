// Electron main process — Phase-0 POC (see docs/electron_pivot_plan.md).
//
// Serves the built Vite `dist/` over a custom `app://` protocol instead of
// `file://`. This keeps the app's ABSOLUTE asset paths (`/assets/…`) and the
// history-mode router working unchanged — no web build config change needed.
//
// POC scope only: no packaging, no signing, no auto-update. `webSecurity:false`
// is a POC shortcut to reach the remote API (api.cxma.io) without CORS setup;
// it MUST be replaced (proper CORS / same-origin proxy) before shipping.
const { app, BrowserWindow, protocol, session, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')

const DIST = path.join(__dirname, '..', 'dist')
const SMOKE = process.env.ELECTRON_SMOKE === '1'

// The renderer runs on the custom `app://` origin, which the backend's CORS
// allowlist doesn't (and shouldn't) include. For the POC, present API requests
// as coming from the real web origin the backend already trusts, so CORS +
// the double-submit CSRF flow behave exactly as they do on the web.
// Phase 1+ replaces this with a proper desktop auth story (see the pivot plan).
const API_ORIGIN = 'https://api.cxma.io'
const TRUSTED_WEB_ORIGIN = 'https://app.cxma.io'

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.map': 'application/json', '.txt': 'text/plain',
}

// Register BEFORE app is ready so the scheme is treated as standard + secure
// (absolute paths, fetch, service-worker-free, normal web behaviour).
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
])

async function serve(request) {
  const { pathname } = new URL(request.url)
  let rel = decodeURIComponent(pathname)
  if (!rel || rel === '/') rel = '/index.html'
  let filePath = path.normalize(path.join(DIST, rel))
  // Never escape the dist directory.
  if (!filePath.startsWith(DIST)) filePath = path.join(DIST, 'index.html')
  const ext = path.extname(filePath).toLowerCase()
  try {
    const data = await fs.readFile(filePath)
    return new Response(data, { headers: { 'content-type': MIME[ext] || 'application/octet-stream' } })
  } catch (e) {
    // SPA fallback only for extensionless route paths (e.g. /app/issues).
    // A missing file WITH an extension is a real 404 — don't serve HTML for a
    // .js/.css request (that would break module loading).
    if (ext) return new Response('Not found', { status: 404 })
    const html = await fs.readFile(path.join(DIST, 'index.html'))
    return new Response(html, { headers: { 'content-type': 'text/html' } })
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      webSecurity: false, // POC only — see header note
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const wc = win.webContents
  if (!SMOKE) wc.openDevTools({ mode: 'detach' })
  wc.on('did-finish-load', () => {
    console.log('[electron] renderer finished load:', wc.getURL())
    if (SMOKE) setTimeout(() => app.quit(), 1500)
  })
  wc.on('did-fail-load', (_e, code, desc, url) => {
    console.error('[electron] did-fail-load', code, desc, url)
    if (SMOKE) { process.exitCode = 1; setTimeout(() => app.quit(), 500) }
  })
  wc.on('console-message', (_e, level, message, line, sourceId) => {
    // Surface renderer errors/warnings in the main-process log.
    if (level >= 2) console.error('[renderer]', message, `(${sourceId}:${line})`)
  })
  // Open external links in the OS browser, not inside the app window.
  wc.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) { shell.openExternal(url); return { action: 'deny' } }
    return { action: 'allow' }
  })

  win.loadURL('app://bundle/index.html')
}

app.whenReady().then(() => {
  protocol.handle('app', serve)

  // Make API requests look like they come from the trusted web origin so the
  // backend's CORS allowlist + credentialed cookies accept them.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: [`${API_ORIGIN}/*`] },
    (details, callback) => {
      const headers = { ...details.requestHeaders, Origin: TRUSTED_WEB_ORIGIN, Referer: `${TRUSTED_WEB_ORIGIN}/` }
      callback({ requestHeaders: headers })
    },
  )

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
