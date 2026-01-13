const crypto = require('crypto')
const { XMLParser } = require('fast-xml-parser')

function asString(v) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

function toIsoNoMs(d) {
  const iso = (d instanceof Date ? d : new Date(d)).toISOString()
  return iso.replace(/\.\d{3}Z$/, 'Z')
}

function hmacBase64(keyBase64, stringToSign) {
  const key = Buffer.from(String(keyBase64), 'base64')
  return crypto.createHmac('sha256', key).update(stringToSign, 'utf8').digest('base64')
}

function parseConnectionString(cs) {
  const out = {}
  for (const part of String(cs || '').split(';')) {
    const [k, ...rest] = part.split('=')
    if (!k) continue
    out[k] = rest.join('=')
  }
  const accountName = out.AccountName
  const accountKey = out.AccountKey
  const endpointSuffix = out.EndpointSuffix || 'core.windows.net'
  const protocol = out.DefaultEndpointsProtocol || 'https'
  const blobEndpoint = out.BlobEndpoint || `${protocol}://${accountName}.blob.${endpointSuffix}`
  if (!accountName || !accountKey) return null
  return { accountName, accountKey, blobEndpoint }
}

async function fetchJson(url, opts) {
  const res = await fetch(url, opts)
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch (_) {}
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    err.body = json || text
    throw err
  }
  return json
}

async function fetchText(url, opts) {
  const res = await fetch(url, opts)
  const text = await res.text()
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    err.body = text
    throw err
  }
  return text
}

// Acquire an access token from App Service Managed Identity.
async function getManagedIdentityToken() {
  const endpoint = process.env.IDENTITY_ENDPOINT || process.env.MSI_ENDPOINT
  const secret = process.env.IDENTITY_HEADER || process.env.MSI_SECRET
  if (!endpoint || !secret) return null

  const url = new URL(endpoint)
  url.searchParams.set('resource', 'https://storage.azure.com/')
  url.searchParams.set('api-version', '2019-08-01')

  const headers = process.env.IDENTITY_ENDPOINT
    ? { 'X-IDENTITY-HEADER': secret }
    : { secret }

  const json = await fetchJson(url.toString(), { headers })
  const accessToken = json && (json.access_token || json.accessToken)
  const expiresOn = json && (json.expires_on || json.expiresOn)
  return accessToken ? { accessToken, expiresOn } : null
}

let cachedToken = null
let cachedUserDelegationKey = null

async function getCachedToken() {
  if (cachedToken && cachedToken.accessToken) {
    const exp = Number(cachedToken.expiresOn)
    if (Number.isFinite(exp) && exp > Math.floor(Date.now() / 1000) + 60) return cachedToken
  }
  const token = await getManagedIdentityToken()
  cachedToken = token
  return token
}

async function getUserDelegationKey(accountName, { start, expiry, version }) {
  const now = Date.now()
  if (cachedUserDelegationKey && cachedUserDelegationKey.key && cachedUserDelegationKey.expiresAtMs) {
    if (cachedUserDelegationKey.expiresAtMs > now + 60_000) return cachedUserDelegationKey.key
  }

  const token = await getCachedToken()
  if (!token || !token.accessToken) return null

  const serviceUrl = `https://${accountName}.blob.core.windows.net/?restype=service&comp=userdelegationkey`
  const xmsDate = new Date().toUTCString()
  const body = `<?xml version="1.0" encoding="utf-8"?><KeyInfo><Start>${toIsoNoMs(start)}</Start><Expiry>${toIsoNoMs(expiry)}</Expiry></KeyInfo>`

  const xml = await fetchText(serviceUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      'x-ms-version': version,
      'x-ms-date': xmsDate,
      'Content-Type': 'application/xml',
    },
    body,
  })

  const parser = new XMLParser({ ignoreAttributes: false })
  const parsed = parser.parse(xml)
  const key = parsed && parsed.UserDelegationKey ? parsed.UserDelegationKey : null
  if (!key || !key.Value) return null

  cachedUserDelegationKey = {
    key,
    expiresAtMs: (expiry instanceof Date ? expiry.getTime() : new Date(expiry).getTime()),
  }
  return key
}

function buildBlobUrl({ blobEndpoint, container, blobName }) {
  const base = String(blobEndpoint).replace(/\/+$/, '')
  const c = String(container).replace(/^\/+|\/+$/g, '')
  const b = String(blobName).replace(/^\/+/, '')
  return `${base}/${c}/${b}`
}

function buildServiceSasQuery({ accountName, accountKey, container, blobName, permissions, startsOn, expiresOn, version }) {
  const sp = permissions
  const st = toIsoNoMs(startsOn)
  const se = toIsoNoMs(expiresOn)
  const sr = 'b'
  const spr = 'https'
  const sv = version
  const canonicalizedResource = `/blob/${accountName}/${container}/${blobName}`

  const stringToSign = [
    sp,
    st,
    se,
    canonicalizedResource,
    '', // signedIdentifier
    '', // signedIP
    spr,
    sv,
    sr,
    '', // signedSnapshotTime
    '', // rscc
    '', // rscd
    '', // rsce
    '', // rscl
    '', // rsct
  ].join('\n')

  const sig = encodeURIComponent(hmacBase64(accountKey, stringToSign))
  return `sv=${encodeURIComponent(sv)}&spr=${encodeURIComponent(spr)}&st=${encodeURIComponent(st)}&se=${encodeURIComponent(se)}&sr=${sr}&sp=${encodeURIComponent(sp)}&sig=${sig}`
}

