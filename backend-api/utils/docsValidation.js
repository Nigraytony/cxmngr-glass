function normalizeDocName(value, { maxLen = 128 } = {}) {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  if (!s) return null
  if (s.length > maxLen) return null
  return s
}

function validateFolderName(name) {
  const s = normalizeDocName(name, { maxLen: 128 })
  if (!s) return { ok: false, error: 'Folder name is required' }

  // Prevent path traversal or pseudo-paths.
  if (s === '.' || s === '..') return { ok: false, error: 'Invalid folder name' }
  if (s.includes('..')) return { ok: false, error: 'Invalid folder name' }
  if (/[\\/]/.test(s)) return { ok: false, error: 'Folder name cannot include path separators' }

  // Disallow reserved characters commonly invalid in filesystems and URLs.
  // Also disallow control characters.
  if (/[<>:"|?*\u0000-\u001F]/.test(s)) return { ok: false, error: 'Folder name contains invalid characters' }

  return { ok: true, value: s }
}

function validateFilename(name) {
  const s = normalizeDocName(name, { maxLen: 256 })
  if (!s) return { ok: false, error: 'Filename is required' }
  if (s === '.' || s === '..') return { ok: false, error: 'Invalid filename' }
  if (s.includes('..')) return { ok: false, error: 'Invalid filename' }
  if (/[\\/]/.test(s)) return { ok: false, error: 'Filename cannot include path separators' }
  if (/[<>:"|?*\u0000-\u001F]/.test(s)) return { ok: false, error: 'Filename contains invalid characters' }
  return { ok: true, value: s }
}

module.exports = {
  normalizeDocName,
  validateFolderName,
  validateFilename,
}

