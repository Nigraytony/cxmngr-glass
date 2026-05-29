// Opt-in optimistic concurrency control for Mongoose updates.
//
// Audit finding B-R5: every PATCH on Activity/Issue/Equipment/Task used
// `findByIdAndUpdate(id, body, ...)` which silently last-write-wins on
// concurrent edits. Two open browser tabs editing the same record overwrite
// each other's work with no warning. The schema's heavy embedded payloads
// (checklists, functionalTests, attendees, oprItemIds, photos) make this
// especially painful — entire arrays get replaced.
//
// This helper checks the document's `__v` (Mongoose's default version key)
// before applying the update. It's OPT-IN by clients:
//   - If the client sends `__v` (body or `If-Match` header), we use it.
//     Mismatch → 409 Conflict with the current document.
//   - If the client doesn't send it, we apply the update as before.
//     Back-compat so existing pages keep working without coordination.
//
// Frontend migration is a follow-up: each editor page should:
//   1. Read `__v` from the fetched document.
//   2. Send it back as `__v` (or `If-Match`) on save.
//   3. Render a "this record was changed by someone else; reload to see
//      the latest" banner on 409.

const STALE_VERSION_CODE = 'STALE_VERSION'

/**
 * Pull the expected `__v` from the request. Looks at body.__v first, then
 * the `If-Match` header. Returns null if not provided or non-numeric.
 */
function readExpectedVersion(req) {
  if (!req) return null
  const raw = (req.body && req.body.__v !== undefined)
    ? req.body.__v
    : (req.headers && (req.headers['if-match'] || req.headers['If-Match']))
  if (raw === undefined || raw === null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/**
 * Apply an update with optional optimistic-concurrency check.
 *
 * @param {mongoose.Model} Model
 * @param {string} id
 * @param {object} incoming - fields to $set
 * @param {number|null} expectedVersion - if a number, filter by __v
 * @param {object} options - passed to Mongoose findOneAndUpdate
 * @returns {Promise<{updated: object|null, conflict: boolean, notFound: boolean, current?: object}>}
 *   - On success: { updated, conflict: false, notFound: false }
 *   - On stale version: { updated: null, conflict: true, current: <latest doc> }
 *   - On missing doc: { updated: null, notFound: true }
 */
async function applyOptimisticUpdate(Model, id, incoming, expectedVersion, options = {}) {
  const filter = { _id: id }
  if (expectedVersion !== null && expectedVersion !== undefined) {
    filter.__v = expectedVersion
  }
  // Never let the client carry a __v value into the $set portion — our
  // $inc below is the source of truth for the new version.
  const safeIncoming = { ...incoming }
  if ('__v' in safeIncoming) delete safeIncoming.__v

  const updated = await Model.findOneAndUpdate(
    filter,
    { ...safeIncoming, $inc: { __v: 1 } },
    options
  )
  if (updated) {
    return { updated, conflict: false, notFound: false }
  }

  // Distinguish 404 (no such doc) from 409 (stale __v). Only matters if the
  // client actually sent an expected version — otherwise this is just a 404.
  if (expectedVersion !== null && expectedVersion !== undefined) {
    const current = await Model.findById(id).lean()
    if (current) {
      return { updated: null, conflict: true, notFound: false, current }
    }
  }
  return { updated: null, conflict: false, notFound: true }
}

/**
 * Send a standard 409 response body. Centralized so error shape is
 * consistent across routes and the frontend has one thing to catch.
 */
function sendConflict(res, current) {
  return res.status(409).json({
    error: 'This record was modified by someone else. Reload and try again.',
    code: STALE_VERSION_CODE,
    currentVersion: current && typeof current.__v === 'number' ? current.__v : null,
    current,
  })
}

module.exports = {
  readExpectedVersion,
  applyOptimisticUpdate,
  sendConflict,
  STALE_VERSION_CODE,
}
