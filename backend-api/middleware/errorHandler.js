function errorHandler(err, req, res, _next) {
  const status = err && (err.status || err.statusCode) ? Number(err.status || err.statusCode) : 500
  const reqId = req && req.id ? String(req.id) : undefined

  try {
    const log = {
      level: status >= 500 ? 'error' : 'warn',
      msg: 'request_error',
      reqId,
      method: req && req.method,
      path: req && (req.originalUrl || req.url),
      status,
      error: err && err.message ? String(err.message) : String(err),
    }
    if (process.env.NODE_ENV !== 'production' && err && err.stack) log.stack = String(err.stack)
    Object.keys(log).forEach((k) => log[k] === undefined && delete log[k])
    console.error(JSON.stringify(log))
  } catch (_) {}

  if (res.headersSent) return res.end()
  return res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : (err && err.message ? err.message : 'Request failed'),
    reqId,
  })
}

module.exports = { errorHandler }

