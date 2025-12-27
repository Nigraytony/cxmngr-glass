function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildSafeRegex(raw, { maxLen = 128, flags = 'i' } = {}) {
  if (raw === undefined || raw === null) return null
  const s = String(raw).trim()
  if (!s) return null
  const capped = s.length > maxLen ? s.slice(0, maxLen) : s
  return new RegExp(escapeRegex(capped), flags)
}

module.exports = { buildSafeRegex }

