const crypto = require('crypto')

function readKeyFromEnv() {
  const raw = process.env.AI_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || ''
  const v = String(raw || '').trim()
  if (!v) throw new Error('AI_ENCRYPTION_KEY is not configured')

  // Support hex (64 chars) or base64 (32 bytes)
  let buf = null
  if (/^[0-9a-fA-F]{64}$/.test(v)) {
    buf = Buffer.from(v, 'hex')
  } else {
    try {
      buf = Buffer.from(v, 'base64')
    } catch (_) {
      buf = null
    }
  }
  if (!buf || buf.length !== 32) throw new Error('AI_ENCRYPTION_KEY must be a 32-byte key (base64) or 64-char hex')
  return buf
}

function encryptString(plaintext) {
  const key = readKeyFromEnv()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(String(plaintext || ''), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    enc: enc.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  }
}

function decryptString(payload) {
  const key = readKeyFromEnv()
  const iv = Buffer.from(String(payload && payload.iv || ''), 'base64')
  const tag = Buffer.from(String(payload && payload.tag || ''), 'base64')
  const enc = Buffer.from(String(payload && payload.enc || ''), 'base64')
  if (!iv.length || !tag.length || !enc.length) throw new Error('Invalid encrypted payload')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const out = Buffer.concat([decipher.update(enc), decipher.final()])
  return out.toString('utf8')
}

module.exports = { encryptString, decryptString }

