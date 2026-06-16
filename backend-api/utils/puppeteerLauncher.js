/**
 * Centralized Puppeteer browser launcher.
 *
 * The backend deploy does NOT bundle Puppeteer's own Chromium
 * (PUPPETEER_SKIP_DOWNLOAD is set, and Puppeteer v21 caches Chrome outside
 * node_modules), so on the server we drive @sparticuz/chromium — a Chromium build
 * (with the required shared libs) that runs on Azure App Service / serverless Linux
 * — via puppeteer-core. The @sparticuz binary ships inside its npm package, so it is
 * part of the deployed node_modules.
 *
 * Resolution order for the Chrome executable:
 *   1. PUPPETEER_EXECUTABLE_PATH env (use a local/system Chrome — handy for dev)
 *   2. @sparticuz/chromium's bundled binary (extracted to /tmp at runtime)
 *   3. fall back to full `puppeteer` if it has a Chrome (legacy/dev)
 */

let _puppeteer
function getPuppeteer() {
  if (_puppeteer) return _puppeteer
  try {
    // eslint-disable-next-line global-require
    _puppeteer = require('puppeteer-core')
  } catch (e) {
    // eslint-disable-next-line global-require
    _puppeteer = require('puppeteer')
  }
  return _puppeteer
}

/**
 * Launch a headless Chromium browser. Throws if no Chrome can be located so callers
 * can surface a clear "renderer unavailable" error.
 * @param {string[]} extraArgs additional Chrome flags
 */
async function launchBrowser(extraArgs = []) {
  const puppeteer = getPuppeteer()

  let chromium = null
  try {
    // eslint-disable-next-line global-require
    chromium = require('@sparticuz/chromium')
  } catch (_) {
    /* not installed — will rely on full puppeteer / env path */
  }

  let executablePath = (process.env.PUPPETEER_EXECUTABLE_PATH || '').trim()
  if (!executablePath && chromium && typeof chromium.executablePath === 'function') {
    try { executablePath = await chromium.executablePath() } catch (_) { executablePath = '' }
  }

  const chromiumArgs = chromium && Array.isArray(chromium.args) ? chromium.args : []
  const args = Array.from(new Set([...chromiumArgs, '--no-sandbox', '--disable-setuid-sandbox', ...extraArgs]))

  let headless = true
  if (chromium && typeof chromium.headless !== 'undefined') headless = chromium.headless

  const opts = { headless, args }
  if (executablePath) opts.executablePath = executablePath
  return puppeteer.launch(opts)
}

module.exports = { launchBrowser }