function buildUserDelegationSasQuery({ accountName, userDelegationKey, container, blobName, permissions, startsOn, expiresOn, version }) {
  const sp = permissions
  const st = toIsoNoMs(startsOn)
  const se = toIsoNoMs(expiresOn)
  const sr = 'b'
  const spr = 'https'
  const sv = version
  const canonicalizedResource = `/blob/${accountName}/${container}/${blobName}`

  const stringToSign = [
    sp,
    st,
    se,
    canonicalizedResource,
    userDelegationKey.SignedOid,
    userDelegationKey.SignedTid,
    userDelegationKey.SignedStart,
    userDelegationKey.SignedExpiry,
    userDelegationKey.SignedService,
    userDelegationKey.SignedVersion,
    '', // signedIP
    spr,
    sv,
    sr,
    '', // signedSnapshotTime
    '', // rscc
    '', // rscd
    '', // rsce
    '', // rscl
    '', // rsct
  ].join('\n')

  const sig = encodeURIComponent(hmacBase64(userDelegationKey.Value, stringToSign))
  const q = new URLSearchParams()
  q.set('sv', sv)
  q.set('spr', spr)
  q.set('st', st)
  q.set('se', se)
  q.set('sr', sr)
  q.set('sp', sp)
  q.set('skoid', userDelegationKey.SignedOid)
  q.set('sktid', userDelegationKey.SignedTid)
  q.set('skt', userDelegationKey.SignedStart)
  q.set('ske', userDelegationKey.SignedExpiry)
  q.set('sks', userDelegationKey.SignedService)
  q.set('skv', userDelegationKey.SignedVersion)
  q.set('sig', decodeURIComponent(sig))
  // URLSearchParams encodes by default; we already decoded sig for clean encoding.
  return q.toString()
}

function resolveStorageConfig() {
  const container = asString(process.env.DOCS_BLOB_CONTAINER || process.env.AZURE_STORAGE_CONTAINER || '').trim()
  if (!container) return null

  const cs = process.env.AZURE_STORAGE_CONNECTION_STRING
  if (cs) {
    const parsed = parseConnectionString(cs)
    if (!parsed) return null
    return { mode: 'accountKey', container, ...parsed }
  }

  const accountName = asString(process.env.DOCS_BLOB_ACCOUNT || process.env.AZURE_STORAGE_ACCOUNT || '').trim()
  if (!accountName) return null
  // For managed identity we assume default public endpoint.
  return { mode: 'managedIdentity', container, accountName, blobEndpoint: `https://${accountName}.blob.core.windows.net` }
}

async function generateBlobSasUrl({ blobName, permissions, expiresInSec = 600 }) {
  const cfg = resolveStorageConfig()
  if (!cfg) {
    const err = new Error('Azure storage is not configured')
    err.status = 503
    throw err
  }

  const version = '2022-11-02'
  const now = new Date()
  const startsOn = new Date(now.getTime() - 5 * 60 * 1000)
  const expiresOn = new Date(now.getTime() + Math.max(60, Number(expiresInSec) || 600) * 1000)

  const container = cfg.container
  const blobUrl = buildBlobUrl({ blobEndpoint: cfg.blobEndpoint, container, blobName })

  let sas
  if (cfg.mode === 'accountKey') {
    sas = buildServiceSasQuery({
      accountName: cfg.accountName,
      accountKey: cfg.accountKey,
      container,
      blobName,
      permissions,
      startsOn,
      expiresOn,
      version,
    })
  } else {
    const udk = await getUserDelegationKey(cfg.accountName, { start: startsOn, expiry: expiresOn, version })
    if (!udk) {
      const err = new Error('Managed identity is not available for Azure storage')
      err.status = 503
      throw err
    }
    sas = buildUserDelegationSasQuery({
      accountName: cfg.accountName,
      userDelegationKey: udk,
      container,
      blobName,
      permissions,
      startsOn,
      expiresOn,
      version,
    })
  }

  return {
    url: `${blobUrl}?${sas}`,
    expiresAt: expiresOn.toISOString(),
    blobUrl,
  }
}

async function blobExists(blobUrlWithSas) {
  const res = await fetch(blobUrlWithSas, { method: 'HEAD' })
  if (res.status === 404) return { exists: false }
  if (!res.ok) return { exists: false, status: res.status }
  const sizeBytes = Number(res.headers.get('content-length') || 0)
  const contentType = res.headers.get('content-type') || ''
  return { exists: true, sizeBytes, contentType }
}

async function deleteBlob(blobUrlWithSas) {
  const res = await fetch(blobUrlWithSas, { method: 'DELETE' })
  if (res.status === 404) return { deleted: true }
  if (!res.ok) return { deleted: false, status: res.status }
  return { deleted: true }
}

module.exports = {
  resolveStorageConfig,
  generateBlobSasUrl,
  blobExists,
  deleteBlob,
}

