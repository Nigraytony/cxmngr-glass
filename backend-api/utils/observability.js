// Error tracking / observability wiring.
//
// Audit finding B-O1: no error-tracking SDK anywhere in the codebase.
// When something blew up in prod the only signal was a customer support
// email. This module wraps `@sentry/node` so init, request middleware,
// error middleware, and shutdown flush behave correctly whether or not
// SENTRY_DSN is configured.
//
// Design rules:
//   - Never throw from observability code. Telemetry failures must not
//     break the request that triggered them.
//   - If SENTRY_DSN is empty: every helper here is a no-op. No package
//     load, no perf overhead. Dev tooling and CI run with no setup.
//   - If `@sentry/node` is not installed: caught and logged, helpers
//     degrade to no-ops. Keeps the dep effectively optional.

let SentryInstance = null
let initialized = false

function noopMiddleware(req, res, next) { return next() }
function noopErrorMiddleware(err, req, res, next) { return next(err) }

function initSentry(env = process.env) {
  if (initialized) return SentryInstance
  initialized = true

  const dsn = env.SENTRY_DSN && String(env.SENTRY_DSN).trim()
  if (!dsn) {
    // Only log in prod — dev/test would just be noise.
    if (String(env.NODE_ENV || '').toLowerCase() === 'production') {
      console.info('[observability] SENTRY_DSN not set; error tracking disabled.')
    }
    return null
  }

  let Sentry
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Sentry = require('@sentry/node')
  } catch (e) {
    console.warn('[observability] @sentry/node not installed; skipping init.', e && e.message)
    return null
  }

  try {
    Sentry.init({
      dsn,
      environment: env.NODE_ENV || 'unknown',
      release: env.SENTRY_RELEASE || undefined,
      // Default to 0 (errors only). Operators opt in to perf traces.
      tracesSampleRate: Number(env.SENTRY_TRACES_SAMPLE_RATE || 0),
      // We populate user/extra explicitly — never let the SDK silently
      // attach IPs, cookies, or headers.
      sendDefaultPii: false,
    })
    SentryInstance = Sentry
    console.info('[observability] Sentry initialized.')
    return Sentry
  } catch (e) {
    console.warn('[observability] Sentry.init threw; tracking disabled.', e && e.message)
    return null
  }
}

function getSentry() { return SentryInstance }

// Use these instead of Sentry.Handlers.* directly so call sites stay
// agnostic to whether Sentry is wired up.
function requestHandler() {
  if (!SentryInstance || !SentryInstance.Handlers) return noopMiddleware
  try { return SentryInstance.Handlers.requestHandler() } catch (_) { return noopMiddleware }
}

function errorHandler() {
  if (!SentryInstance || !SentryInstance.Handlers) return noopErrorMiddleware
  try { return SentryInstance.Handlers.errorHandler() } catch (_) { return noopErrorMiddleware }
}

function captureException(err, extra) {
  if (!SentryInstance) return
  try {
    SentryInstance.withScope((scope) => {
      if (extra && typeof extra === 'object') {
        for (const [k, v] of Object.entries(extra)) {
          try { scope.setExtra(k, v) } catch (_) { /* ignore */ }
        }
      }
      SentryInstance.captureException(err)
    })
  } catch (_) { /* never let telemetry throw */ }
}

// Wait for in-flight events to ship before the process exits. Used by the
// graceful-shutdown handler. Resolves with `true` on success, `false` on
// timeout — never rejects.
function flush(timeoutMs = 2000) {
  if (!SentryInstance) return Promise.resolve(true)
  try {
    return SentryInstance.flush(timeoutMs).catch(() => false)
  } catch (_) {
    return Promise.resolve(false)
  }
}

// Reset internal state. ONLY for tests — otherwise initSentry's idempotent
// guard would prevent re-init after the first call.
function _resetForTests() {
  SentryInstance = null
  initialized = false
}

module.exports = {
  initSentry,
  getSentry,
  requestHandler,
  errorHandler,
  captureException,
  flush,
  _resetForTests,
}
