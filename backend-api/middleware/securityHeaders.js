function securityHeaders(req, res, next) {
  try {
    // Baseline hardening for an API server (no deps).
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'same-origin')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    // For API responses and same-site uploads, this is typically safe.
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site')
    // Avoid leaking tech details
    res.removeHeader('X-Powered-By')
  } catch (e) {
    // non-blocking
  }
  return next()
}

module.exports = { securityHeaders }

