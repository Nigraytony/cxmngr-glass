// Electron main process (see docs/electron_pivot_plan.md).
//
// Serves the built Vite `dist/` over a custom `app://` protocol instead of
// `file://`. This keeps the app's ABSOLUTE asset paths (`/assets/…`) and the
// history-mode router working unchanged — no web build config change needed.
//
// Security (Phase 1): renderer `webSecurity` is ON. The renderer runs on the
// `app://bundle` origin, which the backend's CORS allowlist can't include and
// Azure Blob's CORS won't allow. Rather than disable webSecurity, we bridge CORS
// at the main-process (network) layer for the two hosts the app talks to:
//   1. strip the `Origin` header on the way out — the backend explicitly allows
//      requests with no Origin (`if (!origin) callback(null, true)`), i.e. treats
//      it as a trusted non-browser client (no spoofing), and Azure Blob SAS PUTs
//      don't need one;
//   2. inject the CORS response headers on the way back so the (secure) renderer
//      accepts the responses.
const { app, BrowserWindow, protocol, session, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')

const DIST = path.join(__dirname, '..', 'dist')
const SMOKE = process.env.ELECTRON_SMOKE === '1'
// Dev hot-reload: when set (e.g. http://localhost:5173), load the Vite dev
// server instead of the built dist. `npm run electron:dev` sets this.
const DEV_URL = process.env.ELECTRON_RENDERER_URL || ''
const RENDERER_ORIGIN = DEV_URL ? new URL(DEV_URL).origin : 'app://bundle'
const OPEN_DEVTOOLS = Boolean(DEV_URL) || process.env.ELECTRON_DEVTOOLS === '1'

// Hosts the renderer legitimately talks to cross-origin (bridged below).
const CORS_URL_PATTERNS = ['https://api.cxma.io/*', 'https://*.blob.core.windows.net/*']

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

// Replace any CORS headers the upstream set with ones the secure renderer
// accepts for its credentialed requests.
function applyCorsHeaders(responseHeaders) {
  const headers = {}
  for (const [k, v] of Object.entries(responseHeaders || {})) {
    if (!/^access-control-allow-(origin|credentials|methods|headers)$/i.test(k)) headers[k] = v
  }
  headers['Access-Control-Allow-Origin'] = [RENDERER_ORIGIN]
  headers['Access-Control-Allow-Credentials'] = ['true']
  headers['Access-Control-Allow-Methods'] = ['GET,POST,PUT,PATCH,DELETE,OPTIONS']
  headers['Access-Control-Allow-Headers'] = ['Content-Type,Authorization,X-CSRF-Token,x-ms-blob-type']
  return headers
}

function installCorsBridge() {
  const wr = session.defaultSession.webRequest
  // Strip Origin/Referer so the backend treats us as a trusted non-browser
  // client (it allows requests with no Origin) and Azure Blob doesn't reject us.
  wr.onBeforeSendHeaders({ urls: CORS_URL_PATTERNS }, (details, callback) => {
    const requestHeaders = { ...details.requestHeaders }
    delete requestHeaders.Origin
    delete requestHeaders.origin
    delete requestHeaders.Referer
    delete requestHeaders.referer
    callback({ requestHeaders })
  })
  // Inject CORS response headers so webSecurity:true accepts the responses.
  wr.onHeadersReceived({ urls: CORS_URL_PATTERNS }, (details, callback) => {
    callback({ responseHeaders: applyCorsHeaders(details.responseHeaders) })
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      webSecurity: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const wc = win.webContents
  if (OPEN_DEVTOOLS && !SMOKE) wc.openDevTools({ mode: 'detach' })
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

  if (DEV_URL) win.loadURL(DEV_URL)
  else win.loadURL('app://bundle/index.html')
}

app.whenReady().then(() => {
  protocol.handle('app', serve)
  installCorsBridge()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
