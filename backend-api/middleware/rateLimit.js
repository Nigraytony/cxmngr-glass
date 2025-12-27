function getClientIp(req) {
  try {
    const xff = req.headers && (req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'])
    if (xff) return String(Array.isArray(xff) ? xff[0] : xff).split(',')[0].trim()
  } catch (e) { /* ignore */ }
  return (req.ip || req.connection?.remoteAddress || '').toString()
}

// Very small in-memory rate limiter (single-instance).
// For multi-instance deployments, use a shared store (Redis) later.
function rateLimit({ windowMs = 60_000, max = 60, keyPrefix = 'rl', skip } = {}) {
  const buckets = new Map()

  function cleanup(now) {
    // Best-effort cleanup to prevent unbounded growth.
    if (buckets.size < 10_000) return
    for (const [k, v] of buckets.entries()) {
      if (!v || v.resetAt <= now) buckets.delete(k)
    }
  }

  return function rateLimitMiddleware(req, res, next) {
    try {
      // Avoid test flakiness and speed up integration tests.
      if (String(process.env.NODE_ENV || '').toLowerCase() === 'test') return next()
      if (typeof skip === 'function' && skip(req)) return next()
      const ip = getClientIp(req) || 'unknown'
      const key = `${keyPrefix}:${ip}`
      const now = Date.now()
      let bucket = buckets.get(key)
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + windowMs }
        buckets.set(key, bucket)
        cleanup(now)
      }

      bucket.count += 1
      const remaining = Math.max(0, max - bucket.count)
      res.setHeader('X-RateLimit-Limit', String(max))
      res.setHeader('X-RateLimit-Remaining', String(remaining))
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

      if (bucket.count > max) {
        const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
        res.setHeader('Retry-After', String(retryAfterSec))
        return res.status(429).json({ error: 'Too many requests', code: 'RATE_LIMITED', retryAfterSec })
      }

      return next()
    } catch (e) {
      return next()
    }
  }
}

module.exports = { rateLimit, getClientIp }
