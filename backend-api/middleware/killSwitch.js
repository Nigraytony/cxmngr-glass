const { isTruthy } = require('./validate')

function requireNotDisabled(featureKey) {
  const key = String(featureKey || '').trim().toUpperCase()
  const envName = `DISABLE_${key}`
  return (req, res, next) => {
    if (isTruthy(process.env[envName])) {
      return res.status(503).send({
        error: `${featureKey} temporarily disabled`,
        code: 'FEATURE_DISABLED',
        feature: featureKey,
      })
    }
    return next()
  }
}

module.exports = { requireNotDisabled }

