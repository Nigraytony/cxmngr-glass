// Graceful shutdown handler for SIGTERM / SIGINT.
//
// Audit finding B-O2: the server had no SIGTERM handler, so any Azure
// App Service restart (deploy, plan move, autoscale) yanked the process
// while requests were still in-flight — Stripe webhooks half-written,
// Mongoose writes mid-flush, PDF renders abandoned.
//
// Order on signal:
//   1. server.close() — stop accepting new connections, wait for current
//      requests to finish naturally.
//   2. mongoose.disconnect() — close DB connections cleanly so the
//      cluster sees a graceful disconnect.
//   3. observability.flush() — ship any pending Sentry events.
//   4. process.exit(code)
//
// Total budget: 25 seconds. Azure App Service sends SIGTERM and then
// SIGKILL ~30s later; 25s gives us a small safety margin for the exit
// callback to run.

const mongoose = require('mongoose')
const observability = require('./observability')

const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 25000)

let shuttingDown = false

function installShutdownHandlers(server, opts = {}) {
  if (!server) {
    console.warn('[shutdown] no server provided; signal handlers not installed')
    return
  }
  const onShutdown = (signal) => {
    if (shuttingDown) {
      console.warn(`[shutdown] received ${signal} during shutdown; ignoring`)
      return
    }
    shuttingDown = true
    console.info(`[shutdown] received ${signal}, draining...`)

    // Hard kill if anything below hangs longer than the budget.
    const hardKill = setTimeout(() => {
      console.error(`[shutdown] timed out after ${SHUTDOWN_TIMEOUT_MS}ms; forcing exit`)
      try { observability.captureException(new Error('shutdown timeout')) } catch (_) { /* ignore */ }
      process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS)
    hardKill.unref()

    server.close(async (err) => {
      let exitCode = 0
      if (err) {
        console.error('[shutdown] server.close error:', err && err.message ? err.message : err)
        exitCode = 1
      } else {
        console.info('[shutdown] http server closed')
      }
      try {
        await mongoose.disconnect()
        console.info('[shutdown] mongoose disconnected')
      } catch (e) {
        console.error('[shutdown] mongoose disconnect error:', e && e.message ? e.message : e)
        exitCode = 1
      }
      try {
        await observability.flush(2000)
      } catch (_) { /* ignore */ }
      clearTimeout(hardKill)
      if (typeof opts.onBeforeExit === 'function') {
        try { await opts.onBeforeExit() } catch (_) { /* ignore */ }
      }
      process.exit(exitCode)
    })
  }

  process.on('SIGTERM', () => onShutdown('SIGTERM'))
  process.on('SIGINT', () => onShutdown('SIGINT'))
  console.info('[shutdown] SIGTERM/SIGINT handlers installed')
}

function _resetForTests() { shuttingDown = false }

module.exports = { installShutdownHandlers, _resetForTests }
