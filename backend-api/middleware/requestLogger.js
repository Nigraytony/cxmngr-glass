const crypto = require('crypto')
const { isTruthy } = require('./validate')

function newRequestId() {
  try {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch (_) {}
  return crypto.randomBytes(16).toString('hex')
}

function getClientIp(req) {
  // With trust proxy enabled, Express sets req.ip from X-Forwarded-For.
  // Still normalize to a short string for logging.
  try {
    const ip = (req && (req.ip || (req.connection && req.connection.remoteAddress))) || ''
    return String(ip).slice(0, 128)
  } catch (_) {
    return ''
  }
}

function shouldSkipLogging(req) {
  const url = String((req && (req.originalUrl || req.url)) || '')
  if (url.startsWith('/api/health')) return true
  if (url.startsWith('/uploads/')) return true
  return false
}

function requestLogger(req, res, next) {
  const enabled = !isTruthy(process.env.DISABLE_REQUEST_LOGS) && String(process.env.LOG_REQUESTS || 'true').toLowerCase() !== 'false'
  const startedAt = Date.now()

  const incoming = req.get && req.get('x-request-id')
  const reqId = String(incoming || '').trim() || newRequestId()
  req.id = reqId
  try {
    res.setHeader('x-request-id', reqId)
  } catch (_) {}

  if (!enabled || shouldSkipLogging(req)) return next()

  res.on('finish', () => {
    const ms = Date.now() - startedAt
    const log = {
      level: 'info',
      msg: 'request',
      reqId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      ms,
      ip: getClientIp(req),
      userId: req.user && (req.user._id || req.user.id) ? String(req.user._id || req.user.id) : undefined,
    }
    // Avoid logging undefined fields
    Object.keys(log).forEach((k) => log[k] === undefined && delete log[k])
    console.log(JSON.stringify(log))
  })

  return next()
}

module.exports = { requestLogger }

