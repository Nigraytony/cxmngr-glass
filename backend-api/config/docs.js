function asString(v) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

function getDocsAllowedContentTypes() {
  const raw = asString(process.env.DOCS_ALLOWED_CONTENT_TYPES).trim()
  if (raw) return raw.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean)
  return [
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]
}

function getDocsMaxSizeBytes() {
  const v = Number(process.env.DOCS_MAX_SIZE_BYTES)
  return Number.isFinite(v) && v > 0 ? v : 25 * 1024 * 1024
}

module.exports = {
  getDocsAllowedContentTypes,
  getDocsMaxSizeBytes,
}

