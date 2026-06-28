// Client-generated, MongoDB ObjectId-compatible IDs (offline Phase 1, decision
// D2 in docs/offline_phase1_design.md). Offline we must mint an entity's `_id`
// before the server has ever seen it, so cross-entity references are valid
// immediately and no remap pass is needed on check-in.
//
// Shape matches a Mongo ObjectId hex string: 12 bytes / 24 hex chars =
// 4-byte big-endian timestamp (seconds) + 8 random bytes. Mongo accepts any
// 24-hex string as an _id, so the backend can store these directly once it is
// updated to accept client-supplied ids (the D2 backend change, not yet done).

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  const c: Crypto = (globalThis as any).crypto || (globalThis as any).msCrypto
  c.getRandomValues(arr)
  let out = ''
  for (const b of arr) out += b.toString(16).padStart(2, '0')
  return out
}

// `now` is injectable for deterministic tests.
export function newObjectId(now: number = Date.now()): string {
  const seconds = Math.floor(now / 1000) >>> 0
  const tsHex = seconds.toString(16).padStart(8, '0')
  return tsHex + randomHex(8)
}

export function isObjectIdLike(v: unknown): boolean {
  return typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v)
}
