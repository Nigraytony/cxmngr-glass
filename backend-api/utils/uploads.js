const fs = require('fs')
const path = require('path')

function tryDeleteLocalUpload({ url, prefix }) {
  try {
    const raw = typeof url === 'string' ? url : ''
    if (!raw || !raw.includes('/uploads/')) return false

    const urlPath = raw.split('/uploads/')[1]
    if (!urlPath) return false

    const normalizedUrlPath = String(urlPath).replace(/^\/+/, '')
    if (prefix) {
      const pfx = String(prefix).replace(/^\/+/, '').replace(/\/+$/, '')
      if (!normalizedUrlPath.startsWith(`${pfx}/`)) return false
    }

    const uploadsRoot = path.resolve(__dirname, '..', 'uploads')
    const full = path.resolve(uploadsRoot, normalizedUrlPath)

    // Prevent path traversal: full must remain within uploadsRoot
    if (full === uploadsRoot) return false
    if (!full.startsWith(uploadsRoot + path.sep)) return false

    if (fs.existsSync(full)) {
      fs.unlinkSync(full)
      return true
    }
    return false
  } catch (_) {
    return false
  }
}

module.exports = { tryDeleteLocalUpload }

