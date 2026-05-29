// Validate required env vars at server startup.
//
// Audit finding B-O3: critical env vars (MONGODB_URI, JWT_SECRET,
// AI_ENCRYPTION_KEY, MAIL_FROM, STRIPE_WEBHOOK_SECRET) only printed a soft
// `console.warn` when missing and the server kept booting. The first
// request that needed them would fail with a confusing error — or worse,
// silently fall back to localhost mongo or `no-reply@example.com` mail
// from which SendGrid would reject.
//
// In production this module REFUSES to start when a required var is
// missing. In dev/test it returns quietly so local development isn't
// blocked.

// Hard requirements: server cannot meaningfully run without these.
const REQUIRED_IN_PROD = [
  'MONGODB_URI',
  'JWT_SECRET',
  'AI_ENCRYPTION_KEY',
  'MAIL_FROM',
]

// Soft requirements: server starts, but features will silently break.
// We log a loud warning at startup so operators can see what's missing.
const RECOMMENDED_IN_PROD = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SENTRY_DSN',
  'CORS_ALLOWED_ORIGINS',
  'APP_URL',
  'FRONTEND_URL',
  'DOCS_BLOB_CONTAINER',
]

function isProd(envValue) {
  return String(envValue || '').toLowerCase() === 'production'
}

function isSet(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

/**
 * Throws if any REQUIRED_IN_PROD var is missing while NODE_ENV=production.
 * Logs a warning for missing RECOMMENDED vars in prod. No-ops in non-prod.
 *
 * @param {object} env - process.env-shaped object (injectable for tests)
 * @returns {{prod: boolean, missingRecommended: string[]}}
 */
function validateEnv(env = process.env) {
  const prod = isProd(env.NODE_ENV)
  if (!prod) {
    return { prod: false, missingRecommended: [] }
  }

  const missing = REQUIRED_IN_PROD.filter((k) => !isSet(env[k]))
  if (missing.length) {
    const err = new Error(
      `Refusing to start: required env vars missing in production: ${missing.join(', ')}`
    )
    err.code = 'ENV_VALIDATION_FAILED'
    err.missing = missing
    throw err
  }

  const missingRecommended = RECOMMENDED_IN_PROD.filter((k) => !isSet(env[k]))
  if (missingRecommended.length) {
    // Single line, no stack — operators scan for this on every deploy.
    console.warn(
      `[startup] WARN: recommended env vars not set (features may silently fail): ${missingRecommended.join(', ')}`
    )
  }

  return { prod: true, missingRecommended }
}

module.exports = { validateEnv, REQUIRED_IN_PROD, RECOMMENDED_IN_PROD }
