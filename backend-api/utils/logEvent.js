function clampString(value, maxLen) {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  if (!s) return null
  if (maxLen && s.length > maxLen) return s.slice(0, maxLen)
  return s
}

function normalizeDate(value) {
  if (!value) return new Date()
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return new Date()
  return d
}

function tryNormalizeJson(value, maxBytes) {
  if (value === undefined) return undefined
  if (value === null) return null

  if (typeof value === 'string') {
    const s = value.length > maxBytes ? value.slice(0, maxBytes) : value
    return s
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value

  // Objects/arrays: attempt to serialize to enforce a strict byte limit and strip prototypes/functions.
  try {
    const json = JSON.stringify(value)
    const bytes = Buffer.byteLength(json, 'utf8')
    if (bytes > maxBytes) return { truncated: true, bytes }
    return JSON.parse(json)
  } catch (e) {
    return { truncated: true, reason: 'unserializable' }
  }
}

function normalizeLogEvent(input, { byFallback, maxBytes = 50_000 } = {}) {
  const raw = (input && typeof input === 'object') ? input : {}

  const type = clampString(raw.type, 80)
  if (!type) return null

  const out = { type }
  out.ts = normalizeDate(raw.ts)

  const by = clampString(raw.by, 160) || clampString(byFallback, 160)
  if (by) out.by = by

  const message = clampString(raw.message, 500) || clampString(raw.msg, 500)
  if (message) out.message = message

  // Allow a small set of primitive top-level fields (clamped).
  const primitiveKeys = ['action', 'entity', 'field', 'source', 'model', 'path']
  for (const key of primitiveKeys) {
    const v = raw[key]
    if (typeof v === 'string') out[key] = clampString(v, 200)
    else if (typeof v === 'number' && Number.isFinite(v)) out[key] = v
    else if (typeof v === 'boolean') out[key] = v
  }

  // Allow richer payloads but size-cap them.
  const payloadKeys = ['details', 'diff', 'before', 'after', 'payload', 'meta']
  for (const key of payloadKeys) {
    if (raw[key] === undefined) continue
    out[key] = tryNormalizeJson(raw[key], maxBytes)
  }

  // Preserve a small number of other primitive fields for backward compatibility.
  let extras = 0
  for (const key of Object.keys(raw)) {
    if (key === 'type' || key === 'ts' || key === 'by' || key === 'msg' || key === 'message') continue
    if (primitiveKeys.includes(key) || payloadKeys.includes(key)) continue
    if (key.startsWith('$')) continue
    if (extras >= 20) break

    const v = raw[key]
    if (typeof v === 'string') {
      out[key] = clampString(v, 500)
      extras += 1
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      out[key] = v
      extras += 1
    } else if (typeof v === 'boolean') {
      out[key] = v
      extras += 1
    }
  }

  return out
}

module.exports = { normalizeLogEvent }

