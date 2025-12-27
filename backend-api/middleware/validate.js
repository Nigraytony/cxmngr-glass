const mongoose = require('mongoose')

function isTruthy(v) {
  if (v === true) return true
  if (v === false) return false
  if (v == null) return false
  const s = String(v).trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'on'
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ''))
}

function requireObjectIdParam(name = 'id') {
  return (req, res, next) => {
    const v = req && req.params ? req.params[name] : null
    if (!isObjectId(v)) return res.status(400).send({ error: `Invalid ${name}` })
    return next()
  }
}

function requireObjectIdQuery(name) {
  return (req, res, next) => {
    const v = req && req.query ? req.query[name] : null
    if (!isObjectId(v)) return res.status(400).send({ error: `Invalid ${name}` })
    return next()
  }
}

function requireObjectIdBody(name) {
  return (req, res, next) => {
    const v = req && req.body ? req.body[name] : null
    if (!isObjectId(v)) return res.status(400).send({ error: `Invalid ${name}` })
    return next()
  }
}

function requireBodyField(name) {
  return (req, res, next) => {
    const v = req && req.body ? req.body[name] : undefined
    if (v === undefined || v === null || (typeof v === 'string' && !String(v).trim())) {
      return res.status(400).send({ error: `${name} is required` })
    }
    return next()
  }
}

function requireIntParam(name, { min = 0, max = null } = {}) {
  return (req, res, next) => {
    const raw = req && req.params ? req.params[name] : null
    const v = parseInt(String(raw), 10)
    if (Number.isNaN(v)) return res.status(400).send({ error: `Invalid ${name}` })
    if (v < min) return res.status(400).send({ error: `Invalid ${name}` })
    if (typeof max === 'number' && v > max) return res.status(400).send({ error: `Invalid ${name}` })
    return next()
  }
}

module.exports = {
  isTruthy,
  isObjectId,
  requireBodyField,
  requireObjectIdParam,
  requireObjectIdQuery,
  requireObjectIdBody,
  requireIntParam,
}
